---
title: 小欧的gcd
platform: NowCoder
difficulty: 中等
id: oppo-gcd
url: https://www.nowcoder.com/practice/68b4d34187ee41fab749b27d158f069f
tags:
  - 数学
  - 二分查找
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小欧的gcd

> OPPO 笔试真题 · 2024 秋招 · 前端岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/68b4d34187ee41fab749b27d158f069f)提交；本站暂只收录题面与样例。

## 题目描述

小欧有一个长度为 $n$ 的数组，他需要把这个数组分割成 $k(k > 1)$ 个非空子数组，也就是 $[l_1, r_1], [l_2, r_2], \cdots, [l_k, r_k]$，其中 $1 \leq l_1 < r_1 \leq l_2 < r_2 \leq \cdots \leq l_k < r_k \leq n$，并且 $r_i + 1 = l_{i + 1}$。

对于每个子数组，小欧都会计算出这个子数组的总和 $b_i = a_{l_i} + \dots + a_{r_i}$。

现在小欧想找一个分割方案（子数组数量 $k$ 必须大于 1），使得 $\gcd(b_1, \dots, b_k)$ 最大，请你帮他找到最大值。

gcd：指最大公约数，Greatest Common Divisor的缩写。

## 输入格式

一行一个整数 $n$，表示数组长度。

一行 $n$ 个整数 $a_1, \dots, a_n$，表示数组的元素。

$2 \leq n \leq 10^5$

$1 \leq a_i \leq 10^4$

## 输出格式

一个整数，表示最大的 $\gcd(b_1, \dots, b_k)$。

## 示例

### 示例 1

**输入：**

```text
5
1 2 3 4 5
```

**输出：**

```text
5
```

**说明：**

分割成 $[1, 2, 3, 4]$ 和 $[5]$，得到 $b = [10, 5]$，$\gcd(10, 5) = 5$，是最大值。
