---
title: 54. 螺旋矩阵
platform: LeetCode
difficulty: Medium
id: 54
url: https://leetcode.cn/problems/spiral-matrix/
tags:
  - 数组
  - 矩阵
  - 模拟
topics: []
patterns: []
date_added: 2026-03-23
date_reviewed: []
---

# 0054. 螺旋矩阵

## 题目描述

给你一个 `m` 行 `n` 列的矩阵 `matrix` ，请按照 **顺时针螺旋顺序** ，返回矩阵中的所有元素。

## 示例

**示例 1：**
```
输入：matrix = [[1,2,3],[4,5,6],[7,8,9]]
输出：[1,2,3,6,9,8,7,4,5]
```

**示例 2：**
```
输入：matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]
输出：[1,2,3,4,8,12,11,10,9,5,6,7]
```

---

## 解题思路

### 输出是一条路径：每个格子恰好进一次

答案长度固定是 `m × n`，顺序由「贴着当前这一层的四条边走」决定。所以这题没有优化目标，只有**模拟得对不对**：任何写法只要保证每个格子恰好进 `ans` 一次，就是正解。

唯一的难点出现在最内层：剩下的区域可能已经退化成一**行**或一**列**，而「上边、右边、下边、左边」这四次遍历里，有两次会重复走同一批格子。两种主流写法分别在两个层面处理它 —— 边界收缩靠**边界大小**判断，方向模拟靠 **`visited` 标记**判断。

### 方法一：边界收缩（四个变量框住还没走的部分）

把还没访问的区域看成一个矩形，用 `top / bottom / left / right` 四条边描述：

```text
       left        right
        ┌───────────┐
  top   │           │
        │           │
        │           │
 bottom └───────────┘
```

一轮走四条边，顺序固定「上 → 右 → 下 → 左」，每走完一条就把那条边界推进一格。当 `top > bottom` 或 `left > right` 时矩形已经空了，循环结束。

```python
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        ans = []

        while top <= bottom and left <= right:
            for col in range(left, right + 1):          # 上边：左 -> 右
                ans.append(matrix[top][col])
            top += 1

            for row in range(top, bottom + 1):          # 右边：上 -> 下
                ans.append(matrix[row][right])
            right -= 1

            if top <= bottom:                           # 下边还在，才走
                for col in range(right, left - 1, -1):
                    ans.append(matrix[bottom][col])
                bottom -= 1

            if left <= right:                           # 左边还在，才走
                for row in range(bottom, top - 1, -1):
                    ans.append(matrix[row][left])
                left += 1

        return ans
```

两处 `if` 是这份代码的全部难点，也是它省掉 `visited` 数组要付的代价。上边与右边走完之后，`top` 已经加 1、`right` 已经减 1，此时：

- 如果只剩**一行**，那么 `top > bottom` —— 那一行正是刚才走过的「上边」，再执行下边循环就重复了；
- 如果只剩**一列**，那么 `left > right` —— 那一列已经被「右边」走过。

拿 1×4 的矩阵 `[[1,2,3,4]]` 走一遍最直观：上边输出 `[1,2,3,4]` 后 `top = 1 > bottom = 0`，若不判就执行下边循环，`range(right=2, left-1=-1, -1)` 会把 `3,2,1` 再输出一遍。

### 方法二：方向模拟（按格子走，撞墙或撞已访问就右转）

不做「一条边一次走完」，而是**一个格子一个格子地挪**：当前位置记作 `(row, col)`，方向按 右 → 下 → 左 → 上 循环。每一步先看下一步是否合法（在矩阵内，且没访问过），不合法就把方向右转一次。

```python
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        rows, cols = len(matrix), len(matrix[0])
        visited = [[False] * cols for _ in range(rows)]
        dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # 右、下、左、上
        d = 0
        row = col = 0
        ans = []

        for _ in range(rows * cols):
            ans.append(matrix[row][col])
            visited[row][col] = True
            nr, nc = row + dirs[d][0], col + dirs[d][1]
            if not (0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc]):
                d = (d + 1) % 4                     # 右转
                nr, nc = row + dirs[d][0], col + dirs[d][1]   # 按新方向重算
            row, col = nr, nc

        return ans
```

