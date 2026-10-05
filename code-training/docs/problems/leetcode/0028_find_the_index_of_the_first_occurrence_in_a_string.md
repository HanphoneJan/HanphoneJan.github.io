---
title: 28. 找出字符串中第一个匹配项的下标
platform: LeetCode
difficulty: Easy
sidebar_position: 28
id: 28
url: https://leetcode.cn/problems/find-the-index-of-the-first-occurrence-in-a-string/
tags:
  - 字符串
  - 双指针
topics: []
patterns: []
date_added: 2026-09-29
date_reviewed: []
---

# 28. 找出字符串中第一个匹配项的下标

## 题目描述

给你两个字符串 `haystack` 和 `needle`，请你在 `haystack` 字符串中找出 `needle` 字符串的第一个匹配项的下标（下标从 0 开始）。如果 `needle` 不是 `haystack` 的一部分，则返回 `-1`。

**示例**：
- 输入：`haystack = "sadbutsad", needle = "sad"` → 输出：`0`
- 输入：`haystack = "leetcode", needle = "leeto"` → 输出：`-1`

---

## 解题思路

### 第一步：理解问题本质

字符串匹配：在长串中找短串第一次出现的位置。下标从 0 开始，找不到返回 -1。

### 第二步：暴力解法

用长度为 `len(needle)` 的窗口在 `haystack` 上从左向右滑动，逐个窗口与 `needle` 比较，首次相等的位置即答案。

**算法步骤：**
1. 空模式串返回 `0`（任何位置都能匹配）
2. `len(haystack) < len(needle)` 时返回 `-1`
3. 枚举窗口起点 `left`，比较切片 `haystack[left:left + window]` 与 `needle`
4. 相等就返回 `left`，全部比完仍没找到则返回 `-1`

**窗口起点范围**：窗口右端 `left + window` 不能越界，故 `left` 最大为 `length - window`，即 `range(0, length - window + 1)`。

**为何可接受**：`n`、`m` 规模小（最多约 5×10⁴），Python 的切片比较由 C 层实现，通常足够快。

可运行的完整实现见下一节「完整代码实现」。

### 第三步：优化解法（KMP）

当字符串规模很大或频繁匹配时，朴素算法的 O(n·m) 最坏情况不可接受。KMP 通过预处理 `needle` 的 next 数组，利用已匹配信息避免回溯，将复杂度降到 O(n + m)。

对于本题规模，朴素滑动窗口即可满足要求；KMP 作为进阶优化思路理解即可。

---

## 完整代码实现

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        length = len(haystack)
        window = len(needle)
        if window == 0:
            return 0
        if length < window:
            return -1
        for left in range(0, length - window + 1):
            if needle == haystack[left:left + window]:
                return left
        return -1
```

---

## 示例推演

以 `haystack = "sadbutsad", needle = "sad"` 为例：

`length = 9`，`window = 3`，`left` 从 0 到 `9-3=6`。

| left | 窗口内容 | 是否等于 "sad" |
|------|---------|---------------|
| 0    | "sad"   | ✓ → 返回 0 |

**结果**：`0`。

再以 `haystack = "leetcode", needle = "leeto"` 为例：

`length = 8`，`window = 5`，`left` 从 0 到 3。所有窗口 `"leetc"`、`"eetco"`、`"etcod"`、`"tcode"` 都不等于 `"leeto"`，返回 `-1`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 朴素滑动窗口 | O(n·m) | O(1) | 切片由 C 层实现，本题足够快 |
| KMP | O(n+m) | O(m) | 预处理 next 数组，避免回溯 |

> n 为 haystack 长度，m 为 needle 长度

---

## 易错点总结

1. **空 needle 的处理**：按 LeetCode 语义，`needle` 为空时返回 `0`，而不是 -1。
2. **needle 比 haystack 长**：直接返回 -1，避免切片越界或空转。
3. **窗口起点范围**：`left` 最大为 `length - window`，用 `range(0, length - window + 1)` 保证窗口不越界。
4. **切片比较顺序**：先判断空与长度边界，再进入循环，逻辑更清晰。

---

## 扩展思考

- **KMP 算法**：当 m 很大或匹配频繁时，用 next 数组 O(n+m) 完成匹配。
- **Rabin-Karp**：用滚动哈希把每个窗口比较降到 O(1)，适合多模式匹配。
- 本题是字符串匹配的入门题，理解了朴素窗口就为进阶算法打下基础。

---

## 相关题目

- [14. 最长公共前缀](0014_longest_common_prefix.md)