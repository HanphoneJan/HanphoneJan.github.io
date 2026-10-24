---
title: 小O的树上加边
platform: NowCoder
difficulty: 较难
id: oppo-tree-add-edge
url: https://www.nowcoder.com/practice/246a42faded9456d964ddbc55a79e33c
tags:
  - 树
  - 图
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的树上加边

> OPPO 笔试真题 · 2024 秋招 · AI/算法岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/246a42faded9456d964ddbc55a79e33c)提交；本站暂只收录题面与样例。

## 题目描述

小O有一棵 $n$ 个点组成的树，树上的点从 $1$ 到 $n$ 编号，树上的边是无向的。任意一棵树都是二分图，小O想知道她最多可以给树加多少条边，使得新的图仍然是二分图。

二分图的定义：如果一个图的所有点可以被分成两个集合 $A$ 和 $B$，使得所有的边都是一端在 $A$ 中，一端在 $B$ 中，那么这个图就是二分图。

## 输入格式

第一行输入一个整数 $n\ (1 \leq n \leq 10^5 )$，表示树上的点数。

此后 $n-1$ 行，第 $i$ 行输入两个整数 $u_i$ 和 $v_i\ (1 \leq u_i, v_i \leq n )$，表示树上的一条边连接了点 $u_i$ 和点 $v_i$。保证这些边可以形成一棵树。

## 输出格式

在一行上输出一个正整数，表示最多可以给树加多少条边，使得新的图仍然是二分图。

## 示例

### 示例 1

**输入：**

```text
4
1 2
2 3
3 4
```

**输出：**

```text
1
```

**说明：**

可以添加一条边 (1, 4)，新的图仍然是二分图。
