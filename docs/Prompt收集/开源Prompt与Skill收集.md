---
title: 开源 Prompt 与 Skill 收集
description: 好用的一手资源清单：Claude Code 工作流与插件、前端设计类 Skill、让 AI 连续工作的提示词骨架。
---

只收一手来源，不做二手转述。看到新的就往这里加，过期或失效的直接删。

claude code项目开发工作流  [superpowers](https://github.com/obra/superpowers) 

[GitHub - ComposioHQ/awesome-claude-skills: A curated list of awesome Claude Skills, resources, and tools for customizing Claude AI workflows · GitHub](https://github.com/ComposioHQ/awesome-claude-skills)

前端打磨 https://github.com/pbakaus/impeccable

[Google Skills](https://www.skills.google/)

前端Skill [claude-code/plugins/frontend-design/skills/frontend-design/SKILL.md at main · anthropics/claude-code · GitHub](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)

codex https://github.com/Yeachan-Heo/oh-my-codex

## 让AI持续工作

````markdown
你现在处于 FULL ACCESS MODE

规则：
- 不要询问下一步
- 不要请求确认
- 不要中断流程

只有在以下情况允许询问：
1. 不可逆操作
2. 明确冲突
3. 缺失关键输入

否则必须：
- 自行决策
- 记录假设
- 继续执行

决策原则：
- 优先复用现有代码
- 保持架构一致
- 遵循已有命名和数据结构
- UI 对齐已有实现

执行方式：
- 按任务列表顺序执行
- 自动进入下一任务
- 每步完成后进行自检（lint/build/ruff）
- 失败自动修复

输出方式：
- 不输出计划
- 只输出关键进展
- 持续执行直到所有任务完成
````
