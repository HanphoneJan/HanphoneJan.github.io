---
title: 21. 合并两个有序链表
platform: LeetCode
difficulty: Easy
id: 21
url: https://leetcode.cn/problems/merge-two-sorted-lists/
tags:
  - 链表
  - 递归
topics: []
patterns:
  - ../../patterns/recursion.md
date_added: 2026-03-20
date_reviewed: []
---

# 21. 合并两个有序链表

## 题目描述

将两个升序链表合并为一个新的升序链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

**示例：**
```
输入：list1 = [1,2,4], list2 = [1,3,4]
输出：[1,1,2,3,4,4]

输入：list1 = [], list2 = []
输出：[]

输入：list1 = [], list2 = [0]
输出：[0]
```

**约束：**
- 两个链表的节点数目范围是 `[0, 50]`
- `-100 <= Node.val <= 100`
- `list1` 和 `list2` 均按非递减顺序排列

---

## 解题思路

### 问题本质

两个链表都已升序，要求将它们合并成一个新的升序链表。由于两条链本身有序，只需每次比较头节点，取较小的节点接到结果链表即可（归并思想）。

### 方法一：迭代（双指针，推荐）

**思路**：使用哑节点 `dummy` 和尾指针 `cur`，每次从 `list1`、`list2` 的头部取较小的节点接到 `cur.next`，再将对应指针后移。任意一条链表遍历结束后，将另一条链表剩余部分直接接到 `cur` 尾部。

```python
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        cur = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                cur.next = list1
                list1 = list1.next
            else:
                cur.next = list2
                list2 = list2.next
            cur = cur.next

        cur.next = list1 if list1 else list2
        return dummy.next
```

**说明**：利用了两链表已有的有序性，避免了全量排序。使用哑节点能统一头节点处理逻辑，也便于构建链表。

### 方法二：递归

**思路**：比较头节点，较小的节点的 `next` 应该是「剩余两链表合并」的结果。递归到其中一条为空时返回另一条链表。

```python
class Solution:
    def mergeTwoLists(self, list1, list2):
        if not list1:
            return list2
        if not list2:
            return list1
        if list1.val <= list2.val:
            list1.next = self.mergeTwoLists(list1.next, list2)
            return list1
        else:
            list2.next = self.mergeTwoLists(list1, list2.next)
            return list2
```

**取舍**：
- **优点**：代码极简，能直观体现归并递归思路
- **缺点**：递归栈深度等于合并后的链表长度，链表较长时有栈溢出风险；复用了部分节点（也等价于原地拼接指针）

---

## 完整代码实现

```python
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        # 哑节点：统一处理头节点，避免特判
        dummy = ListNode(0)
        cur = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                cur.next = list1        # 将 list1 的当前节点接入结果
                list1 = list1.next      # list1 指针后移
            else:
                cur.next = list2        # 将 list2 的当前节点接入结果
                list2 = list2.next      # list2 指针后移
            cur = cur.next              # 结果链表末尾后移

        # 某一链表已空，将另一链表剩余部分直接接上
        cur.next = list1 if list1 else list2

        return dummy.next  # 哑节点的下一个才是真实头节点
```

---

## 示例推演

以 `list1 = [1, 2, 4]`，`list2 = [1, 3, 4]` 为例，逐步追踪：

**初始状态：**
```
dummy -> (空)
cur = dummy
list1: 1 -> 2 -> 4
list2: 1 -> 3 -> 4
```

**第 1 次循环：** `list1.val=1`，`list2.val=1`，1 <= 1，选 list1
```
dummy -> 1
cur 移到 1
list1: 2 -> 4
list2: 1 -> 3 -> 4
```

**第 2 次循环：** `list1.val=2`，`list2.val=1`，2 > 1，选 list2
```
dummy -> 1 -> 1
cur 移到第二个 1
list1: 2 -> 4
list2: 3 -> 4
```

**第 3 次循环：** `list1.val=2`，`list2.val=3`，2 <= 3，选 list1
```
dummy -> 1 -> 1 -> 2
cur 移到 2
list1: 4
list2: 3 -> 4
```

**第 4 次循环：** `list1.val=4`，`list2.val=3`，4 > 3，选 list2
```
dummy -> 1 -> 1 -> 2 -> 3
cur 移到 3
list1: 4
list2: 4
```

**第 5 次循环：** `list1.val=4`，`list2.val=4`，4 <= 4，选 list1
```
dummy -> 1 -> 1 -> 2 -> 3 -> 4
cur 移到第一个 4
list1: (空)
list2: 4
```

**退出循环：** list1 为空，将 list2 剩余部分（节点 4）接上
```
dummy -> 1 -> 1 -> 2 -> 3 -> 4 -> 4
```

返回 `dummy.next`，得到 `[1, 1, 2, 3, 4, 4]`，正确。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 迭代（双指针） | O(n+m) | O(1) | 只用常数额外指针，复用已有节点 |
| 递归 | O(n+m) | O(n+m) | 时间线性，空间主要为递归栈深度 |

其中 n、m 分别为两个链表的节点数。

---

## 易错点总结

- **忘记返回 `dummy.next`**：`dummy` 是哑节点，真实头节点是 `dummy.next`。
- **循环结束未接尾**：其中一条链表为空后，另一条剩余链表仍然有序，直接赋给 `cur.next` 即可，不能忘记这一步。
- **递归栈深度**：极长链表时递归版可能栈溢出，更推荐用迭代版。

---

## 扩展思考

- **题目 23（合并 K 个升序链表）** 是本题的扩展：将 K 个有序链表合并，可以用分治（两两调用本题的合并函数）或最小堆实现。
- **归并排序的 Merge 步骤** 和本题完全一致：归并排序的合并阶段，就是把两个有序数组（或链表）合并成一个有序序列。
- **迭代 vs 递归：** 递归代码更简洁，迭代代码更高效（无栈开销）。理解两种写法，可以加深对链表操作和递归思维的认识。
