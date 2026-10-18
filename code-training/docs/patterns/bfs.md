---
title: BFS 模式
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 树
  - 图
  - 矩阵
last_updated: 2026-10-19
---

# BFS（广度优先搜索）

## 一句话说清 BFS

从起点出发，**先看完所有距离为 1 的点，再看距离为 2 的点**，像水波一样一圈一圈往外扩。
这个「按距离分层」的顺序由**先进先出队列**保证，也是 BFS 能求最短路的根本原因。

```
起点 ──► 距离 1 的所有点 ──► 距离 2 的所有点 ──► ...
        （同一层内部不分先后）
```

## 为什么队列能保证「第一次到达就是最短」

BFS 有两个同时成立的性质：

1. **出队顺序的距离单调不降。** 起点距离为 0；每次把邻居入队时，邻居的距离是当前点距离 + 1。
   队列先进先出，所以距离小的点一定先出队。
2. **同一时刻队列里的点，距离最多相差 1。** 因为只有当前层处理完，才会开始处理下一层。

由此得到一个重要结论：**在边权都为 1 的图里，一个点第一次被访问时，走的就是最短路径。**
之后即使还有别的路径能到达它，也不会更短，所以可以直接标记为「已访问」，不再入队。

> **边权不全是 1 时，BFS 不再正确。** 例如边权有 0、2、5，先出队不代表距离更近，
> 这时要用优先队列（Dijkstra），或者边权只有 0/1 时用双端队列的 0-1 BFS。

### 为什么必须在「入队时」标记访问

```python
# 正确：入队时立刻标记
if not visited[nr][nc]:
    visited[nr][nc] = True
    q.append((nr, nc))

# 错误：出队时才标记
q.append((nr, nc))
...
r, c = q.popleft()
visited[r][c] = True   # 同一个格子可能已经被多个邻居重复入队
```

如果出队才标记，同一层的多个点会把自己的共同邻居反复塞进队列。
最坏情况下一个点会被重复入队很多次，队列规模从 `O(V)` 膨胀到与边数同级甚至更大 ——
答案看起来仍然正确，这是最隐蔽的一类超时。

## 什么时候该想到 BFS

| 题目信号 | 对应模型 |
| --- | --- |
| 「最少走几步」「最少几次操作」「最短距离」 | 无权图最短路 |
| 「按层输出」「每一层」「右视图」 | 树的层序遍历 |
| 「同时从多个点开始扩散」「到最近的源的距离」 | 多源 BFS |
| 「课程先后顺序」「能否完成所有任务」 | DAG 上的拓扑排序（Kahn） |
| 「每次只能变一个字符 / 拨一位数字」 | 状态空间搜索 |
| 「把所有可达位置找出来」 | 连通块遍历（BFS / DFS 都可以） |

**不适合 BFS 的情况：**

- **带权最短路**：用 Dijkstra（优先队列），BFS 的「先到即最短」不成立。
- **要枚举所有路径 / 所有方案**：BFS 只擅长找「第一个」，枚举要用 DFS + 回溯。
- **只要判断连通性、且图很深**：DFS 的空间是 O(高度)，BFS 要存一整层，DFS 更省内存。
- **需要利用子问题结果**：比如树形 DP、记忆化搜索，DFS 的后序位置更自然。

## 通用模板

### 模板一：树的层序遍历

```python
from collections import deque

def level_order(root):
    if not root:
        return []

    ans = []
    q = deque([root])

    while q:
        level = []
        # 关键：先记下当前层的节点数，循环中 q 的长度会变
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        ans.append(level)

    return ans
```

`for _ in range(len(q))` 是层序的灵魂：它把「当前层」和「下一层」切开。
如果只写 `while q: node = q.popleft()`，得到的是普通的逐点遍历，分不出层。

### 模板二：图的最短路

```python
from collections import deque

def shortest_path(graph, start, target):
    if start == target:
        return 0

    dist = {start: 0}
    q = deque([start])

    while q:
        u = q.popleft()
        for v in graph[u]:
            if v in dist:          # 入队时就记距离，同时也当 visited 用
                continue
            dist[v] = dist[u] + 1
            if v == target:        # 可以在入队时提前返回
                return dist[v]
            q.append(v)

    return -1
```

### 模板三：网格 BFS

