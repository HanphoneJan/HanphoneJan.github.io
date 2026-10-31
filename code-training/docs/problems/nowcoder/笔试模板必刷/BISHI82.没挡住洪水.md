---
title: 没挡住洪水
platform: NowCoder
difficulty: 简单
id: BISHI82
url: https://www.nowcoder.com/practice/6d62436fda5f4ef997e68d1ce1dd6eb2
tags:
  - 广度优先搜索
  - 深度优先搜索
  - 连通块
  - 网格
topics: []
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
date_added: 2026-10-16
date_reviewed: []
---

# BISHI82. 没挡住洪水

## 题目描述

吴铭市洪水肆虐，市政部门临时砌起的围墙是豆腐渣工程，被洪水冲毁，
只留下用 `#` 表示的空地。地图是一个 N×N 的字符矩阵：`.` 表示已经被洪水
淹没的区域，`#` 表示空地。四联通的 `#` 组成一个区域。

洪水还会继续上涨：所有与「已经被洪水淹没的区域」上下左右相邻的空地格子，
都会在这一次上涨中被淹没。请计算此次上涨后，有多少个空地区域会被
**完全淹没**。

## 输入格式

第一行输入整数 N。
随后 N 行，每行 N 个字符，构成地图，只含 `.` 与 `#`。
已知边界四条边全部是已经被洪水淹没的区域。

## 输出格式

输出一个整数，表示一天后会完全消失的空地区域数量。

## 示例

### 示例 1

**输入：**
```
1
.
```

**输出：**
```
0
```

**说明：**
地图全是水，没有任何空地区域，答案为 0。

---

## 解题思路

### 输出是什么：这一轮涨完，「整块都没了」的区域有几个

先明确三件事：

- **区域**：四联通的 `#` 组成的一块（斜着挨着不算连通）；
- **这一轮进水**：与「**原本就是** `.`」的格子上下左右相邻的 `#`；
- **完全淹没**：区域在这一轮之后一个格子都不剩。

关键在第二句的「原本就是」。这一轮上涨是**同时**发生的：某个 `#` 刚变成水，
不会在同一次上涨里再去淹它的邻居。所以判据只看第一遍地图上的 `.`。

### 一个区域被完全淹没，等价于它的每一格都临水

设区域里某一格 `c` 的四个邻居全是 `#`（也就是说它被同一块陆地包住）。
按上面的规则，`c` 这一轮不进水，区域还剩一格，就不算完全淹没。

反过来，如果区域里每一格都至少有一个方向是水，那这些格子全都在这一轮进水，
区域整体消失。

两个方向都成立，所以判据是充要的：

> 区域被完全淹没 ⇔ 区域内**每一个**格子都至少有一个四邻是 `.`。

这句话里的**每一个**是重点。只要有一格不临水，整块就被救下来了 —— 而这一格不一定是中心，
也可能是某个贴着角落的凹槽。

### 一次遍历：找区域和逐格判定同时做

外层照例从左上到右下扫描，扫到一个没被访问过的 `#` 就说明发现了一个新区域，
然后 BFS 把这块收集完。**收集的过程中顺带看每个格子的四邻**：

```python
seen[i][j] = True
queue = deque([(i, j)])
every_cell_touches_water = True          # 先假设整块都会淹
while queue:
    x, y = queue.popleft()
    touches_water = False
    for dx, dy in dirs:
        nx, ny = x + dx, y + dy
        if not (0 <= nx < n and 0 <= ny < n):
            touches_water = True         # 出界
        elif grid[nx][ny] == '.':
            touches_water = True         # 四邻是水 → 这一格这轮会进水
        elif not seen[nx][ny]:
            seen[nx][ny] = True
            queue.append((nx, ny))       # 同区域的陆地，继续收集
    if not touches_water:
        every_cell_touches_water = False  # 有一格是干的，整块的结论就定了
```

这里可以维护一个不变量：

> 每处理完一个出队格子，`every_cell_touches_water` 为 `True` ⇔ **已出队的**格子全部临水。

它只会从 `True` 变成 `False`，不会翻回来 —— 「存在一个干的格子」是既成事实，后面的格子再怎么临水也改变不了。
出队格子覆盖完整个区域后，这个标记就正好等于「整块都被淹没」。

