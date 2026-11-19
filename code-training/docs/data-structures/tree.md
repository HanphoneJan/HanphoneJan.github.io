---
title: 树
sidebar_position: 7
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-11-19
---

# 树

## 定义与位置

树（tree）是 **n 个节点、n−1 条边**构成的**连通无环**结构，且从任一节点到任意其它节点的路径唯一。等价的递归定义：任意一个节点（根）持有 0 个或多个孩子（子树），这些子树之间互不相交。这正是「树上无环」的实现层依据——每新增一条边、每个节点只多一个父节点。树是**图**的一个特例，[二叉树](binary_tree.md)又是树的一个特例（每个节点至多两个孩子）。

本篇处理「树」这个大类自己的部分：术语、存储、N 叉树、Trie，以及面试里绕不开的**多路查找树**（B 树 / B+ 树）和平衡树家族。二叉树的遍历与题型在[二叉树](binary_tree.md)一篇。

## 术语表

| 术语 | 定义 | 备注 |
|------|------|------|
| 根 / 叶 | 无父的节点 / 无孩子的节点 | 一棵树恰有一个根 |
| 父 / 子 / 兄弟 | 直接上级 / 直接下级 / 同一个父亲的孩子 | 兄弟不跨树 |
| 深度 | 从根到该节点经过的**边数** | 根深度为 0 |
| 高度 | 该节点到最深叶子的**边数** | 叶高度为 0，整棵树的高度 = 根的高度 |
| 层 | 深度相同的一组节点 | 根在第 1 层（层 = 深度 + 1） |
| 节点的度 | 孩子个数 | 树的度 = 各节点度的最大值 |
| 森林 | 互不相交的多棵树 | 删根即得森林 |

**全站统一按边数算深度和高度**（根深度 0、叶高度 0）。教材里也有把根算作第 1 层、高度按层数的写法，两种口径本身都对，混用才会出错：`2^h − 1` 那个公式里的 h 是层数，不是这里的高度。

「深度」「高度」易混的原因就是方向相反：**深度从根向下计数，高度从该节点向上（至最深叶）计数**，同一节点两个数不必相等。

## 结构剖面

树的节点长什么样，取决于是「往下找孩子」还是「往上找父亲」——一根指针只能指一个方向。

![往下走，还是往上走](/diagrams/tree-storage.png)

算法题默认是孩子表示法：节点里放 `children` 列表（二叉就是 `left`/`right` 两根），往下走一步就到子树。并查集用父指针法：每个元素只存 `parent`，`fa[x] == x` 就是根——往上一步 O(1)，代价是往下找孩子要扫整个数组。

两者都要求「每个节点至多一个父」，这正是「树无环」在实现层的含义。多叉树要编码成二叉树，就用「左孩子右兄弟」：把孩子关系换成「第一个孩子 + 下一个兄弟」两根指针。

## 存储表示

| 表示法 | 结构 | 典型用途 |
|-------|------|---------|
| 父指针法 | 每节点只存 parent，根的 parent 为空 | [并查集](unionfind.md)（`fa` 数组即它）；只做「向上查」的场景 |
| 孩子表示法 | 每节点存 children 列表/引用 | N 叉树、DFS/BFS 遍历（算法题的默认形态） |
| 左孩子右兄弟 | 二叉链表把 N 叉树编码成二叉树 | 理论上统一「多叉」与「二叉」两种结构 |

做题时代码里的 `root` / `children` 就是孩子表示法；答「N 叉树怎么存」按这三行即可。

## N 叉树：遍历怎么改

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

## 前缀树 Trie（字典树）

Trie 是「以字符为边」的树，能把一组词合并存储：共享前缀的词走同一条路径。查找动作是**沿字符下行**，与词典总大小无关。

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

适用场景：单词接龙、自动补全、词频统计、拼写检查；「用 Trie 解异或最大值」属于口头了解的定位。节点 `children` 用 dict（字符任意）或长 26 的数组（纯小写字母）等价。

## 查找树家族：从 BST 到 B+ 树