```python
from collections import deque

def bfs_grid(grid, start, target):
    rows, cols = len(grid), len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    sr, sc = start
    dist[sr][sc] = 0
    q = deque([(sr, sc)])

    while q:
        r, c = q.popleft()
        if (r, c) == target:
            return dist[r][c]

        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] != '#'
                    and dist[nr][nc] == -1):
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))

    return -1
```

网格题把「距离」直接存在 `dist` 里，`-1` 同时表示「没访问过」。这比另开一个 `visited` 更省事，
也不容易漏掉标记。

### 模板四：多源 BFS

```python
from collections import deque

def multi_source(grid):
    rows, cols = len(grid), len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    q = deque()

    # 所有源点一起入队，距离都是 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 'S':
                dist[r][c] = 0
                q.append((r, c))

    while q:
        r, c = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] != '#'
                    and dist[nr][nc] == -1):
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))

    return dist
```

多源 BFS 可以理解成：**建一个虚拟超级源点，到所有真实源点的边权为 0**。
这样「到最近源点的距离」就变成了普通 BFS 的最短路。

### 模板五：拓扑排序（Kahn 算法）

```python
from collections import deque

def topo_sort(num_nodes, edges):
    graph = [[] for _ in range(num_nodes)]
    indeg = [0] * num_nodes

    for u, v in edges:          # u -> v
        graph[u].append(v)
        indeg[v] += 1

    q = deque(i for i in range(num_nodes) if indeg[i] == 0)
    order = []

    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:   # 所有前驱都处理完了，v 才能入队
                q.append(v)

    return order if len(order) == num_nodes else []   # 长度不够说明有环
```

拓扑排序是 BFS 在 DAG 上的特例：**入度为 0 = 当前可以访问**。
队列里同时可能有多门课，它们的先后顺序不影响合法性。

## 例题精讲

### 例 1：二叉树的层序遍历（LeetCode 102）

[102. 二叉树的层序遍历](../problems/leetcode/0102_binary_tree_level_order_traversal.md)

```
        3
       / \
      9   20
         /  \
        15   7
```

推演队列的变化：

| 轮次 | 出队前队列 | 本层结果 | 入队后队列 |
| --- | --- | --- | --- |
| 1 | `[3]` | `[3]` | `[9, 20]` |
| 2 | `[9, 20]` | `[9, 20]` | `[15, 7]` |
| 3 | `[15, 7]` | `[15, 7]` | `[]` |

最终 `[[3], [9, 20], [15, 7]]`。

每轮开始时 `len(q)` 正好是这一层的节点数。只要在处理下一层之前把这个数字存下来，
`for` 循环就不会被新入队的节点干扰。

### 例 2：二叉树的右视图（LeetCode 199）

[199. 二叉树的右视图](../problems/leetcode/0199_binary_tree_right_side_view.md)

右视图就是「每一层的最后一个节点」。层序遍历时记录每层的最后一个值即可：

```python
def right_side_view(root):
    if not root:
        return []

    ans = []
    q = deque([root])

    while q:
        size = len(q)
        for i in range(size):
            node = q.popleft()
            if i == size - 1:       # 本层最后一个
                ans.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)

    return ans
```

### 例 3：岛屿数量（LeetCode 200）

[200. 岛屿数量](../problems/leetcode/0200_number_of_islands.md)

把每个 `'1'` 看作图上的一个点，上下左右相邻的 `'1'` 之间有一条边。
「岛屿个数」就是**连通块个数**：每遇到一个没访问过的 `'1'`，答案加一，然后用 BFS 把整块淹掉。

```python
from collections import deque

def num_islands(grid):
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0
    directions = ((1, 0), (-1, 0), (0, 1), (0, -1))

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != '1':
                continue

            count += 1
            grid[r][c] = '0'          # 入队前就标记，避免重复入队
            q = deque([(r, c)])

            while q:
                x, y = q.popleft()
                for dx, dy in directions:
                    nx, ny = x + dx, y + dy
                    if (0 <= nx < rows and 0 <= ny < cols
                            and grid[nx][ny] == '1'):
                        grid[nx][ny] = '0'
                        q.append((nx, ny))

    return count
```

这里直接把原矩阵的 `'1'` 改成 `'0'` 当作 visited，省掉一个二维数组。
如果题目不允许修改输入，就用 `visited = [[False] * cols for _ in range(rows)]`。

