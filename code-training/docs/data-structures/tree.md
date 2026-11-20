---
title: 树
sidebar_position: 7
category: 数据结构
difficulty_range: [简单, 困难]
tags: [树, 二叉树]
last_updated: 2026-11-20
---

# 树

## 定义与位置

树（tree）是 **n 个节点、n−1 条边**构成的**连通无环**结构，从任一节点到任意其它节点的路径唯一。它也可以递归地定义：一个节点持有若干棵互不相交的子树——「无环」在实现层就是「每个节点只有一个父节点，新增一条边必须连到一个还没有父节点的节点上」。

树是[图](graph.md)的特例（连通、无环），二叉树（binary tree）是树的特例（每个节点至多两个孩子），二叉搜索树（binary search tree，BST）又是二叉树里按值排过序的一类。本篇顺着「形状 → 存储 → 遍历 → 递归 → 按大小查找」往下走：先讲清一棵树长什么样、怎么放，再讲怎么把它读一遍，然后是 BST 以及它退化之后逼出来的平衡树与磁盘上的 B+ 树，最后两条旁支是把字符当边的前缀树和把区间搬到树上的树状数组。

## 术语与口径

| 术语 | 定义 | 备注 |
|------|------|------|
| 根 / 叶 | 无父的节点 / 无孩子的节点 | 一棵树恰有一个根 |
| 父 / 子 / 兄弟 | 直接上级 / 直接下级 / 同一个父亲的孩子 | 兄弟不跨树 |
| 深度 | 从根到该节点经过的**边数** | 根深度为 0 |
| 高度 | 该节点到最深叶子的**边数** | 叶高度为 0，整棵树的高度 = 根的高度 |
| 层 | 深度相同的一组节点 | 根在第 1 层（层 = 深度 + 1） |
| 节点的度 | 孩子个数 | 树的度 = 各节点度的最大值 |
| 森林 | 互不相交的多棵树 | 删根即得森林 |

**全站统一按边数算深度和高度**（根深度 0、叶高度 0）。教材里也有把根算作第 1 层、高度按层数计的写法，两种口径本身都对，混用才会出错：`2^h − 1` 那个公式里的 h 是层数，不是这里的高度。

「深度」「高度」易混的原因就是方向相反：**深度从根向下计数，高度从该节点向上（至最深叶）计数**，同一节点两个数不必相等。

## 节点怎么存

树的节点长什么样，取决于是「往下找孩子」还是「往上找父亲」——一根指针只能指一个方向。

![往下走，还是往上走](/diagrams/tree-storage.png)

算法题默认是孩子表示法：节点里放 `children` 列表（二叉就是 `left` / `right` 两根），往下走一步就到子树，代价是每个节点多存一组指针。并查集用父指针法：每个元素只存 `parent`，`fa[x] == x` 就是根——往上一步 O(1)，代价是往下找孩子要扫整个数组。

| 表示法 | 结构 | 典型用途 |
|-------|------|---------|
| 父指针法 | 每节点只存 parent，根的 parent 为空 | [并查集](unionfind.md)（`fa` 数组即它）；只做「向上查」的场景 |
| 孩子表示法 | 每节点存 children 列表/引用 | N 叉树、深度优先 / 广度优先遍历（算法题的默认形态） |
| 左孩子右兄弟 | 二叉链表把 N 叉树编码成二叉树 | 理论上统一「多叉」与「二叉」两种结构 |

两者都要求「每个节点至多一个父」，这正是「树无环」在实现层的含义。多叉树要编码成二叉树，就用「左孩子右兄弟」：把孩子关系换成「第一个孩子 + 下一个兄弟」两根指针。

二叉树节点的定义只有三个字段：

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val          # ① 存的值
        self.left = left        # ② 左孩子；没有就是 None
        self.right = right      # ③ 右孩子
