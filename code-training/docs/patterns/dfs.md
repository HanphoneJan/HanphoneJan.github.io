---
title: DFS 模式
category: 算法模式
difficulty: 简单-困难
applicable_to:
  - 树
  - 图
  - 矩阵
  - 回溯
last_updated: 2026-10-19
---

# DFS（深度优先搜索）

## 一句话说清 DFS

DFS 沿着一条路一直走，**走不动了才回头**，回到最近一个还有岔路的路口，换一条继续走。
它不保证第一次到达就是最短，但能在很小的空间里走遍整张图，也天然适合「枚举所有方案」和「汇总子树信息」。

```
        1
       / \
      2   3
     / \   \
    4   5   6

DFS 访问顺序：1 → 2 → 4 → （回退）→ 5 → （回退）→ 3 → 6
```

## 两个实现：递归与显式栈

| 实现 | 优点 | 缺点 | 适用 |
| --- | --- | --- | --- |
| 递归 | 代码短，前/中/后序位置清晰 | 受调用栈深度限制 | 树、网格、回溯 |
| 显式栈 | 不受递归限制，可控制入栈顺序 | 中序/后序写起来绕 | 超深图、需要手动管理状态 |

递归的本质就是**用系统调用栈保存「回退点」**。把递归改写成显式栈，就是把系统栈换成一个列表，
逻辑并没有变。

### 递归模板

```python
def dfs(node):
    if not node:                 # 1. 终止条件
        return

    # 前序位置：刚进入 node，此时还没处理子树
    dfs(node.left)               # 2. 处理左子树
    # 中序位置：左子树处理完，右子树还没开始
    dfs(node.right)              # 3. 处理右子树
    # 后序位置：左右子树都处理完，可以汇总信息
```

### 显式栈模板（前序）

```python
def preorder(root):
    if not root:
        return []

    ans = []
    stack = [root]

    while stack:
        node = stack.pop()
        ans.append(node.val)

        # 栈是后进先出，所以先压右子树，保证左子树先被处理
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)

    return ans
```

## 前序、中序、后序：到底该把代码放在哪

同一个递归框架里有三个「位置」，它们决定了你能拿到什么信息：

| 位置 | 时机 | 适合做的事 |
| --- | --- | --- |
| **前序** | 刚进入节点 | 向下传递信息：路径、当前和、深度、父节点状态 |
| **中序** | 左子树处理完 | 二叉搜索树的有序输出、验证 BST |
| **后序** | 左右子树都处理完 | 向上汇总信息：高度、节点数、子树是否合法、删节点 |

一句话记忆：**信息往下走用前序，信息往上走用后序。**

以「求最大深度」为例，深度是子树的结果，必须等左右子树都算完才能合并，所以用后序：

```python
def max_depth(root):
    if not root:
        return 0
    left = max_depth(root.left)
    right = max_depth(root.right)
    return max(left, right) + 1      # 后序：先有子结果，再合并
```

反过来，「路径总和」把剩余目标值往下传，用前序更自然：

```python
def has_path_sum(root, target):
    if not root:
        return False
    if not root.left and not root.right:     # 叶子
        return root.val == target
    return (has_path_sum(root.left, target - root.val)
            or has_path_sum(root.right, target - root.val))
```

## 什么时候该想到 DFS

| 题目信号 | 对应模型 |
| --- | --- |
| 判断连通、数连通块、Flood Fill | 图/网格遍历 |
| 枚举所有路径、所有组合、所有方案 | DFS + 回溯 |
| 需要子树的高度、节点数、是否平衡 | 树的后序遍历 |
| 判断有向图是否有环 | 三色标记 DFS |
| 需要记录「从根到当前节点」的路径 | 前序 + 回溯 |
| 记忆化搜索（递归 + 缓存） | DFS + memo |

**不适合 DFS 的情况：**

- **无权图最短路 / 最少步数**：DFS 第一次到达不保证最短，用 BFS。
- **只关心「最近的那一个」**：BFS 可以提前停，DFS 往往要把整片走完。
- **图非常深、递归层数会超过 Python 限制**：改成显式栈或 BFS。
- **需要按层聚合结果**：层序天然属于 BFS。

