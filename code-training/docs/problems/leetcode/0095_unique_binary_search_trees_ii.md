---
title: 95. 不同的二叉搜索树 II
platform: LeetCode
difficulty: Medium
id: 95
url: https://leetcode.cn/problems/unique-binary-search-trees-ii/
tags:
  - 树
  - 二叉搜索树
  - 回溯
  - 动态规划
  - 二叉树
topics: []
patterns:
  - ../../patterns/backtracking.md
  - ../../patterns/dynamic_programming.md
date_added: 2026-09-29
date_reviewed: []
---

# 95. 不同的二叉搜索树 II

## 题目描述

给定整数 `n`，生成并返回所有由 `1` 到 `n` 的节点值组成、结构互不相同的二叉搜索树。答案可以按任意顺序返回。

## 示例

### 示例 1

**输入：** n = 3
**输出：** [[1,null,2,null,3],[1,null,3,2],[2,1,3],[3,1,null,null,2],[3,2,null,1]]

### 示例 2

**输入：** n = 1
**输出：** [[1]]

## 解题思路

### 路线：区间定死，左右子树各自穷举再拼

二叉搜索树有一条硬性质：根的值一定把剩下的数分成两段——左边都小、右边都大。所以只要选定根，左右子树可用的数值区间就唯一确定了，两边的结构互相独立。

于是问题按区间递归：`build(lo, hi)` 返回「用 `lo..hi` 能拼出的所有子树」。每个值轮流当根，左右两边各自拿到一组候选，两两配对就是当前根的全部结构。

### 手法：区间递归 + 笛卡尔积

```python
def build(lo, hi):
    if lo > hi:
        return [None]          # 空区间也有一种结构：空子树
    res = []
    for root_val in range(lo, hi + 1):
        left_trees = build(lo, root_val - 1)
        right_trees = build(root_val + 1, hi)
        for left in left_trees:
            for right in right_trees:
                node = TreeNode(root_val)
                node.left = left
                node.right = right
                res.append(node)
    return res
```

空区间返回 `[None]` 而不是 `[]`：外层要拿它和另一侧做配对，`[]` 会让 `for` 一次都不执行，整棵子树凭空消失。`n = 0` 是另一回事——题目要的是「一棵树都没有」，入口处单独返回 `[]`。

两层 `for` 是笛卡尔积：左边选一种、右边选一种，就得到一棵不同的树。根相同而左右结构不同，仍然是不同的树，不能只配同一位置。

### 推演：`n = 3`

区间 `[1,3]`，三个值轮流当根：

- **根 1**：左 `build(1,0) = [None]`；右 `build(2,3)` 有两棵（根 2 右接 3、根 3 左接 2）。配出 `1→2→3` 与 `1→3→2` 两棵。
- **根 2**：左 `[1]`、右 `[3]`，只有一种配法 `2(1,3)`。
- **根 3**：右 `[None]`；左 `build(1,2)` 有两棵（根 1 右接 2、根 2 左接 1）。配出 `3→1→2` 与 `3→2→1` 两棵。

合计 `2 + 1 + 2 = 5` 棵，与示例 1 的输出一一对应。

## 完整代码实现

```python
from typing import List, Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Solution:
    def generateTrees(self, n: int) -> List[Optional[TreeNode]]:
        def build(lo: int, hi: int) -> List[Optional[TreeNode]]:
            # 空区间只有「空子树」这一种结构
            if lo > hi:
                return [None]

            res = []
            for root_val in range(lo, hi + 1):
                # BST 性质把数值区间切成左右两段，两侧互不影响
                left_trees = build(lo, root_val - 1)
                right_trees = build(root_val + 1, hi)
                # 左、右各取一种，笛卡尔积就是当前根下的全部结构
                for left in left_trees:
                    for right in right_trees:
                        node = TreeNode(root_val)
                        node.left = left
                        node.right = right
                        res.append(node)
            return res

        # n = 0 表示没有树，不是「一棵空树」
        if n == 0:
            return []
        return build(1, n)
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 递归 + 左右笛卡尔积（最优） | O(n · C(n)) | O(n · C(n)) | C(n) 为卡特兰数；每棵结果树有 n 个节点，输出规模就是 n·C(n) |
| 先枚举全部二叉树再筛 BST | 指数级且远大于 C(n) | O(n · C(n)) | 绝大多数结构不满足 BST，白造再丢 |

时间下界由输出决定：所有结构都必须被生成一遍，答案数量本身就是卡特兰数。

## 易错点总结

### 1. 空区间返回 `[]` 而不是 `[None]`

`build(lo, hi)` 在 `lo > hi` 时若返回空列表，外层 `for left in left_trees` 一次都不进，当前根的所有组合全部消失。`n = 3` 会返回 `[]`，而正确答案是 5 棵树。

### 2. `n = 0` 也返回 `[None]`

`[None]` 表示「一棵空子树」，是递归内部用的；入口的 `n = 0` 表示「一棵树都没有」，必须返回 `[]`。两者混用后，`n = 0` 会交出一个含空树的结果，长度是 1 而不是 0。

### 3. 左右子树按下标配对，而不是做笛卡尔积

只写 `for i in range(len(left_trees)): node.left = left_trees[i]; node.right = right_trees[i]` 会漏掉大量组合：左边 2 种、右边 1 种时只能得到 2 棵，而正确数量是 2×1 之后还要叠加别的根。`n = 3` 实际只凑出 1 棵树，与示例的 5 棵相差甚远。

## 扩展思考

- **只问数量**：把「返回所有树」换成「返回棵数」就是 96 题。状态不再需要保存结构，`dp[i] = Σ dp[j]·dp[i-1-j]` 即可，复杂度降到 O(n²)。
- **结构相同、值不同**：若只要树的形状，可以把区间长度作为唯一状态缓存结果，再把形状映射回具体数值；本题值域与区间一一对应，直接递归已经足够。

## 相关题目

- [96. 不同的二叉搜索树](0096_unique_binary_search_trees.md)：同一套区间划分，只计数
- [22. 括号生成](0022_generate_parentheses.md)：卡特兰数的另一种外形
