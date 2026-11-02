---
title: 1480. 一维数组的动态和
platform: LeetCode
difficulty: Easy
id: 1480
url: https://leetcode.cn/problems/running-sum-of-1d-array/
tags:
  - 数组
  - 前缀和
topics: []
patterns: []
date_added: 2026-09-23
date_reviewed: []
---

# 1480. 一维数组的动态和

## 题目描述

给你一个数组 `nums`，返回它的动态和。动态和定义为 `runningSum[i] = nums[0] + nums[1] + ... + nums[i]`。

## 示例

### 示例 1

**输入：** nums = [1,2,3,4]
**输出：** [1,3,6,10]
**解释：** 动态和依次是 `1`、`1+2`、`1+2+3`、`1+2+3+4`。

### 示例 2

**输入：** nums = [1,1,1,1,1]
**输出：** [1,2,3,4,5]

### 示例 3

**输入：** nums = [3,1,2,10,1]
**输出：** [3,4,6,16,17]

## 解题思路

### 路线：相邻两项只差一个元素

`runningSum[i]` 是从头加到 `nums[i]`，`runningSum[i-1]` 是从头加到 `nums[i-1]`。两者放在一起看，后一项只比前一项多一个 `nums[i]`：

$$
\text{runningSum}[i] = \text{runningSum}[i-1] + \text{nums}[i]
$$

所以整道题不需要每个位置重新求和，把上一个结果带着走一遍即可。这就是递推的全部内容。

### 手法：带着「到目前为止的和」走一遍

开一个与输入等长的结果数组，第 0 位直接落 `nums[0]`，之后每一位接上前一位：

```python
running = [0] * n
running[0] = nums[0]
for i in range(1, n):
    running[i] = running[i - 1] + nums[i]
```

循环从 `1` 开始，因为 `running[0]` 在循环前已经写好；再走一遍下标 0 会把 `nums[0]` 的起点冲掉（初始化成 `[None] * n` 时则是 `None + int` 直接报错）。

### 另一条写法：直接累加回输入数组

既然 `running[i]` 只依赖 `running[i-1]`，也可以把和写回 `nums` 自己：

```python
for i in range(1, len(nums)):
    nums[i] += nums[i - 1]
return nums
```

空间降到 `O(1)`，代价是**输入被改写**：调用结束后 `nums` 已经变成动态和，调用方若还要用原数组就会拿到错的数据。题目只要求返回结果，这种写法可以提交；但如果函数会被复用在别处，就要用上面那版另开数组。

### 推演：`nums = [1,2,3,4]`

| `i` | `nums[i]` | 前一项 `running[i-1]` | `running[i]` |
| --- | --- | --- | --- |
| 0 | 1 | —（直接落位） | 1 |
| 1 | 2 | 1 | 3 |
| 2 | 3 | 3 | 6 |
| 3 | 4 | 6 | 10 |

返回 `[1,3,6,10]`。示例 3 同理：`3 → 3+1=4 → 4+2=6 → 6+10=16 → 16+1=17`。

## 完整代码实现

```python
from typing import List


class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        n = len(nums)
        if n == 0:
            return []

        running = [0] * n
        running[0] = nums[0]          # 第 0 位没有前一项
        for i in range(1, n):
            running[i] = running[i - 1] + nums[i]
        return running
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 每个位置重新累加 | O(n²) | O(n) | 第 i 位要把前 i 个数再加一遍 |
| 另开结果数组递推（最优） | O(n) | O(n) | 一次遍历；空间是题目要求返回的数组本身 |
| 原地累加回 `nums` | O(n) | O(1) | 省掉结果数组，但会改写输入 |

## 易错点总结

### 1. 结果数组用 `[None] * n`，却从 `i = 0` 开始递推

`running[0]` 已经落好 `nums[0]`，循环若仍从 0 开始，`running[i-1]` 在 `i = 0` 时是 `running[-1]`，也就是数组最后一格。初始化成 `[None] * n` 时这一格是 `None`，`None + int` 立刻抛 `TypeError`；初始化成 `[0] * n` 时它恰好是 0，结果碰巧对，错误被藏起来。循环起点必须是 1。

### 2. 原地版本忘了它会改写输入

`nums[i] += nums[i-1]` 跑完后，`nums` 本身就是答案，不再是原数组。示例 1 调用一次后 `nums` 从 `[1,2,3,4]` 变成 `[1,3,6,10]`；同一份数据再传给别的函数，拿到的就是动态和。这不是算法错误，而是接口副作用，选择原地写法时要在注释里写明。

## 扩展思考

- **前缀和**：`running` 就是前缀和数组。多开一位 `pre[0] = 0` 后，任意区间 `[l, r]` 的和是 `pre[r+1] - pre[l]`，不必特判 `l = 0`。
- **差分数组**：前缀和的逆运算。区间统一加 `v` 只需 `diff[l] += v`、`diff[r+1] -= v`，最后做一次前缀和还原。

## 相关题目

- [303. 区域和检索 - 数组不可变](https://leetcode.cn/problems/range-sum-query-immutable/)
- [560. 和为 K 的子数组](0560_subarray_sum_equals_k.md)
- [724. 寻找数组的中心下标](https://leetcode.cn/problems/find-pivot-index/)
