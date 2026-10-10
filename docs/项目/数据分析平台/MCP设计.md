---
title: MCP 设计
sidebar_position: 3
description: MCP Server/Client 双重角色架构设计，实现平台 Agent 能力暴露与外部工具扩展
---

# MCP Server/Client 设计

---

## 1. 概述

MCP（Model Context Protocol）模块使数据分析 AI Agent 平台具备双重角色：

- **MCP Server** — 将平台 Agent 能力作为工具暴露给外部 AI 客户端（Claude Desktop、Cursor 等）
- **MCP Client** — 从外部 MCP Server 拉取工具并注册到 Agent Tool 注册表，扩展 Agent 能力

---

## 2. MCP Server

### 2.1 架构

```
外部 AI Client (Claude Desktop / Cursor)
        │
        ▼
┌──────────────────┐
│  Transport 层     │
│  stdio / SSE      │
├──────────────────┤
│  认证层           │
│  JWT / API Key    │
│  / 静态 Token      │
├──────────────────┤
│  Tool 注册层       │
│  dashboard/query  │
│  /alert/report    │
├──────────────────┤
│  Agent Tools      │
│  execute_tool()   │
└──────────────────┘
```

### 2.2 传输模式

| 模式 | 启动命令 | 说明 |
|------|---------|------|
| stdio | `uv run mcp-server` | 本地进程通信，Claude Desktop 接入 |
| SSE | `uv run mcp-sse` | HTTP Server-Sent Events，远程 API 接入 |

### 2.3 认证三层

`mcp_server/auth.py` 支持三种认证方式，按优先级尝试：

| 优先级 | 方式 | Token 格式 | 说明 |
|--------|------|-----------|------|
| 1 | JWT | `Authorization: Bearer <jwt>` | 与 API 层相同 JWT |
| 2 | API Key | `Authorization: Bearer ga_xxxxx` | 超管在 `/admin` 生成的用户级 Key |
| 3 | 静态 Token | `MCP_AUTH_TOKEN` 环境变量 | 开发/调试用，hmac 常量时间比较 |

认证失败时返回 401 `{"error": "Unauthorized"}`。

### 2.4 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MCP_AUTH_TOKEN` | "" | 静态认证 Token |
| `MCP_ALLOW_ANONYMOUS` | `false` | 是否允许匿名访问 |
| `MCP_JWT_HEADER` | `Authorization` | JWT 所在的 Header |
| `MCP_JWT_QUERY_PARAM` | `token` | Query 参数传递 Token |
| `MCP_ALLOW_QUERY_TOKEN` | `false` | 是否允许 URL Query 传 Token（默认禁用，防止 URL 泄露） |
| `MCP_LOG_LEVEL` | `INFO` | 日志级别 |
| `MCP_DEFAULT_USER_ID` | `mcp_default_user` | 默认用户 ID（用于订阅管理等场景） |
| `MCP_TRANSPORT` | `sse` | 传输模式（`sse` 或 `stdio`） |
| `MCP_SSE_HOST` | `127.0.0.1` | SSE 监听地址 |
| `MCP_SSE_PORT` | `21802` | SSE 监听端口 |
| `LOG_DIR` | `/log` | 日志根目录 |

### 2.5 用户上下文隔离

`MCPAuthContext` 使用 `contextvars` 保证多 SSE 连接间用户上下文隔离：

```python
from mcp_server.auth import MCPAuthContext

# tool 执行时获取当前用户
user = MCPAuthContext.get_current_user()
user_id = MCPAuthContext.get_current_user_id()
role = MCPAuthContext.get_user_role()
```

### 2.6 暴露的工具

MCP Server 通过 `mcp_server/tools/` 子模块暴露平台 Agent 能力：

| 模块 | 工具 | 说明 |
|------|------|------|
| `tools/dashboard.py` | `get_dashboard_overview`, `get_dashboard_active`, `get_dashboard_growth`, `get_dashboard_payment`, `get_dashboard_retention` | 固定看板数据查询 |
| `tools/query.py` | `query_data`, `analyze_metric`, `get_available_metrics`, `calculate`, `calculator`, `detect_anomalies`, `query_login_detail`, `query_payment_detail`, `export_query_result`, `delegate` | 通用查询与分析 |
| `tools/query.py` | `create_ai_endpoint`, `update_ai_endpoint`, `delete_ai_endpoint`, `list_ai_endpoints`, `set_agent_ai_endpoint` | AI Endpoint 管理 |
| `tools/alert.py` | `create_alert_rule`, `update_alert_rule`, `delete_alert_rule`, `list_alert_rules`, `test_alert_rule` | 告警规则管理 |
| `tools/alert.py` | `create_notification_channel`, `update_notification_channel`, `delete_notification_channel` | 通知渠道管理 |
| `tools/alert.py` | `create_silence_rule`, `delete_silence_rule`, `list_silence_rules` | 静默规则管理 |
| `tools/report.py` | `generate_report_preview`, `create_report_subscription`, `list_report_subscriptions`, `update_report_subscription`, `delete_report_subscription`, `list_notification_channels` | 报告订阅与生成 |

工具执行分两条路径：

- **Registry tools**（通过 `ToolRegistry` 注册的工具）：走 `app/modules/agent/tools.py` 的 `execute_tool()`，使用 ToolRegistry 权限体系
- **Legacy tools**（`TOOL_DISPATCH` 字典中的工具）：直接调用对应 handler，使用 `permissions.py` 的 `TOOL_PERMISSION_MAP` 权限体系

### 2.7 关键文件

