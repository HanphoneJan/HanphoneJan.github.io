---
title: 328. 奇偶链表
platform: LeetCode
difficulty: Medium
id: 328
url: https://leetcode.cn/problems/odd-even-linked-list/
tags:
  - 链表
  - 双指针
topics:
  - ../../topics/linked_list.md
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-04-28
date_reviewed: []
---

# 328. 奇偶链表

## 题目描述

给定单链表的头节点 `head`，将所有索引为奇数的节点和索引为偶数的节点分别组合在一起，然后返回重新排序的链表。

第一个节点的索引被认为是 **奇数**，第二个节点的索引为 **偶数**，以此类推。

请注意，偶数组和奇数组内部的相对顺序应该与输入时保持一致。

你必须在 $O(1)$ 的额外空间复杂度和 $O(n)$ 的时间复杂度下解决这个问题。

## 示例

**示例 1:**
- 输入: `head = [1,2,3,4,5]`
- 输出: `[1,3,5,2,4]`

**示例 2:**
- 输入: `head = [2,1,3,5,6,4,7]`
- 输出: `[2,3,6,7,1,5,4]`

---

## 解题思路

### 第一步：理解问题本质
题目要求根据节点在链表中的**位置序号**（而非节点值）进行分组：
- 奇数位置：第1个、第3个、第5个……
- 偶数位置：第2个、第4个、第6个……

最终需要将奇数链表和偶数链表串联在一起。关键约束是 **O(1) 空间**，这意味着我们不能创建新节点，必须在原链表上修改指针指向。

### 第二步：暴力解法
如果允许使用 $O(n)$ 空间，我们可以创建两个新链表，分别存放奇数位和偶数位的节点，最后连接。但在 $O(1)$ 约束下，这种方法不符合要求。

### 第三步：最优解法（双指针原地重组）
我们使用两个指针 `odd` 和 `even` 来分别构建奇数链表和偶数链表。

1. **初始化**：
   - `odd` 指向第1个节点（`head`）。
   - `even` 指向第2个节点（`head.next`）。
   - 用 `even_head` 保存偶数链表的起点，方便后续拼接。

2. **迭代过程**：
   - 将 `odd.next` 指向 `even.next`（跳过一个偶数位节点，连到下一个奇数位）。
   - 移动 `odd` 指针。
   - 将 `even.next` 指向 `odd.next`（跳过一个奇数位节点，连到下一个偶数位）。
   - 移动 `even` 指针。

3. **拼接**：
   - 迭代结束后，将奇数链表的末尾（`odd.next`）指向偶数链表的头节点（`even_head`）。

---

## 完整代码实现

```python
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def oddEvenList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # 边界情况：空链表或只有一个节点
        if not head or not head.next:
            return head
        
        # 奇数位起点和偶数位起点
        odd = head
        even = head.next
        even_head = even # 用于最后拼接
        
        # 遍历，直到 even 或 even.next 为空
        while even and even.next:
            # 1. 奇数节点连到下一个奇数节点
            odd.next = even.next
            odd = odd.next
            
            # 2. 偶数节点连到下一个偶数节点
            even.next = odd.next
            even = even.next
            
        # 3. 将偶数链表拼接到奇数链表末尾
        odd.next = even_head
        
        return head
```

---

## 示例推演

以 `head = [1, 2, 3, 4, 5]` 为例：

1. **初始化**：
   - `odd` → 1, `even` → 2, `even_head` → 2
   - 链表状态：`1 -> 2 -> 3 -> 4 -> 5`

2. **第一轮迭代**：
   - `odd.next` = 3 (原本是 2), `odd` 移到 3
   - `even.next` = 4 (原本是 3), `even` 移到 4
   - 链表状态：`1 -> 3 -> 4...`, `2 -> 4 -> 5...`

3. **第二轮迭代**：
   - `odd.next` = 5 (原本是 4), `odd` 移到 5
   - `even.next` = None (原本是 5), `even` 移到 None
   - 链表状态：`1 -> 3 -> 5 -> None`, `2 -> 4 -> None`

4. **拼接**：
   - `odd.next` (5 的 next) = `even_head` (2)
   - 最终结果：`1 -> 3 -> 5 -> 2 -> 4 -> None`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 最优解 | $O(n)$ | $O(1)$ | 遍历链表一次，仅使用常数个辅助指针 |

---

## 易错点总结

1. **终止条件**：`while even and even.next` 是为了确保能够跨步移动两个位置。
2. **偶数头节点**：必须预先保存 `even_head`，否则在修改 `odd.next` 时会失去对偶数链表起点的引用。
3. **空链表处理**：注意 `head` 为空或只有一个节点的边界情况。

---

## 扩展思考
这种“按位置拆分链表再合并”的技巧在很多链表题目中都有应用，例如：
- 链表的奇偶分组。
- 将链表按特定步长拆分。
- 判断回文链表时，有时也需要拆分并反转后半部分。

掌握此题的核心在于理解指针的“跳跃”赋值（`odd.next = even.next`）以及对原链表结构的破坏与重构。

---

## 相关题目
- [725. 分隔链表](https://leetcode.cn/problems/split-linked-list-in-parts/)
- [86. 分隔链表](https://leetcode.cn/problems/partition-list/)
- [234. 回文链表](https://leetcode.cn/problems/palindrome-linked-list/)
