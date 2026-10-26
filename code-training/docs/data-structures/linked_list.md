---
title: 链表
category: 数据结构
difficulty_range: [简单, 较难]
last_updated: 2026-10-27
---

# 链表

## 定义

链表（linked list）是一组节点（node）组成的线性集合，每个节点持有两个成员：值 `val` 与指向后继节点的指针 `next`。与数组不同，节点在内存中不要求连续，元素之间的唯一顺序关系就是指针本身。只有一个 `next` 方向的是单链表；同时持有 `prev` 与 `next` 两个指针的是双向链表；尾节点指回头节点则构成环。

它支持的操作抽象为一个接口：

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| 访问第 i 个元素 | O(n) | 唯一途径是从链头沿 `next` 逐个移动 |
| 头部插入 / 删除 | O(1) | 一两次指针赋值 |
| 中间插入 / 删除（已定位前驱） | O(1) | 同上 |
| 定位前驱节点本身 | O(n) | 单链表拿不到前驱，只能从头走 |
| 尾部插入 | O(n) 或 O(1) | 未维护尾指针 O(n)；维护 tail 或用双向链表 O(1) |
| 搜索 | O(n) | 线性扫描 |

链表与数组是同一接口（线性序列）的两种实现，复杂度恰好互补：

| | 数组 | 链表 |
|---|---|---|
| 随机访问 | O(1)（下标算地址） | O(n) |
| 头部插入 / 删除 | O(n)（全体后移） | O(1) |
| 中间删除（已定位） | O(n)（全体前移） | O(1) |
| 缓存友好性 | 连续内存，好 | 节点分散，差 |
| 长度 | 静态或扩容拷贝 | 天然动态 |

选型依据就是这张表：按位置读多、写少 → 数组；在头部或中部频繁增删、总长不可预知 → 链表。工程上的双向链表（如 LRU 缓存）额外换来 O(1) 的「已知节点处删除」——单链表删除要 O(n) 找前驱，双向链表 `node.prev` 一步到位。

## 节点定义（LeetCode Python 口径）

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

Python 里 `None` 就是空指针，所有判空都写 `if not p`。指向节点的变量持有的是引用，set 用不上、dict 做去重时通常也不可用——这是后续「哈希判重」要用 `id` 或集合存「见过的节点」的原因。

## 技法一：dummy 哨兵节点

**问题**：删除头节点要改的是「指向 `head` 的那个外部变量」，删除其余节点要改的是「前一个节点的 `next`」。两种情况在没有出门面时是两套分支，边界一多必漏。

**做法**：先建一个假节点挂在真链头前面，操作完返回 `dummy.next`。于是所有节点（包括原来的头）都有了显式前驱，一套代码全覆盖。

```python
def removeElements(head, val):
    dummy = ListNode(0, head)
    cur = dummy
    while cur.next:
        if cur.next.val == val:
            cur.next = cur.next.next   # 跳过 = 删除
        else:
            cur = cur.next
    return dummy.next
```

