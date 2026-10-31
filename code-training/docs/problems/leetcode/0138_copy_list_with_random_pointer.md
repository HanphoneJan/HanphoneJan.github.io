---
title: 138. 随机链表的复制
platform: LeetCode
difficulty: Medium
id: 138
url: https://leetcode.cn/problems/copy-list-with-random-pointer/
tags:
  - 链表
  - 哈希表
topics: []
patterns:
  - ../../patterns/hash_map.md
date_added: 2026-04-03
date_reviewed: []
---

# 0138. 随机链表的复制

## 题目描述

给你一个长度为 `n` 的链表，每个节点包含一个额外增加的随机指针 `random`，该指针可以指向链表中的任何节点或空节点。

构造这个链表的 **深拷贝**。深拷贝应该正好由 `n` 个 **全新** 节点组成，其中每个新节点的值都设为其对应的原节点的值。新节点的 `next` 指针和 `random` 指针也都应指向复制链表中的新节点，并使原链表和复制链表中的这些指针能够表示相同的链表状态。**复制链表中的指针都不应指向原链表中的节点**。

## 示例

**示例 1：**
```
输入：head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
输出：[[7,null],[13,0],[11,4],[10,2],[1,0]]
```

**示例 2：**
```
输入：head = [[1,1],[2,1]]
输出：[[1,1],[2,1]]
```

---

## 解题思路

### 真正的难点：`random` 可能指向一个还没造出来的副本

如果只有 `next`，一遍循环就够：边遍历边造节点，顺手把上一个节点接上来。

`random` 把这条路堵死了：示例 1 里第 3 个节点 `11` 的 `random` 指向最后一个节点 `1`。如果边遍历边接线，复制到 `11` 的时候，`1` 的副本根本还不存在，没有任何东西可以指。

所以必须先让**所有**副本都存在，再统一接线。剩下的唯一问题变成：

> 拿到一个原节点，怎么立刻找到它的副本？

两种答案，就是下面两种解法：用哈希表记下来，或者把这份对应关系**编码进原链表本身**。

### 方法一：哈希表，两遍遍历

第一遍只造节点、登记「原节点 → 副本」，一根指针都不接；第二遍拿着表把 `next` 和 `random` 一次接完。

```python
class Solution:
    def copyRandomList(self, head: 'Node') -> 'Node':
        if not head:
            return None

        old_to_new = {}
        cur = head
        while cur:                                   # 第一遍：只造节点
            old_to_new[cur] = Node(cur.val)
            cur = cur.next

        cur = head
        while cur:                                   # 第二遍：查表接线
            old_to_new[cur].next = old_to_new.get(cur.next)
            old_to_new[cur].random = old_to_new.get(cur.random)
            cur = cur.next
        return old_to_new[head]
```

两处细节：

- **字典的键是节点对象本身**，不是下标。节点没有编号，`random` 指过来的是一个引用，只有对象身份能当句柄；Python 的默认哈希就是按身份算的，正好拿来用。
- **用 `.get` 而不是 `[...]`**：链表尾节点的 `next` 是 `None`，`random` 也可能是 `None`，`old_to_new[None]` 会抛 `KeyError`。`dict.get(None)` 恰好返回默认值 `None`，与「副本的这一头也是空」完全对应。

### 方法二：交错链表，把映射藏进 `next`

哈希表存的是「原节点 → 副本」。这份对应关系其实可以被原链表自己表达：**在每个原节点后面插入它的副本**，于是

> `p.next` 就是 `p` 的副本。

映射不需要查表，一次 `next` 就拿到了。代码分三遍：

```python
class Solution:
    def copyRandomList(self, head: 'Node') -> 'Node':
        if not head:
            return None

        # 1. 在每个原节点后面插入它的副本：p.next 就是 p 的副本
        cur = head
        while cur:
            cur.next = Node(cur.val, cur.next)
            cur = cur.next.next

        # 2. 原节点 p 的 random 指向 q，副本的 random 就指向 q 的副本 q.next
        cur = head
        while cur:
            if cur.random:
                cur.next.random = cur.random.next
            cur = cur.next.next

        # 3. 拆成两条链，同时把原链表恢复原样
        dummy = tail = Node(0)
        cur = head
        while cur:
            tail.next = cur.next            # 副本接到新链上
            cur.next = cur.next.next        # 原链表跳过副本，恢复原样
            cur = cur.next
            tail = tail.next
        return dummy.next
```

三遍各自对应一次「已经知道什么」：