```

完全二叉树还能更省：它按层铺进数组，下标 i 的孩子在 `2i+1` 与 `2i+2`、父亲在 `(i−1)//2`，一个指针都不存。前提是中间不许有空位——[堆](heap.md)就是靠这条把「完全」换成「不用维护指针」。

## 二叉树的形状与数量关系

```text
普通二叉树
├─ 满二叉树        每层都满
├─ 完全二叉树      只允许最后一层缺右侧 —— 数组存储的根基（堆的形状）
├─ 二叉搜索树 BST  左 < 根 < 右 —— 树平衡时查找 O(log n) 的有序结构
├─ 平衡二叉树 AVL  任意节点左右子树高差 ≤ 1 —— 防退化
└─ （工程延伸）红黑树：近似平衡，增删查改综合更稳，C++ map / Java TreeMap 的底层
```

**完全二叉树与 BST 易混，但词根无关**：前者描述**形状**（能否填满数组），后者描述**值的大小关系**。二者可以同时成立，也可以都不成立。

形状与数量的关系是客观题的常考项，**这里的 h 一律指层数**：

| 性质 | 公式 |
|------|------|
| 第 i 层最多节点数（i 从 1 起） | 2^(i−1) |
| 层数为 h 的树最多节点数 | 2^h − 1 |
| 叶子数与度为 2 的节点数 | n₀ = n₂ + 1 |
| n 节点完全二叉树的层数 | ⌊log₂n⌋ + 1 |
| n 节点完全二叉树的高度（边数） | ⌊log₂n⌋ |

最后两行是同一个量的两种口径：**层数 = 高度 + 1**。本篇后面说「高度」一律按边数（叶为 0）。

## 遍历：同一棵树，四种读法

二叉树的结构只有三个字段，真正难的不是形状，而是**同一棵树可以有四种读法**。

![差别只在「什么时候读根」](/diagrams/binary-tree-traversal.png)

前 / 中 / 后序的区别只在「什么时候读根」：进节点就读是前序，读完左子树再读是中序，两个孩子都读完才读是后序——它们共用同一个递归骨架，靠隐式调用栈记住回来的路。层序换成显式队列，先进先出决定了「一层一层」的顺序。

顺序不是随意的：中序能把 BST 读成升序（左 < 根 < 右），前序 + 中序能重建整棵树，这两条性质都直接来自图上那套编号。

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

### 层序：队列里记下本层人数

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

每个节点恰好属于一层、队列长度恰为本层人数，`len(q)` 是分层的唯一锚。Z 字形（103）在偶数层翻转本层结果；右视图（199）只取每层最后一个——都是同一个模板的一步变式。

### 深度优先还是广度优先

两者都能把每个节点走一遍，区别在于「先往深走」还是「先按层扩散」，以及随之而来的空间代价：

| 需求 | 用哪个 |
|------|-------|
| 逐层形态、最短步数、右视图 | 广度优先搜索（breadth-first search，BFS）：队列 |
| 到底才算（路径和、深度、最近公共祖先） | 深度优先搜索（depth-first search，DFS）：递归或显式栈 |
| 仅遍历一遍 | 两者都行：BFS 在极宽的树上空间更贵，DFS 在极深的树上递归更深 |

链状树本质上需要 O(n) 栈深，迭代是正解，`sys.setrecursionlimit` 只是临时顶住。

## N 叉树：没有中序

N 叉树没有「中序」——没有一个可被独立提及的「中间」孩子。剩前序、后序与层序：

```python
class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

def preorder_n(root):
    """N 叉树前序：根 → 孩子们。O(n)"""
    if not root:
        return []                       # ① 空树返回空表
    res = [root.val]                    # ② 先读根
    for child in root.children:         # ③ 再依次读每棵子树
        res += preorder_n(child)
    return res

def preorder_n_iter(root):
    """迭代版：显式栈替代递归。O(n)"""
    if not root:
        return []
    stack, res = [root], []
    while stack:
        node = stack.pop()              # ① 弹出即访问
        res.append(node.val)
        stack.extend(reversed(node.children))   # ② 倒序压栈，保证最左的孩子最先出
    return res
```

