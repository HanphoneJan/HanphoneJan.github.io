---
title: 最大正方形
platform: LeetCode
difficulty: Medium
id: 221
url: https://leetcode.cn/problems/maximal-square/
tags:
  - 数组
  - 动态规划
  - 单调栈
date_added: 2026-04-24
---

# 221. 最大正方形

## 题目描述

在一个由 `'0'` 和 `'1'` 组成的二维矩阵内，找到只包含 `'1'` 的最大正方形，并返回其面积。

## 示例

**示例 1：**
```
输入：matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
输出：4
解释：最大正方形的边长为 2，面积为 4
```

**示例 2：**
```
输入：matrix = [["0","1"],["1","0"]]
输出：1
```

**示例 3：**
```
输入：matrix = [["0"]]
输出：0
```

---

## 解题思路

### 第一步：理解问题本质

我们需要找到全为 `'1'` 的最大正方形。关键问题是：**如何快速判断以某个位置为右下角的正方形是否全为 `'1'`？**

### 第二步：暴力解法

**思路**：枚举每个位置作为正方形的左上角，然后尝试扩展边长，检查正方形内是否全为 `'1'`。

```python
class Solution:
    def maximalSquare(self, matrix: List[List[str]]) -> int:
        m, n = len(matrix), len(matrix[0])
        ans = 0
        for i in range(m):
            for j in range(n):
                if matrix[i][j] == '0':
                    continue
                # 尝试扩展边长
                k = 1
                while i + k < m and j + k < n:
                    # 检查新增的行和列是否全为 '1'
                    valid = True
                    for x in range(i, i + k + 1):
                        if matrix[x][j + k] == '0':
                            valid = False
                            break
                    for y in range(j, j + k + 1):
                        if matrix[i + k][y] == '0':
                            valid = False
                            break
                    if not valid:
                        break
                    k += 1
                ans = max(ans, k * k)
        return ans
```

**为什么不够好**：
- 时间复杂度是 O(m * n * min(m,n)²)，当矩阵很大时效率很低

### 第三步：优化解法 —— 柱状图+单调栈

**思路**：将每行看作底边，计算每个位置向上的连续 `'1'` 的高度（形成柱状图），然后对每行使用84题的最大矩形算法。

**关键洞察**：
- 以第 i 行为底边的最大正方形，等于以该行为底边的柱状图中能形成的最大正方形
- 从矩形中取正方形：边长 = min(高, 宽)

```python
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()
                left = st[-1]
                w = right - left - 1
                side = min(heights[i], w)
                ans = max(ans, side * side)
            st.append(right)
        return ans

    def maximalSquare(self, matrix: List[List[str]]) -> int:
        n = len(matrix[0])
        heights = [0] * (n + 1)
        ans = 0
        for row in matrix:
            for j, c in enumerate(row):
                heights[j] = 0 if c == '0' else heights[j] + 1
            ans = max(ans, self.largestRectangleArea(heights))
        return ans
```

### 第四步：最优解法 —— 动态规划

**核心洞察**：
- `dp[i][j]` 表示以 `(i,j)` 为右下角的最大正方形边长
- 如果 `matrix[i][j] == '0'`，则 `dp[i][j] = 0`
- 如果 `matrix[i][j] == '1'`，则 `dp[i][j] = min(dp[i-1][j], dp[i-1][j-1], dp[i][j-1]) + 1`

**为什么取 min**：
- 正方形的边长受限于上方、左方、左上方三个方向的最小值
- 这三个方向中任何一个的较短边长，都会限制当前位置能扩展的正方形大小

