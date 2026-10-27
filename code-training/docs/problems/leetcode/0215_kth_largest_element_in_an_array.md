---
title: 215. 数组中的第K个最大元素
platform: LeetCode
difficulty: Medium
id: 215
url: https://leetcode.cn/problems/kth-largest-element-in-an-array/
tags:
  - 数组
  - 分治
  - 快速选择
  - 排序
  - 堆
topics: []
patterns:
  - ../../patterns/recursion.md
  - ../../patterns/search.md
  - ../../patterns/sorting.md
date_added: 2026-04-09
date_reviewed: []
---

# 215. 数组中的第K个最大元素

## 题目描述

给定整数数组 `nums` 和整数 `k`，请返回数组中第 `k` 个最大的元素。

请注意，你需要找的是数组排序后的第 `k` 个最大的元素，而不是第 `k` 个不同的元素。

## 示例

**示例 1：**
```
输入: [3,2,1,5,6,4], k = 2
输出: 5
```

**示例 2：**
```
输入: [3,2,3,1,2,4,5,5,6], k = 4
输出: 4
```

---

## 解题思路

### 问题本质

返回数组中第 `k` 个最大的元素。注意：这里指的是排序后的第 `k` 个最大值（并非第 `k` 个不同的值）。

### 方法一：排序

**思路**：对数组排序，取 `nums[n-k]`（升序数组中倒数第 `k` 个元素即第 `k` 大）。

```python
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        nums.sort()
        return nums[len(nums) - k]
```

**说明**：实现简单，时间复杂度 O(n log n)，空间复杂度取决于排序算法实现。

### 方法二：最小堆

**思路**：维护一个大小为 `k` 的最小堆。遍历数组，将元素入堆，若堆大小超过 `k` 则弹出堆顶（当前最小的元素）。遍历结束后，堆顶就是第 `k` 大的元素。

```python
import heapq
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        heap = []
        for num in nums:
            heapq.heappush(heap, num)
            if len(heap) > k:
                heapq.heappop(heap)
        return heap[0]
```

**说明**：时间复杂度 O(n log k)，空间复杂度 O(k)，适合 `k` 较小的场景。

### 方法三：快速选择（推荐）

**思路**：基于快速排序的 `partition` 操作，每次划分后可确定某个元素的最终位置。若该位置正好是 `n-k`，则直接返回，否则缩小区间继续查找。平均时间复杂度 O(n)。

```python
from random import randint
class Solution:
    def partition(self, nums: List[int], left: int, right: int) -> int:
        i = randint(left, right)
        nums[i], nums[left] = nums[left], nums[i]
        pivot = nums[left]
        i, j = left + 1, right
        while True:
            while i <= j and nums[i] < pivot:
                i += 1
            while i <= j and nums[j] > pivot:
                j -= 1
            if i >= j:
                break
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
            j -= 1
        nums[left], nums[j] = nums[j], nums[left]
        return j

    def findKthLargest(self, nums: List[int], k: int) -> int:
        n = len(nums)
        target_index = n - k
        left, right = 0, n - 1
        while True:
            p = self.partition(nums, left, right)
            if p == target_index:
                return nums[p]
            elif p > target_index:
                right = p - 1
            else:
                left = p + 1
```

---

## 完整代码实现

```python
from typing import List
from random import randint

class Solution:
    """
    数组中的第K个最大元素 - 快速选择算法

    核心思路：
    快速选择算法是快速排序的变种，利用 partition 操作在平均 O(n) 时间内找到第 k 大元素。

    时间复杂度：平均 O(n)，最坏 O(n²)
    空间复杂度：O(1)
    """

    def partition(self, nums: List[int], left: int, right: int) -> int:
        """划分函数，返回 pivot 的最终位置"""
        # 随机选择 pivot
        i = randint(left, right)
        pivot = nums[i]
        nums[i], nums[left] = nums[left], nums[i]

        # 双指针划分
        i, j = left + 1, right
        while True:
            while i <= j and nums[i] < pivot:
                i += 1
            while i <= j and nums[j] > pivot:
                j -= 1
            if i >= j:
                break
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
            j -= 1

        nums[left], nums[j] = nums[j], nums[left]
        return j

    def findKthLargest(self, nums: List[int], k: int) -> int:
        n = len(nums)
        target_index = n - k  # 第 k 大在升序中的下标
        left, right = 0, n - 1

        while True:
            i = self.partition(nums, left, right)
            if i == target_index:
                return nums[i]
            if i > target_index:
                right = i - 1
            else:
                left = i + 1
```

---

## 示例推演

以 `nums = [3,2,1,5,6,4], k = 2` 为例：

**目标**：找第 2 大 = 升序下标 `6-2=4` 的元素。

**第1轮 partition**（假设 pivot = 4）：
```
初始: [3,2,1,5,6,4]
交换 pivot 到首位: [4,2,1,5,6,3]
划分后: [3,2,1,4,6,5]
pivot 位置: 3
```

`3 < 4`（target_index），在右半部分继续。

**第2轮 partition**（在 [6,5] 中，假设 pivot = 6）：
```
[6,5] -> 划分后 [5,6]
pivot 位置: 5（相对于原数组是 5）
```

`5 > 4`（target_index），目标在左半部分继续。

**第3轮 partition**（在 [5] 中）：
```
pivot = 5，位置: 4
```

`4 == 4`，找到！返回 `nums[4] = 5`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 排序 | O(n log n) | O(1) 或 O(n) | 简单直接 |
| 最小堆 | O(n log k) | O(k) | 适合 k 较小的场景 |
| 快速选择（推荐） | 平均 O(n)，最坏 O(n²) | O(1) | 平均时间最优 |

**快速选择平均 O(n) 的证明**：

T(n) = n + n/2 + n/4 + ... = 2n = O(n)

---

## 易错点总结

- **下标计算**：第 `k` 大对应升序数组的下标 `n - k`，而不是 `k - 1`。
- **区间收缩**：如果 `p == target_index` 直接返回；若 `p > target_index` 则在左区间 `[left, p-1]` 查找；否则在右区间 `[p+1, right]` 查找。
- **随机 pivot**：为避免在有序数组上退化到 O(n²)，建议随机选取 pivot。

---

## 扩展思考

### 1. 找中位数

k = n/2，本题特例。

### 2. 找前 k 大元素

[347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/)，类似思路。

### 3. 相关题目

- [215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/)
- [347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/)
- [414. 第三大的数](https://leetcode.cn/problems/third-maximum-number/)
- [703. 数据流中的第 K 大元素](https://leetcode.cn/problems/kth-largest-element-in-a-stream/)

---

## 相关题目

- [347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/)
- [414. 第三大的数](https://leetcode.cn/problems/third-maximum-number/)
- [703. 数据流中的第 K 大元素](https://leetcode.cn/problems/kth-largest-element-in-a-stream/)
- [973. 最接近原点的 K 个点](https://leetcode.cn/problems/k-closest-points-to-origin/)
