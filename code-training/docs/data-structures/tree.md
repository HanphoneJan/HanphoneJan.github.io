---
title: 树
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-11-13
---

# 树

## 定义与位置

树（tree）是 **n 个节点、n−1 条边**构成的**连通无环**结构，且从任一节点到任意其它节点的路径唯一。等价的递归定义：任意一个节点（根）持有 0 个或多个孩子（子树），这些子树之间互不相交。这正是「树上无环」的实现层依据——每新增一条边、每个节点只多一个父节点。树是**图**的一个特例，[二叉树](binary_tree.md)又是树的一个特例（每个节点至多两个孩子）。

面试问「树」的问题大多落在二叉树上；本篇处理一般树自己的部分：术语、存储、N 叉树、Trie。

## 术语表

| 术语 | 定义 | 备注 |
|------|------|------|
| 根 / 叶 | 无父的节点 / 无孩子的节点 | 一棵树恰有一个根 |
| 父 / 子 / 兄弟 | 直接上级 / 直接下级 / 同一个父亲的孩子 | 兄弟不跨树 |
| 深度 | 从根到该节点经过的边数 | 根深度为 0（有教材按 1 起算，口径先定） |
| 高度 | 该节点到最深叶子的边数 | 整棵树的高度 = 根的高度 |
| 层 | 深度相同的一组节点 | |
| 节点的度 | 孩子个数 | 树的度 = 各节点度的最大值 |
| 森林 | 互不相交的多棵树 | 删根即得森林 |

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

def preorder_n(root):                     # 前：值，随后孩子们
    if not root:
        return []
    res = [root.val]
    for child in root.children:
        res += preorder_n(child)
    return res

def preorder_n_iter(root):                # 迭代：栈；孩子按倒序压栈
    if not root:
        return []
    stack, res = [root], []
    while stack:
        node = stack.pop()
        res.append(node.val)
        stack.extend(reversed(node.children))
    return res
```

要点：迭代版**按倒序压栈**——栈后进先出，想最左的孩子被最先访问，它就要最后进。

## 前缀树 Trie（字典树）

Trie 是「以字符为边」的树，能把一组词合并存储：共享前缀的词走同一条路径。查找动作是**沿字符下行**，与词典总大小无关。

```python
class TrieNode:
    def __init__(self):
        self.children = {}     # 字符 -> 子节点
        self.is_word = False   # 走到此处是否恰是一个完整词的终点

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_word = True

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_word     # 「前缀存在」≠「词存在」

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None

    def _walk(self, s: str):
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
- [数组](array.md)：前缀和的树形升级（树状数组 / 线段树，O(log n) 区间和与区间加，口头了解）

## 易错点总结

- 深度、高度口径混合：交集不清先定「根深度是 0 还是 1」
- N 叉树迭代忘了 `reversed(children)`，孩子顺序反
- Trie 的 `search` 与 `startsWith` 混用：前者要求 `is_word`，后者不要求
- 忘空树特判：`if not root: return []` 是很多题的第一行
- 几条性质可作校验器：**边数恒为 n − 1**，画树时用它自查
- N 叉树与二叉树之间没有「中序」，想写「中序遍历 N 叉树」先回头确认需求不是想要的层序

## 相关题目

- [589. N 叉树的前序遍历](https://leetcode.cn/problems/n-ary-tree-preorder-traversal/)
- [208. 实现 Trie (前缀树)](https://leetcode.cn/problems/implement-trie-prefix-tree/)
- [429. N 叉树的层序遍历](https://leetcode.cn/problems/n-ary-tree-level-order-traversal/)

## 相关知识点

- [二叉树](binary_tree.md)——树题的绝大多数落点
- [并查集](unionfind.md)——父指针表示法
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐帧观察
前 / 中 / 后序遍历每一步走到哪个节点，递归深度的变化直接画在画面里。
