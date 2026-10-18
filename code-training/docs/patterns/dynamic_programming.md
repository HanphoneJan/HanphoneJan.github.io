---
title: 动态规划
category: 算法模式
difficulty_range: [中等, 困难]
last_updated: 2026-10-19
---

# 动态规划

## 一句话说清动态规划

动态规划（Dynamic Programming，DP）把一个**大问题**拆成若干个**重叠的子问题**，
把每个子问题的答案记下来，再按依赖顺序拼回原问题。

它省掉的是**重复计算**：同样的子问题只算一次。

以斐波那契为例，朴素递归会把同一个 `fib(k)` 算无数遍：

```
fib(5)
├── fib(4)
│   ├── fib(3)
│   │   ├── fib(2)
│   │   └── fib(1)
│   └── fib(2)      ← 和上面重复
└── fib(3)          ← 和上面重复
    ├── fib(2)      ← 又重复
    └── fib(1)
```

`fib(3)` 被算了 2 次，`fib(2)` 被算了 3 次。`n` 越大，重复越夸张，复杂度是 `O(2^n)`。
把算过的结果存起来，每个 `fib(k)` 只算一次，复杂度立刻降到 `O(n)` —— 这就是 DP 的全部动机。

## 能用 DP 的三个前提

### 1. 重叠子问题

递归展开后，不同分支会反复遇到同一个子问题。没有重叠就没有必要记忆化，
分治（归并排序、快速排序）就不需要 DP。

### 2. 最优子结构

原问题的最优解，可以由子问题的最优解推导出来。

- 成立：最短路径。「A 到 C 的最短路经过 B」意味着「A 到 B」和「B 到 C」也必须是最短路。
- 不成立：最长简单路径。子路径最长，拼起来可能重复经过同一个点，反而不是合法解。

### 3. 无后效性

一旦子问题的状态确定，后面怎么决策都不会改变它。
换句话说，**状态里必须包含「影响未来的全部信息」**，不能依赖「是怎么走到这里的」。

- 成立：打家劫舍只关心「前 i 间房能偷多少」，不关心具体偷了哪几间。
- 不成立：如果题目要求「不能连续偷三家」，那状态就得多记一位「上一家偷没偷」，
  否则信息不够，无法判断下一步。

> 如果状态定义得不对，转移方程怎么推都别扭。先问自己：
> **「两个不同的历史，只要当前状态相同，未来就真的完全一样吗？」**

## 从暴力递归到 DP：固定五步

DP 不是背方程，而是一套固定流程。用爬楼梯（LeetCode 70）走一遍。

题目：每次可以爬 1 级或 2 级，问爬到第 `n` 级有多少种方法。

### 第一步：定义状态

`dp[i]` = 爬到第 `i` 级台阶的方案数。

状态定义必须能用一句自然语言说清，并且**包含所有影响后续决策的信息**。
常见的两种口径要分清：

| 口径 | 含义 | 典型题 |
| --- | --- | --- |
| 以 `i` 结尾 | 必须选 `nums[i]` | 最长递增子序列、最大子数组和 |
| 前 `i` 个 | 只考虑前 `i` 个，不要求选第 `i` 个 | 打家劫舍、背包、编辑距离 |

这两种定义不能混用。比如 LIS 如果定义成「前 i 个里的最长长度」，转移时无法知道
「接在谁后面」，必须定义成「以 i 结尾」。

### 第二步：写转移方程

看**最后一步**：要爬到第 `i` 级，只能从第 `i-1` 级迈 1 步，或从第 `i-2` 级迈 2 步。
所以：

```
dp[i] = dp[i-1] + dp[i-2]
```

「看最后一步」是推转移方程最通用的方法：最后一步有几种来源，方程就有几项。

### 第三步：初始化

`dp[1] = 1`（迈一步），`dp[2] = 2`（1+1 或 2）。
也可以定义 `dp[0] = 1`，表示「站在原地」也是一种方案，这样 `dp[2] = dp[1] + dp[0] = 2` 仍然成立。

