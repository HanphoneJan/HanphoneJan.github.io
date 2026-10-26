---
title: 图
category: 数据结构
difficulty_range: [中等, 困难]
last_updated: 2026-10-27
---

# 图

## 定义

图（graph）由**顶点（vertex）**与**边（edge）**组成：顶点之间的连线记录的是任意一种成对关系，因此它是线性表与树的推广——树是「连通无环的图」，链表是一棵「每个节点只有一个孩子」的树。按边的性质把图先分类，几乎所有图算法的适用前提挂在这一层：

| 分类标准 | 类型 | 说明 | 典型场景 |
|---------|------|------|---------|
| 边的方向 | 无向图 | 边没有方向 | 社交关系 |
| | 有向图 | 边有方向 | 课程依赖、网页链接 |
| 边的权重 | 无权图 | 边只表示「相连」 | 邻接关系本身 |
| | 带权图 | 边上有数值（距离/费用/时间） | 导航、路由 |
| 连通性 | 连通图 | 任意两顶点可达 | 交通网络 |
| | 非连通图 | 有彼此不可达的顶点对 | 多个独立社群 |

算法题里图的输入一般是**边列表** `edges = [[0,1],[1,2],[2,0]]`，需要自己先建成「按节点取邻居」的结构（建图见下）。

## 存储表示

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
    g[y].append(x)   # 无向图的两条边要分开补，漏一边图就错了

# ===== 有向图 =====
g = [[] for _ in range(n)]
for x, y in edges:
    g[x].append(y)

# ===== 带权图：邻居存 (节点, 权重) 元组 =====
for x, y, w in weighted_edges:
    g[x].append((y, w))
# 节点编号不一定是 0..n-1（有的是 1..n、有的是字符串）：改用 defaultdict(list)
```

初始化有个必踩的坑：`[[0]*n]*n` 复制的是**同一行的引用**，改一行等于改所有行；正确写法是 `[['.' for _ in range(cols)] for _ in range(rows)]`（列表推导式逐行建新列表）。

## 遍历一：BFS

**BFS 用队列**：从起点出发，先访问距离为 1 的节点，再为 2 的，逐层扩散。它的关键性质是**第一次到达某节点时走的就是最少的边数**——队列先入先出，距离近的节点必然先出队。这也是它只在无权图（或等权图）上成立的原因。

```python
from collections import deque

def bfs_shortest_path(n: int, edges: list[list[int]], start: int) -> list[int]:
    """无权图单源最短路；不可达记 -1。时间 O(n + m)"""
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y)
        g[y].append(x)

    dis = [-1] * n          # -1 = 未访问（不用 0 做未访问标记，距离本身有 0）
    dis[start] = 0
    q = deque([start])

    while q:
        x = q.popleft()
        for y in g[x]:
            if dis[y] < 0:          # 只在第一次访问时记距离，此后不再更新
                dis[y] = dis[x] + 1
                q.append(y)
    return dis
```

`edges = [[0,1],[0,2],[1,3],[1,4],[2,4]]`、`start=0` 的演化：

```text
dis[0]=0, q=[0]
出 0 → 邻 1、2 未访问：dis[1]=dis[2]=1，q=[1,2]
出 1 → 邻 3、4 未访问：dis[3]=dis[4]=2，q=[2,3,4]
出 2 → 两邻都已访问：不变
出 3、4 → 无效
最终 dis = [0, 1, 1, 2, 2]
```

要输出**具体路径**，则再记 `parent[y] = x`，从终点沿 `parent` 回溯到起点反向取序。

## 遍历二：DFS

**DFS 用栈（递归或显式栈）**：沿一条路径深入到底，无法继续时回溯换分支。

| | BFS | DFS |
|---|---|---|
| 容器 | 队列（deque） | 递归栈 / 显式栈 |
| 形态 | 逐层扩散 | 沿一条分支走到底 |
| 无权最短路 | 天然支持 | 不支持 |
| 适配 | 最短路、层序、最少步数 | 连通性、拓扑序、枚举与回溯 |
| 空间 | 最坏 O(n)（队列） | 最坏 O(n)（栈深） |

连通性判断是 DFS 的代表用法：从任一节点出发遍历，看是否覆盖全部节点（或逐个未覆盖起点切段）：

```python
def is_connected(n: int, edges: list[list[int]]) -> bool:
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n
    def dfs(x: int) -> None:
        vis[x] = True
        for y in g[x]:
            if not vis[y]:
                dfs(y)
    dfs(0)
    return all(vis)
