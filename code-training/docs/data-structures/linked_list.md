---
title: 链表
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-03-23
---

# 链表

> [几道常见的链表算法题 | JavaGuide](https://javaguide.cn/cs-basics/algorithms/linkedlist-algorithm-problems.html)

## 知识点概述

链表通过指针连接节点，支持高效插入删除，但随机访问较慢。

**链表（LinkedList）** 虽然是一种线性表，但是并不会按线性的顺序存储数据，使用的不是连续的内存空间来存储数据。链表的插入和删除操作的复杂度为 O(1)，只需要知道目标位置元素的上一个元素即可。但是，在查找一个节点或者访问特定位置的节点的时候复杂度为 O(n)。

使用链表结构可以克服数组需要预先知道数据大小的缺点，链表结构可以充分利用计算机内存空间，实现灵活的内存动态管理。但链表不会节省空间，相比于数组会占用更多的空间，因为链表中每个节点存放的还有指向其他节点的指针。除此之外，链表不具有数组随机读取的优点。

### Python中的链表操作

在Python中，对链表的所有操作本质都是对**引用（指针）**的操作。只有`ListNode()`构造函数的调用才会创建新节点。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

### 时间复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 访问 | O(n) | 访问特定位置的元素需要遍历 |
| 插入删除 | O(1) | 必须知道插入元素的位置，无需移动其他元素 |

## 链表分类

1. **单链表**：每个节点只包含指向下一个节点的指针
2. **双向链表**：每个节点包含指向前驱和后继的指针
3. **循环链表**：尾节点指向头节点，形成环
4. **双向循环链表**：双向链表 + 循环结构

## 循环条件选择

链表遍历的循环条件选择：

| 循环条件 | 能访问到的节点 | 核心目标 | 适用场景 | 安全前提 |
|---------|--------------|---------|---------|---------|
| `while node` | 所有节点（含最后一个） | 处理每个节点本身 | 遍历打印、统计节点数、查找目标值 | 无需额外校验 |
| `while node.next` | 仅到倒数第二个节点 | 处理节点的后继 | 找尾节点、尾部插入、删除最后一个节点 | 需先校验`if not node` |
| `while node.next.next` | 仅到倒数第三个节点 | 处理节点的后继的后继 | 快慢指针判环/找中点、删除倒数第二个节点 | 需先校验`node and node.next` |

## 常见考点

- 快慢指针
- 反转与合并
- 环检测

## 核心操作

**考点 → 代码对照**（下文所有代码都在回应上方的"常见考点"与"循环条件选择"）：

| 常见考点 | 对应代码 | 核心技术 |
|---------|---------|---------|
| 反转 | `reverseList` / `reverseBetween` | 三指针（pre / cur / nxt），`while cur` |
| 合并 | `sortList` 的 `merge` | 哨兵节点 dummy |
| 快慢指针 | `find_middle` / `find_kth_from_end` | 同速或倍速前进 |
| 环检测 | `hasCycle` / `detectCycle` | Floyd 判圈，`while fast and fast.next` |

### 反转链表

```python
# 反转整个链表
# 三指针：cur 指向当前要处理的节点，pre 是已反转部分的头，tmp 暂存后继
def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
    cur = head
    pre = None          # 已反转链表的头，初始为空
    while cur:          # 对应循环条件表中的 while node：处理每个节点本身
        tmp = cur.next  # 1. 先保存后继，否则下一步会丢失
        cur.next = pre  # 2. 反转：当前节点的 next 指向前一个
        pre = cur       # 3. pre 前移
        cur = tmp       # 4. cur 前移
    return pre          # 循环结束时 pre 即原链表最后一个节点 = 新链表头

# 反转链表的中间部分（第left到right个节点）
def reverseBetween(self, head: Optional[ListNode], left: int, right: int) -> Optional[ListNode]:
    p0 = dummy = ListNode(next=head)  # 哨兵节点：避免 left=1 时找不到前驱的特判
    # 移动p0到left的前一个节点
    for _ in range(left - 1):
        p0 = p0.next

    pre = None
    cur = p0.next
    # 反转区间内的节点（内部仍是三指针套路）
    for _ in range(right - left + 1):
        nxt = cur.next
        cur.next = pre
        pre = cur
        cur = nxt

    # 连接反转后的链表
    p0.next.next = cur   # 反转后的尾（原区间第一个节点）接上 right 之后的链表
    p0.next = pre        # left 的前驱接上反转后的头
    return dummy.next
```

### 链表相加

```python
def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode], carry=0) -> Optional[ListNode]:
    # 递归：每层处理一位，carry 传递进位
    if l1 is None and l2 is None:
        return ListNode(carry) if carry else None  # 两表都空：只剩进位则建节点
    if l1 is None:
        l1, l2 = l2, l1  # 保证 l1 非空，只需维护一条链，简化代码
    carry += l1.val + (l2.val if l2 else 0)  # l2 可能为空，按 0 处理
    l1.val = carry % 10                      # 当前位 = 求和后取个位
    l1.next = self.addTwoNumbers(l1.next, l2.next if l2 else None, carry // 10)  # 递归下一位，carry//10 为进位
    return l1
```

### 归并排序

```python
def sortList(self, head: ListNode) -> ListNode:
    if not head or not head.next:
        return head

    # 找到中点（快慢指针）
    # slow 从 head 起步、fast 从 head.next 起步 → 偶数长度时取"左中"点
    def find_mid(head):
        slow, fast = head, head.next
        while fast and fast.next:   # 对应循环条件表 while node.next.next 一类（fast 走两步）
            slow = slow.next
            fast = fast.next.next
        return slow

    # 拆分链表
    mid = find_mid(head)
    right_head = mid.next
    mid.next = None          # 断开成左右两段（关键！否则递归无法终止）

    # 递归排序
    left = self.sortList(head)
    right = self.sortList(right_head)

    # 合并两个有序链表
    return self.merge(left, right)

def merge(self, l1: ListNode, l2: ListNode) -> ListNode:
    dummy = ListNode(0)      # 哨兵节点：统一 head 为空的处理
    cur = dummy
    while l1 and l2:         # 双指针：谁小接谁
        if l1.val < l2.val:
            cur.next = l1
            l1 = l1.next
        else:
            cur.next = l2
            l2 = l2.next
        cur = cur.next
    cur.next = l1 if l1 else l2   # 剩余部分整体接上
    return dummy.next
```

### 双指针技巧

```python
# 找链表中点（快慢指针，slow 每次走1步，fast 每次走2步）
def find_middle(head):
    slow = fast = head
    while fast and fast.next:   # fast 走两步，需保证 fast 和 fast.next 都非空
        slow = slow.next
        fast = fast.next.next
    return slow

# 找倒数第n个节点（同速双指针：fast 先走 n 步，再一起走到尾部）
def find_kth_from_end(head, n):
    fast = slow = head
    for _ in range(n):
        fast = fast.next       # fast 先走 n 步，与 slow 拉开 n 个身位
    while fast:                # 对应循环条件表 while node：fast 走到 None 时
        slow = slow.next       # slow 恰好在倒数第 n 个节点
        fast = fast.next
    return slow
```

### 环检测（Floyd 判圈）

对应"常见考点：环检测"。核心思想：快指针走 2 步、慢指针走 1 步，若链表有环则两者必然在环内相遇。

```python
# 判断链表是否有环
def hasCycle(self, head: Optional[ListNode]) -> bool:
    slow = fast = head
    while fast and fast.next:   # 对应循环条件表 while node.next.next 一类：fast.next.next 需 fast、fast.next 非空
        slow = slow.next        # 慢指针走 1 步
        fast = fast.next.next   # 快指针走 2 步
        if slow == fast:        # 相遇 → 说明有环
            return True
    return False                # fast 走到末尾（None）→ 无环

# 找到环的入口节点（在 hasCycle 基础上多了"阶段二"）
def detectCycle(self, head: Optional[ListNode]) -> Optional[ListNode]:
    slow = fast = head
    # 阶段一：先判断是否有环，并记录相遇点
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            break               # 相遇，slow/fast 指向环内某点
    else:
        return None             # 无环（while 正常结束走 else 分支）

    # 阶段二：slow 回到头节点，两指针同速前进
    # 数学结论：从相遇点与从头节点同时同速出发，再次相遇处即环入口
    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next
    return slow
```

> **为什么阶段二能找出环入口？** 设头到环入口距离 a，环内相遇点距入口 b，环长 L。
> 相遇时快指针走了 `2(a+b)`，慢指针走了 `a+b`，且 `2(a+b) - (a+b) = a+b` 是环长的整数倍。
> 让 slow 回到头、两指针同速（每次 1 步）再走 a 步，fast 恰好也绕回环入口，二者相遇于入口。

> **两种中点写法别混淆**：
> - 归并排序里 `slow, fast = head, head.next` → 偶数长度时返回**左中**点（方便拆成两半）
> - 双指针模板里 `slow = fast = head` → 偶数长度时返回**右中**点
> 判断回文/找中点时用后者，拆分链表时用前者。

## 循环条件选择（实战对照）

上方"循环条件选择"表格中的三种条件，在本页各核心操作中的实际用法如下：

```python
# 1. while node —— 处理每个节点本身
#    用到的地方：reverseList、find_kth_from_end 的第二个循环
def traverse_all(head):
    node = head
    while node:            # node 为 None 时结束，能访问到最后一个节点
        process(node)
        node = node.next

# 2. while node.next —— 停在最后一个节点（找尾 / 尾部插入 / 删除末节点）
#    注意安全前提：先判空，否则空链表会报错
def append_to_tail(head, val):
    if not head:               # 空链表单独处理
        return ListNode(val)
    node = head
    while node.next:           # 停在最后一个节点（node.next 为 None）
        node = node.next
    node.next = ListNode(val)  # 尾部插入
    return head

# 3. while node.next.next —— 快指针走两步（快慢指针 / 判环 / 找中点）
#    安全前提：先判 node 和 node.next 非空，否则 fast.next.next 会报错
#    用到的地方：find_middle、hasCycle、sortList 里的 find_mid
def find_mid(head):
    if not head or not head.next:   # 安全前提
        return head
    slow = fast = head
    while fast and fast.next:       # 等价于"fast.next 存在，且 fast.next.next 可访问"
        slow = slow.next
        fast = fast.next.next
    return slow
```

> **三者区别一句话**：`while node` 能处理最后一个节点本身；`while node.next` 恰好**停在**最后一个节点（处理其"后继"）；`while node.next.next` 让指针能访问"后继的后继"（快指针的走法）。

## 如何区分链表 vs 数组

**本质区别是内存是否连续分配，以及是否需要指针拼接。**

链表相对数组的主要优势是**内存的动态利用**，所以尽量不要用数组辅助去做链表题。

| 特性 | 数组 | 链表 |
|------|-----|------|
| 内存分配 | 连续 | 非连续 |
| 随机访问 | O(1) | O(n) |
| 插入删除 | O(n) | O(1) |
| 适用场景 | 频繁访问 | 频繁增删 |
