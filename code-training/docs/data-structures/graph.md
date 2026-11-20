---
title: 图
sidebar_position: 10
category: 数据结构
difficulty_range: [中等, 困难]
last_updated: 2026-11-20
---

# 图

## 图是什么

图（graph）由**顶点（vertex）**与**边（edge）**组成。线性表记的是「谁在谁后面」，树记的是「谁是谁的父亲」，图记的是**任意两个对象之间有没有关系**——所以树是「连通无环的图」，链表是「每个节点只有一个孩子的树」。

按边的性质先分类，几乎所有图算法的适用前提都挂在这一层：

| 分类标准 | 类型 | 说明 | 典型场景 |
|---------|------|------|---------|
| 边的方向 | 无向图 | 边没有方向 | 社交关系、道路 |
| | 有向图 | 边有方向 | 课程依赖、网页链接 |
| 边的权重 | 无权图 | 边只表示「相连」 | 邻接关系本身 |
| | 带权图 | 边上有数值（距离/费用/时间） | 导航、路由 |
| 连通性 | 连通图 | 任意两顶点可达 | 交通网络 |
| | 非连通图 | 有彼此不可达的顶点对 | 多个独立社群 |

算法题里图的输入一般是**边列表** `edges = [[0,1],[1,2],[2,0]]`，需要自己先建成「按节点取邻居」的结构。

### 先把术语对齐

后面每一节都要用到这几个词，先一次说清（配一张标注图）：

| 术语 | 含义 |
|------|------|
| 度（degree） | 无向图里一个顶点连出的边数 |
| 入度 / 出度 | 有向图里指向它的边数 / 从它出发的边数 |
| 路径 | 顶点序列，相邻两个在图中相连 |
| 环 | 起点和终点相同的路径 |
| 连通 | 两个顶点之间存在路径 |
| 连通分量 | 无向图里「互相可达」的极大点集 |
| 强连通分量 | 有向图里「任意两点互相可达」的极大点集 |
| 二分图 | 顶点能分成两组，每条边都跨组 |

### 一条贯穿全文的图

为了避免每节换一套符号，本文只用**同一批 6 个节点**，换三种看法：

```text
无权无向（广度优先 / 深度优先 / 二分图）：
0 — 1 — 3
|   |   |
2 — 4 — 5
边：0-1, 0-2, 1-3, 1-4, 2-4, 3-5, 4-5

带权无向（Dijkstra / 最小生成树）：
0-1:4, 0-2:1, 1-3:5, 1-4:3, 2-4:7, 3-5:6, 4-5:2

有向（拓扑排序）：
0→1, 0→2, 1→3, 1→4, 2→4, 3→5, 4→5
```

三种看法共用 0~5 这六个编号，读后面的演算时不用重新认节点。

## 建图：三种存法

同一张图有三种存法：**邻接表**给每个节点一个邻居列表，**邻接矩阵**是一张铺满 n² 格的表，**边列表**只是一串 `(u, v)` 对。

![一条边记在哪](/diagrams/graph-storage.png)

看得见的差别是「一条边被记在哪」：邻接表记两次（两个端点各记一次），矩阵记在 `[u][v]` 那一格，边列表记成一行。题面给的一律是边列表——它只是**输入格式**，建图就是把每一行搬进两端点的邻居表。

| 操作 | 邻接表 | 邻接矩阵 |
|------|--------|---------|
| 空间 | O(n + m) | O(n²) |
| 查询「x 与 y 相邻」 | O(deg(x)) | **O(1)** |
| 遍历 x 的邻居 | O(deg(x)) | O(n) |
| 加边 | O(1) | O(1) |
| 适配场景 | **稀疏图**（m ≪ n²）——绝大多数算法题 | 稠密图 |