初始化不是随手写的，它必须让**转移方程在边界处也成立**。

### 第四步：确定遍历顺序

`dp[i]` 依赖 `dp[i-1]` 和 `dp[i-2]`，所以 `i` 必须从小到大。

如果依赖是二维的，就要保证「计算 `dp[i][j]` 时，它依赖的格子已经算好」。
比如 LCS 依赖左上、上、左，所以按行从上到下、每行从左到右即可。

### 第五步：空间优化（可选）

`dp[i]` 只依赖前两项，所以不需要整个数组：

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2          # dp[1], dp[2]
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

### 四种写法对照

```python
# 1. 暴力递归：会重复计算，O(2^n)
def climb_stairs(n):
    if n <= 2:
        return n
    return climb_stairs(n - 1) + climb_stairs(n - 2)


# 2. 记忆化搜索：自顶向下，O(n)
from functools import cache

def climb_stairs(n):
    @cache
    def dfs(i):
        if i <= 2:
            return i
        return dfs(i - 1) + dfs(i - 2)

    return dfs(n)


# 3. 递推：自底向上，O(n) 时间 + O(n) 空间
def climb_stairs(n):
    if n <= 2:
        return n
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2
    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]


# 4. 滚动变量：O(n) 时间 + O(1) 空间
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

> 实际做题时，**先写记忆化搜索**往往最稳：它直接照搬暴力递归，不用思考遍历顺序。
> 等逻辑验证正确，再改写成递推、再做空间优化。

## 记忆化搜索 vs 递推

| 维度 | 记忆化搜索（自顶向下） | 递推（自底向上） |
| --- | --- | --- |
| 写法 | 递归 + 缓存 | 循环 + 数组 |
| 思考难度 | 低，直接翻译暴力递归 | 中，要想清遍历顺序 |
| 是否算多余状态 | 只算用得到的 | 可能算全部 |
| 栈深度 | 可能爆栈 | 无递归 |
| 空间优化 | 较难 | 容易（滚动数组） |
| 适用 | 状态转移复杂、依赖不规律 | 依赖清晰、需要压空间 |

两者复杂度通常相同。**先写记忆化保证正确，再改递推保证性能**，是最省心的路径。

## 模型一：线性 DP

线性 DP 的状态只有一维（或少量维度），沿数组下标推进。

### 1. 爬楼梯

见上文。核心是「最后一步只有两种来源」。

### 2. 打家劫舍（LeetCode 198）

[198. 打家劫舍](../problems/leetcode/0198_house_robber.md)

相邻房屋不能同时偷。对第 `i` 间房，只有两种决策：

- 不偷：答案是 `dp[i-1]`；
- 偷：答案是 `dp[i-2] + nums[i]`（隔一间）。

```
dp[i] = max(dp[i-1], dp[i-2] + nums[i])
```

```python
def rob(nums):
    prev2 = prev1 = 0        # dp[i-2], dp[i-1]
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
```

注意初始值 `prev2 = prev1 = 0` 对应「没有房子可偷」，转移在 `i = 0` 时也成立。

### 3. 最长递增子序列（LeetCode 300）

[300. 最长递增子序列](../problems/leetcode/0300_longest_increasing_subsequence.md)

**状态必须定义成「以 `nums[i]` 结尾」**，否则无法判断能不能接上。

```python
def length_of_lis(nums):
    if not nums:
        return 0

    dp = [1] * len(nums)     # 每个数至少可以单独成序列
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)           # 答案不是 dp[-1]，而是所有结尾里的最大值
```

- 时间 `O(n^2)`，空间 `O(n)`。
- 答案为 `max(dp)` 而不是 `dp[-1]`：最长序列不一定以最后一个元素结尾。

进阶做法是维护 `tails` 数组 + 二分，把时间降到 `O(n log n)`：

```python
import bisect

