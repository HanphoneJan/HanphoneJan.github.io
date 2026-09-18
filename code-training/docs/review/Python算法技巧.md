---
title: Python算法技巧
category: 参考手册
last_updated: 2026-03-05
---
# Python算法技巧

> 本文档汇总Python算法竞赛/面试中常用的技巧和套路。

## 基础思维

### 递归、递推与枚举

| 方法           | 特点                     | 适用场景               |
| -------------- | ------------------------ | ---------------------- |
| **递归** | 函数调用自身，有归的过程 | 树的遍历、分治、回溯   |
| **递推** | 从已知推未知，循环实现   | 动态规划、斐波那契数列 |
| **枚举** | 遍历所有可能             | 小规模问题、验证答案   |

## 二分查找

### 标准模板

```python
def binary_search(arr: List[int], target: int) -> int:
    """在有序数组中查找target，返回索引，不存在返回-1"""
    left, right = 0, len(arr)  # 左闭右开区间
    while left < right:  # 不使用 <=：左闭右开写法更统一，循环结束时 left 即为答案位置
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid  # 收缩右边界到 mid
    return -1 if left >= len(arr) or arr[left] != target else left
```

### 二分查找变体

```python
# 下界 lower_bound：查找第一个 >= target 的位置
# 左闭右开 [left, right)，循环结束后 left 即为答案
def lower_bound(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2   # 防溢出写法，等价于 (left+right)//2
        if arr[mid] < target:      # 用 <：严格小于才排除，等于 target 的值不会被跳过
            left = mid + 1         # 目标在右半区，排除 mid 及其左边
        else:                      # arr[mid] >= target：把右边界收到 mid
            right = mid            # 因为 mid 本身可能就是第一个 >= 的位置，保留 mid
    return left                    # 返回第一个 >= target 的下标（找不到时为 len(arr)）

# 上界 upper_bound：查找第一个 > target 的位置
# 与 lower_bound 的唯一区别：判断用 <=，即把等于 target 的值也跳过
def upper_bound(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2
        if arr[mid] <= target:     # 用 <=：等于 target 也排除，故最终落在最后一个 target 之后
            left = mid + 1
        else:                      # arr[mid] > target：右边界收到 mid
            right = mid
    return left

# 记忆口诀：带等号（<=）= 跳过相等的 = 上界；不带等号（<）= 保留相等的 = 下界
# 用 [1,2,4,4,4,5,8], target=4：lower_bound→2（第一个4），upper_bound→5（最后一个4的后一位）
```

## 前缀和

### 一维前缀和

```python
# 一维前缀和
# prefix[i] 表示 arr[0] 到 arr[i-1] 的和，多开一位避免边界判断
prefix = [0] * (n + 1)
for i in range(n):
    prefix[i + 1] = prefix[i] + arr[i]

# 查询区间和 [l, r]
# 区间和 = prefix[r+1] - prefix[l]
# 例：arr = [3,1,4]，prefix = [0,3,4,8]；arr[1:3] 和 = prefix[3]-prefix[1] = 8-3 = 5
def range_sum(l: int, r: int) -> int:
    return prefix[r + 1] - prefix[l]
```

### 二维前缀和

```python
# 二维前缀和
# prefix[i][j] 表示矩阵左上角 (0,0) 到 (i-1,j-1) 的子矩阵和
prefix = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(m):
    for j in range(n):
        # 当前格 = 上方 + 左侧 - 左上角（多加了一次） + 当前元素
        prefix[i + 1][j + 1] = prefix[i][j + 1] + prefix[i + 1][j] - prefix[i][j] + matrix[i][j]

# 查询子矩阵和 [r1, c1] 到 [r2, c2]
# 大矩阵 - 左侧 - 上方 + 左上角（被减了两次）
def submatrix_sum(r1: int, c1: int, r2: int, c2: int) -> int:
    return prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1] - prefix[r2 + 1][c1] + prefix[r1][c1]
```

## 差分

![](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/Leetcode%E5%B7%AE%E5%88%86%E6%95%B0%E7%BB%84%E7%A4%BA%E4%BE%8B.webp)

```python
# 一维差分
# diff 是 arr 的差分数组：diff[i] = arr[i] - arr[i-1]
# 对区间 [l, r] 整体加 val，只需改 diff 的两端，O(1) 完成（而逐元素加是 O(n)）
diff = [0] * (n + 1)

# 区间 [l, r] 加 val
diff[l] += val        # 从 l 开始，之后的前缀和都会 +val
diff[r + 1] -= val    # 从 r+1 开始抵消，保证只影响 [l, r]

# 还原：对 diff 求前缀和即得原数组
arr = [0] * n
cur = 0
for i in range(n):
    cur += diff[i]
    arr[i] = cur
```

## 双指针

### 对撞指针

