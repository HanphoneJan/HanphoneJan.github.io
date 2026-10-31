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

### 输出是什么：一个「和」，比较尺度是绝对差

这题不返回三元组，只返回一个和，判定标准是 `|sum - target|` 最小 —— `sum` 比 `target` 大还是小都无所谓，只有绝对差重要。这一点直接决定了两件事：

1. **不需要去重**。15 题（三数之和）要返回所有不重复的三元组，那种题才需要跳过相同的数；这题只找一个和，重复元素最多带来相同的候选值。
2. **不需要处理并列**。题目保证恰好一个解，所以不会出现「两个不同的和三离 `target` 一样近、要选哪个」的情况。

### 方法一：枚举所有三元组

最直白的做法：把 `C(n, 3)` 个组合全部算一遍，记录绝对差最小的那个和。

```python
from itertools import combinations

class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        best = float('inf')
        ans = 0
        for a, b, c in combinations(nums, 3):
            s = a + b + c
            if abs(s - target) < best:
                best = abs(s - target)
                ans = s
        return ans
```

`n = 500` 时组合数约 `2.1 × 10^7`，每组都要做一次三元组解包和两次加法，Python 里要跑十几秒，**会超时**。它仍值得写出来，因为它把判定标准写得没有任何歧义：后面所有优化的目标都只是「少算一些组合」，比较方式一个字都不用改。

### 方法二：排序 + 双指针

固定第一个数 `nums[i]`，问题就退化成「在 `nums[i+1:]` 里选两个数，使它们的和最接近 `target - nums[i]`」，也就是「两数之和最接近目标」，经典的双指针。

双指针能成立，靠的是排序后的单调性。设 `left < right`：

- `nums[left]` 变大，`nums[left] + nums[right]` 就变大；
- `nums[right]` 变小，两个数的和就变小。

于是把 `left` 放在 `i+1`、`right` 放在末尾，看当前三个数的和 `s`：

- `s` 比 `target` 小 → 只有把 `left` 右移才可能更接近（`right` 再左移只会让和更小，离 `target` 更远）；
- `s` 比 `target` 大 → 只有把 `right` 左移才可能更接近；
- 正好相等 → 绝对差为 0，不可能更优，直接返回。

每一步都在丢掉一个「不可能产生更优解」的端点，所以 `left` 与 `right` 相向而行、总移动次数不超过区间长度，内层是 `O(n)`。

```python
class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        nums.sort()
        best = float('inf')                       # 当前的最小绝对差
        ans = 0                                   # 对应的三数之和
        for i in range(len(nums) - 2):            # 后面至少留两个位置
            left, right = i + 1, len(nums) - 1
            while left < right:
                s = nums[i] + nums[left] + nums[right]
                if abs(s - target) < best:
                    best = abs(s - target)
                    ans = s
                if s == target:
                    return s                      # 绝对差 0，已是最优
                if s < target:
                    left += 1                     # 和偏小，换一个更大的左端
                else:
                    right -= 1                    # 和偏大，换一个更小的右端
        return ans
```

`i` 的循环上界是 `len(nums) - 2`：`i` 之后必须还剩两个数，双指针才有落脚点。

### 方法三：固定两个数，第三个数用二分找

同一个「固定一部分、求剩下部分的最接近值」的思路，也可以换一种求解方式：固定 `i` 与 `j`，第三个数的理想值是 `need = target - nums[i] - nums[j]`，在有序的 `nums[j+1:]` 里二分出离 `need` 最近的位置。

```python
from bisect import bisect_left

class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        nums.sort()
        n = len(nums)
        best = float('inf')
        ans = 0
        for i in range(n - 2):
            for j in range(i + 1, n - 1):
                need = target - nums[i] - nums[j]
                k = bisect_left(nums, need, j + 1)      # 第一个 >= need 的位置
                for t in (k - 1, k):                    # 左右各取一个候选
                    if j < t < n:
                        s = nums[i] + nums[j] + nums[t]
                        if abs(s - target) < best:
                            best, ans = abs(s - target), s
        return ans
```

有序数组里离 `need` 最近的值，只可能是 `bisect_left` 落点的两侧各一个，所以 `t` 只试 `k-1` 与 `k` 就够，不用把右边整段扫一遍。复杂度 `O(n² log n)`：比双指针多一个 `log`，但少了一层「指针该往哪边动」的推理，适合先确认「固定在哪儿、找什么」再动手写。

### 三种写法怎么选

| 写法 | 一次能砍掉多少 | 适合的场景 |
|---|---|---|
| 三重循环 | 一个都不砍，`C(n,3)` 组全算 | 只用来对齐判定标准，`n = 500` 会超时 |
| 排序 + 二分 | 固定两个数后，第三个数用 `O(log n)` 找 | 想复用 `bisect`，或把问题看成「最接近查找」 |
| 排序 + 双指针 | 每步丢掉一个端点，内层 `O(n)` | 默认答案，常数最小 |

双指针不是「比二分更好」的绝对结论：两者都是「固定一部分 + 求剩余部分的最接近值」，区别只在剩余部分用线性扫描还是二分。双指针赢在常数（一次加法、一次比较），二分赢在不用维护指针不变式。

