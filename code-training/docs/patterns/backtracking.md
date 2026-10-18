---
title: 回溯
category: 算法模式
difficulty: 中等-困难
applicable_to:
  - 组合
  - 排列
  - 子集
  - 棋盘搜索
last_updated: 2026-10-19
---

# 回溯

## 一句话说清回溯

回溯 = **DFS + 撤销选择**。

它把问题看成一棵**决策树**：每一层做一个选择，走到叶子就得到一个完整方案；
走不通或走完了，就退回上一层，撤销刚才的选择，再试下一个。

```
dfs(当前状态):
    如果到达终点: 记录答案; return
    for 每个可选分支:
        做选择
        dfs(下一层)
        撤销选择      ← 回溯
```

**没有「撤销选择」的 DFS 只是遍历；有「撤销选择」的 DFS 才能枚举所有方案。**

## 什么时候用回溯

| 题目信号 | 典型问题 |
| --- | --- |
| 「所有组合」「所有排列」「所有子集」 | 78、46、39、40、90、47 |
| 「所有合法方案」「能否满足约束」 | 51 N 皇后、37 解数独 |
| 「分割成若干段，每段都满足条件」 | 131 分割回文串、93 复原 IP |
| 「从网格中找一条路径」 | 79 单词搜索 |
| 「按某种规则生成所有字符串」 | 22 括号生成、17 电话号码 |

**不适合回溯的情况：**

- 只求**最优值**（最大/最小/最少），且满足最优子结构 → 用 DP；
- 只求**一个可行解**，且能贪心/二分 → 不必枚举所有；
- 只判断**连通性** → 普通 DFS/BFS 就够，不需要撤销；
- 方案数是指数级且题目只要计数 → 用 DP 计数，不要真的枚举。

## 回溯三要素

1. **路径**：已经做过的选择（`path`）；
2. **选择列表**：当前还能做什么（由 `start`、`used`、剩余目标等决定）；
3. **结束条件**：什么时候记录答案 / 停止递归。

写回溯时，先把这三个问题回答清楚，再动笔：

- 每一层在决定什么？
- 下一层的候选从哪里开始？
- 什么时候算一个完整方案？

## 三类基本题型

### 类型一：子集 / 组合（用 `start` 控制顺序）

组合不关心顺序，`[1,2]` 和 `[2,1]` 是同一个。为了避免重复，
每一层只从 `start` 往后选，下一层从 `i + 1` 开始。

**写法 A：每个节点都是答案（枚举型）**

```python
def subsets(nums):
    ans = []
    path = []

    def dfs(start):
        ans.append(path.copy())          # 每个节点都是一个子集
        for i in range(start, len(nums)):
            path.append(nums[i])         # 选
            dfs(i + 1)                   # 下一层只能选后面的
            path.pop()                   # 撤销

    dfs(0)
    return ans
```

**写法 B：选或不选（二叉决策）**

```python
def subsets(nums):
    ans = []
    path = []

    def dfs(i):
        if i == len(nums):
            ans.append(path.copy())
            return

        dfs(i + 1)                       # 不选 nums[i]

        path.append(nums[i])             # 选 nums[i]
        dfs(i + 1)
        path.pop()

    dfs(0)
    return ans
```

两种写法都能得到全部 `2^n` 个子集，区别在决策树的形状：

- 写法 A 的每个节点都是答案，适合「组合总和」「分割」这类随时可以结束的题；
- 写法 B 的答案只在叶子，适合「每个元素必须做一次二选一」的题。

以 `nums = [1, 2, 3]` 为例，写法 A 的决策树：

```
dfs(0), path=[]
├─ 记录 []
├─ 选 1 → dfs(1), path=[1]
│  ├─ 记录 [1]
│  ├─ 选 2 → dfs(2), path=[1,2]
│  │  ├─ 记录 [1,2]
│  │  └─ 选 3 → dfs(3), path=[1,2,3] → 记录 → 撤销 3
│  └─ 选 3 → dfs(3), path=[1,3] → 记录 → 撤销 3
├─ 选 2 → dfs(2), path=[2]
│  ├─ 记录 [2]
│  └─ 选 3 → dfs(3), path=[2,3] → 记录 → 撤销 3
└─ 选 3 → dfs(3), path=[3]
   └─ 记录 [3]
```

### 类型二：排列（用 `used` 标记已选）