```python
# ===== 无向图（最常见）=====
g = [[] for _ in range(n)]
for x, y in edges:
    g[x].append(y)
    g[y].append(x)          # ① 无向图一条边要记两次，漏一边图就断了

# ===== 有向图：只记出发方向 =====
g = [[] for _ in range(n)]
for x, y in edges:
    g[x].append(y)          # ① 只从 x 指向 y

# ===== 带权图：邻居存 (节点, 权重) 元组 =====
g = [[] for _ in range(n)]
for x, y, w in weighted_edges:
    g[x].append((y, w))     # ① 取邻居时解包：for y, w in g[x]
```

三个必踩的坑：

- **`[[0]*n]*n` 是浅拷贝**：外层复制的是同一行的引用，改一行等于改所有行。正确写法是 `[[0]*cols for _ in range(rows)]`；
- **节点编号不一定是 0..n−1**：可能是 1..n、也可能是字符串，改用 `defaultdict(list)`；
- **n 要按编号集合定**：`max_node + 1`，少一格就 IndexError。

## 遍历一：BFS

广度优先搜索（breadth-first search，BFS）用队列：从起点出发，先访问距离为 1 的节点，再访问距离为 2 的，逐层扩散。它的关键性质是**第一次到达某节点时走的就是最少的边数**——队列先入先出，距离近的节点必然先出队。这也是它只在无权图（或等权图）上成立的原因。

```python
from collections import deque

def bfs(n, edges, start):
    """无权图单源最短路；不可达记 -1。时间 O(n + m)"""
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y)
        g[y].append(x)

    dis = [-1] * n          # ① -1 表示未访问（不能用 0，距离本身就是 0）
    dis[start] = 0
    q = deque([start])

    while q:
        x = q.popleft()                 # ② 出队的顺序 = 距离递增的顺序
        for y in g[x]:
            if dis[y] == -1:            # ③ 只认第一次到达
                dis[y] = dis[x] + 1
                q.append(y)
    return dis
```

拿本文那张无权图、从 0 出发走一遍（括号里是队列内容）：

```text
初始        dis[0]=0, q=[0]
出 0 → 邻 1、2 未访问   dis[1]=dis[2]=1, q=[1,2]
出 1 → 邻 3、4 未访问   dis[3]=dis[4]=2, q=[2,3,4]
出 2 → 邻 0、4 都已访问  不变
出 3 → 邻 5 未访问       dis[5]=3, q=[4,5]
出 4 → 邻 1、2、5 都已访问  不变
出 5 → 邻 3、4 都已访问    不变
最终 dis = [0, 1, 1, 2, 2, 3]
```

按距离分层就是 `{0} → {1,2} → {3,4} → {5}` 四层，这正是「逐层扩散」的含义。

![BFS 按层扩散，队列里始终是同一层和下一层](/diagrams/graph-bfs-layers.png)

要输出**具体路径**，就再记一个 `parent[y] = x`，从终点沿 `parent` 一路回溯到起点，再反向取序。

## 遍历二：DFS

深度优先搜索（depth-first search，DFS）用栈（递归或显式栈）：沿一条路径深入到底，无法继续时回溯换分支。

| | BFS | DFS |
|---|---|---|
| 容器 | 队列（deque） | 递归栈 / 显式栈 |
| 形态 | 逐层扩散 | 沿一条分支走到底 |
| 无权最短路 | 天然支持 | 不支持 |
| 适配 | 最短路、层序、最少步数 | 连通性、拓扑序、枚举与回溯 |
| 空间 | 最坏 O(n)（队列） | 最坏 O(n)（栈深） |

```python
def dfs_all(n, edges, start):
    """从 start 出发的 DFS 访问顺序。O(n + m)"""
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y)
        g[y].append(x)

    vis = [False] * n
    order = []

    def dfs(x):
        vis[x] = True               # ① 进入就标记，防止在环上打转
        order.append(x)
        for y in g[x]:
            if not vis[y]:
                dfs(y)

    dfs(start)
    return order
```