## 图的 DFS

图与树的区别是**可能有环**，所以必须记录访问状态，否则会无限递归。

```python
def dfs_graph(graph, start):
    visited = set()
    order = []

    def dfs(u):
        if u in visited:
            return
        visited.add(u)          # 进入时标记，保证每个点只处理一次
        order.append(u)
        for v in graph[u]:
            dfs(v)

    dfs(start)
    return order
```

如果图不连通，需要对每个未访问的点调用一次 `dfs`：

```python
for u in range(n):
    if u not in visited:
        dfs(u)
```

### 三色标记判环

只用一个 `visited` 集合，能判断「走没走过」，但判断不了「当前路径上有没有环」。
有向图判环需要三种状态：

- `0`：没访问过；
- `1`：正在当前 DFS 路径上（访问中）；
- `2`：已经彻底处理完。

如果 DFS 时遇到状态 `1` 的邻居，说明沿着当前路径又走回了它 —— 有环。

```python
def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    for course, pre in prerequisites:
        graph[pre].append(course)       # pre -> course

    state = [0] * num_courses           # 0 未访问 / 1 访问中 / 2 已完成

    def dfs(u):
        if state[u] == 1:
            return False                # 回到当前路径上的点：有环
        if state[u] == 2:
            return True                 # 这个点已经确认安全

        state[u] = 1
        for v in graph[u]:
            if not dfs(v):
                return False
        state[u] = 2                    # 所有后代都处理完，标记为安全
        return True

    return all(dfs(u) for u in range(num_courses))
```

> 同一道 [207. 课程表](../problems/leetcode/0207_course_schedule.md) 也可以用 BFS 的 Kahn 算法做。
> 两种写法都对：**Kahn 更直观，三色 DFS 更容易扩展成「输出环上的点」**。

## 网格的 DFS（Flood Fill）

网格可以看成一个每个格子最多有 4 个邻居的图。DFS 的写法非常短，代价是递归深度可能达到 `m × n`。

```python
def num_islands(grid):
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        # 越界、不是陆地、已经访问过，都直接返回
        if not (0 <= r < rows and 0 <= c < cols):
            return
        if grid[r][c] != '1':
            return

        grid[r][c] = '0'                # 原地标记为已访问
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)

    return count
```

[200. 岛屿数量](../problems/leetcode/0200_number_of_islands.md) 用 DFS 或 BFS 都可以。
区别只在：DFS 代码短、占递归栈；BFS 代码长一点、占队列，但不会被递归深度卡住。

## 回溯：DFS 的一个特殊分支

普通 DFS 每个节点只访问一次；**回溯**则是在 DFS 的基础上，进入下一层前「做选择」，
返回后「撤销选择」，从而枚举所有路径。

```python
def subsets(nums):
    ans = []
    path = []

    def dfs(i):
        if i == len(nums):
            ans.append(path.copy())     # 必须拷贝，否则后续修改会污染答案
            return

        dfs(i + 1)                      # 不选 nums[i]

        path.append(nums[i])            # 选 nums[i]
        dfs(i + 1)
        path.pop()                      # 撤销选择

    dfs(0)
    return ans
```

「选 / 不选」的决策树有 `2^n` 个叶子，所以子集问题的复杂度是 `O(2^n)`。
回溯的模板、去重和剪枝细节见 [回溯模式](backtracking.md)。

## 例题精讲

### 例 1：二叉树的最大深度（LeetCode 104）

[104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)

```python
def max_depth(root):
    if not root:
        return 0
    return max(max_depth(root.left), max_depth(root.right)) + 1
```

推演 `[3, 9, 20, null, null, 15, 7]`：

| 节点 | 左子树深度 | 右子树深度 | 返回 |
| --- | --- | --- | --- |
| 9 | 0 | 0 | 1 |
| 15 | 0 | 0 | 1 |
| 7 | 0 | 0 | 1 |
| 20 | 1（15） | 1（7） | 2 |
| 3 | 1（9） | 2（20） | 3 |

