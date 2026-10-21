---
title: 543. 二叉树的直径
platform: LeetCode
difficulty: Easy
id: 543
url: https://leetcode.cn/problems/diameter-of-binary-tree/
tags:
  - 树
  - 深度优先搜索
  - 二叉树
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

给定一棵二叉树，你需要计算它的直径长度。一棵二叉树的直径长度是任意两个结点路径长度中的最大值。这条路径可能穿过也可能不穿过根结点。

**示例 1：**
```
给定二叉树
          1
         / \
        2   3
       / \
      4   5
返回 3, 它的长度是路径 [4,2,1,3] 或者 [5,2,1,3]。
```

**注意：** 两结点之间的路径长度是以它们之间边的数目表示。

---

## 解题思路

### 第一步：理解问题本质

**直径的定义：** 树中任意两个节点之间路径的最大长度（以边数计算）。

**关键洞察：** 对于任意一个节点，经过它的最长路径 = 左子树的最大深度 + 右子树的最大深度。

因此，二叉树的直径 = 所有节点的「左深度 + 右深度」中的最大值。

### 第二步：暴力解法

**思路：** 对每个节点，计算经过它的最长路径，然后取最大值。

```python
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        # 空树没有边，直径是 0
        if not root:
            return 0
        
        # 经过根节点的直径：左右两边各自往下能走多远，加起来就是穿过根的边数
        through_root = self.depth(root.left) + self.depth(root.right)
        # 左子树的直径
        left_dia = self.diameterOfBinaryTree(root.left)
        # 右子树的直径
        right_dia = self.diameterOfBinaryTree(root.right)
        
        # 最长的路径可能在根上，也可能完全落在某一棵子树里，三者取最大
        return max(through_root, left_dia, right_dia)
    
    def depth(self, node):
        # depth 返回以 node 为根的子树高度（节点数），空树高度为 0
        if not node:
            return 0
        # 取更深的那边，再加上自己这一层
        return max(self.depth(node.left), self.depth(node.right)) + 1
```

**为什么不够好？** 时间复杂度 O(n^2)，因为每个节点的深度计算会重复遍历子树。

### 第三步：优化解法 - 一次遍历

**关键洞察：** 在计算深度的同时，可以顺便计算直径。

**思路：**
- 定义 `dfs(node)` 返回以 node 为根的最大深度
- 在 `dfs` 中，先递归获取左右子树的深度
- 经过当前节点的直径 = left_depth + right_depth
- 更新全局最大值
- 返回当前节点的深度

```python
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        # 用实例属性保存全局最大直径，递归过程中随时更新
        self.ans = 0
        
        # dfs(node) 返回以 node 为根的子树高度（节点数）
        def dfs(node):
            # 空子树高度为 0，同时让下面的加法自动处理「只有一侧孩子」的情况
            if not node:
                return 0
            # 先拿到左右两边的高度，这一步是后序遍历的顺序
            left = dfs(node.left)
            right = dfs(node.right)
            # 经过当前节点的路径边数恰是左右高度之和，试着刷新答案
            self.ans = max(self.ans, left + right)
            # 但父节点只能沿一侧往下延伸，所以返回较高的那边再 +1
            return max(left, right) + 1
        
        dfs(root)
        return self.ans
```

---

## 完整代码实现

```python
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    """
    二叉树的直径 - 深度优先搜索

    核心思路：
    二叉树的直径 = 左子树的最大深度 + 右子树的最大深度
    对于每个节点，计算经过它的最长路径，然后在所有节点中取最大值。

    时间复杂度: O(n)
    空间复杂度: O(h)
    """
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        self.ans = 0

        def dfs(node: Optional[TreeNode]) -> int:
            if not node:
                return 0

            left_depth = dfs(node.left)
            right_depth = dfs(node.right)

            # 经过当前节点的直径
            self.ans = max(self.ans, left_depth + right_depth)

            return max(left_depth, right_depth) + 1

        dfs(root)
        return self.ans
```

---

## 示例推演

以示例 1 的树为例：
```
      1
     / \
    2   3
   / \
  4   5
```

**DFS 过程：**

| 节点 | 左深度 | 右深度 | 经过该节点的直径 | 当前最大直径 |
|------|--------|--------|-----------------|-------------|
| 4 | 0 | 0 | 0 | 0 |
| 5 | 0 | 0 | 0 | 0 |
| 2 | 1 | 1 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 |
| 1 | 2 | 1 | 3 | **3** |

**最终结果：** 3

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力 | O(n^2) | O(h) | 重复计算深度 |
| 一次遍历 | O(n) | O(h) | 每个节点只访问一次 |

**说明：**
- n 是树的节点数
- h 是树的高度，最坏情况下 h = n（链状树）

---

## 易错点总结

### 1. 直径的定义

**注意：** 直径是边的数量，不是节点的数量。

```
路径 [4,2,1,3] 有 3 条边：4-2, 2-1, 1-3
所以直径为 3，不是 4
```

### 2. 返回值的处理

```python
# 返回的是深度（节点数）
return max(left, right) + 1

# 但更新答案时用的是边数（深度之和）
self.ans = max(self.ans, left + right)
# 两者不能混用：返回值要往上传给父节点，答案只在当前节点结算一次
```

### 3. 空节点的处理

```python
if not node:
    return 0  # 空节点的深度为 0
# 不用 -1：这样叶子节点算出的 left + right 正好是 0，直径的边数直接成立
```

---

## 扩展思考

### 1. 如果需要返回具体的路径？

可以在 DFS 时记录每个节点的父节点，找到直径端点后回溯路径。

### 2. N 叉树的直径？

对于 N 叉树，直径 = 最大的两个子树深度之和。

### 3. 相关题目

- [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/) - 类似思路，但求路径和
- [687. 最长同值路径](https://leetcode.cn/problems/longest-univalue-path/) - 限制路径上的值相同
- [1522. N 叉树的直径](https://leetcode.cn/problems/diameter-of-n-ary-tree/)

---

## 相关题目

- [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)
- [687. 最长同值路径](https://leetcode.cn/problems/longest-univalue-path/)
- [1522. N 叉树的直径](https://leetcode.cn/problems/diameter-of-n-ary-tree/)
