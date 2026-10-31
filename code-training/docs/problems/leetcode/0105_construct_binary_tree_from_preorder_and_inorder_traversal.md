---
title: 105. 从前序与中序遍历序列构造二叉树
platform: LeetCode
difficulty: Medium
id: 105
url: https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/
tags:
  - 树
  - 递归
  - 数组
  - 二叉树
  - 哈希表
  - 分治
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/recursion.md
date_added: 2026-03-25
---

# 105. 从前序与中序遍历序列构造二叉树

## 题目描述

给定两个整数数组 `preorder` 和 `inorder` ，其中 `preorder` 是二叉树的**前序遍历**， `inorder` 是同一棵树的**中序遍历**，请构造二叉树并返回其根节点。

## 示例

**示例 1：**
```
输入: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
输出: [3,9,20,null,null,15,7]
```

**示例 2：**
```
输入: preorder = [-1], inorder = [-1]
输出: [-1]
```

---

## 解题思路

### 前序负责「谁当根」，中序负责「切在哪」

前序是「根 → 整个左子树 → 整个右子树」，所以 `preorder[0]` 一定是整棵树的根。中序是「左子树 → 根 → 右子树」，所以同一个根在 `inorder` 里的位置，正好把中序数组切成两段：左边全是左子树的节点，右边全是右子树的节点。

`inorder.index(root_val)` 拿到的这一个数字，同时是两个信息：

- 左子树有 `left_size` 个节点；
- 回到 `preorder`，根后面紧跟的 `left_size` 个元素就是左子树的前序，再往后才是右子树。

两个数组的切点由**同一个** `left_size` 对齐，切完之后的子问题与原问题完全同型（同样是「一对长度相等的前序 / 中序数组」），于是直接递归。递归能成立的全部理由就这一条：一次切分只需要「根在哪」，而这条信息在前序里是免费的（第一个元素）。

中序也不能省。只有前序时，「根之后哪几个属于左子树」没有任何依据 —— 889 题给的就是前序 + 后序，同一对数组可以对应好几棵不同的树，缺的正是中序这条分界线。

### 方法一：切片递归（把上面的切分直译成代码）

切分规则已经齐了，剩下就是照着写：取根、算 `left_size`、用两对切片递归、挂上左右孩子。

```python
from typing import List, Optional

class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:                       # 空子树
            return None

        root_val = preorder[0]                 # 前序第一个就是根
        left_size = inorder.index(root_val)    # 根在中序里的下标 = 左子树的节点数

        left = self.buildTree(preorder[1:1 + left_size], inorder[:left_size])
        right = self.buildTree(preorder[1 + left_size:], inorder[left_size + 1:])

        return TreeNode(root_val, left, right)
```

两处调用的四个切片对应上面那几句话：左子树是 `inorder[:left_size]` 配 `preorder[1:1 + left_size]`，右子树是 `inorder[left_size + 1:]` 配 `preorder[1 + left_size:]`。右子树的**前序**必须跳过整段左子树，从 `1 + left_size` 开始 —— 那个 `1 +` 就是这份代码唯一需要想的地方。

代价有三项：`inorder.index` 每层线性查找一次，合计 `O(n²)`；每个子问题都复制两个新列表，又一层 `O(n²)`；递归深度等于树高，题目给的 `n ≤ 3000` 一旦退化成链，Python 默认的 1000 层递归上限会先撞上。

### 方法二：位置表 + 前序游标（O(n)）

上一版的两处浪费可以分别去掉，互不牵连：

1. `inorder.index` 换成一张哈希表 `pos[值] = 中序下标`，建一次，之后每次 `O(1)`；
2. 不再切片，改成传「这段子问题在 `inorder` 里的区间 `[in_left, in_right]`」。`preorder` 那边**不需要**区间，因为递归的访问顺序恰好就是前序的顺序：先取根，再整个左子树，再整个右子树。于是一个只会前进的游标 `pre` 就够，每进入一次 `dfs` 就吃掉 `preorder[pre]`。