def length_of_lis(nums):
    tails = []               # tails[k] = 长度 k+1 的递增子序列的最小结尾
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x     # 用更小的结尾替换，给后面留更大空间
    return len(tails)
```

`tails` 本身**不是**一条真实的 LIS，它只用来记录每个长度的最优结尾。
需要输出具体方案时，还得额外记录前驱下标。

### 4. 最大乘积子数组（LeetCode 152）

[152. 乘积最大子数组](../problems/leetcode/0152_maximum_product_subarray.md)

乘法与加法不同：**负数乘负数会变成正数**。只维护最大值，遇到负数就会错过
「之前的最小负数 × 当前负数」这个更大的结果。

所以同时维护以 `i` 结尾的最大值和最小值：

```python
def max_product(nums):
    max_dp = min_dp = ans = nums[0]

    for x in nums[1:]:
        candidates = (x, max_dp * x, min_dp * x)
        max_dp = max(candidates)     # 三者取最大
        min_dp = min(candidates)     # 三者取最小
        ans = max(ans, max_dp)

    return ans
```

**口诀：出现负数、减法、绝对值时，先问「只存最大值够不够」。**

## 模型二：网格 DP

网格 DP 的状态是 `dp[i][j]`，表示走到 `(i, j)` 的最优值。转移通常来自上、左两个方向。

### 不同路径（LeetCode 62）

[62. 不同路径](../problems/leetcode/0062_unique_paths.md)

从左上角走到右下角，每次只能向右或向下，求路径数。

```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

第一行和第一列只有一条路，全部初始化为 1。

```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]

    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]

    return dp[m - 1][n - 1]
```

**压成一维：**

```python
def unique_paths(m, n):
    dp = [1] * n                 # 第 0 行全为 1

    for _ in range(1, m):
        for j in range(1, n):
            # 更新前 dp[j] 是「上一行」的值，dp[j-1] 已经是「本行」的值
            dp[j] += dp[j - 1]

    return dp[-1]
```

为什么可以压？`dp[i][j]` 只依赖 `dp[i-1][j]`（上一行同列）和 `dp[i][j-1]`（本行左一格）。
一维数组在更新 `dp[j]` 之前保存的正好是上一行的值，更新之后又变成当前行的值 —— 一物两用。

### 最小路径和（LeetCode 64）

[64. 最小路径和](../problems/leetcode/0064_minimum_path_sum.md)

把「求和」换成「取最小」：

```python
def min_path_sum(grid):
    m, n = len(grid), len(grid[0])
    dp = grid[0][:]              # 第一行只能从左边来

    for j in range(1, n):
        dp[j] += dp[j - 1]

    for i in range(1, m):
        dp[0] += grid[i][0]      # 第一列只能从上边来
        for j in range(1, n):
            dp[j] = min(dp[j], dp[j - 1]) + grid[i][j]

    return dp[-1]
```

> 网格 DP 的边界处理是重点：第一行只能从左边来，第一列只能从上边来，
> 不能直接套用 `min(上, 左)`，否则会读到不存在的格子。

## 模型三：背包 DP

背包是 DP 里最成体系的一类。先分清两个变量：

- **物品**：每个物品有重量 `w`、价值 `v`；
- **容量**：背包最多能装 `cap`。

### 0-1 背包：每个物品最多选一次

`dp[i][c]` = 只考虑前 `i` 件物品、容量为 `c` 时的最大价值。

对第 `i` 件物品：

- 不选：`dp[i-1][c]`；
- 选：`dp[i-1][c-w] + v`（容量够才行）。

```python
def knapsack(weights, values, cap):
    n = len(weights)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]
            if c >= w:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)

    return dp[n][cap]
```

**压成一维，容量必须倒序：**

```python
def knapsack(weights, values, cap):
    dp = [0] * (cap + 1)

    for w, v in zip(weights, values):
        for c in range(cap, w - 1, -1):     # 倒序！
            dp[c] = max(dp[c], dp[c - w] + v)

    return dp[cap]
```

**为什么倒序？** 假设物品重量为 2，容量从 0 到 4 正序遍历：

