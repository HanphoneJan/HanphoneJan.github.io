---
title: 队列
sidebar_position: 5
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-11-19
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

队列的典型用户是**广度优先搜索**（逐层扩散，见[图](graph.md)与[树](tree.md)的层序遍历），以及一切「按到达顺序处理」的场景（打印机任务、消息队列、线程池任务）。

## 结构剖面

队列的数组实现要把「头」和「尾」都变成游标，并且让下标在末尾绕回开头——否则出队一次就得整体前移。

![两个游标在数组上绕圈](/diagrams/queue-ring.png)

`head`（队头，下文代码里叫 `front`）与 `tail`（队尾）各自只朝一个方向走，走到数组末尾就 `% cap` 回到 0。判空判满用 `size` 计数最省事；「留一格不用」也能判，但白少存一个元素。

Python 的 `deque` 走另一条路：不把元素铺在一块数组里，而是每 64 个指针一块，块与块之间双向链接。

![每 64 个槽位一块，块间双向链接](/diagrams/queue-deque-blocks.png)

两端操作因此都是 O(1)（块没满就不申请新块），而按下标取中间元素要跨块走，仍是 O(n)。

## 实现：deque，不是 list

```python
"""deque 的入队、查看、出队。两端操作 O(1)，按下标取中间 O(n)"""
from collections import deque

q = deque()
q.append(1)          # ① 入队：从队尾追加
q.append(2)
front = q[0]         # ② 查队头：只读不动，元素仍在队里
q.popleft()          # ③ 出队：从队头弹出，仍是 O(1)

# 反例：list.pop(0) 是 O(n)——每出队一次，后面的元素全体前移一格
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
"""循环队列：数组 + size 计数。各操作 O(1)，空间 O(k)"""
class MyCircularQueue:
    def __init__(self, k: int):
        self.buf = [0] * k
        self.cap = k
        self.size = 0        # ① 记元素个数：判空判满靠它，不靠两游标相等
        self.front = 0       # 队头下标：出队只挪它，不搬元素
        self.rear = 0        # 下一个入队位置（队尾再往右一格）

    def enQueue(self, value: int) -> bool:
        if self.isFull():
            return False     # ② 满了拒收，不覆盖旧元素
        self.buf[self.rear] = value
        self.rear = (self.rear + 1) % self.cap   # ③ 走到末尾回 0，下标绕成环
        self.size += 1
        return True

    def deQueue(self) -> bool:
        if self.isEmpty():
            return False
        self.front = (self.front + 1) % self.cap  # 只挪游标，被删的值不用返回
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

判空与判满必须分开判：环上 `front == rear` 同时对应「空」和「满」两种状态。两种标准解法——**记 size**（本版采用，多一个整数换掉这层歧义）或**牺牲一个格子**（`front` 那格永不放元素，`front == (rear + 1) % cap` 即满，代价是容量 k 只能存 k−1 个）。

`deQueue` 只挪 `front`、不返回被删的值，不是漏写：LeetCode 622 的接口只要求返回「是否成功」，要取队头由调用方先调 `Front()`（空队列时返回 -1）。

容量 3 演算（入 1、2、3，出一次，入 4）：

```text
初始        rear=0 front=0 size=0
enQueue(1)  buf[0]=1, rear=1, size=1
enQueue(2)  buf[1]=2, rear=2, size=2
enQueue(3)  buf[2]=3, rear=(3)%3=0（绕回）, size=3
deQueue()   front=1, size=2
enQueue(4)  buf[0]=4, rear=1, size=3
→ 队头 buf[1]=2，队尾 buf[0]=4
```

`(rear - 1) % cap` 而不是 `rear - 1` 的原因正在这一步：rear 已经绕回 0，直接减一就成了负下标。对应题 [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)。

### 双端队列与单调队列

deque 两端都能进出——只用右端即栈，右进左出即队列。它的「独有题型」是**单调队列**（见下）。其余常用 API：`appendleft`（左端入）、`pop`（右端出）、`rotate(k)`（整体旋转）、`extend`（右端批量入），以及建队时的 `maxlen` 上限。

### 优先队列

出队不看到达时间、看优先级——底层是堆（见[堆](heap.md)），从使用者视角是「自动按优先级排序的出队结构」。

## 题型一：单调队列（滑动窗口最大值，239）

单调队列是一支特殊的双端队列：队内只存**下标**，下标对应的值从队头到队尾单调递减，于是**队头永远挂着当前窗口的最大值**。维护规则顺着这条不变量来：

1. **新元素入队前，把队尾所有对应值 ≤ 它的下标弹掉**：那些下标更早、值又不大，在未来的任何窗口里都不可能再成为最大值
2. **队头下标滑出窗口就 popleft**
3. **窗口成形后，答案即 `nums[q[0]]`**

```python
"""滑动窗口最大值。O(n)：每个下标至多进队、出队各一次"""
from collections import deque

