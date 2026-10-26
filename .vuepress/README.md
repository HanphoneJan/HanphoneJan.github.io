# VuePress 迁移说明

2026-10 把站点从 Docusaurus 3.9 迁到 **VuePress 2 + vuepress-theme-hope**
（主题参照 JavaGuide 的配置）。

这份文档只写**迁移本身**：为什么这么拆、哪些地方一改就坏、还没做完的是什么。
站点功能（题解、可视化、题库、Pyodide）的说明在根目录 `AGENTS.md`。

## 一眼看懂

| | 迁移前 | 迁移后 |
|---|---|---|
| 框架 | Docusaurus 3.9（React / MDX） | VuePress 2 rc.28（Vue 3） |
| 主题 | `@docusaurus/preset-classic` + 自写 CSS | `vuepress-theme-hope` rc.110 |
| 构建 | `docusaurus build` → `build/` | `vuepress build .` → `.vuepress/dist/` |
| 内容 | `docs/` + `code-training/docs/` | 原样不动 |
| 交互件 | React（swizzle 注入） | React（Vue 壳子里挂 React root） |
| 搜索 | `@easyops-cn/docusaurus-search-local` | `@vuepress/plugin-search` |
| 评论 | 自写 `GiscusComments` | hope 的 `comment` 插件（同一套 Giscus 配置） |
| 数学 | `remark-math` + `rehype-katex` | `@vuepress/plugin-markdown-math`（KaTeX） |
| 图片放大 | 无 | PhotoSwipe（`plugins.photoSwipe`） |
| 沉浸模式 | 无 | hope `focus`（滚动进正文后自动隐藏导航/侧栏） |
| PWA | `@docusaurus/plugin-pwa`（全量 precache） | `@vuepress/plugin-pwa`（precache 外壳 3.7MB + 运行时缓存 + `/settings.html` 离线包） |
| 归档 | 仅 code-training 的分类/标签页 | `/article/`、`/category/`、`/tag/`、`/timeline/`（hope blog 插件） |
| 部署 | 上传 `build/` | 上传 `.vuepress/dist/` |

## 内容一行没改

456 篇 md 的正文、frontmatter、`:::note`、代码块、图片链接全部保留。
Docusaurus 的 `sidebar_position` / `id` / `slug` 也照旧读，没有批量改写。

唯一动过的正文是两处**构建就会炸**的写法在 markdown 层被兜住（见下），
不是逐篇改文件。

## URL：必须与旧站一致

`.vuepress/paths.ts` 负责把 md 映射成 URL，规则是从旧站产物里反推的
（522 篇逐条比对，0 条不符）：

```
docs/前端/Vue基础.md                                  -> /docs/前端/Vue基础.html
docs/intro.md                    (slug: /)           -> /docs.html
code-training/docs/intro.md      (slug: /)           -> /code-training.html
problems/leetcode/0001_two_sum.md (id: 1)            -> /code-training/problems/leetcode/1.html
problems/nowcoder/华为机试/HJ48.从…节点.md (id: HJ48)  -> /code-training/problems/nowcoder/华为机试/HJ48.html
```

最后一段：`frontmatter.slug` > `frontmatter.id` > 文件名。

### 为什么必须带 `.html`

`@vuepress/shared` 的 `inferRoutePath()` 会把任何不以 `.html` 结尾的路径
补成 `.html` 再查路由表。如果 `page.path` 是 `/docs`，客户端会去找
`/docs.html` —— 路由表里只有 `/docs`，于是**每一页都渲染成 404**
（实测 452 页全中，页面标题只有站名）。

所以 `paths.ts` 的输出一律带 `.html`，`page.path` 与产物文件名同时正确。

### 旧的无后缀 URL 还能用吗

能。GitHub Pages 对 `X` 会去找 `X.html`（Docusaurus 的 `trailingSlash: false`
本来就依赖这个行为）。旧书签、外链、搜索结果都指向无后缀地址，不需要重定向。

文件名里的 `+` 是个例外：VuePress 会把 `HTML+CSS+JS` 消毒成 `HTML_CSS_JS`，
旧 URL `/docs/前端/HTML+CSS+JS` 由 `theme.ts` 的 `redirect` 配置补一条。

## 外观与阅读体验

