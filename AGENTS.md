# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Personal tech documentation site built with Docusaurus 3.9, deployed via GitHub Pages to `docs.hanphone.cn`. The site includes docs, a code-training sub-site (algorithm problem solutions), GitHub Stars showcase, and projects display. **There is no blog here — the real blog is the separate site `hanphone.cn`.** Don't reintroduce `blog/` or the blog preset options; see "博客已迁走" below.

## Commands

```bash
pnpm install          # Install dependencies (Node 24 + pnpm 11)
pnpm start            # Start dev server on port 3001
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
pnpm sync             # Sync notes from private repo (E:/hanphonejan/hanphone-note)
pnpm sync:ml          # Sync ML notebooks (ipynb -> md via Quarto)
```

> **环境版本必须对齐**：本地与 CI 均使用 **Node 24 + pnpm 11**（见 `.github/workflows/`）。改动 CI 或依赖时，确保两者一致，否则 `pnpm install --frozen-lockfile` 在 CI 上会失败。

## Architecture

### Content sources and data flow

- **Private notes sync** (`scripts/sync-notes.ts`): Reads markdown files from `E:/hanphonejan/hanphone-note`, publishes those with `publish: true` frontmatter to `docs/`. Files with `type: blog` are **skipped** — the blog lives on hanphone.cn. Auto-cleans files when `publish` is removed.
- **ML notebook sync** (`scripts/sync-machine-learning.ts`): Converts `.ipynb` files in `code-training/machine-learning/` to markdown via Quarto, outputs to `code-training/docs/machine-learning/`. 页面标题优先取源 notebook 的 `metadata.title`（可读中文标题），否则回退到文件名。
- **GitHub data** (`data/`): `github-stars.json`, `projects.json`, `star-tags.json` are auto-fetched/updated by GitHub Actions workflows and consumed at build time by the Stars and Projects pages via `@site/data/`.
- **LeetCode progress sync** (`scripts/sync-leetcode.js`): Pulls accepted LeetCode (leetcode.cn) submissions using the `LEETCODE_SESSION` cookie (stored as GitHub secret), diffs against local `code-training/leetcode/`, and generates new `*.py` + `docs/problems/leetcode/*.md` files. Runs every 2 days via `sync-leetcode.yml`; commits only when new problems exist. The script also **auto-refreshes the session cookie** (LeetCode returns a renewed `LEETCODE_SESSION` in `Set-Cookie` on every GraphQL call); the workflow writes it back to the `LEETCODE_SESSION` secret when a PAT (`SYNC_PAT` / `STARS_PAT`) is available.
- **NowCoder progress sync** (`scripts/sync-nowcoder.js`): Pulls accepted NowCoder submissions using `NOWCODER_COOKIE` + `NOWCODER_UID` secrets, diffs against local `code-training/nowcoder/`, and generates new code files + `docs/problems/nowcoder/*.md`. Runs every 2 days via `sync-nowcoder.yml`; commits only when new problems exist.
- **自测题库** (`static/quiz/bank.json`): 主动回忆题，加在题解正文末尾。`plugins/self-test/index.ts` 只把「哪些题解有题」的清单放进 globalData，`src/theme/DocItem/Layout/index.tsx`（已 swizzle）在正文末尾渲染 `<SelfTest>`，题目数据由组件在用户点开时 fetch。**题解 md 一行都不用改** —— 题库是唯一事实来源。详见「自测题库」小节。
- **间隔重复复习** (`/code-training/review`): `plugins/srs-cards/index.ts` 构建期把 182 篇题解解析成复习卡片（题号/难度/标签/首解日期），进度存浏览器 localStorage。调度器是 SM-2 lite 三档（忘了/记得/秒答）。
- **算法可视化** (`/code-training/visualizer`): `src/components/training/visualizer/` 下每个算法是一个 tracer，只负责「跑一遍并记录状态」，播放/暂停/单步/换输入全部由通用 `AlgoPlayer` 提供。
- **文档 permalink 映射** (`plugins/doc-permalinks/index.ts`): 全站 code-training 文档的「md 相对路径 → 真实 permalink」。自测、复习队列、可视化三处都用它跳转。

