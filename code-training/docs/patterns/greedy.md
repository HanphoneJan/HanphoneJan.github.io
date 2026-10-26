---
title: 贪心
category: 算法模式
difficulty_range: [中等, 困难]
last_updated: 2026-10-19
---

# 贪心

## 一句话说清贪心

每一步都做**当前看起来最好**的选择，做完不回头，期望最终得到全局最优。

```
DP：枚举所有选择，保留每个子问题的最优解
贪心：只做一个选择，并且证明它不会让未来变差
```

贪心的代码通常很短，难的是**证明它为什么对**。证明不了的时候，
要么找反例，要么老老实实用 DP。

## 贪心 vs 动态规划

| 维度 | 贪心 | 动态规划 |
| --- | --- | --- |
| 每步决策 | 只选一个，不回头 | 枚举所有，取最优 |
| 保存状态 | 通常只保存一个量 | 保存整张表 |
| 时间复杂度 | 常常 O(n log n)（排序）或 O(n) | 多项式，通常更高 |
| 正确性 | 需要证明贪心选择性质 | 只要状态转移正确就正确 |
| 典型题 | 区间调度、跳跃游戏、加油站 | 背包、编辑距离、打家劫舍 |

**分界线**：做了当前最优选择后，剩下的子问题的最优解 + 当前选择，
是否仍然是原问题的最优解？

- 是 → 可以尝试贪心；
- 否 → 必须 DP 枚举。

## 贪心成立的两个条件

### 1. 贪心选择性质

存在一个全局最优解，**包含**当前做出的局部最优选择。

换句话说：选当前最好的，不会把「更好的未来」排除掉。

### 2. 最优子结构

做出选择后，剩下的子问题可以独立求解，且它的最优解能拼成原问题的最优解。

### 证明方法

| 方法 | 思路 | 适用 |
| --- | --- | --- |
| **交换论证** | 假设最优解不选当前贪心选择，把它替换成贪心选择，证明不会变差 | 区间调度、排序类 |
| **归纳法** | 证明每一步之后仍存在一个最优解包含已做的选择 | 构造类 |
| **反证法** | 假设存在更优解，推出与贪心选择矛盾 | 跳跃游戏、加油站 |
| **下界/上界** | 证明贪心达到理论下界 | 任务调度、分发糖果 |

> **找不到反例不等于正确。** 小数据上跑一遍暴力对拍，是发现贪心错误最有效的方法。

## 贪心题的四步流程

1. **建模**：每一步的「选择」是什么？目标是什么？
2. **定序**：按什么排序能让局部最优可见？（起点、终点、比值、差值）
3. **证明**：交换论证 / 归纳 / 反证，至少说服自己。
4. **实现**：处理空输入、端点相等、重复元素等边界。

排序依据选错，是贪心题最常见的错误。下面几组题看起来很像，排序键完全不同。

## 经典模型一：区间问题

### 1. 最多不相交区间（LeetCode 435）

