# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Personal tech documentation site, **built with VuePress 2 + vuepress-theme-hope**
(theme modeled on JavaGuide), deployed via GitHub Pages to `docs.hanphone.cn`.
The site includes docs, a code-training sub-site (algorithm solutions), a GitHub
Stars showcase, and a projects page. **There is no blog here — the real blog is
the separate site `hanphone.cn`.**

> 2026-10 从 Docusaurus 3.9 迁移到 VuePress。迁移的**完整说明、易错点、以及
> 「为什么这么做」**都在 `.vuepress/README.md`。本文件的下半部分（
> `### Content sources and data flow` 之后）是迁移前写的，凡是提到
> swizzle / globalData / MDX / `build/` / `trailingSlash` 的地方都属于
> **Docusaurus 时代的历史记录**；内容管线、算法可视化、题库、Pyodide
> 那些章节描述的是数据与算法本身，现在仍然有效。

## Commands

```bash
pnpm install          # Install dependencies (Node 24 + pnpm 11/12)
pnpm start            # Dev server on port 3001（vuepress dev .）
pnpm build            # Production build -> .vuepress/dist（带 flock，单实例串行）
pnpm serve            # Preview the build on port 3000
pnpm typecheck        # tsc --noEmit（只检查 src/，strict 关，与迁移前一致）
pnpm check:c          # 《Coding练习--C》的全部 C 代码块编译 + 带 main 的块运行
pnpm check:java       # 《Coding练习--Java》的全部 Java 代码块 javac + 运行
pnpm sync:ml          # Sync ML notebooks (ipynb -> md via Quarto)
pnpm sync:pyodide     # Download the 12.9MB Pyodide runtime into static/pyodide/
pnpm test:offline     # 离线包口径（板块归类 + 路由表解析 + dist 覆盖率）
pnpm test:difficulty  # 难度口径（8 种写法归一 + 全库覆盖率 + 徽标接线契约）
pnpm test:markdown    # 尖括号只转义一次（页面不出现 `&lt;` 字面量）
pnpm test:bold        # 正文里不出现字面 `**`（中文标点 / 空格的加粗规则）
pnpm test:math        # 公式口径（KaTeX 可解析 + 公式不写在代码块里）
pnpm test:search      # 全文搜索口径（worker 是经典脚本 + 正文词能命中）
pnpm solutions:fetch  # 抓力扣某题的前几篇高赞题解（写题解前读，不照抄）
pnpm judge:gen       # 从 LeetCodeDataset 生成 LeetCode 题目包（见「代码评测服务」）
pnpm judge:gen-docs  # 用题面可见样例生成牛客/CodeFun 等题目包
pnpm judge:inventory # 打印 351 篇题解的评测包覆盖报告
pnpm judge:gen-custom  # 链表/类 API/Shopee 等专用 harness
pnpm judge:gen-hidden  # 给 docs-samples 包补 fuzz 隐藏测试
pnpm test:judge      # judgeId 归一化契约
```

> **环境版本必须对齐**：本地与 CI 均使用 **Node 24 + pnpm 11**（见 `.github/workflows/`）。
> 改动 CI 或依赖时确保两者一致，否则 `pnpm install --frozen-lockfile` 在 CI 上会失败。
>
> **不要并行跑多个 `pnpm build`**：构建峰值 4–6GB，两三个并发会压满 15GB 内存，
> 内核可能先杀 `gnome-shell`。`pnpm build` 已用 `scripts/build.sh` + `flock` 串行，
> 但后台 agent 仍应只跑 `check:docs` / `check:runbar` / `test:tracers`；
> 完整构建由主会话在最后跑一次。

## Architecture (VuePress)

### 目录

```
index.md                    # 首页（home: true；内容由 HomePage.vue 服务端渲染）
stars.md / projects.md      # 两个 React 孤岛页面
settings.md                 # 设置（/settings.html，CacheSettings.vue）
docs/                       # 主文档：/docs/**
code-training/docs/         # 算法训练：/code-training/**
.vuepress/
  config.ts                 # 站点配置（head / bundler / pagePatterns / plugins）
  theme.ts                  # hopeTheme 配置（导航、侧边栏、markdown、插件）
  navbar.ts / sidebar.ts    # 导航与侧边栏（侧边栏由文件系统现场生成）
  paths.ts                  # md 文件 -> 线上 URL（核心：保留旧地址）
  client.ts                 # 全局注册 React 孤岛组件 + 加载自定义样式
  plugins/                  # 构建期插件：permalink / 组件注入 / 分类页 / 离线包清单
  data/training-data.ts     # 构建期汇总题库、样例、知识图谱
  markdown/                 # markdown-it 规则（转义尖括号、代码块行数注入）
  components/*.vue          # 首页 HomePage + React 孤岛壳子 + 沉浸阅读 LayoutToggle + 导航图标
  styles/                   # config.scss / palette.scss / index.scss
src/components/             # 交互件（React：Pyodide 运行条、算法播放器、自测）
src/pages/stars|projects/   # 整页 React 组件（Stars / 项目，通过孤岛挂载）
src/vuepress/               # React 孤岛的挂载器 + Docusaurus API 替身
```

### URL 规则（不要随手改）

`.vuepress/paths.ts` 把每个 md 映射到**旧 Docusaurus 站点一模一样的 URL**：

```
docs/前端/Vue基础.md                                  -> /docs/前端/Vue基础.html
docs/intro.md                     (slug: /)           -> /docs.html
code-training/docs/intro.md       (slug: /)           -> /code-training.html
problems/leetcode/0001_two_sum.md (id: 1)             -> /code-training/problems/leetcode/1.html
```

最后一段取 `frontmatter.slug` > `frontmatter.id` > 文件名。**必须带 `.html`**：
VuePress 的 `inferRoutePath` 会把不以 `.html` 结尾的路由补成 `.html`，否则
每条路由都落到 404（迁移时踩过，整站 452 页全是 404）。旧的无后缀 URL
（`/docs`、`/code-training/problems/leetcode/1`）由 GitHub Pages 的
`X -> X.html` 解析兜住，书签和外链不受影响。

**`导读.md` 映射为所在目录本身**：`docs/机器学习/导读.md` -> `/docs/机器学习.html`，
所以侧边栏分组标题点进去就是导读。`/docs/机器学习` 这种无后缀写法由
GitHub Pages 兜住（`X.html` 优先于同名目录）。规则写在 `paths.ts` 里，
**不要给导读加 `slug`**：`slug: /` 是板块根，会把页面抢到 `/docs.html`。

**搬家、改名、删除都不补重定向。** 2026-11 起取消了「旧地址一律保留」的口径：
页面换地址后旧 URL 直接 404，站内链接改源头。`theme.ts` 里不再配置
`redirect`（迁移时代的 `/docs/intro` 等几条已删除）——重定向表要跟着每次
搬家手工维护，还会让「哪些地址是真的、哪些是壳」变得不可判断。

### 侧边栏：每个分组必须带自己的 `prefix`

`.vuepress/sidebar.ts` 现场扫描目录生成侧边栏，每个目录是一个可折叠分组。
**分组必须写 `prefix`（它自己目录的 URL 前缀，`legacyDirPrefix()` 算出来）。**
不写的时候 hope 让分组继承侧边栏的 base，而它判定「这个分组是不是当前」
有一条 `isActiveLink(route, prefix)`，两边的归一化都会去掉 `.html`：

- 板块首页在 `paths.ts` 里是 `/docs.html` / `/code-training.html`，而
  `theme.ts` 为了给首页配侧边栏也注册了这两个 key —— 于是 base 正好是首页
  URL 本身，**首页上所有分组都被判成当前**；
- `SidebarLinks` 用 `findIndex` 打开第一个当前项，每一层都如此 ——
  在首页点开任一目录，它的第一个子目录（再套第一个子目录…）会整支自动展开，
  分组标题也全部亮成激活态，而页面本身没有任何报错。

`pnpm test:sidebar`（11 项）把口径钉住：每个分组都有唯一前缀、板块首页上
没有任何分组是当前、每篇文档只展开它的祖先链。改 `sidebar.ts` 或换主题版本
后跑一遍。

**数据结构与算法模式两个目录的顺序是写死的学习路径，不是标题序。**
`code-training/docs/data-structures/*.md` 与 `code-training/docs/patterns/*.md`
没有 `_category_.json` 可排，缺省的 `9999` + 标题排序会按拼音排成「并查集、堆、
队列、树…」—— 那是词典序，不是给人读的顺序。所以每篇都写了
`sidebar_position`：

- 数据结构：数组 → 字符串 → 链表 → 栈 → 队列 → 哈希表 → 树 → 堆 → 图 →
  并查集（线性表 → 查找结构 → 树族 → 图 → 并查集；二叉树并进「树」那一篇）；
- 算法模式：递归 → 双指针 → 滑动窗口 → 哈希映射 → 查找 → 排序 → DFS →
  BFS → 回溯 → 贪心 → 动态规划（递归打底 → 线性扫描 → 有序 → 搜索 → 决策）。

