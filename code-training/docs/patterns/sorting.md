---
title: 排序
category: 算法模式
difficulty_range: [简单, 中等]
last_updated: 2026-10-19
---

# 排序

## 为什么还要手写排序

工程代码里，`sorted()` 几乎总是最好的选择。但算法题里手写排序仍然有意义：

- 题目要求**利用排序过程**（链表排序、颜色分类、求逆序对）；
- 需要 **Top K** 或**第 K 大**，全排序反而浪费；
- 需要理解 **稳定性**，否则多关键字排序会出错；
- 面试会问「快排最坏什么时候发生」「归并为什么稳定」。

先记住一张总表，后面的每一节都在解释这张表里的某一格。

## 排序算法总览

| 算法 | 最好 | 平均 | 最坏 | 额外空间 | 稳定 | 核心特点 |
| --- | --- | --- | --- | --- | --- | --- |
| 冒泡排序 | O(n) | O(n²) | O(n²) | O(1) | 是 | 提前退出时最好 O(n)，教学用 |
| 选择排序 | O(n²) | O(n²) | O(n²) | O(1) | 否 | 交换次数最少（最多 n-1 次） |
| 插入排序 | O(n) | O(n²) | O(n²) | O(1) | 是 | 近乎有序时极快，Timsort 的基本单元 |
| 希尔排序 | O(n log n) | 取决于增量 | O(n²) | O(1) | 否 | 插入排序的分组改进 |
| 归并排序 | O(n log n) | O(n log n) | O(n log n) | O(n) | 是 | 性能稳定，适合链表与外部排序 |
| 快速排序 | O(n log n) | O(n log n) | O(n²) | O(log n) | 否 | 平均最快，原地排序 |
| 堆排序 | O(n log n) | O(n log n) | O(n log n) | O(1) | 否 | 原地、最坏也有保证，适合 Top K |
| 计数排序 | O(n + k) | O(n + k) | O(n + k) | O(k) | 是 | 非比较，要求整数范围小 |
| 桶排序 | O(n + k) | O(n + k) | O(n²) | O(n + k) | 取决于桶内排序 | 数据均匀分布时接近线性 |
| 基数排序 | O(d(n + b)) | O(d(n + b)) | O(d(n + b)) | O(n + b) | 是 | 按位排序，要求固定位数 |

> `n` 是元素个数，`k` 是数值范围，`d` 是位数，`b` 是进制（十进制时 `b = 10`）。
> 「额外空间」不含输入数组本身；快排的 `O(log n)` 是递归栈。

## 稳定性：为什么它不只是个名词

**稳定**：排序前后，相等元素的相对顺序不变。

假设学生记录按「班级」排序后，还想在班级内部保持「入学成绩」的顺序：

```python
students = [
    ('A', 90), ('B', 85), ('A', 95), ('B', 88),
]
students.sort(key=lambda x: x[1], reverse=True)   # 先按成绩
students.sort(key=lambda x: x[0])                 # 再按班级（稳定）
```

如果第二次排序是稳定的，同班同学会保持成绩降序；如果用了不稳定的排序，
这个「两次排序」的技巧就失效了。Python 的 `sorted` 是稳定排序，
所以多关键字排序可以拆成多次单关键字排序，也可以直接写
`key=lambda x: (x[0], -x[1])`。

> 归并排序稳定，快速排序和堆排序不稳定，选择排序不稳定。
> 冒泡和插入在「严格大于才交换」的写法下稳定。

## 三种 O(n²) 排序

它们慢，但代码短、常数小，而且在「小规模 / 近乎有序」时经常被更高级的算法当作子过程。

### 1. 冒泡排序

每一轮把当前未排序部分的最大值「冒」到末尾。第 `i` 轮结束后，末尾 `i` 个元素已经有序。

```python
def bubble_sort(nums):
    n = len(nums)

    for i in range(n - 1):
        swapped = False
        # 后面 i 个已经排好，不用再比
        for j in range(n - 1 - i):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]
                swapped = True

        if not swapped:      # 一整轮没有交换：已经有序
            break
```

- 最好情况（已经有序）：第一轮发现没有交换，直接退出，`O(n)`。
- 最坏情况（完全逆序）：比较次数 `(n-1) + ... + 1 = n(n-1)/2`，`O(n²)`。
- 稳定：只有 `>` 才交换，相等元素不会越过彼此。