## 完整代码实现

下面这段是本题的基准实现（页面上的「跑样例」与逐帧可视化回放的也是它）。它与方法二思路相同，只是用 `sub = target - 当前和` 来表达差值：`sub > 0` 表示和偏小，`sub < 0` 表示和偏大。

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

`result` 用 `None` 起手、`min_sub` 用 `inf` 起手，是为了让第一次比较必然生效：任何 `abs(sub)` 都小于 `inf`。题目保证 `n >= 3`，循环至少执行一次，所以返回时 `result` 一定已被赋值。

## 示例推演

### 示例 1：`nums = [-1,2,1,-4]`，`target = 1`

排序后 `nums = [-4,-1,1,2]`。初始化 `best = inf`、`ans = 0`。

**`i = 0`，`nums[0] = -4`，`left = 1`，`right = 3`：**

| 轮次 | `left` | `right` | 三数和 `s` | 绝对差 | 与 `best` 比较 | 动作 |
|---|---|---|---|---|---|---|
| 1 | 1（`-1`） | 3（`2`） | `-4 + (-1) + 2 = -3` | 4 | 4 < inf，`ans = -3`、`best = 4` | `s < 1`，`left = 2` |
| 2 | 2（`1`） | 3（`2`） | `-4 + 1 + 2 = -1` | 2 | 2 < 4，`ans = -1`、`best = 2` | `s < 1`，`left = 3` |

`left = 3 = right`，内层结束。

**`i = 1`，`nums[1] = -1`，`left = 2`，`right = 3`：**

| 轮次 | `left` | `right` | 三数和 `s` | 绝对差 | 与 `best` 比较 | 动作 |
|---|---|---|---|---|---|---|
| 1 | 2（`1`） | 3（`2`） | `-1 + 1 + 2 = 2` | 1 | 1 < 2，`ans = 2`、`best = 1` | `s > 1`，`right = 2` |

`left = 2 = right`，内层结束。

**`i = 2`**：`left = 3`、`right = 3`，`left < right` 不成立，不进内层。

循环结束，返回 `ans = 2`。与示例一致：`-1 + 2 + 1 = 2`，与 `target = 1` 相差 1。

### 示例 2：`nums = [0,0,0]`，`target = 1`

排序后仍是 `[0,0,0]`。`i = 0`，`left = 1`，`right = 2`：`s = 0`，`|0 - 1| = 1 < inf`，于是 `ans = 0`、`best = 1`；`s < 1`，`left` 变成 2，内层结束。`i = 1` 时 `left = 2 = right`，不进内层。返回 `0`。

### 一个能看出「为什么必须取绝对值」的例子：`nums = [1,2,3,4]`，`target = 1`

- `i = 0`：`left = 1`、`right = 3`，`s = 1 + 2 + 4 = 7`，`|7 - 1| = 6`，`ans = 7`、`best = 6`；`s > 1`，`right = 2`；再算 `s = 1 + 2 + 3 = 6`，`|6 - 1| = 5`，`ans = 6`、`best = 5`；`s > 1`，`right = 1`，内层结束。
- `i = 1`：`left = 2`、`right = 3`，`s = 2 + 3 + 4 = 9`，`|9 - 1| = 8 > 5`，不更新。

返回 `6`，也就是 `1 + 2 + 3`，正确。如果更新时只比较 `sub = target - s` 而不取绝对值，第三次的 `sub = -8` 会比 `-5` 更「小」，`ans` 就被改写成 `9` 了。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 三重循环 | O(n³) | O(1) | `n = 500` 时约 `2×10^7` 组，Python 超时 |
| 排序 + 二分 | O(n² log n) | O(1) | 每组 `(i, j)` 二分一次最接近的第三数 |
| 排序 + 双指针（最优） | O(n²) | O(1) | 排序的 `O(n log n)` 被 `O(n²)` 主导 |

## 易错点总结

1. **更新时比较 `sub` 而不是 `abs(sub)`**：`sub = target - s` 有正有负，直接比大小只会记住最「负」的那个，也就是三数和最大的组合。`nums = [1,2,3,4]`、`target = 1` 时 `sub` 依次是 `-6`、`-5`、`-8`，第三次的 `-8 < -5` 成立，`result` 被改写成 `9`，而正确答案是 `6`。
2. **`sub > 0` 时移动了 `right`**：`sub > 0` 说明和偏小，要换更大的数，只能右移 `left`。方向写反后，指针会朝「已经更差」的一侧收缩。`nums = [0,2,5,9]`、`target = 6` 时，`i = 0` 的两轮都在右移 `left`（`0+2+9 = 11`、`0+5+9 = 14`），把 `0+2+5 = 7` 这个正确答案跳了过去，最终返回 `11`（差 5）。
3. **忘记 `nums.sort()`**：双指针的单调性来自有序，未排序时「左端右移、和一定变大」不成立，指针会朝错误方向收。拿示例 1 的原始顺序 `[-1,2,1,-4]` 直接跑，`i = 0` 会算出 `-1+2-4 = -3` 并认定「和偏小」继续右移 `left`，最终返回 `-1`，而正确答案是 `2`。

---

## 相关题目

- [15. 三数之和](0015_3sum.md)