```python
from typing import List, Optional

class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        pos = {v: i for i, v in enumerate(inorder)}   # 值 -> 中序下标
        pre = 0                                       # 前序游标，只前进不回头

        def dfs(in_left: int, in_right: int) -> Optional[TreeNode]:
            nonlocal pre
            if in_left > in_right:      # 区间里没有节点
                return None

            root_val = preorder[pre]    # 游标处就是当前子树的根
            pre += 1
            root = TreeNode(root_val)

            mid = pos[root_val]         # 根在中序里的位置，把区间切成两半
            root.left = dfs(in_left, mid - 1)
            root.right = dfs(mid + 1, in_right)
            return root

        return dfs(0, len(inorder) - 1)
```

三个常数各有一个含义，改任何一个都会错：

- `in_left > in_right` 才是空区间。只有一个节点的子树，区间是 `[k, k]`，合法；它的两个孩子拿到 `[k, k-1]` 与 `[k+1, k]`，这时才空。
- 左孩子先于右孩子递归。`pre` 是按前序消费的，顺序颠倒会把左子树的节点安到右边。
- 子区间是 `[in_left, mid - 1]` 与 `[mid + 1, in_right]`：`mid` 那一格是根，两边都要把它排除。

### 方法三：迭代 + 显式栈（不依赖递归深度）

如果链状树的递归深度是实际风险，可以把递归栈换成显式栈。规则两条：能往左下走就一路往左下走；走不动时（栈顶的值正好等于中序游标 `j` 指向的值），连续弹栈直到对不上，**最后弹出来的那个节点**就是新节点的父亲，新节点接在它右边。

```python
from typing import List, Optional

class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None

        root = TreeNode(preorder[0])
        stack = [root]
        j = 0                                   # 中序里下一个还没被认领的下标

        for val in preorder[1:]:
            node = stack[-1]
            if node.val != inorder[j]:
                node.left = TreeNode(val)       # 根前面还有节点 -> 继续往左下
                stack.append(node.left)
            else:
                while stack and stack[-1].val == inorder[j]:
                    node = stack.pop()          # 左链到底，边弹栈边推进中序游标
                    j += 1
                node.right = TreeNode(val)      # 最后弹出的是父亲，新节点接它右边
                stack.append(node.right)

        return root
```

同样是 `O(n)`，栈里最多放一条「左链」，完全不占 Python 的递归栈。代价是可读性：`while` 那段的正确性不能靠直觉看出来，必须自己在纸上跑一遍。所以面试先写方法二，被追问递归深度再换这一版。

---

## 完整代码实现

下面这段是本题的基准实现（页面上的逐帧可视化回放的也是这一段）：切片 + 递归，结构与上面的推导一一对应，读代码就能看见「切在哪」。时间上它不如方法二，提交时用方法二那一版。

```python
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    """
    从前序与中序遍历序列构造二叉树 - 递归

    核心思想：
    前序遍历的第一个元素是根节点，在中序遍历中找到该根节点的位置，
    其左边是左子树，右边是右子树。然后递归构建左右子树。

    时间复杂度：O(n²)
    空间复杂度：O(n)
    """

    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None

        root_val = preorder[0]
        left_size = inorder.index(root_val)

        left = self.buildTree(preorder[1:1 + left_size], inorder[:left_size])
        right = self.buildTree(preorder[1 + left_size:], inorder[left_size + 1:])

        return TreeNode(root_val, left, right)
```

---

## 示例推演

以 `preorder = [3,9,20,15,7]`、`inorder = [9,3,15,20,7]` 为例，用方法二的游标版走一遍。调用顺序就是前序的顺序，所以表格的行按调用先后排列：

