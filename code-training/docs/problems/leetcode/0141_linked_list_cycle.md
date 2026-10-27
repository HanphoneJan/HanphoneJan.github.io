---
title: 141. 环形链表
platform: LeetCode
difficulty: Easy
id: 141
url: https://leetcode.cn/problems/linked-list-cycle/
tags:
  - 链表
  - 双指针
  - 哈希表
  - Floyd 判圈算法
topics: []
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/two_pointers.md
date_added: 2026-04-03
date_reviewed: []
---

# 0141. 环形链表

## 题目描述

给你一个链表的头节点 `head`，判断链表中是否有环。

如果链表中有某个节点，可以通过连续跟踪 `next` 指针再次到达，则链表中存在环。为了表示给定链表中的环，评测系统内部使用整数 `pos` 来表示链表尾连接到链表中的位置（索引从 0 开始）。注意：`pos` 不作为参数进行传递。仅仅是为了标识链表的实际情况。

如果链表中存在环，则返回 `true` 。否则，返回 `false` 。

## 示例

**示例 1：**
```
输入：head = [3,2,0,-4], pos = 1
输出：true
解释：链表中有一个环，其尾部连接到第二个节点。
```

**示例 2：**
```
输入：head = [1,2], pos = 0
输出：true
解释：链表中有一个环，其尾部连接到第一个节点。
```

**示例 3：**
```
输入：head = [1], pos = -1
输出：false
解释：链表中没有环。
```

---

## 解题思路

### 问题本质

判断链表中是否存在环：若链表尾节点的 `next` 指向链表中的某个节点（包括自己），则存在环。

### 方法一：哈希表

**思路**：遍历链表，将节点对象的引用存入集合。每次访问新节点时先检查是否已在集合中，若是则说明曾经访问过，存在环；否则加入集合并继续遍历。

```python
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        visited = set()
        while head:
            if head in visited:
                return True
            visited.add(head)
            head = head.next
        return False
```

**说明**：思路直观，时间 O(n)，空间 O(n)。

### 方法二：快慢指针（Floyd 判圈算法，推荐）

**思路**：用慢指针 `slow` 每次走 1 步，快指针 `fast` 每次走 2 步。
- 若链表无环，`fast` 会先到达 `None`，返回 `False`
- 若链表有环，`fast` 会在环内追上 `slow`，两者相遇时返回 `True`

```python
class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow, fast = head, head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow == fast:
                return True
        return False
```

**说明**：不需要额外存储所有节点，空间 O(1)，是最常用的做法。

- 时间复杂度：`O(n)`
- 空间复杂度：`O(1)`

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
    141. 环形链表 - 快慢指针（Floyd 判圈算法）

    核心思想：
    快指针每次走 2 步，慢指针每次走 1 步。如果链表有环，两者一定会在环内相遇。

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow, fast = head, head

        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow == fast:
                return True

        return False
```

---

## 示例推演

以 `head = [3, 2, 0, -4]`（pos = 1，即尾节点连到索引 1）为例：

链表结构：`3 -> 2 -> 0 -> -4 -> 2（循环）`

| 轮次 | slow | fast |
|------|------|------|
| 起始 | 3 | 3 |
| 1 | 2 | 0 |
| 2 | 0 | 2 |
| 3 | -4 | -4 |

第 3 轮时，`slow == fast`，都有环，返回 `True`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 哈希表 | O(n) | O(n) | 直观易懂 |
| 快慢指针（Floyd 判圈） | O(n) | O(1) | 推荐做法 |

---

## 易错点总结

- **循环条件**：要用 `while fast and fast.next`，而不是 `while fast.next`，否则链表为空或只有一个节点时可能出错。
- **比较的是引用**：要比较节点对象本身（`slow == fast`），而不是 `slow.val == fast.val`。
- **快指针必须走两步**：只有速度差才能让快指针在环内追上慢指针。

---

## 扩展思考

### 如果要求找到环的入口？

就是 [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/)，需要快慢指针相遇后，再用一个指针从 head 出发同步走。

## 相关题目

- [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/)
- [287. 寻找重复数](https://leetcode.cn/problems/find-the-duplicate-number/)