### Dual-plugin docs setup

The site uses two `@docusaurus/plugin-content-docs` instances:
1. **Default** (id: `default`) — main docs at `/docs`, sidebar from `sidebars.ts`
2. **Code-training** (id: `code-training`) — algorithm training at `/code-training`, sidebar from `code-training/sidebars.ts`

### 博客已迁走（别再加回来）

真正的博客站是 **hanphone.cn**，这个仓库不再有博客。已删除：`blog/`（5 个文件）、
classic preset 里的 `blog` 选项、导航栏「博客」项、`src/theme/BlogLayout/` 与
`src/theme/BlogPostPage/`、giscus 的 `blogCategory`/`blogCategoryId`。

旧 URL（`/blog/welcome` 等）**故意让它 404**，没加重定向 —— 用户明确选的。
`sync-notes.ts` 现在跳过 `type: blog` 的笔记，所以那些文章以后也不会被同步回来。

`@docusaurus/plugin-content-blog` 还留在 `dependencies` 里：preset-classic 依赖它，
即使不配 blog 选项也会被装上，删掉只会让 lockfile 动。

### Custom pages

- `src/pages/index.tsx` — Landing page
- `src/pages/stars/index.tsx` — GitHub Stars showcase with search, tag filter, sort, card/list views
- `src/pages/projects/index.tsx` — GitHub projects showcase with search, sort, card/list views
- `src/components/GiscusComments.tsx` — Giscus comment widget, used in swizzled theme components

### Swizzled theme components

- `src/theme/DocItem/Layout/` — Custom doc item layout (adds Giscus comments to docs)

### CI/CD (GitHub Actions)

- **deploy.yml**: Triggered on push to `main`. Fetches latest GitHub data (stars/projects, no commit), builds Docusaurus site and deploys to GitHub Pages.
- **refresh-data.yml**: Daily at 3am UTC. Fetches stars and projects via `scripts/fetch-stars.js` / `scripts/fetch-projects.js`, then rebuilds and redeploys. Data is used at build time only — **never committed to git**, keeping history clean. `data/*.json` are fallback snapshots for local development.
- **sync-leetcode.yml**: Every 2 days at 3am UTC + manual dispatch. Runs `scripts/sync-leetcode.js` with the `LEETCODE_SESSION` secret, auto-refreshes the cookie into the secret (needs `SYNC_PAT`/`STARS_PAT`), and commits new problems. **Only commits when `git status` has changes** — no-op sync produces no commit.
- **sync-nowcoder.yml**: Every 2 days at 3am UTC + manual dispatch. Runs `scripts/sync-nowcoder.js` with the `NOWCODER_COOKIE` and `NOWCODER_UID` secrets, and commits new problems. **Only commits when `git status` has changes** — no-op sync produces no commit.

### 字体：不用任何 Web Font

`src/css/fonts.css` 已删除（原本是 `@import` Google Fonts 的 Noto Sans SC）。
该域名在国内被墙，表现为首屏字体闪一下再回落（FOUT），外加每次访问一次失败请求。

现在 `--ifm-font-family-base` 是纯系统字体栈（`system-ui` + PingFang SC /
Microsoft YaHei / Noto Sans CJK SC），定义在 `src/css/custom.css` 顶部。
中文交给系统 CJK 字体渲染，零网络请求、零 FOUT。

**注意**：`docs/前端/前端基础.md` 里仍有 `fonts.googleapis` —— 那是教程正文里
教别人用 Google Fonts 的代码示例，不是站点配置，别删。

### Key config details

- `docusaurus.config.ts` uses `future.v4: true` (Docusaurus v4 future flags)
- Local search via `@easyops-cn/docusaurus-search-local` (indexes both `docs` and `code-training`)
- Mermaid diagrams enabled
- Giscus comments configured (repo: `HanphoneJan/HanphoneJan.github.io`)
- `trailingSlash: false` — generates `/path/index.html` for GitHub Pages compatibility
- Domain redirect JavaScript in `headTags` for `www.hanphone.top` → `hanphone.cn`

