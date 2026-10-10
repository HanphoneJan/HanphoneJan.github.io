---
title: Agent 查询层架构
sidebar_position: 2
description: 数据分析 AI Agent 平台查询模块的五阶段流水线架构，涵盖分类、路由、SQL 生成与执行
---

# Agent 查询层架构

---

## 1. 概述

Agent 查询层负责将用户的自然语言问题转换为可执行的数据查询，并返回结构化的结果。系统采用 **"分类 → 路由 → 生成/复用 → 执行 → 归一化"** 的五阶段流水线。

核心设计目标：

- **收敛到 DC API**：所有数据查询均通过数据中心（DC）的 `/aggregate`、`/free-query`、`/sql-query` 接口执行，历史本地 OLAP 路径已完全移除
- **指标语义中心驱动**：通过数据库存储的指标语义（`MetricSemanticsService`）指导查询路由和意图解析
- **三层混合路由**：代码层快速判断 + LLM 复杂度标注 + 运行时兜底
- **Intent 路径 SQL 生成**：LLM 输出结构化 Intent JSON，经 CorrectorChain 校验后由 Translator 确定性转换为 SQL
- **多项目并行**：所有涉及多项目的查询模式均使用 `asyncio.gather` 并行执行

---

## 2. 架构全景

```
用户输入 (自然语言)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  阶段 1: 查询模式分类 (_classify_query_mode)                 │
│  - table_query / order_detail / login_detail                │
│  - dashboard_metric (指标语义匹配)                           │
│  - sql (兜底模式)                                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  阶段 2: 路由与生成                                          │
│                                                              │
│  table_query ──────┐                                        │
│  login_detail ─────┼──► DC /free-query 或 /aggregate        │
│  order_detail ─────┤                                        │
│  dashboard_metric ─┘                                        │
│                                                              │
│  sql 模式:                                                   │
│  ├─ SemanticRouter.route() ──► dc_free_query / dc_sql_query │
│  ├─ _generate_sql_parallel_aware() ──► Intent → SQL         │
│  └─ 根据路由结果选择执行路径                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  阶段 3: 执行                                                │
│  - DC API: DatacenterClient (free_query / aggregate /       │
│    sql_query / free_query_metrics)                          │
│  - 多项目并行: asyncio.gather                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  阶段 4: 结果归一化                                          │
│  - _merge_cross_project_rows()                              │
│  - _apply_result_policy() (截断/预览策略)                    │
│  - _make_json_serializable()                                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
响应文本 + query_result (结构化数据)
```

---

## 3. 查询模式分类

| 模式 | 触发条件 | 执行路径 | 数据来源 |
|------|---------|---------|---------|
| `table_query` | 用户输入含表名（`查表=xxx`、`表名=xxx` 等） | DC `/free-query` 或 `/free-query` metrics 模式 | 数据中心 |
| `order_detail` | 关键词：订单明细、付费记录、充值记录等 | `QueryService.query_order()` | 数据中心 |
| `login_detail` | 关键词：登录明细、登录记录等 | `QueryService.query_login()` | 数据中心 |
| `dashboard_metric` | 指标语义匹配（`MetricSemanticsService.match_metric()`） | `MetricQueryService.query()` → 本地 PG `datacenter_metric_daily` 优先，DC `/aggregate` 回退 | 本地 PG ETL / 数据中心 |
| `sql` | 兜底模式，无法分类时进入 | Intent → SQL → DC `/free-query` 或 `/sql-query` | 数据中心 |
| `unsupported_activity_metric` | 活动指标关键词拦截 | 直接返回提示文案 | 无 |

### 3.1 分类优先级

1. `_extract_table_query_intent()` → `table_query`
2. 关键词匹配 → `order_detail` / `login_detail`
3. `MetricSemanticsService.match_metric()` → `dashboard_metric`
4. 活动指标拦截 → `unsupported_activity_metric`
5. 兜底 → `sql`

---

## 4. 核心组件

### 4.1 QueryAgent (`query_agent.py`)

`QueryAgent` 继承自 `BaseAgent`，是查询层的入口。`run()` 方法按以下顺序处理：

1. **Langfuse Trace 初始化**：记录用户输入、项目 ID、会话信息
2. **查询模式分类**：调用 `_classify_query_mode()`
3. **活动指标拦截**：`_is_activity_conversion_query()` 拦截未接入的活动指标
4. **指标语义匹配**：`_match_metric_semantic()` 为 `sql` 模式提供二次分类机会
5. **模式分发**：根据 `query_mode` 进入对应处理分支
6. **结果归一化**：构造 `ctx.query_result` 和 `ctx.response_text`

