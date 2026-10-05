---
sidebar_position: 1
title: 欢迎
# 挂在板块根路径上，否则 `/docs` 没有任何路由（404）。
#
# docs 插件只给**真实存在的 doc 文件**生成路由，而这个目录下没有
# `index.md`；不加 slug 的话落地页的 permalink 是 `/docs/intro`，
# 于是「文档」这个板块的入口 URL 整个是 404。
#
# 这篇正文里一条 markdown 链接都没有，所以页面上移一级不会打断任何相对链接
# —— 这正是它比 `code-training/docs/intro.md` 少一个坑的原因
# （那一篇正文有 6 个 `category/*` 相对链接，上移后全部解析错，构建直接失败）。
#
# 副作用：旧的 `/docs/intro` 不再是这篇的地址，由 `plugins/static-redirects`
# 写一个静态重定向兜住（那是个已上线的 URL，首页的「开始阅读」按钮就指着它）。
slug: /
---

# 欢迎来到技术文档站

这里记录了我的技术学习笔记和项目经验。

## 文档分类

- **前端开发** - Web 开发、React、Vue、TypeScript、Next.js、工具链
- **后端开发** - Spring、Django、FastAPI、Node.js、Docker、数据库
- **机器学习** - 深度学习、大模型、Transformer、LangChain
- **嵌入式** - STM32、ARM、RTOS、数电设计、汇编语言
- **读书笔记** - 读书心得与摘录

## 快速导航

点击左侧侧边栏浏览不同分类，或使用顶部搜索框（`Ctrl+K` / `Cmd+K`）快速查找内容。