### Python environment

Minimal Python project (`pyproject.toml`, `uv.lock`) with numpy dependency. The `main.py` is a placeholder. Managed with `uv`.

## Development experience & known pitfalls

### Typecheck (`pnpm typecheck`)

- **`@types/react` / `@types/react-dom` 必须是 devDependencies 直接依赖**。若仅为传递依赖，pnpm 不会 hoist 到根 `node_modules/@types/`，导致 JSX namespace（`ElementChildrenAttribute`）无法解析，所有函数组件的 `children` 检查报错（TS2741）。报错现象：`Property 'children' is missing in type '{}'`。
- **React 19 移除了全局 `JSX` namespace**。组件返回值类型用 `React.ReactNode` / `React.ReactElement`，不要用 `JSX.Element`。
- **themeConfig 类型增强**：`src/types/giscus.d.ts` 通过 `declare module '@docusaurus/theme-common'` + `interface ThemeConfig` 增强。注意 **不能增强 type alias**（如 `@docusaurus/preset-classic` 的 `ThemeConfig` 是 `A & B & C` 类型别名，interface 无法与之合并，会导致增强后丢失 `colorMode` 等字段）。
- swizzled 组件（`src/theme/`）若 `import type {Props} from '@theme/...'` 解析失败，应在本地定义并导出 `Props`。

### CI/CD (GitHub Actions)

- **Node 版本必须与本地对齐**（当前 Node 24）。此前 CI 用 Node 20 导致 `pnpm install --frozen-lockfile` 失败。
- **不要用 `actions/setup-node` 或 `pnpm/action-setup` 的 `cache: 'pnpm'`**——在 pnpm 11 下缓存恢复失败。直接无缓存安装最可靠。
- **pnpm 11 的 build 脚本白名单**：`core-js`/`core-js-pure` 需在 `pnpm-workspace.yaml` 配置 `allowBuilds`（pnpm 11 不再读取 package.json 的 `pnpm.onlyBuiltDependencies`）。单项目也可用 `pnpm-workspace.yaml` 仅存该配置（省略 `packages` 字段即单根包）。

### ML notebooks (`code-training/machine-learning/`)

- 源 `.ipynb` 经 Quarto 转为 `code-training/docs/machine-learning/` 下的 md，**只改源 ipynb，不要直接改生成的 md**（sync 会覆盖）。
- 阅读体验规范：拆分单一代码块为「markdown 讲解 + 分段代码」结构，中文讲解、`#`/`##` 分层、数学公式；顶层 `metadata` 设 `title` 为可读中文标题。
- Quarto 未安装时无法本地跑 `pnpm sync:ml`，可用独立安装验证。

### LeetCode 同步 (`scripts/sync-leetcode.js`)

- 用途：平板/手机上用力扣 App 做题后，定时自动把新 AC 的题同步为 `code-training/leetcode/{id}.{slug}.py` + `docs/problems/leetcode/*.md`。
- **cookie 续期**：每次 GraphQL 调用，力扣都会在 `Set-Cookie` 返回新的 `LEETCODE_SESSION`。脚本末尾主动调用 `userStatus` 触发续期，把新 cookie 写到 `.lc-cookie.tmp`（已 gitignore），workflow 据此更新 secret。
- **标题匹配去重**：脚本先读本地 `.py` 文件头部 `# [N] 中文标题` 注释，与提交列表的中文标题比对，已存在的直接跳过，**不会**调 detail API（避免力扣频率限制）。
- **slug 差异**：力扣 API 的 `titleSlug`（如 `3sum-closest`）可能与插件生成的文件名 slug（`3-sum-closest`）不一致。文件名以标题匹配为准，新增文件用 API slug。
- **新题生成的 md 是「结构化占位」**：含题目描述/示例/代码，解题思路留待补充。处理已同步题目的题解时，遵循 `code-training/AGENTS.md` 的撰写规范。

### 自测题库（code-training）

