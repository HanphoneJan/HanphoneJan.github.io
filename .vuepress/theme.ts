import { hopeTheme } from 'vuepress-theme-hope'
import { getDirname, path } from 'vuepress/utils'
import navbar from './navbar.js'
import { docsSidebar, trainingSidebar } from './sidebar.js'

const __dirname = getDirname(import.meta.url)
const sourceDir = path.resolve(__dirname, '..')

/**
 * 博客插件只负责**分类 / 标签 / 时间轴 / 文章列表**四类归档页面，
 * 不引入博客正文板块（真正写文章的地方是 hanphone.cn）。
 *
 * JavaGuide 的 `/category/`、`/tag/`、`/timeline/` 就是 hope 的这套东西，
 * 而它们只统计「文章」：默认过滤掉了没有 `filePathRelative` 的生成页
 * （`/code-training/category/*`、`/code-training/tags` 那些）与首页。
 * 这里再收窄到两个内容目录，`stars.md` / `projects.md` 两个 React 孤岛
 * 就不会混进文章列表。
 *
 * 分类 / 标签 / 日期由 `.vuepress/plugins/taxonomy.ts` 在页面创建前写进
 * frontmatter，见那个文件头。
 */
const CONTENT_PREFIXES = ['docs/', 'code-training/docs/']

const isArchivePage = (page: {
  filePathRelative?: string | null
  frontmatter: Record<string, unknown>
}): boolean =>
  Boolean(page.filePathRelative) &&
  CONTENT_PREFIXES.some((prefix) => page.filePathRelative!.startsWith(prefix)) &&
  !page.frontmatter.home