排列关心顺序，`[1,2]` 和 `[2,1]` 不同。每一层都可以从所有元素里选，
只要没被用过：

```python
def permute(nums):
    ans = []
    path = []
    used = [False] * len(nums)

    def dfs():
        if len(path) == len(nums):
            ans.append(path.copy())
            return

        for i in range(len(nums)):
            if used[i]:
                continue

            used[i] = True
            path.append(nums[i])
            dfs()
            path.pop()
            used[i] = False

    dfs()
    return ans
```

[46. 全排列](../problems/leetcode/0046_permutations.md)

复杂度的直觉：第一层有 `n` 种选择，第二层 `n-1` 种……共 `n!` 个叶子，
每个叶子拷贝长度为 `n` 的路径，所以是 `O(n! × n)`。

### 类型三：棋盘 / 分割（逐行、逐段推进）

N 皇后按行放置，每行选一列；分割回文串按起点选一个结束位置。

**N 皇后（LeetCode 51）**

[51. N 皇后](../problems/leetcode/0051_n_queens.md)

```python
def solve_n_queens(n):
    ans = []
    cols = set()                 # 已占用的列
    diag1 = set()                # 已占用的主对角线：r - c
    diag2 = set()                # 已占用的副对角线：r + c
    board = [['.'] * n for _ in range(n)]

    def dfs(r):
        if r == n:
            ans.append([''.join(row) for row in board])
            return

        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue

            cols.add(c)
            diag1.add(r - c)
            diag2.add(r + c)
            board[r][c] = 'Q'

            dfs(r + 1)

            board[r][c] = '.'    # 撤销
            cols.remove(c)
            diag1.remove(r - c)
            diag2.remove(r + c)

    dfs(0)
    return ans
```

用三个集合做 `O(1)` 冲突检测，比每次扫描棋盘快得多。

**分割回文串（LeetCode 131）**

[131. 分割回文串](../problems/leetcode/0131_palindrome_partitioning.md)

```python
def partition(s):
    ans = []
    path = []
    n = len(s)

    def is_palindrome(l, r):
        while l < r:
            if s[l] != s[r]:
                return False
            l += 1
            r -= 1
        return True

    def dfs(start):
        if start == n:
            ans.append(path.copy())
            return

        for end in range(start, n):
            if not is_palindrome(start, end):
                continue
            path.append(s[start:end + 1])
            dfs(end + 1)
            path.pop()

    dfs(0)
    return ans
```

每一层决定「下一段取到哪里」，因此 `start` 一直向后推进，不会重复。

## 去重：最容易写错的地方

带重复元素的题（40、47、90）必须去重，但**去重的层次**要分清。

### 组合去重：同一层跳过相同值

```python
def combination_sum2(candidates, target):
    candidates.sort()
    ans = []
    path = []

    def dfs(start, remain):
        if remain == 0:
            ans.append(path.copy())
            return

        for i in range(start, len(candidates)):
            if candidates[i] > remain:
                break                        # 后面的更大，都不用试
            if i > start and candidates[i] == candidates[i - 1]:
                continue                     # 同一层跳过重复值

            path.append(candidates[i])
            dfs(i + 1, remain - candidates[i])
            path.pop()

    dfs(0, target)
    return ans
```

`i > start` 表示「不是本层的第一个选择」。如果当前值和本层前一个值相同，
那一条分支已经被前一个值走过了，直接跳过。

**注意：不能写成 `i > 0`**，否则会把「不同层使用相同值」也误杀。
例如 `[1, 1, 2]` 选 `[1, 1]` 是合法的，第二个 1 在下一层，不是同一层。

### 排列去重：`used[i-1]` 判断

```python
def permute_unique(nums):
    nums.sort()
    ans = []
    path = []
    used = [False] * len(nums)

    def dfs():
        if len(path) == len(nums):
            ans.append(path.copy())
            return

        for i in range(len(nums)):
            if used[i]:
                continue
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue

            used[i] = True
            path.append(nums[i])
            dfs()
            path.pop()
            used[i] = False

    dfs()
    return ans
```

`not used[i-1]` 的含义：前一个相同值**刚被撤销**，说明当前是在同一层做第二次相同选择，跳过。
如果 `used[i-1]` 为真，说明前一个相同值在**上一层**，当前是往下递归，必须保留。

