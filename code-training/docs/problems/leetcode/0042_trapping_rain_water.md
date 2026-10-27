---
title: 42. 接雨水
platform: LeetCode
difficulty: Hard
id: 42
url: https://leetcode.cn/problems/trapping-rain-water/
tags:
  - 数组
  - 双指针
  - 动态规划
  - 单调栈
  - 栈
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
  - ../../patterns/two_pointers.md
date_added: 2026-03-20
date_reviewed: []
---

# 42. 接雨水

## 题目描述

给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**示例 1：**
```
输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出：6
```

**示例 2：**
```
输入：height = [4,2,0,3,2,5]
输出：9
```

**提示：**
- `n == height.length`
- `1 <= n <= 2 * 10^4`
- `0 <= height[i] <= 10^5`

---

## 解题思路

### 第一步：理解问题本质

接雨水问题的核心在于：**某个位置能接多少水，取决于它左边最高的柱子和右边最高的柱子**。

具体来说，对于下标 `i` 的位置：
- 设左侧最大高度为 `left_max`，右侧最大高度为 `right_max`
- 该位置能"蓄住"水的高度上限是 `min(left_max, right_max)`（木桶效应，取决于较矮的那侧）
- 减去柱子本身的高度 `height[i]`，就是该位置实际存水量

$$\text{water}[i] = \max(0,\ \min(\text{left\_max}[i],\ \text{right\_max}[i]) - \text{height}[i])$$

把每个位置的存水量加起来，就是总存水量。

---

### 方法一：逐列计算（按位置统计）

**思路**：对每个下标 `i`，分别向左和向右找出最大值 `left_max` 和 `right_max`，按公式 `water[i] = max(0, min(left_max, right_max) - height[i])` 计算并累加。

```python
class Solution:
    def trap(self, height: List[int]) -> int:
        n = len(height)
        ans = 0
        for i in range(n):
            left_max = max(height[:i + 1])
            right_max = max(height[i:])
            ans += min(left_max, right_max) - height[i]
        return ans
```

**说明**：思路直观，但每个位置都要扫描左右两侧，时间复杂度 O(n²)，空间复杂度 O(1)。

### 方法二：前缀最大值 + 后缀最大值（推荐）

方法一的瓶颈是"重复求最大值"。可以提前用两次遍历，把每个位置的左侧最大值和右侧最大值全部算好，存到两个数组里。

```python
class Solution:
    def trap(self, height: List[int]) -> int:
        n = len(height)
        pre_max = [0] * n   # pre_max[i] = height[0..i] 的最大值
        suf_max = [0] * n   # suf_max[i] = height[i..n-1] 的最大值

        # 从左到右，计算每个位置的前缀最大值
        pre_max[0] = height[0]
        for i in range(1, n):
            # 前一位的最大值已经算好，只需与当前柱子比一次
            pre_max[i] = max(pre_max[i-1], height[i])

        # 从右到左，计算每个位置的后缀最大值
        suf_max[n-1] = height[n-1]
        for i in range(n-2, -1, -1):
            # 方向相反，递推关系与左侧完全对称
            suf_max[i] = max(suf_max[i+1], height[i])

        # 计算每个位置的存水量
        ans = 0
        for i in range(n):
            # 较矮的那面墙决定水位，再减去柱子自身高度
            ans += min(pre_max[i], suf_max[i]) - height[i]
        return ans
```

- 时间复杂度：O(n)
- 空间复杂度：O(n)

### 方法三：双指针（空间 O(1)）

**核心洞察**：不需要提前把所有位置的左右最大值全部算出来，只需要在移动过程中实时维护"当前已知的左侧最大值"和"当前已知的右侧最大值"。

设两个指针 `left` 和 `right` 分别从左右两端向中间移动，同时维护：
- `pre_max`：`left` 指针走过的所有位置中的最大高度（左侧墙）
- `suf_max`：`right` 指针走过的所有位置中的最大高度（右侧墙）

**关键判断**：当 `pre_max < suf_max` 时，可以安全地计算 `left` 位置的存水量。

为什么？因为 `left` 位置的真实右侧最大值一定 `>= suf_max`（右指针还没走到的部分可能更高），而 `suf_max > pre_max`，所以真实右侧最大值也一定大于 `pre_max`。因此 `left` 位置的存水量由 `pre_max` 决定（较矮的左侧墙是瓶颈），可以直接计算：`pre_max - height[left]`。

对称地，当 `pre_max >= suf_max` 时，`right` 位置的存水量由 `suf_max` 决定，计算 `suf_max - height[right]`。

```python
class Solution:
    def trap(self, height: List[int]) -> int:
        # 三个量都从 0 起：指针还没走动，见过的最高墙自然是 0
        ans = pre_max = suf_max = 0
        left, right = 0, len(height) - 1
        # 相向收缩，每轮只处理较矮的那一侧
        while left < right:
            pre_max = max(pre_max, height[left])
            suf_max = max(suf_max, height[right])
            # 左侧墙更矮：left 处的水位已被 pre_max 唯一定下
            if pre_max < suf_max:
                ans += pre_max - height[left]
                left += 1
            else:
                # 对称地，右侧墙更矮，right 处由 suf_max 决定
                ans += suf_max - height[right]
                right -= 1
        # 两指针相遇的位置是最高处之一，水量为 0，不必再算
        return ans
```

- 时间复杂度：O(n)
- 空间复杂度：O(1)

---

## 完整代码实现

