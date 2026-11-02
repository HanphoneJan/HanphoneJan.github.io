---
title: 34. 在排序数组中查找元素的第一个和最后一个位置
platform: LeetCode
difficulty: Medium
id: 34
url: https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/
tags:
  - 数组
  - 二分查找
topics: []
patterns:
  - ../../patterns/search.md
date_added: 2026-04-02
date_reviewed: []
---

# 34. 在排序数组中查找元素的第一个和最后一个位置

## 题目描述

给你一个按照非递减顺序排列的整数数组 `nums`，和一个目标值 `target`。请你找出给定目标值在数组中的开始位置和结束位置。

如果数组中不存在目标值 `target`，返回 `[-1, -1]`。

你必须设计并实现时间复杂度为 O(log n) 的算法解决此问题。

**提示：**

- `0 <= nums.length <= 10^5`
- `-10^9 <= nums[i] <= 10^9`
- `nums` 是一个非递减数组
- `-10^9 <= target <= 10^9`

## 示例

### 示例 1

**输入：** nums = [5,7,7,8,8,10], target = 8

**输出：** [3,4]

### 示例 2

**输入：** nums = [5,7,7,8,8,10], target = 6

**输出：** [-1,-1]

### 示例 3

**输入：** nums = [], target = 0

**输出：** [-1,-1]

## 解题思路

要找的是一个连续区间的两端，而**这两个端点是两个独立的二分问题**：左端点是「第一个 `>= target` 的位置」，右端点是「第一个 `> target` 的位置再减一」。两次二分都是 O(log n)，合起来仍然是 O(log n)。

### 一个函数解决两个端点

记 `lower_bound(x)` 为「第一个 `>= x` 的下标」。那么：

- 左端点 = `lower_bound(target)`；
- 右端点 = `lower_bound(target + 1) - 1`。

写成一个函数，`target` 和 `target + 1` 各调一次：

```python
def lower_bound(x):
    left, right = 0, n          # 左闭右开，答案落在 [0, n]
    while left < right:
        mid = (left + right) // 2
        if nums[mid] >= x:
            right = mid         # 答案可能是 mid，也可能是更左边
        else:
            left = mid + 1
    return left                 # 第一个 >= x 的位置，可能等于 n
```

`right` 取 `n`（而不是 `n - 1`）是为了让「所有数都小于 `x`」这种情况也有答案 `n`，不用额外写分支。

### 判定不存在

左端点可能落在 `n`（全数组都小于 `target`），也可能落在某个不等于 `target` 的数上（示例 2 落在 `7`）。两种都要先挡掉：

```python
left = lower_bound(target)
if left == n or nums[left] != target:
    return [-1, -1]
right = lower_bound(target + 1) - 1
```

先判左端点还有一个好处：只要 `nums[left] == target`，`left` 就是合法起点，右端点必然不小于它，不会出现 `[-1, 3]` 这种半截答案。

### 推演：示例 1

`nums = [5,7,7,8,8,10]`，`target = 8`。

| 调用 | `left, right` | `mid` | `nums[mid]` | 动作 |
| --- | --- | --- | --- | --- |
| `lower_bound(8)` | 0, 6 | 3 | 8 | `right = 3` |
|  | 0, 3 | 1 | 7 | `left = 2` |
|  | 2, 3 | 2 | 7 | `left = 3` |
|  | 3, 3 | — | — | 返回 3 |
| `lower_bound(9)` | 0, 6 | 3 | 8 | `left = 4` |
|  | 4, 6 | 5 | 10 | `right = 5` |
|  | 4, 5 | 4 | 8 | `left = 5` |
|  | 5, 5 | — | — | 返回 5 |

左端点 3，右端点 `5 - 1 = 4`，答案 `[3,4]`。

## 完整代码实现

```python
from bisect import bisect_left
from typing import List


class Solution:
    def searchRange(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        left = bisect_left(nums, target)          # 第一个 >= target 的位置
        if left == n or nums[left] != target:     # 全比它小，或落在一个更大的数上
            return [-1, -1]
        right = bisect_left(nums, target + 1) - 1  # 第一个 > target 的位置再减一
        return [left, right]
```

`bisect_left` 就是上面的 `lower_bound`：返回第一个 `>= x` 的下标，找不到时返回 `len(nums)`。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 找到一个目标值后向两边扩展 | O(n) | O(1) | 全是 `target` 时退化成扫全数组 |
| 两次二分（最优） | O(log n) | O(1) | 两次 `lower_bound`，各自独立 |

## 易错点总结

### 1. 右端点也用了 `bisect_left(nums, target)`

左端点算对了，右端点直接复用同一个值，示例 1 会输出 `[3,3]`——把「第一个 8」当成了「最后一个 8」。右端点要找的是第一个 **`> target`** 的位置减一，参数是 `target + 1`（或改用 `bisect_right(nums, target) - 1`）。

### 2. 跳过存在性检查

少了 `if left == n or nums[left] != target` 这一句，示例 2 会输出 `[1,0]`：`bisect_left(nums, 6) = 1`、`bisect_left(nums, 7) - 1 = 0`，起止颠倒，区间里根本没有 6。`target` 比所有数都大时更离谱，输出 `[6,5]`——左端点已经越过数组末尾。

## 扩展思考

- 需要「严格小于 `target` 的个数」时，`lower_bound(target)` 直接就是答案；`lower_bound(target + 1)` 则是「小于等于 `target` 的个数」。同一个函数换个参数就是不同口径的计数。
- 若数组可能含重复元素但要求「返回任意一个 `target` 的下标」，一次普通二分就够；本题要区间端点，所以必须做两次边界二分。
