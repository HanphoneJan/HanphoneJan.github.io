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

给你一个二维整数数组 `properties`，其维度为 `n x m`，以及一个整数 `k`。

定义一个函数 `intersect(a, b)`，它返回数组 `a` 和 `b` 中**共有的不同整数**的数量。

构造一个**无向图**，其中每个索引 `i` 对应 `properties[i]`。如果且仅当 `intersect(properties[i], properties[j]) >= k`（其中 `i` 和 `j` 的范围为 `[0, n - 1]` 且 `i != j`），节点 `i` 和节点 `j` 之间有一条边。

返回结果图中**连通分量**的数量。

**提示：**

- `1 <= n == properties.length <= 100`
- `1 <= m == properties[i].length <= 100`
- `1 <= properties[i][j] <= 100`
- `1 <= k <= m`

## 示例

### 示例 1

**输入：** properties = [[1,2],[1,1],[3,4],[4,5],[5,6],[7,7]], k = 1

**输出：** 3

**解释：** 0 与 1 共享属性 1；2、3、4 依次靠 4 和 5 连成一串；5 号节点没有伙伴。共 3 个连通分量。

### 示例 2

**输入：** properties = [[1,2,3],[2,3,4],[4,3,5]], k = 2

**输出：** 1

**解释：** 0 与 1 共享 `{2,3}`，1 与 2 共享 `{3,4}`，三者连通。

### 示例 3

**输入：** properties = [[1,1],[1,1]], k = 2

**输出：** 2

**解释：** 两个节点的属性集合都是 `{1}`，共有元素只有 1 个，小于 `k = 2`，因此没有边。

## 解题思路

判定只看「共有多少个不同的整数」这一个数：任意两点平均检查一遍、够 `k` 就合并，最后数一数有几个根。节点数最多 100，两两组合不到 5000 对，直接枚举完全够用；难点只在两处——把「共有不同整数」算对（重复值只算一次），以及最后数的是**根的种类**而不是合并成功的次数。

### 先把每行的属性压成集合

`properties[i]` 可能有重复值（示例 3 就是 `[1,1]`），而题目要的是「共有的**不同**整数」。先把它转成 `set`，之后两个集合的交集大小就是 `intersect`：

```python
sets = [set(row) for row in properties]
len(sets[i] & sets[j]) >= k
```

用集合交集是 O(m)；如果逐元素双重循环去重，会平白多一个 m 的因子。

### 并查集合并，最后数根

```python
for i in range(n):
    for j in range(i + 1, n):
        if len(sets[i] & sets[j]) >= k:
            union(i, j)
return len({find(i) for i in range(n)})
```

`union` 内部已经判过「是否同根」，重复合并不会出错。最后必须对**每个节点**取一次 `find` 再放进集合——只看「成功合并了多少次」会把已经连通的两点又算一次，数字偏大。

### 推演：示例 1

`properties = [[1,2],[1,1],[3,4],[4,5],[5,6],[7,7]]`、`k = 1`，集合分别是 `{1,2} {1} {3,4} {4,5} {5,6} {7}`。

| 点对 | 交集 | 大小 ≥ 1？ | 合并 |
| --- | --- | --- | --- |
| (0,1) | {1} | 是 | 0、1 连通 |
| (2,3) | {4} | 是 | 2、3 连通 |
| (3,4) | {5} | 是 | 2、3、4 连通 |
| 其余组合 | ∅ | 否 | — |

根的种类是 `{0, 2, 5}`，共 3 个，与输出一致。

## 完整代码实现

```python
from typing import List


class Solution:
    def numberOfComponents(self, properties: List[List[int]], k: int) -> int:
        n = len(properties)
        sets = [set(row) for row in properties]     # 同一行的重复属性只算一次

        parent = list(range(n))

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]       # 路径压缩
                x = parent[x]
            return x

        def union(a: int, b: int) -> None:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb

        for i in range(n):
            for j in range(i + 1, n):
                if len(sets[i] & sets[j]) >= k:
                    union(i, j)

        # 数「根的种类」，不是数合并次数
        return len({find(i) for i in range(n)})
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 每对逐元素比较共有属性 | O(n² · m²) | O(1) | 不去重的话还要额外判重 |
| 集合交集 + 并查集（最优） | O(n² · m) | O(n · m) | n, m ≤ 100，约 10^6 次集合操作 |

## 易错点总结

### 1. 把参数 `k` 当成节点数

签名是 `numberOfComponents(properties, k)`，第二个参数是「至少共有几个属性」，不是节点数——节点数是 `len(properties)`。把它当节点数用，示例 1 的 `k = 1` 会变成「只处理前 1 个节点」，直接返回 1。

### 2. 用「合并成功的次数」当连通分量数

初始有 `n` 个分量，每次成功合并减一，这是对的；但若最后统计的是 `n - 合并次数` 之外的量，比如直接数 `union` 被调用的次数，同一条边会被重复计入。示例 2 里三对都满足条件，`union` 被调用 3 次，答案却是 1。正确做法是对每个节点 `find` 一次，数不同根的个数。

## 扩展思考

- 若 `n` 涨到 10^5，两两比较不可行，需要按属性值建「属性 → 节点列表」，只在共享属性的节点之间连边（等价于把每个属性当作一个中转节点）。
- `k = 1` 时就是「有公共元素的两个集合连通」，可以用哈希表把首次出现该属性的节点记下来，线性合并。