def maxSlidingWindow(nums, k):
    q = deque()                  # 存下标，下标对应的值从队头到队尾递减
    res = []
    for i, x in enumerate(nums):
        while q and nums[q[-1]] <= x:
            q.pop()              # ① 队尾更小的等不到成为最大值，弹掉
        q.append(i)
        if q[0] <= i - k:
            q.popleft()          # ② 队头已滑出窗口
        if i >= k - 1:
            res.append(nums[q[0]])   # ③ 窗口成形，队头即最大值
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

复杂度 O(n)：每个下标入队、出队各至多一次（与单调栈是同一笔账）。弹出条件写 `<=` 还是 `<`，取决于相等时留新下标还是旧下标——写 `<=` 会把旧下标弹掉、留下新下标，而新下标在窗口里活得更久，队头就不会卡在一个即将过期的最大值上。

## 题型二：用队列实现栈（225）

双队列法：push 时把新元素放进空队列，再把主队列原样倒灌过去，最后交换——新元素始终在队头，pop 是 O(1)。反方向的那道题是「用栈实现队列」（见[栈](stack.md)）：同样是倒灌，只是把「换 O(1) 的 pop」换成了「换 O(1) 的 push」。单队列版更短：push 时先加新元素，再把旧 n−1 个逐个出队重入队，新元素同样被送到队头：

```python
"""用单队列实现栈。push O(n)，pop / top O(1)"""
from collections import deque

class MyStack:
    def __init__(self):
        self.q = deque()

    def push(self, x):
        self.q.append(x)                     # ① 新元素先正常排队尾
        for _ in range(len(self.q) - 1):
            self.q.append(self.q.popleft())  # ② 旧元素逐个搬到队尾，新元素浮到队头

    def pop(self):
        return self.q.popleft()              # 队头就是最后进来的那个

    def top(self):
        return self.q[0]
```

## 易错点总结

- **`list.pop(0)` 当出队**：O(n)，BFS 数据一多直接卡
- **循环队列用 `front == rear` 一把判满空**：环上它同时是「空」和「满」，必须选「记 size」或「留一格」其中一种并写死
- **单调队列的 `while` 漏写 `q and`**：还没进过元素就去取 `q[-1]`，第一轮就 IndexError
- **单调队列漏掉队头过期检查**：只弹队尾、直接输出 `nums[q[0]]`，窗口右移后输出的还是早就滑出去的最大值
- **`Rear()` 漏掉 `(rear - 1) % cap` 的取模**：rear 绕回 0 时 `rear - 1` 是 -1，Python 的负下标凑巧读对最后一格；这是巧合，不是写法对
- **需要按优先级出队时仍硬用 FIFO**：该换[优先队列](heap.md)时就换
- **给 deque 设了 `maxlen` 却按普通队列用**：满员后新元素会从另一端把旧元素挤掉（`append` 挤队头、`appendleft` 挤队尾），不设上限才会一直增长

## 相关题目

- [225. 用队列实现栈](https://leetcode.cn/problems/implement-stack-using-queues/)
- [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)
- [933. 最近的请求次数](https://leetcode.cn/problems/number-of-recent-calls/)
- [239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)

## 相关知识点

- [栈](stack.md)——互模拟的另一路
- [堆](heap.md)——优先队列的底层
- [广度优先搜索模式](../patterns/bfs.md)——队列的最大使用方