前面几节讲的是「树的形状怎么存」。这一节换一个角度：**把数据按大小排进树里，让查找沿着比较一路下行**。二叉搜索树（BST）是最小的一步，但它有一个致命弱点，逼出了后面一整族结构。

### 二叉搜索树够用吗

BST 的规则只有一条：左子树全部小于根，右子树全部大于根。查找、插入、删除都从根开始，每次比较砍掉一半，理想高度是 log₂n。

问题在于「理想」两个字。按 `1, 2, 3, 4, 5` 的顺序插入，每个新节点都挂在最右边，树退化成一条链，高度 n，查找退回 O(n)。**有序数据恰好是最坏输入**，而磁盘上的自增主键、日志时间戳全是有序的。

于是有两条互不相同的修补路线：

- 内存里：让树**始终平衡**（AVL / 红黑树），把高度锁在 O(log n)；
- 磁盘上：干脆**不让每个节点只放一个键**（B 树 / B+ 树），把高度压到 3~4 层。

### AVL：把高度差压到 1

AVL 树给每个节点记一个高度，要求**任意节点左右子树的高度差不超过 1**。插入或删除破坏这条规则时，用旋转把它修回来。失衡只有四种形态，两种基本旋转各管一对：

![AVL 的四种失衡与旋转](/diagrams/avl-rotations.png)

