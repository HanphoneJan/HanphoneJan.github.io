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
- **算法可视化（题解内嵌，录制式）**: `pnpm trace:record` 用 Pyodide 的 `sys.settrace` 跑题解里那份**已经通过样例**的代码，把逐行局部变量 + 递归深度落成 `static/traces/*.json`（进 git）；`plugins/vis-traces` 在构建期把轨迹过一遍八个 adapter（`visualizer/adapters/`：list/tree/stack/grid/array-scan/aux-table/string/dp-counter）转成帧，只把「哪篇有可视化 + 帧数 + 源码」这份清单发进 globalData；题解页由已 swizzle 的 `DocItem/Layout` 渲染 `visualizer/InlineVisualizer.tsx`（折叠壳 + `React.lazy`），展开时才 fetch 轨迹并在浏览器里跑 adapter 出帧。**md 一行都不用改。** 182 篇题解里 170 篇录制成功、166 篇有可视化（录制产物的 98%），剩下 4 篇在页面上显式写「本题无可视化步骤」。详见「算法可视化」小节。
- **算法可视化（独立页，手写）** (`/code-training/visualizer`): `src/components/training/visualizer/` 下每个算法是一个 tracer，只负责「跑一遍并记录状态」，播放/暂停/单步/换输入全部由通用 `AlgoPlayer` 提供。
- **文档 permalink 映射** (`plugins/doc-permalinks/index.ts`): 全站 code-training 文档的「md 相对路径 → 真实 permalink」。自测、复习队列、手写 tracer 三处都用它跳转（录制式可视化不跳转，它就长在那篇题解里）。

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

### 算法可视化（两条路，别混）

可视化有两套实现，**互不替代**：

| | 录制式（题解内嵌） | 手写 tracer（独立页） |
|---|---|---|
| 入口 | `code-training/docs/problems/**/*.md` | `/code-training/visualizer` |
| 代码 | `visualizer/recorder/` + `visualizer/adapters/` | `visualizer/tracers/` |
| 覆盖 | 每道能录制的题（**170/182 录制成功，166 篇适配 = 91%**） | 10 个算法模式 |
| 产出 | 逐题，零手写 | 每个算法手写 30~60 行 |
| 视图 | 数组/链表/树/网格/栈/DP/字符/字典八种 | 数组 / 网格 BFS / DP 表格 |
| 单测 | `pnpm test:adapters`（2293 项） | `pnpm test:tracers`（90 项） |

**为什么要有录制这条路**：手写 tracer 覆盖不了 126 篇题解，而且手写的帧
**会骗人** —— 算法写错了动画照样流畅跑完，读者反而更确信自己错了。
录制直接跑题解里那份已经通过样例的代码，帧来自真实执行，不可能骗人。

```bash
pnpm trace:record          # 构建期跑 Pyodide 采执行轨迹 -> static/traces/*.json
pnpm trace:record 0001 0034  # 只录这几篇
pnpm test:adapters         # 2293 项断言，跑在真实录制产物上
pnpm trace:probe           # 逐题报告哪个 adapter 认出来了（补覆盖率用）
node scripts/check-vis.js  # 无头 Chrome 点真实按钮，十类视图各验一题
```

`trace:record` 需要先 `pnpm sync:pyodide`（12.9MB，已 gitignore）；
没下运行时脚本会打印提示后以 0 退出，**不影响 `pnpm build`**。

#### 八个 adapter 与它们的顺序

顺序判据不是「特异性从高到低」，而是**「谁的画面才是这题的教学内容，谁先上」**。
这两件事不一样，混起来会犯两种相反的错：

- **更严的未必该先**：`aux-table` 的判据是「有字典」、`string` 是「有字符串」，
  都很宽。但 0003 无重复子串、0076 最小覆盖子串、0001 两数之和里也有
  `cnt_s` / `hash_dict`，auxTable 一旦排在前面就会把它们全抢走 ——
  画面上「两根指针夹出的窗口」变成了一行字典，而这题的全部教学内容
  恰恰是那个窗口。
- **更宽的确实该后**：`stack` 与 `string` 画面几乎一样，但 stack 要求
  「有个列表的长度在变」。0020 有效括号被 string 先认走时会把 `stack`
  当成普通的「结果累加器」，而 stack 会把栈顶标成 active。

所以顺序是：**结构 > 形状 > 指针 > 辅助 > 兜底**。

| adapter | 覆盖 | 判据 |
|---|---|---|
| `list` | 14 | 局部变量里有 `{"$":"list"}` 标记 |
| `tree` | 15 | 有 `{"$":"tree"}` 标记，或有递归深度 |
| `stack` | 12 | 某个列表的**长度会变**（栈自己长大） |
| `grid` | 21 | 二维数组 + 形状只增不减 + 被下标读过（另可带一行「累加结果」aux） |
| `array-scan` | 58 | 一维序列 + 一到三根会动的下标 |
| `aux-table` | 9 | 字典/集合（键渲染成 aux 行；没有入参数组时键就是主画面） |
| `string` | 14 | 有被逐字符消费的字符串 + 字符值光标（0208 前缀树也走这条） |
| `dp-counter` | 23 | 一维序列 + 滚动标量 / 合成格子条 / 逐位消费 |

**最容易搞反的一处是 `dp-counter` 必须排在 `array-scan` 后面。**
dpCounter 的判据比 arrayScan **宽**（它不要求指针是数组下标），所以一旦排在
前面就会把双指针题全抢走 —— 实测 0011 盛水容器、0015 三数之和、0016、0034 二分
全被判成 dp-counter，画面上两根指针的「区间收缩」不见了，只剩几个计数器，
恰好把这类题最该讲的东西丢了。放在后面就对了：arrayScan 先拿走所有
「有指针」的题，dpCounter 只接手 arrayScan 拒掉的（0198 打家劫舍、
0070 爬楼梯、0152、0309、0338、0494、0621、0279、HJ150、0007）。

