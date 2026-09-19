---
title: 贪心
category: 算法思想
difficulty_range: [中等, 困难]
last_updated: 2026-03-23
---

# 贪心

## 知识点概述

贪心策略在每一步选择当前最优（局部最优），期望最终得到全局最优解，常用于区间与调度类问题。

## 核心思想

**每一步都做当前看起来最好的选择，不回头、不枚举**。贪心之所以能用，是因为某些问题的"局部最优"恰好能推导出"全局最优"。

> **贪心 vs 动态规划**：两者都是"多阶段决策"。
> - **贪心**：每一步只看当前，做出不可回退的选择（不保存子问题状态）
> - **动态规划**：枚举所有可能，保留每个子问题的最优解，再从中取最优
>
> 判断标准：如果"贪心选择后，剩余子问题的最优解 + 当前选择"仍是原问题最优解，则可用贪心；否则需要 DP 枚举。

## 何时能用贪心？

满足以下条件之一时考虑贪心：

1. **贪心选择性质**：局部最优选择能被包含在某个全局最优解中
2. **最优子结构**：子问题的最优解能组合成原问题的最优解
3. **排序后选择**：通过排序使"局部最优"直接可见（最常用）

## 常见考点

- **排序后选择**：先按某个属性排序，再按顺序贪心
- **区间调度 / 合并**：按结束时间或起点排序
- **可行性判断**：贪心判断"能否做到"（跳跃游戏）
- **最优性证明**：交换论证、归纳法

## 经典题型

### 1. 区间调度：最多不相交区间

按**结束时间**升序排序，每次选结束最早且与前一个不相交的区间。

```python
def max_non_overlapping(intervals) -> int:
    """求最多能选出的互不相交区间个数（LeetCode 435 无重叠区间）"""
    intervals.sort(key=lambda x: x[1])  # 关键：按结束时间升序
    count = 0
    end = float('-inf')
    for l, r in intervals:
        if l >= end:      # 当前区间与前一个不相交 → 选择
            count += 1
            end = r
    return count
```

> **为什么按结束时间排序？** 结束越早，留给后续区间的空间越大，越可能选出更多不相交区间。

### 2. 区间合并

按**起点**排序，依次合并重叠区间。

```python
def merge_intervals(intervals) -> List[List[int]]:
    """合并所有重叠区间（LeetCode 56）"""
    intervals.sort(key=lambda x: x[0])  # 关键：按起点升序
    res = []
    for l, r in intervals:
        if res and l <= res[-1][1]:      # 与上一个区间重叠
            res[-1][1] = max(res[-1][1], r)  # 扩展右端点
        else:
            res.append([l, r])
    return res
```

> **区分两类问题**：
> - **选最多**（不相交区间）→ 按**结束**时间排序
> - **合并重叠**（合并区间）→ 按**起点**排序

### 3. 分发饼干：满足最多孩子

排序后，用最小的饼干满足最易满足的孩子。

```python
def find_content_children(g: List[int], s: List[int]) -> int:
    """g=孩子胃口，s=饼干尺寸（LeetCode 455）"""
    g.sort()
    s.sort()
    i = j = 0
    while i < len(g) and j < len(s):
        if s[j] >= g[i]:    # 当前饼干能满足当前孩子
            i += 1
        j += 1              # 饼干用过即弃，不管能否满足
    return i
```

### 4. 跳跃游戏：能否到达终点

维护"当前能跳到的最远位置"，逐步向前推进。

```python
def can_jump(nums: List[int]) -> bool:
    """能否从下标 0 跳到末尾（LeetCode 55）"""
    reach = 0
    for i, step in enumerate(nums):
        if i > reach:        # 当前位置已经够不到 → 失败
            return False
        reach = max(reach, i + step)  # 贪心：更新最远可达位置
    return True
```

### 5. 加油站：是否存在可行起点

**关键观察**：总油量 < 总消耗 → 必然无法绕行一周；否则，从任意"累计油量为负"的下一个站重新开始。

```python
def can_complete_circuit(gas: List[int], cost: List[int]) -> int:
    """返回能绕行一周的起点，不存在返回 -1（LeetCode 134）"""
    total = cur = 0
    start = 0
    for i in range(len(gas)):
        diff = gas[i] - cost[i]
        total += diff
        cur += diff
        if cur < 0:          # 到不了 i+1，起点设为 i+1，清零累计
            start = i + 1
            cur = 0
    return start if total >= 0 else -1
```

## 解题步骤

1. **判断是否为贪心题**：局部最优能否推出全局最优？（不会证就用 DP 兜底）
2. **确定排序依据**：按哪个属性排序让"局部最优"可见（起点/终点/差值）
3. **设计贪心策略**：每一步选什么（选最早的？最大的？最远的？）
4. **验证正确性**：用交换论证/反例自测，找不到反例再实现

## 易错点

- ❌ 先按起点排序却用于"选最多区间"（应看目标：合并按起点，选择按终点）
- ❌ 贪心选择后忘记更新状态（如跳跃游戏的 `reach`）
- ❌ 不能证明正确性就硬用贪心（必要时用 DP 保底）
- ❌ 边界：空数组、区间端点是否重叠（`>=` vs `>`）

## 相关知识点

- [排序](sorting.md)
- [动态规划](dynamic_programming.md)
- [双指针模式](../patterns/two_pointers.md)
- [堆](stack_queue_heap_unionfind.md)（Top K 类贪心辅助）

## 题目列表

按难度分类：

**中等：**
- 跳跃游戏
- 无重叠区间
- 合并区间

**困难：**
- 加油站
- 分发糖果
- 监控二叉树

## 要点总结

- ✅ 贪心 = 排序 + 每步取局部最优
- ✅ "选最多"按结束时间排序，"合并"按起点排序
- ✅ 不会证明时先用反例检验，不行就换 DP
- ✅ 关键在于识别"排序后贪心"的经典套路