```

两种遍历的取舍：求最短路/最少步数 → BFS；判断连通、枚举路径（回溯） → DFS；拓扑排序两者皆可（BFS 入度法 / DFS 后序法，见下）。

## 网格图：隐式的图

网格（grid）图的顶点是每个格子，边是「相邻」（默认上下左右四方向，可扩到含对角线的八方向），且默认无向无权。它与显式图的差异在**邻接关系由坐标算出，不需要 edges 列表**：

```python
# (r, c) 的邻居 = 四个偏移（或八方向）
directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
directions_8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
for dr, dc in directions:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        ...   # 处理界内邻居
```

与二叉树 DFS 的对照是理解网格 DFS 的关键：

| | 二叉树 | 网格图 |
|---|---|---|
| 起点 | 根节点 | 任意一个未处理格子 |
| 分支 | 左右两个儿子 | 上下左右（或八方向） |
| 边界 | 空节点 | 出界 / 障碍 / **已访问** |
| 要不要标记已访问 | 不需要（树无环） | **必须标记**（网格可成环，无标记则死循环） |

岛屿问题模板（[200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/)）：每个还是 `'1'` 的格子都是一个新岛屿的入口，DFS/BFS 把整片陆域改成已访问态：

```python
def numIslands(grid: list[list[str]]) -> int:
    rows, cols = len(grid), len(grid[0]) if grid else 0
    def dfs(r: int, c: int) -> None:
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != '1':
            return
        grid[r][c] = '2'       # 标记已访问（直接改原数组，省 vis）
        dfs(r-1, c); dfs(r+1, c); dfs(r, c-1); dfs(r, c+1)

    ans = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
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
| Dijkstra（堆优化） | O((n + m) log m) | **边权非负（最常用）** |
| Bellman-Ford / SPFA | O(n · m) | 允许负权，可检测负环 |
| Floyd | O(n³) | 多源：任意两点对的最短路 |

### Dijkstra

贪心结构：每次取出**当前距起点最近的未定节点**确定它，用它松弛邻居。贪心成立的前提正是「边权非负」——被确定的节点此后不可能经由其它路径更短（多走任何一条边只会加距离）。算法实现里每个节点的「确定」以出堆并检验为准：

```python
import heapq

def dijkstra(n: int, edges: list[list[int]], start: int) -> list[int]:
    """返回 start 到各点的最短路长度；不可达为 inf。O((n + m) log m)"""
    g = [[] for _ in range(n)]
    for x, y, wt in edges:
        g[x].append((y, wt))

    dis = [float('inf')] * n
    dis[start] = 0
    h = [(0, start)]  # (距离, 节点) 的小顶堆

    while h:
        dx, x = heapq.heappop(h)
        if dx > dis[x]:        # 遗留的旧记录：该点已有更短方案，跳过
            continue
        for y, wt in g[x]:
            new_dis = dx + wt
            if new_dis < dis[y]:
                dis[y] = new_dis
                heapq.heappush(h, (new_dis, y))
    return dis
```

**`dx > dis[x]` 这一行跳的是什么**：松弛会为同一节点多次入堆——`dis[2]` 先有 5、后有 3，则堆里同时有 `(5,2)` 与 `(3,2)`。离堆的 `(3,2)` 正常处理，离堆 `(5,2)` 与当前答案矛盾（`5 > dis[2]`），跳过。结果虽带重复记录，正确性与有效性由这一行担保。

演算：`n=5, edges=[[0,1,2],[0,2,5],[1,2,1],[1,3,4],[2,3,1],[2,4,3],[3,4,1]], start=0`：

```text
出 (0,0)：dis[1]=2, dis[2]=5
出 (2,1)：dis[2]=3（2+1 < 5），dis[3]=6
出 (3,2)：dis[3]=4（3+1），dis[4]=6
出 (4,3)：dis[4]=5           （注：堆中旧 (5,2) 排在新 (5,4) 前）
出 (5,2)：5 > dis[2]=3 → 跳过
出 (5,4)、(6,3)、(6,4)：随序取 min 或跳过
最终 dis = [0, 2, 3, 4, 5]
```

**负权边为什么直接不能用**：贪心的第一步「被确定的节点不会再更短」不再成立——`0 --1--> 1 --(-5)--> 2 --4--> 0` 里，经负边回到 1 的路径可能比先把 1 定为 1 更短，但算法已不再回头看 1。负权场景换 Bellman-Ford（它按「最多 n−1 轮 全边松弛」这一基于轮数的上界做，天然兼容负边，且第 n 轮仍有更新即有负环）。

