---
title: 堆与优先队列
category: 数据结构
difficulty_range: [中等, 困难]
last_updated: 2026-10-26
---

# 堆（Heap）与优先队列

## 一句话理解

**堆是「层级最高的人永远坐在堆顶」的结构**：它是一棵**完全二叉树**，并且每个父节点的值都不小于（或不大于）自己的孩子。父大子小叫**大顶堆**，堆顶是全局最大值；父小子大叫**小顶堆**，堆顶是全局最小值。

注意一个常见误解：堆只**保证堆顶**是最大/最小值，**兄弟节点之间、不相关分支之间没有任何顺序**。左子树里的值完全可以比右子树里任何值都大。所以「取第 2 大」不能在堆上随手找，必须真的弹出一次。

它的现实模型很多：医院急诊分诊（不看到达顺序、看病情等级）、操作系统的优先级调度。这也是它著名的别名——**优先队列（priority queue）** 的由来：从使用者角度，它是「出队顺序按优先级，不按到达顺序」的队列。

## 为什么是完全二叉树，又怎么落到数组里

用完全二叉树做容器有一个工程上的妙处：**完全二叉树的节点可以一行一行地铺进数组，不需要任何指针**。这也正是「为什么要选完全二叉树而不是 BST」的答案——不浪费空间、不用维护指针、缓存友好。

数组下标之间的父子关系是三条算术式（从 0 起编号）：

| 关系 | 公式 |
|------|------|
| 父节点 | `(i - 1) // 2` |
| 左孩子 | `2 * i + 1` |
| 右孩子 | `2 * i + 2` |

## 核心特性与复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 查看堆顶 peek | O(1) | 堆顶就是 `heap[0]` |
| 插入 push（上浮） | O(log n) | 最多从叶子浮到根 |
| 弹出堆顶 pop（下沉） | O(log n) | 最多从根沉到叶子 |
| 建堆 heapify | **O(n)** | 不是 O(n log n)，见下 |
| 删除/修改任意元素 | O(log n) | 需要自己先找到下标（heapq 不直接支持） |
| 查找任意元素 | O(n) | 堆不为此而生 |

空间 O(n)。**堆的核心权衡是：用最便宜的 log n，买到「随时拿到当前最大/最小」这一点。** 不需要随时拿最值的话，用排序或哈希就行，别上堆。

## 手写下浮与上浮（面试白板高频）

```python
class MinHeap:
    """小顶堆手动实现"""

    def __init__(self):
        self.heap = []

    def push(self, x: int):
        self.heap.append(x)                    # 先放到末尾
        self._sift_up(len(self.heap) - 1)      # 再上浮到该在的位置

    def pop(self) -> int:
        smallest = self.heap[0]
        last = self.heap.pop()                 # 拿走最后一个叶子
        if self.heap:                          # 根还在，让它从顶往下滚
            self.heap[0] = last
            self._sift_down(0)
        return smallest

    def peek(self) -> int:
        return self.heap[0]

    def _sift_up(self, i: int):
        """和父节点比，小就交换，一路向上变小顶"""
        while i > 0:
            parent = (i - 1) // 2
            if self.heap[i] < self.heap[parent]:
                self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
                i = parent
            else:
                break

    def _sift_down(self, i: int):
        """和较小的孩子比，大就换下去"""
        n = len(self.heap)
        while True:
            smallest = i
            left, right = 2 * i + 1, 2 * i + 2
            if left < n and self.heap[left] < self.heap[smallest]:
                smallest = left
            if right < n and self.heap[right] < self.heap[smallest]:
                smallest = right
            if smallest == i:
                break
            self.heap[i], self.heap[smallest] = self.heap[smallest], self.heap[i]
            i = smallest
```

淘汰策略——为什么 pop 不是「把堆顶直接删了、两孩子谁小谁补位」而是「拿最后一个叶子补到顶、往下沉」？

```text
        [2]
       /   \
     [4]   [3]        弹 2 之后：
    /\       \
  [6] [5]    [7]

删堆顶 2、两个孩子在 4 和 3 —— 直接拿 3 补顶：
        [3]
       /   \
     [4]   [缺失的位置]     右子树时空的，完全二叉树的形状被破坏
    /\
  [6] [5]

拿最后一个叶子 7 情况更糟，它是数组末尾，把它挪过去后数组还得拍形。

正确姿势：把数组最后一个元素 (7) 先 pop 掉，从顶往下滚 —— 形状永远是完全二叉树
        [7]
       /   \
     [4]   [3]
    /\       \
  [6] [5]
（往下沉 7）
```