`test:sidebar` 把这两串顺序逐项比对；**新加一篇而不写 `sidebar_position`，
它会安静地掉到分组末尾**，没有别的东西会报错，所以这条断言是必要的。
`.vuepress/plugins/catalogs.ts` 的 `sectionPage`（`/code-training/category/数据结构`
这些板块目录页）也按同一个字段排，不要在那里退回标题序 —— 否则侧边栏是
「数组 → 字符串 → 链表」、目录页是「图 → 堆 → 树」，两边对不上。

### 难度（题解页那一行 `.page-info` 里的一项）

题解的 `frontmatter.difficulty` 有 8 种写法（`Easy` / `Medium` / `Hard` /
`简单` / `中等` / `困难` / `入门` / `较难`），口径收在
`src/components/training/difficulty.ts`：**标签保留五档**（牛客的五级比力扣细），
**配色只三档**（入门+简单=绿、中等=黄、较难+困难=红）。算法模式 / 数据结构页
写的是区间（`difficulty: 简单-中等` 或 `difficulty_range: [中等, 困难]`），
都解析成 `简单–中等` 这种形式，配色取较难的那一端。

页面上它显示在标题下方那一行（日期 · 分类 · **难度** · 标签 · 字数 · 阅读时间）：

- 挂载点是 **hope 的 `PageInfo`**：它对每一项做 `resolveComponent(\`${item}Info\`)`，
  所以 `.vuepress/components/DifficultyInfo.vue` 在 `client.ts` 里全局注册成
  `DifficultyInfo`，`theme.ts` 的 `pageInfo` 里写一项 `'Difficulty'` 就进位了。
  这样是 **SSR**（`react-mount` 那些孤岛不同），不闪、爬虫也看得到。
- `pageInfo` 的类型是封闭 union，配置里只能 `as unknown as PageInfoType[]`；
  **删掉全局注册这一项会静默消失**（开发时一行警告，构建照常成功），
  所以 `pnpm test:difficulty` 把这条契约也钉住了。
- `plugins/catalogs.ts`（题库 / 标签页）、`.vuepress/data/training-data.ts`
  （相关题目排序）、`pattern-graph` 组件共用同一个口径 —— 这三处原先各写一份
  正则且只有三档，牛客的 **入门 24 篇、较难 6 篇全被算进「其它」**。

### React 孤岛（为什么页面里还有 React）

交互件（Pyodide 运行条、手写算法播放器、自测题、Stars/Projects）
是 React 写的，核心逻辑（执行协议、tracer 帧、题库校验）与框架无关，
只有渲染层是 React。迁移没有把它们重写成 Vue，而是让它们跑在自己的
React root 里：

- `src/vuepress/compat/*` 是 `@docusaurus/*`、`@theme/*` 的最小替身，
  在 `.vuepress/config.ts` 的 Vite alias 里接上，**组件源码一行没改**
- `.vuepress/components/*.vue` 是薄壳：`onMounted` 后懒加载对应 React 组件
  并 `createRoot()`，卸载时 unmount
- 这些区块**不在 SSR 产物里**（React 只在浏览器挂载），对 SEO 不可见；
  它们本来也都是「点开才算」的交互件

### 组件注入（md 一行都不用改）

旧站点靠 swizzle 接缝；VuePress 下改成在 **markdown-it token 流**里插组件
标签（VuePress 会把渲染结果当 Vue 模板编译）：

| 位置 | 组件 |
|---|---|
| 每个可运行的 python 代码块之后 | `SnippetBarMount` |
| 正文末尾 | `TracerVisualizerMount`、`PatternGraphMount`、`SelfTestMount` |

数据在构建期算好（`.vuepress/data/training-data.ts`），只有「模式 -> 相关题目」
这一张表通过 Vite `define` 进客户端；题库按需 `fetch`。

### 构建期生成的页面

`/code-training/category/*`（题库、机器学习、数据结构、算法模式、复习系统）
与 `/code-training/tags`、`/code-training/tags/<tag>` 由
`.vuepress/plugins/catalogs.ts` 在 `onInitialized` 里 `createPage` 出来。
它们出现在板块落地页的正文链接里，不生成就是 404。

### 三站内容的关系（私人笔记 / 本站 / 博客）

内容分三层，**判据是「删掉之后会不会有人回头查」**，不是技术栈：

| 层 | 在哪 | 放什么 |
|---|---|---|
| 工作台 | `../hanphone-note`（私有） | 草稿、私有、随时会推翻的 |
| 知识库 | 本站 `docs/` | 会被反复查、要跟着技术更新 |
| 发表 | `hanphone.cn` 博客 | 有时间点、有对象、一次性讲完的事 |

- **一个主题只有一个 owner 站**。知识型文章的 owner 是本站，博客那份是发布当天的
  快照（正文冻结，顶部一行「持续更新版」指向本站）；叙事型反过来，本站不复制。
- `pnpm cross:link` 现场配对三源（博客标题 ↔ 本文档 ↔ 私人笔记），产出
  `data/cross-link.json`（已 gitignore：里面有私人笔记的文件名）。机配不上的几组
  登记在脚本的 `MANUAL_PAIRS`。
- `pnpm check:cross` 查 `docs/` 里的失效相对链接与站内绝对路径，顺带打印配对表。
  新页面引用了不存在的 `.md` 时**构建不会失败**，只有这个脚本会报。
- 那三套「计算机基础」是刻意的：通用篇讲概念，Java/Python 篇讲同一概念在运行时里
  长什么样。侧边栏标题已经标了视角，正文靠 `docs/计算机基础/导读.md` 互联。

### 归档：分类 / 标签 / 时间轴

除了上面两个板块内的旧页面，全站还有一套「博客式」归档：

| 页面 | 内容 |
|---|---|
| `/article/` | 全部文章（450 篇，每页 10 条，按日期倒序） |
| `/category/` + `/category/<slug>/` | 分类地图与单分类下的文章 |
| `/tag/` + `/tag/<slug>/` | 标签地图与单标签下的文章 |
| `/timeline/` | 按年月分组的时间轴 |

这四类页面由 **hope 的 blog 插件**生成（`theme.ts` 的 `plugins.blog`），
不是我们的 `createPage`：这正是 JavaGuide 那套 `/category/`、`/tag/`、
`/timeline/` 的来源。站点仍然**没有博客正文板块** —— 插件只负责归档，
真正写文章的地方是 hanphone.cn。

数据链路是两段：

1. `.vuepress/taxonomy.ts` 定口径：**位置决定分类，关键词决定标签，
   frontmatter 优先**。`docs/前端/Vue基础.md` → 分类「前端」+ 标签「Vue」；
   `problems/leetcode/1.md` → 分类取 `platform`（LeetCode / NowCoder / 顺丰科技…，
   缺失时回退目录名）+ 题解自己的 `tags`；日期取 `date` > `date_added` >
   `last_updated`，都没有时交给 `@vuepress/plugin-git` 的首次提交时间。
2. `.vuepress/plugins/taxonomy.ts` 在 `extendsPageOptions` 里把
   `category` / `tags` / `date` 写进 frontmatter —— 这是 blog 插件
   读取之前唯一能改的接缝。**页面文件一行都没改。**

几个不要顺手改的地方：

- **归档页是目录形式（`/timeline/` → `timeline/index.html`），不是 `.html`。**
  它们不经过 `paths.ts`，也不要给它们补 `.html`；GitHub Pages 对目录会
  自动找 `index.html`。`paths.ts` 只管 `docs/**` 与 `code-training/docs/**`。
- **文章筛选只看两个内容目录**（`theme.ts` 的 `isArchivePage`）。
  `stars.md` / `projects.md` / `index.md` 是 React 孤岛与首页，不该进归档；
  生成页（`/code-training/category/*`）没有 `filePathRelative`，自然被排除。
- **`excerpt: false`**：600 页全抽摘要会让构建多做一遍正文渲染，归档页
  只要标题、日期、分类/标签。
- **`star: false`**：站点没有「星标文章」，关掉那个空页面。
- **`sidebar: { '/': false }`**：归档页不属于任何板块，没有兜底空侧栏时
  主题会为 200 多个标签页各打一条 `missing its sidebar config` 警告。
- **归档右侧面板切换**：主题的 `InfoList` 用 `DropTransition` 包住
  「文章 / 分类 / 标签 / 时间轴」四个面板，但切换时旧面板的 leave 过渡
  经常不结束，旧内容留在 DOM 里、新面板停在 `opacity: 0`，右侧会整块变高。
  `index.scss` 里按当前激活图标只 `display` 对应的 wrapper；那条规则别删。
- **旧的 `/code-training/tags`、`/code-training/category/*` 保留。**
  它们是已经上线过的 URL（板块落地页正文直接链过去），与全站归档
  是两套入口，不要为了「统一」删掉。
- **时间轴依赖 git 历史**：CI 的 `actions/checkout` 必须 `fetch-depth: 0`
  （两个部署 workflow 都是），浅克隆会让所有页面挤在同一天。
