---
title: 101. 对称二叉树
platform: LeetCode
difficulty: Easy
id: 101
url: https://leetcode.cn/problems/symmetric-tree/
tags:
  - 树
  - 递归
  - 二叉树
  - 深度优先搜索
  - 广度优先搜索
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
  - ../../patterns/recursion.md
date_added: 2026-03-25
---

# 101. 对称二叉树

## 题目描述

给你一个二叉树的根节点 `root`，检查它是否轴对称。

## 示例

**示例 1：**
```
输入：root = [1,2,2,3,4,4,3]
输出：true
```

**示例 2：**
```
输入：root = [1,2,2,null,3,null,3]
输出：false
```

---

## 解题思路

### 「对称」比的是两棵子树互相镜像，不是两棵子树长得一样

对称轴穿过根节点，所以根自己不用参与比较，要比的是 `root.left` 和 `root.right`。但「比」的标准不是「相同」：

示例 2 的 `[1,2,2,null,3,null,3]`，左右两棵子树**结构完全相同**（都是「值 2 的节点 + 一个右孩子 3」），可整棵树并不对称 —— 左边那棵的 3 在右侧，右边那棵的 3 也在右侧，镜像之后应该一左一右才对。

所以要比的是**镜像**。镜像关系 `mirror(p, q)` 的定义是递归的：

```text
mirror(p, q):
    p、q 都为空            -> True
    p、q 只有一个为空       -> False
    p.val != q.val         -> False
    否则                   -> mirror(p.left, q.right) 且 mirror(p.right, q.left)
```

最后一行就是本题的全部：**`p` 的左边对 `q` 的右边**。和 100 题「相同的树」只差这一次参数交叉 —— `same(p, q)` 比的是 `p.left, q.left`，`mirror(p, q)` 比的是 `p.left, q.right`。

### 为什么不能「中序遍历一下看是不是回文」

一个常见的捷径想法：对称树的中序遍历回文，那就判回文。这**必要但不充分** —— 中序只保留了「值从左到右的排列」，把「这个节点挂在左还是右」的形状信息丢掉了。反例 `[1,2,2,2,null,2,null]`：

```text
        1
       / \
      2   2
     /   /
    2   2
```

中序是 `[2,2,1,2,2]`，回文；但这棵树不对称 —— 左子树的 2 挂在左边，右子树的 2 也挂在左边，镜像之后应该挂在右边。所以只能按 `mirror` 的定义老老实实递归。

### 写法一：递归（把镜像关系直接写出来）

```python
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        def mirror(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
            # 两个都空 -> 这一对是镜像；只有一个空 -> 不是
            if p is None or q is None:
                return p is q
            return (
                p.val == q.val
                and mirror(p.left, q.right)    # 外侧对内侧
                and mirror(p.right, q.left)    # 内侧对外侧
            )

        return mirror(root.left, root.right)
```

`return p is q` 一行同时覆盖了两种情况：只有两边引用同一个 `None` 时 `is` 才为 `True`，于是「都空」放行、「一空一非空」挡掉。

下面「完整代码实现」里那个辅助函数叫 `isSameTree`（从 100 题借来的名字），但它比较的正是上面这套镜像关系，别有「它在判断两棵树同构」的错觉。

### 写法二：用队列把「待比较的节点对」逐个取出来

递归是在一棵树上做深度优先，也可以改成把**成对的节点**压进队列，一次取一对来验：值不同就返回 False，否则把 `(p.left, q.right)` 和 `(p.right, q.left)` 这两对再压进去。取空了还没出事就是对称的。

```python
from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        queue = deque([(root.left, root.right)])
        while queue:
            p, q = queue.popleft()
            if p is None and q is None:
                continue
            if p is None or q is None or p.val != q.val:
                return False
            queue.append((p.left, q.right))
            queue.append((p.right, q.left))
        return True
```

两种写法的取舍是真实的：

