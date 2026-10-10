---
title: 95. 不同的二叉搜索树 II
platform: LeetCode
difficulty: Medium
sidebar_position: 95
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

给你一个整数 `n`，请你生成并返回所有由 `1` 到 `n` 个节点组成的、节点值从 `1` 到 `n` 互不相同的不同**二叉搜索树**。可以按**任意顺序**返回答案。

**示例**：
- 输入：`n = 3` → 输出：5 棵不同的 BST
- 输入：`n = 1` → 输出：1 棵 BST（根为 1）

---

## 解题思路

### 第一步：理解问题本质

生成由 `1..n` 构成的**所有**不同结构二叉搜索树。二叉搜索树性质：左子树所有值 < 根 < 右子树所有值。

由于值有序，枚举每个数作为根，左子树、右子树的取值范围就确定下来了，可以用分治递归。

### 第二步：暴力解法

穷举所有可能的二叉树结构再检查是否满足 BST。结构数量庞大且大部分无效，不可行。

### 第三步：递归 + 分治（最优）

关键观察：对于闭区间 `[lo, hi]`，区间内每个值 `root` 都可以作为根：
- 左子树必须由 `[lo, root-1]` 的值构成
- 右子树必须由 `[root+1, hi]` 的值构成

因此递归地求出左子树的所有结构和右子树的所有结构，再**两两组合**（笛卡尔积）拼到根节点上，就得到了所有以 `root` 为根的完整树。

**递归终点**：`lo > hi` 时返回 `[None]`（空区间只有"空子树"这一种结构）。

```python
class Solution:
    def generateTrees(self, n: int) -> List[Optional[TreeNode]]:
        def build(lo: int, hi: int) -> List[Optional[TreeNode]]:
            if lo > hi:
                return [None]
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

        if n == 0:
            return []
        return build(1, n)
```

---

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
            if lo > hi:
                return [None]
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

        if n == 0:
            return []
        return build(1, n)
```

---

## 示例推演

以 `n = 3` 为例，区间 `[1,3]`：

**`root = 1`**：左子树 `build(1,0)=[None]`，右子树 `build(2,3)`：
- 右子树中以 2 为根：左 `[None]`，右 `[3]` → `1-2-3`
- 右子树中以 3 为根：左 `[2]`，右 `[None]` → `1-3-2`
- 组合得到：`1 → 右子树 {2,3}` 两种

**`root = 2`**：左子树 `build(1,1)=[1]`，右子树 `build(3,3)=[3]` → `1-2-3`

**`root = 3`**：左子树 `build(1,2)`，右子树 `[None]`：
- 左子树中以 1 为根：右 `[2]` → `3-1-2`
- 左子树中以 2 为根：左 `[1]` → `3-2-1`
- 组合得到：`3 → 左子树 {1,2}` 两种

**结果**：共 5 棵 BST。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 穷举所有树 | 指数级 | — | 无效结构太多 |
| 递归分治 | O(C(n)) | O(C(n)) | C(n) 为卡特兰数，约 O(4ⁿ/n^(3/2)) |

> 生成树的数量就是卡特兰数 C(n)，所有结构都必须生成，因此时间和空间都下界为卡特兰数。

---

## 易错点总结

1. **递归终点返回 `[None]`**：`lo > hi` 时返回 `[None]` 而非空列表，这样外层 `for left in left_trees` 才能正确拼接，否则空列表会让外层结果丢失。
2. **根值范围**：`root_val` 在 `[lo, hi]` 内枚举，左区间 `[lo, root-1]`、右区间 `[root+1, hi]`，边界别写错。
3. **`n = 0` 的边界**：LeetCode 要求返回空列表 `[]`，而不是 `[None]`。
4. **笛卡尔积组合**：每种左子树与每种右子树都要与当前根组合一次，用双层 `for` 遍历。

---

## 扩展思考

- **不同的二叉搜索树（LeetCode 96）**：只统计数量，用 DP 即可，是本题的"只计数不生成"版本。
- 卡特兰数也出现在括号匹配（LeetCode 22）、出栈序列等经典问题中，本质都是"左右子结构划分"的计数。
- 若只需生成结构而不关心值，可用 0/1 标记替代码，本题直接用值即可。

---

## 相关题目

- [96. 不同的二叉搜索树](0096_unique_binary_search_trees.md)
- [22. 括号生成](0022_generate_parentheses.md)