---
title: 24. 两两交换链表中的节点
platform: LeetCode
difficulty: Medium
id: 24
url: https://leetcode.cn/problems/swap-nodes-in-pairs/
tags:
  - 链表
  - 递归
topics: []
patterns:
  - ../../patterns/recursion.md
date_added: 2026-03-20
date_reviewed: []
---

# 24. 两两交换链表中的节点

## 题目描述

给你一个链表，两两交换其中相邻的节点，并返回交换后链表的头节点。你必须在不修改节点内部的值的情况下完成本题（即，只能进行节点交换）。

**示例：**
```
输入：head = [1,2,3,4]
输出：[2,1,4,3]

输入：head = []
输出：[]

输入：head = [1]
输出：[1]
```

**约束：**
- 链表中节点的数目在范围 `[0, 100]` 内
- `0 <= Node.val <= 100`

---

## 解题思路

### 第一步：理解问题本质

题目要求把相邻的两个节点互换位置，不能修改节点的值，只能改变指针指向。

以 `1 -> 2 -> 3 -> 4` 为例，目标是 `2 -> 1 -> 4 -> 3`。

观察规律：节点 1 和 2 互换，节点 3 和 4 互换，每对之间的关系相同。因此，关键在于**如何正确地交换一对节点，同时维护好前后连接**。

### 方法一：交换节点值（不符合题意，仅作对比）

题目要求**不能修改节点值，只能交换节点本身**。如果允许修改值，可以直接交换相邻节点的 `val`：

```python
class Solution:
    def swapPairs(self, head):
        cur = head
        while cur and cur.next:
            cur.val, cur.next.val = cur.next.val, cur.val
            cur = cur.next.next
        return head
```

该方法虽然简短，但违反题意，不能作为本题解法。

### 方法二：递归（交换节点指针）

**思路**：对于当前头节点 `head` 和 `head.next`，先将 `head.next` 设为 `swapPairs(head.next.next)` 的返回值，再将 `head` 接到 `head.next` 后面，最后返回原来的 `head.next`（新的头节点）。

```python
class Solution:
    def swapPairs(self, head):
        if not head or not head.next:
            return head
        new_head = head.next
        head.next = self.swapPairs(new_head.next)
        new_head.next = head
        return new_head
```

**说明**：递归能清晰地表达「每两两一组」的分治思路，代码简洁。

### 方法三：迭代（交换节点指针，推荐）

**思路**：用哑节点 `dummy`，用指针 `cur` 指向每对节点的前驱。对于每一对 `(first, second)`，通过调整 `cur.next`、`first.next`、`second.next` 三个指针完成交换，再将 `cur` 移到交换后的这对末尾 `first`。

**交换一对的三步操作（`cur -> first -> second -> next`）：**
1. `cur.next = second`：让前驱指向第二个节点
2. `first.next = second.next`：让第一个节点指向原先第二个节点之后的链表
3. `second.next = first`：让第二个节点指向第一个节点

操作后结构变为 `cur -> second -> first -> next`，`cur` 移动到 `first`，继续处理下一对。

```python
class Solution:
    def swapPairs(self, head: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        cur = dummy

        while cur.next and cur.next.next:
            first = cur.next
            second = cur.next.next

            cur.next = second
            first.next = second.next
            second.next = first

            cur = first

        return dummy.next
```

**说明**：迭代版不依赖递归栈，且能直接复用节点，符合题目「只能交换节点本身」的要求。

---

## 完整代码实现

```python
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def swapPairs(self, head: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0, head)  # 哑节点，next 指向链表头
        cur = dummy

        while cur.next and cur.next.next:
            first = cur.next        # 这一对的第一个节点
            second = cur.next.next  # 这一对的第二个节点

            # 三步完成交换
            cur.next = second           # step 1: cur 指向 second
            first.next = second.next    # step 2: first 接上 second 后面的节点
            second.next = first         # step 3: second 指向 first

            # cur 移到下一对的前驱位置（first 是交换后这对的末尾）
            cur = first

        return dummy.next  # 哑节点的 next 才是真实头节点
```

---

## 示例推演

以 `head = [1, 2, 3, 4]` 为例，逐步追踪：

**初始状态：**
```
dummy(0) -> 1 -> 2 -> 3 -> 4
cur = dummy
```

**第 1 次循环：** `cur.next=1`，`cur.next.next=2`，均非空，进入循环
```
first = 节点1，second = 节点2

step 1: cur.next = second     → dummy -> 2 -> ...
step 2: first.next = second.next = 节点3  → 1 -> 3 -> 4
step 3: second.next = first   → 2 -> 1 -> 3 -> 4

完整链表：dummy -> 2 -> 1 -> 3 -> 4
cur = first = 节点1
```

**第 2 次循环：** `cur.next=3`，`cur.next.next=4`，均非空，进入循环
```
first = 节点3，second = 节点4

step 1: cur.next = second     → 节点1 -> 4 -> ...
step 2: first.next = second.next = None  → 3 -> None
step 3: second.next = first   → 4 -> 3 -> None

完整链表：dummy -> 2 -> 1 -> 4 -> 3 -> None
cur = first = 节点3
```

**第 3 次检查：** `cur.next=None`，退出循环

返回 `dummy.next`，得到 `[2, 1, 4, 3]`，正确。

**指针变化可视化（第 1 次循环前后）：**
```
交换前：dummy -> [1] -> [2] -> [3] -> [4]
                  ↑      ↑
               first  second

交换后：dummy -> [2] -> [1] -> [3] -> [4]
                         ↑
                        cur（下一对的前驱）
```

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 交换节点值（不符合题意） | O(n) | O(1) | 仅作对比，题目不允许 |
| 递归（交换指针） | O(n) | O(n) | 递归栈深度为 n/2 |
| 迭代（交换指针，推荐） | O(n) | O(1) | 原地修改指针，无额外空间开销 |

---

## 易错点总结

- **三步顺序不能颠倒**：先执行 `second.next = first` 会覆盖 `second.next`，后半截链表直接丢失。
- **`cur` 要移到 `first`**：交换后这对是 `second -> first`，`first` 才是下一对的前驱；移到 `second` 会让第二组开始就接错。
- **循环条件 `cur.next and cur.next.next`**：只判 `cur.next` 时，奇数长度会在最后一对越界。

## 扩展思考

- **K 个一组翻转链表（LeetCode 25）** 是本题的扩展：将每 K 个节点为一组进行翻转，而不是每 2 个。本题是 K=2 的特例。掌握本题的迭代思路，有助于理解题目 25 的通用做法。
- **递归 vs 迭代：** 递归写法简洁，体现了"问题分解"的思想；迭代写法高效，体现了"原地操作"的思想。两种思维方式在链表题中都非常重要，建议两种都能熟练写出。
- **哑节点（Dummy Node）技巧：** 本题和题目 21、23 都用到了哑节点。这是链表题的通用技巧：当头节点可能发生变化时（比如头节点参与交换、删除），引入哑节点可以统一处理逻辑，避免对头节点的特殊判断。
