---
title: 51. N 皇后
platform: LeetCode
difficulty: Hard
id: 51
url: https://leetcode.cn/problems/n-queens/
tags:
  - 回溯
  - 数组
  - X 算法
topics: []
patterns:
  - ../../patterns/backtracking.md
date_added: 2026-03-23
date_reviewed: []
---

# 0051. N 皇后

## 题目描述

按照国际象棋的规则，皇后可以攻击与之处在同一行或同一列或同一斜线上的棋子。

**n 皇后问题** 研究的是如何将 `n` 个皇后放置在 `n×n` 的棋盘上，并且使皇后彼此之间不能相互攻击。

给你一个整数 `n` ，返回所有不同的 **n 皇后问题** 的解决方案。

每一种解法包含一个不同的 **n 皇后问题** 的棋子放置方案，该方案中 `'Q'` 和 `'.'` 分别代表了皇后和空位。

## 示例

**示例 1：**
```
输入：n = 4
输出：[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
解释：如上图所示，4 皇后问题存在两个不同的解法。
```

**示例 2：**
```
输入：n = 1
输出：[["Q"]]
```

---

## 解题思路

### 输出与判定：n 行各一个皇后，互不攻击

棋盘上要放 `n` 个皇后且不能同行，而棋盘只有 `n` 行 —— 所以**每行恰好一个**。这一条把「从 `n²` 个格子选 `n` 个」的 `C(n², n)` 直接压成了「每行选一列」，也就是最多 `n!` 种摆法。

剩下的约束只有三条：不同列、不同主对角线（左上→右下）、不同副对角线（右上→左下）。判定标准只有一个：摆满 `n` 行且三条约束都不冲突。

`n ≤ 9`，`n! = 362880` 是能接受的量级，而且冲突剪枝会砍掉绝大多数分支。所以这题不需要更聪明的算法，需要的是**把三条约束变成 O(1) 的查表**。

### 三条约束的数学形式

一条斜线上的格子有一个共同点：

| 方向 | 特征 | 取值范围 |
|---|---|---|
| 列 | 相同 `col` | `0 ~ n-1` |
| 左上 → 右下（主对角线） | `row - col` 相同 | `-(n-1) ~ n-1` |
| 右上 → 左下（副对角线） | `row + col` 相同 | `0 ~ 2n-2` |

拿 `n = 4` 验证一下：`(0,0)` 与 `(1,1)` 的 `row - col + 3` 都是 `3`，确实在同一主对角线上；`(0,1)` 与 `(1,0)` 的 `row + col` 都是 `1`，在同一副对角线上。

`row - col` 会取到负数，做数组下标时必须加上 `n - 1` 平移到 `0 ~ 2n-2`。于是每放一个皇后，只需要标记三处：`cols[col]`、`diag1[row + col]`、`diag2[row - col + n - 1]`。

### 方法一：三个布尔数组

按行递归，每行枚举一列，冲突就 `continue`，不冲突就标记、递归、再撤销标记。`queens[row] = col` 记下这一行选了哪一列，摆满之后再拼成字符串。

```python
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        ans, queens = [], [0] * n
        cols = [False] * n
        diag1 = [False] * (2 * n - 1)       # row + col
        diag2 = [False] * (2 * n - 1)       # row - col + n - 1

        def dfs(row: int) -> None:
            if row == n:                    # 每行都放下了
                ans.append(['.' * c + 'Q' + '.' * (n - 1 - c) for c in queens])
                return
            for col in range(n):
                d1, d2 = row + col, row - col + n - 1
                if cols[col] or diag1[d1] or diag2[d2]:
                    continue                # 三条约束只要撞上一条就剪枝
                queens[row] = col
                cols[col] = diag1[d1] = diag2[d2] = True
                dfs(row + 1)
                cols[col] = diag1[d1] = diag2[d2] = False   # 撤销

        dfs(0)
        return ans
```

