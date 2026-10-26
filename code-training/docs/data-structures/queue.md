---
title: 队列
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-26
---

# 队列

## 一句话理解

**队列（Queue）有两个开口**：一头只进，一头只出。最先排队的最先被处理，所以叫**先进先出（FIFO, First In First Out）**。它对标的现实模型就是排队：买奶茶、抢票、打印机任务，后来的排到队尾，不许插队。

队列的「顺序感」是它的全部价值。所有「按到达顺序处理」「一层一层扩展」的场景，底层都是队列——最典型的是**广度优先搜索（BFS）的层次遍历**：先把起点入队，弹一个、把它的邻居都排进队尾，队列自然就维持了「第 1 层处理完才轮到第 2 层」。

## 核心特性与复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| enqueue（入队，队尾） | O(1) | |
| dequeue（出队，队头） | O(1) | 需要合适的实现（见下） |
| front（看队头） | O(1) | |
| 随机访问 / 查找 | O(n) | 与栈一样，不是队列的本职 |

用循环数组或链表实现才能同时拿到「头尾两侧 O(1)」；用普通数组的头部做删除是 O(n)，是三种实现里唯一会翻车的。

## Python 实现

```python
from collections import deque

q = deque()
q.append(1)          # 入队（进队尾）
q.append(2)
front = q[0]         # 看队头
q.popleft()          # 出队（从队头弹出），O(1)

# 反面教材：普通 list 当队列
lst = []
lst.append(1)
lst.pop(0)           # O(n)！每次出队后面 n-1 个元素都要前移
```

`collections.deque` 底层是**双向链表块**（double-ended queue of blocks），两端操作都是 O(1)，这就是为什么 Python 里写 BFS 永远写 `deque` 而不写 `list.pop(0)`。

## 队列家族一览

面试问到「队列都有哪些种类」时，横着列四张牌：

### 普通队列

先进先出，前面已经讲了。数组实现的普通队列有个著名缺陷叫**假溢出**：出队只移动队头指针不搬元素，「弹掉的位置」永远空着——数组尾还没满，队头前面却全是废位，`rear` 到头就装不下新元素了。它的解法就是下面这位。

### 循环队列

把数组首尾接成环，`rear` 走到末尾就从 0 继续，废位全部回收。判空的麻烦也随之而来：环上 `front == rear` 可能是空、也可能是满。

两种标准解法：

1. **记录当前元素个数 `size`**：`size == 0` 是空，`size == k` 是满。语义直白，最推荐。
2. **牺牲一个格子**：留一格永不放元素，`front == (rear + 1) % k` 即满。省空间判断复杂，实际是拿一格换一个布尔变量。

```python
class MyCircularQueue:
    def __init__(self, k: int):
        self.buf = [0] * k
        self.cap = k
        self.size = 0        # 当前元素个数：判空判满全靠它
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

**手推一轮**（容量 3，依次入 1、2、3，再出队 1 次、入队 4）：

```text
初始        rear=0 front=0 size=0
enQueue(1)  buf[0]=1  rear=1 size=1
enQueue(2)  buf[1]=2  rear=2 size=2
enQueue(3)  buf[2]=3  rear=0 (2+1)%3=0，绕回去了！ size=3
deQueue()   front=1   size=2
enQueue(4)  buf[0]=4（放到刚绕回的头位）rear=1 size=3
队头是 buf[1]=2，队尾是 buf[0]=4
```

注意两个点：`rear - 1` 可能为负，所以要写 `(rear - 1) % cap` 而不是 `rear - 1`；这题对应 [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)。

### 双端队列（deque）

两头都能进能出，栈和队列都是它的特例：只用右端进出它是栈，右端进左端出它是队列。它独有的武器是**单调队列**（下文）。

```python
d = deque([1, 2, 3], maxlen=5)  # 可设容量上限
d.append(4)        # 右端进
d.appendleft(0)    # 左端进
d.pop()            # 右端出
d.popleft()        # 左端出
d.rotate(2)        # 整体右转 2 步
d.extend([5, 6])   # 批量右端进
```

### 优先队列

出队顺序**不看到达时间、看优先级**——每次出的是当前优先级最高的。底层不是线性结构，是堆（见[堆](heap.md)）；从使用者的视角看，它就是「一个会自动排序的队列」。Python 里用 `heapq` 或 `queue.PriorityQueue` 实现。

## 常考点一：单调队列与滑动窗口最大值

**单调队列（单调双端队列）**是队列这条线上的「单调栈」同款考点，对应 [239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)。

> **核心口诀：队里存的是「有可能成为未来最大值的下标」**。队内下标对应的值从队头到队尾单调递减，**队头永远是当前窗口的最大值**。谁有资格留在队里？一来进窗口时就把前面比自己小的全部踢掉——它们又老又小，永远轮不到当最大值了。

```python
from collections import deque