所以是「**先记下堆顶元素作返回值，再把堆的结尾元素挪进堆顶一路下沉**」——这也是 pop 的标准写法，**两个动作一起做，堆的形状永远不掉**。

## 建堆为什么是 O(n) 而不是 O(n log n)

```python
def build_heap(arr):
    n = len(arr)
    heap = arr[:]                 # 无序数组直接当成完全二叉树的形状
    for i in range(n // 2 - 1, -1, -1):   # 从最后一个非叶节点向前逐个下沉
        _sift_down(heap, i, n)
    return heap
```

直觉上 n 次下沉、每次 O(log n)，应该是 O(n log n)。但犯了个最大的错：**不是所有节点的下沉都走满树高**。精确的说法：

- 大约 n/2 个叶子不用下沉（0 次交换）
- n/4 的节点最多下沉 1 层
- n/8 的节点最多下沉 2 层
- …

总交换次数是 `n/2 * 0 + n/4 * 1 + n/8 * 2 + ... ≈ n`，是**逐级减半的加权求和**，收敛到 O(n)。可以用一笔直觉账记住：**建堆时大量节点就在底部附近，根本沉不动几下；反过来逐个 push 才是 O(n log n)**。「先铺形状、再统一下沉」就是这个省法的来源。

## heapq 实战（Python 的货真价实方案）

```python
import heapq

heap = []
heapq.heappush(heap, 3)      # 插入 O(log n)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
heapq.heappop(heap)          # 弹出最小值 1

nums = [5, 1, 3, 2]
heapq.heapify(nums)          # 原地建堆 O(n)，注意：这是原地修改

heapq.heappushpop(heap, 4)   # 先 push 4 再 pop，比分开做快
heapq.heapreplace(heap, 9)   # 先 pop 再 push 9（返回的一定是弹出前堆顶）

heapq.nsmallest(3, nums)     # 最小 3 个（k 小时内部也是堆）
heapq.nlargest(3, nums)      # 最大 3 个
```

三个一脚踩进去最常见的坑：

1. **heapq 只有小顶堆**。要大顶堆就**把值取负放进去、弹出来再取负**：`heappush(h, -x)`、`-heappop(h)`。不能对「自定义类 + 取负」的对象用这个法子，可以用元组 `(priority, item)` 或类里实现 `__lt__`
2. **写了 `import heapq` 就别再用手写的 sift up**，heapq 是 C 实现的，快好几个量级
3. **heapq 不支持「改某个元素的优先级」**——需要「改优先级」就用**惰性删除**打补丁：往堆里 push 一个带新优先级的记录，pop 时发现旧记录已失效（对比自己的 lazy 版本号）跳过即可。DIjkstra 算法是这一手的常客

## 常考点一：Top-K

「从 n 个数里找最大（或最小）的 K 个」是堆的第一用工场景。先把三路解法排开：

| 解法 | 复杂度 | 适用场景 |
|------|-------|---------|
| 全排序取前 K | O(n log n) | 一次性、K 接近 n |
| 维护小顶堆（装 K 个） | **O(n log k)** · 空间 O(k)** | K 远小于 n（标准解法）|
| 快速选择 | 平均 O(n) · 最坏 O(n²) | 数据可现场全量访问、不需在线 |

```python
import heapq
from typing import List

class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        # 小顶堆只装 k 个：堆顶就是「当前第 k 大」
        # 新数比堆顶大才有资格进来，进来还要把堆顶顶掉腾位置
        heap = []
        for x in nums:
            if len(heap) < k:
                heapq.heappush(heap, x)
            elif x > heap[0]:
                heapq.heapreplace(heap, x)    # 换成语义：弹最旧的小的、进新的大的
        return heap[0]
```

**反直觉的点**有两个，面试官每一个都爱问：