- **没有 H1 的历史笔记用文件名兜底标题**：`docs/` 里不少文件从私人笔记迁移来，
  既没有 `frontmatter.title` 也没有 `# 标题`，页面上原本标题为空、
  时间轴上就是一条空白。`plugins/taxonomy.ts` 统一用文件名兜底
  （`intro` / `index` 例外，它们靠正文 H1）。

**给一篇文章改分类/标签**：优先在 frontmatter 写 `tags`（写了就完全取代
自动推导，题解就是这条路）；分类由目录决定，改目录才有意义。要调整关键词
规则就改 `.vuepress/taxonomy.ts` 的 `DOC_TAG_RULES`，改完跑一遍
`pnpm test:taxonomy`（11 项断言，钉住分类/标签/日期口径）。

**星标**不是页面上的按钮，而是 frontmatter 标记：在某篇 md 里写
`star: 1`（数字越大越靠前），重新构建后它会出现在 `/star/`，归档页的
「星标」标签和侧栏星标列表也会自动出现。没有任何页面写 `star` 时，这两处
会被 CSS 隐藏，不会显示「星标 为空」。

### 每页页脚的「最近更新」

页脚那行 `最近更新` 来自 hope 自带的 `@vuepress/plugin-git`，默认只对
**页面 md** 跑 `git log --follow`。但站上一批页面的正文并不在 md 里：
`settings.md` 只有 12 行、整页是 `<CacheSettings />`；自测题来自
`static/quiz/bank.json` 里的那几条；模式页的播放器来自 `tracers/*.ts`。
只认 md 的后果是设置页在离线包改了十几轮之后仍显示 10/26 —— 这个时间会从
「内容什么时候变过」退化成「壳文件什么时候被碰过」。

`.vuepress/updated-time.ts` + `.vuepress/plugins/page-updated.ts` 把它补成
「**这一页正文涉及的所有文件里最新的那次提交**」：

| 依赖 | 怎么进来 |
|---|---|
| md 里手写的组件（`<CacheSettings />`） | `extendsPageOptions` 写 frontmatter 的 `gitInclude`；组件按相对 import 递归展开 |
| 内嵌 tracer | 放置表 `INLINE_TRACER_PLACEMENT` 的 id -> `tracers/*.ts` |
| 自测题库条目 | `git blame --line-porcelain` 一次，按条目占的行区间取 max |

几个别改的地方：

- **`gitInclude` 必须在 `extendsPageOptions` 里写**：页面对象创建时
  `@vuepress/plugin-git` 的 `extendsPage` 就会读它，晚一步就来不及。
- **题库不能按整份 `bank.json` 算一个时间**：529 条题共用一个文件，按文件算
  会让新加一道题把另外一百多篇题解的日期一起跳到今天。所以按行 blame；
  一次 blame 覆盖全文（6 千行 <100ms），**不要**每条题各起一次进程。
- **自动注入的渲染管线不算依赖**（运行条、自测渲染、主题样式），
  模式页「相关题目」里那些别的题解也不算：改一次就让几百页同时「今天更新」，
  真正的变更反而被淹掉。口径与例外写在 `.vuepress/updated-time.ts` 文件头。
- **`pnpm start` 里页脚没有这个时间**：hope 只在构建时挂
  `@vuepress/plugin-git`，开发服务器下 `page.data.git` 是空的。不是坏了，
  用 `pnpm build` 看。
- **浅克隆会毁掉题库那一路**：blame 拿不到历史时所有条目都算同一次提交，
  `fetch-depth: 0` 又多一个必须。
- 改口径后跑 `pnpm test:updated`（9 项：组件 / tracer / 题库行区间 /
  设置页依赖确实比 `settings.md` 新……）。

### 外观（首页 / 字体 / 沉浸阅读）

- 首页沿用迁移前的设计，但实现换成了 **Vue SFC 服务端渲染**
  （`.vuepress/components/HomePage.vue`，样式是原 `index.module.css` 搬过去的
  CSS Module）。**不要改回 React 孤岛**：React 要等 app bundle 下载并执行完
  才在 `onMounted` 里挂载，首屏（尤其慢网络）只剩导航栏，看起来像首页没加载。
  现在标题、入口卡片、数字条都在 SSR 产物里；数字仍来自注入的
  `doc-permalinks` / `visualizers` / `self-test` 清单，构建期真算。
  `index.md` 只留 `home: true` + `<HomePage />`，主题 hero 用 CSS 藏掉。
- 字体与 JavaGuide 同一套思路（`palette.scss` 的 `$vp-font`，纯系统字体、
  衬线优先），>=960px 根字号 17px；导航栏阴影压到几乎不可见。
- **数字不另挂字族**（2026-11 改）：西文栈（`palette.scss` 的 `$vp-font`）
  本身就是一组**自带等高数字**、粗细随字重的衬线 —— Cambria（Windows）→
  Noto Serif（Linux/Android）→ Times New Roman（macOS 兜底）。之前排头是
  Georgia，为了绕开它的旧式数字，另挂了一族 `unicode-range: U+0030-0039`
  的 `@font-face`（`SiteDigits`，落到 CJK 衬线）：后果是「2D」「HJ18」「K8s」
  这类词被拆成两种字体，数字细、比大写字母还高，粗体里字母换真 Bold、数字
  仍是常规体 —— 一个词里一边细一边粗。实测（无头 Chrome 取像素墨量）
  标题里 2 的墨量 0.27、D 是 0.48；换成同一族之后两者是 0.36 / 0.47。
  **别再加数字专用字族**：`unicode-range` 是按字符切字体，做不到「只在
  纯数字处生效」，任何「数字 + 字母」的词都会被切开。要换字体就整族换。
  另外 Georgia 的 GSUB 里根本没有 lnum/onum/tnum（fontTools 量过），
  `font-variant-numeric` 对它是空操作；`index.scss` 里那条
  `html { font-variant-numeric: lining-nums }` 是给「默认旧式、但有 lnum」
  的候选字体留的保险，别删。
  验证办法：`google-chrome --headless=new --remote-debugging-port=…` 后走
  CDP 的 `CSS.getPlatformFontsForNode`，看数字与字母那几格是不是同一个字体。
- 沉浸阅读是 `LayoutToggle.vue` 的显式开关（`html.layout-hidden`），
  不用 hope 的 `focus`（那是滚动自动隐藏，不能手动进出）。
  移动端无按钮、窄屏强制退出。
- 状态栏 theme-color 跟随主题（浅白 / 深黑）：静态白 + 首屏脚本按系统偏好
  改黑 + MutationObserver 跟随手动切换（head 按 name 去重，不能写两条 media）。
- 导航栏不再有「GitHub / 个人主页」文字项；右侧两个图标链接（个人主页、
  设置/齿轮）是 `theme.ts` 的 `navbarLayout.end` 里的两项
  （`NavbarHomeLink` / `NavbarSettingsLink`，在 `client.ts` 全局注册）。
  **别再改回 rootComponent + `onMounted` 插 DOM**：归档页用的是 hope 的 Blog
  布局，与默认 `Layout` 是两棵组件树，站内切过去会把 Navbar 卸载重挂，
  插进去的节点回不来 —— 现象是「从归档页回首页，两个图标不见了」，
  安装版 PWA 里尤其像「首页经常没有按钮」。GitHub 仓库图标由 `repo` 配置提供。
- **stars / projects 是整宽页面**：`stars.md` / `projects.md` 的
  `containerClass` 挂 `stars-page` / `projects-page`，`index.scss` 里把
  `[vp-content]` 放宽到 100% 并去掉主题页面标题（React 头部自带 h1，
  只保留一个）。桌面端卡片网格 4 列，卡片内边距/行高都收紧过；
  两个 md 还设了 `externalLinkIcon: false`，否则主题会给每个外链自动加
  ↗，和卡片标题里自带的图标重复。Stars / 项目卡片的标题都跳 GitHub 仓库，
  文档入口收成了 meta 行末尾的书籍小图标（列表视图里是右侧「文档」按钮）；
  改这两页布局时不要把这些覆盖掉。
- **导航栏是英文 wordmark + 统一字体**：`theme.ts` 的 `navbarTitle:
  'MapleField'` 只改导航栏标题，中文站名仍保留在 `<title>` / 首页 / 页脚。
  `index.scss` 把字体统一设在 `.vp-navbar` 上并直接复用 `--vp-font`
  （系统字体、衬线优先；搜索框显式 `font-family: inherit`）；桌面导航高度
  压到 `3.5rem`，导航项 `0.9375rem`，wordmark `1rem`。改导航栏样式时别把
  这几条覆盖掉。
- **Giscus 评论字体**：评论在 iframe 里，外站 CSS 进不去。`static/giscus/`
  下的 `light.css` / `dark.css` 是 hope 模板主题 CSS + 末尾字体覆盖，
  `theme.ts` 的 `lightTheme` / `darkTheme` 指向线上绝对地址；升级 hope 时
  同步更新这两个文件。

### 切页性能：代码块的 `content-visibility`

