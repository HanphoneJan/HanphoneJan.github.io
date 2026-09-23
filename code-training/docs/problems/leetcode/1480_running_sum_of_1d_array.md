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

	- `1

---

## 解题思路

> 待补充:由 AI 在后续处理中生成

### 第一步：理解问题本质

### 第二步：暴力解法

### 第三步：优化解法

### 第四步：最优解法

---

## 完整代码实现

```python
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        n = len(nums)
        runningSum = [None]*n
        if n==0:
            return runningSum
        runningSum[0] = nums[0]
        if n==1:
            return runningSum
        for i in range(1,n):
            runningSum[i] = runningSum[i-1]+nums[i]
        return runningSum
```

---

## 示例推演

> 待补充

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 暴力 | | | 待补充 |
| 优化 | | | 待补充 |
| 最优 | | | 待补充 |

---

## 易错点总结

> 待补充

---

## 扩展思考

> 待补充

---

## 相关题目

> 待补充
