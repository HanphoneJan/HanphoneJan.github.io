---
title: 任务调度器
platform: LeetCode
difficulty: Medium
id: 621
url: https://leetcode.cn/problems/task-scheduler/
tags:
  - 贪心
  - 数组
  - 数学
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

### 第一步：理解问题本质

相同任务之间需要冷却时间，需要合理安排任务顺序或插入待命时间。关键问题是：**最少需要多少时间？**

### 第二步：贪心模拟

**思路**：每次选择"冷却已结束"且"剩余任务最多"的任务执行。

### 第三步：数学公式（最优）

**核心洞察**：
- 设出现次数最多的任务执行了 `maxExec` 次
- 设出现次数等于 `maxExec` 的任务有 `maxCount` 个
- 最少时间 = `max((maxExec - 1) * (n + 1) + maxCount, len(tasks))`

**为什么**：
- `(maxExec - 1)` 个完整周期，每个周期长度 `(n + 1)`
- 最后一个周期只需 `maxCount` 个任务
- 如果任务种类很多，可能不需要待命，直接用 `len(tasks)`

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

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 贪心模拟 | O(任务数 * 种类数) | O(种类数) | 模拟执行过程 |
| **数学公式（最优）** | **O(任务数)** | **O(1)** | 直接计算 |

---

## 易错点总结

### 1. 数学公式的边界

`max((maxExec - 1) * (n + 1) + maxCount, len(tasks))` 中的 `max` 很重要。当任务种类很多时，可能不需要待命时间。

---

## 相关题目

- [767. 重构字符串](https://leetcode.cn/problems/reorganize-string/)
- [358. K 距离间隔重排字符串](https://leetcode.cn/problems/rearrange-string-k-distance-apart/)
