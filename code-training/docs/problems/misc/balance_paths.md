---
title: 平衡路径计数
platform: 自定义
difficulty: Medium
id: balance-paths
url: ""
tags:
  - 二叉树
  - 深度优先搜索
  - 枚举
topics: []
patterns:
  - ../../patterns/dfs.md
date_added: 2025-04-30
date_reviewed: []
---

# 平衡路径计数

## 题目描述

定义二叉树的平衡路径需同时满足以下 3 个条件：

1. 路径从任意节点出发，仅能向下延伸（只能向左/右子节点，不可向上回溯）。
2. 路径上所有节点的和相加为 0。
3. 路径长度（包含的节点个数）至少为 2。

请实现一个 Python 函数，输入二叉树的根节点（按层序遍历规则构建），返回该树中所有"平衡路径"的总数。

**建树规则：** 层序遍历列表按「从上到下、从左到右」的顺序构建二叉树，`None` 表示对应位置无节点。

**路径延伸：** 从起点出发，仅沿左子节点 OR 右子节点单向向下（单链，不可分叉）。

**统计方式：** 每个符合条件的单链路径独立计数（即使路径有重叠）。

## 输入格式

- 一行：二叉树的层序遍历列表（元素为整数或 `None`，`None` 表示空节点）

## 输出格式

- 整数，表示平衡路径的总数

## 示例

### 示例 1

**输入：**
```
[10, -5, -5, 2, -2, 3, -3]
```

**输出：**
```
0
```

**说明：**
无合法路径。所有可能的路径和均不为 0。

### 示例 2

**输入：**
```
[0, 0, None]
```

**输出：**
```
1
```

**说明：**
根节点 0 → 左孩子 0，路径和为 0，长度为 2，满足条件。

### 示例 3

**输入：**
```
[1, -1, 2, -2, None, 3, -3]
```

**输出：**
```
2
```

**说明：**
两条路径：$1 \to -1$（和为 $1+(-1)=0$）和 $1 \to 2 \to -3$（和为 $1+2+(-3)=0$）。

---

## 解题思路

### 路径的两个约束：起点任意、只能向下

一条合法路径就是「某个节点出发，一直选左或一直选右走到某个后代」的一条单链。这里有两个容易混淆的点：

- **起点可以是任意节点**，不要求从根开始；
- **路径不能分叉**，走到一个节点后只能选一个孩子继续，不能同时包含左右两边。

长度至少为 2，意味着单节点路径（哪怕值是 0）不算。

### 为什么直接枚举起点，而不是只从根做一次 DFS

从根做一次 DFS 只能数到「以根为起点」的路径。要覆盖所有起点，要么对每个节点分别向下搜，要么在一次 DFS 里同时维护「以当前节点为起点」的路径和。

因为路径可以重叠、每条都要独立计数，最坏情况下合法路径数量本身就是 $O(N^2)$（比如一条长链上每个区间和都为 0）。所以 $O(N \cdot H)$ 的枚举不是「暴力凑数」，而是这个问题在一般树上的自然做法；不存在一个对所有树都线性的通用公式。

### 对每个起点做一次向下 DFS

对起点 `start`，栈里维护三元组 `(当前节点, 从 start 到当前节点的和, 路径长度)`：

```python
def count_from(start):
    total = 0
    stack = [(start, start.val, 1)]       # 起点自己算长度 1
    while stack:
        node, cur_sum, length = stack.pop()
        if length >= 2 and cur_sum == 0:  # 先判断当前链是否合法
            total += 1
        if node.left:
            stack.append((node.left, cur_sum + node.left.val, length + 1))
        if node.right:
            stack.append((node.right, cur_sum + node.right.val, length + 1))
    return total
```

外层再遍历所有节点，把每个节点都当作一次起点：

```python
def count_balance_paths(root):
    if not root:
        return 0

    # 先收集所有节点（层序），它们都可能是一条路径的起点
    nodes, q = [], deque([root])
    while q:
        cur = q.popleft()
        nodes.append(cur)
        if cur.left:
            q.append(cur.left)
        if cur.right:
            q.append(cur.right)

    return sum(count_from(start) for start in nodes)
```

`length >= 2` 必须在**进入节点之后**判断：起点自己长度是 1，不能算；每往孩子走一步，才把长度加 1。把判断放到压栈之前或只看「有没有走边」，都会漏掉或多算。

### 建树：`None` 也要占一个位置

层序列表里的 `None` 不是「跳过」，而是「这个位置没有节点」。用队列保存「还有空位待填」的节点，每遇到一个 `None` 就消耗一个位置，但不入队：

```python
def build_tree(level_order):
    if not level_order or level_order[0] is None:
        return None

    root = TreeNode(level_order[0])
    q = deque([root])
    i = 1
    while q and i < len(level_order):
        node = q.popleft()

        if i < len(level_order):
            if level_order[i] is not None:
                node.left = TreeNode(level_order[i])
                q.append(node.left)
            i += 1

        if i < len(level_order):
            if level_order[i] is not None:
                node.right = TreeNode(level_order[i])
                q.append(node.right)
            i += 1

    return root
```