循环用**总格数** `rows * cols`，而不是「下一步不合法就停」：每格恰好访问一次，所以走满 `m × n` 次必然结束，终止条件不需要另外论证；`visited` 只负责转向这一件事。

代价是 `O(m × n)` 的 `visited` 表。换来的好处是**转向逻辑与形状无关** —— 长宽不等的矩形，或者 885 题那种边长为 1、1、2、2、3、3… 的螺旋，差别只在「什么时候右转」，四条边的推进顺序完全一样。

### 两种写法怎么选

边界收缩：`O(1)` 额外空间，没有取模、没有方向数组；但两处 `if` 必须写对，而它们对不对取决于你是否真的想清楚「`top` 加 1 之后还剩什么」。

方向模拟：更接近「用手指在纸上画」的过程，任何形状都能套；代价是多一张 `visited` 表，循环次数要单独算。

判题只看输出，两者都对。矩阵很大、`visited` 会明显吃内存时用边界收缩；需要快速改造成别的螺旋形状时用方向模拟。

---

## 完整代码实现

下面这段是本题的基准实现（页面上的「跑样例」与逐帧可视化回放的也是这一段），两个方法分别是上面的边界收缩与方向模拟，方便对照。

```python
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        """
        螺旋矩阵 - 边界收缩法（推荐）

        核心思想：用四个边界变量，遍历完一条边就收缩边界
        """
        if not matrix or not matrix[0]:
            return []

        rows, cols = len(matrix), len(matrix[0])
        ans = []

        # 定义四个边界
        top, bottom = 0, rows - 1
        left, right = 0, cols - 1

        while top <= bottom and left <= right:
            # 从左到右遍历上边
            for col in range(left, right + 1):
                ans.append(matrix[top][col])
            top += 1  # 上边界下移

            # 从上到下遍历右边
            for row in range(top, bottom + 1):
                ans.append(matrix[row][right])
            right -= 1  # 右边界左移

            # 从右到左遍历下边（需要检查是否还有行）
            if top <= bottom:
                for col in range(right, left - 1, -1):
                    ans.append(matrix[bottom][col])
                bottom -= 1  # 下边界上移

            # 从下到上遍历左边（需要检查是否还有列）
            if left <= right:
                for row in range(bottom, top - 1, -1):
                    ans.append(matrix[row][left])
                left += 1  # 左边界右移

        return ans

    def spiralOrderSimulate(self, matrix: List[List[int]]) -> List[int]:
        """
        方向数组模拟法
        """
        if not matrix or not matrix[0]:
            return []

        rows, cols = len(matrix), len(matrix[0])
        total = rows * cols

        # visited 数组标记已访问的位置
        visited = [[False] * cols for _ in range(rows)]

        # 四个方向：右、下、左、上（顺时针）
        directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
        direction_idx = 0

        ans = []
        row, col = 0, 0

        for _ in range(total):
            ans.append(matrix[row][col])
            visited[row][col] = True

            # 计算下一个位置
            next_row = row + directions[direction_idx][0]
            next_col = col + directions[direction_idx][1]

            # 检查是否需要转向
            if not (0 <= next_row < rows and
                    0 <= next_col < cols and
                    not visited[next_row][next_col]):
                direction_idx = (direction_idx + 1) % 4
                next_row = row + directions[direction_idx][0]
                next_col = col + directions[direction_idx][1]

            row, col = next_row, next_col

        return ans
```

---

## 示例推演

以示例 1 的 `matrix = [[1,2,3],[4,5,6],[7,8,9]]` 为例，初始 `top=0, bottom=2, left=0, right=2`：

**第一轮**

| 顺序 | 走哪条边 | 下标 | 取到的值 | 之后 |
|---|---|---|---|---|
| 1 | 上边（左→右） | `[0][0..2]` | 1, 2, 3 | `top = 1` |
| 2 | 右边（上→下） | `[1..2][2]` | 6, 9 | `right = 1` |
| 3 | 下边（右→左） | `[2][1..0]` | 8, 7 | `bottom = 1` |
| 4 | 左边（下→上） | `[1][0]` | 4 | `left = 1` |

