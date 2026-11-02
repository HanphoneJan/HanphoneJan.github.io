---
title: 42. 接雨水
platform: LeetCode
difficulty: Hard
id: 42
url: https://leetcode.cn/problems/trapping-rain-water/
tags:
  - 数组
  - 双指针
  - 单调栈
topics: []
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-03-27
date_reviewed: []
---

# 42. 接雨水

## 题目描述

给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**提示：**

- `n == height.length`
- `1 <= n <= 2 * 10^4`
- `0 <= height[i] <= 10^5`

## 示例

### 示例 1

**输入：** height = [0,1,0,2,1,0,1,3,2,1,2,1]

**输出：** 6

**解释：** 下标 2、4、5、6、8、9 六格各接 1 单位水，合计 6。

### 示例 2

**输入：** height = [4,2,0,3,2,5]

**输出：** 9

## 解题思路

某一列能接多少水，只看两件事：它**左边最高的柱子**和**右边最高的柱子**。水面高到两者中较矮的那个为止，所以这一列的水量是 `min(左最高, 右最高) - 自身高度`。把每列的这个值加起来就是答案。左右最高值可以预处理成两个数组，也可以用双指针边扫边维护，把空间压到 O(1)。

### 一列的水量由较矮的那侧决定

设第 `i` 列左边（含自己）最高为 `pre_max[i]`，右边（含自己）最高为 `suf_max[i]`。水往低处流，能托住水的「堤岸」高度是两者中较小的那个：

```
water[i] = min(pre_max[i], suf_max[i]) - height[i]
```

预处理两个数组后一遍求和，时间 O(n)、空间 O(n)。

### 双指针：只结算较矮的那一侧

预处理可以省掉。维护 `left`、`right` 两个指针和它们各自的「已见最高」`left_max`、`right_max`：

- 若 `height[left] < height[right]`：右指针是一路让过来的，它见过的柱子都不低于 `height[right]`，所以 `right_max > height[left]`；而 `left_max` 是在更早某次「左比右矮」时定下的，那一次右边的柱子比它高，于是 `left_max < right_max`。两者取小就是 `left_max`，`left` 这一列可以直接结算；
- 反之，`right` 侧的瓶颈是 `right_max`。

```python
while left < right:
    if height[left] < height[right]:
        left_max = max(left_max, height[left])
        ans += left_max - height[left]
        left += 1
    else:
        right_max = max(right_max, height[right])
        ans += right_max - height[right]
        right -= 1
```

`ans += ...` 加的是「当前列的水深」，两端那两列永远加 0（它们的 `left_max`/`right_max` 就是自己）。

### 推演：示例 2

`height = [4,2,0,3,2,5]`。

| 步骤 | `left, right` | 比较 | 结算 | `ans` |
| --- | --- | --- | --- | --- |
| 1 | 0, 5 | 4 < 5 | 左：`left_max=4`，加 0 | 0 |
| 2 | 1, 5 | 2 < 5 | 左：`left_max=4`，加 `4-2=2` | 2 |
| 3 | 2, 5 | 0 < 5 | 左：`left_max=4`，加 `4-0=4` | 6 |
| 4 | 3, 5 | 3 < 5 | 左：`left_max=4`，加 `4-3=1` | 7 |
| 5 | 4, 5 | 2 < 5 | 左：`left_max=4`，加 `4-2=2` | 9 |
| 6 | 5, 5 | — | 循环结束 | 9 |

整个过程中右侧一直有 5 这根高柱，左侧的最高只到 4，所以每一步都能放心地用 `left_max` 结算。

## 完整代码实现

```python
from typing import List


class Solution:
    def trap(self, height: List[int]) -> int:
        left, right = 0, len(height) - 1
        left_max = right_max = 0     # 两侧已经见过的最高柱子
        ans = 0

        while left < right:
            if height[left] < height[right]:
                # 右边一定有不低于 height[right] 的柱子，左侧瓶颈就是 left_max
                left_max = max(left_max, height[left])
                ans += left_max - height[left]
                left += 1
            else:
                right_max = max(right_max, height[right])
                ans += right_max - height[right]
                right -= 1

        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 每列向左向右各扫一遍找最高 | O(n²) | O(1) | 每个位置都重新找两侧最高 |
| 预处理前后缀最高 + 一次求和 | O(n) | O(n) | 两个数组各存 n 个值 |
| 双指针（最优） | O(n) | O(1) | 两个指针相向走到中间，只维护两个最大值 |

## 易错点总结

### 1. 移动较高的一侧

`height[left] < height[right]` 分支里移动 `left`，是因为矮的一侧瓶颈已定。反过来移动较高侧，`left_max` 就不再是真正的瓶颈了。示例 1 会得到 5（正确 6），示例 2 得到 7（正确 9）——答案偏小，而且不报错。

### 2. 先加水量再更新最大值

`ans += left_max - height[left]` 与 `left_max = max(...)` 顺序写反，当前这根柱子还没来得及成为新的边界，一旦它比旧的 `left_max` 高，减出来就是负数。示例 1 会输出 2（正确 6）。更新必须在前，结算在后。

## 扩展思考

- 还有一种单调栈写法：栈里存下标、高度递减，遇到比栈顶高的柱子就弹栈结算一段横向的水，思路是「按层算」而不是「按列算」。
- 二维版本（[407. 接雨水 II](https://leetcode.cn/problems/trapping-rain-water-ii/)）要换成「从边界开始的小根堆」，逐格向内灌水。
