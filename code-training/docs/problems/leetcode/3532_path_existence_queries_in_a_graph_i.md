---
title: 3532. 针对图的路径存在性查询 I
platform: LeetCode
difficulty: Medium
id: 3532
url: https://leetcode.cn/problems/path-existence-queries-in-a-graph-i/
tags:
  - 并查集
  - 图
  - 数组
topics: []
patterns: []
date_added: 2026-10-27
date_reviewed: []
---

# 3532. 针对图的路径存在性查询 I

## 题目描述

给你一个整数 `n`，表示图中的节点数量，这些节点按从 `0` 到 `n-1` 编号。

同时给你一个长度为 `n` 的整数数组 `nums`，该数组按**非递减**顺序排序，以及一个整数 `maxDiff`。

如果 `|nums[i] - nums[j]| <= maxDiff`，则节点 `i` 和节点 `j` 之间存在一条**无向边**。

此外，给你一个二维整数数组 `queries`。对于每个 `queries[i] = [u_i, v_i]`，需要判断节点 `u_i` 和 `v_i` 之间是否存在路径。

返回一个布尔数组 `answer`，其中 `answer[i]` 为 `true` 表示存在路径，否则为 `false`。

## 示例

**示例 1：**

```
输入：n = 2, nums = [1,3], maxDiff = 1, queries = [[0,0],[0,1]]
输出：[true,false]
```

**示例 2：**

```
输入：n = 4, nums = [2,5,6,8], maxDiff = 2, queries = [[0,1],[0,2],[1,3],[2,3]]
输出：[false,false,true,true]
```

**提示：**

- `1 <= n == nums.length <= 10^5`
- `0 <= nums[i] <= 10^5`
- `nums` 按非递减顺序排序
- `0 <= maxDiff <= 10^5`
- `1 <= queries.length <= 10^5`
- `queries[i] == [u_i, v_i]`
- `0 <= u_i, v_i < n`

## 解题思路

### 先看清图：边只由值差决定

节点编号 `0 … n-1` 只用来索引 `nums`，**没有任何「编号相邻就连边」的设定**。边的定义只有一条：

> `|nums[i] - nums[j]| <= maxDiff` 时，`i` 与 `j` 之间有一条无向边。

示例 1 就是这条定义的直接检验：`nums = [1, 3]`、`maxDiff = 1`，两个节点的值差是 2，大于 1，所以图里一条边都没有。查询 `[0,1]` 返回 `false`，而 `[0,0]`（自己到自己）永远是 `true`。

题目问的是**路径**，不是**边**。示例 2 的查询 `[1,3]`：`nums[1] = 5`、`nums[3] = 8`，差 3 超过 `maxDiff = 2`，两者之间没有直达边；但 `5 - 6 - 8` 这两段都合格，路径存在，答案是 `true`。

### 关键观察：`nums` 已排序，所以「相邻差」是唯一的闸门

`nums` 按非递减排序，于是对任意 `i < j` 都有 `nums[i] <= nums[j]`，值差可以写成 `nums[j] - nums[i]`。由此得到两个方向：

- **间隙过大就切断**：如果某个 `k` 满足 `nums[k+1] - nums[k] > maxDiff`，那么任何 `i <= k < j` 都有 `nums[j] - nums[i] >= nums[k+1] - nums[k] > maxDiff`，`i` 与 `j` 之间没有边。也就是说，**没有任何一条边能跨过这个 `k`**，图被切成互不相通的两半。
- **间隙合格就连通**：如果区间 `[i, j]` 内每一对相邻元素的值差都 `<= maxDiff`，那么 `i - i+1 - … - j` 就是一条合法路径（相邻两个节点之间都有边）。

合起来：

> 节点 `i` 与 `j`（`i < j`）连通，**当且仅当** 对所有 `i <= k < j` 都有 `nums[k+1] - nums[k] <= maxDiff`。

也就是说，**连通分量就是把序列按「大间隙」切开后得到的连续段**。这道题的图结构比它的描述简单得多。

数据范围也印证了方向：`n` 与 `queries.length` 都是 `10^5`，所以目标是「预处理一次、每个查询 `O(1)`」；任何「每个查询跑一遍图」的做法都是 `10^10` 级别。

### 方法一：每个查询 BFS（先想到的做法，但查询一多就慢）

