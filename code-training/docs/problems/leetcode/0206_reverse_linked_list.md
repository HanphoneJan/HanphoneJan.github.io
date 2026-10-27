---
title: 206. 反转链表
platform: LeetCode
difficulty: Easy
id: 206
url: https://leetcode.cn/problems/reverse-linked-list/
tags:
  - 链表
  - 递归
topics: []
patterns:
  - ../../patterns/recursion.md
date_added: 2026-04-09
date_reviewed: []
---

# 206. 反转链表

## 题目描述

给你单链表的头节点 `head`，请你反转链表，并返回反转后的链表。

## 示例

**示例 1：**
```
输入: head = [1,2,3,4,5]
输出: [5,4,3,2,1]
```

**示例 2：**
```
输入: head = [1,2]
输出: [2,1]
```

**示例 3：**
```
输入: head = []
输出: []
```

---

## 解题思路

### 问题本质

反转单链表，即将每个节点的 `next` 指针从指向后一个节点改为指向前一个节点，最终返回反转后的头节点（原链表的尾节点）。

### 方法一：栈（重建链表）

**思路**：遍历链表将所有节点值压入栈，再依次出栈新建节点构建反转后的链表。

```python
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        stack = []
        cur = head
        while cur:
            stack.append(cur.val)
            cur = cur.next
        dummy = ListNode(0)
        cur = dummy
        while stack:
            cur.next = ListNode(stack.pop())
            cur = cur.next
        return dummy.next
```

**说明**：并非原地反转指针，而是新建节点，额外使用栈空间。

### 方法二：递归

**思路**：递归到链表尾部，以尾节点作为新头返回。回溯时将 `head.next.next` 指向 `head`，再将 `head.next` 置为 `None` 完成反转。

```python
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head
        new_head = self.reverseList(head.next)
        head.next.next = head
        head.next = None
        return new_head
```

**说明**：代码简洁，时间 O(n)，空间 O(n)。

### 方法三：迭代（双指针，推荐）

**思路**：用 `pre` 记录已反转部分的头，`cur` 遍历当前节点。先用 `nxt` 保存 `cur.next`，再将 `cur.next` 指向 `pre`，最后更新 `pre` 和 `cur`。

```python
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        pre = None
        cur = head
        while cur:
            nxt = cur.next
            cur.next = pre
            pre = cur
            cur = nxt
        return pre
```

**说明**：原地反转指针，不创建新节点，空间复杂度 O(1)。

---

## 完整代码实现

```python
from typing import Optional

class Solution:
    """
    反转链表 - 迭代法

    核心思路：
    使用三个指针：pre（前一个节点）、cur（当前节点）、nxt（下一个节点）
    遍历链表，每次将 cur.next 指向 pre，实现局部反转

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # pre: 前一个节点（已反转部分的头节点）
        # cur: 当前处理的节点
        pre = None
        cur = head

        while cur:
            # 保存下一个节点，防止断链后找不到
            nxt = cur.next

            # 反转：将当前节点的 next 指向前一个节点
            cur.next = pre

            # 移动指针
            pre = cur
            cur = nxt

        return pre
```

---

## 示例推演

以 `[1,2,3,4,5]` 为例：

**初始状态**：
```
pre: None
cur: 1 -> 2 -> 3 -> 4 -> 5 -> None
```

**第1轮**：
```
nxt = 2
cur.next = pre = None
pre = 1 -> None
cur = 2 -> 3 -> 4 -> 5 -> None
```

**第2轮**：
```
nxt = 3
cur.next = pre = 1 -> None
pre = 2 -> 1 -> None
cur = 3 -> 4 -> 5 -> None
```

**第3轮**：
```
nxt = 4
cur.next = pre = 2 -> 1 -> None
pre = 3 -> 2 -> 1 -> None
cur = 4 -> 5 -> None
```

**第4轮**：
```
nxt = 5
cur.next = pre = 3 -> 2 -> 1 -> None
pre = 4 -> 3 -> 2 -> 1 -> None
cur = 5 -> None
```

**第5轮**：
```
nxt = None
cur.next = pre = 4 -> 3 -> 2 -> 1 -> None
pre = 5 -> 4 -> 3 -> 2 -> 1 -> None
cur = None
```

**结束**：cur 为 None，返回 pre = `[5,4,3,2,1]`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 栈（重建链表） | O(n) | O(n) | 额外栈空间并新建节点 |
| 递归 | O(n) | O(n) | 递归栈空间 |
| 迭代（双指针） | O(n) | O(1) | 原地反转，推荐做法 |

---

## 易错点总结

- **先保存 `next` 再反转**：迭代时必须先用 `nxt = cur.next` 保存后继，再将 `cur.next` 指向 `pre`，否则会断链。
- **返回 `pre` 而不是 `cur`**：遍历结束时 `cur` 为 `None`，新的头节点是 `pre`。
- **递归要断开原指针**：`head.next.next = head` 后必须将 `head.next = None`，否则反转后的链表会形成环。

---

## 扩展思考

### 1. 反转指定区间的链表

[92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii/)：反转从位置 m 到 n 的链表。

### 2. K 个一组反转链表

[25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group/)：每 k 个节点反转一次。

### 3. 相关题目

- [206. 反转链表](https://leetcode.cn/problems/reverse-linked-list/)
- [92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii/)
- [25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group/)
- [234. 回文链表](https://leetcode.cn/problems/palindrome-linked-list/)（需要反转后半部分）

---

## 相关题目

- [92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii/)
- [25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group/)
- [234. 回文链表](https://leetcode.cn/problems/palindrome-linked-list/)