同一个 BFS 里还顺手保证了「每个 `#` 只属于一个区域」：`seen` 在**入队时**就置 `True`，
所以一格只会进队一次；外层的 `or seen[i][j]` 保证一个区域只被计数一次。
和 BM57 岛屿数量是同一套骨架，只是多带了一个「整块是否临水」的结论。

### 另一条路：先把「这一轮会进水的格子」标出来

换一个顺序看：先不管区域，只回答「哪些格子会被淹」，再回头数区域。

```python
flood = [[False] * n for _ in range(n)]
for i in range(n):
    for j in range(n):
        if grid[i][j] != '.':
            continue
        for dx, dy in dirs:                 # 从每一格水出发，只往外走一步
            nx, ny = i + dx, j + dy
            if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == '#':
                flood[nx][ny] = True
```

这段能一遍扫完，是因为**读的是原图 `grid`、写的是另一张表 `flood`**：
`flood` 里的标记不会反过来影响判定，所以天然只扩散一层，不会连锁成「多轮上涨」。

之后再扫一遍地图分区域，块里每个格子都在 `flood` 里就计数。

两条路的复杂度一样。前一种只过一遍地图，但判定塞在 BFS 循环里；后一种把「谁会被淹」
和「谁和谁同块」拆成两件独立的事，读起来更直白，代价是多一张表、多一遍扫描。

### 关于边界

题目保证四条边全是 `.`，所以 `#` 不会出现在边界上 —— 四邻检查里「出界」那一支在本题数据上走不到，
留着只是让函数对不满足保证的输入也不至于崩。

---

## 完整代码实现

```python
import sys
from collections import deque


def solve() -> None:
    """统计每个 '#' 区域是否每个格子都临水，输出完全淹没的区域数"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    grid = data[1:1 + n]

    seen = [[False] * n for _ in range(n)]
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    fully_submerged = 0

    for i in range(n):
        for j in range(n):
            if grid[i][j] != '#' or seen[i][j]:
                continue
            # 找到一个新区域，BFS 收集它所有格子
            seen[i][j] = True
            queue = deque([(i, j)])
            every_cell_touches_water = True
            while queue:
                x, y = queue.popleft()
                touches_water = False
                for dx, dy in dirs:
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < n and 0 <= ny < n):
                        touches_water = True          # 出界也算临水
                    elif grid[nx][ny] == '.':
                        touches_water = True
                    elif not seen[nx][ny]:
                        seen[nx][ny] = True
                        queue.append((nx, ny))
                if not touches_water:
                    every_cell_touches_water = False
            if every_cell_touches_water:
                fully_submerged += 1

    sys.stdout.write(str(fully_submerged) + "\n")


if __name__ == "__main__":
    solve()
```

先标「这轮会淹的格子」、再分区域的两遍版本，输出完全相同：

```python
import sys
from collections import deque


def solve() -> None:
    """两遍：先标这一轮进水的格子，再按区域查是否整块都被标到"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    grid = data[1:1 + n]
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    # 第一遍：只扩散一层。读原图、写另一张表，所以不会连锁
    flood = [[False] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if grid[i][j] != '.':
                continue
            for dx, dy in dirs:
                nx, ny = i + dx, j + dy
                if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == '#':
                    flood[nx][ny] = True

    # 第二遍：分区域，块里每格都被标到才计数
    seen = [[False] * n for _ in range(n)]
    ans = 0
    for i in range(n):
        for j in range(n):
            if grid[i][j] != '#' or seen[i][j]:
                continue
            seen[i][j] = True
            queue = deque([(i, j)])
            all_wet = True
            while queue:
                x, y = queue.popleft()
                if not flood[x][y]:
                    all_wet = False
                for dx, dy in dirs:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == '#' and not seen[nx][ny]:
                        seen[nx][ny] = True
                        queue.append((nx, ny))
            if all_wet:
                ans += 1

    sys.stdout.write(str(ans) + "\n")


if __name__ == "__main__":
    solve()
```

---

## 示例推演

先走官方样例：`N = 1`，地图只有一个 `.`。

| 步骤 | 结果 |
|---|---|
| 外层扫到唯一一格，1 起坐标是 (1,1) | `grid[0][0] == '.'`，不是 `#`，跳过 |
| 扫描结束 | 一个区域都没发现，`fully_submerged = 0` |

输出 `0`，与样例一致。这组数据太小，看不出判据怎么工作，下面用两张 5×5 的图对照。

**图 A**：一个 2×2 的空地区域。

```
. . . . .
. # # . .
. # # . .
. . . . .
. . . . .
```

