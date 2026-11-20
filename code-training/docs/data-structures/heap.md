---
title: 堆与优先队列
sidebar_position: 9
category: 数据结构
difficulty_range: [中等, 困难]
last_updated: 2026-11-20
---

# 堆与优先队列

## 定义

堆（heap）是一棵**完全二叉树**，且满足一条**顺序性质**：每个节点的值 ≥（或 ≤）自己孩子的值。前者叫**大顶堆**（max-heap，堆顶是全局最大值），后者叫**小顶堆**（min-heap，堆顶是全局最小值）。从使用者视角它就是一种**优先队列**：出队顺序按优先级，不按到达时间。

定义要读准的地方：顺序性质只约束**父子两层**。兄弟之间、不同分支之间不存在大小关系——左子树的最大值完全可以大于右子树的任何值。因此**堆内除 `heap[0]` 外没有可用的序**，「取第 k 大」这类问题必须逐个弹出（k 次操作），不能随手取第 k 个。

## 结构剖面

堆把完全二叉树**按层铺进数组**，一个指针都不存：

![数组下标与树节点的对应](/diagrams/heap-array-tree.png)

父子关系变成三条下标算术（从 0 起编号）：

| 关系 | 公式 |
|------|------|
| 父节点 | `(i-1)//2` |
| 左孩子 | `2i+1` |
| 右孩子 | `2i+2` |

能成立的前提是「完全二叉树」——中间不许有空洞，否则下标算出来的位置对不上节点。选它而不是任意形状的树，换来的是：空间省、不用维护指针、寻址靠一次算术。数组还连续，从根到叶的一条路径几乎都落在缓存里。

## 复杂度

| 操作 | 时间复杂度 | 实现要点 |
|------|-----------|---------|
| 堆顶 peek | O(1) | 即 `heap[0]` |
| 插入 push（上浮 sift-up） | O(log n) | 从叶子浮到根，最多树高 |
| 出堆 pop（下沉 sift-down） | O(log n) | 从根沉到叶子 |
| 建堆 heapify | **O(n)** | 不是 O(n log n)，推导见下 |
| 修改 / 删除任意元素 | O(log n) | 需要自己先知道下标（heapq 不支持查询） |
| 查找任意元素 | O(n) | 堆不为「查找」而生 |

空间 O(n)。堆的价值在于「**以每次 log n 的代价维持随时可取的最值**」；不需要动态取最值时，排序或哈希就够。

## 上浮与下沉

两条路径都只走树高：新元素从叶子往上浮到该在的位置，或者从根往下沉。

![交换次数不超过树高](/diagrams/heap-sift.png)

先写两个独立函数，分别处理小顶堆和大顶堆。它们只差一个比较方向，分开写比塞一个布尔参数更好读：

```python
def sift_down_min(a, i, n):
    """小顶堆：把 a[i] 往下沉到堆序成立；n 是当前堆的有效长度。O(log n)"""
    while True:
        smallest = i
        left, right = 2 * i + 1, 2 * i + 2
        if left < n and a[left] < a[smallest]:
            smallest = left                 # ① 左孩子更小
        if right < n and a[right] < a[smallest]:
            smallest = right                # ② 右孩子更小
        if smallest == i:
            break                           # ③ 两个孩子都不比我小，堆序成立
        a[i], a[smallest] = a[smallest], a[i]
        i = smallest                        # ④ 继续从换下来的位置往下看

def sift_down_max(a, i, n):
    """大顶堆：同上，比较方向反过来"""
    while True:
        largest = i
        left, right = 2 * i + 1, 2 * i + 2
        if left < n and a[left] > a[largest]:
            largest = left
        if right < n and a[right] > a[largest]:
            largest = right
        if largest == i:
            break
        a[i], a[largest] = a[largest], a[i]
        i = largest
```

下面这段直接调用上面的 `sift_down_min`：

```python
class MinHeap:
    """小顶堆手动实现：只用于说明堆序，实战用 heapq"""

    def __init__(self):
        self.heap = []

    def push(self, x):
        self.heap.append(x)                 # ① 新元素先放数组末尾（保持完全树形状）
        self._sift_up(len(self.heap) - 1)   # ② 再上浮到该在的位置

    def pop(self):
        smallest = self.heap[0]
        last = self.heap.pop()              # ① 先拿走最后一个叶子
        if self.heap:
            self.heap[0] = last             # ② 用尾叶子补根，保持完全树形状
            sift_down_min(self.heap, 0, len(self.heap))   # ③ 再往下沉
        return smallest

    def peek(self):
        return self.heap[0]

    def _sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self.heap[i] < self.heap[parent]:
                self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
                i = parent                  # ① 继续和新的父节点比
            else:
                break                       # ② 不比父亲小，停
```

