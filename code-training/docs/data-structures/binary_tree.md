---
title: 二叉树
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-10-27
---

# 二叉树

## 定义与自相似性

二叉树（binary tree）是每个节点至多两个孩子（left、right）的树形结构。它最重要的性质是**自相似**：以任何一个非空节点为根的整体，本身又是一棵二叉树。「整棵树的问题」与「左子树的问题 + 右子树的问题 + 根上的处理」之间存在直接联系，这使二叉树成为一种**递归定义**的结构，也使几乎全部二叉树题天然以递归形式求解。

树的一般术语（深度、高度、层、度）在[树](tree.md)一篇；本篇聚焦二叉树特有的事。

## 节点定义

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

## 类型谱系

```text
普通二叉树
├─ 满二叉树        每层都满
├─ 完全二叉树      只允许最后一层缺右侧 —— 数组存储的根基（[堆](heap.md) 的形状）
├─ 二叉搜索树 BST  左 < 根 < 右 —— 查找 O(log n) 的有序结构
├─ 平衡二叉树 AVL  任意节点左右子树高差 ≤ 1 —— 防退化
└─ （工程延伸）红黑树：近似平衡，增删查改综合更稳，C++ map / Java TreeMap 的底层
```

**完全二叉树与 BST 易混但词根无关**：前者描述**形状**（能否填满数组），后者描述**值的大小关系**。二者可以同时成立，也可以都不成立。

形状与数量关系（客观题所考）：

| 性质 | 公式 |
|------|------|
| 第 i 层最多节点数（i 从 1 起） | 2^(i−1) |
| 高度 h 的树最多节点数 | 2^h − 1 |
| 叶子数与度为 2 的节点数 | n₀ = n₂ + 1 |
| n 节点完全二叉树的高度 | ⌊log₂n⌋ + 1 |

## 遍历：前行顺序 + 访问方式的组合

递归版每一种都是三行：

```python
def preorder(root):          # 前：根 → 左 → 右
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def inorder(root):           # 中：左 → 根 → 右（BST 中 = 升序序列）
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def postorder(root):         # 后：左 → 右 → 根
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]
```

「前 / 中 / 后」说的是**根被访问的位置**；三个版本只差这一行的放置。复杂度都是 O(n)（每节点恰好访问一次）、空间 O(h)（递归栈深，最坏 O(n)、链状树；BST 平衡时 O(log n)）。

**中序遍历 BST 得到升序序列**是 BST 全部考点的基石：验证 BST、找第 k 小、两 BST 合并都建立在这条性质上。**中序遍历一般二叉树无此性质**，不要外推。

### 迭代遍历：颜色标记法

想改写为迭代（避免 `RecursionError`）时，把「节点第一次见到 → 拆子问题压栈；第二次见到 → 取值入答案」分开。每个节点压栈时带一个颜色/序号字段：

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
            # 中序最终访问顺序是 左→根→右，故按倒序入栈：右、根(灰)、左
            stack.append((node.right, WHITE))
            stack.append((node, GRAY))
            stack.append((node.left, WHITE))
        else:
            res.append(node.val)
    return res
```

三种遍历只改那三行的入栈顺序，正文公式不变——写白板时不易乱。

### 层序遍历：queue 计本层人数

```python
from collections import deque

def levelOrder(root):
    if not root:
        return []
    q = deque([root])
    res = []
    while q:
        level = []
        for _ in range(len(q)):     # 先记下本层人数，再逐个弹出：分层的关键一行
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

每个节点恰好一层、队列长度恰为本层人数，`len(q)` 是分层的唯一锚。Z 字形（103）在偶数层 `level.reverse()`；右视图（199）只取每层最后一个——都是同模板的一步变式。

## 递归的两条走向

### 自顶向下（前序）：目标沿路径下行

```python
def hasPathSum(root, targetSum):
    if not root:
        return False
    if not root.left and not root.right:
        return targetSum == root.val   # 叶子处结算
    remain = targetSum - root.val
    return hasPathSum(root.left, remain) or hasPathSum(root.right, remain)
```

### 自底向上（后序）：左右先结算、在节点处合并

```python
def maxDepth(root) -> int:
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))
```

「深度」是 max（取左右更深的一条）而不是求和；写 `+` 是把问题改成了节点计数，是 104 题的经典失误。

**选路依据**：答案出现在路径上、或沿路径带量下行 → 前序；答案需要「左右子树先算好，再在节点处合并」 → 后序。最大深度（104）、直径（543）、最大路径和（124）、LCA（236）都是后序；路径存在性、沿路径决策多是前序。

## 题型一：验证 BST（98 题的经典陷阱）

BST 的定义约束的是整棵子树对该节点的关系，不只是父子两处。判据要**沿祖先链传 lo/hi 上下界**：

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

经典反例 `[5, 4, 6, null, null, 3, 7]`：3 同时是 5 的后代与 6 的后代——只做「孩子与父亲比」的判断必然漏。另一等价写法是中序遍历后验证严格递增（依据中序性质，与上文相接）。

## 题型二：重建与 LCA

从**前序 + 中序**重建（105）：前序首个元素是根，正中序里 root 以前属于左子树、以后属于右子树，两部分各自递归：

```python
def buildTree(preorder, inorder):
    if not preorder:
        return None
    root = TreeNode(preorder[0])
    idx = inorder.index(preorder[0])
    root.left = buildTree(preorder[1:idx+1], inorder[:idx])
    root.right = buildTree(preorder[idx+1:], inorder[idx+1:])
    return root
```

**前序+中序能唯一确定；前序+后序不能**（两个孩子都缺时对应两棵树）。切片版每层做 O(n) 的搬移与 `index`，总复杂度 O(n²)；面试追问时升级方向是「下标穿范围 + 哈希表存值→下标」，把每层定位做 O(1)。

最近公共祖先（236）的后序合账：

```python
def lowestCommonAncestor(root, p, q):
    if not root or root is p or root is q:
        return root
    l = lowestCommonAncestor(root.left, p, q)
    r = lowestCommonAncestor(root.right, p, q)
    if l and r:
        return root          # p、q 分居两侧 → 当前节点即 LCA
    return l or r
```

## 题型三：对称 / 翻转 / 相同

- 翻转二叉树（226）：`root.left, root.right = invert(root.right), invert(root.left)`
- 对称二叉树（101）：递归的参数是「左.left ↔ 右.right」「左.right ↔ 右.left」这一对镜像，不是同一棵树的两个节点
- 相同的树（100）：判空 + 值相等 + 左左/右右递归

## 易错点总结

- 层序遍历忘了 `len(q)` 先记本层人数，层次信息丢失
- 自底向上把「max」写成「+」，得到节点总数而非深度
- 验证 BST 只比较父子，缺祖先链上下界（98 题被出成经典误导的原图即在此）
- 递归终止只写 `return None` / `return 0`，未明确「空节点的返回值与叶子结算点怎么定」——每题草稿上先答这两问
- 重建用 `list.index` 每层 O(n)，整体变 O(n²)；大规模输入改哈希表存值→下标
- 深树（>1000 层）在 Python 抛 `RecursionError`；工程做法不是抬高 `setrecursionlimit`，而是改用上面那套迭代遍历

## 相关题目

- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [101. 对称二叉树](../problems/leetcode/0101_symmetric_tree.md) / [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)

## 相关知识点

- [树](tree.md)——一般树、N 叉树、Trie
- [堆](heap.md)——完全二叉树形状的唯一常见用法
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐帧观察
前 / 中 / 后序遍历每一步走到哪个节点，递归深度的变化直接画在画面里。