题解末尾的「自测」区块用于**主动回忆**，题库是唯一事实来源。

```bash
pnpm quiz:gen       # 从「复杂度分析」表格自动生成候选题 -> bank.generated.json
pnpm quiz:merge     # 合并进 bank.json（自动题来自 generated，人工题保留）
pnpm quiz:validate  # 校验；有 error 退出非 0
```

- `static/quiz/bank.generated.json` 是 `quiz:gen` 的产物，**已 gitignore，不要手改**。
- `static/quiz/bank.json` 是正式题库，**要提交**。
- `quiz:validate` 会**交叉校验答案**：凡 `source` 指向某个小节的题，都去题解
  对应小节里字面核对答案文本，找不到就报错。**改动题解后必须重跑**。
- 出题规范（含干扰项设计、红线、常见错误）见
  `.agents/skills/quiz-bank-processor/SKILL.md`。

### ⚠️ 为什么不用 remark 插件注入 JSX 组件

试过，会被 MDX **静默丢弃**：手写进 mdast 的 `mdxjsEsm` 节点必须自带
`data.estree` 才会被编译成 import，否则整条语句消失，SSR 直接报
`Expected component SelfTest to be defined`。要补 estree 就得引 JS 解析器，
为了一个组件不值得。改在已 swizzle 的 `DocItem/Layout` 里渲染，
位置等价于「正文末尾」，且 126 篇 md 一行都不用改。

另外两条弯路也记录一下，避免重复踩：
- **不要用 JSX 属性传 JSON**：`mdxJsxAttributeValueExpression` 同样需要 `estree`，
  题目数据会被丢弃。
- **不要 `import` 整份题库**：几百道题会被打进每一个题解页面的 JS bundle。
  题库放 `static/`，运行时 fetch。

### 自测小节在右侧 TOC 里（别再用 remark 插件做这件事）

TOC 是**构建期**从 mdast 抽标题的，渲染在 `</DocItemContent>` 之后的组件
天然进不去。做法是 swizzle `DocItem/TOC/{Desktop,Mobile}`（各 20 行），
由 `DocItem/Layout` 通过 `selftest/toc.tsx` 的 Context 追加一条，
标题用**显式 id**（`SELF_TEST_ANCHOR`）而不是猜 slug。

**别再尝试用 remark 插件在正文末尾补一个 `## 标题` 节点**（那样 TOC 与锚点
本来都是白送的，方向更优雅）。实测 Docusaurus 3.9 下自定义 remark 插件
**根本没被调用** —— 模块顶层、工厂函数、transformer 三层的
`console.log` 一次都不打印；同时 230 个页面的 SSG 挂在 `useDocTOC`
（`toc` 读到 `undefined`）。两种 import 写法（本仓库其它插件用的
`path.join(__dirname, '...index.ts')`）都试过，一样。

### 间隔重复复习 (`/code-training/review`)

- **卡片数据**：`plugins/srs-cards/index.ts` 构建期用 gray-matter 解析
  `code-training/docs/problems/**/*.md`（182 篇），产出题号/难度/标签/首解日期。
- **进度**存在浏览器 localStorage（`srs.progress.v1`），**不进 git**。
  静态站没有后端，进度数据的价值在于「随手就能记一笔」；代价是清缓存/换设备会丢，
  所以导出/导入 JSON 是必需功能。
- **调度器** `src/components/training/srs/scheduler.ts` 是 SM-2 lite 三档
  （忘了/记得/秒答）。纯函数、无 DOM，时间用「天序号」而非 `Date`，
  避开时区与夏令时的跨天错乱。
- 题解里的难度有中英两套（`Easy/Medium/Hard` 与 `简单/中等/入门`），
  插件负责归一化成 1/2/3。

### 算法可视化 (`/code-training/visualizer`)

核心是 `src/components/training/visualizer/types.ts` 里的 tracer 契约：
**tracer 只产出「状态帧」，播放器负责全部交互**。新增算法 = 写 30~60 行
trace 函数，白送一整套播放/暂停/单步/回退/调速/换输入/源码高亮。

