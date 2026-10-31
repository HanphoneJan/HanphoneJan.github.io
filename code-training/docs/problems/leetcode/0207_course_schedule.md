---
title: 207. 课程表
platform: LeetCode
difficulty: Medium
id: 207
url: https://leetcode.cn/problems/course-schedule/
tags:
  - 深度优先搜索
  - 广度优先搜索
  - 图
  - 拓扑排序
  - 有向无环图
topics: []
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
date_added: 2026-04-09
date_reviewed: []
---

# 207. 课程表

## 题目描述

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses-1`。

在选修某些课程之前需要一些先修课程。先修课程按数组 `prerequisites` 给出，其中 `prerequisites[i] = [ai, bi]`，表示如果要学习课程 `ai` 则必须先学习课程 `bi`。

请你判断是否可能完成所有课程的学习？

## 示例

**示例 1：**
```
输入: numCourses = 2, prerequisites = [[1,0]]
输出: true
解释: 总共有 2 门课程。要学习课程 1，你需要先完成课程 0。这是可能的。
```

**示例 2：**
```
输入: numCourses = 2, prerequisites = [[1,0],[0,1]]
输出: false
解释: 总共有 2 门课程。要学习课程 1，你需要先完成课程 0；并且要学习课程 0，你还需要先完成课程 1。这是不可能的。
```

---

## 解题思路

### 把先修关系画成有向边

`[a, b]` 表示「学 `a` 之前必须先学 `b`」，所以边从 `b` 指向 `a`：沿着边的方向走，就是「学完这门，才能学下一门」的顺序。

能修完所有课，等价于这张有向图里**没有环**：

- 没有环时，总能找到一门没有先修要求的课（入度为 0），学掉它、删掉它的出边，重复下去直到学完；
- 有环时，环上的每一门课都在等环上的另一门课，谁也开不了头。

所以题目就是「有向图判环」。下面两种写法分别从「沿路径找回头路」和「不断删掉入度为 0 的点」两个角度做同一件事。

### 写法一：DFS 三色标记

给每个节点三种状态：

- `0` 白色：还没访问；
- `1` 灰色：正在当前 DFS 路径上；
- `2` 黑色：这棵子树已经检查完，确认无环。

沿边走的时候，如果走到一个**灰色**节点，说明当前路径绕回了自己，成环；走到白色就继续递归；走到黑色说明这个分支以前查过、没问题，直接跳过。

```python
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        g = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            g[b].append(a)          # b -> a：先学 b，才能学 a

        color = [0] * numCourses    # 0 未访问，1 访问中，2 已完成

        def dfs(x: int) -> bool:
            color[x] = 1            # 进入当前路径
            for y in g[x]:
                if color[y] == 1:   # 走回当前路径上的点：有环
                    return True
                if color[y] == 0 and dfs(y):
                    return True
            color[x] = 2            # 这棵子树检查完，标记为安全
            return False

        for i in range(numCourses):
            if color[i] == 0 and dfs(i):
                return False
        return True
```

`color[x] = 2` 不能省：没有它，已经确认安全的分支会被反复递归，最坏退化成指数级；而如果错误地把节点留在灰色，下一次从别的分支走过来会误判成环。

递归深度最多等于一条路径上的课程数，`numCourses = 10^5` 且课程连成一条链时会超过 Python 的默认递归限制。这种数据规模下改用写法二更稳。

### 写法二：Kahn 算法（BFS 拓扑排序）

换一个不需要递归的角度：每次挑一门**入度为 0** 的课（没有未完成的先修课），学掉它，并把它的所有后继入度减 1。重复到没有入度为 0 的课为止。

- 如果学掉的课程数等于 `numCourses`，说明所有课都排进了拓扑序，无环；
- 如果小于 `numCourses`，剩下的课互相等待，一定在环上。

```python
from collections import deque

class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        g = [[] for _ in range(numCourses)]
        indeg = [0] * numCourses

        for a, b in prerequisites:
            g[b].append(a)
            indeg[a] += 1           # a 多了一门先修课

        q = deque(i for i in range(numCourses) if indeg[i] == 0)
        taken = 0

        while q:
            x = q.popleft()
            taken += 1
            for y in g[x]:
                indeg[y] -= 1
                if indeg[y] == 0:   # 先修课全部学完，y 可以学了
                    q.append(y)

        return taken == numCourses
```

两种写法都是 `O(V + E)` 时间、`O(V + E)` 空间。DFS 更短，但受递归深度限制；Kahn 用队列，天然没有栈溢出问题，而且稍加改动就能输出具体的学习顺序（210 题）。

---

## 完整代码实现

```python
from typing import List

