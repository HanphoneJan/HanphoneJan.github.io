---
title: 1. 两数之和
platform: LeetCode
difficulty: Easy
id: 1
url: https://leetcode.cn/problems/two-sum/
tags:
  - 数组
  - 哈希表
patterns:
  - ../../patterns/hash_map.md
topics: []
date_added: 2026-03-25
date_reviewed: []
---

# 1. 两数之和

## 题目描述

给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出**和为目标值** `target` 的那**两个**整数，并返回它们的数组下标。

你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。

你可以按任意顺序返回答案。

## 示例

**示例 1：**
```
输入：nums = [2,7,11,15], target = 9
输出：[0,1]
解释：因为 nums[0] + nums[1] == 9，返回 [0, 1]
```

**示例 2：**
```
输入：nums = [3,2,4], target = 6
输出：[1,2]
```

**示例 3：**
```
输入：nums = [3,3], target = 6
输出：[0,1]
```

---

## 解题思路

### 问题本质

需要在数组中找出和为 `target` 的两个元素，返回它们的数组下标。同一个元素不能重复使用。核心是：**如何快速判断 `target - nums[i]` 是否已经出现过？**

### 方法一：暴力枚举（双重循环）

**思路**：枚举所有 `(i, j)` 且 `i < j`，检查 `nums[i] + nums[j] == target`，找到即返回。

```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        for i in range(n):
            for j in range(i + 1, n):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []
```

**说明**：思路最直接，但时间复杂度 O(n²)。

### 方法二：排序 + 双指针

**思路**：将 `(值, 原始下标)` 组成元组后按值排序，用左右双指针根据和与 `target` 的大小移动。找到答案时返回对应的原始下标。

```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        indexed_nums = [(num, i) for i, num in enumerate(nums)]
        indexed_nums.sort(key=lambda x: x[0])

        left, right = 0, len(indexed_nums) - 1
        while left < right:
            s = indexed_nums[left][0] + indexed_nums[right][0]
            if s == target:
                return [indexed_nums[left][1], indexed_nums[right][1]]
            elif s < target:
                left += 1
            else:
                right -= 1
        return []
```

**取舍**：
- **优点**：时间复杂度 O(n log n)，空间复杂度 O(n)
- **缺点**：需要排序并额外保存原始下标

### 方法三：哈希表（一遍遍历，推荐）

**思路**：遍历数组，用哈希表记录 `值 -> 索引`。对于当前元素 `num`，先查找 `complement = target - num` 是否在表中；若在则返回 `[表中索引, 当前索引]`，否则将 `num` 存入哈希表。

```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        hashtable = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in hashtable:
                return [hashtable[complement], i]
            hashtable[num] = i
        return []
```

**说明**：边查边存，只需一次遍历，时间复杂度 O(n)，空间复杂度 O(n)。

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    两数之和 - 哈希表解法

    核心思路：
    - 遍历数组时，使用哈希表记录每个数值对应的索引
    - 对于当前元素num，检查(target - num)是否在哈希表中
    - 如果在，说明找到了答案；如果不在，将当前元素存入哈希表

    为什么用哈希表：
    - 哈希表的查找时间复杂度是O(1)
    - 将整体时间复杂度从O(n²)降低到O(n)

    时间复杂度：O(n) - 只需遍历数组一次
    空间复杂度：O(n) - 哈希表最多存储n个元素
    """

    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # 哈希表：存储数值到索引的映射
        hashtable = dict()

        for i, num in enumerate(nums):
            # 计算需要找到的补数
            complement = target - num

            # 如果补数已在哈希表中，返回两个索引
            if complement in hashtable:
                return [hashtable[complement], i]

            # 将当前数值和索引存入哈希表
            hashtable[num] = i

        return []  # 题目保证有解，这里为了语法完整


# 测试代码
if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([2, 7, 11, 15], 9, [0, 1]),
        ([3, 2, 4], 6, [1, 2]),
        ([3, 3], 6, [0, 1]),
    ]

    for nums, target, expected in tests:
        result = sol.twoSum(nums, target)
        print(f"nums={nums}, target={target} -> {result}, expected={expected}")
```

---

## 示例推演

以 `nums = [2, 7, 11, 15], target = 9` 为例：

| 步骤 | i | num | complement | 哈希表状态 | 操作 |
|------|---|-----|-----------|-----------|------|
| 1 | 0 | 2 | 7 | {} | 7不在表中，存入{2:0} |
| 2 | 1 | 7 | 2 | {2:0} | **2在表中！返回[0,1]** |

成功找到答案 `[0, 1]`，因为 `nums[0] + nums[1] = 2 + 7 = 9`。

再以 `nums = [3, 2, 4], target = 6` 为例：

| 步骤 | i | num | complement | 哈希表状态 | 操作 |
|------|---|-----|-----------|-----------|------|
| 1 | 0 | 3 | 3 | {} | 3不在表中，存入{3:0} |
| 2 | 1 | 2 | 4 | {3:0} | 4不在表中，存入{3:0, 2:1} |
| 3 | 2 | 4 | 2 | {3:0, 2:1} | **2在表中！返回[1,2]** |

成功找到答案 `[1, 2]`，因为 `nums[1] + nums[2] = 2 + 4 = 6`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力枚举（双重循环） | O(n²) | O(1) | 枚举所有配对 |
| 排序 + 双指针 | O(n log n) | O(n) | 需排序并保存 `(值, 原始下标)` |
| 哈希表（一遍遍历） | O(n) | O(n) | 推荐做法 |

---

## 易错点总结

- **先查表，再存数**：遍历时必须先检查 `complement` 是否已在哈希表中，再将当前 `num` 存入。若先存，`target == 2 * num` 时就会把同一个元素误当成答案。
- **返回原始下标**：题目要求返回数组下标。若用排序 + 双指针法，务必保留并返回原始索引。

---

## 扩展思考

### 1. 如果数组是有序的？

如果数组已经有序，可以使用双指针法：
- 左指针指向开头，右指针指向结尾
- 和小于 target，左指针右移
- 和大于 target，右指针左移
- 时间复杂度 O(n)，空间复杂度 O(1)

### 2. 如果要求返回所有可能的组合？

如果存在多组解，需要修改代码收集所有结果，而不是找到一组就返回。

### 3. 如果数组中有重复元素？

哈希表解法天然支持重复元素，因为存储的是 `{值: 索引}`，即使值相同，索引也不同。

### 4. 三数之和

类似的问题 [15. 三数之和](https://leetcode.cn/problems/3sum/)，需要在两数之和的基础上再加一层循环，或使用双指针技巧。

---

## 相关题目

- [167. 两数之和 II - 输入有序数组](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)
- [15. 三数之和](https://leetcode.cn/problems/3sum/)
- [18. 四数之和](https://leetcode.cn/problems/4sum/)
- [1. 两数之和](https://leetcode.cn/problems/two-sum/)