长文档切页的耗时几乎全在 **layout / style**，不在脚本：4 倍 CPU 节流下切一篇
47KB 正文、11000 个节点的文档约 500ms，其中 Layout 150ms、RecalcStyle
150ms、Script 只有 4ms。代码块是最重的部分 —— `pre.vp-code` 加了
`content-visibility: auto`，屏幕外的代码块不参与排版与绘制，同样一次切换
降到 ~300ms。

估算高度必须准，否则 TOC 锚点会跳偏：按固定 `12rem` 估算时 24000px 的页面上
偏 2600px。所以 `.vuepress/markdown/code-block-lines.ts` 在**构建期**把行数
写进代码块外层 div 的 `--cv-lines`，`index.scss` 用
`calc(var(--cv-lines) * 1.6em + 2.29em)` 算高度。**末尾不要再加经验常数**：
实测 `+3.5px` 会让点 TOC 之后标题跑到视口上方 119px，不加常数是 +3~9px。

深链接带锚点（`/x.html#section`）时浏览器在外壳执行前就滚过一次，`client.ts`
的 `fixHashScroll()` 会在初始路由就绪后重新定位并补掉残差；不补时实测能偏出
一屏（-1006px）。

### 全文搜索（`@vuepress/plugin-slimsearch`）

**`search: true` 是错的**：那是 `@vuepress/plugin-search`，索引项只有
`{title, headers, path, pathLocale, extraFields}`，正文一个字都不进索引
（站点里 `extraFields` 还是空数组）。现在 `theme.ts` 用的是
`plugins.slimsearch`，`indexContent: true` + `filter: isArchivePage`，只索引
`docs/` 与 `code-training/docs/` 两个内容目录。

**版本地板是 rc.130。** slimsearch rc.128 的 worker 是 ESM（`import … from
"vuepress/shared"`），rc.129 末尾留了 `export{}`，而生产客户端是
`new Worker(url)`（经典脚本），两者都会 SyntaxError；rc.130 起 worker 才是
IIFE。所以 core 是 rc.31、插件 rc.137 —— **不要单独降 `vuepress` 或
`plugin-slimsearch`**：降了以后构建、SSR、全部单测照常，只有线上搜索框打不开。

几个接缝：

- 索引约 **7.2MB**（gzip 后 5.4MB），只在点开搜索时加载；worker 名带
  `BUILD_ID`、放在 `assets/` 下：文件名不可变才能 `CacheFirst`，放
  `assets/` 是为了让离线包「共享脚本」板块自动带上它（离线可搜）。
- **worker 的 `request.destination` 是 `worker`，不是 `script`**：
  `theme.ts` 里有一条单独的 SW 路由（桶 `search`，`maxEntries: 2`）。
  不单独建桶的话每次部署留下的 7MB 旧索引会一直堆在 `assets` 里；
  `CacheSettings.vue` 的 `targetCache` / `readCacheKeys` / `pruneStaleAssets`
  要跟这条路由对齐。
- 客户端在 `.vuepress/client.ts` 用 `defineSearchConfig` 收了查询语义：
  `combineWith: 'and'`（默认 `or`，中文被切成单字后「页缓存」命中 400 页、
  2788 条；AND 后 23 页、84 条，排序不变），以及结果截到 20 页 / 每页 5 条。
- `suggestion: false`：`createSearchWorker()` 每调一次就新建一个 Worker、
  各自解压一份索引；开联想时弹窗里会有两个 Worker，7MB 下两遍。
- UI 从导航栏输入框变成按钮 + 弹窗（类名是 `vp-search-*`，不是
  `slimsearch-*`），字体在 `styles/index.scss` 里单独设。
- 回归：`pnpm test:search` 在 Node 里用 `self` shim 跑产物里的 worker，
  断言「页缓存」命中「数据库理论」的 `text`（正文）而不是标题；
  worker 变回 ESM 时这里会先报。CI 在 build 之后跑它。

### 已知的取舍

- **PWA**：用 `@vuepress/plugin-pwa`，只 precache 外壳（rc.31 下 2.8MB），页面/图片
  走运行时缓存。**`maxSize` 必须是 4096**：它是 Workbox 的
  `maximumFileSizeToCacheInBytes`，而应用外壳 `app-*.js` 曾经 2.04MB（rc.31 之后 1.16MB），改回
  2048 之后它会被**静默剔除**（日志照常、构建不报错），全新安装后第一次断网
  就是浏览器离线错误页。`register-service-worker` 必须静态 import 一次（见
  `.vuepress/README.md` 的 PWA 一节），否则动态 import 落在 load 之后会
  静默不注册。**HTML 的 `NetworkFirst` 不能设 `networkTimeoutSeconds`**：
  超时回退的旧 HTML 指向已删除的哈希 chunk，会卡在
  `Failed to fetch dynamically imported module`。
  **启动页 `/` 走预缓存**（`generateSWConfig.directoryIndex: 'index.html'`）：
  2026-11 为「PWA 冷启动要暖机」改回来的。之前置空是为了修「永远跑旧外壳」，
  现在那类失败由 `client.ts` 的 `router.onError`（整页打开目标地址）和离线包
  prune（保留被缓存 HTML 引用的旧外壳/旧 chunk）兜住；而 `/` 走 NetworkFirst
  的代价是每次冷启动都等一次真实网络往返（手机刚唤醒时 DNS/TCP/TLS 全冷）。
  预缓存里的 `index.html` 与 `assets/app-*.js` 是同一个 SW 版本的一对，深路径
  仍走 NetworkFirst。**JS/CSS 用 `CacheFirst`**（哈希文件名不可变），别改回
  `StaleWhileRevalidate`：SWR 每次命中都会再回源，切页时白占带宽。
  `visibilitychange` 里 30 分钟查一次 SW 更新（时间戳落 localStorage，冷启动
  前 30 秒不查）；安装版里申请 `navigator.storage.persist()`；外壳执行完之前
  的站内点击会先扣下，等初始路由就绪再走 SPA（2.5 秒兜底整页跳转）。首页
  手写的链接必须带 `.html`，否则也不走路由。
- **离线包在 `/settings.html`**：`offline-manifest.json` 由
  `plugins/offline-package.ts` 在构建期生成（997 页 + 约 3MB
  懒加载共享脚本 + 12.9MB 的 Python 运行时 ≈ 149MB；运行时的文件清单与缓存名在
  `src/components/training/pyrunner/runtime-files.ts`，客户端 fetch 拦截与
  设置页共用；两个 `.mjs` 要同时进 `pyodide-runtime-v1` 与 `assets`，
  否则离线跑代码卡在 import 那一步）。清单每条带 sha1 指纹，设置页按指纹做增量；
  页面的指纹是「抹掉 `src|href="/assets/..."` 之后」的 HTML，缓存 HTML 时连它
  引用的那一版 `app-<hash>.js` 一起留住，所以重新部署后**一个请求都不发**
  （实测 121 页文档「都已是最新」）。prune 要保留被缓存 HTML 引用的旧外壳/旧
  chunk，别按「不在当前清单里就删」一刀切。
  **归档条目页的指纹还抹掉了顶部那张全站标签云/分类计数表**（217 张标签页
  各约 44KB，一次新增标签就全变），否则「归档页」板块几乎每次部署都整片
  重下 14MB。日期按 `config.ts` 钉死的 `Asia/Shanghai` 渲染 —— 不钉的话
  CI（UTC）与本地（+08:00）构建差 8 小时，跨午夜的文章在时间轴上会差一天，
  两边产物互相算「内容更新」。
  **`/stars.html` 与 `/projects.html` 各自一个板块**（不是并进「首页与固定页」）：
  它们是整页 React 孤岛，页面代码从外壳 `import()`、路由表里没有，数据内联在
  那份 JS 里且**每天刷新** —— 混进「共享脚本」会让那 3MB 天天显示有更新。
  页面代码连同它静态依赖的那 1.4KB（`jsx-runtime` / `Layout` / `rolldown-runtime`）
  写进条目的第 6 项（`[[chunk, 字节数]]`），所以单独缓存这个板块离线就能打开；
  这些依赖同时还在「共享脚本」里，`clearSection` 要跳过被别的板块引用的文件。
  页面指纹把孤岛 chunk 的字节也混进去，`pages[url].islands` 让 prune 留住旧 HTML
  配的那份。
  **设置页的操作模型是一行一个状态、一个动作。** 板块状态只有七种（运行中 /
  失败 / 部分 / 有更新 / 缺脚本 / 未下载 / 已下载），按钮文案从状态推出来：
  下载、继续、更新、重试、修复、取消，已下载的行没有按钮。页面上只有一个主按钮
  （组头那个，没有活干时自己消失），进度画在那一行，危险操作收进 ⋯ 并在那一行
  展开确认条。**别退回**「四个数字各配一个按钮 + 页顶全局进度 + 改按钮文字的
  二次确认」那套：那会让每行有两个等重按钮、确认提示出现在几百像素外。
  **外链图片（`remote`）在清单里带 `thirdParty: true`**，设置页据此把它单独成组：
  它不是本站构建产物，不计入板块覆盖率、总量与「更新站点内容」，失败原因也只说
  图床。混进站内板块会让「完整可用」永远亮不起来（站内全下完了它仍是 0/N），
  而且它的指纹是 `sha1(url)`，永远判「没变」。改 `offline-shared.ts` 的板块类型
  或 `offline-package.ts` 的 `bucket()` 时把这条带上。
  下载时按目标桶写进**已有的** `html-v2` / `assets` / `traces` / `quiz` /
  `search`（搜索索引，见上文「全文搜索」），所以不需要新增 SW 路由。
  清单带构建版本，部署后旧包会被标成「需要更新」并
  删掉上一版遗留的页面 chunk。只下 HTML 也能读（SSR 产物在 HTML 里），但站内
  跳转会退化成整页重载 —— 勾「同时缓存页面脚本」才是完整体验。细节见
  `.vuepress/README.md` 的「离线包与缓存管理」。
