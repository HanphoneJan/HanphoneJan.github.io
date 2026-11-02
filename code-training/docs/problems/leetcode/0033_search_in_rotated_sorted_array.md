---
title: 33. 搜索旋转排序数组
platform: LeetCode
difficulty: Medium
id: 33
url: https://leetcode.cn/problems/search-in-rotated-sorted-array/
tags:
  - 数组
  - 二分查找
topics: []
patterns:
  - ../../patterns/search.md
date_added: 2026-04-11
date_reviewed: []
---

# 33. 搜索旋转排序数组

## 题目描述

整数数组 `nums` 按升序排列，数组中的值**互不相同**。

在传递给函数之前，`nums` 在预先未知的某个下标 `k`（`0 <= k < nums.length`）上进行了**向左旋转**，使数组变为 `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`。例如，`[0,1,2,4,5,6,7]` 在下标 3 上向左旋转后可能变为 `[4,5,6,7,0,1,2]`。

给你**旋转后**的数组 `nums` 和一个整数 `target`，如果 `nums` 中存在这个目标值 `target`，则返回它的下标，否则返回 `-1`。

你必须设计一个时间复杂度为 O(log n) 的算法解决此问题。

**提示：**

- `1 <= nums.length <= 5000`
- `-10^4 <= nums[i] <= 10^4`
- `nums` 中的每个值都**独一无二**
- 题目数据保证 `nums` 在预先未知的某个下标上进行了旋转
- `-10^4 <= target <= 10^4`

## 示例

### 示例 1

**输入：** nums = [4,5,6,7,0,1,2], target = 0

**输出：** 4

### 示例 2

**输入：** nums = [4,5,6,7,0,1,2], target = 3

**输出：** -1

### 示例 3

**输入：** nums = [1], target = 0

**输出：** -1

## 解题思路

旋转数组不能直接套普通二分：`nums[mid]` 两侧不再同时有序。但它有一个不会丢的性质——**从 `mid` 切开，左右两半至少有一半是递增的**。所以每轮先认出有序的那一半，再看 `target` 的数值是否落在这一半的值域里：落在就进去找，不落在就只能去另一半。

### 先认有序的一半，再看 target 在不在里面

设区间是 `[left, right]`，`mid` 为中点：

- 若 `nums[left] <= nums[mid]`，左半 `[left, mid]` 递增；
- 否则右半 `[mid, right]` 递增。

认出有序半段后，判断 `target` 是否在这个半段的**值域**内（左半是 `nums[left] <= target < nums[mid]`，右半是 `nums[mid] < target <= nums[right]`）。在就收缩到这个半段，不在就整体去另一半。

```python
if nums[left] <= nums[mid]:                 # 左半有序
    if nums[left] <= target < nums[mid]:
        right = mid - 1                     # target 在左半的值域里
    else:
        left = mid + 1                      # 不在，只能去右半
else:                                       # 右半有序
    if nums[mid] < target <= nums[right]:
        left = mid + 1
    else:
        right = mid - 1
```

`nums[mid] == target` 在进入这两个分支之前就已经返回了，所以值域的两端一边闭一边开：写不写等号都不影响结果，但写成开区间更能说明「`mid` 已经检查过」。

### 收缩失败时往哪边走

两个分支的 `else` 都是「有序半段里没有 target」，那就只能去另一半——这不是猜测：如果 target 存在，它不可能在有序半段的值域之外，而整个区间只有这两半。

循环用闭区间 `while left <= right`，收缩一律 `mid - 1` / `mid + 1`。`right = mid` 在 `mid == left` 时区间不缩小，会死循环。

### 推演：示例 1

`nums = [4,5,6,7,0,1,2]`，`target = 0`。

| 轮次 | `left, right` | `mid` | `nums[mid]` | 有序半段 | target 在值域内？ | 动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0, 6 | 3 | 7 | 左 `[4,5,6,7]` | `4 <= 0 < 7` 否 | `left = 4` |
| 2 | 4, 6 | 5 | 1 | 左 `[0,1]` | `0 <= 0 < 1` 是 | `right = 4` |
| 3 | 4, 4 | 4 | 0 | —（命中） | — | 返回 4 |

第 1 轮 `mid` 落在第一段（`4..7`），target 比这一段的最小值还小，所以整段第一段都不可能，直接跳到第二段。第 2 轮才真正把 target 收进区间。

## 完整代码实现

```python
from typing import List


class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            if nums[left] <= nums[mid]:
                # 左半 [left, mid] 递增
                if nums[left] <= target < nums[mid]:
                    right = mid - 1
                else:
                    left = mid + 1
            else:
                # 右半 [mid, right] 递增
                if nums[mid] < target <= nums[right]:
                    left = mid + 1
                else:
                    right = mid - 1
        return -1
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 线性扫描 | O(n) | O(1) | 没有利用「两段各自有序」 |
| 一次二分（最优） | O(log n) | O(1) | 每轮丢弃一半，只做常数次比较 |

## 易错点总结

### 1. 直接拿 `nums[mid]` 和 target 比大小丢掉一半

普通二分可以「比 target 大就去左边」，旋转数组不行。示例 1 第一轮 `mid = 3` 是 7，target 是 0，按大小关系会丢掉右半去左边找——可左边是 `[4,5,6]`，`0` 恰恰在被丢掉的那一段里，最后返回 -1。必须先认出有序半段，再看 target 是否落在它的值域里。

### 2. `nums[left] <= nums[mid]` 少写等号

`left == mid` 时（区间只剩一两个元素）左半只有一个数，它当然是「有序」的，但 `nums[left] < nums[mid]` 会判成「右半有序」，接着按右半的值域去筛，把 target 筛掉。`nums = [3,1]`、`target = 1` 时返回 -1，正确结果是 1。

## 扩展思考

- 数组里允许重复元素时（[81. 搜索旋转排序数组 II](https://leetcode.cn/problems/search-in-rotated-sorted-array-ii/)），`nums[left] == nums[mid]` 无法判断哪半有序，只能 `left += 1` 缩一格，最坏退化成 O(n)。
- 另一条路是先二分找出最小值下标（[153. 寻找旋转排序数组中的最小值](https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/)），把数组切成两段递增区间，再在对应那段里二分。两次二分，同样是 O(log n)，代码更长但每一步都是普通二分。