### 4.2 指标语义中心 (`MetricSemanticsService`)

数据库存储的指标语义配置，替代了早期的 YAML 语义层（`semantic_layer/` 目录已移除）。

**关键接口**：

- `match_metric(user_input: str)`：关键词匹配，返回 `MetricSemanticRecord | None`
- `list_published()`：获取所有已发布指标
- `build_today_time_metadata()`：构造今日同进度时间元信息

**MetricSemanticRecord 字段**：

- `metric_key`, `display_name`, `aliases`, `definition`, `unit`, `precision`
- `time_policy`, `compare_policy`, `status`, `version`
- `aggregation`, `dimensions`, `default_alert`, `category`

**指标匹配逻辑**：

`match_metric()` 使用关键词匹配，遍历所有已发布指标，检查 `metric_key`、`display_name`、`short_name`、`aliases` 是否出现在用户输入中，返回匹配度最高的指标。

**time_policy 时间策略**：

| 策略 | 说明 | 使用场景 |
|------|------|---------|
| `full_day` | 完整日数据 | 昨天及以前的指标 |
| `today_partial_same_progress` | 今日同日进度对比 | 当前天的 DAU 等实时指标 |
| `partial_day` | 部分日（不对比） | 仅显示今日部分数据 |

Agent 根据查询时间范围自动选择合适的时间策略，`MetricSemanticRecord` 中的 `time_policy`/`compare_policy` 提供默认值。

### 4.3 语义路由器 (`query_router.py`)

三层混合路由组件，决定 sql 模式下走 `/free-query` 还是 `/sql-query`。

**Layer 1: 代码层快速判断**

- SQL 关键词（JOIN/UNION/WITH AS/OVER/SUBQUERY）→ `dc_sql_query`
- 显式表名查询 → `dc_free_query`

**Layer 2: LLM 复杂度标注**

- `semantic_query.complexity == "complex"` → `dc_sql_query`
- 默认 → `dc_free_query`

**Layer 3: 运行时兜底**

- `dc_free_query` 失败时回退到 `dc_sql_query`（通过 try/except fallback 实现）

### 4.4 SQL 生成器

#### 4.4.1 并行生成 (`_generate_sql_parallel_aware`)

当 `_PARALLEL_GENERATION_ENABLED = True` 时启用：

1. **Intent 路径**：LLM → Intent JSON → `CorrectorChain` → `PostgresIntentTranslator` → SQL
2. **AdvancedVoter**：执行候选 SQL 并投票选出最优结果
3. **失败回退**：并行失败时自动回退到单 Intent 串行路径

#### 4.4.2 串行生成 (`_generate_single_intent_sql`)

单轮 LLM → Intent JSON → CorrectorChain → Translator → SQL。

**Intent 路径组件**：

- `IntentGenerator`：构建 Prompt 并解析 LLM 输出的 Intent JSON
- `SemanticQueryIntent`：结构化中间表示（dataset, metrics, dimensions, filters, date_range, group_by, order_by, limit）
- `CorrectorChain`：链式校验（Schema → Where → Agg → Time → Limit）
- `PostgresIntentTranslator`：确定性转换为标准 SQL

### 4.5 SQL 校验器 (`table_access/nl2sql.py`)

| 函数 | 校验范围 | 适用场景 |
|------|---------|---------|
| `validate_sql()` | SELECT 前缀、禁止关键字、表白名单、字段白名单、函数白名单、LIMIT | 本地 SQL（query_replay） |
| `validate_dc_sql()` | SELECT 前缀、禁止关键字（基础 DML/DDL）、LIMIT | DC `/sql-query` |

**注意**：当前 sql 模式主路径使用 `validate_dc_sql`，`validate_sql` 用于 query_replay 场景。

### 4.6 数据中心客户端 (`datacenter/client.py`)

`DatacenterClient` 封装了数据中心的所有 HTTP 接口：

| 方法 | 接口路径 | 用途 |
|------|---------|------|
| `aggregate()` | `/api/v1/external/aggregate` | 批量聚合查询（dashboard_metric） |
| `aggregate_timeseries()` | `/api/v1/external/aggregate/timeseries` | 时序查询 |
| `aggregate_distribution()` | `/api/v1/external/aggregate/distribution` | 分布明细查询 |
| `free_query()` | `/api/v1/external/free-query` | 自由查询（table_query 显式聚合模式） |
| `free_query_metrics()` | `/api/v1/external/free-query` | 指标名模式查询（table_query 已知指标模式） |
| `sql_query()` | `/api/v1/external/sql-query` | 高级 SQL 查询（sql 模式） |
| `get_metrics_catalog()` | `/api/v1/external/aggregate/metrics` | 指标目录 |
| `player_events_*()` | `/api/v1/external/player-events/*` | 用户事件相关接口 |

