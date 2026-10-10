---
title: 查找算法
category: 算法模式
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
> 完整变体与答案二分模板见下文「标准实现与变体」。

## 常见考点

- 左右边界
- 单调性与二分答案
- 变体模板
- 二分划分（如中位数问题）

## 经典题目

### 困难

- [4. 寻找两个正序数组的中位数](../problems/leetcode/0004_median_of_two_sorted_arrays.md) - 二分划分思想

---

## 标准实现与变体

### 标准二分查找

```python
from typing import List

def binary_search(arr: List[int], target: int) -> int:
    """
    标准二分查找：查找目标值的索引
    时间复杂度：O(log n)
    空间复杂度：O(1)
    
    返回：目标值的索引，不存在返回 -1
    """
    left, right = 0, len(arr)  # 右边界设为 len(arr)，左闭右开区间
    
    while left < right:  # 不使用 <=：左闭右开写法更统一，循环结束时 left 指向可能的位置
        mid = left + (right - left) // 2  # 防止溢出
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid  # 收缩右边界到 mid
    
    return -1 if left >= len(arr) or arr[left] != target else left
```

### 查找左边界

```python
def binary_search_left(arr: List[int], target: int) -> int:
    """
    查找左边界：找到第一个 >= target 的位置
    
    返回：第一个 >= target 的索引
    """
    left, right = 0, len(arr)
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid  # 收缩右边界
    
    return left
```

### 查找右边界

```python
def binary_search_right(arr: List[int], target: int) -> int:
    """
    查找右边界：找到最后一个 <= target 的位置
    
    返回：最后一个 <= target 的索引
    """
    left, right = 0, len(arr)
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] <= target:
            left = mid + 1  # 收缩左边界
        else:
            right = mid
    
    return left - 1
```

### 查找区间

```python
def search_range(arr: List[int], target: int) -> List[int]:
    """
    查找目标值的区间范围 [start, end]
    
    返回：[起始索引, 结束索引]，不存在返回 [-1, -1]
    """
    # 直接复用左/右边界函数：左边界 = 第一个 >= target；
    # 右边界 = 最后一个 <= target，由 upper_bound(target)-1 得到
    left_bound = binary_search_left(arr, target)
    
    # 检查是否找到
    if left_bound >= len(arr) or arr[left_bound] != target:
        return [-1, -1]
    
    right_bound = binary_search_right(arr, target)
    return [left_bound, right_bound]
```

### 旋转数组查找

```python
def search_rotated(arr: List[int], target: int) -> int:
    """
    在旋转排序数组中查找
    例如：[4,5,6,7,0,1,2]
    """
    left, right = 0, len(arr)  # 右边界设为 len(arr)，左闭右开区间
    
    while left < right:  # 不使用 <=：左闭右开写法更统一
        mid = left + (right - left) // 2
        
        if arr[mid] == target:
            return mid
        
        # 判断哪一半是有序的
        if arr[left] <= arr[mid]:  # 左半部分有序
            if arr[left] <= target < arr[mid]:
                right = mid
            else:
                left = mid + 1
        else:  # 右半部分有序
            if arr[mid] < target <= arr[right - 1]:
                left = mid + 1
            else:
                right = mid
    
    return -1
```

### 查找旋转点

```python
def find_min_rotated(arr: List[int]) -> int:
    """
    查找旋转排序数组中的最小值
    """
    left, right = 0, len(arr) - 1
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] > arr[right]:
            # 最小值在右半部分
            left = mid + 1
        else:
            # 最小值在左半部分（包括 mid）
            right = mid
    
    return arr[left]
```

### 查找峰值

```python
def find_peak_element(arr: List[int]) -> int:
    """
    查找峰值：arr[i] > arr[i-1] and arr[i] > arr[i+1]
    """
    left, right = 0, len(arr) - 1
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] > arr[mid + 1]:
            # 峰值在左侧（包括 mid）
            right = mid
        else:
            # 峰值在右侧
            left = mid + 1
    
    return left
```

### 搜索插入位置