### 两种去重的区别

| 题型 | 去重条件 | 原因 |
| --- | --- | --- |
| 组合 / 子集 | `i > start and nums[i] == nums[i-1]` | 同一层不能选重复值 |
| 排列 | `not used[i-1] and nums[i] == nums[i-1]` | 同一层不能以相同值开头 |

**共同前提：先排序。** 只有排好序，相同的值才会相邻，才谈得上「跳过前一个」。

## 剪枝

回溯的复杂度是指数级的，剪枝决定了它能不能跑完。

### 1. 可行性剪枝

当前选择已经不可能满足约束，直接停止：

```python
if candidates[i] > remain:
    break            # 数组已排序，后面的更大，整层都可以结束
```

### 2. 数量剪枝

剩余元素不够凑齐所需数量时提前结束：

```python
# 从 1..n 中选 k 个
if n - i + 1 < k - len(path):
    break
```

### 3. 重复性剪枝

同一层已经试过的相同值不再试（见上一节）。

### 4. 最优性剪枝

如果当前代价已经超过已知最优解，停止（常见于「最短/最少」类搜索）。
这类问题通常更适合 BFS 或 DP，回溯只在方案数很少时使用。

## 例题精讲

### 例 1：组合总和（LeetCode 39）

[39. 组合总和](../problems/leetcode/0039_combination_sum.md)

每个数可以**重复使用**，所以下一层仍从 `i` 开始，而不是 `i + 1`：

```python
def combination_sum(candidates, target):
    candidates.sort()
    ans = []
    path = []

    def dfs(start, remain):
        if remain == 0:
            ans.append(path.copy())
            return

        for i in range(start, len(candidates)):
            if candidates[i] > remain:
                break

            path.append(candidates[i])
            dfs(i, remain - candidates[i])   # i：允许重复选
            path.pop()

    dfs(0, target)
    return ans
```

- `i + 1` → 每个数最多一次（0-1）；
- `i` → 每个数可以无限次（完全）。

### 例 2：括号生成（LeetCode 22）

[22. 括号生成](../problems/leetcode/0022_generate_parentheses.md)

每一步只有两个选择：放左括号或放右括号，但有两个约束：

- 左括号不能超过 `n` 个；
- 右括号不能超过左括号（否则出现 `)(` 这种非法前缀）。

```python
def generate_parenthesis(n):
    ans = []

    def dfs(path, open_count, close_count):
        if len(path) == 2 * n:
            ans.append(path)
            return

        if open_count < n:
            dfs(path + '(', open_count + 1, close_count)
        if close_count < open_count:
            dfs(path + ')', open_count, close_count + 1)

    dfs('', 0, 0)
    return ans
```

这里用字符串拼接代替 `path.append/pop`，因为字符串不可变，天然不需要撤销。
代价是每层都创建新字符串，空间是 `O(n)` 层 × `O(n)` 长度。

### 例 3：电话号码的字母组合（LeetCode 17）

[17. 电话号码的字母组合](../problems/leetcode/0017_letter_combinations_of_a_phone_number.md)

```python
def letter_combinations(digits):
    if not digits:
        return []

    phone = {
        '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
        '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',
    }
    ans = []
    path = []

    def dfs(i):
        if i == len(digits):
            ans.append(''.join(path))
            return

        for ch in phone[digits[i]]:
            path.append(ch)
            dfs(i + 1)
            path.pop()

    dfs(0)
    return ans
```

这是「多个集合各选一个」的笛卡尔积，没有去重问题，也不需要 `start`。

### 例 4：单词搜索（LeetCode 79）

[79. 单词搜索](../problems/leetcode/0079_word_search.md)

网格回溯的代表。访问过的格子要临时标记，返回时恢复：