`grid` 排 `array-scan` 前面也有讲究：网格题里常有另一个一维数组（0073 的
`positions`），排前面能保证网格题一定走网格视图。

#### 录制管线的形状

`sys.settrace` 在 Pyodide 里装一个 line 事件的采集器，把「第几行 +
局部变量快照 + 递归深度」记下来落成 `static/traces/<题解文件名>.json`。
**不采 call/return 的 locals**：`line` 事件的 `f_locals` 是「即将执行这一行」
的时刻，正好对应一帧；`call` 会给每个辅助函数和递归都产生一条，纯噪音。
但 **call/return 要用来数递归深度**（见下）。

录制是**通用**的（跟算法无关），翻译成画面才需要分类，所以分两层：
录制一次，所有 adapter 复用同一份轨迹。改 adapter 不用重录。

录制阶段的自检很硬：**跑出来的结果必须与题面样例一致**，否则整份轨迹丢弃
（`result-mismatch`）。可视化是拿来帮助理解的，拿一份跑不出正确答案的代码
演示等于教错。

#### 录制阶段踩过的坑（每一条都对应一批题）

- **挑样例与取期望必须是同一个动作。** 早先 `pickArgs` 只返回 `args`，
  而期望值取的是 `usableSamples(samples)[0]` —— **另一条样例**。
  于是 22 篇 `result-mismatch` 里有 18 篇是拿 A 的输入对 B 的答案：
  0005 录的是 `"cbbd"` 却拿 `"babad"` 的 `"bab"` 去比、0013 录的是
  `"MCMXCIV"`（实录 1994）却拿 `"III"` 的 3 去比。
- **「跑通且结果对」还不够，还得有过程 —— 样例要走不进主循环就换下一组。**
  0416 分割等和子集是唯一的实例，失败方式极其隐蔽：题面第一组样例
  `nums = [1,2,3,5]` 总和是 **11（奇数）**，代码第三行
  `if total % 2 != 0: return False` 就返回了 —— 轨迹 3 个事件，
  judge 也判「结果一致」（确实是 False），两道关卡全过，**录制成功了**，
  可这段轨迹里一行循环都没有。换成第二组样例（`[1,5,11,5]`，28 个事件）
  立刻变成记忆化搜索的完整过程。
  所以 `pickSamples` 返回**全部**候选（每个入口最多试 3 组），
  取事件最多的那一份；一旦某份事件数 ≥12 就停，绝大多数题行为与从前一致。
- **`json.dumps` 产的不是合法 JSON。** Python 默认 `allow_nan=True`，
  把无穷写成裸的 `Infinity` / `NaN`，`JSON.parse` 直接报
  `SyntaxError: No number after minus sign at position 142` ——
  报错完全指不到真正的原因（0016/0152/0309/0581 用 `inf` 当哨兵初值）。
  录制结果出来要用 `sanitizeJson` 把它们换成 `null`。
- **链表/树题必须把数组还原成平台对象。** `l1 = [2,4,3]` 原样传进去，
  代码第一句 `l1.val` 就是 `AttributeError: 'list' object has no attribute
  'val'`，一次性 13 篇全挂。还原逻辑**从 `pyrunner/driver.ts` 整块复用**
  （`BUILDER_PY`）—— 入参约定很细（层序 vs `[l,v,r]`、random 指针写下标、
  0236 的 p/q 给的是节点值），抄第二份必然漂移。
- **入口要「试到跑对为止」，不能一次选定。** HJ18 的代码有
  `valid_ip` / `valid_mask` / `classify` / `solve` 四个顶层函数，
  按「取第一个 def」就取到 `valid_ip`，而它要一个字符串、样例给的是 stdin。
  45 篇 `no-entry` 里 42 篇是牛客题，全是这个问题。
  `recorder/entries.ts` 按「文档入口 → solve/main → 其余顶层 def →
  Solution 其它方法」排候选，挨个试，判据是**结果与样例一致**（不是「不报错」——
  `valid_ip("1.2.3.4")` 也能跑通，但它不是题目的解法）。
- **ACM 题必须跑成程序，不是调函数。** `solve()` 自己读 `sys.stdin`，
  而且答案在 `stdout`。`sys.stdin` 要换成 `pyrunner` 那个 `__Stdin__`
  垫片而不是 `io.StringIO` —— 后者没有 `.buffer` 属性，
  而 9 篇牛客题写的是 `sys.stdin.buffer.read()`。
- **原地修改类题目返回 None。** 0075 排序颜色、0189 轮转数组、0283 移动零，
  题面的「输出」说的是改完之后的入参。拿返回值比永远是 `null`，
  会被误判成「代码跑不对」。
- **比较要复用 `pyrunner/compare.ts`。** 0108 的示例里写着
  「`[0,-10,5,null,-3,null,9]` 也将被视为正确答案」、0347 题面写着
  「可以按任意顺序返回」——这两个标记 py-samples 已经按题面文本算好挂在
  每条样例上。自己从期望值文本正则是不行的，那句话不在期望值里。
- **Python 代码里的 Markdown 反引号会截断 JS 模板字符串。**
  `TRACER_PY` 是模板字面量，注释里写 `` `[1,2,3]` `` 会让字符串提前结束，
  而 TS 报的是「Type 'String' has no call signatures at line 58」——
  完全指不到真正那行。模板字符串里一律用单引号。
- **`id()` 的比较要用 `==` 不是 `is`。** 判「这个对象是不是本帧的根节点」
  时 `is` 只在 CPython 恰好 intern 掉同值小整数时才成立；0002 的 `l1`
  拿到的 id 是个大整数，整条链表就录成了满屏的 `{"$":"n","i":0}`，
  adapter 一个可画的值都拿不到。

#### 角色识别是最容易出错的地方（`visualizer/adapters/roles.ts`）