### 2. 选择排序

每一轮从未排序部分选出最小值，放到已排序部分的末尾。

```python
def selection_sort(nums):
    n = len(nums)

    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if nums[j] < nums[min_idx]:
                min_idx = j
        if min_idx != i:
            nums[i], nums[min_idx] = nums[min_idx], nums[i]
```

- 比较次数永远是 `O(n²)`，与输入是否有序无关。
- **交换次数最少**：最多 `n - 1` 次，适合「写操作很贵」的场景。
- **不稳定**：`[2a, 2b, 1]` 第一轮把 `1` 和 `2a` 交换，得到 `[1, 2b, 2a]`，
  两个 2 的相对顺序变了。

### 3. 插入排序

把当前元素插入到左边已经有序的部分中，像整理扑克牌。

```python
def insertion_sort(nums):
    for i in range(1, len(nums)):
        key = nums[i]
        j = i - 1
        while j >= 0 and nums[j] > key:   # 严格大于才后移，保证稳定
            nums[j + 1] = nums[j]
            j -= 1
        nums[j + 1] = key
```

- 最好情况（已经有序）：内层循环一次都不进，`O(n)`。
- 最坏情况（完全逆序）：每次都要移动整个前缀，`O(n²)`。
- 稳定：相等元素不会越过彼此。
- **实际价值**：小数组上比归并/快排更快，所以 Timsort 在 run 长度小于 64 时用插入排序。

> 三者的选择：数据几乎有序 → 插入；写操作昂贵 → 选择；教学/稳定性演示 → 冒泡。
> 真正写业务代码时，直接用 `sorted`。

## 归并排序

分治：把数组从中间劈开，分别排序，再合并两个有序数组。

```
[38, 27, 43, 3]
      /        \
 [38, 27]    [43, 3]
  /   \       /   \
[38] [27]   [43] [3]
  \   /       \   /
[27, 38]    [3, 43]
      \        /
   [3, 27, 38, 43]
```

```python
def merge_sort(nums):
    if len(nums) <= 1:
        return nums

    mid = len(nums) // 2
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])
    return merge(left, right)


def merge(a, b):
    out = []
    i = j = 0

    while i < len(a) and j < len(b):
        if a[i] <= b[j]:        # <= 保证稳定性
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1

    out.extend(a[i:])
    out.extend(b[j:])
    return out
```

- 时间永远是 `O(n log n)`：共 `log n` 层，每层合并 `O(n)`。
- 空间 `O(n)`：合并需要临时数组。
- 稳定：相等时优先取左边。
- 适合**链表**：链表归并不需要随机访问，合并时可以做到 `O(1)` 额外空间。

### 链表排序（LeetCode 148）

[148. 排序链表](../problems/leetcode/0148_sort_list.md)

用快慢指针找中点，断开后分别排序，再合并两个有序链表：

```python
def sort_list(head):
    if not head or not head.next:
        return head

    # 快慢指针找中点（slow 最终停在左半段的最后一个节点）
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    mid = slow.next
    slow.next = None                 # 断开

    left = sort_list(head)
    right = sort_list(mid)

    dummy = ListNode(0)
    tail = dummy
    while left and right:
        if left.val <= right.val:
            tail.next = left
            left = left.next
        else:
            tail.next = right
            right = right.next
        tail = tail.next

    tail.next = left or right
    return dummy.next
```

链表归并的递归深度是 `O(log n)`，额外空间只来自递归栈。

## 快速排序

选一个基准值 `pivot`，把数组分成「小于 pivot」和「大于等于 pivot」两部分，
再对两部分递归。与归并相反：**快排先排好再递归，归并先递归再合并**。

```python
import random

def quick_sort(nums, left=0, right=None):
    if right is None:
        right = len(nums) - 1
    if left >= right:
        return

    p = partition(nums, left, right)
    quick_sort(nums, left, p - 1)
    quick_sort(nums, p + 1, right)


def partition(nums, left, right):
    # 随机选 pivot，避免已排序数组退化成 O(n²)
    idx = random.randint(left, right)
    nums[idx], nums[right] = nums[right], nums[idx]
    pivot = nums[right]

    i = left                     # i 指向「小于区」的下一个空位
    for j in range(left, right):
        if nums[j] < pivot:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1

    nums[i], nums[right] = nums[right], nums[i]
    return i                     # pivot 的最终位置
```