要点：迭代版**按倒序压栈**——栈后进先出，想最左的孩子被最先访问，它就要最后进。

## 前缀树（Trie）

Trie 也叫字典树，是「以字符为边」的树，能把一组词合并存储：共享前缀的词走同一条路径。查找动作是**沿字符下行**，与词典总大小无关。

```python
class TrieNode:
    def __init__(self):
        self.children = {}     # ① 字符 -> 子节点
        self.is_word = False   # ② 走到此处是否恰是一个完整词的终点

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()   # ① 缺这条边就新建
            node = node.children[ch]             # ② 沿边走一步
        node.is_word = True                      # ③ 最后一个字符处打标

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_word     # ① 「前缀存在」≠「词存在」

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None        # ① 走得到就算前缀

    def _walk(self, s: str):
        """沿字符逐层下行；任一步缺失就返回 None。O(len(s))"""
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None
        return node
```

插入 / 查询都是 O(m)（m 为词长），**与词典里有多少词无关**。`search` 与 `startsWith` 的区别只有一点：前者要求走到终点**且** `is_word` 为真，后者只要求走得到。

![共享前缀就是共享路径](/diagrams/trie-shared-prefix.png)

插入 `["app", "apple", "apt"]` 之后，三个查询各自停在哪：

| 查询 | 走到的位置 | 判定 |
|---|---|---|
| `search("app")` | 第三段之后 | `is_word` 为真 → True |
| `search("appl")` | 第四段之后（节点存在） | `is_word` 为假 → False |
| `startsWith("appl")` | 同上 | 走得到就为真 → True |

适用场景：单词接龙、自动补全、词频统计、拼写检查。节点 `children` 用 dict（字符任意）或长 26 的数组（纯小写字母）等价。

## 递归的两条走向

同一个递归骨架，答案从哪来决定了「先序」还是「后序」。

### 自顶向下（前序）：把「还剩多少」带下去

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

### 自底向上（后序）：左右先结算，在节点处合并

先拿到左右子树的答案，再在当前节点合并。最大深度（104）是最小样板：

```python
def maxDepth(root):
    """根到最深叶子的节点数（104 的口径）；空树记 0。O(n)"""
    if not root:
        return 0                              # ① 空节点没有深度
    return 1 + max(maxDepth(root.left), maxDepth(root.right))   # ② 取更深的一边 + 本层
```

「深度」是 `max`（取左右更深的一条）而不是把两条路径相加；写成 `+` 时样例 `[3,9,20,null,null,15,7]` 会从 3 变成 4，是 104 题最经典的失误。另外，104 数的是路径上的**节点个数**，比本篇术语表按边数的高度多 1——答「这棵树的高度是多少」时先说清用的是哪种口径。

**选路依据**：答案出现在路径上、或沿路径带量下行 → 前序；答案需要「左右子树先算好，再在节点处合并」 → 后序。最大深度（104）、直径（543）、最大路径和（124）、最近公共祖先（236）都是后序；路径存在性（112）、沿路径做决策的题多是前序。

### 写递归前先答三个问题

1. **空节点返回什么**？（`0` / `False` / `None`，随题意不同而不同）
2. **每一步的具体计算**：能否用「左右子树的返回值」一句话说清
3. **返回什么**：上一层拿什么继续算

90% 的树题 bug 出在第 1 与第 3 之间没闭环。

## 三个递归模板

### 最近公共祖先（LCA）

最近公共祖先（LCA，lowest common ancestor）是「p 和 q 各自往上走，第一次汇合的那个节点」。后序合账的写法是：左右子树各自报告「找到 p 或 q 了吗」，两边都报告就说明当前节点是分叉点：

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

### 从前序 + 中序重建

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

