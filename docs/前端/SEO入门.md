---
title: SEO 入门
sidebar_position: 15
description: 抓取、索引、排序三步，robots / sitemap / meta / 结构化数据怎么写，以及上线后不被收录时按什么顺序排查。
---

## 搜索引擎怎么工作

```text
抓取（Crawl） → 索引（Index） → 排序（Rank）
```

1. **抓取**：爬虫顺着链接和 sitemap 发现 URL，下载 HTML。`robots.txt` 能禁止抓取某些路径。
2. **索引**：解析页面内容，判断主体、语言、重复度，存进索引库。`<meta name="robots">`、`canonical` 决定这一页收不收、收哪一版。
3. **排序**：查询时按相关性与质量排序。这一步靠内容与链接，技术手段只能保证「不拖后腿」。

所以 SEO 的技术部分只需要保证三件事：**能被抓到、能被收录、收录的是对的那一版**。排序不在这篇的范围内。

## 收录的三个前提

| 前提 | 检查什么 |
|---|---|
| 可抓取 | `robots.txt` 没挡住、页面不需要登录、不是纯 JS 渲染出空壳 |
| 可发现 | sitemap 里有它、站内至少有一个链接指向它（孤岛页面很难被发现） |
| 可索引 | 没有 `noindex`、没有错误的 `canonical`、不是重复内容 |

前端最容易栽在第一条：**CSR 的页面在爬虫看来是空 HTML**。要么用 SSR / SSG（Next.js、Nuxt、VuePress 都是），要么至少保证首屏内容在 HTML 里。

## 1. robots.txt

放在站点根目录，只对根域名生效：

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /search

Sitemap: https://example.com/sitemap.xml
```

- `Disallow` 是「不许抓」，不是「不许收录」：被挡的页面如果被别处链接，仍可能以无摘要形式出现在结果里。要它彻底不出现，用 `noindex`（且**必须允许抓取**，否则爬虫读不到 `noindex`）。
- `Crawl-delay` 主流搜索引擎已忽略（Google 明确不支持）。
- 改了 robots 之后，抓取生效要等，Google 可以在 Search Console 里重新提交。

## 2. sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/docs/intro.html</loc>
    <lastmod>2026-11-13</lastmod>
  </url>
</urlset>
```

- 只放**想被收录**的规范 URL，不要放参数页、分页的每一页、404。
- `lastmod` 要真实，乱写会让搜索引擎不再信任这个字段。
- 站点大了要拆成多个 sitemap，再用一个 sitemap index 串起来，单个文件不超过 50,000 条、50MB。
- 生成方式：静态站点在构建时生成（VuePress / Docusaurus 都有插件），动态站按数据库查。

## 3. 页面 meta

```html
<title>页面标题（50–60 字符，核心词靠前）</title>
<meta name="description" content="一句话说清这页讲什么，150 字以内">
<link rel="canonical" href="https://example.com/docs/intro.html">
<meta name="robots" content="index,follow">
```

- **title**：搜索结果的第一行。每个页面都要不同，别用站点名当所有页的标题。
- **description**：不直接参与排序，但决定点击率；不写时搜索引擎自己从正文截。
- **canonical**：同一内容有多个 URL（带不带 `www`、带不带参数、`/a` 与 `/a.html`）时，指定哪一个是正版。
- **`meta robots`**：`noindex` 不要这一页、`nofollow` 不跟随链接；整站不要用，按页配。
- **多语言**：用 `<link rel="alternate" hreflang="zh-CN">` 互相指。
- **社交分享**：Open Graph（`og:title` / `og:image`）与 Twitter Card，影响的是分享卡片，不是搜索排名。

## 4. 结构化数据

给页面加机器可读的语义，搜索引擎才能出富媒体结果（面包屑、评分、FAQ 折叠）。推荐 JSON-LD，写在 `<head>` 里：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "datePublished": "2026-11-13",
  "author": { "@type": "Person", "name": "作者" }
}
</script>
```

常用的几种：

| 类型 | 用在哪 |
|---|---|
| `Article` / `BlogPosting` | 文章、文档 |
| `BreadcrumbList` | 面包屑导航 |
| `FAQPage` | 常见问题列表 |
| `Product` + `Offer` | 商品与价格 |
| `Organization` / `WebSite` | 站点主体信息、站内搜索框 |

用 [Rich Results Test](https://search.google.com/test/rich-results) 或 [Schema Markup Validator](https://validator.schema.org/) 验证，字段缺失不会报错，只会静默不出富媒体结果。

## 5. 站长平台

- **Google Search Console**：提交 sitemap、看抓取与索引状态、逐 URL 检查、看真实查询词。最有用的是「网页」报告里的「已发现但未编入索引」与「已抓取但未编入索引」，原因写得很具体。
- **Bing Webmaster Tools**：可以从 Search Console 直接导入。
- **百度搜索资源平台**：国内流量必须提交，支持主动推送 API；百度对 JS 渲染的支持比 Google 弱，SSR 更重要。

## 出问题时的排查顺序

上线后发现搜不到，按这五步走，多数问题在前三步：

1. **`site:example.com`** 看收录了多少。一条都没有，先查 robots 与 sitemap。
2. **view-source 看 HTML**。正文是不是空壳（CSR）、title 是不是模板默认值、有没有误加的 `noindex`。
3. **`robots.txt` 与 sitemap 是否可访问**，返回码是不是 200，sitemap 里的 URL 是不是规范地址。
4. **Search Console 的 URL 检查**：看「已发现」「已抓取」「已编入索引」卡在哪一步，以及抓取到的 HTML 与线上是否一致。
5. **结构化数据验证**：富媒体结果不出现时，看字段是否齐全、类型是否写错。

常见坑：

- 部署后新页面返回 404，搜索引擎抓到一片 404，自然不收录。
- 站点搬家没做 301，旧链接全部失效，权重归零。
- `canonical` 全站指向首页，等于告诉搜索引擎「所有页面都是首页的副本」。
- 单页应用的 `history` 路由在静态托管上没有回退，深链接 404。
- 页面标题靠客户端 JS 改，爬虫看到的是初始 HTML 里的那个。

## 工具

- [Google Search Console](https://search.google.com/search-console)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)：Core Web Vitals 与性能建议
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [百度搜索资源平台](https://ziyuan.baidu.com/)
