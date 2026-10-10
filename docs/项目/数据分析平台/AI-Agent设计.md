---
title: AI Agent 设计
sidebar_position: 1
description: 数据分析 AI Agent 平台的架构设计，涵盖 Supervisor、QueryAgent、Analyst、Report、Watcher 与 Skill 机制
---

# AI Agent 设计

---

## 1. 一句话定义

本平台的 AI Agent 架构统一表述为：

`Supervisor` 是唯一对话入口和 Tool-Calling 编排器，`QueryAgent`、`AnalystAgent`、`ReportAgent` 是被工具调用的执行 Agent，`WatcherDetector` 是独立 Worker 驱动的告警检测服务，`Skill` 以"注册表提示片段 + `load_skill` 按需装载"的双轨方式辅助 Supervisor。

---

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Supervisor                                │
│  (server/app/modules/agent/base.py)                                 │
│  Tool-Calling 循环 | 上下文压缩 | Token 预算 | 危险工具确认          │
│  意图识别 (10 类) | 路由分流 | FSM 观测状态                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │ Tool-Calling        │ Tool-Calling        │ Tool-Calling
        v                     v                     v
┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  QueryAgent  │   │  AnalystAgent   │   │   ReportAgent   │
│  query_data  │   │ analyze_anomaly │   │ generate_report │
│  NL2SQL →    │   │ 归因分析         │   │ Plan→Execute→   │
│  PostgreSQL  │   │ 单/多维贡献度    │   │ Assemble        │
└──────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        v                     v                     v
┌─────────────────────────────────────────────────────────────────────┐
│  数据层                                                              │
│  PostgreSQL (55 表) | DataCenter API | MetricSemanticsService       │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  基础设施层                                                          │
│  ToolRegistry | SemanticLayer | DatacenterClientPool | MemoryManager│
│  ContextCompactor | TraceWriter | Langfuse | Prompt Assembler       │
│  PostgresIntentTranslator | IntentGenerator | CorrectorChain        │
└─────────────────────────────────────────────────────────────────────┘

独立运行（Worker）
┌─────────────────────────────────────────────────────────────────────┐
│  WatcherDetector                     ReportWorker                   │
│  (server/worker/runners/watcher.py)  (server/worker/runners/        │
│  阈值检测 | 变化量检测               report.py)                     │
│  Agent 驱动检测 | 通知链路           定时订阅 → 报告生成 → 推送      │
│  └→ 触发告警报告                     └→ 公众号/邮件                  │
└─────────────────────────────────────────────────────────────────────┘

外部暴露
┌─────────────────────────────────────────────────────────────────────┐
│  MCP Server (SSE/stdio)                                             │
│  (server/mcp_server/)                                               │
│  Registry Tools + Legacy Tools | JWT/API Key/Static Token 认证       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Agent 交互矩阵

| 调用方 ↓ / 被调方 → | QueryAgent | AnalystAgent | ReportAgent | WatcherDetector |
|---------------------|------------|--------------|-------------|-----------------|
| **Supervisor** | `query_data` 工具触发 | `analyze_anomaly` 工具触发 | `generate_report` 工具触发 | 不直接调用 |
| **ReportAgent** | `ReportExecutor.execute_step()` 中调用 `QueryAgent.run()` | — | — | — |
| **WatcherDetector** | — | — | `generate_alert_report()` → `ReportExecutionService` → `ReportAgent` | — |
| **ReportWorker** | — | — | `ReportExecutionService.generate_and_push()` → `ReportAgent` | — |

### 2.2 Report Agent 与其他 Agent 的交互（详图）

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ReportAgent                                   │
│                                                                     │
│  ReportPlanner ←── LLM (agent_type="report")                       │
│       │                                                             │
│       ▼                                                             │
│  ReportExecutor ──── QueryAgent.run()                              │
│       │                  │                                          │
│       │                  ├─ dashboard_metric → MetricSemanticsService│
│       │                  ├─ sql → PostgresIntentTranslator → PG     │
│       │                  ├─ login_detail/order_detail → DC API      │
│       │                  └─ table_query → DC /free-query            │
│       │                                                             │
│       ▼                                                             │
│  ReportAssembler ──── LLM (agent_type="report")                    │
│       │                  │                                          │
│       │                  ├─ 跨步骤综合洞察                          │
│       │                  ├─ LLM 摘要生成                            │
│       │                  └─ ECharts 图表渲染                        │
│       ▼                                                             │
│  Report {html_content, sections, insights}                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 当前实现结构

### 3.1 Supervisor

- 位置：`server/app/modules/agent/base.py`
- 职责：唯一对话入口、上下文组装、Tool-Calling 循环、SSE 可视化 block 输出

#### 3.1.1 入口与路由

Supervisor 提供两级入口：

| 入口 | 说明 |
|------|------|
| `run_supervisor(ctx)` | 自由函数，主入口。执行 FSM 推进 → `_chat_turn_with_tools()` |
| `route_agent(ctx)` | 显式路由：按 `ctx.intent` 直接路由到对应 Agent（query/analysis/report），绕过 Tool-Calling 循环 |

`route_agent()` 路由逻辑：

```
ctx.intent == "query"    → QueryAgent.run(ctx)
ctx.intent == "analysis" → AnalystAgent.run(ctx)
ctx.intent == "report"   → ReportAgent.run(ctx)
其他                      → run_supervisor(ctx)
```

#### 3.1.2 意图识别

`parse_intent(user_input)` 支持 10 类意图，按优先级顺序匹配：

| 优先级 | 意图 | 匹配方式 |
|--------|------|----------|
| 1 | `alert` | 关键词：告警、alert、通知 |
| 2 | `dashboard` | 关键词：看板、dashboard、概览 |
| 3 | `collaboration_group` | 关键词：协作组、团队空间 |
| 4 | `project_space` | 关键词：项目空间、共享空间 |
| 5 | `user_segment` | 关键词：用户分群、分群、segment |
| 6 | `event_analysis` | 关键词：事件分析、活动分析 |
| 7 | `data_report` | 关键词：报告、report、生成报告 |
| 8 | `config` | 关键词：配置、设置、config |
| 9 | `analysis` | 关键词：归因、归因分析、分析原因 |
| 10 | `query` | 兜底（无法识别时为 `unknown`，短输入默认为 `query`） |

#### 3.1.3 主循环流程

`run_supervisor(ctx: AgentContext)` 的执行顺序：