def maxSlidingWindow(nums, k):
    q = deque()                    # 存下标，值从队头到队尾递减
    res = []
    for i, x in enumerate(nums):
        # 新元素踢掉队尾所有 ≤ 自己的（它们彻底没机会了）
        while q and nums[q[-1]] <= x:
            q.pop()
        q.append(i)
        # 队头滑出窗口了就扔掉
        if q[0] <= i - k:
            q.popleft()
        # 窗口成形后，队头就是最大值
        if i >= k - 1:
            res.append(nums[q[0]])
    return res
```

单步推一遍 `nums = [1, 3, -1, -3, 5, 3]`，`k = 3`：

```text
i=0 (1)：队空直接进            q=[0]
i=1 (3)：1 ≤ 3 被踢           q=[1]
i=2 (-1)：-1 进               q=[1, 2]          窗口成，出 nums[1]=3
i=3 (-3)：-3 进               q=[1, 2, 3]       出 3
i=4 (5)：-3、-1、3 全被打发    q=[4]             出 5
i=5 (3)：3 进                 q=[4, 5]          出 5
res = [3, 3, 5, 5]
```

- 为什么单调队列复杂度是 O(n)：每个元素至多入队、出队各一次，跟单调栈同一笔账
- 单调栈对「下一个更大」这类**未来指向**的问题，单调队列对**滑动窗口取最值**——两者共享一个口诀，BAT 系笔试高频

## 常考点二：队列实现栈（225 题）

与栈实现队列互为双胞胎：**一个队列传废物**。push 时先把新元素放进第二个空队列，再把主队列原样倒灌过去，最后交换——新元素永远躺在队头，pop 就是普通出队，O(n) 的 push 换 O(1) 的 pop。

## 应用场景速答

- **BFS 层次遍历**：图的广度优先、树的层序、二分图染色（[patterns/bfs.md](../patterns/bfs.md)）
- **消息队列 / 生产者消费者**：解耦上下游的生产消费节奏
- **线程池任务队列**：核心线程忙不过来时，任务先排队
- **打印任务、呼叫中心排队、播放列表**：一切「公平排队」的语义

## 易错点总结

- 用 `list.pop(0)` 当出队——O(n)，三十个元素的 BFS 直接从「流畅」变「卡顿」，属于高频笔误
- 循环队列判满判空用 `front == rear` 一把抓——两种解法（记 size / 留空格）必然要选一种写死
- 队尾取值忘了负下标取模：`(rear - 1) % cap`，裸的 `rear - 1` 会出 `IndexError`
- 单调队列踢尾部用 `<=` 还是 `<` 与「取最大」的题设相关，`<=` 保证重复最大值也能被新下标踢掉，从而队头永远不会卡在已滑出窗口的旧最大值上
- 需要按优先级而不是到达顺序出队时，别硬用 FIFO 队列，该上堆（优先队列）就上

## 相关题目

- [225. 用队列实现栈](https://leetcode.cn/problems/implement-stack-using-queues/)
- [622. 设计循环队列](https://leetcode.cn/problems/design-circular-queue/)
- [933. 最近的请求次数](https://leetcode.cn/problems/number-of-recent-calls/)
- [239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/)

## 相关知识点

- [栈](stack.md)——互模拟、单调栈与单调队列
- [堆](heap.md)——优先队列的底层
- [广度优先搜索模式](../patterns/bfs.md)