凡涉及「可能修改头节点」的操作——删除、区间反转、K 个一组反转——一律先挂 dummy；代价只有 O(1) 空间。相关题：[203. 移除链表元素](https://leetcode.cn/problems/remove-linked-list-elements/)、[19. 删除倒数第 N 个](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/)、[146. LRU 缓存](../problems/leetcode/0146_lru_cache.md)。

## 技法二：三指针反转

反转是链表操作的基本功，要点是**先存后改**：改掉 `cur.next` 之前必须把后半段记下来。

```python
def reverseList(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next        # 1. 先存后继，不然这一改就断链
        cur.next = prev       # 2. 掉头指向已反转的前缀
        prev = cur            # 3. prev 前进
        cur = nxt             # 4. cur 前进到刚才存下的后继
    return prev               # 循环结束时 prev 停在原尾节点 = 新链头
```

不变量是循环开始时：`prev` 是 `cur` 之前的所有节点组成的已反转链头，`cur` 及其后仍保持原顺序。每次迭代把 `cur` 从未处理段搬进已反转段，未处理段逐个清空后 `cur = None`，返回 `prev`。`1 → 2 → 3` 的演化：

```text
初始   prev=None  cur=1
第1轮  nxt=2      1.next=None    prev=1  cur=2     None ← 1   2 → 3
第2轮  nxt=3      2.next=1       prev=2  cur=3     None ← 1 ← 2   3
第3轮  nxt=None   3.next=2       prev=3  cur=None  None ← 1 ← 2 ← 3
```

四步里最容易漏的是第 1 步。变形只改边界：反转一部分（92，dummy 定位 `left` 前驱、反转区间后接回）；K 个一组反转（25，每组套区间反转、不足 K 的尾巴保持原样）。相关题：[206](../problems/leetcode/0206_reverse_linked_list.md)、[92](https://leetcode.cn/problems/reverse-linked-list-ii/)、[25](../problems/leetcode/0025_reverse_nodes_in_k_group.md)。

## 技法三：快慢指针

两根指针从同一位置出发，按不同移动规则前进，使它们之间的相对位置（间距、步频比、是否相遇）成为可计算的量：

| 需求 | 规则 | 结论 |
|------|------|------|
| 找中点 | fast 每走 2 步、slow 走 1 步 | fast 到尾时 slow 在中点 |
| 判环（141） | 同起点，fast ×2 / slow ×1 | 有环则 fast 必在环上追上 slow；无环则 fast 先到 `None` |
| 定位环入口（142） | 相遇后另设一个 ×1 指针从链头出发 | 与 slow（改 ×1）再次相遇处即入口 |
| 删倒数第 N 个 | fast 先走 n 步，再两根同步走 | fast 到尾时 slow 在倒数第 N+1 个（要删节点的前驱） |
| 两链交点（160） | A 到头改走 B，B 到头改走 A | 两指针步数对齐，在交点会师 |

142 的推导是这一族的样板，`a = k*c - b` 是全部关键：

```text
设链头到环入口的边数 = a，入口到相遇点的边数 = b，环周长 = c。
slow 走了 a + b；fast 走了 a + b + k*c（多绕了 k 圈，k ≥ 1）。
fast 速度是 slow 的两倍 → a + b + k*c = 2(a + b)
→ a + b = k*c
→ a = k*c - b
```

`a = k*c - b` 说明：从链头走 a 步，与从相遇点出发走 b 的补数（再绕整数圈）抵达**同一个终点**——环入口。于是两根 ×1 指针分别从链头与相遇点同步前进，重合处就是入口。

判环也可以用哈希集合存「见过的节点」（O(n) 空间）：思路普适（无环假设不成立广义上都能用），快慢指针胜在 O(1) 空间。

## 技法四：合并（mergesort 的原子操作）

合并两条有序链表（21）：沿两条链的链头取更小者接尾。**21 的对应题力扣口径是按值比较**，结尾把没比完的那条整段接上：

```python
def mergeTwoLists(l1, l2):
    dummy = ListNode()
    tail = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next, l1 = l1, l1.next
        else:
            tail.next, l2 = l2, l2.next
        tail = tail.next
    tail.next = l1 or l2      # 剩下的整段直接挂上
    return dummy.next
```

`tail.next, l1 = l1, l1.next` 这种「先接后移」的元组赋值是约定俗成写法。K 条升序链表合并（23）两条两两归并是 O(kN)（k 条、总长 N）；K 个链头放进小顶堆（见[堆](heap.md)）每次弹全局最小是 O(N log k)，堆里放 `(节点值, 节点)` 元组即可比较。

## 易错点总结

- **改指针前丢了后半链**：反转、断链都要「先存 `nxt` 再改 `next`」，这是链表题第一 bug
- 忘挂 dummy：涉及修改头节点的操作靠特判硬撑，分支漏判——一律先 dummy
- 操作 `cur.next.next` 前未确认 `cur.next` 非空：判空判到一层，访问一层
- 尾部插入想当然按 O(1) 报：不维护尾指针的单链表尾部插入是 O(n)
- 142 只写判定不写推导：本文那几步是链表最常要求口述的证明，顺 `a + b = k*c` 写
- 遍历中节点接成环（手工改 `next` 出错）会让 `while cur` 永不退出——调试时先把「逐个移动指针」写成显式四步，避免手滑把已经断开的链又接回去

## 相关题目

- [206. 反转链表](../problems/leetcode/0206_reverse_linked_list.md)
- [21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)
- [141. 环形链表](../problems/leetcode/0141_linked_list_cycle.md) / [142. 环形链表 II](../problems/leetcode/0142_linked_list_cycle_ii.md)
- [146. LRU 缓存](../problems/leetcode/0146_lru_cache.md)

## 相关知识点

- [堆](heap.md)——K 路合并的排序部件
- [数组](array.md)——同一接口的另一种实现，复杂度互补
- [双指针](../patterns/two_pointers.md)——快慢指针同源

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把链表换成你自己的，逐帧观察
prev、cur、nxt 三个指针如何在反转过程中移动。