- 递归版只有几行，空间是调用栈的深度 `O(h)`。**对称树的 `h` 可以很大** —— 左右各是一条长链互相镜像，`h` 能到 `n/2` 左右。`n ≤ 1000` 时约 500 层，离 Python 默认的 1000 层还够用；约束再放大一个数量级就得换迭代。
- 迭代版把栈换成显式队列，深度不再受限制，但队列里最坏会同时存一整层的节点对，空间 `O(w)`，代码也长一倍。

面试里先写递归（短、好验证），被追问「树很深怎么办」再换成队列，是最常见的答法。

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
    对称二叉树 - 递归

    核心思想：
    二叉树对称的条件是根节点的左右子树镜像对称。

    判断镜像对称：
    - 两个根节点的值相等
    - 左子树的左子树 == 右子树的右子树
    - 左子树的右子树 == 右子树的左子树

    时间复杂度：O(n)
    空间复杂度：O(h)，h 是树的高度
    """

    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if p is None or q is None:
            return p is q
        return p.val == q.val and self.isSameTree(p.left, q.right) and self.isSameTree(p.right, q.left)

    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        return self.isSameTree(root.left, root.right)
```

---

## 示例推演

### 示例 1：`root = [1,2,2,3,4,4,3]` → `true`

```text
        1
       / \
      2   2
     / \ / \
    3  4 4  3
```

从根的两棵子树开始递归，每往下一层都把左右交叉：

| 比较的一对 `(p, q)` | 来自哪里 | 值 | 结论 |
|---|---|---|---|
| `(2, 2)` | `(root.left, root.right)` | 相等 | 继续 |
| `(3, 3)` | `(p.left, q.right)` | 相等 | 继续 |
| `(None, None)` ×2 | 两个 3 的孩子 | 都空 | True |
| `(4, 4)` | `(p.right, q.left)` | 相等 | 继续 |
| `(None, None)` ×2 | 两个 4 的孩子 | 都空 | True |

所有分支都是 True，整棵树对称。

### 示例 2：`root = [1,2,2,null,3,null,3]` → `false`

```text
        1
       / \
      2   2
       \   \
        3   3
```

| 比较的一对 `(p, q)` | 来自哪里 | 值 | 结论 |
|---|---|---|---|
| `(2, 2)` | `(root.left, root.right)` | 相等 | 继续 |
| `(None, 3)` | `(p.left, q.right)` | 一个空一个非空 | **False** |

两个 3 都挂在各自父节点的右边，镜像之后它们在整棵树里的位置也都在右边，所以外层那对 `(None, 3)` 立刻不等 —— `and` 短路，直接返回 `false`，`(p.right, q.left)` 那一支根本不用看。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 递归镜像（最优） | O(n) | O(h) | 每个节点最多被比较一次；栈深度为树高，对称树最坏约 n/2 |
| 迭代（队列存节点对） | O(n) | O(w) | `w` 为最大层宽，完全二叉树最坏 O(n) |

> 两种写法都只走一遍树，`n` 为节点数、`h` 为树高、`w` 为最大层宽。空间上递归版取 `h`、迭代版取 `w`，没有哪个在所有形状下都更好。

---

## 易错点总结

1. **两处递归的参数没有交叉**：写成 `isSameTree(p.left, q.left)` 与 `isSameTree(p.right, q.right)`，就退化成「判断两棵子树是否同构」，示例 2 会返回 `true`。要改的是这两处调用的第二个参数：`q.right`、`q.left`。
2. **空节点判断写成两个独立的 `if p is None: return True` / `if q is None: return True`**：这样「一边空一边非空」会被当成镜像放行，示例 2 同样返回 `true`。必须合成一处 `return p is q`，让「都空」和「只空一个」分开。
3. **迭代版忘了跳过「两边都空」**：只写 `if p is None or q is None: return False`，遇到两个叶子（都是空）时会把对称的树判成 `false`，示例 1 直接挂。

---

## 相关题目

- [100. 相同的树](https://leetcode.cn/problems/same-tree/)
- [572. 另一棵树的子树](https://leetcode.cn/problems/subtree-of-another-tree/)
