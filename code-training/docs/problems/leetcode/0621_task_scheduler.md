---
title: 621. 任务调度器
platform: LeetCode
difficulty: Medium
id: 621
url: https://leetcode.cn/problems/task-scheduler/
tags:
  - 贪心
  - 数组
  - 数学
  - 哈希表
  - 计数
  - 排序
  - 堆
patterns:
  - ../../patterns/greedy.md
  - ../../patterns/hash_map.md
  - ../../patterns/sorting.md
date_added: 2026-04-24
---

# 621. 任务调度器

## 题目描述

给你一个用字符数组 `tasks` 表示的 CPU 需要执行的任务列表，用字母 `A` 到 `Z` 表示。每个任务都可以在 1 个单位时间内执行完。CPU 在任何一个单位时间内都可以执行一个任务，或者在待命状态。

两个 **相同种类** 的任务之间必须有长度为整数 `n` 的冷却时间，因此至少有连续 `n` 个单位时间内 CPU 在执行不同的任务，或者在待命状态。

返回完成所有任务所需要的 **最短时间** 。

## 示例

**示例 1：**
```
输入：tasks = ["A","A","A","B","B","B"], n = 2
输出：8
解释：A -> B -> (待命) -> A -> B -> (待命) -> A -> B
```

**示例 2：**
```
输入：tasks = ["A","A","A","B","B","B"], n = 0
输出：6
```

---

## 解题思路

### 总时长由出现次数最多的那一类任务决定

同类任务之间必须隔 `n` 个单位。出现 `f` 次的任务，它的第 `i` 次与第 `i+1` 次之间至少要跨 `n+1` 个位置（中间 `n` 格放别的任务或待命，再加上自己这一格）。所以这类任务本身就把时间轴撑开了，其余任务只能去填这些空隙。

数一遍就有两个下界。设 `f` 为最大出现次数，`k` 为出现次数等于 `f` 的任务种数：

- 前 `f-1` 次出现，每一次都要占用「自己 + 后面 `n` 格」这样一整块，共 `(f-1) × (n+1)` 格；最后一次出现之后，其余 `k-1` 个并列最多的任务也各占一格，所以至少还要 `k` 格 → 下界是 `(f-1)(n+1) + k`。
- 一个单位时间最多执行一个任务，任务总数是 `len(tasks)` → 下界是 `len(tasks)`。

两条下界都能构造出来：任务种类少、空隙填不满时，按块排、块里补待命；任务种类多到能把每个空隙都填满时，一个待命都不需要。所以答案是两者的较大值。

### 方法一：把公式直接写出来

```python
from collections import Counter
from typing import List

class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        freq = Counter(tasks)
        f = max(freq.values())                        # 最多出现几次
        k = sum(v == f for v in freq.values())        # 有几个任务并列最多
        return max((f - 1) * (n + 1) + k, len(tasks))
```

三行与上面的推导一一对应：`f`、`k` 是两个统计量，`(f-1)*(n+1)` 是整块，`+k` 是最后一层，`len(tasks)` 是第二条下界，`max` 挑当前生效的那一条。

`max` 不是防御性写法，它真的会生效：`tasks = ["A","A","A","B","C","D","E","F"]`、`n = 2` 时 `f = 3`、`k = 1`，前半部分算出 `2×3+1 = 7`，而任务有 8 个 —— 排成 `A B C A D E A F`，中间一次待命都不需要。

### 方法二：逐单位时间模拟

公式依赖「两条下界都取得到」那段论证。换个不用论证的思路：老老实实按时间往前走，每个时刻挑一个能跑的任务。规则只有两条：**有能跑的任务就别待命**，**能跑的任务里挑剩余次数最多的**。第二条是这题贪心的关键——剩余次数最多的任务最赶时间，它的每一次推迟都可能把后面的区间整体往后顶。

堆是表达这条规则最顺手的结构：

```python
import heapq
from collections import Counter, deque
from typing import List

class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        heap = [-c for c in Counter(tasks).values()]   # 大顶堆：剩余次数取负
        heapq.heapify(heap)
        cooling = deque()          # (可以再跑的时刻, -剩余次数)，按时刻递增
        time = 0

        while heap or cooling:
            time += 1
            # 冷却结束的任务回到堆里
            if cooling and cooling[0][0] == time:
                heapq.heappush(heap, cooling.popleft()[1])
            # 有任务就执行；没有就空转，time 照样加一
            if heap:
                rest = -heapq.heappop(heap) - 1
                if rest:
                    cooling.append((time + n + 1, -rest))

        return time
```

`time += 1` 这一行同时承担「执行」与「空转」两种语义：堆空、冷却队列里还有任务时，这几轮什么都不做，待命时间就这样自然产生。冷却记成 `time + n + 1` 而不是 `time + n`：第 `t` 格跑过之后，紧接着的 `n` 个格子都不能再跑它，所以下次最早是 `t + n + 1`。

完整代码里那一版没有用堆，而是给每种任务记一个 `nextValid`（下次能跑的最早时刻），机制完全相同：