- **首页**：沿用迁移前 Docusaurus 的设计，但实现是 **Vue SFC 服务端渲染** ——
  `.vuepress/components/HomePage.vue`（样式是原 `index.module.css` 搬过去的
  CSS Module），`index.md` 只留 `home: true` + `<HomePage />`，主题自带的
  hero 用 CSS 藏掉（首页自带 hero）。统计数字取自注入的 `doc-permalinks` /
  `vis-traces` / `self-test` 三张清单，构建期真算，内容增删会自动跟着变。
  **不要改回 React 孤岛**：实测慢网络下 app bundle 没下载完时，React 版
  首页只显示导航栏，读者会以为「首页内容没加载」；Vue SSR 的内容直接在
  HTML 里，和 JS 无关。
- **字体**：`.vuepress/styles/palette.scss` 的 `$vp-font` / `$vp-font-heading`
  与 JavaGuide 用同一套栈（Georgia + 苹方/思源宋体/雅黑，不加载 Web Font）；
  `index.scss` 里把 >=960px 的根字号提到 17px（JavaGuide 是 16px），
  正文行高 1.75。
- **导航栏阴影**：hope 默认 `0 2px 8px`，这里压成 `0 1px 2px rgb(0 0 0/4%)`
  加一条 `--vp-c-divider` 分隔线。
- **导航栏字体**：`theme.ts` 的 `navbarTitle: 'MapleField'` 只替换导航栏
  wordmark，中文站名仍在 `<title>` / 首页 / 页脚。`index.scss` 把字体统一
  设在 `.vp-navbar` 上并复用 `--vp-font`（系统字体、衬线优先），搜索框显式
  `font-family: inherit`；桌面导航高度 `3.5rem`、导航项 `0.9375rem`、
  wordmark `1rem`。
- **Giscus 字体**：评论在 iframe 里，站点 CSS 改不到。`static/giscus/`
  下的 `light.css` / `dark.css` 是 hope 模板主题 CSS + 末尾字体覆盖，
  `theme.ts` 的 `lightTheme` / `darkTheme` 指向线上绝对 URL。升级 hope 时
  要同步更新这两个文件。
- **stars / projects 整宽布局**：两个 md 的 `containerClass` 分别挂
  `stars-page` / `projects-page`；`index.scss` 把 `[vp-content]` 的
  `--content-width` 限制放开并去掉主题页面标题（React 头部自带 h1）。
  卡片网格在桌面端 4 列，卡片内边距和行高都收紧过。两个 md 还设了
  `externalLinkIcon: false`，否则主题自动加的外链 ↗ 会和卡片标题里的
  图标重复。Stars / 项目卡片标题都跳 GitHub 仓库，文档入口是 meta 行
  末尾的书籍小图标（列表视图是右侧「文档」按钮）。
- **归档右侧面板切换**：主题 `InfoList` 的 `DropTransition` 在切换
  「文章 / 分类 / 标签 / 时间轴」时旧面板的 leave 过渡不结束，旧内容会
  留在 DOM 里、新面板停在 `opacity: 0`。`index.scss` 里改成按当前激活
  图标只显示对应 wrapper；那条规则不要删。
- **状态栏颜色**（移动端浏览器 / PWA）：浅色 `#ffffff`、深色 `#1b1b1f`。
  VuePress 的 head 去重按 `<meta name>` 判重，**写两条带 media 的
  theme-color 会丢掉第二条**；所以是「一条静态白 + 首屏脚本按系统偏好改黑
  + `client.ts` 的 MutationObserver 跟随站点里手动切换」三层。
- **沉浸阅读**：`.vuepress/components/LayoutToggle.vue`（JavaGuide 的
  `LayoutToggle` 同款）—— 右下角悬浮按钮切换 `html.layout-hidden`，
  隐藏导航/侧栏/目录并把正文放宽到 1000px 居中；状态存 localStorage，
  `config.ts` 的 head 里有一段首屏前脚本提前加 class，避免刷新闪一下。
  移动端不显示按钮，窄屏会自动退出（否则导航被藏掉又没有入口）。
  对应样式在 `index.scss` 的 `html.layout-hidden` 段。

## 三个接缝

### 1. 前端交互件：React 孤岛

`src/components/**` 是 React，代码量一万行以上（Pyodide 执行协议、trace
adapter、题库）。核心逻辑与框架无关，只有渲染层是 React，所以**没有重写**，
而是让它们跑在自己的 React root 里。

