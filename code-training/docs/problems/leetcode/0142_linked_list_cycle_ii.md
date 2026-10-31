---
title: 142. 环形链表 II
platform: LeetCode
difficulty: Medium
id: 142
url: https://leetcode.cn/problems/linked-list-cycle-ii/
tags:
  - 链表
  - 双指针
  - 数学
  - 哈希表
  - Floyd 判圈算法
topics: []
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/two_pointers.md
date_added: 2026-04-03
date_reviewed: []
---

# 0142. 环形链表 II

## 题目描述

给定一个链表的头节点 `head`，返回链表开始入环的第一个节点。如果链表无环，则返回 `null`。

如果链表中有某个节点，可以通过连续跟踪 `next` 指针再次到达，则链表中存在环。为了表示给定链表中的环，评测系统内部使用整数 `pos` 来表示链表尾连接到链表中的位置（索引从 0 开始）。如果 `pos` 是 `-1`，则在该链表中没有环。注意：`pos` 不作为参数进行传递，仅仅是为了标识链表的实际情况。

**不允许修改** 链表。

## 示例

**示例 1：**
```
输入：head = [3,2,0,-4], pos = 1
输出：2
解释：链表中有一个环，其尾部连接到第二个节点（下标 1，值为 2）。
```

**示例 2：**
```
输入：head = [1,2], pos = 0
输出：1
解释：链表中有一个环，其尾部连接到第一个节点（下标 0，值为 1）。
```

**示例 3：**
```
输入：head = [1], pos = -1
输出：null
解释：链表中没有环。
```

---

## 解题思路

### 先分清两个问题：有没有环、环从哪里开始

141 题只问「有没有环」，快慢指针相遇就说明有。本题还要回答「入口在哪」，而相遇点通常**不是**入口：示例 1 里快慢指针在 `-4` 相遇，入口却是 `2`。

最直接的办法是边走边记录见过的节点，第一个重复出现的节点就是入口：

```python
class Solution:
    def detectCycle(self, head: Optional[ListNode]) -> Optional[ListNode]:
        seen = set()
        cur = head
        while cur:
            if cur in seen:      # 第一次重复出现的节点就是环入口
                return cur
            seen.add(cur)
            cur = cur.next
        return None
```

时间 `O(n)`、空间 `O(n)`。接下来要做的，是把这份「记录」压成两个指针。

### 快慢指针：先相遇，再让一个指针回到 head

**第一阶段**和 141 题一样：`slow` 每次走 1 步，`fast` 每次走 2 步。如果有环，`fast` 一定会在环里追上 `slow`。

**第二阶段**：把其中一个指针放回 `head`，另一个留在相遇点，两个指针都改成每次走 1 步。它们再次相遇的节点就是环入口。

**为什么？** 设：

- `a` = `head` 到入口的距离（节点数）；
- `b` = 入口到相遇点的距离；
- `c` = 相遇点回到入口的距离。

相遇时 `slow` 走了 `a + b`，`fast` 走了 `a + b + k(b + c)`（多绕了 `k` 整圈）。`fast` 的速度是 `slow` 的两倍，所以：

```text
2(a + b) = a + b + k(b + c)
a + b = k(b + c)
a = k(b + c) - b
  = c + (k - 1)(b + c)
```

也就是「从 `head` 走 `a` 步」和「从相遇点走 `c` 步、再绕 `k-1` 圈」会同时到达入口。两个指针都每次走 1 步，绕完整圈后必然在入口相遇。

```python
class Solution:
    def detectCycle(self, head: Optional[ListNode]) -> Optional[ListNode]:
        slow = fast = head

        # 第一阶段：找相遇点
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                # 第二阶段：一个从头出发，一个从相遇点出发
                while slow is not head:
                    slow = slow.next
                    head = head.next
                return slow

        return None
```

两个阶段都是线性时间，指针只用了两个，空间 `O(1)`。

### 两种写法怎么选

| 写法 | 时间 | 空间 | 适用场景 |
|---|---|---|---|
| 哈希集合 | O(n) | O(n) | 先写对、链表不长；思路最直白 |
| 快慢指针 | O(n) | O(1) | 面试默认；要求原地时只能用这个 |

哈希版把「见过谁」显式存下来；Floyd 版把这个信息编码进了两个指针的速度差里。前者好解释，后者省空间，复杂度只差一个 `O(n)` 的集合。

---

## 完整代码实现

```python
from typing import Optional

class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

class Solution:
    """
    142. 环形链表 II - Floyd 判圈算法

    核心思想：
    1. 快慢指针找到相遇点
    2. 再用两个指针分别从 head 和相遇点同步前进，相遇点即环入口

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def detectCycle(self, head: Optional[ListNode]) -> Optional[ListNode]:
        slow = fast = head

        # 步骤1：找相遇点
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if fast is slow:  # 相遇
                # 步骤2：找环入口
                while slow is not head:
                    slow = slow.next
                    head = head.next
                return slow

        return None
```

---

## 示例推演

以 `head = [3,2,0,-4]`、`pos = 1` 为例，链表是：

```text
3 -> 2 -> 0 -> -4
     ^         |
     +---------+
```

环入口是下标 1 的节点 `2`。

**第一阶段：快慢指针**

| 轮次 | `slow` | `fast` |
|---|---|---|
| 开始 | 3 | 3 |
| 1 | 2 | 0 |
| 2 | 0 | 2 |
| 3 | -4 | -4 |

第 3 轮两个指针在 `-4` 相遇。

**第二阶段：找入口**

- `head` 从 `3` 出发；
- `slow` 从相遇点 `-4` 出发；
- 两者都每次走 1 步：`3 -> 2`、`-4 -> 2`，在 `2` 相遇。

返回节点 `2`，与示例输出一致。

无环时（示例 3），`fast` 会先走到 `None` 或 `fast.next == None`，循环结束并返回 `None`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 哈希集合 | O(n) | O(n) | 记录访问过的节点 |
| 快慢指针（最优） | O(n) | O(1) | 两阶段都只走线性步数 |

---

## 易错点总结

1. **把相遇点当入口返回**：第一阶段结束时 `slow == fast`，但那是环里的某个节点，不一定是入口。必须再做第二阶段，从 `head` 和相遇点同步走。
2. **快指针的循环条件只写 `while fast:`**：`fast.next` 为 `None` 时再取 `fast.next.next` 会抛 `AttributeError`。条件必须是 `while fast and fast.next:`。
3. **第二阶段没有让 `head` 一起前进**：只移动 `slow` 而 `head` 不动，两个指针永远不会在入口相遇。循环体里 `slow = slow.next` 和 `head = head.next` 必须成对出现。

---

## 相关题目

- [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle/)
- [287. 寻找重复数](https://leetcode.cn/problems/find-the-duplicate-number/)
