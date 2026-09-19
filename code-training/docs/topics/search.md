---
title: 查找算法
category: 算法思想
difficulty_range: [简单, 中等]
last_updated: 2026-02-26
---
# 查找算法

- **线性查找**：O(n)，适用于无序数据。
- **二分查找**：O(log n)，**要求数据有序**（数组存储），无序则完全不可用。
- **哈希查找**：O(1)（平均），利用哈希函数映射，需处理冲突（开放寻址法、链地址法）。但要求以哈希表存储数据，数组处理为哈希表的时间是O(n)。
- **树结构查找**：BST 查找 O(h)，平衡树查找 O(log n)。

# 二分查找

## 知识点概述

二分查找在有序数组中将搜索区间对半缩小，时间复杂度为 $O(\log n)$。

## 标准模板

左闭右开区间 `[left, right)` 写法，循环结束时 `left == right` 即答案位置：

```python
def binary_search(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)        # 左闭右开：right 取 len(arr)
    while left < right:
        mid = left + (right - left) // 2   # 防溢出
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1           # 目标在右半区，排除 mid
        else:
            right = mid              # 目标在左半区，保留 mid（不排除）
    return -1                        # 未找到
```

## 左右边界变体

```python
# lower_bound：第一个 >= target 的位置
def lower_bound(arr, target):
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2
        if arr[mid] < target:        # 用 <：等于不跳过
            left = mid + 1
        else:
            right = mid
    return left

# upper_bound：第一个 > target 的位置
def upper_bound(arr, target):
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2
        if arr[mid] <= target:       # 用 <=：等于也跳过
            left = mid + 1
        else:
            right = mid
    return left
```

> **记忆口诀**：带等号（<=）= 跳过相等的 = 上界；不带等号（<）= 保留相等的 = 下界。
> 统计 target 出现次数 = `upper_bound - lower_bound`。
> 完整变体与答案二分模板见 [二分查找模板](../templates/binary_search_template.md)。

## 常见考点

- 左右边界
- 单调性与二分答案
- 变体模板
- 二分划分（如中位数问题）

## 经典题目

### 困难

- [4. 寻找两个正序数组的中位数](../problems/leetcode/0004_median_of_two_sorted_arrays.md) - 二分划分思想
