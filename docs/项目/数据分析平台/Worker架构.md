---
title: Worker 架构
sidebar_position: 4
description: 独立进程 + APScheduler 定时调度的 Worker 模型架构设计
---

# Worker 架构

---

## 1. 总览

数据分析 AI Agent 平台采用**独立进程 + APScheduler 定时调度**的 Worker 模型，不依赖外部任务队列（如 Celery、RQ）。所有 Worker 继承统一的 `BaseWorker` 基类，由基类负责调度器管理、心跳上报、优雅退出和异常捕获。

| Worker | 模块 | 调度器 | 默认间隔 | 分布式锁 | 启动命令 |
|--------|------|--------|---------|---------|---------|
| Watcher Worker | `worker.runners.watcher` | `IntervalTrigger` | 5 min | 否 | `uv run watcher-worker` |
| Report Worker | `worker.runners.report` | `IntervalTrigger` + `CronTrigger` | 5 min（刷新） | 否 | `uv run report-worker` |
| Datacenter ETL Worker | `worker.runners.datacenter_etl` | `IntervalTrigger` | 60 min | **是** | `uv run etl-worker` |
| Dashboard Warmup Worker | `worker.runners.dashboard_warmup` | `IntervalTrigger` / `CronTrigger` | 5 min（08:00-23:59） | **是** | `uv run dashboard-warmup-worker` |
| Event Analysis Worker | `worker.runners.event_analysis` | `IntervalTrigger` + `CronTrigger` | 5 min（刷新） | 否 | `uv run event-analysis-worker` |

---

## 2. 核心原则

### 2.1 统一基类

`BaseWorker`（`worker/runtime/base_worker.py`）提供所有 Worker 的通用能力：

| 能力 | 说明 | 子类覆盖点 |
|------|------|-----------|
| 日志初始化 | `setup_logging(process_name)` | 无需覆盖 |
| 调度器管理 | `AsyncIOScheduler` 启动/停止 | `get_trigger()` 可选覆盖 |
| 分布式锁 | `use_lock=True` 时自动获取/续期/释放 | 无需覆盖 |
| 心跳上报 | 每 30s 写 Redis `worker:heartbeat:{name}` | 无需覆盖 |
| 优雅退出 | 统一处理 SIGTERM/SIGINT | 无需覆盖 |
| 异常捕获 | `_wrapped_execute()` 统一 try/except | 实现 `execute()` |
| 资源初始化 | PG/Redis 连接 | 覆盖 `_init_resources()` |

基类启动顺序：

```
start() 同步入口
    ├── setup_logging(process_name)
    ├── 检查 {NAME}_ENABLED 环境变量
    ├── 获取分布式锁（如 use_lock=True）
    └── asyncio.run(start_async())
            ├── _init_resources()
            ├── 注册调度任务（add_job）
            ├── 启动心跳线程
            ├── 启动调度器
            ├── 立即执行首次任务
            └── 保持运行（sleep 循环）
```

### 2.2 独立进程与日志隔离

每个 Worker 是独立进程，与 API 进程（uvicorn）分离：

| 进程 | 全量日志 | 错误日志 |
|------|---------|---------|
| API | `log/app/api.log` | `log/app/error.log` |
| Watcher Worker | `log/watcher/worker.log` | `log/watcher/error.log` |
| Report Worker | `log/report/worker.log` | `log/report/error.log` |
| Datacenter ETL Worker | `log/datacenter-etl/worker.log` | `log/datacenter-etl/error.log` |
| Event Analysis Worker | `log/event-analysis/worker.log` | `log/event-analysis/error.log` |

Worker 调用 `setup_logging()` 时传 `process_name` 参数，所有文件 sink 启用 `enqueue=True` 防止线程竞争。

**禁止在任务函数（`worker/tasks/*.py`）中配置日志**，日志由宿主 Worker 进程统一配置。

### 2.3 分布式锁

`worker/runtime/lock.py` 提供基于 Redis 的分布式锁：

