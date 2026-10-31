---
title: 72. 编辑距离
platform: LeetCode
difficulty: Medium
id: 72
url: https://leetcode.cn/problems/edit-distance/
tags:
  - 字符串
  - 动态规划
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
date_added: 2026-03-23
date_reviewed: []
---

# 0072. 编辑距离

## 题目描述

给你两个单词 `word1` 和 `word2`，请返回将 `word1` 转换成 `word2` 所使用的最少操作数。

你可以对一个单词进行如下三种操作：

- 插入一个字符
- 删除一个字符
- 替换一个字符

## 示例

**示例 1：**
```
输入：word1 = "horse", word2 = "ros"
输出：3
解释：
horse -> rorse (将 'h' 替换为 'r')
rorse -> rose (删除 'r')
rose -> ros (删除 'e')
```

**示例 2：**
```
输入：word1 = "intention", word2 = "execution"
输出：5
解释：
intention -> inention (删除 't')
inention -> enention (将 'i' 替换为 'e')
enention -> exention (将 'n' 替换为 'x')
exention -> exection (将 'n' 替换为 'c')
exection -> execution (插入 'u')
```

---

## 解题思路

### 先从最后一位看：一次操作只影响一个位置

把两个字符串并排看，从末尾往前对齐。设 `word1` 的长度是 `n`，`word2` 的长度是 `m`，现在只关心最后一位 `word1[n-1]` 和 `word2[m-1]`：

- **两位相同**：最后一位不用动，问题缩小成「把 `word1` 的前 `n-1` 位变成 `word2` 的前 `m-1` 位」。
- **两位不同**：必须花一次操作，而这一次操作只有三种选法：
  - 删掉 `word1` 的最后一位 → 剩下「前 `n-1` 位 → 前 `m` 位」；
  - 在 `word1` 末尾插入 `word2` 的最后一位 → 剩下「前 `n` 位 → 前 `m-1` 位」；
  - 把 `word1` 的最后一位替换成 `word2` 的最后一位 → 剩下「前 `n-1` 位 → 前 `m-1` 位」。

这一步把原问题拆成了规模更小的同类问题，而且三种选法分别对应三个不同的子问题。接下来要做的，就是在这三条分支里挑代价最小的。

**为什么不能直接贪心？** 因为「当前两位不同」时，三种操作看起来都只花 1 次，但它们的后续代价完全不同。例如 `horse → ros`，第一位 `h` 与 `r` 不同，替换成 `r` 后面还要删两次；先删 `h` 也未必更差。只有把三条分支都算出来，才知道哪条最短。

### 方法一：递归（自顶向下，最贴近上面的分析）

用 `dfs(i, j)` 表示「把 `word1` 的前 `i` 个字符变成 `word2` 的前 `j` 个字符」的最少操作数。这里用**长度**而不是下标，边界就是 `0`，不需要处理 `-1`。

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        def dfs(i: int, j: int) -> int:
            # word1 用完：只能把 word2 剩下的 j 个字符逐个插入
            if i == 0:
                return j
            # word2 用完：只能把 word1 剩下的 i 个字符逐个删除
            if j == 0:
                return i

            # 末尾相同，这一步不花代价，直接对齐到前一位
            if word1[i - 1] == word2[j - 1]:
                return dfs(i - 1, j - 1)

            # 末尾不同：删除 / 插入 / 替换，三选一后代价加 1
            return 1 + min(
                dfs(i - 1, j),      # 删除 word1[i-1]
                dfs(i, j - 1),      # 插入 word2[j-1]
                dfs(i - 1, j - 1),  # 替换 word1[i-1] 为 word2[j-1]
            )

        return dfs(len(word1), len(word2))