### 0-1 BFS

边权限于 0 与 1 时，双端队列替代堆：**走 0 边放到队首、走 1 边放到队尾**——队列里始终保持「距离单调（非降）：接近队首者更近」，从而弹出顺序与 Dijkstra 的堆等价，log 去掉：

```python
from collections import deque

def zero_one_bfs(n: int, edges: list[list[int]], start: int) -> list[int]:
    """边权只有 0/1 的单源最短路。O(n + m)"""
    g = [[] for _ in range(n)]
    for x, y, w in edges:
        g[x].append((y, w))

    dis = [-1] * n
    dis[start] = 0
    dq = deque([start])

    while dq:
        x = dq.popleft()
        for y, w in g[x]:
            new_dis = dis[x] + w
            if dis[y] < 0 or new_dis < dis[y]:
                dis[y] = new_dis
                if w == 0:
                    dq.appendleft(y)  # 0 边：不增加距离，优先处理
                else:
                    dq.append(y)      # 1 边：距离 +1，排后面
    return dis
```

## 拓扑排序

拓扑排序（topological order）是**有向图的节点一种线性序**，使每条边 `u → v` 都满足 u 在 v 之前。它存在的问题与图的形态直接绑定：**有环则不存在拓扑序**（环上的节点两两互相「依赖」，任何序都有至少一条不满足）。课程先修关系是标准场景。任何 DAG 可能有不唯一的拓扑序，同一图可以产生多种合法序。

### Kahn 算法（BFS + 入度表，主推）

反复摘「入度为 0」的节点——它没有未完成的前置；摘走后邻居入度 −1，降到 0 的自动获得资格。本质就是用队列维持「当前全部无依赖的节点的集合」：

```python
from collections import deque

def topological_sort(n: int, edges: list[list[int]]) -> list[int]:
    """DAG 返回其中一个拓扑序；含环返回 []"""
    g = [[] for _ in range(n)]
    in_deg = [0] * n
    for x, y in edges:
        g[x].append(y)
        in_deg[y] += 1

    topo_order = []
    q = deque(i for i, d in enumerate(in_deg) if d == 0)

    while q:
        x = q.popleft()
        topo_order.append(x)
        for y in g[x]:
            in_deg[y] -= 1
            if in_deg[y] == 0:
                q.append(y)

    return topo_order if len(topo_order) == n else []   # < n = 有环
```

`n=6, edges=[[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]` 的演化：初始 `in_deg=[2,2,1,1,0,0]`，q=[4,5]；摘 4 → 0、1 的入度降到 1；摘 5 → 2、0 的入度降到 0 入队；摘 2 → 3 降 0；摘 0（无出边）；摘 3 → 1 降 0；摘 1。序为 `[4, 5, 2, 0, 3, 1]`，长度 6 == n，无环。

**有环的信号就是最终序的长度小于 n**——环上的节点入度永不降为 0。所以**返回前必须校验长度**，「直接返回列表」这一没有校验的路在课程表题（207）必然答错。

### DFS + 后序反向

DFS 沿所有邻居走完（vis[x]=2）才把 x 入列，**后序倒序**就是拓扑序：被依赖者总是更早收场（后序位置更靠前）；正向记录则反转一下：

```python
def topological_sort_dfs(n: int, edges: list[list[int]]) -> list[int]:
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y)

    vis = [0] * n   # 0 未访问 / 1 在栈路径上 / 2 完成 —— 三色标记
    order = []
    def dfs(x: int) -> bool:
        vis[x] = 1
        for y in g[x]:
            if vis[y] == 1:          # 指向仍在栈路径上的节点 = 回到本路径 = 环
                return False
            if vis[y] == 0 and not dfs(y):
                return False
        vis[x] = 2
        order.append(x)
        return True
    for i in range(n):
        if vis[i] == 0 and not dfs(i):
            return []
    return order[::-1]
```

三色标记是有向图环检测的通用做法：无向图判「邻居已访问且不是父节点」，有向图判「邻居标记为 1（即仍在当前递归路径上）」——因为反向边在「路径」里而不在「访问过」里。

### 拓扑序作为 DP 的遍历顺序

DAG 上的最优路径（最长链、课程表两问）「依赖先算」的顺序关系即拓扑序，所以 DP 要按拓扑序推进。课程链（207 / 210、1136）题版：

