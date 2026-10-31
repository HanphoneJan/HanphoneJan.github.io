---
title: 328. 奇偶链表
platform: LeetCode
difficulty: Medium
id: 328
url: https://leetcode.cn/problems/odd-even-linked-list/
tags:
  - 链表
  - 双指针
topics: []
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

### 判定标准：按「位置」重新排列，而不是按值

题目要求保留每个节点在**位置**上的奇偶性：第 1、3、5… 个节点属于奇链，第 2、4、6… 个属于偶链，两条链内部都保持原有先后顺序，最后把奇链的尾巴接上偶链的头。

这与节点值毫无关系 —— `[2,1,3,5,6,4,7]` 的奇链是 `2,3,6,7`，值的大小完全乱序。所以整份代码里不会出现任何比较，只有指针搬运。

`O(1)` 的额外空间是硬约束：不能新建节点、不能开数组存节点引用，只能改现有的 `next` 指针。这也决定了下面两种写法的共同形状 —— 都是「把节点挑出来、按奇偶接到两条链上」。

### 方法一：两个哑节点，把节点一个个摘下来挂到链尾

准备两条空链（各用一个哑节点占位），遍历原链表，按位置奇偶把当前节点挂到对应链尾，最后把偶链接在奇链之后。

```python
from typing import Optional

class Solution:
    def oddEvenList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        odd_dummy, even_dummy = ListNode(0), ListNode(0)
        odd_tail, even_tail = odd_dummy, even_dummy

        cur, idx = head, 0
        while cur:
            nxt = cur.next                # 先存后继：挂到新链后 cur.next 会被改写
            idx += 1
            if idx % 2 == 1:
                odd_tail.next = cur
                odd_tail = cur
            else:
                even_tail.next = cur
                even_tail = cur
            cur = nxt

        even_tail.next = None             # 偶链尾部必须断开，否则接回奇链会成环
        odd_tail.next = even_dummy.next
        return odd_dummy.next
```

两个哑节点是常数个对象，额外空间仍然是 `O(1)`，时间 `O(n)`。它的好处是「一行只做一件事」：读到 `odd_tail.next = cur` 就知道这一步在往奇链上挂节点，不需要在脑子里同时维护两条链的走向。坏处是循环里每个节点都要做一次取模判断，并且末尾那行 `even_tail.next = None` 一漏就写出环。

### 方法二：原地改 `next`，让两条链在原来的链上「长出来」

不建哑节点。让 `odd` 与 `even` 各自沿原链往前走，每一步把对方的下一个节点「跳过」：

- `odd.next` 指向 `even.next`：奇链跳过当前的偶数位节点；
- `odd` 前进一步；
- `even.next` 指向 `odd.next`：偶链跳过当前的奇数位节点；
- `even` 前进一步。

```python
from typing import Optional

class Solution:
    def oddEvenList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if not head or not head.next:
            return head                   # 空链表或单节点，无需重排

        odd, even = head, head.next
        even_head = even                  # 偶链的头，最后要接在奇链尾部

        while even and even.next:         # even.next 为空说明没有下一个奇数位了
            odd.next = even.next
            odd = odd.next
            even.next = odd.next
            even = even.next

        odd.next = even_head              # 奇链尾 -> 偶链头
        return head
```

循环条件 `even and even.next` 是这段代码的全部安全边界，两个合取项各管一件事：

- `even` 不为 `None`，才能写 `odd.next = even.next`；
- `even.next` 不为 `None`，才能保证 `odd` 在刚移动后不是 `None`（下一句 `even.next = odd.next` 要用它）。

`even_head` 是另一个不能省的变量：`even` 会一直往前走到 `None`，走完之后再也拿不到偶链的头了。

两种写法都满足 `O(1)` 额外空间，不是「谁替代谁」：方法一像「分拣」，方法二像「就地重排」。方法二循环更短、不开哑节点，是这道题的标准答案；方法一每一步都更容易单独检查，面试时先写它、再说明「哑节点可以省掉」，是很稳的顺序。

## 完整代码实现

下面这段是本题的基准实现（页面上的「跑样例」与逐帧可视化回放的也是它）。`ListNode` 在力扣上由评测环境提供，这里保留定义是为了让代码能在本机直接跑起来。

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

