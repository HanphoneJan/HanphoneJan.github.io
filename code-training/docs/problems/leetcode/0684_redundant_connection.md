---
title: 684. 冗余连接
platform: LeetCode
difficulty: Medium
id: 684
url: https://leetcode.cn/problems/redundant-connection/
tags:
  - 深度优先搜索
  - 广度优先搜索
  - 并查集
  - 图
topics: []
patterns:
  - ../../patterns/dfs.md
  - ../../patterns/bfs.md
date_added: 2026-10-27
date_reviewed: []
---

# 684. 冗余连接

## 题目描述

树可以看成是一个连通且 **无环** 的 **无向** 图。

给定一个图，该图从一棵 `n` 个节点 (节点值 `1～n`) 的树中添加一条边后获得。添加的边的两个不同顶点编号在 `1` 到 `n` 中间，且这条附加的边不属于树中已存在的边。图的信息记录于长度为 `n` 的二维数组 `edges` ，`edges[i] = [a_i, b_i]` 表示图中在 `a_i` 和 `b_i` 之间存在一条边。

请找出一条可以删去的边，删除后可使得剩余部分是一个有着 `n` 个节点的树。如果有多个答案，则返回数组 `edges` 中最后出现的那个。

**示例 1：**

```
输入: edges = [[1,2], [1,3], [2,3]]
输出: [2,3]
```

**示例 2：**

```
输入: edges = [[1,2], [2,3], [3,4], [1,4], [1,5]]
输出: [1,4]
```

**提示：**

- `n == edges.length`
- `3 <= n <= 1000`
- `edges[i].length == 2`
- `1 <= a_i < b_i <= edges.length`
- `a_i != b_i`
- `edges` 中无重复元素
- 给定的图是连通的

## 解题思路

### 图里到底有几个环

题面给的图 = 「一棵 `n` 节点的树」+「一条额外的边」。树有 `n-1` 条边、连通、无环；加一条边后变成 `n` 个节点、`n` 条边、仍然连通，于是**恰好出现一个环**。

删掉环上任意一条边，剩下的图都还是「`n` 个节点、`n-1` 条边、连通」——也就是树。所以「可以删的边」不唯一，题面要的是环上**在 `edges` 里出现得最晚**的那条。

### 关键观察：什么时候这条边是冗余的

按输入顺序把边一条条加进图里，维护「谁和谁连通」。当加入边 `(u, v)` 时，如果 `u` 和 `v` **已经连通**，那么这条边一落地就闭合了一个环 —— 它必然是多余的。

而它也正是「最后出现的那条环边」：为了让 `u`、`v` 在加入这条边之前就已经连通，环上其它边必须**全都排在它前面**。这一条把题面那句「返回最后出现的那个」直接消掉了，不需要额外比较。

还有一个可直接核对的数量关系：`n` 个节点连通需要 `n-1` 次成功合并，而边一共 `n` 条，所以整趟遍历里**恰好有 1 条边**合并失败。答案唯一，代码里写「记录最后一次失败」与「第一次失败就返回」结果相同，但前者更贴合题意，也不会在读错题（比如 685 题）时出岔子。

### 方法一：并查集

并查集管的就是「动态连通性」：只加边、不删边、随时问「两点是否连通」。`merge(u, v)` 的返回值正好是这题的判定条件 —— 返回 `False` 表示两端本来就在一个集合里。

```python
from typing import List

class UnionFind:
    def __init__(self, n: int):
        self.fa = list(range(n + 1))     # 节点编号 1..n，多开一格
        self.size = [1] * (n + 1)

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])   # 路径压缩
        return self.fa[x]

    def merge(self, x: int, y: int) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False                 # 已经连通 -> 这条边闭合了环
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx              # 按大小合并，树高控制在 O(log n)
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        return True


class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        uf = UnionFind(len(edges))
        ans = []
        for u, v in edges:
            if not uf.merge(u, v):       # 合并失败 = 两端已连通
                ans = [u, v]
        return ans
```

三处对应关系要看清：

- `list(range(n + 1))`：节点编号是 `1~n`，下标 `0` 空着不用。少开一格，碰到编号 `n` 的边就 `IndexError`。
- `if rx == ry: return False`：合并失败的原因只有一个 —— 两端同根。
- `ans = [u, v]` 而不是 `return [u, v]`：继续遍历，把「最后一次失败」留下来（本题恰好只有一次失败，两种写法结果一样）。

`find` 里的路径压缩让同一棵树上连续查询接近常数；`size` 决定谁挂在谁下面，避免退化成一条链。两个一起用，单次操作的摊还复杂度是 `O(α(n))`，`α` 是反阿克曼函数，在任何现实的 `n` 下都不超过 4。

### 方法二：逐步加边 + DFS 判连通

如果不想写并查集，可以换个更直白的做法：维护一张邻接表，只放「已经确认属于树」的边。每来一条边 `(u, v)`，先问「在现有邻接表里 `u` 能不能走到 `v`」——能走到，这条边就是冗余的；走不到，就把它加进邻接表。

```python
from typing import List

class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        n = len(edges)
        graph = [[] for _ in range(n + 1)]

        def reachable(src: int, dst: int) -> bool:
            stack, seen = [src], {src}
            while stack:
                u = stack.pop()
                if u == dst:
                    return True
                for w in graph[u]:
                    if w not in seen:
                        seen.add(w)
                        stack.append(w)
            return False

        ans = []
        for u, v in edges:
            if reachable(u, v):
                ans = [u, v]                  # 两端已连通 -> 闭合了环
            else:
                graph[u].append(v)            # 双向边，两个方向都要加
                graph[v].append(u)
        return ans
```