本文那张图、从 0 出发、邻居按边的输入顺序访问，走法是 `0 → 1 → 3 → 5 → 4 → 2`：0 先到 1，1 先到 3，3 只能到 5，5 回到 4，4 的两个邻居都访问过，回溯到 1 再走 2。

连通性判断是 DFS 的代表用法：从任一节点出发遍历，看是否覆盖全部节点（或逐个未覆盖起点切段）：

```python
def is_connected(n, edges):
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n
    def dfs(x):
        vis[x] = True
        for y in g[x]:
            if not vis[y]:
                dfs(y)

    dfs(0)
    return all(vis)          # ① 一次遍历覆盖全部 = 连通
```

两种遍历的取舍：求最短路/最少步数 → BFS；判断连通、枚举路径（回溯） → DFS；拓扑排序两者皆可（见下）。

## 网格图：隐式的图

网格（grid）图的顶点是每个格子，边是「相邻」（默认上下左右四方向，可扩到含对角线的八方向），默认无向无权。它与显式图的差异在**邻接关系由坐标算出，不需要 edges 列表**：

```python
directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]          # ① 上下左右
directions_8 = [(-1,-1),(-1,0),(-1,1),(0,-1),
                (0,1),(1,-1),(1,0),(1,1)]                # ② 含对角线

for dr, dc in directions:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:                 # ③ 先判界内
        ...   # 处理邻居 (nr, nc)
```

与二叉树 DFS 的对照是理解网格 DFS 的关键：

| | 二叉树 | 网格图 |
|---|---|---|
| 起点 | 根节点 | 任意一个未处理格子 |
| 分支 | 左右两个儿子 | 上下左右（或八方向） |
| 边界 | 空节点 | 出界 / 障碍 / **已访问** |
| 要不要标记已访问 | 不需要（树无环） | **必须标记**（网格可成环，无标记则死循环） |

岛屿问题模板（[200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/)）：每个还是 `'1'` 的格子都是一个新岛屿的入口，DFS 把整片陆域改成已访问态：

```python
def numIslands(grid):
    rows, cols = len(grid), len(grid[0]) if grid else 0

    def dfs(r, c):
        # ① 出界或不是陆地，直接回头
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != '1':
            return
        grid[r][c] = '2'                     # ② 先标记再递归，否则会来回走
        dfs(r - 1, c); dfs(r + 1, c)
        dfs(r, c - 1); dfs(r, c + 1)

    ans = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':            # ③ 每片新陆地 = 一个新岛屿
                ans += 1
                dfs(r, c)
    return ans
```

标记已访问的三种写法按约束选：**改原数组**（最常用，0 额外空间）、`vis` 二维数组（原数组不能动）、集合（稀疏访问）。

## 最短路径：按图与权值选算法

| 算法 | 时间复杂度 | 适用条件 |
|------|-----------|---------|
| BFS | O(n + m) | 无权图 |
| 0-1 BFS | O(n + m) | 边权只有 0 / 1 |
| Dijkstra（堆优化） | O((n + m) log n) | **边权非负（最常用）** |
| Bellman-Ford / SPFA（队列优化的 Bellman-Ford） | O(n · m) | 允许负权，可检测负环 |
| Floyd | O(n³) | 多源：任意两点对的最短路 |

### Dijkstra

贪心结构：每次取出**当前距起点最近的未定节点**确定它，再用它松弛邻居。贪心成立的前提正是「边权非负」——被确定的节点此后不可能经由其它路径更短（多走任何一条边只会加距离）。

![Dijkstra：先定最近的，再松弛它的邻居](/diagrams/graph-dijkstra.png)