「哪个变量是数组、哪个是指针」判错**不会报错**，只会画出一个看起来正常、
实则在误导读者的动画。这类 bug 踩了一堆，`pnpm test:adapters`
的断言就是为了把它们钉死。已经踩过的：

- **取值落在数组下标范围内 ≠ 是指针。** 0011 盛水容器的 `max_area` 取过
  0/8/49，其中 8 恰好落在长度 9 里；0053 最大子数组和的 `max_sum` 比例
  高到 0.88。累加器会以 `count += 1` 移动，`±1` 这条判据被骗到。
  真正的判据是「源码里从不被用作下标」。
- **也不能太严。** 二分的 `left`/`right` 从不写成 `nums[left]`，
  判据太严会把它们全误杀（0034/0035 一度只剩 mid）。
  所以分两轮：前面只负责**提名**（取值形状 + 源码证据 + 命名，宁可多提），
  最后一关 `isLinkedToArray` 负责**否决**。
- **指针必须能索引到画出来的那个数组。** 0079 单词搜索里 `i`/`j` 是
  board 的行列、`k` 才是 word 的下标，而 board 录成嵌套 list 被排除，
  主数组选中了 word。偏偏 board 是 3×3、word 长 3，`i`/`j` 的取值全在
  word 的下标范围内，**范围检查过得去、画面上有指针还会动、没有一项
  断言会失败** —— 但它画的是「board 的第几行」标在 word 的格子上。
- **数组名正则前面要加 `\b`。** `s[...]` 不加边界会匹配到 `rows[index]`
  的尾巴，0006 因此被误判成「index 在给 s 下标」。
- **`enumerate` 必须连 iterate 部分一起匹配。** 只匹配 `for x,` 会把
  0079 的 `for x, y in (i, j-1), ...`（四方向邻居）当成数组下标。
- **主数组优先选入参。** 0300 里 nums 与 dp 都被 i/j 下标，光看下标关系
  分不出高下，但题面描述的是 nums，dp 是中间产物。
- **0647 反过来：指针在带哨兵的 `t` 上算**，硬套到入参 `s`（3 格）上会让
  62% 的帧指针越界。指针能索引到哪个数组就画哪个数组。
- **哨兵填充的数组直接放弃。** `nums = [1] + nums + [1]`（0312）、
  `heights = [0] + heights + [0]`（0084）会让画面比题面多两格、
  末尾永远没有高亮。宁可整题不画。
- **`"<function>"` / `"<deque>"` 这类摘要串不是序列。** 0079 一度把 `dfs`
  这个函数当成主数组（`"<function>"` 有 11 个字符）。
- **取值范围是 `[-1, len]` 而不是 `[0, len)`。** 上界含 len 是因为左闭右开
  二分的 `right` 初值就是 len（写死 `< n` 会把 0034 的 right 误杀）；
  下界含 -1 是因为它就是 Python 约定的「没找到」哨兵（0076 的 `ans_left`、
  0322 的 dfs 里的 `i - 1`）。
- **多字符字符串数组也能当主数组。** 0014 最长公共前缀的入参是
  `strs = ["flower","flow","flight"]`，按单字符判据会被拒掉，
  而它恰恰有指针（`i` 逐字符下标 `strs[0]`），是很好的素材。
- **`OVERRIDES` 覆盖表被断言护栏包着。** 覆盖表是手写的，题解改个变量名
  就会指向不存在的变量。`test:adapters` 逐条核对覆盖表里的每个名字都真的
  出现在该题轨迹里，题解一改就报错，不会悄悄画错。

#### 断言必须按 adapter 分派（否则尺子会逼你把代码改成错的）

`test:adapters` 早先只有一套「数组帧」的断言（首帧有内容、每帧数组一致、
`states` 与数组等长）。加上链表/树/网格/栈/DP 之后这套断言大面积报错，
但**报错的是尺子不是代码**：

- 链表题的数组**本来每帧都在变**（0021 合并两链表就是原地改），
  「每帧数组一致」是错的
- 树帧的 `states` 用的是**层序坐标**，而录制时给越界节点编的号是
  「锚点链坐标 + 追加」，可能超过 `tree.cells` 的物理长度，
  所以不能断言 `states.length === cells.length`
- 首帧是「入参」那一帧，**故意**没有 aux / 没有光标 / 没有 counters
  —— 断言「每帧都挂了栈」「每帧都有指针标签」是错的
- 双指针不变式（「两个指针之间必须标成 active」）只能对**真的**双指针题
  要求，判据是源码里 `while a < b` 的两侧**都是已认出的指针**。
  只看 `while a < b` 这个正则会误判：`while i < n`（0394 解码字符串）
  形式上一样匹配。0207 课程表则是 DFS 染色，两根指针都在范围内也都会动，
  但拿双指针的尺子去量它是量错了东西

#### 字符串 / 字典 / 合成格子条：这三类的坑位

新增 `string` / `aux-table` 两个 adapter 时踩的坑，每一条都对应一批题。
它们共同的根因是：**局部变量不是「一帧一幅完整的画面」**。

- **`sys.settrace` 记的是「这一行所属那个栈帧的局部变量」。**
  字符串题的数据因此天然分散在好几个栈帧里。HJ29 字符串加解密的
  `''.join(encrypt(c) for c in plain)`：`plain` 在 solve 的帧上、
  当前字符 `ch` 在 encrypt 的帧上、推导式 `.0` 又有自己的帧 ——
  **三者从不出现在同一帧里**。按「本帧有没有这个变量」取值的话，
  带 `plain` 的帧没有 `ch`（光标恒 undefined），带 `ch` 的帧没有 `plain`
  （整帧被跳过），60 多个事件最后只剩 3 帧静止画面。
  正确做法是**把各帧的局部变量合并成一个持续存在的环境**，每一帧读合并后的值。
