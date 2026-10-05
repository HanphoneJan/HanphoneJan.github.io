import path from 'path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...

const config: Config = {
    title: '寒枫的开荒地',
    tagline: '技术文档与知识分享',
    favicon: 'img/favicon.ico',

    // 域名重定向：www.hanphone.top → hanphone.cn
    headTags: [
      {
        tagName: 'script',
        attributes: {},
        innerHTML: `(function(){if(window.location.hostname!=="www.hanphone.top")return;var r,path=window.location.pathname,search=window.location.search,hash=window.location.hash,rules=[{from:"/tool",to:"/tools"},{from:"/tools",to:"/tools"},{from:"/game",to:"/games"},{from:"/games",to:"/games"},{from:"/play",to:"/play"}];for(var i=0;i<rules.length;i++){r=rules[i];if(path===r.from||path.indexOf(r.from+"/")===0){window.location.replace("https://hanphone.cn"+r.to+path.slice(r.from.length)+search+hash);return}}})();`,
      },
    ],

    // SEO 元信息
    customFields: {
      keywords: [
        '技术文档', '知识库', '学习笔记',
        '前端开发', 'React', 'Vue', 'Next.js', 'Node.js', 'TypeScript',
        '后端开发', 'Java', 'SpringBoot', 'Django', 'FastAPI', 'Flask',
        '数据库', 'PostgreSQL', 'ClickHouse', 'SQL',
        'DevOps', 'Docker', 'Nginx', 'Linux',
        '嵌入式开发', 'STM32', 'ARM', 'ROS2',
        '机器学习', '深度学习', 'LLM', 'Transformer', 'LangChain', '大模型微调',
        'AI Agent', 'RAG', 'Cursor', '提示词工程',
        '算法', 'LeetCode', '数据结构与算法',
        'Git', 'WebSocket',
      ],
    },


    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
      v4: true,
    },

    // Set the production url of your site here
    // 必须与根目录 CNAME 一致（docs.hanphone.cn）。
    // 这个值决定 canonical URL / sitemap.xml / Open Graph / 结构化数据，
    // 配错等于告诉搜索引擎「我的正式地址在别处」。
    url: 'https://docs.hanphone.cn',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub Pages 是静态文件服务器，不会自动将 /path 映射到 /path.html
    // 生成 /path/index.html 才能正确处理 /path 和 /path/ 的访问
    trailingSlash: false,


    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'hanphonejan', // Usually your GitHub org/user name.
    projectName: 'HanphoneJan.github.io', // Usually your repo name.
    deploymentBranch: 'gh-pages',


    onBrokenLinks: 'throw',
    onDuplicateRoutes: 'warn',
    /**
     * 保持默认的 `warn`，**不要**改成 `'ignore'`。
     *
     * 构建时每篇题解页都会报一条
     * 「Broken anchor … -> #visualizer」，模式/模板页报 `#vis-<tracerId>`。
     * 那是**误报**：这两个小节渲染在 `</DocItemContent>` 之后
     * （`src/theme/DocItem/Layout/index.tsx`），`id` 与右侧 TOC 里指向它的
     * `<a href>` 都是 React 写上去的，而 Docusaurus 的锚点检查只知道
     * **构建期从 markdown 解析出来**的锚点 —— 两头都没有就报 broken。
     * 实测构建产物里两者都真实存在：
     * `grep -o 'id="visualizer"' build/…/11.html` 有一处，
     * `grep -o 'id="vis-grid-bfs"' build/code-training/patterns/bfs.html` 也有。
     *
     * 本仓库的 Docusaurus 3.9 只接受枚举值（`ignore|log|warn|throw`），
     * **不支持**按链接内容返回结果的函数形式（3.10+ 才有），
     * 所以没法只放过这几个。要消掉噪声只能整体 `ignore`，
     * 那会把真的写错的锚点一起吞掉 —— 不划算。
     */


    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
      defaultLocale: 'zh-CN',
      locales: ['zh-CN'],
    },


    markdown: {
      mermaid: true,
      format: 'detect',
      hooks: {
        onBrokenMarkdownLinks: 'warn',
      },
    },


    clientModules: [
      require.resolve('./src/clientModules/themeColor.ts'),
    ],


    themes: [
      '@docusaurus/theme-mermaid',
      [
        require.resolve('@easyops-cn/docusaurus-search-local'),
        {
          hashed: true,
          language: ['en', 'zh'],
          searchBarPosition: 'right',
          docsRouteBasePath: ['docs', 'code-training'],
        },
      ],
    ],


    presets: [
      [
        'classic',
        {
          docs: {
            id: 'default',
            editUrl: 'https://github.com/hanphonejan/HanphoneJan.github.io/edit/main/',
            showLastUpdateTime: true,
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          },
          // 没有 blog：真正的博客站是 hanphone.cn，这里只放文档
          theme: {
            customCss: [
              "./src/css/custom.css",
              require.resolve("katex/dist/katex.min.css"),
            ],
          },
        } satisfies Preset.Options,
      ],
    ],

    plugins: [
      // 把「哪些题解有自测题」这份清单注入 globalData（只发键，不发题目正文）
      path.join(__dirname, 'plugins/self-test/index.ts'),
      // 题解里的录制式可视化：构建期跑 Pyodide 采执行轨迹，落在 static/traces/
      path.join(__dirname, 'plugins/vis-traces/index.ts'),
      // code-training 文档的 md 相对路径 -> 真实 permalink 映射
      path.join(__dirname, 'plugins/doc-permalinks/index.ts'),
      // 题解里的可运行代码与测试样例，供浏览器内 Pyodide 使用
      path.join(__dirname, 'plugins/py-samples/index.ts'),
      [
        '@docusaurus/plugin-content-docs',
        {
          id: 'code-training',
          path: 'code-training/docs',
          routeBasePath: 'code-training',
          sidebarPath: './code-training/sidebars.ts',
          editUrl: 'https://github.com/hanphonejan/code-training/edit/main/',
          showLastUpdateTime: false,
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          exclude: [
            '**/_*.{js,jsx,ts,tsx,md,mdx}',
            '**/_*/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/__tests__/**',
            '**/node_modules/**',
            '**/.docusaurus/**',
            '**/build/**',
            '**/dist/**',
            '**/.git/**',
            '**/.github/**',
            '**/scripts/**',
            '**/src/**',
            '**/static/**',
            '**/blog/**',
            '*.config.*',
            '*.json',
            '*.lock',
            '*.yml',
            '*.yaml',
            '.gitignore',
            '.gitattributes',
          ],
        } satisfies import('@docusaurus/plugin-content-docs').Options,
      ],
      [
        '@docusaurus/plugin-pwa',
        {
          debug: false,
          offlineModeActivationStrategies: ['appInstalled', 'queryString', 'standalone'],
          pwaHead: [
            {tagName: 'link', rel: 'manifest', href: '/manifest.webmanifest'},
            {
              tagName: 'link',
              rel: 'icon',
              type: 'image/png',
              sizes: '32x32',
              href: '/img/pwa/favicon-32x32.png',
            },
            {tagName: 'link', rel: 'apple-touch-icon', href: '/img/pwa/apple-touch-icon.png'},
            {tagName: 'meta', name: 'theme-color', content: '#1b1b1d'},
            {tagName: 'meta', name: 'apple-mobile-web-app-capable', content: 'yes'},
            {tagName: 'meta', name: 'mobile-web-app-capable', content: 'yes'},
            {
              tagName: 'meta',
              name: 'apple-mobile-web-app-status-bar-style',
              content: 'black-translucent',
            },
            {tagName: 'meta', name: 'apple-mobile-web-app-title', content: '寒枫'},
          ],
        },
      ],
    ],


    themeConfig: {
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      giscus: {
        repo: 'HanphoneJan/HanphoneJan.github.io',
        repoId: process.env.GISCUS_REPO_ID || 'R_kgDOQn_P0g',
        category: 'Docs Comments',
        categoryId: process.env.GISCUS_CATEGORY_ID || 'DIC_kwDOQn_P0s4C3pOL',
      },
      navbar: {
        title: 'HanphoneJan',
        hideOnScroll: false,
        items: [
          {to: '/', label: '首页', position: 'left'},
          {
            type: 'docSidebar',
            sidebarId: 'defaultSidebar',
            position: 'left',
            label: '文档',
          },
          {to: '/stars', label: 'Stars', position: 'left'},
          {to: '/projects', label: '项目', position: 'left'},
          {
            type: 'dropdown',
            label: '代码训练',
            position: 'left',
            items: [
              {to: '/code-training/category/题库', label: '编程题库'},
              {to: '/code-training/category/机器学习', label: '机器学习'},
              {to: '/code-training/category/数据结构', label: '数据结构'},
              {to: '/code-training/category/算法模式', label: '算法模式'},
              {to: '/code-training/category/代码模板', label: '代码模板'},
              {to: '/code-training/category/复习系统', label: '总结盘点'},
            ],
          },
          {
            href: 'https://github.com/hanphonejan',
            label: 'GitHub',
            position: 'right',
            className: 'navbar-github-icon',
          },
          {
            href: 'https://hanphone.cn',
            label: '个人主页',
            position: 'right',
            className: 'navbar-blog-icon',
          },
        ],
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.oneDark,
        additionalLanguages: ['bash', 'python', 'java', 'typescript', 'javascript', 'go', 'rust', 'sql', 'json', 'verilog'],
        magicComments: [
          {
            className: 'theme-code-block-highlighted-line',
            line: 'highlight-next-line',
            block: {start: 'highlight-start', end: 'highlight-end'},
          },
        ],
      },
      mermaid: {
        theme: {light: 'default', dark: 'dark'},
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
    } satisfies Preset.ThemeConfig,
  };

export default config;
