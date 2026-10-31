---
title: 74. 搜索二维矩阵
platform: LeetCode
difficulty: Medium
id: 74
url: https://leetcode.cn/problems/search-a-2d-matrix/
tags:
  - 数组
  - 二分查找
  - 矩阵
patterns:
  - ../../patterns/search.md
date_added: 2026-03-25
---

# 74. 搜索二维矩阵

## 题目描述

给你一个满足下述两条属性的 `m x n` 整数矩阵：

1. 每行中的整数从左到右按非严格递增顺序排列。
2. 每行的第一个整数大于前一行的最后一个整数。

给你一个整数 `target`，如果 `target` 在矩阵中，返回 `true`；否则，返回 `false`。

## 示例

**示例 1：**
```
输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
输出：true
```

**示例 2：**
```
输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13
输出：false
```

---

## 解题思路

### 两条性质合起来，矩阵就是一个有序数组

两条性质单独看都不够用，合起来才是这题的钥匙：行内从左到右递增，**并且**下一行的第一个数严格大于上一行的最后一个数。把矩阵按行首尾相接摊平，得到的 `m × n` 个数整体递增 —— 不是「大致有序」，是中间没有断层的有序。

于是「在矩阵里查 `target`」与「在长度为 `m × n` 的有序数组里查 `target`」是同一件事，二分的适用条件完全成立。剩下的唯一问题是：一维下标怎么换算回行列。

### 下标换算：`idx // n` 与 `idx % n`

摊平后第 `idx` 个数（0 起）在原来的矩阵里是第 `idx // n` 行、第 `idx % n` 列 —— 每凑满 `n` 个换一行。反过来是 `(i, j) -> i * n + j`。

这一行换算是算法与矩阵之间的唯一接口，整份代码里只有它需要想；写反了就是一个不报错但答案全错的 bug（见「易错点」）。

### 方法一：把矩阵当成一维数组二分

既然摊平之后有序，就把二分原样搬过来，只在「取第 `mid` 个数」这一步换算行列。

```python
from typing import List

class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        m, n = len(matrix), len(matrix[0])
        left, right = 0, m * n      # 左闭右开：right 是「取不到」的下一个位置

        while left < right:
            mid = (left + right) // 2
            x = matrix[mid // n][mid % n]   # 一维下标 -> 行列
            if x == target:
                return True
            if x < target:
                left = mid + 1
            else:
                right = mid

        return False
```

`right` 取 `m * n` 而不是 `m * n - 1`，是左闭右开区间的写法：循环条件是 `left < right`，收缩时 `right = mid`。好处是「区间为空」只有一种形态（`left == right`），不用再记 `<=` 与 `mid - 1` 的配对；代价是 `right` 比最后一个下标大 1，容易在初值上写错。

### 方法二：两段二分（先找行，再在行内找）

换个角度：性质 2 说明行与行之间是「整段分开」的，所以可以先在第一列上二分，找出唯一可能包含 `target` 的那一行 —— 第一个元素 `<= target` 的最后一行；再在这一行里二分。

```python
from typing import List
from bisect import bisect_left, bisect_right

class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        n = len(matrix[0])
        # 首元素 <= target 的最后一行；target 比 matrix[0][0] 还小时得到 -1
        row = bisect_right([r[0] for r in matrix], target) - 1
        if row < 0:
            return False
        j = bisect_left(matrix[row], target)
        return j < n and matrix[row][j] == target
```

两个 `bisect` 的语义完全不同，不能互换：`bisect_right` 返回插入点，减 1 才落到「首元素不大于 `target` 的最后一行」；`bisect_left` 返回第一个 `>= target` 的位置，所以最后还要再确认那一格**等于** `target` —— 它可能是个更大的数，也可能落在行末之外。

两种写法渐进同阶（`log m + log n` 与 `log(m·n)` 是同一个量），差别在常数与可读性：一维版每步一次除法加一次取模，但只有一段循环，逻辑一条线；两段版没有除法，第二段直接在 list 上走 C 实现的 `bisect`，常数更小，代价是多一个「行下标为 -1」的边界要处理。

---

## 完整代码实现

下面这段是本题的基准实现（页面上的逐帧可视化回放的也是这一段）：一次一维下标二分，左闭右开。两段二分的版本见上文「方法二」。

