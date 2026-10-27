---
title: 9. 回文数
platform: LeetCode
difficulty: Easy
id: 9
url: https://leetcode.cn/problems/palindrome-number/
tags:
  - 数学
topics: []
patterns: []
date_added: 2026-03-20
date_reviewed: []
---

# 9. 回文数

## 题目描述

给你一个整数 x，如果 x 是一个回文整数，返回 true；否则，返回 false。

回文数是指正序（从左向右）和倒序（从右向左）读都是一样的整数。负数不是回文数。

**示例：**
- 输入：x = 121，输出：true
- 输入：x = -121，输出：false（负数不是回文数）
- 输入：x = 10，输出：false（正序是 10，倒序是 01，不同）

---

## 解题思路

### 问题本质

回文数是指正序和倒序读都相同的整数。负数一定不是回文数。

### 方法一：转字符串 + 双指针（推荐）

**思路**：将整数转为字符串，用双指针从两端向中间比较字符。

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        s = str(x)
        left, right = 0, len(s) - 1
        while left < right:
            if s[left] != s[right]:
                return False
            left += 1
            right -= 1
        return True
```

**说明**：实现简洁，时间 O(log n)，空间 O(log n)。

### 方法二：反转一半数字（不转字符串）

**思路**：将数字的后半部分反转，与前半部分比较。只反转一半可避免整数溢出。
- 若数字为偶数位：`x == reversed_half`
- 若数字为奇数位：`x == reversed_half // 10`（去掉中间位）

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0 or (x % 10 == 0 and x != 0):
            return False
        reversed_half = 0
        while x > reversed_half:
            reversed_half = reversed_half * 10 + x % 10
            x //= 10
        return x == reversed_half or x == reversed_half // 10
```

**说明**：时间 O(log n)，空间 O(1)，更符合进阶要求。

**为什么最后要判断两种情况：**
- 若原数字有偶数位，如 1221：反转后半段得到 12，前半段剩余 12，直接比较 `x == reversed_half`
- 若原数字有奇数位，如 12321：中间那位（3）属于后半段，反转结果是 123，前半段剩余 12，此时用 `x == reversed_half // 10` 去掉中间那位

---

## 完整代码实现

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        # 负数的负号只在最左边，倒过来读不同，直接排除
        if x < 0:
            return False
        s = str(x)
        # 只需比较前一半与后一半的对称位置，mid 就是需要比较的次数
        mid = len(s) // 2
        for i in range(mid):
            # len(s) - 1 - i 是从右往左数第 i 个位置，i 递增时两指针自然向中间靠拢
            if s[i] != s[len(s) - 1 - i]:
                return False
        # 全部对称，是回文数；mid = 0 的单个数字不进循环，直接返回 True
        return True
```

---

## 示例推演

以 x = 12321 为例，使用转字符串双指针解法：

```
s = "12321"
len(s) = 5，mid = 5 // 2 = 2

i = 0：s[0] = '1'，s[4] = '1'，相等，继续
i = 1：s[1] = '2'，s[3] = '2'，相等，继续
循环结束（i 只到 mid-1 = 1）

返回 True
```

以 x = 12345 为例：

```
s = "12345"
len(s) = 5，mid = 2

i = 0：s[0] = '1'，s[4] = '5'，不相等

返回 False
```

以 x = -121 为例：

```
x < 0，直接返回 False
```

以 x = 10 为例：

```
s = "10"
len(s) = 2，mid = 1

i = 0：s[0] = '1'，s[1] = '0'，不相等

返回 False
```

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 转成各位数字再比较 | O(log n) | O(log n) | 位数为 log₁₀n，额外列表存储各位 |
| 转字符串双指针 | O(log n) | O(log n) | 字符串长度为 log₁₀n |
| 反转一半数字 | O(log n) | O(1) | 只需常数额外空间，无需转换 |

> 这里 n 指整数本身的值，log₁₀n 近似于数字的位数。

---

## 易错点总结

- **负号直接返回 False**：不加这条判断，`-121` 反转后是 `121-`，比较会得出错误结论。
- **末尾为 0 的数要提前排除**：反转一半的写法必须判断 `x != 0 and x % 10 == 0`，否则 `10` 反转成 `01` 会被误判为回文。
- **右端下标写 `s[len(s) - 1 - i]`**：写成 `s[-i]` 在 `i == 0` 时取到的是最后一个字符，首尾比较整个错位。

## 扩展思考

**相关题目：**
- LeetCode 125. 验证回文串（字符串版本，需要忽略非字母数字字符）
- LeetCode 234. 回文链表（链表版本，无法用下标访问）

**算法本质：**

"回文"问题的核心是对称性验证。双指针是处理对称性问题最自然的工具，因为它天然地从两端向中间收缩，每步都在验证对称位置的一对元素。

在字符串、数组、链表等不同数据结构上，验证回文的思路都是一致的：找到中点，然后对称比较两侧。区别在于访问方式：数组可以用下标，链表需要先反转或使用快慢指针找到中点。
