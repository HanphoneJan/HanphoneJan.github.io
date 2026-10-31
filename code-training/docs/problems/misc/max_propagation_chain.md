---
title: 最大传播链
platform: 自定义
difficulty: Medium
id: max-propagation-chain
url: ""
tags:
  - 图论
  - 最长路径
  - 记忆化搜索
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
  - ../../patterns/recursion.md
date_added: 2025-04-30
date_reviewed: []
---

# 最大传播链

## 题目描述

在网络监控中，异常流量的流动通常具有局部聚集性。监控系统需要识别出高负载的基站（关键节点），并判断流量在这些节点之间定向的传播链的最长路径。

**网络监控规则：**
- **直接关联：** 对于基站 A 和 B，若其曼哈顿距离 $|x_A-x_B|+|y_A-y_B| \leq \varepsilon_{dist}$，则判定两者具有直接关联。
- **关键节点判定：** 计算一个基站及其所有具有"直接关联"属性的基站（含自身）的流量负载 $w$ 之和。若该总和 $\geq W_{threshold}$，则该基站被判定为关键节点。

**流量传播链路：**
- **链路条件：** 若两个关键节点具有"直接关联"关系，且发生时间戳 $t$ 不同，则流量从时间较早的基站流向时间较晚的基站。
  - 注意：若两个关联的关键节点发生时间完全相同，则它们之间无法建立有效的传播链路。
- **传播链条：** 传播链条是由一系列关键节点通过有向链路首尾相连构成的路径。
- **衡量指标：** 链条的规模为该路径上所有节点服务的用户数 Users 之和。
- **任务：** 计算全网中可能形成的所有传播链条中，能够覆盖的最大用户总数。

## 输入格式

- 第1行：3个整数 $N$（基站总数，$1 \leq N \leq 200$）、$\varepsilon_{dist}$（空间阈值）和 $W_{threshold}$（负载阈值）。
- 第2行到第 $N+1$ 行，每行包含5个整数：$x, y, t, w, \text{Users}$。
- 所有坐标、时间戳、负载和用户数的取值范围均为 $[0, 10^9]$。

## 输出格式

- 输出一个整数，代表最大用户数。若全网无法形成任何链路或关键节点，输出 0。

## 示例

### 示例 1

**输入：**
```
3 1 500
0 0 10 100 50
1 0 20 100 50
0 1 30 100 50
```

**输出：**
```
0
```

**说明：**
只有 0 号基站同时与 1、2 号相邻，邻域负载和为 $100+100+100=300$；1、2 号彼此距离为 2，各自只与 0 号相邻，负载和为 $200$。三者都小于 500，没有关键节点，输出 0。

### 示例 2

**输入：**
```
4 1 150
0 0 10 100 10
1 0 20 100 10
5 5 10 200 100
5 6 30 200 100
```

**输出：**
```
200
```

**说明：**
基站 2 和 3 是关键节点（各自负载和为 $200 + 200 = 400 \geq 150$），形成有向边 $2 \to 3$，用户数 $100 + 100 = 200$。

---

## 解题思路

### 三件事，顺序不能换

输出是一个用户数之和，但它前面的每一步都在筛掉节点，而且筛选用的量彼此依赖：

1. **判定关键节点**：对每个基站，把「自身 + 所有直接关联的基站」的 $w$ 加起来，和阈值比较；
2. **建图**：只在关键节点之间连边，方向由时间戳决定；
3. **求最长路径**：节点带权（Users），求一条链上权值和的最大值。

顺序不能反。第一步的邻域是在**全部 $N$ 个基站**上算的，和某个基站自己是不是关键节点无关。如果先把非关键节点删掉再算邻域和，一圈本来够格的基站会因为邻居被删而掉到阈值以下，结果整片消失。

### 关键节点：$O(N^2)$ 的双重循环就够