```python
class TreeNode:
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

AVL 把高度差卡到 1，平衡很严，插入删除时旋转次数多。红黑树换一条更松的规则，用**颜色**记账，只保证「最长路径不超过最短路径的两倍」：

1. 每个节点非红即黑；
2. 根是黑；
3. 叶子（NIL 空节点）是黑；
4. 红节点的两个孩子必须是黑（不能有连续两个红）；
5. 从任一节点到其所有叶子的路径上，黑节点数相同（黑高相等）。

第 4、5 条合起来就推出了「最长 ≤ 2 × 最短」：红节点不能连排，所以一条路径最多红黑交替；黑高又处处相等。高度仍是 O(log n)，但插入最多 2 次旋转、删除最多 3 次，比 AVL 便宜——**读多写少用 AVL，读写均衡用红黑树**。

工程落点：C++ `std::map` / `std::set`、Java `TreeMap` / `TreeSet`、Linux 内核的 `rbtree`、Java 8 `HashMap` 里链表过长时转成的树。面试常问「为什么用红黑树不用 AVL」，答案就是旋转次数与实现复杂度的取舍。

### B 树：一次 I/O 读一页

二叉树在内存里很好，放到磁盘上就出问题。**一次内存比较约 1 纳秒，一次磁盘随机读约 0.1 毫秒**，差十万倍。二叉树每下降一层访问一个节点，如果节点在磁盘上就是一次 I/O；一千万条数据、高度约 24，查找要 24 次 I/O。

B 树的做法是：**把一整个磁盘页当成一个节点**（InnoDB 是 16KB），节点里塞几百个有序键和几百个子树指针。一次 I/O 把几百个键读进内存，在里面用二分找下一层该走哪棵子树。高度从 24 降到 3~4，I/O 次数也就降到 3~4。

一棵 **m 阶 B 树**的规则：

| 规则 | 含义 |
|------|------|
| 每个节点至多 m 棵子树、m−1 个键 | m 就是「扇出」，InnoDB 里约一千 |
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

def search(node, target):
    """返回 (节点, 下标)；找不到返回 None。代价 = 树高次节点访问"""
    i = 0
    while i < len(node.keys) and target > node.keys[i]:
        i += 1                                  # ① 跳过比 target 小的键
    if i < len(node.keys) and node.keys[i] == target:
        return node, i                          # ② 命中
    if node.leaf:
        return None                             # ③ 到叶子还没找到 = 不存在
    return search(node.children[i], target)     # ④ 沿第 i 棵子树下行
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
- **聚簇索引**（主键索引）的叶子存整行数据；**二级索引**的叶子存主键值，查非索引列要**回表**再走一次聚簇索引；
- 估算高度：非叶节点一项约 8 字节主键 + 6 字节页号 = 14 字节，一页约 1170 个指针；叶子一行按 1KB 算，一页约 16 行。三层就是 `1170 × 1170 × 16 ≈ 2190 万` 行——两千万行的表，主键查找只要 3 次 I/O。

由此推出两条工程结论：

- **主键要短**：主键越短，非叶节点一页能放的指针越多，树越矮；
- **主键要自增**：顺序插入只往最右叶子追加，不会触发中间页的分裂与随机 I/O；UUID 这种随机主键会让插入落在任意页上，页分裂频繁、页利用率下降。

## 区间结构：线段树与树状数组

[数组](array.md)一篇里的前缀和解决「静态数组的区间和」。一旦数组会变，前缀和每次修改都要重建 O(n)，这时换成两种树形结构：

| 结构 | 支持 | 复杂度 | 适用 |
|------|------|--------|------|
| 前缀和 | 区间和查询 | 预处理 O(n)，查询 O(1)，修改 O(n) | 数组不变 |
| 树状数组（Fenwick） | 单点加 + 前缀和 | 都是 O(log n) | 运算可减（和、异或） |
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

## 通用方法

### DFS 与 BFS 的分工

| 需求 | 谁在用 |
|------|-------|
| 逐层形态、最短步数、右视图 | BFS（队列，[patterns/bfs.md](../patterns/bfs.md)） |
| 到底才算（路径和、深度、LCA） | DFS（[patterns/dfs.md](../patterns/dfs.md)） |
| 仅遍历一遍 | 两者都行：BFS 在极宽的树上空间更贵，DFS 在极深的树上递归更深 |

### 树递归的三问

写任何树递归之前，先把三问答案写在脑海里：

1. **空节点返回什么**？（`0` / `False` / `None`，随题意不同而不同）
2. **每一步的具体计算**：能否用「左右子树的返回值」一句话说清
3. **返回什么**：上一层拿什么继续算

90% 的树题 bug 出在第 1 与第 3 之间没闭环。

### 递归改迭代

通用写法是显式栈 + 白灰标记（见[二叉树](binary_tree.md)的颜色标记法一节），N 叉树同一套。链状树本质上就需要 O(n) 栈深，迭代是正解，`sys.setrecursionlimit` 只是临时顶住。

## 关联结构

- [二叉树](binary_tree.md)：遍历四序、BST、重建、LCA——树题绝大多数落点
- [堆](heap.md)：完全二叉树 + 数组存储
- [并查集](unionfind.md)：父指针表示法
- [数组](array.md)：前缀和，以及本节树状数组 / 线段树的起点

## 易错点总结

- 深度、高度口径混合：本篇按边数（根 0、叶 0），看到 `2^h − 1` 时先确认那个 h 是层数
- N 叉树迭代忘了 `reversed(children)`，孩子顺序反
- Trie 的 `search` 与 `startsWith` 混用：前者要求 `is_word`，后者不要求
- 忘空树特判：`if not root: return []` 是很多题的第一行
- AVL 旋转后忘了先更新下沉节点的高度，再更新上位节点——顺序反了高度算错，后续判断全偏
- 把 B 树的「阶」当成「键的个数」：m 阶是**子树数**上限，键数上限是 m−1
- 以为 B+ 树内部节点也存数据：内部只存分隔键，数据全在叶子
- 几条性质可作校验器：**树边数恒为 n − 1**，画树时用它自查

## 相关题目

- [589. N 叉树的前序遍历](https://leetcode.cn/problems/n-ary-tree-preorder-traversal/)
- [208. 实现 Trie (前缀树)](https://leetcode.cn/problems/implement-trie-prefix-tree/)
- [429. N 叉树的层序遍历](https://leetcode.cn/problems/n-ary-tree-level-order-traversal/)
- [307. 区域和检索 - 数组可修改](https://leetcode.cn/problems/range-sum-query-mutable/)（树状数组 / 线段树）

## 相关知识点

- [二叉树](binary_tree.md)——树题的绝大多数落点
- [并查集](unionfind.md)——父指针表示法
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐帧观察
前 / 中 / 后序遍历每一步走到哪个节点，递归深度的变化直接画在画面里。
