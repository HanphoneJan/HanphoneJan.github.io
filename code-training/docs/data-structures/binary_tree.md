---
title: 二叉树
sidebar_position: 8
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-11-19
---

# 二叉树

## 定义与自相似性

二叉树（binary tree）是每个节点至多两个孩子（left、right）的树形结构。它最重要的性质是**自相似**：以任何一个非空节点为根的整体，本身又是一棵二叉树。「整棵树的问题」与「左子树的问题 + 右子树的问题 + 根上的处理」之间存在直接联系，这使二叉树成为一种**递归定义**的结构，也使几乎全部二叉树题天然以递归形式求解。

树的一般术语（深度、高度、层、度）在[树](tree.md)一篇；本篇聚焦二叉树特有的事。

## 节点定义

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val          # ① 存的值
        self.left = left        # ② 左孩子；没有就是 None
        self.right = right      # ③ 右孩子
```

## 结构剖面

二叉树的结构只有三个字段：`val`、`left`、`right`。真正难的不是形状，而是**同一棵树可以有四种读法**。

![差别只在「什么时候读根」](/diagrams/binary-tree-traversal.png)

前/中/后序的区别只在「什么时候读根」：进节点就读是前序，读完左子树再读是中序，两个孩子都读完才读是后序——它们共用同一个递归骨架，靠隐式调用栈记住回来的路。层序换成显式队列，先进先出决定了「一层一层」的顺序。

顺序不是随意的：中序能把 BST 读成升序（左 < 根 < 右），前序 + 中序能重建整棵树，这两条性质都直接来自图上那套编号。

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

AVL 的四种旋转、红黑树的五条性质、以及磁盘上的 B 树 / B+ 树，都在[树](tree.md)的「查找树家族」一节——那一节回答「为什么要平衡」，本篇只用到它们「高度是 O(log n)」这个结论。

形状与数量关系（客观题所考，**h 一律指层数**）：

| 性质 | 公式 |
|------|------|
| 第 i 层最多节点数（i 从 1 起） | 2^(i−1) |
| 层数为 h 的树最多节点数 | 2^h − 1 |
| 叶子数与度为 2 的节点数 | n₀ = n₂ + 1 |
| n 节点完全二叉树的层数 | ⌊log₂n⌋ + 1 |
| n 节点完全二叉树的高度（边数） | ⌊log₂n⌋ |

最后两行是同一个量的两种口径：**层数 = 高度 + 1**。本篇后面说「高度」一律按边数（叶为 0），与[树](tree.md)一致。

## 遍历：访问顺序 + 访问方式的组合

### 递归：三种顺序只差一行

```python
def preorder(root):
    """前序：根 → 左 → 右。O(n)"""
    if not root:
        return []                                    # ① 空节点是递归的底
    return [root.val] + preorder(root.left) + preorder(root.right)   # ② 根的读取在最前

def inorder(root):
    """中序：左 → 根 → 右。BST 上得到升序序列"""
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)     # ① 根的读取在中间

def postorder(root):
    """后序：左 → 右 → 根"""
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val] # ① 根的读取在最后
```

「前 / 中 / 后」说的是**根被访问的位置**；三个版本只差这一行的放置。复杂度都是 O(n)（每节点恰好访问一次）、空间 O(h)（递归栈深，最坏 O(n)、链状树；平衡时 O(log n)）。

**中序遍历 BST 得到升序序列**是 BST 全部考点的基石：验证 BST、找第 k 小、两 BST 合并都建立在这条性质上。**中序遍历一般二叉树无此性质**，不要外推。

### 迭代：颜色标记法

想改写为迭代（避免 `RecursionError`）时，把「节点第一次见到 → 拆子问题压栈；第二次见到 → 取值入答案」分开。每个节点压栈时带一个颜色：

```python
def inorder_iter(root):
    """中序迭代版：白色 = 待展开，灰色 = 可以取值。O(n)"""
    WHITE, GRAY = 0, 1
    stack = [(root, WHITE)]
    res = []

    while stack:
        node, color = stack.pop()
        if not node:
            continue                       # ① 空节点直接丢
        if color == WHITE:
            # ② 中序是「左 → 根 → 右」，入栈要倒着来：右、根(灰)、左
            stack.append((node.right, WHITE))
            stack.append((node, GRAY))
            stack.append((node.left, WHITE))
        else:
            res.append(node.val)           # ③ 第二次见到才取值

    return res