- 锁值格式：`{hostname}:{pid}:{uuid}`，便于排查
- TTL 30 分钟，每 `ttl/3` 秒（默认 10 秒）自动续期
- 释放时使用 Lua 脚本原子检查并删除，避免误删其他实例的锁
- 仅 Datacenter ETL Worker 启用（`use_lock=True`），Watcher/Report Worker 不启用（可横向扩展）

### 2.4 项目 Scope 解析

`worker/runtime/scope.py` 统一解析 `project_id + game_id + region_code`：

- `list_active_project_scopes(project_ids)`：从 `sys_project_config` 读取活跃项目
- `resolve_project_scope(...)`：解析单个 scope，支持 `fallback_to_first_active`

所有 Worker 已统一按项目 scope 运行，不再依赖旧的单项目 `default` 假设。

---

## 3. 运行时框架详解

### 3.1 BaseWorker

```python
class BaseWorker(ABC):
    def __init__(self, *, name: str, process_name: str,
                 interval_minutes: int = 5,
                 use_lock: bool = False,
                 lock_key: str | None = None):
        ...

    @abstractmethod
    async def execute(self) -> None:
        """子类实现核心业务逻辑。"""
        ...

    def get_trigger(self):
        """默认 IntervalTrigger，子类可覆盖为 CronTrigger 等。"""
        return IntervalTrigger(minutes=self.interval_minutes)

    async def _init_resources(self) -> bool:
        """初始化数据库连接等资源，子类可覆盖。"""
        return True
```

### 3.2 WorkerHeartbeat

- 位置：`worker/runtime/heartbeat.py`
- 独立线程运行，每 30 秒向 Redis `worker:heartbeat:{worker_name}` 写入当前时间戳
- TTL 为间隔的 3 倍（90 秒），确保 Worker 崩溃后心跳自然过期

### 3.3 worker_lock

- 位置：`worker/runtime/lock.py`
- 上下文管理器：`with worker_lock(lock_key) as acquired:`
- 获取成功时后台启动续期线程，退出时安全释放

---

## 4. 各 Worker 详解

### 4.1 Watcher Worker

- 位置：`worker/runners/watcher.py`
- 调度：`IntervalTrigger`，默认 5 分钟
- 职责：遍历所有活跃项目 scope，执行告警规则检测，触发告警时发送通知

**执行流程**：

```
execute() 每 5 分钟触发
    ├── 初始化数据库连接（指标查询）
    ├── 遍历 self.scopes（活跃项目列表）
    │   └── 对每个 project_id:
    │       ├── detector.detect_all(project_id)
    │       │   ├── 阈值型规则：current_value vs threshold
    │       │   ├── 变化量型规则：环比/同比变化率
    │       │   └── Agent 驱动型规则：LLM 二次确认
    │       ├── 重复告警抑制（30 分钟窗口）
    │       ├── 静默期检查
    │       └── notifier.send_alert() 发送通知
    └── 统计触发/总规则数
```

**告警报告生成**：`detector.detect_all()` 触发告警后，通过 `dispatch_alert_report_task()` 在后台线程中生成详细告警报告并回写主记录。

**环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WATCHER_ENABLED` | `1` | 是否启用 |
| `WATCHER_INTERVAL_MINUTES` | `5` | 检测间隔 |
| `WATCHER_PROJECT_ID` | `''` | 单项目模式指定项目 ID |
| `WATCHER_SCOPE_KEYS` | `''` | 逗号分隔的项目 ID 列表 |

### 4.2 Report Worker

- 位置：`worker/runners/report.py`
- 调度：**双层调度策略**
  - 外层 `IntervalTrigger`：定期刷新订阅列表（默认 5 分钟）
  - 内层 `CronTrigger`：每个订阅一个独立 job，按 cron 表达式精确触发
- 职责：按订阅配置定期生成报告并推送通知

**外层 execute() 流程**：

```
execute() 每 5 分钟触发
    ├── _list_active_subscriptions() 获取所有启用订阅
    ├── 遍历订阅，为每个订阅注册/更新 CronTrigger job
    │   ├── 检查 cron 表达式是否变更
    │   ├── 变更时移除旧 job、重新注册
    │   └── job 参数：_run_subscription_job(subscription)
    └── 清理已失效的订阅 job
