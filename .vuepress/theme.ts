import { hopeTheme } from 'vuepress-theme-hope'
import { getDirname, path } from 'vuepress/utils'
import navbar from './navbar.js'
import { docsSidebar, trainingSidebar } from './sidebar.js'

const __dirname = getDirname(import.meta.url)
const sourceDir = path.resolve(__dirname, '..')

export default hopeTheme({
  hostname: 'https://docs.hanphone.cn',
  logo: '/img/logo.svg',
  favicon: '/img/favicon.ico',
  repo: 'https://github.com/HanphoneJan/HanphoneJan.github.io',

  // 旧站点是深色优先、跟随系统
  darkmode: 'switch',

  // JavaGuide 那套「干净」的观感：纯内容、无边框装饰
  pure: true,
  // 沉浸模式（正文聚焦、隐藏侧边栏）—— 右侧工具栏上的切换按钮
  focus: true,
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
  },

  // 每页正文信息：作者、分类、标签、字数、阅读时间
  pageInfo: ['Author', 'Category', 'Tag', 'Word', 'ReadingTime'],

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
    },
    // PWA：可安装 + Service Worker 预缓存静态资源。
    // 12.9MB 的 Pyodide 运行时会被 maxSize 自动排除（它本来就靠运行时的
    // fetch + Cache API 缓存，见 pyrunner/runtime.ts）；622 个 HTML 页面
    // 也不进预缓存（cacheHTML: false），否则首次安装要下几十 MB。
    // 读者离线时能打开首页与已访问过的页面，其余请求走网络。
    pwa: {
      showInstall: false,
      themeColor: '#2563eb',
      update: 'available',
      maxSize: 2048,
      cacheHTML: false,
      cacheImage: false,
      // 默认的 precache 会把 **622 个页面 chunk（39MB）** 全塞进来，
      // 首次安装要下 42MB —— 文档站不需要「一次装完所有页面」。
      // 这里只预缓存应用外壳（约 2.5MB），其余按需缓存：
      // 访问过的页面离线可看，没访问过的走网络。
      generateSWConfig: {
        globPatterns: [
          'index.html',
          '404.html',
          'assets/app-*.js',
          'assets/style-*.css',
          'img/**/*.svg',
        ],
        runtimeCaching: [
          {
            urlPattern: ({request}: {request: Request}) =>
              request.destination === 'document',
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'html',
              networkTimeoutSeconds: 3,
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
              expiration: {maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 180},
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
        statusBarColor: 'black-translucent',
      },
      manifest: {
        name: '寒枫的开荒地',
        short_name: '寒枫',
        description: '技术文档与算法训练场：前端、后端、嵌入式、机器学习、AI Agent。',
        lang: 'zh-CN',
        theme_color: '#2563eb',
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
        '/markdown-page': '/',
        // VuePress 会把文件名里的 `+` 消毒成 `_`（HTML+CSS+JS -> HTML_CSS_JS），
        // 这条旧 URL 已经在线上存在，补一个重定向。
        '/docs/前端/HTML+CSS+JS': '/docs/前端/HTML_CSS_JS',
      },
    },
    // 没有博客
    blog: false,
    catalog: false,
    feed: false,
    copyright: false,
  },
})