$N\le 200$，两两算一次曼哈顿距离是 4 万次比较，不需要 KD 树之类的空间索引。代码里从 `total_w = wi` 起步 —— 题面写的是「含自身」，漏掉这一项会让阈值附近的节点判错。

```python
is_key = [False] * N
for i in range(N):
    xi, yi, _, wi, _ = nodes[i]
    total_w = wi                    # 自身先计入
    for j in range(N):
        if i == j:
            continue
        xj, yj, _, wj, _ = nodes[j]
        if abs(xi - xj) + abs(yi - yj) <= eps:
            total_w += wj
    if total_w >= W_threshold:
        is_key[i] = True
```

### 建图：时间戳同时决定「连不连」和「往哪连」

两个关键节点之间要连边，需要同时满足：曼哈顿距离不超过 $\varepsilon_{dist}$、时间戳不同、且方向从早到晚。`ti < tj` 一条判断就把方向定了，同时间戳的一对自然两个方向都不连。

```python
adj = [[] for _ in range(N)]
for i in key_indices:
    xi, yi, ti, _, _ = nodes[i]
    for j in key_indices:
        if i == j:
            continue
        xj, yj, tj, _, _ = nodes[j]
        if abs(xi - xj) + abs(yi - yj) <= eps and ti != tj:
            if ti < tj:
                adj[i].append(j)
```

`ti != tj` 是冗余的：下一行的 `ti < tj` 已经把同时间戳的一对排除了。保留它不影响结果；真正决定方向的是 `ti < tj`。

**关键观察**：每条边都把时间戳严格推大，所以沿着边走 $t$ 单调递增，图里不可能有环。这是整道题能用多项式算法的基础 —— 一般有向图上的最长简单路径是 NP-hard，这里能算，完全是时间戳给的。边数最多 $K(K-1)/2$（$K$ 为关键节点数）。

### 记忆化 DFS：$f(u)$ 是从 $u$ 出发能拿到的最大用户数

设 $f(u)$ 为从 $u$ 开始、沿着有向边往下走，能覆盖的最大用户数（含 $u$ 自己）。$u$ 可以停在原地，也可以走向任意一个后继，所以

$$
f(u) = \text{Users}_u + \max\Bigl(0,\ \max_{v \in adj(u)} f(v)\Bigr)
$$

没有后继时就是 $\text{Users}_u$。朴素 DFS 会把同一个节点的子树反复展开：分层图里从源点到汇点的路径数随层数指数增长，每条路径都会被走一遍。加上缓存后每个节点只算一次。

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def dfs(u):
    best = nodes[u][4]                 # 停在 u
    for v in adj[u]:
        best = max(best, nodes[u][4] + dfs(v))
    return best

ans = 0
for u in key_indices:
    if adj[u]:                         # 至少要有一条边才算「链路」
        ans = max(ans, dfs(u))
```

`if adj[u]` 这一句不是可选的：题面要求「无法形成任何链路时输出 0」，一个孤零零的关键节点不构成链条，它的 Users 不能计入答案。

### 并列写法：按时间倒序做拓扑 DP

既然每条边都从早到晚，把关键节点按 $t$ 从大到小排序就得到一个拓扑序：轮到 $u$ 时，它的所有后继都已经算完。于是同一个递推可以写成自底向上的循环，不需要递归。

```python
dp = {}
for u in sorted(key_indices, key=lambda k: nodes[k][2], reverse=True):
    dp[u] = nodes[u][4]
    for v in adj[u]:
        dp[u] = max(dp[u], nodes[u][4] + dp[v])

ans = max((dp[u] for u in key_indices if adj[u]), default=0)
```

两种写法复杂度相同。DFS 更短、更贴递推式；拓扑 DP 没有递归深度问题、也不依赖 `lru_cache`。本题 $N\le 200$，递归深度最多 200 层，两种都能过；如果 $N$ 再大、递归深度成为限制，拓扑序版本更稳妥。完整可提交的拓扑序版本见下一节的第二个代码块。

---

## 完整代码实现

```python
"""
最大传播链 - DAG 最长路径 + 记忆化搜索

输入格式：
- 第1行：N eps W_threshold
- 接下来 N 行：x y t w Users

输出格式：
- 最大用户数
"""

