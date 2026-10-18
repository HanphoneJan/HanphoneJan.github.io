---
title: 递归
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 树
  - 分治
  - 动态规划
last_updated: 2026-10-19
---

# 递归

## 一句话说清递归

递归就是**函数调用自己**，把一个大问题交给「规模更小、但形状相同」的子问题，
直到小到可以直接回答，再一层层把答案返回。

```
factorial(4)
= 4 × factorial(3)
= 4 × 3 × factorial(2)
= 4 × 3 × 2 × factorial(1)
= 4 × 3 × 2 × 1
= 24
```

递归代码之所以短，是因为它只描述**一层**做什么，剩下的交给「同样的函数」。
代价是每次调用都要在调用栈上保存现场，递归太深会栈溢出。

## 递归三要素

| 要素 | 作用 | 例子 |
| --- | --- | --- |
| **终止条件**（base case） | 最小子问题的直接答案，阻止无限递归 | `n <= 1` 时返回 1 |
| **递推关系** | 当前问题如何由子问题得到 | `fact(n) = n × fact(n-1)` |
| **递归调用** | 向更小规模推进 | `fact(n-1)` |

写递归的顺序应该是：

1. 先写终止条件（最简单的情况怎么答）；
2. 再写递推关系（当前这层要做什么）；
3. 最后检查「每次调用是否真的在变小」。

### 「相信递归」

初学者常犯的错是试图在脑子里展开每一层。正确的心态是：

> **假设 `dfs(子问题)` 已经能返回正确答案，我只负责用它的结果拼出当前答案。**

只要终止条件正确、递推关系正确、每次规模都在减小，递归就一定能工作。
这就是所谓的「递归的信仰之跃」。

## 执行顺序：前序与后序

递归函数里，代码可以放在递归调用的**前面**或**后面**，执行时机完全不同：

```python
def dfs(node):
    if not node:
        return

    print("前序", node.val)     # 进入节点时执行
    dfs(node.left)
    print("中序", node.val)     # 左子树返回后执行
    dfs(node.right)
    print("后序", node.val)     # 右子树返回后执行
```

- **前序位置**：信息从父节点流向子节点（路径、深度、剩余目标）；
- **后序位置**：信息从子节点流回父节点（高度、节点数、子树是否合法）。

一句话：**往下传用前序，往上传用后序。**

## 三种递归形态

### 1. 线性递归（每层一个子问题）

```python
def factorial(n):
    if n <= 1:              # 终止条件
        return 1
    return n * factorial(n - 1)
```

调用链是一条直线：`fact(4) → fact(3) → fact(2) → fact(1)`。
时间复杂度 `O(n)`，空间复杂度 `O(n)`（调用栈）。

### 2. 树形递归（每层多个子问题）

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

调用链是一棵树：每个节点分裂成两个子节点。没有记忆化时，同一个 `fib(k)`
会被重复计算，复杂度是 `O(2^n)`。

### 3. 分治（分解 + 合并）

```python
def merge_sort(nums):
    if len(nums) <= 1:
        return nums

    mid = len(nums) // 2
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])
    return merge(left, right)


def merge(a, b):
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out
```

分治是递归的一种**策略**：把问题拆成若干个互不重叠的子问题，
分别求解后再合并。归并排序、快速排序、二分查找都是分治。

## 递归树与复杂度

分析递归复杂度，最直观的方法是画**递归树**：数一数有多少个节点、每个节点做多少工作。

| 递推式 | 复杂度 | 例子 |
| --- | --- | --- |
| `T(n) = T(n-1) + O(1)` | O(n) | 阶乘、反转链表 |
| `T(n) = T(n-1) + T(n-2) + O(1)` | O(2^n) | 朴素斐波那契 |
| `T(n) = T(n/2) + O(1)` | O(log n) | 二分查找 |
| `T(n) = 2T(n/2) + O(n)` | O(n log n) | 归并排序 |
| `T(n) = 2T(n/2) + O(1)` | O(n) | 二叉树遍历 |
| `T(n) = T(n-1) + O(n)` | O(n²) | 某些字符串 DP 的暴力递归 |

以归并排序为例：

```
                n
        n/2            n/2
    n/4  n/4        n/4  n/4
     ...             ...
```

每一层合并的总工作量是 `O(n)`，一共有 `log n` 层，所以 `O(n log n)`。

## 例题精讲

### 例 1：反转链表（LeetCode 206）