- **`.vuepress/styles/index.scss` 不会自动加载**（hope rc.110 的 `userStyle`
  没接上），必须在 `.vuepress/client.ts` 里显式 `import`。
- **本地搜索是 slimsearch 全文索引**（不是 `plugin-search`）：口径、版本地板
  与那几个接缝见上面「全文搜索（`@vuepress/plugin-slimsearch`）」一节。

---

## 历史记录（Docusaurus 时代）

以下内容写于 2026-10 迁移之前。**提到 Docusaurus 专有机制的地方已经不适用**，
但其中关于内容管线、题库出题、Pyodide 执行协议的记录仍然有效，
是迁移时逐条对照过的依据。

### Content sources and data flow

- **ML notebook sync** (`scripts/sync-machine-learning.ts`): Converts `.ipynb` files in `code-training/machine-learning/` to markdown via Quarto, outputs to `code-training/docs/machine-learning/`. 页面标题优先取源 notebook 的 `metadata.title`（可读中文标题），否则回退到文件名。
- **GitHub data** (`data/`): `github-stars.json`, `projects.json`, `star-tags.json` are auto-fetched/updated by GitHub Actions workflows and consumed at build time by the Stars and Projects pages via `@site/data/`.
- **LeetCode progress sync** (`scripts/sync-leetcode.js`): Pulls accepted LeetCode (leetcode.cn) submissions using the `LEETCODE_SESSION` cookie, diffs against local `code-training/leetcode/`, and generates new `*.py` + `docs/problems/leetcode/*.md` files. The scheduled `sync-leetcode.yml` workflow **has been removed** (2026-10-25); the script is kept **only as the reference implementation of the sync logic**, to be run by an AI/agent when explicitly requested. It also **records the rolling cookie renewal** (LeetCode returns a renewed `LEETCODE_SESSION` in `Set-Cookie` on every call) into `.lc-cookie.tmp`, but nothing persists it any more — the caller has to save it by hand. See 「LeetCode 同步」.
- **NowCoder progress sync** (`scripts/sync-nowcoder.js`): Pulls accepted NowCoder submissions using `NOWCODER_COOKIE` + `NOWCODER_UID`, diffs against local `code-training/nowcoder/`, and generates new code files + `docs/problems/nowcoder/*.md`. The scheduled `sync-nowcoder.yml` workflow has been removed. The script is kept **only for AI/agent-driven sync when explicitly requested** — there is no scheduled or routine manual sync. It prints `COOKIE_EXPIRED=true` / `COOKIE_UNKNOWN=true` for cookie handling.
- **CodeFun2000 华为 Pull**: Use `.agents/skills/codefun-processor/SKILL.md`. Start with `pnpm codefun:recent` (reads the `groups` date index, skips mocks and choice questions), not the `/contest` page. Two things are easy to get wrong:
  - **`/new-p/P####` is the public statement page；`/p/P####` 是登录受限的 IDE 页面**。后者在未登录时 `problem_content` 为空，不能据此判断题目要会员；完整题面在 `div#content-ZhContent`。
  - 「最近场次」看题库分组的 `groups`（日期 + 方向 + pids），不要只看 `/contest` 的模拟赛。选择题（`title: "选择题"`）不生成题解。
- **自测题库** (`static/quiz/bank.json`): 主动回忆题，加在题解正文末尾。`plugins/self-test/index.ts` 只把「哪些题解有题」的清单放进 globalData，`src/theme/DocItem/Layout/index.tsx`（已 swizzle）在正文末尾渲染 `<SelfTest>`，题目数据由组件在用户点开时 fetch。**题解 md 一行都不用改** —— 题库是唯一事实来源。详见「自测题库」小节。
- **知识图谱（题解 → 算法模式）** (`plugins/pattern-graph/index.ts`): 题解 frontmatter 的 `patterns` 是「题解 → 算法模式文档」的边，由 `scripts/gen-patterns.js`（`pnpm patterns:gen`）从 `tags` 机械推导（映射表在脚本里，`.agents/skills/leetcode-processor/SKILL.md` 有一份同步的）。插件在 `allContentLoaded` 里用 docs 插件给出的 `source`/`permalink`/`frontMatter` 建**反向索引**（pattern 文档 → 题目列表），只把标题/链接/难度发进 globalData；`src/components/training/pattern-graph/` 由已 swizzle 的 `DocItem/Layout` 在算法模式页末尾渲染「相关题目」，**md 一行都不用改**。改了题解 `tags` 后跑一次 `pnpm patterns:gen`。详见「知识图谱」小节。
- **算法可视化（手写 tracer，内嵌模式/数据结构文档）**: `src/components/training/visualizer/tracers/` 下每个算法是一个 tracer，只负责「跑一遍并记录状态」，播放/暂停/单步/换输入全部由通用 `AlgoPlayer` 提供。放置表在 `visualizer/inlinePlacement.ts`，**独立页已删除**（16 个 tracer 覆盖 16 篇文档）。录制式逐行回放（题解内嵌那份）已于 2026-11 删除，原因见「算法可视化」一节。
- **文档 permalink 映射** (`plugins/doc-permalinks/index.ts`): 全站 code-training 文档的「md 相对路径 → 真实 permalink」。自测与手写 tracer 两处都用它跳转。
- **静态重定向** (`plugins/static-redirects/index.ts`): 页面搬家后 `postBuild` 写一个 `<meta refresh>` HTML，保住已上线的旧地址。详见「板块根路径与旧地址」。

### 板块根路径与旧地址

**`/code-training` 与 `/docs` 这种「板块根」没有天然路由。** docs 插件只给
**真实存在的 doc 文件**生成路由，而两个 docs 目录下都**没有 `index.md`**：
落地页是 `intro.md`，permalink 自然是 `/code-training/intro` / `/docs/intro`。
于是板块根 404 —— 而且这个 404 静悄悄的：导航栏的「代码训练」是个
`dropdown`，六个条目全是 `category/*`，没有任何一处链到板块根。
（两个板块都已修：各自 `intro.md` 加了 `slug: /`。）

**两个连带坑**（`code-training/docs/intro.md` 两个都踩了，`docs/intro.md`
只踩第二个 —— 它正文里一条 markdown 链接都没有）：

- **页面上了一级，正文里的相对链接会全部失效。** `intro.md` 里写的是
  `category/题库`，在 `/code-training/intro` 上恰好解析成
  `/code-training/category/题库`；挂到根路径后同一个相对路径解析成
  `/category/题库`，构建直接 `Docusaurus found broken links` 失败。
  这种链接要改成**从站点根算的绝对路径**。
- **产物是 `build/code-training.html`，不是 `build/code-training/index.html`。**
  （`trailingSlash: false` 下一律 `<route>.html`。）写重定向时按
  `a/index.html` 去推断会推断错，于是自检报「目标不存在」并跳过写入 ——
  **重定向根本没生成，而日志照旧打印「写了 1 条」**（那是表的长度，
  不是真正写出的数量）。

**GitHub Pages 上 `X.html` 优先于 `X/` 目录**，所以 `code-training.html`
能被 `/code-training` 命中。实测证据就在产物里：`/code-training/tags`
既是 doc permalink（`tags.html`）又是目录（`tags/`，里面是各标签页），
线上访问它服务的是 `tags.html`（`class` 含 `docs-tags-list-page`）。
**别用 `docusaurus serve` 的结果来判断线上**—— 它对 `/code-training`
直接返回 200，而线上是 `301 → /code-training/ → 404`。

**站内硬链要一起改。** 首页「开始阅读」按钮原先写的是 `/docs/intro`，
改完 slug 之后它会跳一次重定向 —— 能用，但多一跳且搜索抓到的还是旧地址。
`grep 'href="/docs/intro"' build/` 应当无输出。

**旧地址为什么不直接让它 404**：`/code-training/intro` 与 `/docs/intro`
都是**已经上线**的 URL（书签、搜索引擎、外链都指着它们）。仓库里「博客旧 URL 故意 404」那条
规矩针对的是**被删掉**的内容，这里是**搬家**，性质不同。
（此口径已于 2026-11 反转：搬家不留旧地址，不再补重定向，见「URL 规则」。）
3.9.2 的 `plugin-content-docs` 已经**没有** `redirects` 选项了
（整个包里搜不到 `redirect` 这个词），`docusaurus-plugin-client-redirects`
又没装，所以 `plugins/static-redirects` 在 `postBuild` 里直接写 HTML：
`<meta http-equiv="refresh">` 在**没有 JS** 时也能跳，
再加 `<link rel="canonical">`。**只给「本来就 404」的路径加重定向没意义**，
站内链接请改源头。

