---
title: 拆解 Claude Code
description: 从源码和实际行为反推 Claude Code 的架构：工具系统、上下文管理、子代理与任务编排。
---

读完源码之后整理的一份架构拆解，重点不在「它有哪些功能」，而在「哪些设计让它能长时间跑而不失控」：工具协议怎么定义、上下文怎么压、子代理怎么隔离、权限怎么拦。

## Claude Code

Claude Code 是 Anthropic 推出的官方 CLI 工具，代表了当前 AI 辅助编程工具的工程化巅峰。以下基于对其源代码的深入分析，总结其架构设计与核心范式。

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code 架构                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Command    │    │     Tool     │    │   Skill      │      │
│  │   系统       │◄──►│    系统      │◄──►│   系统       │      │
│  │  (用户指令)   │    │ (LLM调用)    │    │ (工作流封装)  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │              │
│         └───────────────────┼───────────────────┘              │
│                             ▼                                  │
│                   ┌──────────────────┐                         │
│                   │   QueryEngine    │                         │
│                   │   (LLM 引擎)      │                         │
│                   └──────────────────┘                         │
│                             │                                  │
│                             ▼                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Permission  │    │   Bridge     │    │     MCP      │      │
│  │   系统       │    │  (远程控制)   │    │  (外部工具)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 核心设计范式

**1. 三层架构设计（Command/Tool/Skill）**

| 层级              | 触发方式              | 执行方式   | 使用场景     |
| ----------------- | --------------------- | ---------- | ------------ |
| **Command** | 用户输入 `/command` | 立即执行   | 用户明确意图 |
| **Tool**    | LLM 通过 XML 调用     | 按需执行   | AI 自主决策  |
| **Skill**   | 两者皆可              | 工作流封装 | 复用常用模式 |

这种设计实现了**用户控制与 AI 自主性的平衡**：用户可通过 `/` 命令主动触发工作流，AI 可自主决定使用哪些工具，Skill 提供可复用的工作流封装。

**2. 分层权限模型（Layered Permission）**

```
┌─────────────────────────────────────────────────────────────┐
│                    权限决策层次                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 规则检查 (Rules)                                   │
│    ├── deny 规则 → 立即拒绝                                  │
│    └── ask 规则 → 需要确认                                   │
│  Layer 2: 模式检查 (Mode)                                    │
│    ├── bypassPermissions → 绕过权限                          │
│    ├── acceptEdits → 自动接受编辑                            │
│    ├── auto → AI 分类器决策                                  │
│    └── plan → 计划模式                                       │
│  Layer 3: 工具自定义检查                                     │
│    └── tool.checkPermissions()                               │
│  Layer 4: 用户确认                                           │
│    └── 交互式权限对话框                                      │
└─────────────────────────────────────────────────────────────┘
```

六种权限模式：default（默认）、plan（计划模式）、acceptEdits（自动接受编辑）、bypassPermissions（绕过权限）、dontAsk（自动拒绝）、auto（AI 分类器自动决策）。

**3. Plan Mode（计划模式）**

Plan Mode 是**对齐优先**设计理念的体现：

```
用户输入需求 → 进入 Plan Mode（只读探索）→ AI 探索代码库 → 设计方案 → 呈现计划 → 用户批准 → 退出 Plan Mode → 执行代码修改
```

核心原则：**对齐优先**（开始编码前获得用户认可）、**只读保证**（Plan Mode 期间只允许探索）、**结构化工作流**（探索→设计→呈现→批准→实施）。

**4. 子 Agent 系统（Sub-agent Architecture）**

三种执行模式：

| 模式                 | 特点                        | 适用场景           |
| -------------------- | --------------------------- | ------------------ |
| **前台 Agent** | 阻塞主会话，实时显示进度    | 快速查询、简单任务 |
| **后台 Agent** | 非阻塞，通过通知报告完成    | 长时间运行任务     |
| **Fork Agent** | 隔离上下文，独立 token 预算 | 复杂、自包含的任务 |

**Coordinator 模式**（多 Agent 协调）：Coordinator 指导 Workers 进行研究、实现、验证，Workers 自主执行任务并通过 SendMessage 接收指令。工作流阶段：Research → Synthesis → Implementation → Verification。

Agent 间通信机制：内存邮箱（进程内）、文件邮箱（跨进程）、SendMessage 工具（显式消息）、结构化协议（类型安全）。

**5. 上下文管理（Context Management）**

采用**即时（Just-in-Time, JIT）上下文**策略：维护轻量化引用（文件路径、笔记），运行时通过 FileReadTool、GlobTool、GrepTool 按需加载。

**ContextBuilder 设计**（GSSC 流水线）：Gather（汇集多源输入）→ Select（基于相关性和新近性选择）→ Structure（分区结构化）→ Compress（超限时压缩）。

**NoteTool** - 结构化外部记忆：Markdown + YAML 格式，适合机器解析和人类阅读，支持 Git 版本控制。

**6. Hook 系统（事件驱动扩展）**

支持 25 种事件点：PreToolUse、PostToolUse、SessionStart、UserPromptSubmit、Stop、PreCompact 等。Hook 类型：command（Shell 命令）、prompt（LLM 提示词）、http（HTTP 请求）、agent（Agent 验证）。

**7. Bridge 系统（远程控制）**

实现本地执行 + Web UI 的完美结合：本地 CLI ←→ Bridge Transport ←→ Claude.ai Web。特性：跨平台会话连续性、权限回调（Web 界面批准，本地执行）、实时双向消息流、Token 自动刷新。

**8. MCP 集成（标准化工具接入）**

Model Context Protocol (MCP) 实现工具生态的标准化接入：MCP Server → MCP Client → Tool 自动展开（如 `mcp__github__create_issue`）。

**9. 工程化最佳实践**

| 实践          | 实现                                          | 效果           |
| ------------- | --------------------------------------------- | -------------- |
| 并行预取      | 启动时并行加载 MDM 设置、Keychain、API 预连接 | ~65ms 节省     |
| 延迟加载      | OpenTelemetry、gRPC 等大模块按需加载          | ~1100KB 节省   |
| 条件编译      | 使用 Bun 特性标志进行死代码消除               | 根据功能裁剪   |
| 懒加载 Schema | Tool Schema 使用 `lazySchema` 避免循环依赖  | 减少启动时间   |
| 智能缓存      | 文件读取状态、提示词前缀、向量检索结果缓存    | 提升响应速度   |
| 并发控制      | 只读工具并行执行，写入工具串行执行            | 安全与效率平衡 |

### Agent 代理类型

Claude Code 内置多种专业化 Agent：

| Agent 类型                | 特点                                    | 用途           |
| ------------------------- | --------------------------------------- | -------------- |
| **general-purpose** | 标准 CLI 介绍，所有工具                 | 通用任务       |
| **Explore**         | 只读模式，禁止文件修改，使用 Haiku 模型 | 代码库探索     |
| **verification**    | 后台运行，对抗性测试                    | 验证实现正确性 |
| **worker**          | Coordinator 模式专用，自主执行          | 执行具体任务   |

**Agent 定义格式**（Markdown + YAML）：

```yaml
---
agentType: 'Explore'
whenToUse: 'Fast agent specialized for exploring codebases'
disallowedTools: ['FileEdit', 'FileWrite', 'Agent']
model: 'haiku'
omitClaudeMd: true
---
```

### Agent代理

[Agent System Overview | Claude AI Dev](https://claudeai.dev/docs/mechanics/agents/overview/)
            + 权限治理


### Agent代理

[Agent System Overview | Claude AI Dev](https://claudeai.dev/docs/mechanics/agents/overview/)
