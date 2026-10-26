---
title: 树
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-10-26
---

# 树

## 一句话理解

**树是「不回头的一对多」**：n 个节点、n−1 条边、从根出发任意一个节点恰好有一条到达路径（无环、连通、父子唯一）。现实模型是公司组织架构或文件夹结构：一个人有一个直属上级、可以有多个下属。

一句定位话：**树是图的一个特例（无环连通图），而二叉树是树的一个特例**（每个节点至多两个孩子）。面试里 90% 的「树」问的其实是[二叉树](binary_tree.md)——本篇处理一般树自己的部分：概念、N 叉树、前缀树，以及「怎样在并没有两个孩子时把遍历写对」。

## 基本术语（一张表讲完，客观题按这张考）

| 术语 | 含义 | 备注 |
|------|------|------|
| 根 / 叶 | 无父的节点 / 无子的节点 | 一棵树有且仅有一个根 |
| 父 / 子 / 兄弟 | 直接上级 / 直接下级 / 同父的孩子 | 「兄弟」不看隔壁树 |
| 深度 | 从**根**到该节点走的边数 | 根深度为 0（有书写 1，看口径） |
| 高度 | 该节点到**最深叶子**的边数 | 整棵树的高度 = 根的高度 |
| 层 | 深度相同的节点集合 | 第 1 层只有根（从此起算的口径是 1 系） |
| 节点的度 | 孩子的个数 | 树的度 = 各节点度的最大值 |
| 森林 | 互不相交的多棵树 | 删掉根就得到森林 |

「深度」「高度」这两个词最容易混：**深度从根向下数，高度从该节点向上数的极限**——整棵树的高度 = 根的深度 + 1（口径不同时等价换算，写代码前先定口径）。

## 树的存储（三种表示，各管谁）

| 表示法 | 做法 | 用在哪 |
|-------|------|--------|
| 父指针法 | 每节点存 parent，根的 parent 为空 | **并查集**（[unionfind.md](unionfind.md) 的 `fa` 数组就是它），向上爬快 |
| 孩子表示法 | 每节点存孩子的列表 | N 叉树、DFS/BFS 遍历（算法题默认形态） |
| 左孩子右兄弟 | 用二叉链表把 N 叉树「拍」成二叉树 | 一般树 ↔ 二叉树的互转，理论统一 |

面试问「怎么存一棵 N 叉树」，按上面答三行即可；**做题时默认是邻接表形态的「孩子表示法」**。

## N 叉树：遍历怎么改

N 叉树只剩**前序 / 后序**（没有「中」——没有唯一「中间」的孩子），层序照旧：

```python
class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

def preorder_n(root):                     # 递归：值，再孩子们
    if not root:
        return []
    res = [root.val]
    for child in root.children:
        res += preorder_n(child)
    return res

def preorder_n_iter(root):                # 迭代：栈，右→左压栈保证左先出
    if not root:
        return []
    stack, res = [root], []
    while stack:
        node = stack.pop()
        res.append(node.val)
        stack.extend(reversed(node.children))
    return res
```

要点只有一处：**迭代版按「右到左」倒序压栈**——栈是后进先出，想让最左的孩子先被访问，就得让它最后进。

## 前缀树 Trie（字典树）：N 叉树的杀手级应用

**Trie 是一棵「以字符为边」的树**：把一组词按「公共前缀共享路径」存起来，查「有没有以 xx 开头的词」不需要扫全部词，只按字符往下走。

```python
class TrieNode:
    def __init__(self):
        self.children = {}     # 字符 -> 子节点
        self.is_word = False   # 走到这里是否是一个完整词的终点

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
        return node is not None and node.is_word     # 前缀存在 ≠ 词存在！

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

复杂度：插入/查询 O(m)（m 为词长），**与词典里有多少词无关**——它比赛在「按前缀检索」场景里稳赢哈希表的地方就在这句话。

**手推一遍** 插入 `["apple"]`、再查 `["app", "apple", "appl"]`：

```text
root --a-- p --p-- l --e(is_word)
               └─ p ─┘                  （共享 "app" 路径）

search("app")    走得到 a-p-p，但 is_word=False → False（只是前缀）
search("apple")  走到底且 is_word=True  → True
startsWith("appl") 走得到 → True
```

适用场景（面试标准答案）：**单词接龙、自动补全、词频统计、拼写检查**；更进阶的「用 Trie 做异或问题」知道名字与定位即可。节点定义里 `children` 用 dict（任意字符）或 26 长度的数组（纯小写字母）是两种等价写法。

## 树上的通用打法（一般树与二叉树共用）

### DFS vs BFS 怎么选

| 需求 | 用谁 |
|------|------|
| 看某一层、最短步数、右视图 | BFS（队列，[patterns/bfs.md](../patterns/bfs.md)） |
| 到底了才算（路径和、深度、LCA） | DFS（递归/显式栈，[patterns/dfs.md](../patterns/dfs.md)） |
| 全遍历 | 两者都行，BFS 空间在宽树上更吃亏，DFS 在深树上递归更深 |

### 递归三要素（写任何树递归前先在草稿答出这三问）

1. **终态**：`root is None` 返回什么？（`0`? `False`? `None`? —— 不同题不同，先写死）
2. **本步做什么**：用「左右子树的返回值」这一件事描述清楚
3. **返回什么**：上一层拿什么继续算

树题 90% 的 bug 出在第 1 与第 3——「空节点该返 0 还是 -inf」没定、「该返节点还是返值」搞混。

### 迭代改写（递归深度不可控时）

树上 DFS 的迭代版通式：**显式栈 + 「白灰标记」**（见 [二叉树](binary_tree.md) 的颜色标记法），N 叉树同一套。避免 `RecursionError` 的工程兜底是 `sys.setrecursionlimit(10**5)`，但要明白治标——链状树本质就需要 O(n) 的栈深，迭代是真正的解。

## 与各专题的路网

- **[二叉树](binary_tree.md)**：遍历四序、BST、重建、LCA——树的大部分考题
- **[堆](heap.md)**：完全二叉树 + 数组存储
- **[并查集](unionfind.md)**：父指针法的极致
- **[数组的前缀与差分](array.md)**——树状数组/线段树是它的树形升级：O(log n) 的区间和与区间加，知道名字与定位即可

## 易错点总结

- 「深度」「高度」口径含糊：数字对不上多半是根深度算 0 还是 1 没统一
- N 叉树迭代遍历忘了 `reversed(children)`，孩子顺序全部走反
- Trie 的 `search` 与 `startsWith` 混写：前者要求走到**且** `is_word` 为真，后者只要走到
- 边数永远是节点数 − 1，用这个约束可以当校验器快速排错
- 考虑树的「层」「深度」时忘了空树特判（`if not root: return []`）

## 相关题目

- [589. N 叉树的前序遍历](https://leetcode.cn/problems/n-ary-tree-preorder-traversal/)
- [208. 实现 Trie (前缀树)](https://leetcode.cn/problems/implement-trie-prefix-tree/)
- [429. N 叉树的层序遍历](https://leetcode.cn/problems/n-ary-tree-level-order-traversal/)

## 相关知识点

- [二叉树](binary_tree.md)——树的大部分考题发生地
- [并查集](unionfind.md)——父指针表示法的极端用法
- [深度优先搜索](../patterns/dfs.md)、[广度优先搜索](../patterns/bfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把树的层序数组换成你自己的，逐步看
前 / 中 / 后序遍历每一步走到哪个节点。递归深度的变化也画在画面里。