---
title: 399. 除法求值
platform: LeetCode
difficulty: Medium
id: 399
url: https://leetcode.cn/problems/evaluate-division/
tags:
  - 图
  - 并查集
  - 深度优先搜索
  - 广度优先搜索
  - 数组
  - 字符串
  - 最短路
  - Floyd 算法
  - Bellman–Ford 算法
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
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

### 把「谁除以谁」变成图上的一条路径

已知 `a / b = 2`。把每个变量看成一个点，这条等式就是一对双向带权边：

- `a → b` 的权是 `2`：从 `a` 走到 `b` 就乘 2；
- `b → a` 的权是 `1 / 2`：反向走就是除以 2。

于是 `a / c` 就是「从 `a` 走到 `c` 的路径上所有边权的乘积」：

```text
a / c = (a / b) × (b / c) = 2 × 3 = 6
```

路径上的中间变量会全部约掉（`a/b · b/c` 里的 `b`），所以**路径不唯一也没关系** —— 每一条 `a → c` 的路径算出来的乘积都是 `a` 与 `c` 的真实比值。

查询只有三种结局，判断顺序不能颠倒：

| 情形 | 回答 | 判据 |
|---|---|---|
| 两个变量都出现过，且在同一连通块里 | 路径乘积 | 从 `a` 走得到 `b` |
| 两个变量都出现过，但不在同一块里 | `-1.0` | 走不到 |
| 有变量从没在 `equations` 里出现过 | `-1.0` | 图里连这个点都没有 |

第三行最容易忽略：`x / x` 在 `x` 没出现过时是 `-1.0`，不是 `1.0`。`1.0` 只留给「真正出现过的变量自己除自己」。

### 方法一：每个查询跑一次 DFS

建好图之后，一次查询就是「从起点能不能走到终点，路上乘积是多少」——一次带返回值的连通性搜索。`dfs(src, dst, seen)` 返回 `src` 到 `dst` 的比值，走不通返回 `None`：

```python
from typing import List
from collections import defaultdict

class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float],
                     queries: List[List[str]]) -> List[float]:
        graph = defaultdict(dict)
        for (a, b), v in zip(equations, values):
            graph[a][b] = v          # a / b = v
            graph[b][a] = 1.0 / v    # b / a = 1 / v

        def dfs(src: str, dst: str, seen: set):
            if src not in graph or dst not in graph:
                return None          # 变量没出现过，连点都没有
            if src == dst:
                return 1.0           # 自己除自己
            seen.add(src)
            for nxt, w in graph[src].items():
                if nxt in seen:
                    continue
                sub = dfs(nxt, dst, seen)
                if sub is not None:
                    return w * sub   # 这一步的边权 × 从 nxt 到 dst 的比值
            return None

        ans = []
        for c, d in queries:
            r = dfs(c, d, set())     # seen 每个查询独立
            ans.append(-1.0 if r is None else r)
        return ans
```

三处细节都能对上上面的分析：

- `graph[b][a] = 1.0 / v` 是反向边。少了这一行，只能顺着等式写的方向查（`a/b` 查得到），反过来查（`b/a`）直接 `-1.0`。
- `src == dst` 必须在 `seen` 之前返回 `1.0`。放到循环里判断的话，自己查自己时 `seen` 里已经记了 `src`，所有邻居都被跳过，一路返回 `None`。
- `seen` 在整次查询里累积、**不回溯删除**。这题只关心连通性：从某个点出发走不到终点，换一条路再到这个点照样走不到，所以不需要撤销。

每次查询 `O(V + E)`。本题 `equations.length ≤ 20`、`queries.length ≤ 20`、点数最多 40，20 次搜索加起来是千级操作 —— DFS 在这里是**够用且最省心**的写法。需要「预处理一次、之后每次查询近乎免费」的场合，是查询量远大于等式数量、或者边会动态增加的时候，那才轮到并查集。

### 方法二：带权并查集

并查集管的是「连不连通」。要回答「比值是多少」，得让每个点额外记住**自己到父节点的比值**：

> `weight[x] = val[x] / val[parent[x]]`
>
> 这里的 `val[v]` 是变量 `v` 的「数值」。我们既不知道它、也不需要有它，它只是一个让等式成立的中间量。

这个定义有两条直接后果：

1. **沿路径乘起来就是「到根的比值」**：`val[x]/val[p] × val[p]/val[root] = val[x]/val[root]`，中间项全部约掉。所以压缩到根之后 `weight[x]` 就是 `x / root`。
2. **两个同根变量的比值可以直接相除**：`x / y = (val[x]/val[root]) ÷ (val[y]/val[root]) = weight[x] / weight[y]`，根的值自己约掉了 —— 这正是**不需要知道 `val[root]`** 的原因。

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.weight = [1.0] * n          # weight[i] = val[i] / val[parent[i]]

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            origin = self.parent[x]      # 先存旧父节点，下一步要用它的 weight
            self.parent[x] = self.find(origin)
            self.weight[x] *= self.weight[origin]   # x/origin × origin/root = x/root
        return self.parent[x]

    def union(self, x: int, y: int, value: float) -> None:   # 已知 x / y = value
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return                       # 已经同块，题目保证等式不自相矛盾
        self.parent[rx] = ry
        self.weight[rx] = value * self.weight[y] / self.weight[x]

    def ratio(self, x: int, y: int) -> float:
        rx, ry = self.find(x), self.find(y)
        return self.weight[x] / self.weight[y] if rx == ry else -1.0