[435. 无重叠区间](https://leetcode.cn/problems/non-overlapping-intervals/)

给一堆区间，问最多能选出多少个互不重叠的区间。

**按结束时间升序排序**，每次选结束最早且与上一个不冲突的区间。

```python
def erase_overlap_intervals(intervals):
    if not intervals:
        return 0

    intervals.sort(key=lambda x: x[1])      # 按结束时间
    kept = 0
    end = float('-inf')

    for left, right in intervals:
        if left >= end:                     # 与上一个区间不重叠
            kept += 1
            end = right

    return len(intervals) - kept            # 最少需要移除的个数
```

**为什么按结束时间，而不是开始时间？**

结束越早，留给后面的空间越大。按开始时间排序时，一个「开始很早但结束很晚」的区间
会占住大量空间，挤掉后面好几个短区间。

**交换论证：** 设最优解选的第一个区间是 `A`，而贪心选的是结束最早的 `B`。
因为 `B` 的结束时间不晚于 `A`，把 `A` 换成 `B` 不会与后面的区间冲突，
所以存在一个同样优的解包含 `B`。对剩余区间归纳，贪心最优。

### 2. 合并区间（LeetCode 56）

[56. 合并区间](../problems/leetcode/0056_merge_intervals.md)

**按起点升序排序**，依次合并重叠区间：

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    ans = []

    for left, right in intervals:
        if ans and left <= ans[-1][1]:      # 与上一个区间重叠或相接
            ans[-1][1] = max(ans[-1][1], right)
        else:
            ans.append([left, right])

    return ans
```

> **两类区间题的区别：**
>
> - 「选最多」→ 按**结束**时间排序；
> - 「合并重叠」→ 按**起点**排序。
>
> 目标不同，排序键就不同，不能混用。

### 3. 用最少的箭引爆气球（LeetCode 452）

按结束位置排序，一支箭放在当前区间的右端点，能覆盖所有左端点不超过它的区间：

```python
def find_min_arrow_shots(points):
    if not points:
        return 0

    points.sort(key=lambda x: x[1])
    arrows = 1
    pos = points[0][1]

    for left, right in points[1:]:
        if left > pos:              # 这支箭够不到
            arrows += 1
            pos = right

    return arrows
```

### 4. 会议室 II（LeetCode 253）

求同时进行的最多会议数。按开始时间排序，用小顶堆维护「当前正在进行的会议的结束时间」：

```python
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    heap = []                       # 每个房间的结束时间

    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)     # 复用已经结束的房间
        heapq.heappush(heap, end)

    return len(heap)
```

这不是纯贪心，而是「贪心 + 堆」：每次复用最早结束的房间。

## 经典模型二：跳跃游戏

### 1. 能否到达终点（LeetCode 55）

[55. 跳跃游戏](../problems/leetcode/0055_jump_game.md)

维护「当前能到达的最远位置」`reach`。遍历每个位置：

- 如果 `i > reach`，说明这个位置根本到不了，返回 `False`；
- 否则用 `i + nums[i]` 更新 `reach`。

```python
def can_jump(nums):
    reach = 0

    for i, step in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + step)

    return True
```

**为什么贪心正确？** 如果当前位置 `i` 可达，那么 `0..reach` 之间的所有位置都可达
（因为可以一步步跳过来）。所以只需要维护「最远能到哪」，不需要记录具体路径。

### 2. 最少跳跃次数（LeetCode 45）

[45. 跳跃游戏 II](../problems/leetcode/0045_jump_game_ii.md)

把「一次跳跃能覆盖的范围」看成一圈 BFS 的层：

```python
def jump(nums):
    jumps = 0
    current_end = 0       # 当前这一跳能到的最远位置
    farthest = 0          # 下一跳能到的最远位置

    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])

        if i == current_end:        # 当前层走完了
            jumps += 1
            current_end = farthest  # 进入下一层

    return jumps
```

**为什么是贪心？** 在「跳 `k` 次能到达的所有位置」里，只需要保留能跳到最远的那个，
因为它覆盖的下一层范围最大，不会比别的选择差。

## 经典模型三：分配与双指针

### 分发饼干（LeetCode 455）

每个孩子有胃口 `g[i]`，每块饼干有大小 `s[j]`。问最多能满足多少个孩子。

排序后，用最小的饼干去满足最容易满足的孩子：

```python
def find_content_children(g, s):
    g.sort()
    s.sort()

    i = j = 0
    while i < len(g) and j < len(s):
        if s[j] >= g[i]:        # 这块饼干能满足这个孩子
            i += 1
        j += 1                  # 无论是否满足，饼干都用掉了

    return i
```

**为什么贪心正确？** 如果一块小饼干能满足当前孩子，用它一定不亏；
如果不能满足，这块饼干对后面的孩子更不可能满足，直接丢弃。

### 分发糖果（LeetCode 135）

每个孩子至少 1 颗糖；相邻孩子中评分更高的必须拿更多。两边各扫一遍：

```python
def candy(ratings):
    n = len(ratings)
    candies = [1] * n

    # 从左往右：处理「右边比左边大」
    for i in range(1, n):
        if ratings[i] > ratings[i - 1]:
            candies[i] = candies[i - 1] + 1

    # 从右往左：处理「左边比右边大」
    for i in range(n - 2, -1, -1):
        if ratings[i] > ratings[i + 1]:
            candies[i] = max(candies[i], candies[i + 1] + 1)

    return sum(candies)
