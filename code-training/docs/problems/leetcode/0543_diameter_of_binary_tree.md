---
title: 543. 二叉树的直径
platform: LeetCode
difficulty: Easy
id: 543
url: https://leetcode.cn/problems/diameter-of-binary-tree/
tags:
  - 树
  - 二叉树
  - 深度优先搜索
  - 树形DP
topics: []
patterns:
  - ../../patterns/dfs.md
  - ../../patterns/dynamic_programming.md
date_added: 2026-04-09
date_reviewed: []
---

# 543. 二叉树的直径

## 题目描述

给你一棵二叉树的根节点，返回该树的**直径**。

二叉树的**直径**是指树中任意两个节点之间最长路径的**长度**。这条路径可能经过也可能不经过根节点 `root`。

两节点之间路径的**长度**由它们之间边数表示。

**提示：**

- 树中节点数目在范围 `[1, 10^4]` 内
- `-100 <= Node.val <= 100`

## 示例

### 示例 1

**输入：** root = [1,2,3,4,5]

**输出：** 3

**解释：** 取路径 `[4,2,1,3]` 或 `[5,2,1,3]` 的长度，都是 3 条边。

### 示例 2

**输入：** root = [1,2]

**输出：** 1

## 解题思路

路径的最高点（两条链分岔的那个节点，下面叫它**拐点**）把整条直径切成左右两段。于是问题变成：对每个节点算「左边最长的链 + 右边最长的链」，取全部节点的最大值。而两边的链长恰好是一次后序遍历顺路就能带回来的东西，所以这题只需要跑一遍树。

### 拐点两侧各是一条链

从某个节点往下走、到它子树里某个叶子为止，这条路叫一条**链**，链的长用边数算。以节点 `u` 为拐点的路径，一定是「左子树里的一条链 + 右子树里的一条链」——两条链在 `u` 这里接起来，不重不漏。

示例 1 的树是 `1(2(4,5), 3)`。把拐点放在 `2` 上：左边到 `4` 是 1 条边，右边到 `5` 是 1 条边，合起来 2；把拐点放在 `1` 上：左边最长链是 `1→2→4`（2 条边），右边是 `1→3`（1 条边），合起来 3。全部节点里最大是 3，这就是答案。

拐点不一定在根上：如果根只有一条长链，直径会在链的内部拐弯。所以每个节点都要结算一次，不能只算根。

### `dfs` 一次带回两样东西

`dfs(u)` 只回答一个问题：**从 `u` 往下最远的叶子有多远**，即一条链的长（边数）。于是

- 结算：以 `u` 为拐点的路径长 = `left + right`，拿它更新答案；
- 上报：父节点只能从 `u` 这一侧继续往下走，所以返回 `max(left, right) + 1`。

```python
def dfs(node):
    if not node:
        return 0                              # ① 空子树的链长是 0
    left = dfs(node.left)                     # ② 先拿到左右两条链
    right = dfs(node.right)
    self.ans = max(self.ans, left + right)    # ③ 以当前节点为拐点结算
    return max(left, right) + 1               # ④ 往上报一条链
```

这里的口径是**节点数**：空子树算 0，叶子算出 1。读的时候换个说法就顺了——`dfs(u)` 的值等于「从 `u` 的父节点出发，走到 `u` 子树里最深的叶子要几条边」。按这个读法，`left` 和 `right` 本身就是边数，`left + right` 自然就是经过 `u` 的那条路径的边数。

也可以改成纯粹按边数计（空子树返 -1，叶子返 0），但结算式要跟着变成 `left + right + 2`。两套口径混着用是本篇唯一的坑，见「易错点」。

### 推演：示例 1 的后序过程

后序遍历的访问顺序是 `4 → 5 → 2 → 3 → 1`（左右根）。

| 访问节点 | 左链 | 右链 | `left + right` | 更到答案 | 返回给父节点 |
| --- | --- | --- | --- | --- | --- |
| 4 | 0 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 | 1 |
| 1 | 2 | 1 | 3 | 3 | 3 |

`2` 那一行是第一次两条链都非空：左右各一条边，合起来 2。`1` 那一行 `left = 2` 表示从 `1` 往左走到最远的叶子（`4` 或 `5`）要 2 条边，`right = 1` 表示走到 `3` 要 1 条边，合计 3。

## 完整代码实现

```python
from typing import Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        self.ans = 0

        def dfs(node: Optional[TreeNode]) -> int:
            # 返回从 node 往下最远的一条链（边数）；空子树的链长为 0
            if not node:
                return 0
            left = dfs(node.left)
            right = dfs(node.right)
            # 以 node 为拐点：左右两条链在这里接成一条路径
            self.ans = max(self.ans, left + right)
            # 父节点只能沿一侧继续往下，所以只上报较长的那条
            return max(left, right) + 1

        dfs(root)
        return self.ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 每个节点单独求一次深度 | O(n²) | O(h) | 每个节点都重新遍历一遍自己的子树 |
| 一次后序遍历（最优） | O(n) | O(h) | 每个节点只进一次递归，h 是树高，最坏 O(n) |

## 易错点总结

### 1. 把结算式当成返回值

`return max(left, right) + 1` 写成 `return left + right + 1`：返回的是「两条链之和」，父节点拿到它再去加自己的另一侧，等于把已经拐过弯的路径又接了一次。示例 1 会输出 4（正确是 3），树越深偏得越多。`left + right` 只在结算那一行出现，返回值永远是单侧链。

### 2. 空子树的基准和结算式不是同一套口径

用边数口径时 `if not node: return 0`；若改成「空子树返 -1、叶子的链长为 0」（这也是常见的另一种写法），结算式就必须写成 `left + right + 2`。只把 `return 0` 改成 `return -1` 而不动结算式，示例 1 会输出 1（正确是 3），示例 2 输出 0（正确是 1）——每个叶子都少数了 2 条边。

## 扩展思考

- 把结算式换成 `left + right + node.val`、返回值换成 `max(left, right) + node.val`，就是 [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)：骨架不变，变的是「链」上记什么。
- 直径只要求「左右两条链」时，最大路径和还要处理负值，所以结算前要先和 0 取 `max`。