### Dual-plugin docs setup

The site uses two `@docusaurus/plugin-content-docs` instances:
1. **Default** (id: `default`) — main docs at `/docs`, sidebar from `sidebars.ts`
2. **Code-training** (id: `code-training`) — algorithm training at `/code-training`, sidebar from `code-training/sidebars.ts`

### 博客已迁走（别再加回来）

真正的博客站是 **hanphone.cn**，这个仓库不再有博客。已删除：`blog/`（5 个文件）、
classic preset 里的 `blog` 选项、导航栏「博客」项、`src/theme/BlogLayout/` 与
`src/theme/BlogPostPage/`、giscus 的 `blogCategory`/`blogCategoryId`。

旧 URL（`/blog/welcome` 等）**故意让它 404**，没加重定向 —— 用户明确选的。
本仓库也没有从私人笔记库同步内容的通道，博客文章只存在于 hanphone.cn。

`@docusaurus/plugin-content-blog` 还留在 `dependencies` 里：preset-classic 依赖它，
即使不配 blog 选项也会被装上，删掉只会让 lockfile 动。

### Custom pages

- `src/pages/stars/index.tsx` — GitHub Stars showcase with search, tag filter, sort, card/list views
- `src/pages/projects/index.tsx` — GitHub projects showcase with search, sort, card/list views
- `src/components/GiscusComments.tsx` — Giscus comment widget, used in swizzled theme components

### Swizzled theme components

- `src/theme/DocItem/Layout/` — Custom doc item layout (adds Giscus comments to docs)

### CI/CD (GitHub Actions)

- **deploy.yml**: Triggered on push to `main`. Fetches latest GitHub data (stars/projects, no commit), builds Docusaurus site and deploys to GitHub Pages.
- **refresh-data.yml**: Daily at 3am UTC. Fetches stars and projects via `scripts/fetch-stars.js` / `scripts/fetch-projects.js`, then rebuilds and redeploys. Data is used at build time only — **never committed to git**, keeping history clean. `data/*.json` are fallback snapshots for local development.
- **sync-leetcode.yml 已删除**（2026-10-25）。原因不在接口改版：`LEETCODE_SESSION` 过期后 `/api/submissions/` 一律返回 `HTTP 401 {"detail":"身份认证信息未提供。"}`（不带 cookie 与带过期 cookie 的报文完全一样），而仓库里**没有 `SYNC_PAT`/`STARS_PAT`**，`GITHUB_TOKEN` 又改不了 secret，于是脚本每次算出的新 cookie 都只落到 runner 的临时文件里就随机器销毁 —— 自动续期从来没真正闭环，断一次就永久失败（10-21 还是绿的，10-23 起连续两次红）。**脚本保留，只作同步逻辑的参考实现**，需要时由 AI/agent 手动跑。
- **NowCoder sync**: No scheduled workflow and no routine manual sync. `scripts/sync-nowcoder.js` is kept only for AI/agent use when explicitly requested; it still needs `NOWCODER_COOKIE` / `NOWCODER_UID`.
- **两个部署 workflow 的步骤必须逐条对齐（deploy.yml 与 refresh-data.yml）。** `static/pyodide/` 已 gitignore，CI 每次都要 `node scripts/fetch-pyodide.js` 现下。refresh-data.yml 早先漏了这一步，于是**每天的定时刷新都会用一份不含运行时的产物覆盖线上**：构建不失败，站点照常上线，只有读者点题解里的「▶ 运行」时浏览器 fetch `/pyodide/pyodide.mjs` 得到 404，报 `Failed to fetch dynamically imported module`。两个 workflow 现在都有 `Fetch Pyodide runtime`，并在 build 之后加了 `Verify Pyodide runtime is in the artifact`（查 `build/pyodide/pyodide.mjs` 是否存在）—— 这类缺口**永远不会让 `pnpm build` 失败**，只能显式挡住。
- **两个 workflow 都必须是 `build` → `deploy` 两个 job，上传与部署不能塞进同一个 job。** `upload-pages-artifact` 的产物要过零点几秒才在 Pages API 里可见，同一 job 里紧挨着调 `deploy-pages` 是抢跑：2026-11-25 的定时刷新上传 12:16:33.835 finalized，部署 12:16:34.086 去查就拿到 `No artifacts named "github-pages" were found`；前一天同样写法间隔 730ms 才查，蒙混过关。**这不是偶发网络抖动，是缺一个 job 边界**——`deploy.yml` 一直是两个 job，`refresh-data.yml` 曾是一个 `build-and-deploy`，已改成同样的结构（`environment: github-pages` 挂在 deploy 上）。

### 字体：不用任何 Web Font

`src/css/fonts.css` 已删除（原本是 `@import` Google Fonts 的 Noto Sans SC）。
该域名在国内被墙，表现为首屏字体闪一下再回落（FOUT），外加每次访问一次失败请求。

现在 `--ifm-font-family-base` 是纯系统字体栈（`system-ui` + PingFang SC /
Microsoft YaHei / Noto Sans CJK SC），定义在 `src/css/custom.css` 顶部。
中文交给系统 CJK 字体渲染，零网络请求、零 FOUT。

**注意**：`docs/前端/UI设计基础.md` 里仍有 `fonts.googleapis` —— 那是教程正文里
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

### 尖括号只转义一次（`.vuepress/markdown/escape-stray-html.ts`）

正文里的 `<id>`、`<class 'int'>`、`左 < 根 < 右` 必须转成 `&lt;`，否则 VuePress 会把它们当 Vue 标签编译。**只在 `html_inline` token 上原地转义，并保持 `html_inline`**；`text` token 一个字都别动 —— markdown-it 的 text 渲染器自己会转义，提前塞 `&lt;` 会被再转一次（`&amp;lt;`），页面上显示成字面量 `&lt;`。迁移后 102 篇文档踩过这个坑（`左 < 根 < 右`、表格里的 `< 2s`），构建与日志全程正常，只能靠产物发现。`pnpm test:markdown` 钉住这件事。

### 加粗：`**` 与中文标点（`markdown-it-cjk-friendly`）

`**` 有两道闸门，全都在 CommonMark 的「左右翼定界符」规则里：

1. **`**` 后面紧跟空白就不能开**：`这是一个经典的** Flood Fill（洪水填充）**问题` 的星号会连同整句一起原样显示。
2. **闭合的 `**` 前一个字符是标点、后一个字符又既不是空白也不是标点时，同样不成立**：`**端口号（Port）**完成` 正好中招 —— 而这恰恰是中文里最顺手的写法。

第 2 类由 **hope 的 `@vuepress/plugin-markdown-ext` 的 `cjkFriendly`** 兜住：站点 `lang: 'zh-CN'` 时它**自动开启**，所以线上 `**中文（注）**后面` 是正常的，全站有 40 多处靠它。**别把 `lang` 改成非 CJK**，也别去关这个插件；`theme.ts` 的 `markdown` 块里有同样的注释。

`cjkFriendly` 兜不住的只有两类 —— 第 1 类（`**` 后跟空格）和**配对数量不对**（`**四个必要条件：` 开了不收、`**前后…***` 收错位置），再加上行内代码的反引号把星号吃进去（`` **反撇号（`）** ``）。这类只能改正文：2026-11 一次扫出 14 处，全部按「去掉多余空格 / 补齐闭合 / 反引号转义」修完。

**回归是 `pnpm test:bold`**：它用线上同一套规则（`vuepress/markdown` + `markdown-it-cjk-friendly`）渲染 `docs/`、`code-training/docs/` 与四个根页面，正文 text token 里出现字面 `**` 就红并列出 `文件:行号`。`markdown-it-cjk-friendly` 之所以是**直接 devDependency**（它本来只是 hope 的传递依赖），就是为了让测试和线上用同一份规则、而不是各写一份正则 —— 构建本身不会因为星号没生效而失败，只能显式挡住。

### 公式：KaTeX，不写进代码块

**复杂公式（分式、Σ/∏、上下标、多行推导）写 `$$...$$`，行内写 `$...$`；围栏只放代码、伪代码、ASCII 图与逐帧状态。** 写进围栏不会报错，只是分式只能画 ASCII 横线、下标靠 `_` 手写 —— 2026-11 一次扫出 19 处，BM25 那条最典型（三行 `─` 画出来的分数）。

几个容易踩的地方：

- **KaTeX 解析失败不会让构建失败。** `@mdit/plugin-katex-slim` 默认 `throwOnError: false`，坏公式渲染成 `<span class="katex-error">`（红字）照样出页面，日志里只有一行 `console.error`。`pnpm test:math` 用 `throwOnError: true` 渲染全站公式，是这条口径唯一的闸门。
- **中文进 `\text{}`**；`%`、`#`、`&` 要转义（`100\%`）；多行用 `\begin{aligned}`，`&` 对齐；`$$` 写在列表项里要按列表缩进，否则会把列表截断。
- **`|` 在表格里会切断单元格**：公式放进表格时用 `\vert` 或 `\lVert`，不要直接写 `|D|`。
- **长公式已经会自己横向滚**：`@vuepress/plugin-markdown-math` 自带的 `katex.css` 给 `.katex-display` 写了 `overflow: auto hidden`，别再在 `styles/index.scss` 里补一条（冗余，而且会盖掉它的滚动条样式）。
- **`machine-learning/**` 是 Quarto 生成的**：那边的公式要改源 `code-training/machine-learning/**.ipynb` 再 `pnpm sync:ml`，`test:math` 不查这个目录的围栏写法。