```

**为什么不能只扫一遍？** 一个孩子同时受左右邻居约束。
从左往右只能保证「右 > 左」，从右往左补上「左 > 右」，两次取最大值才能同时满足。

## 经典模型四：维护极值

### 买卖股票的最佳时机（LeetCode 121）

[121. 买卖股票的最佳时机](../problems/leetcode/0121_best_time_to_buy_and_sell_stock.md)

只允许买卖一次。遍历价格，维护「到目前为止的最低买入价」：

```python
def max_profit(prices):
    min_price = float('inf')
    ans = 0

    for price in prices:
        min_price = min(min_price, price)
        ans = max(ans, price - min_price)   # 今天卖出的最大收益

    return ans
```

**为什么贪心正确？** 对每个卖出日，最佳买入日一定是它之前价格最低的那天。
枚举卖出日，答案就覆盖了所有买卖组合。

### 加油站（LeetCode 134）

油箱里的油量 `cur` 一旦为负，说明从当前起点到 `i` 都不可行，
起点直接跳到 `i + 1`，`cur` 清零：

```python
def can_complete_circuit(gas, cost):
    total = 0
    cur = 0
    start = 0

    for i in range(len(gas)):
        diff = gas[i] - cost[i]
        total += diff
        cur += diff

        if cur < 0:             # 从 start 到 i 都到不了 i+1
            start = i + 1
            cur = 0

    return start if total >= 0 else -1
```

**为什么可以跳过一整段？** 如果从 `start` 出发，到 `i` 时累计油量为负，
那么从 `start` 到 `i` 之间的任何一个加油站出发，油量只会更少（少掉了前面积累的油），
同样到不了 `i + 1`。所以可以直接把起点设为 `i + 1`。

## 经典模型五：计数与构造

### 任务调度器（LeetCode 621）

[621. 任务调度器](../problems/leetcode/0621_task_scheduler.md)

相同任务之间必须间隔 `n`。设出现次数最多的任务出现了 `max_f` 次，
这样的任务有 `max_count` 个，则最短时间为：

```python
from collections import Counter

def least_interval(tasks, n):
    freq = Counter(tasks)
    max_f = max(freq.values())
    max_count = sum(1 for v in freq.values() if v == max_f)

    # 前 max_f-1 轮每轮需要 n+1 个位置，最后一轮放 max_count 个
    return max(len(tasks), (max_f - 1) * (n + 1) + max_count)
```

**为什么取 `max`？** 当任务种类很多、冷却时间能被其他任务填满时，总时间就是任务总数；
只有当「最高频任务 + 冷却」占主导时，才需要用公式。

### 下一个排列（LeetCode 31）

[31. 下一个排列](../problems/leetcode/0031_next_permutation.md)

从右往左找第一个「升序对」`nums[i] < nums[i+1]`，再在右边找第一个比 `nums[i]` 大的数交换，
最后反转 `i+1` 之后的部分：

```python
def next_permutation(nums):
    n = len(nums)
    i = n - 2

    while i >= 0 and nums[i] >= nums[i + 1]:
        i -= 1

    if i >= 0:
        j = n - 1
        while nums[j] <= nums[i]:
            j -= 1
        nums[i], nums[j] = nums[j], nums[i]

    nums[i + 1:] = reversed(nums[i + 1:])