import sys
from functools import lru_cache

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    N = int(next(it))
    eps = int(next(it))
    W_threshold = int(next(it))
    nodes = []
    for _ in range(N):
        x = int(next(it)); y = int(next(it)); t = int(next(it))
        w = int(next(it)); users = int(next(it))
        nodes.append((x, y, t, w, users))

    # 1. 判断关键节点
    is_key = [False] * N
    for i in range(N):
        xi, yi, _, wi, _ = nodes[i]
        total_w = wi
        for j in range(N):
            if i == j:
                continue
            xj, yj, _, wj, _ = nodes[j]
            if abs(xi - xj) + abs(yi - yj) <= eps:
                total_w += wj
        if total_w >= W_threshold:
            is_key[i] = True

    key_indices = [i for i in range(N) if is_key[i]]
    if not key_indices:
        print(0)
        return

    # 2. 构建有向图
    adj = [[] for _ in range(N)]
    for i in key_indices:
        xi, yi, ti, _, _ = nodes[i]
        for j in key_indices:
            if i == j:
                continue
            xj, yj, tj, _, _ = nodes[j]
            if abs(xi - xj) + abs(yi - yj) <= eps and ti != tj:
                if ti < tj:
                    adj[i].append(j)

    # 3. 记忆化搜索
    @lru_cache(maxsize=None)
    def dfs(u):
        best = nodes[u][4]
        for v in adj[u]:
            best = max(best, nodes[u][4] + dfs(v))
        return best

    ans = 0
    for u in key_indices:
        if adj[u]:
            ans = max(ans, dfs(u))
    print(ans)

if __name__ == "__main__":
    solve()
```

同一个问题的拓扑序版本，输入输出完全一致，可直接提交：

```python
"""
最大传播链 - 拓扑序 DP 版本

输入格式：
- 第1行：N eps W_threshold
- 接下来 N 行：x y t w Users

输出格式：
- 最大用户数
"""

import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    it = iter(data)
    N = int(next(it)); eps = int(next(it)); W_threshold = int(next(it))
    nodes = []
    for _ in range(N):
        x = int(next(it)); y = int(next(it)); t = int(next(it))
        w = int(next(it)); users = int(next(it))
        nodes.append((x, y, t, w, users))

    # 1. 关键节点：邻域负载和含自身
    is_key = [False] * N
    for i, (xi, yi, _, wi, _) in enumerate(nodes):
        total_w = wi
        for j, (xj, yj, _, wj, _) in enumerate(nodes):
            if i != j and abs(xi - xj) + abs(yi - yj) <= eps:
                total_w += wj
        is_key[i] = total_w >= W_threshold

    key_indices = [i for i in range(N) if is_key[i]]
    if not key_indices:
        print(0)
        return

    # 2. 建图：早 -> 晚
    adj = {u: [] for u in key_indices}
    for u in key_indices:
        xu, yu, tu, _, _ = nodes[u]
        for v in key_indices:
            xv, yv, tv, _, _ = nodes[v]
            if u != v and tu < tv and abs(xu - xv) + abs(yu - yv) <= eps:
                adj[u].append(v)

    # 3. 按时间倒序推 dp：轮到 u 时，所有后继已经算好
    dp = {}
    for u in sorted(key_indices, key=lambda k: nodes[k][2], reverse=True):
        best = nodes[u][4]
        for v in adj[u]:
            best = max(best, nodes[u][4] + dp[v])
        dp[u] = best

    print(max((dp[u] for u in key_indices if adj[u]), default=0))

if __name__ == "__main__":
    solve()