- **第 1 遍**：`cur.next = Node(cur.val, cur.next)` 把副本塞在原节点和它的后继之间，原链表长度瞬间翻倍，但两条链仍然串在一起。这一步之后 `p.next` 就是副本，`p.next.next` 是原来的 `p.next`。
- **第 2 遍**：`cur.random` 指向 `q`，那么 `q` 的副本就是 `q.next`，也就是 `cur.random.next`。**这一行是整个解法最漂亮的地方** —— 上一遍建立的交错结构让「找副本」退化成两次属性访问。
- **第 3 遍**：交错链其实有两条，一原一副。`tail.next = cur.next` 把副本摘出来接到新链上；`cur.next = cur.next.next` 把原节点直接连到原来的后继，恢复输入。两个指针各自走一条链，一遍拆完。

`if cur.random` 这个判断不能省：示例 1 第 1 个节点 `7` 的 `random` 就是 `None`，`None.next` 直接抛异常。

### 两种写法怎么选

| | 哈希表 | 交错链表 |
|---|---|---|
| 额外空间 | `O(n)` 的字典 | `O(1)`（只多几个指针） |
| 是否改动输入 | 不改 | 临时改动，最后一遍恢复 |
| 出错风险 | 低，两个循环各自独立 | 高，第 3 遍的指针顺序一步错就乱套 |
| 适合场合 | 默认写法、输入可能被别处共享 | 面试官明确要求 `O(1)` 额外空间 |

面试里哈希表版是安全牌：逻辑分两段，互不干扰，改坏了也只影响一个指针。交错版省下的是一份 `O(n)` 字典，代价是三次遍历、以及「输入被临时改写」这个副作用 —— 如果原链表在别处还有引用（多线程、或者调用方之后还要用），中间那一刻它是不合法的。本题的三遍都在函数内部完成，所以这个风险可以接受。

---

## 完整代码实现

```python
class Node:
    def __init__(self, x: int, next: 'Node' = None, random: 'Node' = None):
        self.val = int(x)
        self.next = next
        self.random = random

class Solution:
    """
    138. 随机链表的复制 - 交错链表法

    核心思想：
    通过在原链表中插入复制节点，隐式建立原节点和复制节点的对应关系，
    无需额外哈希表即可 O(1) 空间完成复制。

    时间复杂度：O(n)
    空间复杂度：O(1)（除结果外）
    """

    def copyRandomList(self, head: 'Node') -> 'Node':
        if not head:
            return None

        # 步骤1：复制节点，插入到原节点后面
        cur = head
        while cur:
            cur.next = Node(cur.val, cur.next)
            cur = cur.next.next

        # 步骤2：设置复制节点的 random
        cur = head
        while cur:
            if cur.random:
                cur.next.random = cur.random.next
            cur = cur.next.next

        # 步骤3：分离链表
        dummy = Node(0)
        tail = dummy
        cur = head
        while cur:
            copy = cur.next
            tail.next = copy
            cur.next = copy.next
            cur = cur.next
            tail = tail.next

        return dummy.next
```

第二段是哈希表版，同样可以直接提交：

```python
class Solution:
    def copyRandomList(self, head: 'Node') -> 'Node':
        if not head:
            return None

        old_to_new = {}
        cur = head
        while cur:
            old_to_new[cur] = Node(cur.val)
            cur = cur.next

        cur = head
        while cur:
            old_to_new[cur].next = old_to_new.get(cur.next)
            old_to_new[cur].random = old_to_new.get(cur.random)
            cur = cur.next
        return old_to_new[head]
```

---

## 示例推演

以示例 1 的 `[[7,null],[13,0],[11,4],[10,2],[1,0]]` 为例。五个节点按顺序记作 `A(7)`、`B(13)`、`C(11)`、`D(10)`、`E(1)`，副本记作 `A'`、`B'`…，下标从 0 起。

**先列出 random 的映射表**（这是全文最该记住的一张表）：

| 节点 | 下标 | `random` 指向 | 下标 | 副本的 `random` 应该是 |
|---|---|---|---|---|
| `A(7)` | 0 | `null` | — | `null` |
| `B(13)` | 1 | `A` | 0 | `A'` |
| `C(11)` | 2 | `E` | 4 | `E'` |
| `D(10)` | 3 | `C` | 2 | `C'` |
| `E(1)` | 4 | `A` | 0 | `A'` |

注意 `B` 的 `random` 指向**前面**的节点，`C` 的指向**最后**的节点 —— 两个方向都有，这正是「一遍扫过去接不上」的原因。