```

这是「构造型贪心」：在保证「下一个更大」的前提下，让后缀尽可能小。

## 什么时候贪心会错

### 反例 1：0-1 背包按性价比贪心

物品 `(重量, 价值)`：`(10, 60)`、`(20, 100)`、`(30, 120)`，容量 50。

- 性价比：6、5、4，贪心先拿 10 + 20，价值 160；
- 最优：20 + 30，价值 220。

**原因**：背包的容量是整数约束，当前性价比最高的物品可能挤占未来更优的组合。
0-1 背包必须用 DP。

### 反例 2：零钱兑换贪心

硬币 `[1, 3, 4]`，目标 6。

- 贪心：4 + 1 + 1，共 3 枚；
- 最优：3 + 3，共 2 枚。

**原因**：硬币面值不满足「任意大面值都是小面值的倍数」，贪心选择会破坏后续组合。
零钱兑换要用完全背包 DP。

> 这两个反例说明：**「看起来该选最大的/最划算的」不是证明。**
> 没有贪心选择性质，就必须 DP。

## 复杂度分析

| 问题 | 时间复杂度 | 空间复杂度 | 关键操作 |
| --- | --- | --- | --- |
| 最多不相交区间 | O(n log n) | O(1) | 按结束时间排序 |
| 合并区间 | O(n log n) | O(n) | 按起点排序 |
| 最少箭引爆气球 | O(n log n) | O(1) | 按结束位置排序 |
| 会议室 II | O(n log n) | O(n) | 排序 + 堆 |
| 跳跃游戏 | O(n) | O(1) | 维护最远可达 |
| 分发饼干 | O(n log n) | O(1) | 双指针 |
| 分发糖果 | O(n) | O(n) | 两次扫描 |
| 买卖股票 | O(n) | O(1) | 维护最低价 |
| 加油站 | O(n) | O(1) | 累计油量 |
| 任务调度器 | O(n) | O(1) | 计数 |

## 易错点

- ❌ **排序键选错**：「选最多区间」按结束时间，「合并区间」按起点，不能互换。
- ❌ **重叠边界写错**：区间相接算不算重叠？`l <= end` 与 `l < end` 含义不同，要看题目定义。
- ❌ **贪心后忘记更新状态**：跳跃游戏忘了更新 `reach`，加油站忘了清零 `cur`。
- ❌ **只能证明「局部最优」就下结论**：局部最优不等于全局最优，找不到反例也要对拍验证。
- ❌ **用贪心代替 DP**：0-1 背包、零钱兑换、最长递增子序列都不能简单贪心。
- ❌ **忽略空输入**：区间、数组为空时直接返回，避免 `max()` 报错。
- ❌ **多约束只扫一遍**：分发糖果需要左右各扫一次，单次扫描无法同时满足两侧。
- ❌ **浮点比值比较**：按性价比排序时尽量用交叉相乘，避免浮点误差。

## 相关题目

**区间与调度：**

- [56. 合并区间](../problems/leetcode/0056_merge_intervals.md)
- [435. 无重叠区间](https://leetcode.cn/problems/non-overlapping-intervals/)
- [452. 用最少的箭引爆气球](https://leetcode.cn/problems/minimum-number-of-arrows-to-burst-balloons/)
- [253. 会议室 II](https://leetcode.cn/problems/meeting-rooms-ii/)

**跳跃与构造：**

- [55. 跳跃游戏](../problems/leetcode/0055_jump_game.md)
- [45. 跳跃游戏 II](../problems/leetcode/0045_jump_game_ii.md)
- [31. 下一个排列](../problems/leetcode/0031_next_permutation.md)

**分配与极值：**

- [455. 分发饼干](https://leetcode.cn/problems/assign-cookies/)
- [135. 分发糖果](https://leetcode.cn/problems/candy/)
- [134. 加油站](https://leetcode.cn/problems/gas-station/)
- [121. 买卖股票的最佳时机](../problems/leetcode/0121_best_time_to_buy_and_sell_stock.md)

**计数与公式：**

- [621. 任务调度器](../problems/leetcode/0621_task_scheduler.md)
- [169. 多数元素](../problems/leetcode/0169_majority_element.md)（Boyer-Moore 投票）
- [581. 最短无序连续子数组](../problems/leetcode/0581_shortest_unsorted_continuous_subarray.md)

## 相关模式

- [排序](sorting.md)：贪心题的第一步通常是排序。
- [动态规划](dynamic_programming.md)：贪心不成立时的保底方案。
- [双指针](two_pointers.md)：分配类贪心的常用实现。
- [查找算法](search.md)：答案二分常与贪心判定结合。
- [堆与优先队列](../data-structures/heap.md)：会议室、Top K 类贪心。