```

递归写法的优点是**和推理过程一一对应**，读代码就能看到上面那三条分支。缺点是同一个 `(i, j)` 会从很多条路径重复走到：`dfs(i-1, j)`、`dfs(i, j-1)`、`dfs(i-1, j-1)` 会不断交叉，最坏情况下展开成一棵指数级的递归树，`n = m = 20` 就已经很慢。

### 方法二：记忆化搜索（保留递归思路，砍掉重复计算）

递归树里之所以慢，是因为同一个 `(i, j)` 被反复计算，而它的答案只取决于 `(i, j)`，与「怎么走到这里」无关。那就第一次算完把它存起来：

```python
from functools import cache

class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        @cache
        def dfs(i: int, j: int) -> int:
            if i == 0:
                return j
            if j == 0:
                return i
            if word1[i - 1] == word2[j - 1]:
                return dfs(i - 1, j - 1)
            return 1 + min(dfs(i - 1, j), dfs(i, j - 1), dfs(i - 1, j - 1))

        return dfs(len(word1), len(word2))
```

状态一共 `(n+1) × (m+1)` 个，每个只算一次，时间复杂度降到 `O(nm)`。它保留了递归「只算真正走到的状态」的优点，写起来也比填表短，适合先写出一个正确版本、或者状态稀疏的题。

代价是递归深度最多 `n + m`，字符串很长时会撞上 Python 的递归限制；另外 `@cache` 的字典查找和函数调用也有常数开销。面试里如果要求「不能再优化空间」，通常还是写递推。

### 方法三：动态规划（自底向上，把递归树摊成一张表）

记忆化是「用到哪个状态才算哪个」，动态规划则反过来：**先把所有小状态算好，再按顺序推出大状态**。定义：

> `dp[i][j]` = 把 `word1` 的前 `i` 个字符变成 `word2` 的前 `j` 个字符，最少要几步。

**边界**（有一边为空串时，只能全插入或全删除）：

- `dp[0][j] = j`：空串变成 `word2` 的前 `j` 个字符，插入 `j` 次；
- `dp[i][0] = i`：`word1` 的前 `i` 个字符变成空串，删除 `i` 次。

**转移**（对应递归里的三条分支）：

```text
word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]                  # 末尾相同，不花代价

否则:
    dp[i][j] = 1 + min(
        dp[i-1][j],      # 删除 word1[i-1]
        dp[i][j-1],      # 插入 word2[j-1]
        dp[i-1][j-1],    # 替换
    )
```

三个来源分别对应「删、插、换」，可以对着下面这张图记：

```text
        word2 的前 j-1 个     word2 的前 j 个
word1 前 i-1 个   dp[i-1][j-1]  ──替换/对齐──▶  dp[i-1][j]
                        │                          │
                        │ 插入                     │ 删除
                        ▼                          ▼
word1 前 i 个     dp[i][j-1]    ──────────────▶  dp[i][j]
```

`dp[i-1][j]` 表示「`word1` 已经删掉一位，`word2` 还是前 `j` 位」，所以是删除；`dp[i][j-1]` 表示「`word1` 没动，`word2` 少一位」，缺的那位只能靠插入补上。这两个方向最容易写反，但本题三种操作代价都是 1，写反了最小值仍然一样，真正的区别在**带不同代价**的变体里（见「扩展思考」）。

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        n, m = len(word1), len(word2)

        # dp[i][j]：word1[:i] -> word2[:j] 的最少操作数
        dp = [[0] * (m + 1) for _ in range(n + 1)]

        # 边界：一边为空串时只能全插入 / 全删除
        for i in range(1, n + 1):
            dp[i][0] = i
        for j in range(1, m + 1):
            dp[0][j] = j

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if word1[i - 1] == word2[j - 1]:
                    # 末尾相同，直接继承左上角，不花代价
                    dp[i][j] = dp[i - 1][j - 1]
                else:
                    # 删除 / 插入 / 替换，取最小再加 1
                    dp[i][j] = 1 + min(
                        dp[i - 1][j],
                        dp[i][j - 1],
                        dp[i - 1][j - 1],
                    )

        return dp[n][m]
```

