---
title: 二叉树
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-10-26
---

# 二叉树

## 一句话理解

**二叉树是「递归的教具」**：每个节点最多两个孩子，而**每棵子树本身还是一棵二叉树**——这个自相似性让几乎所有二叉树题都天然长成递归题。学二叉树学的一半是结构，另一半是「怎么把一个问题变成『处理左右子树 + 在根上合账』」。

树的一般概念（节点、深度、层数、森林）在[树](tree.md)一篇；本篇聚焦二叉树自己的东西。

## 性质公式（口算题，笔试客观题常用）

| 性质 | 公式 | 顺手记法 |
|------|------|---------|
| 第 i 层最多节点数 | 2^(i-1)（i 从 1 起） | 每层翻倍 |
| 高度 h 的树最多节点数 | 2^h − 1 | 全层满：1+2+4+…+2^(h-1) |
| 叶子数 vs 度 2 节点数 | n₀ = n₂ + 1 | 一叉补丁 |
| n 个节点的完全二叉树高度 | ⌊log₂n⌋ + 1 | 层数就是 log 往下取整 |
| 满二叉树用层数算节点 | 2^h − 1（h 层） | −1 是常识项 |

## 类型谱系（面试答「都有哪些二叉树」的模板）

```text
普通二叉树
├─ 满二叉树        每层都满（形状最饱满）
├─ 完全二叉树      只许最后一层缺右侧 —— 数组存储的根基（[堆](heap.md) 就是它）
├─ 二叉搜索树 BST  左 < 根 < 右 —— 查找O(log n)的排序结构
├─ 平衡二叉树 AVL  任意节点左右子树高差 ≤ 1 —— 防退化
└─ （工程延伸）红黑树：约平衡、增删改查综合更稳，C++ map / Java TreeMap 的底层
```

BST 与完全二叉树最容易混：完全二叉树说的是**形状**，BST 说的是**值的大小关系**，词根无关，两件事可以同时成立也可以都不成立。

## 遍历：四种小动作，一套递归心智

递归版是「一个递归三行」，先把三种顺序的唯一差别写清楚：

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def preorder(root):          # 前：根 → 左 → 右
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def inorder(root):           # 中：左 → 根 → 右（BST 里 = 升序序列！）
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def postorder(root):         # 后：左 → 右 → 根
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]
```

- 「前/中/后」说的是**根被访问的位置**——三个顺序只是这一行的摆放不同
- **中序遍历 BST 得到升序序列**是 BST 一切考点的基石（验证 BST、找第 k 小、两个 BST 合并全部挂在它上面）
- 遍历都 O(n)（每个节点摸一次），空间 O(h)（递归栈深 h，最坏 O(n) 链状树）

### 迭代版（颜色标记法，忘可能性最小）

```python
def inorder_iter(root):
    WHITE, GRAY = 0, 1
    stack = [(root, WHITE)]
    res = []
    while stack:
        node, color = stack.pop()
        if not node:
            continue
        if color == WHITE:
            # 中序：右、根、左 倒序入栈，出栈顺序即为 左、根、右
            stack.append((node.right, WHITE))
            stack.append((node, GRAY))
            stack.append((node.left, WHITE))
        else:
            res.append(node.val)
    return res
```

「第一次见到 → 拆开子问题压栈；第二次见到（灰色）→ 收答案」——把「防重访问」变成颜色标记，三种遍历只改三行入栈顺序，白板上不会写乱。

### 层序遍历（BFS，队列）

```python
from collections import deque

def levelOrder(root):
    if not root:
        return []
    q = deque([root])
    res = []
    while q:
        level = []
        for _ in range(len(q)):     # 关键一行：先固定本层的长度，再逐个弹
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

「for _ in range(len(q)) 先记下本层人数」这一行是**分层遍历**的锚点：刚进队列的正好是同一层的兄弟，这一行不写，层次信息就没了。Z 字形（103）只需在偶数层 `level.reverse()`；右视图（199）只收每层最后一个——都是同一个模板一步的变式（队列的重要性见[队列](queue.md)）。

## 递归的两条路（决定解题思路哪条对）

```python
def hasPathSum(root, targetSum):       # 自顶向下（前序）：把「目标」传下去
    if not root:
        return False
    if not root.left and not root.right:
        return targetSum == root.val   # 叶子处结算
    remain = targetSum - root.val
    return hasPathSum(root.left, remain) or hasPathSum(root.right, remain)

def maxDepth(root) -> int:             # 自底向上（后序）：把「结果」收上来
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))
```

