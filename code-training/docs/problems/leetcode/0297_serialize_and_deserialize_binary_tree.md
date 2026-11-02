---
title: 297. 二叉树的序列化与反序列化
platform: LeetCode
difficulty: Hard
id: 297
url: https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/
tags:
  - 树
  - 广度优先搜索
  - 设计
  - 深度优先搜索
  - 字符串
  - 二叉树
topics: []
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
date_added: 2026-04-24
date_reviewed: []
---

# 297. 二叉树的序列化与反序列化

## 题目描述

设计 `serialize` 与 `deserialize`，把一棵二叉树转成字符串，再从该字符串还原出结构完全相同的树。序列化格式不限，只要两个函数互逆。

## 示例

### 示例 1

**输入：** root = [1,2,3,null,null,4,5]
**输出：** [1,2,3,null,null,4,5]

### 示例 2

**输入：** root = []
**输出：** []

## 解题思路

### 路线：把「空位」也写进序列

只记节点值不够。`[1,2]`（2 是左孩子）与 `[1,null,2]`（2 是右孩子）的前序遍历都是 `1,2`，光看这串数分不出左右。缺的不是节点，而是**空位**：某个节点的左孩子为空、右孩子为空，这件事必须留下痕迹。

把空位写成 `"null"` 之后，前序或层序都能唯一还原：读到一个值时建节点，读到 `"null"` 就返回空，序列与树一一对应。两种遍历的差别只在「先补哪个空位」的顺序。

### 手法一：前序 DFS

序列化就是前序遍历，遇到空节点写 `"null"`：

```python
def serialize(root):
    out = []
    def dfs(node):
        if not node:
            out.append("null")
            return
        out.append(str(node.val))   # 根
        dfs(node.left)              # 左
        dfs(node.right)             # 右
    dfs(root)
    return ",".join(out)
```

反序列化必须**按同一个顺序消费**这串值。用一个迭代器，每次 `next` 取一个：

```python
def deserialize(data):
    vals = iter(data.split(","))
    def dfs():
        v = next(vals)
        if v == "null":
            return None
        node = TreeNode(int(v))
        node.left = dfs()           # 紧接着的值属于左子树
        node.right = dfs()          # 左子树吃完，才轮到右子树
        return node
    return dfs()
```

`dfs()` 的返回顺序与写入顺序严格对应，所以不需要额外记录「当前处理到第几个」——迭代器本身就是那个位置。

### 手法二：BFS 层序

层序把「每个节点的两个孩子」按队列顺序排开，空孩子写 `"null"`：

```python
def serialize(root):
    if not root:
        return "[]"
    q, out = deque([root]), []
    while q:
        node = q.popleft()
        if node:
            out.append(str(node.val))
            q.append(node.left)     # 空孩子也进队，下一步会写成 null
            q.append(node.right)
        else:
            out.append("null")
    return "[" + ",".join(out) + "]"
```

反序列化时，队列里存「已经建好、等着接孩子」的节点；每出队一个，就从序列里取两个值分别当它的左右孩子：

```python
def deserialize(data):
    if data == "[]":
        return None
    vals = data[1:-1].split(",")
    root = TreeNode(int(vals[0]))
    q, i = deque([root]), 1
    while q:
        node = q.popleft()
        if vals[i] != "null":
            node.left = TreeNode(int(vals[i]))
            q.append(node.left)
        i += 1
        if vals[i] != "null":
            node.right = TreeNode(int(vals[i]))
            q.append(node.right)
        i += 1
    return root
```

每个非空节点出队时消耗两个位置（左、右），空节点不产生孩子。序列是层序写出来的，读取也按层序，父子关系天然对齐。

### 推演：示例 1 的两条序列

树是 `1`，左孩子 `2`，右孩子 `3`；`3` 的左 `4`、右 `5`。

- **前序**：`1,2,null,null,3,4,null,null,5,null,null`。读回时：`1` 建根 → 左子树读 `2,null,null` 得叶子 2 → 右子树读 `3,4,null,null,5,null,null`，还原出 3 的两个孩子。
- **层序**：`[1,2,3,null,null,4,5,null,null,null,null]`。队列依次处理 `1`（接 2、3）、`2`（两个 null）、`3`（接 4、5），剩下四个 null 不再产生孩子。

两条序列不同，但都能还原出同一棵树——格式不是重点，**空位有没有被记下来**才是。

## 完整代码实现

```python
from collections import deque


class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None


class Codec:
    def serialize(self, root):
        """层序序列化：空孩子也写成 null。"""
        if not root:
            return "[]"
        q = deque([root])
        out = []
        while q:
            node = q.popleft()
            if node:
                out.append(str(node.val))
                q.append(node.left)
                q.append(node.right)
            else:
                out.append("null")
        return "[" + ",".join(out) + "]"

    def deserialize(self, data):
        """按同样的层序重建：每个非空节点消费两个值。"""
        if data == "[]":
            return None
        vals = data[1:-1].split(",")
        root = TreeNode(int(vals[0]))
        q = deque([root])
        i = 1
        while q:
            node = q.popleft()
            if vals[i] != "null":
                node.left = TreeNode(int(vals[i]))
                q.append(node.left)
            i += 1
            if vals[i] != "null":
                node.right = TreeNode(int(vals[i]))
                q.append(node.right)
            i += 1
        return root
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 前序 DFS | O(n) | O(n) | 每个节点与空位各访问一次；递归栈最深为树高 |
| 层序 BFS（最优） | O(n) | O(n) | 队列最多同时装一层节点；序列长度与节点数同阶 |

`n` 是节点数。序列长度会略大于 `n`（空位也要写），但仍是线性。

## 易错点总结

### 1. 只写节点值、不写空位

`[1,2]` 与 `[1,null,2]` 的前序都是 `"1,2"`。反序列化按「先左后右」读，第二棵树会被还原成第一棵——两棵树的前序相同，缺了空位就无法区分。所有空孩子都必须落成 `"null"`。

### 2. 反序列化时反复读同一个位置

DFS 版用 `vals[0]` 而不用迭代器（或每次递归重新 `split`），读到根之后位置不前进，同一个值会被当成左孩子、再当成右孩子，最终在非空值上无限递归，报 `RecursionError`。位置必须由**一个共享的迭代器或下标**推进，左右子树按调用顺序消费。

### 3. BFS 反序列化每个节点只取一个值

层序里一个非空节点对应「左、右」两个位置。只取一个就跳过了右孩子，下一个节点会接到错误的位置上；`1,2,3` 这种满两层的小树会变成一条左链。`i` 在左右各加一次，这个「两次」不能省。

## 扩展思考

- **压缩末尾空位**：BFS 序列末尾常有一串 `"null"`（叶子节点的孩子）。记录非空节点数或去掉末尾 null 都能缩短序列，代价是反序列化要多一个边界判断。
- **N 叉树**：每个节点除了值，还要写「有几个孩子」，再依次写孩子；空位规则与二叉树一致。

## 相关题目

- [449. 序列化和反序列化二叉搜索树](https://leetcode.cn/problems/serialize-and-deserialize-bst/)：可利用 BST 的大小关系省掉空位
- [428. 序列化和反序列化 N 叉树](https://leetcode.cn/problems/serialize-and-deserialize-n-ary-tree/)：每个节点记录孩子数量