```

**内层 _run_subscription_job() 流程**：

```
_run_subscription_job(subscription)
    ├── 防重入检查（_running_jobs 集合）
    ├── _generate_and_push_report()
    │   ├── 优先使用 description 进行 AI 驱动报告生成
    │   ├── 无 description 时使用 template_id 模板生成
    │   └── 调用 ReportExecutionService.generate_and_push()
    └── _log_execution() 记录执行日志到 sys_report_notification_log
```

**环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REPORT_WORKER_ENABLED` | `1` | 是否启用 |
| `REPORT_WORKER_INTERVAL_MINUTES` | `5` | 订阅刷新间隔 |

### 4.3 Datacenter ETL Worker

- 位置：`worker/runners/datacenter_etl.py`
- 调度：`IntervalTrigger`，默认 60 分钟
- **启用分布式锁**（`use_lock=True, lock_key="worker:lock:datacenter-etl"`）
- 职责：每日同步配置了数据中心的项目指标到本地 PG

**执行流程**：

```
execute() 每 60 分钟触发
    ├── 同步日期 = 昨天（date.today() - timedelta(days=1)）
    ├── 查询所有配置了 DC 的活跃项目（list_dc_projects）
    ├── 遍历项目：
    │   └── worker.sync_daily_metrics(project_id, date)
    │       ├── 解析项目 DC 配置（DatacenterConfigResolver）
    │       ├── 调用 DC /aggregate API 获取标量指标（dimensions=[]）
    │       ├── 调用 DC /aggregate API 获取维度指标（dimensions=[hour, channel, source]）
    │       ├── INSERT ... ON CONFLICT DO UPDATE 写入 PG
    │       │   └── 表：datacenter_metric_daily
    │       └── 清理 Redis 缓存（dc:*:{project_id}:*:{date}:{date}）
    └── 统计 inserted / updated / skipped / failed
```

**同步指标列表**（`_SCALAR_METRICS`）：

| 指标 | 说明 |
|------|------|
| dau, revenue, pay_rate, new_users, arpu, arppu | 核心运营指标 |
| retention_rate_d1, retention_rate_d7, retention_rate_d30 | 留存指标 |
| ltv_d30 | LTV |

**维度列表**（`_DIMENSIONS`）：hour, channel, source

**环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATACENTER_ETL_ENABLED` | `1` | 是否启用 |
| `DATACENTER_ETL_INTERVAL_MINUTES` | `60` | 同步间隔 |

### 4.4 Event Analysis Worker

- 位置：`worker/runners/event_analysis.py`
- 调度：**双层调度策略**（与 Report Worker 同模式）
  - 外层 `IntervalTrigger`：定期刷新调度配置列表（默认 5 分钟）
  - 内层 `CronTrigger`：每个启用的配置一个独立 job，按 cron 表达式精确触发
- 职责：按配置的调度周期定期执行事件分析，写入 run_logs 并推送通知

**时区处理（关键）**：cron 表达式由 `schedule_config.time`（项目时区墙钟 HH:MM）生成，触发器**必须按该项目管理员配置的时区解析**，否则会继承 worker 进程本地时区（Docker 默认 UTC），导致触发时间错位。

- 每个 `event_analysis_configs` 通过 `project_id` JOIN `sys_project_config.timezone_offset`
- `offset_to_timezone(offset)`（`app/modules/dashboard/scope_resolver.py`）将偏移映射为 IANA 名，与 dashboard 的 `today_in_timezone` 同源
- worker 的 `build_cron_trigger(cron_expr, timezone_offset)` 与 service 的 `_compute_next_run` 均按此解析，保证触发时间与存储的 `next_run_time` 一致

**执行流程**：

```
execute() 每 5 分钟触发（刷新）
    ├── _list_scheduled_configs() 取所有启用配置（含项目 timezone_offset）
    ├── 遍历配置，为每个注册/更新 CronTrigger job
    │   ├── 检查 cron 表达式是否变更
    │   └── build_cron_trigger(cron_expr, timezone_offset) 按项目时区构造
    └── 清理已失效的 job