```python
from typing import List

class Solution:
    def trap(self, height: List[int]) -> int:
        ans = pre_max = suf_max = 0
        left, right = 0, len(height) - 1

        while left < right:
            # 更新左侧已走过范围的最大高度
            pre_max = max(pre_max, height[left])
            # 更新右侧已走过范围的最大高度
            suf_max = max(suf_max, height[right])

            if pre_max < suf_max:
                # 左侧是瓶颈，left 处的积水量由 pre_max 决定
                ans += pre_max - height[left]
                left += 1
            else:
                # 右侧是瓶颈，right 处的积水量由 suf_max 决定
                ans += suf_max - height[right]
                right -= 1

        return ans
```

---

## 示例推演

以 `height = [4, 2, 0, 3, 2, 5]` 为例，逐步展示双指针的执行过程。

初始状态：
- `left = 0`，`right = 5`
- `pre_max = 0`，`suf_max = 0`
- `ans = 0`

---

**第 1 轮：left=0, right=5**

- 更新：`pre_max = max(0, height[0]) = max(0, 4) = 4`
- 更新：`suf_max = max(0, height[5]) = max(0, 5) = 5`
- 判断：`pre_max(4) < suf_max(5)`，左侧是瓶颈
- 计算 left=0 处积水：`4 - height[0] = 4 - 4 = 0`（柱子本身高度等于左侧最大，无积水）
- `ans = 0`，`left` 移动到 1

---

**第 2 轮：left=1, right=5**

- 更新：`pre_max = max(4, height[1]) = max(4, 2) = 4`
- 更新：`suf_max = max(5, height[5]) = max(5, 5) = 5`
- 判断：`pre_max(4) < suf_max(5)`，左侧是瓶颈
- 计算 left=1 处积水：`4 - height[1] = 4 - 2 = 2`
- `ans = 2`，`left` 移动到 2

---

**第 3 轮：left=2, right=5**

- 更新：`pre_max = max(4, height[2]) = max(4, 0) = 4`
- 更新：`suf_max = max(5, height[5]) = max(5, 5) = 5`
- 判断：`pre_max(4) < suf_max(5)`，左侧是瓶颈
- 计算 left=2 处积水：`4 - height[2] = 4 - 0 = 4`
- `ans = 6`，`left` 移动到 3

---

**第 4 轮：left=3, right=5**

- 更新：`pre_max = max(4, height[3]) = max(4, 3) = 4`
- 更新：`suf_max = max(5, height[5]) = max(5, 5) = 5`
- 判断：`pre_max(4) < suf_max(5)`，左侧是瓶颈
- 计算 left=3 处积水：`4 - height[3] = 4 - 3 = 1`
- `ans = 7`，`left` 移动到 4

---

**第 5 轮：left=4, right=5**

- 更新：`pre_max = max(4, height[4]) = max(4, 2) = 4`
- 更新：`suf_max = max(5, height[5]) = max(5, 5) = 5`
- 判断：`pre_max(4) < suf_max(5)`，左侧是瓶颈
- 计算 left=4 处积水：`4 - height[4] = 4 - 2 = 2`
- `ans = 9`，`left` 移动到 5

---

**第 6 轮：left=5 == right=5，循环结束**

最终 `ans = 9`，与预期输出一致。

**各位置积水量汇总**：

| 下标 | 高度 | 左侧最大 | 右侧最大 | min | 积水量 |
|------|------|---------|---------|-----|--------|
| 0    | 4    | 4       | 5       | 4   | 0      |
| 1    | 2    | 4       | 5       | 4   | 2      |
| 2    | 0    | 4       | 5       | 4   | 4      |
| 3    | 3    | 4       | 5       | 4   | 1      |
| 4    | 2    | 4       | 5       | 4   | 2      |
| 5    | 5    | 5       | 5       | 5   | 0      |

总积水量 = 0 + 2 + 4 + 1 + 2 + 0 = **9**

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐列计算 | O(n²) | O(1) | 每个位置都重新扫描左右两侧 |
| 前缀最大值 + 后缀最大值 | O(n) | O(n) | 预处理左右最大值 |
| 双指针（推荐） | O(n) | O(1) | 实时维护左右最大值 |

---

## 易错点总结

1. **`pre_max` / `suf_max` 要先更新再算水量**：顺序颠倒会漏掉当前列自己作为边界的贡献，答案偏小。
2. **`ans` 加的是本侧瓶颈**：`if pre_max < suf_max` 分支里必须加 `pre_max - height[left]`，写成 `suf_max - height[left]` 会算出偏大的水量。
3. **移动的是较矮的一侧**：移动较高的一侧会让「另一侧一定还有更高柱子」的推断失效，答案偏小。

## 扩展思考

**相关题目**：
- LeetCode 11：盛最多水的容器（同样用双指针，但不考虑中间柱子）
- LeetCode 84：柱状图中最大的矩形（单调栈经典题，与接雨水互为"镜像"问题）

**单调栈解法**：本题还有一种单调栈解法，思路是按"横向"而非"纵向"计算积水量——维护一个单调递减栈，每当遇到比栈顶更高的柱子时，弹出栈顶并计算一层横向的积水面积。时间和空间复杂度均为 O(n)，但代码略复杂，适合进一步挑战。

**算法本质**：相向双指针能成立的根本原因在于，两个指针同时向中间收缩，每次移动"较矮一侧"的指针。较矮一侧的最大值已经确定是瓶颈，不需要等另一侧的信息就能安全计算，这种"确定性"让我们可以用 O(1) 的空间替代 O(n) 的预处理数组。
