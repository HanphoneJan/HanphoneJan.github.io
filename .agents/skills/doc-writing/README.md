# doc-writing

给一个代码库写/改项目文档的 skill。核心不是「润色」，是**一个 writer 先通读代码建立项目模型，再按范文写，最后机械 + 代码核对**。

## 什么时候用

- 给已有代码库写架构说明、设计文档、README、运维/踩坑记录。
- 重写一批旧文档，要求术语、架构、声音一致。
- 文档可以是一篇，也可以是一组；不要求一次写完。

## 怎么用

在支持 Agent Skills 的客户端里，把这个目录放到项目的 `.agents/skills/doc-writing/`（本仓库已经在那里），然后说：

```text
用 doc-writing 给 <项目路径> 写文档。先建项目模型，再出写作方案（写几篇、写哪几篇、框架、图），方案经我同意后再写。
```

或者直接读 `SKILL.md` 按流程走。

## 目录

```text
doc-writing/
├── SKILL.md                     # 入口：原则、流程、硬规则
├── references/
│   ├── project-model.md         # 项目模型模板与必答问题
│   ├── verification.md          # 机械核对 + 代码核对 + 统计口径
│   └── why-exemplars.md         # 为什么范文优先于规则
├── prompts/
│   ├── plan.md                  # 写作方案：写几篇、哪几篇、框架、图
│   ├── new-section.md           # 写新一节/一篇
│   ├── rewrite-section.md       # 改写已有文档
│   └── review.md                # 评审 + 事实核对
├── exemplars/
│   ├── 01-memory.md             # 内存管理（讲解）
│   ├── 02-hash.md               # 哈希表（讲解）
│   ├── 03-mysql-index.md        # MySQL 索引（机制与代价）
│   ├── 04-index-invalidation.md # 索引失效（排障）
│   └── 05-message-queue.md      # 消息队列（选型与运维）
└── scripts/
    └── check_rewrite.py         # 数字/代码/链接的机械核对
```

## 三条原则

1. 一个项目一个 writer：同一套术语、声音、架构理解。
2. 事实以代码为准；旧文档只是线索。
3. 风格靠范文，规则只留事实、长度、元话语。

写多少篇、写哪几篇、图导出 SVG 还是 PNG，都由 writer 判断；但**动手前必须先给方案并得到用户同意**。

## 范文来源

`exemplars/` 五篇节选自 [JavaGuide](https://github.com/Snailclimb/JavaGuide)（Apache-2.0），仅用于风格参考，文末附原文链接。换风格就换范文，提示词不用改。