class Solution:
    """
    课程表 - 拓扑排序（DFS判环）

    核心思路：
    本题本质上是判断有向图中是否存在环。
    使用三色标记法进行 DFS：
    - 0（白色）：未访问
    - 1（灰色）：正在访问中
    - 2（黑色）：已访问完毕

    时间复杂度：O(V + E)
    空间复杂度：O(V + E)
    """

    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        # 构建邻接表
        g = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            g[b].append(a)  # b -> a 的边

        colors = [0] * numCourses  # 0: 未访问, 1: 访问中, 2: 已访问

        def dfs(x: int) -> bool:
            """返回 True 表示找到了环"""
            colors[x] = 1  # 标记为访问中

            for y in g[x]:
                if colors[y] == 1:  # 发现指向访问中节点的边，有环
                    return True
                if colors[y] == 0 and dfs(y):  # 未访问，递归检查
                    return True

            colors[x] = 2  # 标记为已访问完毕
            return False

        for i in range(numCourses):
            if colors[i] == 0 and dfs(i):
                return False  # 有环

        return True  # 无环
```

---

## 示例推演

### 示例 1：`numCourses = 2, prerequisites = [[1,0]]`

边是 `0 -> 1`。

- `dfs(0)`：`color[0] = 1`，邻居是 1（白色），递归 `dfs(1)`；
- `dfs(1)`：`color[1] = 1`，没有邻居，`color[1] = 2`，返回 `False`；
- 回到 0，`color[0] = 2`，返回 `False`。

没有遇到灰色节点，返回 `True`。

### 示例 2：`numCourses = 2, prerequisites = [[1,0],[0,1]]`

边是 `0 -> 1` 和 `1 -> 0`。

- `dfs(0)`：`color[0] = 1`，走到 1；
- `dfs(1)`：`color[1] = 1`，走回 0，而 `color[0] == 1`（灰色），返回 `True`；
- 外层收到 `True`，返回 `False`。

### 一条无环链：`numCourses = 4, prerequisites = [[1,0],[2,1],[3,2]]`

图是 `0 -> 1 -> 2 -> 3`。DFS 依次把 0、1、2、3 标成灰色，3 没有邻居，回溯时依次标黑：

| 步骤 | colors | 说明 |
|---|---|---|
| 进入 0 | `[1,0,0,0]` | 灰色 |
| 进入 1 | `[1,1,0,0]` | 灰色 |
| 进入 2 | `[1,1,1,0]` | 灰色 |
| 进入 3 | `[1,1,1,1]` | 灰色 |
| 3 回溯 | `[1,1,1,2]` | 3 完成 |
| 2 回溯 | `[1,1,2,2]` | 2 完成 |
| 1 回溯 | `[1,2,2,2]` | 1 完成 |
| 0 回溯 | `[2,2,2,2]` | 0 完成 |

全程没有走到灰色节点，返回 `True`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| DFS 三色标记（最优） | O(V+E) | O(V+E) | 每个点、每条边各访问一次；递归栈另算 |
| Kahn 算法 | O(V+E) | O(V+E) | 队列 + 入度数组，无递归深度问题 |

> `V = numCourses`，`E = len(prerequisites)`。

---

## 易错点总结

1. **建图方向写反**：写成 `g[a].append(b)` 会变成「学完 `a` 才能学 `b`」，示例 1 的 `[[1,0]]` 仍然返回 `True`，但示例 2 的环方向反了，遇到更复杂的图会给出相反的答案。边必须从先修课 `b` 指向后继课 `a`。
2. **DFS 里把灰色判断写成 `== 2`**：`color[y] == 2` 表示「已经确认安全」，拿它当环的判据会漏掉所有环；示例 2 会返回 `True`。判环只能看 `== 1`。
3. **Kahn 里忘记把后继入度减 1**：只把入度为 0 的点出队、不更新 `indeg[y]`，队列很快空掉，`taken` 远小于 `numCourses`，无环的图也会被判成有环。

---

## 扩展思考

- **210 课程表 II** 要输出一个合法的学习顺序：Kahn 算法把出队顺序记下来即可；DFS 则要把节点按「完成时间」逆序输出。
- **判断无向图是否有环**用并查集更直接：逐条边合并，发现两个端点已经连通就说明成环。有向图不能这么做，因为方向会被丢掉。

---

## 相关题目

- [210. 课程表 II](https://leetcode.cn/problems/course-schedule-ii/)
- [802. 找到最终的安全状态](https://leetcode.cn/problems/find-eventual-safe-states/)
