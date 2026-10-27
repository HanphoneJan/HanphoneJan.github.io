---
title: 2. 两数相加
platform: LeetCode
difficulty: Medium
id: 2
url: https://leetcode.cn/problems/add-two-numbers/
tags:
  - 链表
  - 递归
  - 数学
patterns:
  - ../../patterns/recursion.md
date_added: 2026-03-25
---

# 2. 两数相加

## 题目描述

给你两个非空的链表，表示两个非负的整数。它们每位数字都是按照逆序的方式存储的，并且每个节点只能存储一位数字。

请你将两个数相加，并以相同形式返回一个表示和的链表。

你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

## 示例

**示例 1：**
```
输入：l1 = [2,4,3], l2 = [5,6,4]
输出：[7,0,8]
解释：342 + 465 = 807
```

**示例 2：**
```
输入：l1 = [0], l2 = [0]
输出：[0]
```

**示例 3：**
```
输入：l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
输出：[8,9,9,9,0,0,0,1]
```

---

## 解题思路

### 问题本质

给定两个逆序存储的非负整数链表 `l1`、`l2`，要求按手工竖式加法的方式逐位相加，返回相同逆序形式的结果链表。

要点：
1. 从链表头（个位）开始逐位相加
2. 需要考虑进位 `carry`
3. 遍历结束后若仍有进位，需新建节点补上最高位
4. 任意一条链表可能比另一条更长

### 方法一：迭代模拟（推荐）

**思路**：用哑节点 `dummy` 构建结果链表，逐位计算 `val1 + val2 + carry`，将余数写入新节点，更新进位，向后推进。任意一条链表走到末尾时补 `0` 即可。

```python
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        cur = dummy
        carry = 0

        while l1 or l2 or carry:
            val1 = l1.val if l1 else 0
            val2 = l2.val if l2 else 0
            s = val1 + val2 + carry

            carry = s // 10
            cur.next = ListNode(s % 10)
            cur = cur.next

            if l1:
                l1 = l1.next
            if l2:
                l2 = l2.next

        return dummy.next
```

**说明**：这是 LeetCode 官方最常用的写法。新建结果链表符合多数实际场景下「不修改输入」的习惯，也便于理解和排查。

### 方法二：递归（复用 l1 节点）

**思路**：递归处理当前位。若 `l1` 为空则与 `l2` 交换，保证 `l1` 非空便于统一处理；将 `(carry + l1.val + (l2.val if l2 else 0))` 的余数写回 `l1.val`，并将进位传递给 `l1.next`，最终直接返回 `l1`。若递归到两者都为空且无进位则返回 `None`，有进位则新建一个节点返回。

```python
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode], carry=0) -> Optional[ListNode]:
        if not l1 and not l2:
            return ListNode(carry) if carry else None
        if not l1:
            l1, l2 = l2, l1
        s = carry + l1.val + (l2.val if l2 else 0)
        l1.val = s % 10
        l1.next = self.addTwoNumbers(l1.next, l2.next if l2 else None, s // 10)
        return l1
```

**取舍**：
- **优点**：复用了 `l1` 的节点，减少了新节点的分配；代码较简短
- **缺点**：直接修改了输入链表 `l1`（调用方若后续还要用 `l1` 需留意）；递归深度与链表长度相同，在极长链表（题目一般允许 Python 栈，但部分环境或超长场景）下需考虑栈深度

---

## 完整代码实现