```

三种遍历只改那三行的入栈顺序：前序是「右、左、根(灰)」，后序是「根(灰)、右、左」。写白板时骨架不变，只换顺序，不容易乱。

### 层序：queue 计本层人数

```python
from collections import deque

def levelOrder(root):
    if not root:
        return []
    q = deque([root])
    res = []

    while q:
        level = []
        for _ in range(len(q)):        # ① 先记下本层人数，再逐个弹出——分层的唯一锚
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)    # ② 下一层入队
            if node.right: q.append(node.right)
        res.append(level)              # ③ 一层凑齐再收

    return res
```

每个节点恰好一层、队列长度恰为本层人数，`len(q)` 是分层的唯一锚。Z 字形（103）在偶数层 `level.reverse()`；右视图（199）只取每层最后一个——都是同模板的一步变式。

## 递归的两条走向

同一个递归骨架，答案从哪来决定了「先序」还是「后序」。

### 自顶向下（前序）：目标沿路径下行

把「还剩多少」当成参数往下传，到叶子结算。路径和（112）就是这样：

```python
def hasPathSum(root, targetSum):
    """是否存在根到叶子的路径，和等于 targetSum。O(n)"""
    if not root:
        return False
    if not root.left and not root.right:
        return targetSum == root.val       # ① 叶子处结算
    remain = targetSum - root.val          # ② 把剩下的目标传给子树
    return hasPathSum(root.left, remain) or hasPathSum(root.right, remain)
```

### 自底向上（后序）：左右先结算、在节点处合并

先拿到左右子树的答案，再在当前节点合并。最大深度（104）是最小样板：

```python
def maxDepth(root):
    """根到最深叶子的边数；空树记 0。O(n)"""
    if not root:
        return 0                              # ① 空节点没有深度
    return 1 + max(maxDepth(root.left), maxDepth(root.right))   # ② 取更深的一边 + 本层
```

「深度」是 `max`（取左右更深的一条）而不是求和；写成 `+` 会把问题改成节点计数，是 104 题最经典的失误。

**选路依据**：答案出现在路径上、或沿路径带量下行 → 前序；答案需要「左右子树先算好，再在节点处合并」 → 后序。最大深度（104）、直径（543）、最大路径和（124）、LCA（236）都是后序；路径存在性（112）、沿路径做决策的题多是前序。

## 二叉搜索树：查找、插入、删除

BST 的规则：左子树全部小于根，右子树全部大于根。查找和插入都沿着比较一路下行：

```python
def search(root, target):
    """找到返回值所在的节点；没有返回 None。平均 O(log n)，最坏 O(n)"""
    while root and root.val != target:
        root = root.left if target < root.val else root.right   # ① 比根小往左，否则往右
    return root

def insert(root, val):
    """插入并返回根（空树时新节点就是根）"""
    if not root:
        return TreeNode(val)                  # ① 找到空位，挂上新节点
    if val < root.val:
        root.left = insert(root.left, val)    # ② 交给左子树
    elif val > root.val:
        root.right = insert(root.right, val)  # ③ 交给右子树
    return root                               # ④ 值已存在时不重复插入
```

删除麻烦在「两个孩子」的情况：直接删会让左右子树无处安放。做法是**用右子树的最小值（中序后继）顶替**，再把这个后继从右子树里删掉：

```python
def delete(root, key):
    """删除 key 并返回新的根。O(h)"""
    if not root:
        return None
    if key < root.val:
        root.left = delete(root.left, key)
    elif key > root.val:
        root.right = delete(root.right, key)
    else:
        # ① 0 个或 1 个孩子：让孩子直接顶上来
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        # ② 2 个孩子：找右子树最小值（中序后继）顶替
        succ = root.right
        while succ.left:
            succ = succ.left
        root.val = succ.val
        # ③ 后继已经搬上来，把原来那个后继删掉
        root.right = delete(root.right, succ.val)
    return root