```python
import heapq

def dijkstra(n, edges, start):
    """返回 start 到各点的最短路长度；不可达为 inf。O((n + m) log n)"""
    g = [[] for _ in range(n)]
    for x, y, wt in edges:
        g[x].append((y, wt))
        g[y].append((x, wt))        # ① 无向带权图，两个方向都要加

    dis = [float('inf')] * n
    dis[start] = 0
    h = [(0, start)]                # ② 小顶堆，元素是 (当前距离, 节点)

    while h:
        dx, x = heapq.heappop(h)
        if dx > dis[x]:             # ③ 过期记录：这个点已有更短方案
            continue
        for y, wt in g[x]:
            nd = dx + wt
            if nd < dis[y]:         # ④ 松弛成功才入堆
                dis[y] = nd
                heapq.heappush(h, (nd, y))
    return dis
```

**`dx > dis[x]` 这一行跳的是什么**：松弛会为同一节点多次入堆——`dis[4]` 先有 8、后有 7，堆里就同时有 `(8,4)` 与 `(7,4)`。先弹出 `(7,4)` 正常处理，后弹出 `(8,4)` 时 `8 > dis[4] = 7`，跳过。结果正确性由这一行担保，代价是堆里可能有重复记录。

拿本文的带权图、从 0 出发走一遍：

```text
初始             dis[0]=0，堆 [(0,0)]
出 (0,0)         松弛 1→4、2→1            堆 [(1,2),(4,1)]
出 (1,2)         松弛 4→8                  堆 [(4,1),(8,4)]
出 (4,1)         松弛 3→9、4→7（更新）      堆 [(7,4),(8,4),(9,3)]
出 (7,4)         松弛 5→9                  堆 [(8,4),(9,3),(9,5)]
出 (8,4)         8 > dis[4]=7 → 跳过
出 (9,3)         松弛 5→15，不更新
出 (9,5)         结束
最终 dis = [0, 4, 1, 9, 7, 9]
```

**负权边为什么直接不能用**：贪心的第一步「被确定的节点不会再更短」不再成立——先确定了一个点，后面一条负边绕回来可能让它更短，但算法已经不回头看它了。负权场景换 Bellman-Ford。

### 0-1 BFS

边权只有 0 与 1 时，双端队列替代堆：**走 0 边放到队首、走 1 边放到队尾**。队列里始终保持「距离非降」，弹出顺序与 Dijkstra 的堆等价，log 去掉：

```python
from collections import deque

def zero_one_bfs(n, edges, start):
    """边权只有 0/1 的单源最短路。O(n + m)"""
    g = [[] for _ in range(n)]
    for x, y, w in edges:
        g[x].append((y, w))
        g[y].append((x, w))

    dis = [-1] * n
    dis[start] = 0
    dq = deque([start])

    while dq:
        x = dq.popleft()
        for y, w in g[x]:
            nd = dis[x] + w
            if dis[y] == -1 or nd < dis[y]:
                dis[y] = nd
                if w == 0:
                    dq.appendleft(y)   # ① 0 边不增加距离，优先处理
                else:
                    dq.append(y)       # ② 1 边距离 +1，排到队尾
    return dis
```

### Bellman-Ford

按「最多 n−1 轮、每轮松弛全部边」推进。第 k 轮结束时，最短路最多用 k 条边的答案已经确定；第 n 轮还能更新，就说明存在**负环**（绕一圈还能更短）：

```python
def bellman_ford(n, edges, start):
    """允许负权；有负环返回 None。O(n · m)"""
    dis = [float('inf')] * n
    dis[start] = 0

    for _ in range(n - 1):              # ① 最多 n-1 条边
        changed = False
        for u, v, w in edges:
            if dis[u] + w < dis[v]:
                dis[v] = dis[u] + w
                changed = True
        if not changed:                 # ② 提前收敛
            break

    for u, v, w in edges:               # ③ 第 n 轮还能松弛 = 负环
        if dis[u] + w < dis[v]:
            return None
    return dis
```

Floyd 是三行三重循环的「任意两点最短路」，适合 n ≤ 500 的全源查询；实际面试里出现频率远低于前三个。