| 文件 | 说明 |
|------|------|
| `mcp_server/server.py` | Server 入口，工具注册与调度 |
| `mcp_server/app.py` | FastAPI/Starlette 应用实例 |
| `mcp_server/auth.py` | 认证模块（JWT/API Key/静态 Token） |
| `mcp_server/transport.py` | 传输层（SSE 服务启动） |
| `mcp_server/tools/` | 工具 handler 定义 |

---

## 3. MCP Client

### 3.1 架构

```
Agent Supervisor (Tool-Calling)
        │
        ▼
┌──────────────────────┐
│  ToolRegistry         │  ← Tool 注册表（含外部工具）
│  execute_tool()       │
├──────────────────────┤
│  MCPClientManager     │  ← 外部工具代理
│  call_external_tool() │
├──────────────────────┤
│  ExternalMCPServer    │  ← 连接管理
│  SSE / stdio          │
└──────────────────────┘
        │
        ▼
  外部 MCP Server (SSE/stdio)
```

### 3.2 MCPClientManager

单例管理器（`mcp_client_manager`），负责外部 MCP Server 的完整生命周期：

```
startup()
  └→ 从 DB (mcp_connections 表) 加载所有 enabled 连接
     └→ connect() 逐个建立连接
        └→ ToolRegistry.register_external_tools() 注册到 Agent

on_connection_config_change()
  └→ 配置变更时自动 reconnect

shutdown()
  └→ 所有连接断开 + 清理
```

### 3.3 连接管理

```python
from mcp_server.client import mcp_client_manager

# 启动时从 DB 加载
await mcp_client_manager.startup()

# 手动连接
tools = await mcp_client_manager.connect(
    connection_id="ext_001",
    label="External Analysis API",
    transport="sse",
    base_url="https://api.example.com/mcp",
    headers={"X-API-Key": "xxx"},
)

# 测试连接
result = await mcp_client_manager.test_connection(
    transport="sse",
    base_url="https://api.example.com/mcp",
)

# 关闭
await mcp_client_manager.shutdown()
```

### 3.4 双传输模式

| 模式 | 参数 | 连接方式 |
|------|------|---------|
| SSE | `base_url` + `headers` | HTTP SSE 连接到 `/sse` endpoint，30s 超时 |
| stdio | `command` | `subprocess.Popen` 启动子进程，stdin/stdout 通信 |

SSE 模式下自动进行 SSRF 检查（`is_safe_url()`），防止内部网络攻击。

### 3.5 外部工具注册

外部工具通过 `ToolRegistry` 注册，使用 namespacing 避免命名冲突：

```
注册格式：{connection_id}__{raw_name}

例如：ext_001__query_data
```

Agent 调用外部工具的流程：

```
Agent: execute_tool("ext_001__query_data", args)
  → tool_registry 识别为外部工具
    → mcp_client_manager.call_external_tool("ext_001", "query_data", args)
      → MCP SSE/stdio 调用
        → 返回结果
```

### 3.6 工具 Schema 同步

`compute_tools_hash()` 对工具列表计算 SHA256 哈希前缀（16字符），存储到 DB 的 `tools_hash` 字段。启动时对比哈希决定是否需要更新注册。

---

## 4. 与 Agent 的集成

### 4.1 注册时机

```
FastAPI 启动 (lifespan)
  → init_from_db()
    → mcp_client_manager.startup()
      → ToolRegistry.register_external_tools()
```

### 4.2 工具调用路径

`app/modules/agent/tools.py` → `_execute_tool_impl()`：

1. 检查工具是否在 `ToolRegistry` 中注册
2. 识别为外部工具（有 `__` 分隔符且前缀匹配 connection_id）
3. 路由到 `mcp_client_manager.call_external_tool()`

---

## 5. 安全机制

| 层面 | 机制 |
|------|------|
| Server 认证 | JWT > API Key > 静态 Token 三级验证，hmac 常量时间比较 |
| Client SSRF | SSE 连接前 URL 安全校验 |
| 用户隔离 | `contextvars` 保证多 SSE 连接不串用户 |
| 审计 | 工具调用通过 `trace_writer` 记录执行轨迹，`MemoryManager.record_execution()` 记录到会话历史；`audit_logger` 提供 `log_mcp_tool_access()` 方法（当前未在代码中直接调用，预留接口） |
| 输入验证 | JSON Schema → Pydantic 参数校验 |

---

## 6. 相关文件

| 文件 | 说明 |
|------|------|
| `server/mcp_server/server.py` | MCP Server 入口，工具注册与调度 |
| `server/mcp_server/app.py` | FastAPI/Starlette 应用实例与生命周期 |
| `server/mcp_server/auth.py` | 三层认证实现（JWT/API Key/静态 Token） |
| `server/mcp_server/transport.py` | SSE 传输层启动 |
| `server/mcp_server/config.py` | MCP 配置（端口、日志目录、默认用户等） |
| `server/mcp_server/security_check.py` | 启动时安全检查（匿名模式、Token 强度、SECRET_KEY） |
| `server/mcp_server/client.py` | MCPClientManager 完整实现 |
| `server/mcp_server/tools/` | Server 端工具 handler |
| `server/app/modules/agent/tool_registry.py` | Tool 注册表 + 外部工具 namespacing |
| `server/app/modules/agent/tools.py` | 工具执行入口（含外部路由） |
| `server/app/services/config/mcp_service.py` | MCP 连接管理 Service（CRUD + 启停） |
| `server/app/modules/config/mcp.py` | MCP 连接管理 API 路由（超管权限） |
| `server/app/core/runtime/url_validator.py` | SSRF URL 安全校验 |
| `server/app/core/observability/audit_logger.py` | 审计日志（含 MCP 相关动作类型） |