```

三种情况记法：**没孩子直接删、一个孩子孩子顶、两个孩子后继顶**。后继一定是右子树最左的节点，它没有左孩子，所以第三次递归会落到「0/1 个孩子」的分支，不会无限下去。

## 题型一：验证 BST（98 题的经典陷阱）

BST 的定义约束的是整棵子树对该节点的关系，不只是父子两处。判据要**沿祖先链传 lo/hi 上下界**：

```python
def isValidBST(root):
    def check(node, lo, hi):
        if not node:
            return True                          # ① 空树合法
        if node.val <= lo or node.val >= hi:
            return False                         # ② 越出祖先给出的范围
        # ③ 左子树的上界收紧到 node.val，右子树的下界收紧到 node.val
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
    root = TreeNode(preorder[0])          # ① 前序第一个就是根
    idx = inorder.index(preorder[0])      # ② 在 inorder 里找到根，左边是左子树
    root.left = buildTree(preorder[1:idx + 1], inorder[:idx])
    root.right = buildTree(preorder[idx + 1:], inorder[idx + 1:])
    return root
```

**前序+中序能唯一确定；前序+后序不能**（两个孩子都缺时对应两棵树）。切片版每层做 O(n) 的搬移与 `index`，总复杂度 O(n²)；面试追问时升级方向是「下标穿范围 + 哈希表存值→下标」，把每层定位做 O(1)。

最近公共祖先（236）的后序合账：左右子树各自报告「找到 p 或 q 了吗」，两边都报告就说明当前节点是分叉点：

```python
def lowestCommonAncestor(root, p, q):
    if not root or root is p or root is q:
        return root                      # ① 到底或撞上目标，直接上报
    l = lowestCommonAncestor(root.left, p, q)
    r = lowestCommonAncestor(root.right, p, q)
    if l and r:
        return root                      # ② p、q 分居两侧 → 当前节点即 LCA
    return l or r                        # ③ 只在一侧，把那一侧的结果继续上报
```

## 题型三：对称 / 翻转 / 相同

三个题都是「两棵子树对照着递归」，只是对照关系不同。翻转（226）一行就能写完：`root.left, root.right = invert(root.right), invert(root.left)`；下面给出三个完整版本。

```python
def invertTree(root):
    """翻转二叉树（226）：每个节点的左右孩子互换"""
    if not root:
        return None
    # ① 先换，再递归两棵子树（顺序反过来也行）
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root

def isSymmetric(root):
    """对称二叉树（101）：比较的是「左.left ↔ 右.right」这一对镜像"""
    def mirror(a, b):
        if not a and not b:
            return True                  # ① 两边都空 = 这一对镜像成立
        if not a or not b or a.val != b.val:
            return False                 # ② 一边空或值不同
        return mirror(a.left, b.right) and mirror(a.right, b.left)   # ③ 交叉比较
    return mirror(root.left, root.right) if root else True

def isSameTree(p, q):
    """相同的树（100）：同一位置逐个比较"""
    if not p and not q:
        return True
    if not p or not q or p.val != q.val:
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)
```

**对称与相同的差别只有最后一行**：相同是「左对左、右对右」，对称是「左对右、右对左」。把这两个函数并排写一遍，这一族就不会再混。

## 易错点总结

- 层序遍历忘了 `len(q)` 先记本层人数，层次信息丢失
- 自底向上把「max」写成「+」，得到节点总数而非深度
- 验证 BST 只比较父子，缺祖先链上下界（98 题被出成经典误导的原图即在此）
- 递归终止只写 `return None` / `return 0`，没先想清「空节点该返回什么」——每题草稿上先答这一问，再写递归
- 删除 BST 节点时两个孩子都直接删，或者用「左子树最大值」顶替却忘了把它从左子树删掉——顶替值必须从原位置删除
- 对称题写成「左对左、右对右」，那判的是相同不是对称
- 重建用 `list.index` 每层 O(n)，整体变 O(n²)；大规模输入改哈希表存值→下标
- 深树（>1000 层）在 Python 抛 `RecursionError`；工程做法不是抬高 `setrecursionlimit`，而是改用迭代遍历

## 相关题目

- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [101. 对称二叉树](../problems/leetcode/0101_symmetric_tree.md) / [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)
- [98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree/)
- [450. 删除二叉搜索树中的节点](https://leetcode.cn/problems/delete-node-in-a-bst/)

## 相关知识点

- [树](tree.md)——一般树、Trie、AVL / 红黑树、B 树与 B+ 树
- [堆](heap.md)——完全二叉树形状的唯一常见用法
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐帧观察
前 / 中 / 后序遍历每一步走到哪个节点，递归深度的变化直接画在画面里。
