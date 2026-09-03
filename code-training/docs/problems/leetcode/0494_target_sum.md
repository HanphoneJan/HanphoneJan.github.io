---
title: 目标和
platform: LeetCode
difficulty: Medium
id: 494
url: https://leetcode.cn/problems/target-sum/
tags:
  - 数组
  - 动态规划
  - 0/1背包
date_added: 2026-04-24
---

# 494. 目标和

## 题目描述

给你一个非负整数数组 `nums` 和一个整数 `target` 。

向数组中的每个整数前添加 `'+'` 或 `'-'` ，然后串联起所有整数，可以构造一个 **表达式** ：

例如，`nums = [2, 1]` ，可以在 `2` 之前添加 `'+'` ，在 `1` 之前添加 `'-'` ，然后串联起来得到表达式 `+2-1` 。

返回可以通过上述方法构造的、运算结果等于 `target` 的不同 **表达式** 的数目。

## 示例

**示例 1：**
```
输入：nums = [1,1,1,1,1], target = 3
输出：5
解释：
-1+1+1+1+1 = 3
+1-1+1+1+1 = 3
+1+1-1+1+1 = 3
+1+1+1-1+1 = 3
+1+1+1+1-1 = 3
```

**示例 2：**
```
输入：nums = [1], target = 1
输出：1
```

---

## 解题思路

### 第一步：数学转换

设正号部分的和为 `P`，负号部分的和为 `N`：
- `P - N = target`
- `P + N = sum(nums)`

推导：`2P = target + sum(nums)`，即 `P = (target + sum(nums)) / 2`

问题转化为：从数组中选出若干个数，使它们的和等于 `P`。

### 第二步：0/1 背包

这是一个经典的 0/1 背包问题：
- 物品：数组中的每个数
- 背包容量：`P`
- 目标：求恰好装满背包的方案数

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    目标和 - 0/1背包问题

    正号部分和 P = (target + sum(nums)) / 2
    问题转化为：从nums中选若干个数，使和为P的方案数

    时间复杂度：O(n * m)
    空间复杂度：O(m)
    """

    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        s = sum(nums) - abs(target)
        if s < 0 or s % 2:
            return 0

        m = s // 2  # 背包容量
        f = [1] + [0] * m  # f[c]表示凑出和c的方案数

        for x in nums:
            # 倒序遍历，避免重复计算（0/1背包）
            for c in range(m, x - 1, -1):
                f[c] += f[c - x]

        return f[m]
```

---

## 示例推演

以 `nums = [1,1,1,1,1], target = 3` 为例：

**数学转换**：
- `sum = 5`, `target = 3`
- `s = 5 - 3 = 2`, `m = 1`
- 需要正号部分和为 1

**DP 过程**：

| 步骤 | x | f[0] | f[1] | 说明 |
|------|---|------|------|------|
| 初始 | - | 1 | 0 | |
| 1 | 1 | 1 | 1 | f[1]+=f[0] |
| 2 | 1 | 1 | 2 | f[1]+=f[0] |
| 3 | 1 | 1 | 3 | |
| 4 | 1 | 1 | 4 | |
| 5 | 1 | 1 | 5 | |

答案：`f[1] = 5`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力DFS | O(2^n) | O(n) | 枚举所有符号组合 |
| 记忆化搜索 | O(n * m) | O(n * m) | m为背包容量 |
| **DP（最优）** | **O(n * m)** | **O(m)** | 一维数组优化 |

---

## 易错点总结

### 1. 无解判断

如果 `sum(nums) < abs(target)` 或 `(sum(nums) - abs(target))` 为奇数，则无解。

### 2. 倒序遍历

0/1 背包必须倒序遍历，否则同一个物品会被重复使用。

---

## 相关题目

- [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/)
- [1049. 最后一块石头的重量 II](https://leetcode.cn/problems/last-stone-weight-ii/)