```python
def search_insert(arr: List[int], target: int) -> int:
    """
    搜索插入位置：如果存在返回索引，否则返回应该插入的位置
    """
    left, right = 0, len(arr)
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    return left
```

### 平方根（整数）

```python
def sqrt(x: int) -> int:
    """
    计算 x 的平方根（向下取整）
    """
    if x <= 1:
        return x
    
    left, right = 0, x + 1  # 左闭右开区间，右边界设为 x+1
    
    while left < right:  # 不使用 <=：左闭右开写法更统一
        mid = left + (right - left) // 2
        
        if mid * mid == x:
            return mid
        elif mid * mid < x:
            left = mid + 1
        else:
            right = mid  # 收缩右边界到 mid
    
    return left - 1
```

### 答案二分（最小化最大值）

```python
def min_max_template(arr: List[int], k: int) -> int:
    """
    最小化最大值模板
    例如：分割数组的最大值、运送包裹问题
    
    思路：二分答案，检查是否可行
    """
    def is_valid(max_value):
        """检查以 max_value 为限制是否可行"""
        # 根据具体问题实现
        count = 1
        current_sum = 0
        
        for num in arr:
            if current_sum + num > max_value:
                count += 1
                current_sum = num
                if count > k:
                    return False
            else:
                current_sum += num
        
        return True
    
    left = max(arr)      # 最小可能的答案
    right = sum(arr)     # 最大可能的答案
    
    while left < right:
        mid = left + (right - left) // 2
        
        if is_valid(mid):
            right = mid  # 尝试更小的值
        else:
            left = mid + 1
    
    return left
```

### 答案二分（最大化最小值）

```python
def max_min_template(arr: List[int], k: int) -> int:
    """
    最大化最小值模板
    例如：最大化最小距离
    
    思路：二分答案，检查是否可行
    """
    def is_valid(min_value):
        """检查以 min_value 为限制是否可行"""
        # 根据具体问题实现
        count = 1
        last_pos = arr[0]
        
        for i in range(1, len(arr)):
            if arr[i] - last_pos >= min_value:
                count += 1
                last_pos = arr[i]
                if count >= k:
                    return True
        
        return False
    
    left = 1                    # 最小可能的答案
    right = arr[-1] - arr[0]    # 最大可能的答案
    
    while left < right:
        mid = left + (right - left + 1) // 2  # 向上取整
        
        if is_valid(mid):
            left = mid   # 尝试更大的值
        else:
            right = mid - 1
    
    return left
```

### 二分查找关键点

#### 1. 边界选择

```python
# 左闭右开 [left, right) —— 推荐写法，区间语义更清晰
left, right = 0, len(arr)
while left < right:  # 不使用 <=：左闭右开区间更统一，循环结束时 left == right 即为答案
    ...
```

#### 2. mid 计算

```python
# 防止溢出
mid = left + (right - left) // 2

# 向上取整（最大化最小值时使用）
mid = left + (right - left + 1) // 2
```

#### 3. 边界更新

```python
# 查找左边界
if arr[mid] < target:
    left = mid + 1
else:
    right = mid

# 查找右边界
if arr[mid] <= target:
    left = mid + 1
else:
    right = mid
```

#### 4. 何时使用二分

- ✅ 有序数组
- ✅ 旋转数组
- ✅ 答案具有单调性
- ✅ 求 "第 k 个" 或 "恰好" 的问题

### 时间复杂度

- **时间复杂度**：O(log n)
- **空间复杂度**：O(1)

### 常见错误

1. ❌ 死循环：边界更新不当
2. ❌ 溢出：`(left + right) / 2`
3. ❌ 边界条件：`left <= right` vs `left < right`
4. ❌ 取整方向：向上取整 vs 向下取整

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把数组换成你自己的，
逐步看每一帧的状态怎么变。两个写法的差别全在边界：闭区间写法每次判断 `left <= right`，左闭右开写法判断 `left < right` 且 `right` 取 `len(nums)`。画面上能看到 `right` 初值就是数组长度这件事。
