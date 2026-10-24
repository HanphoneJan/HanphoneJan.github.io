---
title: 小欧的red填充
platform: NowCoder
difficulty: 简单
id: oppo-red-fill
url: https://www.nowcoder.com/practice/f0954d4dfb754494a0d134e15cdd8b23
tags:
  - 字符串
  - 贪心
  - 构造
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小欧的red填充

> OPPO 笔试真题 · 2023 秋招 · 研发岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/f0954d4dfb754494a0d134e15cdd8b23)提交；本站暂只收录题面与样例。

## 题目描述

给定一个字符串，仅由'r'、'e'、'd'和'?'四种字符组成。你需要把所有的'?'字符变成'r'、'e'、'd'三种字符中的任意一种，使得任意长度为3的连续子串中，'r'、'e'、'd'三种字母的出现次数相同。你能帮帮她吗？

共有$q$次询问。

## 输入格式

第一行输入一个正整数$q$，代表询问次数。

接下来的$q$行，每行输入一个仅由'r'、'e'、'd'和'?'四种字符组成的字符串，代表一次询问。

所有的字符串总长度不超过200000。

## 输出格式

输出$q$行，每行代表一次询问的答案。

如果可以完成修改，请输出一个合法的字符串。有多解时输出任意即可。

否则输出一个字符串"No"。

## 示例

### 示例 1

**输入：**

```text
3
e???d??
r??e
??
```

**输出：**

```text
edredre
No
rd
```