下边那一行走的是 `range(right=1, left-1=-1, -1)`，即列 1、0 —— 右下角 `9` 在右边那一步已经取过，所以从列 1 开始往回，不会重复。左边那一步同理：下边界已经缩到 1，`range(bottom=1, top-1=0, -1)` 只取行 1。

**第二轮**：此时 `top=1, bottom=1, left=1, right=1`，矩形缩成中间那一格。

| 顺序 | 走哪条边 | 下标 | 取到的值 | 之后 |
|---|---|---|---|---|
| 1 | 上边 | `[1][1..1]` | 5 | `top = 2` |
| 2 | 右边 | `[2..1][1]` | 空（`top > bottom`） | `right = 0` |
| 3 | 下边 | — | `top <= bottom` 为假，跳过 | — |
| 4 | 左边 | — | `left <= right` 为假，跳过 | — |

`top = 2 > bottom = 1`，循环结束，`ans = [1,2,3,6,9,8,7,4,5]`，与示例一致。

再换成示例 2 的 3×4 矩阵，第一轮取 `[1,2,3,4] / [8,12] / [11,10,9] / [5]`，第二轮只剩中间两格：上边取 `[6,7]`，随后 `top = 2 > bottom = 1`，下边与左边都被 `if` 挡住，输出 `[1,2,3,4,8,12,11,10,9,5,6,7]`，共 12 个。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 方向模拟 | O(m×n) | O(m×n) | 需要 visited 表，每个格子走一次 |
| 边界收缩（最优） | O(m×n) | O(1) | 四个边界变量，每个格子只进 ans 一次 |

---

## 易错点总结

1. **下边 / 左边那两处 `if top <= bottom` / `if left <= right` 删掉**：`1×4` 的矩阵会输出 `[1,2,3,4,3,2,1]`，`4×1` 的矩阵会输出 `[1,2,3,4,3,2]` —— 多出来的正是已经走过的上边 / 右边。
2. **反向遍历的下界写成 `range(right, left, -1)`（少了 `- 1`）**：`left` 那一格被漏掉。示例 1 的输出变成 `[1,2,3,6,9,8,4,5]`，只有 8 个数字，缺的正是 7。
3. **方向模拟里转向后没有重算 `nr, nc`**：`if` 里只改 `d`，接着仍用旧的 `nr, nc` 前进，会走进不合法的格子。示例 1 走到 `(0,2)` 时下一步 `(0,3)` 越界，转向后若不重算，下一轮直接 `matrix[0][3]` 报 `IndexError`。

---

## 扩展思考

### 1. 转置剥层：Python 里最短的写法

「取走第一行，把剩下的矩阵逆时针转 90°」重复下去，走的正好是螺旋：

```python
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        ans = []
        while matrix:
            ans += matrix.pop(0)                                  # 剥掉第一行
            matrix = [list(row) for row in zip(*matrix)][::-1]     # 逆时针转 90°
        return ans
```

`zip(*matrix)` 是转置，`[::-1]` 把行序反过来，合起来就是逆时针旋转。它在 3×3 上的输出与边界收缩完全一致，但有两个不能忽略的代价：`matrix.pop(0)` 改的是入参（判题系统可能复用输入），而且每一层都要把剩余矩阵整个复制一遍，总代价是 `O(m×n·min(m,n))`，远高于一次遍历。它适合用来快速验证思路，不适合当默认答案。

### 2. 螺旋矩阵 II：把读改成写

59 题要求生成 `n × n` 的螺旋填充矩阵。边界收缩法几乎不用改结构，只是把 `ans.append(...)` 换成 `matrix[top][col] = k; k += 1`，并且外层循环条件变成 `k <= n * n`。方向模拟法同样只改「写入」这一句。

---

## 相关题目

- [59. 螺旋矩阵 II](https://leetcode.cn/problems/spiral-matrix-ii/)
- [885. 螺旋矩阵 III](https://leetcode.cn/problems/spiral-matrix-iii/)
- [2326. 螺旋矩阵 IV](https://leetcode.cn/problems/spiral-matrix-iv/)