```python
# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

from typing import Optional

class Solution:
    """
    两数相加 - 链表模拟加法

    核心思想：
    模拟手工加法过程，从链表头（个位）开始逐位相加，处理进位。

    为什么选择递归？
    链表的结构天然适合递归处理，每次处理当前节点，递归处理后续节点。

    关键点：
    1. 进位 carry 的处理：s // 10 得到新的进位
    2. 边界情况：当一个链表为空时，与0相加
    3. 最终进位：如果最后还有进位，需要新增一个节点

    时间复杂度：O(max(m,n))，m和n是两个链表的长度
    空间复杂度：O(max(m,n))，递归栈的深度
    """

    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode], carry=0) -> Optional[ListNode]:
        if l1 is None and l2 is None:  # 递归边界
            return ListNode(carry) if carry else None  # 如果进位了，就额外创建一个节点
        if l1 is None:  # 如果 l1 是空的，那么此时 l2 一定不是空节点
            l1, l2 = l2, l1  # 交换 l1 与 l2，保证 l1 非空，从而简化代码
        s = carry + l1.val + (l2.val if l2 else 0)  # 节点值和进位加在一起
        l1.val = s % 10  # 每个节点保存一个数位（直接修改原链表）
        l1.next = self.addTwoNumbers(l1.next, l2.next if l2 else None, s // 10)  # 进位
        return l1
```

---

## 示例推演

以 `l1 = [2,4,3], l2 = [5,6,4]` 为例：

```
表示的数字：342 + 465 = 807
```

**递归调用过程**：

| 层级 | l1.val | l2.val | carry | s = carry+l1+l2 | l1.val = s%10 | 新carry | 说明 |
|------|--------|--------|-------|-----------------|---------------|---------|------|
| 1 | 2 | 5 | 0 | 7 | 7 | 0 | 个位相加 |
| 2 | 4 | 6 | 0 | 10 | 0 | 1 | 十位相加，有进位 |
| 3 | 3 | 4 | 1 | 8 | 8 | 0 | 百位相加 |
| 4 | None | None | 0 | 0 | - | 0 | 无进位，返回None |

**结果链表**：`[7,0,8]`

再以一个复杂例子 `l1 = [9,9,9], l2 = [9,9,9,9,9]` 为例：

| 层级 | l1.val | l2.val | carry | s | l1.val | 新carry |
|------|--------|--------|-------|---|--------|---------|
| 1 | 9 | 9 | 0 | 18 | 8 | 1 |
| 2 | 9 | 9 | 1 | 19 | 9 | 1 |
| 3 | 9 | 9 | 1 | 19 | 9 | 1 |
| 4 | None | 9 | 1 | 10 | 0 | 1 |
| 5 | None | 9 | 1 | 10 | 0 | 1 |
| 6 | None | None | 1 | 1 | 1 | 0 |

第 6 层把最后一次进位也写进结果，两个链表都已走空，`carry` 归 0。

**结果链表**：`[8,9,9,0,0,1]`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 迭代（哑节点） | O(max(m,n)) | O(max(m,n)) | 创建新链表用于结果 |
| 递归（复用 l1） | O(max(m,n)) | O(max(m,n)) | 递归栈深度；复用 `l1` 节点，修改了输入链表 |

---

## 易错点总结

- **末尾进位未处理（最常见）**：遍历到 `l1`、`l2` 都为空时，若 `carry == 1` 仍需新建一个节点返回（如示例 `[9,9,9],[1]` -> `[0,0,0,1]`）。忘记这个判断会导致最高位丢失。
- **直接按 `l1.val + l2.val` 相加而不补 0**：任意一条链表提前结束时要用 `0` 补位，不能直接访问 `None.val`。
- **修改输入链表带来的副作用（递归写法）**：用递归复用 `l1` 节点会直接改动原链表。如果调用方后续仍需用到原始 `l1`，要注意这一点。

---

## 扩展思考

### 1. 如果数字是正序存储的？

需要先反转链表，或者使用栈来逆序处理。

### 2. 如果链表很长，递归深度过深？

可以改用迭代版本，避免栈溢出。

### 3. 如何扩展为多个数相加？

可以用归并思想，两两相加，或者一次遍历所有链表。

---

## 相关题目

- [445. 两数相加 II](https://leetcode.cn/problems/add-two-numbers-ii/) - 数字正序存储
- [2. 两数相加](https://leetcode.cn/problems/add-two-numbers/)
- [415. 字符串相加](https://leetcode.cn/problems/add-strings/)
- [67. 二进制求和](https://leetcode.cn/problems/add-binary/)
