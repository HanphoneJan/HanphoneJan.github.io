---
title: 小O的整数操作
platform: NowCoder
difficulty: 简单
id: oppo-int-ops
url: https://www.nowcoder.com/practice/52e3cbb106d54366a3f5fefac03d169f
tags:
  - 数学
  - 贪心
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的整数操作

> OPPO 笔试真题 · 2024 秋招 · AI/算法岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/52e3cbb106d54366a3f5fefac03d169f)提交；本站暂只收录题面与样例。

## 题目描述

小O有一个整数 $n$，她每次可以进行以下操作之一：

1. 将 $n$ 减去 $1$；

2. 将 $n$ 除以 $k$（当 $n$ 可以被 $k$ 整除时）。

小O想知道，将 $n$ 变成 $m$ 至少需要多少次操作。

## 输入格式

在一行上输入三个整数 $n,m$ 和 $k\ ( 1 \leq m \leq n \leq 10^9;\ 1 \leq k \leq 10^9 )$ 表示初始数字、目标数字和 可以除的数字。

## 输出格式

在一行上输出一个正整数，表示将 $n$ 变成 $m$ 至少需要多少次操作。

## 示例

### 示例 1

**输入：**

```text
10 4 2
```

**输出：**

```text
2
```

**说明：**

先将 10 除以 2 得到 5，再将 5 减去 1 得到 4，共需要 2 次操作。
