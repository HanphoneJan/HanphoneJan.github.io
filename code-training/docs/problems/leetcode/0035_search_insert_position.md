---
title: 35. 搜索插入位置
platform: LeetCode
difficulty: Easy
id: 35
url: https://leetcode.cn/problems/search-insert-position/
tags:
  - 数组
  - 二分查找
topics: []
patterns:
  - ../../patterns/search.md
date_added: 2026-03-25
date_reviewed: []
---

# 35. 搜索插入位置

## 题目描述

给定一个排序数组和一个目标值，在数组中找到目标值，并返回其索引。如果目标值不存在于数组中，返回它将会被按顺序插入的位置。

请必须使用时间复杂度为 `O(log n)` 的算法。

## 示例

**示例 1：**
```
输入：nums = [1,3,5,6], target = 5
输出：2
```

**示例 2：**
```
输入：nums = [1,3,5,6], target = 2
输出：1
```

**示例 3：**
```
输入：nums = [1,3,5,6], target = 7
输出：4
```

---

## 解题思路

### 第一步：理解问题本质

这是一个二分查找的变体问题。需要找到：
1. 如果 target 存在，返回其索引
2. 如果 target 不存在，返回它应该被插入的位置（第一个大于 target 的位置）

### 方法一：线性查找（对比）

**思路**：线性扫描数组，找到 target 或第一个大于 target 的元素。

```python
class Solution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        # 第一个 >= target 的位置，就是 target 该待的地方
        for i in range(len(nums)):
            if nums[i] >= target:
                return i
        # 全都比 target 小，插到末尾
        return len(nums)
```

**缺点**：时间复杂度 O(n)，不满足 O(log n) 的要求。

### 方法二：二分查找

**核心洞察**：
- 如果找到 target，返回其索引
- 如果没找到，循环结束时 `left` 指向的位置就是插入位置

**为什么返回 left？**
- 循环不变式：`nums[0..left-1] < target`，`nums[right..n-1] >= target`
- 当循环结束时，`left == right`，区间收缩到同一个点
- 这个点就是第一个大于等于 target 的位置

**算法步骤**：
1. 初始化 `left = 0, right = n`
2. 循环条件 `left < right`：
   - `nums[mid] >= target`：target 在左半区（或已找到），`right = mid`
   - `nums[mid] < target`：target 在右半区，`left = mid + 1`
3. 循环结束 `left == right`，返回 left

```python
left, right = 0, len(nums)       # 左闭右开：right 是取不到的上界
while left < right:
    mid = (left + right) // 2
    if nums[mid] >= target:
        right = mid              # mid 可能就是答案，不能跳过
    else:
        left = mid + 1           # mid 一定不是答案，可以跳过
return left
```

`right = mid` 而不是 `mid - 1`，是因为这一格可能就是「第一个 `>= target` 的位置」；`left = mid + 1` 则因为 `nums[mid] < target` 已经排除了它自己。

---

## 完整代码实现

```python
from typing import List

class Solution:
    """
    搜索插入位置 - 二分查找

    核心思想：
    在有序数组中找 target 的插入位置，使得插入后数组仍然有序。
    这等价于找第一个大于等于 target 的元素位置。

    二分查找的变体：
    - 如果找到 target，返回其索引
    - 如果没找到，left 指向的位置就是应该插入的位置
      （因为循环结束时，left 是第一个 >= target 的位置）

    为什么返回 left？
    循环不变式：nums[0..left-1] < target，nums[right..n-1] >= target
    当循环结束时，left == right，两者都停在第一个 >= target 的位置

    时间复杂度：O(log n)
    空间复杂度：O(1)
    """

    def searchInsert(self, nums: List[int], target: int) -> int:
        n = len(nums)
        left, right = 0, n  # 右边界设为 n，左闭右开区间

        while left < right:  # 不使用 <=：左闭右开写法更统一，循环结束时 left == right 即为答案
            mid = left + (right - left) // 2
            if nums[mid] >= target:
                right = mid       # 收缩右边界到 mid
            else:
                left = mid + 1    # target 在右半区

        return left
```

---

## 示例推演

以 `nums = [1,3,5,6], target = 2` 为例：

| 步骤 | left | right | mid | nums[mid] | 操作 |
|------|------|-------|-----|-----------|------|
| 1 | 0 | 4 | 2 | 5 | 5 >= 2，right = 2 |
| 2 | 0 | 2 | 1 | 3 | 3 >= 2，right = 1 |
| 3 | 0 | 1 | 0 | 1 | 1 < 2，left = 1 |
| 4 | 1 | 1 | - | - | left == right，结束 |

返回 `left = 1`

解释：2 应该插入到索引 1 的位置，结果数组为 `[1,2,3,5,6]`

再以 `nums = [1,3,5,6], target = 7` 为例：

| 步骤 | left | right | mid | nums[mid] | 操作 |
|------|------|-------|-----|-----------|------|
| 1 | 0 | 4 | 2 | 5 | 5 < 7，left = 3 |
| 2 | 3 | 4 | 3 | 6 | 6 < 7，left = 4 |
| 3 | 4 | 4 | - | - | left == right，结束 |

返回 `left = 4`

解释：7 应该插入到数组末尾，索引为 4

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 线性查找 | O(n) | O(1) | 逐个比较，直到遇到第一个不小于 target 的位置 |
| **二分查找（最优）** | **O(log n)** | **O(1)** | 满足题目要求 |

---

## 易错点总结

### 1. 右边界初始化与循环写法要自洽

本题用**左闭右开**写法：`right = n`，循环条件 `left < right`，收缩时 `right = mid`。循环收在 `left == right` 处，这个下标就是第一个 `>= target` 的位置。

混用两种写法的症状很直接：保留 `right = n`、却把循环条件写成 `left <= right`，当 `left` 走到 `n` 时 `mid` 也会取到 `n`，下一行 `nums[n]` 立刻抛 `IndexError`。要么整套改成闭区间（`right = n - 1`、`<=`、`right = mid - 1`），要么整套保持左闭右开，不要只改其中一处。

### 2. 右边界保留 `n - 1`，却还写 `right = mid`

左闭右开写法要求 `right` 是「取不到的上界」，初值必须是 `n`。改成 `n - 1` 后，最后一个元素永远进不了 `mid`：`nums = [1,3,5,6]`、`target = 7` 时，`left` 最多走到 3 就停（循环条件 `left < right` 不再成立），返回 3，而正确答案是 4。

### 3. 把 `right = mid` 写成 `right = mid - 1`

这一格可能就是答案，减一会把它排除掉。`nums = [1,3,5,6]`、`target = 5` 时，第一轮 `mid = 2` 命中 5，写成 `right = 1` 后区间缩到 `[0,1]`，最终返回 1，而正确答案是 2。`nums[mid] < target` 那一侧才可以 `+1`，因为那个 `mid` 已经被证明不是答案。

---

## 扩展思考

### 1. lower_bound 和 upper_bound

- lower_bound：第一个 >= target 的位置（本题）
- upper_bound：第一个 > target 的位置

### 2. 如果数组中有重复元素？

这份二分收在「第一个 `>= target` 的位置」，也就是最左边的那一个，不会因为重复而改变。若题目改要求最后一个等于 `target` 的位置，判定要换成 `nums[mid] <= target` 时收左界，并在循环结束后回退一位检查。

---

## 相关题目

- [34. 在排序数组中查找元素的第一个和最后一个位置](https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/)
- [704. 二分查找](https://leetcode.cn/problems/binary-search/)
- [33. 搜索旋转排序数组](https://leetcode.cn/problems/search-in-rotated-sorted-array/)