| 容量 | 正序时发生的事 |
| --- | --- |
| 2 | `dp[2] = max(0, dp[0] + v)`，物品被放入 |
| 4 | `dp[4] = max(0, dp[2] + v)`，而 `dp[2]` 已经包含当前物品 → **同一件物品被放了两次** |

倒序时，计算 `dp[4]` 用到的 `dp[2]` 还是「上一件物品」的旧值，所以每件物品最多用一次。

> **0-1 背包倒序，完全背包正序。** 这一条几乎能解决所有背包变形。

### 0-1 背包的应用：分割等和子集（LeetCode 416）

[416. 分割等和子集](../problems/leetcode/0416_partition_equal_subset_sum.md)

把数组分成两个和相等的子集，等价于：**能否选出一些数，使它们的和恰好为 `total / 2`**。
每个数只能选一次，正是 0-1 背包。

```python
def can_partition(nums):
    total = sum(nums)
    if total % 2:
        return False

    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True                 # 和为 0 总可以做到（一个都不选）

    for x in nums:
        for c in range(target, x - 1, -1):
            dp[c] = dp[c] or dp[c - x]

    return dp[target]
```

这里的 `dp[c]` 是布尔值：**能否凑出和 `c`**。
`dp[0] = True` 是「一个都不选」这个合法方案，不能省。

### 0-1 背包计数：目标和（LeetCode 494）

[494. 目标和](../problems/leetcode/0494_target_sum.md)

给每个数加 `+` 或 `-`，使结果为 `target`。设正数部分和为 `P`，负数部分绝对值为 `N`：

```
P + N = total
P - N = target
=> P = (total + target) / 2
```

于是问题变成：**选出一些数，使和恰好为 `P`，有多少种选法**。

```python
def find_target_sum_ways(nums, target):
    total = sum(nums)
    if abs(target) > total or (total + target) % 2:
        return 0

    p = (total + target) // 2
    dp = [0] * (p + 1)
    dp[0] = 1                    # 凑出 0 有 1 种方案：什么都不选

    for x in nums:
        for c in range(p, x - 1, -1):
            dp[c] += dp[c - x]

    return dp[p]
```

计数型背包与最值型背包的唯一区别是：`max` 换成 `+`，初始值从 `0` 换成「空方案的 1 种」。

### 完全背包：每个物品可以选无限次

把容量改成**正序**，`dp[c - w]` 就可能是「已经选过当前物品」的状态，
于是同一件物品可以被重复选。

**零钱兑换（LeetCode 322）**：用最少的硬币凑出 `amount`。

```python
def coin_change(coins, amount):
    INF = amount + 1             # 比任何合法答案都大，又不会溢出
    dp = [0] + [INF] * amount

    for coin in coins:
        for c in range(coin, amount + 1):   # 正序 = 完全背包
            dp[c] = min(dp[c], dp[c - coin] + 1)

    return dp[amount] if dp[amount] <= amount else -1
```

`dp[c]` 表示「凑出金额 `c` 的最少硬币数」，`INF` 表示凑不出。
用 `amount + 1` 而不是 `float('inf')`，是为了让 `dp[c - coin] + 1` 仍然是整数，
避免浮点比较带来的意外。

**完全平方数（LeetCode 279）** 是同一模型：物品是 `1, 4, 9, 16, ...`，每个可以用无限次。

[279. 完全平方数](../problems/leetcode/0279_perfect_squares.md)

```python
def num_squares(n):
    dp = [0] + [float('inf')] * n

    for i in range(1, int(n ** 0.5) + 1):
        sq = i * i
        for c in range(sq, n + 1):
            dp[c] = min(dp[c], dp[c - sq] + 1)

    return dp[n]
```

### 组合数 vs 排列数：循环顺序决定答案

这是完全背包里最容易错的地方。看两个问题：

- **组合**：`{1, 2}` 和 `{2, 1}` 算同一种；
- **排列**：`{1, 2}` 和 `{2, 1}` 算两种。