**第 1 遍：插入副本**。`cur.next = Node(cur.val, cur.next)`，交错之后是一条 10 个节点的链：

```text
A → A' → B → B' → C → C' → D → D' → E → E' → None
```

此时 `A.next = A'`、`A'.next = B`，原链表的相邻关系都还在，只是中间插了一层。

**第 2 遍：设副本的 random**。`cur.next.random = cur.random.next`，逐个走原节点（`cur = cur.next.next` 每次跳两个）：

| 步骤 | `cur` | `cur.random` | `cur.random.next` | 写入 |
|---|---|---|---|---|
| 1 | `A` | `None` | — | 跳过（`if cur.random` 挡住），`A'.random = null` |
| 2 | `B` | `A` | `A'` | `B'.random = A'` |
| 3 | `C` | `E` | `E'` | `C'.random = E'` |
| 4 | `D` | `C` | `C'` | `D'.random = C'` |
| 5 | `E` | `A` | `A'` | `E'.random = A'` |

第 1 步如果不跳过，`None.next` 直接抛 `AttributeError`。

**第 3 遍：拆分**。每轮做四件事，这里把 `tail.next = copy` / `cur.next = copy.next` 两行拆开看：

| 轮次 | `cur` | `copy = cur.next` | `tail.next = copy` | `cur.next = copy.next` | 新链 |
|---|---|---|---|---|---|
| 1 | `A` | `A'` | `dummy → A'` | `A.next = B` | `A'` |
| 2 | `B` | `B'` | `A'.next = B'` | `B.next = C` | `A'→B'` |
| 3 | `C` | `C'` | `B'.next = C'` | `C.next = D` | `A'→B'→C'` |
| 4 | `D` | `D'` | `C'.next = D'` | `D.next = E` | `A'→B'→C'→D'` |
| 5 | `E` | `E'` | `D'.next = E'` | `E.next = None` | `A'→B'→C'→D'→E'` |

一轮结束时 `cur = cur.next`（已经是被恢复的原链表后继），`tail = tail.next`（刚接上的副本）。原链表恢复成 `A → B → C → D → E → None`，返回的副本链是 `A' → B' → C' → D' → E'`。

**对照输出**：副本的 `random` 依次是 `null`、`A'`（下标 0）、`E'`（下标 4）、`C'`（下标 2）、`A'`（下标 0），序列化成 `[[7,null],[13,0],[11,4],[10,2],[1,0]]`，与示例的输出一致。

**示例 2 只有两个节点**：`A(1)` 与 `B(2)`，两个节点的 `random` 都指向下标 1（也就是 `B`）—— `A` 的 `random` 指向后面的节点，`B` 的指向自己。第 1 遍后是 `A → A' → B → B'`；第 2 遍给 `A'` 和 `B'` 都写 `B'`；第 3 遍拆出 `A'→B'`。两种「不好接」的形态（往后指、指向自己）都在这两行数据里。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐节点重新查找 random | O(n²) | O(1) | 每复制一个节点都要再遍历一遍原链表找它 |
| 哈希表映射 | O(n) | O(n) | 两遍遍历，字典存 n 条「原 → 新」 |
| 交错链表（最优） | O(n) | O(1) | 三遍遍历，映射信息就藏在原链表的 `next` 里 |

> 三行的时间都按最坏情况给；两行的 `O(1)` 空间不计返回的副本链本身。

---

## 易错点总结

1. **第 2 遍漏掉 `if cur.random`**：直接写 `cur.next.random = cur.random.next`。示例 1 的第 1 个节点 `7` 的 `random` 就是 `null`，第一轮循环立刻抛 `AttributeError: 'NoneType' object has no attribute 'next'`。
2. **拆分时漏掉 `cur.next = copy.next`**：只把副本接进新链，没恢复原链表。下一轮 `cur = cur.next` 就走到**副本**上了，于是展开的是 `A'→B→B'→C→…`，示例 1 返回 **9 个节点**而不是 5 个，且原链表仍是被改写的状态。
3. **哈希表版用下标访问 `old_to_new[cur.next]`**：链表尾节点的 `next` 和若干 `random` 都是 `None`，`old_to_new[None]` 抛 `KeyError: None`；示例 1 走完最后一个节点时必然触发，改成 `old_to_new.get(...)` 即可。

---

## 相关题目

- [133. 克隆图](https://leetcode.cn/problems/clone-graph/)
- [148. 排序链表](https://leetcode.cn/problems/sort-list/)
