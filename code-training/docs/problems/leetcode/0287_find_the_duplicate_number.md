---
title: 287. 寻找重复数
platform: LeetCode
difficulty: Medium
id: 287
url: https://leetcode.cn/problems/find-the-duplicate-number/
tags:
  - 数组
  - 双指针
  - 二分查找
  - Floyd 判圈算法
  - 位运算
  - 抽屉原理
patterns:
  - ../../patterns/search.md
  - ../../patterns/two_pointers.md
date_added: 2026-04-09
---

# 287. 寻找重复数

## 题目描述

给定一个包含 `n + 1` 个整数的数组 `nums`，其数字都在 `[1, n]` 范围内（包括 `1` 和 `n`），可知至少存在一个重复的整数。

假设 `nums` 只有**一个重复的整数**，返回这个重复的数。

你设计的解决方案必须**不修改**数组 `nums` 且只用**常量级** `O(1)` 的额外空间。

**示例 1：**

```
输入: nums = [1,3,4,2,2]
输出: 2
```

**示例 2：**

```
输入: nums = [3,1,3,4,2]
输出: 3
```

**示例 3：**

```
输入: nums = [3,3,3,3,3]
输出: 3
```

**提示：**
- `1 <= n <= 10^5`
- `nums.length == n + 1`
- `1 <= nums[i] <= n`
- `nums` 中只有一个整数出现两次或多次，其余整数均只出现一次

**进阶：**
- 如何证明 `nums` 中至少存在一个重复的数字?
- 你可以设计一个线性级时间复杂度 `O(n)` 的解决方案吗？
- 你可以设计一个空间复杂度为 `O(1)` 且时间复杂度小于 `O(n^2)` 的解决方案吗？

---

## 解题思路

### 问题本质

数组中有 `n + 1` 个元素，值域为 `[1, n]`，且**至少存在一个重复数**，题目假设只有一个重复数。要求在**不修改数组**且**仅用 O(1) 额外空间**的前提下找出这个重复数。

### 方法一：暴力枚举（双重循环）

**思路**：枚举所有 `(i,j)` 且 `i < j`，逐一比较 `nums[i] == nums[j]`，找到即返回。

```python
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        n = len(nums)
        for i in range(n):
            for j in range(i + 1, n):
                if nums[i] == nums[j]:
                    return nums[i]
        return -1
```

**说明**：思路最直接，但时间复杂度 O(n²)，对于 `n` 较大时会超时。不满足题目对时间的进阶要求，但能理解问题。

### 方法二：二分查找（值域二分）

**思路**：利用抽屉原理。二分的不是下标，而是**值域 `[1, n]`**。对于每个中间值 `mid`，统计数组中 `<= mid` 的元素个数 `count`：
- 如果 `count > mid`，说明 `[1, mid]` 区间内的数字个数大于该区间的范围，重复数一定在 `[left, mid]` 内
- 如果 `count <= mid`，说明重复数在 `[mid+1, right]` 内

不断缩小区间，最终 `left == right` 时即为重复数。

```python
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        left, right = 1, len(nums) - 1
        while left < right:
            mid = (left + right) // 2
            count = 0
            for num in nums:
                if num <= mid:
                    count += 1
            if count > mid:
                right = mid
            else:
                left = mid + 1
        return left
```

**说明**：时间复杂度 O(n log n)，空间复杂度 O(1)，且**不修改数组**，满足题目约束。

### 方法三：Floyd 判圈算法（龟兔赛跑，推荐）

**核心洞察**：将数组视作一个隐式链表，令 `next[i] = nums[i]`。由于值域在 `[1, n]` 且有 `n+1` 个元素，必然存在环。数组中重复的数字就是环的入口。

**思路**：
1. **找相遇点**：用快慢指针，从 `slow = nums[0]`、`fast = nums[nums[0]]`（或都从 0 出发）开始，`slow` 每次走一步，`fast` 每次走两步，直至相遇。
2. **找环入口**：将其中一个指针重置到起点（索引 0），两者每次各走一步，再次相遇即为环入口，也就是重复的数字。

```python
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        slow = fast = 0
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        slow = 0
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow
```