**前序 + 中序能唯一确定；前序 + 后序不能**（两个孩子都缺时对应两棵树）。切片版每层做 O(n) 的搬移与 `index`，总复杂度 O(n²)；面试追问时升级方向是「下标穿范围 + 哈希表存值→下标」，把每层定位做 O(1)。

### 对称、翻转、相同

三个题都是「两棵子树对照着递归」，只是对照关系不同。翻转（226）一行就能写完：`root.left, root.right = invertTree(root.right), invertTree(root.left)`；下面给出三个完整版本。

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

## 二叉搜索树

BST 的规则只有一条：左子树全部小于根，右子树全部大于根。查找、插入、删除都从根开始，每次比较砍掉一半，理想高度是 log₂n。

### 查找、插入、删除

```python
def search(root, target):
    """找到值所在的节点；没有返回 None。平均 O(log n)，最坏 O(n)"""
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

### 验证 BST：约束的是整棵子树

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

### 有序输入会把它退化成一条链

按 `1, 2, 3, 4, 5` 的顺序插入，每个新节点都挂在最右边，树退化成一条链，高度 n，查找退回 O(n)。**有序数据恰好是最坏输入**，而磁盘上的自增主键、日志时间戳全是有序的。

于是有两条互不相同的修补路线：

- 内存里：让树**始终平衡**（AVL / 红黑树），把高度锁在 O(log n)；
- 磁盘上：干脆**不让每个节点只放一个键**（B 树 / B+ 树），把高度压到 3~4 层。

## 平衡与多路查找树

### 平衡二叉树（AVL 树）：把高度差压到 1

AVL 树给每个节点记一个高度，要求**任意节点左右子树的高度差不超过 1**。插入或删除破坏这条规则时，用旋转把它修回来。失衡只有四种形态，两种基本旋转各管一对：

![AVL 的四种失衡与旋转](/diagrams/avl-rotations.png)

```python
class AVLNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.height = 0            # ① 叶节点高度 0，空节点记 -1（按边数）

def h(node):
    return node.height if node else -1

def update(node):
    node.height = 1 + max(h(node.left), h(node.right))   # ① 由孩子反推自己

def rotate_right(y):
    """LL：左孩子 x 上位，y 变成 x 的右孩子。O(1)"""
    x = y.left
    t2 = x.right          # ① 先存 x 的右子树，它要改挂到 y 左边
    x.right = y
    y.left = t2
    update(y)             # ② 先更新下沉的 y，再更新上位的 x
    update(x)
    return x              # ③ 新子树根

def rotate_left(x):
    """RR：右孩子 y 上位，x 变成 y 的左孩子。O(1)"""
    y = x.right
    t2 = y.left
    y.left = x
    x.right = t2
    update(x)
    update(y)
    return y

def rebalance(node):
    """插入/删除后调用：先修高度，再按四种形态旋转。返回新子树根"""
    update(node)
    bf = h(node.left) - h(node.right)          # ① 平衡因子
    if bf > 1:                                 # ② 左边高
        if h(node.left.left) < h(node.left.right):
            node.left = rotate_left(node.left) # ③ LR：先把左孩子左旋，变成 LL
        return rotate_right(node)
    if bf < -1:                                # ④ 右边高
        if h(node.right.right) < h(node.right.left):
            node.right = rotate_right(node.right)  # ⑤ RL：先右旋右孩子，变成 RR
        return rotate_left(node)
    return node
