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
#
# 正文里的板块链接因此必须写成**从站点根算的绝对路径**（`/code-training/...`）。
# 原来写相对路径 `category/题库` 恰好能解析到 `/code-training/category/题库`；
# 页面上了一级之后，同一个相对路径就解析成 `/category/题库`，构建直接报
# broken links。这几行是给维护者看的，**不要写进正文**（会渲染出来）。
slug: /
---

# 算法训练场

欢迎来到算法训练场。这里是我系统刷题、整理知识点、总结算法模式的学习空间。

## 内容结构

| 板块 | 说明 |
|------|------|
| [题库](/code-training/category/题库) | 按平台分类的算法题解，包含完整思路、代码和复杂度分析 |
| [机器学习](/code-training/category/机器学习) | Jupyter Notebooks 转换的机器学习深度笔记 |
| [数据结构](/code-training/category/数据结构) | 数据结构分类的知识体系梳理 |
| [算法模式](/code-training/category/算法模式) | 通用解题套路、思维框架，以及每个模式的标准实现 |
| [复习系统](/code-training/category/复习系统) | 学习笔记与速查表 |

## 使用方式

- **搜索**：页面右上角搜索框支持全局搜索所有内容
- **分类浏览**：通过左侧边栏按板块浏览
- **按算法找题**：进入「算法模式」里任一模式（BFS / DFS / 动态规划…），页末会按难度列出「相关题目」；也可以直接看标签页，如 `/code-training/tags/动态规划`
- **代码复制**：代码块右上角有复制按钮
- **评论**：每道题解底部都有 Giscus 评论，可留言讨论

## 学习资源

### 刷题路线

- [如何科学刷题？- 力扣讨论区](https://leetcode.cn/discuss/post/3141566/ru-he-ke-xue-shua-ti-by-endlesscheng-q3yd/) —— 灵神（endlesscheng）的刷题方法论
- [LeetCode 热题 100](https://leetcode.cn/studyplan/top-100-liked/) —— 经典高频题目合集
- [灵神刷题路线图](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E7%81%B5%E7%A5%9E%E5%88%B7%E9%A2%98%E8%B7%AF%E7%BA%BF%E5%9B%BE.webp) —— 算法学习路径可视化

### 综合资料

- [数据结构与算法入门宝典：超全知识汇总 - 知乎](https://zhuanlan.zhihu.com/p/1903577161132115759) —— 包含深度学习手撕代码
- [OI Wiki](https://oi-wiki.org/) —— 竞赛编程知识库，算法与数据结构讲得很细
- [VisuAlgo - 算法可视化](https://visualgo.net/zh) —— 用动画看数据结构和算法的执行过程
- [Python Tutor](https://pythontutor.com/python-compiler.html#mode=edit) —— Python 代码逐行执行可视化，适合理解代码到底怎么跑的

### 推荐题单

| 阶段 | 题单 |
|------|------|
| 基础入门 | LeetCode 热题 100 —— 建立算法思维的基础题单 |
| 进阶提升 | LeetCode 精选 TOP 面试题、剑指 Offer 系列 |
| 专项训练 | 数组与字符串 · 链表 · 树与图 · 动态规划 · 回溯算法 |

### 学习建议

1. **循序渐进**：按灵神路线图，从基础数据结构开始，逐步过渡到复杂算法。
2. **五遍刷题法**：第一遍能写出解法就行 → 第二遍优化到最优 → 一天后复习 → 一周后复习 → 面试前再复习。
3. **可视化学习**：用 VisuAlgo 和 Python Tutor 理解算法的执行过程，比盯着代码硬想快得多。
4. **归纳总结**：每类题型整理出通用模板，写进「算法模式」那一栏，下次直接套。

## 统计

- 题解数量：持续增长中
- 覆盖平台：LeetCode、牛客、CodeFun2000 等
- 难度分布：简单、中等、困难全覆盖

---

*持续更新，欢迎交流。*