> 这道题用 DFS 也完全正确，而且代码更短。选 BFS 的好处是不受递归深度限制，
> 在超大网格里不会爆栈；选 DFS 的好处是不用维护队列。两者复杂度相同。

### 例 4：课程表（LeetCode 207）

[207. 课程表](../problems/leetcode/0207_course_schedule.md)

`prerequisites = [[1, 0]]` 表示「修课程 1 之前必须先修课程 0」，即一条有向边 `0 -> 1`。
能否修完所有课，等价于**这张有向图有没有环**。

Kahn 算法从入度为 0 的课开始，每修完一门就把它指向的课入度减一。
如果最终修完的课程数等于总数，说明无环；否则剩下的课互相依赖，永远修不完。

```python
from collections import deque

def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    indeg = [0] * num_courses

    for course, pre in prerequisites:   # pre -> course
        graph[pre].append(course)
        indeg[course] += 1

    q = deque(i for i in range(num_courses) if indeg[i] == 0)
    finished = 0

    while q:
        u = q.popleft()
        finished += 1
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)

    return finished == num_courses
```

**为什么「入度减到 0」可以入队？** 入度表示「还有多少门先修课没修」。
减到 0 说明所有前置条件都满足了，这门课现在可以修 —— 这正是 BFS 的「可以访问」。

### 例 5：单词接龙（LeetCode 127）

每次只能改一个字母，求从 `beginWord` 到 `endWord` 的最少转换次数。
把每个单词看成一个点，差一个字母的两个单词之间有一条边，就是标准的无权最短路。

朴素做法是对每个单词，枚举它的所有邻居；更快的做法是把单词映射到「通配符模式」：

```python
from collections import defaultdict, deque

def ladder_length(begin_word, end_word, word_list):
    if end_word not in word_list:
        return 0

    # hot -> *ot, h*t, ho*
    patterns = defaultdict(list)
    for word in word_list:
        for i in range(len(word)):
            patterns[word[:i] + '*' + word[i + 1:]].append(word)

    q = deque([(begin_word, 1)])
    visited = {begin_word}

    while q:
        word, steps = q.popleft()
        for i in range(len(word)):
            key = word[:i] + '*' + word[i + 1:]
            for nxt in patterns[key]:
                if nxt == end_word:
                    return steps + 1
                if nxt not in visited:
                    visited.add(nxt)
                    q.append((nxt, steps + 1))

    return 0
```

每个单词只入队一次，每个模式也只被扫描一次，总复杂度是 `O(单词数 × 单词长度)`。

## 常见变体

### 1. 多源 BFS

所有源点同时入队，距离都是 0。适合「腐烂的橘子」「01 矩阵」这类**到最近源点的距离**问题。

```python
q = deque()
for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 2:       # 所有腐烂橘子都是源点
            q.append((r, c, 0))
```

### 2. 双向 BFS

从起点和终点**同时**扩展，哪一边的当前层更小就扩展哪一边，两边相遇时结束。

```python
def bidirectional(begin_word, end_word, word_list):
    words = set(word_list)
    if end_word not in words:
        return 0

    front, back = {begin_word}, {end_word}
    visited = {begin_word, end_word}
    steps = 1

    while front:
        if len(front) > len(back):     # 总是扩展更小的一边
            front, back = back, front

        nxt_level = set()
        for word in front:
            for i in range(len(word)):
                for ch in 'abcdefghijklmnopqrstuvwxyz':
                    nxt = word[:i] + ch + word[i + 1:]
                    if nxt in back:
                        return steps + 1
                    if nxt in words and nxt not in visited:
                        visited.add(nxt)
                        nxt_level.add(nxt)

        front = nxt_level
        steps += 1

    return 0
```

分支因子为 `b`、路径长度为 `d` 时，普通 BFS 要扩展约 `b^d` 个点，双向 BFS 只要约
`2 × b^(d/2)`。**注意：只有当「从起点扩展」和「从终点反向扩展」的规则一致时才能双向**，
有向图要额外建反图。

### 3. 0-1 BFS

边权只有 0 和 1 时，不必上 Dijkstra：用双端队列，权为 0 的边放队首，权为 1 的放队尾。
这样队列仍然保持距离单调，复杂度是 `O(V + E)`。

