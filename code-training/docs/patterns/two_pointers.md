---
title: 双指针模式
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 数组
  - 链表
  - 字符串
last_updated: 2026-10-19
---

# 双指针

## 一句话说清双指针

用两个指针代替两层循环，**让每个指针只朝一个方向移动**，把 `O(n²)` 的枚举压成 `O(n)`。

它成立的前提不是「有两个指针」，而是**每次移动都能排除一批不可能的答案**。
如果两个指针乱走、或者移动后无法证明「被跳过的组合一定不对」，那就不是双指针，只是恰好用了两个变量。

```
暴力：枚举所有 (i, j) 组合              O(n²)
双指针：i 从左、j 从右，每次排除一个    O(n)
```

## 三种常见形态

| 形态 | 指针方向 | 典型问题 | 关键不变量 |
| --- | --- | --- | --- |
| **对撞指针** | 左 → ← 右 | 有序两数之和、三数之和、盛水容器、接雨水 | 区间 `[left, right]` 外的组合已被排除 |
| **同向快慢** | 同向，速度不同 | 去重、移动零、链表找中点、判环 | `[0, slow)` 是已处理好的部分 |
| **分离双指针** | 各自扫描一个序列 | 合并两个有序数组/链表、求交集 | 两个序列的当前位置之前的元素已处理 |

滑动窗口是双指针的一个特殊分支（两个指针同向、维护连续区间），单独放在
[滑动窗口](sliding_window.md) 里讲。

## 对撞指针

### 对撞模板

```python
def two_pointer_opposite(nums, target):
    left, right = 0, len(nums) - 1

    while left < right:
        current = nums[left] + nums[right]

        if current == target:
            return [left, right]
        if current < target:
            left += 1          # 太小，左指针右移
        else:
            right -= 1         # 太大，右指针左移

    return []
```

### 为什么可以移动

以**有序数组的两数之和**为例。当前 `nums[left] + nums[right] < target`：

- `nums[left]` 已经是最小的左端；
- 它和**任何** `right' <= right` 相加都只会更小；
- 所以 `nums[left]` 不可能出现在答案里，可以永久排除，`left += 1`。

同理，和太大时 `nums[right]` 与任何左端相加都太大，可以永久排除。

**每一步都排除了一整行（或一整列）候选**，所以总步数是 `O(n)`。

### 例 1：盛最多水的容器（LeetCode 11）

[11. 盛最多水的容器](../problems/leetcode/0011_container_with_most_water.md)

面积由「较短的那块板」和「两板之间的距离」决定：

```
area = min(height[left], height[right]) * (right - left)
```

移动规则：**只移动较短的那一边**。

```python
def max_area(height):
    left, right = 0, len(height) - 1
    ans = 0

    while left < right:
        ans = max(ans, min(height[left], height[right]) * (right - left))

        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return ans
```

**为什么移动较短的板？** 假设 `height[left] < height[right]`：

- 如果保留 `left`、移动 `right`，宽度变小，高度上限仍是 `height[left]`，面积不可能变大；
- 移动 `left` 至少有可能遇到更高的板，面积才可能增加。

所以移动较短板不会错过最优解，而移动较长板可能会。

### 例 2：三数之和（LeetCode 15）

[15. 三数之和](../problems/leetcode/0015_3sum.md)

排序后固定第一个数 `nums[i]`，剩下的两数用对撞指针找。难点是**去重**：

- 第一个数：`i > 0 and nums[i] == nums[i-1]` 时跳过；
- 第二、三个数：找到一组后，跳过所有与当前左右值相同的元素。

```python
def three_sum(nums):
    nums.sort()
    ans = []
    n = len(nums)

    for i in range(n - 2):
        if nums[i] > 0:                 # 最小的数都大于 0，后面不可能凑出 0
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue                    # 第一个数去重

        left, right = i + 1, n - 1

        while left < right:
            total = nums[i] + nums[left] + nums[right]

            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                ans.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1

                while left < right and nums[left] == nums[left - 1]:
                    left += 1           # 第二个数去重
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1          # 第三个数去重

    return ans
```

以 `[-1, 0, 1, 2, -1, -4]` 为例，排序后是 `[-4, -1, -1, 0, 1, 2]`：

| 固定 | left / right | 过程 | 结果 |
| --- | --- | --- | --- |
| -4 | 1 / 5 | 和始终小于 0，left 一路右移到 5，区间为空 | 无 |
| -1（第一个） | 2 / 5 | -1 + (-1) + 2 = 0 | `[-1, -1, 2]` |
| -1（第一个） | 3 / 4 | -1 + 0 + 1 = 0 | `[-1, 0, 1]` |
| -1（第二个） | — | 与上一个 -1 重复 | 跳过 |
| 0 | 4 / 5 | 0 + 1 + 2 > 0，right 左移 | 无 |

最终 `[[-1, -1, 2], [-1, 0, 1]]`。