| 调用 | 中序区间 | 区间内容 | 取走的 `preorder[pre]` | `pre` 之后 | 根的下标 `mid` | 交给左右孩子的区间 |
|---|---|---|---|---|---|---|
| `dfs(0, 4)` | `[0, 4]` | `9 3 15 20 7` | 3 | 1 | 1 | 左 `[0, 0]`，右 `[2, 4]` |
| `dfs(0, 0)` | `[0, 0]` | `9` | 9 | 2 | 0 | 左 `[0, -1]` 空，右 `[1, 0]` 空 |
| `dfs(2, 4)` | `[2, 4]` | `15 20 7` | 20 | 3 | 3 | 左 `[2, 2]`，右 `[4, 4]` |
| `dfs(2, 2)` | `[2, 2]` | `15` | 15 | 4 | 2 | 左右都空 |
| `dfs(4, 4)` | `[4, 4]` | `7` | 7 | 5 | 4 | 左右都空 |

`dfs(2, 4)` 排在 `dfs(0, 0)` 之后被调用：整棵左子树先于右子树消费前序，这正是「游标只前进」能成立的原因。走到 `pre = 5 == len(preorder)` 时所有节点都已取完。

拼回树：3 的左孩子是 9、右孩子是 20；20 的左孩子是 15、右孩子是 7，层序即 `[3,9,20,null,null,15,7]`。

切片版在同一组数据上做的是同一件事，只是把「区间」换成了列表：`left_size = inorder.index(3) = 1`，左子树拿到 `preorder[1:2] = [9]` 与 `inorder[:1] = [9]`，右子树拿到 `preorder[2:] = [20,15,7]` 与 `inorder[2:] = [15,20,7]`。第二层的 20 在 `[15,20,7]` 里下标是 1，于是它的左子树是 `[15]`、右子树是 `[7]`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 切片递归 | O(n²) | O(n×h) | 每层 `inorder.index` 与切片各 O(n)；`h` 为树高 |
| 位置表 + 游标（最优） | O(n) | O(n) | 哈希表 O(n)，递归栈 O(h) |
| 迭代 + 显式栈 | O(n) | O(n) | 栈里最多一条左链，不占 Python 递归栈 |

> `n = len(preorder)`。链状树时 `h = n`，切片版的峰值内存退化到 `O(n²)`。

---

## 易错点总结

1. **切片版的右子树前序写成 `preorder[1:]`**（忘了 `+ left_size`）：左子树的节点被重复当成右子树的根，`buildTree(preorder[1:], inorder[left_size + 1:])` 里会出现「值不在中序数组中」。示例 1 直接抛 `ValueError: 9 is not in list`。
2. **游标版把 `root.left` 与 `root.right` 的递归顺序写反**：`pre` 是按「根 → 左 → 右」消费的，先递归右子树，紧跟根的那个左子树节点（示例 1 里的 `9`）就会被安到根的右边，`pre` 与中序区间从此错位。示例 1 的表现是 `IndexError: list index out of range` —— `pre` 最终跑过了 `len(preorder)`。
3. **游标版的空区间判断写成 `in_left >= in_right`**：单节点区间 `[k, k]` 被误判成空，叶子全部丢掉、`pre` 也不前进。示例 1 返回 `[3,null,9,null,20,15]`，示例 2 返回 `[]`。正确写法是 `in_left > in_right`。

---

## 扩展思考

- **106 中序 + 后序**：根在 `postorder` 的末尾，游标要从后往前，并且**先建右子树再建左子树** —— 后序倒着读就是「根 → 右 → 左」，与方法二正好镜像。
- **889 前序 + 后序为什么会有多解**：前序能定位根，后序也能定位根，但两边都拿不出「左子树在哪结束」的依据，所以分界可以落在任意位置。这从反面说明了方法二里 `pos` 那张表不是优化，而是必需信息。

---

## 相关题目

- [106. 从中序与后序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-inorder-and-postorder-traversal/)
- [889. 根据前序和后序遍历构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-postorder-traversal/)