1. **意图识别** — `parse_intent(ctx.user_input)` 仅用于观测/日志，不驱动路由
2. **实体提取** — `MemoryManager(ctx).extract_all_entities(user_input)` 提取时间/指标/维度实体
3. **FSM 状态推进** — `SupervisorFSM` 从 `init` -> `intent_parse` -> `planning` -> `executing`
4. **Tool-Calling 循环** — `_chat_turn_with_tools(ctx)` 核心循环
5. **状态同步** — `fsm.sync_context_step()` 将状态写回 `ctx.step`

#### 3.1.4 Tool-Calling 循环

`_chat_turn_with_tools()` 核心参数：

- `max_rounds = 30`：最大对话轮数
- `query_result_count`：query_data 调用次数计数器（>=20 次强制生成回复）
- `same_tool_call_count` / `consecutive_same_tool_count`：死循环防护

**循环步骤**：

```
1. 配额检查 check_quota(user_id) — 超限直接返回错误
2. 消息组装 _messages_from_context() — system + history + user_input
   └─ 上下文压缩 _compact_supervisor_messages()（超阈值时触发）
3. LLM 调用 litellm.completion() — 在线程池中执行
4. 响应处理分支
   ├─ 有 tool_calls:
   │   ├─ 工具选择校验 _validate_tool_selection()
   │   ├─ 重复调用检测（相同参数>2次 / 同一工具>3次）
   │   ├─ 危险工具确认（如需）
   │   ├─ 执行工具 execute_tool() → 发送 block_callback
   │   └─ continue 进入下一轮
   └─ 无 tool_calls（最终回复）:
       └─ break，返回 content
5. 循环结束条件：正常结束 / max_rounds 耗尽（降级文案）
```

#### 3.1.5 上下文压缩

**触发条件**（两处）：

- **Supervisor 消息组装时**（`_compact_supervisor_messages`）：

  - `AGENT_COMPACTOR_ENABLED = True` 且消息数 > 2
  - body（去掉 system + 当前输入）超过 `AGENT_COMPACTOR_MESSAGE_THRESHOLD`（默认 20 条）
  - 保留 system prompt 和当前用户输入，中间部分使用 `ContextCompactor.compact_openai_messages()` 压缩
- **Service 层保存上下文时**（`_trim_and_save_context`）：

  - 消息历史超过阈值时压缩
  - 兜底截断：超过 `MAX_MESSAGE_HISTORY = 100` 时保留最近 100 条

**压缩策略**：

- 保留最近 `recent_turns_to_keep` 轮完整对话（默认 5 轮 = 10 条消息）
- 更早消息压缩为摘要（优先 LLM 生成语义摘要，回退关键词提取）
- Token 估算：英文 4 字符 ≈ 1 token，中文 2 字符 ≈ 1 token

#### 3.1.6 Token 预算

| 层级       | 机制                               | 说明                                              |
| ---------- | ---------------------------------- | ------------------------------------------------- |
| 业务配额   | `check_quota(user_id)`           | 用户级 Token 配额检查，超限直接拦截               |
| 请求级预算 | `_chat_turn_with_tools()` 中估算 | 输入/输出 token 记录到 `context_metrics`        |
| 上下文压缩 | `ContextCompactor`               | 超 `AGENT_COMPACTOR_MAX_TOKENS=6000` 时自动压缩 |

#### 3.1.7 危险工具确认

**标记方式**：`@ToolRegistry.register(..., dangerous=True)` 注册时标记

**确认流程**：

1. LLM 调用危险工具时，Supervisor 发送 `block_callback("tool_confirm", ...)` 到前端
2. 创建 `_DangerousConfirmState`（含 `asyncio.Event`），存入 `_pending_confirms[session_id]`
3. `await state.event.wait()` 阻塞等待用户确认
4. 用户通过 `POST /agent/chat/{session_id}/confirm` 提交 `approve`/`reject`
5. `set_confirm_result(session_id, action)` 唤醒协程
6. `reject` 时返回取消结果给 LLM；`approve` 时继续执行工具

#### 3.1.8 FSM 状态机

- 位置：`server/app/modules/agent/fsm.py`
- 状态流转：`init -> intent_parse -> planning -> executing -> done/failed`
- 基于 `transitions` 库
- **仅用于观测**：实际路由由 Tool-Calling 循环决定，FSM 状态同步到 `ctx.step` 用于日志和追踪
- `fail` 转换可从任意状态触发

### 3.2 Tool 注册表与分发

#### 3.2.1 ToolRegistry

- 位置：`server/app/modules/agent/tool_registry.py`
- 类级别字典存储：`_tools`, `_schemas`, `_permissions`, `_permission_flags`, `_titles`, `_external_tool_servers`, `_dangerous`, `_categories`

**内部工具注册**：`@ToolRegistry.register(name, schema, permission, title, ...)` 装饰器

**外部 MCP 工具注册**：

- `register_external_tools(connection_id, tools)` — 命名空间格式 `{connection_id}__{raw_name}`
- `unregister_external_tools(connection_id)` — 断开时清理
- `is_external_tool()` / `get_external_connection()` — 路由判断

#### 3.2.2 工具分类

`tools_impl/` 下的子目录即为工具分类：

| 分类 | 子目录 | 工具数量 | 说明 |
|------|--------|---------|------|
| 核心工具 | `core/` | 3 | `get_current_time`, `calculate`, `load_skill` |
| 数据查询 | `query/` | 5 | `query_data`, `analyze_anomaly` 等 |
| 报告 | `reporting/` | ~28 | 报告生成/订阅/模板/图表/实例 |
| 看板 | `dashboard/` | ~21 | 看板 CRUD + 指标标签页 |
| 告警 | `alerts/` | ~22 | 规则/渠道/静默/记录管理 |
| 配置 | `config/` | ~6 | AI 端点/指标标签/指标语义 |
| 协作 | `collaboration/` | ~35 | 用户分群/项目空间/事件分析/资源标签 |
| 筛选模板 | `filter_templates/` | ~8 | 筛选模板 CRUD + 分享 |
| VS 对比 | `vs_comparison/` | 1 | 多时间段对比 |

#### 3.2.3 工具分发层 (tools.py)

- 位置：`server/app/modules/agent/tools.py`

`_execute_tool_impl()` 路由逻辑：

1. 外部 MCP 工具 → `mcp_client_manager.call_external_tool()`
2. 内部工具 → `ToolRegistry.get_tool()` 查找并执行
3. 权限检查 → `check_mcp_permission()`（外部工具直接放行，内部工具按注册表权限校验）

`execute_tool()` 统一包装：审计记录、trace span、错误处理、执行历史写入

### 3.3 QueryAgent