```python
# 组合数：物品在外层
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1
    for coin in coins:
        for c in range(coin, amount + 1):
            dp[c] += dp[c - coin]
    return dp[amount]


# 排列数：容量在外层
def combination_sum4(nums, target):
    dp = [0] * (target + 1)
    dp[0] = 1
    for c in range(1, target + 1):
        for x in nums:
            if c >= x:
                dp[c] += dp[c - x]
    return dp[target]
```

**为什么？** 物品在外层时，硬币按固定顺序被考虑，`1` 用完才轮到 `2`，
所以不会出现「先 2 后 1」；容量在外层时，每一步都可以重新从所有物品里选，
顺序不同就算不同方案。

## 模型四：序列与字符串 DP

### 最长公共子序列（LeetCode 1143）

[1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)

`dp[i][j]` = `text1` 的前 `i` 个字符与 `text2` 的前 `j` 个字符的 LCS 长度。

- 末尾字符相同：`dp[i][j] = dp[i-1][j-1] + 1`；
- 末尾字符不同：至少舍弃一个末尾，`dp[i][j] = max(dp[i-1][j], dp[i][j-1])`。

```python
def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]
```

空间可以压到一维，但需要额外保存左上角的值：

```python
def longest_common_subsequence(a, b):
    n = len(b)
    dp = [0] * (n + 1)

    for x in a:
        prev = 0                       # 相当于 dp[i-1][j-1]
        for j in range(1, n + 1):
            tmp = dp[j]                # 保存更新前的 dp[j]，下一列要用
            if x == b[j - 1]:
                dp[j] = prev + 1
            else:
                dp[j] = max(dp[j], dp[j - 1])
            prev = tmp

    return dp[n]
```

### 编辑距离（LeetCode 72）

[72. 编辑距离](../problems/leetcode/0072_edit_distance.md)

`dp[i][j]` = 把 `word1` 的前 `i` 个字符变成 `word2` 的前 `j` 个字符的最少操作数。

- 末尾相同：不用操作，`dp[i-1][j-1]`；
- 不同：三种操作取最小再加 1：
  - 删除：`dp[i-1][j]`；
  - 插入：`dp[i][j-1]`；
  - 替换：`dp[i-1][j-1]`。

```python
def min_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i              # 删掉 i 个字符
    for j in range(n + 1):
        dp[0][j] = j              # 插入 j 个字符

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # 删除
                    dp[i][j - 1],      # 插入
                    dp[i - 1][j - 1],  # 替换
                )

    return dp[m][n]
```

### 回文子串（LeetCode 647）

[647. 回文子串](../problems/leetcode/0647_palindromic_substrings.md)

`dp[i][j]` = `s[i..j]` 是否为回文串。

- `s[i] == s[j]` 且内部 `s[i+1..j-1]` 也是回文 → 是回文；
- 长度 ≤ 2 时，只要两端相等就是回文。

```python
def count_substrings(s):
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    ans = 0

    # i 必须从大到小：dp[i][j] 依赖 dp[i+1][j-1]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i < 2 or dp[i + 1][j - 1]):
                dp[i][j] = True
                ans += 1

    return ans
```

**遍历顺序由依赖关系决定。** `dp[i][j]` 依赖左下角的 `dp[i+1][j-1]`，
所以 `i` 要从下往上、`j` 从左往右。

## 模型五：区间 DP

区间 DP 的状态是 `dp[i][j]`，表示区间 `[i, j]` 上的答案，转移通常是「枚举分割点」。
它的遍历顺序不是按行，而是**按区间长度从小到大**。

### 戳气球（LeetCode 312）

[312. 戳气球](../problems/leetcode/0312_burst_balloons.md)

`nums[i]` 被戳破时，得分是 `左邻居 × nums[i] × 右邻居`。直接按「先戳谁」枚举，
左右邻居会不断变化，状态根本定不下来。