特性：异步 httpx、指数退避重试（429 限流）、连接池复用、X-API-Key 认证。

### 4.7 表能力目录 (`table_access/table_capability_catalog.py`)

运行时表能力目录，当前从 DC 动态获取（本地缓存为空）。

**关键接口**：

- `get_allowed_tables(game_id)`：返回当前可用表集合
- `get_allowed_fields_by_table(game_id)`：返回可用字段集合（按表）
- `validate_intent(game_id, intent)`：校验给定表名查询意图

### 4.8 表知识服务 (`table_access/table_knowledge.py`)

表知识目录服务，支持模糊搜索业务表名到物理表名的映射。

**关键接口**：

- `search(query)`：返回 `TableKnowledgeSearchResult`，含最佳匹配和候选列表

---

## 5. 执行流程详解

### 5.1 table_query 流程

```
用户输入: "查表=ga_core_kpi_daily"
    │
    ▼
_classify_query_mode() ──► "table_query"
    │
    ▼
_extract_table_query_intent()
    ├─ table_name: ga_core_kpi_daily
    ├─ filters: {} (从 key=value 解析)
    ├─ metrics: [] (从 SUM/AVG 等解析)
    ├─ group_by: [] (从 group by 解析)
    └─ date_range: (从时间表达解析)
    │
    ▼
_execute_table_query() [async]
    ├─ DatacenterConfigResolver.resolve(project_id) ──► DC 配置
    ├─ 解析指标：区分显式聚合函数 和 裸字段名
    │   ├─ 显式聚合 → free_query(table 模式)
    │   └─ 裸字段名 → 查 DC 指标目录 → free_query_metrics(metrics 模式)
    └─ 返回: {table_name, list, columns, query_payload}
    │
    ▼
多项目并行: asyncio.gather([_execute_table_query(pid) for pid in target_project_ids])
    │
    ▼
_merge_cross_project_rows() ──► 结果归一化
```

### 5.2 dashboard_metric 流程

```
用户输入: "昨天 DAU"
    │
    ▼
_classify_query_mode() ──► "sql" (初步)
    │
    ▼
MetricSemanticsService.match_metric() 命中 "dau"
    │
    ▼
query_mode 修正为 "dashboard_metric"
    │
    ▼
_build_semantic_time_metadata()
    ├─ 解析时间窗口
    └─ 处理未完整日策略 (today_partial_same_progress)
    │
    ▼
_execute_semantic_metric_preview() [async]
    ├─ MetricQueryService.query(metric_key, start_date, end_date)
    │   ├─ 本地 PG: SELECT datacenter_metric_daily   [优先]
    │   └─ DC 回退: DatacenterClient.aggregate()     [本地无数据时]
    └─ 返回: {metric, value, source ("local_etl"|"dc_aggregate"), ...}
    │
    ▼
多项目并行: asyncio.gather([...])
    │
    ▼
构造响应文本（含指标口径、对比策略说明、数据来源）
```

### 5.3 sql 模式流程

```
用户输入: "近7天收入趋势"
    │
    ▼
_classify_query_mode() ──► "sql"
    │
    ▼
_generate_sql_parallel_aware()
    ├─ 并行 Intent 路径 + AdvancedVoter
    └─ 失败时回退单 Intent 串行路径
    │
    ▼
应用分页参数：替换/追加 LIMIT 和 OFFSET
    │
    ▼
SemanticRouter.route() ──► dc_free_query / dc_sql_query
    │
    ├─ dc_free_query 且单表无 JOIN/UNION:
    │   ├─ 提取表名 ──► _execute_table_query() (DC /free-query)
    │   └─ 失败 fallback 到 DC /sql-query
    │
    └─ dc_sql_query 或 fallback:
        ├─ validate_dc_sql() (基础安全校验)
        ├─ DatacenterClient.sql_query() (DC 执行)
        └─ 多项目并行: asyncio.gather()
    │
    ▼
_merge_cross_project_rows() ──► 结果归一化
```

### 5.4 login_detail / order_detail 流程

