---
title: 155. 最小栈
platform: LeetCode
difficulty: Easy
id: 155
url: https://leetcode.cn/problems/min-stack/
tags:
  - 栈
  - 设计
topics: []
patterns: []
date_added: 2026-04-03
date_reviewed: []
---

# 0155. 最小栈

## 题目描述

设计一个支持 `push` ，`pop` ，`top` 操作，并能在常数时间内检索到最小元素的栈。

实现 `MinStack` 类:

- `MinStack()` 初始化堆栈对象。
- `void push(int val)` 将元素val推入堆栈。
- `void pop()` 删除堆栈顶部的元素。
- `int top()` 获取堆栈顶部的元素。
- `int getMin()` 获取堆栈中的最小元素。

## 示例

**示例:**
```
输入：
["MinStack","push","push","push","getMin","pop","top","getMin"]
[[],[-2],[0],[-3],[],[],[],[]]

输出：
[null,null,null,null,-3,null,0,-2]

解释：
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin();   --> 返回 -3.
minStack.pop();
minStack.top();      --> 返回 0.
minStack.getMin();   --> 返回 -2.
```

---

## 解题思路

### 问题本质

在栈的基础上，额外要求 `getMin()` 能在 O(1) 时间返回当前栈中的最小元素。

### 方法一：双栈（推荐）

**思路**：
- `stack`：正常存储所有压入的元素
- `min_stack`：存储每个状态下的最小值。每次 `push` 时将 `min(x, min_stack[-1])` 压入，`pop` 时两栈同时弹出。

```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = [10**18]

    def push(self, val: int) -> None:
        self.stack.append(val)
        self.min_stack.append(min(val, self.min_stack[-1]))

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

### 方法二：单栈存元组

**思路**：每个元素保存 `(val, current_min)`，用哨兵简化初始化。

```python
class MinStack:
    def __init__(self):
        self.st = [(0, 10**18)]

    def push(self, val: int) -> None:
        self.st.append((val, min(self.st[-1][1], val)))

    def pop(self) -> None:
        self.st.pop()

    def top(self) -> int:
        return self.st[-1][0]

    def getMin(self) -> int:
        return self.st[-1][1]
```

**说明**：两种方法时间复杂度均为 O(1)，空间复杂度均为 O(n)。

---

## 完整代码实现

```python
class MinStack:
    """
    155. 最小栈 - 双栈实现

    核心思想：
    主栈正常存数据，辅助栈存每个状态下的最小值。
    这样 getMin() 永远是 O(1)。

    时间复杂度：所有操作 O(1)
    空间复杂度：O(n)
    """

    def __init__(self):
        self.stack = []
        self.min_stack = [2**31]

    def push(self, x: int) -> None:
        self.stack.append(x)
        self.min_stack.append(min(x, self.min_stack[-1]))

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]


class MinStack2:
    """
    155. 最小栈 - 单栈元组实现

    核心思想：
    每个栈元素存储 (val, 当前最小值)，用栈底哨兵简化空栈判断。
    """

    def __init__(self):
        self.st = [(0, 2**31)]

    def push(self, val: int) -> None:
        self.st.append((val, min(self.st[-1][1], val)))

    def pop(self) -> None:
        self.st.pop()

    def top(self) -> int:
        return self.st[-1][0]

    def getMin(self) -> int:
        return self.st[-1][1]
```

---

## 示例推演

操作序列：`push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()`

**双栈实现**：

| 操作 | stack | min_stack |
|------|-------|-----------|
| init | [] | [inf] |
| push(-2) | [-2] | [inf, -2] |
| push(0) | [-2, 0] | [inf, -2, -2] |
| push(-3) | [-2, 0, -3] | [inf, -2, -2, -3] |
| getMin() | | 返回 -3 |
| pop() | [-2, 0] | [inf, -2, -2] |
| top() | | 返回 0 |
| getMin() | | 返回 -2 |

**单栈元组实现**：

| 操作 | st |
|------|-----|
| init | [(0, inf)] |
| push(-2) | [(0, inf), (-2, -2)] |
| push(0) | [(0, inf), (-2, -2), (0, -2)] |
| push(-3) | [(0, inf), (-2, -2), (0, -2), (-3, -3)] |

两种实现效果完全一致。

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| push | O(1) | O(n) | 主栈 + 辅助信息 |
| pop | O(1) | O(n) | |
| top | O(1) | O(n) | |
| getMin | O(1) | O(n) | **关键优化** |

---

## 易错点总结

- **辅助栈要同步**：双栈法中，`push` 和 `pop` 必须同时操作主栈和最小栈，长度始终保持一致。
- **用哨兵简化**：在辅助栈底部放一个足够大的初始值，避免 `push` 第一个元素时需要额外判断。

---

## 扩展思考

### 如果要求实现最大栈？

和最小栈完全对称，辅助栈存最大值即可。

### O(1) 返回中位数？

需要用两个堆（大顶堆 + 小顶堆），就是 [295. 数据流的中位数](https://leetcode.cn/problems/find-median-from-data-stream/)。

## 相关题目

- [20. 有效的括号](https://leetcode.cn/problems/valid-parentheses/)
- [225. 用队列实现栈](https://leetcode.cn/problems/implement-stack-using-queues/)
- [232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)