```python
from typing import List

class Solution:
    """
    搜索二维矩阵 - 二分查找

    核心思想：
    矩阵每行从左到右递增，每行第一个数大于上一行最后一个数。
    可以将二维矩阵视为一个有序的一维数组进行二分查找。

    虚拟索引转换：
    对于虚拟索引 idx，对应的矩阵位置为：
    - 行号：idx // n
    - 列号：idx % n

    时间复杂度：O(log(m*n)) = O(log m + log n)
    空间复杂度：O(1)
    """

    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        m, n = len(matrix), len(matrix[0])
        left, right = 0, m * n  # 将二维矩阵视为一维有序数组，左闭右开区间

        while left < right:  # 不使用 <=：左闭右开写法更统一
            mid = (left + right) // 2
            x = matrix[mid // n][mid % n]
            if x == target:
                return True
            elif x < target:
                left = mid + 1
            else:
                right = mid  # 收缩右边界到 mid
        return False
```

---

## 示例推演

以示例 1 的矩阵、`target = 3` 为例，`m = 3`、`n = 4`，所以 `left = 0`、`right = 12`：

| 轮次 | `left` | `right` | `mid` | `matrix[mid // 4][mid % 4]` | 比较 | 动作 |
|---|---|---|---|---|---|---|
| 1 | 0 | 12 | 6 | `matrix[1][2] = 16` | 16 > 3 | `right = 6` |
| 2 | 0 | 6 | 3 | `matrix[0][3] = 7` | 7 > 3 | `right = 3` |
| 3 | 0 | 3 | 1 | `matrix[0][1] = 3` | 相等 | 返回 `True` |

同一条路径换成 `target = 13` 就不命中，而且能看清左闭右开的收尾：

| 轮次 | `left` | `right` | `mid` | 取到的值 | 比较 | 动作 |
|---|---|---|---|---|---|---|
| 1 | 0 | 12 | 6 | 16 | 16 > 13 | `right = 6` |
| 2 | 0 | 6 | 3 | 7 | 7 < 13 | `left = 4` |
| 3 | 4 | 6 | 5 | `matrix[1][1] = 11` | 11 < 13 | `left = 6` |
| — | 6 | 6 | — | — | `left < right` 不成立 | 返回 `False` |

最后一轮 `left` 正好走到 `right` 上，循环自然退出，不需要再单独判一次「只剩一个元素」。这也是 `right = m * n` 的用处：下标 11（值 60）在区间 `[0, 12)` 里，永远不会被落下。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐格扫描 | O(m×n) | O(1) | 最容易想到，但没用上「整体有序」 |
| 两段二分 | O(log m + log n) | O(m) | 第一列另建一张长度为 m 的表，再在行内二分 |
| 一维下标二分（最优） | O(log(m×n)) | O(1) | 一次二分，每步换算出行列 |

> `log(m×n) = log m + log n`，后两行只是常数与写法不同。不想要那张长度为 `m` 的临时表，就把 `bisect_right` 换成手写二分。

---

## 易错点总结

1. **`mid // n` 与 `mid % n` 写反**：`matrix[mid % n][mid // n]` 在 `m ≠ n` 时直接 `IndexError: list index out of range`（示例 1 是 3 行 4 列，`mid % 4` 会取到 3，而只有 3 行）；`m == n` 时不报错，只是读到错误的格子，答案悄悄变错。
2. **`right` 初始化成 `m * n - 1` 却仍写 `while left < right`**：最后一个元素永远取不到。示例 1 里 `target = 60`（矩阵最大值）会返回 `False`。要么 `right = m * n`，要么改成 `while left <= right` 配 `right = mid - 1`，两者只能选一套。
3. **两段版把 `bisect_right` 写成 `bisect_left`**：`target` 恰好等于某行首元素时，`row` 会退到上一行，然后在上一行里找不到它。示例 1 里 `target = 10` 与 `target = 23` 都会返回 `False`。

---

## 扩展思考

- **240 题（搜索二维矩阵 II）不能这样压平**：它的两条性质是「行内递增、列内递增」，但下一行首元素**不一定**大于上一行末元素，整体不再有序，二分的前提直接消失。那题的正解是从右上角出发的阶梯法：当前格比 `target` 大就往左，小就往下，`O(m + n)`。两题长得像，判据只有一条 —— 摊平后是不是有序。
- **矩阵本身用一维数组存时**（`numpy` 的 `reshape` 视图、flat 存储），方法一几乎不用改：`matrix[idx]` 就是摊平后的访问，连除法都可以省掉。

---

## 相关题目

- [240. 搜索二维矩阵 II](https://leetcode.cn/problems/search-a-2d-matrix-ii/)
