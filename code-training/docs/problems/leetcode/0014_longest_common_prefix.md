---
title: 14. 最长公共前缀
platform: LeetCode
difficulty: Easy
id: 14
url: https://leetcode.cn/problems/longest-common-prefix/
tags:
  - 字符串
  - 字典树
  - 数组
topics: []
patterns: []
date_added: 2026-03-20
date_reviewed: []
---

# 14. 最长公共前缀

## 题目描述

编写一个函数来查找字符串数组中的最长公共前缀。如果不存在公共前缀，返回空字符串 `""`。

**示例**：
- 输入：`strs = ["flower","flow","flight"]` → 输出：`"fl"`
- 输入：`strs = ["dog","racecar","car"]` → 输出：`""`（不存在公共前缀）

**约束**：
- `1 <= strs.length <= 200`
- `0 <= strs[i].length <= 200`
- `strs[i]` 仅由小写英文字母组成

---

## 解题思路

### 问题本质

从第 0 个字符开始，找到所有字符串都共有的最长连续字符序列。公共前缀不可能比最短的字符串还长，一旦某个字符串在某位置不同或已到末尾，匹配即终止。

### 方法一：横向逐个合并

**思路**：以 `strs[0]` 为初始前缀，依次与后面的每个字符串求公共前缀，并用结果更新前缀。若前缀变为空，直接返回 `""`。

```python
class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        if not strs:
            return ""
        def common_prefix(a: str, b: str) -> str:
            i = 0
            while i < len(a) and i < len(b) and a[i] == b[i]:
                i += 1
            return a[:i]

        prefix = strs[0]
        for s in strs[1:]:
            prefix = common_prefix(prefix, s)
            if not prefix:
                return ""
        return prefix
```

**说明**：思路直观，时间复杂度 O(n * m)，空间复杂度 O(m)。

### 方法二：纵向逐列比较（推荐）

**思路**：以 `strs[0]` 为基准，按列（字符下标）逐个比较所有字符串的该列字符。只要任意一个字符串在该列与基准字符不同，或该字符串已到末尾，就返回基准字符串的前 `i` 个字符。

```python
class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        if not strs:
            return ""
        for i, char in enumerate(strs[0]):
            for s in strs[1:]:
                if i >= len(s) or s[i] != char:
                    return strs[0][:i]
        return strs[0]
```

**说明**：不需要额外的辅助函数，且一旦发现不匹配就立即返回，实际中往往比横向合并更快。时间复杂度 O(n * m)，空间复杂度 O(1)。

---

## 完整代码实现

```python
from typing import List

class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        # 空数组没有公共前缀，同时也避免下面取 strs[0] 越界
        if not strs:
            return ""
        # 外层按「列」扫描：i 是字符下标，char 是第一个字符串在该列的字符
        for i, char in enumerate(strs[0]):
            # 内层把这一列拿去和其余每个字符串比
            for s in strs[1:]:
                # 先判 i 是否超出该串长度（更短的串会先到头），再比字符；
                # 用 or 的短路特性保证不会先访问 s[i]
                if i >= len(s) or s[i] != char:
                    # 第一处不一致出现，公共前缀就定格在前 i 个字符
                    return strs[0][:i]
        # 基准串整体都被所有串共享，它自己就是最长公共前缀
        return strs[0]
```

---

## 示例推演

以 `strs = ["flower", "flow", "flight"]` 为例，期望输出 `"fl"`。

以 `strs[0] = "flower"` 为基准，逐列检查：

**第 0 列，`i = 0`，`char = 'f'`**：
- `"flow"[0] = 'f'` == `'f'`，通过
- `"flight"[0] = 'f'` == `'f'`，通过
- 本列全部通过，继续

**第 1 列，`i = 1`，`char = 'l'`**：
- `"flow"[1] = 'l'` == `'l'`，通过
- `"flight"[1] = 'l'` == `'l'`，通过
- 本列全部通过，继续

**第 2 列，`i = 2`，`char = 'o'`**：
- `"flow"[2] = 'o'` == `'o'`，通过
- `"flight"[2] = 'i'` != `'o'`，不匹配！
- 立刻返回 `strs[0][:2]` = `"fl"`

最终结果：`"fl"`，正确。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 横向逐个合并 | O(n * m) | O(m) | n 为字符串数量，m 为最短字符串长度 |
| 纵向逐列比较（推荐） | O(n * m) | O(1) | 提前终止更常用，也更节省空间 |

---

## 易错点总结

- **越界检查优先**：判断 `s[i] != char` 前必须先判断 `i >= len(s)`。利用 `or` 的短路特性可以避免索引越界。
- **切片范围**：发现第 `i` 列不匹配时，公共前缀是前 `i` 列（索引 0 ~ i-1），应返回 `strs[0][:i]`，而不是 `strs[0][:i+1]`。

---

## 扩展思考

- **字典序排序优化**：若先对字符串数组排序，最长公共前缀只需比较排序后的第一个和最后一个字符串即可（因为排序后差异最大的就是首尾两个）。这在字符串数量很多但最长公共前缀很短时可以显著减少比较次数。
- **本题核心**：这道题考查的是对"逐列扫描"思维的运用——将二维问题（多字符串 × 多字符）转化为按列逐步确认的线性扫描，遇到第一个不匹配就停止，避免无效计算。