- **`str(v)` 兜底产出的摘要串不是数据。** `<str_ascii_iterator>`、
  `<function>`、`<deque>`，推导式内部的 `.0` / `.1` 也是。
  不挡掉的话 HJ29 的主串会被选中成 `<str_ascii_iterator>`（20 字符
  比 `plain` 的 8 字符还长，而主串正是按「出现帧数 × 长度」打分的），
  画面上是一排英文字母。
- **stdin 题的第一帧局部变量是空的。** `solve()` 第一行还没执行
  `s = sys.stdin.readline()`。主串只扫第一帧的话，
  HJ21/HJ31/HJ90/KY4 一篇都找不到主串 —— 必须扫**全部**帧。
- **光标按字符值反查会撞上巧合。** HJ21 简单密码 `for ch in pwd` 的光标是
  主串第 5 个字符，而 aux 行 `res` 里恰好也有一格是 `'z'`。
  先查 aux 就会把光标标到「输出里那个 z」上。所以顺序是
  **单字符先查主串，查不到才退 aux**（HJ90 的 `part` 是 `"10"/"137"`，
  主串里根本没有这种多字符片段，那时才轮到 aux）。
- **字典的键没有插入顺序信息。** 「这一帧新加了哪个键」只能靠
  **相邻两帧的键集合求差**，那是唯一可靠的「刚刚发生了什么」。
- **集合（`set()`）不能标 active。** 录成 `{}` 且键恒定，
  分不清「刚加的」与「早就有的」—— 指着一个早就存在的键说「刚加的」比不标更糟。
- **合成格子条上光标必须走一段连续整数。** 0198 打家劫舍的代码是
  `for num in nums:`，没有下标变量，只有元素值 `num`（取值 2,7,9,3,1，
  全落在 [0,5)）。只按「取值在范围内」挑，会把 `num=2` 标在**第 2 格**
  （那一格是 9）—— 纯属巧合的高亮。真正的下标逐格走完，
  「distinct 个值恰好铺满 [min,max]」把两类分得干干净净。
- **名字像 DP 状态的一律不当光标。** 0070 爬楼梯踩过：`f1` 取过 1 和 2 而
  格子条正好 3 格，于是 `f1` 被当成推进下标，结果它被排除出状态量
  （那才是这题的主角），画面上只剩一个没有意义的「f1 指向第 1 格」。
- **`for x in <列表>:` 没有下标变量时，光标位置数迭代次数。**
  0152 乘积最大子数组、0169 多数元素、0128 最长连续序列写的都是
  `for x in nums:` —— 循环变量是**元素值**，`cursorVar` 找不到，
  于是整题画面一格都不标（0152 只有 3 帧、只有计数器在跳）。
  而「现在算到第几个、滚动标量是多少」恰恰是这几题的全部教学内容。
  办法：拿源码里那条 `for` 的行号，**数它在轨迹里出现了几次**
  （`line` 事件是「即将执行这一行」，所以每出现一次就是新的一轮）。
  三条判据缺一不可：已经有主画面、`cursorVar` 还没找到、
  循环目标确实是录到了的列表（不是 `range(...)`）。
- **越界过一次就整个否掉。** 0279 的 `for j in range(i*i, n+1, j)` 里
  j 会取到 n，而格子条只有 0..n-1。只丢掉越界的那几帧的话，
  前 8 帧指针全落在格子条外面 —— 要么空指针要么满屏高亮。
- **「签名变了」不等于「有过程」。** HJ33 的 `num` 恰好被状态量正则
  `n\w*` 命中，它**第一次出现**就让签名变了，于是判成「有过程」，
  画出来是三帧完全一样的画面。判据必须是「光标到过 ≥2 个位置 /
  aux 内容变过 / 某个状态量**改过值**」，第一次出现不算「改」。
- **光标指到哪张表，哪张表就是主画面。** 0494 目标和的 `nums`（输入，5 格
  从头到尾不变）与 `f`（背包表，每帧被改）：按「入参优先」挑会选中 `nums`，
  画面是一排不动的 1。而源码里 `f[c] += f[c-x]` 说明光标 `c` 在 `f` 上，
  主画面就该是 `f` —— 看到 c 从 m 一路退到 x，「内层为什么必须倒序」
  这条规则自己就显出来了。
- **「在长大」的数组要补空格而不是缩画面。** 0338 的 `bits` 一开始只有
  一格。早先 `raw.length !== n` 就跳过该帧，丢掉的恰好是「表刚开始被填」
  的那几帧。固定长度 + 空格子（`idle` = 还没算到）才对。
- **每一行源码都产生一个事件帧，动画会卡住。** 0007 整数反转 21 个事件
  只对应 4 张不同的画面。按「画面签名」（数组内容 + 光标 + 状态量）去重，
  留每段静止期的第一帧。
- **`bytes` / `bytearray` 必须解码成字符串。** ACM 题常写
  `sys.stdin.buffer.read()`，录出来是 `"<bytes>"`，画面上什么也画不出来
  —— HJ81 字符串字符匹配的两个入参**全是** bytes，整题因此无从下手。

#### 期望值是散文时，别在抽取那层就丢掉

`usableSamples` 只留「期望值能当字面量判」的样例，于是期望值写成散文的
两篇整组丢掉：0095 唯一二叉搜索树（`5 棵不同的 BST`）、
0142 环形链表 II（`指数为 1 的节点`）。而 `judge` 对散文**本来就放行**
（「判不了就放行」），也就是说这层保护在录制路径上并没有对应的兜底 ——
抽了就一定放行，不抽就一定没机会。

所以 `pickSamples` 的兜底分支允许散文期望值，但加了条件：
**实参必须是真字面量**（`toPythonLiteral` 能 parse）。
散文实参（`（空）`、`` 用例 1 ``）不放行 —— 否则会由胡编的输入跑出一份
轨迹，而 judge 又不会拦它，那份轨迹看起来还挺正常。

