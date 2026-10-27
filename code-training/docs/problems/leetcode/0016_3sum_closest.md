---
title: 16. 最接近的三数之和
platform: LeetCode
difficulty: Medium
id: 16
url: https://leetcode.cn/problems/3sum-closest/
tags:
  - 数组
  - 双指针
  - 排序
topics: []
patterns:
  - ../../patterns/sorting.md
  - ../../patterns/two_pointers.md
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

### 方法一：双指针（对比）

三层循环枚举所有三元组，计算与 `target` 的差值取最小。O(n³)，超时。

### 方法二：（排序 + 双指针）

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
        # 排序后才有「left 右移变大、right 左移变小」的单调性
        nums.sort()
        # result 暂存当前最接近的和；min_sub 用无穷大起手，保证第一组必然更新它
        result = None
        min_sub = float('inf')
        # 固定第一个数，后面还要留两个位置，所以枚举到倒数第三个即可
        for i in range(len(nums) - 2):
            # 双指针在 i 右侧的区间里夹逼
            left, right = i + 1, len(nums) - 1
            # 两指针相遇说明以 i 为固定项的组合已全部试过
            while left < right:
                # sub 是「目标值与当前三数和的差」：正数表示和偏小，负数表示和偏大
                sub = target - nums[i] - nums[left] - nums[right]
                if sub == 0:
                    # 差值 0 已是最优，不可能再有更近的和，直接返回
                    return nums[i] + nums[left] + nums[right]
                # 只有差值绝对值更小时才更新，避免把更差的解放进来
                if abs(sub) < min_sub:
                    min_sub = abs(sub)
                    result = nums[i] + nums[left] + nums[right]
                if sub > 0:
                    # 和偏小：把左指针右移，换一个更大的数
                    left += 1
                else:
                    # 和偏大：把右指针左移，换一个更小的数
                    right -= 1
        # 循环至少执行过一次，result 一定已被赋值
        return result
```

---

## 示例推演

以 `nums = [-1, 2, 1, -4], target = 1` 为例，期望输出 `2`。

**排序后**：`[-4, -1, 1, 2]`。

**`i = 0`，`nums[0] = -4`，`left = 1`，`right = 3`**：

| sub 计算 | sub | abs(sub) 与 min_sub | 动作 |
|----------|-----|---------------------|------|
| 1-(-4)-(-1)-2 | 4 | 4 < inf → 更新 result=-1，min_sub=4 | sub>0 → left++ |
| 1-(-4)-(-1)-1 | 5 | 5 > 4 不更新 | sub>0 → left++（left=right，结束） |

**`i = 1`，`nums[1] = -1`，`left = 2`，`right = 3`**：

| sub 计算 | sub | abs(sub) 与 min_sub | 动作 |
|----------|-----|---------------------|------|
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

1. **双指针移动方向**：`sub > 0` 要 `left++`、`sub < 0` 要 `right--`，写反会朝错误方向收缩并漏解。
2. **外层循环边界**：固定第一个数最多到 `len(nums) - 2`，写到 `len(nums) - 1` 时 `left`、`right` 越界。
3. **比较 `min_sub` 要用 `abs(sub)`**：忘了取绝对值，`min_sub` 只会记住最大差值，`result` 停在错误的数上。

## 扩展思考

- **三数之和（LeetCode 15）**：要求返回所有和为 0 的三元组，多一个去重逻辑，双指针思路一致。
- **最接近的三数之和** 可推广到"最接近目标值的 k 个数之和"，外层多套几层固定即可。
- 双指针之所以 O(n)，是因为有序数组下 `left` 只右移、`right` 只左移，两者合计移动不超过 n 步。

---

## 相关题目

- [15. 三数之和](0015_3sum.md)