**说明**：时间复杂度 O(n)，空间复杂度 O(1)，是本题最优解法。思路与 [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/) 完全一致。

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    287. 寻找重复数 - Floyd 判圈算法（龟兔赛跑算法）

    问题分析：
    数组有 n+1 个整数，范围在 [1, n] 之间，必有一个重复数。
    关键约束：不能修改数组，只能使用 O(1) 额外空间。

    核心洞察：
    将数组看作一个链表：下标 i 指向 nums[i]。
    由于存在重复数，这个"链表"必然存在环！
    - 每个下标 i 有一条出边指向 nums[i]
    - 重复数意味着有两个下标指向同一个值，形成环的入口

    Floyd 判圈算法（同 142. 环形链表 II）：
    1. 阶段一：快慢指针找相遇点
       - 慢指针每次走 1 步：slow = nums[slow]
       - 快指针每次走 2 步：fast = nums[nums[fast]]
       - 有环则必然相遇

    2. 阶段二：找环的入口（即重复数）
       - 一个指针从起点出发，另一个从相遇点出发
       - 两者每次各走 1 步，再次相遇点即为环入口

    时间复杂度: O(n) - 快慢指针最多遍历 2n 个元素
    空间复杂度: O(1) - 只使用两个指针
    """

    def findDuplicate(self, nums: List[int]) -> int:
        """
        Floyd 判圈算法寻找重复数
        将数组看作链表：下标 i -> nums[i]
        """
        # 阶段一：快慢指针找相遇点
        # 选择 0 作为起点，因为数组元素范围是 [1, n]，0 一定不在环上
        slow = fast = 0
        while True:
            slow = nums[slow]           # 慢指针走 1 步
            fast = nums[nums[fast]]     # 快指针走 2 步
            if fast == slow:            # 相遇，找到环内一点
                break

        # 阶段二：找环的入口（重复数）
        # 数学结论：两个指针同步每次走 1 步，相遇处就是环入口
        head = 0
        while slow != head:
            slow = nums[slow]   # 从相遇点出发，每次 1 步
            head = nums[head]   # 从起点出发，每次 1 步

        return slow  # 环的入口就是重复数
```

---

## 示例推演

以 `nums = [1, 3, 4, 2, 2]` 为例：

**将数组看作链表：**
```
下标:  0 -> 1 -> 3 -> 2 -> 4
值:    1    3    2    4    2

链表结构: 0 -> 1 -> 3 -> 2 -> 4
                         ↑_____|

环的入口是下标 2（值为 2），这就是重复数！
```

**阶段一：快慢指针找相遇点**
```
初始: slow = 0, fast = 0

第 1 步:
  slow = nums[0] = 1
  fast = nums[nums[0]] = nums[1] = 3

第 2 步:
  slow = nums[1] = 3
  fast = nums[nums[3]] = nums[2] = 4

第 3 步:
  slow = nums[3] = 2
  fast = nums[nums[4]] = nums[2] = 4

第 4 步:
  slow = nums[2] = 4
  fast = nums[nums[4]] = nums[2] = 4

相遇！slow = fast = 4
```

**阶段二：找环的入口**
```
head = 0, slow = 4

第 1 步:
  head = nums[0] = 1
  slow = nums[4] = 2

第 2 步:
  head = nums[1] = 3
  slow = nums[2] = 4

第 3 步:
  head = nums[3] = 2
  slow = nums[4] = 2

相遇！head = slow = 2

返回 2，这就是重复数。
```

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力枚举（双重循环） | O(n²) | O(1) | 思路简单，但会超时 |
| 二分查找（值域） | O(n log n) | O(1) | 不修改数组，满足题目约束 |
| Floyd 判圈算法（推荐） | O(n) | O(1) | 时间最优，且符合所有约束 |

---

## 易错点总结

- **起点选择**：用 0 作为起点是合适的。因为数组值域是 `[1, n]`，`nums[0]` 也可能是环的一部分，但用 Floyd 算法时从 `0` 出发仍能正确找到环入口。
- **快指针走两步**：`fast = nums[nums[fast]]` 才是沿着「下标 -> 值」这条隐式链表走两步，不能写成 `nums[fast + 1]`。
- **阶段二要重置**：相遇后将 `slow` 重置为 0，再让两者每次各走一步，直到再次相遇即为环入口（重复数）。

---

## 扩展思考

### 1. 相关题目

- [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/) - Floyd 判圈模板题
- [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle/) - 判断是否有环
- [202. 快乐数](https://leetcode.cn/problems/happy-number/) - 类似判圈思想

### 2. Floyd 判圈算法的应用

Floyd 判圈算法适用于：
- 判断链表是否有环
- 找环的入口
- 找序列的周期

### 3. 其他解法对比

**二分查找法：**
- 优点：容易理解，不需要将数组看作链表
- 缺点：时间复杂度 O(n log n)，不如 Floyd 的 O(n)

**Floyd 判圈法：**
- 优点：时间 O(n)，空间 O(1)，最优
- 缺点：思路巧妙，不容易想到

### 4. 数学定理

**鸽巢原理（抽屉原理）：** 如果有 n 个鸽巢，n+1 只鸽子，至少有一个鸽巢有 2 只或更多鸽子。

本题中：
- 鸽巢：1 到 n 的 n 个数字
- 鸽子：数组中的 n+1 个元素
- 结论：至少有一个数字出现两次或更多