```bash
pnpm test:tracers   # 90 项断言：算法结果与参考实现逐一对拍
```

**这个单测不是可选项。** tracer 的 `run()` 有两类高危 bug：
状态记录错了（画面元素乱跳但不报错）、算法本身写错了（可视化会**掩盖**它）。
所以断言的是「最后一帧的数组 == 独立参考实现的输出」。

已经踩过的坑，别再犯：

- **`formatInput` 必须由 tracer 自己提供。** 播放器曾在内部用 `String(value)`
  兜底格式化，对象类型的 `defaultInput` 变成 `"[object Object]"`，解析必然失败、
  首屏 0 帧。现在契约里有 `formatInput`，且有断言保证
  `parseInput(formatInput(defaultInput))` 一定能解析回来。
- **滑动窗口的 `left` 约定必须与题解一致。** 题解用的是「left 指向被排除的
  重复字符、`ans = i - left`」。曾写成「left = prev + 1 却算 `i - left`」，
  混用两套约定导致 off-by-one，结果比正确答案少 1。断言
  「abcbbad = 3」抓住了它。
- **`frame.note` 是给读者看的文案，不是 markdown。** 写 `**强调**` 会原样显示星号。
- **网格类 tracer 找到答案后不要再补「不可达」的尾帧**，画面会自相矛盾。
- 帧数上限 1500（`MAX_FRAMES`），超限截断并插入提示帧。快排在 50 个元素上
  就可能几百帧，动画太慢也看不清。

### 浏览器内跑代码（Pyodide）

运行入口**长在每个代码块下方**（`src/components/training/pyrunner/SnippetBar.tsx`），
由 `@theme/CodeBlock/Layout` 这个官方 swizzle 接缝挂上去。没有页面末尾的运行区。

```bash
pnpm test:pyrunner   # 纯函数：可运行性判定、样例抽取、驱动代码生成（必跑）
pnpm test:pyodide    # 用真 Pyodide 跑执行协议；需要先 pnpm sync:pyodide
pnpm sync:pyodide    # 下载 12.9MB 运行时到 static/pyodide/
```

**为什么是这个 swizzle 接缝**（三条路都走过）：remark 插件把代码块换成自定义组件 ——
手写进 mdast 的 `mdxjsEsm` 不带 `data.estree` 会被 MDX 静默丢弃（见上面那节）；
客户端从 DOM 反解源码 —— Docusaurus 3.9 把代码拆成 `span.token-line`，拼不回源码；
`useCodeBlockContext()` 直接给 `metadata.code`（已剥掉高亮注释的干净源码）与
`metadata.language`，不碰 DOM、不碰 mdast。

**执行协议里有几处不显眼但一改就坏的地方：**

- **prelude 要登记 linecache**，否则 traceback 只有行号没有源码行（`File "snippet-1.py", line 4` 后面是空的）。linecache 的行必须**带换行符**，用 `match(/[^\n]*\n|[^\n]+/g)` 而不是 `split('\n')`。
- **每次运行用全新的 globals**（`globalsInit(asMain)` 返回一个 dict 字面量）。共用默认全局的话，上一轮定义的变量会漏进下一轮，判定结果毫无意义。
- **`__name__` 分两种**：样例/手动参数给 `__snippet__`（跳过题解里的 `if __name__ == "__main__"` 自测块）；stdin 模式给 `__main__`（牛客题的程序入口全在那个 if 里）。
- **prelude 必须把 `sys.stdin` 换成 StringIO**。Python 跑在主线程上，JS 定时器救不了它，读 stdin 卡住就是整个标签页卡死。
- **驱动以裸表达式收尾**（`__json__.dumps(...)`），靠 `runPythonAsync` 的返回值把结果带回 JS。不要改回 `print(MARKER + ...)` 再从 stdout 反解 —— `batched` 回调会切块。
- **样例参数要 `ast.literal_eval`**：cases 经 JSON 传来，元素是字符串，直接 splat 会让 `target - n` 抛 TypeError。
- **题面是 JavaScript 记法**：`null` 要翻成 `None`（`toPythonLiteral`），否则 `literal_eval` 直接 ValueError，树题全判失败。
- **树是层序格式**（`[3,9,20,null,null,15,7]`），不是力扣内部比对的递归 `[left,val,right]`；入参构造和返回值序列化都要按层序来。
- **stdin 是自己实现的类**，不是 `io.StringIO`：ACM 题解常写 `sys.stdin.buffer.read()`，而原生 StringIO 连属性都加不上。文本视图与字节视图**共用一个游标**（跟真实终端一致）。