```

四种形态记法：**LL 右旋、RR 左旋、LR 先左后右、RL 先右后左**。名字里的两个字母是「从失衡节点往下走两步的方向」——LL 是往左走两次，所以把中间那个节点转上来。

AVL 的查找、插入、删除都是 O(log n)，代价是每次修改最多 O(log n) 次旋转，且要维护高度字段。

### 红黑树：放松平衡，换更少的旋转

AVL 把高度差卡到 1，平衡很严，插入删除时旋转次数多。红黑树（red-black tree）换一条更松的规则，用**颜色**记账，只保证「最长路径不超过最短路径的两倍」：

1. 每个节点非红即黑；
2. 根是黑；
3. 叶子（NIL 空节点，即不存在的孩子）是黑；
4. 红节点的两个孩子必须是黑（不能有连续两个红）；
5. 从任一节点到其所有叶子的路径上，黑节点数相同（黑高相等）。

第 4、5 条合起来就推出了「最长 ≤ 2 × 最短」：红节点不能连排，所以一条路径最多红黑交替；黑高又处处相等。高度仍是 O(log n)，但插入最多 2 次旋转、删除最多 3 次，比 AVL 便宜——**读多写少用 AVL，读写均衡用红黑树**。

工程落点：C++ `std::map` / `std::set`、Java `TreeMap` / `TreeSet`、Linux 内核的 `rbtree`、Java 8 `HashMap` 里链表过长时转成的树。面试常问「为什么用红黑树不用 AVL」，答案就是旋转次数与实现复杂度的取舍。

### B 树：一次 I/O 读一页

二叉树在内存里很好，放到磁盘上就出问题。**一次内存比较约 1 纳秒，一次磁盘随机读约 0.1 毫秒**，差十万倍。二叉树每下降一层访问一个节点，如果节点在磁盘上就是一次 I/O；一千万条数据、高度约 24，查找要 24 次 I/O。

B 树的做法是：**把一整个磁盘页当成一个节点**（MySQL 的 InnoDB 存储引擎里一页是 16KB），节点里塞几百个有序键和几百个子树指针。一次 I/O 把几百个键读进内存，在里面用二分找下一层该走哪棵子树。高度从 24 降到 3~4，I/O 次数也就降到 3~4。

一棵 **m 阶 B 树**的规则：

| 规则 | 含义 |
|------|------|
| 每个节点至多 m 棵子树、m−1 个键 | m 就是扇出（一个节点能分出多少棵子树），InnoDB 里约一千 |
| 根至少 2 棵子树（除非整棵树只有一个节点） | 根不受下限约束 |
| 非根节点至少 ⌈m/2⌉ 棵子树 | 节点不能太空，否则浪费页 |
| 所有叶子在同一层 | 查找路径长度一致 |
| 节点内键有序，第 i 棵子树的键落在 key[i−1] 与 key[i] 之间 | 路由依据 |

```python
class BTreeNode:
    def __init__(self, leaf=False):
        self.keys = []        # ① 有序关键字
        self.children = []    # ② 子树指针；非叶节点满足 len(children) == len(keys) + 1
        self.leaf = leaf

def btree_search(node, target):
    """返回 (节点, 下标)；找不到返回 None。代价 = 树高次节点访问"""
    i = 0
    while i < len(node.keys) and target > node.keys[i]:
        i += 1                                  # ① 跳过比 target 小的键
    if i < len(node.keys) and node.keys[i] == target:
        return node, i                          # ② 命中
    if node.leaf:
        return None                             # ③ 到叶子还没找到 = 不存在
    return btree_search(node.children[i], target)   # ④ 沿第 i 棵子树下行
