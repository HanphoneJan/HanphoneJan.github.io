---
title: MCP 与 A2A
sidebar_position: 9
description: Knowledge Hub 对外暴露能力的两条协议：MCP 的四个工具、A2A 的两个 skill，以及权限裁剪与错误语义
---

# MCP 与 A2A

MCP 和 A2A 共用同一套检索与问答内核（`services/retrieval/`），各自只做协议适配。这是一条硬约束：如果两套逻辑各自演化，半年后就会出现“API 搜得到、MCP 搜不到”这类很难排查的不一致。

## 1. 为什么要有两个对外入口

| 入口 | 面向 | 典型调用方 |
|---|---|---|
| REST API | 本平台前端和自建客户端 | 浏览器、脚本 |
| MCP | 把知识库当作“工具”使用的 AI 客户端 | Claude Desktop、Cursor 等 |
| A2A | 把本服务当作“另一个 Agent”调用的系统 | 上游编排 Agent |

MCP 的关键词是工具发现与调用：客户端先 `tools/list`，再 `tools/call`。A2A 的关键词是任务与 Agent Card：调用方先读取能力声明，再派发任务、取回 artifacts。

两者在权限、检索和审计上完全一致，差别只在协议形状与返回结构。

## 2. MCP Server

### 2.1 传输与鉴权

```
POST /mcp     MCP Streamable HTTP（无状态，不实现 Mcp-Session-Id）
GET  /mcp     能力自述（不属于协议，给人排查用）
鉴权：Authorization: Bearer <api_key>
```

传输层是无状态的，不实现会话 ID。支持批量请求（JSON 数组），如果请求里全是通知，返回 204。协议错误也返回 HTTP 200，错误放在 body 的 `error` 字段里，只有“根本不是 JSON-RPC”时才返回 400。

支持的方法有 `initialize`、`notifications/initialized`、`ping`、`tools/list` 和 `tools/call`。未知方法返回 `-32601`。

### 2.2 暴露的四个工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_kb` | 无 | 列出调用者有权限的知识库，结果按权限动态裁剪 |
| `search_kb` | `kb_id`、`query`、`top_k`、`mode` | 多路 RRF 检索 |
| `ask_kb` | `kb_id`、`question`、`top_k`、`session_id` | RAG 问答，非流式 |
| `get_document` | `kb_id`、`doc_id`、`limit` | 文档元信息加前 N 个 chunk |

调用示例：

```jsonc
{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"search_kb",
           "arguments":{"kb_id":88,"query":"验收标准那一栏怎么填","top_k":5}}}

→ 200 {"jsonrpc":"2.0","id":1,
       "result":{"content":[{"type":"text","text":"{\n  \"items\": [...]\n}"}],
                 "isError":false}}
```

结果一律是 JSON 字符串，放在 `content[0].text` 里。MCP 客户端必须支持 `text` 内容类型，自造类型会被当作“未知类型”丢掉。

### 2.3 工具列表的权限裁剪

```
调用方 token → api_keys.user_id → 有权限的 kb_ids → list_tools 只返回这些库对应的工具实例
```

不能采用“先返回全部工具，调用时再拒绝”的做法，因为那会让调用方探测到不该看到的库是否存在。`initialize` 返回 `serverInfo` 之后，`tools/list` 里 `kb_id` 的 `enum` 就是该 Key 可读的知识库。

### 2.4 错误语义

| 情况 | JSON-RPC code | 落在哪里 |
|---|---|---|
| 未知 `method` 或未知工具 | `-32601` | 顶层 `error` |
| 参数不合法（缺必填、类型错、越界、未知参数、enum 不符） | `-32602` Invalid params | 顶层 `error`，message 形如 `search_kb: 缺少必填参数 kb_id` |
| 知识库不存在或无权限 | 无协议错误 | `result.isError = true`，内容为 `{"error":"KB_NOT_FOUND"}` |
| 其它未预期异常 | `-32603` Internal error | 顶层 `error` |

这里的界线是：参数不合法属于协议错误；请求合法但结果失败属于业务结果，用 `isError: true` 表达。

参数越界时要报错，不能悄悄夹取。MCP 的调用方多半是 LLM，悄悄把 50 条夹成 80 条的上限会让它按错误的数量继续推理。

错误消息里不出现 `KeyError`、`ValueError` 这类裸异常类型名。

### 2.5 审计

每次 `tools/call` 都写入 `audit_log`：`api_key_id`、`user_id`、`kb_ids[]`、query 摘要和耗时，`action` 为 `mcp_call`。

## 3. A2A Agent

### 3.1 Agent Card