最直白的做法是把边建出来：既然只需要表达连通性，每个节点连到左右相邻的节点就够了（相邻差合格就连），然后对每个查询从 `u` 出发 BFS 找 `v`。

```python
from collections import deque
from typing import List

class Solution:
    def pathExistenceQueries(self, n: int, nums: List[int], maxDiff: int,
                             queries: List[List[int]]) -> List[bool]:
        adj = [[] for _ in range(n)]
        for i in range(n - 1):
            if nums[i + 1] - nums[i] <= maxDiff:   # 只连相邻下标就足以表达连通性
                adj[i].append(i + 1)
                adj[i + 1].append(i)

        def reachable(s: int, t: int) -> bool:
            if s == t:
                return True
            seen = [False] * n
            seen[s] = True
            q = deque([s])
            while q:
                u = q.popleft()
                for v in adj[u]:
                    if v == t:
                        return True
                    if not seen[v]:
                        seen[v] = True
                        q.append(v)
            return False

        return [reachable(u, v) for u, v in queries]
```

每个查询最坏要看完整张图，`O(n)`；`10^5` 个查询就是 `10^10` 次访问，必然超时。它值得写出来的原因是：后面两种写法只是在把这件重复劳动提前做一次，图的形状本身没有变。

### 方法二：一次并查集，查询只问「同不同根」

既然连通关系只有「相邻差是否合格」这一个来源，就把所有合格间隙两端的节点并起来，之后每个查询只做两次 `find`。

```python
from typing import List

class Solution:
    def pathExistenceQueries(self, n: int, nums: List[int], maxDiff: int,
                             queries: List[List[int]]) -> List[bool]:
        fa = list(range(n))

        def find(x: int) -> int:
            while fa[x] != x:
                fa[x] = fa[fa[x]]
                x = fa[x]
            return x

        for i in range(1, n):
            if nums[i] - nums[i - 1] <= maxDiff:
                fa[find(i)] = find(i - 1)          # 合格间隙：并进同一组
        return [find(u) == find(v) for u, v in queries]
```

预处理是 `n-1` 次合并，每个查询两次 `find`，总计 `O((n + q)·α(n))`。它不依赖「间隙」这个概念对读者可见，换成任意一张边数可控的稀疏图，同样的骨架都能用。

### 方法三：直接记号段编号，查询变成一次整数比较

由前面的判据，`i` 所在的连通块就是「从某个起点一路延伸到这里」的那一段。于是可以边扫边记：`comp[i]` 存本段起点，遇到大间隙就换段。

```python
from typing import List

class Solution:
    def pathExistenceQueries(self, n: int, nums: List[int], maxDiff: int,
                             queries: List[List[int]]) -> List[bool]:
        comp = [0] * n
        for i in range(1, n):
            # 间隙合格就沿用上一格的段号，否则以自己为新段起点
            comp[i] = comp[i - 1] if nums[i] - nums[i - 1] <= maxDiff else i
        return [comp[u] == comp[v] for u, v in queries]
```

预处理一次扫描 `O(n)`，每个查询两次数组读取 `O(1)`，总计 `O(n + q)` —— 这也是下界，每条查询至少要被读一次。

它比并查集快的真正原因不是数据结构更聪明，而是**利用了「边只出现在相邻下标之间」这个更窄的结构**：并查集要处理任意形状的合并，分段只需要一次线性扫描。代价是这份代码依赖「`nums` 已排序」这一前提；换一道边是任意给出的题，就得回到方法二。

### 三种写法怎么选

| 写法 | 适用场合 | 主要代价 |
|---|---|---|
| 每查询 BFS | 查询极少，或用来验证对连通性的理解 | 每查询 `O(n)`，`q = 10^5` 时不可用 |
| 并查集 | 图结构任意、边可枚举 | 预处理 `O(n·α)`，多一个 `fa` 数组 |
| 分段编号 | `nums` 有序、边只由值差决定（本题） | 依赖排序这一前提，否则要先按值排序 |

## 完整代码实现

