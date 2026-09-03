---
title: 回文子串
platform: LeetCode
difficulty: Medium
id: 647
url: https://leetcode.cn/problems/palindromic-substrings/
tags:
  - 字符串
  - 回文
  - Manacher
date_added: 2026-04-24
---

# 647. 回文子串

## 题目描述

给你一个字符串 `s`，请你统计并返回这个字符串中 **回文子串** 的数目。

回文字符串是正着读和倒过来读一样的字符串。

子字符串是字符串中的由连续字符组成的一个序列。

## 示例

**示例 1：**
```
输入：s = "abc"
输出：3
解释：回文子串有 "a", "b", "c"
```

**示例 2：**
```
输入：s = "aaa"
输出：6
解释：回文子串有 "a", "a", "a", "aa", "aa", "aaa"
```

---

## 解题思路

### 第一步：理解问题本质

需要统计字符串中所有回文子串的数量。关键问题是：**如何高效判断和统计所有回文子串？**

### 第二步：中心扩展

**思路**：枚举每个中心（每个字符和每两个字符之间），向两边扩展。

```python
class Solution:
    def countSubstrings(self, s: str) -> int:
        n = len(s)
        ans = 0
        for i in range(2 * n - 1):
            l, r = i // 2, (i + 1) // 2
            while l >= 0 and r < n and s[l] == s[r]:
                ans += 1
                l -= 1
                r += 1
        return ans
```

**时间复杂度**：O(n²)

### 第三步：Manacher算法（最优）

**核心洞察**：
- 将字符串改造，插入 `#`，首尾添加 `^` 和 `$`
- 这样所有回文子串都变成奇回文串（有确定的中心）
- 利用已计算过的回文区间，通过对称性推断新区间的初始值

---

## 完整代码实现

```python
class Solution:
    """
    回文子串 - Manacher算法

    时间复杂度：O(n)
    空间复杂度：O(n)
    """

    def countSubstrings(self, s: str) -> int:
        # 将 s 改造为 t
        # 这样就不需要讨论 len(s) 的奇偶性
        t = "#".join("^" + s + "$")

        half_len = [0] * (len(t) - 2)
        half_len[1] = 1
        ans = box_m = box_r = 0

        for i in range(2, len(half_len)):
            hl = 1
            if i < box_r:
                # 利用对称性
                hl = min(half_len[box_m * 2 - i], box_r - i)

            # 暴力扩展
            while t[i - hl] == t[i + hl]:
                hl += 1
                box_m, box_r = i, i + hl

            half_len[i] = hl
            ans += hl // 2

        return ans


# 中心扩展解法（供参考）
class Solution2:
    def countSubstrings(self, s: str) -> int:
        n = len(s)
        ans = 0
        for i in range(2 * n - 1):
            l, r = i // 2, (i + 1) // 2
            while l >= 0 and r < n and s[l] == s[r]:
                ans += 1
                l -= 1
                r += 1
        return ans
```

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 中心扩展 | O(n²) | O(1) | 枚举2n-1个中心 |
| **Manacher（最优）** | **O(n)** | **O(n)** | 利用对称性 |

---

## 易错点总结

### 1. Manacher算法的下标转换

改造后的字符串中，实际回文子串数量和 `half_len` 的关系需要仔细推导。

---

## 相关题目

- [5. 最长回文子串](https://leetcode.cn/problems/longest-palindromic-substring/)
- [214. 最短回文串](https://leetcode.cn/problems/shortest-palindrome/)
