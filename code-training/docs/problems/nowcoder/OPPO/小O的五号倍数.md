---
title: 小O的五号倍数
platform: NowCoder
difficulty: 入门
id: oppo-five-multiple
url: https://www.nowcoder.com/practice/f40cb14a15444609ac61bc4b4d75d3c3
tags:
  - 数学
  - 贪心
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的五号倍数

> OPPO 笔试真题 · 2024 秋招 · 数据分析岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/f40cb14a15444609ac61bc4b4d75d3c3)提交；本站暂只收录题面与样例。

## 题目描述

小O有一个正整数 $x$ ，他希望删除 $x$ 中的一些数位，使得 $x$ 变为 $5$ 的倍数，请问最少需要删除多少个数位呢？

## 输入格式

每个测试文件均包含多个测试点。第一行输入一个整数 $T\ (1\le T\le 10^5)$ 代表测试数据组数，每组测试数据描述如下：

第一行输入一个正整数 $x\ (1 \leq x \leq 10^9)$ ，表示小O询问的数字 $x$。

## 输出格式

对于每一个测试点，在一行上输出一个正整数代表最少的删除数位数。

## 示例

### 示例 1

**输入：**

```text
3
154
100
1
```

**输出：**

```text
1
0
1
```

**说明：**

三个数据分别删除为：

15， 100， 0

（可以全部删除，然后 x 视为 0。）