1. **求第 k 大，用的是小顶堆。** 想维护「最大的 k 个」，就要先把「混到这 k 个里最差的那一个」务必淘汰——那要用小顶堆，堆顶是 k 个里最小的那个。
2. **堆大小恒为 k**，n 是多少都不相干 —— 内存占用固定，堆顶就挂着当前第 k 大。

**手推一遍** `nums = [3, 2, 3, 1, 2, 4, 5, 5, 6]`、`k = 4`（找第 4 大，即 4）。用真实 heapq 落的堆数组（只有 `heap[0]` 是承诺，中间次序不用背）：

```text
x=3  不足 k 个，push            heap = [3]
x=2  不足 k 个，push            heap = [2, 3]
x=3  不足 k 个，push            heap = [2, 3, 3]
x=1  不足 k 个，push            heap = [1, 2, 3, 3]
x=2  2 > heap[0]=1 → 弹 1 进 2  heap = [2, 2, 3, 3]
x=4  4 > heap[0]=2 → 弹 2 进 4  heap = [2, 3, 3, 4]
x=5  5 > heap[0]=2 → 弹 2 进 5  heap = [3, 3, 5, 4]
x=5  5 > heap[0]=3 → 弹 3 进 5  heap = [3, 4, 5, 5]
x=6  6 > heap[0]=3 → 弹 3 进 6  heap = [4, 5, 5, 6]
```

遍历结束，堆顶 **4** 就是第 4 大。每一轮被淘汰的都是「当前 k 个候选里最小的」，正好始终躺在堆顶等着被看——这是小顶堆在这题里值钱的地方。

## 常考点二：对顶堆求中位数（295 题）

正反两条河夹出中位数：一个大顶堆装**较小一半**、一个小顶堆装**较大一半**，中位数永远在两堆顶之间摇摆。

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []   # 大顶堆（负值模拟）：较小的一半
        self.large = []   # 小顶堆：较大的一半，且始终 ≥ small

    def addNum(self, num: int) -> None:
        # 先丢进 small，把它的堆顶（large 侧最小的）转给 large —— 保证 large 全比 small 大
        heapq.heappush(self.small, -num)
        heapq.heappush(self.large, -heapq.heappop(self.small))
        # 平衡：large 可以比 small 多 1 个
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def findMedian(self) -> float:
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        # 两堆等大：中位数是两堆顶的平均
        return (-self.small[0] + self.large[0]) / 2
```

维护的不变式只有两条：`large` 的所有数 ≥ `small` 的所有数；`len(small)` 与 `len(large)` 相差不超过 1。

## 常考点三：堆排（原题常考「讲讲过程」）

分两步：**建堆**（O(n)，从最后一个非叶节点向前逐个下沉）+ **排序**（O(n log n)，每次拿堆顶与末尾交换、再把新顶下沉）。

```python
def heap_sort(arr):
    n = len(arr)
    # 原地建大顶堆
    for i in range(n // 2 - 1, -1, -1):
        _sift_down(arr, i, n)
    # 逐个把最大值换到末尾、缩堆
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        _sift_down(arr, 0, end)     # end 之后的部分已排好
    return arr
```

要点：**排升序用大顶堆**（最大的一次次沉到尾部），跟反着来的小顶堆直觉相反，是这题最常答错的点。

## 易错点总结

- 忘了「兄弟之间无序」：以为堆顶弹出后堆里剩下的是有序排列的
- 求第 k 大却摆出大顶堆：大顶堆能拿到全局最大，但每轮都要弹掉最大值才能前进 —— 小顶堆装 k 个才是正解
- `heapq` 默认小顶堆，做最大堆忘了取负或对象忘了 `__lt__`
- 用 heapify 建堆却当 O(n log n) 算复杂度
- pop 返回值时忘了「最后一个叶子先救回堆顶再下沉」，导致堆空断言错乱
- Dijkstra 忘了「push 一个带优先级的副本 + pop 时跳过失效记录」这套惰性删除的做法

## 相关题目

- [215. 数组中的第K个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md)
- [23. 合并K个升序链表](../problems/leetcode/0023_merge_k_sorted_lists.md)
- [347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/)
- [295. 数据流的中位数](https://leetcode.cn/problems/find-median-from-data-stream/)

## 相关知识点

- [队列](queue.md)——优先队列的使用者视角
- [完全二叉树](binary_tree.md)
- [归并 / 快排](../patterns/sorting.md)
