---
title: 小O的树上路径
platform: NowCoder
difficulty: 较难
id: oppo-tree-path
url: https://www.nowcoder.com/practice/dba380c6ba674a7084e3214b05cb729b
tags:
  - 树
  - 深度优先搜索
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的树上路径

> OPPO 笔试真题 · 2024 秋招 · 研发通用岗 / 2024 秋招 · 后端开发
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/dba380c6ba674a7084e3214b05cb729b)提交；本站暂只收录题面与样例。

## 题目描述

小O有一棵树，树上的每一条边上都有一个一定价值的物品，从 1 号点开始，每个点最多只能走两次，小O想知道最多拿到多少价值的物品。

注意：物品拿走以后就没了。

## 输入格式

第一行输入一个整数 $n\ (2 \leq n \leq 10^5)$ 表示树上的点数。

此后 $n - 1$ 行，每行输入三个整数 $u,v$ 和 $w\ ( 1 \leq u, v \leq n;\ 1 \leq w \leq 10^9 )$ 表示 $u$ 和 $v$ 之间有一条边，边上有一个价值为 $w$ 的物品。

## 输出格式

在一行上输出一个整数，表示小O最多能够拿到的物品价值。

## 示例

### 示例 1

**输入：**

```text
4
1 2 1
1 3 2
1 4 3
```

**输出：**

```text
5
```

**说明：**

小红走过的点依次为[1, 4, 1, 3]，拿到价值为 3，2 的物品，1 号点走了两次，3 号点和 4 号点各走了一次。
