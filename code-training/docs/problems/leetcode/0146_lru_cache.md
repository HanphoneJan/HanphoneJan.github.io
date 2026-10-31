---
title: 146. LRU 缓存
platform: LeetCode
difficulty: Medium
id: 146
url: https://leetcode.cn/problems/lru-cache/
tags:
  - 设计
  - 哈希表
  - 链表
  - 双向链表
topics: []
patterns:
  - ../../patterns/hash_map.md
date_added: 2026-04-03
date_reviewed: []
---

# 0146. LRU 缓存

## 题目描述

请你设计并实现一个满足 [LRU (最近最少使用) 缓存](https://baike.baidu.com/item/LRU) 约束的数据结构。

实现 `LRUCache` 类：

- `LRUCache(int capacity)` 以 **正整数** 作为容量 `capacity` 初始化 LRU 缓存
- `int get(int key)` 如果关键字 `key` 存在于缓存中，则返回关键字的值，否则返回 `-1` 。
- `void put(int key, int value)` 如果关键字 `key` 已经存在，则变更其数据值 `value` ；如果不存在，则向缓存中插入该组 `key-value` 。如果插入操作导致关键字数量超过 `capacity` ，则应该 **逐出** 最久未使用的关键字。

函数 `get` 和 `put` 必须以 `O(1)` 的平均时间复杂度运行。

## 示例

**示例：**
```
输入
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
输出
[null, null, null, 1, null, -1, null, -1, 3, 4]

解释
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // 缓存是 {1=1}
lRUCache.put(2, 2); // 缓存是 {1=1, 2=2}
lRUCache.get(1);    // 返回 1
lRUCache.put(3, 3); // 该操作会使得关键字 2 作废，缓存是 {1=1, 3=3}
lRUCache.get(2);    // 返回 -1 (未找到)
lRUCache.put(4, 4); // 该操作会使得关键字 1 作废，缓存是 {4=4, 3=3}
lRUCache.get(1);    // 返回 -1 (未找到)
lRUCache.get(3);    // 返回 3
lRUCache.get(4);    // 返回 4
```

---

## 解题思路

### 先拆需求：这里缺的是两种不同的能力

`get` 和 `put` 都要 `O(1)`，这条要求同时压在两种能力上：

1. **按 key 定位**：给出 `key` 要立刻拿到它对应的值 —— 这是哈希表的强项，一条 `dict` 就够；
2. **维护「谁最久没用」**：每次命中都要把那个 key 变成「最新用过」，淘汰时又要立刻找到「最久没用」的那个。

哈希表能解决第 1 条，但它**不记录使用顺序**：Python 3.7 起 `dict` 会按插入顺序迭代，可 `get` 一个已有的 key 并不会改变它的位置，给已有的 key 重新赋值也原地不动 —— 要「把某个 key 挪到末尾」得先 `pop` 再插回去（见「扩展思考」里那个纯 `dict` 的写法）。单独一条链表能维护顺序，可按 key 找节点又变成 `O(n)`。

所以必须组合：**哈希表负责「key → 节点」，链表负责「谁新谁旧」**。

### 为什么是双向链表，而不是数组或单向链表

- **数组**：从中间删一个元素要搬动后面的所有元素，`O(n)`；把元素挪到头部同理。
- **单向链表**：知道节点就能删它吗？不能 —— 删除要改**前驱**的 `next`，而单向链表没有指向前驱的指针，只能从头再走一遍。
- **双向链表**：节点自带 `prev` / `next`，只要拿到节点本身，「从原地摘除」和「插到头部」都是常数次指针赋值。

而「拿到节点本身」正是哈希表给的：`key_to_node[key]` 返回节点引用，不是下标、不是值。三件事拼起来，每个操作就是「一次字典查找 + 两次指针改写」。

**判定标准（这题最容易含糊的地方）**：哪些操作算「使用」？

- `get` 命中：算使用，移到最新；
- `put` 一个**已存在**的 key：算使用，更新值并移到最新；
- `put` 一个**不存在**的 key：算新使用，插到最新；插完之后如果 `len > capacity`，才淘汰最旧的那个。

`get` 未命中、以及「容量刚好等于 `capacity`」都不触发淘汰。

### 方法一：哈希表 + 双向链表（头尾两个哨兵）

先摆结构：一个 `head` 哨兵、一个 `tail` 哨兵，中间夹着真正的节点，**从 `head.next` 到 `tail.prev` 就是「从最新到最旧」**。哨兵本身不存数据，只用来消除「空表」「摘的是第一个」「摘的是最后一个」这三类判空。

```python
class Node:
    __slots__ = 'prev', 'next', 'key', 'value'

    def __init__(self, key: int = 0, value: int = 0):
        self.key = key
        self.value = value


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.key_to_node = {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, x: Node) -> None:
        x.prev.next = x.next
        x.next.prev = x.prev

    def _push_front(self, x: Node) -> None:
        x.prev, x.next = self.head, self.head.next
        x.prev.next = x.next.prev = x

    def _touch(self, key: int):
        """命中就返回节点并挪到头部；未命中返回 None。"""
        node = self.key_to_node.get(key)
        if node:
            self._unlink(node)
            self._push_front(node)
        return node

    def get(self, key: int) -> int:
        node = self._touch(key)
        return node.value if node else -1

    def put(self, key: int, value: int) -> None:
        node = self._touch(key)
        if node:
            node.value = value          # 已存在：值更新，位置已由 _touch 挪好
            return
        node = Node(key, value)
        self.key_to_node[key] = node
        self._push_front(node)
        if len(self.key_to_node) > self.capacity:
            old = self.tail.prev        # 最旧的节点
            self._unlink(old)
            del self.key_to_node[old.key]
```

几个关键决策对着代码看：

- `_unlink` 只有两行：让前驱跳过自己、让后继跳过自己。没有哨兵的话，这里要判 `x.prev is None`、`x.next is None`。
- `_push_front` 这两句顺序不能换：**先把 `x.prev` / `x.next` 接好，再让邻居指向 `x`**。顺序反了会把 `x.next` 取成自己（见「易错点」）。基准实现把它拆成了四条赋值，语义完全相同。
- `get` 与 `put` 都走 `_touch`：这保证「命中即更新顺序」只写一遍。`get` 命中之后节点已经在头部，`put` 命中时只需要改 `value`。
- 淘汰放在**插入之后**：先让新 key 进表，再判 `len > capacity`，超了就摘 `tail.prev`。顺序反过来（先腾位置再插入）也对，但两处判断的符号必须跟着换。

### 变体：单哨兵循环链表

把头尾两个哨兵合成一个「自己指向自己」的哨兵 `dummy`：`dummy.next` 是最新，`dummy.prev` 是最旧，空表时 `dummy.next == dummy.prev == dummy`。这样「头部」和「尾部」不是两个变量，而是同一个节点的两个指针，`remove` / `push_front` 各少一行：

```python
def remove(self, x):
    x.prev.next = x.next
    x.next.prev = x.prev

def push_front(self, x):
    x.prev = self.dummy
    x.next = self.dummy.next
    x.prev.next = x
    x.next.prev = x
```

空表时 `self.dummy.next` 就是 `self.dummy` 自己，`push_front` 依然成立；要删的是最后一个节点时，`remove` 也依然成立。这就是「循环哨兵」省掉的判空。「完整代码实现」那一节用的就是这个变体（它与头尾双哨兵完全等价，只是少一个变量）。

### 方法二：`OrderedDict`

Python 的 `collections.OrderedDict` 内部就是「哈希表 + 双向链表」，并且把「移到末尾」「从头部弹出」做成了两个方法：

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.od = OrderedDict()      # 头部 = 最久未用，尾部 = 最近使用

    def get(self, key: int) -> int:
        if key not in self.od:
            return -1
        self.od.move_to_end(key)     # 命中即变成「最近使用」
        return self.od[key]

    def put(self, key: int, value: int) -> None:
        if key in self.od:
            self.od.move_to_end(key)  # 已存在：先调整顺序
        self.od[key] = value
        if len(self.od) > self.capacity:
            self.od.popitem(last=False)   # last=False 表示弹出最旧（头部）
```

两个细节值得记住：

- 对**已存在**的 key 直接赋值 `self.od[key] = value` **不会**改变它的位置，所以命中时必须显式 `move_to_end`；
- `popitem(last=False)` 弹的是头部（最旧），默认的 `last=True` 弹的是尾部（最新），方向反了就成了「淘汰刚用的那个」。

这版十几行就能跑，工程里完全够用。但它依赖标准库的具体实现，面试要求「自己实现一个 LRU」时不能这么写 —— 面试官要看的是链表指针怎么改。

### 两种写法怎么选

| | 哈希 + 双向链表 | `OrderedDict` |
|---|---|---|
| 代码量 | 约 50 行 | 约 15 行 |
| 复杂度 | 三个操作都是 `O(1)` | 同左（`move_to_end` 也是 `O(1)`） |
| 常数 | 纯 Python 指针赋值 | C 实现，更快 |
| 适用 | 面试、需要自己控制结构 | 工程代码、脚本 |

两者的数据结构**一模一样**，区别只是链表指针由谁来改。

---

## 完整代码实现

单哨兵循环链表版（页面上的逐帧可视化回放的也是这一段）：与上文「变体」同一套指针操作，只是把 `remove` / `push_front` 写成类的方法。

```python
class Node:
    """双向链表节点"""
    __slots__ = 'prev', 'next', 'key', 'value'

    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value

class LRUCache:
    """
    146. LRU 缓存 - 哈希表 + 双向链表

    核心思想：
    哈希表实现 O(1) 查找，双向链表维护使用顺序。
    头部是最新使用的，尾部是最久未使用的。

    时间复杂度：get 和 put 都是 O(1)
    空间复杂度：O(capacity)
    """

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.dummy = Node()
        self.dummy.prev = self.dummy
        self.dummy.next = self.dummy
        self.key_to_node = {}

    def get_node(self, key: int):
        if key not in self.key_to_node:
            return None
        node = self.key_to_node[key]
        self.remove(node)
        self.push_front(node)
        return node

    def get(self, key: int) -> int:
        node = self.get_node(key)
        return node.value if node else -1

    def put(self, key: int, value: int) -> None:
        node = self.get_node(key)
        if node:
            node.value = value
            return
        self.key_to_node[key] = node = Node(key, value)
        self.push_front(node)
        if len(self.key_to_node) > self.capacity:
            back_node = self.dummy.prev
            del self.key_to_node[back_node.key]
            self.remove(back_node)

    def remove(self, x: Node) -> None:
        x.prev.next = x.next
        x.next.prev = x.prev

    def push_front(self, x: Node) -> None:
        x.prev = self.dummy
        x.next = self.dummy.next
        x.prev.next = x
        x.next.prev = x
```

---

## 示例推演

容量 `capacity = 2`，按题面的操作序列走一遍。链表一律写成「最新 → 最旧」：

| 操作 | 命中？ | 链表（最新 → 最旧） | 返回 |
|---|---|---|---|
| `put(1, 1)` | 未命中，插入 | `1` | `null` |
| `put(2, 2)` | 未命中，插入 | `2, 1` | `null` |
| `get(1)` | 命中，1 挪到头部 | `1, 2` | `1` |
| `put(3, 3)` | 未命中，插入后超容 | 插入后 `3, 1, 2`，淘汰最旧的 `2` → `3, 1` | `null` |
| `get(2)` | 未命中 | `3, 1` | `-1` |
| `put(4, 4)` | 未命中，插入后超容 | 插入后 `4, 3, 1`，淘汰最旧的 `1` → `4, 3` | `null` |
| `get(1)` | 未命中 | `4, 3` | `-1` |
| `get(3)` | 命中，3 挪到头部 | `3, 4` | `3` |
| `get(4)` | 命中，4 挪到头部 | `4, 3` | `4` |

两次淘汰的差别正是这题的考点：第 4 步淘汰的是 `2` 而不是 `1`，因为第 3 步的 `get(1)` 已经把 `1` 变成「最近使用」；第 6 步淘汰 `1`，是因为它此时确实最久没用。返回序列 `[null, null, null, 1, null, -1, null, -1, 3, 4]` 与题面一致。

注意第 6 步的细节：`put(4, 4)` 是在**插入之后**才判超容的，此时表里有 `4, 3, 1` 三个节点，`len = 3 > 2`，于是摘掉 `dummy.prev`（也就是 `1`）。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 哈希表 + 双向链表（最优） | O(1) | O(capacity) | 一次字典查找 + 常数次指针改写，无均摊 |
| `OrderedDict` | O(1) | O(capacity) | 同一结构的内置实现，常数更小 |

> 两者渐进同阶。标「最优」的这一行是本题要求自己实现的版本；下面那行则是标准库把同一件事做完了。

---

## 易错点总结

1. **淘汰条件的 `>` 写成 `>=`**：`if len(self.key_to_node) > self.capacity` 里的 `>` 换成 `>=`（插入之后判断），容量正好满时就会多淘汰一个。示例第 5 步 `get(2)` 会返回 `2`、第 7 步 `get(1)` 返回 `1`，而它们都应该是 `-1`。
2. **淘汰时只摘链表，忘了删字典**：`self.remove(back_node)` 写了、`del self.key_to_node[back_node.key]` 漏了，被淘汰的 key 还在字典里。示例第 5 步 `get(2)` 返回 `2`，而且这个节点会被 `get_node` 重新插回链表 —— 之后 `get(1)` 也会错误地返回 `1`。
3. **`push_front` 里先改 `self.dummy.next`**：

   ```python
   self.dummy.next = x      # 旧的第一个节点从这里断开
   x.next = self.dummy.next # 拿到的就是 x 自己 -> 自环
   ```

   链表断在 `dummy` 上，`dummy.prev` 仍指向 `dummy`。容量满后第一次淘汰去读 `back_node.key`，拿到的是哨兵的默认 key `0`，直接 `KeyError: 0`。

---

## 扩展思考

- **LFU（460 题）**：要把「按时间排序」换成「按频率分组」。常见做法是「频率 → 该频率下的一条双向链表」，再维护一个当前最小频率，淘汰时去最小频率那一组摘最旧的节点。
- **能不能只用 `dict`**：Python 3.7 起 `dict` 保证按插入顺序迭代，`self.cache.pop(key); self.cache[key] = value` 能把 key 挪到末尾（`pop` 与插入都是均摊 `O(1)`），`next(iter(self.cache))` 取最旧的那个，也能写出几行的 LRU。代价是这个写法完全依赖「迭代顺序 == 插入顺序」这条语言特性，换语言就没了，面试时也看不出你懂链表。

---

## 相关题目

- [460. LFU 缓存](https://leetcode.cn/problems/lfu-cache/)
- [432. 全 O(1) 的数据结构](https://leetcode.cn/problems/all-oone-data-structure/)