- 平均 `O(n log n)`，最坏 `O(n²)`：每次 pivot 都取到最大值或最小值。
- 原地排序，额外空间是递归栈 `O(log n)`（最坏 `O(n)`）。
- 不稳定：partition 会交换相等元素的位置。
- **随机化很重要**：对已经有序的数组，固定取最后一个元素当 pivot 会退化成 `O(n²)`。

### 有大量重复元素时：三路划分

普通 partition 把「等于 pivot」的元素都分到右边，重复元素很多时左右极不均衡。
三路划分把它们单独放中间：

```python
def quick_sort_3way(nums, left=0, right=None):
    if right is None:
        right = len(nums) - 1
    if left >= right:
        return

    lt, gt = partition3(nums, left, right)
    quick_sort_3way(nums, left, lt - 1)
    quick_sort_3way(nums, gt + 1, right)


def partition3(nums, left, right):
    pivot = nums[random.randint(left, right)]
    lt, i, gt = left, left, right

    while i <= gt:
        if nums[i] < pivot:
            nums[lt], nums[i] = nums[i], nums[lt]
            lt += 1
            i += 1
        elif nums[i] > pivot:
            nums[i], nums[gt] = nums[gt], nums[i]
            gt -= 1
        else:
            i += 1

    return lt, gt                # [left, lt) < pivot, [lt, gt] == pivot
```

[75. 颜色分类](../problems/leetcode/0075_sort_colors.md) 就是三路划分的特例（只有 0、1、2 三种值）。

### 快速选择

只关心「第 K 大」时，不需要把两边都排好，只递归包含目标下标的那一半，平均 `O(n)`。
代码与详细分析见 [查找算法 · 快速选择](search.md)。

## 堆排序

堆是一棵完全二叉树，用数组存储：下标 `i` 的左孩子是 `2i+1`，右孩子是 `2i+2`。
大顶堆满足「父节点 ≥ 子节点」。

```python
def heap_sort(nums):
    n = len(nums)

    # 1. 建堆：从最后一个非叶节点往前下沉，O(n)
    for i in range(n // 2 - 1, -1, -1):
        sift_down(nums, i, n)

    # 2. 反复把堆顶（最大值）换到末尾，再调整剩余部分
    for end in range(n - 1, 0, -1):
        nums[0], nums[end] = nums[end], nums[0]
        sift_down(nums, 0, end)

    return nums


def sift_down(nums, i, n):
    while True:
        largest = i
        left = 2 * i + 1
        right = 2 * i + 2

        if left < n and nums[left] > nums[largest]:
            largest = left
        if right < n and nums[right] > nums[largest]:
            largest = right

        if largest == i:
            break

        nums[i], nums[largest] = nums[largest], nums[i]
        i = largest
```

- 建堆是 `O(n)`，不是 `O(n log n)`：大多数节点都在底层，下沉距离很短。
- 排序阶段 `n` 次弹出，每次 `O(log n)`，总计 `O(n log n)`。
- 原地、最坏也有 `O(n log n)` 保证；缺点是不稳定、常数比快排大、缓存不友好。
- Python 的 `heapq` 是小顶堆，适合「动态维护前 K 小/大」而不是完整排序：

```python
import heapq

heapq.heapify(nums)                 # 原地建小顶堆，O(n)
smallest = heapq.heappop(nums)      # 弹出最小值，O(log n)
heapq.heappush(nums, x)             # 插入，O(log n)
```

[215. 数组中的第 K 个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md) 可以用大小为 K 的小顶堆，时间 `O(n log k)`；
[347. 前 K 个高频元素](../problems/leetcode/0347_top_k_frequent_elements.md) 则是「哈希计数 + 堆」。

## 非比较排序

比较排序的下界是 `O(n log n)`。如果数据有额外结构（整数、范围小、位数固定），
可以绕过比较，做到线性时间。

### 计数排序

统计每个值出现多少次，再按值从小到大展开。要求数据是**范围不大的整数**。