## 拓扑排序

拓扑排序是**有向图的节点的一种线性序**，使每条边 `u → v` 都满足 u 在 v 之前。它是否存在与图的形态直接绑定：**有环则不存在拓扑序**（环上的节点两两互相依赖，任何序都有至少一条边不满足）。课程先修关系是标准场景。**有向无环图（directed acyclic graph，DAG）**的拓扑序一般不唯一。

### Kahn 算法（BFS + 入度表，主推）

反复摘「入度为 0」的节点——它没有未完成的前置；摘走后邻居入度 −1，降到 0 的自动获得资格。本质就是用队列维持「当前全部无依赖的节点的集合」：

```python
from collections import deque

def topological_sort(n, edges):
    """DAG 返回其中一个拓扑序；含环返回 []"""
    g = [[] for _ in range(n)]
    in_deg = [0] * n
    for x, y in edges:
        g[x].append(y)
        in_deg[y] += 1                 # ① 每条边给终点的入度 +1

    q = deque(i for i, d in enumerate(in_deg) if d == 0)   # ② 无前置的先入队
    order = []

    while q:
        x = q.popleft()
        order.append(x)
        for y in g[x]:
            in_deg[y] -= 1             # ③ 前置被摘走，入度减一
            if in_deg[y] == 0:
                q.append(y)

    return order if len(order) == n else []   # ④ 长度不足 = 有环
```

拿本文的有向图走一遍：

```text
in_deg = [0,1,1,1,2,2]，q=[0]
摘 0 → 1、2 的入度降到 0 入队      q=[1,2]
摘 1 → 3 降到 0 入队，4 降到 1      q=[2,3]
摘 2 → 4 降到 0 入队               q=[3,4]
摘 3 → 5 降到 1
摘 4 → 5 降到 0 入队               q=[5]
摘 5 → 结束
order = [0, 1, 2, 3, 4, 5]，长度 6 = n，无环
```

同一张图也可以得到 `[0, 2, 1, 3, 4, 5]`——1 与 2 之间没有依赖，谁先都行。

![Kahn：入度归零的节点才能出队](/diagrams/graph-topo-kahn.png)

**有环的信号就是最终序的长度小于 n**——环上的节点入度永不降为 0。所以**返回前必须校验长度**，直接返回列表的路在课程表题（207）必然答错。

### DFS + 后序反向

DFS 沿所有邻居走完（`vis[x] = 2`）才把 x 入列，**后序倒序**就是拓扑序：被依赖者总是更早收场（后序位置更靠前）：

```python
def topological_sort_dfs(n, edges):
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y)

    vis = [0] * n       # ① 0 未访问 / 1 在递归路径上 / 2 已完成
    order = []

    def dfs(x):
        vis[x] = 1
        for y in g[x]:
            if vis[y] == 1:            # ② 指回当前路径 = 环
                return False
            if vis[y] == 0 and not dfs(y):
                return False
        vis[x] = 2
        order.append(x)                # ③ 后序：邻居都完成了才记自己
        return True

    for i in range(n):
        if vis[i] == 0 and not dfs(i):
            return []
    return order[::-1]                 # ④ 后序反向
```

三色标记是有向图环检测的通用做法：无向图判「邻居已访问且不是父节点」，有向图判「邻居标记为 1（仍在当前递归路径上）」——因为反向边在「路径」里，不在「访问过」里。

### 拓扑序作为 DP 的遍历顺序

DAG 上的最优路径（最长链、课程表两问 207 / 210、并行课程 1136）要求「依赖先算」，这个顺序就是拓扑序：

