---
title: 小O的数组染色
platform: NowCoder
difficulty: 较难
id: oppo-array-paint
url: https://www.nowcoder.com/practice/1e20b2f3daa14e8389c847eab1ab1f64
tags:
  - 数组
  - 贪心
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的数组染色

> OPPO 笔试真题 · 2024 秋招 · 数据开发岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/1e20b2f3daa14e8389c847eab1ab1f64)提交；本站暂只收录题面与样例。

## 题目描述

小P给了小O一个长为 $n$ 的数组 $a_1,a_2,\dots,a_n$ ，初始数组中的每个数字都是白色。小O可以进行如下操作：

$[l,r]$ $a_l = a_r$

- 选择一个区间  ，满足  ，将区间所有元素染红。

小O想知道她最少几次操作可以将所有数字都染红，请你帮帮他吧。

## 输入格式

每个测试文件均包含多个测试点。第一行输入一个整数 $T\ (1\le T\le 10^4)$ 代表测试数据组数，每组测试数据描述如下：

第一行输入一个整数 $n\ (1 \leq n \leq 2\cdot 10^5)$ 表示数组 $a$ 的长度。

第二行输入 $n$ 个整数 $a_1,a_2,\dots,a_n\ (1 \leq a_i \leq 10^9)$ 表示数组 $a_i$ 的元素。

除此之外，保证所有的 $n$ 的之和不超过 $2 \cdot 10^5$ 。

## 输出格式

对于每一个测试点，在一行上输出一个正整数，表示染红所有数字的最小操作次数。

## 示例

### 示例 1

**输入：**

```text
2
5
1 2 3 1 2
3
1 2 3
```

**输出：**

```text
2
3
```

**说明：**

对于第一组测试数据

2次操作即可，第一次选择：$l = 1, r = 4$，第二次选择：$l = 2, r = 5$。
