---
title: SEO 排查清单
description: 站点不被收录、摘要难看、结构化数据报错时，按这几步查：robots、sitemap、meta、结构化数据、Search Console。
---

上线之后发现搜索引擎没收录，先别急着「优化内容」。绝大多数问题出在这五步里的某一步，按顺序排一遍通常十分钟内能定位。

## 1. robots.txt

```txt
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- 用 `https://你的域名/robots.txt` 直接访问，确认**没有**误写 `Disallow: /`
- 测试环境屏蔽过爬虫、上线时忘了改，是这里最常见的原因

## 2. sitemap

- VuePress / Next 这类框架一般有插件自动生成（本站是 `@vuepress/plugin-sitemap`，产物挂在 `/sitemap.xml`）
- sitemap 里的 URL 必须和线上实际地址一致：**带不带 `.html`、带不带尾斜杠，要和真实路由对上**
- 在 Search Console 里手动提交一次，之后靠 robots.txt 里的 `Sitemap:` 行

## 3. 页面 meta

每页都该有且只有一份：

| 标签 | 作用 | 常见错误 |
|---|---|---|
| `<title>` | 搜索结果的第一行 | 全站同一个标题 |
| `<meta name="description">` | 搜索结果的摘要 | 缺失，或整段复制正文 |
| `<link rel="canonical">` | 声明权威地址 | 重复内容页各指自己 |

同一个主题在两个站（比如博客与文档站）都有全文时，canonical 是唯一能让搜索引擎不把它们当重复内容的办法。

## 4. 结构化数据

用 JSON-LD 声明 `Article` / `BreadcrumbList` / `WebSite`，然后在 [Rich Results Test](https://search.google.com/test/rich-results) 里验证。

## 5. Search Console

- 提交站点 → 看「覆盖率」报告里哪些 URL 被排除、为什么
- 「网址检查」可以强制抓取单个页面，改完立刻验证，不用等
- 新站收录慢是正常的，但**「已发现未编入索引」长期不动**通常意味着内容质量或内链有问题

## 工具

| 工具 | 用途 | 地址 |
|---|---|---|
| Google Rich Results Test | 测试结构化数据 | [search.google.com/test/rich-results](https://search.google.com/test/rich-results) |
| Schema Markup Validator | 校验 JSON-LD | [validator.schema.org](https://validator.schema.org/) |
| Seobility | 综合 SEO 分析 | [seobility.net/en/seocheck](https://www.seobility.net/en/seocheck/) |
| Search Console | 收录、抓取、查询词 | [search.google.com/search-console](https://search.google.com/search-console/welcome) |

浏览器扩展：**SEO Meta in 1 Click**（一键看当前页的 title/description/heading 结构）、**Detailed SEO Extension**（查内链、canonical、结构化数据）。
