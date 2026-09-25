---
title: 加油站问题（最少停靠加油次数）
platform: 顺丰科技
difficulty: 中等
id: sf-min-refuel-stops
url: https://leetcode.cn/problems/minimum-number-of-refueling-stops/
tags:
  - 贪心
  - 堆
  - 优先队列
topics: []
patterns: []
date_added: 2026-09-25
date_reviewed: []
---

# 加油站问题（最少停靠加油次数）

> 顺丰科技笔试编程题 · ACM 模式（stdin/stdout）
> 原题：[LeetCode 871 最低加油次数](https://leetcode.cn/problems/minimum-number-of-refueling-stops/)

## 题目描述

汽车从起点出发，驶向距离起点 **L 公里**处的终点。汽车初始油量为 **startFuel** 升，每行驶 1 公里消耗 1 升油，油箱容量**无限**（能装的油没有上限）。

途中共有 **n** 个加油站，第 `i` 个加油站位于距离起点 **aᵢ** 公里处，可加油 **fᵢ** 升。加油站位置 `aᵢ` 按从小到大给出（`0 < a₁ < a₂ < ... < aₙ < L`）。

求汽车到达终点所需**最少停靠加油次数**；若无论如何都无法到达终点，输出 **-1**。

**注意：**

- 到达加油站时剩余油量为 0，也可以在该站加油；
- 到达终点时剩余油量为 0，也算到达终点。

## 输入格式

- 第 1 行：三个整数 `L n startFuel`；
- 接下来 `n` 行：每行两个整数 `a f`，表示加油站位置和油量。

## 输出格式

- 一行：一个整数，最少停靠加油次数；若无法到达终点，输出 `-1`。

## 示例

### 示例 1

**输入：**
```
100 4 10
10 60
20 30
30 30
60 40
```

**输出：**
```
2
```

**说明：**
出发时有 10 升油，开到 10 公里处的加油站（耗 10 升，油量为 0），加满到 60 升；
再开到 60 公里处的加油站（耗 50 升，剩 10 升），加 40 升到 50 升；
然后开到 100 公里终点（耗 40 升，剩 10 升）。共停靠 2 个加油站。

### 示例 2

**输入：**
```
100 1 1
10 100
```

**输出：**
```
-1
```

**说明：**
初始只有 1 升油，连第一个加油站（10 公里处）都到不了。

### 示例 3

**输入：**
```
1 0 1
```

**输出：**
```
0
```

**说明：**
初始油量就能直接到达终点，无需加油。

---

## 解题思路

### 第一步：理解问题本质

这是一个"一维路径上的**最少补给次数**"问题。由于油箱无限，每次加油都等于把该站油量**累加**到总续航里。关键矛盾是：

- 想少加油 → 尽量不加油，靠初始油量往前开；
- 但油总有耗尽的时候 → 必须在某些站补给。

**核心洞察（反悔贪心）：** 路过加油站时**先不决定加不加**，把该站油量"预存"起来。只有当油量不足以开到下一个站点时，才从之前路过、未加油的站点里**选油量最多**的那个补加一次。这样每次补加的都是"收益最大"的油，总加油次数一定最少。

### 第二步：暴力解法

**思路：** 枚举所有加油站的**子集**（每个站选择加油或不加油），检查该子集能否让汽车到达终点，取能到达的最小子集大小。

```python
# 枚举 0..2^n-1 的所有子集，逐一模拟
for mask in range(1 << n):
    fuel = startFuel
    prev = 0
    ok = True
    for i in range(n):
        fuel -= stations[i][0] - prev       # 开到第 i 站
        while fuel < 0:
            # 从 mask 选中的已过站点中找最大油量补加（需按距离排序）
            ...
```

**为什么不够好：**

- 子集数量为 `2^n`，`n` 稍大就爆炸；
- 大量子集显然不优（比如该加的不加、可少加的多加），重复计算严重。

### 第三步：优化解法（动态规划）

**思路：** 设 `dp[k]` 表示"加油恰好 `k` 次时，能到达的最远距离"。

- 遍历每个加油站，倒序遍历 `k`：
  - 如果 `dp[k]` 能到达当前加油站的位置 `aᵢ`（即 `dp[k] >= aᵢ`），则在此站加油后，`dp[k+1]` 可以延伸到 `dp[k] + fᵢ`；
  - 取 `max` 更新。
- 初始 `dp[0] = startFuel`；
- 第一个 `k` 使得 `dp[k] >= L` 就是答案；若遍历完所有 `k` 都到不了，返回 `-1`。

```python
def min_refuel_stops_dp(L, startFuel, stations):
    n = len(stations)
    dp = [0] * (n + 1)
    dp[0] = startFuel
    for i in range(n):
        for k in range(i, -1, -1):
            if dp[k] >= stations[i][0]:          # 能开到第 i 站
                dp[k + 1] = max(dp[k + 1], dp[k] + stations[i][1])
    for k in range(n + 1):
        if dp[k] >= L:
            return k
    return -1
```

**特点：**

- 时间复杂度 O(n²)，空间 O(n)；
- 思路清晰、容易证明正确，但比贪心慢。

### 第四步：最优解法（贪心 + 大根堆）

**思路：** 把"反悔贪心"落地：

1. 把所有加油站按位置排序（题目已保证有序），并把终点当作一个油量为 0 的"虚拟加油站"；
2. 维护一个大根堆 `pq`，存放**已经路过但还没加油**的站点油量；
3. 依次"尝试开到"每个站点：
   - 先消耗 `当前位置 - 上一位置` 的油；
   - 如果油量变成负数，说明不够，就不断从堆里取出**油量最多**的站点补加（加油次数 +1），直到油量足够；
   - 如果堆空了仍然不够，说明无法到达，返回 `-1`；
   - 最后把当前站点的油量放入堆，继续前进。

**为什么贪心是对的：**

- 每次被迫加油时，选油最多的站补加，等价于"用最少的加油次数获得最大的总续航"；
- 加油站位置一旦被越过就永远无法回头，所以"路过即入堆、需要时才取出"正好不遗漏任何机会；
- 由于取出的总是最大油量，任意换一种更少的加油组合都不可能超过这个总续航。

---

## 完整代码实现

### 写法一（主）：逐行读取 `sys.stdin.readline`

每行一个加油站，读一行处理一行，可读性最好。

```python
import sys
import heapq

def min_refuel_stops(L, n, startFuel, stations):
    stations.sort()                    # 加油站按位置排序
    stations.append((L, 0))            # 终点当作虚拟加油站（油量 0）

    fuel = startFuel                   # 当前油量（等价于还能跑的公里数）
    prev = 0                           # 上一个站点的位置
    ans = 0                            # 加油次数
    pq = []                            # 大根堆：路过但未加油的油量（存负数）

    for pos, f in stations:
        fuel -= (pos - prev)           # 消耗油量，尝试开到当前站点
        while fuel < 0 and pq:         # 油不够，就"反悔"补加之前油最多的站
            fuel -= heapq.heappop(pq)
            ans += 1
        if fuel < 0:                   # 堆空了仍不够，无法到达
            return -1
        heapq.heappush(pq, -f)         # 当前站点油量入堆
        prev = pos

    return ans

def solve():
    input = sys.stdin.readline         # 必须写在 solve() 内部，便于测试时替换 sys.stdin

    first = input()
    if not first:                      # 空输入直接结束
        return
    L, n, startFuel = map(int, first.split())

    stations = []
    for _ in range(n):
        a, f = map(int, input().split())
        stations.append((a, f))

    print(min_refuel_stops(L, n, startFuel, stations))

if __name__ == "__main__":
    solve()
```

### 写法二（备选）：一次性读取全部 token `sys.stdin.buffer.read()`

用 `read()` 一次读完再按 token 取用：速度快、不关心输入分布在几行。
`StringIO` 没有 `.buffer`，本地测试需用 `sys.stdin.read().encode()` 兜底。

```python
import sys
import heapq

def _read_input():
    """读取全部输入（兼容真实评测 stdin 与本地 StringIO 测试）"""
    try:
        return sys.stdin.buffer.read()
    except AttributeError:
        return sys.stdin.read().encode()

def solve():
    data = _read_input().split()
    if not data:
        return
    it = iter(data)
    L = int(next(it))
    n = int(next(it))
    startFuel = int(next(it))

    stations = []
    for _ in range(n):
        a = int(next(it))
        f = int(next(it))
        stations.append((a, f))

    print(min_refuel_stops(L, n, startFuel, stations))

if __name__ == "__main__":
    solve()
```

> 两种写法效果完全等价，`run_tests()` 用 `io.StringIO` 替换 `sys.stdin` 后都能正常运行。
> 完整版（含 `--test` 自测与样例注释，写法二以注释保留）见 `code-training/sf/sf_min_refuel_stops.py`。

---

## 示例推演

以 `L=100, n=4, startFuel=10`，加油站 `(10,60), (20,30), (30,30), (60,40)` 为例：

**初始化：** `fuel=10, prev=0, ans=0, pq=[]`，追加虚拟终点 `(100,0)`。

| 当前站 | 消耗 | 油量变化 | 堆内油量 | 动作 | 加油次数 |
|--------|------|----------|----------|------|----------|
| (10,60) | 10 | 10→0 | [60] | 油够，入堆 60 | 0 |
| (20,30) | 10 | 0→-10 | [60,30] | 不够 → 取 60 补加 → 50 | 1 |
| (30,30) | 10 | 50→40 | [30,30] | 油够，入堆 30 | 1 |
| (60,40) | 30 | 40→10 | [40,30,30] | 油够，入堆 40 | 1 |
| (100,0) | 40 | 10→-30 | [40,30,30,0] | 不够 → 取 40 → 10 | 2 |
| 终点 | — | 10 到达 | — | 结束 | **2** |

最终 `ans=2`，正确。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力（枚举子集） | O(2ⁿ·n) | O(n) | 子集数量指数级，n 稍大即不可行 |
| 动态规划 | O(n²) | O(n) | dp[k] 表示加 k 次油的最远距离 |
| 贪心 + 大根堆（最优） | O(n log n) | O(n) | 每个站点最多入堆/出堆一次 |

其中 n 为加油站数量。

---

## 易错点总结

### 1. 没把终点当成虚拟加油站

如果不把终点当虚拟站点，最后一段路要单独处理，容易漏掉"油不够时还需要补加"的情况。把终点看作油量为 0 的站点，逻辑就统一了。

### 2. 堆里存正数还是负数

Python 的 `heapq` 是最小堆。要模拟大根堆，必须**存负数**：`heappush(pq, -f)`，取用时 `fuel -= heappop(pq)`（等于加回正数）。

### 3. 到达站点时油量为 0

题目允许"剩余 0 升到达加油站时加油"，所以判断条件是 `fuel < 0` 才补油，`fuel == 0` 时直接入堆继续，不要误判成无法到达。

### 4. 加油站乱序

贪心要求按位置从小到大处理。虽然题目说已排序，稳健起见先 `stations.sort()`，并把虚拟终点放在最后。

### 5. 初始油量直接到终点

当 `startFuel >= L` 时，答案应为 `0`。上述实现中虚拟终点 `(L,0)` 会被处理到：油量足够则不会触发任何补加，直接返回 0。

---

## 扩展思考

- **原题 LeetCode 871：** 输入为 `(target, startFuel, stations)` 数组形式，解法与本例完全一致。
- **类似 POJ 2431 丛林探险：** 同样是"一维路径最少加油次数"，不同的是终点油量必须严格到达，且以"每停靠加油一次"计数，思路相通。
- **动态规划版的价值：** 如果数据规模较大（`n` 达到 10⁵），O(n²) 的 DP 会超时，贪心 + 堆的 O(n log n) 才是正解；面试中两种解法都应能讲清楚。
- **变体：** 若"每个加油站最多加固定量的油"或"油箱有上限"，问题性质改变，需改用别的策略（如把"油量"与"位置"结合考虑）。

---

## 相关题目

- [871. 最低加油次数](https://leetcode.cn/problems/minimum-number-of-refueling-stops/) — 本题原题
- [630. 课程表 III](https://leetcode.cn/problems/course-schedule-iii/) — 反悔贪心 + 堆
- [253. 会议室 II](https://leetcode.cn/problems/meeting-rooms-ii/) — 最小堆维护"最早结束"
- 顺丰同场笔试题：[铺砖问题](sf_tiling_1x2_2x2.md)