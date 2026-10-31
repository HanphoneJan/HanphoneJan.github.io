---
title: 131. 分割回文串
platform: LeetCode
difficulty: Medium
id: 131
url: https://leetcode.cn/problems/palindrome-partitioning/
tags:
  - 字符串
  - 回溯
  - 动态规划
topics: []
patterns:
  - ../../patterns/backtracking.md
  - ../../patterns/dynamic_programming.md
date_added: 2026-04-03
date_reviewed: []
---

# 0131. 分割回文串

## 题目描述

给你一个字符串 `s`，请你将 `s` 分割成一些子串，使每个子串都是 **回文串**。返回 `s` 所有可能的分割方案。

**回文串** 是正着读和反着读都一样的字符串。

## 示例

**示例 1：**
```
输入：s = "aab"
输出：[["a","a","b"],["aa","b"]]
```

**示例 2：**
```
输入：s = "a"
输出：[["a"]]
```

---

## 解题思路

### 要输出的是「所有切法」，所以只能枚举

一个分割方案等价于「在哪些位置切一刀」：`s = "aab"` 在 `a|a` 和 `a|b` 处各切一刀，得到 `["a","a","b"]`；只切第一处，得到 `["a","ab"]` —— 而 `"ab"` 不是回文，这一刀不合法。

所以这题不是「求最少切几刀」（那是 132 题，DP 能做），而是**把所有合法的切点集合列出来**。输出本身就是答案的全部，任何「只算个数」的技巧都省不掉遍历：方案数本身就可以是指数级的（`"aaaa..."` 每两个字符之间切不切都合法）。

判断标准落在每一步：**当前这一段必须是回文**。只要有一段落空，这条路径就没必要往下走了。

### 方法一：回溯，每层决定「当前这段在哪结束」

把问题写成递归：`dfs(i)` 表示 `s[i:]` 这个后缀的所有切法，`path` 里装着已经切好的前缀。

从 `i` 开始枚举这一段的结束位置 `j`（`s[i:j+1]` 就是当前段）：

- 是回文 → 收进 `path`，递归到 `j+1`；
- 不是回文 → 这个 `j` 直接跳过，**不再往下递归**（这就是剪枝，长出来的枝干必然含非法段）；
- `i == n` 时 `path` 正好是一个完整切法，拷贝一份收进答案。

```python
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        ans, path = [], []

        def dfs(i: int) -> None:
            if i == n:                    # 切到末尾，path 是一套完整方案
                ans.append(path[:])       # 必须拷贝，path 后面还会被改
                return
            for j in range(i, n):         # 当前段 = s[i:j+1]
                t = s[i:j + 1]
                if t == t[::-1]:          # 不是回文就整枝剪掉
                    path.append(t)
                    dfs(j + 1)            # 下一段从 j+1 开始，不是 i+1
                    path.pop()            # 撤销，换下一个 j

        dfs(0)
        return ans
```

三个位置对应三个决定：

- `for j in range(i, n)` 保证当前段**至少一个字符**（`j = i`），且**不超过末尾**（`j = n-1`）。写成 `range(i + 1, n)` 会漏掉所有单字符段。
- `dfs(j + 1)` 里是 `j + 1` 而不是 `i + 1`：下一段的起点是当前段的末尾之后。写成 `i + 1` 会让段与段**重叠**，输出里出现 `["aa","a","b"]` 这种拼不回原串的结果。
- `path.pop()` 在递归返回后执行。没有它，`path` 只增不减，第二个方案会把前面残留的段全带上 —— 示例 1 会输出 `[["a","a","b"], ["a","a","b","aa","b"]]`，第二组根本拼不回 `"aab"`。

为什么不会重复也不会漏：每个方案由「切点序列」唯一确定，而每层循环按 `j` 递增枚举，不同的切点组合走的是不同的递归分支，同一个切点序列只可能被走一次。

### 方法二：先把「任意子串是不是回文」预处理好

上面每次判断都靠切片加反转，代价 `O(段长)`。深递归里同一段前缀会被反复判断（`"aaaa"` 的每一层都要重新判一次 `"a"`、`"aa"`…），把这些判断提前算成一张表就是纯赚。

`pal[i][j]` 表示 `s[i:j+1]` 是否回文。转移只有一条：首尾相同，且**去掉首尾后仍是回文**。

```text
pal[i][j] = (s[i] == s[j]) and (j - i <= 2 or pal[i+1][j-1])
```

