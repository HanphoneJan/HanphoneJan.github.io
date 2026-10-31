---
title: 85. 最大矩形
platform: LeetCode
difficulty: Hard
id: 85
url: https://leetcode.cn/problems/maximal-rectangle/
tags:
  - 数组
  - 单调栈
  - 动态规划
  - 栈
  - 矩阵
patterns:
  - ../../patterns/dynamic_programming.md
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

### 钉住底边：二维问题只剩一维是自由的

要求「只含 1 的矩形」的最大面积。四条边都自由的话，候选有 `O(m²n²)` 个，而且每换一个矩形都要重新检查里面有没有 0。

换个固定的对象：**枚举矩形的底边落在哪一行**。底边一旦钉在第 `r` 行，「第 `j` 列能往上长多高」就完全确定了 —— 从 `(r, j)` 开始往上数连续 `1` 的个数，记作 `heights[j]`。于是「以第 `r` 行为底的所有矩形」这个问题，就退化成了 84 题的形状：

```text
给一排柱子（这一行每列往上连续 1 的高度），求柱状图中最大矩形
```

为什么这样不漏答案：任何只含 1 的矩形，底边必然压在某一行上，而它的高不会超过底边那一行对应列的 `heights`（再往上就碰到 0 了）。所以「每行都取一次最优」就覆盖了全局最优。

### `heights` 的转移：上一行加一，遇 0 清零

`heights` 不需要每行重新数 —— 拿上一行的结果递推：

```text
matrix[r][j] == '1'  ->  heights[j] = heights[j] + 1
matrix[r][j] == '0'  ->  heights[j] = 0
```

第 `r` 行是 `1`，说明这一列「往上连续 1」的长度比上一行多一格；是 `0`，这根柱子在当前行断掉了，高度归零。每行 `O(n)`，`m` 行合计 `O(mn)` —— 这就是本题里「动态规划」的成分：**行与行之间只传一个长度为 `n` 的数组**。

### 每行调用一次 84 题，靠「末尾多出来的那个 0」收尾

规范实现把 84 题封成 `largestRectangleArea`，但和 84 题那篇相比有一处刻意的差别：**它不往数组里加哨兵，而是靠外面那行 `heights = [0] * (n + 1)` 在末尾留了一格恒为 0 的位置**。

那个格子就是尾哨兵：

- 它是 0，比任何柱子都矮，扫到它时栈里的柱子会被全部弹出、结算；
- 它永远不会被更新 —— `for j, c in enumerate(row)` 只走到第 `n-1` 列，最后一格没人碰。

栈底用 `-1` 当下标哨兵（`st = [-1]`），配 `while len(st) > 1` 保证不会把它弹掉，于是宽度公式里的 `left = st[-1]` 永远有效：最左边那根柱子弹完之后，栈顶正好是 `-1`。

```python
from typing import List

class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]                       # 栈底哨兵：左边界可以取到 -1
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()
                left = st[-1]           # 弹栈后的栈顶 = 左边第一个更矮的
                ans = max(ans, heights[i] * (right - left - 1))
            st.append(right)
        return ans

    def maximalRectangle(self, matrix: List[List[str]]) -> int:
        n = len(matrix[0])
        heights = [0] * (n + 1)         # 多出来的最后一格是尾哨兵
        ans = 0
        for row in matrix:
            for j, c in enumerate(row):
                heights[j] = 0 if c == '0' else heights[j] + 1
            ans = max(ans, self.largestRectangleArea(heights))
        return ans
```

三个关键点各自对应一行：`heights[j] = 0 if c == '0' else heights[j] + 1` 是那步 DP；`enumerate(row)`（而不是 `range(len(heights))`）保证尾哨兵不被改写；`len(st) > 1` 保证 `-1` 不被弹出。

顺带说清一个容易误会的地方：84 题那篇的弹出条件是 `>`，这里写的是 `>=`。两种都能取到最大值 —— 区别只在「等高的柱子由哪一根负责算完整宽度」，`>=` 弹掉左边那根、由最右边那根算，`>` 反过来。不要以为其中一个是 bug。

### 换成三个数组：不用栈，记「这个高度能延伸到哪一列」

同样按行推进，但把 84 题的栈换成三个数组，直接记录每个位置的矩形边界：

- `height[j]`：第 `j` 列往上连续 1 的个数，和上面一样；
- `left[j]`：高度为 `height[j]` 的矩形，最左能到哪一列；
- `right[j]`：最右能到哪一列（**开区间**，右边界的下一列）。

关键在于两个「夹紧」动作。上一行算出的 `left[j]` 对当前行仍然有效（高度又长了一格，横向跨度只会更宽、不会更窄），但它不能越过本行出现过的 0，所以取 `max(left[j], cur_left)`；`right` 对称地取 `min` 与 `cur_right`。遇到 0 就把这一列的 `height`/`left`/`right` 全部重置，否则下次这列重新变 1 时会继承一段早已断掉的旧边界。