```python
def counting_sort(nums):
    if not nums:
        return []

    lo, hi = min(nums), max(nums)
    count = [0] * (hi - lo + 1)

    for x in nums:
        count[x - lo] += 1

    # 前缀和：count[i] 变成「值 <= i+lo 的元素个数」
    for i in range(1, len(count)):
        count[i] += count[i - 1]

    out = [0] * len(nums)
    # 从后往前填，保证稳定性
    for x in reversed(nums):
        count[x - lo] -= 1
        out[count[x - lo]] = x

    return out
```

- 时间 `O(n + k)`，空间 `O(k)`。
- `k` 是 `max - min + 1`。如果 `k` 远大于 `n`（例如只有 10 个数，但范围是 0 到 10^9），
  计数数组会爆炸，不能用。
- 用途：年龄、分数、颜色分类；也是基数排序的底层。

### 桶排序

把数据按范围分到若干个桶里，每个桶内部再排序，最后按桶的顺序拼接。

```python
def bucket_sort(nums, bucket_count=10):
    if len(nums) <= 1:
        return nums[:]

    lo, hi = min(nums), max(nums)
    if lo == hi:
        return nums[:]

    buckets = [[] for _ in range(bucket_count)]
    for x in nums:
        idx = min(int((x - lo) / (hi - lo) * bucket_count), bucket_count - 1)
        buckets[idx].append(x)

    out = []
    for bucket in buckets:
        out.extend(sorted(bucket))
    return out
```

- 数据**均匀分布**时，每个桶约 `n / k` 个元素，总时间接近 `O(n + k)`；
- 数据全挤在一个桶里时，退化为桶内排序，最坏 `O(n²)`；
- 桶的数量通常取 `k ≈ n`。太多浪费空间，太少退化成普通排序。

### 基数排序

从最低位到最高位，依次对每一位做一次**稳定**的计数排序。
因为低位已经排好，高位排序时相同高位的元素会保持低位的相对顺序。

```python
def radix_sort(nums):
    if not nums:
        return []

    out = nums[:]
    exp = 1
    while max(out) // exp > 0:
        out = counting_sort_by_digit(out, exp)
        exp *= 10
    return out


def counting_sort_by_digit(nums, exp):
    count = [0] * 10
    for x in nums:
        count[(x // exp) % 10] += 1

    for i in range(1, 10):
        count[i] += count[i - 1]

    out = [0] * len(nums)
    for x in reversed(nums):
        digit = (x // exp) % 10
        count[digit] -= 1
        out[count[digit]] = x
    return out
```

- 时间 `O(d × (n + 10))`，`d` 是最大位数；
- 空间 `O(n + 10)`；
- 只适用于非负整数（负数可以先整体平移，或按符号分组处理）；
- 稳定：每一位的计数排序都从后往前填。

## Python 内置排序

Python 的 `list.sort()` 和 `sorted()` 使用 **Timsort**（归并 + 插入的混合）：

- 稳定；
- 对部分有序数据接近 `O(n)`；
- 最坏 `O(n log n)`；
- `key` 函数只对每个元素调用一次，结果被缓存（decorate-sort-undecorate）。

```python
nums.sort()                          # 原地排序，返回 None
arr = sorted(nums)                   # 返回新列表
nums.sort(reverse=True)              # 降序
words.sort(key=len)                  # 按长度
pairs.sort(key=lambda p: (p[1], -p[0]))   # 多关键字：第二列升序，第一列降序
```

需要自定义比较逻辑时：

```python
from functools import cmp_to_key

def compare(a, b):
    if a[0] != b[0]:
        return a[0] - b[0]           # 第一列升序
    return b[1] - a[1]               # 第一列相同，第二列降序

nums.sort(key=cmp_to_key(compare))
```

`cmp_to_key` 要求比较函数满足**严格弱序**：
`compare(a, a) == 0`，且不能出现 `a < b`、`b < c` 但 `c < a` 这种循环。
比较函数写错时，Python 不会报错，只会给出一个「看起来排过但顺序奇怪」的结果。

## 怎么选排序算法

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 日常开发 | `sorted()` / `list.sort()` | Timsort，稳定且高度优化 |
| 小数组（n < 64） | 插入排序 | 常数小，实际比归并/快排快 |
| 近乎有序 | 插入排序 / Timsort | 接近 O(n) |
| 需要稳定 | 归并排序 / Timsort | 相等元素保持原顺序 |
| 内存敏感 | 堆排序 / 快速排序 | 原地，额外空间 O(1) / O(log n) |
| 链表 | 归并排序 | 不需要随机访问，可做到 O(1) 额外空间 |
| Top K / 第 K 大 | 堆 / 快速选择 | O(n log k) 或平均 O(n) |
| 数据范围小的整数 | 计数排序 | O(n + k)，接近线性 |
| 固定位数的整数 | 基数排序 | O(d(n + b)) |
| 数据分布均匀的浮点数 | 桶排序 | 平均 O(n) |
| 最坏情况也要 O(n log n) | 归并 / 堆排序 | 快排最坏会退化 |

