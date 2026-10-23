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
| PWA | `@docusaurus/plugin-pwa`（全量 precache） | `@vuepress/plugin-pwa`（只 precache 外壳 2.5MB + 运行时缓存） |
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

- **首页**：`index.md` 只保留 hope 的 hero（`home: true`），下面的统计、入口卡片、
  差异化能力由 `.vuepress/components/HomeSections.vue` 渲染。数字来自
  `.vuepress/plugins/training.ts` 注入的 `__SITE_STATS__`（构建期真算，
  题解数 / 有轨迹的篇数 / 有自测题的篇数），内容增删会自动跟着变。
- **字体**：`.vuepress/styles/palette.scss` 的 `$vp-font` / `$vp-font-heading`
  与 JavaGuide 用同一套栈（Georgia + 苹方/思源宋体/雅黑，不加载 Web Font）；
  `index.scss` 里把 >=960px 的根字号提到 17px（JavaGuide 是 16px），
  正文行高 1.75。
- **导航栏阴影**：hope 默认 `0 2px 8px`，这里压成 `0 1px 2px rgb(0 0 0/4%)`
  加一条 `--vp-c-divider` 分隔线。
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

两个刻意的取舍：

- **只 precache 应用外壳**（`index.html` / `404.html` / `app-*.js` / `style-*.css`，
  约 2.5MB）。默认行为会把 622 个页面 chunk（39MB）全部塞进 precache，
  首次安装要下 42MB —— 文档站不需要「一次装完所有页面」。其余资源走
  Workbox 运行时缓存：页面 `NetworkFirst`、JS/CSS `StaleWhileRevalidate`、
  图片 `CacheFirst`、轨迹 JSON 与题库单独分桶。
- **`register-service-worker` 必须在 `load` 之前求值**。这个包的模块顶层就
  挂了 `addEventListener('load')`，而插件是在 `onMounted` 里**动态 import**
  它的；动态 import 落到 load 之后，那个 Promise 永远不会 resolve，
  Service Worker 静默不注册（本机 headless 稳定复现）。所以
  `.vuepress/client.ts` 里静态 `import 'register-service-worker'` 了一次，
  并在 `package.json` 里把它提成直接依赖。

## 还没做完 / 已知缺失

- **`pnpm check:vis --all`**：页面发现标记改成 `data-vis="recorded"`
  （React 孤岛，`id="visualizer"` 要等挂载后才有），服务器换成
  `python3 -m http.server`。**抽样模式（92 项）与 `--tracers`（86 项）
  已在迁移后全绿**；`--all` 的全站 800+ 项没有重跑。
- **`pnpm check:runbar`**：依赖纯函数 + Pyodide，未在迁移后全量复跑。
- **`plugins/*` 目录**是 Docusaurus 插件的壳子，现在只有 `py-samples` 的
  抽取函数、以及几个纯类型还在被引用。后续可以把抽取逻辑搬到
  `.vuepress/data/` 下，再删掉整个目录。
- **`src/pages/index.tsx`** 已删除（首页换成 hope 的 project home 布局）。
  旧的 hero + 卡片 + 统计设计还在 git 历史里，想要可以按 Vue 重写。

## 怎么加东西

- **加一篇文档**：放进 `docs/` 或 `code-training/docs/`，写 `sidebar_position`
  （或 `id` / `slug`），侧边栏会自动出现，URL 自动按规则生成。
- **加一个算法模式**：`tags` 写进题解 frontmatter，跑 `pnpm patterns:gen`，
  `patterns/` 下那篇页面末尾会自动出现「相关题目」。
- **加一个内嵌播放器**：在 `src/components/training/visualizer/inlinePlacement.ts`
  的放置表里加一行，`.vuepress/components/TracerVisualizerMount.vue` 会自动挂。
- **加一个整页 React 页面**：新建 `.vuepress/components/XxxMount.vue`（照抄
  `StarsMount.vue`），在 `.vuepress/client.ts` 注册，页面 md 里写 `<XxxMount />`。
