---
title: 数组
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-10-26
---

# 数组

## 一句话理解

**数组是「按地址直接到货」的结构**：元素在内存里连续排放，第 i 个元素的地址 = 起始地址 + i × 元素大小，一步算出、一步取到——这就是「随机访问 O(1)」的全部来源。代价同样是连续：想在中段插一个，后面所有元素都得挪窝。

现实模型是电影院的连排座位：座位号直接告诉你位置（O(1) 找人），但要在中间加一个座，一整排都要往边上挪。

## 核心特性与复杂度

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| 访问 `arr[i]` | O(1) | 地址是算出来的 |
| 尾部插入/删除 | 均摊 O(1) | 动态数组；偶尔触发扩容（见下） |
| 中间/头部插入删除 | O(n) | 后续元素整体搬移 |
| 未排序查找 | O(n) | 只能扫 |
| 有序查找 | O(log n) | 二分（本文重点之一） |

## 动态数组的扩容与均摊分析

Python 的 `list`、C++ 的 `vector` 都是**动态数组**：容量满了就申请一块约两倍大的新内存，把旧元素整体搬过去。单次搬移 O(n)，但**两次扩容之间必然攒够了 ~n 次廉价插入**，摊到每次插入头上仍是 O(1)——这就是「均摊（amortized）O(1)」的标准案例，面试里「list.append 是 O(1) 吗」的标准答案要带上「均摊」二字。

```python
# 提前知道规模时就预分配，免掉扩容搬移
prefix = [0] * (n + 1)        # 常见写法：多开一位存「空的前缀」
```

### 与链表怎么选

| | 数组 | 链表 |
|---|---|---|
| 随机访问 | ✅ O(1) | ❌ O(n) |
| 头部 / 中间插删 | ❌ O(n) | ✅ 定位后 O(1) |
| 缓存友好 | ✅ 连续内存 | ❌ 指针分散 |
| 容量 | 静态或扩容拷贝 | 天然动态 |

读多写少、按下标取 → 数组；频繁头插、长度不定 → 链表（详见[链表](linked_list.md)）。

## 常考点一：双指针的原地操作（快慢指针）

