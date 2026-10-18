---
title: 查找算法
category: 算法模式
difficulty_range: [简单, 中等]
last_updated: 2026-10-19
---

# 查找算法

查找要解决的问题只有一个：**在数据里找到目标，或者确定它不存在**。
不同的数据结构决定了不同的查找方式，复杂度也从 `O(n)` 一路降到 `O(1)`。

## 几种查找方式

| 查找方式 | 时间复杂度 | 前提 | 适用 |
| --- | --- | --- | --- |
| 线性查找 | O(n) | 无 | 无序、数据量小、只查一次 |
| 二分查找 | O(log n) | 有序，或存在单调谓词 | 静态有序数据、答案空间 |
| 哈希查找 | O(1) 平均，O(n) 最坏 | 需要哈希表 | 频繁查找、计数、去重 |
| 二叉搜索树 | O(h)，平衡时 O(log n) | 维护有序结构 | 动态插入/删除 + 查找 |
| 平衡树 / 跳表 | O(log n) | 维护有序结构 | 需要顺序、范围查询 |

> **先问数据是静态还是动态。** 静态数据排序后二分最划算；频繁增删又要查找，
> 用哈希表或平衡树；只查一两次，直接线性扫描反而最省事。

本文的重点是**二分查找**，因为它的边界写法最容易错，也最能体现「查找」的本质。

---

## 二分查找

### 二分的本质不是「有序」

很多人把二分记成「有序数组里找目标」。更准确的说法是：

> **存在一个单调的判定，能把候选集合分成「一定不可能」和「仍有可能」两部分。**

数组有序只是最常见的一种单调性。只要能把问题写成
「当 `x` 变大时，条件 `ok(x)` 从真变成假（或从假变成真）」，
就可以二分答案 `x`，而不需要数组本身有序。

```
候选集合： [ 一定不行 | 仍有可能 ]
                 ↑
              每次排除一半
```

由此得到二分的三个前提：

1. **单调性**：判定结果随候选值单调变化；
2. **可判定**：给定一个候选，能在 `O(1)` 或 `O(log n)` 内判断它行不行；
3. **随机访问**：能直接取到区间中点（链表不适合二分）。

### 两种区间约定

二分常见的有两种区间约定，差别在「区间是闭的还是半开的」。**选一种，全程不要混用。**

#### 写法一：闭区间 `[left, right]`

循环条件是 `left <= right`，区间为空时 `left = right + 1`。

```python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1          # mid 已排除
        else:
            right = mid - 1         # mid 已排除

    return -1
```

**循环不变量：** 答案如果存在，一定在 `[left, right]` 里。
每次排除 `mid` 后，新区间仍然满足这个不变量，所以循环结束时区间为空，
答案不在数组里。

#### 写法二：左闭右开 `[left, right)`

循环条件是 `left < right`，`right` 的初值是 `len(nums)`。
这种写法天然适合「插入位置」类问题。

```python
def lower_bound(nums, target):
    left, right = 0, len(nums)      # 注意 right = len

    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid             # mid 可能是答案，不能排除

    return left                     # 第一个 >= target 的位置
```

**为什么 `right = len`？** 因为 `right` 是开区间端点，表示「候选范围的右边界」，
而答案可能是「插在最后」，对应下标 `len`。

#### 两种写法的对应关系

| 需求 | 闭区间写法 | 左闭右开写法 |
| --- | --- | --- |
| 找任意一个等于 target 的位置 | `nums[mid] == target` 直接返回 | 先找下界，再检查 |
| 第一个 `>= target` | 循环结束后特判 | `lower_bound` 直接返回 `left` |
| 最后一个 `<= target` | 对称写法 | `upper_bound - 1` |
| 插入位置 | 特判 | `lower_bound` 直接返回 `left` |
| 循环条件 | `left <= right` | `left < right` |
| 区间为空 | `left = right + 1` | `left == right` |

### 边界问题：lower_bound 与 upper_bound

这是二分最容易考、也最容易写错的地方。

- `lower_bound(target)`：第一个 **`>= target`** 的位置；
- `upper_bound(target)`：第一个 **`> target`** 的位置；
- `target` 的出现次数 = `upper_bound - lower_bound`；
- `target` 的最后一个位置 = `upper_bound - 1`。

