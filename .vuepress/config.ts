import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { getDirname, path } from 'vuepress/utils'
import type { App, PageOptions } from 'vuepress/core'
import theme from './theme.js'
import { legacyPathFor } from './paths.js'
import { markdownEnhancePlugin } from './plugins/markdown-enhance.js'
import { trainingPlugin } from './plugins/training.js'
import { catalogsPlugin } from './plugins/catalogs.js'

const __dirname = getDirname(import.meta.url)

/**
 * 保留旧 Docusaurus 站点的 URL。
 *
 * 直接让 VuePress 按文件路径生成 URL 的话，`code-training/docs/problems/...`
 * 会多出一层 `/docs`，力扣题解的 `0001_two_sum` 也不会被压成 `1`。
 * 那意味着**所有已经在线上存在的链接全部 404**（书签、搜索引擎、站内
 * 自测与知识图谱的跳转都指着旧地址）。
 *
 * VuePress 的 `extendsPageOptions` 允许在页面创建前改写 `options.path`，
 * 而 `options.path` 优先级最高（见 @vuepress/core 的 resolvePagePath），
 * 于是 `page.path` 与产物 HTML 路径会一起跟着走，不需要再补一层重定向。
 */
const legacyPermalinks = (app: App) => ({
  name: 'legacy-permalinks',
  extendsPageOptions(options: PageOptions) {
    if (!options.filePath) return
    const target = legacyPathFor(app.dir.source(), options.filePath)
    if (target) options.path = target
  },
})

export default defineUserConfig({
  lang: 'zh-CN',
  title: '寒枫的开荒地',
  description:
    '技术文档与算法训练场：前端、后端、嵌入式、机器学习、AI Agent，以及可运行、可回放的算法题解。',

  head: [
    // 沉浸阅读：首屏前就把上次的状态贴到 <html> 上，避免刷新时先闪一下
    // 导航栏/侧边栏（LayoutToggle.vue 负责按钮与切换）。
    [
      'script',
      {},
      `try{if(window.innerWidth>=960&&localStorage.getItem('hanphone-layout-hidden')==='true'){document.documentElement.classList.add('layout-hidden')}}catch(e){}`,
    ],
    // 域名重定向：www.hanphone.top → hanphone.cn
    [
      'script',
      {},
      `(function(){if(window.location.hostname!=="www.hanphone.top")return;var r,path=window.location.pathname,search=window.location.search,hash=window.location.hash,rules=[{from:"/tool",to:"/tools"},{from:"/tools",to:"/tools"},{from:"/game",to:"/games"},{from:"/games",to:"/games"},{from:"/play",to:"/play"}];for(var i=0;i<rules.length;i++){r=rules[i];if(path===r.from||path.indexOf(r.from+"/")===0){window.location.replace("https://hanphone.cn"+r.to+path.slice(r.from.length)+search+hash);return}}})();`,
    ],
    ['meta', { name: 'robots', content: 'all' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
  ],

  bundler: viteBundler({
    viteOptions: {
      // Vite 8 的 oxc 默认保留 JSX，交给框架插件处理；站点里没有
      // @vitejs/plugin-react，这里显式打开 React 17+ 的 automatic runtime。
      oxc: {
        jsx: { runtime: 'automatic' },
      },
      build: {
        // Vite 的 dynamic-import-vars 插件会用**不支持 JSX** 的解析器
        // 去扫所有含 `import(` 的文件，`.tsx` 一律解析失败并中断构建。
        // 我们没有任何「变量路径」的动态导入，直接把它从扫描范围里排除。
        dynamicImportVarsOptions: {
          exclude: [/\.tsx?$/, /\.vue$/],
        },
      },
      resolve: {
        alias: {
          // 旧代码里大量 `@site/...` 导入，保持可用
          '@site': path.resolve(__dirname, '..'),
          // 交互组件是 React 写的，这里把它们的 Docusaurus 依赖指到替身，
          // 组件源码一行都不用改（见 src/vuepress/compat/）
          '@docusaurus/Link': path.resolve(__dirname, '../src/vuepress/compat/Link.tsx'),
          '@docusaurus/useBaseUrl': path.resolve(
            __dirname,
            '../src/vuepress/compat/useBaseUrl.ts',
          ),
          '@docusaurus/useGlobalData': path.resolve(
            __dirname,
            '../src/vuepress/compat/useGlobalData.ts',
          ),
          '@docusaurus/useDocusaurusContext': path.resolve(
            __dirname,
            '../src/vuepress/compat/useDocusaurusContext.ts',
          ),
          '@docusaurus/plugin-content-docs/client': path.resolve(
            __dirname,
            '../src/vuepress/compat/docsClient.ts',
          ),
          '@docusaurus/BrowserOnly': path.resolve(
            __dirname,
            '../src/vuepress/compat/BrowserOnly.tsx',
          ),
          '@docusaurus/ExecutionEnvironment': path.resolve(
            __dirname,
            '../src/vuepress/compat/ExecutionEnvironment.ts',
          ),
          '@docusaurus/theme-common/internal': path.resolve(
            __dirname,
            '../src/vuepress/compat/themeCommonInternal.ts',
          ),
          '@docusaurus/theme-common': path.resolve(
            __dirname,
            '../src/vuepress/compat/themeCommon.ts',
          ),
          '@theme/Heading': path.resolve(__dirname, '../src/vuepress/compat/Heading.tsx'),
          '@theme/Layout': path.resolve(__dirname, '../src/vuepress/compat/Layout.tsx'),
        },
      },
    },
  }),

  theme,

  // 静态资源仍然放在仓库根目录的 static/（图片、题库、轨迹、Pyodide）
  public: path.resolve(__dirname, '../static'),

  pagePatterns: [
    'index.md',
    'stars.md',
    'projects.md',
    'docs/**/*.md',
    'code-training/docs/**/*.md',
    '!**/node_modules/**',
  ],

  plugins: [legacyPermalinks, markdownEnhancePlugin, trainingPlugin, catalogsPlugin],

  shouldPrefetch: false,
  shouldPreload: false,
})
