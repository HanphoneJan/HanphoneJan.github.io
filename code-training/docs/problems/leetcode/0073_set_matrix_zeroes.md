---
title: 73. 矩阵置零
platform: LeetCode
difficulty: Medium
id: 73
url: https://leetcode.cn/problems/set-matrix-zeroes/
tags:
  - 数组
  - 矩阵
  - 原地算法
  - 哈希表
patterns:
  - ../../patterns/hash_map.md
date_added: 2026-03-25
---

# 73. 矩阵置零

## 题目描述

给定一个 `m x n` 的矩阵，如果一个元素为 `0`，则将其所在行和列的所有元素都设为 `0`。请使用**原地**算法。

## 示例

**示例 1：**
```
输入：matrix = [[1,1,1],[1,0,1],[1,1,1]]
输出：[[1,0,1],[0,0,0],[1,0,1]]
```

**示例 2：**
```
输入：matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]
输出：[[0,0,0,0],[0,4,5,0],[0,3,1,0]]
```

---

## 解题思路

### 先想清楚「哪些行、哪些列要置零」

最直接的做法是扫两遍：第一遍把出现 0 的行号、列号记进两个集合，第二遍按集合置零。

```python
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        m, n = len(matrix), len(matrix[0])
        zero_rows, zero_cols = set(), set()

        # 第一遍：只记录，不改矩阵
        for i in range(m):
            for j in range(n):
                if matrix[i][j] == 0:
                    zero_rows.add(i)
                    zero_cols.add(j)

        # 第二遍：按记录置零
        for i in range(m):
            for j in range(n):
                if i in zero_rows or j in zero_cols:
                    matrix[i][j] = 0
```

这个写法正确，但集合最多存 `m + n` 个下标，空间是 `O(m + n)`。题目要求原地，得把「记录」也塞回矩阵里。

### 关键观察：第一行和第一列可以当标记位

矩阵的第一行有 `n` 格、第一列有 `m` 格，正好能放下「每一列是否要置零」和「每一行是否要置零」这两份信息：

- `matrix[i][0] = 0` 表示第 `i` 行出现过 0；
- `matrix[0][j] = 0` 表示第 `j` 列出现过 0。

但这两块标记位本身也是矩阵的一部分，会被「置零」操作覆盖，所以必须**先把第一行、第一列自己的状态单独记下来**：

- `first_row_has_zero`：第一行原本有没有 0；
- `first_col_has_zero`：第一列原本有没有 0。

少了 `first_col_has_zero`，示例 2 就会出错：`matrix[0][0]` 是 0，但代码只检查了第一行，最后第一列不会被置零。

### 四步流程

1. 先扫第一行、第一列，记下两个布尔值；
2. 扫描**整个矩阵**，每遇到一个 0，就把对应的第一行、第一列标记置 0；
3. 从 `(1, 1)` 开始按标记置零，第一行、第一列留到最后；
4. 根据两个布尔值处理第一行、第一列。

第 2 步必须扫全矩阵（包括第一行、第一列）。因为第一行里的 0 也要让整列置零，第一列里的 0 也要让整行置零；跳过它们会漏掉示例 2 第 4 列这种「0 只出现在第一行」的情况。标记位会被反复读写没关系，第一行、第一列的真实状态在第 1 步已经存进布尔值了。

```python
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        m, n = len(matrix), len(matrix[0])

        # 第一步：第一行 / 第一列本身有没有 0
        first_row_has_zero = any(matrix[0][j] == 0 for j in range(n))
        first_col_has_zero = any(matrix[i][0] == 0 for i in range(m))

        # 第二步：全矩阵打标记
        for i in range(m):
            for j in range(n):
                if matrix[i][j] == 0:
                    matrix[i][0] = 0
                    matrix[0][j] = 0

        # 第三步：按标记置零，第一行 / 第一列留到最后
        for i in range(1, m):
            for j in range(1, n):
                if matrix[i][0] == 0 or matrix[0][j] == 0:
                    matrix[i][j] = 0

        # 第四步：用布尔值处理第一行 / 第一列
        if first_row_has_zero:
            for j in range(n):
                matrix[0][j] = 0
        if first_col_has_zero:
            for i in range(m):
                matrix[i][0] = 0
```

第三步跳过第一行、第一列，是因为这两块还是「标记表」：如果先按标记把它们清掉，后面就没法判断哪些行、列需要置零了。

---

## 完整代码实现