> 去重只跳过「同一层」的重复值，不能把 `[-1, -1, 2]` 里的两个 -1 也跳过。
> 第一个数去重看 `i-1`，后两个数去重看「刚用过的值」，三者互不影响。

### 例 3：接雨水（LeetCode 42）

[42. 接雨水](../problems/leetcode/0042_trapping_rain_water.md)

每个位置能接的水 = `min(左边最高, 右边最高) - 当前高度`。
用两个指针从两端向中间走，同时维护 `left_max` 和 `right_max`：

```python
def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    ans = 0

    while left < right:
        left_max = max(left_max, height[left])
        right_max = max(right_max, height[right])

        if left_max < right_max:
            # 左边最高更矮，left 位置的水量由 left_max 决定
            ans += left_max - height[left]
            left += 1
        else:
            ans += right_max - height[right]
            right -= 1

    return ans
```

**为什么 `left_max < right_max` 时就能确定 `left` 的水量？**
因为右边已经有一根不低于 `left_max` 的柱子，`left` 上方的水位上限就是 `left_max`，
再往右走也不会更低。反过来对 `right` 同理。

## 同向快慢指针

两个指针从同一侧出发，`slow` 标记「已处理好的边界」，`fast` 负责扫描。

### 同向模板

```python
def remove_duplicates(nums):
    if not nums:
        return 0

    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]

    return slow + 1        # 新长度 = 末尾下标 + 1
```

**不变量：`[0, slow]` 是已经去重且保序的部分。** `fast` 每找到一个新值，
就把它写到 `slow + 1`，`slow` 再前移。由于只覆盖、不交换，原数组前 `slow + 1`
个位置就是答案。

### 例 4：移动零（LeetCode 283）

[283. 移动零](../problems/leetcode/0283_move_zeroes.md)

把所有 0 移到末尾，同时保持非零元素的相对顺序。

```python
def move_zeroes(nums):
    slow = 0

    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1
```

- `slow` 之前全是非零元素；
- `slow` 到 `fast` 之间全是 0；
- 交换后两个区间仍然满足不变量。

### 例 5：环形链表（LeetCode 141 / 142）

[141. 环形链表](../problems/leetcode/0141_linked_list_cycle.md)
[142. 环形链表 II](../problems/leetcode/0142_linked_list_cycle_ii.md)

快指针每次走两步，慢指针每次走一步。如果有环，快指针一定会在环内追上慢指针。

```python
def has_cycle(head):
    slow = fast = head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True

    return False
```

**为什么一定会相遇？** 进入环后，快指针相对慢指针每次靠近 1 步，环长有限，
所以最多 `环长` 步就会追上。

**找环的入口**（142）：相遇后，让一个指针回到头节点，两个指针都每次走一步，
再次相遇的位置就是入口。

```python
def detect_cycle(head):
    slow = fast = head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

        if slow is fast:
            ptr = head
            while ptr is not slow:
                ptr = ptr.next
                slow = slow.next
            return ptr

    return None
```

**推导：** 设头到入口距离为 `x`，入口到相遇点为 `y`，环长为 `c`。
相遇时慢指针走了 `x + y`，快指针走了 `x + y + n·c`，且快指针路程是慢指针的两倍：

```
x + y + n·c = 2(x + y)
=> x = n·c - y = (n-1)·c + (c - y)
```

`c - y` 正是「从相遇点继续走到入口」的距离。所以从头走 `x` 步、从相遇点走
`c - y` 步，会在入口相遇。

### 例 6：删除链表的倒数第 N 个节点（LeetCode 19）

[19. 删除链表的倒数第 N 个节点](../problems/leetcode/0019_remove_nth_node_from_end_of_list.md)

让 `fast` 先走 `n + 1` 步，然后 `slow` 和 `fast` 同步前进。
当 `fast` 走到 `None` 时，`slow` 正好停在待删除节点的前一个。

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)       # 哑节点，方便删除头节点
    slow = fast = dummy

    for _ in range(n + 1):
        fast = fast.next

    while fast:
        slow = slow.next
        fast = fast.next

    slow.next = slow.next.next
    return dummy.next
```

### 例 7：回文链表（LeetCode 234）

[234. 回文链表](../problems/leetcode/0234_palindrome_linked_list.md)

三步：快慢指针找中点 → 反转后半段 → 从两头向中间比较。

```python
def is_palindrome(head):
    slow = fast = head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    # 反转后半段
    prev = None
    while slow:
        nxt = slow.next
        slow.next = prev
        prev = slow
        slow = nxt

    # 比较
    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left = left.next
        right = right.next

    return True
```

`fast` 初始为 `head`、循环条件 `fast and fast.next`，最终 `slow` 指向后半段的第一个节点
（奇数长度时正好是中间节点）。如果题目要求不能修改原链表，比较完再把后半段反转回去。

## 分离双指针

两个指针分别在两个序列上走，谁小取谁。典型是合并两个有序数组/链表。

```python
def merge_two_lists(l1, l2):
    dummy = ListNode(0)
    tail = dummy

    while l1 and l2:
        if l1.val <= l2.val:        # <= 保证稳定
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next

    tail.next = l1 or l2
    return dummy.next