```
Vue 页面
  └── <SelfTestMount doc-id="…">        (.vuepress/components/)
        └── onMounted -> import('src/components/training/selftest/index.tsx')
              └── createRoot(div).render(<SelfTest … />)
```

- 组件源码里的 `@docusaurus/Link`、`@theme/Heading`、`usePluginData`
  等导入，由 `src/vuepress/compat/*` 提供替身，并在
  `.vuepress/config.ts` 的 Vite `alias` 里接上 —— **组件源码没改**
- 替身都是最小实现：`Link` 就是 `<a>`，`Heading` 就是 `<h2>`，
  `usePluginData('pattern-graph')` 读构建期 `define` 注入的
  `__SITE_DATA__`
- React 只在浏览器挂载（`onMounted`），所以这些区块**不在 SSR 产物里**。
  它们本来也都是「点开才算」的交互件，对 SEO 没有影响

### 2. 组件注入：markdown-it token 流

旧站点用 swizzle（`CodeBlock/Layout`、`MDXComponents` 的 h2、`DocItem/Layout`）
在固定位置插组件。VuePress 没有这套接缝，改成在 markdown-it 的 token 流里
插组件标签 —— VuePress 会把 markdown 渲染结果当 Vue 模板编译。

`.vuepress/plugins/training.ts`：

| 位置 | 组件 |
|---|---|
| 每个「能跑」的 python 代码块之后 | `SnippetBarMount` |
| `## 完整代码实现` 标题之后 | `RecordedVisualizerMount`（或 `NoVisStepsMount`） |
| 正文末尾 | `TracerVisualizerMount`、`PatternGraphMount`、`SelfTestMount` |

`PatternGraphMount` 只在文档**没有自己写** `## 相关题目` 时注入 ——
现有 11 篇模式页都手写了这一节，所以页面上看到的通常是手写列表，
不会出现两个同名小节。

数据由 `.vuepress/data/training-data.ts` 在构建期算好：复用旧的
`plugins/py-samples` 抽取函数、`vis-traces` 的 adapter 选型、题库清单、
`patterns` 反向索引。**只把「模式 -> 相关题目」这一张表**用 Vite `define`
注入客户端；题库（`/quiz/bank.json`）与轨迹（`/traces/*.json`）仍然按需 fetch。

### 3. 构建期生成页面：`createPage`

`/code-training/category/{题库,机器学习,数据结构,算法模式,复习系统}` 与
`/code-training/tags`、`/code-training/tags/<tag>`（162 个）在旧站是
Docusaurus 自动生成的。VuePress 不会生成，而板块落地页的正文直接链到它们，
所以 `.vuepress/plugins/catalogs.ts` 在 `onInitialized` 里自己 `createPage`。

### 4. 归档页：分类 / 标签 / 时间轴

`/article/`、`/category/`、`/tag/`、`/timeline/` 不在上面那套 `createPage` 里，
而是 **hope blog 插件**生成的（`theme.ts` 的 `plugins.blog`）。JavaGuide 的
同名页面就是这套东西 —— 所以观感、分页、右侧的作者/计数面板都是现成的，
不用自己写。

站点仍然没有博客正文板块：插件只负责归档，`isArchivePage` 把文章限定在
`docs/` 与 `code-training/docs/`，`stars.md` / `projects.md` / 首页都不进。

分类/标签/日期的口径只有一处（`.vuepress/taxonomy.ts`）：

| 维度 | 规则 |
|---|---|
| 分类 | 取目录：`docs/前端/...` → 前端；题解取 `platform`（缺失回退目录名） |
| 标签 | frontmatter `tags` 优先；没有时按标题关键词（`DOC_TAG_RULES`）推导 |
| 日期 | `date` > `date_added` > `last_updated`；都没有用 git 首次提交时间 |

`.vuepress/plugins/taxonomy.ts` 在 `extendsPageOptions` 里把这些写进
frontmatter。**必须在这个钩子做**：blog 插件的 `extendsPage` 读
`frontmatter.category/tags/date` 生成 `routeMeta`，而 `extendsPageOptions`
是页面创建之前唯一能改 frontmatter 的接缝。

两个容易忽略的点：

- 归档页是**目录形式**（`/timeline/` → `timeline/index.html`），不经过
  `paths.ts`，也别给它补 `.html`。GitHub Pages 会自动找 `index.html`。