**状态转移方程**：
```
dp[i][j] = 0                                    if matrix[i][j] == '0'
dp[i][j] = min(dp[i-1][j], dp[i-1][j-1], dp[i][j-1]) + 1   if matrix[i][j] == '1'
```

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    最大正方形 - 动态规划解法

    dp[i][j] 表示以 (i,j) 为右下角的最大正方形边长
    时间复杂度：O(m * n)
    空间复杂度：O(n)（滚动数组优化）
    """

    def maximalSquare(self, matrix: List[List[str]]) -> int:
        if not matrix or not matrix[0]:
            return 0

        m, n = len(matrix), len(matrix[0])
        # 使用滚动数组，只需要一维dp
        dp = [0] * (n + 1)
        ans = 0
        prev = 0  # 保存 dp[i-1][j-1]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                temp = dp[j]  # 保存当前 dp[j]（即上一行的 dp[i-1][j]）
                if matrix[i - 1][j - 1] == '1':
                    # dp[j] 当前是 dp[i-1][j]（上一行同列）
                    # dp[j-1] 是 dp[i][j-1]（当前行前一列）
                    # prev 是 dp[i-1][j-1]（左上角）
                    dp[j] = min(dp[j], dp[j - 1], prev) + 1
                    ans = max(ans, dp[j])
                else:
                    dp[j] = 0
                prev = temp
            prev = 0  # 每行开始时重置

        return ans * ans


# 柱状图+单调栈解法（供参考）
class SolutionStack:
    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()
                left = st[-1]
                w = right - left - 1
                side = min(heights[i], w)
                ans = max(ans, side * side)
            st.append(right)
        return ans

    def maximalSquare(self, matrix: List[List[str]]) -> int:
        n = len(matrix[0])
        heights = [0] * (n + 1)
        ans = 0
        for row in matrix:
            for j, c in enumerate(row):
                heights[j] = 0 if c == '0' else heights[j] + 1
            ans = max(ans, self.largestRectangleArea(heights))
        return ans
```

---

## 示例推演

以 `matrix = [["1","0","1","1","1"],["1","0","1","1","1"]]` 为例：

| i\j | 1 | 2 | 3 | 4 | 5 |
|-----|---|---|---|---|---|
| 1 | 1 | 0 | 1 | 1 | 1 |
| 2 | 1 | 0 | 1 | 1 | 1 |

**DP 过程**：

| 步骤 | (i,j) | matrix | 依赖 | dp[j] |
|------|-------|--------|------|-------|
| 1 | (1,1) | '1' | min(0,0,0)+1 | 1 |
| 2 | (1,3) | '1' | min(0,0,0)+1 | 1 |
| 3 | (1,4) | '1' | min(0,1,0)+1 | 1 |
| 4 | (1,5) | '1' | min(0,1,1)+1 | 1 |
| 5 | (2,1) | '1' | min(1,0,0)+1 | 1 |
| 6 | (2,3) | '1' | min(1,0,0)+1 | 1 |
| 7 | (2,4) | '1' | min(1,1,0)+1 | 2 |
| 8 | (2,5) | '1' | min(1,2,1)+1 | 2 |

最大边长为 2，面积为 **4**。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力 | O(m*n*min(m,n)²) | O(1) | 枚举所有正方形 |
| 柱状图+单调栈 | O(m*n) | O(n) | 利用84题算法 |
| **DP（最优）** | **O(m*n)** | **O(n)** | 滚动数组优化 |

---

## 易错点总结

### 1. DP状态定义

**错误理解**：`dp[i][j]` 表示以 `(i,j)` 为左上角的正方形边长。

**正确理解**：`dp[i][j]` 表示以 `(i,j)` 为**右下角**的正方形边长。这样状态转移才能利用上方和左方的信息。

### 2. 为什么取 min

**常见疑惑**：为什么不是取 max？

**解释**：正方形的边长受限于三个方向的最短边。如果上方只能形成边长为2的正方形，那么当前位置最多也只能形成边长为3的正方形（在上方基础上扩展一层）。

### 3. 滚动数组的 prev

使用滚动数组时，`prev` 保存的是 `dp[i-1][j-1]`（左上角的值）。注意在更新 `dp[j]` 之前就要保存旧的 `dp[j]`（即 `dp[i-1][j]`），用于下一轮作为 `prev`。

---

## 扩展思考

### 1. 如果要求最大矩形（不一定是正方形）？

这就是 [85. 最大矩形](https://leetcode.cn/problems/maximal-rectangle/)，使用柱状图+单调栈，不需要取 min，直接计算面积。

### 2. 空间优化

可以使用一维数组 + 一个变量实现，空间复杂度降为 O(n)。

### 3. 如果矩阵很大

柱状图方法的常数更小，在某些情况下可能更快。

---

## 相关题目

- [85. 最大矩形](https://leetcode.cn/problems/maximal-rectangle/)
- [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)