```python
from collections import deque

def longest_path_in_dag(n, edges):
    """DAG 上最长链的节点数；含环返回 -1"""
    g = [[] for _ in range(n)]
    in_deg = [0] * n
    for x, y in edges:
        g[x].append(y)
        in_deg[y] += 1

    q = deque(i for i in range(n) if in_deg[i] == 0)
    dp = [1] * n                       # ① dp[x] = 以 x 结尾的最长链

    while q:
        x = q.popleft()
        for y in g[x]:
            dp[y] = max(dp[y], dp[x] + 1)   # ② 拓扑序保证 dp[x] 已定
            in_deg[y] -= 1
            if in_deg[y] == 0:
                q.append(y)

    return max(dp) if all(d == 0 for d in in_deg) else -1
```

## 连通性

### 连通分量

无向图中互相可达的节点组成的**极大连通子图**。逐个未访问顶点发起一次遍历，每次发起即覆盖一个新连通块：

```python
def component_sizes(n, edges):
    """返回每个连通块的大小"""
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n

    def dfs(x):
        vis[x] = True
        size = 1                       # ① 自己算一个
        for y in g[x]:
            if not vis[y]:
                size += dfs(y)         # ② 加上每棵子树
        return size

    return [dfs(i) for i in range(n) if not vis[i]]
```

岛屿数量 / 省份数量就是网格图与邻接矩阵形态下的连通分量计数；动态加边版（一边加一边合并）切换到[并查集](unionfind.md)，两路数出来的 `cc` 是同一个语义。

### 强连通分量（Tarjan）

有向图里「任意两点互相可达」的极大点集。Tarjan 用一次 DFS 解决：`dfn[u]` 是首次访问时间，`low[u]` 是 u 及其子树能**回到的最早时间**。`low[u] == dfn[u]` 时，u 就是当前强连通分量的根，把栈里 u 以上的节点一起弹出。

强连通需要环，所以换一个 5 节点的小图：`0→1, 1→2, 2→0, 2→3, 3→4, 4→3`，两个分量是 `{0,1,2}` 与 `{3,4}`。

```python
def scc(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)

    dfn = [-1] * n          # ① 首次访问时间，-1 = 没访问过
    low = [0] * n           # ② 能回到的最早时间
    on_stack = [False] * n
    stack = []
    comps = []
    timer = 0

    def dfs(u):
        nonlocal timer
        dfn[u] = low[u] = timer
        timer += 1
        stack.append(u)
        on_stack[u] = True

        for v in g[u]:
            if dfn[v] == -1:
                dfs(v)
                low[u] = min(low[u], low[v])     # ③ 子树能回更早，我也能
            elif on_stack[v]:
                low[u] = min(low[u], dfn[v])     # ④ 回边：指向栈内节点

        if low[u] == dfn[u]:                     # ⑤ u 是分量的根
            comp = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp.append(w)
                if w == u:
                    break
            comps.append(comp)

    for u in range(n):
        if dfn[u] == -1:
            dfs(u)
    return comps
```

缩点之后得到的就是 DAG——「强连通分量缩点 + 拓扑排序」是很多有向图题的固定组合。

### 二分图判定

二分图是「顶点能分成两组，每条边都跨组」的图。判据只有一条：**从任一顶点出发染色，相邻必须异色；染出冲突就是存在奇环，不是二分图**。

```python
from collections import deque

def is_bipartite(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)

    color = [-1] * n                   # ① -1 未染，0/1 两组
    for s in range(n):
        if color[s] != -1:
            continue
        color[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for v in g[u]:
                if color[v] == -1:
                    color[v] = color[u] ^ 1   # ② 染成相反色
                    q.append(v)
                elif color[v] == color[u]:
                    return False              # ③ 相邻同色 = 奇环
    return True
```

本文那张无权图是二分图，一种合法分法是 `{0, 3, 4}` 与 `{1, 2, 5}`。只要在 1 和 2 之间再加一条边，`0-1-2-0` 就成了奇环，染色立刻冲突。

![二分图：每条边都跨两组，冲突即奇环](/diagrams/graph-bipartite.png)