`maxDepth` 这里用 `max` 而不是 `+`——树的「深度」是**取左右两条里较长的那条**，两边相加是「节点总数」，这一处量错就是 104 题的经典报错。

两条路怎么选：**答案在路径上或依赖传递的 → 自顶向下；答案需要「左右子树先各自结算、在节点处合账」的 → 自底向上（后序）**。「最大深度」「直径」[543] 「最大路径和」[124] 都是后序。「路径是否存在」「沿路径决定要不要继续」多是前序。

## 常考点一：验证 BST（98 题，一个陷阱考烂了）

```python
def isValidBST(root) -> bool:
    def check(node, lo, hi):
        if not node:
            return True
        if node.val <= lo or node.val >= hi:
            return False
        return check(node.left, lo, node.val) and check(node.right, node.val, hi)
    return check(root, float('-inf'), float('inf'))
```

**陷阱就是「只看孩子不看祖先」**：`[5, 4, 6, null, null, 3, 7]`——3 在右子树里，小 5 也是大 6，都是不合法的。判据必须沿祖先链传 `lo/hi` 上下界（或者中序遍历后检查严格递增）——树的问题十有八九是「你只看了相邻两层」。

## 常考点二：重建与 LCA

**重建**：前序 + 中序（105）能唯一确定一棵树，依据是——前序首元素是根，在中序里一切左边的属于左子树，切分两边递归：

```python
def buildTree(preorder, inorder):
    if not preorder:
        return None
    root = TreeNode(preorder[0])
    idx = inorder.index(preorder[0])     # O(n) 找根；量大可用哈希表加速
    root.left = buildTree(preorder[1:idx+1], inorder[:idx])
    root.right = buildTree(preorder[idx+1:], inorder[idx+1:])
    return root
```

切片版简洁但每层都在新建列表，总复杂度 O(n²)——面试被追问「能更快吗」时，答「用下标穿范围、哈希表定位根」就升级为 O(n)。

**最近公共祖先（236）**的后序合账，是「自底向上」的最佳示例：

```python
def lowestCommonAncestor(root, p, q):
    if not root or root is p or root is q:
        return root
    l, r = lowestCommonAncestor(root.left, p, q), lowestCommonAncestor(root.right, p, q)
    if l and r:
        return root          # p、q 分居两侧 → 当前节点就是 LCA
    return l or r
```

## 常考点三：对称 / 翻转 / 相同

- **翻转二叉树（226）**：`root.left, root.right = invert(right), invert(left)` 一句经典的递归
- **对称二叉树（101）**：判断两个树「左右互镜像」——递归调用的**参数不是同一颗树的两个节点**，而是「left.left vs right.right」「left.right vs right.left」
- **相同的树（100）**：三个判空 + 值相等 + 左左/右右递归

## 与堆、BST 的位置关系

- **完全二叉树 → 堆**：形状使得数组存得下（[堆](heap.md)），父不被要求与左右的大小关系必须只在父子之间（兄弟无序）
- **BST → 有序集合**：增删查 O(log n)，平衡后（AVL/红黑）不用怕退化

## 易错点总结

- 「下一层节点最多几个」直接 2^i 粗算，忘了 i 从 1 起的口径
- 判 BST 只跟直接孩子比，忘祖先的上下界（98 题必炸）
- 层序遍历忘「先记 len(q) 再逐个弹」，层次信息全部丢失
- maxDepth 用 `+` 把左右深度相加，得到的是节点总数
- 递归终止只写 `if not node: return` 不写累积结算——每题必须明确「叶子处怎么结算 / 空节点返回什么」
- 重建用 `list.index` 每层 O(n) 找根，铸成 O(n²)——大规模数据用哈希表存值到下标的映射
- 递归深了 RecursionError：树高 1000 层话递归崩，用迭代遍历或 `sys.setrecursionlimit` 临时抬高

## 相关题目

- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [101. 对称二叉树](../problems/leetcode/0101_symmetric_tree.md) / [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)

## 相关知识点

- [树](tree.md)——一般树、N 叉树与遍历的迭代化
- [堆](heap.md)——完全二叉树的一个最佳日常
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐步看
前 / 中 / 后序遍历每一步走到哪个节点。递归深度的变化也画在画面里。