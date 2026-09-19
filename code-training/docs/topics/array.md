---
title: 数组
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-03-23
---

# 数组

> [线性数据结构 | JavaGuide](https://javaguide.cn/cs-basics/data-structure/linear-data-structure.html)

## 知识点概述

数组是最基本的数据结构之一，由相同类型的元素（element）组成，并且是使用一块连续的内存来存储。可以利用元素的索引（index）计算出该元素对应的存储地址。

### 核心特性

- **随机访问**：O(1) 时间复杂度通过索引访问元素
- **连续存储**：元素在内存中连续排列
- **固定类型**：所有元素类型相同
- **固定大小**：大多数语言中数组大小固定（动态数组除外）

### 时间复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 访问 | O(1) | 通过索引直接计算地址 |
| 搜索 | O(n) | 需要遍历数组 |
| 插入（末尾） | O(1) | 动态数组末尾插入均摊 O(1) |
| 插入（中间） | O(n) | 需要移动后续元素，最坏的情况发生在插入发生在数组的首部并需要移动所有元素时 |
| 删除（末尾） | O(1) | 直接移除末尾元素 |
| 删除（中间） | O(n) | 需要移动后续元素，最坏的情况发生在删除数组的开头并需要移动第一元素后面所有的元素时 |

> **数组 vs 链表**：
> - 数组支持随机访问，链表不支持
> - 数组使用连续内存空间对 CPU 的缓存机制友好，链表则相反
> - 数组的大小固定，链表则天然支持动态扩容。如果声明的数组过小，需要另外申请一个更大的内存空间存放数组元素，然后将原数组拷贝进去，这个操作是比较耗时的！

## 常见题型

### 1. 双指针

- 两数之和类问题
- 数组去重
- 移动零

```python
# 对撞指针模板（有序数组）
left, right = 0, len(arr) - 1
while left < right:
    s = arr[left] + arr[right]
    if s == target: break
    elif s < target: left += 1    # 和太小，左移
    else: right -= 1              # 和太大，右移
```

**相关题目：**
- [1. 两数之和](../problems/leetcode/0001_two_sum.md)

### 2. 滑动窗口

- 子数组问题
- 最大/最小子数组

```python
# 固定窗口：长度为 k 的最大子数组和
window_sum = sum(arr[:k])
max_sum = window_sum
for i in range(k, len(arr)):
    window_sum += arr[i] - arr[i - k]   # 滑入右侧，滑出左侧
    max_sum = max(max_sum, window_sum)
```

### 3. 前缀和

- 区间和查询
- 连续子数组和

```python
# prefix[i] = arr[0..i-1] 的和，多开一位避免边界判断
prefix = [0] * (n + 1)
for i in range(n):
    prefix[i + 1] = prefix[i] + arr[i]
# 区间 [l, r] 的和
range_sum = prefix[r + 1] - prefix[l]
```

### 4. 二分查找

- 搜索元素
- 搜索插入位置

```python
# 左闭右开 [left, right)，返回第一个 >= target 的位置（即 lower_bound）
left, right = 0, len(arr)
while left < right:
    mid = left + (right - left) // 2
    if arr[mid] < target:
        left = mid + 1
    else:
        right = mid
# left 即插入位置；若需判断存在性，检查 arr[left] == target
```

## 解题技巧

### 技巧 1：双指针优化

在有序数组或需要双向遍历时，使用双指针可以降低时间复杂度。

```python
# 示例：双指针模板
left, right = 0, len(arr) - 1
while left < right:
    if condition:
        left += 1
    else:
        right -= 1
```

### 技巧 2：原地修改

当空间复杂度要求 O(1) 时，考虑原地修改数组。

### 技巧 3：哈希表辅助

用哈希表记录已访问的元素，实现 O(1) 查找。

## 相关知识点

- [哈希表](hash_table.md)
- [排序](sorting.md)
- [双指针模式](../patterns/two_pointers.md)
- [滑动窗口模式](../patterns/sliding_window.md)

## 题目列表

按难度分类：

**简单：**
- [1. 两数之和](../problems/leetcode/0001_two_sum.md)
- 删除有序数组中的重复项
- 移动零

**中等：**
- 盛最多水的容器
- 三数之和
- 最长连续序列

**困难：**
- [4. 寻找两个正序数组的中位数](../problems/leetcode/0004_median_of_two_sorted_arrays.md)

## 学习资源

- 《算法导论》第 2 章
- LeetCode 数组专题
