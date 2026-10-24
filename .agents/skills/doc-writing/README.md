# doc-writing

给一个代码库写/改项目文档的 skill。核心不是「润色」，是**一个 writer 先通读代码建立项目模型，再按范文写，最后机械 + 代码核对**。

## 什么时候用

- 给已有代码库写架构说明、设计文档、README、运维/踩坑记录。
- 重写一批旧文档，要求术语、架构、声音一致。
- 文档可以是一篇，也可以是一组；不要求一次写完。

## 怎么用

在支持 Agent Skills 的客户端里，把这个目录放到 `.agents/skills/doc-writing/`（本仓库已经在那里），然后说：

```text
用 doc-writing 写 <项目名> 的文档。代码在 <项目仓库绝对路径>，只读。
文档写到本仓库 docs/项目/<项目名>/；先出方案，我同意后再写；要同步回项目仓库先问我。
```

## 写哪儿

文档写在本仓库（`docs/项目/<项目名>/`），不要写进被写文档的那个项目仓库。要同步过去，等用户明确同意后单独做。

或者直接读 `SKILL.md` 按流程走。

## 目录

```text
doc-writing/
├── SKILL.md                     # 入口：原则、流程、硬规则
├── references/
│   ├── project-model.md         # 项目模型模板与必答问题
│   ├── verification.md          # 机械核对 + 代码核对 + 统计口径
│   └── why-exemplars.md         # 为什么范文优先于规则（含 2026-10 复盘）
├── prompts/
│   ├── plan.md                  # 写作方案：写几篇、哪几篇、框架、图
│   ├── new-section.md           # 写新一节/一篇
│   ├── rewrite-section.md       # 改写已有文档
│   ├── de-ai-pass.md            # 去 AI 味：独立一遍减法
│   └── review.md                # 评审 + 事实核对
├── exemplars/
│   ├── reference/               # 参考手册体（项目文档默认读这组）
│   ├── reasoning/               # 机制与取舍（>20k star 外援）
│   └── tutorial/                # 教程体（只在写教程/面试向内容时读）
└── scripts/
    ├── check_rewrite.py         # 数字/代码/链接的机械核对
    └── check_voice.py           # 行文指标对照（只报告，不判定）
```

## 三条原则

1. 一个项目一个 writer：同一套术语、声音、架构理解。
2. 事实以代码为准；旧文档只是线索。
3. 风格靠范文，规则只留事实、长度、元话语。**范文按文体分组，先选文体再动笔。**

写多少篇、写哪几篇、图导出 SVG 还是 PNG，都由 writer 判断；但**动手前必须先给方案并得到用户同意**。

## 范文来源

三组范文对应三种文体，选错分组等于选错老师：

| 分组 | 来源 | 什么时候读 |
|---|---|---|
| `reference/` | 本仓库 `docs/项目/数据分析平台/`：日志系统架构、权限设计与权限矩阵（AI 生成，作者认可其文体） | 架构说明、设计文档、运维记录 |
| `reasoning/` | [Vonng/ddia](https://github.com/Vonng/ddia) 「人为错误」（23.9k star，CC BY 4.0）；[ruanyf/es6tutorial](https://github.com/ruanyf/es6tutorial) 「let」（21.4k star，CC BY-NC 4.0） | 需要讲机制、取舍、事实密度 |
| `tutorial/` | [JavaGuide](https://github.com/Snailclimb/JavaGuide) 五篇节选（Apache-2.0） | 教程、面试向内容 |

换风格就换范文组，提示词不用改。为什么这样分组、以及「范文对了声音仍然不对」的那次失败，见 `references/why-exemplars.md`。