#### 「题目入口」挑错的两种形态

题解里「主入口 + 辅助函数」并存，而挑入口的启发式只看位置/名字，
于是挑到辅助函数上。三个修法按代价从小到大：

**1. 下划线开头的是私有辅助函数。** shoppee 合并降序链表写的是
`MergeList(l1, l2)` 与 `_reverse(head)`，`_reverse` 排在最后，
于是成了入口：录制报 `missing 1 required positional argument`，
页面上「跑样例」也是同一个错（两边共用同一份判据）。
`snippet.ts` 的 `pickEntry` 与 py-samples 的 `pickPublicEntry` 都要滤掉
单下划线开头的方法 —— **两边必须同步**，否则构建期抽的样例
与运行期调用的入口会对不上。

**2. 文件名就是题面入口名的提示。** `analyzeSnippet` 在类里挑
「第一个带 self 的方法」，而 0148 排序链表是
`getListLength` / `splitList` / `mergeTwoLists` / `sortList` ——
挑中 `getListLength`，题面要的是 `sortList` 的返回值。
把文件名去编号后的 snake_case 转成 camelCase（`0148_sort_list` -> `sortList`）
当提示传进去，对得上就排第一。其它命名（HJ17、牛客题）转出来对不上，
不匹配就当没给。

**3. 返回值是节点、题面期望的是节点的值时，按值比。**
0236 二叉树最近公共祖先返回 TreeNode，编码成层序是
`[3,5,1,6,2,0,8,null,null,7,4]`（以最近公共祖先为根的那棵子树），
题面要的是 `3`。judge 里加一条：期望是标量 + 实录是数组 + 首元素正好
是这个标量，三条同时成立才认。

#### 环形链表：`head = [...], pos = 1`

0141 环形链表的题面样例是 `输入：head = [3,2,0,-4], pos = 1`，
意思是「把尾部接到第 pos 个节点上」。入口只收 `head`，`pos` 是给评测驱动用的
元信息，但它**不是可有可无的**：不接环的话 `hasCycle` 返回 False，
与题面期望的 True 判不上 → `result-mismatch`，整篇录不出来。

两边都要动：

- `driver.ts` 的 `__mk_list__(values, pos=None)`：建完链把尾接到第 pos 个节点。
  `pos` 默认 None，**页面上「跑样例」那条路一个字都不用改**（它不传）。
- 录制器：把 `pos` 也当成一个形参去抽（键数就对上了，`py-samples` 的
  「键比形参多就不抽」守卫也就不再触发），抽完**丢掉**这个实参 ——
  它不是入口的参数，是建链表时要用的。只对「第一个形参是链表」的入口这么做。

录出来是 `list` 视图：`[3, 2, 0, -4]` 四个格子，`slow` / `fast` 两根指针，
`fast` 走到末尾后回到下标 1 —— Floyd 快慢指针在环上相遇的过程。

0142（环形链表 II）还是录不了，卡在另一处：它的期望值是散文
「指数为 1 的节点」，而返回的是**节点**（序列化成从交点开始的那条链），
两者没法直接比。

#### 实例上的容器也要录（`self.<attr>`）

采集器一直跳过 `self` —— 「局部变量」嘛，`self` 不是变量。**但有一批题的数据
全在实例属性上**，跳过的结果整题只剩几个标量参数：

- 0399 口袋算式：带权并查集在 `uf.parent` / `uf.weight` 两个数组里，
  路径压缩时它们一格一格改。不摊平的话录到的只有 `equations`、`n`、`x`、`y`。
- 0146 LRU：`self.key_to_node` 的键就是「缓存里现在有哪几个 key」。
- shoppee 那几题：`self.memo` 之类的记忆化表。

摊平的对象**分两种口径**，这个区分是必需的：

- **脚本模式（class-API 设计题）**：全都要，标量也记 ——
  `self.capacity` 是 LRU 淘汰的判据。
- **普通模式**：只要**容器**（list / dict / set）。标量属性（计数、容量、开关）
  在普通题里到处都是，记进来会让 adapter 的选型整体漂移；
  而 `Solution` 的方法大多无状态，真正带实例容器的题不多。

顺带修掉 grid 的一个误判：**二维数组不等于网格题**。0399 的 `equations` 是
`[["a","b"],["b","c"]]`，形状不变内容不变也没有光标，画出来是 38 帧都不变的
字母表。现在 grid 要求「格子变过 **或** 有光标」——
只满足后者的是 0221 最大正方形（`matrix` 只读，真正在变的是滚动数组 `dp`，
但光标沿着矩阵走，「算的是哪一格」正是这题要讲的）与 0207 课程表。

再加第三种：0056 合并区间、0406 按身高重建队列的输入网格**排完序就静止了**
（`intervals.sort()` 之后一个格子都不再变），真正在动的是 `merged` / `ans` ——
而它是**参差**的列表（每项两个数、行长还不一样），塞不进网格。
所以 `GridFrame` 也带 `aux` 行，画面上多一行「累加结果」：
`merged` 从 `[1,3]` 长成 `[1,6]`、`[1,6],[8,10]`、`[15,18]` ——
题解教的就是 `merged.append(curr)` 这一步，不显示它等于没显示。
判据四条：不是网格自己、元素都是同样长度的小列表、**长度在变**、
且只出现一个候选（有两个都在长的就当没给）。
aux 还要参与帧去重的键，否则「网格没动」的那些帧会被判重复全跳过。

#### `\Z` 在 JavaScript 里不是「字符串结尾」

`recorder/entries.ts` 的 `solutionMethods` 用了
`/^class\s+(\w+)[^\n]*:\n([\s\S]*?)(?=^class\s|\Z)/gm` —— 第二个分支是从
Python 的 `re` 照搬过来的。JS 的锚点只有 `^` 和 `$`，`\Z` 是 Annex B 的
**identity escape**，匹配的是字面量字符 `Z`。