每次无论值是不是 `None`，`i` 都要加 1；只有非 `None` 才创建节点并入队。忘记推进 `i` 会让后面的值全部错位。

---

## 完整代码实现

```python
"""
平衡路径计数 - 二叉树 DFS

输入格式：
- 一行：二叉树的层序遍历列表（元素为整数或None）

输出格式：
- 整数，表示平衡路径的总数
"""

import sys
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(level_order):
    """根据层序遍历列表构建二叉树，返回根节点"""
    if not level_order or level_order[0] is None:
        return None
    root = TreeNode(level_order[0])
    queue = deque([root])
    i = 1
    n = len(level_order)
    while queue and i < n:
        node = queue.popleft()
        # 左孩子
        if i < n and level_order[i] is not None:
            node.left = TreeNode(level_order[i])
            queue.append(node.left)
        i += 1
        # 右孩子
        if i < n and level_order[i] is not None:
            node.right = TreeNode(level_order[i])
            queue.append(node.right)
        i += 1
    return root

def count_balance_paths(root):
    """统计所有平衡路径的个数"""
    if not root:
        return 0
    total = 0
    # 层序遍历收集所有节点（作为路径起点）
    nodes = []
    q = deque([root])
    while q:
        cur = q.popleft()
        nodes.append(cur)
        if cur.left:
            q.append(cur.left)
        if cur.right:
            q.append(cur.right)

    # 对每个起点，向下DFS统计合法路径
    for start in nodes:
        stack = [(start, start.val, 1)]  # (当前节点, 从起点到当前节点的和, 路径长度)
        while stack:
            node, cur_sum, length = stack.pop()
            # 长度>=2且和为0，计数
            if length >= 2 and cur_sum == 0:
                total += 1
            if node.left:
                stack.append((node.left, cur_sum + node.left.val, length + 1))
            if node.right:
                stack.append((node.right, cur_sum + node.right.val, length + 1))
    return total

if __name__ == "__main__":
    line = sys.stdin.readline().strip()
    if not line:
        print(0)
    else:
        level_order = eval(line)
        root = build_tree(level_order)
        result = count_balance_paths(root)
        print(result)
```

---

## 示例推演

以示例 3 的 `[1, -1, 2, -2, None, 3, -3]` 为例，建出的树是：

```text
        1
       / \
     -1   2
     /   / \
   -2   3  -3
```

所有节点依次作为起点：

**起点 1**

- `1 → -1`：和 `0`，长度 2 ✓
- `1 → -1 → -2`：和 `-2`，不满足
- `1 → 2`：和 `3`，不满足
- `1 → 2 → 3`：和 `6`，不满足
- `1 → 2 → -3`：和 `0`，长度 3 ✓

**起点 -1**

- `-1 → -2`：和 `-3`，不满足

**起点 2**

- `2 → 3`：和 `5`，不满足
- `2 → -3`：和 `-1`，不满足

`-2`、`3`、`-3` 都没有孩子，凑不出长度 ≥ 2 的路径。

合计 2 条，与输出一致。

再看示例 1 的 `[10, -5, -5, 2, -2, 3, -3]`：根 10 出发的链有 `10-5=5`、`10-5-2=3`、`10-5-(-2)=3`、`10-5-3=2`、`10-5-(-3)=2`，没有 0；其余起点也都凑不出，所以输出 0。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 枚举起点 + 向下 DFS | O(N×H) | O(N) | 每个起点最多走它的子树高度；`N` 为节点数，`H` 为树高 |
| 单链上的前缀和 | O(N) | O(N) | 只适用于没有分叉的链，不能直接推广到一般树 |

> 最坏情况是链状树，`H = N`，退化成 `O(N²)`；平衡树上是 `O(N log N)`。

---

## 易错点总结

1. **建树时遇到 `None` 不推进下标**：`None` 也要消耗一个层序位置，只是不创建节点。漏掉 `i += 1` 会让后面的左右孩子全部挂错位置，示例 2 会建出一棵只有一个节点的树。
2. **`length >= 2` 在起点就判断**：起点长度是 1，若在压栈前判断，单节点 `0` 会被算成一条路径；示例 2 会输出 2 而不是 1。必须在弹出节点后、用当前链的长度判断。
3. **只从根做一次 DFS**：那样只能数到以根为起点的路径。示例 3 的两条路径起点都是 1，看似没问题，但换成 `[5, 0, 0]` 时，`0 → ...` 的路径会全部漏掉。

---

## 扩展思考

- **单链上的前缀和**：如果树退化成一条链，可以用前缀和 + 哈希表在 `O(N)` 内统计「和为目标值」的区间；但一般树有分叉，路径必须单向，前缀和不能直接跨分支复用。
- **允许向上回溯**：问题会变成「树上任意两点间的路径和为 0」，那就需要点分治或前缀和 + LCA，和本题不是同一个难度。

---

## 相关题目

- [最大传播链](max_propagation_chain.md) — 图上的最长路径
