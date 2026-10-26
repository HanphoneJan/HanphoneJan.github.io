---
title: 链表
category: 数据结构
difficulty_range: [简单, 较难]
last_updated: 2026-10-26
---

# 链表

## 一句话理解

**链表是一串「按位接力的指针」**：每个节点只带自己的值和一个「下一个节点在哪」的指针。找元素只能从链头顺着指针一个个摸过去，这既是它慢的原因，也是它快的理由——**插入删除不需要搬动任何其他元素**，改两个指针即可。

现实模型是寻宝游戏：每张卡片写「下一个线索在哪」。想插一张新卡片？只能从第一张顺着走到插入处；但一旦走到位，把前后两张卡的「下一个」改一下就完事，不用搬动别人。

## 与数组对看（面试必考的对比题）

| | 数组 | 链表 |
|---|---|---|
| 随机访问 | O(1)（下标直接算地址） | O(n)（只能顺指针爬） |
| 头部插入/删除 | O(n)（全体后移） | O(1) |
| 中间插入/删除 | O(n) | 定位 O(n) + 修改 O(1) |
| 内存 | 连续，CPU 缓存友好 | 分散，每个节点多一个指针域 |
| 大小 | 静态（或扩容拷贝） | 天然动态 |

**记忆的抓手是「慢在访问、快在穿插」**：读多写少、按位置存取 → 数组；频繁头插/中插、长度不定 → 链表。

## 核心特性与复杂度

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| 访问第 i 个 | O(n) | 没有「直接跳过去」的通道 |
| 头部插入/删除 | O(1) | 拿链表最擅长的动作 |
| 尾部插入 | O(n) / O(1) | 无尾指针 O(n)，带尾指针或用 tail 变量 O(1) |
| 搜索 | O(n) | 线性扫描 |
| 反转整个链表 | O(n) | 三个指针走一遍 |

## 套路一：dummy 哨兵——链表题的第一把钥匙

> 链表题 80% 的「特判第一个节点」都是 dummy 能免掉的。**先建一个假节点挂在真链头前面，最后返回 `dummy.next`**——对头节点的删/插变成了对中间节点的删/插，代码统一。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

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