```

---

## 示例推演

### 示例 1：没有节点过阈值

$N=3$，$\varepsilon_{dist}=1$，$W_{threshold}=500$。

| 节点 | $(x,y)$ | $t$ | $w$ | Users |
|---|---|---|---|---|
| 0 | (0,0) | 10 | 100 | 50 |
| 1 | (1,0) | 20 | 100 | 50 |
| 2 | (0,1) | 30 | 100 | 50 |

距离：$d(0,1)=1$、$d(0,2)=1$、$d(1,2)=|1-0|+|0-1|=2$。所以节点 0 与另外两个都直接关联，而节点 1 和 2 之间不关联。

| 节点 | 邻域 | 负载和 |
|---|---|---|
| 0 | {0,1,2} | $100+100+100=300$ |
| 1 | {0,1} | $200$ |
| 2 | {0,2} | $200$ |

最大只有 300，没有关键节点，程序在 `if not key_indices` 处打印 0。

### 示例 2：两条互不相连的链

$N=4$，$\varepsilon_{dist}=1$，$W_{threshold}=150$。

| 节点 | $(x,y)$ | $t$ | $w$ | Users |
|---|---|---|---|---|
| 0 | (0,0) | 10 | 100 | 10 |
| 1 | (1,0) | 20 | 100 | 10 |
| 2 | (5,5) | 10 | 200 | 100 |
| 3 | (5,6) | 30 | 200 | 100 |

**关键节点**：0 与 1 互相关联，各自邻域和 $200\ge150$；2 与 3 互相关联，各自 $400\ge150$。四个全是关键节点。

**建边**：只检查距离为 1 的对。

- $0\to1$：$d=1$，$t$ 从 10 到 20；
- $2\to3$：$d=1$，$t$ 从 10 到 30；
- $1$ 与 $2$、$1$ 与 $3$、$0$ 与 $2$、$0$ 与 $3$ 的曼哈顿距离分别是 9、10、10、11，都大于 $\varepsilon_{dist}=1$，不连。

**记忆化 DFS**（按调用顺序）：

| 调用 | 计算 | 返回 |
|---|---|---|
| `dfs(3)` | 没有后继，停在原地 | 100 |
| `dfs(2)` | $100+\max(0,100)$ | 200 |
| `dfs(1)` | 没有后继 | 10 |
| `dfs(0)` | $10+\max(0,10)$ | 20 |

节点 1、3 没有出边，所以答案循环只取 `dfs(0)` 与 `dfs(2)`，最大值 200，与输出一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|---|---|---|---|
| 记忆化搜索（最优） | O(N²) | O(N²) | 关键节点 $O(N^2)$、建边 $O(K^2)$、DFS $O(K+E)$，$E\le K(K-1)/2$ |
| 拓扑序 DP | O(N²) | O(N²) | 同样是三段；多一次 $O(K\log K)$ 排序，省掉递归与缓存 |

---

## 易错点总结

1. **建边方向写成 `ti <= tj`**：同一时间戳的两个关键节点会互相连边，形成 2-环。输入 `2 1 100 / 0 0 5 60 10 / 1 0 5 60 10` 会得到 `adj = [[1],[0]]`，记忆化 DFS 在两个节点之间来回递归，直接 `RecursionError: maximum recursion depth exceeded`。方向必须严格小于。
2. **邻域和从 0 开始累加**：把 `total_w = wi` 写成 `total_w = 0`，节点自己的负载不算，阈值附近的节点会整批判不出来。输入 `2 1 100 / 0 0 0 60 10 / 1 0 10 60 10`：含自身时两边都是 120、都是关键节点、链长 20；漏掉自身后两边只有 60，没有关键节点，输出 0。
3. **答案循环漏掉 `if adj[u]`**：孤立的单个关键节点会被当成一条链。输入 `1 1 1 / 0 0 0 100 50` 只有一个节点，`adj[0]` 为空，正确答案是 0；去掉判断后会输出 50。

---

## 相关题目

- [平衡路径计数](balance_paths.md) — 二叉树上的路径问题
