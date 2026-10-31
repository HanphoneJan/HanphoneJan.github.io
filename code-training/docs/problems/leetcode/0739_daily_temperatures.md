---
title: 739. 每日温度
platform: LeetCode
difficulty: Medium
id: 739
url: https://leetcode.cn/problems/daily-temperatures/
tags:
  - 栈
  - 数组
  - 单调栈
topics: []
patterns: []
date_added: 2026-04-09
date_reviewed: []
---

# 739. 每日温度

## 题目描述

给定一个整数数组 `temperatures`，表示每天的温度，返回一个数组 `answer`，其中 `answer[i]` 是指对于第 i 天，下一个更高温度出现在几天后。如果气温在这之后都不会升高，请在该位置用 `0` 来代替。

**示例 1：**
```
输入: temperatures = [73,74,75,71,69,72,76,73]
输出: [1,1,4,2,1,1,0,0]
解释:
第 0 天：明天温度 74 > 73，所以是 1 天后
第 1 天：明天温度 75 > 74，所以是 1 天后
第 2 天：需要等到第 6 天温度 76 > 75，所以是 4 天后
...
```

**示例 2：**
```
输入: temperatures = [30,40,50,60]
输出: [1,1,1,0]
```

**示例 3：**
```
输入: temperatures = [30,60,90]
输出: [1,1,0]
```

---

## 解题思路

### 问题分析

这道题是经典的「下一个更大元素」问题。

对于每个位置 i，需要找到右边第一个大于 `temperatures[i]` 的元素的位置 j，答案是 `j - i`。

### 方法一：栈（单调栈）

**思路：** 对于每一天，向后遍历直到找到更高的温度。

```python
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        # 默认 0 表示「后面不会再升高」，找不到更高温度时正好保留这个值
        ans = [0] * n
        
        # 以每一天为起点，向右找第一个更暖的日子
        for i in range(n):
            # 从 i + 1 开始，只看「下一个」及更后面，不必回头看
            for j in range(i + 1, n):
                if temperatures[j] > temperatures[i]:
                    # 天数之差就是等待天数，找到即停，保证是最近的一天
                    ans[i] = j - i
                    break
        
        return ans
```

**为什么不够好？** 时间复杂度 O(n^2)，对于每个元素都可能向后遍历很多次。

### 方法二：单调栈

**关键洞察：** 使用单调递减栈来维护「等待找到下一个更高温度」的天数。

**单调栈的性质：**
- 栈中存储的是天数的下标
- 栈中对应的温度是单调递减的
- 栈顶元素是最近的一天

**算法步骤（从左向右遍历）：**
1. 遍历每一天的温度
2. 如果当前温度高于栈顶温度，说明找到了栈顶天的「下一个更高温度」
3. 弹出栈顶，计算天数差，记录答案
4. 重复步骤 2-3 直到栈为空或当前温度不再高于栈顶
5. 将当前天数入栈

```python
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        ans = [0] * n
        st = []  # 单调递减栈，存储等待找到下一个更高温度的天数
        
        for i, t in enumerate(temperatures):
            # 当前温度是栈中某些天的「下一个更高温度」
            while st and t > temperatures[st[-1]]:
                # 栈顶那天等到了：最近的一个更高温度就是今天，结算后弹出
                j = st.pop()
                ans[j] = i - j
            # 当前这天还没等到更高的温度，入栈继续等
            st.append(i)
        
        return ans
```

### 方法三：另一种写法（从右向左）

**思路：** 从右向左遍历，栈中维护「下一个更高温度的候选」。

```python
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        ans = [0] * n
        st = []
        
        # 从右往左扫，处理 i 时它右边所有天的答案都已经算过
        for i in range(n - 1, -1, -1):
            t = temperatures[i]
            # 弹出温度小于等于当前温度的元素
            # 它们不比当前天更暖又更远，永远不可能是当前天或更左边那天的答案
            while st and t >= temperatures[st[-1]]:
                st.pop()
            
            # 弹完之后栈顶就是右边第一个比今天暖和的日子
            if st:
                ans[i] = st[-1] - i
            
            # 今天入栈，成为左边那些天的一个候选
            st.append(i)
        
        return ans
```