判的是「`u` 到 `v` 有没有路径」，所以这张图必须是**无向**的：两条 `append` 缺一不可。被判为冗余的那条边也不再往图里加 —— 它的两端本来就连通，加进去不改变任何连通性，只是让图里凭空多出一个环。

### 两种写法怎么选

| | 并查集 | 逐步加边 + DFS |
|---|---|---|
| 每次判定 | 两次 `find`，接近 `O(1)` | 一次 `O(n)` 的遍历 |
| 总时间 | `O(n α(n))` | `O(n²)` |
| 代码量 | 一个辅助类 | 一个 20 行的函数 |
| 适合 | 规模大、或后续还要连着问连通性 | `n` 很小、想少写一个类 |

`n ≤ 1000` 时 `O(n²)` 只有一百万次访问，DFS 版完全够快，而且不用维护 `fa` / `size` 两组状态。并查集的优势在「边一多就显现」——`10^5` 条边时，DFS 版每次都要重走一遍已经建好的大图，直接超时。

---

## 完整代码实现

并查集版（基准实现）：

```python
from typing import List

class UnionFind:
    def __init__(self, n: int):
        self.fa = list(range(n + 1))
        self.size = [1] * (n + 1)
        self.cc = n

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])
        return self.fa[x]

    def merge(self, x: int, y: int) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        self.cc -= 1
        return True


class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        n = len(edges)
        uf = UnionFind(n)
        ans = []
        for u, v in edges:
            if not uf.merge(u, v):
                ans = [u, v]
        return ans
```

> `cc` 是连通块计数，本题没有读取它：它初始化成 `n`（编号 `1~n` 共 `n` 个点），成功合并 `n-1` 次后正好降到 `1`，可以拿来印证「整趟只有一条边合并失败」。

---

## 示例推演

**示例 1：** `edges = [[1,2], [1,3], [2,3]]`，`n = 3`，并查集初始 `fa = [0, 1, 2, 3]`。

| 处理 | `find(u)` / `find(v)` | 合并？ | 并查集变化 | `ans` |
|---|---|---|---|---|
| `[1,2]` | `1` / `2` | 成功 | `fa[2] = 1`，`size[1] = 2` | `[]` |
| `[1,3]` | `1` / `3` | 成功 | `fa[3] = 1`，`size[1] = 3` | `[]` |
| `[2,3]` | `1` / `1` | 失败 | 不变 | `[2,3]` |

最后一条边两端同根（`2 → 1`、`3 → 1`），说明它闭合了 `1-2-3-1` 这个环。删掉它剩下的 `[[1,2],[1,3]]` 是一棵 3 节点的树。

**示例 2：** `edges = [[1,2], [2,3], [3,4], [1,4], [1,5]]`，`n = 5`。

| 处理 | `find(u)` / `find(v)` | 合并？ | 并查集变化 | `ans` |
|---|---|---|---|---|
| `[1,2]` | `1` / `2` | 成功 | `fa[2] = 1` | `[]` |
| `[2,3]` | `1` / `3` | 成功 | `fa[3] = 1` | `[]` |
| `[3,4]` | `1` / `4` | 成功 | `fa[4] = 1` | `[]` |
| `[1,4]` | `1` / `1` | 失败 | 不变 | `[1,4]` |
| `[1,5]` | `1` / `5` | 成功 | `fa[5] = 1` | `[1,4]` |

`[1,4]` 闭合了环 `1-2-3-4-1`；后面那条 `[1,5]` 是树上的真实边（节点 5 只在这里出现），合并成功，所以 `ans` 保持不变。最终返回 `[1,4]`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐步加边 + DFS | O(n^2) | O(n) | 每条边都要重走一遍已建好的子图 |
| 并查集（最优） | O(m α(n)) | O(n) | `m` 条边，路径压缩 + 按大小合并，α 实际不超过 4 |

> 本题 `m = n`（边数等于节点数），所以并查集是 `O(n α(n))`，几乎是线性的。DFS 版的 `O(n²)` 在 `n ≤ 1000` 时也够用。

---

## 易错点总结

1. **并查集初始化成 `list(range(n))`**：节点编号是 `1~n`，少开一格后处理到编号 `n` 的边就崩。示例 2 里第 5 条边是 `[1,5]`、`n = 5`，`fa[5]` 直接 `IndexError: list index out of range`（`n = 3` 的示例 1 反而跑得通）。
2. **`merge` 的返回值用反**：把 `if not uf.merge(u, v)` 写成 `if uf.merge(u, v)`，记录的就成了「每一次成功合并」，`ans` 会停在最后一条成功边（示例 1 返回 `[1,3]`），而真正冗余的 `[2,3]` 被丢掉。
3. **DFS 版只加单向边**：`graph[u].append(v)` 写了、`graph[v].append(u)` 漏了，图就成了有向的。示例 1 里处理 `[2,3]` 时从 `2` 出发根本走不到 `3`，答案变成 `[]`（连长度都不对）。

---

## 扩展思考

- **剥叶子法（`O(n)`）**：反复删掉度数为 1 的节点，最后留下的节点都在环上；再从后往前扫 `edges`，第一条两端的度数都 `> 1` 的边就是答案。它不需要并查集，也不重建图，但「最后出现的环边」这一步要自己从后往前找。
- **685 题（冗余连接 II）**：换成有向图后，冗余边有两种形态 —— 「某个点入度为 2」或「一个纯环」。判据变成「先检查入度为 2 的候选，再看删掉之后是否仍连通」，只靠并查集不够，DFS 三色标记或拓扑排序也要上场。

---

## 相关题目

- [685. 冗余连接 II](https://leetcode.cn/problems/redundant-connection-ii/)
- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- [990. 等式方程的可满足性](https://leetcode.cn/problems/satisfiability-of-equality-equations/)