```python
from typing import List

class Solution:
    def maximalRectangle(self, matrix: List[List[str]]) -> int:
        m, n = len(matrix), len(matrix[0])
        height = [0] * n          # 这一列往上连续 1 的个数
        left = [0] * n            # 高度为 height[j] 的矩形左边界（闭）
        right = [n] * n           # 右边界（开），初值 n 表示可以贴到最右
        ans = 0

        for r in range(m):
            cur_left, cur_right = 0, n
            # 从左往右：更新高度，并把左边界夹到本行上一个 0 之后
            for j in range(n):
                if matrix[r][j] == '1':
                    height[j] += 1
                    left[j] = max(left[j], cur_left)
                else:
                    height[j] = 0
                    left[j] = 0
                    cur_left = j + 1
            # 从右往左：右边界对称地夹紧
            for j in range(n - 1, -1, -1):
                if matrix[r][j] == '1':
                    right[j] = min(right[j], cur_right)
                else:
                    right[j] = n
                    cur_right = j
            # 这一行所有「以 j 列为高的矩形」结算
            for j in range(n):
                ans = max(ans, height[j] * (right[j] - left[j]))

        return ans
```

两个版本时间、空间同阶，差别在手感：栈版每行只扫一趟，逻辑集中在一个 `while`；数组版每行扫三趟、多两个数组，但没有栈的「弹出顺序」要跟踪，边界是**显式**的。代价是 `else` 分支里那两次重置（`left[j] = 0`、`right[j] = n`）很容易漏 —— 漏了以后某一列重新变回 1 时会带着上一段的旧边界，矩形被夹窄、结果偏小：`[["0","1","0"],["1","0","1"],["1","1","1"]]` 会返回 2 而不是 3。

| 写法 | 时间 | 空间 | 特点 |
|---|---|---|---|
| 每行柱状图 + 单调栈 | O(m * n) | O(n) | 直接复用 84 题，逻辑紧凑 |
| 每行左右边界 DP | O(m * n) | O(n) | 不用栈，边界显式，但每行三趟 |

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

## 示例推演

以示例 1 的矩阵为例：

```text
1 0 1 0 0
1 0 1 1 1
1 1 1 1 1
1 0 0 1 0
```

每读一行就更新 `heights`，再对这一排柱子求一次 84 题的答案（`heights` 末尾那个 0 是尾哨兵，不占矩阵的列）：

| 第几行 | 该行的 `heights`（含尾哨兵） | 这一行能得到的最大面积 | 是哪块矩形 |
|---|---|---|---|
| 0（`1 0 1 0 0`） | `[1,0,1,0,0,0]` | 1 | 单独一根高 1 的柱子 |
| 1（`1 0 1 1 1`） | `[2,0,2,1,1,0]` | 3 | 第 2~4 列，高 1 宽 3 |
| 2（`1 1 1 1 1`） | `[3,1,3,2,2,0]` | 6 | 第 2~4 列，高 2 宽 3 |
| 3（`1 0 0 1 0`） | `[4,0,0,3,0,0]` | 4 | 第 0 列，高 4 宽 1 |

逐行核对一遍第 2 行（下标 2，也就是从上往下第三行）：`heights = [3,1,3,2,2]`。柱 2、3、4 的高度是 3、2、2，最矮的是 2，这一段宽 3，`2 × 3 = 6`；左边第 1 列高度只有 1，把它也算进去的话最矮变成 1、面积只剩 5，所以左边界停在它右边。这就是答案 6 —— 对应矩阵里下标 1、2 两行的第 2~4 列，`2 × 3`。

再看示例 2：`matrix = [["0"]]`，`heights` 是 `[0, 0]`。第一行遇到 `'0'` 高度归零，栈里从头到尾没有可结算的柱子，返回 0。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 枚举矩形（暴力） | O(m²n²) | O(1) | 每个矩形还要扫一遍判断是否全 1 |
| 每行柱状图 + 单调栈（最优） | O(m * n) | O(n) | 每行 O(n) 更新高度 + O(n) 单调栈，共 m 行 |
| 每行左右边界 DP | O(m * n) | O(n) | 每行扫三趟，常数略大 |

> `m` 是行数，`n` 是列数。

---

## 易错点总结

1. **`heights` 末尾那个 0 是功能性的，不能删**：改成 `[0] * n` 后没有任何元素比栈里的柱子矮，收不了尾；`matrix = [["1"],["1"],["1"]]` 这种「一整列都是 1」的输入返回 0 而不是 3 —— 那一格高度涨到 3 却从没被弹出结算。
2. **遇到 `'0'` 必须把高度清零**：写成 `heights[j] = heights[j] + 1 if c == '1' else heights[j]`，0 的位置会继承上一行的高度，矩形能跨过空洞；`matrix = [["1"],["0"],["1"]]` 返回 2 而不是 1。
3. **内层循环的边界是 `row` 的长度，不是 `heights` 的长度**：把 `for j, c in enumerate(row)` 改成 `for j in range(len(heights))`，多出来那一格取 `row[n]` 直接抛 `IndexError: list index out of range`。

---

## 相关题目

- [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)
- [221. 最大正方形](https://leetcode.cn/problems/maximal-square/)