- 从笔记同步来的 `docs/**` 里有不少文件**既没有 `title` 也没有 H1**，
  页面标题原本是空字符串，时间轴上就是一条空白。`taxonomy.ts` 统一用
  文件名兜底（`intro` / `index` 例外，它们靠正文 H1）。

`theme.ts` 里三个非默认选项都不是随手写的：`excerpt: false`（600 页不抽摘要）、
`star: false`（没有星标文章）、`sidebar: { '/': false }`（归档页不属于任何
板块，兜底空侧栏，否则每个标签页都会打一条 missing sidebar 警告）。

改推导规则后跑 `pnpm test:taxonomy`（11 项纯函数断言，钉住分类/标签/日期）。

星标不是按钮：在 md 的 frontmatter 写 `star: 1`（数字越大越靠前），重新
构建后出现在 `/star/`，归档页的「星标」标签和侧栏星标列表会自动出现。
没有星标时这两处由 CSS 隐藏，不再显示「星标 为空」。

## 踩过的坑（都不要再踩）

### Vue 模板会解析正文里的尖括号

VuePress 把渲染结果当模板再编译一遍，正文里的 `LR(0)<SLR(1)`、
`/scenarios/<id>/`、`<class 'int'>` 会被当成未闭合标签，构建直接失败
（`Element is missing end tag`）。

`.vuepress/markdown/escape-stray-html.ts` 在 markdown-it 层只放行真正的
HTML 标签，其余 `<` 一律转义成 `&lt;`。**不要改成逐篇改正文** —— 同步脚本
下次写入还会带回来。

### hope 不会自动加载 `.vuepress/styles/index.scss`

rc.110 里 `userStyle` 没有被接进 sass-palette，主题色与自定义样式都不生效
（表现是导航高亮一直是默认的绿色）。修法：

- 主题色 / 布局变量放进 `.vuepress/styles/config.scss`、`palette.scss`
- 自定义规则放进 `.vuepress/styles/index.scss`，并在 `.vuepress/client.ts`
  **显式 `import './styles/index.scss'`**

### 不要用 slimsearch

`@vuepress/plugin-slimsearch` rc.128 产出的 worker 是 ESM（`import … from
"vuepress/shared"`），客户端却按经典 worker 加载，线上直接报
`Cannot use import statement outside a module`，搜索框打不开。
现在用 `@vuepress/plugin-search`，中文按 `Intl.Segmenter` 分词，
「动态规划」这类查询是能命中的。

### VuePress 2 没有 `vuepress serve`

CLI 只有 `dev` / `build` / `info`。预览用
`python3 -m http.server 3000 --directory .vuepress/dist`
（URL 都带 `.html`，不需要无扩展名解析）。

### Vite 8 默认不转 JSX

`vuepress build` 会报 `PARSE_ERROR: Unexpected JSX expression`。需要显式打开：

```ts
oxc: { jsx: { runtime: 'automatic' } }
```

同时 Vite 的 `dynamic-import-vars` 会用不支持 JSX 的解析器扫 `.tsx`，
要把它排除：`build.dynamicImportVarsOptions.exclude: [/\.tsx?$/, /\.vue$/]`。

### hope 的侧边栏 key 要跟着 `.html` 走

`sidebar` 的键是路径前缀。`page.path` 变成 `/docs.html` 之后，只配 `/docs/`
会报 `missing its sidebar config`，两个键都要给。

## PWA

`plugins.pwa` 已启用，构建产物里有 `manifest.webmanifest` 与 `service-worker.js`，
首屏加载后自动注册并接管页面。

几条刻意的取舍（每条都对应一个线上症状，改之前先看注释里的因果）：

- **只 precache 应用外壳**（`index.html` / `404.html` / `app-*.js` / `style-*.css`，
  约 2.5MB）。默认行为会把 622 个页面 chunk（39MB）全部塞进 precache，
  首次安装要下 42MB —— 文档站不需要「一次装完所有页面」。其余资源走
  Workbox 运行时缓存：页面 `NetworkFirst`、JS/CSS `StaleWhileRevalidate`、
  图片 `CacheFirst`、轨迹 JSON 与题库单独分桶。