_run_scheduled_job(config_id)  由 CronTrigger 触发
    ├── 防重入检查（_running_jobs 集合）
    ├── ea_service.execute_scheduled(config_id)
    │   ├── 动态计算相对时间范围
    │   ├── _execute_analysis_dc() 执行分析
    │   ├── 写入 run_logs
    │   └── 更新 last_schedule_run_at + next_run_time（按项目时区）
    └── 推送通知
```

**环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EVENT_ANALYSIS_ENABLED` | `1` | 是否启用 |
| `EVENT_ANALYSIS_WORKER_INTERVAL_MINUTES` | `5` | 调度配置刷新间隔 |

---

## 5. 任务派发机制

### 5.1 API 进程内异步派发

API 进程内的异步任务（告警报告生成、订阅立即执行）通过 `threading.Thread(daemon=True)` 后台派发：

```python
# worker/tasks/watcher.py
def dispatch_alert_report_task(alert_id, rule, metric_data, project_id):
    t = threading.Thread(
        target=watcher_generate_alert_report_task,
        kwargs={...},
        daemon=True,
    )
    t.start()
```

不再在入口层裸用 `asyncio.create_task(...)`。

### 5.2 任务定义目录

`worker/tasks/` 存放可独立调用的任务函数：

| 文件 | 内容 |
|------|------|
| `watcher.py` | `watcher_check_alerts()`、`watcher_check_single_rule()`、`dispatch_alert_report_task()` |
| `report.py` | `report_generate_scheduled()`、`report_generate_single()`、`execute_subscription_task_job()` |
| `datacenter_etl.py` | `DatacenterETLWorker.sync_daily_metrics()`、`list_dc_projects()` |

任务函数内部负责初始化所需的数据库连接，不依赖外部注入的 client 实例。

---

## 6. 部署建议

1. **全量多项目同步**：直接使用默认模型，Worker 自动遍历 `sys_project_config` 活跃 scope
2. **灰度某几个项目**：使用 `WATCHER_SCOPE_KEYS` 环境变量收窄范围
3. **多 Worker 实例**：Datacenter ETL Worker 使用分布式锁保证单实例执行；Watcher/Report Worker 可横向扩展
4. **生产环境日志**：默认使用 `log/` 目录；开发环境使用相对路径
5. **Docker 部署**：Worker 作为独立服务启动，`docker compose up -d --build <worker-service>`；修改代码后必须 `--build`

---

## 7. 相关文件

| 模块 | 路径 |
|------|------|
| Watcher Worker Runner | `server/worker/runners/watcher.py` |
| Report Worker Runner | `server/worker/runners/report.py` |
| Datacenter ETL Runner | `server/worker/runners/datacenter_etl.py` |
| BaseWorker 基类 | `server/worker/runtime/base_worker.py` |
| WorkerHeartbeat | `server/worker/runtime/heartbeat.py` |
| 分布式锁 | `server/worker/runtime/lock.py` |
| Scope 解析 | `server/worker/runtime/scope.py` |
| Watcher 任务 | `server/worker/tasks/watcher.py` |
| Report 任务 | `server/worker/tasks/report.py` |
| Datacenter ETL 任务 | `server/worker/tasks/datacenter_etl.py` |
| WatcherDetector | `server/app/modules/agent/runtime/watcher_detector.py` |
| AlertNotifier | `server/app/services/alerting/alert_notifier.py` |
| ReportExecutionService | `server/app/services/reporting/execution/report_execution_service.py` |
| DatacenterClient | `server/app/modules/datacenter/client.py` |
| DatacenterMetricDaily 模型 | `server/app/db/models/datacenter_metric.py` |