```python
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        m, n = len(matrix), len(matrix[0])

        # 第一步：第一行 / 第一列本身有没有 0
        first_row_has_zero = any(matrix[0][j] == 0 for j in range(n))
        first_col_has_zero = any(matrix[i][0] == 0 for i in range(m))

        # 第二步：全矩阵打标记
        for i in range(m):
            for j in range(n):
                if matrix[i][j] == 0:
                    matrix[i][0] = 0
                    matrix[0][j] = 0

        # 第三步：按标记置零，第一行 / 第一列留到最后
        for i in range(1, m):
            for j in range(1, n):
                if matrix[i][0] == 0 or matrix[0][j] == 0:
                    matrix[i][j] = 0

        # 第四步：用布尔值处理第一行 / 第一列
        if first_row_has_zero:
            for j in range(n):
                matrix[0][j] = 0
        if first_col_has_zero:
            for i in range(m):
                matrix[i][0] = 0
```

---

## 示例推演

### 示例 1：`[[1,1,1],[1,0,1],[1,1,1]]`

唯一的 0 在 `(1,1)`。

**第一步：记录第一行、第一列**

- 第一行 `[1,1,1]` 没有 0 → `first_row_has_zero = False`
- 第一列 `[1,1,1]` 没有 0 → `first_col_has_zero = False`

**第二步：全矩阵打标记**

扫到 `(1,1)` 是 0：

- `matrix[1][0] = 0`：第 1 行要置零
- `matrix[0][1] = 0`：第 1 列要置零

矩阵变成：

```text
[1, 0, 1]
[0, 0, 1]
[1, 1, 1]
```

**第三步：按标记置零（只处理 `(1,1)` 之后）**

- `(1,1)`：`matrix[1][0] == 0` → 置 0
- `(1,2)`：`matrix[1][0] == 0` → 置 0
- `(2,1)`：`matrix[0][1] == 0` → 置 0

矩阵变成：

```text
[1, 0, 1]
[0, 0, 0]
[1, 0, 1]
```

**第四步：处理第一行、第一列**

两个布尔值都是 `False`，不需要额外操作。结果与示例一致。

### 示例 2：`[[0,1,2,0],[3,4,5,2],[1,3,1,5]]`

**第一步：记录第一行、第一列**

- 第一行 `[0,1,2,0]` 有 0（第 0 列、第 3 列）→ `first_row_has_zero = True`
- 第一列 `[0,3,1]` 有 0（第 0 行）→ `first_col_has_zero = True`

**第二步：全矩阵打标记**

- `(0,0)` 是 0 → `matrix[0][0] = 0`、`matrix[0][0] = 0`
- `(0,3)` 是 0 → `matrix[0][0] = 0`、`matrix[0][3] = 0`

第一行、第一列上出现过的 0 已经把「第 0 行、第 0 列、第 3 列要置零」记下来了。

**第三步：按标记置零（只处理 `(1,1)` 之后）**

- 第 1 行：`matrix[1][0] = 3`（不为 0），但 `matrix[0][3] = 0`，于是 `(1,3)` 置 0
- 第 2 行：同理 `(2,3)` 置 0

矩阵变成：

```text
[0, 1, 2, 0]
[3, 4, 5, 0]
[1, 3, 1, 0]
```

**第四步：处理第一行、第一列**

`first_row_has_zero = True` → 第一行整行置 0；`first_col_has_zero = True` → 第一列整列置 0：

```text
[0, 0, 0, 0]
[0, 4, 5, 0]
[0, 3, 1, 0]
```

与示例输出一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 额外集合标记 | O(m×n) | O(m+n) | 记录要置零的行、列 |
| 原地标记（最优） | O(m×n) | O(1) | 第一行、第一列当标记位 |

---

## 易错点总结

1. **只记录第一行、漏掉第一列**：只用 `first_row_has_zero` 时，示例 2 的 `matrix[0][0] = 0` 不会让第一列置零，第二、三行的第一格仍然是 3 和 1。
2. **标记阶段跳过第一行 / 第一列**：从 `(1,1)` 开始打标记会漏掉第一行、第一列里的 0，示例 2 的第 4 列不会被置零。正确顺序是「先记两个布尔值，再全矩阵打标记」。
3. **先置零再打标记**：如果边扫边把整行整列清零，后面读到的标记全被覆盖，原本没有 0 的行列也会被误清。必须分两遍：先打标记，再置零。

---

## 相关题目

- [289. 生命游戏](https://leetcode.cn/problems/game-of-life/)
