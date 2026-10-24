## 架构概述

日志系统采用 **目录级进程隔离** 设计：每个 Worker 进程写入独立子目录，彻底避免多进程轮转时 `os.rename` 文件锁冲突（Loguru #548、Windows `WinError 32`）。

### 核心设计目标

| 目标 | 实现方式 |
|------|----------|
| 进程隔离 | 每个进程写入独立目录；`app/agent/audit` 追加 `process+pid` 文件后缀 |
| 并发安全 | 所有文件 sink 启用 `enqueue=True`，序列化写入 |
| 可观测性 | JSON Lines 格式（`serialize=True`），便于日志收集与程序化查询 |
| 存储效率 | 按天轮转（`00:00`）+ gzip 压缩 + 30 天保留 |
| 分类管理 | 按 module binding 过滤写入专用目录（`agent/`、`audit/`） |
| 审计追踪 | 结构化审计日志中间件 + `AuditLogger` 专用模块，敏感字段自动脱敏 |

## 统一目录结构

### 标准目录树

```
/log/                           # 日志根目录（生产环境）
├── app/                        # FastAPI API 进程日志（按进程隔离）
│   ├── api.<process>-<ts>-<pid>.log  # API 请求日志（filter: module=api）
│   └── error.<process>-<ts>-<pid>.log # 错误日志（level >= ERROR）
├── agent/                      # AI Agent 日志（按进程隔离）
│   ├── app.<process>-<ts>-<pid>.log   # Agent 全量日志
│   └── error.<process>-<ts>-<pid>.log # Agent 错误日志
├── watcher/                    # Watcher Worker 日志
│   ├── worker.log
│   └── error.log
├── audit/                      # 审计日志（按进程隔离）
│   └── audit.<process>-<ts>-<pid>.log
└── nginx/                      # Nginx 访问/错误日志（外部管理）
```

> **event-analysis Worker 说明**：`event-analysis` 的 `process_name="event-analysis"` 不在 `_WORKER_LOG_DIRS` 映射中，因此日志写入 `app/` 目录（按进程隔离命名，与 API 主进程共用 app/ 目录）。

### 目录用途说明

| 目录 | 用途 | 写入进程 | 保留策略 |
|------|------|----------|----------|
| `app/` | API 请求与错误日志，也承载 event-analysis Worker 日志（因 process_name 不在 _WORKER_LOG_DIRS 中） | FastAPI 主进程、Event Analysis Worker | 30 天 |
| `watcher/` | 告警检测全量/错误日志 | Watcher Worker | 30 天 |
| `report/` | 报告生成全量/错误日志 | Report Worker | 30 天 |
| `etl/` | ETL 同步日志（预留目录）。当前所有进程 `include_etl=False`，`module=etl` 日志无活跃 sink | 无 | 30 天 |
| `agent/` | AI Agent 全量 + 错误日志（按 module 过滤，文件名按进程隔离） | 所有进程（filter: module=agent） | 30 天 |

> **注意**：`scripts/dev/logs.py` 的 `LOG_SUBDIRS` 包含 `event-analysis` 但不包含 `datacenter-etl` 和 `dashboard-warmup`。查询这两个 Worker 日志需直接查看对应目录下的文件。

---

范文来源：本仓库 `docs/项目/数据分析平台/日志系统架构.md` §1–§2.2 节选（AI 生成，作者认可其文体）。

这份范文治什么：

- **标题是名词短语**（架构概述 / 统一目录结构 / 目录用途说明），不是判断句，也不是比喻。标题一旦写成「隔离是一等公民」，正文就被迫论证到底。
- **因果只给一条，并且带可查的编号**：`os.rename` 冲突后面直接跟 `Loguru #548`、`WinError 32`。不追加「这类问题极难排查」。
- **不解释常识**：不说「为什么多进程要隔离」「日志为什么重要」。
- **信息主要靠表格和目录树承载**，段落只用来补边界条件（两条 `> 注意` 说的都是「某个目录不在映射里」这种会踩到的细节）。
- **允许写「当前没有」**：`etl/` 是预留目录，`module=etl` 无活跃 sink，照实写，不粉饰。