后果不是「少一个候选」：`classRe` 一条都不匹配，于是 `Solution` 的所有方法
（除恰好被 `analyzeSnippet` 挑中的那个）**从来就没进过候选表**。
0085 最大矩形（真入口是 `maximalRectangle(matrix)`，挑中的是辅助函数
`largestRectangleArea(heights)`）、0399 口袋算式（`calcEquation` 与并查集的
辅助方法）、0101 对称二叉树（`isSymmetric(root)` 与 `isSameTree(p, q)`）
都是这么丢的，而报错写着「候选入口 XXX 都匹配不上样例」——
指向一个**根本没被试过**的入口。

JS 里「字符串结尾」要写 `$(?![\s\S])`。凡是照着 Python 正则搬过来的地方
都要过一遍这条。

#### 样例抽取的两处口径（录制器与「跑样例」必须一致）

`recorder/index.ts` 与页面上「跑样例」那条路（`runner.ts`）**各有一份
「样例实参 -> Python 字面量」的转换**。口径不一致的后果不是「多录一篇」，
而是「页面上样例全过，但录制说跑不对」这种自相矛盾：

- `reverse_number(num_str: str)` 拿到围栏样例 `1516000`：直接
  `toPythonLiteral` 会把它变成**整数**，于是 `'int' object is not subscriptable`
  —— 而运行条按 `str` 标注补了引号，跑得好好的（HJ11 数字颠倒）。
  现在录制器也走 `asCallArgument(raw, annotations[i])`，与 runner 同一函数。
- shoppee 的围栏写的是 `grid = [[0,0,0]]`，不剥掉 `grid = ` 就是 SyntaxError。

另外三件事都记在「录制阶段踩过的坑」之外，但同源：

- **`**输入：**` 后面跟围栏块时，那一行正文就是实参。**
  早先一律当 stdin 丢掉（理由是「会造出 `{args:['**']}` 这种必然失败的
  垃圾样例」—— 那条理由本身成立，因为 `readValue` 只吃得到三个反引号）。
  但 HJ1 / HJ11 / HJ85 的入口就是单参函数，围栏里那一行**正是**它的实参，
  一丢掉页面上只能手动输参数、录制整篇录不了。
  **多行且没有 `k = ` 形式的围栏仍然不当实参**（那是 ACM 的 `n` + 数组、
  牛客的多行输入，走 stdin 通道）。
- **stdin 样例只能喂给真的读 stdin 的入口。** 早先不分青红皂白都给，
  于是「需要 1 个位置参数」的入口拿到「空参数 + 一段 stdin」，驱动报的是
  `missing 1 required positional argument: 'grid'` —— 而真正的问题是
  样例形态对不上，报错指不到。
- **「首行 n + 后面 n 行、每行 n 个数字」是网格输入**，按二维列表还原
  （shoppee 迷宫）。判据里两个「恰好」是这条规则敢不敢用的全部理由。

#### 「操作脚本」样例：class-API 设计题（0146 LRU / 0155 最小栈 / 0208 前缀树 / 0295 中位数）

这几类题的样例**不是一次调用**，而是「构造一次 + 挨个调方法」的序列：

```
输入
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
输出
[null, null, null, 1, null, -1, null, -1, 3, 4]
```

`extractDocSamples` 按「实参个数 == 入口签名」过滤，这种样例一个都匹配不上 ——
`no-sample` 报的还是「候选入口都匹配不上样例」，完全指不到真正的原因。
`recorder/script.ts` 专门补这一形态：**只在常规路径一条样例都抽不到时**启用。

踩过的坑：

- **类名要按样例核对，不能取代码里的第一个 `class`。**
  0146 的第一个 class 是 `Node`（双向链表节点），0208 的是 `TrieNode`；
  被测的那个是样例第一项里的 `LRUCache` / `Trie`。
- **构造器那一步也要占一个返回值位置**（记 null）——
  力扣的期望值第一项就对应构造器，少一个就整体对不上。
- **实参用 `json.loads` 还原，不要拼 Python 字面量**：
  JSON 的 null 直接就是 Python 的 None，也拼不出非法字面量。
- **这一类题的数据全在 `self.*` 上，而采集器一直跳过 `self`。**
  不摊平的话 0146 的局部变量里只剩 `capacity` / `key` / `value` 三个标量，
  画面上什么也没有。摊平成 `self.<attr>` 之后 `self.key_to_node` 的键开始增减
  （LRU 的核心），`self.stack` / `self.min_stack` 开始长高又变矮（最小栈的核心）。
  **只在脚本模式开这个开关** —— 一旦全局打开，所有题解的轨迹都会多出
  `self.*`，adapter 的选型（哪个变量是主数组）会跟着变。
- **TRACER_PY 里不能出现反引号**（又一次）。Python docstring 里写
  `` `capture_self` `` 会当场截断 JS 模板字面量，报的却是 Python 的
  `IndentationError`，指不到真正的行。

#### 视图侧踩过的坑

- **树按层画，不摊平成网格。** 摊平后 `[1,2,3,null,5]` 里 5 会紧贴 3，
  读者看不出 5 是 2 的孩子；空槽位要用虚线小点画出来而不是隐藏 ——
  隐藏的话空位后面的节点会跳到左边，「空 = 没孩子」这个语义就没了。
- **层序下标是 0 起。** 力扣的 `[1,2,3,null,5]` 里下标 0 就是根，
  录制器的 `_tlayer_order` 也从 0 编号。`TreeView.positionOf` 早先按 1 起算
  （`if (i < 1) return null`），结果根节点被跳过、整棵树错一层，
  而且 `data-cursor` 永远匹配不上 —— 页面上树画得出来但没有任何一格被高亮。
  位置公式：深度 = `(i+1)` 的二进制位数减一，槽位 = `(i+1)` 去掉最高位 1。
