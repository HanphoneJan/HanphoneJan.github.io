---
title: 79. 单词搜索
platform: LeetCode
difficulty: Medium
id: 79
url: https://leetcode.cn/problems/word-search/
tags:
  - 数组
  - 回溯
  - 矩阵
  - 深度优先搜索
  - 字符串
patterns:
  - ../../patterns/backtracking.md
  - ../../patterns/dfs.md
date_added: 2026-03-25
---

# 79. 单词搜索

## 题目描述

给定一个 `m x n` 二维字符网格 `board` 和一个字符串单词 `word`。如果 `word` 存在于网格中，返回 `true`；否则，返回 `false`。

单词必须按照字母顺序，通过相邻的单元格内的字母构成，其中"相邻"单元格是那些水平相邻或垂直相邻的单元格。同一个单元格内的字母不允许被重复使用。

## 示例

**示例 1：**
```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
输出：true
```

**示例 2：**
```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
输出：true
```

**示例 3：**
```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
输出：false
```

---

## 解题思路

### 状态是「站在哪一格 + 已经匹配到第几个字母」

`dfs(i, j, k)` 表示：当前站在 `(i, j)`，`word[k]` 已经由这一格对上，问从这里继续能不能走完。答案就是「存在某个起点，使 `dfs(i, j, 0)` 为真」。

这题不能写成 DP 或普通 BFS，原因只有一条：约束是**同一条路径**上一个格子只能用一次。于是「下一步能去哪」取决于这条路径已经吃掉了哪些格子，而不取决于 `(i, j, k)` 的取值 —— 两条不同的路径走到同一格、匹配到同一个 `k`，能走的下一步并不一样。可行性依赖路径本身，就只能带着路径走。DFS 的调用栈天然就是那条路径，进入时标记、返回时恢复，正好维护这个状态；BFS 想把路径塞进队列的每个元素，代价远大于收益。

### 标记与恢复：`board[i][j] = ''` 一行兼两用

把访问过的格子改成空串之后，任何再走进来的 `dfs` 都会在 `if board[i][j] != word[k]` 处返回 `False`（`word` 里没有空串字符）。于是「标记已访问」和「判断这格还能不能用」共用同一行代码，不需要额外的 `visited` 矩阵。回溯时 `board[i][j] = word[k]` 把字符写回去 —— 不用另存变量，因为进入 `dfs` 时已经确认过 `board[i][j] == word[k]`。

### 为什么是 3 的 L 次方，而不是 4 的 L 次方

每个格子有四个邻居，但其中一个是「刚走过来的那一格」，它已经被改成空串，下一层在比较字符时立刻返回。所以每层真正展开的分支最多 3 个。四个方向仍然都要列出来，少一个就漏解。

### 两个剪枝：字数够不够、从哪端开始

- **字数预检**：`Counter(board) >= Counter(word)` 不成立就直接返回 `False`，挡掉「board 里根本没有这个字母」这一类（一条路径都不必试）。
- **方向**：把 `word` 整体反转，答案不变（同一条路径反向走一遍），所以从「字母出现次数少的那一端」开始搜。`cnt[word[-1]] < cnt[word[0]]` 时反转：起点候选更少，能更早找到成功路径，也更早放弃死路。它只影响搜索顺序，不影响正确性。

### 方法一：回溯 DFS（就地标记）

把上面的状态定义与标记办法直接写成递归：进函数先验字符，到底就返回真，否则标记本格、试四个方向、返回前恢复。

```python
from typing import List
from collections import Counter

class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        cnt = Counter(c for row in board for c in row)
        if not cnt >= Counter(word):           # 字母数量不够，一定没有路径
            return False
        if cnt[word[-1]] < cnt[word[0]]:       # 从更稀缺的一端开始搜
            word = word[::-1]

        m, n = len(board), len(board[0])

        def dfs(i: int, j: int, k: int) -> bool:
            if board[i][j] != word[k]:         # 字母不对，或这格已被标成空串
                return False
            if k == len(word) - 1:             # 最后一个字母也对上了
                return True

            board[i][j] = ''                   # 标记：本路径不能再进这一格
            for x, y in (i, j - 1), (i, j + 1), (i - 1, j), (i + 1, j):
                if 0 <= x < m and 0 <= y < n and dfs(x, y, k + 1):
                    return True                # 只要一条路径成功就整体成功
            board[i][j] = word[k]              # 恢复现场，供别的路径使用
            return False

        return any(dfs(i, j, 0) for i in range(m) for j in range(n))
```

