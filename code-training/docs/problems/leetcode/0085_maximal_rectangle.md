---
title: 最大矩形
platform: LeetCode
difficulty: Hard
id: 85
url: https://leetcode.cn/problems/maximal-rectangle/
tags:
  - 数组
  - 单调栈
  - 动态规划
date_added: 2026-04-24
---

# 85. 最大矩形

## 题目描述

给定一个仅包含 `0` 和 `1` 、大小为 `rows x cols` 的二维二进制矩阵，找出只包含 `1` 的最大矩形，并返回其面积。

## 示例

**示例 1：**
```
输入：matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
输出：6
解释：最大矩形面积为 2 * 3 = 6
```

**示例 2：**
```
输入：matrix = [["0"]]
输出：0
```

---

## 解题思路

### 第一步：理解问题本质

与 [221. 最大正方形](https://leetcode.cn/problems/maximal-square/) 类似，但这里要求的是矩形（不一定是正方形）。

### 第二步：柱状图+单调栈

**核心洞察**：
- 枚举每一行作为矩形的底边
- 计算每个位置向上的连续 `1` 的高度，形成柱状图
- 对每行的柱状图，调用 [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/) 的算法

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    最大矩形 - 单调栈

    枚举每一行作为底边，计算柱状图，调用84题算法

    时间复杂度：O(m * n)
    空间复杂度：O(n)
    """

    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()
                left = st[-1]
                ans = max(ans, heights[i] * (right - left - 1))
            st.append(right)
        return ans

    def maximalRectangle(self, matrix: List[List[str]]) -> int:
        n = len(matrix[0])
        heights = [0] * (n + 1)  # 末尾多一个0
        ans = 0
        for row in matrix:
            for j, c in enumerate(row):
                heights[j] = 0 if c == '0' else heights[j] + 1
            ans = max(ans, self.largestRectangleArea(heights))
        return ans
```

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力 | O(m² * n²) | O(1) | 枚举所有矩形 |
| **单调栈（最优）** | **O(m * n)** | **O(n)** | 每行O(n) |

---

## 相关题目

- [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)
- [221. 最大正方形](https://leetcode.cn/problems/maximal-square/)