```python
def two_sum(arr: List[int], target: int) -> Tuple[int, int]:
    """在有序数组中找两数之和等于target"""
    left, right = 0, len(arr) - 1   # 一头一尾
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return left, right
        elif s < target:            # 和太小 → 需要更大的数 → 左指针右移
            left += 1
        else:                       # 和太大 → 需要更小的数 → 右指针左移
            right -= 1
    return -1, -1
```

### 快慢指针

```python
def find_duplicate(nums: List[int]) -> int:
    """Floyd判圈算法找环（数组值当作 next 指针，重复值即环入口）"""
    # 阶段一：快慢指针在环内相遇
    slow = fast = nums[0]
    while True:
        slow = nums[slow]           # 慢指针走一步
        fast = nums[nums[fast]]     # 快指针走两步
        if slow == fast:
            break                   # 相遇点必在环内

    # 阶段二：一指针回到起点，两指针同速前进，再次相遇处即环入口（重复值）
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
```

## 滑动窗口

### 固定窗口大小

```python
def max_sliding_window(nums: List[int], k: int) -> List[int]:
    from collections import deque
    q = deque()  # 存下标，维护成单调递减队列：队头始终是当前窗口的最大值下标
    res = []
    for i, x in enumerate(nums):
        # 移除已滑出窗口的下标（窗口大小为 k，超出范围就出队）
        if q and q[0] <= i - k:
            q.popleft()
        # 保持单调递减：队尾元素 <= x 时，x 更大且更靠右，旧的永远不会成为最大值，直接丢弃
        while q and nums[q[-1]] <= x:
            q.pop()
        q.append(i)
        # 窗口完整（长度达到 k）后才开始记录，队头即当前窗口最大值
        if i >= k - 1:
            res.append(nums[q[0]])
    return res
```

### 可变窗口大小

```python
def min_subarray_len(target: int, nums: List[int]) -> int:
    """找和 >= target 的最短子数组"""
    left = 0
    cur_sum = 0
    ans = float('inf')
    for right, x in enumerate(nums):
        cur_sum += x
        while cur_sum >= target:
            ans = min(ans, right - left + 1)
            cur_sum -= nums[left]
            left += 1
    return ans if ans != float('inf') else 0
```

## 位运算

```python
# 常用技巧
x & 1          # 判断奇偶：结果为 1 是奇数（只保留最低位）
x & (x - 1)    # 消除最低位的1：x=12(1100) → 8(1000)，常用来统计1的个数
x & (-x)       # 获取最低位的1：x=12(1100) → 4(0100)，即 lowbit
x | (1 << n)   # 将第n位置1（n从0开始计，第n位即值 2^n）
x & ~(1 << n)  # 将第n位置0
x ^ (1 << n)   # 翻转第n位（0↔1）

# 统计二进制中1的个数
bin(x).count('1')        # 简单直观；或用 while x: cnt += x&1; x >>= 1

# 判断是否是2的幂：2的幂二进制只有一个1，减1后变成全1
x > 0 and (x & (x - 1)) == 0   # 例：8(1000) & 7(0111) = 0 → True
```

## Python 内置函数巧用

### zip 函数

```python
# 矩阵转置
matrix = [[1, 2, 3], [4, 5, 6]]
transposed = list(zip(*matrix))  # [(1, 4), (2, 5), (3, 6)]

# 同时遍历多个列表
for a, b in zip(list1, list2):
    print(a, b)
```

### enumerate 函数

```python
# 获取索引和值
for i, val in enumerate(arr):
    print(f"索引 {i}: 值 {val}")

# 指定起始索引
for i, val in enumerate(arr, 1):  # 从1开始
    print(i, val)
```

### itertools 模块

```python
from itertools import *

# 排列
permutations([1, 2, 3])  # 所有排列

# 组合
combinations([1, 2, 3], 2)  # 所有2个元素的组合

# 累加
accumulate([1, 2, 3, 4])  # [1, 3, 6, 10]

# 分组
# 注意：groupby 只对【连续相邻】的相同值分组，所以必须先用 sorted 排序
# 返回迭代器，每个元素是 (键, 该组的迭代器)
groupby(sorted([1, 1, 2, 2, 3]))  # 按连续相同值分组
```

## 输入输出模板

### 快速读入（大量数据时）

```python
import sys
input = sys.stdin.readline

# 读取一行
n = int(input())
arr = list(map(int, input().split()))

# 读取多行
n = int(input())
for _ in range(n):
    a, b = map(int, input().split())
```

## 常用装饰器

### 记忆化搜索

```python
from functools import lru_cache, cache

@cache  # Python 3.9+
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

@lru_cache(maxsize=None)  # Python 3.8 及以下
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

## 参考

- [LeetCode 算法面试题汇总](https://leetcode.cn/studyplan/top-100-liked/)
- [OI Wiki](https://oi-wiki.org/)