`scripts/check-math.mjs` 做两件事：先把围栏块与行内代码遮掉（`$DSH_HOME` 这类不能当公式配对），再逐个 `katex.renderToString(..., { throwOnError: true })`；然后用同一份遮罩扫「无语言 / `text` / `plaintext`」围栏里的 `Σ`、`∑`、`√`、`ln(`、`cos(` 与 ASCII 分数线。`log(` 不算信号 —— `console.log(` 和 `O(n log n)` 太常见。

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

**已经没有定时同步。** `sync-leetcode.yml` 于 2026-10-25 删除，脚本留着只作同步逻辑的参考实现，需要时由 AI/agent 显式调用（与 `sync-nowcoder.js` 同一个定位）。

- 用途：把力扣 (leetcode.cn) 已 AC 的提交同步为 `code-training/leetcode/{id}.{slug}.py` + `docs/problems/leetcode/*.md`。
- **手动跑**：`LEETCODE_SESSION="..." node scripts/sync-leetcode.js`。cookie 必须是**当次登录**拿到的，过期值只会得到 `HTTP 401 {"detail":"身份认证信息未提供。"}` —— 这个报文与「完全不带 cookie」一模一样，所以看到它不要怀疑接口改版。
- **为什么没有 workflow**：脚本本来每次调用都会从 `Set-Cookie` 拿到滚动续期的 `LEETCODE_SESSION` 并写进 `.lc-cookie.tmp`（已 gitignore），但仓库里没有 `SYNC_PAT`，`GITHUB_TOKEN` 无权改 secret，那一步永远走 `else`，新 cookie 随 runner 销毁。也就是说续期从未闭环，cookie 一过期（`LEETCODE_SESSION` 手工设于 2026-09-23，撑到 10-21）就永久失败。**要恢复定时同步**，得先加一个带 `Secrets: write` 的 PAT 并让它写回 secret，只补 cookie 治标不治本。
- **认证口径**：只带 `LEETCODE_SESSION` 一个 cookie 就够；提交列表走 `/api/submissions/?limit=&offset=`，题面/详情走 `/graphql/`（需 `Referer`/`Origin` 为 leetcode.cn）。
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

### 代码评测服务（judge-server）

题解页的「提交评测」由 `hanphone-blog/judge-server` 提供：Express + PostgreSQL +
**go-judge** 沙箱，首期只跑 Python。文档站**运行时不硬依赖**它：`JudgePanel`
先查 `/v1/problems`，服务不可用就静默隐藏按钮；构建、离线 PWA、Pyodide 跑样例都不受影响。

- 服务端代码：`/home/hanphone/develop-projects/hanphone-blog/judge-server`；
  本地起法见那边的 `README.md` / `DEPLOYMENT.md`。
- 前端：`src/components/training/judge/`；`SnippetBar` 多了 `judgeId`，
  只有「## 完整代码实现」块会拿到 `judge-id`（`.vuepress/plugins/training.ts`）。
- 题目 ID：`judgeIdOf()`（`src/components/training/judge/id.ts`）把
  `platform + id` 归一成 `leetcode-1` / `nowcoder-hj80`。生成器与服务端导入
  都用同一条规则；改规则要同时改两边。
- 测试数据：LeetCode 优先用 `newfacade/LeetCodeDataset`，由
  `pnpm judge:gen -- --dataset <jsonl.gz> --out <judge-server/data/problems> --only leetcode-1`
  生成。生成器会先跑数据集参考解、再跑文档解，两边都通过的用例才保留；
  默认 25 个 active、全量保留。牛客/CodeFun/自定义题后续用参考解 + CYaRon/ojgen 生成。
- 数据不进公开仓库：`judge-server/data/` 已 gitignore；生成物只放服务端。
- 不要给 C/Java 代码块挂提交按钮：首期只支持 Python，`language` 字段会拒绝。
- 改比较口径时，`judge-server/src/compare.ts` 与
  `src/components/training/pyrunner/compare.ts` 必须同步，并跑
  `judge-server` 的 `pnpm test`。
- 回归：`pnpm typecheck`、`pnpm test:judge`、`pnpm test:pyrunner`、
  `pnpm test:pyodide`、`pnpm build`；前端不给 `judge-server` 增加构建期请求。

### 知识图谱（题解 → 算法模式）

「想做 BFS / DFS / 动态规划的题，去哪找」的答案就是这条边。

```bash
pnpm tags:fetch      # 从 leetcode.cn 官方 topicTags 补全题解 tags（联网，幂等）
pnpm tags:normalize  # 把历史 tags 归一化到词表（BFS→广度优先搜索…）
pnpm patterns:gen    # 从题解 tags 推出 patterns 字段，写回 frontmatter（幂等）
pnpm check:docs      # 顺带校验每个 patterns 路径真的存在
```

- **标签词表与归一化映射在 `scripts/tag-vocabulary.js`**（`SYNONYMS` +
  `TAG_TO_PATTERNS`），三个脚本共用，`SKILL.md` 的「标签词表」是它的文档版。
- `fetch-leetcode-tags.js` 只增不删：读官方 `topicTags` 的**中文** `translatedName`，
  归一化后追加到已有 tags 后面；网络失败的题跳过、可重跑。
- **边存在题解 frontmatter 的 `patterns` 里**，值是 `../../patterns/<slug>.md`。
  它是**从 `tags` 机械推导**的（`gen-patterns.js` 的 `TAG_TO_PATTERNS`），
  所以题解「顺带提到」的标签也会连上一条边 —— 要更准就打开正文手工微调。
  tag 里没有对应模式的（字典树 / 单调栈 / 前缀和 / 并查集…）**留空即可**，
  空数组是合法状态；宁少一条边，不要一条错的边。
- **`plugins/pattern-graph`** 在 `allContentLoaded` 里把它做成**反向索引**
  （pattern 文档 → 题目列表）。permalink 必须取 docs 插件给的
  （`0001_two_sum.md` → `/1`、`HJ48.xxx.md` → `/HJ48`），自己拼必错 ——
  与 `plugins/doc-permalinks` 同一套取法。
- **渲染接缝和自测一样**：`src/components/training/pattern-graph/` 由已 swizzle 的
  `DocItem/Layout` 在 `</DocItemContent>` 之后渲染，`## 相关题目` 的 TOC 条目
  通过 `ExtraTocProvider` 补（md 里没有这个标题）。**md 一行都不用改。**
- 改动**既有**题解的 `tags` 之后记得重跑 `pnpm patterns:gen`；只改正文不用。

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

### 算法可视化（tracer + 关键帧图解）

站点只保留**手写 tracer**：16 个算法 / 数据结构，挂在 16 篇模式与数据结构文档里
（放置表 `src/components/training/visualizer/inlinePlacement.ts`，共 22 个播放器）。
每个 tracer 30~60 行，只负责「跑一遍并记录状态帧」，播放/暂停/单步/回退/
调速/改输入全部由通用 `AlgoPlayer` 提供。

**录制式逐行回放（题解页那份）已于 2026-11 整体删除**：`visualizer/recorder/`、
`visualizer/adapters/`、`static/traces/`（249 份 / 13.2MB）、题解页的注入与
离线包板块、`trace:record` / `test:adapters` / `check:vis` 全部移除。

删掉的原因是实测出来的，不是口味：

| 指标 | 删除前 |
|---|---|
| 轨迹 / 体积 | 249 份 / 13.2MB，进 git、进离线包 |
| 能播放 | 239 份（10 份 adapter 认不出） |
| 总帧数 → 不同画面 | 20,012 → 2,905（冗余 6.9×） |
| 超过 65% 帧重复的题 | 124 / 239 |
| 极端 | 0095 是 273 帧 / 4 张画面；HJ16 是 1500 帧（上限）/ 4 张画面 |

逐行录制的输入是**局部变量**，不是算法的概念状态：谁是窗口边界、DP 当前
算哪格，全靠变量名与取值形状猜。猜错不报错，只画错 —— 0104 递归深度 3 之后
高亮丢失、0042 接雨水只画了 left 一根指针、0072 编辑距离 124 帧里 99 帧
画面不动。这些都不会让构建或单测失败。**错的可视化比没有更糟**，所以整条
管线砍掉，而不是继续修。