- 位置：`server/app/modules/agent/query_agent.py`
- 职责：自然语言查询、查询模式分类、SQL 生成与执行、结果归一化
- 当前由 `query_data` 工具触发

#### 3.3.1 当前口径

- **主路径收敛到 PostgreSQL**：NL2SQL 生成标准 SQL 在本地 PostgreSQL 执行
- 登录/订单明细类问题走 `DataCenter API`
- 表查询走 `DataCenter /free-query`
- 指标语义匹配走 `MetricSemanticsService`（数据库中的指标语义注册表）
- 历史本地 OLAP 路径已完全移除；CubeQueryService 已废弃
- 所有涉及多项目的查询均通过 `asyncio.gather` 并行执行
- 对外结果增加 `query_mode / data_source` 可观测字段

#### 3.3.2 查询五阶段流水线

```
用户输入 (自然语言)
    │
    ▼
阶段 1: 查询模式分类 (_classify_query_mode)
    - table_query / order_detail / login_detail
    - dashboard_metric (语义层指标匹配)
    - sql (兜底模式)
    │
    ▼
阶段 2: SQL 生成（仅 sql 模式）
    - IntentGenerator.build_prompt() → LLM 生成 Intent JSON
    - CorrectorChain 校验修正
    - PostgresIntentTranslator.translate() → 标准 PostgreSQL SQL
    - 并行投票: AdvancedVoter (n=3 candidates)
    │
    ▼
阶段 3: 执行
    - DC API: DatacenterClientPool (free_query / aggregate / metrics)
    - 本地 SQL: validate_sql + _execute_sql_with_count (PostgreSQL)
    - 多项目并行: asyncio.gather
    │
    ▼
阶段 4: 结果归一化
    - _merge_cross_project_rows()
    - _apply_result_policy() (截断/预览策略)
    - _make_json_serializable()
    │
    ▼
响应文本 + query_result (结构化数据)
```

#### 3.3.3 查询模式分类

| 模式 | 触发条件 | 执行路径 | 数据来源 |
|------|----------|----------|----------|
| `table_query` | 用户输入含表名（`查表=xxx`、`表名=xxx` 等） | DC `/free-query` | 数据中心 |
| `order_detail` | 关键词：订单明细、付费记录、充值记录等 | DC `QueryService` | 数据中心 |
| `login_detail` | 关键词：登录明细、登录记录等 | DC `QueryService` | 数据中心 |
| `dashboard_metric` | `MetricSemanticsService.match_metric()` 命中 | MetricSemanticsService → DC `/aggregate` | 数据中心 / 指标语义 |
| `unsupported_activity_metric` | SQL 模式中含活动名称但无对应语义 | 不查数据，返回 guard message | — |
| `sql` | 兜底模式 | Intent → Corrector → Translator → PostgreSQL | PostgreSQL |

分类优先级：

1. `_extract_table_query_intent()` -> `table_query`
2. 关键词匹配 -> `order_detail` / `login_detail`
3. `SemanticLayer.match_metric()` -> `dashboard_metric`
4. 兜底 -> `sql`

#### 3.3.4 SQL 生成：Intent 路径

SQL 生成采用 `LLM → Intent JSON → CorrectorChain → Translator → SQL` 的四阶段确定性流水线：

**阶段 A — IntentGenerator** (`table_access/intent_generator.py`)：
- `build_prompt()` 构造包含 schema context + time context + user input 的完整 prompt
- LLM 返回结构化 JSON，描述表名、指标字段、聚合方式、过滤条件、排序、分组、limit
- `parse_intent_from_json()` 防御性解析 JSON（含 `json_repair` 回退）

**阶段 B — CorrectorChain** (`runtime/self_correction.py`)：
- 对 Intent 进行多层校验：字段白名单验证、聚合函数合法性、表名合法性
- 未通过时尝试自动修正
- 返回 `CorrectionResult { passed, corrected, errors }`

**阶段 C — PostgresIntentTranslator** (`table_access/intent_translator.py`)：
- 纯确定性转换，不依赖 LLM
- 将 `SemanticQueryIntent` 映射为标准 PostgreSQL SQL
- 标识符正则校验 `^[a-zA-Z_][a-zA-Z0-9_]*$`
- 最大 LIMIT 10000

**阶段 D — 并行投票**：
- `generate_sql_with_parallel_voting()` 生成 N=3 个候选 SQL（不同 temperature）
- `AdvancedVoter` 基于 SQL 执行结果集投票选出最优
- 并行失败回退到串行单 Intent 路径

#### 3.3.5 语义层 (SemanticLayer)

- 位置：`server/app/modules/agent/semantic_layer/`
- 运行时从 YAML 文件加载指标、表、维度、业务规则定义
- 关键接口：
  - `match_metric(user_input)`：简单关键词匹配
  - `build_schema_context()`：生成 LLM Prompt 可用的 schema 上下文
  - `build_business_rules_context()`：生成业务规则上下文（供后续 MCP 接入使用）

#### 3.3.6 SQL 校验器

- 位置：`server/app/modules/agent/table_access/nl2sql.py`
- `validate_sql()`：SELECT 前缀、禁止关键字、表白名单、字段白名单、函数白名单、LIMIT
- 当前主校验路径依赖 `CorrectorChain` 进行字段/表/聚合函数合法性校验

#### 3.3.7 数据中心客户端

- 位置：`server/app/modules/datacenter/client.py`
- `DatacenterClient` 封装数据中心 HTTP 接口：
  - `aggregate()` -> `/api/v1/external/aggregate`
  - `aggregate_timeseries()` -> `/api/v1/external/aggregate/timeseries`
  - `aggregate_distribution()` -> `/api/v1/external/aggregate/distribution`
  - `free_query()` -> `/api/v1/external/free-query`
  - `sql_query()` -> `/api/v1/external/sql-query`
  - `get_metrics_catalog()` -> `/api/v1/external/aggregate/metrics`
- `DatacenterClientPool` 连接池管理：针对不同项目配置的 `base_url` + `api_key` 复用连接
- 特性：异步 httpx、指数退避重试（429 限流）、X-API-Key 认证、`game_id`/`region` 维度隔离

#### 3.3.8 数据源总览

```
QueryAgent 数据获取路径
├── dashboard_metric
│   └── MetricSemanticsService → DC /aggregate
├── login_detail / order_detail
│   └── DC QueryService (DatacenterLoginRepo / DatacenterOrderRepo)
├── table_query
│   └── DatacenterClientPool → DC /free-query 或 /free-query/metrics
└── sql (主路径)
    ├── IntentGenerator (LLM → Intent JSON)
    ├── CorrectorChain (校验 + 修正)
    ├── PostgresIntentTranslator (Intent → SQL)
    └── PostgreSQL _execute_sql_with_count()
```

