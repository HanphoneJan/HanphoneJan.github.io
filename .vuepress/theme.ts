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