三个数组的下标都是「已经算好的整数」，所以判断冲突是三次数组读取，与棋盘大小无关。这也是回溯能跑到 `n = 9` 的原因：每层分支都被提前砍掉。

递归树里的每个节点对应「前 `row` 行已定、正在试第 `row` 行的某一列」。撤销那三行必须和标记一一对应 —— 少撤销一个，后面的分支就以为那条线被占了（见「易错点」）。

### 方法二：三个集合（不用算偏移）

同样的思路，把「被占用的编号」放进集合。好处是 `row - col` 的负值可以直接当键，不必加 `n - 1` 平移，代码更短、也更难写错下标。

```python
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        ans, queens = [], [0] * n
        cols, diag1, diag2 = set(), set(), set()

        def dfs(row: int) -> None:
            if row == n:
                ans.append(['.' * c + 'Q' + '.' * (n - 1 - c) for c in queens])
                return
            for col in range(n):
                if col in cols or row + col in diag1 or row - col in diag2:
                    continue
                queens[row] = col
                cols.add(col)
                diag1.add(row + col)
                diag2.add(row - col)
                dfs(row + 1)
                cols.remove(col)
                diag1.remove(row + col)
                diag2.remove(row - col)

        dfs(0)
        return ans
```

集合和数组在渐进复杂度上完全一样，差别只在常数：集合每次判断要算哈希，数组是一次下标访问。`n ≤ 9` 时这点差距看不出来，但「不用处理负数下标」这个好处很实在：集合的键可以是负数，数组的下标不行，必须自己加 `n - 1` 平移。

### 方法三：位运算（一个整数装下三组标记）

三组布尔标记其实都是「第几位为 1」。把它们压进三个整数：`cols` 的第 `c` 位表示第 `c` 列被占，`diag1`、`diag2` 的位在**每一行往下走时整体平移**（一条斜线往右下走，一条往左下走），平移用移位一次完成。

这样还能一次算出「这一行所有可放的位置」：

```text
avail = ~(cols | diag1 | diag2) & ((1 << n) - 1)
```

```python
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        ans, queens = [], [0] * n
        mask = (1 << n) - 1

        def dfs(row: int, cols: int, diag1: int, diag2: int) -> None:
            if row == n:
                ans.append(['.' * c + 'Q' + '.' * (n - 1 - c) for c in queens])
                return

            avail = ~(cols | diag1 | diag2) & mask    # 这一行还能放的列
            while avail:
                bit = avail & -avail                  # 取出最低位的 1
                avail ^= bit                          # 该位清零，试下一列
                col = bit.bit_length() - 1
                queens[row] = col
                dfs(row + 1,
                    cols | bit,
                    (diag1 | bit) >> 1,               # row + col 恒定：下一行列号减 1
                    (diag2 | bit) << 1)               # row - col 恒定：下一行列号加 1

        dfs(0, 0, 0, 0)
        return ans
```

两个移位方向是反的，这是这版最容易写错的地方：`row + col` 为常数的斜线，行加一列就要减一（整体右移）；`row - col` 为常数的斜线，行加一列也加一（整体左移）。写反了不报错，只是把两条斜线错位一格，解会变多或变少。

位运算版省掉了数组分配和三次下标访问，通常是这道题常数最小的写法；代价是可读性 —— 尤其是 `& mask` 那一步不能省，Python 的整数是无限位的（见「易错点」）。

### 三种写法怎么选

| | 布尔数组 | 集合 | 位运算 |
|---|---|---|---|
| 冲突判断 | 一次下标访问 | 一次哈希 | 一次位运算 |
| 下标负担 | `row - col + n - 1` 必须平移 | 无 | 无 |
| 可读性 | 最好 | 好 | 需要习惯位运算 |
| 适合 | 面试首选 | 想少写边界 | 追求常数、或已熟悉位技巧 |

三者枚举的是**同一棵搜索树**，剪枝条件完全等价；换写法不改变答案，只改变每次判断花多少时间。

---

## 完整代码实现