**pop 为什么用尾叶子补顶**，而不是「直接移除堆顶、让较小的孩子上位」？后者会把完全二叉树的形状打散：两棵子树高度不等，堆序无法一跳填补。取尾叶子补顶保持形状，代价只是让这个叶子从顶往下沉一趟（最多树高）：

```text
         [1]                                 [2]
        /   \       弹 1，尾叶子 6 补顶        /   \
      [2]   [3]    ─────────────────→       [4]   [3]
     / \   /          6 ↔ 2，6 ↔ 4          / \
   [4] [5][6]                              [6] [5]
（数组从 [6,2,3,4,5] 沉成 [2,4,3,6,5]）
```

## 建堆为什么是 O(n)

把现成数组变成堆，**从最后一个非叶节点起，向前逐个下沉**，不是逐个 push：

```python
def build_heap(arr):
    """原地风格：返回一份新数组，O(n)"""
    heap = arr[:]
    for i in range(len(heap) // 2 - 1, -1, -1):   # ① 最后一个非叶节点是 n//2-1
        sift_down_min(heap, i, len(heap))
    return heap
```

它之所以是 O(n) 而非 n 次 O(log n)：绝大多数节点在树的底层，根本沉不了几层——

```text
n/2 个叶子：0 次下沉
n/4 个节点：最多 1 层
n/8 个节点：最多 2 层
…                          总操作次数 ≈ n
```

对比「先建空堆再逐个 push」：每个新元素都从叶子层向上浮，可一路浮到根，才是 O(n log n)。「先铺形状、再统一沉降」是唯一的 O(n)。

## heapq（Python 标准实现）

```python
import heapq

heap = []
heapq.heappush(heap, 3)      # ① 插入 O(log n)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
heapq.heappop(heap)          # ② 弹出最小值 1

nums = [5, 1, 3, 2]
heapq.heapify(nums)          # ③ 原地建堆 O(n)，注意会改输入

heapq.heappushpop(heap, 4)   # ④ 先 push 再 pop，比分开两次调用快
heapq.heapreplace(heap, 9)   # ⑤ 先 pop 再 push；返回的一定是弹出前的堆顶

heapq.nsmallest(3, nums)     # ⑥ 最小 3 个
heapq.nlargest(3, nums)      # ⑦ 最大 3 个
```

三条边界：

1. **heapq 只有小顶堆**。大顶堆的等价写法是**值取负**：`heappush(h, -x)`、`-heappop(h)`。自定义类不可取负时用 `(priority, item)` 元组或实现 `__lt__`；
2. **手写版只用于说明堆序**：`import heapq` 之后就不该再 `_sift_up` / `sift_down_min` 手搓——heapq 是 C 实现，快若干个量级；
3. **heapq 不支持修改某个键的优先级**。需要这一能力（Dijkstra 是典型）时用**惰性删除**：push 一个带新优先级的记录，pop 时若值比当前记录旧/失效就跳过。

## 题型一：Top-K（215 最接近题）

「n 个数中找最大（或最小）的 K 个」是堆的招牌应用。三种方案边界先排开：

| 解法 | 复杂度 | 适用场景 |
|------|-------|---------|
| 全排序取前 K | O(n log n) | 一次性、K 接近 n |
| **小顶堆装 K 个** | **O(n log k)**，空间 O(k) | K 远小于 n（标准答案） |
| 快速选择 | 平均 O(n)，最坏 O(n²) | 数据一次可全量访问 |

```python
import heapq

def findKthLargest(nums, k):
    """第 k 大：小顶堆只装 k 个，堆顶就是当前第 k 大。O(n log k)"""
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)          # ① 先凑满 k 个
        elif x > heap[0]:
            heapq.heapreplace(heap, x)       # ② 比堆顶大才换掉当前最小值
    return heap[0]                           # ③ 堆顶即第 k 大
```

两个反直觉点：

