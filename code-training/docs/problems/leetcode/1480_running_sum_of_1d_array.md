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

给你一个数组 `nums` 。数组「动态和」的计算公式为：`runningSum[i] = sum(nums[0]&hellip;nums[i])` 。

请返回 `nums` 的动态和。

 

**示例 1：**

**输入：**nums = [1,2,3,4]
**输出：**[1,3,6,10]
**解释：**动态和计算过程为 [1, 1+2, 1+2+3, 1+2+3+4] 。

**示例 2：**

**输入：**nums = [1,1,1,1,1]
**输出：**[1,2,3,4,5]
**解释：**动态和计算过程为 [1, 1+1, 1+1+1, 1+1+1+1, 1+1+1+1+1] 。

**示例 3：**

**输入：**nums = [3,1,2,10,1]
**输出：**[3,4,6,16,17]

 

**提示：**

	- `1 <= nums.length <= 1000`
	- `-10^6 <= nums[i] <= 10^6`

---

## 解题思路

### 第一步：理解问题本质

动态和就是把前缀一段一段加起来：

$$
\text{runningSum}[i] = nums[0] + nums[1] + \cdots + nums[i]
$$

相邻两项只差一个元素：`runningSum[i] = runningSum[i-1] + nums[i]`。
所以不需要每个位置都从头求和，把上一个结果带上即可。

### 第二步：暴力解法

**思路**：对每个下标 `i`，重新把 `nums[0..i]` 加一遍。

```python
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        res = []
        # 每个位置都从头累加一次，第 i 项要加 i+1 个数
        for i in range(len(nums)):
            total = 0
            for j in range(i + 1):
                total += nums[j]
            res.append(total)
        return res
```

**为什么不够好**：第 `i` 项把前 `i` 个数又加了一遍，前后项之间没有复用任何计算，
时间复杂度 O(n²)；而这个问题天然可以一次遍历解决。

### 第三步：优化解法 —— 原地累加

**思路**：既然 `runningSum[i]` 只依赖 `runningSum[i-1]`，就把累加结果写回 `nums` 自己。

```python
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        # 从第 2 个数开始，每个位置都加上它的前一个位置
        for i in range(1, len(nums)):
            nums[i] += nums[i - 1]
        return nums
```

**优点**：时间 O(n)，不需要额外数组。
**缺点**：改写了输入。如果调用方后面还要用原始 `nums`，这个写法就不能用。

### 第四步：最优解法 —— 一次遍历填结果数组

**核心洞察**：
- 题目要求返回一个新数组，本来就要 O(n) 的空间
- 边遍历边记下「到当前位置为止的和」，下一项直接复用
- 输入保持原样，不产生副作用

**算法步骤**：
1. 开一个与 `nums` 等长的结果数组
2. 第 0 项就是 `nums[0]`
3. 从第 1 项开始：`runningSum[i] = runningSum[i-1] + nums[i]`

---

## 完整代码实现

```python
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        n = len(nums)
        # 预先开好结果数组，长度与输入一致，稍后逐位填入
        runningSum = [None]*n
        # 空数组没有任何动态和，直接返回，避免下面访问 nums[0] 越界
        if n==0:
            return runningSum
        # 第 0 项的动态和就是它自己，同时作为递推的起点
        runningSum[0] = nums[0]
        # 只有一个元素时结果已经完整，提前收尾
        if n==1:
            return runningSum
        # 从第 1 项开始往后递推：当前项 = 前一项的动态和 + 当前元素
        for i in range(1,n):
            runningSum[i] = runningSum[i-1]+nums[i]
        return runningSum
```

---

## 示例推演

以 `nums = [1,2,3,4]` 为例：

| i | nums[i] | runningSum[i-1] | runningSum[i] |
|---|---------|-----------------|---------------|
| 0 | 1 | —（起始项） | 1 |
| 1 | 2 | 1 | 1 + 2 = 3 |
| 2 | 3 | 3 | 3 + 3 = 6 |
| 3 | 4 | 6 | 6 + 4 = 10 |

返回 `[1,3,6,10]`，与示例一致。

再以 `nums = [3,1,2,10,1]` 为例：

| i | nums[i] | runningSum[i-1] | runningSum[i] |
|---|---------|-----------------|---------------|
| 0 | 3 | —（起始项） | 3 |
| 1 | 1 | 3 | 3 + 1 = 4 |
| 2 | 2 | 4 | 4 + 2 = 6 |
| 3 | 10 | 6 | 6 + 10 = 16 |
| 4 | 1 | 16 | 16 + 1 = 17 |

返回 `[3,4,6,16,17]`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 暴力 | O(n²) | O(n) | 每个位置都从头累加，结果数组占 O(n) |
| 原地累加 | O(n) | O(1) | 复用输入数组，但会改写 `nums` |
| **递推（最优）** | **O(n)** | **O(n)** | 一次遍历，额外空间只用于返回结果 |

---

## 易错点总结

### 1. 不要每个位置都重新求和

第 `i` 项直接复用第 `i-1` 项的结果，只加一个 `nums[i]`。
写成两层循环会让复杂度退化成 O(n²)，数据量大时会超时。

### 2. 原地写法会改写输入

`nums[i] += nums[i-1]` 虽然省空间，但调用结束后 `nums` 已经变成动态和。
如果后续还要用原始数组，必须使用「结果数组」写法。

### 3. 边界情况

- `nums` 长度为 1：直接返回它自己
- `nums` 允许负数：累加和可能变小，不能假设动态和单调递增

### 4. 累加范围

`1000` 个元素、每个最大 `10^6`，总和最大约 `10^9`。
Python 的整数不会溢出；用 `int` 的其它语言也刚好放得下，但换成更大的数据范围就要改用 `long`。

---

## 扩展思考

### 1. 前缀和

动态和数组就是前缀和数组。有了它，任意区间 `[l, r]` 的和可以 O(1) 求出：

```python
# pre[i] 表示 nums[0..i-1] 的和，pre[0] = 0
pre = [0] * (len(nums) + 1)
for i, x in enumerate(nums):
    pre[i + 1] = pre[i] + x

# 区间 [l, r] 的和 = pre[r+1] - pre[l]
range_sum = pre[r + 1] - pre[l]
```

多开一位 `pre[0] = 0`，区间求和就不必特判 `l == 0`。

### 2. 差分数组

前缀和的逆运算：给区间 `[l, r]` 统一加上 `v` 时，只需 `diff[l] += v`、`diff[r+1] -= v`，
最后做一次前缀和就得到每个位置的累计变化。适合「多次区间修改、最后统一查询」的题。

### 3. 二维前缀和

矩阵中任意子矩形的和也能 O(1) 求出，思想和一维完全一致，见「相关题目」里的 304 题。

---

## 相关题目

- [303. 区域和检索 - 数组不可变](https://leetcode.cn/problems/range-sum-query-immutable/)
- [304. 二维区域和检索 - 矩阵不可变](https://leetcode.cn/problems/range-sum-query-2d-immutable/)
- [560. 和为 K 的子数组](https://leetcode.cn/problems/subarray-sum-equals-k/)
- [238. 除自身以外数组的乘积](https://leetcode.cn/problems/product-of-array-except-self/)
- [724. 寻找数组的中心下标](https://leetcode.cn/problems/find-pivot-index/)