布尔数组版（页面上的逐帧可视化回放的也是这一段）：与上文「方法一」同一条递归，只是把选择与撤销写成链式赋值。

```python
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        """
        N 皇后 - 回溯算法

        核心思想：逐行放置皇后，用三个标记数组检查冲突
        """
        ans = []
        queens = [0] * n  # queens[row] = col，表示第 row 行第 col 列放置皇后

        # 冲突标记数组
        used_cols = [False] * n          # 列占用标记
        diag1 = [False] * (n * 2 - 1)    # 副对角线（row + col）
        diag2 = [False] * (n * 2 - 1)    # 主对角线（row - col + n - 1）

        def dfs(row: int) -> None:
            """
            在第 row 行放置皇后
            """
            # 结束条件：所有行都放置完毕
            if row == n:
                # 根据 queens 数组构建棋盘表示
                board = []
                for col in queens:
                    board.append('.' * col + 'Q' + '.' * (n - 1 - col))
                ans.append(board)
                return

            # 尝试在当前行的每一列放置皇后
            for col in range(n):
                d1 = row + col           # 副对角线索引
                d2 = row - col + n - 1   # 主对角线索引

                # 检查冲突
                if not used_cols[col] and not diag1[d1] and not diag2[d2]:
                    # 做选择
                    queens[row] = col
                    used_cols[col] = diag1[d1] = diag2[d2] = True

                    # 递归处理下一行
                    dfs(row + 1)

                    # 撤销选择（回溯）
                    used_cols[col] = diag1[d1] = diag2[d2] = False

        dfs(0)
        return ans
```

---

## 示例推演

以 `n = 4` 为例，棋盘是 4×4，`diag2` 的下标是 `row - col + 3`。

先看冲突判定长什么样：`(0,0)` 占住 `列 0`、`d1 = 0`、`d2 = 3`；此时第 1 行 `列 1` 的 `d2 = 1 - 1 + 3 = 3`，与 `(0,0)` 撞在同一条主对角线上，所以 `(1,1)` 不能放。同理 `(1,0)` 的 `d1 = 1` 与 `(0,1)` 的 `d1 = 1` 相同，`(1,0)` 在 `(0,1)` 已放时也不能放。

下面按真实的搜索顺序列出关键几步（`ans` 里两个解的先后与题面示例一致）：

| 步 | 尝试 | 结果 | 原因 |
|---|---|---|---|
| 1 | 行 0 列 0 | 放下 | — |
| 2 | 行 1 列 0 | 跳过 | 列 0 已被占 |
| 3 | 行 1 列 1 | 跳过 | `d2 = 3` 已被 `(0,0)` 占（主对角线） |
| 4 | 行 1 列 2 | 放下 | — |
| 5 | 行 2 列 0 | 跳过 | 列 0 已被占 |
| 6 | 行 2 列 1 | 跳过 | `d1 = 3` 已被 `(1,2)` 占（副对角线） |
| 7 | 行 2 列 2 | 跳过 | 列 2 已被 `(1,2)` 占 |
| 8 | 行 2 列 3 | 跳过 | `d2 = 2` 已被 `(1,2)` 占 |
| 9 | 行 2 无位置 | 回退到行 1 | — |
| 10 | 行 1 列 3 | 放下 | — |
| 11 | 行 2 列 0 | 跳过 | 列 0 已被占 |
| 12 | 行 2 列 1 | 放下 | — |
| 13 | 行 3 列 0 / 1 | 跳过 | 列 0、1 已被占 |
| 14 | 行 3 列 2 | 跳过 | `d2 = 4` 已被 `(2,1)` 占 |
| 15 | 行 3 列 3 | 跳过 | 列 3 已被 `(1,3)` 占 |
| 16 | 行 3 无位置 → 行 2 无位置 | 回退到行 0 | `(0,0)` 这条分支走死 |

`(0,0)` 这一支被完整剪掉后，接着试 `(0,1)`：