```

**插入与分裂**是 B 树唯一需要理解的动态过程：

1. 插入永远发生在**叶子**；
2. 叶子满了（已有 m−1 个键）就**分裂**：取中间键上移到父节点，左右两半各成一个节点；
3. 父节点也满了就继续向上分裂；如果根分裂，整棵树长高一层。

![B 树插入导致的分裂](/diagrams/btree-split.png)

以 4 阶 B 树（每节点最多 3 个键）为例，依次插入 `10, 20, 30` 得到 `[10, 20, 30]`；再插入 `40` 时叶子溢出，中间键 `20` 上移，叶子裂成 `[10]` 与 `[30, 40]`，根变成 `[20]`。之后继续插入 `50, 60`，右叶子变成 `[30, 40, 50, 60]` 再次溢出，`40` 上移，右叶子裂成 `[30]` 与 `[50, 60]`，根变成 `[20, 40]`。**树只在根分裂时长高**，所以所有叶子始终同层。

删除是镜像过程：键数低于下限时，先向兄弟**借**（父节点的一个键下来、兄弟的一个键上去），借不到就与兄弟**合并**；合并可能让父节点也不足，继续向上。工程实现里删除是 B 树代码量最大的一块，面试一般只要求讲清「借或合并，可能向上连锁」。

### B+ 树：数据全在叶子

B+ 树是 B 树的改造版，只改两件事：

- **内部节点只存键，不存数据**（连指向记录的指针都没有），只负责路由；
- **所有数据都在叶子**，叶子之间用链表串起来。

![B+ 树：内部只做路由，叶子串成链表](/diagrams/bplus-tree.png)

这两条改动带来三个直接好处：

1. **扇出更大**：内部节点省掉了数据指针，一页能放更多键，树更矮；
2. **查找路径稳定**：内部节点只做路由，一定要走到叶子才拿到数据，不会出现「有的键在中间层就命中」；
3. **范围查询快**：定位到左端点的叶子后，沿叶子链表顺序扫即可，不用回到树上逐段找。

最后一条是数据库选 B+ 树而不是 B 树的关键。`WHERE id BETWEEN 100 AND 200` 在 B 树上要反复「上树—下树」，在 B+ 树上就是一次定位加一段链表遍历，正好匹配磁盘的顺序读。

### InnoDB 里的 B+ 树

MySQL 的 InnoDB 用 B+ 树做索引，几个数字值得记住：

- 页大小 **16KB**；
- **聚簇索引**（主键索引）的叶子存整行数据；**二级索引**的叶子存主键值，查非索引列要**回表**——拿主键值再走一次聚簇索引；
- 估算高度：非叶节点一项约 8 字节主键 + 6 字节页号 = 14 字节，一页约 1170 个指针；叶子一行按 1KB 算，一页约 16 行。三层就是 `1170 × 1170 × 16 ≈ 2190 万` 行——两千万行的表，主键查找只要 3 次 I/O。

由此推出两条工程结论：

- **主键要短**：主键越短，非叶节点一页能放的指针越多，树越矮；
- **主键要自增**：顺序插入只往最右叶子追加，不会触发中间页的分裂与随机 I/O；UUID 这种随机主键会让插入落在任意页上，页分裂（一页装不下、拆成两页）频繁、页利用率下降。

## 区间结构：树状数组与线段树

[数组](array.md)一篇里的前缀和解决「静态数组的区间和」。一旦数组会变，前缀和每次修改都要重建 O(n)，这时换成两种树形结构：

| 结构 | 支持 | 复杂度 | 适用 |
|------|------|--------|------|
| 前缀和 | 区间和查询 | 预处理 O(n)，查询 O(1)，修改 O(n) | 数组不变 |
| 树状数组（Fenwick 树） | 单点加 + 前缀和 | 都是 O(log n) | 运算可减（和、异或） |
| 线段树 | 区间查询 + 区间修改 | 都是 O(log n) | 最大值/最小值等不可减运算、懒标记 |

树状数组的代码短到可以背下来，关键在 `lowbit`：`i & -i` 取出 i 的二进制最低位的 1，正好是 `tree[i]` 管辖的区间长度。

```python
class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)     # ① 1-based；tree[i] 管 (i-lowbit(i), i] 这一段

    def add(self, i, delta):
        """a[i] += delta"""
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i               # ② 沿「包含 i 的区间」向上跳

    def prefix(self, i):
        """a[1] + ... + a[i]"""
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & -i               # ③ 沿「i 的管辖段」向下拆
        return s