```python
def zero_one_bfs(graph, start):
    INF = float('inf')
    dist = [INF] * len(graph)
    dist[start] = 0
    dq = deque([start])

    while dq:
        u = dq.popleft()
        for v, w in graph[u]:          # w 只能是 0 或 1
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    dq.appendleft(v)
                else:
                    dq.append(v)

    return dist
```

### 4. 状态空间 BFS

把「局面」编码成一个状态（元组、字符串、整数位掩码），状态之间的转移就是边。
例如密码锁、八数码、开关灯问题。关键有三点：

- 状态必须能放进 `visited`（可哈希）；
- 转移必须枚举完整；
- 如果状态空间太大，先想有没有双向 BFS 或数学性质可用。

## 复杂度分析

| 场景 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 树的层序遍历 | O(n) | O(w) | n 是节点数，w 是最大层宽 |
| 图的 BFS | O(V + E) | O(V) | 邻接表存储；每个点入队一次 |
| 网格 BFS | O(m × n) | O(m × n) | 每个格子至多入队一次 |
| 多源 BFS | O(m × n) | O(m × n) | 所有源点一起入队，仍是线性 |
| 拓扑排序 | O(V + E) | O(V) | 每个点和每条边各处理一次 |
| 双向 BFS | O(b^(d/2)) | O(b^(d/2)) | b 是分支因子，d 是最短路径长度 |

## 易错点

- ❌ **出队才标记 visited**：同一层会重复入队，答案对但复杂度爆炸。正确做法是入队时立即标记。
- ❌ **层数用错**：`for _ in range(len(q))` 里的 `len(q)` 只算一次；写成 `while q` 就分不出层。
- ❌ **多源 BFS 只放一个源点**：把所有源点都入队、距离都设为 0，才是「同时扩散」。
- ❌ **在带权图上用 BFS**：边权不同时「先到」不等于「最短」，要用 Dijkstra。
- ❌ **字符串/状态没有去重**：同一个状态反复入队，队列会无限增长。
- ❌ **网格边界写成 `<= rows`**：下标范围是 `0 .. rows-1`，越界会静默读到别的行或报错。
- ❌ **把「步数」和「访问节点数」混在一起**：`dist` 存的是边数，不是队列里已经弹出的个数。

## 相关题目

**入门：**

- [102. 二叉树的层序遍历](../problems/leetcode/0102_binary_tree_level_order_traversal.md)
- [199. 二叉树的右视图](../problems/leetcode/0199_binary_tree_right_side_view.md)

**网格与连通块：**

- [200. 岛屿数量](../problems/leetcode/0200_number_of_islands.md)
- [shoppee 迷宫不可达格子计数](../problems/shoppee/shoppee_maze_unreachable_count.md)
- [shoppee 到陆地的最远距离](../problems/shoppee/shoppee_max_distance_to_land.md)

**图与拓扑：**

- [207. 课程表](../problems/leetcode/0207_course_schedule.md)

**状态空间：**

- [127. 单词接龙](https://leetcode.cn/problems/word-ladder/)
- [752. 打开转盘锁](https://leetcode.cn/problems/open-the-lock/)
- [433. 最小基因变化](https://leetcode.cn/problems/minimum-genetic-mutation/)

## 相关模式

- [DFS 模式](dfs.md)：同样遍历整张图，但用栈/递归，适合枚举路径与子树信息。
- [图](../data-structures/graph.md)：邻接表、连通分量、拓扑排序的完整背景。
- [树](../data-structures/tree.md)、[二叉树](../data-structures/binary_tree.md)：层序遍历的对象。
- [动态规划](dynamic_programming.md)：当 BFS 的状态可以「按层递推」时，往往能写成 DP。

## 算法可视化

下面的播放器把网格 BFS 的**队列**画了出来：`0` 是路，`#` 是墙，从左上角走到右下角。
输入格式是用分号分隔每一行（例如 `0,0,0;#,#,0;0,0,0`）。
重点观察三件事：

1. 队列（画面下方的 frontier）里的格子按距离排成一层一层，先出队的永远离起点更近；
2. 一个格子第一次被访问后就被固定下来，不会再被改 —— 这就是「入队即最短」；
3. 把墙改多、改少，路线会绕开障碍，但仍然是步数最少的那条。

终点第一次出队时，note 会打出它的最短距离。BFS 不会「撞墙后回退」，
而是把每个可达格子按层访问一次：既得到最短距离，也保证每个格子只处理一次。