```

**`find` 里为什么是乘法。** 压缩前 `weight[x] = val[x]/val[origin]`，压缩后要求 `weight[x] = val[x]/val[root]`。递归 `find(origin)` 回来后，`weight[origin]` 已经更新成 `val[origin]/val[root]`，两者相乘正好补上缺的那一段。赋值、加法都替代不了这个乘法。

`origin` 必须在改 `self.parent[x]` **之前**存下来。若先压缩再取 `weight[self.parent[x]]`，那个下标已经是根，而根的 `weight` 恒为 `1.0`（`root/root`），这一行等于乘 1 —— 看起来执行了，其实什么都没更新。

**`union` 里那个式子怎么来的。** 把 `rx` 挂到 `ry` 下面，要填的未知量就是 `weight[rx] = val[rx]/val[ry]`。从已知条件出发，把 `x`、`y` 各自换到自己的根上：

```text
value = x / y
      = (weight[x] · val[rx]) ÷ (weight[y] · val[ry])
```

移项即得：

```text
val[rx] / val[ry] = value × weight[y] / weight[x]

weight[rx] = value × weight[y] / weight[x]
```

右边用到的 `weight[x]`、`weight[y]` 必须是 `find` **之后**的值（「各自到自己根」的比值），所以那两行 `find` 要写在赋值之前。除法的方向也就在这里：分子是 `weight[y]`，分母是 `weight[x]`，写反了不报错、答案全错。

**查询为什么是相除。** 同根时 `weight[x] = x/root`、`weight[y] = y/root`，相除即 `x/y`；不同根时两块之间没有任何等式传递过来，答案不确定，返回 `-1.0`。

### 两种写法怎么选

| | DFS | 带权并查集 |
|---|---|---|
| 单次查询 | `O(V + E)` | 摊还 `O(log V)`（只做路径压缩） |
| 建图成本 | 建一张邻接表 | 每次 `union` 要维护权重不变量 |
| 容易错的地方 | 反向边、`src == dst` 的判断顺序 | 两处权重的乘除方向 |
| 适合的场景 | 查询少、边一次给全 | 查询多、而且反复查同一批等式 |

本题两种都能过，DFS 的代码短一半，也不需要维护任何不变量。并查集换来的是「一次预处理，之后每次查询几乎免费」，代价是把「路径乘积」这个直观概念换算成了「两个到根比值相除」这一层代数。

---

## 完整代码实现

下面第一段是本题的基准实现：页面上的「▶ 跑样例」与逐帧可视化回放的都是这一段，逻辑与上文 `UnionFind` 完全一致，只是查询方法叫 `is_connected`。第二段是方法一，可以直接提交。

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

方法一（建图 + DFS），单独提交也能过：

```python
from typing import List
from collections import defaultdict

class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float],
                     queries: List[List[str]]) -> List[float]:
        graph = defaultdict(dict)
        for (a, b), v in zip(equations, values):
            graph[a][b] = v
            graph[b][a] = 1.0 / v

        def dfs(src: str, dst: str, seen: set):
            if src not in graph or dst not in graph:
                return None
            if src == dst:
                return 1.0
            seen.add(src)
            for nxt, w in graph[src].items():
                if nxt in seen:
                    continue
                sub = dfs(nxt, dst, seen)
                if sub is not None:
                    return w * sub
            return None

        return [-1.0 if (r := dfs(c, d, set())) is None else r for c, d in queries]