**逆向思考：枚举区间 `(i, j)` 中「最后一个被戳破」的气球 `k`。**
当 `k` 最后被戳破时，它左右两边已经全部清空，邻居恰好是边界 `i` 和 `j`。
于是（下面用带哨兵的 `vals` 表示，`vals[0] = vals[n-1] = 1`）：

```
dp[i][j] = max(dp[i][k] + vals[i] * vals[k] * vals[j] + dp[k][j])
```

给数组首尾各加一个值为 1 的哨兵，边界就统一了。

```python
def max_coins(nums):
    vals = [1] + nums + [1]
    n = len(vals)
    dp = [[0] * n for _ in range(n)]

    # length 是开区间 (i, j) 的长度，至少包含一个气球
    for length in range(2, n):
        for i in range(n - length):
            j = i + length
            for k in range(i + 1, j):
                dp[i][j] = max(
                    dp[i][j],
                    dp[i][k] + vals[i] * vals[k] * vals[j] + dp[k][j],
                )

    return dp[0][n - 1]
```

- 时间 `O(n^3)`，空间 `O(n^2)`。
- 关键在于「最后一步」的选取：正向枚举第一个戳谁，子问题不独立；逆向枚举最后一个，
  左右两边互不影响。

## 模型六：树形 DP

树形 DP 的状态挂在节点上，通常用后序遍历自底向上汇总。

### 打家劫舍 III（LeetCode 337）

[337. 打家劫舍 III](../problems/leetcode/0337_house_robber_iii.md)

对每个节点，返回两个值：

- `rob`：偷当前节点时，子树能带来的最大收益；
- `skip`：不偷当前节点时的最大收益。

```python
def rob(root):
    def dfs(node):
        if not node:
            return 0, 0

        rob_l, skip_l = dfs(node.left)
        rob_r, skip_r = dfs(node.right)

        rob_cur = node.val + skip_l + skip_r
        skip_cur = max(rob_l, skip_l) + max(rob_r, skip_r)
        return rob_cur, skip_cur

    return max(dfs(root))
```

**为什么返回两个值？** 父节点是否偷，取决于子节点「偷没偷」，所以子节点必须把两种状态都交上来。
如果只返回一个最大值，父节点就无法判断这个最大值是不是「偷了子节点」得到的。

## 模型七：状态压缩 DP

当状态是一个**集合**时，可以用二进制整数 `mask` 表示：第 `i` 位为 1 表示「元素 `i` 在集合里」。

### 旅行商问题（TSP）

`dp[mask][i]` = 已访问集合为 `mask`、最后停在城市 `i` 的最短路径。

```python
def tsp(dist):
    n = len(dist)
    INF = float('inf')
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0                       # 只访问了城市 0，停在 0

    for mask in range(1 << n):
        for i in range(n):
            if dp[mask][i] == INF:
                continue
            for j in range(n):
                if mask >> j & 1:      # j 已经访问过
                    continue
                nxt = mask | (1 << j)
                dp[nxt][j] = min(dp[nxt][j], dp[mask][i] + dist[i][j])

    full = (1 << n) - 1
    return min(dp[full][i] + dist[i][0] for i in range(n))
```

- 时间 `O(2^n × n^2)`，空间 `O(2^n × n)`。
- 适用于 `n ≤ 20` 左右；`n` 再大就超出状态数上限。
- 常见变形：集合覆盖、棋盘放置、任务分配。

### 二进制计数的递推（LeetCode 338）

[338. 比特位计数](../problems/leetcode/0338_counting_bits.md)

这是理解「位运算状态」的轻量入口：

```python
def count_bits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
```

`i` 的二进制 1 的个数 = `i // 2` 的个数 + 最低位是否为 1。状态转移只用到了一个更小的数。

## 空间优化：什么时候能压，怎么压