从 (2,2) 开始 BFS，四格依次出队：

| 出队格 | 四邻 | 有 `.`？ | 结论 |
|---|---|---|---|
| (2,2) | 上 `.`、下 `#`、左 `.`、右 `#` | 是 | 这格会进水 |
| (2,3) | 上 `.`、下 `#`、左 `#`、右 `.` | 是 | 会进水 |
| (3,2) | 上 `#`、下 `.`、左 `.`、右 `#` | 是 | 会进水 |
| (3,3) | 上 `#`、下 `.`、左 `#`、右 `.` | 是 | 会进水 |

四格全部临水，`every_cell_touches_water` 保持 `True`，这块被完全淹没，答案 1。

**图 B**：把 2×2 长成 3×3。

```
. . . . .
. # # # .
. # # # .
. # # # .
. . . . .
```

九格逐个检查，只有一格不同：

| 出队格 | 四邻 | 有 `.`？ |
|---|---|---|
| (2,2) | 上 `.`、下 `#`、左 `.`、右 `#` | 是 |
| (2,3) | 上 `.`、下 `#`、左 `#`、右 `#` | 是 |
| (2,4) | 上 `.`、下 `#`、左 `#`、右 `.` | 是 |
| (3,2) | 上 `#`、下 `#`、左 `.`、右 `#` | 是 |
| **(3,3)** | 上 `#`、下 `#`、左 `#`、右 `#` | **否** |
| (3,4) | 上 `#`、下 `#`、左 `#`、右 `.` | 是 |
| (4,2) | 上 `#`、下 `.`、左 `.`、右 `#` | 是 |
| (4,3) | 上 `#`、下 `.`、左 `#`、右 `#` | 是 |
| (4,4) | 上 `#`、下 `.`、左 `#`、右 `.` | 是 |

轮到中心 (3,3) 时 `touches_water` 为 `False`，标记翻成 `False` 并再也不变。
边缘八格这一轮都会进水，但中心那格是干的，所以这块**不算**完全淹没，答案 0。

两张图的差别只有「有没有被围住的内部格子」：2×2 没有内部格，全都贴着水，一次就淹透；
3×3 多出来的中心格四面都是陆地，这一轮水进不去。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐区域 BFS + 逐格判定（最优） | O(N²) | O(N²) | 首个代码块；每个格子入队一次、检查四个方向一次 |
| 先标进水格 + 再分区域 | O(N²) | O(N²) | 两遍地图，多一张 `flood` 表，常数略大 |

> 两条路都是「每格看几次固定数量的邻居」，所以是 `O(N²)`；空间的上限来自 `seen` 与队列，
> 最坏情况（一整个区域塞满地图内部）队列会装下 `O(N²)` 个格子。

---

## 易错点总结

1. **把「有格子临水」当成「每格都临水」**：`if not touches_water:` 那一行若写成
   `every_cell_touches_water = every_cell_touches_water or touches_water`（初值 `False`），
   结论就变成「存在一格临水即可」。3×3 实心块的八格边缘全部临水，于是被判成完全淹没，
   输出 `1` 而不是 `0`。判据必须是 every，不是 any。
2. **`seen` 只在起点标一次**：BFS 里只写 `queue.append((nx, ny))`、漏掉 `seen[nx, ny] = True`，
   两个相邻的 `#` 会在出队时把对方反复入队（对方从没被标记过），程序不结束、内存一直涨。
   `seen` 必须在**入队时**置位。

---

## 扩展思考

- **问「还剩多少个区域没被淹」**：总数减去本题的答案。
- **如果洪水一直涨**：因为四条边全是水，水总能一层层啃进来，最终每个区域都会被淹掉，
  答案就是区域总数。若边界不全是水，就可能出现一块被陆地层层包住、水永远进不去的区域，
  那时要真的从所有 `.` 出发做多轮 BFS，「每格临水」这一条判据就不再够用了。
- 把「完全淹没」换成「淹没一半以上」，判据就从「每格临水」变成「临水格数 > 总数 / 2」，
  在同一个 BFS 里多记两个计数器即可。

---

## 相关题目

- [BISHI76. 迷宫寻路](BISHI76.迷宫寻路.md)
- [BISHI80. 走迷宫](BISHI80.走迷宫.md)
- [BM57. 岛屿数量](../牛客题霸-模板速刷TOP101/BM57.岛屿数量.md)
