---
title: 21. 合并两个有序链表
platform: LeetCode
difficulty: Easy
id: 21
url: https://leetcode.cn/problems/merge-two-sorted-lists/
tags:
  - 链表
  - 双指针
  - 递归
topics: []
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-03-23
date_reviewed: []
---

# 21. 合并两个有序链表

## 题目描述

将两个升序链表合并为一个新的**升序**链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

**提示：**

- 两个链表的节点数目范围是 `[0, 50]`
- `-100 <= Node.val <= 100`
- `list1` 和 `list2` 均按**非递减顺序**排列

## 示例

### 示例 1

**输入：** list1 = [1,2,4], list2 = [1,3,4]

**输出：** [1,1,2,3,4,4]

### 示例 2

**输入：** list1 = [], list2 = []

**输出：** []

### 示例 3

**输入：** list1 = [], list2 = [0]

**输出：** [0]

## 解题思路

两条链各自有序，所以每次只需要比较**两边的当前头节点**，把较小的那个接到结果链尾，然后让它那一侧前进一格。某个链表先空掉时，另一条剩下的部分整段接上去就完事了。

### 哑结点省掉头节点的特判

结果链的第一个节点是「两边较小的那个」，如果不用哑结点，就得先判断哪条链非空、再单独处理第一个节点。加一个虚拟头 `dummy`，`cur` 从它出发，之后的每一步都是同一件事：`cur.next = 较小的节点`、`cur = cur.next`。

```python
dummy = ListNode()
cur = dummy
while list1 and list2:
    if list1.val <= list2.val:
        cur.next = list1
        list1 = list1.next
    else:
        cur.next = list2
        list2 = list2.next
    cur = cur.next
```

`<=` 保证了相等时先取 `list1`——题目只要求非递减，顺序不影响正确性，但固定一种让结果可复现。

### 一条链空了就整段接上

```python
cur.next = list1 if list1 else list2
return dummy.next
```

循环结束时至少有一条链为空，另一条**本身就是有序的**，直接接到 `cur` 后面即可，不需要再逐个搬。这一步少写，结果会丢掉尾部的一截。

返回的是 `dummy.next`，不是 `dummy`——哑结点只是一个占位，不属于结果。

### 推演：示例 1

`list1 = [1,2,4]`，`list2 = [1,3,4]`。

| 步骤 | 比较 | 接上 | 结果链 | 剩余 |
| --- | --- | --- | --- | --- |
| 1 | 1 ≤ 1 | list1 的 1 | 1 | l1=[2,4], l2=[1,3,4] |
| 2 | 2 > 1 | list2 的 1 | 1,1 | l1=[2,4], l2=[3,4] |
| 3 | 2 ≤ 3 | list1 的 2 | 1,1,2 | l1=[4], l2=[3,4] |
| 4 | 4 > 3 | list2 的 3 | 1,1,2,3 | l1=[4], l2=[4] |
| 5 | 4 ≤ 4 | list1 的 4 | 1,1,2,3,4 | l1=None, l2=[4] |
| 收尾 | l1 空 | 整段接上 l2 | 1,1,2,3,4,4 | — |

## 完整代码实现

```python
from typing import Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode()          # 哑结点，省掉「第一个节点」的特判
        cur = dummy
        while list1 and list2:
            if list1.val <= list2.val:
                cur.next = list1
                list1 = list1.next
            else:
                cur.next = list2
                list2 = list2.next
            cur = cur.next
        cur.next = list1 if list1 else list2   # 剩下的那段本身有序，整段接上
        return dummy.next
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 迭代 + 哑结点（最优） | O(n + m) | O(1) | 只移动指针，复用原有节点 |
| 递归 | O(n + m) | O(n + m) | 每层一个栈帧，长链表有溢出风险 |

`n`、`m` 分别是两条链的节点数。

## 易错点总结

### 1. 返回 `dummy` 而不是 `dummy.next`

`return dummy` 会把哑结点也带进结果：示例 1 输出 `[0,1,1,2,3,4,4]`，多了一个值为 0 的头节点。`dummy` 的值是构造函数默认的 0，看起来像数据，其实只是占位。

### 2. 循环结束后忘记接尾

少了 `cur.next = list1 if list1 else list2`，示例 1 只输出 `[1,1,2,3,4]`——最后那个 4 被丢掉了。循环的退出条件是「有一边空了」，另一边剩下的节点还没搬。

## 扩展思考

- 递归写法是 `l1.next = mergeTwoLists(l1.next, l2)`，代码四行，但栈深度等于 `n + m`。
- 合并 k 条有序链表时，逐个合并是 O(k²n)，用堆或分治两两合并可以降到 O(kn log k)。
