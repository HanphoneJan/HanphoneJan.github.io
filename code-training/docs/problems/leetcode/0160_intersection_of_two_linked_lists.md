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
  - ../../patterns/two_pointers.md
  - ../../patterns/hash_map.md
date_added: 2026-04-03
date_reviewed: []
---

# 160. 相交链表

## 题目描述

给你两个单链表的头节点 `headA` 和 `headB`，请你找出并返回两个单链表相交的起始节点。如果两个链表不存在相交节点，返回 `null`。

题目数据**保证**整个链式结构中不存在环。函数返回结果后，链表必须**保持其原始结构**。

评测方式比较特殊：系统按 `intersectVal`（交点值，无交点时为 0）、`listA`、`listB`、`skipA`、`skipB` 建好两条链，`skipA` 是从 `listA` 头节点走到交点经过的节点数（`skipB` 同理），再把两个头节点传给你的函数。

**提示：**

- `listA` 中节点数目为 `m`，`listB` 中节点数目为 `n`
- `1 <= m, n <= 3 * 10^4`
- `1 <= Node.val <= 10^5`
- `0 <= skipA <= m`，`0 <= skipB <= n`
- 没有交点时 `intersectVal` 为 0；有交点时 `intersectVal == listA[skipA] == listB[skipB]`

**进阶：** 能否做到时间复杂度 O(m + n)、只用 O(1) 内存？

## 示例

### 示例 1

**输入：** intersectVal = 8, listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], skipA = 2, skipB = 3

**输出：** Intersected at '8'

**解释：** 两条链在值为 8 的节点上合并。注意交点不是值为 1 的那个节点——A 里第二个节点和 B 里第三个节点值都是 1，但它们是两个不同的对象；值为 8 的节点才是同一个人。

### 示例 2

**输入：** intersectVal = 2, listA = [1,9,1,2,4], listB = [3,2,4], skipA = 3, skipB = 1

**输出：** Intersected at '2'

**解释：** A 中交点前有 3 个节点，B 中交点前有 1 个节点。

### 示例 3

**输入：** intersectVal = 0, listA = [2,6,4], listB = [1,5], skipA = 3, skipB = 2

**输出：** No intersection

**解释：** 两条链不相交，返回 `null`。

## 解题思路

这道题只有一件事容易想错：**「相交」说的是同一个节点对象，不是值相等**。把这一点钉住之后，剩下的问题只是「两条链不一样长，怎么让两个指针同时到达交点」。做法是让两个指针都把两条链各走一遍——路程一样长，自然同时到。

### 先看「值一样」为什么不算相交

示例 1 里 A 是 `4 → 1 → 8 → 4 → 5`，B 是 `5 → 6 → 1 → 8 → 4 → 5`。第 2 个节点（A 的 `1`）和第 3 个节点（B 的 `1`）值相同，但它们是两次 `ListNode(1)` 造出来的两个对象，`next` 也各走各的。

从值为 8 的节点起，两条链共用同一段内存——A 的第三个节点就是 B 的第四个节点。所以判定只能写 `p is q`（比较对象身份）。写成 `p.val == q.val` 并不会「更宽松一点」：示例 1 里 A 的 `1` 和 B 的 `1` 并不在同一轮出现，两个指针错开之后一路走到空指针。

### 长度差怎么办：让两个指针走同一条「路」

设交点之前 A 有 `a` 个节点、B 有 `b` 个节点，交点之后共用的部分是 `c` 个节点。指针 `p` 从 `headA` 出发，走完 A 就接到 `headB`；指针 `q` 从 `headB` 出发，走完 B 就接到 `headA`。两条路都是「自己那条链 + 对方那条链」，所以到任何一个节点所需的步数相同，交点当然同时到达。

```python
p, q = headA, headB
while p is not q:
    p = p.next if p else headB   # 走完 A 就换到 B 的头
    q = q.next if q else headA   # 走完 B 就换到 A 的头
return p
```