```

[21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)

## 常见变体

### 1. 三指针

固定一个、另外两个对撞，就是三数之和；[75. 颜色分类](../problems/leetcode/0075_sort_colors.md)
用 `lt / i / gt` 三个指针一次遍历完成三路划分。

### 2. 双指针 + 排序

两数之和的无序版本不能直接用对撞指针，因为排序会打乱下标。
要么用哈希表（见下），要么排序后额外记录原下标。

### 3. 双指针 + 链表

链表题里「双指针」通常指快慢指针：找中点、判环、找倒数第 N 个。
链表的指针移动必须检查 `fast` 和 `fast.next` 是否为空。

## 复杂度分析

| 问题 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 有序数组两数之和 | O(n) | O(1) | 对撞，每个指针最多走 n 步 |
| 三数之和 | O(n²) | O(1) | 固定一个数 O(n)，内层对撞 O(n) |
| 盛最多水的容器 | O(n) | O(1) | 每次移动较短的一边 |
| 接雨水 | O(n) | O(1) | 左右最高值 + 两个指针 |
| 删除重复项 / 移动零 | O(n) | O(1) | 原地覆盖或交换 |
| 环形链表 | O(n) | O(1) | 快慢指针 |
| 合并两个有序链表 | O(m + n) | O(1) | 原地拼接 |
| 删除倒数第 N 个 | O(L) | O(1) | 先走 n+1 步，再同步 |

## 易错点

- ❌ **对无序数组直接用对撞指针**：两数之和必须先排序，或者改用哈希表。
- ❌ **移动了错误的一边**：盛水容器移动较高的一边会错过最优解；两数之和和太小要移动左指针。
- ❌ **`while left < right` 写成 `<=`**：对撞指针相遇时同一个元素会被用两次（两数之和会返回同一个下标）。
- ❌ **三数之和去重不完整**：只对第一个数去重，结果会出现重复三元组；只对后两个去重，第一个数重复时仍会重复。
- ❌ **去重时越界**：`nums[left] == nums[left + 1]` 要在 `left < right` 的前提下检查。
- ❌ **链表空指针**：快指针的循环条件是 `fast and fast.next`，少一个都会在偶数长度链表上崩溃。
- ❌ **移动零时用覆盖而不是交换**：覆盖会丢失元素，交换才能保持非零元素的顺序。
- ❌ **返回长度写成 `slow`**：去重题里 `slow` 是最后一个有效元素的下标，长度要 `+1`。

## 相关题目

**对撞指针：**

- [11. 盛最多水的容器](../problems/leetcode/0011_container_with_most_water.md)
- [15. 三数之和](../problems/leetcode/0015_3sum.md)
- [16. 最接近的三数之和](../problems/leetcode/0016_3sum_closest.md)
- [42. 接雨水](../problems/leetcode/0042_trapping_rain_water.md)

**同向指针：**

- [283. 移动零](../problems/leetcode/0283_move_zeroes.md)
- [141. 环形链表](../problems/leetcode/0141_linked_list_cycle.md)
- [142. 环形链表 II](../problems/leetcode/0142_linked_list_cycle_ii.md)
- [19. 删除链表的倒数第 N 个节点](../problems/leetcode/0019_remove_nth_node_from_end_of_list.md)
- [234. 回文链表](../problems/leetcode/0234_palindrome_linked_list.md)

**分离双指针：**

- [21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)
- [160. 相交链表](../problems/leetcode/0160_intersection_of_two_linked_lists.md)

**对照：**

- [1. 两数之和](../problems/leetcode/0001_two_sum.md)（哈希表解法）
- [76. 最小覆盖子串](../problems/leetcode/0076_minimum_window_substring.md)（滑动窗口）

## 相关模式

- [滑动窗口](sliding_window.md)：同向双指针维护连续区间。
- [哈希映射](hash_map.md)：无序两数之和的另一种 O(n) 解法。
- [查找算法](search.md)：有序数组上的二分。
- [排序](sorting.md)：对撞指针通常需要先排序。
- [链表](../data-structures/linked_list.md)、[数组](../data-structures/array.md)。

## 算法可视化

下面的播放器演示的是**两数之和的哈希表解法**：从左往右扫，每到一个数就查
「还差的那个数之前见过吗」，先查后存。画面上会标出当前元素、查表结果和哈希表大小。

它没有用对撞指针，是因为力扣原题要求返回**原数组下标**，排序会打乱下标。
如果数组已经有序（或者允许返回数值而不要求原下标），对撞指针只需 `O(1)` 额外空间：

```python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1

    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1

    return []
```

把输入框写成 `1,2,3,4;5`（分号前是数组，分号后是目标值），再对比两种写法：
哈希表是「用空间换时间」，对撞指针是「用有序性换空间」。
