---
title: 队列
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-27
---

# 队列

## 定义

队列（queue）是两端开放的线性结构：**enqueue** 在队尾进入、**dequeue** 从队头离开，顺序关系是**先进先出（FIFO, First In First Out）**。栈只保留「最近发生的事情」，队列保留的是**到达顺序本身**——这是它与栈的语义差。

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| enqueue（队尾） | O(1) | |
| dequeue（队头） | O(1) | 用 deque 或循环数组；用 list.pop(0) 则是 O(n) |
| 查询队头 / 队尾 | O(1) | |
| 随机访问 / 查找 | O(n) | 不是队列的本职 |

队列的典型用户是**广度优先搜索**（逐层扩散，见[图](graph.md)与[二叉树](binary_tree.md)的层序遍历），以及一切「按到达顺序处理」的场景（打印机任务、消息队列、线程池任务）。

## 实现：deque，不是 list

```python
from collections import deque

q = deque()
q.append(1)          # 入队（队尾）
q.append(2)
front = q[0]         # 看队头
q.popleft()          # 出队（队头弹出），O(1)

# 反例：list.pop(0) 是 O(n)——出队一次全体元素前移一位
```

`collections.deque` 底层是「块状双向链表」，两端操作都是 O(1)——Python 的 BFS 模板因此永远写 `deque` 而不写 `list.pop(0)`。

## 队列家族

| 种类 | 进出限制 | 关系 |
|------|---------|------|
| 普通队列 | 队尾进、队头出 | 本文主角 |
| 循环队列 | 同上，数组实现挂在环上 | 普通队列的数组版优化 |
| 双端队列 deque | 两端都可进出 | 栈与队列的统一容器 |
| 优先队列 | 出队按优先级而非到达顺序 | 底层是[堆](heap.md) |

### 循环队列

数组实现的普通队列有一个已知缺陷——**假溢出**：出队只动 front 指针不搬元素，数组前端被空出的位永远空着；rear 到达数组末尾就「满了」，而实际可用空间还剩很多。解法是下标取模成环：

```python
class MyCircularQueue:
    def __init__(self, k: int):
        self.buf = [0] * k
        self.cap = k
        self.size = 0        # 当前元素个数：判空判满的唯一依据
        self.front = 0       # 队头下标
        self.rear = 0        # 下一个入队位置（队尾再往右一格）

    def enQueue(self, value: int) -> bool:
        if self.isFull():
            return False
        self.buf[self.rear] = value
        self.rear = (self.rear + 1) % self.cap   # 走到末尾就回 0
        self.size += 1
        return True

    def deQueue(self) -> bool:
        if self.isEmpty():
            return False
        self.front = (self.front + 1) % self.cap
        self.size -= 1
        return True

    def Front(self) -> int:
        return self.buf[self.front] if self.size else -1

    def Rear(self) -> int:
        return self.buf[(self.rear - 1) % self.cap] if self.size else -1

    def isEmpty(self) -> bool:
        return self.size == 0

    def isFull(self) -> bool:
        return self.size == self.cap
```

判空与判满必须区分开——循环结构上 `front == rear` 两种状态都可能是（一空一满）。两种标准解法：**记录 size**（本版采用）或**牺牲一个格子**（front 永不放元素，`front == (rear+1) % k` 即满）。容量 3 演算（入 1、2、3，出一次，入 4）：

```text
初始        rear=0 front=0 size=0
enQueue(1)  buf[0]=1, rear=1, size=1
enQueue(2)  buf[1]=2, rear=2, size=2
enQueue(3)  buf[2]=3, rear=(3)%3=0（绕回）, size=3
deQueue()   front=1, size=2
enQueue(4)  buf[0]=4, rear=1, size=3
→ 队头 buf[1]=2，队尾 buf[0]=4
```

`(rear - 1) % cap` 而不是 `rear - 1` 的原因正在这一步：rear 已绕回为 0，走势得负下标。对应题 [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)。

### 双端队列与单调队列

