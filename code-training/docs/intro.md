---
sidebar_position: 1
# 挂在板块根路径上，否则 `/code-training` 没有任何路由（404）。
#
# docs 插件只给**真实存在的 doc 文件**生成路由，而这个目录下没有
# `index.md`；不加 slug 的话落地页的 permalink 是 `/code-training/intro`，
# 于是「代码训练」这个板块的入口 URL 整个是 404。
#
# 副作用：旧的 `/code-training/intro` 不再是这篇的地址，
# 由 `plugins/static-redirects` 写一个静态重定向兜住（那是个已上线的 URL）。
slug: /
---

# 算法训练场

欢迎来到算法训练场。这里是我系统刷题、整理知识点、总结算法模式的学习空间。

## 内容结构

| 板块 | 说明 |
|------|------|
| [题目库](/code-training/category/题库) | 按平台分类的算法题解，包含完整思路、代码和复杂度分析 |
| [机器学习](/code-training/category/机器学习) | Jupyter Notebooks 转换的机器学习深度笔记 |
| [数据结构](/code-training/category/数据结构) | 数据结构分类的知识体系梳理 |
| [算法模式](/code-training/category/算法模式) | 通用解题套路、思维框架，以及每个模式的标准实现 |
| [复习系统](/code-training/category/复习系统) | 学习笔记与速查表 |

> 这几个链接必须写成**从站点根算的绝对路径**。这篇文档原来在
> `/code-training/intro`，写相对路径 `category/题库` 恰好能解析到
> `/code-training/category/题库`；挂到 `slug: /` 之后页面上了一级，
> 同一个相对路径就解析成了 `/category/题库` —— 构建直接报 broken links。

## 使用方式

- **搜索**：页面右上角搜索框支持全局搜索所有内容
- **分类浏览**：通过左侧边栏按板块浏览
- **按算法找题**：进入「算法模式」里任一模式（BFS / DFS / 动态规划…），页末会按难度列出「相关题目」；也可以直接看标签页，如 `/code-training/tags/动态规划`
- **代码复制**：代码块右上角有复制按钮
- **评论**：每道题解底部都有 Giscus 评论，可留言讨论

## 统计

- 题解数量：持续增长中
- 覆盖平台：LeetCode 为主
- 难度分布：简单、中等、困难全覆盖

---

*持续更新，欢迎交流。*
