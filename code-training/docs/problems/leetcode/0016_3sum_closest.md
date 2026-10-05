---
title: 16. 最接近的三数之和
platform: LeetCode
difficulty: Medium
sidebar_position: 16
id: 16
url: https://leetcode.cn/problems/3sum-closest/
tags:
  - 数组
  - 双指针
  - 排序
topics: []
patterns: []
date_added: 2026-09-29
date_reviewed: []
---

# 16. 最接近的三数之和

## 题目描述

给你一个长度为 `n` 的整数数组 `nums` 和一个目标值 `target`。请你从 `nums` 中选出三个整数，使它们的和与 `target` 最接近。返回这三个数的和。

假定每组输入只存在恰好一个解。

**示例**：
- 输入：`nums = [-1,2,1,-4], target = 1` → 输出：`2`（`-1 + 2 + 1 = 2`，与 `1` 最接近）
- 输入：`nums = [0,0,0], target = 1` → 输出：`0`

---

## 解题思路

### 第一步：理解问题本质

在数组中选三个数，使三数和尽量逼近 `target`。与"三数之和为 0"不同，这里不需要去重、不需要枚举所有组合，只求最接近的那一个和。

### 第二步：暴力解法

三层循环枚举所有三元组，计算与 `target` 的差值取最小。O(n³)，超时。

### 第三步：优化解法（排序 + 双指针）

先排序，固定第一个数，剩下两个数用双指针夹逼。关键是如何移动指针：

设 `sub = target - (nums[i] + nums[left] + nums[right])`：
- `sub > 0`：当前三数和偏小，需要更大的和 → `left` 右移（增大较小的数）。
- `sub < 0`：当前三数和偏大，需要更小的和 → `right` 左移（减小较大的数）。
- `sub == 0`：恰好等于 `target`，这是最优解，直接返回。

每次更新最小差值与对应和。

**算法步骤：**
1. 先对 `nums` 升序排序，这样「往右移一定变大、往左移一定变小」才成立
2. 用 `result` 记录当前最接近的和、`min_sub` 记录它与 `target` 的最小差值（初值 `float('inf')`，这样第一次比较必然生效）
3. 枚举固定项 `i`，需留出后面两个数的位置，所以范围是 `range(len(nums) - 2)`
4. 对每个 `i`，令 `left = i + 1`、`right = len(nums) - 1`，在 `left < right` 时按上面的规则移动指针
5. 差值更小时同时更新 `result` 与 `min_sub`；`sub == 0` 直接返回（不可能更优）
6. 循环结束返回 `result`

**为什么固定项只枚举到倒数第三个：** `i` 之后必须至少还剩两个数，否则双指针没有落脚点。

可运行的完整实现见下一节「完整代码实现」。

---

## 完整代码实现

```python
class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        nums.sort()
        result = None
        min_sub = float('inf')
        for i in range(len(nums) - 2):
            left, right = i + 1, len(nums) - 1
            while left < right:
                sub = target - nums[i] - nums[left] - nums[right]
                if sub == 0:
                    return nums[i] + nums[left] + nums[right]
                if abs(sub) < min_sub:
                    min_sub = abs(sub)
                    result = nums[i] + nums[left] + nums[right]
                if sub > 0:
                    left += 1
                else:
                    right -= 1
        return result
```

---

## 示例推演

以 `nums = [-1, 2, 1, -4], target = 1` 为例，期望输出 `2`。

**排序后**：`[-4, -1, 1, 2]`。

**`i = 0`，`nums[0] = -4`，`left = 1`，`right = 3`**：

| sub 计算 | sub | |abs(sub)| 与 min_sub | 动作 |
|----------|-----|----------------|--------|------|
| 1-(-4)-(-1)-2 | 4 | 4 < inf → 更新 result=-1，min_sub=4 | sub>0 → left++ |
| 1-(-4)-(-1)-1 | 5 | 5 > 4 不更新 | sub>0 → left++（left=right，结束） |

**`i = 1`，`nums[1] = -1`，`left = 2`，`right = 3`**：

| sub 计算 | sub | |abs(sub)| 与 min_sub | 动作 |
|----------|-----|----------------|--------|------|
| 1-(-1)-1-2 | -1 | 1 < 4 → 更新 result=2，min_sub=1 | sub<0 → right--（left=right，结束） |

**`i = 2`，`left = 3`，`left == right`，结束循环。**

**结果**：`result = 2`。正确。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力（三重循环） | O(n³) | O(1) | 超时 |
| 排序 + 双指针 | O(n²) | O(1) | 排序 O(n log n) 被 O(n²) 主导 |

---

## 易错点总结

1. **双指针移动方向**：`sub > 0` 表示和偏小要 `left++`，`sub < 0` 表示和偏大要 `right--`。方向弄反会漏解。
2. **外层循环边界**：固定第一个数时最多到 `len(nums) - 2`，要留给 `left`、`right` 两个位置。
3. **用 `±inf` 初始化**：`min_sub = float('inf')` 让第一次比较必然更新，避免单独处理 `result is None`。
4. **恰好命中提前返回**：`sub == 0` 时差值为 0 是最优解，应直接返回，无需继续。

---

## 扩展思考

- **三数之和（LeetCode 15）**：要求返回所有和为 0 的三元组，多一个去重逻辑，双指针思路一致。
- **最接近的三数之和** 可推广到"最接近目标值的 k 个数之和"，外层多套几层固定即可。
- 双指针之所以 O(n)，是因为有序数组下 `left` 只右移、`right` 只左移，两者合计移动不超过 n 步。

---

## 相关题目

- [15. 三数之和](0015_3sum.md)