### 3.4 AnalystAgent

- 位置：`server/app/modules/agent/analyst.py`
- 职责：指标变化归因分析
- 当前由 `analyze_anomaly` 工具触发

**核心分析方法**：

| 方法 | 功能 |
|------|------|
| `compute_attribution()` | 单维度归因：对比 target/baseline 日期，按维度计算贡献度，返回 top5 贡献项 |
| `compute_multi_dimension_attribution()` | 多维度组合归因：支持 2-3 个维度的组合分析 |
| `_generate_explanation_sync()` | 同步调用 LLM 生成归因解释（降级为模板文案） |
| `_generate_multi_dim_explanation_sync()` | 多维度归因解释生成 |
| `_generate_cross_insights()` | 生成跨维度洞察 |

**输入**：`metric`（默认 DAU）、`target_date`、`baseline_date`（默认前一天）、`dimension_name`、`project_id`
**输出**：`total_current`、`total_baseline`、`change_rate`、`contributions`/`combinations`、`root_cause`、`confidence`

> 注意：历史聚合表已下线，`METRIC_SQL_MAP = {}`，归因分析主要依赖 DC 数据。

### 3.5 ReportAgent

- 位置：`server/app/modules/agent/report/agent.py`
- 职责：规划分析步骤、调用查询、组装富媒体报告
- 当前由 `generate_report` 工具触发，同时被 `ReportWorker` 和 `WatcherDetector` 按需调用

#### 3.5.1 三段式执行流程

```
规划 (Plan) -> _create_plan() -> ReportPlanner
    │
    ▼
执行 (Execute) -> _execute_plan() / _execute_plan_stream() -> ReportExecutor
    │                                                           │
    │                                                    ┌──────┴──────┐
    │                                                    │ QueryAgent  │
    │                                                    │ .run()      │
    │                                                    │ (NL2SQL →   │
    │                                                    │  PG / DC)   │
    │                                                    └─────────────┘
    ▼
组装 (Assemble) -> _assemble_report() -> ReportAssembler
```

- 支持依赖解析：`depends_on` 声明步骤间依赖，按拓扑排序分批执行
- 并发控制：默认 `max_concurrency=3`，防止连接池耗尽
- 容错处理：单步骤失败不影响其他步骤
- 流式版本：`generate_report_stream()` 带进度回调

#### 3.5.2 ReportPlanner

- 位置：`server/app/modules/agent/report/planner.py`
- 基于 LLM 进行开放式报告规划：
  - LLM 直接生成包含 `analysis_steps`、`time_range`、`report_title` 的完整计划 JSON
  - 跨项目检测：自动追加"项目列表获取"步骤并更新依赖链
  - JSON 提取 5 层降级：直接解析 -> 代码块提取 -> 最外层花括号 -> `json_repair` -> 兜底默认计划
  - 兜底无步骤时自动填充默认多步骤计划

#### 3.5.3 ReportExecutor

- 位置：`server/app/modules/agent/report/executor.py`
- 执行流程：构建查询描述 -> 查询缓存检查 -> 调用 `QueryAgent.run()` -> 数据聚合 -> 图表规格生成 -> 洞察生成
- 关键能力：
  - 依赖注入：将前置步骤结果摘要注入当前查询的 `query_description`
  - 查询缓存：`ReportQueryCache` 按 `project_id + query_description + time_range_label` 缓存
  - 数据聚合：`_aggregate_rows_by_chart_dimension()` 根据图表配置聚合重复行
  - 图表生成：`_generate_chart_spec()` 含异常检测、下钻建议、Pinnable 配置
  - 异常检测：环比变化 >30% 或 Z-score >2 标记异常

#### 3.5.4 ReportAssembler

- 位置：`server/app/modules/agent/report/assembler.py`
- 组装富媒体 HTML 报告：
  - 概览章节（KPI 卡片）
  - 数据章节（洞察 + 图表 + 数据表格）
  - 缺数降级章节（标记失败步骤及原因）
  - 建议动作章节
  - 总结章节
- HTML 使用 ECharts 5.4.3 CDN、响应式布局、CSS 变量主题系统

#### 3.5.5 InsightPipeline

- 位置：`server/app/modules/agent/report/insight_pipeline.py`
- 五层架构（L1-L4 纯代码，L5 LLM 增强）：

| 层级 | 功能 | 成本 |
|------|------|------|
| L1 | 数据概览（记录数、时间范围） | 0 LLM |
| L2 | 趋势模式（方向、周期性、拐点） | 0 LLM |
| L3 | 异常检测（Z-score + 业务阈值） | 0 LLM |
| L4 | 业务洞察（规则驱动，支持外部 MD 配置） | 0 LLM |
| L5 | LLM 增强（汇总润色） | 1 次 LLM/步骤 |

#### 3.5.6 ReportExecutionService

- 位置：`server/app/services/reporting/execution/report_execution_service.py`
- 统一报告执行应用服务边界：`plan -> execute -> assemble -> persist -> push`
- 核心方法：

| 方法 | 说明 |
|------|------|
| `generate_and_persist()` | 生成报告 + 持久化到 PostgreSQL + 文件存储 |
| `generate_and_push()` | 生成 + 持久化 + 向渠道推送（微信/邮件） |
| `generate_alert_report()` | 告警触发的报告生成（source=alert） |
| `generate_subscription_report()` | 订阅触发的报告生成（source=subscription） |

### 3.6 ReportAgent 的数据源（完整链路）

```
触发入口
├── 手动 API: POST /v1/reports/generate
│   └── ReportGenerator.generate_report_from_description()
├── 定时订阅: ReportWorker (APScheduler)
│   └── _list_active_subscriptions() → _generate_and_push_report()
└── 告警触发: WatcherDetector.detect_all()
    └── dispatch_alert_report_task() → generate_alert_report()

        ┌─── 三条路径汇聚 ───┐
        ▼                    ▼
ReportExecutionService.generate_and_persist()
        │
        ▼
ReportGenerator.generate_report_from_description()
        │
        ▼
ReportAgent.generate_report()
        │
        ├── 1. ReportPlanner.create_plan()     [LLM]
        │       └── LLM 生成 analysis_steps[]
        │
        ├── 2. ReportExecutor.execute_step()   [逐步骤]
        │       └── QueryAgent.run()
        │           ├── sql → PostgreSQL
        │           ├── dashboard_metric → DC aggregate
        │           ├── login_detail/order_detail → DC
        │           └── table_query → DC free_query
        │
        └── 3. ReportAssembler.assemble()      [LLM + 模板]
                ├── _generate_insights()       [LLM 跨步骤洞察]
                ├── _assemble_sections()        [代码 + ECharts]
                └── _build_html()               [HTML 模板]

持久化与推送
├── PostgreSQL: report_instances 表
├── 文件: /exports/reports/{report_id}.html
└── 推送: AlertNotifier (微信 webhook / 邮件)
```