填表顺序是「从上到下、从左到右」：计算 `dp[i][j]` 时，它的三个来源 `dp[i-1][j]`、`dp[i][j-1]`、`dp[i-1][j-1]` 都已经算好了。

### 方法四：滚动数组（只保留上一行）

观察转移方程，`dp[i][j]` 只依赖**上一行**和**当前行的左边一格**，再往上的行永远不会再用到。于是二维表可以压成一行：

- `f[j]` 在覆盖前是 `dp[i-1][j]`（上一行），覆盖后是 `dp[i][j]`（当前行）；
- `f[j-1]` 已经是当前行的值，正好是 `dp[i][j-1]`；
- 还需要一个变量 `diag` 保存 `dp[i-1][j-1]`，因为它在 `f[j]` 被覆盖后就拿不到了。

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m = len(word2)
        # f[j] 在每一行开始时表示 dp[i-1][j]
        f = list(range(m + 1))

        for i, x in enumerate(word1, 1):
            diag = f[0]   # dp[i-1][0]
            f[0] = i      # dp[i][0]

            for j, y in enumerate(word2, 1):
                above = f[j]          # 覆盖前先存下 dp[i-1][j]
                if x == y:
                    f[j] = diag       # dp[i-1][j-1]
                else:
                    f[j] = 1 + min(above, f[j - 1], diag)
                diag = above          # 供下一列的左上角使用

        return f[m]
```

空间从 `O(nm)` 降到 `O(m)`。如果愿意，还可以让 `word2` 始终是较短的那个串，空间进一步降到 `O(min(n, m))`。

### 四种写法怎么选

| 写法 | 什么时候用 | 主要代价 |
|---|---|---|
| 朴素递归 | 只用来讲清三条分支，或写测试对照 | 指数级重复计算 |
| 记忆化搜索 | 想快速写对、状态稀疏、不想考虑填表顺序 | 递归深度、缓存开销 |
| 二维 DP | 面试默认写法，转移关系一眼可见 | `O(nm)` 空间 |
| 滚动数组 | 题目额外要求空间优化，或 `n, m` 很大 | 下标含义需要额外注释 |

递归和 DP 不是「谁替代谁」：递归是**问题的定义**，DP 是**同一套定义的自底向上求值**。先写出递归，再决定要不要加缓存、要不要改成递推，比一上来背转移方程更稳。

---

## 完整代码实现

下面把四种写法放在同一个类里，方便对照。提交时只留一个方法即可。

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        """二维 DP：最直观的版本，建议作为默认写法。"""
        n, m = len(word1), len(word2)
        dp = [[0] * (m + 1) for _ in range(n + 1)]

        for i in range(1, n + 1):
            dp[i][0] = i
        for j in range(1, m + 1):
            dp[0][j] = j

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if word1[i - 1] == word2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1]
                else:
                    dp[i][j] = 1 + min(
                        dp[i - 1][j],
                        dp[i][j - 1],
                        dp[i - 1][j - 1],
                    )

        return dp[n][m]

    def minDistanceOneArray(self, word1: str, word2: str) -> int:
        """滚动数组：空间 O(m)。"""
        m = len(word2)
        f = list(range(m + 1))

        for i, x in enumerate(word1, 1):
            diag = f[0]
            f[0] = i
            for j, y in enumerate(word2, 1):
                above = f[j]
                f[j] = diag if x == y else 1 + min(above, f[j - 1], diag)
                diag = above

        return f[m]

    def minDistanceMemo(self, word1: str, word2: str) -> int:
        """记忆化搜索：保留递归结构，只算真正用到的状态。"""
        from functools import cache

        @cache
        def dfs(i: int, j: int) -> int:
            if i == 0:
                return j
            if j == 0:
                return i
            if word1[i - 1] == word2[j - 1]:
                return dfs(i - 1, j - 1)
            return 1 + min(dfs(i - 1, j), dfs(i, j - 1), dfs(i - 1, j - 1))

        return dfs(len(word1), len(word2))
```

---

## 示例推演

