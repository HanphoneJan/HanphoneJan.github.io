---
title: 二叉树
category: 数据结构
parent_topic: tree.md
difficulty_range: [简单, 困难]
last_updated: 2026-03-23
---

# 二叉树

## 知识点概述

二叉树是每个节点最多有两个子节点的树结构，是最常见的树形结构。

**二叉树**（Binary tree）是每个节点最多只有两个分支（即不存在分支度大于 2 的节点）的树结构。二叉树的分支具有左右次序，不能随意颠倒。

### 节点定义

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

```cpp
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};
```

## 二叉树类型

### 1. 满二叉树

每层节点都达到最大值，深度为 k 的满二叉树有 2^k - 1 个节点。

除最后一层节点外，其他所有节点都有两个子结点，必定是完全二叉树。

### 2. 完全二叉树

除最后一层外，若其余层都是满的，并且最后一层是满的或者是在右边缺少连续若干节点，则这个二叉树就是**完全二叉树**。

简单来说：除最后一层外，其他层的节点数都达到最大，最后一层的节点都靠左排列（或满的）。

**当根节点的值为 1 的情况下，若父结点的序号是 i，那么左子节点的序号就是 2i，右子节点的序号是 2i+1。这个性质使得完全二叉树利用数组存储时可以极大地节省空间，以及利用序号找到某个节点的父结点和子节点。**

![完全二叉树示例图1.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/datastructure/%E5%AE%8C%E5%85%A8%E4%BA%8C%E5%8F%89%E6%A0%91%E7%A4%BA%E4%BE%8B%E5%9B%BE1.webp)

![完全二叉树的顺序存储示例图.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/datastructure/%E5%AE%8C%E5%85%A8%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E9%A1%BA%E5%BA%8F%E5%AD%98%E5%82%A8%E7%A4%BA%E4%BE%8B%E5%9B%BE.webp)

### 3. 二叉搜索树（BST）

- 左子树所有节点值 < 根节点值
- 右子树所有节点值 > 根节点值
- 左右子树也都是 BST

### 4. 平衡二叉树

任意节点的左右子树高度差不超过 1。

包括AVL树和红黑树。

## 常见操作

### 遍历模板

参考 [树](tree.md) 的遍历方法。

### 层序遍历（BFS）

```python
from collections import deque

def levelOrder(root):
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level_size = len(queue)
        current_level = []

        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)

            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        result.append(current_level)

    return result
```

## 常见题型

### 1. 递归遍历

- 前序、中序、后序遍历
- 树的深度和高度

### 2. 层序遍历

- BFS 遍历
- 右视图
- 之字形遍历

**相关题目：**
- 二叉树的层序遍历
- 二叉树的右视图
- 二叉树的锯齿形层序遍历

### 3. 路径问题

- 路径和
- 最长路径
- 路径是否存在

### 4. 构造与修改

- 翻转二叉树
- 从遍历序列构造
- 合并二叉树

## 解题技巧

### 技巧 1：递归模板

```python
def traverse(root):
    # 1. 终止条件
    if not root:
        return

    # 2. 处理当前节点（前序位置）
    process(root)

    # 3. 递归左子树
    traverse(root.left)

    # 4. 处理当前节点（中序位置）
    process(root)

    # 5. 递归右子树
    traverse(root.right)

    # 6. 处理当前节点（后序位置）
    process(root)
```

### 技巧 2：层序遍历模板

使用队列，记录每层大小。

### 技巧 3：路径问题

使用回溯 + DFS。

## DFS 的两种思路

### 自顶向下 DFS（先序遍历）

在「递」的过程中维护值，从根节点向下传递信息。

```python
# 判断是否存在根到叶的路径和为 targetSum（自顶向下：沿路径累减目标值）
def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
    if not root:
        return False
    # 叶子节点：判断当前累计值是否正好匹配
    if not root.left and not root.right:
        return root.val == targetSum
    # 向下传递 targetSum - root.val（自顶向下传递信息）
    return (self.hasPathSum(root.left, targetSum - root.val) or
            self.hasPathSum(root.right, targetSum - root.val))
```