### 3.7 WatcherDetector

- 位置：`server/app/modules/agent/runtime/watcher_detector.py`
- 职责：告警检测、规则判断、通知链路、告警报告生成
- 运行方式：独立 Worker（`uv run watcher-worker`，由 `server/worker/runners/watcher.py` 调度）

#### 3.7.1 检测流程

```
detect_all() -> 遍历所有启用规则
    ├── 过滤规则类型 (rule_type_filter)
    ├── 检查 Agent 驱动型规则的 LLM API Key
    ├── 检查检测周期 (_should_check_rule: 按 period 频率控制)
    ├── detect_rule() -> 执行具体检测
    │     ├── threshold: 固定阈值判断 (gt/lt/gte/lte/eq)
    │     ├── change: 计算环比/同比变化率 (yesterday/week_ago/month_ago/year_ago)
    │     └── agent_driven: LLM 智能判断（_detect_agent_driven）
    │           └── 回退 _statistical_anomaly_detection (3-sigma / z-score)
    ├── record_detect_result() → 持久化告警记录
    ├── _is_duplicate_alert() → 30 分钟窗口内重复抑制
    ├── check_silence_period() → 检查静默期（一次性/周期性 daily）
    └── dispatch_alert_report_task() → 后台线程生成告警分析报告
        └── generate_alert_report() → ReportExecutionService → ReportAgent
```

#### 3.7.2 与 Supervisor 的关系

- **WatcherDetector 不被 Supervisor 调用**，完全独立运行
- API 层仅提供状态查询（`/agent/watcher/status`）
- 属于 Supervisor 对话回路外的独立服务

#### 3.7.3 三种检测类型

| 类型 | 常量 | 检测逻辑 |
|------|------|----------|
| 阈值型 | `RULE_TYPE_THRESHOLD` | `current_value` vs `threshold`，按 `condition` (gt/lt/gte/lte/eq) 判断 |
| 变化量型 | `RULE_TYPE_CHANGE` | `(current - compare) / compare` 与 `change_threshold_pct` 比较，支持 rise/fall |
| Agent 驱动型 | `RULE_TYPE_AGENT_DRIVEN` | LLM 基于历史数据多维度判断异常，回退 3-sigma/z-score |

#### 3.7.4 目标状态机

- 单一主记录 + 通知日志 + 报告状态回写
- `WatcherDetector` 负责检测与创建主告警记录
- 通知结果写入通知日志，不生成第二条"伪触发记录"
- 告警报告状态回写主记录的 `report_instance_id` / `report_status`

---

## 4. AgentContext 与数据模型

### 4.1 AgentContext

- 位置：`server/app/modules/agent/context_state/context.py`

**基础信息字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `request_id` | str | 请求追踪 ID |
| `user_id` | str | 用户 ID |
| `session_id` | str | 会话 ID |
| `user_input` | str | 当前用户输入 |
| `intent` | Literal | 意图（query/analysis/alert/unknown），仅观测用 |
| `project_id` | str | 项目 ID |
| `target_project_ids` | list[str] | 目标项目 ID 列表（跨项目查询） |

**业务上下文字段**：

| 字段 | 说明 |
|------|------|
| `metrics` / `dimensions` | 指标/维度列表 |
| `time_range` | 时间范围 |
| `context_refs` | 引用上下文（前端 @图表 / #查询） |
| `message_history` | 消息历史（OpenAI 格式） |

**AI 配置重写字段**：

| 字段 | 说明 |
|------|------|
| `ai_api_key` / `ai_model` / `ai_base_url` | 前端透传的用户自定义 LLM 配置 |

**执行状态与结果字段**：

| 字段 | 说明 |
|------|------|
| `step` | 当前步骤（init/intent_parse/planning/executing/done/failed） |
| `query_result` / `analysis_result` / `chart_result` | 各类结果 |
| `response_text` | 最终回复文本 |
| `tool_calls` | 最近一轮工具调用 |
| `block_callback` | SSE Block 发送回调（不序列化） |
| `attachments` | 附件列表 |
| `plan_steps` / `current_step_index` | 计划步骤与当前索引 |

**Memory 相关字段**：

| 字段 | 说明 |
|------|------|
| `extracted_entities` | 提取的实体（时间、指标、维度） |
| `confirmed_facts` | 已确认事实 |
| `pending_clarifications` | 待澄清问题 |
| `execution_history` | 工具调用历史 |

---

## 5. 记忆机制（Memory）

记忆系统采用**三层渐进式架构**：

| 层级 | 作用域 | 存储 | 生命周期 |
|------|--------|------|----------|
| 短期记忆 | 单次请求 | `AgentContext` 对象 | 随请求创建销毁 |
| 中期记忆 | 会话级 | `AgentSessionStorage` + `message_history` | 跨轮次持久化 |
| 长期记忆 | 用户级 | PostgreSQL `agent_user_facts` + Redis 缓存 | 跨会话长期保存 |

### 5.1 实体提取

每次用户输入到达后，`run_supervisor()` 调用 `memory.extract_all_entities(user_input)`：

| 实体类型 | 提取方法 | 说明 |
|----------|----------|------|
| 时间实体 | `extract_time_entities()` | `TimeExpressionParser` 解析"昨天"、"本周"等 |
| 指标实体 | `extract_metric_entities()` | 关键词硬匹配 |
| 维度实体 | `extract_dimension_entities()` | 关键词硬匹配 |

提取结果写入 `ctx.extracted_entities`。

### 5.2 Prompt 注入

`_get_supervisor_system()` 构建 system prompt 时调用 `memory.build_contextual_prompt()`：

```markdown
## 已确认事实
- server_filter: region_a

## 当前时间范围
{'start': '2026-04-29', 'end': '2026-04-29'}

## 待澄清问题
- [high] 请确认查询留存的时间范围
```

**注入来源**：`confirmed_facts[-5:]` + `extracted_entities["time_range"]` + `pending_clarifications`

### 5.3 事实管理

