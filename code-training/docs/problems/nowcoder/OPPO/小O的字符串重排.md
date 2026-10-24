---
title: 小O的字符串重排
platform: NowCoder
difficulty: 中等
id: oppo-string-rearrange
url: https://www.nowcoder.com/practice/729b24646e17478db41e4ad2675e9d7e
tags:
  - 字符串
  - 贪心
topics: []
patterns: []
date_added: 2026-10-24
date_reviewed: []
---

# 小O的字符串重排

> OPPO 笔试真题 · 2024 秋招 · AI/算法岗
>
> 判题请到[牛客原题](https://www.nowcoder.com/practice/729b24646e17478db41e4ad2675e9d7e)提交；本站暂只收录题面与样例。

## 题目描述

小O有一个字符串 $s$ ，她希望重新排列这个字符串，并改变字符的大小写，使得新的字符串包含尽可能多的字符串 $a$ 或者字符串 $b$。请问小O最多能包含多少个<u>子串</u> $a$ 和<u>子串</u> $b$ 。

如果字符串 $t$ 可以通过从字符串 $s$ 的开头删除若干（可能为零或全部）字符以及从结尾删除若干（可能为零或全部）字符得到，则字符串 $t$ 是字符串 $s$ 的<u>子串</u>。

## 输入格式

第一行输入一个字符串 $s$ ，仅包含小写字母。

第二行输入一个字符串 $a$ ，首字母大写，其余小写。

第三行输入一个字符串 $b$ ，首字母大写，其余小写。

除此之外，保证 $1 \leq |s|, |a|, |b| \leq 10^5$ ，即保证每个字符串至多由 $10^5$ 个字符构成。

## 输出格式

在一行上输出一个正整数，表示最多能包含多少个子串 $a$ 和子串 $b$ 。

## 示例

### 示例 1

**输入：**

```text
abcdefg
Abc
Fge
```

**输出：**

```text
2
```

**说明：**

将字符串修改成 AbcdFge，包含两个子串 Abc 和 Fge。
