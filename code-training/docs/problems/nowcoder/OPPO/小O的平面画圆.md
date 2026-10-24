---
title: 小O的平面画圆
platform: NowCoder
difficulty: 简单
id: oppo-draw-circle
url: https://www.nowcoder.com/practice/bb64967dbb2c430f8ff00e9be1c360c5
tags:
  - 几何
  - 数学
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的平面画圆

> OPPO 笔试真题 · 2024 秋招 · 数据开发岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/bb64967dbb2c430f8ff00e9be1c360c5)提交；本站暂只收录题面与样例。

## 题目描述

平面上有 $n$ 个圆，请你找到一个圆，满足和其余所有的圆都不存在交点。

我们定义，两个圆包含或者相离均视为没有交点。

## 输入格式

第一行输入一个正整数 $n\ (1\leq n \leq 1000)$ 表示圆的数量。

此后 $n$ 行，第 $i$ 行输入三个正整数 $x_i,y_i$ 和 $r_i\ (1 \leq x_i, y_i, r_i \le 10^9)$ ，代表第 $i$ 个圆的圆心为 $(x_i,y_i)$，半径为 $r_i$ 。

## 输出格式

若不存在这样的圆，直接输出 $-1$ ；否则，输出一个正整数$i$ ，代表第 $i$ 个圆满足条件。

如果有多个满足题意的答案，你只需要输出其中一种即可。

## 示例

### 示例 1

**输入：**

```text
3
1 1 1
2 2 2
3 3 5
```

**输出：**

```text
3
```

**说明：**

第一个圆和第二个圆相切（有一个交点）。

第三个圆和前两个圆均没有交点。