```

---

## 示例推演

以示例 1 为例：`equations = [["a","b"],["b","c"]]`、`values = [2.0, 3.0]`。编号 `a = 0`、`b = 1`、`c = 2`，并查集开 4 个槽（下标 3 用不到）。

**先看 DFS 的视角。** 图里只有两条边：

| 边 | 权 | 来源 |
|---|---|---|
| `a → b` | 2.0 | `a / b = 2` |
| `b → a` | 0.5 | 反向边 |
| `b → c` | 3.0 | `b / c = 3` |
| `c → b` | 1/3 | 反向边 |

`a / c`：`a → b → c`，乘 `2.0 × 3.0 = 6.0`。`b / a`：`b → a`，直接读到反向边 `0.5`。

**再看并查集的视角。** 初始 `parent = [0, 1, 2, 3]`、`weight = [1.0, 1.0, 1.0, 1.0]`。

| 步骤 | 操作 | `parent` | `weight` | 这一步的含义 |
|---|---|---|---|---|
| 初始 | — | `[0,1,2,3]` | `[1,1,1,1]` | 每个点都是自己的根 |
| 1 | `union(0, 1, 2.0)` | `[1,1,2,3]` | `[2,1,1,1]` | `weight[0] = 2·weight[1]/weight[0] = 2`，即 `a / b = 2` |
| 2 | `union(1, 2, 3.0)` | `[1,2,2,3]` | `[2,3,1,1]` | `weight[1] = 3·weight[2]/weight[1] = 3`，即 `b / c = 3` |

第二步之后，`weight[b] = 3` 表示 `b / c = 3`，但 `weight[a] = 2` 只表示 `a / b = 2`，`a` 还没挂到根 `c` 上 —— 这正是 `find` 要补的那一段。

**查询 `a / c` 时 `find(0)` 做的事**：

1. `parent[0] = 1 ≠ 0`，先存 `origin = 1`；
2. 递归 `find(1)`：`parent[1] = 2 ≠ 1`，存 `origin = 2`，`find(2) = 2` 直接返回；回到 1 号，`weight[1] *= weight[2]` 得 `3 × 1 = 3`，`parent[1] = 2` —— 现在 `weight[b]` 是 `b / c`；
3. 回到 0 号，`weight[0] *= weight[1]` 得 `2 × 3 = 6`，`parent[0] = 2` —— 现在 `weight[a]` 是 `a / c`。

第 3 步用的 `weight[1]` 是第 2 步刚更新过的 `3`，不是原来的 `1`。这就是递归必须先走完子问题、再做乘法的地方。

`find(2) = 2`、`weight[2] = 1`，所以 `a / c = 6 / 1 = 6.0`。

**五个查询逐个对照**：

| 查询 | 两个变量都出现过？ | 同根？ | 计算 | 结果 |
|---|---|---|---|---|
| `a / c` | 是 | 是 | `weight[a] / weight[c] = 6 / 1` | `6.0` |
| `b / a` | 是 | 是 | `weight[b] / weight[a] = 3 / 6` | `0.5` |
| `a / e` | 否（`e` 从未出现） | — | 查表就返回 | `-1.0` |
| `a / a` | 是 | 是 | `6 / 6` | `1.0` |
| `x / x` | 否（`x` 从未出现） | — | 查表就返回 | `-1.0` |

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 建图 + 每个查询一次 DFS | O(Q×(V+E)) | O(V+E) | 建图一次，每个查询重走一遍连通块 |
| 带权并查集（最优） | O((E+Q)×log V) | O(V) | 只做路径压缩、不做按秩合并，单次操作摊还 O(log V) |

> `V` 是变量个数（`V ≤ 2E`），`E` 是等式个数（`≤ 20`），`Q` 是查询个数（`≤ 20`）。补上按秩合并或按大小合并之后，单次摊还才降到 `O(α(V))`；本题两种做法的绝对耗时都在微秒级。

---

## 易错点总结

1. **`find` 里用压缩后的父节点取权重**：把 `self.weight[x] *= self.weight[origin]` 写成 `self.weight[x] *= self.weight[self.parent[x]]`。这一行执行时 `self.parent[x]` 已经被改成根，根的 `weight` 恒为 `1.0`，等于乘 1。示例 1 里 `a / c` 返回 `2.0`（只算了 `a → b` 一段）而不是 `6.0`，`b / a` 也从 `0.5` 变成 `1.5`；只有 `a / a` 这种自己除自己的查询碰巧还是 `1.0`。
2. **`union` 的除法写反**：写成 `self.weight[rootX] = value * self.weight[x] / self.weight[y]`。取 `equations = [["a","b"],["a","c"]]`、`values = [2.0, 5.0]`，查询 `a / c` 正确结果是 `5.0`，写反后得到 `20.0`；而 `a / b` 这种等式直接给出的查询仍然是 `2.0`，所以只看「已知的等式对不对得上」是查不出这个错的。
3. **并查集开得太小**：写 `UnionFind(len(equations))` 而不是 `2 * len(equations)`。一条等式最多引入两个新变量，`equations = [["a","b"]]` 时只开 1 个槽，`uf.union` 里 `find(1)` 直接抛 `IndexError: list index out of range`。

---

## 扩展思考

- **Floyd 走的是同一条路**：把变量排成一张 `n × n` 的比值矩阵，`m[i][i] = 1`，每条 `a/b = v` 填 `m[a][b] = v`、`m[b][a] = 1/v`，再跑乘积版本的松弛 `m[i][j] = m[i][k] * m[k][j]`。`O(V³)`，本题 `V ≤ 40` 也就六万多次乘法，能过；但它把「两个点之间的路径乘积」算成了全源问题，对 20 个查询来说属于超配。
- **如果等式可能自相矛盾**（同时给出 `a/b = 2` 与 `a/b = 3`），`union` 里 `rx == ry` 那个分支就不能直接 `return`，要拿 `value` 去校验 `weight[x] / weight[y]`，不一致时报冲突。本题保证不会出现。

---

## 相关题目

- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- [684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)
