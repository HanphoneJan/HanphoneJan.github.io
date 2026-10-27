---
title: 160. 相交链表
platform: LeetCode
difficulty: Easy
id: 160
url: https://leetcode.cn/problems/intersection-of-two-linked-lists/
tags:
  - 链表
  - 双指针
  - 哈希表
topics: []
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/two_pointers.md
date_added: 2026-04-03
date_reviewed: []
---

# 0160. 相交链表

## 题目描述

给你两个单链表的头节点 `headA` 和 `headB`，请你找出并返回两个单链表相交的起始节点。如果两个链表不存在相交节点，返回 `null`。

图示两个链表在节点 `c1` 开始相交：

题目数据 **保证** 整个链式结构中不存在环。

**注意**，函数返回结果后，链表必须 **保持其原始结构** 。

## 示例

**示例 1：**
```
相交节点的值为 8
```

**示例 2：**
```
相交节点的值为 2
```

**示例 3：**
```
没有相交节点
```

---

## 解题思路

### 问题本质

两条链表相交是指它们从某个节点开始，共用同一个后缀链表。判断的依据是**节点对象引用是否相同**，而不是节点值是否相等。

### 方法一：暴力枚举

**思路**：遍历链表 A 的每个节点，在链表 B 中查找是否有同一个引用的节点，找到第一个即为交点。

**说明**：时间复杂度 O(m*n)，空间复杂度 O(1)，但效率较低。

### 方法二：哈希表

**思路**：先遍历链表 A，将所有节点引用存入 `set`，再遍历链表 B，返回第一个出现在集合中的节点引用。

```python
class Solution:
    def getIntersectionNode(self, headA: ListNode, headB: ListNode) -> ListNode:
        visited = set()
        cur = headA
        while cur:
            visited.add(cur)
            cur = cur.next
        cur = headB
        while cur:
            if cur in visited:
                return cur
            cur = cur.next
        return None
```

**说明**：时间 O(m+n)，空间 O(m)。

### 方法三：双指针（推荐）

**思路**：用指针 `p` 从 `headA` 出发，指针 `q` 从 `headB` 出发。当 `p` 到达末尾时转到 `headB`，当 `q` 到达末尾时转到 `headA`。如果两条链表相交，它们会在交点相遇；如果不相交，会同时到达 `None`。

```python
class Solution:
    def getIntersectionNode(self, headA: ListNode, headB: ListNode) -> ListNode:
        p, q = headA, headB
        while p is not q:
            p = p.next if p else headB
            q = q.next if q else headA
        return p
```

**说明**：走过的路程是 `a + c + b` 和 `b + c + a`，长度相等，时间 O(m+n)，空间 O(1)。

---

## 完整代码实现

```python
class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

class Solution:
    """
    160. 相交链表 - 双指针法

    核心思想：
    两个指针分别遍历两条链表，走到末尾后跳到另一条链表的头。
    走过的总路程都是 a + b + c，必在交点相遇。

    时间复杂度：O(a + b)
    空间复杂度：O(1)
    """

    def getIntersectionNode(self, headA: ListNode, headB: ListNode):
        p, q = headA, headB
        while p is not q:
            p = p.next if p else headB
            q = q.next if q else headA
        return p
```

---

## 示例推演

设链表 A：`4 -> 1 -> 8 -> 4 -> 5`（a = 2，c = 3）
设链表 B：`5 -> 6 -> 1 -> 8 -> 4 -> 5`（b = 3，c = 3）

**p 的路径**：4 -> 1 -> **8** -> 4 -> 5 -> (None) -> 5 -> 6 -> 1 -> **8**
**q 的路径**：5 -> 6 -> 1 -> **8** -> 4 -> 5 -> (None) -> 4 -> 1 -> **8**

两者都在走了 8 步后在节点 **8** 相遇。

**无交点时**：
p 走 `a + b` 步后变为 None
q 走 `b + a` 步后也变为 None
同时到达 None，返回 None

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力枚举 | O(m * n) | O(1) | 双重遍历 |
| 哈希表 | O(m + n) | O(m) | 空间换时间 |
| 双指针（推荐） | O(m + n) | O(1) | 简洁且高效 |

---

## 易错点总结

- **比较引用而不是值**：相交指的是同一个节点对象，不能用 `val` 比较。
- **跳转方向要对**：当指针走到末尾时应跳到**另一条**链表的头节点（`headB` / `headA`）。
- **无交点也能终止**：如果没有交点，两个指针会先后走完两条链表，最终同时变为 `None` 并退出循环。

---

## 扩展思考

### 如果链表有环怎么办？

需要先判断是否有环，以及环的位置，情况会更复杂。

### 如何只遍历一次就求出交点？

双指针法本质上已经是单次遍历的最优解法了。

## 相关题目

- [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle/)
- [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/)
- [19. 删除链表的倒数第 N 个结点](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/)