## 复杂度小结

- **比较排序的下界是 `Ω(n log n)`。** 归并、快排、堆排序都达到了这个下界（快排是平均意义下）；
  想再快，只能利用数据的额外结构，比如值域小（计数）、分布均匀（桶）、位数固定（基数）。
- **时间与空间的取舍：** 归并稳定但要 `O(n)` 额外空间；快排原地、平均最快，但最坏会退化且不稳定；
  堆排序最坏也有 `O(n log n)` 保证，常数更大。
- **稳定性来自「相等时怎么处理」：** 归并的 `<=`、插入的严格 `>`、冒泡的严格 `>` 都是在保护相等元素的相对顺序；
  选择排序的交换、快排的 partition、堆的交换则会破坏它。

## 易错点

- ❌ **把稳定性当成默认属性**：快排、堆排、选择排序都不稳定，多关键字排序时要用 `key` 元组或稳定排序。
- ❌ **比较函数不满足严格弱序**：`cmp_to_key` 里出现 `<=` 返回 0 以外的值，可能得到错误的顺序。
- ❌ **快排不随机化**：对已经有序的数组取端点做 pivot，直接退化为 `O(n²)`。
- ❌ **快排递归深度**：最坏 `O(n)` 层，Python 递归限制约 1000，大数组可能栈溢出。
- ❌ **归并排序忘记 `<=`**：写成 `<` 会破坏稳定性。
- ❌ **计数排序范围过大**：`max - min` 很大时内存爆炸，应先判断 `k` 与 `n` 的关系。
- ❌ **基数排序处理负数**：`(x // exp) % 10` 对负数的结果不是期望的十进制位，需要先平移或按符号分组。
- ❌ **边遍历边修改列表**：排序会改变下标，遍历中 `pop` / `insert` 极易越界。
- ❌ **把字符串当数字排序**：`sorted(['10', '2', '1'])` 得到 `['1', '10', '2']`，需要 `key=int`。

## 相关题目

- [148. 排序链表](../problems/leetcode/0148_sort_list.md)
- [75. 颜色分类](../problems/leetcode/0075_sort_colors.md)
- [215. 数组中的第 K 个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md)
- [347. 前 K 个高频元素](../problems/leetcode/0347_top_k_frequent_elements.md)
- [56. 合并区间](../problems/leetcode/0056_merge_intervals.md)
- [406. 根据身高重建队列](../problems/leetcode/0406_queue_reconstruction_by_height.md)
- [49. 字母异位词分组](../problems/leetcode/0049_group_anagrams.md)

## 相关模式

- [查找算法](search.md)：排序是二分的前提，快速选择是二分的亲戚。
- [贪心](greedy.md)：大量贪心题的第一步是排序。
- [双指针](two_pointers.md)：有序数组上的两数之和、去重。
- [哈希映射](hash_map.md)：计数排序之外的另一种「按值索引」。
- [堆与优先队列](../data-structures/heap.md)：Top K 的常用工具。

## 算法可视化

下面有三个播放器，输入同一组数 `5,2,9,1,5,6,3`（逗号分隔），可以换成自己的数组。

**冒泡排序**：右侧深色部分是「已经排好的后缀」，每一轮都在缩短。把输入改成已经有序的
`1,2,3,4,5`，第一轮没有发生交换，算法会立刻结束 —— 这就是冒泡的最好情况 `O(n)`。

**归并排序**：先一路拆到单元素，再两两合并。注意合并时总是先取较小的一方，
相等时取左边（`<=`），这就是归并稳定的原因。

**快速排序**：每一轮选一个 pivot，把小于它的放左边、大于它的放右边，pivot 落位后就不再移动。
观察 pivot 的位置如何把数组切成两段，再分别递归。输入里有两个 `5`，
可以留意它们相对顺序的变化 —— 快排是不稳定的。