`j - i <= 2` 单独兜底，是因为 `j - i <= 1`（长度 1、2）时 `pal[i+1][j-1]` 的下标会越过对角线（`i+1 > j-1`），那半张表从来没被赋值；长度 3 时它正好退化成单个字符，用兜底条件短路掉可以少一次查表。长度 2 只需首尾相同，长度 1 的首尾就是自己。

```python
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)

        # pal[i][j]：s[i:j+1] 是不是回文
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):           # i 必须倒序
            for j in range(i, n):
                if s[i] == s[j] and (j - i <= 2 or pal[i + 1][j - 1]):
                    pal[i][j] = True

        ans, path = [], []

        def dfs(i: int) -> None:
            if i == n:
                ans.append(path[:])
                return
            for j in range(i, n):
                if pal[i][j]:                    # O(1) 判断，不再切片
                    path.append(s[i:j + 1])
                    dfs(j + 1)
                    path.pop()

        dfs(0)
        return ans
```

`i` 必须**从 `n-1` 往 0** 枚举。算 `pal[i][j]` 要用 `pal[i+1][j-1]`，后者的行号更大，倒序才能保证它已经算好。顺过来写成 `for i in range(n)` 不会报错，只是较长回文的判断全部拿到 `False`。

`pal` 也可以用中心扩展填（对每个中心向两边扩，`O(n²)`），不用考虑行序，代价是多一层循环；两者得到的是同一张表。

### 两种写法怎么选

| | 回溯 + 切片判回文 | 回溯 + 预处理回文表 |
|---|---|---|
| 每个候选段判断 | `O(段长)` | `O(1)` |
| 预处理 | 无 | `O(n²)` 时间、`O(n²)` 空间 |
| 搜索总量（不考虑剪枝的上界） | `O(n × 2^n)` | `O(2^n)` |
| 代码量 | 15 行 | 25 行 |

本题 `1 <= s.length <= 16`，两种写法都在毫秒级：真正的耗时来自搜索树的节点数，而它由「有多少合法切法」决定，判回文只是每个节点上的常数。切片版更短、更好读，写题解和面试第一版都该用它；预处理版的收益要等到 `n` 上百、或者同一张表还要拿去喂 132 题（`O(n²)` 的 DP）时才显现。

---

## 完整代码实现

```python
from typing import List

class Solution:
    """
    131. 分割回文串 - 回溯算法

    核心思想：
    从位置 i 开始枚举所有可能的结束位置 j，如果 s[i:j+1] 是回文串，
    就加入路径，然后递归处理 j+1 开始的子串。

    时间复杂度：O(n * 2^n)
    空间复杂度：O(n)，递归深度
    """

    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        ans = []
        path = []

        def dfs(i: int):
            if i == n:
                ans.append(path.copy())
                return

            for j in range(i, n):
                t = s[i:j + 1]
                if t == t[::-1]:  # 是回文串
                    path.append(t)
                    dfs(j + 1)
                    path.pop()

        dfs(0)
        return ans
```

第二段是预处理回文表的版本，同样可以直接提交：

```python
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                if s[i] == s[j] and (j - i <= 2 or pal[i + 1][j - 1]):
                    pal[i][j] = True

        ans, path = [], []

        def dfs(i: int) -> None:
            if i == n:
                ans.append(path[:])
                return
            for j in range(i, n):
                if pal[i][j]:
                    path.append(s[i:j + 1])
                    dfs(j + 1)
                    path.pop()

        dfs(0)
        return ans
```

---

## 示例推演

以 `s = "aab"`（`n = 3`）为例。

**先看要判断哪些段**（方法二的表，`pal[i][j]` 表示 `s[i:j+1]`）：

| `i \ j` | 0 | 1 | 2 |
|---|---|---|---|
| 0 | `"a"` ✔ | `"aa"` ✔ | `"aab"` ✘ |
| 1 | — | `"a"` ✔ | `"ab"` ✘ |
| 2 | — | — | `"b"` ✔ |

填表顺序（倒序 `i`）：

- `i = 2`：`j = 2`，`s[2] == s[2]` 且 `j - i = 0 ≤ 2` → `pal[2][2] = True`。
- `i = 1`：`j = 1`，`j - i = 0` → `True`；`j = 2`，`s[1] = 'a'` 与 `s[2] = 'b'` 不同 → `False`。
- `i = 0`：`j = 0` → `True`；`j = 1`，`s[0] = s[1] = 'a'` 且 `j - i = 1 ≤ 2` → `True`；`j = 2`，`s[0] = 'a'` 与 `s[2] = 'b'` 不同 → `False`。

要检验 `pal[i+1][j-1]` 这条依赖，换成 `"abba"`：`pal[0][3]` 需要 `pal[1][2]`（`"bb"`），而 `pal[1][2]` 在 `i = 1` 那一行才被算出 —— 这就是 `i` 必须倒序的全部原因。

