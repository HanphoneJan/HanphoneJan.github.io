---
title: 小O的叶子
platform: NowCoder
difficulty: 中等
id: oppo-leaves
url: https://www.nowcoder.com/practice/e0b315f386354e0fbcfd4f69ece56a3a
tags:
  - 树
  - 贪心
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的叶子

> OPPO 笔试真题 · 2024 秋招 · 数据分析岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/e0b315f386354e0fbcfd4f69ece56a3a)提交；本站暂只收录题面与样例。

## 题目描述

小O有一棵 $n$ 个节点的树，小O会先删除一个节点，并删除与这个节点相连的边。小O想知道删除一个节点后，剩下的树最多有多少个<u>叶子节点</u>。

如果一个节点有且仅有一个节点与之相连，那么这个点就是一个<u>叶子节点</u>。

## 输入格式

第一行输入一个整数 $n\ (1 \leq n \leq 10^5 )$，表示树的节点数。

此后 $n-1$ 行，第 $i$ 行输入两个整数 $u_i$ 和 $v_i\ (1 \leq u_i, v_i \leq n;\ u_i \neq v_i)$ 表示树上第 $i$ 条边连接节点 $u_i$ 和 $v_i$ 。保证树联通，没有重边。

## 输出格式

在一行上输出一个正整数，表示删除一个节点后，剩下的树最多有多少个叶子节点。

## 示例

### 示例 1

**输入：**

```text
5
1 2
1 3
1 4
1 5
```

**输出：**

```text
3
```

**说明：**

删除节点 5 后，剩下的树最多有 3 个叶子节点。