1. 求第 k 大却用**小顶堆**：要维护「最大的 k 个」，则这 k 个中最差的那个（挂堆顶）应当随时可弹出；换大顶堆每次操作都要处理全量最大值，反而无法一步维持 k 个候选；
2. **堆大小恒为 k**：n 无关内存，堆顶挂着的方式即问题答案。

用 `nums = [3, 2, 3, 1, 2, 4, 5, 5, 6]`、`k = 4` 走一遍（heapq 内部次序不承诺，只保证 `heap[0]` 是最小值）：

```text
x=3  不足 k，push            heap = [3]
x=2  push                    heap = [2, 3]
x=3  push                    heap = [2, 3, 3]
x=1  push                    heap = [1, 2, 3, 3]
x=2  2 > heap[0]=1 → 换      heap = [2, 2, 3, 3]
x=4  4 > 2 → 换              heap = [2, 3, 3, 4]
x=5  5 > 2 → 换              heap = [3, 3, 5, 4]
x=5  5 > 3 → 换              heap = [3, 4, 5, 5]
x=6  6 > 3 → 换              heap = [4, 5, 5, 6]
```

终点堆顶 **4** 即第 4 大。每一轮被淘汰的都是当前 k 个候选中的最小者。

## 题型二：对顶堆求数据流中位数（295）

两个堆背靠背：**大顶堆装较小一半、小顶堆装较大一半**，中位数在两个堆顶之间：

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []   # ① 大顶堆（存负值）：较小的一半
        self.large = []   # ② 小顶堆：较大的一半

    def addNum(self, num):
        # ③ 先丢进 small，再把 small 的最大值转给 large
        heapq.heappush(self.small, -num)
        heapq.heappush(self.large, -heapq.heappop(self.small))
        # ④ 平衡：允许 large 比 small 多 1，多了就挪回来
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def findMedian(self):
        if len(self.small) > len(self.large):      # ⑤ 奇数个
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2  # ⑥ 偶数个，取两个堆顶平均
```

不变量两条：`large` 的所有元素 ≥ `small` 的所有元素；`len(small)` 与 `len(large)` 至多差 1。「先过 small 再进 large」这一个动作同时完成了「小的一半必大」。查询 O(1)、插入 O(log n)。

## 题型三：堆排序

建堆（O(n)）+ 逐个「取堆顶换到末尾再下沉」（O(n log n)，`sift_down_max` 见「上浮与下沉」一节）：

```python
def heap_sort(arr):
    """升序：先建大顶堆，再把最大值逐个换到末尾。O(n log n)"""
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):    # ① 原地建大顶堆
        sift_down_max(arr, i, n)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]  # ② 最大值移到末尾
        sift_down_max(arr, 0, end)           # ③ 在缩短的堆内重新堆序
    return arr
```

注意：**排升序要用大顶堆**——最大值逐个沉向尾部。用小顶堆写升序排序是这题最常见的方向性错误：小顶堆的堆顶是最小值，换到末尾得到的是降序。

## 易错点总结

- 误以为堆内整体有序，以为堆顶弹出后取下一个可直接从剩余里找——每次「下一个最值」都是一次 O(log n) 操作
- 第 k 大写了大顶堆：大顶堆维护的是全局最大值，装不下「最大的 k 个」
- `heapq` 默认小顶堆，做最大堆时忘取负或忘 `__lt__`
- 「建堆 O(n)」这句没扣上：heapify 建堆是 O(n)，逐个 push 建堆是 O(n log n)
- pop 的尾叶子补顶顺序写错：先 `pop()` 再判空，堆空时 `heap[0]` 直接越界
- 堆排序用小顶堆写升序，得到降序
- Dijkstra 需要的「改优先级」没有做惰性删除，直接 push 旧记录会让队尾错序

## 相关题目

- [215. 数组中的第K个最大元素](../problems/leetcode/0215_kth_largest_element_in_an_array.md)
- [23. 合并K个升序链表](../problems/leetcode/0023_merge_k_sorted_lists.md)
- [347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/)
- [295. 数据流的中位数](https://leetcode.cn/problems/find-median-from-data-stream/)

## 相关知识点

- [栈](stack.md)、[队列](queue.md)——同接口的线性序；优先队列是堆的使用者视角
- [树](tree.md)——完全二叉树是堆的形状基础
- [归并 / 快排](../patterns/sorting.md)——堆排序与其它 O(n log n) 的对照