deque 两端都能进出——只用右端即栈、右进左出即队列。它的「独有题型」是**单调队列**（见下）。deque 其它 API：`appendleft` `pop`（右端出）`rotate(k)` `extend`、`maxlen` 上限。

### 优先队列

出队不看到达时间、看优先级——底层是堆（见[堆](heap.md)），从使用者视角是「自动按优先级排序的出队结构」。

## 题型一：单调队列（滑动窗口最大值，239）

单调队列是一支特殊的双端队列：队内（存**下标**，对应值）从队头到队尾单调递减，从而**队头永远挂着当前窗口的最大值**。维护规则顺着不变量来：

1. **新元素入队前，把队尾所有对应值 ≤ 它的下标弹掉**：那些下标更早、值又不大，在未来的任何窗口里都不可能再成为最大值
2. **队头下标滑出窗口就 popleft**
3. **窗口成形后，数字即 `nums[q[0]]`**

```python
from collections import deque

def maxSlidingWindow(nums, k):
    q = deque()                    # 存下标，值从队头到队尾递减
    res = []
    for i, x in enumerate(nums):
        while q and nums[q[-1]] <= x:
            q.pop()
        q.append(i)
        if q[0] <= i - k:          # 队头已滑出窗口
            q.popleft()
        if i >= k - 1:
            res.append(nums[q[0]])
    return res
```

`nums=[1,3,-1,-3,5,3]`、`k=3` 的演化：

```text
i=0 (1)：队空直接进            q=[0]
i=1 (3)：1 ≤ 3 被弹           q=[1]
i=2 (-1) 进                    q=[1,2]     窗口成，输出 nums[1]=3
i=3 (-3) 进                    q=[1,2,3]   输出 3
i=4 (5)：3、-1、-3 顺序弹      q=[4]       输出 5
i=5 (3) 进                     q=[4,5]     输出 5
res = [3, 3, 5, 5]
```

复杂度 O(n)：每个下标入队、出队各至多一次（与单调栈同一笔账）。弹出条件 `<=` / `<` 的选择跟「相同值的新旧下标哪个进队伍」相关，通常写 `<=`——旧下标先被挤出、队头不会卡在已出窗口旧最大上。

## 题型二：用队列实现栈（225）

双队列法：push 时把新元素放进空队列，再把主队列原样倒灌过去，最后交换——新元素始终在队头，pop 是 O(1)。并集对应方向相反（用栈实现队列，见[栈](stack.md)）：「倒灌一次换 O(1) 的 pop」。单队列也可以实现（push 时先加新后把旧 n−1 个出队再入队）：

```python
# 单队列版：push O(n)，其余 O(1)
class MyStack:
    def __init__(self):
        self.q = deque()
    def push(self, x):
        self.q.append(x)
        for _ in range(len(self.q) - 1):   # 把新元素转到队头
            self.q.append(self.q.popleft())
    def pop(self):
        return self.q.popleft()
    def top(self):
        return self.q[0]
```

## 易错点总结

- **list.pop(0) 当出队**：O(n)，BFS 数据一多直接卡
- **循环队列 `front == rear` 一把判满空**：必须选「记 size」或「留空格」其中一种并写死
- 队尾取值忘负下标取模：`rear - 1` 绕回为负时 IndexError
- 单调队列弹出条件 `<=` 写成 `<`（或反反之）会让队头误卡旧值
- 需要按优先级出队时仍硬用 FIFO：该换[优先队列](heap.md)时就换
- deque 的 `maxlen` 会自动淘汰队头（或队尾），默认容量、未设上限是两种行为

## 相关题目

- [225. 用队列实现栈](https://leetcode.cn/problems/implement-stack-using-queues/)
- [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)
- [933. 最近的请求次数](https://leetcode.cn/problems/number-of-recent-calls/)
- [239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)

## 相关知识点

- [栈](stack.md)——互模拟的另一路
- [堆](heap.md)——优先队列的底层
- [广度优先搜索模式](../patterns/bfs.md)——队列的最大使用方