- **`generateSWConfig.directoryIndex: null` —— 预缓存不许应答 `/`。**
  Workbox 默认 `directoryIndex: 'index.html'`：预缓存路由会把「以 `/` 结尾」
  的请求补成 `index.html` 去查预缓存，而预缓存是 **cache-first**。manifest 的
  `start_url` 恰好就是 `/`，于是安装版 PWA 每次启动都拿到**首次安装时那份
  `index.html`**，里面的 `app-<hash>.js` 也是旧的；新部署删掉旧 chunk 之后，
  站内跳转（`beforeResolve` 里 `await import(页面 chunk)`）拿不到文件，
  这次导航直接中止 —— 页面上就是「点了没反应」。
  浏览器网页里大多从搜索结果 / 书签落到深路径，那些 HTML 走 `NetworkFirst`，
  所以不会出现；这就是「PWA 里切路由会卡、网页里不会」的由来。
  置空后 `/` 也走 `NetworkFirst`：在线永远是新 HTML，离线回退到 `html-v2`
  里缓存的那份（首次被 SW 接管后的那次重载就会写进去，实测离线启动正常）。
- **HTML 的 `NetworkFirst` 不能设 `networkTimeoutSeconds`。** 设了之后
  Workbox 在超时（原来的 3 秒）就回退到缓存 HTML，而 HTML 引用的
  `assets/app-<hash>.js` 每次部署都会换名 —— 旧 HTML 指向的 chunk 已不存在，
  页面会卡在 `Failed to fetch dynamically imported module`。首页曾经因此
  「首次进入只有导航栏」：React 首页本来就靠 JS 挂载，chunk 拉不到就是空白。
  现在网络慢也等真实 HTML，只有真正离线才用缓存；缓存名改成 `html-v2`，
  让旧缓存失效一次。
- **chunk 加载失败要自愈**：`.vuepress/client.ts` 在 `router.onError` 里拦
  `Failed to fetch dynamically imported module` 这一类错误，**整页打开目标地址**
  （HTML 是服务端渲染的，内容一定在），而不是留一个点不动的页面。同一目标
  60 秒内只救一次，防止「跳转 → 新文档又失败」的刷新循环。
- **回到前台时查一次 SW 更新**（`visibilitychange`，30 分钟节流）。安装版 PWA
  很少整页导航，浏览器就不会去检查 `service-worker.js`；主动查一次，
  新版本才会通过插件自带的「新内容已就绪」按钮生效。
- **`register-service-worker` 必须在 `load` 之前求值**。这个包的模块顶层就
  挂了 `addEventListener('load')`，而插件是在 `onMounted` 里**动态 import**
  它的；动态 import 落到 load 之后，那个 Promise 永远不会 resolve，
  Service Worker 静默不注册（本机 headless 稳定复现）。所以
  `.vuepress/client.ts` 里静态 `import 'register-service-worker'` 了一次，
  并在 `package.json` 里把它提成直接依赖。
- **站内链接必须带 `.html`**：`/docs`、`/stars` 这类无后缀地址不会命中
  VuePress 的路由（路由是 `/docs.html`，见 `paths.ts`），点击会退化成
  **整页导航**。首页的按钮与卡片曾经就是这种写法（`HomePage.vue`），
  在 PWA 里表现为「点了没反应 / 白等」—— 现在全部带 `.html`。
- **`maxSize` 是 `4096`，别改回 `2048`。** 它是 Workbox 的
  `maximumFileSizeToCacheInBytes`（单位 KB），不是「整个预缓存的上限」。
  应用外壳 `assets/app-*.js` 已经长到 **2.04MB**，越 2MB 线之后会被
  **静默跳过**：构建日志一切正常，而 `service-worker.js` 的预缓存清单里
  只剩 index / 404 / style / 两张 logo（约 1.6MB）。后果是全新安装（或清过
  站点数据）之后第一次断网，`start_url` 拿不到外壳 → 浏览器离线错误页；
  网页端靠 `assets` 路由的 StaleWhileRevalidate 在**第二次**访问时补上，
  所以平时看不出来。改回 4MB 后预缓存是 3.68MB（外壳 2.04 + 两张 logo
  1.38 + 样式 0.24）。

### 离线包与缓存管理（`/settings.html`）

`settings.md` + `.vuepress/components/CacheSettings.vue` 提供「像手机 App
设置页」的三件事：把内容下到本地、手动检查/应用 Service Worker 更新、
手动清除。**没有新增任何 SW 路由**，全部落在已有的缓存桶上：