几处细节与上面的分析一一对应：`if board[i][j] != word[k]` 同时承担「字母不符」和「已在本路径上」两种否决；`0 <= x < m and 0 <= y < n` 在调用 `dfs` **之前**求值，`and` 短路，所以越界时不会进函数；`any(...)` 把起点枚举和「找到即停」合成一行。

### 方法二：单独的 visited 矩阵

同一套 DFS，只把「标记」从棋盘搬到一张独立的表上，`board` 就保持只读。

```python
from typing import List

class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        m, n = len(board), len(board[0])
        seen = [[False] * n for _ in range(m)]

        def dfs(i: int, j: int, k: int) -> bool:
            if board[i][j] != word[k]:
                return False
            if k == len(word) - 1:
                return True
            seen[i][j] = True
            ok = any(
                dfs(x, y, k + 1)
                for x, y in ((i, j - 1), (i, j + 1), (i - 1, j), (i + 1, j))
                if 0 <= x < m and 0 <= y < n and not seen[x][y]
            )
            seen[i][j] = False
            return ok

        return any(dfs(i, j, 0) for i in range(m) for j in range(n))
```

它把「输入」和「路径状态」分开，`board` 全程只读。有些变体不允许改动输入（棋盘被多个查询共享、`board` 是元组），那时这是唯一选择；代价是多一份 `O(m × n)` 的空间，以及每个子节点多一次 `not seen[x][y]` 判断。就地标记则把「标记」和「字符比较」压在同一行，省掉这两项 —— 代价是函数返回后 `board` 已被改动，成功路径沿途提前返回时也不会恢复，那些格子此后不会再被读到。

---

## 完整代码实现

下面这段是本题的基准实现（页面上的逐帧可视化回放的也是这一段）：就地标记 + 回溯 + 两个剪枝。

```python
from typing import List
from collections import Counter

class Solution:
    """
    单词搜索 - 回溯算法（DFS）

    核心思想：
    从矩阵的每个位置出发，使用 DFS 搜索是否存在一条路径能组成目标单词。

    回溯的关键：
    1. 标记已访问：将访问过的格子标记为空字符串，避免重复使用
    2. 恢复现场：回溯时将格子恢复原值，供其他路径使用
    3. 四个方向搜索：上下左右

    优化技巧：
    1. 字母频率预检：如果 board 中某字母数量少于 word，直接返回 False
    2. 首尾优化：从出现次数较少的字母端开始搜索

    时间复杂度：O(m * n * 3^L)，L 是单词长度
    空间复杂度：O(L)，递归栈深度
    """

    def exist(self, board: List[List[str]], word: str) -> bool:
        # 优化一：字母频率预检
        cnt = Counter(c for row in board for c in row)
        if not cnt >= Counter(word):
            return False

        # 优化二：首尾字母优化
        if cnt[word[-1]] < cnt[word[0]]:
            word = word[::-1]

        m, n = len(board), len(board[0])

        def dfs(i: int, j: int, k: int) -> bool:
            if board[i][j] != word[k]:
                return False
            if k == len(word) - 1:
                return True

            board[i][j] = ''  # 标记已访问
            for x, y in (i, j-1), (i, j+1), (i-1, j), (i+1, j):
                if 0 <= x < m and 0 <= y < n and dfs(x, y, k+1):
                    return True
            board[i][j] = word[k]  # 恢复现场
            return False

        return any(dfs(i, j, 0) for i in range(m) for j in range(n))
```

---

## 示例推演

示例 1 的棋盘（行 `i`、列 `j`）：

```text
        j=0  j=1  j=2  j=3
i=0      A    B    C    E
i=1      S    F    C    S
i=2      A    D    E    E
```

`word = "ABCCED"`。先做字数预检，`A` 在棋盘上有 2 个、`D` 只有 1 个，`cnt[word[-1]] = cnt['D'] = 1 < cnt[word[0]] = cnt['A'] = 2`，所以 `word` 被反转成 `DECCBA`，实际搜索从某个 `D` 出发、沿同一条路径反向走。下面按正向（`ABCCED`）记录这条路径，逻辑完全一样：

