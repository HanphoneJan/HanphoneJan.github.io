---
title: 比特位计数
platform: LeetCode
difficulty: Easy
id: 338
url: https://leetcode.cn/problems/counting-bits/
tags:
  - 位运算
  - 动态规划
date_added: 2026-04-24
---

# 338. 比特位计数

## 题目描述

给你一个整数 `n`，对于 `0 <= i <= n` 中的每个 `i`，计算其二进制表示中 `1` 的个数 ，返回一个长度为 `n + 1` 的数组 `ans` 作为答案。

## 示例

**示例 1：**
```
输入：n = 2
输出：[0,1,1]
解释：
0 --> 0
1 --> 1
2 --> 10
```

**示例 2：**
```
输入：n = 5
输出：[0,1,1,2,1,2]
解释：
0 --> 0
1 --> 1
2 --> 10
3 --> 11
4 --> 100
5 --> 101
```

---

## 解题思路

### 第一步：理解问题本质

需要计算 `0` 到 `n` 每个数的二进制中 `1` 的个数。关键问题是：**如何利用已计算的结果来推导新的结果？**

### 第二步：暴力解法

对每个数，逐位检查是否为 `1`。

```python
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = []
        for i in range(n + 1):
            count = 0
            x = i
            while x:
                count += x & 1
                x >>= 1
            ans.append(count)
        return ans
```

**为什么不够好**：时间复杂度 O(n log n)。

### 第三步：动态规划（最高有效位）

**核心洞察**：
- 任何正整数 `i` 都可以表示为 `highBit + (i - highBit)`，其中 `highBit` 是小于等于 `i` 的最大 2 的幂
- `bits[i] = bits[i - highBit] + 1`

**为什么**：`highBit` 只有最高位是 `1`，所以 `i` 比 `(i - highBit)` 多一个 `1`。

### 第四步：动态规划（最低有效位）

**核心洞察**：`i & (i - 1)` 清除 `i` 的最低位的 `1`。

```
bits[i] = bits[i & (i - 1)] + 1
```

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    比特位计数 - 动态规划（最高有效位）

    bits[i] = bits[i - highBit] + 1
    highBit 是小于等于 i 的最大 2 的幂

    时间复杂度：O(n)
    空间复杂度：O(1)（不计输出空间）
    """

    def countBits(self, n: int) -> List[int]:
        bits = [0]
        highBit = 0
        for i in range(1, n + 1):
            # i & (i - 1) == 0 判断 i 是否是 2 的幂
            if i & (i - 1) == 0:
                highBit = i
            bits.append(bits[i - highBit] + 1)
        return bits


# 方法二：最低有效位
class Solution2:
    def countBits(self, n: int) -> List[int]:
        bits = [0] * (n + 1)
        for i in range(1, n + 1):
            bits[i] = bits[i & (i - 1)] + 1
        return bits


# 方法三：右移
class Solution3:
    def countBits(self, n: int) -> List[int]:
        bits = [0] * (n + 1)
        for i in range(1, n + 1):
            bits[i] = bits[i >> 1] + (i & 1)
        return bits
```

---

## 示例推演

以 `n = 5` 为例：

| i | 二进制 | i & (i-1) == 0? | highBit | i - highBit | bits[i - highBit] | bits[i] |
|---|--------|-----------------|---------|-------------|-------------------|---------|
| 0 | 0 | - | 0 | 0 | 0 | 0 |
| 1 | 1 | 是 | 1 | 0 | 0 | 1 |
| 2 | 10 | 是 | 2 | 0 | 0 | 1 |
| 3 | 11 | 否 | 2 | 1 | 1 | 2 |
| 4 | 100 | 是 | 4 | 0 | 0 | 1 |
| 5 | 101 | 否 | 4 | 1 | 1 | 2 |

结果：`[0, 1, 1, 2, 1, 2]`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力 | O(n log n) | O(1) | 逐位检查 |
| **DP（最优）** | **O(n)** | **O(1)** | 利用已计算结果 |

---

## 易错点总结

### 1. i & (i - 1) == 0 的含义

这是判断 `i` 是否为 2 的幂的经典位运算技巧。2 的幂只有一位是 `1`，减 `1` 后低位全变 `1`，与操作结果为 `0`。

### 2. 为什么加 1

`bits[i] = bits[i - highBit] + 1`，因为 `i` 比 `i - highBit` 多了一个最高位的 `1`。

---

## 相关题目

- [191. 位1的个数](https://leetcode.cn/problems/number-of-1-bits/)
- [461. 汉明距离](https://leetcode.cn/problems/hamming-distance/)