| 原状态 | 依赖 | 优化方式 |
| --- | --- | --- |
| `dp[i]` | `dp[i-1]`, `dp[i-2]` | 两个滚动变量 |
| `dp[i][j]` | 上一行 + 本行左边 | 一维数组，正序 |
| `dp[i][j]` | 上一行同列 + 本行左边 + 左上角 | 一维数组 + `prev` 临时变量，正序 |
| 0-1 背包 `dp[i][c]` | 上一行 `dp[i-1][c]`、`dp[i-1][c-w]` | 一维数组，**容量倒序** |
| 完全背包 `dp[i][c]` | 本行 `dp[i][c-w]` | 一维数组，**容量正序** |
| 区间 DP `dp[i][j]` | 若干更短区间 | 一般不能压成一维 |

**判断方法：** 画出二维表格，看计算当前格子需要哪些格子。

- 只需要「上一行」→ 可以只留一行；
- 需要「上一行 + 本行左边」→ 一行 + 正序；
- 需要「上一行 + 左上角」→ 一行 + 一个临时变量；
- 需要「多行之前」→ 不能压缩。

## 初始化的几种口径

| 问题类型 | 初始值 | 例子 |
| --- | --- | --- |
| 求最大值 | 负无穷或 0（取决于是否允许空方案） | 打家劫舍 `dp[0]=0` |
| 求最小值 | 正无穷 | 零钱兑换 `INF = amount+1` |
| 求方案数 | `dp[0] = 1`，其余 0 | 目标和、零钱兑换 II |
| 求可行性 | `dp[0] = True`，其余 False | 分割等和子集 |

「恰好」与「至多」也会影响初始化：

- **恰好**凑出 `c`：只有 `dp[0]` 合法，其余为无穷/0；
- **至多**使用 `c`：所有 `dp[c]` 都合法，初始化为 0。

## 复杂度分析

| 模型 | 时间复杂度 | 空间复杂度 | 典型题 |
| --- | --- | --- | --- |
| 一维线性 DP | O(n) | O(1) ~ O(n) | 爬楼梯、打家劫舍 |
| 二维线性 DP | O(n²) | O(n) ~ O(n²) | LIS（O(n²) 做法）、编辑距离 |
| 网格 DP | O(m × n) | O(n) ~ O(m × n) | 不同路径、最小路径和 |
| 0-1 背包 | O(n × cap) | O(cap) | 分割等和子集、目标和 |
| 完全背包 | O(n × cap) | O(cap) | 零钱兑换、完全平方数 |
| 序列 DP（LCS） | O(m × n) | O(n) ~ O(m × n) | 最长公共子序列、编辑距离 |
| 区间 DP | O(n³) | O(n²) | 戳气球、石子合并 |
| 树形 DP | O(n) | O(h) | 打家劫舍 III |
| 状态压缩 DP | O(2^n × n²) | O(2^n × n) | 旅行商、集合覆盖 |

## 易错点

- ❌ **状态定义含糊**：「前 i 个」和「以 i 结尾」混用，转移必然写错。写代码前先用一句话写清 `dp[i]` 的含义。
- ❌ **初始化不满足转移方程**：`dp[0]` 随手写 0，导致计数题全部少算。计数题通常 `dp[0] = 1`。
- ❌ **遍历顺序错**：二维 DP 要保证依赖的格子先算。回文子串的 `i` 必须倒序，区间 DP 必须按长度。
- ❌ **0-1 背包容量正序**：同一件物品被重复使用，答案偏大却不一定报错。
- ❌ **只维护最大值**：遇到负数乘法（152）或减法时，最小值的状态同样重要。
- ❌ **答案取错位置**：LIS 取 `max(dp)`，不是 `dp[-1]`；有些题答案是 `dp[0][n-1]`，不是 `dp[n-1][n-1]`。
- ❌ **下标偏移**：字符串 DP 里 `dp[i][j]` 对应 `s[i-1]`、`t[j-1]`，写反会越界。
- ❌ **`float('inf')` 参与加法**：`inf + 1` 仍是 `inf`，判断「不可达」时要小心；用 `amount + 1` 这类有限哨兵更稳。
- ❌ **记忆化参数不可哈希**：`list` 不能当 `@cache` 的参数，先转成 `tuple`。
- ❌ **递归太深**：记忆化搜索的递归深度等于状态链长度，超过 1000 会栈溢出，改写成递推。