规则就一条：**只画「状态本身就是算法」的东西**（窗口、栈、指针、DP 表、树、
并查集、排序过程）。讲「什么时候能贪心」「递归三要素」这类判断标准的页面
不摆播放器，硬摆只会添乱 —— `patterns/greedy.md`、`patterns/recursion.md`
至今没有。

#### 播放器长什么样

- md 里是**普通 Markdown 标题** `## 算法可视化`，播放器渲染在正文末尾
  （`plugins/training.ts` 往 token 流末尾插 `TracerVisualizerMount`）。
  这批文档走 `markdown.format: 'detect'`，实测被当作 CommonMark 解析，
  **不能写 JSX**（`<ProbeMarker />` 会被小写成 `<probemarker>`）。
- 每个播放器是一层 `<details>`：**一页里第一个默认展开，其余收起**。
  排序那一页有三个算法，全展开会把正文顶下去；全部收起又会让这节看起来
  只有一行标题。
- 折叠壳上的标题来自放置表的 `title`，不用 tracer 自己的 —— 壳是同步渲染的
  （SSR 里就要出现），而 `tracers/index.ts` 只能懒加载。
- 播放器与 tracer 模块都是 `React.lazy`：不展开就不下载。

#### 关键帧图解（静态图，优先于播放器）

不是所有算法都值得一个播放器。流程型的概念（窗口怎么缩、指针怎么排除、
区间怎么选、DP 表怎么填）用 **4~6 张关键帧 + 一句不变式** 就够，
而且静态图在 SSR 产物里、能搜索、手机能读、离线能看。

- **位置**：放在讲那一步的正文里，不放页尾。图前一句「看什么」，
  图后一句「所以为什么成立」；图里不要写大段说明。
- **画法**：draw.io，画布 700px、正文 ≥14px、节点内 ≤2 行。色块只用
  `#d5e8d4`（选中 / 答案）、`#ffe6cc`（当前）、`#dae8fc`（另一侧指针）、
  `#f5f5f5`（已排除），并在图上方给一行图例。
- **导出**：`export_drawio.sh --scale 3 --colors 32`。字多的图用 2x 在 2 倍屏
  上会被上采样发虚；3x 转 32 色后单张仍在 150KB 以内（实测 73~131KB）。
- **画布 700 宽是排版目标，不是导出边界**：drawio 按内容包围盒裁切，任何文字框
  或节点伸出 x=700 会让 PNG 直接变宽（33 曾导出 2312px，正文里看起来是图变宽、
  字变小）。导出后 `file` 一下，宽度应在 2006 左右；偏大就是有元素越界，
  先收回坐标，不要靠缩放压。
- **文件**：源文件 `static/diagrams/src/<slug>.drawio`，正文引
  `/diagrams/<slug>.png`。已有：滑动窗口、lower_bound、LCS 填表、
  对撞指针、归并合并、区间调度、BFS 队列、子集决策树、fib 递归树、DFS 遍历序。

#### 新增一个算法

1. 在 `visualizer/tracers/` 写 30~60 行 trace 函数，注册到 `tracers/index.ts`；
2. 在 `tracers/index.ts` 的 `INPUT_HINTS` 补输入提示（`formatInput` 必须由
   tracer 自己提供，播放器不能用 `String(value)` 兜底）；
3. 在 `inlinePlacement.ts` 加一条放置（`tracerId` + 可读 `title`）；
4. 在目标 md 里加 `## 算法可视化` 小节（有这一节才显得出播放器在讲什么）；
5. 跑 `pnpm test:tracers`。

**放置表、注册表、文档标题是同一件事的三个副本**，`test:tracers` 双向断言：
注册了没放置、放置了没标题、已经写了 `## 算法可视化` 却没放播放器，任何一条
都会红。少写一行，那个算法从此在任何页面上都不出现 —— 没有别的单测会失败。

#### 已经踩过的坑

- **`formatInput` 必须由 tracer 提供**：内部用 `String(value)` 兜底时，对象
  类型的 `defaultInput` 会变成 `"[object Object]"`，首屏 0 帧。
- **滑动窗口的 `left` 约定必须与题解一致**：题解是「left 指向被排除的重复
  字符、`ans = i - left`」。曾写成 `left = prev + 1` 却仍算 `i - left`，
  结果比正确答案少 1；断言「abcbbad = 3」抓住了它。
- **`frame.note` 是给读者看的纯文本，不是 markdown**；写 `**强调**` 会原样
  显示星号。
- **网格类 tracer 找到答案后不要再补「不可达」的尾帧**，画面会自相矛盾。
- **帧数上限 1500**（`MAX_FRAMES`），超限截断并插入提示帧。快排在 50 个元素上就可能几百帧。
- **`AlgoPlayer` 的 note 用 `[data-testid="note"]`**（`RecordedPlayer` 的
  `vis-note` 已不存在）。CSS module 类名是哈希过的，按类名查格子一个都
  查不到 —— 浏览器里验页面时一律按 `data-testid` 查
  （`cell` / `grid > *` / `tree-node` / `aux-array > *` / `dp-table td`）。
- **单测断言的是「最后一帧 == 独立参考实现的输出」**，不是「画面动过」。
  tracer 的状态记录错与算法本身写错都不报错，这套对拍是唯一的闸门。

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

**逐题验证「▶ 跑样例」按钮：`pnpm check:runbar`（121 篇全过）。**

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

**新写一篇题解的体检：`pnpm check:docs`（纯 Node、亚秒级）。**

两个功能是从文档**派生**出来的，而且**都不报错**：样例抽不出来 → 页面静默退化成
「手动填参数」；题库里没这道题 → 没有自测小节。
新 agent 很容易以为「写完就好了」，而这两个一个都不会自己出现。

每篇 `problems/` 下的题解报三行（运行条样例数 / 有无自测题 / frontmatter），
并把问题分成两级：

- **error**（退出码 1）：只有「新题一定能做对、且会让功能坏掉」的那些 ——
  frontmatter 缺必填字段、`patterns` 指向不存在的文件。
- **warn**（不影响退出码）：派生功能没到位。其中「抽不出样例」又分四种成因，
  **只有一种是这篇题解写得不对**（漏了 `输入：`/`输出：` 前缀）；
  另外三种是题面本来就那样：散文推演、操作脚本样例、环形链表的 `pos` 约定。
  把它们报成 error 的话这个脚本会**永久是红的**，而红着红的脚本等于没有。

现状以 `pnpm check:docs` 的输出为准（`error 0` 才算过）；4 篇 SQL 题没有
python 块，不计入。它只管 `problems/`，模式/数据结构页的播放器归 `test:tracers`。

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

- 用途：脚本保留给 AI/agent 在明确需要时，把新通过（accept=true）的题同步为 `code-training/nowcoder/{分类}/{题号}.{标题}.{ext}` + `docs/problems/nowcoder/*.md`。原来的定时 `sync-nowcoder.yml` 已删除；不再有定时或日常手动同步。
- **接口**：提交列表用 `POST /api/sparta/user/question-training/submission-history`（body `{pageNo,pageSize,userId}`，**公开接口，无需 cookie**）；提交代码抓 `GET /profile/{uid}/codeBookDetail?submissionId=`（HTML 第一个 `<pre>` 块，**需 cookie**）；题目难度/描述抓 `GET /practice/{uuid}`。
- **分类规则**：题号前缀 `HJ` → 华为机试、`SQL` → 牛客题霸-SQL篇、`ML` → 机器学习，否则按标题关键词判断。
- **标题匹配去重**：牛客题号会变动（如 HJ16↔HJ85），所以按**题目名**与本地文件比对（忽略空格/大小写），已存在的跳过，不重复生成。
- **所需环境变量**：`NOWCODER_COOKIE`（完整 cookie 串）、`NOWCODER_UID`（数字用户 ID）。
- **cookie 过期处理（牛客无自动续期）**：牛客没有力扣那样的服务器端滚动续期机制，认证 cookie 过期后必须手动重新登录更新。但提交列表接口是公开的，所以 cookie 失效时脚本**降级运行**：仍同步新题生成「代码待补充」占位文档，打印 `COOKIE_EXPIRED=true`。现在没有定时 workflow，也没有日常手动同步；只有 agent 明确调用脚本时才需要处理该标记，看到它就去更新 `NOWCODER_COOKIE`。牛客「记住我」登录后 cookie 通常有效数个月，更新频率很低。
- **`checkCookie()` 是三态的，别退化成布尔**：`'expired'` 只在**真的落到登录页**时返回（跟随 302 后的最终 URL 含 `/login`、或正文是登录页标题/含 `callBack=`＋`/login`），此时才打印 `COOKIE_EXPIRED=true`；网络错误、非 2xx、超时一律是 `'unknown'`，打印 `COOKIE_UNKNOWN=true`，脚本只打印警告然后继续。**早先是「抛异常 = cookie 失效」**，牛客抽风一次就会误报，还让人去换一个其实没坏的 cookie。所以 `fetchText` 旁边多了个 `fetchPage`（返回 `{text, finalUrl}`）：判定必须看**重定向后的地址**，只信正文的话一个长得像登录页的中间页就能骗过它。
