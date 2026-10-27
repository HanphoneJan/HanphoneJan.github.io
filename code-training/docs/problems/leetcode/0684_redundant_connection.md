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

### 问题分析

- 原图是「一棵树 + 一条边」的结果：树有 `n` 个节点、`n-1` 条边且连通无环，加一条边后变成 `n` 个节点、`n` 条边的连通图，且恰好多出一个环。
- 题目要求找出**可以删去的边**，使得剩余图是一棵有 `n` 个节点的树。若有多个答案，返回数组 `edges` 中**最后出现的那个**。
- 对于无向图来说，树的定义是连通且无环。多余的边一定是**连接了已经连通的两个节点**的那条边，它会构成环。

### 为什么用并查集

并查集天然适合处理「动态连通性」和「环检测」。遍历 `edges`，对于每条边 `(u,v)`，如果 `u` 和 `v` 已经在同一个集合中，说明在之前的边已经把它们连通，这条边正好闭合了环，且由于是按顺序遍历的，**最后一个**使得 `find(u)==find(v)` 的边就是答案。

### 实现要点

- 节点编号从 `1` 到 `n`，按 `edges` 长度初始化并查集（`n = len(edges)`）。
- 顺序遍历每条边：若合并失败（已同集）则记录这条边，继续遍历（题目要求若有多个答案返回**最后出现的那个**）。
- 遍历结束返回最后记录的那条边。

## 完整代码实现

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

## 示例推演

**示例 1：** `edges = [[1,2],[1,3],[2,3]]`，`n=3`

1. 边 `[1,2]`：1 和 2 不同集，合并成功
2. 边 `[1,3]`：1 和 3 不同集，合并成功（此时 1、2、3 已连通）
3. 边 `[2,3]`：`find(2) == find(3)`，合并失败，记录 `[2,3]`

返回 `[2,3]`，删除后剩下 `[[1,2],[1,3]]` 是一棵树。

**示例 2：** `edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]`，`n=5`

1. `[1,2]` 合并成功
2. `[2,3]` 合并成功
3. `[3,4]` 合并成功（1-2-3-4 连通）
4. `[1,4]`：`find(1)==find(4)`，合并失败，记录 `[1,4]`
5. `[1,5]` 合并成功

返回 `[1,4]`。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 并查集（最优） | O(m α(n)) | O(n) | m = n 条边，α(n) 极小 |

## 易错点总结

- **初始化范围**：节点编号可能从 1 开始，且最大节点编号等于 `n`。并查集要初始化到 `n` 而不是 `len(edges)`，否则节点 `n` 无法创建父节点数组项。
- **忘记返回最后一条**：题目说「如果有多个答案，则返回数组 `edges` 中最后出现的那个」。循环中只要合并失败就更新 `ans`，不要在第一次失败时就返回。
- **无向图的处理**：每条边都是无向边，直接对 `(u,v)` 调用 `merge` 即可，不需要区分方向。

## 扩展思考

如果是有向图判环，不能简单用并查集。常用方法是 DFS 三色标记（白/灰/黑）或者拓扑排序（针对 DAG 的入度法），思路和无向图完全不同。