答案 3。注意递归是先一路走到叶子，再在返回的路上逐层加一 —— 这就是后序。

### 例 2：二叉树的直径（LeetCode 543）

[543. 二叉树的直径](../problems/leetcode/0543_diameter_of_binary_tree.md)

直径 = 任意两个节点之间最长路径的边数。它不一定经过根，所以不能只算「左高 + 右高」。
正确做法是：对每个节点，算出「以它为最高点的路径长度」，取全局最大值。

```python
def diameter_of_binary_tree(root):
    ans = 0

    def depth(node):
        nonlocal ans
        if not node:
            return 0

        left = depth(node.left)
        right = depth(node.right)

        # 后序位置：左右深度都已经知道，可以更新答案
        ans = max(ans, left + right)
        return max(left, right) + 1     # 返回给父节点的是「单边最大深度」

    depth(root)
    return ans
```

这里有两个不同的量：

- **返回值**是「以当前节点为端点、向下走的最长边数」，父节点只能接这一条；
- **答案**是「以当前节点为拐点的左右两条边之和」，它不需要返回给父节点。

把这两个量分清楚，是树形 DFS 最关键的一步。

### 例 3：二叉树的最近公共祖先（LeetCode 236）

[236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)

后序的经典应用。对每个节点，返回它的子树里找到了什么：

- 左右都找到目标 → 当前节点就是最近公共祖先；
- 只在一边找到 → 把那个结果继续往上传递；
- 都没找到 → 返回 `None`。

```python
def lowest_common_ancestor(root, p, q):
    if not root or root is p or root is q:
        return root

    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)

    if left and right:
        return root          # p、q 分居两侧，当前节点就是 LCA
    return left or right     # 都在同一侧，继续向上传
```

### 例 4：岛屿数量（LeetCode 200）

[200. 岛屿数量](../problems/leetcode/0200_number_of_islands.md)

前面已经给出完整代码。这里补充一个易错点：**DFS 的终止条件必须同时覆盖「越界」和「不是陆地」**。
只判断 `grid[r][c] != '1'` 时，越界会先发生，Python 会报 `IndexError`；只判断越界时，
又会把水当成陆地继续递归。

### 例 5：单词搜索（LeetCode 79）

[79. 单词搜索](../problems/leetcode/0079_word_search.md)

在网格里找一条路径，使字符依次拼成 `word`。每个格子只能使用一次，所以需要「访问标记 + 恢复现场」：

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
        board[r][c] = '#'                 # 标记为当前路径已使用
        found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)
                 or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))
        board[r][c] = saved               # 回溯：恢复现场

        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

这类题和普通 Flood Fill 的区别是：**访问标记只对当前路径有效**。
如果像岛屿数量那样把格子永久改成 `'0'`，其他分支就再也用不了这个格子了。

## 常见变体

### 1. 多连通块遍历

图不连通时，外层套一个循环，对每个未访问的点启动一次 DFS。连通块个数就是启动次数。

### 2. 记录 DFS 序（时间戳）

在进入和离开节点时各记一个时间戳，可以把「子树」映射成一段连续区间，
用于「子树查询」「祖先判断」等问题。树链剖分、欧拉序都建立在这个思想上。

### 3. 记忆化搜索

DFS 的返回值只依赖参数时，可以把结果缓存起来，避免重复计算：

```python
from functools import cache

@cache
def dfs(i, j):
    ...
```

这就是自顶向下的动态规划，详见 [动态规划](dynamic_programming.md)。

### 4. 迭代加深

当答案深度未知、且 BFS 空间太大时，限制 DFS 的最大深度，逐次放宽。
它在每一轮都重复搜索浅层，但空间仍是 O(深度)。常见于「最少步数但状态空间巨大」的题。

## 复杂度分析

