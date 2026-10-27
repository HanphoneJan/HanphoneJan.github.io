---
title: 55. 跳跃游戏
platform: LeetCode
difficulty: Medium
id: 55
url: https://leetcode.cn/problems/jump-game/
tags:
  - 贪心
  - 数组
  - 动态规划
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
  - ../../patterns/greedy.md
date_added: 2026-03-23
date_reviewed: []
---

# 0055. 跳跃游戏

## 题目描述

给你一个非负整数数组 `nums` ，你最初位于数组的 **第一个下标** 。数组中的每个元素代表你在该位置可以跳跃的最大长度。

判断你是否能够到达最后一个下标。

## 示例

**示例 1：**
```
输入：nums = [2,3,1,1,4]
输出：true
解释：可以先跳 1 步，从下标 0 到达下标 1，然后再从下标 1 跳 3 步到达最后一个下标。
```

**示例 2：**
```
输入：nums = [3,2,1,0,4]
输出：false
解释：无论怎样，总会到达下标为 3 的位置。但该下标的最大跳跃长度是 0 ，所以永远不可能到达最后一个下标。
```

---

## 解题思路

### 问题分析

**关键信息**：
- 每个位置可以跳 1 到 `nums[i]` 的任意长度
- 只需要判断"能否到达"，不需要最少步数
- 数组元素非负

**暴力思路**：
从位置 0 开始，尝试所有可能的跳跃，看能否到达终点。
- 时间复杂度：O(k^n)，指数级
- 空间复杂度：O(n)，递归栈

### 方法一：贪心（维护最远可达位置）

**核心观察**：
不需要真的模拟每一步跳跃，只需要记录"能到达的最远位置"。

**关键变量**：
`max_reach`：从起点出发，能到达的最远位置

**算法流程**：
1. 遍历数组，对于每个位置 i，检查 i 是否在可达范围内
2. 如果在可达范围内，更新 `max_reach = max(max_reach, i + nums[i])`
3. 如果 `max_reach >= n-1`，说明可以到达终点
4. 如果当前位置 i 超过了 `max_reach`，说明无法继续前进

### 正确性说明：为什么贪心成立

贪心选择：始终维护最远可达位置。

正确性：如果位置 i 是可达的，那么 `[0, i]` 范围内的所有位置都是可达的（因为可以少跳几步）。所以只需要关注最远能到哪里。

---

## 完整代码实现

```python
from typing import List

class Solution:
    def canJump(self, nums: List[int]) -> bool:
        """
        跳跃游戏 - 贪心算法

        核心思想：维护能到达的最远位置
        """
        n = len(nums)
        if n <= 1:
            return True

        max_reach = 0  # 能到达的最远位置

        for i in range(n):
            # 如果当前位置超过了最远可达位置，无法继续前进
            if i > max_reach:
                return False

            # 更新最远可达位置
            max_reach = max(max_reach, i + nums[i])

            # 提前退出：已经可以到达终点
            if max_reach >= n - 1:
                return True

        return True
```

---

## 示例推演

**示例 1**：`nums = [2,3,1,1,4]`

| i | nums[i] | i + nums[i] | max_reach | i > max_reach? | 结论 |
|---|---------|-------------|-----------|----------------|------|
| 0 | 2 | 2 | 2 | 0 > 0? ✗ | 继续 |
| 1 | 3 | 4 | 4 | 1 > 2? ✗ | 可以到达终点！ |

**结果**：`true`

**示例 2**：`nums = [3,2,1,0,4]`

| i | nums[i] | i + nums[i] | max_reach | i > max_reach? |
|---|---------|-------------|-----------|----------------|
| 0 | 3 | 3 | 3 | ✗ |
| 1 | 2 | 3 | 3 | ✗ |
| 2 | 1 | 3 | 3 | ✗ |
| 3 | 0 | 3 | 3 | ✗ |
| 4 | 4 | 8 | - | **4 > 3? ✓** |

**结果**：`false`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力DFS | O(k^n) | O(n) | 超时 |
| DP | O(n²) | O(n) | 记录每个位置是否可达 |
| 贪心 | O(n) | O(1) | **最优解** |

---

## 易错点总结

1. **先判 `i > max_reach`，再用它扩展**：顺序反了时，从不可达的位置也能算出「可达」，`[0,1]` 这类必然失败的输入会被判成 True。
2. **`max_reach` 只能增大**：写成 `max_reach = i + nums[i]` 会丢掉之前更远的落脚点，`[2,0,0,1]` 会被判成 False。
3. **`n <= 1` 要返回 True**：只有一个位置时「不动」也算到达，走通用循环会因为 `max_reach >= n - 1` 之外的判断漏掉。

## 扩展思考

### 1. 动态规划解法

```python
def canJumpDP(self, nums: List[int]) -> bool:
    n = len(nums)
    # dp[i] 表示下标 i 是否能由起点走到
    dp = [False] * n
    # 起点天然可达，作为递推的基准
    dp[0] = True

    for i in range(1, n):
        # 枚举所有可能跳到 i 的起点 j，找到任意一个就够了
        for j in range(i):
            if dp[j] and j + nums[j] >= i:
                dp[i] = True
                break

    return dp[n-1]
```
时间复杂度 O(n²)，用于理解问题，实际使用贪心。

### 2. 如果要求最少跳跃次数？

这就是 [45. 跳跃游戏 II]，需要用贪心或BFS。

### 3. 反向思考

从终点倒推，看哪些位置可以到达终点，逐步缩小范围。

---

## 相关题目

- [45. 跳跃游戏 II](https://leetcode.cn/problems/jump-game-ii/)
- [1306. 跳跃游戏 III](https://leetcode.cn/problems/jump-game-iii/)
- [1345. 跳跃游戏 IV](https://leetcode.cn/problems/jump-game-iv/)