**搜索过程**（`path` 用方括号表示当前内容）：

| 步骤 | 调用 | 试的段 | 是回文？ | 动作 |
|---|---|---|---|---|
| 1 | `dfs(0)` | `j=0`：`"a"` | ✔ | `path = ["a"]`，转 `dfs(1)` |
| 2 | `dfs(1)` | `j=1`：`"a"` | ✔ | `path = ["a","a"]`，转 `dfs(2)` |
| 3 | `dfs(2)` | `j=2`：`"b"` | ✔ | `path = ["a","a","b"]`，转 `dfs(3)` |
| 4 | `dfs(3)` | — | — | `i == n`，收下 `["a","a","b"]` |
| 5 | 回到 `dfs(2)` | 循环结束 | — | `path.pop()` → `["a","a"]` |
| 6 | 回到 `dfs(1)` | `j=2`：`"ab"` | ✘ | 跳过，不递归 |
| 7 | 回到 `dfs(1)` | 循环结束 | — | `path.pop()` → `["a"]` |
| 8 | 回到 `dfs(0)` | `j=1`：`"aa"` | ✔ | `path = ["aa"]`，转 `dfs(2)` |
| 9 | `dfs(2)` | `j=2`：`"b"` | ✔ | `path = ["aa","b"]`，转 `dfs(3)` |
| 10 | `dfs(3)` | — | — | `i == n`，收下 `["aa","b"]` |
| 11 | 回到 `dfs(0)` | `j=2`：`"aab"` | ✘ | 跳过 |
| 12 | `dfs(0)` 结束 | — | — | `path` 为空，返回 |

答案 `[["a","a","b"], ["aa","b"]]`，与示例一致，顺序也一致：外层 `j` 从小到大，所以 `["a",...]` 这组先于 `["aa",...]`。

第 6 步是剪枝的样子：`"ab"` 不是回文，`dfs(2)` 一次都没被调用 —— 这一整枝在判断那一行就断了。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 回溯 + 切片判回文（基准实现） | O(n×2^n) | O(n) | 每个候选段判断最多 O(n)，`2^(n-1)` 个切点组合 |
| 回溯 + 预处理回文表（最优） | O(n² + 2^n) | O(n²) | 预处理 O(n²)，之后每段判断 O(1) |

> `n = len(s) ≤ 16`。两个上界都是「不考虑剪枝」的保守估计：实际搜索树只沿着回文段生长，`"aab"` 这种串会小得多；而 `"aaaa"` 每段都回文，剪枝不起作用，节点数就贴着上界走。

---

## 易错点总结

1. **收答案时没拷贝**：`ans.append(path)` 而不是 `ans.append(path[:])`。`ans` 里存的是同一个列表对象的引用，回溯把 `path` 清空后，所有结果都变成空列表 —— 示例 1 返回 `[[], []]`。
2. **递归写成 `dfs(i + 1)`**：下一段的起点变成了当前段起点的后一位，段与段之间重叠。示例 1 仍会输出 2 组，但第二组是 `["aa","a","b"]`（拼起来 `"aaab"`，不是 `"aab"`），而不是 `["aa","b"]`。
3. **预处理表的 `i` 写成正序**：`for i in range(n)` 时 `pal[i+1][j-1]` 还没算，长回文全被判成 `False`。`s = "abba"` 会漏掉 `["abba"]` 这个方案，只剩 `["a","b","b","a"]` 与 `["a","bb","a"]`。

---

## 扩展思考

- **只问「最少切几刀」就是 132 题**：`dp[i]` 表示 `s[:i]` 切成的**最少段数**，转移 `dp[j] = min(dp[j], dp[i] + 1)`（`pal[i][j]` 为真时），答案是 `dp[n] - 1`（段数减一才是刀数）。同一张预处理表两题通用，区别只在于一个是枚举答案、一个是求最小值。
- **Manacher 能在 `O(n)` 内求出以每个位置为中心的最长回文半径**，把预处理从 `O(n²)` 降到 `O(n)`。本题 `n ≤ 16`，用它纯属超配；真正需要它的是 `n` 到十万级、且只需要「某个区间是不是回文」这类问题。

## 相关题目

- [17. 电话号码的字母组合](https://leetcode.cn/problems/letter-combinations-of-a-phone-number/)
- [39. 组合总和](https://leetcode.cn/problems/combination-sum/)
- [132. 分割回文串 II](https://leetcode.cn/problems/palindrome-partitioning-ii/)
