---
title: 104. 二叉树的最大深度
platform: LeetCode
difficulty: Easy
id: 104
url: https://leetcode.cn/problems/maximum-depth-of-binary-tree/
tags:
  - 树
  - 递归
  - 深度优先搜索
  - 二叉树
  - 广度优先搜索
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
  - ../../patterns/recursion.md
date_added: 2026-03-25
---

# 104. 二叉树的最大深度

## 题目描述

给定一个二叉树，找出其最大深度。

二叉树的深度为根节点到最远叶子节点的最长路径上的节点数。

**说明**：叶子节点是指没有子节点的节点。

## 示例

**示例 1：**
```
输入：root = [3,9,20,null,null,15,7]
输出：3
```

**示例 2：**
```
输入：root = [1,null,2]
输出：2
```

---

## 解题思路

### 深度是递归定义的

一个空树的深度是 0；非空树的深度是「左子树深度」和「右子树深度」里较大的那个，再加上根节点自己这一层：

```text
depth(root) = 0                                      root 为空
depth(root) = max(depth(root.left), depth(root.right)) + 1   否则
```

这个定义直接就是递归：想求整棵树，先求两棵子树；子树又用同样的规则继续分。每个节点只会被访问一次，所以不需要记忆化，也不存在「重复子问题」。

### 写法一：深度优先（递归）

```python
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        # 空树没有层，深度为 0
        if root is None:
            return 0
        # 左右子树各算一次，取较大的，再加上根节点这一层
        return max(self.maxDepth(root.left), self.maxDepth(root.right)) + 1
```

递归的调用栈深度等于树高 `h`。树接近平衡时 `h = O(log n)`，退化成一条链时 `h = O(n)`。

### 写法二：广度优先（按层遍历）

换一个角度：最大深度就是「一共有多少层」。用队列把当前层的节点全部取出来，再把它们的子节点放进去，每处理完一层，深度加 1：

```python
from collections import deque
from typing import Optional

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if root is None:
            return 0

        q = deque([root])
        depth = 0

        while q:
            # 先记下当前层的节点数，循环里新加入的子节点不能被算进这一层
            for _ in range(len(q)):
                node = q.popleft()
                if node.left:
                    q.append(node.left)
                if node.right:
                    q.append(node.right)
            depth += 1

        return depth
```

两种写法都是 `O(n)` 时间，区别在额外空间：

- DFS 的栈深度是树高 `h`，平衡树 `O(log n)`，链状树 `O(n)`；
- BFS 的队列里最多放一整层，最坏是 `O(n)`（完全二叉树的最后一层）。

这道题两种都可以。若题目还要求「按层输出」或「找每层最右边的节点」，BFS 的按层结构更顺手；若只是求深度，递归最短。

---

## 完整代码实现

```python
from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        """深度优先：空树为 0，否则左右子树取较大者加 1。"""
        if root is None:
            return 0
        return max(self.maxDepth(root.left), self.maxDepth(root.right)) + 1

    def maxDepthBFS(self, root: Optional[TreeNode]) -> int:
        """广度优先：每处理完一层，深度加 1。"""
        if root is None:
            return 0

        q = deque([root])
        depth = 0
        while q:
            for _ in range(len(q)):
                node = q.popleft()
                if node.left:
                    q.append(node.left)
                if node.right:
                    q.append(node.right)
            depth += 1

        return depth
```

---

## 示例推演

以 `root = [3,9,20,null,null,15,7]` 为例：

```text
        3
       / \
      9  20
         / \
        15  7
```

递归从叶子往上报：

| 节点 | 左子树深度 | 右子树深度 | 返回 |
|---|---|---|---|
| 9 | 0 | 0 | `max(0, 0) + 1 = 1` |
| 15 | 0 | 0 | 1 |
| 7 | 0 | 0 | 1 |
| 20 | 1（15） | 1（7） | `max(1, 1) + 1 = 2` |
| 3 | 1（9） | 2（20） | `max(1, 2) + 1 = 3` |

答案是 3。

BFS 的过程则是：

| 轮次 | 队列中的节点 | 出队后深度 |
|---|---|---|
| 1 | `[3]` | 1 |
| 2 | `[9, 20]` | 2 |
| 3 | `[15, 7]` | 3 |
| 4 | `[]` | 循环结束 |

同样得到 3。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 深度优先（递归） | O(n) | O(h) | `h` 为树高，平衡树 O(log n)，链状树 O(n) |
| 广度优先（队列） | O(n) | O(w) | `w` 为最大层宽，最坏 O(n) |

> 两种写法每个节点都只进出一次，时间都是 `O(n)`。

---

## 易错点总结

1. **漏掉空树判断**：`if root is None: return 0` 不写，访问 `root.left` 时直接 `AttributeError`；空树本身也是合法输入。
2. **BFS 没有按层截断队列**：内层写成 `while q:` 而不是 `for _ in range(len(q))`，会把子节点混进当前层，深度统计偏大。必须在每轮开始时用 `len(q)` 固定本层节点数。
3. **把深度当成边数**：题目数的是节点数，单节点树的深度是 1 而不是 0，所以递归返回时要 `+1`，BFS 每层也要 `depth += 1`。

---

## 扩展思考

- **最小深度（111 题）不能照搬**：如果一个节点只有一个孩子，不能把空的那边当成深度 0 直接取 `min`，否则会得到 1。需要区分「叶子」和「只有一个孩子的节点」。
- **N 叉树**：把 `max(left, right)` 换成对所有孩子取 `max`，其余不变。
- **链状树的递归风险**：节点数到 `10^4` 且树退化成链时，Python 默认递归深度可能不够；这种约束下改用 BFS 或显式栈更稳。

---

## 相关题目

- [111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/)
- [559. N 叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-n-ary-tree/)
