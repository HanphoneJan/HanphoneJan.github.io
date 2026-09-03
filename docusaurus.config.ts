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
    url: 'https://www.hanphone.top',
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
          blog: {
            showReadingTime: true,
            feedOptions: {
              type: ['rss', 'atom'],
              xslt: true,
            },
            editUrl: 'https://github.com/hanphonejan/HanphoneJan.github.io/edit/main/',
            onInlineTags: 'warn',
            onInlineAuthors: 'warn',
            onUntruncatedBlogPosts: 'warn',
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          },
          theme: {
            customCss: [
              "./src/css/fonts.css",
              "./src/css/custom.css",
              require.resolve("katex/dist/katex.min.css"),
            ],
          },
        } satisfies Preset.Options,
      ],
    ],

    plugins: [
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
        blogCategory: 'Blog Comments',
        blogCategoryId: process.env.GISCUS_BLOG_CATEGORY_ID || 'DIC_kwDOQn_P0s4C3qJX',
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
          {to: '/blog', label: '博客', position: 'left'},
          {to: '/stars', label: 'Stars', position: 'left'},
          {to: '/projects', label: '项目', position: 'left'},
          {
            type: 'dropdown',
            label: '代码训练',
            position: 'left',
            items: [
              {to: '/code-training/category/题库', label: '编程题库'},
              {to: '/code-training/category/机器学习', label: '机器学习'},
              {to: '/code-training/category/知识点', label: '知识点'},
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