```python
def lower_bound(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:      # 严格小于：等于时保留 mid
            left = mid + 1
        else:
            right = mid
    return left


def upper_bound(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] <= target:     # 小于等于：等于时跳过 mid
            left = mid + 1
        else:
            right = mid
    return left
```

**口诀：**

- 判断条件写 `<` → 等于不跳过 → 找到的是**下界**；
- 判断条件写 `<=` → 等于也跳过 → 找到的是**上界**。

#### 查找区间（LeetCode 34）

[34. 在排序数组中查找元素的第一个和最后一个位置](../problems/leetcode/0034_find_first_and_last_position_of_element_in_sorted_array.md)

```python
def search_range(nums, target):
    left = lower_bound(nums, target)
    if left == len(nums) or nums[left] != target:
        return [-1, -1]

    right = upper_bound(nums, target) - 1
    return [left, right]
```

先判断 `left` 是否越界或不等，避免对不存在的目标继续求上界。

#### 搜索插入位置（LeetCode 35）

[35. 搜索插入位置](../problems/leetcode/0035_search_insert_position.md)

插入位置就是「第一个 `>= target` 的位置」，直接返回 `lower_bound`：

```python
def search_insert(nums, target):
    return lower_bound(nums, target)
```

目标比所有元素都大时返回 `len(nums)`，正好是追加到末尾的位置。

### 旋转数组：有序性被切断了怎么办

旋转数组形如 `[4, 5, 6, 7, 0, 1, 2]`：整体不再有序，但**任意一刀切下去，至少有一半是有序的**。
二分时先判断哪一半有序，再看目标是否落在这一半里。

#### 搜索旋转排序数组（LeetCode 33）

[33. 搜索旋转排序数组](../problems/leetcode/0033_search_in_rotated_sorted_array.md)