### 自底向上 DFS（后序遍历）

在「归」的过程中计算，先递归处理子节点，再处理当前节点。

```python
# 求二叉树最大深度（自底向上：先求左右子树深度，再合并 +1）
# 注意用 max 而非 +：+ 会把左右子树深度相加，得到的是"路径节点总数"
def maxDepth(self, root: Optional[TreeNode]) -> int:
    if not root:
        return 0
    return max(self.maxDepth(root.left), self.maxDepth(root.right)) + 1

# 合并二叉树
def mergeTrees(self, root1: Optional[TreeNode], root2: Optional[TreeNode]) -> Optional[TreeNode]:
    if root1 is None:
        return root2
    if root2 is None:
        return root1
    return TreeNode(
        root1.val + root2.val,
        self.mergeTrees(root1.left, root2.left),
        self.mergeTrees(root1.right, root2.right)
    )
```

## 二叉搜索树（BST）

### 性质

- 节点的左子树仅包含键**小于**节点键的节点
- 节点的右子树仅包含键**大于**节点键的节点
- 左右子树也必须是二叉搜索树

**平衡的二叉搜索树插入、查找的时间复杂度都是 O(logn)**

### 常见考点

- 中序遍历有序性
- 插入与删除
- 验证与构建

### 验证 BST

```python
def isValidBST(self, root: Optional[TreeNode], left=float('-inf'), right=float('inf')) -> bool:
    if root is None:
        return True
    x = root.val
    return left < x < right and \
           self.isValidBST(root.left, left, x) and \
           self.isValidBST(root.right, x, right)
```

### BST 转累加树

遍历顺序：**右 → 根 → 左**（降序遍历）

```python
def convertBST(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
    s = 0
    def dfs(node: TreeNode) -> None:
        if node is None:
            return
        dfs(node.right)  # 先遍历右子树
        nonlocal s
        s += node.val
        node.val = s
        dfs(node.left)
    dfs(root)
    return root
```

### 有序数组转平衡 BST

**关键**：BST 中序遍历后变成升序数组！

```python
def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
    def dfs(left, right):
        if left > right:
            return None
        mid = left + (right - left) // 2
        root = TreeNode(nums[mid])
        root.left = dfs(left, mid - 1)
        root.right = dfs(mid + 1, right)
        return root
    return dfs(0, len(nums) - 1)
```

## 二叉树与链表

### 二叉树展开为链表

```python
def flatten(self, root: TreeNode) -> None:
    """将二叉树原地展开为链表（Morris 风格，O(1) 额外空间）
    核心：每遇到有左子树的节点，把当前右子树接到左子树的最右节点下"""
    curr = root
    while curr:
        if curr.left:
            # 找到左子树的最右节点（左子树中最后一个被访问的节点）
            predecessor = curr.left
            while predecessor.right:
                predecessor = predecessor.right
            # 将右子树接到左子树最右节点的右侧
            predecessor.right = curr.right
            # 左子树整体移到右边，置空左指针
            curr.right = curr.left
            curr.left = None
        curr = curr.right
```

## 相关知识点

- [树](tree.md)
- [BFS 模式](../patterns/bfs.md)
- [DFS 模式](../patterns/dfs.md)
- [BFS 模板](../templates/bfs_template.md)
- [DFS 模板](../templates/dfs_template.md)

## 题目列表

**简单：**
- 二叉树的前序遍历 / 中序遍历 / 后序遍历
- 二叉树的最大深度
- 翻转二叉树

**中等：**
- 验证二叉搜索树
- 二叉树的最近公共祖先
- 从前序与中序遍历序列构造二叉树

**困难：**
- 二叉树中的最大路径和
- 二叉树的序列化与反序列化

## 重点提示

- 理解递归的本质：处理当前节点 + 递归子问题
- 区分前中后序的处理时机
- 层序遍历一定用 BFS（队列）
- 深度优先用 DFS（递归或栈）