```http
GET /.well-known/agent-card.json     → 能力声明
POST /a2a/tasks                      → 委派任务
```

调用方应先读 Agent Card，每个 skill 都带 `inputSchema` 和 `outputSchema`。Card 里不包含任何知识库的名字，只有 `readableKbCount`，因为库名属于权限信息。`kb_id` 是必填的，但 Card 刻意不列出可用值。

### 3.2 两个 skill

| Agent | skill | 用途 | 实现 |
|---|---|---|---|
| 问答 Agent | `answer` | 单轮查资料 | `ask.prepare` 加 `stream_answer(one_shot=True)` |
| 研究 Agent | `research` | 多轮检索并汇总 | 同一内核，`top_k` 放宽到 30，按文档分组逐份给摘录 |

`research` 不是“让 LLM 规划多轮检索”。默认生成层是抽取式，这是隐私红线。它做的是可解释的多角度汇总，返回结果里带 `extractive: true`。

### 3.3 请求形状

`POST /a2a/tasks` 接受两种入参，最终都走同一个内部函数：

```jsonc
// ① 协议面：JSON-RPC tasks/send
{"jsonrpc":"2.0","id":1,"method":"tasks/send",
 "params":{"skill":"answer","kb_id":88,
           "message":{"parts":[{"kind":"text","text":"验收标准那一栏怎么填"}]}}}

// ② 便捷面：curl 或手测
{"skill":"answer","kb_id":88,"query":"验收标准那一栏怎么填"}
```

### 3.4 响应形状

A2A 返回 Task 对象：

```jsonc
{"id":"...", "contextId":"...",
 "status":{"state":"completed"},
 "history":[...],
 "artifacts":[{"parts":[{"kind":"text","text":"...",
                         "metadata":{"citations":[1,2]}}]}],
 "metadata":{"kb_id":88,"skill":"answer","sources":[...],"documents":[...]}}
```

要点如下：

- 正文在 `artifacts[].parts[].text` 里，没有顶层 `answer` 字段；
- 引用来源在顶层 `metadata.sources`；
- 引用角标在 `artifacts[].parts[].metadata.citations`；
- `capabilities.streaming=false` 是如实声明；
- 无权限与不存在返回同一个错误码（403）。

### 3.5 审计

`POST /a2a/tasks` 的每个任务都写入 `audit_log`，`action` 为 `a2a_call`。

## 4. 对外访问的实测状态

`/mcp` 和 `/a2a/tasks` 挂在根路径，不在 `/api/v1` 下，这是对外契约的一部分。实测结果如下：

| 探测 | 结果 |
|---|---|
| `POST /mcp` 不带 Key | 401，返回 `INVALID_TOKEN` |
| `POST /mcp` 执行 `initialize`（带 Key） | 200，返回 `protocolVersion` 和 `serverInfo` |
| `POST /mcp` 执行 `tools/list` | 200，返回四个工具；`kb_id.enum` 是该 Key 可读的库 |
| `POST /mcp` 的 `tools/call` 缺 `kb_id` | 200，body 里是 JSON-RPC 的 `-32602` |
| `GET /.well-known/agent-card.json` | 200，两个 skill 都带 `inputSchema` 和 `outputSchema` |
| `POST /a2a/tasks` 不带 `kb_id` | 400，因为 Card 不泄露有哪些库 |
| `POST /api/v1/mcp`、`POST /api/v1/a2a/tasks` | 404 `NOT_FOUND`，不是 405 |

所以对外鉴权只有 API Key 这一道。Key 泄露后的影响范围由租户隔离兜住，因为无权限等于不存在。

## 5. 对接 MCP 客户端时的常见问题

| 现象 | 原因 | 处理方式 |
|---|---|---|
| 客户端拿不到工具 | `tools/list` 按权限裁剪，先确认 Key 至少能读一个库 | 用 `GET /mcp` 查看能力自述 |
| 提示参数错误但看起来没问题 | `-32602` 属于协议错误，检查参数名和 enum | 越界不会被夹取，会直接报错 |
| 业务失败却去查 JSON-RPC 的 `error` | 库不存在或无权限放在 `result.isError` 里 | 读 `result.isError` 和 content |
| 自造的 content 类型丢失 | 结果一律是 JSON 字符串放在 `content[0].text` | 换用支持 `text` 的客户端 |
| 加了前缀后得到 404 | `/mcp` 不在 `/api/v1` 下 | 使用根路径 |

## 6. 相关文档

- 检索内核与降级：[检索与融合](./检索与融合.md)
- 权限与审计：[多租户与权限](./多租户与权限.md)
- 端点总表：[API 契约](./API契约.md)