```python
def exist(board, word):
    rows, cols = len(board), len(board[0])

    def dfs(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols):
            return False
        if board[r][c] != word[i]:
            return False

        saved = board[r][c]
        board[r][c] = '#'                 # 标记当前路径已使用
        found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)
                 or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))
        board[r][c] = saved               # 恢复现场

        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

**为什么不能像岛屿数量那样永久标记？** 岛屿数量只关心连通块，一个格子访问一次就够；
单词搜索要试很多条路径，同一条路径不能重复用格子，但不同路径可以。
所以标记只对「当前路径」有效，必须撤销。

## 复杂度分析

| 题型 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 子集 | O(2^n × n) | O(n) | 2^n 个答案，每个长度 n |
| 组合 | O(C(n, k) × k) | O(k) | 只枚举选 k 个的组合 |
| 排列 | O(n! × n) | O(n) | n! 个答案 |
| 组合总和 | O(解的数量 × 平均长度) | O(target / min) | 输出敏感，剪枝后远小于理论上界 |
| N 皇后 | O(n!) | O(n) | 每行选一列，剪枝后远小于 n^n |
| 分割回文串 | O(n × 2^n) | O(n) | 最多 2^(n-1) 种分割 |
| 单词搜索 | O(m × n × 4^L) | O(L) | L 是单词长度，每个格子最多 4 个方向 |

> 回溯的复杂度通常写成「解的数量 × 构造一个解的成本」。
> 面试时不要只说 `O(2^n)`，要说明 `2^n` 从哪来、每个解拷贝一次要多少。

## 易错点

- ❌ **忘记 `path.pop()`**：上一层选择残留在路径里，后面的分支全部被污染。
- ❌ **答案直接存 `path`**：存的是引用，最后所有答案都会变成同一个列表。必须 `path.copy()` 或 `list(path)`。
- ❌ **组合用 `i + 1` 却允许重复选**：39 要写 `dfs(i, ...)`，40 才写 `dfs(i + 1, ...)`。
- ❌ **去重条件写成 `i > 0`**：会误杀不同层的相同值，例如 `[1,1,2]` 里的 `[1,1]`。
- ❌ **排列去重忘记 `nums.sort()`**：相同值不相邻，`nums[i] == nums[i-1]` 判断失效。
- ❌ **`used` 忘记复位**：和 `path.pop()` 一样，是撤销的一部分。
- ❌ **剪枝用 `continue` 还是 `break` 分不清**：数组已排序且当前值已超过目标时用 `break`；只是当前值重复时用 `continue`。
- ❌ **递归终止条件漏掉空输入**：`digits = ""` 应返回 `[]`，而不是 `[""]`。
- ❌ **棋盘题只标记不恢复**：单词搜索、解数独这类题必须恢复现场。

## 相关题目

**子集与组合：**

- [39. 组合总和](../problems/leetcode/0039_combination_sum.md)
- [78. 子集](https://leetcode.cn/problems/subsets/)
- [40. 组合总和 II](https://leetcode.cn/problems/combination-sum-ii/)
- [77. 组合](https://leetcode.cn/problems/combinations/)
- [90. 子集 II](https://leetcode.cn/problems/subsets-ii/)

**排列：**

- [46. 全排列](../problems/leetcode/0046_permutations.md)
- [47. 全排列 II](https://leetcode.cn/problems/permutations-ii/)

**棋盘与分割：**

- [51. N 皇后](../problems/leetcode/0051_n_queens.md)
- [79. 单词搜索](../problems/leetcode/0079_word_search.md)
- [131. 分割回文串](../problems/leetcode/0131_palindrome_partitioning.md)

**字符串生成：**

- [17. 电话号码的字母组合](../problems/leetcode/0017_letter_combinations_of_a_phone_number.md)
- [22. 括号生成](../problems/leetcode/0022_generate_parentheses.md)

## 相关模式

- [DFS 模式](dfs.md)：回溯的骨架。
- [递归](recursion.md)：递归三要素与调用栈。
- [动态规划](dynamic_programming.md)：只求最优值 / 方案数时的替代方案。
- [贪心](greedy.md)：只求一个解且能证明局部最优时，不必枚举。

## 算法可视化

下面的播放器演示**子集**的回溯过程（枚举型写法）。输入是逗号分隔的数字（例如 `1,2,3`）。
上面是候选数组，下面是 `path（已选）`。

重点看三件事：

1. 每进入一层，先把当前 `path` 记为一个答案 —— 空集也是子集；
2. `path.append` 之后，数组里对应的格子变成「正在看」，递归往下；
3. 递归返回后 `path.pop()`，`path` 立刻退回上一层。**撤销之后，同一层才能试下一个候选。**

把输入改成 `1,2,3,4` 会看到帧数迅速变多（`2^4 = 16` 个子集）。
这正是回溯的复杂度来源：方案数本身就是指数级的，剪枝只能减少实际走的 branch，
不能改变最坏情况的上界。