换链那一步不需要额外处理：`p` 变成 `None` 之后，下一轮 `p` 为假，直接取 `headB`，接着往下走。

### 不相交时也停得下来

示例 3 里两条链没有公共部分，`c = 0`。两个指针各自走完两条链后先后变成 `None`：`p` 走 `a + b` 步到空，`q` 走 `b + a` 步也到空，步数相同，于是同时停在 `None`，`p is q` 成立，循环退出，返回 `None`。

这是换头写法比「先求长度差再对齐」省事的地方：空指针就是天然的终止条件，不用为「没有交点」单独写一条分支。

### 推演：示例 1 的两个指针

A 的节点记为 `4 → 1 → 8 → 4 → 5`，B 为 `5 → 6 → 1 → 8 → 4 → 5`，两者从 `8` 开始共用。

| 轮次 | `p` 走到 | `q` 走到 |
| --- | --- | --- |
| 初始 | A 的 4 | B 的 5 |
| 1 | A 的 1 | B 的 6 |
| 2 | A 的 8 | B 的 1 |
| 3 | A 的 4 | A 的 8（两条链共用的那个节点） |
| 4 | A 的 5 | A 的 4 |
| 5 | 空 | A 的 5 |
| 6 | B 的 5（A 走完，换到 B 头） | 空 |
| 7 | B 的 6 | A 的 4（B 走完，换到 A 头） |
| 8 | B 的 1 | A 的 1 |
| 9 | A 的 8 | A 的 8 |

第 9 轮两个指针落在同一个对象上，循环退出。注意第 2 轮 `p` 就已经在值为 8 的节点上了，但那时 `q` 还在 B 的 `1` 上——只有「同一个对象、同一时刻」才算相遇。

## 完整代码实现

```python
from typing import Optional


class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None


class Solution:
    def getIntersectionNode(self, headA: ListNode, headB: ListNode) -> Optional[ListNode]:
        # 两个指针各自把两条链各走一遍：路程相同，交点上必然同时到达
        p, q = headA, headB
        while p is not q:
            p = p.next if p else headB   # 走完 A 接到 B 的头
            q = q.next if q else headA   # 走完 B 接到 A 的头
        return p                          # 相交则交点，不相交则 None
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 哈希表存 A 的全部节点 | O(m + n) | O(m) | 先遍历 A 存引用，再遍历 B 找第一个命中 |
| 双指针换头（最优） | O(m + n) | O(1) | 每个指针最多走 m + n 步，只用了两个变量 |

## 易错点总结

### 1. 用值比较代替对象比较

`while p is not q` 换成 `while p.val != q.val`，示例 1 会抛 `AttributeError: 'NoneType' object has no attribute 'val'`：A 的 `1` 和 B 的 `1` 不在同一轮出现，指针错开后有一侧先走到空。示例 2 反而能蒙对（两个 `2` 恰好是同一个节点），所以这个错误在两三个样例上未必暴露。即使真的停在两个值相同的节点上，也可能只是两个值相等的不同对象。

### 2. 循环体里忘了换链

把 `p = p.next if p else headB` 简化成 `p = p.next`，指针在走完 A 之后会执行 `None.next`，示例 1 第 5 轮就抛 `AttributeError: 'NoneType' object has no attribute 'next'`。换链和前进是同一行里的两件事：`p` 非空才前进，空了才换到另一条链的头。

## 扩展思考

- 先求两条链的长度差 `d = |m - n|`，让长的那条先走 `d` 步，再同步前进，也能在交点相遇，同样 O(m + n) / O(1)。区别是它要多遍历一遍求长度，而且「无交点」需要单独判断。
- 若链表可能带环，问题变成「两个带环链表是否相交」，要先用 [141. 环形链表](/code-training/problems/leetcode/141.html) 的 Floyd 判圈把入口找出来，再比较环入口是否相同。