- `nextValid[j] = 1`：时间从 1 开始计数，这样「时刻」和「下标」不用互相换算，所有任务一上来都能跑；
- `time = max(time, minNextValid)`：当前时刻没有任务能跑时，直接跳到最早有人能跑的时刻——**这一行就是待命**，循环里因此不需要单独处理空转；
- `nextValid[best] = time + n + 1`：跑完这一次，中间要隔满 `n` 个单位，所以下次最早是 `time + n + 1`；
- `for i in range(len(tasks))` 恰好跑 `len(tasks)` 轮：每轮执行且只执行一个任务，待命已经被上面那次跳跃吸收掉了。

两个模拟版本的复杂度同级（数组版 `O(任务数 × 种类数)`，堆版 `O(任务数 × log 种类数)`），公式版只要一遍计数。写法上没有高下：公式短，但要先相信下界论证；模拟长，但每一步都能对着时间轴核对。

---

## 完整代码实现

```python
from typing import List
import collections


class Solution:
    """
    任务调度器 - 贪心模拟

    每次选择冷却已结束且剩余最多的任务

    时间复杂度：O(任务数 * 任务种类数)
    空间复杂度：O(任务种类数)
    """

    def leastInterval(self, tasks: List[str], n: int) -> int:
        freq = collections.Counter(tasks)
        m = len(freq)
        nextValid = [1] * m
        rest = list(freq.values())

        time = 0
        for i in range(len(tasks)):
            time += 1
            minNextValid = min(nextValid[j] for j in range(m) if rest[j] > 0)
            time = max(time, minNextValid)

            best = -1
            for j in range(m):
                if rest[j] and nextValid[j] <= time:
                    if best == -1 or rest[j] > rest[best]:
                        best = j

            nextValid[best] = time + n + 1
            rest[best] -= 1

        return time


# 数学公式解法
class SolutionMath:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        freq = collections.Counter(tasks)
        maxExec = max(freq.values())
        maxCount = sum(1 for v in freq.values() if v == maxExec)
        return max((maxExec - 1) * (n + 1) + maxCount, len(tasks))
```

---

## 示例推演

以 `tasks = ["A","A","A","B","B","B"]`、`n = 2` 为例。

先走公式：`freq = {A: 3, B: 3}`，`f = 3`、`k = 2`，`(3-1) × (2+1) + 2 = 8`；任务总数 6。取较大者，答案是 **8**。

再用完整代码里的模拟走一遍（`nextValid` 与 `rest` 都按 A、B 的顺序记）：

| 轮次 | `time` 起始 | `minNextValid` | 实际 `time` | 执行 | `rest` | `nextValid` |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 1 | A | (2, 3) | (4, 1) |
| 2 | 2 | 1（B） | 2 | B | (2, 2) | (4, 5) |
| 3 | 3 | 4 | 4（等 1 格） | A | (1, 2) | (7, 5) |
| 4 | 5 | 5 | 5 | B | (1, 1) | (7, 8) |
| 5 | 6 | 7 | 7（等 1 格） | A | (0, 1) | (10, 8) |
| 6 | 8 | 8 | 8 | B | (0, 0) | (10, 11) |

第 3 轮和第 5 轮里 `time` 从 3 跳到 4、从 6 跳到 7，那两格就是待命。落成时间轴：

```text
时间   1  2  3  4  5  6  7  8
任务   A  B  _  A  B  _  A  B
```

与示例给出的 `A -> B -> (待命) -> A -> B -> (待命) -> A -> B` 一致。

顺带看 `n = 0` 的示例：冷却为 0 时 `time + n + 1 = time + 1`，同一个任务可以在下一格接着跑，6 个任务排满 6 格，答案 6。公式这边 `(3-1) × (0+1) + 2 = 4`，`len(tasks) = 6` 更大，同样返回 6。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 数组模拟（`nextValid`） | O(任务数 * 种类数) | O(种类数) | 每轮线性扫一遍找最优任务 |
| 堆模拟 | O(任务数 * log 种类数) | O(种类数) | 冷却队列里最多挂 k 个任务 |
| 数学公式（最优） | O(任务数) | O(1) | 一遍计数；字母表固定 26 个，计数表与输入规模无关 |

> 任务数即 `len(tasks)`，种类数 `k` 不超过 26。

---

## 易错点总结

1. **`nextValid[best] = time + n` 少了一个 1**：冷却只隔了 `n-1` 个单位。示例 1 会返回 6（`A B A B A B`，中间一次待命都没有），正确是 8。
2. **漏掉 `time = max(time, minNextValid)`**：没有任务能跑时 `best` 保持 -1，而 `nextValid[-1]`、`rest[-1]` 在 Python 里**不会报错**，会改到最后一个任务头上。示例 1 返回 6，`rest` 还会出现负数，全程没有任何异常提示。
3. **挑任务时把 `rest[j] > rest[best]` 写成 `<`**（先挑剩余最少的）：会凭空多出待命。`tasks = ["A","A","B","B","C"]`、`n = 2` 正确是 5（如 `A B C A B`），先挑最少的那版第 1 格跑 C，A 被挤到第 2 格，第 4 格没有任何任务能跑，答案变成 6。

---

## 相关题目

- [767. 重构字符串](https://leetcode.cn/problems/reorganize-string/)
- [358. K 距离间隔重排字符串](https://leetcode.cn/problems/rearrange-string-k-distance-apart/)