| 场景 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 二叉树遍历 | O(n) | O(h) | h 是树高，最坏 O(n) |
| 图的 DFS | O(V + E) | O(V) | visited + 递归栈 |
| 网格 Flood Fill | O(m × n) | O(m × n) | 最坏递归深度为格子数 |
| 三色判环 | O(V + E) | O(V) | 每个点、每条边各访问一次 |
| 子集枚举 | O(2^n × n) | O(n) | 2^n 个叶子，每个答案拷贝 O(n) |
| 全排列 | O(n! × n) | O(n) | n! 个答案，每个长度 n |

## 易错点

- ❌ **忘记 visited**：图有环时无限递归，直接栈溢出。
- ❌ **visited 时机不对**：普通遍历进入时标记没问题；判环必须区分「访问中」和「已完成」。
- ❌ **回溯忘记恢复现场**：修改了 `board` / `path` 却没有还原，后面的分支会拿到脏状态。
- ❌ **答案没有拷贝**：`ans.append(path)` 存的是引用，最后所有答案都会变成同一个列表。
- ❌ **递归深度超限**：Python 默认约 1000 层。网格 DFS 在 `1000 × 1000` 的图上会直接崩，改用 BFS 或显式栈。
- ❌ **只从一个点开始 DFS**：图/网格可能不连通，要外层遍历所有起点。
- ❌ **树题漏掉空节点判断**：`if not root: return ...` 是所有树递归的第一行。
- ❌ **在递归中修改全局状态却不恢复**：尤其是 `nonlocal` 变量和闭包里的列表。

## 相关题目

**树：**

- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [101. 对称二叉树](../problems/leetcode/0101_symmetric_tree.md)
- [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [543. 二叉树的直径](../problems/leetcode/0543_diameter_of_binary_tree.md)
- [124. 二叉树中的最大路径和](../problems/leetcode/0124_binary_tree_maximum_path_sum.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)
- [114. 二叉树展开为链表](../problems/leetcode/0114_flatten_binary_tree_to_linked_list.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)

**图与网格：**

- [200. 岛屿数量](../problems/leetcode/0200_number_of_islands.md)
- [207. 课程表](../problems/leetcode/0207_course_schedule.md)
- [79. 单词搜索](../problems/leetcode/0079_word_search.md)

**回溯：**

- [17. 电话号码的字母组合](../problems/leetcode/0017_letter_combinations_of_a_phone_number.md)
- [22. 括号生成](../problems/leetcode/0022_generate_parentheses.md)
- [39. 组合总和](../problems/leetcode/0039_combination_sum.md)
- [46. 全排列](../problems/leetcode/0046_permutations.md)
- [51. N 皇后](../problems/leetcode/0051_n_queens.md)
- [131. 分割回文串](../problems/leetcode/0131_palindrome_partitioning.md)

## 相关模式

- [BFS 模式](bfs.md)：层序与无权最短路。
- [回溯模式](backtracking.md)：DFS + 撤销选择。
- [递归](recursion.md)：递归三要素与调用栈。
- [动态规划](dynamic_programming.md)：记忆化搜索是 DFS 与 DP 的交汇点。
- [树](../data-structures/tree.md)、[二叉树](../data-structures/binary_tree.md)、[图](../data-structures/graph.md)。

## 算法可视化

下面有两个播放器。

**树的 DFS 遍历**：输入格式是 `层序数组; 前序/中序/后序`（例如 `1,2,3,4,5,null,7; 前序`）。
同一棵树，把遍历顺序切换成前序 / 中序 / 后序，观察访问序列的差别。
三种遍历的代码只差「记录当前节点」这一句的位置：前序在进入时记录，中序在左子树返回后记录，
后序在右子树返回后记录。中序在二叉搜索树上会得到有序序列，这不是巧合，而是 BST 的定义决定的。

**回溯：子集**：输入是逗号分隔的数字（例如 `1,2,3`）。跟着决策树走一遍「选 → 递归 → 撤销」。重点看 `path` 在每次返回后如何退回上一层。
如果撤销那一步被漏掉，后续分支会把别的分支的数字带进来，画面上会立刻出现重复或错误的答案。