| 步 | 尝试 | 结果 | 原因 |
|---|---|---|---|
| 17 | 行 0 列 1 | 放下 | — |
| 18 | 行 1 列 0 | 跳过 | `d1 = 1` 已被 `(0,1)` 占（副对角线） |
| 19 | 行 1 列 1 | 跳过 | 列 1 已被占 |
| 20 | 行 1 列 2 | 跳过 | `d2 = 2` 已被 `(0,1)` 占 |
| 21 | 行 1 列 3 | 放下 | — |
| 22 | 行 2 列 0 | 放下 | — |
| 23 | 行 3 列 0 / 1 | 跳过 | 列 0、1 已被占 |
| 24 | 行 3 列 2 | 放下 | 解 1：`queens = [1, 3, 0, 2]` |

`queens = [1, 3, 0, 2]` 拼出来的棋盘是：

```text
行 0：'.' * 1 + 'Q' + '.' * 2 = ".Q.."
行 1：'.' * 3 + 'Q' + '.' * 0 = "...Q"
行 2：'.' * 0 + 'Q' + '.' * 3 = "Q..."
行 3：'.' * 2 + 'Q' + '.' * 1 = "..Q."
```

继续回溯：`(0,2)` 这一支走 `行1 列0 → 行2 列3 → 行3 列1`，得到解 2 `queens = [2, 0, 3, 1]`，即 `["..Q.", "Q...", "...Q", ".Q.."]`。`(0,3)` 这一支全部失败（`行1 列0` 往下时 `行2 列2` 之后 `行3` 无处可放；`行1 列1` 往下时 `行2` 直接无位置）。最终 `ans` 里正好两个解，与示例一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 布尔数组 | O(n!) | O(n) | 递归深度 + 标记数组（两条 `2n-1` 的对角线表） |
| 三个集合 | O(n!) | O(n) | 同一棵搜索树，每次判断多一次哈希 |
| 位运算（最优） | O(n!) | O(n) | 状态装进三个整数，常数最小 |

> `O(n!)` 是「每行都把 `n` 列试一遍」的上界；冲突剪枝后实际访问的节点远少于此（`n = 4` 只试了 60 次「行 × 列」组合）。输出本身有 `O(n²)` 个字符，通常不计入空间。

---

## 易错点总结

1. **回溯时漏掉一个标记的撤销**：`used_cols[col] = diag1[d1] = diag2[d2] = False` 里删掉任意一项，那条线就永久被占。`n = 4` 会返回 `[]`（一个解都没有），而且不报错。
2. **位运算版少写 `& mask`**：`avail = ~(cols | diag1 | diag2)` 在 Python 里是**负数**（高位全是 1），`while avail` 永远为真，列号还会一路算到 `n` 及以上。`n = 4` 直接 `RecursionError: maximum recursion depth exceeded`。
3. **拼棋盘时 `'.' * (n - 1 - col)` 写成 `'.' * (n - col)`**：每行长度变成 `n + 1`。`n = 4`、`col = 0` 时那一行是 `"Q...."`，与期望的 `"Q..."` 不符，判题直接 WA。

---

## 扩展思考

- **52 题只要个数**：把 `ans.append(...)` 换成 `count += 1`，其余不动。数量版没有字符串拼接，位运算版的优势更明显。
- **n 皇后与「精确覆盖」**：这题也可以写成舞蹈链（Dancing Links / X 算法），把「每行、每列、每条对角线各覆盖一次」变成精确覆盖问题。`n ≤ 9` 时回溯的剪枝已经足够，舞蹈链的价值在更大的 `n`（如数独 37 题）。
- **位运算版在别的语言里要限位宽**：C/C++ 用 32 位整数时 `n ≤ 32`；Python 的整数没有位宽上限，所以 `mask` 必须自己算成 `(1 << n) - 1`。

---

## 相关题目

- [52. N 皇后 II](https://leetcode.cn/problems/n-queens-ii/)（只返回个数）
- [37. 解数独](https://leetcode.cn/problems/sudoku-solver/)
- [46. 全排列](https://leetcode.cn/problems/permutations/)