下面这段是本题的基准实现（页面上的「跑样例」与逐帧可视化回放的也是它）。它与方法二思路相同，只是把并查集抽成独立的类，并且先按 `(nums[i], i)` 排序再合并 —— 对本题「`nums` 已非递减」的输入来说，这次排序是多余的；保留它是为了在 `nums` 未排序的变体上也能直接跑。

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
    def pathExistenceQueries(self, n: int, nums: List[int], maxDiff: int, queries: List[List[int]]) -> List[bool]:
        uf = UnionFind(n)
        arr = [(nums[i], i) for i in range(n)]
        arr.sort()
        for i in range(1, n):
            if arr[i][0] - arr[i - 1][0] <= maxDiff:
                uf.merge(arr[i][1], arr[i - 1][1])
        ans = []
        for u, v in queries:
            ans.append(uf.find(u) == uf.find(v))
        return ans

```

`arr[i][0] - arr[i - 1][0] <= maxDiff` 这一句对应「只看排序后相邻的两个值」：如果这一对都超过 `maxDiff`，更靠后的值只会差得更多，不必再往后试。

## 示例推演

### 示例 2：`n = 4, nums = [2,5,6,8], maxDiff = 2`

先算三个间隙：

| `i` | `nums[i] - nums[i-1]` | 与 `maxDiff = 2` 比较 | 动作 |
|---|---|---|---|
| 1 | `5 - 2 = 3` | 3 > 2 | 断段，节点 1 成为新段起点 |
| 2 | `6 - 5 = 1` | 1 <= 2 | 沿用上一格 |
| 3 | `8 - 6 = 2` | 2 <= 2（等于也算合格） | 沿用上一格 |

于是 `comp = [0, 1, 1, 1]`：节点 0 单独成段，节点 1、2、3 同段。并查集那边的过程是同一件事：

| 间隙 | 动作 | 合并后的集合 |
|---|---|---|
| `3 > 2` | 不合并 | `{0}`、`{1}`、`{2}`、`{3}` |
| `1 <= 2` | `merge(2, 1)` | `{0}`、`{1,2}`、`{3}` |
| `2 <= 2` | `merge(3, 2)` | `{0}`、`{1,2,3}` |

逐条查询：

| 查询 | 两端的段号 / 根 | 判定 |
|---|---|---|
| `[0,1]` | `comp[0]=0`，`comp[1]=1` | 不同段，返回 `false` |
| `[0,2]` | `comp[0]=0`，`comp[2]=1` | 不同段，返回 `false` |
| `[1,3]` | `comp[1]=1`，`comp[3]=1` | 同段，返回 `true`（路径 `1-2-3`，两段值差分别是 1 与 2） |
| `[2,3]` | `comp[2]=1`，`comp[3]=1` | 同段，返回 `true`（两值差正好等于 `maxDiff`，有直达边） |

输出 `[false,false,true,true]`，与示例一致。

### 示例 1：`n = 2, nums = [1,3], maxDiff = 1`

唯一的间隙是 `3 - 1 = 2 > 1`，所以 `comp = [0, 1]`，两个节点各自成段，图里没有任何边。

- 查询 `[0,0]`：两端都是节点 0，同段，返回 `true`（自己到自己的路径长度为 0）。
- 查询 `[0,1]`：段号 0 与 1 不同，返回 `false`。

输出 `[true,false]`。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 每查询 BFS | O(n × q) | O(n) | `n = q = 10^5` 时约 `10^10` 次访问，超时 |
| 并查集（含排序） | O(n log n + (n + q)·α(n)) | O(n) | 基准实现；`nums` 已排序时排序这步是冗余的 |
| 分段编号（最优） | O(n + q) | O(n) | 一次扫描定段，每个查询两次数组读取 |

## 易错点总结

1. **把「有直达边」当成「有路径」**：查询直接写 `abs(nums[u] - nums[v]) <= maxDiff`。示例 2 的 `[1,3]`：`5` 与 `8` 差 3，会被判 `false`，而正确答案是 `true`（经节点 2 中转）。判据必须是「同段 / 同根」，不是「有边」。
2. **断段条件把「等于」也切断**：沿用上一段的条件应写 `nums[i] - nums[i - 1] <= maxDiff`；写成 `< maxDiff` 时，值差恰好等于 `maxDiff` 的间隙会被错误断开。示例 2 里 `8 - 6 = 2` 正好等于 `maxDiff`，节点 3 会自立一段，查询 `[2,3]` 从 `true` 变成 `false`。