**样例抽取的三个来源与两种语义**（`plugins/py-samples`）：
- 来源优先级 `## 示例` → `## 题目描述`（126 篇力扣里 32 篇的示例写在描述里，没有独立的示例小节）。
- 全角逗号 `，` 也是分隔符（`输入：s = "aa"，p = "a"`）；引号里的不算。
- `**输入：**` 后面跟围栏块时**不能**当成调用样例 —— 正则从「输」字匹配后剩下的是收尾的 `**`，不挡掉会造出 `{args:['**']}` 这种必然失败的垃圾样例。
- 力扣题的 `输出：[0,1]` 是**返回值**，按 JSON 比；从 stdin 推出的调用样例（牛客/ACM）期望的是 **stdout 文本**，要按 `textCompare` 用 str() 序列化 —— 函数返回 `"0"`、程序打印 `0`，按 JSON 比会误判。
- **切值必须带括号/引号感知**：`readValue` 早先用 `/[（(→。；;]/` 无脑截断，把 0301 的 `s = ")("` 砍成 `s = ")"`（未闭合字符串 → SyntaxError），0022 的 `输出：["((()))",...]` 砍成 `["`。半角括号是合法字面量字符，只有全角才是散文信号。
- **值可以跨行**（0200 的网格样例）：按行尾截断会留下没闭合的 `[`，`literal_eval` 直接报错。括号没配平时要接着往下读，最多 20 行，再把换行折成空格。
- **散文期望值要整段丢掉，不能截**（0095 的 `5 棵不同的 BST`）：截成 `5` 会造出一个必然失败的样例 —— `generateTrees(3)` 返回的是 5 棵树不是数字 5。靠 `isUsableExpected` 判定「能不能当字面量解析」来决定丢弃。

**「跑样例」与「自己输参数」是两个独立动作，不是一个按钮的两种状态。**
早期做成 samples/stdin/manual 三选一，结果抽到样例的页面**连输入框都没有** ——
读者看题解时最常做的事就是拿自己的例子试一下，不该被「已有样例」顶掉。
现在 `SnippetBar` 永远给一个输入框（预填第一组样例，读者改过就不再覆盖），
`▶ 跑样例（N）` 只负责验题解，`▶ 运行` 只负责跑读者填的东西。对应力扣的 Run/Submit。

自己填的内容**没有期望值**，此时不能判成败：`compare(actual, '')` 会因为
`Number('') === 0` 给出「数值不符：期望 0」。runner 里对空 expected 直接放行。
stdin 那个框用 `<textarea>`：HJ24 的样例是「一行 n，一行数组」，
`<input type="text">` 装不下换行，第一行的 `8` 会和第二行首尾粘成 `8186`。

**样例只在「调用的是这道题的入口」时才给**（`matchesDocEntry`）。
入口名是**整篇**的属性：一篇题解里常有几个「别的函数」，0300 的
`lengthOfLIS_with_path(nums)` 收同样的参数，返回的却是那条递增子序列本身
（`[2,3,7,101]`）而题面要的是长度 `4` —— 拿题面样例去调它必然全判失败，
读者看到的是「这篇题解写错了」。所以：
- 名字一致，或带一个**解法变体后缀**（`moveZeroes_brute` / `maxSlidingWindow_heap`）
  才算命中；换了要返回什么的后缀（`with_path`）不算。