```

区间 `[l, r]` 的和 = `prefix(r) - prefix(l - 1)`。线段树把每个区间显式建成节点，代码更长但能做「区间加 + 区间最大值」这类树状数组做不了的事；面试里能手写树状数组就够，线段树答到「建树、区间查询、懒标记」的定位即可。

## 易错点总结

- 深度、高度口径混合：本篇按边数（根 0、叶 0），看到 `2^h − 1` 时先确认那个 h 是层数
- 层序遍历忘了先用 `len(q)` 记下本层人数，层次信息丢失
- 自底向上把 `max` 写成 `+`，两条路径的深度被相加，答案偏大（样例 `[3,9,20,null,null,15,7]` 会从 3 算成 4）
- 验证 BST 只比较父子，缺祖先链上的上下界（反例 `[5,4,6,null,null,3,7]` 里的 3 同时是 5 与 6 的后代）
- 删除 BST 节点时两个孩子都直接删，或用左子树最大值顶替却忘了把它从原位置删掉——顶替值必须从原位置删除
- 对称题写成「左对左、右对右」，那判的是相同不是对称
- N 叉树迭代忘了 `reversed(children)`，孩子顺序反
- Trie 的 `search` 与 `startsWith` 混用：前者要求 `is_word`，后者不要求
- AVL 旋转后先更新下沉节点的高度，再更新上位节点——顺序反了高度算错，后续判断全偏
- 把 B 树的「阶」当成「键的个数」：m 阶是**子树数**上限，键数上限是 m−1
- 以为 B+ 树的内部节点也存数据：内部只存分隔键，数据全在叶子
- 忘空树特判：`if not root: return []` 是很多题的第一行

## 相关题目

- [104. 二叉树的最大深度](../problems/leetcode/0104_maximum_depth_of_binary_tree.md)
- [102. 二叉树的层序遍历](../problems/leetcode/0102_binary_tree_level_order_traversal.md) / [199. 二叉树的右视图](../problems/leetcode/0199_binary_tree_right_side_view.md)
- [543. 二叉树的直径](../problems/leetcode/0543_diameter_of_binary_tree.md) / [124. 二叉树中的最大路径和](../problems/leetcode/0124_binary_tree_maximum_path_sum.md)
- [101. 对称二叉树](../problems/leetcode/0101_symmetric_tree.md) / [226. 翻转二叉树](../problems/leetcode/0226_invert_binary_tree.md)
- [105. 从前序与中序遍历序列构造二叉树](../problems/leetcode/0105_construct_binary_tree_from_preorder_and_inorder_traversal.md)
- [236. 二叉树的最近公共祖先](../problems/leetcode/0236_lowest_common_ancestor_of_a_binary_tree.md)
- [114. 二叉树展开为链表](../problems/leetcode/0114_flatten_binary_tree_to_linked_list.md) / [297. 二叉树的序列化与反序列化](../problems/leetcode/0297_serialize_and_deserialize_binary_tree.md)
- [98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree/) / [450. 删除二叉搜索树中的节点](https://leetcode.cn/problems/delete-node-in-a-bst/)
- [589. N 叉树的前序遍历](https://leetcode.cn/problems/n-ary-tree-preorder-traversal/) / [429. N 叉树的层序遍历](https://leetcode.cn/problems/n-ary-tree-level-order-traversal/)
- [208. 实现 Trie (前缀树)](../problems/leetcode/0208_implement_trie_prefix_tree.md)
- [307. 区域和检索 - 数组可修改](https://leetcode.cn/problems/range-sum-query-mutable/)（树状数组 / 线段树）

## 相关知识点

- [堆](heap.md)——完全二叉树的形状 + 数组存储
- [并查集](unionfind.md)——父指针表示法
- [图](graph.md)——树的推广；无环连通只是它的一种特例
- [数组](array.md)——前缀和，以及树状数组 / 线段树的起点
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)、[递归](../patterns/recursion.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐帧观察
前 / 中 / 后序遍历每一步走到哪个节点，递归深度的变化直接画在画面里。