```python
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid

        if nums[left] <= nums[mid]:              # 左半段有序
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:                                    # 右半段有序
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

判断「左半段有序」用 `nums[left] <= nums[mid]`，等号不能少：
当区间只剩两个元素时，`nums[left] == nums[mid]`，仍应归入左半段。

#### 寻找旋转数组的最小值（LeetCode 153）

[153. 寻找旋转排序数组中的最小值](../problems/leetcode/0153_find_minimum_in_rotated_sorted_array.md)

最小值是「旋转点」。拿 `nums[mid]` 和 `nums[right]` 比较：

- `nums[mid] > nums[right]`：最小值在右半段，`left = mid + 1`；
- 否则：最小值在左半段（可能包含 `mid`），`right = mid`。

```python
def find_min(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid

    return nums[left]
```

这里用 `left < right` 而不是 `<=`：循环结束时 `left == right`，指向的就是唯一候选。

### 二维矩阵中的查找

#### 行列分别有序：从右上角走（LeetCode 240）

[240. 搜索二维矩阵 II](../problems/leetcode/0240_search_a_2d_matrix_ii.md)

矩阵的每一行从左到右递增，每一列从上到下递增。从**右上角**出发：

- 当前值大于目标 → 这一列下面都更大，往左走；
- 当前值小于目标 → 这一行左边都更小，往下走。

```python
def search_matrix(matrix, target):
    if not matrix or not matrix[0]:
        return False

    i, j = 0, len(matrix[0]) - 1        # 右上角

    while i < len(matrix) and j >= 0:
        if matrix[i][j] == target:
            return True
        if matrix[i][j] > target:
            j -= 1                       # 排除这一列
        else:
            i += 1                       # 排除这一行

    return False
```

每一步都能排除一整行或一整列，最多走 `m + n` 步，复杂度 `O(m + n)`。

#### 整体按行展开有序：当成一维数组（LeetCode 74）

[74. 搜索二维矩阵](../problems/leetcode/0074_search_a_2d_matrix.md)

如果矩阵满足「每行递增，且下一行第一个数大于上一行最后一个数」，
把 `m × n` 个格子按行优先看成一维有序数组即可：

```python
def search_matrix(matrix, target):
    m, n = len(matrix), len(matrix[0])
    left, right = 0, m * n - 1

    while left <= right:
        mid = left + (right - left) // 2
        value = matrix[mid // n][mid % n]

        if value == target:
            return True
        if value < target:
            left = mid + 1
        else:
            right = mid - 1

    return False
```

### 二分答案：数组无序也能二分

这是二分最强大的用法：**二分的对象不是下标，而是答案本身**。

题目通常问「最小的最大值」「最大的最小值」「最少需要多少」。
只要「给定一个答案 `x`，能否做到」是关于 `x` 的单调函数，就能二分 `x`。

#### 最小化最大值

例如「把数组分成 `k` 段，使最大段和最小」。段和越大越容易分，所以 `ok(x)` 单调。

```python
def minimize_max(nums, k):
    def ok(limit):
        parts = 1
        current = 0
        for x in nums:
            if current + x > limit:
                parts += 1
                current = x
                if parts > k:
                    return False
            else:
                current += x
        return True

    left, right = max(nums), sum(nums)    # 答案的上下界
    while left < right:
        mid = left + (right - left) // 2
        if ok(mid):
            right = mid                   # 可行，尝试更小
        else:
            left = mid + 1                # 不可行，必须更大

    return left
```

#### 最大化最小值

例如「在数轴上选 `k` 个点，使最近两点距离最大」。距离越小越容易放下，`ok(x)` 单调递减。

```python
def maximize_min(points, k):
    points.sort()

    def ok(dist):
        count = 1
        last = points[0]
        for x in points[1:]:
            if x - last >= dist:
                count += 1
                last = x
                if count >= k:
                    return True
        return False

    left, right = 0, points[-1] - points[0]
    while left < right:
        mid = left + (right - left + 1) // 2   # 向上取整
        if ok(mid):
            left = mid                         # 可行，尝试更大
        else:
            right = mid - 1

    return left
```

**为什么这里的 `mid` 要向上取整？** 因为可行时执行 `left = mid`。
如果 `mid` 向下取整，当 `left + 1 == right` 时 `mid == left`，`left` 永远不动，死循环。
记住一条规则：

- 收缩时写 `right = mid` → `mid` 向下取整；
- 收缩时写 `left = mid` → `mid` 向上取整。

### 快速选择：只找第 K 个，不必全排序

[215. 数组中的第 K 个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md)

排序整个数组是 `O(n log n)`，但只找第 K 个可以做到平均 `O(n)`：
借用快排的 partition，每次只递归包含目标下标的那一半。

```python
import random

def find_kth_largest(nums, k):
    target = len(nums) - k          # 第 k 大 = 升序下标 len-k

    def quick_select(left, right):
        pivot = nums[random.randint(left, right)]
        i, j = left, right

        while i <= j:
            while nums[i] < pivot:
                i += 1
            while nums[j] > pivot:
                j -= 1
            if i <= j:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
                j -= 1

        if target <= j:
            return quick_select(left, j)
        if target >= i:
            return quick_select(i, right)
        return nums[target]

    return quick_select(0, len(nums) - 1)
```

- 平均 `O(n)`：每次期望排除一半；
- 最坏 `O(n²)`：每次 pivot 都取到极值；
- 随机 pivot 可以把最坏情况的概率压到极低。

### 两个有序数组的中位数（LeetCode 4）

[4. 寻找两个正序数组的中位数](../problems/leetcode/0004_median_of_two_sorted_arrays.md)

把两个数组都切成「左半」和「右半」，使：

1. 左半部分元素个数 = 右半部分（或相差 1）；
2. 左半部分的最大值 ≤ 右半部分的最小值。

在较短的数组上二分切割位置 `i`，另一个数组的切割位置 `j` 由总长度推出。

```python
def find_median_sorted_arrays(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1

    m, n = len(nums1), len(nums2)
    half = (m + n + 1) // 2
    left, right = 0, m

    while left <= right:
        i = (left + right) // 2          # nums1 左半取 i 个
        j = half - i                     # nums2 左半取 j 个

        left1 = nums1[i - 1] if i > 0 else float('-inf')
        right1 = nums1[i] if i < m else float('inf')
        left2 = nums2[j - 1] if j > 0 else float('-inf')
        right2 = nums2[j] if j < n else float('inf')

        if left1 <= right2 and left2 <= right1:
            if (m + n) % 2:
                return max(left1, left2)
            return (max(left1, left2) + min(right1, right2)) / 2

        if left1 > right2:               # nums1 左半太大，i 左移
            right = i - 1
        else:                            # nums2 左半太大，i 右移
            left = i + 1

    return 0.0
```

复杂度 `O(log(min(m, n)))`，空间 `O(1)`。这题边界极多，建议先写出
「切割后满足两个条件」的判定，再处理空数组的中性哨兵 `±inf`。

## 复杂度分析

| 算法 | 时间复杂度 | 空间复杂度 | 前提 |
| --- | --- | --- | --- |
| 线性查找 | O(n) | O(1) | 无 |
| 二分查找 | O(log n) | O(1) | 有序或单调谓词 |
| lower/upper_bound | O(log n) | O(1) | 有序 |
| 旋转数组查找 | O(log n) | O(1) | 旋转有序 |
| 二维矩阵（右上角） | O(m + n) | O(1) | 行列分别有序 |
| 二分答案 | O(log(range) × check) | O(1) | 判定单调 |
| 快速选择 | 平均 O(n)，最坏 O(n²) | O(log n) | 可原地交换 |
| 两个有序数组中位数 | O(log(min(m, n))) | O(1) | 两个数组有序 |

## 易错点

- ❌ **区间约定混用**：一会儿 `left <= right`，一会儿 `right = len`，边界必然错。
- ❌ **死循环**：可行时写 `left = mid` 却用向下取整。改成向上取整，或把 `left = mid` 换成 `mid + 1`。
- ❌ **越界访问**：闭区间写法里 `mid + 1`、`mid - 1` 要保证不越界；半开写法里 `right = len` 时不能访问 `nums[right]`。
- ❌ **忘记判空**：`nums` 为空时，`len(nums) - 1` 是 `-1`，循环不执行并返回 `-1`，看起来正确，但二维题要先判 `matrix[0]`。
- ❌ **`lower_bound` 与 `upper_bound` 搞反**：`<` 是下界，`<=` 是上界。
- ❌ **有重复元素时用「找到就返回」**：普通二分可能返回中间某个重复元素，求边界必须用 lower/upper_bound。
- ❌ **把「数组有序」当成二分的唯一前提**：答案二分只需要判定单调，数组可以无序。
- ❌ **`mid = (left + right) // 2` 在 C++/Java 溢出**：Python 不会溢出，但写成 `left + (right - left) // 2` 是更好的习惯。
- ❌ **旋转数组的等号漏掉**：`nums[left] <= nums[mid]` 的 `=` 决定了两元素区间走哪边。

## 相关题目

- [4. 寻找两个正序数组的中位数](../problems/leetcode/0004_median_of_two_sorted_arrays.md)
- [33. 搜索旋转排序数组](../problems/leetcode/0033_search_in_rotated_sorted_array.md)
- [34. 在排序数组中查找元素的第一个和最后一个位置](../problems/leetcode/0034_find_first_and_last_position_of_element_in_sorted_array.md)
- [35. 搜索插入位置](../problems/leetcode/0035_search_insert_position.md)
- [74. 搜索二维矩阵](../problems/leetcode/0074_search_a_2d_matrix.md)
- [153. 寻找旋转排序数组中的最小值](../problems/leetcode/0153_find_minimum_in_rotated_sorted_array.md)
- [215. 数组中的第 K 个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md)
- [240. 搜索二维矩阵 II](../problems/leetcode/0240_search_a_2d_matrix_ii.md)

## 相关模式

- [排序](sorting.md)：二分的前提通常由排序提供。
- [双指针](two_pointers.md)：有序数组上的另一种线性扫描方式。
- [哈希映射](hash_map.md)：`O(1)` 查找的另一种选择。
- [数组](../data-structures/array.md)：随机访问是二分的基础。

## 算法可视化

下面有两个播放器。

**二分查找**：输入格式是 `数组;目标值`（例如 `1,3,5,7,9,11,13;7`），使用**闭区间** `[left, right]` 写法。注意每一轮区间外的格子都会变灰，
mid 落在区间正中；比较之后要么 `left = mid + 1`，要么 `right = mid - 1`，
被排除的 mid 不会留在下一轮区间里。可以把目标改成一个不存在的数，
看循环如何以 `left > right` 结束。

**lower_bound**：输入格式同样是 `数组;目标值`（例如 `1,3,3,5,7,9;4`），使用**左闭右开**写法，`right` 初值等于数组长度（画面上会看到右指针停在
最后一格的右边）。当 `nums[mid] >= target` 时执行 `right = mid` 而不是 `mid - 1`，
因为 mid 自己可能就是答案。两个播放器对照着看，就能看清两种区间约定的差别。
