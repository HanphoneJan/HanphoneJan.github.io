---
name: codefun-processor
description: Use when pulling CodeFun2000 (codefun2000.com) Huawei exam problems and writing solution docs, especially recent AI / non-AI sessions
---
# CodeFun2000 Processor

## When to Use

- 需要从 CodeFun2000 拉取华为（或其它公司）机考题目，补 `code-training/docs/problems/codefun2000/`
- 需要确认最近某场考试有哪些题、题号、方向（AI / 非 AI）
- 需要区分「编程题」和「选择题」：**本仓库只收编程题，选择题不生成文档**

## Critical: use `/new-p/P####`, not `/p/P####`

同一个题号有两个页面：

| URL | 内容 |
|---|---|
| `https://codefun2000.com/p/P5518` | IDE 页面；未登录时 `problem_content` 为空，只显示「登录查看题面」 |
| `https://codefun2000.com/new-p/P5518` | 题目详情页；完整题面在 `div#content-ZhContent`，**访客可见** |

**不要用 `/p/` 判断题目是否公开。** 早期拉取失败就是因为走了 `/p/`，误以为题面必须登录。
`/new-p/` 的 `window.UiContextNew` 里也有 `pdoc.content` / `ZhContentHTML`，但直接解析
`div#content-ZhContent` 更简单。

## Bundled scripts

本 skill 自带两个脚本，**优先用它们**，不要每次手写解析：

| 脚本 | 用途 |
|---|---|
| `scripts/list-recent.js` | 按 `groups` 日期索引列出最近 N 天场次，自动跳过模拟赛/选择题；`pnpm codefun:recent` 是它的别名 |
| `scripts/extract-statement.py` | 拉 `/new-p/P####`，把 `div#content-ZhContent` 转成 Markdown（处理 KaTeX、表格、样例围栏） |

```bash
node .agents/skills/codefun-processor/scripts/list-recent.js --days 15
python3 .agents/skills/codefun-processor/scripts/extract-statement.py P5948 --out /tmp/P5948.md
```

## Step 1: Find recent sessions and PIDs

先跑仓库里的脚本，**不要凭记忆看比赛页**：

```bash
pnpm codefun:recent                  # 最近 15 天，跳过模拟赛
pnpm codefun:recent --days 30
pnpm codefun:recent --mock           # 连模拟赛一起列
```

脚本读 `https://codefun2000.com/new-p/P5950` 的题库分组 `groups`，按日期过滤，
并自动跳过 `title` 含「选择题」的条目。输出直接给出每个编程题的 `P####`。

手工兜底时：打开任意近期题目的 `/new-p/P####`，页面里的 `groups: [...]`
就是日期 + 方向 + pids；不要用 `/contest` 的模拟赛列表代替真实场次。

1. 打开任意一个近期题目的 `/new-p/P####` 页面（例如 `P5339`）。
2. 页面里的 `groups: [...]` 是题库分组，每组形如：

```json
{"nid":198,"title":"2026年10月28日-非AI方向",
 "items":[{"pid":"P5948","docId":5618,"title":"第1题-运输中转站计数",...}]}
```

3. 用正则或页面脚本取 `groups`，按 `title` 里的日期/方向筛选。`P5945` 这种
   `title: "选择题"` 的条目直接跳过。
4. 也可从 `/contest/<id>` 的 `pids` 取模拟赛题目，但**模拟赛不等于真实场次**；
   要「最近半个月真题」时优先用题库分组的日期。

## Step 2: Extract the official statement

先用自带脚本：

```bash
python3 .agents/skills/codefun-processor/scripts/extract-statement.py P5948 --out /tmp/P5948.md
```

它处理了 KaTeX 重复、`span.tail`、表格和样例围栏。只有脚本缺失或需要改输出格式时，
才手写解析 `/new-p/P####` 的 `div#content-ZhContent`。

`/new-p/P####` 的 `div#content-ZhContent` 是渲染后的 HTML，包含
题目内容 / 输入描述 / 输出描述 / 约束 / 样例。转换时注意：

- KaTeX 的 `span.katex` 里有 MathML + HTML 两份，直接 `text_content()` 会重复。
  取 `<annotation encoding="application/x-tex">` 的文本，替换成 `$...$`，并且
  **保留原 `span.tail`**，否则前后中文会丢。
- `h1/h2` 对应小节，`pre > code` 是样例围栏，`table` 是说明表。
- 官方样例常见格式是 `输入：` + 围栏，不是 `**输入：**`；写进仓库时统一成
  `**输入：**` / `**输出：**`，页面运行条才抽得到。

最小提取脚本（Python + lxml）：

```python
from lxml import html as LH
root = LH.fromstring(open(page, encoding="utf-8").read())
div = root.get_element_by_id("content-ZhContent")
for span in div.xpath('.//span[contains(@class,"katex")]'):
    ann = span.xpath('.//annotation[@encoding="application/x-tex"]')
    new = LH.fragment_fromstring(f'<span>${ann[0].text}$</span>')
    new.tail = span.tail
    span.getparent().replace(span, new)
```

## Step 3: Write the doc

- 路径：
  - AI 方向：`code-training/docs/problems/codefun2000/huawei-ai/P####.md`
  - 非 AI：`.../huawei-non-ai/P####.md`
- frontmatter：`platform: CodeFun2000`、`id: P####`、`url: https://codefun2000.com/p/P####`、
  `date_added`、`tags`、`patterns: []`。
- 首行场次：`> 场次：2026年10月28日-非AI方向 · 来源：[CodeFun2000 P####](...)`
- `## 题目描述 / ## 输入格式 / ## 输出格式` 用官方原文，约束放输入格式下。
- `## 示例` 用官方样例，统一 `**输入：**` / `**输出：**` 围栏；不要编造样例。
- `## 解题思路` 按 `code-training/AGENTS.md` 的原则 5/6：每种方法后紧跟代码，
  多版本并列，易错点 1–3 条真实可指认项。
- `## 完整代码实现` 必须能逐组跑过官方样例；类接口题（如 `FileLogger`、`Solution`）
  说明接口并保留可运行驱动。

## Step 4: Verify

```bash
# 每条官方样例逐字节对拍（脚本从 md 抽代码和样例）
pnpm check:docs
pnpm check:runbar P####       # 有可判定样例时
pnpm test:adapters            # 有轨迹的题，改过首块必须重录
pnpm quiz:gen && pnpm quiz:merge && pnpm quiz:validate
pnpm build
```

注意：`check:docs` 的「样例数」对 stdin/类接口题常显示 0，这是抽取器口径，
不等于样例不存在；以官方样例手工/脚本对拍为准。

## 选择题

本仓库不生成选择题文档（`P5945` 这类）。题库分组里见到 `title: "选择题"` 或
`tags` 含选择题，直接跳过，不要为它建 `.md`。
