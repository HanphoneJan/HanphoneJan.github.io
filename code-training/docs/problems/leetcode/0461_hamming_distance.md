---
title: 汉明距离
platform: LeetCode
difficulty: Easy
id: 461
url: https://leetcode.cn/problems/hamming-distance/
tags:
  - 位运算
date_added: 2026-04-24
---

# 461. 汉明距离

## 题目描述

两个整数之间的 [汉明距离](https://baike.baidu.com/item/%E6%B1%89%E6%98%8E%E8%B7%9D%E7%A6%BB/475174?fr=aladdin) 指的是这两个数字对应二进制位不同的位置的数目。

给你两个整数 `x` 和 `y`，计算并返回它们之间的汉明距离。

## 示例

**示例 1：**
```
输入：x = 1, y = 4
输出：2
解释：
1   (0 0 0 1)
4   (0 1 0 0)
       ↑   ↑
```

**示例 2：**
```
输入：x = 3, y = 1
输出：1
```

---

## 解题思路

### 第一步：理解问题本质

汉明距离 = 两个数二进制表示中不同位的个数。关键问题是：**如何高效统计不同的位？**

### 第二步：异或运算

`x ^ y` 的结果中，为 `1` 的位就是 `x` 和 `y` 不同的位。

### 第三步：统计 1 的个数

有三种方法：
1. **内置函数**：`bin(x ^ y).count('1')`
2. **逐位检查**：循环检查最低位，右移
3. **Brian Kernighan 算法**：每次清除最低位的 `1`

---

## 完整代码实现

```python
class Solution:
    """
    汉明距离 - 位运算

    方法1：内置函数，最简洁
    方法2：逐位检查
    方法3：Brian Kernighan算法，只循环1的个数次

    时间复杂度：O(1)（整数位数固定）
    空间复杂度：O(1)
    """

    def hammingDistance(self, x: int, y: int) -> int:
        return bin(x ^ y).count('1')

    def hammingDistance2(self, x: int, y: int) -> int:
        xor = x ^ y
        distance = 0
        while xor:
            distance += xor & 1
            xor >>= 1
        return distance

    def hammingDistance3(self, x: int, y: int) -> int:
        xor = x ^ y
        distance = 0
        while xor:
            xor &= xor - 1  # 清除最低位的1
            distance += 1
        return distance
```

---

## 示例推演

以 `x = 1, y = 4` 为例：

```
x = 1 = 0b0001
y = 4 = 0b0100
xor = 0b0101 = 5
```

**方法1**：`bin(5) = '0b101'`，`count('1') = 2`

**方法2**：
- xor=5(101): 最低位=1, distance=1, xor>>=1 = 2(10)
- xor=2(10): 最低位=0, distance=1, xor>>=1 = 1(1)
- xor=1(1): 最低位=1, distance=2, xor>>=1 = 0

**方法3**：
- xor=5(101): xor & 4 = 4(100), distance=1
- xor=4(100): xor & 3 = 0, distance=2

答案：**2**

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 内置函数 | O(1) | O(1) | 最简洁 |
| 逐位检查 | O(1) | O(1) | 循环32次 |
| **Brian Kernighan** | **O(1)** | **O(1)** | 只循环1的个数次 |

---

## 易错点总结

### 1. Brian Kernighan 算法的原理

`xor &= xor - 1` 会将 `xor` 最低位的 `1` 变为 `0`。例如：
- `101 & 100 = 100`
- `100 & 011 = 000`

---

## 相关题目

- [191. 位1的个数](https://leetcode.cn/problems/number-of-1-bits/)
- [338. 比特位计数](https://leetcode.cn/problems/counting-bits/)
- [477. 汉明距离总和](https://leetcode.cn/problems/total-hamming-distance/)