[206. 反转链表](../problems/leetcode/0206_reverse_linked_list.md)

递归写法是**后序**的典型：先反转后面的链表，再处理当前节点。

```python
def reverse_list(head):
    if not head or not head.next:     # 空链表或单节点
        return head

    new_head = reverse_list(head.next)   # 先反转后面的部分

    head.next.next = head             # 让后一个节点指回自己
    head.next = None                  # 断开原来的指向，避免成环

    return new_head                   # 新的头一直是原链表的尾节点
```

以 `1 → 2 → 3` 为例：

1. 递归到 `3`，返回 `3`；
2. 回到 `2`：`2.next.next = 2`，`2.next = None`，返回 `3`；
3. 回到 `1`：`1.next.next = 1`，`1.next = None`，返回 `3`。

最终 `3 → 2 → 1`。**`head.next = None` 不能省**，否则 `1` 和 `2` 会互相指向，形成环。

### 例 2：二叉树的最大深度（LeetCode 104）

[104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)

```python
def max_depth(root):
    if not root:
        return 0

    left = max_depth(root.left)
    right = max_depth(root.right)
    return max(left, right) + 1
```

空树的深度是 0，这是终止条件；当前深度 = 较深子树 + 1，这是后序合并。

### 例 3：二叉树展开为链表（LeetCode 114）

[114. 二叉树展开为链表](../problems/leetcode/0114_flatten_binary_tree_to_linked_list.md)

要求把二叉树原地展开成「只有右孩子」的链表，顺序与前序遍历一致。
后序处理：先把左右子树分别展开，再把左子树接到右子树前面。

```python
def flatten(root):
    def dfs(node):
        if not node:
            return None

        left_tail = dfs(node.left)
        right_tail = dfs(node.right)

        if node.left:
            left_tail.right = node.right    # 左子树的末尾接上右子树
            node.right = node.left          # 左子树变成右子树
            node.left = None

        # 返回展开后这条链表的最后一个节点
        return right_tail or left_tail or node

    dfs(root)
```

返回「尾节点」是关键：父节点需要知道把右子树接在哪里。
这是后序递归常见的返回值设计。

### 例 4：不同的二叉搜索树（LeetCode 96）

[96. 不同的二叉搜索树](../problems/leetcode/0096_unique_binary_search_trees.md)

选 `i` 作为根，左子树有 `i-1` 个节点，右子树有 `n-i` 个节点，两边独立：

```
G(n) = Σ G(i-1) × G(n-i)     (i = 1..n)
G(0) = G(1) = 1
```

```python
def num_trees(n):
    if n <= 1:
        return 1

    dp = [0] * (n + 1)
    dp[0] = dp[1] = 1

    for i in range(2, n + 1):
        for j in range(1, i + 1):
            dp[i] += dp[j - 1] * dp[i - j]

    return dp[n]
```

递归式直接翻译成递推就是 DP。这类「子问题重叠」的递归，加缓存或改递推都能避免指数爆炸。

### 例 5：合并两个有序链表（LeetCode 21）

[21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)

```python
def merge_two_lists(l1, l2):
    if not l1:
        return l2
    if not l2:
        return l1

    if l1.val <= l2.val:
        l1.next = merge_two_lists(l1.next, l2)
        return l1
    else:
        l2.next = merge_two_lists(l1, l2.next)
        return l2
```

终止条件：有一条链表为空，直接返回另一条。
递推：较小的头节点后面接「剩下两条链表合并的结果」。

## 记忆化：消灭重复子问题

朴素斐波那契的递归树里有大量重复节点。把结果缓存起来，每个状态只算一次：