- 入口名取自「完整代码实现」，但要**拿整篇其它块对照**：0148 那个块里第一个方法
  是辅助函数 `getListLength`，而「暴力解法」小节里写着顶层 `def sortList(head)` ——
  同一个名字在别处以顶层函数出现过，那就是入口（实测全语料只有 0148 命中）。
- 驱动里的实例化语句不能写死 `Solution()`：0297 的类叫 `Codec`。

**判定要贴着题面的约定，不能一刀切**（都在 `compare.ts` / `driver.ts`）：
| 情况 | 做法 |
|---|---|
| 题面写了「任意顺序」（0049/0347/0022） | 先按序比，失败再按多重集比 |
| 题面承认「答案不唯一」（0108 的示例里就写着另一棵树也算对） | 比**节点值集合**，不比形状 |
| 一边是序列化的树（0297 的 DFS 吐前序、题面是层序） | 前序/层序各解释一次，比重建出来的树。只在「一边是字符串」时启用 |
| 期望值是散文（`5 棵不同的 BST`） | 整组丢掉，不参与判定 |
| Pyodide 的 batched stdout 只在遇到换行时才吐出内容 | 每次执行收尾补一个 `write('\n')`（随后被 `trimEnd()` 去掉）。不补的话题解里 `sys.stdout.write(' '.join(...))` 这种不带换行的最后一行**页面上根本看不到** |
| ACM 样例 `7 2 1 10` 喂给 `def f(nums)` | `asCallArgument` 识别「空格分隔的一串数字」并还原成数组；照抄 `grid = [...]` 的先剥掉 `grid = ` |
| 函数返回 `None`（原地修改题：0283/0048/0073/0075/0114/0089） | 拿被改过的那个入参与期望值比；`0019` 那种哑节点删链表返回 None 就是「链表空了」 |
| 返回链表/树但结果是 `None` | 序列化成 `[]`（力扣题面写的是 `[]`） |

**已知限制**：没有超时保护。Python 死循环会卡死标签页（Pyodide 的
`setInterruptBuffer` 需要 COOP/COEP 头，GitHub Pages 不发）。要解决只能把运行时
挪进 Web Worker，加起来是一套独立架构，先记着。

**必须自托管，绝不能走 CDN。** Pyodide 默认 `cdnUrl` 指向
`cdn.jsdelivr.net`，国内访问慢且经常失败；更隐蔽的是
`loadPackagesFromImports` —— 它检测到 `import numpy` 会**自动去 CDN 装包**，
静默失败。所以这里绝不调 `loadPackagesFromImports`。

**loader 不能用 npm 的 import（实测过）**：
`import {loadPyodide} from 'pyodide'` 构建直接失败 ——
`UnhandledSchemeError: Reading from "node:fs" is not handled`
（还有 node:child_process / node:crypto / node:path / node:url / node:vm）。
因为 `pyodide.mjs` 是浏览器/Node 双用产物，内部写了 Node 专用分支，
webpack 打浏览器 bundle 时会连这些分支一起解析。**与体积无关。**
所以 loader 只能用 `webpackIgnore` 按 URL 加载。

**但 npm 仍然有用武之地**：`pyodide` 作为 devDependency 提供那 12.9MB
资源文件，版本被 pnpm-lock.yaml 锁死，`pnpm install` 时就装好，
`scripts/fetch-pyodide.js` 直接从 node_modules 拷，不再联网执行 `npm pack`。

| 约束 | 做法 |
|---|---|
| 12.9MB 不能预加载 | 运行条上只有一枚按钮，**点它才加载**，不做体积提示 |
| 同一页面内重复运行 | 运行时是模块级单例，解释器不重建 |
| 同一页面多个代码块 | **运行必须串行**：`setStdout` 是解释器级回调，并发会串台 |
| CodeMirror 几百 KB | `React.lazy` 在点「改代码」时才加载，不点的人零下载 |
| 跨页面复用 | 页面内 `fetch` 拦截 + Cache API |
| `static/pyodide/` 12.9MB | gitignore，`deploy.yml` 构建时下载 |

