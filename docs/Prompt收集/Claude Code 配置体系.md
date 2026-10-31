---
title: Claude Code 的 Hooks / Skills / Commands / Agents
description: 用 .claude 配置体系把技能激活率从 25% 提到 90%：四类扩展各自的职责与最小可用配置。
---

Claude Code 的默认技能激活率只有两成多，项目规范写了也常被忽略。这份笔记整理四类扩展各自解决什么问题、在什么时机被触发，以及一套能直接落地的最小配置。

结论先给：能用 Hooks 拦住的，不要靠提示词自律；能写成 Skill 的，不要塞进 CLAUDE.md。

## 核心问题

Claude Code 默认技能激活率仅约25%，项目规范经常被忽略。通过 `.claude` 配置体系可将技能激活率提升至90%以上。

## 核心架构

```
.claude/
├── settings.json              # 核心配置
├── CLAUDE.md                  # 项目总规范
├── hooks/                     # 4 个生命周期钩子
│   ├── session-start.js
│   ├── skill-forced-eval.js
│   ├── pre-tool-use.js
│   └── stop.js
├── skills/                    # 26 个专业技能
│   ├── crud-development/
│   ├── api-development/
│   ├── ui-pc/
│   ├── ui-mobile/
│   └── ...
├── commands/                  # 斜杠命令
│   ├── dev.md
│   ├── crud.md
│   └── check.md
├── agents/                    # 自定义代理
│   ├── code-reviewer.md
│   └── project-manager.md
└── templates/                 # 模板文件
    └── 项目状态模板.md
```

## 一、Hooks：四个生命周期钩子

### 1. SessionStart

- **触发时机**：会话启动时
- **功能**：显示Git分支、未提交变更、加载待办事项、展示快捷命令

### 2. UserPromptSubmit（核心）

- **触发时机**：用户每次提交问题时
- **功能**：强制AI评估并激活相关Skills
- **效果**：技能激活率从25%提升至90%+

### 3. PreToolUse

- **触发时机**：执行Bash命令或写入文件前
- **功能**：拦截危险命令（如 `rm -rf /`）、警告敏感操作

### 4. Stop

- **触发时机**：AI完成回答后
- **功能**：播放提示音、分析变更类型、推荐下一步操作

## 二、Skills：专业技能库

### SKILL.md 标准结构

```markdown
## 技能名称

## 触发条件
- 关键词：xxx, yyy
- 适用场景：开发xx功能时

## 核心规范
### 规则1
详细说明...
```java
// 代码示例
```

## 禁止事项

- 禁止 xxx
- 必须 yyy

## 参考代码

- `src/xxx/Example.java`

## 检查清单

- [ ] 检查点1
- [ ] 检查点2

### 常用技能分类

| 分类     | 技能                | 职责                      |
| -------- | ------------------- | ------------------------- |
| 后端开发 | crud-development    | 四层架构 CRUD 开发规范    |
| 后端开发 | api-development     | RESTful API 设计规范      |
| 后端开发 | database-ops        | 数据库操作、建表、字典    |
| 前端开发 | ui-pc               | Element Plus 封装组件使用 |
| 前端开发 | store-pc            | Pinia 状态管理            |
| 移动端   | ui-mobile           | WD UI 组件库              |
| 移动端   | uniapp-platform     | 跨平台条件编译            |
| 业务集成 | payment-integration | 支付功能集成              |
| 业务集成 | wechat-integration  | 微信生态集成              |
| 质量保障 | security-guard      | 安全防护                  |
| 质量保障 | code-patterns       | 代码规范                  |
| 工程管理 | git-workflow        | Git 工作流                |
| 工程管理 | architecture-design | 架构设计                  |

## 三、Commands：斜杠命令

| 命令       | 功能                                                                |
| ---------- | ------------------------------------------------------------------- |
| `/dev`   | 7步开发流程：需求澄清→技术设计→数据库设计→后端→前端→测试→文档 |
| `/crud`  | 从数据库表一键生成四层架构代码                                      |
| `/check` | 全栈代码规范检查                                                    |

## 四、Agents：子任务代理

| 代理            | 功能         | 调用方式                                  |
| --------------- | ------------ | ----------------------------------------- |
| code-reviewer   | 自动代码审查 | 代码完成后自动触发或 `@code-reviewer`   |
| project-manager | 项目进度管理 | `@project-manager`或 `/update-status` |

## 五、快速部署（最小配置）

### 1. 目录结构

```
.claude/
├── settings.json
├── hooks/
│   ├── skill-forced-eval.js   # 核心：强制技能评估
│   └── pre-tool-use.js        # 可选：安全防护
├── skills/
│   └── your-skill/
│       └── SKILL.md
└── CLAUDE.md
```

### 2. settings.json 核心配置

```json
{
  "hooks": {
    "UserPromptSubmit": {
      "script": ".claude/hooks/skill-forced-eval.js"
    },
    "PreToolUse": {
      "script": ".claude/hooks/pre-tool-use.js"
    }
  }
}
```

### 3. skill-forced-eval.js 核心逻辑

```javascript
// 在AI回答前强制评估技能
const skills = [
  { id: 'crud-development', keywords: ['CRUD', '增删改查'] },
  { id: 'database-ops', keywords: ['数据库', '建表'] },
  // ... 其他技能
];

// 评估用户输入，匹配相关技能并强制激活
```

## 核心原则

- **Hooks是纪律**：确保AI在关键节点执行正确动作
- **Skills是知识**：把项目规范固化为AI可学习的文档
- **Commands是流程**：把最佳实践编排为可重复步骤
- **Agents是分工**：子任务交给专业代理并行处理


## Agent Skills 相关资源整理

| 资源说明                                        | 链接                                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill 聚合入口                                  | [https://skills.sh/](https://skills.sh/)                                                                                                                                                   |
| Skills 市场（中文界面）                         | [https://skillsmp.com/zh](https://skillsmp.com/zh)                                                                                                                                         |
| Agent Skills 官方标准站点                       | [https://agentskills.io](https://agentskills.io/)                                                                                                                                          |
| Anthropic 官方工程文章（Agent Skills 实战理念） | [https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) |
| VS Code Copilot Agent Skills 文档               | [https://code.visualstudio.com/docs/copilot/customization/agent-skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)                                             |
| Anthropic 官方 Skills GitHub 仓库               | [https://github.com/anthropics/skills](https://github.com/anthropics/skills)                                                                                                               |
| Claude 技能精选列表（Awesome 系列）             | [https://github.com/ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)                                                                                 |
| 软件开发自动化工作流 Skills 集合                | [https://github.com/obra/superpowers](https://github.com/obra/superpowers)                                                                                                                 |
| 自动生成 Skill 的 Skill（官方示例）             | [https://github.com/anthropics/skills/tree/main/skills/skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
