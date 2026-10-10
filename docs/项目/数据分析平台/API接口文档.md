---
title: API 接口文档
sidebar_position: 8
description: 「数据分析 AI Agent 平台」的 FastAPI /api/v1/* 路由结构、契约对齐机制与高风险协议说明
---

# API 接口文档

---

## 1. 文档边界

本文档维护当前实际公开的 `FastAPI /api/v1/*` 路由结构与高风险协议说明。

统一裁决顺序（冲突时以前者为准）：

1. `server/app/api/v1/__init__.py` 的实际挂载 + 各路由文件中的实际接口定义
2. `server/openapi.json`（由代码生成，前后端契约唯一真源）
3. 本文档

> 本文档是人工维护的伴生说明，可能滞后。若与 `openapi.json` 不一致，以 `openapi.json` 为准。

---

## 2. 基础信息

- API 前缀：`/api/v1`
- 健康检查：`/health`
- 认证方式：
  - JWT：`Authorization: Bearer <jwt>`
  - API Key：`Authorization: Bearer ga_xxxxx`

---

## 3. 契约对齐机制

前后端接口契约以 **`server/openapi.json`** 为唯一真源，该文件由 FastAPI 应用代码动态生成，非人工维护。

### 3.1 生成链路

```
app.main:app  --app.openapi()-->  scripts/export_openapi.py  -->  server/openapi.json（唯一提交副本）
```

- 后端导出：`cd server && uv run export-openapi`（脚本 `scripts/export_openapi.py`，调用 `app.openapi()` 写出 JSON，默认输出到 `server/openapi.json`）。
- 前端通过 `../server/openapi.json` 直接消费该唯一副本，不再维护 `web/openapi.json` 或根目录副本。
- CI（`api-contract` job）会重新生成 `server/openapi.json` 并执行 `git diff --exit-code` 校验提交副本与代码一致；若开发者改了路由却未重新生成并提交 openapi，CI 将失败。

### 3.2 前端对齐

| 命令 | 作用 |
|------|------|
| `pnpm generate-api-types` | `openapi-typescript ../server/openapi.json -o src/types/generated/api.ts`，由 schema 生成 TS 类型 |
| `pnpm validate-api-coverage` | `scripts/validate-api-coverage.mjs` 扫描 `web/src/api/**/*.ts` 提取路径，与 openapi paths 比对；前端独有路径视为 ERROR 并阻断，openapi 未覆盖路径视为 WARN |

### 3.3 契约测试

`server/tests/unit/api/test_*_contract.py` 直接调用 `app.openapi()`（进程内，无需起服务），始终与代码同步，是路由契约的回归保障。

### 3.4 维护要求

- 后端新增/修改路由后，必须重新执行 `cd server && uv run export-openapi` 重新生成 `server/openapi.json` 并提交，否则 CI 的同步校验会失败。
- `openapi.json` 路径数即契约规模，当前为 **211 条路径**。

---

## 4. 当前公开模块

按 `app/api/v1/__init__.py` 实际挂载整理：

| 模块 | 前缀 | 挂载来源 | 说明 |
|------|------|----------|------|
| auth | `/auth` | `access/auth.py` | 登录、登出、当前用户、个人信息、OAuth、用户搜索 |
| permission | `/permission` | `access/permission.py` | 角色、用户、用户组、字段权限、权限矩阵（超管专用） |
| api-keys | `/api-keys` | `access/api_key.py` | API Key 管理（超管专用） |
| frontend-logs | `/frontend-logs` | `system/frontend_logs.py` | 前端日志回传 |
| metrics | `/metrics` | `system/metrics.py` | Agent 上下文指标（见 §5.25 已知双前缀问题） |
| system-monitor | `/system/monitor` | `system/monitor.py` | 服务状态快照与 SSE 流 |
| admin-etl | `/admin/etl` | `system/etl_admin.py` | ETL 同步触发与看板预热（管理） |
| dashboard | `/dashboard` | `modules/dashboard/*` | 固定看板 Tab 与元数据 |
| dashboards | `/dashboards` | `modules/dashboard/instances.py` | 灵活看板实例管理 |
| projects | `/projects` | `modules/project/*` | 项目列表、项目成员、项目组 |
| query | `/query` | `modules/query/*` | 明细查询与导出 |
| chat | `/chat` | `modules/chat/*` | AI 对话会话、消息、分享、上传 |
| reports | `/reports` | `modules/report_subscriptions/*` | 报告模板、订阅、实例、AI 生成 |
| agent | `/agent` | `modules/agent/api.py` | Agent 模块公开接口 |
| data-reports | `/data-reports` | `modules/data_reports/api.py` | 我的报表 |
| resource-tags | `/resource-tags` | `modules/collaboration/resource_tags.py` | 资源标签 |
| config | `/config` | `modules/config/*` | 全局配置（静态、AI、MCP、DC、指标语义、Skills、时区） |
| vs-comparison | `/vs-comparison` | `modules/vs_comparison/api.py` | VS 对比 |
| filter-templates | `/filter-templates` | `modules/filter_templates/api.py` | 筛选模板 |
| event-analysis | `/event-analysis` | `modules/event_analysis/api.py` | 事件分析（无 v2 后缀） |
| user-segments | `/user-segments` | `modules/user_segments/api.py` | 用户分群 |
| project-spaces | `/project-spaces` | `modules/collaboration/project_spaces.py` | 共享空间 |
| collaboration-groups | `/collaboration-groups` | `modules/collaboration/groups.py` | 协作组 |
| alert | `/alert` | `modules/alerting/api.py` | 告警规则、渠道、静默、记录、统计 |
| exchange-rate | `/exchange-rate` | `exchange_rate.py` | 汇率查询 |
| token | `/token/*` | `modules/token/*` | Token 用量、配额、定价管理 |

---

## 5. 高风险口径

### 5.1 Auth

当前实际认证接口（见 §6.1）：

- `GET /auth/me`、`POST /auth/login`、`POST /auth/logout`
- `PUT /auth/me/profile`、`PUT /auth/me/password`（个人信息与密码自助修改）
- `GET /auth/users/search`（用户前缀搜索，协作辅助）
- `GET /auth/oauth/authorize-url`、`POST /auth/oauth/callback`（统一认证平台 OAuth 集成）

当前**没有** `POST /auth/refresh`。

### 5.2 Chat SSE 协议

`POST /api/v1/agent/chat/stream` 返回 `text/event-stream`。旧版 Chat 发送入口已下线，不再承载 Agent 执行。

当前实际事件口径：

- SSE `event=message`：`data.type` 为 `block_start` / `block_delta` / `block_end` / `block` / `done`
- SSE `event=heartbeat`：`data.type=ping`
- SSE `event=error`：错误对象

当前实际 `block_type` 主要包括：`text`、`thinking`、`tool_call`、`tool_result`、`code`、`table`、`chart`。

Agent 对话入口统一使用 `/api/v1/agent/chat` 与 `/api/v1/agent/chat/stream`。请求体必须显式传入 `project_id`。入口会先做 `context.refs` 提取与 report 引用解析，再进入流式 runtime 执行。

#### 5.2.1 Chat 消息反馈

`POST /api/v1/chat/messages/feedback` 用于当前用户提交 AI 消息"有用/无用"反馈，写入 `sys_chat_feedback`。

请求体：

```json
{
  "session_id": "sess_xxx",
  "message_id": "msg_xxx",
  "feedback_type": "like"
}
```

字段约束：`feedback_type` 只能为 `like` 或 `dislike`；仅允许当前用户对自己会话中的消息提交反馈。

### 5.3 Project Space 成员模型

共享空间采用 **principal 模型**，已与 `project_id` 解耦，只承担共享容器职责：

- `GET /project-spaces` 只接受分页与关键词，不再按 `project_id` 过滤
- `POST /project-spaces` 请求体不再要求 `project_id`
- `principal_type='group'` 表示旧权限组兼容主体，`principal_type='collaboration_group'` 表示新协作组主体
- `POST /project-spaces/{space_id}/resources` 仅校验资源存在，不再要求资源 `project_id` 与空间一致

### 5.4 Reports 与前端页面命名

- 后端报告服务统一使用 `/api/v1/reports/*`
- 前端页面 `/report` 是告警报告视图入口
- 二者不是同一层概念

### 5.5 Agent（`/api/v1/agent`）口径

当前 `agent` 模块对外接口见 §6.11。

`GET /api/v1/agent/health` 返回 5 类 Agent 组件状态：`supervisor`、`query_agent`、`analyst_agent`、`report_agent`、`watcher_agent`。

`POST /api/v1/agent/query` 当前支持三类查询模式：

- 聚合类问题：走本地 SQL（表边界由 `TableCapabilityCatalog` 驱动）
- 登录/订单明细类问题：走数据中心业务查询
- 给定表名查询：走 `TableQueryGateway + DatacenterTableQueryProvider`（需显式 scope）
- 跨项目查询：解析多个 `game_id:region_code` 作用域，逐个执行权限校验并跨项目查询

### 5.6 Permission 异常语义

`/api/v1/permission/*` 当前统一口径：

- 未预期内部异常返回 HTTP `500`（`detail=权限服务暂时不可用，请稍后重试或联系管理员`）
- 不再使用 HTTP `200` + `success_response` 包装内部异常
- 业务态失败（如服务返回 `ok=false`）仍按现有成功包络 + 业务 message 语义返回

### 5.7 协作组与权限组边界

- `/api/v1/permission/user-groups` 保持 URL 兼容，但当前只管理权限组，不返回 `group_kind='collaboration'` 的协作组
- `/api/v1/collaboration-groups` 是共享空间协作辅助 API，依赖当前登录用户
- 协作组不会合并到 `permission_flags`，只能作为共享空间 principal 和成员协作容器

### 5.8 Alert 口径

告警模块当前由后端统一承载规则与渠道的完整 CRUD（见 §6.21）：

- 告警规则 `POST/PUT/DELETE /alert/rules` 由后端直接管理（不再由前端直连数据库配置层）
- `POST /alert/rules/{rule_id}/check` 手动触发单规则检测；`POST /alert/rules/{rule_id}/test` 触发规则试跑
- `agent_driven` 规则类型设计层保留，当前配置页不作为默认开放选项
- 告警记录 `GET /alert/records`、`/alert/records/{record_id}`、`GET /alert/stats` 提供历史与统计
- Watcher 为独立 Worker 运行模式（不在 Supervisor 对话主回路）

### 5.9 Event Analysis 路径

事件分析模块前缀为 `/event-analysis`（**无 v2 后缀**）。除配置 CRUD 与执行外，还提供事件元数据查询（events/dimensions/metrics/config）、复制、另存为报表、调度开关与运行日志等能力，见 §6.17。

### 5.10 Metrics 双前缀已知问题

`GET /api/v1/metrics/metrics/context` 当前实际路径存在**双前缀**：`system/metrics.py` 内 `APIRouter(prefix="/metrics")` 与 `__init__.py` 注册处 `prefix="/metrics"` 叠加。代码与 openapi 均为此路径。该问题待修复为 `/api/v1/metrics/context`，修复时需同步本文档与 openapi。

---

## 6. 关键接口清单

> 路径按各模块实际挂载合并后的最终 URL 给出。参数占位 `{xxx}` 为路径参数。

### 6.1 Auth

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/auth/me` | 获取当前用户信息 |
| PUT | `/api/v1/auth/me/profile` | 修改个人信息 |
| PUT | `/api/v1/auth/me/password` | 修改个人密码 |
| POST | `/api/v1/auth/login` | 用户登录（限流 10/min） |
| POST | `/api/v1/auth/logout` | 登出，token 加入黑名单 |
| GET | `/api/v1/auth/users/search` | 用户名前缀搜索（协作辅助） |
| GET | `/api/v1/auth/oauth/authorize-url` | 获取统一认证平台 OAuth 授权地址 |
| POST | `/api/v1/auth/oauth/callback` | 统一认证平台 OAuth 回调处理 |

`GET /api/v1/auth/users/search` 口径：`q` 长度 1~50，`limit` 取值 1~50 默认 20；按 `username` 前缀匹配，过滤 `status='disabled'`；仅返回 `{ user_id, username }`。

### 6.2 Permission（超管专用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/permission/roles` | 角色列表 |
| GET | `/api/v1/permission/users` | 用户列表 |
| POST | `/api/v1/permission/users` | 添加用户 |
| PUT | `/api/v1/permission/users/{user_id}/role` | 更新用户角色 |
| PUT | `/api/v1/permission/users/{user_id}/password` | 修改用户密码 |
| PUT | `/api/v1/permission/users/{user_id}/email` | 更新用户邮箱 |
| PUT | `/api/v1/permission/users/{user_id}/projects` | 更新用户项目权限 |
| PUT | `/api/v1/permission/users/{user_id}/status` | 启用/禁用用户 |
| DELETE | `/api/v1/permission/users/{user_id}` | 删除用户 |
| POST | `/api/v1/permission/users/batch-role` | 批量修改角色 |
| POST | `/api/v1/permission/users/batch-status` | 批量启用/禁用 |
| GET | `/api/v1/permission/user-groups` | 用户组列表 |
| POST | `/api/v1/permission/user-groups` | 创建用户组 |
| PUT | `/api/v1/permission/user-groups/{group_id}` | 更新用户组 |
| DELETE | `/api/v1/permission/user-groups/{group_id}` | 删除用户组 |
| GET | `/api/v1/permission/user-groups/{group_id}/members` | 获取组成员 |
| POST | `/api/v1/permission/user-groups/{group_id}/members` | 添加组成员 |
| DELETE | `/api/v1/permission/user-groups/{group_id}/members/{user_id}` | 移除组成员 |
| GET | `/api/v1/permission/field-permissions` | 字段权限配置 |
| PUT | `/api/v1/permission/field-permissions` | 更新字段权限（一期不支持） |
| GET | `/api/v1/permission/role-module-matrix` | 角色-功能模块权限矩阵 |
| PUT | `/api/v1/permission/role-module-matrix` | 更新权限矩阵单格 |

### 6.3 API Keys（超管专用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/api-keys` | 获取全部 API Key 列表（仅显示前缀） |
| POST | `/api/v1/api-keys` | 为指定用户创建 API Key（仅创建时返回完整 Key） |
| PATCH | `/api/v1/api-keys/{key_id}` | 更新 API Key（名称/启用状态/权限） |
| DELETE | `/api/v1/api-keys/{key_id}` | 吊销 API Key |

### 6.4 Dashboard（固定看板）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dashboard/overview` | 总览 Tab |
| GET | `/api/v1/dashboard/active` | 活跃 Tab |
| GET | `/api/v1/dashboard/growth` | 增长 Tab |
| GET | `/api/v1/dashboard/payment` | 付费 Tab |
| GET | `/api/v1/dashboard/retention` | 留存 Tab |
| GET | `/api/v1/dashboard/return` | 用户回流 Tab |
| GET | `/api/v1/dashboard/operation` | 运营 Tab |
| GET | `/api/v1/dashboard/currency` | 货币监控 Tab |
| GET | `/api/v1/dashboard/daily-monitor` | 日监控 Tab |
| GET | `/api/v1/dashboard/filter-options` | 筛选选项（渠道/服务器/地区） |
| GET | `/api/v1/dashboard/vs` | VS 看盘 Tab |
| GET | `/api/v1/dashboard/comparison` | VS 看盘 Tab（别名） |
| GET | `/api/v1/dashboard/thresholds` | 看板业务阈值 |
| PUT | `/api/v1/dashboard/thresholds` | 更新看板业务阈值 |
| GET | `/api/v1/dashboard/chart-refs` | 可引用图表列表 |
| POST | `/api/v1/dashboard/export/chart` | 导出 Dashboard 图表数据 |

当前固定看板数据由数据中心 API 或本地 PG `datacenter_metric_daily` 提供。看板接口返回运行时状态元信息：`capability` 与 `blocks` 包含 `status / reason / scope_key / scope_name / source / rows` 等字段。

### 6.5 Dashboards（灵活看板）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/dashboards` | 创建看板 |
| GET | `/api/v1/dashboards` | 获取看板列表 |
| GET | `/api/v1/dashboards/{dashboard_id}` | 获取看板详情 |
| PUT | `/api/v1/dashboards/{dashboard_id}` | 更新看板 |
| DELETE | `/api/v1/dashboards/{dashboard_id}` | 删除看板 |
| POST | `/api/v1/dashboards/{dashboard_id}/copy` | 复制看板 |
| PUT | `/api/v1/dashboards/{dashboard_id}/tags` | 设置看板标签 |
| POST | `/api/v1/dashboards/{dashboard_id}/components` | 添加组件 |
| PUT | `/api/v1/dashboards/{dashboard_id}/components` | 批量替换看板组件 |
| PUT | `/api/v1/dashboards/{dashboard_id}/components/{component_id}` | 更新组件 |
| DELETE | `/api/v1/dashboards/{dashboard_id}/components/{component_id}` | 删除组件 |
| POST | `/api/v1/dashboards/{dashboard_id}/components/reorder` | 重新排序组件 |

### 6.6 Projects

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects` | 项目列表 |

返回 `ResponseModel[ProjectListResponse]`，`data.list[*]` 至少包含：`project_id`、`project_name`、`game_id`、`game_name`、`region`、`platform`、`currency`、`timezone`。

### 6.7 Project Members

项目维度成员管理，依赖权限键 `project_member_manage`。`super_admin` 可管理所有项目；`project_admin` 只能管理其 `project_ids` 中 `level=admin` 的项目。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects/{project_id}/members` | 项目成员列表 |
| POST | `/api/v1/projects/{project_id}/members` | 添加/创建成员 |
| PUT | `/api/v1/projects/{project_id}/members/{user_id}/level` | 修改成员在本项目中的级别 |
| DELETE | `/api/v1/projects/{project_id}/members/{user_id}` | 移除成员（仅移除项目归属） |
| GET | `/api/v1/projects/{project_id}/available-users` | 可用用户列表（添加成员时选择） |
| GET | `/api/v1/projects/{project_id}/groups` | 项目组列表 |
| POST | `/api/v1/projects/{project_id}/groups` | 创建项目组 |
| PUT | `/api/v1/projects/{project_id}/groups/{group_id}` | 更新项目组 |
| DELETE | `/api/v1/projects/{project_id}/groups/{group_id}` | 删除项目组 |
| GET | `/api/v1/projects/{project_id}/groups/{group_id}/members` | 组成员列表 |
| POST | `/api/v1/projects/{project_id}/groups/{group_id}/members` | 添加组成员 |
| DELETE | `/api/v1/projects/{project_id}/groups/{group_id}/members/{user_id}` | 移除组成员 |

当前口径：

- `POST /members` 请求体：`{ "username": "alice", "level": "write", "create_if_missing": true }`，`level` 取值 `read` / `write` / `admin`。
- `PUT /members/{user_id}/level` 请求体：`{ "level": "admin" }`；`level=admin` 会自动将用户 `role_type` 提升为 `project_admin`（若其原本不是 `super_admin`/`project_admin`）。
- 项目成员接口**不可**分配 `super_admin`。
- 从项目移除成员只移除 `project_ids` 中的对应条目，不删除用户。
- 项目组 `group_kind='project'`，不进入 `permission_flags` 合并链路。

### 6.8 Query

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/query/login` | 登录明细查询（数据中心直读） |
| GET | `/api/v1/query/order` | 订单明细查询（数据中心直读） |
| POST | `/api/v1/query/export` | 创建导出任务 |
| GET | `/api/v1/query/export/{task_id}` | 查询导出任务状态 |
| GET | `/api/v1/query/export/download/{task_id}` | 下载导出文件 |
| POST | `/api/v1/query/replay` | 查询重放（固定图表用） |

当前口径：

- `GET /api/v1/query/login` 与 `GET /api/v1/query/order` 仅支持数据中心 Free Query 直读
- 数据中心直读当前只保证前 `10000` 条安全窗口
- `POST /api/v1/query/replay` 接收 `{sql, project_id}`，执行前经过 SQL 安全校验，额外阻止 `SYSTEM.`、`INFORMATION_SCHEMA.`、`INTO OUTFILE` 等危险访问

> 注：历史文档列出的 `GET /query/login-by-cube`、`GET /query/order-by-cube` 当前代码中已不存在。

### 6.9 Reports

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/reports/templates` | 模板列表 |
| POST | `/api/v1/reports/templates` | 创建模板 |
| GET | `/api/v1/reports/templates/{template_id}` | 模板详情 |
| PUT | `/api/v1/reports/templates/{template_id}` | 更新模板 |
| DELETE | `/api/v1/reports/templates/{template_id}` | 删除模板 |
| GET | `/api/v1/reports/subscriptions` | 订阅列表 |
| POST | `/api/v1/reports/subscriptions` | 创建订阅 |
| GET | `/api/v1/reports/subscriptions/{subscription_id}` | 订阅详情 |
| PUT | `/api/v1/reports/subscriptions/{subscription_id}` | 更新订阅 |
| DELETE | `/api/v1/reports/subscriptions/{subscription_id}` | 取消订阅 |
| POST | `/api/v1/reports/subscriptions/{subscription_id}/execute` | 立即执行订阅 |
| GET | `/api/v1/reports/subscription-execute-tasks/{task_id}` | 查询订阅执行任务状态 |
| GET | `/api/v1/reports/instances` | 报告实例列表 |
| GET | `/api/v1/reports/instances/stats` | 报告实例统计 |
| GET | `/api/v1/reports/instances/{report_id}` | 报告实例详情 |
| GET | `/api/v1/reports/instances/{report_id}/html` | 获取报告 HTML 内容 |
| DELETE | `/api/v1/reports/instances/{report_id}` | 删除报告实例 |
| POST | `/api/v1/reports/instances/{report_id}/feedback` | 提交报告反馈 |
| POST | `/api/v1/reports/generate` | 生成报告 |
| POST | `/api/v1/reports/generate-single` | 单项目即时生成 |
| POST | `/api/v1/reports/preview` | 预览 AI 生成报告 |
| POST | `/api/v1/reports/generate-ai` | 使用 AI 生成报告 |
| POST | `/api/v1/reports/instances/{report_id}/push` | 重推已生成报告 |

当前口径：

- 列表接口统一返回 `PageData` 语义：`list / total / page / page_size / total_pages`
- `POST /api/v1/reports/generate` 成功时返回持久化结果，至少包含：`report_id`、`html_url`、`markdown_url`、`summary`、`status`
- `POST /api/v1/reports/instances/{report_id}/push` 推送消息中的链接优先使用 `PUBLIC_BASE_URL` 生成绝对 URL
- `POST /api/v1/reports/subscriptions/{subscription_id}/execute` 采用"创建任务 + 派发执行 + 轮询状态"模式

### 6.10 Chat

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/chat/sessions` | 会话列表 |
| GET | `/api/v1/chat/sessions/{session_id}/messages` | 会话消息列表 |
| DELETE | `/api/v1/chat/sessions/{session_id}` | 删除会话（硬删除） |
| GET | `/api/v1/chat/queries` | 可引用查询列表 |
| POST | `/api/v1/chat/upload` | 上传文件 |
| GET | `/api/v1/chat/files/{user_id}/{filename}` | 获取上传的文件 |
| POST | `/api/v1/chat/share` | 创建分享链接 |
| GET | `/api/v1/chat/share/{token}` | 获取分享内容 |
| DELETE | `/api/v1/chat/share/{token}` | 删除分享链接 |
| POST | `/api/v1/chat/messages/feedback` | 提交消息反馈 |
| POST | `/api/v1/chat/messages/delete` | 删除消息（软删除） |

### 6.11 Agent

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/agent/chat` | 非流式对话 |
| POST | `/api/v1/agent/chat/stream` | 流式对话（SSE） |
| POST | `/api/v1/agent/chat/{session_id}/confirm` | 危险工具确认 |
| POST | `/api/v1/agent/query` | Query Agent 执行 |
| POST | `/api/v1/agent/analyze` | Analyst Agent 执行 |
| POST | `/api/v1/agent/report/generate` | Report Agent 生成报告 |
| GET | `/api/v1/agent/health` | Agent 组件健康状态 |
| GET | `/api/v1/agent/watcher/status` | Watcher Agent 状态 |
| GET | `/api/v1/agent/sessions/{session_id}/context` | 获取会话上下文 |
| DELETE | `/api/v1/agent/sessions/{session_id}/context` | 清除会话上下文 |
| POST | `/api/v1/agent/admin/config/reload` | 重载 Agent 配置 |

### 6.12 Data Reports（我的报表）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/data-reports` | 我的报表列表 |
| POST | `/api/v1/data-reports` | 创建报表 |
| GET | `/api/v1/data-reports/{report_id}` | 报表详情 |
| PUT | `/api/v1/data-reports/{report_id}` | 更新报表 |
| DELETE | `/api/v1/data-reports/{report_id}` | 删除报表 |
| GET | `/api/v1/data-reports/{report_id}/preview` | 报表预览 |
| PATCH | `/api/v1/data-reports/{report_id}/display-type` | 更新展示类型 |
| PUT | `/api/v1/data-reports/{report_id}/tags` | 更新报表标签 |
| POST | `/api/v1/data-reports/{report_id}/query` | 报表上下文查询 |

### 6.13 Resource Tags

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/resource-tags` | 获取资源标签列表 |
| POST | `/api/v1/resource-tags` | 创建资源标签 |
| PUT | `/api/v1/resource-tags/{tag_id}` | 更新资源标签 |
| DELETE | `/api/v1/resource-tags/{tag_id}` | 删除资源标签 |

### 6.14 Config

全局配置模块，按子域分组。所有写操作仅 `super_admin`。

#### 静态配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/roles` | 角色静态配置 |
| GET | `/api/v1/config/permissions` | 权限静态配置 |
| GET | `/api/v1/config/field-roles` | 字段角色配置 |
| GET | `/api/v1/config/filter-options` | 筛选选项配置 |

#### AI 配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/ai` | AI 配置 |
| GET | `/api/v1/config/ai/endpoints` | AI Endpoint 列表 |
| POST | `/api/v1/config/ai/endpoints` | 创建 AI Endpoint |
| PUT | `/api/v1/config/ai/endpoints/{endpoint_id}` | 更新 AI Endpoint |
| DELETE | `/api/v1/config/ai/endpoints/{endpoint_id}` | 删除 AI Endpoint |
| PUT | `/api/v1/config/ai/agent-selection` | 设置全局 Agent 使用的端点与模型 |
| GET | `/api/v1/config/ai/models-from-endpoint` | 拉取端点可用模型列表 |
| GET | `/api/v1/config/ai/preset-urls` | 预设厂商 Base URL 列表 |
| GET | `/api/v1/config/ai/models` | 内置模型列表与厂商分组 |
| GET | `/api/v1/config/ai/agent-types` | Agent 类型及展示名列表 |

> 注：历史文档列出的 `PUT /ai/endpoints/{id}/set-default` 已被 `PUT /ai/agent-selection` 取代。

#### MCP 配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/mcp/connections` | MCP 连接列表 |
| POST | `/api/v1/config/mcp/connections` | 创建 MCP 连接 |
| PUT | `/api/v1/config/mcp/connections/{connection_id}` | 更新 MCP 连接 |
| DELETE | `/api/v1/config/mcp/connections/{connection_id}` | 删除 MCP 连接 |
| POST | `/api/v1/config/mcp/connections/{connection_id}/toggle` | 启用/禁用 MCP 连接 |
| GET | `/api/v1/config/mcp/connections/{connection_id}/tools` | 获取 MCP 连接工具列表 |
| POST | `/api/v1/config/mcp/connections/test` | 测试 MCP 连接（请求体内传配置） |

> 注：历史文档列出的 `POST /mcp/connections/{id}/test` 与 `POST /mcp/connections/{id}/sync-tools` 已不存在，分别由 `POST /mcp/connections/test` 与 `GET /mcp/connections/{id}/tools` + `POST /mcp/connections/{id}/toggle` 取代。

#### 数据中心配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/dc-configs` | 数据中心配置列表 |
| POST | `/api/v1/config/dc-configs` | 创建数据中心配置 |
| PUT | `/api/v1/config/dc-configs/{game_id}/{region_code}` | 更新数据中心配置 |
| DELETE | `/api/v1/config/dc-configs/{game_id}/{region_code}` | 删除数据中心配置 |

> 注：路径参数为 `{game_id}/{region_code}`，非历史文档的 `{project_id}`。

#### 指标语义与标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/metric-semantics` | 指标语义列表 |
| POST | `/api/v1/config/metric-semantics` | 创建指标语义 |
| PUT | `/api/v1/config/metric-semantics/{metric_key}` | 更新指标语义 |
| DELETE | `/api/v1/config/metric-semantics/{metric_key}` | 禁用指标语义 |
| GET | `/api/v1/config/metric-tags` | 指标标签列表 |
| POST | `/api/v1/config/metric-tags` | 创建指标标签 |
| PUT | `/api/v1/config/metric-tags/{tag_id}` | 更新指标标签 |
| DELETE | `/api/v1/config/metric-tags/{tag_id}` | 删除指标标签 |

#### Skills 配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/skills` | Skills 列表 |
| POST | `/api/v1/config/skills` | 创建 Skill |
| PUT | `/api/v1/config/skills/{skill_id}` | 更新 Skill |
| DELETE | `/api/v1/config/skills/{skill_id}` | 删除 Skill |

#### 时区选项

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/config/timezone-options` | 时区选项列表 |
| POST | `/api/v1/config/timezone-options` | 创建时区选项 |
| PUT | `/api/v1/config/timezone-options/{option_id}` | 更新时区选项 |
| DELETE | `/api/v1/config/timezone-options/{option_id}` | 删除时区选项 |

当前口径：

- `metric-semantics` 为指标语义中心管理接口，仅 `super_admin` 可写
- `metric-tags` 管理指标标签（对应 `sys_metric_tag` / `sys_metric_semantic_tag`）
- `dc-configs` 管理数据中心接入配置（原 `game-sources` + `region-scopes` 已合并收敛）
- `mcp/connections` 管理外部 MCP Server 连接、启停与工具列表
- `skills` 管理 Agent Skills 配置（对应 `sys_agent_skill`）
- `timezone-options` 管理时区选项（对应 `sys_timezone_option`）

### 6.15 VS Comparison

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/vs-comparison/multi-time/query` | 多时间维度对比查询 |

### 6.16 Filter Templates

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/filter-templates` | 筛选模板列表 |
| POST | `/api/v1/filter-templates` | 创建筛选模板 |
| GET | `/api/v1/filter-templates/{template_id}` | 筛选模板详情 |
| PUT | `/api/v1/filter-templates/{template_id}` | 更新筛选模板 |
| DELETE | `/api/v1/filter-templates/{template_id}` | 删除筛选模板 |
| GET | `/api/v1/filter-templates/{template_id}/share` | 获取模板分享 |
| PUT | `/api/v1/filter-templates/{template_id}/share` | 替换模板分享 |
| POST | `/api/v1/filter-templates/{template_id}/apply` | 应用筛选模板 |

### 6.17 Event Analysis

> 前缀为 `/event-analysis`（无 v2 后缀）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/event-analysis` | 创建事件分析配置 |
| GET | `/api/v1/event-analysis` | 事件分析配置列表 |
| GET | `/api/v1/event-analysis/{config_id}` | 事件分析配置详情 |
| PUT | `/api/v1/event-analysis/{config_id}` | 更新事件分析配置 |
| DELETE | `/api/v1/event-analysis/{config_id}` | 删除事件分析配置 |
| POST | `/api/v1/event-analysis/{config_id}/execute` | 执行（按已保存配置） |
| POST | `/api/v1/event-analysis/{config_id}/copy` | 复制配置 |
| POST | `/api/v1/event-analysis/{config_id}/save-as-report` | 另存为报表 |
| POST | `/api/v1/event-analysis/execute` | 执行（按请求体，不落库） |
| GET | `/api/v1/event-analysis/events` | 可用事件列表 |
| GET | `/api/v1/event-analysis/events/{event_name}/dimensions` | 事件可用维度 |
| GET | `/api/v1/event-analysis/events/{event_name}/metrics` | 事件可用指标 |
| GET | `/api/v1/event-analysis/events/{event_name}/config` | 事件配置载荷 |
| PUT | `/api/v1/event-analysis/{config_id}/schedule` | 更新调度配置 |
| POST | `/api/v1/event-analysis/{config_id}/schedule/enable` | 启用调度 |
| POST | `/api/v1/event-analysis/{config_id}/schedule/disable` | 禁用调度 |
| GET | `/api/v1/event-analysis/{config_id}/run-logs` | 运行日志列表 |
| GET | `/api/v1/event-analysis/{config_id}/run-logs/{run_id}` | 运行日志详情 |
| POST | `/api/v1/event-analysis/{config_id}/run-logs/{run_id}/notify` | 重发某次运行通知 |

当前口径：

- 只对标"事件分析页"主任务，不把漏斗/分布/留存/路径混入
- 目标能力聚焦于：指标模板、结果模式、页内导出、保存为报表后的来源语义承接
- `events` 系列路由在 `/{config_id}` 之前定义，避免字面量被路径参数捕获

### 6.18 User Segments

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/user-segments/fields` | 获取可用分群字段 |
| GET | `/api/v1/user-segments` | 用户分群列表 |
| POST | `/api/v1/user-segments` | 创建用户分群 |
| GET | `/api/v1/user-segments/{segment_id}` | 用户分群详情 |
| PUT | `/api/v1/user-segments/{segment_id}` | 更新用户分群 |
| DELETE | `/api/v1/user-segments/{segment_id}` | 删除用户分群 |
| POST | `/api/v1/user-segments/preview` | 预览分群条件 |
| POST | `/api/v1/user-segments/{segment_id}/calculate` | 计算分群命中人数 |
| POST | `/api/v1/user-segments/{segment_id}/copy` | 复制分群 |
| GET | `/api/v1/user-segments/{segment_id}/share` | 获取分群共享列表 |
| PUT | `/api/v1/user-segments/{segment_id}/share` | 更新分群共享列表 |
| POST | `/api/v1/user-segments/{segment_id}/preview-saved` | 预览已保存分群 |
| POST | `/api/v1/user-segments/{segment_id}/preview` | 预览已保存分群（别名） |
| GET | `/api/v1/user-segments/{segment_id}/export` | 导出分群用户 ID（CSV） |

当前口径：

- 条件分群是当前唯一正式创建入口；ID 分群与 SQL 分群属于后置 backlog
- 本轮首批增强聚焦元数据补齐：显示名双轨、分析主体、时区、计算方式、定时开关、最近计算时间、命中人数缓存

### 6.19 Project Spaces

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/project-spaces` | 共享空间列表 |
| POST | `/api/v1/project-spaces` | 创建共享空间 |
| GET | `/api/v1/project-spaces/{space_id}` | 共享空间详情 |
| PUT | `/api/v1/project-spaces/{space_id}` | 更新共享空间 |
| DELETE | `/api/v1/project-spaces/{space_id}` | 删除共享空间 |
| GET | `/api/v1/project-spaces/{space_id}/principals` | 获取空间成员 |
| POST | `/api/v1/project-spaces/{space_id}/principals/users` | 添加用户成员 |
| POST | `/api/v1/project-spaces/{space_id}/principals/groups` | 添加权限组成员 |
| POST | `/api/v1/project-spaces/{space_id}/principals/collaboration-groups` | 添加协作组成员 |
| DELETE | `/api/v1/project-spaces/{space_id}/principals/{principal_record_id}` | 移除成员 |
| GET | `/api/v1/project-spaces/{space_id}/resources` | 获取空间资源 |
| POST | `/api/v1/project-spaces/{space_id}/resources` | 添加空间资源 |
| DELETE | `/api/v1/project-spaces/{space_id}/resources/{resource_mapping_id}` | 移除空间资源 |

### 6.20 Collaboration Groups

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/collaboration-groups` | 协作组列表 |
| POST | `/api/v1/collaboration-groups` | 创建协作组 |
| GET | `/api/v1/collaboration-groups/{group_id}` | 协作组详情 |
| PUT | `/api/v1/collaboration-groups/{group_id}` | 更新协作组 |
| DELETE | `/api/v1/collaboration-groups/{group_id}` | 删除协作组 |
| GET | `/api/v1/collaboration-groups/{group_id}/members` | 协作组成员列表 |
| POST | `/api/v1/collaboration-groups/{group_id}/members` | 添加协作组成员 |
| DELETE | `/api/v1/collaboration-groups/{group_id}/members/{user_id}` | 移除协作组成员 |

当前口径：

- 创建协作组时写入 `group_kind='collaboration'`，owner 自动成为 `member_role='owner'`
- owner/manager 可添加或移除普通成员
- 协作组可被共享空间作为 `principal_type='collaboration_group'` 邀请

### 6.21 Alert

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/alert/rules` | 告警规则列表 |
| POST | `/api/v1/alert/rules` | 创建告警规则 |
| GET | `/api/v1/alert/rules/{rule_id}` | 告警规则详情 |
| PUT | `/api/v1/alert/rules/{rule_id}` | 更新告警规则 |
| DELETE | `/api/v1/alert/rules/{rule_id}` | 删除告警规则 |
| POST | `/api/v1/alert/rules/{rule_id}/check` | 手动触发单规则检测 |
| POST | `/api/v1/alert/rules/{rule_id}/test` | 试跑告警规则 |
| GET | `/api/v1/alert/options` | 获取告警表单选项 |
| GET | `/api/v1/alert/channels` | 通知渠道列表 |
| POST | `/api/v1/alert/channels` | 创建通知渠道 |
| GET | `/api/v1/alert/channels/{channel_id}` | 通知渠道详情 |
| PUT | `/api/v1/alert/channels/{channel_id}` | 更新通知渠道 |
| DELETE | `/api/v1/alert/channels/{channel_id}` | 删除通知渠道 |
| GET | `/api/v1/alert/silences` | 静默规则列表 |
| POST | `/api/v1/alert/silences` | 创建静默规则 |
| GET | `/api/v1/alert/silences/{silence_id}` | 静默规则详情 |
| PUT | `/api/v1/alert/silences/{silence_id}` | 更新静默规则 |
| DELETE | `/api/v1/alert/silences/{silence_id}` | 删除静默规则 |
| GET | `/api/v1/alert/records` | 告警记录列表 |
| GET | `/api/v1/alert/records/{record_id}` | 告警记录详情 |
| GET | `/api/v1/alert/stats` | 告警统计 |

当前口径：

- 告警规则与通知渠道的完整 CRUD 由后端 `/alert/rules`、`/alert/channels` 承载
- `POST /alert/rules/{rule_id}/check` 手动触发单规则检测；`POST /alert/rules/{rule_id}/test` 试跑规则
- 告警记录 `GET /alert/records`、`/alert/records/{record_id}` 提供历史；`GET /alert/stats` 提供统计
- `agent_driven` 规则类型设计层保留，当前配置页不作为默认开放选项
- Watcher 为独立 Worker 运行模式（不在 Supervisor 对话主回路）

### 6.22 Frontend Logs

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/frontend-logs/logs` | 批量上报前端日志 |
| POST | `/api/v1/frontend-logs/log` | 单条上报前端日志 |
| GET | `/api/v1/frontend-logs/logs` | 获取前端日志（JSON） |
| GET | `/api/v1/frontend-logs/logs/text` | 获取前端日志（纯文本） |

### 6.23 Exchange Rate

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/exchange-rate` | 获取实时汇率（`?from=USD&to=CNY`） |

当前口径：支持实时汇率查询，fallback 到预设静态汇率表。来源：`app/api/v1/exchange_rate.py`。

### 6.24 System Monitor

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/system/monitor` | 获取服务状态快照 |
| GET | `/api/v1/system/monitor/stream` | SSE 服务状态流 |

### 6.25 Admin ETL

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/etl/projects` | 获取可执行 ETL 的项目列表 |
| POST | `/api/v1/admin/etl/sync` | 触发 ETL 单日同步 |
| POST | `/api/v1/admin/etl/backfill` | 触发 ETL 回填任务 |
| POST | `/api/v1/admin/etl/dashboard/warmup` | 手动触发 Dashboard 缓存预热 |

### 6.26 Metrics

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/metrics/metrics/context` | 获取 Agent 上下文使用指标 |

返回当前滑动窗口内的 Token 使用量、压缩次数、平均压缩率等。

> 已知问题：因 `system/metrics.py` 与 `__init__.py` 双重 `prefix="/metrics"`，实际路径为 `/api/v1/metrics/metrics/context`，待修复为 `/api/v1/metrics/context`（见 §5.10）。

### 6.27 Token

#### 6.27.1 Token Usage

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/token/usage/my` | 当前用户查看自己的 Token 用量 |
| GET | `/api/v1/token/usage/overview` | 超管查看所有用户用量汇总 |
| GET | `/api/v1/token/usage/users/{user_id}` | 超管查看指定用户用量明细 |

`cycle_type` 支持 `daily`、`weekly`、`monthly`、`all`。

#### 6.27.2 Token Quota（超管专用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/token/quota/users/{user_id}` | 获取用户配额 |
| PUT | `/api/v1/token/quota/users/{user_id}` | 设置用户配额 |
| DELETE | `/api/v1/token/quota/users/{user_id}` | 删除用户配额 |
| GET | `/api/v1/token/quota/list` | 列出所有用户配额 |

#### 6.27.3 Token Price（超管专用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/token/price` | 获取模型定价列表（需 `endpoint_id`） |
| POST | `/api/v1/token/price` | 创建模型定价 |
| PUT | `/api/v1/token/price/{price_id}` | 更新模型定价 |
| DELETE | `/api/v1/token/price/{price_id}` | 删除模型定价 |

---

## 7. 数据源口径

- PostgreSQL 是 OLTP 数据的事实存储（权限、配置、业务状态、数据中心配置与 ETL 指标存储等），共 **59 张表**
- 分析查询转数据中心直读或本地 PG `datacenter_metric_daily`
- 表结构与数量以实际数据库结构为准