**端到端验证靠「逐页点按钮」的扫描脚本，不是靠肉眼看。**
`bars.mjs`（单页逐条跑）与 `sweep2.mjs`（全量 177 页）用无头 Chrome + CDP
点真实按钮，收集 `N / M 组通过`。两个坑：
- **每页的第一个块要给足冷启动时间**（Pyodide 首次加载可能 30s+）。
  早先按 28s 上限轮询，130 个「还在加载」被误记成「没有结果」，
  报告看起来像 143 个问题，实际只有 39 个。轮询要按按钮状态区分
  「加载中/运行中」与「跑完了」。
- 判定要挑**带样例按钮的条**（`[data-testid="run"]`），不是按条序号 ——
  序号会随页面里代码块数量变化。

**为什么缓存用 fetch 拦截而不是 Service Worker（两条路都走过）：**

先看实测的缓存头 —— GitHub Pages 对静态资源发的是
`cache-control: private, no-cache, no-store, max-age=0`，即**完全不缓存**。
不做这层缓存，12.9MB 每次冷启动都要重下一遍。

1. `plugin-pwa` 的 `swCustom` —— SW 的 webpack 构建要 babel-loader，
   而 pnpm 下它没被 hoist 到根 node_modules，构建直接失败。
2. 自己注册作用域 `/pyodide/` 的 SW —— **概念错误**：SW 只能拦截
   「它所控制的客户端」的请求，而 plugin-pwa 的 SW 已用作用域 `/` claim 了
   页面；作用域不包含页面 URL 的 SW 永远收不到 fetch 事件。

**样例抽取**（`plugins/py-samples`）：构建期从题解里抽 ```python 代码块 +
`Solution` 类的入口方法签名 + `## 示例` 的输入输出。178 篇有代码，
54 篇能抽到样例；其余的示例是散文/表格写法，**不硬猜**，UI 退化成手动填参数。
抽取的参数的顺序按函数签名对齐，参数个数与签名不符的样例会被丢弃
（顺序错了结果就没意义）。

期望值比较不能直接字符串相等 —— 题解里混着 `[0,1]` vs `json.dumps` 的
`[0, 1]`、力扣的浮点格式 `2.00000` vs Python 的 `2.0`。
所以按「结构化 JSON 比较 → 去引号比较 → 数值容差 → 字符串」的顺序逐级降级。

### 牛客同步 (`scripts/sync-nowcoder.js`)

- 用途：平板/手机上用牛客 App 做题后，定时自动把新通过（accept=true）的题同步为 `code-training/nowcoder/{分类}/{题号}.{标题}.{ext}` + `docs/problems/nowcoder/*.md`。
- **接口**：提交列表用 `POST /api/sparta/user/question-training/submission-history`（body `{pageNo,pageSize,userId}`，**公开接口，无需 cookie**）；提交代码抓 `GET /profile/{uid}/codeBookDetail?submissionId=`（HTML 第一个 `<pre>` 块，**需 cookie**）；题目难度/描述抓 `GET /practice/{uuid}`。
- **分类规则**：题号前缀 `HJ` → 华为机试、`SQL` → 牛客题霸-SQL篇、`ML` → 机器学习，否则按标题关键词判断。
- **标题匹配去重**：牛客题号会变动（如 HJ16↔HJ85），所以按**题目名**与本地文件比对（忽略空格/大小写），已存在的跳过，不重复生成。
- **所需 secrets**：`NOWCODER_COOKIE`（完整 cookie 串）、`NOWCODER_UID`（数字用户 ID）。
- **cookie 过期处理（牛客无自动续期）**：牛客没有力扣那样的服务器端滚动续期机制，认证 cookie 过期后必须手动重新登录更新。但提交列表接口是公开的，所以 cookie 失效时脚本**降级运行**：仍同步新题生成「代码待补充」占位文档，打印 `COOKIE_EXPIRED=true`。workflow 检测到该标记后以**失败**退出（不创建公开 issue），利用 GitHub 的 workflow 失败通知私密提醒仓库 owner 更新 secret——不会在公开仓库暴露任何信息。牛客「记住我」登录后 cookie 通常有效数个月，更新频率很低。