二分图的价值在于「最大匹配」：匈牙利算法、网络流都建立在它上面；「课程表」「任务分配」这类题先判二分图，再谈匹配。

## 最小生成树

生成树是连通无向图的一棵**包含全部 n 个顶点、恰好 n−1 条边**的子图。最小生成树（minimum spanning tree，MST）是边权总和最小的那一棵。两种算法，一个从边出发、一个从点出发：

| 算法 | 做法 | 复杂度 | 适合 |
|------|------|--------|------|
| Kruskal | 边按权排序，能合并两个不同连通块的才收 | O(m log m) | 稀疏图、边列表 |
| Prim | 从一点出发，每次收「连到树上的最便宜边」 | O((n + m) log n) | 稠密图、邻接表 |

### Kruskal：排序 + 并查集

按边权从小到大扫，**能合并的才收**（收得下 = 两端恰好分属两个连通块）；收满 n−1 条即得 MST。贪心为什么成立、以及它和并查集的分工，见[并查集](unionfind.md)的「题型三：Kruskal 最小生成树」一节——这里只留选型与代码。

```python
def kruskal(n, edges):
    """edges: [(u, v, w)]；返回 MST 总权，不连通返回 inf"""
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # ① 路径减半
            x = parent[x]
        return x

    total, used = 0, 0
    for w, u, v in sorted((w, u, v) for u, v, w in edges):
        ru, rv = find(u), find(v)
        if ru == rv:
            continue                        # ② 已连通，收下就成环
        parent[ru] = rv
        total += w
        used += 1
        if used == n - 1:                   # ③ 收满 n-1 条即止
            break

    return total if used == n - 1 else float('inf')
```

本文带权图的边按权排序：`(1, 0-2), (2, 4-5), (3, 1-4), (4, 0-1), (5, 1-3), (6, 3-5), (7, 2-4)`。依次收 `0-2`、`4-5`、`1-4`、`0-1`、`1-3`，第 6 条 `3-5` 的两端已连通（跳过），第 7 条 `2-4` 同理。总共 5 条边，权和 `1+2+3+4+5 = 15`。

### Prim：从一个点长出一棵树

维护「已进树的点集」，每次从**连接树内与树外的边**里挑最便宜的一条，把外面的点拉进来：

```python
import heapq

def prim(n, edges, start=0):
    g = [[] for _ in range(n)]
    for u, v, w in edges:
        g[u].append((v, w))
        g[v].append((u, w))

    in_mst = [False] * n
    h = [(0, start)]        # ① (连到树上的边权, 节点)
    total, used = 0, 0

    while h and used < n:
        w, u = heapq.heappop(h)
        if in_mst[u]:
            continue        # ② 已进树，跳过重复记录
        in_mst[u] = True
        total += w
        used += 1
        for v, w2 in g[u]:
            if not in_mst[v]:
                heapq.heappush(h, (w2, v))   # ③ 把新暴露的边放进堆
    return total if used == n else float('inf')
```

同一张图从 0 出发：收 `0-2(1)` → `0-1(4)` → `1-4(3)` → `4-5(2)` → `1-3(5)`，权和同样是 15，只是加边的顺序不同。两条路选出来的边集合一致——MST 可能不唯一，但总权唯一。

![Kruskal 与 Prim：一个按边扫，一个按点长](/diagrams/graph-mst.png)

## 环检测

- **无向图**：DFS 时遇到「已访问且不是父节点」的邻居即环（等价地，[并查集](unionfind.md) merge 返回 False）；
- **有向图**：DFS 三色标记（拓扑排序一节），或做拓扑排序后校验长度。

```python
def has_cycle_undirected(n, edges):
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n

    def dfs(x, parent):
        vis[x] = True
        for y in g[x]:
            if not vis[y]:
                if dfs(y, x):
                    return True
            elif y != parent:      # ① 访问过且不是来路 = 环
                return True
        return False

    for i in range(n):
        if not vis[i] and dfs(i, -1):
            return True
    return False
```

