---
title: 除法求值
platform: LeetCode
difficulty: Medium
id: 399
url: https://leetcode.cn/problems/evaluate-division/
tags:
  - 图
  - 并查集
  - 并查集
date_added: 2026-04-24
---

# 399. 除法求值

## 题目描述

给你一个变量对数组 `equations` 和一个实数值数组 `values` 作为已知条件，其中 `equations[i] = [Ai, Bi]` 和 `values[i]` 共同表示等式 `Ai / Bi = values[i]` 。

给定一个查询数组 `queries`，其中 `queries[j] = [Cj, Dj]` 表示第 `j` 个查询。求解 `Cj / Dj = ?` 。

如果不存在确定的答案，返回 `-1.0` 。

## 示例

**示例 1：**
```
输入：equations = [["a","b"],["b","c"]], values = [2.0,3.0],
      queries = [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]]
输出：[6.0, 0.5, -1.0, 1.0, -1.0]
```

---

## 解题思路

### 第一步：理解问题本质

把每个变量看作图中的节点，等式看作带权边。`a / b = 2` 表示从 `a` 到 `b` 有一条权值为 `2` 的边。

查询 `a / c` 等价于找从 `a` 到 `c` 的路径上所有权值的乘积。

### 第二步：DFS/BFS 解法

对每个查询，从起点开始做 DFS/BFS，找到达终点的路径，计算路径权值乘积。

**缺点**：每次查询都需要重新搜索，效率低。

### 第三步：并查集解法（最优）

**核心洞察**：
- 并查集可以维护节点的连通性
- 带权并查集额外维护每个节点到根节点的权重
- 路径压缩时同步更新权重

---

## 完整代码实现

```python
from typing import List


class UnionFind:
    """带权并查集"""

    def __init__(self, n: int):
        self.parent = [i for i in range(n)]
        self.weight = [1.0] * n  # weight[i] = i / parent[i]

    def find(self, x: int) -> int:
        if x != self.parent[x]:
            origin = self.parent[x]
            self.parent[x] = self.find(self.parent[x])
            self.weight[x] *= self.weight[origin]
        return self.parent[x]

    def union(self, x: int, y: int, value: float) -> None:
        """合并，已知 x / y = value"""
        rootX = self.find(x)
        rootY = self.find(y)
        if rootX == rootY:
            return

        self.parent[rootX] = rootY
        # weight[rootX] * weight[x] = value * weight[y]
        # => weight[rootX] = value * weight[y] / weight[x]
        self.weight[rootX] = self.weight[y] * value / self.weight[x]

    def is_connected(self, x: int, y: int) -> float:
        rootX = self.find(x)
        rootY = self.find(y)
        if rootX == rootY:
            return self.weight[x] / self.weight[y]
        return -1.0


class Solution:
    """
    除法求值 - 并查集

    时间复杂度：O((E + Q) * alpha(N))
    空间复杂度：O(N)
    """

    def calcEquation(self, equations: List[List[str]], values: List[float],
                     queries: List[List[str]]) -> List[float]:
        n = len(equations)
        uf = UnionFind(2 * n)

        # 变量映射到 id
        id_map = {}
        id_counter = 0

        for (a, b), val in zip(equations, values):
            if a not in id_map:
                id_map[a] = id_counter
                id_counter += 1
            if b not in id_map:
                id_map[b] = id_counter
                id_counter += 1
            uf.union(id_map[a], id_map[b], val)

        # 处理查询
        res = []
        for a, b in queries:
            if a not in id_map or b not in id_map:
                res.append(-1.0)
            else:
                res.append(uf.is_connected(id_map[a], id_map[b]))
        return res
```

---

## 示例推演

以 `equations = [["a","b"],["b","c"]], values = [2.0,3.0]` 为例：

**构建并查集**：

| 步骤 | 操作 | parent | weight |
|------|------|--------|--------|
| 初始 | - | [0,1,2,3] | [1,1,1,1] |
| 1 | union(a,b,2) | [1,1,2,3] | [2,1,1,1] |
| 2 | union(b,c,3) | [1,2,2,3] | [2,3,1,1] |

**查询 `a / c`**：
- find(a): parent[a]=1, weight[a]=2; parent[1]=2, weight[1]=3
- 路径压缩后：parent[a]=2, weight[a]=2*3=6
- find(c): parent[c]=2, weight[c]=1
- a / c = weight[a] / weight[c] = 6 / 1 = 6.0

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| DFS/BFS | O(Q * (V + E)) | O(V + E) | 每次查询搜索 |
| **并查集（最优）** | **O((E+Q) * alpha(N))** | **O(N)** | 近乎常数 |

---

## 易错点总结

### 1. 并查集权重更新

路径压缩时，需要同步更新 `weight`：`self.weight[x] *= self.weight[origin]`

### 2. union 时的权重推导

`weight[rootX] = value * weight[y] / weight[x]`，需要仔细推导。

---

## 相关题目

- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- [684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)