为什么这么值钱：删除头节点要改的是「指向 head 的那个外部变量」，删除中间节点要改的是「前一个节点的 next」——两种逻辑在没 dummy 时是两套代码。dummy 让头也变成「某个节点（dummy）的后继」，一套代码全覆盖。相关题：[203. 移除链表元素](https://leetcode.cn/problems/remove-linked-list-elements/)、[19. 删除倒数第 N 个](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/)、[146. LRU 缓存](../problems/leetcode/0146_lru_cache.md)。

## 套路二：三指针反转——白板手写第一题

反转是链表的「第一道白板题」：面试让现场写一段代码时，十次里三次写它，因为**能否一行行不乱，直接暴露指针操作的基本功**。

```python
def reverseList(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next        # 1. 先记住后面（不然断了找不回）
        cur.next = prev       # 2. 掉头指向前面
        prev = cur            # 3. prev 前进到当前
        cur = nxt             # 4. cur 前进到刚才记住的后面
    return prev               # prev 停在原来的最后一个 = 新的链头
```

**手推一遍** `1 → 2 → 3`：

```text
初始   prev=None  cur=1
第1轮  nxt=2      1.next=None    prev=1  cur=2      链：None ← 1   2 → 3
第2轮  nxt=3      2.next=1       prev=2  cur=3      链：None ← 1 ← 2   3
第3轮  nxt=None   3.next=2       prev=3  cur=None   链：None ← 1 ← 2 ← 3
循环退出，返回 prev=3
```

四步里**唯一容易漏的是第 1 步**：不先存 `nxt`，改完 `cur.next` 整条后半链就找不回来了。「会断的绳先记号头」是画图都讲不清的肌肉记忆。

**扩展形态**只改两处边界：
- **反转一部分**（92）：用 dummy 定位 left 的前驱，把区间内反转完再接回去
- **K 个一组反转**（25）：每组调用「区间反转」，组数不足 K 的尾巴保持原样——链表题里的「困难档守门员」

相关题：[206. 反转链表](../problems/leetcode/0206_reverse_linked_list.md)、[92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii/)、[25. K 个一组翻转链表](../problems/leetcode/0025_reverse_nodes_in_k_group.md)。

## 套路三：快慢指针——一把尺子量长度

两根指针从同一根链出发、**按不同步频前进**，间距就是可编程的：

| 用途 | 步频 | 结果 |
|------|------|------|
| 找中点 | fast ×2 / slow ×1 | fast 到尾时 slow 正在中间 |
| 判环 | 同起始、fast ×2 | fast 追上 slow = 有环（[141](../problems/leetcode/0141_linked_list_cycle.md)） |
| 环的入口（[142](../problems/leetcode/0142_linked_list_cycle_ii.md)） | 相遇后再设一个从链头走 ×1 的指针 | 两个 ×1 指针再次相遇处 = 入口 |
| 删倒数第 N 个 | fast 先走 n 步再双 ×1 | fast 到尾时 slow 停在倒数第 N+1 = 要删的前驱 |
| 求交点（[160](../problems/leetcode/0160_intersection_of_two_linked_lists.md)） | 两指针走完自己的走对方的，步数对齐 | 在相交点会师 |

**142 的「相遇后走第二步」必须会推导，这是链表题最常被要求口述的证明**：

```text
设链头到环入口距离 = a，入口到相遇点距离 = b，环周长 = c。
slow 走 a + b；fast 走 a + b + k*c（多绕了 k 圈，k ≥ 1）。
fast 速度是 slow 两倍 → a + b + k*c = 2(a + b)
→ a + b = k*c
→ a = k*c - b
意思：从「链头」走 a 步 = 从「相遇点」继续走 (k*c - b) 步 —— 同一个终点（环入口）。
所以让两个 ×1 指针分别从链头与相遇点出发，走一步对一步，再次相遇的地方就是入口。
```

推导的核心是那句 `a = k*c - b`，它说明「从链头走 a 步」和「从相遇点再走 b 的补数若干圈」是同一终止点，这就是「第二次相遇即在入口」的全部数学。

## 套路四：归并——链表的合并操作

**合并两条有序链表（21）**：dummy + 尾插，谁小挂谁——链表版的 mergesort 原子操作：

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
    tail.next = l1 or l2      # 没比完的那条整段接上
    return dummy.next
```

**K 条升序链表合并（23）**：两条两两合并是 O(kN)，**K 条丢进小顶堆**每次弹出全局最小的链头是 O(N log k)——链表与[堆](heap.md)在这里交会（堆里放 `(节点值, 节点)` 元组比较）。

## 套路五：判环与判重

- **判环**：快慢指针（141）或哈希集合存「见过的节点」（O(n) 空间）——后者思路普适（无穷链、数组、字符串都能用），前者省空间
- **删除有序链表的重复**：83（留一个）/ 82（全删）——82 的「重复一个不留」比 83 难一档：要**先看下一段还有没有重复、再决定当前删不删**，回改的是前驱的指针，必须用 dummy 提前固定位

## 易错点总结

- **改指针前丢了后半链**：反转、断链都要「先存 `nxt` 再改 next」
- **忘了 dummy，特判写崩**：删除头节点、在头前插入必须单独分支，代码一长就漏——一律先 dummy
- **判空只判一层**：操作 `cur.next.next` 前要先确认 `next` 还存在，两层才合规
- 指针赋值的顺序写反：`tail.next, l1 = l1, l1.next` 这种「先接再走」的元组赋值比拆两行更不容易错
- O(1) 的「尾部插入」默认依赖 tail 指针：无尾指针的单链表是 O(n)，选型时要说明
- Python 没有真正「对象即节点」的差别——`None` 代表空指针，所有判空都是 `if not p`，都逃不过「丢了 next」类 bug

## 相关题目

- [206. 反转链表](../problems/leetcode/0206_reverse_linked_list.md)
- [21. 合并两个有序链表](../problems/leetcode/0021_merge_two_sorted_lists.md)
- [141. 环形链表](../problems/leetcode/0141_linked_list_cycle.md) / [142. 环形链表 II](../problems/leetcode/0142_linked_list_cycle_ii.md)
- [146. LRU 缓存](../problems/leetcode/0146_lru_cache.md)

## 相关知识点

- [堆](heap.md)——K 路合并的工具侧
- [数组](array.md)——与链表对看的另一半
- [双向指针](../patterns/two_pointers.md)——快慢指针同源

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把链表换成你自己的，逐步看每一帧里
prev、cur、nxt 三个指针怎么走。反转的每一步都在这条小动画里。