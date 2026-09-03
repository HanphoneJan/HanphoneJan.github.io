---
title: 最短无序连续子数组
platform: LeetCode
difficulty: Medium
id: 581
url: https://leetcode.cn/problems/shortest-unsorted-continuous-subarray/
tags:
  - 数组
  - 双指针
date_added: 2026-04-24
---

# 581. 最短无序连续子数组

## 题目描述

给你一个整数数组 `nums` ，你需要找出一个 **连续子数组** ，如果对这个子数组进行升序排序，那么整个数组都会变为升序排序。

请你找出符合题意的 **最短** 子数组，并输出它的长度。

## 示例

**示例 1：**
```
输入：nums = [2,6,4,8,10,9,15]
输出：5
解释：只需要对 [6,4,8,10,9] 进行排序
```

**示例 2：**
```
输入：nums = [1,2,3,4]
输出：0
```

---

## 解题思路

### 第一步：理解问题本质

需要找到最短的连续子数组，排序后整个数组有序。关键问题是：**如何确定这个子数组的边界？**

### 第二步：排序对比法

将数组排序，对比原数组和排序后的数组，找出第一个和最后一个不同位置。

**缺点**：需要 O(n log n) 时间，O(n) 额外空间。

### 第三步：双指针一次遍历（最优）

**核心洞察**：
- 从左向右遍历，维护最大值 `maxn`。如果 `nums[i] < maxn`，说明 `i` 位置需要调整，更新右边界 `right`
- 从右向左遍历，维护最小值 `minn`。如果 `nums[n-1-i] > minn`，说明该位置需要调整，更新左边界 `left`

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    最短无序连续子数组 - 双指针一次遍历

    从左向右找右边界：维护最大值，当前值小于最大值则需要排序
    从右向左找左边界：维护最小值，当前值大于最小值则需要排序

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def findUnsortedSubarray(self, nums: List[int]) -> int:
        n = len(nums)
        maxn, right = float("-inf"), -1
        minn, left = float("inf"), -1

        for i in range(n):
            # 从左向右：找右边界
            if maxn > nums[i]:
                right = i
            else:
                maxn = nums[i]

            # 从右向左：找左边界
            if minn < nums[n - i - 1]:
                left = n - i - 1
            else:
                minn = nums[n - i - 1]

        return 0 if right == -1 else right - left + 1
```

---

## 示例推演

以 `nums = [2,6,4,8,10,9,15]` 为例：

| i | nums[i] | maxn | right | nums[n-1-i] | minn | left |
|---|---------|------|-------|-------------|------|------|
| 0 | 2 | 2 | -1 | 15 | 15 | -1 |
| 1 | 6 | 6 | -1 | 9 | 9 | -1 |
| 2 | 4 | 6 | 2 | 10 | 9 | -1 |
| 3 | 8 | 8 | 2 | 8 | 8 | -1 |
| 4 | 10 | 10 | 2 | 4 | 4 | 4 |
| 5 | 9 | 10 | 5 | 6 | 4 | 4 |
| 6 | 15 | 15 | 5 | 2 | 2 | 4 |

`left = 1`（不对，让我重新算）

实际上从右向左：
- i=0: nums[6]=15, minn=15
- i=1: nums[5]=9, minn=9
- i=2: nums[4]=10, minn < 10? 9 < 10, left=4
- i=3: nums[3]=8, minn < 8? 9 < 8? 否，minn=8
- i=4: nums[2]=4, minn < 4? 8 < 4? 否，minn=4
- i=5: nums[1]=6, minn < 6? 4 < 6, left=1
- i=6: nums[0]=2, minn < 2? 4 < 2? 否，minn=2

left=1, right=5, 长度 = 5 - 1 + 1 = 5。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 排序对比 | O(n log n) | O(n) | 需要排序 |
| **双指针（最优）** | **O(n)** | **O(1)** | 一次遍历 |

---

## 易错点总结

### 1. 边界条件

如果数组已有序，`right` 保持 `-1`，返回 `0`。

---

## 相关题目

- [215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/)
