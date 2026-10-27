---
title: 19. 删除链表的倒数第 N 个结点
platform: LeetCode
difficulty: Medium
id: 19
url: https://leetcode.cn/problems/remove-nth-node-from-end-of-list/
tags:
  - 链表
  - 双指针
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-03-25
---

# 19. 删除链表的倒数第 N 个结点

## 题目描述

给你一个链表，删除链表的倒数第 `n` 个结点，并且返回链表的头结点。

## 示例

**示例 1：**
```
输入：head = [1,2,3,4,5], n = 2
输出：[1,2,3,5]
```

**示例 2：**
```
输入：head = [1], n = 1
输出：[]
```

**示例 3：**
```
输入：head = [1,2], n = 1
输出：[1]
```

---

## 解题思路

### 问题本质

要删除链表的倒数第 `n` 个节点，本质是找到它的前驱节点 `prev`，然后执行 `prev.next = prev.next.next`。难点在于：单链表没有从后往前的索引，只能从头遍历。

### 方法一：两次遍历（先求长度）

**思路**：先遍历一遍统计链表长度 `L`，倒数第 `n` 个节点对应正数第 `L - n` 个节点（0-based），其前一个节点就是要操作的前驱。再用哑节点 `dummy` 遍历到前驱位置，直接跳过目标节点。

```python
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        length = 0
        cur = head
        while cur:
            length += 1
            cur = cur.next

        dummy = ListNode(0, head)
        cur = dummy
        for i in range(length - n):
            cur = cur.next

        cur.next = cur.next.next
        return dummy.next
```

**说明**：思路简单直观，需要两次遍历。

### 方法二：双指针（快慢指针，一次遍历，推荐）

**思路**：让快指针 `first` 先走 `n` 步，然后 `first` 和慢指针 `second` 同时向后走。当 `first` 到达链表末尾时，`second` 正好位于要删除节点的前一个节点。用哑节点统一处理删除头节点的情况。

```python
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        first = head
        for i in range(n):
            first = first.next

        second = dummy
        while first:
            first = first.next
            second = second.next

        second.next = second.next.next
        return dummy.next
```

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
    删除链表的倒数第 N 个结点 - 双指针（快慢指针）

    核心思想：
    使用两个指针，让快指针先走 n 步，然后快慢指针一起走。
    当快指针到达末尾时，慢指针正好在倒数第 n+1 个位置（即要删除节点的前一个）。

    为什么用 dummy 节点？
    如果删除的是头节点，需要特殊处理。使用 dummy 节点可以统一逻辑，
    让 slow 最终停在要删除节点的前一个位置。

    时间复杂度：O(L)，L 是链表长度，只遍历一次
    空间复杂度：O(1)
    """

    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        # 创建 dummy 节点，简化边界处理
        dummy = ListNode(0, head)

        # first 先走 n 步
        first = head
        for i in range(n):
            first = first.next

        # second 从 dummy 开始，最终停在要删除节点的前一个
        second = dummy

        # first 和 second 同时走，直到 first 到达末尾
        while first:
            first = first.next
            second = second.next

        # 删除倒数第 n 个节点
        second.next = second.next.next

        return dummy.next
```

---

## 示例推演

以 `head = [1,2,3,4,5], n = 2` 为例：

**初始状态**：
```
dummy -> 1 -> 2 -> 3 -> 4 -> 5
first指向1，second指向dummy
```

**Step 1**：first 先走 2 步
```
dummy -> 1 -> 2 -> 3 -> 4 -> 5
         ^        ^
       first    (first走了2步，现在指向3)
```

**Step 2**：first 和 second 同时走
| 步骤 | first | second | 说明 |
|------|-------|--------|------|
| 初始 | 3 | dummy | - |
| 1 | 4 | 1 | 同时前进一步 |
| 2 | 5 | 2 | 同时前进一步 |
| 3 | None | 3 | first到达末尾，second指向3 |

**Step 3**：删除 second.next（节点 4）
```
dummy -> 1 -> 2 -> 3 -> 5
```

返回 `dummy.next`，即 `[1,2,3,5]`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 两次遍历（先求长度） | O(L) | O(1) | 遍历两次链表 |
| 双指针（快慢指针） | O(L) | O(1) | 只需遍历一次链表，最常用 |

---

## 易错点总结

- **必须使用哑节点**：如果要删除的是头节点（倒数第 `n` 恰好是头节点），用 `dummy` 能统一处理，避免单独判断。
- **快指针先走 `n` 步**：让快慢指针之间保持 `n` 个节点的间隔。快指针到达末尾时，慢指针正好指向待删除节点的前驱。
- **真正删除节点**：要用 `second.next = second.next.next` 跳过目标节点，不能用 `second = second.next`（那只是移动指针）。

---

## 扩展思考

### 1. 如何找到链表的中间节点？

同样使用快慢指针，快指针每次走 2 步，慢指针每次走 1 步，当快指针到达末尾时，慢指针就在中间。

### 2. 如何检测链表是否有环？

快慢指针，快指针每次走 2 步，慢指针每次走 1 步，如果相遇则有环。

### 3. 如果要求删除倒数第 n 个节点并返回被删除的值？

在删除前保存 `second.next.val`，然后再删除。

---

## 相关题目

- [876. 链表的中间结点](https://leetcode.cn/problems/middle-of-the-linked-list/)
- [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle/)
- [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/)
- [21. 合并两个有序链表](https://leetcode.cn/problems/merge-two-sorted-lists/)