```python
from functools import cache

@cache
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

- 时间从 `O(2^n)` 降到 `O(n)`；
- 空间是 `O(n)`（缓存 + 递归栈）。

> `@cache` 要求参数可哈希。传 `list` 会报 `TypeError`，先转成 `tuple`。
> 递归深度太大时，记忆化搜索也可能栈溢出，此时改写成递推。

记忆化搜索就是**自顶向下的动态规划**，详见 [动态规划](dynamic_programming.md)。

## 递归转迭代

### 1. 线性递归 → 循环

```python
def factorial_iter(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

### 2. 树递归 → 显式栈

```python
def preorder(root):
    if not root:
        return []

    ans = []
    stack = [root]

    while stack:
        node = stack.pop()
        ans.append(node.val)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)

    return ans
```

### 3. 尾递归

尾递归是「递归调用是函数的最后一步」。有些语言会把它优化成循环，
**Python 不会**。所以 Python 里不要指望尾递归能避免栈溢出，该用循环就用循环。

### 4. 递归深度限制

Python 默认递归深度约 1000：

```python
import sys
sys.setrecursionlimit(100000)
```

调大限制只能解决「深度略超」的情况；真正的深递归（例如 10^5 个节点的链）
应该改写成迭代，否则可能触发 C 栈溢出，直接崩溃。

## 递归 vs 迭代 vs 分治 vs 回溯

| 概念 | 本质 | 例子 |
| --- | --- | --- |
| 递归 | 函数调用自身 | 阶乘、树的遍历 |
| 迭代 | 用循环重复 | 数组遍历、动态规划递推 |
| 分治 | 拆成互不重叠的子问题再合并 | 归并排序、二分查找 |
| 回溯 | 递归 + 撤销选择，枚举所有路径 | 子集、排列、N 皇后 |
| 记忆化搜索 | 递归 + 缓存 | 斐波那契、自顶向下 DP |

递归是**实现手段**，分治和回溯是**策略**，记忆化是**优化**。它们经常一起出现，
但不是同一个概念。

## 复杂度分析

| 递归形态 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 线性递归 | O(n) | O(n) | 调用栈深度 n |
| 树形递归（无缓存） | O(2^n) | O(n) | 斐波那契 |
| 树形递归（有缓存） | O(n) | O(n) | 每个状态算一次 |
| 二叉树遍历 | O(n) | O(h) | h 是树高，最坏 O(n) |
| 二分查找 | O(log n) | O(log n) | 递归栈 |
| 归并排序 | O(n log n) | O(n) | 合并需要额外数组 |
| 快速排序 | 平均 O(n log n) | O(log n) | 递归栈 |

## 易错点

- ❌ **忘记终止条件**：无限递归，最终 `RecursionError`。
- ❌ **终止条件边界错**：`n <= 1` 写成 `n < 1`，`n = 1` 时会继续递归成负数。
- ❌ **递归没有向终止条件推进**：`dfs(n)` 里调用 `dfs(n)`，规模没变小。
- ❌ **可变默认参数**：`def dfs(path=[])` 的默认列表在所有调用间共享，必须用 `None` 再初始化。
- ❌ **共享可变状态未恢复**：回溯里的 `path`、`board` 修改后要撤销。
- ❌ **返回值路径不完整**：只在部分分支 `return`，其余分支返回 `None`，调用方拿到意外结果。
- ❌ **递归深度超限**：链状结构、网格 DFS 在 Python 里很容易超过 1000 层。
- ❌ **重复计算**：树形递归没有记忆化，`n = 40` 的朴素斐波那契就可能卡住。
- ❌ **以为 Python 优化尾递归**：没有这回事，深递归必须改迭代。

## 相关题目

**入门：**

- [206. 反转链表](../problems/leetcode/0206_reverse_linked_list.md)
- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)
- [24. 两两交换链表中的节点](../problems/leetcode/0024_swap_nodes_in_pairs.md)

**树与分治：**

- [114. 二叉树展开为链表](../problems/leetcode/0114_flatten_binary_tree_to_linked_list.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)
- [543. 二叉树的直径](../problems/leetcode/0543_diameter_of_binary_tree.md)
- [124. 二叉树中的最大路径和](../problems/leetcode/0124_binary_tree_maximum_path_sum.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)
- [108. 将有序数组转换为二叉搜索树](../problems/leetcode/0108_convert_sorted_array_to_binary_search_tree.md)

**递归与 DP：**

- [70. 爬楼梯](../problems/leetcode/0070_climbing_stairs.md)
- [96. 不同的二叉搜索树](../problems/leetcode/0096_unique_binary_search_trees.md)
- [95. 不同的二叉搜索树 II](../problems/leetcode/0095_unique_binary_search_trees_ii.md)

## 相关模式

- [DFS 模式](dfs.md)：树与图的递归遍历。
- [回溯](backtracking.md)：递归 + 撤销选择。
- [动态规划](dynamic_programming.md)：记忆化搜索与递推。
- [排序](sorting.md)：归并排序与快速排序都是分治递归。
- [树](../data-structures/tree.md)、[二叉树](../data-structures/binary_tree.md)。