---

## 完整代码实现

```python
from typing import List

class Solution:
    """
    每日温度 - 单调栈

    核心思路：
    使用单调递减栈来维护还没有找到下一个更高温度的天数。
    栈中存储的是天数的下标，对应的温度单调递减。

    时间复杂度: O(n)
    空间复杂度: O(n)
    """
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        ans = [0] * n
        st = []

        for i in range(n - 1, -1, -1):
            t = temperatures[i]
            while st and t >= temperatures[st[-1]]:
                st.pop()

            if st:
                ans[i] = st[-1] - i

            st.append(i)

        return ans
```

---

## 示例推演

以 `temperatures = [73,74,75,71,69,72,76,73]` 为例：

**从左向右遍历：**

| 天数 | 温度 | 栈状态（遍历前） | 操作 | 答案 |
|------|------|-----------------|------|------|
| 0 | 73 | [] | 入栈 | - |
| 1 | 74 | [0] | 74>73，弹出0，ans[0]=1，入栈 | ans[0]=1 |
| 2 | 75 | [1] | 75>74，弹出1，ans[1]=1，入栈 | ans[1]=1 |
| 3 | 71 | [2] | 71<75，入栈 | - |
| 4 | 69 | [2,3] | 69<71，入栈 | - |
| 5 | 72 | [2,3,4] | 72>69，弹出4，ans[4]=1；72>71，弹出3，ans[3]=2；入栈 | ans[3]=2, ans[4]=1 |
| 6 | 76 | [2,5] | 76>72，弹出5，ans[5]=1；76>75，弹出2，ans[2]=4；入栈 | ans[2]=4, ans[5]=1 |
| 7 | 73 | [6] | 73<76，入栈 | - |

**最终结果：** `[1,1,4,2,1,1,0,0]`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力 | O(n^2) | O(1) | 对每个元素向后遍历 |
| 单调栈 | O(n) | O(n) | 每个元素最多入栈出栈一次 |

**说明：**
- n 是温度数组的长度
- 单调栈的时间复杂度是 O(n)，因为每个元素最多入栈和出栈各一次

---

## 易错点总结

### 1. 单调栈的方向

```python
# 单调递减栈（栈底到栈顶温度递减）
while st and t > temperatures[st[-1]]:
    st.pop()

# 注意：找「下一个更大元素」用单调递减栈
# 找「下一个更小元素」用单调递增栈
# 栈里留下的都是还没等到更高温度的天，从栈底到栈顶越来越冷
```

### 2. 等号的处理

```python
# 如果题目要求「严格大于」，用 >
while st and t > temperatures[st[-1]]:

# 如果题目要求「大于等于」，用 >=
while st and t >= temperatures[st[-1]]:
# 本题要「更高」，相等不算更高，所以从左扫时用 >
```

### 3. 先 pop 再取栈顶算距离

```python
# 错误：pop 之后 st[-1] 已经是再前一个元素，距离偏大
st.pop()
ans[idx] = i - st[-1]

# 正确：先记下栈顶下标，再弹出
idx = st.pop()
ans[idx] = i - idx
```

---

## 扩展思考

### 1. 单调栈的适用场景

单调栈常用于解决「下一个更大/更小元素」的问题：
- 下一个更大元素 I/II
- 每日温度
- 接雨水
- 柱状图中最大的矩形

### 2. 如果需要找到前一个更大元素？

可以从左向右遍历，保持相同的逻辑。

### 3. 相关题目

- [496. 下一个更大元素 I](https://leetcode.cn/problems/next-greater-element-i/)
- [503. 下一个更大元素 II](https://leetcode.cn/problems/next-greater-element-ii/)
- [42. 接雨水](https://leetcode.cn/problems/trapping-rain-water/)
- [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)

---

## 相关题目

- [496. 下一个更大元素 I](https://leetcode.cn/problems/next-greater-element-i/)
- [503. 下一个更大元素 II](https://leetcode.cn/problems/next-greater-element-ii/)
- [42. 接雨水](https://leetcode.cn/problems/trapping-rain-water/)
- [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)