```
用户输入: "查最近7天登录明细"
    │
    ▼
_classify_query_mode() ──► "login_detail"
    │
    ▼
_execute_datacenter_query()
    ├─ _build_time_window() 解析时间范围
    └─ QueryService.query_login() / query_order()
    │
    ▼
多项目并行: asyncio.gather([...])
    │
    ▼
_merge_cross_project_rows()
```

---

## 6. 多项目并行化

所有涉及多项目（`target_project_ids` 长度 > 1）的查询模式均已并行化：

| 模式 | 并行函数 | 并行范围 |
|------|---------|---------|
| `dashboard_metric` | `_execute_single_metric_preview()` | `_execute_semantic_metric_preview()` |
| `login_detail` | `_execute_single_project()` | `_execute_datacenter_query()` |
| `order_detail` | `_execute_single_project()` | `_execute_datacenter_query()` |
| `table_query` | `_execute_single_table()` | `_execute_table_query()` |
| `sql` (DC free) | `_execute_single_free_query()` | `_execute_table_query()` |
| `sql` (DC sql) | `_execute_single_dc_sql()` | `validate_dc_sql + sql_query` |

**实现模式**：

```python
results = await asyncio.gather(*[
    _execute_single(pid) for pid in target_project_ids
])
for pid, result in results:
    project_rows[pid] = result
```

**错误处理**：单个项目失败时抛出异常，由外层 try/except 捕获并返回 `FALLBACK_EXEC_ERROR`。

---

## 7. 数据格式

### 7.1 query_result 通用结构

```python
{
    "sql": str | None,           # SQL 语句（sql 模式）
    "columns": list[str],        # 列名
    "data": list[dict],          # 行数据（dict 格式）
    "query_mode": str,           # 查询模式
    "data_source": str,          # 数据来源标识
    "target_project_ids": list[str],
    "result_policy": dict,       # 截断策略
    # 模式特有字段:
    "project_sql": dict,         # sql 模式下各项目的 SQL
    "table_name": str,           # table_query 模式
    "provider_name": str,        # table_query 模式
    "route_decision": dict,      # sql 模式（SemanticRouter 决策）
    "metric_semantic": dict,     # dashboard_metric 模式
    "time_metadata": dict,       # dashboard_metric 模式
    "metric_previews": dict,     # dashboard_metric 模式
    "project_payloads": dict,    # table_query 模式
    "project_results": dict,     # login_detail/order_detail 模式
}
```

### 7.2 数据来源标识

| 标识 | 含义 |
|------|------|
| `local_etl` | dashboard_metric 命中本地 PG `datacenter_metric_daily` |
| `dc_aggregate` | dashboard_metric 本地 PG 无数据，回退到 DC `/aggregate` |
| `datacenter_table_query` | table_query 单项目 DC |
| `multi_project_table_query` | table_query 多项目 DC |
| `datacenter_free_query` | sql 模式走 DC `/free-query` 单项目 |
| `multi_project_datacenter_free_query` | sql 模式走 DC `/free-query` 多项目 |
| `dc_sql_query` | sql 模式走 DC `/sql-query` 单项目 |
| `multi_project_dc_sql_query` | sql 模式走 DC `/sql-query` 多项目 |
| `dc_sql_empty_fallback` | sql 模式 DC 返回空结果 |
| `metric_semantics` | dashboard_metric 单项目 |
| `multi_project_metric_semantics` | dashboard_metric 多项目 |
| `unsupported_metric_semantics` | 活动指标未接入 |

---

## 8. 文件结构

```
app/modules/agent/
├── query_agent.py                    # 核心 QueryAgent，模式分发与结果归一化
├── query_router.py                   # SemanticRouter 三层混合路由
├── table_access/
│   ├── nl2sql.py                     # SQL 校验器 (validate_sql / validate_dc_sql)
│   ├── table_capability_catalog.py   # 表能力目录 + 白名单管理
│   ├── table_knowledge.py            # 表知识服务（模糊搜索）
│   ├── table_query_contract.py       # TableQueryIntent / TableQueryError 契约
│   ├── semantic_query_intent.py      # SemanticQueryIntent 中间表示
│   ├── intent_generator.py           # LLM Intent 生成
│   ├── intent_translator.py          # Intent → SQL 翻译
│   └── correctors/                   # CorrectorChain 校验器
│       ├── base.py                   # CorrectorChain 基类
│       ├── schema_corrector.py       # 字段名校验
│       ├── where_corrector.py        # WHERE 条件校验
│       ├── agg_corrector.py          # 聚合函数校验
│       ├── time_corrector.py         # 时间范围校验
│       ├── limit_corrector.py        # LIMIT 校验
│       └── grammar_corrector.py      # SQL 语法修正（LLM）
├── runtime/
│   ├── self_correction.py            # CorrectorChain + 并行投票生成
│   ├── voter.py                      # AdvancedVoter（SQL 执行结果投票）
│   ├── parallel_generator.py         # 并行 SQL 生成器
│   ├── llm_client.py                 # 统一 LLM 客户端
│   ├── trace_schema.py               # Trace 命名与摘要工具
│   └── trace_writer.py               # Langfuse Trace 写入器
├── validators/
│   ├── time_parser.py                # 自然语言时间表达式解析
│   └── sql_validator.py              # SQL 安全验证器
└── tools_impl/query/
    └── query_data.py                 # query_data Tool 实现（QueryAgent 入口包装）

app/modules/datacenter/
├── client.py                         # DatacenterClient (aggregate/free_query/sql_query/...)
└── config.py                         # DatacenterConfigResolver (项目配置解析)

app/services/
├── metric_query_service.py           # 指标查询服务（本地 ETL 优先，DC 回退）
└── config/
    └── metric_semantics_service.py   # 指标语义中心服务
```