| `k` | 字母 | 选中的格子 | 为什么是它 |
|---|---|---|---|
| 0 | `A` | `(0,0)` | 另一处 `A` 在 `(2,0)`，它的邻居是 `S` 和 `D`，接不上 `B` |
| 1 | `B` | `(0,1)` | `(0,0)` 的右邻 |
| 2 | `C` | `(0,2)` | `(0,1)` 的右邻 |
| 3 | `C` | `(1,2)` | `(0,2)` 的邻居按顺序试：`(0,1)` 已是空串（本路径来过，立刻返回 `False`）、`(0,3)` 是 `E`、`(1,2)` 才是 `C` |
| 4 | `E` | `(2,2)` | `(1,2)` 的下邻（`(0,2)` 是空格串，`(1,1)` 是 `F`，`(1,3)` 是 `S`） |
| 5 | `D` | `(2,1)` | `(2,2)` 的左邻；`k == len(word) - 1`，返回 `True` |

`k = 3` 那一步「撞上空串」正是 `3^L` 的来源：`(0,1)` 被列进四个方向，但已经被本路径吃掉，进来就直接返回。

示例 3 的 `word = "ABCB"` 走到第三步就断了：

| `k` | 字母 | 选中的格子 | 说明 |
|---|---|---|---|
| 0 | `A` | `(0,0)` | |
| 1 | `B` | `(0,1)` | |
| 2 | `C` | `(0,2)` | |
| 3 | `B` | — | `(0,2)` 的邻居是 `(0,1)`（空串）、`(0,3)=E`、`(1,2)=C`，没有 `B` |

于是逐层回溯并恢复现场，`(0,1)` 也没有别的分支（`(1,1)=F`、`(2,1)=D`、`(0,0)` 已用），退到起点后只剩 `(1,0)=S` 可试，同样不行。换下一个起点 `(2,0)` 的 `A`：邻居是 `S` 与 `D`，连 `B` 都接不上。所有起点都失败，返回 `False`。题目要的「同一个格子不能重复使用」在这条路径上正好卡死了第四个字母。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐格 DFS（不排除来路） | O(m×n×4^L) | O(L) | 每层四个方向都可能展开 |
| 回溯 + 就地标记（最优） | O(m×n×3^L) | O(L) | 来路被标成空串，每层最多 3 个分支 |
| 回溯 + visited 矩阵 | O(m×n×3^L) | O(L+m×n) | 不改输入，多一张访问表 |

> `L = len(word)`，`m×n` 来自起点枚举，`O(L)` 是递归栈深度。字数预检额外花 `O(m×n + L)`，不改变量级。

---

## 易错点总结

1. **方向循环漏掉 `0 <= x < m and 0 <= y < n`**：往后越界时抛 `IndexError: list index out of range`（示例 2 的 `SEE` 就会撞上）；而负下标在 Python 里**不报错**，`(i, j-1)` 在 `j = 0` 时读到的是本行最后一格、`(i-1, j)` 在 `i = 0` 时读到的是最后一行 —— 不相邻的格子被当成相邻，可能凭空多出一条路径。这也是边界检查必须写在 `dfs` 调用之前的原因。
2. **漏掉 `board[i][j] = word[k]` 的恢复**：失败的路径把沿途格子永久改成空串，后面的起点一条都走不通。三条样例恰好都不触发这个 bug（正确路径先被找到），所以它在示例上不会暴露；但在 `board = [["a","b"],["b","b"]]`、`word = "bba"` 上会返回 `False`，正确结果是 `True`。

---

## 扩展思考

- **212 单词搜索 II** 是这题的推广：一堆单词逐个搜，就是把同一片棋盘反复走一遍；把单词建成字典树后，一次 DFS 同时匹配所有前缀，走不下去的前缀当场剪掉。
- **为什么 DP 在这题一定错**：按「格子 + 第几个字母」做状态转移时，「哪些格子已经被这条路径用掉」被丢掉了，于是它会把「回到来的那一格」也算成合法一步，在类似 `"ABCB"` 的输入上给出 `True`。状态的定义决定了这题只能是回溯。

---

## 相关题目

- [212. 单词搜索 II](https://leetcode.cn/problems/word-search-ii/)
