---
title: 19. 删除链表的倒数第 N 个结点
platform: LeetCode
difficulty: Medium
id: 19
url: https://leetcode.cn/problems/remove-nth-node-from-end-of-list/
tags:
  - 链表
  - 双指针
topics: []
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-03-26
date_reviewed: []
---

# 19. 删除链表的倒数第 N 个结点

## 题目描述

给你一个链表，删除链表的倒数第 `n` 个结点，并且返回链表的头结点。

**提示：**

- 链表中结点的数目为 `sz`
- `1 <= sz <= 30`
- `0 <= Node.val <= 100`
- `1 <= n <= sz`

**进阶：** 你能尝试使用一趟扫描实现吗？

## 示例

### 示例 1

**输入：** head = [1,2,3,4,5], n = 2

**输出：** [1,2,3,5]

### 示例 2

**输入：** head = [1], n = 1

**输出：** []

### 示例 3

**输入：** head = [1,2], n = 1

**输出：** [1]

## 解题思路

要删一个节点，必须站在它的**前驱**上，也就是 `prev.next = prev.next.next`。倒数第 `n` 个的前驱就是「从头数第 `L-n` 个」，可一趟扫描里我们并不知道 `L`。解决办法是让两个指针保持 `n` 步的间隔：快指针先走 `n` 步，再一起走，快指针到尾时慢指针正好停在待删节点的前驱。前面再加一个哑结点，删除头节点时就不用单独处理。

### 先加哑结点

如果待删的是头节点（`n == sz`），它的前驱不存在，代码要额外写一个分支。在头前面接一个 `dummy`，所有节点就都有了前驱，最后返回 `dummy.next`。

```python
dummy = ListNode(0, head)
fast = slow = dummy
```

### 快指针先走 n 步

```python
for _ in range(n):
    fast = fast.next
while fast.next:
    fast = fast.next
    slow = slow.next
slow.next = slow.next.next
```

走完之后 `slow` 停在待删节点的前一个位置——`fast` 到链尾（`fast.next is None`）时，两指针之间的节点数正好是 `n`，`slow.next` 就是倒数第 `n` 个。

`for` 循环走 `n` 步而不是 `n + 1` 步：多走一步，`slow` 会停到待删节点的**前前驱**，删掉的就是倒数第 `n + 1` 个。

### 边界：n 等于链表长度

示例 2 里 `sz = n = 1`，快指针走 1 步就站到了 `dummy` 之后的唯一节点（此时 `fast.next` 为空），循环不进入，`slow` 仍指向 `dummy`，于是 `dummy.next = dummy.next.next` 把唯一的节点删掉，返回 `dummy.next = None`。整个过程没有「头节点没有前驱」的特判。

### 推演：示例 1

`head = [1,2,3,4,5]`，`n = 2`，初始 `fast = slow = dummy`。

| 阶段 | `fast` 所在 | `slow` 所在 |
| --- | --- | --- |
| 走 `n` 步后 | 2 | dummy |
| 第 1 轮 | 3 | 1 |
| 第 2 轮 | 4 | 2 |
| 第 3 轮 | 5 | 3 |
| 结束（`fast.next` 为空） | 5 | 3 |

`slow` 指向 3，执行 `slow.next = slow.next.next` 跳过 4，结果 `[1,2,3,5]`。

## 完整代码实现

```python
from typing import Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)      # 哑结点：让头节点也有前驱
        fast = slow = dummy
        for _ in range(n):             # 两指针拉开 n 步
            fast = fast.next
        while fast.next:               # 一起走，直到 fast 到链尾
            fast = fast.next
            slow = slow.next
        slow.next = slow.next.next     # slow 停在待删节点的前驱
        return dummy.next
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 先求长度再删 | O(L) | O(1) | 要遍历两遍，但常数更小、更好调试 |
| 快慢指针一趟扫描（最优） | O(L) | O(1) | 只走一遍，满足进阶要求 |

`L` 是链表长度。

## 易错点总结

### 1. 快指针多走了一步

`for _ in range(n)` 写成 `range(n + 1)`，两指针间隔变成 `n + 1`，删掉的是倒数第 `n + 1` 个。示例 1 会输出 `[1,2,4,5]`——删掉的是 3，不是 4。间隔必须恰好是 `n`。

### 2. 不用哑结点，删除头节点时直接返回 head

`n == sz` 时要删的是头节点，它没有前驱，`slow.next = slow.next.next` 无处可写。写成 `if fast is None: return head` 的版本，示例 2 的 `[1], n = 1` 会原样返回 `[1]`，正确答案是 `[]`。

## 扩展思考

- 也可以先遍历一遍求长度 `L`，再从头走到第 `L - n` 个节点删除，两次遍历但不需要维护两个指针。
- 「删除倒数第 n 个」和「找倒数第 n 个」（[剑指 Offer 22](https://leetcode.cn/problems/lian-biao-zhong-dao-shu-di-kge-jie-dian-lcof/)）是同一个间隔技巧，只是后者不用哑结点。