---

## 9. 关键设计决策

### 9.1 查询路径收敛

当前所有实际数据查询均已收敛到：

1. **数据中心 API**：`/aggregate`、`/free-query`、`/sql-query`
2. **本地 PG ETL 表**：`datacenter_metric_daily`（dashboard_metric 模式优先）

### 9.2 指标语义中心 vs 早期 YAML 语义层

系统已从 YAML 语义层迁移到数据库存储的指标语义中心：

- **MetricSemanticsService**（数据库存储）：用于 `dashboard_metric` 模式的完整语义执行（含时间策略、对比策略、query_key 复用）
- **优势**：支持动态更新、版本管理、标签分类、告警默认配置

**早期 YAML 语义层（已归档）**：

早期实现使用 `server/app/modules/agent/semantic_layer/` 目录下的 YAML 文件（`metrics.yaml`、`tables.yaml`、`dimensions.yaml`、`rules.yaml`）定义指标、表、维度和业务规则。该实现已被移除，相关概念已整合到 `MetricSemanticsService` 和 `TableKnowledgeService` 中：

- **指标定义** → `MetricSemanticsService`（数据库存储）
- **表定义** → `TableKnowledgeService`（`table_knowledge_catalog.json`）
- **维度定义** → 当前未独立实现，维度信息通过 DC API 和指标语义中心管理
- **业务规则** → 预留扩展点，可通过 `IntentGenerator.build_prompt()` 注入

### 9.3 Intent 路径 SQL 生成的优势

相比直接让 LLM 生成 SQL，Intent 路径（LLM → Intent JSON → CorrectorChain → Translator → SQL）具有以下优势：

1. **降低语法错误**：LLM 只需输出结构化 JSON，不需要关心 SQL 语法细节
2. **确定性转换**：Translator 保证生成的 SQL 符合安全规范
3. **可校验性**：CorrectorChain 可以在 Intent 层面进行字段、聚合、时间等多维度校验
4. **可并行投票**：多个候选 Intent 可以独立生成并投票选出最优

### 9.4 并行化的取舍

sql 模式的并行化将 `validate_dc_sql + sql_query` 封装为单个 async 函数。这意味着：

- **优点**：多项目查询延迟从 O(N) 降至 O(1)（假设 DC 并发足够）
- **代价**：trace span 在并发下可能产生交错的时序记录；validate 失败时的错误信息只包含第一个失败项目

### 9.5 validate_sql 拆分理由

| 校验器 | 控制方 | 设计意图 |
|--------|--------|---------|
| `validate_sql` | 本地白名单 | 本地查询需要严格限制表、字段、函数 |
| `validate_dc_sql` | DC 服务端 | DC 是独立服务，本地只做基础 DML/DDL 过滤，表权限由 DC 控制 |

---

## 10. 扩展点

1. **MCP 业务规则接入**：可在 `IntentGenerator.build_prompt()` 中注入外部业务规则上下文
2. **NL2Intent 完整改造**：当前 sql 模式的 `dc_free_query` 分支仅做了简单的表名提取，完整的 SQL → Intent → DC API 参数转换需后续迭代
3. **动态表能力目录**：`TableCapabilityCatalog` 当前从 DC 动态获取，可扩展为从数据库或 MCP Server 动态获取
4. **GrammarCorrector 启用**：当前 `GrammarCorrector` 已定义但未在 CorrectorChain 中启用，可在需要时加入链中