| 操作 | 方法 | 触发场景 |
|------|------|----------|
| 确认事实 | `confirm_fact(key, value)` | 用户明确给出偏好或参数 |
| 添加澄清 | `add_clarification(question, priority)` | 信息不足 |
| 解决澄清 | `resolve_clarification(question, answer)` | 用户回答澄清问题 |

### 5.4 长期记忆持久化（FactStore）

- 位置：`server/app/modules/agent/context_state/fact_store.py`
- 存储：PostgreSQL `agent_user_facts` 表 + Redis 缓存（1h TTL）
- 字段：`user_id`, `fact_type`, `key`, `value`, `confidence`, `source`, `expires_at`
- Fact 类型：`PREFERENCE`, `BUSINESS_RULE`, `METRIC_DEFINITION`, `DIMENSION_VALUE`, `TIME_RANGE`, `THRESHOLD`

### 5.5 智能历史检索

`memory.get_relevant_history(user_input, top_k=3)`：

1. 优先使用 Embedding 余弦相似度（`litellm.embedding()`）
2. embedding 失败时回退到关键词匹配
3. 当前仅用于内部逻辑，**未注入 system prompt**

---

## 6. 工具选择前置校验层

### 6.1 位置与职责

- 位置：`server/app/modules/agent/base.py` — `_validate_tool_selection()`
- 调用时机：LLM 返回 `tool_calls` 之后、`execute_tool()` 之前

### 6.2 三层校验规则

| 规则 | 拦截场景 | 处理方式 |
|------|----------|----------|
| 格式检查 | tool_calls 无法解析 | 返回格式错误 |
| 单工具限制 | 单次响应 2+ 个 tool_calls | 提示"一次只能调用一个工具" |
| 意图-分类不匹配 | 如 query 意图调 `analyze_anomaly` | 提示建议的正确工具 |
| 必填参数缺失 | `query_text` 为空等 | 提示缺少参数 |

意图-分类映射由 `_INTENT_CATEGORY_MAP` 和 `_INTENT_CATEGORY_MISMATCH` 控制。

### 6.3 校验失败处理

- 不发送 tool_call block 到前端
- 不执行工具
- messages 追加 system 提示
- trace_writer 打 span：`validation_failed=True`
- continue 进入下一轮 LLM 调用

---

## 7. Tool-Calling 口径

当前统一口径：

- Supervisor 负责和用户对话
- LLM 决定是否调用工具
- 工具执行由代码完成
- Query / Analyst / Report 作为工具背后的执行单元
- Watcher 独立运行，不参与普通聊天会话的主链路编排

补充当前实现事实：

- `SUPERVISOR_TOOLS` 由 `ToolRegistry.get_all_schemas()` 动态组装
- `_execute_tool_impl()` 通过注册表查找，不再维护巨型 `if-elif` 链
- MCP 工具权限声明与工具定义一起注册
- Prompt 构建只记录 layer 名称与总字符数等元数据
- 稳定层缓存默认开启，TTL 为 `AGENT_PROMPT_CACHE_TTL_SECONDS=3600`
- Token 预算默认开启：`AGENT_MAX_INPUT_TOKENS=16000`、`AGENT_MAX_OUTPUT_TOKENS=4000`、`AGENT_MAX_TOTAL_TOKENS=24000`

---

## 8. MCP 架构

### 8.1 MCP Server

- 位置：`server/mcp_server/server.py`
- 暴露 Supervisor Agent 能力给外部 AI 客户端（Claude Desktop、Cursor 等）
- 传输模式：SSE（默认，`127.0.0.1:21802`）/ stdio

#### 8.1.1 认证机制 (`mcp_server/auth.py`)

三层认证体系，按顺序验证：

1. **JWT Token**：`decode_token()` 验证
2. **API Key**：以 `ga_` 开头，通过 `APIKeyService.validate_key()` 验证
3. **静态 Token**：环境变量 `MCP_AUTH_TOKEN`，`hmac.compare_digest` 时序安全比较

认证方式：

- Header：`Authorization: Bearer <token>`
- Query Parameter：`?token=<token>`（需 `MCP_ALLOW_QUERY_TOKEN=true`）
- 匿名：`MCP_ALLOW_ANONYMOUS=true`（生产应禁用）

上下文隔离：`MCPAuthContext` 使用 `contextvars.ContextVar` 存储当前用户信息，避免 SSE 连接间状态共享。

#### 8.1.2 工具暴露

`list_tools()` 合并 Registry Tools + Legacy Tools（Registry 优先，Legacy 去重补充）

`call_tool()` 调度逻辑：

1. Registry 中存在的工具 -> `execute_tool()`（复用内部 Tool-Calling 链路）
2. Legacy 工具 -> `_handle_*` 分支（兼容 fallback）

#### 8.1.3 Legacy Tool 模块

| 模块 | 工具范围 |
|------|----------|
| `mcp_server/tools/query.py` | query_data, analyze_metric, calculate, ai_endpoint CRUD, login/payment detail |
| `mcp_server/tools/dashboard.py` | overview, active, growth, payment, retention |
| `mcp_server/tools/report.py` | report preview, subscriptions, channels |
| `mcp_server/tools/alert.py` | alert rules, channels, silence rules |

#### 8.1.4 安全与传输

- 传输层：`server/mcp_server/transport.py`，SSE 使用 Starlette，stdio 使用 `mcp.server.stdio`
- SSRF 防护：`server/app/core/runtime/url_validator.py` 的 `is_safe_url()`，拒绝私有 IP/Loopback/Link-local
- 启动安全检查：`server/mcp_server/security_check.py` 检查匿名访问、Token 强度、JWT 密钥

### 8.2 MCP Client

- 位置：`server/mcp_server/client.py`
- `MCPClientManager` 单例，管理外部 MCP Server 连接

#### 8.2.1 连接管理

支持 SSE 和 stdio 两种 transport：

- **SSE**：需 `base_url`，连接前执行 SSRF 检查
- **stdio**：需 `command`，通过 `subprocess.Popen` 启动子进程

生命周期方法：

- `startup()` — 从 DB 加载 enabled 连接，建立连接，注册外部工具到 `ToolRegistry`
- `shutdown()` — 断开所有连接
- `on_connection_config_change()` — 配置变更时动态重连

#### 8.2.2 工具代理

外部工具通过 `register_external_tools()` 注册到 `ToolRegistry`，命名空间格式 `{connection_id}__{raw_name}`。

Supervisor 调用外部工具时，`tools.py` 的 `_execute_tool_impl()` 路由到 `mcp_client_manager.call_external_tool()`，透传参数到外部 MCP Server。