「在不新开数组的前提下，把所有有效元素压到前缀」这类题（[27. 移除元素](https://leetcode.cn/problems/remove-element/)、[26. 删除有序数组重复项](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/)、[283. 移动零](../problems/leetcode/0283_move_zeroes.md)）：

```python
def removeElement(nums, val):
    slow = 0                          # slow 左边 = 已确认保留的前缀
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]   # 有效元素搬进前缀
            slow += 1
    return slow                       # slow = 新长度
```

> **口诀：fast 负责探路读数据，slow 负责收答案写数据**。「快慢指针」在链表上是「步频差」，在数组上是「读写头分离」，同一个名字两套账。

**原地有序去重**（26 题）是它的变体：`fast` 处的值 != `slow-1` 处的值才写——有序性保证重复都聚在一起，「与刚收进来的最后一个比」就够了。

## 常考点二：对撞指针

指问题的两侧各一根指针、按 **sum/条件不等式**内推（[167. 两数之和 II](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)、[11. 盛水容器](../problems/leetcode/0011_container_with_most_water.md)、翻转数组）：

```python
def twoSumSorted(numbers, target):
    left, right = 0, len(numbers) - 1
    while left < right:
        s = numbers[left] + numbers[right]
        if s == target:
            return [left + 1, right + 1]
        if s < target:
            left += 1      # 和太小：left 右移才能变大
        else:
            right -= 1     # 和太大：right 左移才能变小
```

**移动方向与「单调性」绑定**：有序数组里，固定一端、另一端必是同向单调，所以每一步排除一根指针是安全的。这是对撞指针正确性的险要去处，不去理解、只会背模板的话，遇到「三数之和里两处撞车」这类细节就漏（15 题要跳过重复值）。

## 常考点三：二分查找的三个形态

二分不是背「`<` 还是 `<=`」，是背**不变式**。三种形态只要分清楚了，代码写错，错处都能自己检查出来：

| 形态 | 区间口径 | 终止条件 | 返回 |
|------|---------|---------|------|
| 查确切值（704） | 闭区间 `[l, r]` | `l > r`（找不到） | 下标或 -1 |
| 查下界 lower_bound（35） | 左闭右开 `[l, r)` | `l == r` | 第一个 ≥ target 的位置 |
| 查峰值（[162](https://leetcode.cn/problems/find-peak-element/)） | 闭区间 | 相邻缩小 | 任一峰 |

```python
# 左闭右开版 lower_bound：第一个 >= target 的下标（「如果全部小则 n」）
def lower_bound(nums, target):
    left, right = 0, len(nums)      # 注意 right 是「开区间的那一边」
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1          # mid 肯定不是答案，划掉
        else:
            right = mid             # mid 可能是答案，只能划掉它右边的
    return left                     # l == r：第一个「≥ target」的位置
```

```
lower_bound 的不变式：左边 [0, left) 全部 < target，右边 [right, n) 全部 >= target。
每轮结束「未判定的区间」缩小；终态 l == r，两块「已划掉的区域」合上了，答案即 left。
```

不变式变了，`mid` 的加减、`<` 与 `<=`、返回什么都得跟着变——所以**每次写二分先写下行「我的区间跟我承诺什么」**，三个形态的模板分别收藏，不混用。常用变形：**答案域二分**（对答案而不是对下标二分，[875. 爱吃香蕉的珂珂](https://leetcode.cn/problems/koko-eating-bananas/)、[410. 分割数组的最大值](https://leetcode.cn/problems/split-array-largest-sum/)），判据换成「当前猜测能不能成立」。

## 常考点四：前缀和与差分（搬「区间操作」到 O(1)）

**前缀和**：预建 `prefix`，把每次 O(n) 的区间求和压成 O(1)。**多开一位**是关键技巧（省掉 `l == 0` 的特判）：

```python
prefix = [0] * (n + 1)
for i, x in enumerate(nums):
    prefix[i + 1] = prefix[i] + x

# 区间 [l, r] 的和（含两端）= 「到 r 为止的」减「到 l-1 为止的」
range_sum = prefix[r + 1] - prefix[l]
```

**和为 K 的子数组（560）**是前缀和 + [哈希表](hash_table.md) 的联用名题：边扫边看「多少个位置的前缀 = 当前前缀 − K」。

### 差分是前缀和的「逆操作」

区间**批量加法**（比如「第 l 到 r 每个元素都 +1」重复 q 次）不做 q 次 O(n)，而是**只记区间的首尾变化**，最后做一次前缀和还原：

```python
diff = [0] * (n + 1)
def add(l, r, x):          # 区间 [l, r] 整体 +x
    diff[l] += x
    diff[r + 1] -= x       # 到 r 就「还账」

# q 次区间操作都用 O(1) 记账后：
for i in range(n):
    diff[i + 1] += diff[i]      # 前缀和还原 → 每个位置的真实增量
```

前缀和管「静态建好、多次查询」，差分管「多次区间改、最后统一还原」，一对镜像。

## 常考点五：二维数组与旋转

**二维矩阵的螺旋遍历（54）**用四个边界收缩；**旋转矩阵/旋转数组（189）**的通用法子是「整体反转 + 局部反转」：

```python
def rotate(nums, k):
    n = len(nums)
    k %= n                       # k 可以比 n 大！
    def rev(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1; hi -= 1
    rev(0, n - 1)                # 整体反转
    rev(0, k - 1)                # 反转前 k 个
    rev(k, n - 1)                # 反转剩下的
```

**手推一遍** `nums = [1,2,3,4,5,6,7]`、`k = 3`（右移 3 位 → `[5,6,7,1,2,3,4]`）：

```text
k %= n → 3
整体反转  [7,6,5,4,3,2,1]
前 k 反转  [5,6,7,4,3,2,1]
后 n-k 反转 [5,6,7,1,2,3,4]   ✓
```

三步反转是「不新开数组做旋转」的标准答案（O(n) 时间 O(1) 空间）；`k %= n` 这个模是必写的一行。

## 易错点总结

- 未排序的数组顺手二分——二分的前提是单调，没排的先明确说出口
- 二分写完不确定 `<` 与 `<=`：回头写「区间承诺」注释；**别名区间（闭/开）不同口径的模板不要混抄**
- `mid = (left + right) // 2` 在某些语言会溢出（C++/Java 写 `left + (right - left) / 2`），Python 无此顾虑但面试口述要会
- 前缀和忘「多开一位」，区间从 0 开始时越界或特判写漏
- 差分还原抢救错一步：差分记完必须做一次前缀和才是值，忘了这一步直接输出 diff
- `k % n` 忘模——k 大于数组长度时直接 index 越界或排序逻辑错
- 嵌套循环 O(n²) 的题想哈希/前缀和都拆不下来时，想想**答案域二分**（对值二分）

## 相关题目

- [1. 两数之和](../problems/leetcode/0001_two_sum.md) / [167. 两数之和 II](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)
- [35. 搜索插入位置](https://leetcode.cn/problems/search-insert-position/)
- [56. 合并区间](https://leetcode.cn/problems/merge-intervals/)
- [189. 轮转数组](../problems/leetcode/0189_rotate_array.md)
- [303. 区域和检索](https://leetcode.cn/problems/range-sum-query-immutable/)

## 相关知识点

- [链表](linked_list.md)——「快慢指针」两套含义的对照
- [字符串](string.md)式滑动窗口 —— 一维数组的窗口题和它同根
- [二分查找模式](../patterns/search.md)、[双指针模式](../patterns/two_pointers.md)、[滑动窗口模式](../patterns/sliding_window.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把两串换成你自己的，逐步看二维 DP
表每个格子怎么填——数组参与「前缀长度」两端，这张表就是一维数组的题
在二维展开后的样子。