方法一的「哑节点 + 尾指针」版本见上一节，两者输出相同，只是指针操作的组织方式不同。

## 示例推演

### 以 `head = [1,2,3,4,5]` 为例

初始：`odd -> 1`、`even -> 2`、`even_head -> 2`，原链 `1 -> 2 -> 3 -> 4 -> 5`。

**第一轮**（`even = 2`，`even.next = 3`，条件成立）：

| 语句 | 执行后 |
|---|---|
| `odd.next = even.next` | `1 -> 3`，`1` 不再指向 `2` |
| `odd = odd.next` | `odd -> 3` |
| `even.next = odd.next` | `2 -> 4`，`2` 不再指向 `3` |
| `even = even.next` | `even -> 4` |

此时奇链 `1 -> 3`，偶链 `2 -> 4 -> 5`（`5` 还没被摘走）。

**第二轮**（`even = 4`，`even.next = 5`，条件成立）：

| 语句 | 执行后 |
|---|---|
| `odd.next = even.next` | `3 -> 5` |
| `odd = odd.next` | `odd -> 5` |
| `even.next = odd.next` | `4 -> None`（此时 `5.next` 是 `None`） |
| `even = even.next` | `even -> None` |

奇链 `1 -> 3 -> 5`，偶链 `2 -> 4 -> None`。

**收尾**：`even` 已是 `None`，`while even and even.next` 不成立，退出循环。执行 `odd.next = even_head` 后 `5 -> 2`。

最终 `1 -> 3 -> 5 -> 2 -> 4 -> None`，与示例一致。

### 再验一个例子：`head = [2,1,3,5,6,4,7]`

按位置分：奇数位（第 1、3、5、7 个）是 `2, 3, 6, 7`，偶数位（第 2、4、6 个）是 `1, 5, 4`。方法二跑完后 `head` 仍是奇链头 `2`，奇链尾 `7` 接上 `even_head = 1`，得到 `2 -> 3 -> 6 -> 7 -> 1 -> 5 -> 4`，与示例输出一致。

这个例子能看清「保序」的意思：偶链的 `1, 5, 4` 在原链里的先后顺序被原样保留，而不是按值排序。

### 边界：空链表与单节点

`head = []` 时 `head.next` 会抛 `AttributeError: 'NoneType' object has no attribute 'next'`，所以 `if not head` 这一半必须留。

`head = [1]` 时即使不提前返回也不会出错：`even = None`，循环不执行，`odd.next = even_head = None` 恰好还原成原样。`or not head.next` 只是让这种情况少走几步。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 哑节点重挂 | O(n) | O(1) | 逐节点摘挂，两个哑节点是常数个对象 |
| 原地跳跃（最优） | O(n) | O(1) | 不新建节点，只改 `next` 指针 |

## 易错点总结

1. **循环条件只写 `while even`**：丢掉 `and even.next` 后，偶数长度的链表会在 `even = None` 时继续进循环 —— `odd.next = even.next` 让 `odd` 变成 `None`，紧接着的 `even.next = odd.next` 直接抛 `AttributeError: 'NoneType' object has no attribute 'next'`。`head = [1,2]` 就能复现：两个节点时 `even` 是真值，而 `even.next` 是 `None`。
2. **没有保存 `even_head`，收尾时用 `head.next` 拼**：此时 `head.next` 早被改成了第 3 个节点（`1 -> 3`），`odd.next = head.next` 会把奇链的尾巴接回奇链中间，形成 `1 -> 3 -> 5 -> 3 -> …` 的环。力扣上会报「链表中存在环」或直接超时，本地打印则永远打不完。
3. **方法一漏掉 `even_tail.next = None`**：`[1,2,3,4,5]` 里节点 `4` 的 `next` 仍然指着 `5`，把奇链头 `2` 接到 `5` 之后，就得到 `5 -> 2 -> 4 -> 5` 的环。

---

## 相关题目
- [725. 分隔链表](https://leetcode.cn/problems/split-linked-list-in-parts/)
- [86. 分隔链表](https://leetcode.cn/problems/partition-list/)
- [234. 回文链表](https://leetcode.cn/problems/palindrome-linked-list/)
