---
title: 3493. 属性图
platform: LeetCode
difficulty: Medium
id: 3493
url: https://leetcode.cn/problems/properties-graph/
tags:
  - 并查集
  - 图
  - 数组
  - 哈希表
topics: []
patterns: []
date_added: 2026-10-27
date_reviewed: []
---

# 3493. 属性图

## 题目描述

给你一个二维整数数组 `properties`，其维度为 `n x m`，其中 `properties[i][j]` 表示第 `i` 个节点的第 `j` 个属性值。每个节点都有 `m` 个属性。

如果两个节点的属性之间存在 **至少一个公共属性值**，则它们之间存在一条边。

创建一个有 `n` 个节点的无向图 `G`，其中节点 `i` 和节点 `j` 之间有边当且仅当 `properties[i]` 和 `properties[j]` 之间存在至少一个公共属性值。

返回图 `G` 中 **连通分量** 的数量。

**示例 1：**

```
输入：properties = [[1,2],[1,3],[2,3]], n = 3, m = 2
输出：1
解释：
节点 0 的属性为 [1,2]。
节点 1 的属性为 [1,3]。
节点 2 的属性为 [2,3]。
节点 0 与 1 有公共属性 1，节点 1 与 2 有公共属性 3，节点 0 与 2 有公共属性 2。因此，图中所有节点都相互连通，连通分量为 1。
```

**示例 2：**

```
输入：properties = [[1,2],[3,4],[5,6]], n = 3, m = 2
输出：3
解释：
没有节点之间有公共属性，因此每个节点都是一个单独的连通分量。
```

**提示：**

- `1 <= n <= 100`
- `1 <= m <= 100`
- `1 <= properties[i][j] <= 100`

## 解题思路

### 问题分析

- `n` 个节点，每个节点有 `m` 个属性。节点之间有边的条件是**属性列表中存在至少一个公共属性值**。
- 求图 `G` 的连通分量数量。
- `n <= 100`，`m <= 100`，`properties[i][j] <= 100`。注意 `n` 很小（100），这意味着图最多有 100 个节点。`n<=100` 意味着图的边数最多 `C(100,2)=4950`，用 `O(n^2 * something)` 是完全可以接受的（`n^2` 已经 10^4，乘上 `m` 也只有 10^6 量级）。

### 为什么用并查集

既然 `n` 较小，最直接的思路是：两两检查节点之间是否有公共属性值，有就合并。检查两个列表是否有交集最简单的方式是用集合，`O(m)` 每次配对，`O(n^2 m)` 总体足够。

也可以换个思路：以**属性值**为桥，把「拥有同一个属性值的所有节点」都连到一起。由于属性值范围也不大（<=100），可以用并查集把所有出现过该属性值的节点都合并到同一个集合。最终同一个连通分量里的所有节点都能通过某个属性值串联起来。

两种思路都可行，前者思路更直接也容易实现。

### 实现要点

- 初始化并查集，节点数 `n`。
- 两重循环枚举 `(i,j)`，对于每对节点，把它们的属性列表转成集合，若交集非空则 `merge(i,j)`。
- 遍历所有节点，统计不同的根的个数即连通分量数。

## 完整代码实现

```python
from typing import List

class UnionFind:
    def __init__(self, n):
        self.fa = list(range(n))
        self.size = [1] * n

    def find(self, x):
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])
        return self.fa[x]

    def merge(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        return True


class Solution:
    def numberOfComponents(self, properties: List[List[int]], n: int) -> int:
        uf = UnionFind(n)
        for i in range(n):
            s1 = set(properties[i])
            for j in range(i + 1, n):
                for val in properties[j]:
                    if val in s1:
                        uf.merge(i, j)
                        break
        ans = set()
        for i in range(n):
            ans.add(uf.find(i))
        return len(ans)


```

## 示例推演

**示例 1：** `properties = [[1,2],[1,3],[2,3]]`, `n=3`

- `i=0, s1={1,2}`
  - `j=1`：遍历 `properties[1]`，发现 `1 in s1`，合并 0 和 1
  - `j=2`：遍历 `properties[2]`，发现 `2 in s1`，合并 0 和 2
- 所有节点同根，连通分量数 1

**示例 2：** `[[1,2],[3,4],[5,6]]`，三组属性完全不相交，三条边都没建成，三个连通分量，答案 3

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 两两检查+并查集（最优） | O(n^2 m) | O(n + m) | n,m <= 100，n^2*m <= 10^6，足够 |

## 易错点总结

- **统计连通分量**：不能只数「有多少次合并成功」，要统计所有节点的根有多少个不同的值。合并失败的边（已连通）不会让根的数量减少，拿合并次数当答案会偏大。

## 扩展思考

如果 `n` 更大（比如 10^4），两两检查就会太慢。那时可以改用「属性值 -> 节点列表」的映射：对于每个属性值，收集所有拥有它的节点列表，把列表里的所有节点两两合并，或者直接把它们都合并到列表的第一个节点即可。