## 相关题目

**入门：**

- [70. 爬楼梯](../problems/leetcode/0070_climbing_stairs.md)
- [198. 打家劫舍](../problems/leetcode/0198_house_robber.md)
- [62. 不同路径](../problems/leetcode/0062_unique_paths.md)
- [64. 最小路径和](../problems/leetcode/0064_minimum_path_sum.md)
- [118. 杨辉三角](../problems/leetcode/0118_pascals_triangle.md)

**线性与序列：**

- [300. 最长递增子序列](../problems/leetcode/0300_longest_increasing_subsequence.md)
- [152. 乘积最大子数组](../problems/leetcode/0152_maximum_product_subarray.md)
- [72. 编辑距离](../problems/leetcode/0072_edit_distance.md)
- [5. 最长回文子串](../problems/leetcode/0005_longest_palindromic_substring.md)
- [647. 回文子串](../problems/leetcode/0647_palindromic_substrings.md)
- [139. 单词拆分](../problems/leetcode/0139_word_break.md)
- [1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)

**背包：**

- [416. 分割等和子集](../problems/leetcode/0416_partition_equal_subset_sum.md)
- [494. 目标和](../problems/leetcode/0494_target_sum.md)
- [322. 零钱兑换](../problems/leetcode/0322_coin_change.md)
- [279. 完全平方数](../problems/leetcode/0279_perfect_squares.md)
- [518. 零钱兑换 II](https://leetcode.cn/problems/coin-change-ii/)
- [377. 组合总和 Ⅳ](https://leetcode.cn/problems/combination-sum-iv/)

**进阶：**

- [312. 戳气球](../problems/leetcode/0312_burst_balloons.md)
- [337. 打家劫舍 III](../problems/leetcode/0337_house_robber_iii.md)
- [309. 买卖股票的最佳时机含冷冻期](../problems/leetcode/0309_best_time_to_buy_and_sell_stock_with_cooldown.md)
- [121. 买卖股票的最佳时机](../problems/leetcode/0121_best_time_to_buy_and_sell_stock.md)
- [338. 比特位计数](../problems/leetcode/0338_counting_bits.md)
- [96. 不同的二叉搜索树](../problems/leetcode/0096_unique_binary_search_trees.md)

## 相关模式

- [递归](recursion.md)：记忆化搜索是递归 + 缓存。
- [DFS 模式](dfs.md)：树形 DP 的后序汇总。
- [贪心](greedy.md)：与 DP 的分界、为什么有些题不能贪心。
- [回溯](backtracking.md)：枚举所有方案，与「只求最优值」的 DP 相对。
- [字符串](../data-structures/string.md)、[数组](../data-structures/array.md)。

## 算法可视化

下面有三个播放器，分别对应一维 DP、一维背包和二维 DP。

**爬楼梯**：输入是一个整数（例如 `8`）。`dp[i]` 一行排开，每一格只从左边两格取值。把台阶数调大，能看到表格从头到尾被填满；
再对照文档里的「滚动变量」写法，思考为什么只留两个数也能得到同一个答案。

**0-1 背包**：输入格式是 `n;cap`（例如 `4;5`），物品是 `1..n`（重量 = 价值）。注意容量是从大到小枚举的：
计算 `dp[c]` 时，`dp[c-w]` 还没有被当前物品更新过，所以每件物品最多用一次。
如果把枚举方向改成从小到大，同一个物品会被重复放入 —— 这就是完全背包。

**LCS 表**：输入格式是 `a;b`（例如 `abcde;ace`）。行是 `a` 的前缀，列是 `b` 的前缀。字符相同时取左上角 + 1，不同时取上方和左方的较大值。
沿着表格的「来源方向」往回走，就能还原出一条具体的公共子序列。