#### 8.2.3 Schema 同步

- `compute_tools_hash()` — 计算工具列表的 SHA256 hash
- 连接成功后比对 hash，变更时更新 DB

---

## 9. Langfuse 可观测与评估

### 9.1 集成架构

Langfuse 以**可选依赖**方式集成，未配置时自动降级为 no-op：

- **配置**：`settings.langfuse_public_key` / `settings.langfuse_secret_key` / `settings.langfuse_host`
- **环境同步**：`server/app/modules/agent/runtime/langfuse_config.py`
- **Trace Writer**：`server/app/modules/agent/runtime/trace_writer.py`

### 9.2 追踪层级

| 类型 | 名称示例 | 追踪内容 |
|------|----------|----------|
| **Trace** | `agent.chat` / `agent.query` | 一次完整用户请求 |
| **Span** | `supervisor.llm_round` / `tool.call` / `query.generate_sql` | 各阶段耗时与输入输出 |
| **Score** | `tool_success` / `sql_safety_pass` / `permission_safety_pass` | 布尔量化指标 |

完整 Span 列表见 `server/app/modules/agent/runtime/trace_schema.py`。

### 9.3 评估体系

- **黄金用例集**：`server/tests/data/golden_agent_cases.yaml`
- **实验运行器**：`server/scripts/eval/run_langfuse_agent_experiment.py`
- **Hard Gates**：`permission_safety_pass` / `data_scope_pass` 等必须通过的门槛
- **安全约束**：Langfuse 只允许存储脱敏后的 SQL 摘要

### 9.4 用户反馈数据

用户在 Chat 页面点击"有用/无用"后，反馈落入 PostgreSQL `sys_chat_feedback`。该表是平台侧稳定评价数据源。

Langfuse score 仅作为观测增强，不作为反馈主存储。

---

## 10. Skill 机制

Skill 采用**双轨架构**，同一功能**不在两条轨道中重复定义**：

### 10.1 轨道 A：Python 类 Skill

- 位置：`server/app/modules/agent/skills/`
- 注册：包导入时 `auto_discover()` 扫描类名以 `Skill` 结尾且含 `metadata` 属性的类
- 匹配：`metadata.triggers` 关键词匹配，`find_skills(user_input, threshold=0.5)`
- 注入：`get_prompt_fragment()` 将提示词片段注入 system prompt

### 10.2 轨道 B：Markdown Skill

- 位置：`server/app/modules/agent/skills/{skill_id}/SKILL.md`
- 扫描：`skills_loader.py` 运行时扫描 YAML frontmatter（`name` / `description` / `suggested_tools`）
- 元数据注入：`get_skills_metadata_text()` 追加到 system prompt
- 正文加载：LLM 调用 `load_skill(skill_id)` 时读取 Markdown 正文

### 10.3 当前 Skill 列表

| Skill | 轨道 | 触发场景 |
|-------|------|----------|
| `channel_analysis` | Python | 各渠道、分渠道、按渠道拆解 |
| `retention_analysis` | Markdown | 次日留存、7日留存、留存趋势 |
| `payment_analysis` | Markdown | ARPU、付费率、LTV、付费分层 |
| `event_analysis` | Markdown | 活动效果、活动对比、活动 ROI |

---

## 11. Prompt 系统

### 11.1 组装器

- `server/app/modules/agent/prompts/assembler.py` — Supervisor Prompt 组装
- `server/app/modules/agent/prompts/query_assembler.py` — Query Agent Prompt 组装
- `server/app/modules/agent/prompts/analyst_assembler.py` — Analyst Prompt 组装

### 11.2 层次结构

Supervisor prompt 采用分层组装：

| 层 | 文件 | 说明 |
|----|------|------|
| Base | `prompts/layers/_base.md` | 基础系统人设、行为准则 |
| Time Context | `prompts/layers/_time_context.md` | 动态时间上下文 |
| Tools | `prompts/layers/_tools.md` | **动态生成**：`_build_tools_layer()` 从 `ToolRegistry.get_tools_by_category()` 渲染 |
| Memory | `prompts/layers/_memory.md` | 记忆注入片段 |
| Rules | `prompts/layers/_rules.md` | 全局规则约束 |

### 11.3 缓存

- 位置：`server/app/modules/agent/prompts/_cache.py`
- 稳定层缓存默认开启，TTL 为 `AGENT_PROMPT_CACHE_TTL_SECONDS=3600`
- Prompt 构建只记录 layer 名称与总字符数等元数据，不记录完整 prompt
- Cache key 包含：layer 内容 hash + 变量 hash + tool schemas hash + TTL

### 11.4 模板文件

| 文件 | 用途 |
|------|------|
| `prompts/supervisor.md` | Supervisor 系统 Prompt |
| `prompts/nl2sql.md` | NL2SQL 时间上下文模板 |
| `prompts/layers/_rules.md` | 规则层 |

---

## 12. 上下文状态与运行时基础设施

### 12.1 ContextCompactor

- 位置：`server/app/modules/agent/context_state/context_compactor.py`
- 保留最近 `recent_turns_to_keep` 轮完整对话（默认 5 轮）
- 更早消息压缩为摘要（优先 LLM 生成，回退关键词提取）
- `AsyncLLMSummaryGenerator`：可插拔的 LLM 摘要生成器

### 12.2 TokenBudget

- 位置：`server/app/modules/agent/context_state/token_budget.py`
- 默认值：`AGENT_MAX_INPUT_TOKENS=16000`、`AGENT_MAX_OUTPUT_TOKENS=4000`、`AGENT_MAX_TOTAL_TOKENS=24000`

### 12.3 ContextMetrics

- 位置：`server/app/modules/agent/context_state/context_metrics.py`
- `ContextMetricsCollector`：滑动窗口（默认 1h），async-safe
- 追踪：token 使用量、压缩次数、平均压缩比

### 12.4 TraceWriter / TraceSchema

- `trace_writer.py` — 封装 `span()`、`update_trace()`、`update_span_output()`、`score_current_trace()`
- `trace_schema.py` — 定义所有 Trace/Span/Score 命名规范，含 `redact_mapping()` 脱敏

### 12.5 LLM Client 统一配置

- 位置：`server/app/modules/agent/runtime/llm_client.py`
- `get_llm_config()` 统一返回 LLM 配置（含 `litellm_model`、`api_key`、`temperature`、`extra_kwargs`）
- 支持按 `agent_type`（supervisor/query/analyst/report/watcher）获取差异化配置
- 配置优先级：`AgentContext 重写` > `DB 全局端点配置` > `兜底默认值`
- 支持 Provider：openai、deepseek、glm、qwen、gemini、claude