- **树题的递归深度要单独记。** 0104 每层的 `root` 都是「当前这棵子树」，
  满树时每层长度完全一样，光看局部变量分不出「现在是第几层」。
  深度是唯一能讲清递归过程的信息，所以录制器在 call/return 事件上数深度。
- **节点坐标必须锚定入口实参，不能每帧重挑「根」。** 这是树题最大的一个坑：
  录制器早先在**每一帧**重新挑一个「根节点局部变量」（按名字白名单 +
  「谁的值最大」），而递归里 `root` 会被重新绑定成**子树** ——
  0104 第一帧 root 是整棵 7 格，第二层就只剩左边那 1 格。
  录出来的轨迹于是每帧一棵更小的树，adapter 忠实地画出来，
  读者看到的是「树在递归中越缩越小」，**而这题根本没有删节点**。
  现在 `_tbuild_nmap(locals, capture_self, anchor)` 的 `anchor`
  钉住入口那个对象，index 变成整棵树层序里的稳定坐标；
  `treeRec` 也配套地**只认入参那一棵树**（取一次全程复用）。
  0104 7 -> 21 帧、0101 7 -> 15 帧，而且 0101 第一次有了光标
  （`p=第1格(2)，q=第2格(2)` 正好是那对镜像节点 —— 这题的题眼）。
  **链表故意不钉**：0206/0021/0148 本来就是原地改链，
  每帧的锚点链正是要显示的那条链。
- **深度只进 note，别拿它当光标。** 0108 是自底向上**造**树，
  `root = TreeNode(nums[mid])` 造出来的新节点不在入参那棵树里，坐标越界，
  于是「一个节点变量都没有」。早先的兜底是恒定高亮第 0 格 ——
  画面上永远指着根，而 note 里写着「递归深度 5」，直接矛盾。
  指着一个明知不对的位置比不指更糟，所以 `depth` 只进 note，
  `test:adapters` 里 0108 是「至少有一帧有光标」的唯一例外（有注释说明）。

#### 内嵌的技术约束

- **播放器 `React.lazy` + 帧数据运行时 `fetch`**：题解有 126 篇力扣题
  （外加牛客/其它共 182 篇），全打进主 bundle 的话每个读者都要为用不到
  的那几篇付费。globalData 只发「哪篇有可视化 + 帧数 + 源码」这份清单
  （与自测题库同一个取舍）。
- **键盘监听挂在容器上而不是 `window`**。这是内嵌必须付的代价：题解正文很长，
  读者滚动、按空格翻页是常态，独立页那样在 window 上监听会抢走整页的
  方向键与空格。容器 `tabIndex={0}`，点播放时把焦点收进来。
- **不复用 `AlgoPlayer`**：那个组件的输入框假设「输入可编辑、改完重跑
  `run()`」，而录制式的帧是固定的（换输入要重录，构建期才能做）。
  硬塞给它只会得到一个「改了输入但画面不变」的假输入框。
- **`note` 里放的是源码那一行**（去注释）+ 指针当前值。代码行才是作者
  真正想说的话，自动生成的文案再漂亮也比不上。
- **TOC 用显式 id**（`VIS_ANCHOR = 'visualizer'`），机制与自测小节共用
  `selftest/toc.tsx` 的 `ExtraTocProvider`。
- **端到端靠无头 Chrome 点真实按钮验证**，不是肉眼看：`pnpm check:vis`
  每类 adapter 挑一题，验证播放器挂上、**对应视图的格子真的渲染了**、
  指针/光标/状态量出现、单步有效。
  「有没有指出当前在哪」有三种形态，不能一律查指针标签：数组/链表/栈是
  指针标签，树是**高亮的格子**（`data-cursor`），DP 是**计数器面板** ——
  早先一律要求指针标签，于是树与 DP 被误报成「没有指针」，
  是尺子错了不是页面错了。
- **`pnpm check:vis --all` 验的是「166 篇都上得了页面」**（830 项，全绿）。
  抽样模式验的是「视图类型对不对」，全站模式验的是另一件事：
  构建期 `adapt()` 成功只说明**帧**生成对了，页面上那一步是另一回事 ——
  `React.lazy` 的 chunk 拉不下来、`fetch('/traces/x.json')` 404、
  轨迹里某个值渲染时抛异常，读者看到的都是一个红框，
  而这些**不会让任何单测失败**。
  页面清单从 `build` 产物里「含 `id="visualizer`」现扫，不维护第二份清单。
  写这个模式时踩的三个坑，全都在**尺子自己身上**，报错却指向页面：
  - 服务器必须是 `docusaurus serve`（**不是** `python3 -m http.server`）。
    站点 `trailingSlash: false`，`/problems/leetcode/560` 对应磁盘上的
    `560.html`；`http.server` 不做无扩展名解析，于是 12 个页面**全部**报
    「页面上没有 #visualizer」，没有一个字提到服务器。
    spawn 的还得是 `node` + `bin/docusaurus.mjs`，不能 spawn `.bin/docusaurus`
    —— 那是个 shell shim，交给 node 会报 `SyntaxError`。
  - CDP 端口不能写死 9222。上一轮跑挂后残留的无头 Chrome 还占着端口，
    新起的绑定失败直接退出，而连上的是**残留实例** —— 症状同样是一整页
    「没有 #visualizer」。现在端口取 `HTTP 端口 + 1`、profile 走临时目录，
    并且监听 Chrome 的 `exit`：真起不来时报的是「多半是端口被占」。
  - 就绪探测不能复用取 JSON 的那个函数（它对响应体 `JSON.parse`，
    页面是 HTML）—— 于是「等服务器起来」这个逻辑自己先崩了。

#### 手写 tracer（`/code-training/visualizer`）

覆盖数组扫描之外的三类形态：排序（柱状图）、网格 BFS、DP 表格。
录制式管线目前只出一维数组 + 指针，所以这三类还得靠手写。
`patterns/sorting.md` 三个算法、`templates/binary_search_template.md` 两个
都是纯手写的。