| 内容 | 缓存桶 | 策略 |
|---|---|---|
| 页面 HTML | `html-v2` | `NetworkFirst`（在线永远是新的，离线回退缓存） |
| 页面 chunk | `assets` | `StaleWhileRevalidate`（文件名带内容哈希，不可变） |
| 共享脚本（懒加载 chunk） | `assets` | 同上 |
| 题解轨迹 JSON | `traces` | `CacheFirst` |
| 自测题库 | `quiz` | `StaleWhileRevalidate` |
| Python 运行时（Pyodide 12.9MB） | `pyodide-runtime-v1` | 页面内 fetch 拦截（见 `pyrunner/runtime.ts`） |

- **「共享脚本」是必需的，别当成可有可无的 3MB。** 页面 chunk 之外还有一批
  懒加载 chunk：跑代码的 `SnippetBar-*.js` / `runner-*.js`、改代码的
  `CodeEditor-*.js`、mermaid 与 KaTeX 的几十个小 chunk。它们不属于任何一条
  路由（路由表里没有），只下载页面 + 页面 chunk 的话，索引里「预先下好的
  题解页」离线打开是**能读但运行条根本不出现** —— 这一条是实测出来的：
  只缓存 Python 运行时后断网跑样例，卡在「运行中…」，控制台报
  `Failed to fetch dynamically imported module: assets/runner-*.js`。
  清单里用「`assets/*.js` 减去页面 chunk、减去已进预缓存的外壳」筛出来，
  `scripts/test-offline.ts` 断言它不与页面 chunk 重复（重复会让页面多下一遍）。
- **Python 运行时（Pyodide，12.9MB）也在离线包里**：文件清单与缓存名放在
  `src/components/training/pyrunner/runtime-files.ts`，客户端 fetch 拦截、
  构建期清单、设置页三方共用这一份 —— 只改一处就会出现「显示已缓存，点运行
  还是要下 13MB」。wasm / stdlib / lock 进自己的 `pyodide-runtime-v1`
  （fetch 拦截读它）；**两个 `.mjs` 还要额外在 `assets` 里放一份**：
  `import()` 走模块加载器、**不经过**那个 fetch 拦截，但会经过 SW 的 script
  路由（读 `assets`）。只放前一个桶时，离线跑代码卡在
  `Failed to fetch dynamically imported module: /pyodide/pyodide.mjs` ——
  wasm/zip 都命中了，就这一步过不去。`static/pyodide/` 是 gitignore 的，
  本地没 `pnpm sync:pyodide` 时这块直接不出现。
  实测（`localhost` 断网、题解页点「▶ 跑样例」）：三组样例全过。