### 12.6 自校正与投票

- `self_correction.py` — `CorrectorChain` + 并行投票生成 `generate_sql_with_parallel_voting()`
- `voter.py` — `AdvancedVoter`，基于 SQL 执行结果投票选出最优候选
- `parallel_generator.py` — `ParallelSQLGenerator`，并行 SQL 生成调度（n_candidates=3, 默认 temperature 分布）

---

## 13. Runtime API（对外口径）

### 13.1 AgentService

- 位置：`server/app/modules/agent/service.py`
- `chat_stream()`：流式 SSE 对话，block_callback 分发 block/heartbeat/done
- `chat()`：非流式对话
- `get_context()` / `clear_context()`：会话上下文管理

### 13.2 API 路由

- 位置：`server/app/modules/agent/api.py`

| 路由 | 方法 | 说明 |
|------|------|------|
| `POST /agent/chat` | chat_message | 非流式对话 |
| `POST /agent/chat/stream` | chat_stream | 流式 SSE 对话 |
| `POST /agent/chat/{session_id}/confirm` | confirm_dangerous_tool | 危险工具确认 |
| `POST /agent/query` | execute_query | 直接 NL2SQL 查询 |
| `POST /agent/analyze` | execute_analysis | 归因分析 |
| `POST /agent/report/generate` | generate_agent_report | 报告生成 |
| `GET /agent/watcher/status` | get_watcher_status | Watcher 状态 |
| `GET /agent/health` | health_check | 5 组件健康状态 |

### 13.3 Report/Watcher 专用接口

| 路由 | 方法 | 说明 |
|------|------|------|
| `POST /v1/reports/generate` | generate_report | 手动报告生成（基于模板） |
| `POST /v1/reports/preview` | preview_report | AI 报告预览 |
| `POST /v1/reports/generate-ai` | generate_ai_report | AI 报告生成（从自然语言） |
| `POST /v1/reports/subscriptions/{id}/execute` | execute_subscription | 手动触发订阅执行 |
| `GET /v1/alerts/rules` | list_rules | 告警规则列表 |
| `POST /v1/alerts/rules/{id}/test` | test_rule | 测试单条告警规则 |

### 13.4 流式输出协议

**事件类型**：

- `event=message`：thinking / tool_call / tool_result / tool_confirm / text / block_delta / done
- `event=heartbeat`：ping 保活（默认 15 秒间隔）
- `event=error`：错误事件

---

## 14. 相关代码位置

| 模块 | 路径 |
|------|------|
| Supervisor | `server/app/modules/agent/base.py` |
| Runner（重试机制） | `server/app/modules/agent/runner.py` |
| AgentService | `server/app/modules/agent/service.py` |
| Agent API | `server/app/modules/agent/api.py` |
| QueryAgent | `server/app/modules/agent/query_agent.py` |
| SemanticLayer | `server/app/modules/agent/semantic_layer/` |
| MetricSemanticsService | `server/app/modules/agent/semantic_layer/semantic_service.py` |
| SQL 校验器 | `server/app/modules/agent/table_access/nl2sql.py` |
| IntentGenerator | `server/app/modules/agent/table_access/intent_generator.py` |
| PostgresIntentTranslator | `server/app/modules/agent/table_access/intent_translator.py` |
| CorrectorChain | `server/app/modules/agent/runtime/self_correction.py` |
| AdvancedVoter | `server/app/modules/agent/runtime/voter.py` |
| ParallelSQLGenerator | `server/app/modules/agent/runtime/parallel_generator.py` |
| DatacenterClient | `server/app/modules/datacenter/client.py` |
| DatacenterClientPool | `server/app/modules/datacenter/client.py` |
| DatacenterConfigResolver | `server/app/modules/datacenter/config.py` |
| AnalystAgent | `server/app/modules/agent/analyst.py` |
| ReportAgent | `server/app/modules/agent/report/agent.py` |
| ReportPlanner | `server/app/modules/agent/report/planner.py` |
| ReportExecutor | `server/app/modules/agent/report/executor.py` |
| ReportAssembler | `server/app/modules/agent/report/assembler.py` |
| InsightPipeline | `server/app/modules/agent/report/insight_pipeline.py` |
| ReportQueryCache | `server/app/modules/agent/report/query_cache.py` |
| ReportGenerator | `server/app/services/reporting/generation/report_generator.py` |
| ReportExecutionService | `server/app/services/reporting/execution/report_execution_service.py` |
| WatcherDetector | `server/app/modules/agent/runtime/watcher_detector.py` |
| WatcherWorker | `server/worker/runners/watcher.py` |
| ReportWorker | `server/worker/runners/report.py` |
| FSM | `server/app/modules/agent/fsm.py` |
| Tool Dispatcher | `server/app/modules/agent/tools.py` |
| Tool Registry | `server/app/modules/agent/tool_registry.py` |
| Tool Implementations | `server/app/modules/agent/tools_impl/` |
| Prompt Assembler | `server/app/modules/agent/prompts/assembler.py` |
| Prompt Cache | `server/app/modules/agent/prompts/_cache.py` |
| Context Compactor | `server/app/modules/agent/context_state/context_compactor.py` |
| Context Metrics | `server/app/modules/agent/context_state/context_metrics.py` |
| Token Budget | `server/app/modules/agent/context_state/token_budget.py` |
| Memory Manager | `server/app/modules/agent/context_state/memory.py` |
| Fact Store | `server/app/modules/agent/context_state/fact_store.py` |
| AgentContext | `server/app/modules/agent/context_state/context.py` |
| MCP Server | `server/mcp_server/server.py` |
| MCP Client | `server/mcp_server/client.py` |
| MCP Auth | `server/mcp_server/auth.py` |
| MCP Transport | `server/mcp_server/transport.py` |
| Skill Registry | `server/app/modules/agent/skills/registry.py` |
| Skill Loader | `server/app/modules/agent/skills_loader.py` |
| Langfuse Config | `server/app/modules/agent/runtime/langfuse_config.py` |
| Trace Writer | `server/app/modules/agent/runtime/trace_writer.py` |
| Trace Schema | `server/app/modules/agent/runtime/trace_schema.py` |
| LLM Client | `server/app/modules/agent/runtime/llm_client.py` |
| NL2SQL Prompt | `server/app/modules/agent/prompts/nl2sql.md` |
| Supervisor Prompt | `server/app/modules/agent/prompts/supervisor.md` |