export default hopeTheme({
  hostname: 'https://docs.hanphone.cn',
  logo: '/img/logo.svg',
  logoDark: '/img/logo-dark.svg',
  favicon: '/img/favicon.ico',
  // 导航栏用英文 wordmark；中文站名仍保留在 <title>、首页 hero 和页脚里。
  navbarTitle: 'MapleField',
  repo: 'https://github.com/HanphoneJan/HanphoneJan.github.io',

  // 旧站点是深色优先、跟随系统
  darkmode: 'switch',

  // JavaGuide 那套「干净」的观感：纯内容、无边框装饰
  pure: true,
  // 不用 hope 的自动 focus：它是「滚动进正文后自动隐藏」，
  // 读者没法主动进入/退出。沉浸阅读由 LayoutToggle.vue 的显式开关负责。
  focus: false,
  fullscreen: true,
  print: false,
  breadcrumb: false,
  themeColor: true,

  navbar,
  sidebar: {
    '/docs/': docsSidebar(sourceDir),
    '/docs.html': docsSidebar(sourceDir),
    '/code-training/': trainingSidebar(sourceDir),
    '/code-training.html': trainingSidebar(sourceDir),
    // 归档页（/article/、/category/*、/tag/*、/timeline/）不属于任何
    // 板块，没有 sidebar 配置时主题会为 200 多个标签页各打一条
    // "missing its sidebar config" 警告。给一个兜底空侧栏即可。
    '/': false,
  },

  // 每页正文信息：日期、分类、标签、字数、阅读时间。
  // 分类与标签会链接到下面 blog 插件生成的 `/category/<名>/`、`/tag/<名>/`。
  pageInfo: ['Date', 'Category', 'Tag', 'Word', 'ReadingTime'],

  footer: '寒枫的开荒地 · 技术文档与算法训练场',
  displayFooter: true,

  markdown: {
    align: true,
    codeTabs: true,
    mermaid: true,
    gfm: true,
    tasklist: true,
    figure: true,
    imgLazyload: true,
    imgSize: true,
    math: { type: 'katex' },
    // 站内链接写错时只警告，不阻塞构建（旧站点是 throw，
    // 但迁移期跨板块链接较多，先以日志暴露问题）
    linksCheck: { build: 'warn' },
  },

  plugins: {
    /**
     * 归档：`/article/` 文章列表、`/category/` 分类、`/tag/` 标签、
     * `/timeline/` 时间轴。站点**没有博客正文板块**，这里只用它的
     * 归档能力（JavaGuide 的这三类页面也是这么来的）。
     *
     * `excerpt: false` 是必要的：600 多页全部抽摘要会让构建多做一遍
     * 正文渲染，而归档页只需要标题 + 日期 + 分类/标签。
     * `star: '/star/'` 开启星标页；没有页面写 `star` frontmatter 时，
     * 归档侧栏和标签会被 CSS 自动隐藏，不会出现「星标 为空」。
     */
    blog: {
      filter: isArchivePage,
      excerpt: false,
      article: '/article/',
      category: '/category/',
      categoryItem: '/category/:name/',
      tag: '/tag/',
      tagItem: '/tag/:name/',
      timeline: '/timeline/',
      star: '/star/',
    },
    // 图片点击放大（PhotoSwipe：滚轮缩放 / 拖拽 / 手势）
    photoSwipe: true,
    // 本地搜索。用 @vuepress/plugin-search 而不是 slimsearch：
    // slimsearch rc.128 产出的 worker 是 ESM，但客户端按经典 worker 加载，
    // 线上会直接报 `Cannot use import statement outside a module`，搜索框打不开。
    search: true,
    // 评论：沿用原来的 Giscus 配置
    comment: {
      provider: 'Giscus',
      repo: 'HanphoneJan/HanphoneJan.github.io',
      repoId: process.env.GISCUS_REPO_ID || 'R_kgDOQn_P0g',
      category: 'Docs Comments',
      categoryId: process.env.GISCUS_CATEGORY_ID || 'DIC_kwDOQn_P0s4C3pOL',
      lang: 'zh-CN',
      // Giscus 在 iframe 里，外站样式进不去；用自定义主题 CSS 把它的
      // font-family 改成与正文一致（文件在 static/giscus/，已带 GitHub 主题
      // 的完整变量，只在末尾追加字体规则）。Giscus 要求 https 绝对地址。
      lightTheme: 'https://docs.hanphone.cn/giscus/light.css',
      darkTheme: 'https://docs.hanphone.cn/giscus/dark.css',
    },
    // PWA：可安装 + Service Worker 预缓存静态资源。
    // 12.9MB 的 Pyodide 运行时会被 maxSize 自动排除（它本来就靠运行时的
    // fetch + Cache API 缓存，见 pyrunner/runtime.ts）；894 个 HTML 页面
    // 也不进预缓存（cacheHTML: false），否则首次安装要下 69MB。
    // 读者离线时能打开已缓存过的页面，其余请求走网络；
    // 「把整个板块预先下下来」由 `/settings.html` 的离线包负责
    // （清单见 `.vuepress/plugins/offline-package.ts`）。
    pwa: {
      showInstall: false,
      themeColor: '#ffffff',
      update: 'available',
      // `maxSize` 就是 Workbox 的 `maximumFileSizeToCacheInBytes`（单位 KB），
      // 它同时管预缓存与图片，**不是**「整个预缓存的大小上限」。
      //
      // **别改回 2048。** 应用外壳 `assets/app-<hash>.js` 现在是 2.1MB
      // （2,115,209 B），刚好越过 2MB 线，会被 Workbox **静默跳过**：
      // 构建日志一切正常，而 `service-worker.js` 的预缓存清单里只有
      // index.html / 404.html / style / 两张 logo（约 1.6MB，因为它们自己的
      // 体积都远小于 2MB）。
      // 后果是全新安装、或者清过站点数据之后第一次就断网，`start_url`（`/`）
      // 拿不到外壳 → 浏览器离线错误页；线上靠 `assets` 路由的
      // StaleWhileRevalidate 在**第二次**访问时才把它补进缓存，所以平时
      // 看不出来。4MB 之后预缓存 3.68MB = 外壳 2.04 + 两张 logo 1.38 +
      // 样式 0.24，与设计预期一致。
      maxSize: 4096,
      cacheHTML: false,
      cacheImage: false,
      // 默认的 precache 会把 **1047 个 js/css/svg（46MB）** 全塞进来，
      // 首次安装先下 46MB —— 文档站不需要「一次装完所有页面」。
      // 这里只预缓存应用外壳（约 2.5MB），其余按需缓存：
      // 访问过的页面离线可看，没访问过的走网络。
      generateSWConfig: {
        // **别让预缓存里的 index.html 应答 `/`。**
        //
        // `directoryIndex` 默认是 `'index.html'`：Workbox 的预缓存路由会把
        // 「以 `/` 结尾」的请求补成 `index.html` 去预缓存里查，而预缓存是
        // **cache-first** —— 命中之后既不回网络、也不会自己更新。
        // 而 manifest 的 `start_url` 正是 `/`，安装版 PWA 每次都从这里启动，
        // 于是它会一直跑**首次安装时那份应用外壳**（旧的 `app-<hash>.js`），
        // 直到新 SW 被 skipWaiting 激活为止。
        //
        // 外壳里的页面 chunk 名字带构建哈希，部署一次就换名、旧文件被删；
        // 点站内链接时 `import()` 拿不到那些旧 chunk → vue-router 的这次导航
        // 直接中止，页面上「点了没反应」（见 client.ts 的 `router.onError`）。
        // 浏览器网页里大多是从搜索结果/书签直接落到某个深路径上，
        // 那个 HTML 走 NetworkFirst，所以拿得到新外壳 —— 这就是
        // 「PWA 里切换路由会卡、网页里不会」的由来。
        //
        // 置空之后导航一律落到下面的 NetworkFirst：在线时永远是新 HTML，
        // 离线才回退到 html-v2 里缓存的那份（首次接管后的那次重载就会写进去）。
        directoryIndex: null,
        globPatterns: [
          'index.html',
          '404.html',
          'assets/app-*.js',
          'assets/style-*.css',
          'img/**/*.svg',
        ],
        // 离线包（`/settings.html`）直接往下面这两条路由的缓存里写：
        // HTML -> `html-v2`，页面 chunk -> `assets`。所以**不需要为它新增
        // SW 路由**，而且语义正好：`html-v2` 是 NetworkFirst，在线永远拿新的、
        // 离线才回退到包里那份；chunk 名带哈希，进了缓存就是不可变文件。
        //
        // 顺带一个容易踩的点：`ExpirationPlugin` 只按 IndexedDB 里记的
        // 时间戳淘汰**它自己写进去的**条目（见 workbox-expiration 的
        // `CacheExpiration.expireEntries`），页面用 `cache.put()` 直接塞的
        // 那 800 多条不在它的账上 —— 所以 `maxEntries: 200` 不会把离线包
        // 挤掉，也不需要为了离线包把它调大。要清理请走设置页的「清除」。
        runtimeCaching: [
          {
            urlPattern: ({request}: {request: Request}) =>
              request.destination === 'document',
            handler: 'NetworkFirst' as const,
            options: {
              // 不要写 `networkTimeoutSeconds`。写了之后 Workbox 在 3 秒内
              // 拿不到网络响应就回退到缓存里的 HTML；而 HTML 引用的
              // `assets/app-<hash>.js` 是**带构建哈希**的 —— 部署一次就换名，
              // 旧缓存 HTML 指向的 chunk 已经不存在，整站会卡在
              // `Failed to fetch dynamically imported module`（首页尤其明显：
              // 内容原本全靠 JS 挂载，页面上只剩导航栏）。
              // 不设超时 = 网络慢也等真实的 HTML，只有真正离线才用缓存。
              cacheName: 'html-v2',
              expiration: {maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30},
            },
          },
          {
            urlPattern: ({request}: {request: Request}) =>
              request.destination === 'script' ||
              request.destination === 'style',
            handler: 'StaleWhileRevalidate' as const,
            options: {
              cacheName: 'assets',
              expiration: {maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60},
            },
          },
          {
            urlPattern: ({request}: {request: Request}) =>
              request.destination === 'image',
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'images',
              expiration: {maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90},
            },
          },
          {
            // 逐帧可视化轨迹：一篇一个 json，点开时才 fetch
            urlPattern: /\/traces\/.*\.json$/,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'traces',
              // 206 篇题解都有轨迹文件（`static/traces/`），上限低于这个数
              // 时离线包会在下完之后**立刻少几条**（Workbox 按 LRU 淘汰它
              // 自己写进去的条目），设置页上永远显示 200/206。
              expiration: {maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 180},
            },
          },
          {
            // 自测题库：一次下载，全站复用
            urlPattern: /\/quiz\/.*\.json$/,
            handler: 'StaleWhileRevalidate' as const,
            options: {cacheName: 'quiz'},
          },
        ],
      },
      apple: {
        icon: '/img/pwa/apple-touch-icon.png',
      },
      manifest: {
        name: '寒枫的开荒地',
        // 安装到桌面时优先用 short_name，之前只写「寒枫」，
        // 应用列表里跟站点名对不上
        short_name: '寒枫的开荒地',
        description: '技术文档与算法训练场：前端、后端、嵌入式、机器学习、AI Agent。',
        lang: 'zh-CN',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        categories: ['education', 'books', 'productivity'],
        icons: [
          {src: '/img/pwa/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
          {src: '/img/pwa/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
          {src: '/img/pwa/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable'},
          {src: '/img/pwa/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
        ],
      },
    },
    seo: {},
    sitemap: { changefreq: 'weekly' },
    // 旧地址：板块落地页从 /docs/intro 搬到 /docs，外链不能断
    redirect: {
      config: {
        '/docs/intro': '/docs',
        '/code-training/intro': '/code-training',
        // 学习资源已并入板块首页，旧地址继续可用
        '/code-training/resources': '/code-training',
        '/markdown-page': '/',
        // VuePress 会把文件名里的 `+` 消毒成 `_`（HTML+CSS+JS -> HTML_CSS_JS），
        // 这条旧 URL 已经在线上存在，补一个重定向。
        '/docs/前端/HTML+CSS+JS': '/docs/前端/HTML_CSS_JS',
      },
    },
    // 没有博客板块（归档用的 blog 插件在上面单独配置）
    catalog: false,
    feed: false,
    copyright: false,
  },
})