以 `word1 = "horse"`、`word2 = "ros"` 为例。行是 `word1` 的前缀，列是 `word2` 的前缀，`dp[i][j]` 就是行、列交叉处那一格。

先填边界：第 0 行是 `0, 1, 2, 3`，第 0 列是 `0, 1, 2, 3, 4, 5`。

| `dp` | `""` | `r` | `o` | `s` |
|---|---|---|---|---|
| `""` | 0 | 1 | 2 | 3 |
| `h` | 1 | 1 | 2 | 3 |
| `o` | 2 | 2 | 1 | 2 |
| `r` | 3 | 2 | 2 | 2 |
| `s` | 4 | 3 | 3 | 2 |
| `e` | 5 | 4 | 4 | 3 |

挑三格看转移是怎么来的：

- `dp[1][1]`：`h` 与 `r` 不同，取 `min(dp[0][1], dp[1][0], dp[0][0]) + 1 = min(1, 1, 0) + 1 = 1`，来源是左上角，表示把 `h` 替换成 `r`。
- `dp[2][2]`：`o` 与 `o` 相同，直接继承 `dp[1][1] = 1`，不花代价。
- `dp[5][3]`：`e` 与 `s` 不同，取 `min(dp[4][3], dp[5][2], dp[4][2]) + 1 = min(2, 4, 3) + 1 = 3`，来源是上方 `dp[4][3]`，表示删掉末尾的 `e`。

最终 `dp[5][3] = 3`，与示例给出的 `horse → rorse → rose → ros` 一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 朴素递归 | O(3^(n+m)) | O(n+m) | 同一状态被反复展开 |
| 记忆化搜索 | O(n×m) | O(n×m) | 缓存 `(i, j)`，递归栈另算 |
| 二维 DP | O(n×m) | O(n×m) | 转移关系最直观 |
| 一维数组（最优） | O(n×m) | O(m) | 只保留上一行，可再取较短串做到 O(min(n,m)) |

> `n = len(word1)`，`m = len(word2)`。

---

## 易错点总结

1. **`dp` 的下标是长度，取字符要减 1**：`word1[i-1]`、`word2[j-1]` 少减一个，比较的就不是当前末尾，而是下一对字符；当 `i = n` 时还会直接越界。
2. **边界列 / 边界行必须按长度填**：`dp[i][0] = i`、`dp[0][j] = j` 漏掉任何一边，空串的答案都会变成 0。例如 `word2 = ""` 时，正确结果是 `len(word1)`。
3. **滚动数组里 `diag` 要在覆盖 `f[j]` 之前取**：先算 `f[j]` 再取 `above`，拿到的已经是当前行的新值，替换分支会用错 `dp[i-1][j-1]`；表现是小数据能过、稍长的串结果偏小。

---

## 扩展思考

### 1. 三种操作代价不同时

如果插入、删除、替换的代价分别是 `c_ins`、`c_del`、`c_rep`，转移方程要写成：

```python
dp[i][j] = min(
    dp[i - 1][j] + c_del,      # 删除
    dp[i][j - 1] + c_ins,      # 插入
    dp[i - 1][j - 1] + c_rep,  # 替换
)
```

这时「删除」和「插入」就不能互换了，必须严格按 `i`、`j` 的方向写。

### 2. 如何输出具体的编辑操作

在填表时额外记录每一格是从哪个方向转移来的，再从 `dp[n][m]` 往回走，就能还原出一条完整的操作序列。代价是要多存一个 `O(nm)` 的来源表。

### 3. 与最长公共子序列的关系

如果只允许插入和删除（不允许替换），编辑距离等于：

```text
len(word1) + len(word2) - 2 × LCS(word1, word2)
```

因为两个串的公共部分可以原样保留，剩下的字符各自删掉或补齐。允许替换时，这个等式不再成立，需要单独比较替换的代价。

---

## 相关题目

- [583. 两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/)
- [1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)
- [161. 相隔为 1 的编辑距离](https://leetcode.cn/problems/one-edit-distance/)