- **清单是构建期生成的**：`.vuepress/plugins/offline-package.ts` 在
  `onGenerated` 里写 `offline-manifest.json`（889 页 + 206 份轨迹 + 13MB
  运行时 ≈ 123MB，
  `docs` 121 / `training` 529 / `archive` 235 / `start` 4 / `traces` 206 /
  `quiz` 1）。页面 chunk 名从产物路由表读（`assets/app-*.js` 里的
  `` [`/路径`,{loader:()=>import(`./xxx.js`)``），**不能靠猜**：`/tag/*`
  这类生成页没有 md 文件，不同目录还有同名 `intro.md`。`sitemap.xml` 少
  240 条（标签页、分类页、归档页），也不能当清单来源。
- **`ExpirationPlugin` 不会淘汰页面用 `cache.put()` 塞进去的条目。** 它只按
  IndexedDB 里的时间戳结算**自己写进去的**那些（workbox-expiration 的
  `CacheExpiration.expireEntries`），所以 1100 条离线包待在
  `html-v2`（`maxEntries: 200`）里不会被挤掉，也不需要为它调大上限。
- **离线包必须绑构建版本。** HTML 引用的 `assets/<页面>-<hash>.js` 部署一次
  就换名。清单带 `build`（CI 只用 `GITHUB_SHA`，本地用 git HEAD，本地脏工作区
  才加时间戳 —— CI 的检出在 build 前就被 `fetch-stars.js` 写脏了，拿「脏」
  判断版本会让每天的定时重建都提示一次更新），下载成功记进 localStorage；
  两边不一致时页面标「需要更新」，
  重新缓存成功后把上一版遗留的 chunk 从 `assets` 里删掉 —— 不删的话每部署
  一次就多堆几十 MB，而 `ExpirationPlugin` 管不到它们。
- **只下 HTML 也能读，但点不动。** SSR 产物在 HTML 里，缺 chunk 时 Vue 只是
  不水合（导航会落到 `router.onError` 的整页重载）。「同时缓存页面脚本」
  不勾就是这种半残状态，页面上会显示「N 项缺脚本」。
- **删除是两步确认**：第一次点变「确认清除」，20 秒内再点才真删。**不要换成
  `window.confirm()`** —— 原生对话框会阻塞整个页面，自动化里点一下就卡死。
- **清掉预缓存桶之后要注销 SW 并重载**：预缓存只在 install 时填充，SW 脚本
  没变就不会重装，清空后它不会自己回来。
- **`traces` 的 `maxEntries` 是 300**（原来是 200）：`static/traces/` 有 206
  份，上限低于这个数时离线包刚下完就少几条，页面永远显示 200/206。
- 回归测试：`pnpm test:offline`（板块归类、路由表解析、真实产物的页面覆盖率
  与 chunk 存在性）。没有 dist 时只跑纯函数部分；两个部署 workflow 在
  build 之后都会跑它 —— 清单坏了**不会**让 build 失败。


## 依赖版本与升级

当前**精确锁定**（`package.json` 里是固定版本，不是 `^`）：

| 包 | 版本 |
|---|---|
| `vuepress` / `@vuepress/bundler-vite` / `@vuepress/core` | `2.0.0-rc.28` |
| `vuepress-theme-hope` | `2.0.0-rc.110` |
| `@vuepress/plugin-pwa` / `-search` / `-markdown-math` / `-photo-swipe` | `2.0.0-rc.128` |
| `vue` | `^3.5.44` |
| `react` / `react-dom` | `^19.0.0` |

**为什么没「升到稳定版」**：VuePress 2 到目前**没有 stable 发布** —— npm 上
`vuepress` 的 `latest` 仍然是 `1.9.10`（v1），2.x 只挂在 `next` 标签
（当前 `2.0.0-rc.31`）。也就是说 rc 就是 v2 的正式形态，没有可以「等」的
稳定版。hope 的 `latest` 已经是 `2.0.0-rc.110`，我们用的就是它。

升级时注意：

1. `@vuepress/*` 的 rc 版本之间 **peer 依赖咬得很死**（hope rc.110 要求
   helper/plugin 的 rc.128 一批），不要单独升某一个包；
2. 一次把 `vuepress` + `bundler` + `core` + 全部 `@vuepress/plugin-*`
   升到同一批版本，再 `pnpm install`；
3. 我们的代码依赖了几处内部行为（`inferRoutePath` 自动补 `.html`、
   `extendsPageOptions` 改写 `page.path`、hope 的 `userStyle` 缺口），
   升 rc 前必须在分支上跑一遍：
   `pnpm build` / `pnpm typecheck` / `pnpm check:docs` /
   `pnpm check:vis` / `pnpm check:vis --tracers`。

## 还没做完 / 已知缺失

- **`pnpm check:vis --all`**：页面发现标记改成 `data-vis="recorded"`
  （React 孤岛，`id="visualizer"` 要等挂载后才有），服务器换成
  `python3 -m http.server`。**抽样模式（92 项）与 `--tracers`（86 项）
  已在迁移后全绿**；`--all` 的全站 800+ 项没有重跑。
- **`pnpm check:runbar`**：依赖纯函数 + Pyodide，未在迁移后全量复跑。
- **`plugins/*` 目录**是 Docusaurus 插件的壳子，现在只有 `py-samples` 的
  抽取函数、以及几个纯类型还在被引用。后续可以把抽取逻辑搬到
  `.vuepress/data/` 下，再删掉整个目录。

## 怎么加东西

- **加一篇文档**：放进 `docs/` 或 `code-training/docs/`，写 `sidebar_position`
  （或 `id` / `slug`），侧边栏会自动出现，URL 自动按规则生成。
- **加一个算法模式**：`tags` 写进题解 frontmatter，跑 `pnpm patterns:gen`，
  `patterns/` 下那篇页面末尾会自动出现「相关题目」。
- **加一个内嵌播放器**：在 `src/components/training/visualizer/inlinePlacement.ts`
  的放置表里加一行，`.vuepress/components/TracerVisualizerMount.vue` 会自动挂。
- **加一个整页 React 页面**：新建 `.vuepress/components/XxxMount.vue`（照抄
  `StarsMount.vue`），在 `.vuepress/client.ts` 注册，页面 md 里写 `<XxxMount />`。