核心是 `types.ts` 里的 tracer 契约：
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

#### 当前覆盖与缺口

182 篇题解里 **170 篇录制成功、166 篇有可视化（91%）**。

**录制失败的 12 篇**（每一类都是内容问题，不是管线问题）：

- **`no-sample=7`**：题面里**没有可抽的样例**。
  - 0031 下一个排列、0543 二叉树直径、0761 特殊二进制串：
    `## 示例推演` 里是散文推演，没有 `输入：` / `输出：`。
  - 1480 前缀和：`## 示例推演` 写的是「待补充」。
  - 0160 相交链表：`## 示例` 只写了「相交节点的值为 8」，连输入都没有。
  - 0297 序列化的入口只有 2 行（`只采到 2 个事件`）、HJ11 数字颠倒
    是 `num_str[::-1]` 一行到底（`只采到 1 个事件`）——
    没有过程就没有可视化，硬画是两张静止画面。
- **`exec-error=1`**：ML23 实现 k-Means 依赖 numpy，
  录制器**故意不装包**（见 Pyodide 那节）。
- **`no-code=4`**：`## 完整代码实现` 里没有可运行代码（4 篇 SQL 题）。

要再往上走只能**改题解内容**（给这 5 篇补 `## 示例`），那是内容工作，
不是可视化管线的问题，所以没做。

**录到了但没有 adapter 认领的 4 篇**，全是一行正则替换 / 一次切片：
HJ31 单词倒排（`re.findall` 一次成型）、HJ33 整数与 IP 转换
（`a,b,c,d = map(int, split('.'))`）、HJ96 表示数字（`re.sub`）、
KY4 反序输出（每行 `s[::-1]`）。它们的局部变量里**没有逐步推进的痕迹** ——
硬画出来是两三帧静止画面。这 4 篇在页面上显式写一行「本题无可视化步骤」
（`VisTracesData.noVisual`），而不是什么都不显示：不写等于让读者以为
「这个功能是按题目难度挑的」。

也就是说 **166/170 = 98% 的录制产物都有可视化**，剩下 4 篇是算法本身
没有中间过程，不是覆盖率不足。

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

**逐题验证「▶ 跑样例」按钮：`pnpm check:runbar`（120 篇全过）。**

`test:pyrunner` 只验纯函数、`test:pyodide` 只验执行协议 —— **两者都不验
「这一篇的样例端到端跑出来对不对」**，而那正是读者点一下按钮看到的。
这条路径上出过的错没有一个会让上面两个单测失败：裸单词样例、箭头串、
`str` 标注的裸数字、入口挑到辅助类。

脚本完全照抄 `runner.ts` 的 `samples` 分支（**同一个 `sampleCase` 函数**），
在真 Pyodide 里跑 `buildCallDriver` 的产物，再用 `compare()` 判。
它第一次跑出来就是 **10 篇失败**，逐个修完：

| 篇目 | 原因 | 修在哪 |
|---|---|---|
| 0399 口袋算式 | 入口挑中 `UnionFind.find`（辅助类），`Solution.find` 根本不存在 | `extractSignature` 优先 `Solution` 里的方法 |
| balance_paths | 入口挑中 `build_tree`（造树），题面要的是路径数 | 顶层函数也一起挑；「像构造器」的名字让位 |
| HJ1 / HJ11 / HJ85 | 围栏样例是裸单词，samples 分支只 `toPythonLiteral` | `sampleCase` 走 `asCallArgument` |
| HJ50 / HJ67 | 同上（第一组样例是裸数字/裸单词） | 同上 |
| shoppee_merge / max_distance | 箭头串不被还原成数组 | `asCallArgument` 认 `5 -> 3 -> 1` |
| HJ11 第二组 | 期望 `0`、实际 `"0"`（入口返回 `str`） | `compare` step 1 不再就地返回；新增「数字的字符串 vs 数字」 |
| shoppee_merge 第三组 | 实参是 `(空)` 这种占位符 | `usableSamples` 整组丢掉 |
| 0049 / 0108 / 0347 | 误报：题面说「任意顺序 / 答案不唯一」 | 脚本改成透传 `orderAgnostic`/`multiAnswer`（尺子的错） |

**「整组丢掉」优于「猜对」**：`l1: (空)` 意思当然是空链表，但我们不知道每个
形参该还原成什么（`[]`？`""`？`None`？）。猜错的后果是给出一个必然报错的
样例，那个 ✗ 挂在**正确**的题解下面 —— 比少一组样例糟得多。

**入口挑选的三条新判据**（py-samples 的 `pickPublicEntry` 与
`snippet.ts` 的 `pickEntry` 必须同步）：

1. **`Solution` 里的方法优先**（辅助类 `UnionFind.find` 不是入口）。
2. **下划线开头的是私有辅助函数**（`_reverse`）。
3. **像构造器的名字让位**：`build|make|create|parse|construct|from|to|of`
   后面跟大写或下划线。**只在有得选时才换** —— 0105 的入口真的叫
   `buildTree`、0761 真的叫 `makeLargestSpecial`，单候选时不动。
   （顶层函数那一条之前是「返回第一个」，balance_paths 就栽在那里。）

**原来的端到端扫描脚本 `bars.mjs` / `sweep2.mjs` 已不在仓库里**，
`check:runbar` 在 Node 里跑同一条路径，不必开浏览器。要在浏览器里点真实
按钮时仍然得注意那两个坑：
- **每页的第一个块要给足冷启动时间**（Pyodide 首次加载可能 30s+）。
  早先按 28s 上限轮询，130 个「还在加载」被误记成「没有结果」，
  报告看起来像 143 个问题，实际只有 39 个。
- 判定要挑**带样例按钮的条**（`[data-testid="run"]`），不是按条序号。

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