`y != parent` 这一条不能省：无向图一条边记了两次，从 x 走到 y 时 y 的邻居里必然有 x，那是**来路**不是环。

## 按问题特征选算法

| 问题特征 | 首选 |
|---------|------|
| 无权图最少步数 / 逐层扩散 | BFS |
| 连通性、枚举路径、回溯 | DFS |
| 边权只有 0/1 | 0-1 BFS |
| 边权非负、单源最短路 | Dijkstra |
| 有负权 / 判负环 | Bellman-Ford |
| 任意两点最短路、n 小 | Floyd |
| 有依赖关系的排序 | 拓扑排序（Kahn / DFS 后序） |
| 无向图连通块、动态加边 | 并查集 |
| 有向图互相可达的极大点集 | Tarjan 强连通分量 |
| 顶点分组、每条边跨组 | 二分图染色 |
| 连通所有点、边权和最小 | Kruskal / Prim |

## 易错点总结

- **无向图建图丢了反向边**：`g[x].append(y)` 必须搭档 `g[y].append(x)`
- **二维数组 `[[0]*n]*n` 浅拷贝**：所有行引用同一列表，改一格等于改一列
- **BFS 用 `list.pop(0)`**：O(n) 出队，整体退化成 O(n²)——用 `deque().popleft()`
- **网格 DFS 忘了标记已访问**：进入格子先标记再递归，否则 (r, c) 之间会往复访问死循环
- **Dijkstra 遇到负权边**：贪心前提不成立，结果错误；换 Bellman-Ford
- **拓扑序长度没有校验**：含环图返回空列表这一步不能省
- **无向图判环漏了 `y != parent`**：来路被当成环，每条边都会报环
- **节点编号不是 0..n−1**：改用 `defaultdict(list)`，规模按编号集合定

## 相关题目

- BFS：[1091](https://leetcode.cn/problems/shortest-path-in-binary-matrix/)、[752 打开转盘锁](https://leetcode.cn/problems/open-the-lock/)、[433](https://leetcode.cn/problems/minimum-genetic-mutation/)
- DFS / 网格：[200 岛屿数量](https://leetcode.cn/problems/number-of-islands/)、[695 岛屿最大面积](https://leetcode.cn/problems/max-area-of-island/)、[130](https://leetcode.cn/problems/surrounded-regions/)、[79 单词搜索](https://leetcode.cn/problems/word-search/)
- 最短路：[743 网络延迟时间](https://leetcode.cn/problems/network-delay-time/)、[787 有限中转](https://leetcode.cn/problems/cheapest-flights-within-k-stops/)、[1514](https://leetcode.cn/problems/path-with-maximum-probability/)
- 拓扑：[207 课程表](https://leetcode.cn/problems/course-schedule/)、[210 课程表 II](https://leetcode.cn/problems/course-schedule-ii/)、[1136 并行课程](https://leetcode.cn/problems/parallel-courses/)
- 连通分量：[323](https://leetcode.cn/problems/number-of-connected-components-in-an-undirected-graph/)、[547 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- 最小生成树：[1584 连接所有点的最小费用](https://leetcode.cn/problems/min-cost-to-connect-all-points/)、[1135 最低成本联通所有城市](https://leetcode.cn/problems/connecting-cities-with-minimum-cost/)
- 二分图：[785 判断二分图](https://leetcode.cn/problems/is-graph-bipartite/)、[886 可能的二分法](https://leetcode.cn/problems/possible-bipartition/)

## 相关知识点

- [并查集](unionfind.md)——连通分量的动态版本、Kruskal 的部件
- [堆](heap.md)——Dijkstra 与 Prim 的优先队列
- [广度优先搜索](../patterns/bfs.md)、[深度优先搜索](../patterns/dfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：换一张自己的网格，逐步观察
BFS 如何按层扩散、最短路如何一层层走到。