```python
from collections import deque

def longest_path_in_dag(n: int, edges: list[list[int]]) -> int:
    g = [[] for _ in range(n)]
    in_deg = [0] * n
    for x, y in edges:
        g[x].append(y)
        in_deg[y] += 1

    q = deque(i for i in range(n) if in_deg[i] == 0)
    dp = [1] * n          # dp[x] = 以 x 结尾的最长链

    while q:
        x = q.popleft()
        for y in g[x]:
            dp[y] = max(dp[y], dp[x] + 1)   # 拓扑序保证 dp[x] 已定
            in_deg[y] -= 1
            if in_deg[y] == 0:
                q.append(y)

    return max(dp)
```

## 连通分量

无向图中互相可达的节点组成的**极大连通子图**。逐个未访问顶点发起一次遍历，每次发起即覆盖一个新连通块：

```python
def count_components(n: int, edges: list[list[int]]) -> list[int]:
    """返回每个连通块的大小"""
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n
    def dfs(x: int) -> int:
        vis[x] = True
        size = 1
        for y in g[x]:
            if not vis[y]:
                size += dfs(y)
        return size

    return [dfs(i) for i in range(n) if not vis[i]]
```

岛屿数量 / 省份数量就是网格图与邻接矩阵形态下的连通分量计数；动态加边版（一遍一边合并）则切换到[并查集](unionfind.md)，两路数出来的 `cc` 同一语义。

## 环检测

- **无向图**：DFS 时遇到「已访问且不是父节点」的邻居即环（等价地，按 [并查集](unionfind.md) merge 的 False 信号）：
- **有向图**：DFS 三色标记（上）；或做拓扑排序验证长度（上）。

```python
def has_cycle_undirected(n: int, edges: list[list[int]]) -> bool:
    g = [[] for _ in range(n)]
    for x, y in edges:
        g[x].append(y); g[y].append(x)

    vis = [False] * n
    def dfs(x: int, parent: int) -> bool:
        vis[x] = True
        for y in g[x]:
            if not vis[y]:
                if dfs(y, x):
                    return True
            elif y != parent:
                return True
        return False

    for i in range(n):
        if not vis[i] and dfs(i, -1):
            return True
    return False
```

## 易错点总结

- **无向图建图丢了反向边**：`g[x].append(y)` 必须搭档 `g[y].append(x)`
- **二维数组 `[[0]*n]*n` 浅拷贝**：所有行引用同一列表，改一格等于改一列
- **BFS 用 `list.pop(0)`**：O(n) 出队，整体退化成 O(n²)——用 `deque().popleft()`
- **网格 DFS 忘了标记已访问**：进入格子先标记再递归，否则 (r, c) 之间会往复访问死循环
- **Dijkstra 遇到负权边**：贪心前提不成立，结果错误；换 Bellman-Ford
- **拓扑序长度没有校验**：含环图返回空列表这一步不能省
- **节点编号不是 0..n−1**：改用 `defaultdict(list)`，规模按编号集合定

## 相关题目

- BFS：[1091](https://leetcode.cn/problems/shortest-path-in-binary-matrix/)、[752 打开转盘锁](https://leetcode.cn/problems/open-the-lock/)、[433](https://leetcode.cn/problems/minimum-genetic-mutation/)
- DFS / 网格：[200 岛屿数量](https://leetcode.cn/problems/number-of-islands/)、[695 岛屿最大面积](https://leetcode.cn/problems/max-area-of-island/)、[130](https://leetcode.cn/problems/surrounded-regions/)、[79 单词搜索](https://leetcode.cn/problems/word-search/)
- 最短路：[743 网络延迟时间](https://leetcode.cn/problems/network-delay-time/)、[787 有限中转](https://leetcode.cn/problems/cheapest-flights-within-k-stops/)、[1514](https://leetcode.cn/problems/path-with-maximum-probability/)
- 拓扑：[207 课程表](https://leetcode.cn/problems/course-schedule/)、[210 课程表 II](https://leetcode.cn/problems/course-schedule-ii/)、[1136 并行课程](https://leetcode.cn/problems/parallel-courses/)
- 连通分量：[323](https://leetcode.cn/problems/number-of-connected-components-in-an-undirected-graph/)、[547 省份数量](https://leetcode.cn/problems/number-of-provinces/)

## 相关知识点

- [并查集](unionfind.md)——连通分量的动态版本
- [堆](heap.md)——Dijkstra 的优先队列与惰性删除
- [广度优先搜索](../patterns/bfs.md)、[深度优先搜索](../patterns/dfs.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：换一张自己的网格，逐步观察
BFS 如何按层扩散、最短路如何一层层走到。
