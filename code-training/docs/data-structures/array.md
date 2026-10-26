---
title: 数组
category: 数据结构
difficulty_range: [简单, 困难]
last_updated: 2026-10-27
---

# 数组

## 定义

数组（array）是把元素**按固定地址规律连续存放**的线性结构：第 i 个元素的地址 = 起始地址 + i × 元素大小，因此任一下标的读写都是一次算术加一次访存，这就是随机访问 O(1) 的全部来源。代价是布局本身——紧挨着要留出相同大小的空间，意味着**扩容要重新分配并整体搬迁、中段增删要移动后续全部元素**。

动态数组（Python 的 `list`、C++ 的 `vector`）在容量写满时申请一块约两倍大的新内存整体拷贝过去：单次搬移 O(n)，但相邻两次扩容之间必然有将近 n 次廉价 append，摊到每次插入仍是 O(1)——**均摊（amortized）O(1)**。「`list.append` 是 O(1) 吗」的标准答案要带上这个词，而整个扩容分析也是所有动态容器共享的模板。

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| 访问 `arr[i]` | O(1) | 地址是算出来的 |
| 尾部插入 | 均摊 O(1) | 扩容瞬间 O(n) |
| 尾部删除 | O(1) | |
| 头部 / 中间插入,删除 | O(n) | 后续元素整体搬移 |
| 未排序查找 | O(n) | 线性扫描 |
| 有序查找 | O(log n) | 二分（算法题的重头，见下） |

与链表的取舍见[链表](linked_list.md)的对比表，一句话概括：读多写少、按下标取 → 数组；频繁头插、长度不定 → 链表。

Python 侧的两个实现细节经常被直接问：

```python
prefix = [0] * (n + 1)   # 提前知道规模时预分配，省掉扩容搬移
# 前缀多用一位存「空的前缀」，省掉 l == 0 的特判
```

## 技法一：快慢指针的原地压缩

「不新开数组，把有效元素压到前缀」一类题（[27. 移除元素](https://leetcode.cn/problems/remove-element/)、[26. 删除有序数组重复项](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/)、[283. 移动零](../problems/leetcode/0283_move_zeroes.md)）的公共写法：

```python
def removeElement(nums, val):
    slow = 0                          # [0, slow) 是已确认保留的前缀
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]   # 有效元素写入前缀
            slow += 1
    return slow                       # slow 即新长度
```

`fast` 是读指针、`slow` 是写指针，各自只朝一个方向走且互不回头。**有序去重（26）只多一个条件**：`fast` 位置的值与 `nums[slow - 1]` 不同才写入——有序性保证重复全连在一起，「和刚写进来的最后一个比」就是完备的判重。

## 技法二：对撞指针

两端各放一根指针，依据某种不等式向内收（[167. 两数之和 II](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)、[11](../problems/leetcode/0011_container_with_most_water.md)、数组翻转）：

```python
def twoSumSorted(numbers, target):
    left, right = 0, len(numbers) - 1
    while left < right:
        s = numbers[left] + numbers[right]
        if s == target:
            return [left + 1, right + 1]
        if s < target:
            left += 1      # 和太小：left 右移才可能变大
        else:
            right -= 1     # 和太大：right 左移才可能变小
```

成立的前提不在「有两个指针」而在**可证明被排除的候选里没有答案**：有序前提下固定一端端点，另一端点越内越小（或越大），移动一次排除一列候选，总步数 O(n)。模板细节与证明见[双指针模式](../patterns/two_pointers.md)，需要重复值跳过时（15 三数之和）注意两处都要处理。

## 技法三：二分查找——背不变式，不背符号

「`<` 还是 `<=`」靠背必错，靠不变式自检必对。三种形态分开收藏：

| 形态 | 区间口径 | 循环终止 | 返回 |
|------|---------|---------|------|
| 查确切值（704） | 闭区间 `[l, r]` | `l > r` | 下标或 -1 |
| 查下界 lower_bound（35） | 左闭右开 `[l, r)` | `l == r` | 第一个 ≥ target 的位置 |
| 查峰（[162](https://leetcode.cn/problems/find-peak-element/)） | 闭区间 | 相邻缩小 | 任一峰 |

```python
# 左闭右开 lower_bound：第一个 >= target 的下标（全小于则返回 n）
def lower_bound(nums, target):
    left, right = 0, len(nums)   # right 是开区间那一侧
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1       # mid 一定不是答案，划掉 mid 本身
        else:
            right = mid          # mid 可能是答案，只能划掉 mid 右侧
    return left
```

不变式：终态前任意时刻 `[0, left)` 全部 `< target`，`[right, n)` 全部 `≥ target`；每轮未判定段严格缩短；`l == r` 时两块已判定段合拢，`left` 即答案。**写任何二分之前先把这两句承诺写在注释里**，符号选择、`mid ± 1`、返回值全部由它推出，不混用模板则不需要背。

延伸用法：**答案域二分**——答案本身单调时对「答案范围」二分、以「该值可不可行」作判据（[875](https://leetcode.cn/problems/koko-eating-bananas/)、[410](https://leetcode.cn/problems/split-array-largest-sum/)）。嵌套循环压不下来时，先想想对值二分这条路。

## 技法四：前缀和与差分

**前缀和**把「静态数组的区间和查询」从 O(n) 压到 O(1)：

```python
prefix = [0] * (n + 1)
for i, x in enumerate(nums):
    prefix[i + 1] = prefix[i] + x

# 区间 [l, r]（含两端）的和 = 到 r 的前缀 − 到 l−1 的前缀
range_sum = prefix[r + 1] - prefix[l]
```

多开一位的约定让 `l == 0` 无需特判。配合[哈希表](hash_table.md)的升级是 [560. 和为 K 的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)：边扫边查「当前前缀 − K」这个值此前出现过几次。

**差分**是前缀和的逆运算，用于「q 次区间整体加法 + 最后一次性还原」：

```python
diff = [0] * (n + 1)
def add(l, r, x):          # 区间 [l, r] 整体 +x，记账 O(1)
    diff[l] += x
    diff[r + 1] -= x       # 越过 r 就停止生效

# q 次记账之后，前缀和一次还原出每个位置的真实增量
for i in range(n):
    diff[i + 1] += diff[i]
```

分工：前缀和管「建表一次、查询多次」；差分管「修改多次、还原一次」。区间操作题先判断属于哪种，再落笔。

## 技法五：旋转与螺旋

右轮转 k 位的原地写法是「三段反转」：整体反转后，前 k 位再反转、其余再反转一次即可：

```python
def rotate(nums, k):
    n = len(nums)
    k %= n               # k 可以大于 n
    def rev(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1; hi -= 1
    rev(0, n - 1)
    rev(0, k - 1)
    rev(k, n - 1)
```

`[1,2,3,4,5,6,7]`、`k = 3`：整体反转得 `[7,6,5,4,3,2,1]`，反转前 3 位得 `[5,6,7,4,3,2,1]`，反转后 4 位得 `[5,6,7,1,2,3,4]`。O(n) 时间 O(1) 空间。螺旋遍历（54）用上/下/左/右四个边界轮流收紧；矩阵顺时针旋转 90° 先转置再逐行反转。

## 易错点总结

- 对未排序数组直接二分——单调性是前提，写代码前确认或先排序（并说明代价）
- 二分的 `<` / `<=` 拿不准：先写「区间承诺」注释，再从它推出比较符；不同完全对齐形态的模板不要混抄
- C++/Java 里 `mid = left + (right - left) / 2` 防溢出（Python 无此顾虑，但面试要求会答）
- 前缀和忘「多开一位」，要么越界、要么 `l == 0` 特判漏写
- 差分记完账忘了做一次前缀和还原——替「增量」当「值」输出
- 旋转忘 `k %= n`，k 大于数组长度时错序
- 二维数组用 `[[0]*n]*n` 初始化：外层是同一行的引用，见[图](graph.md)的建图一节

## 相关题目

- [1. 两数之和](../problems/leetcode/0001_two_sum.md) / [167. 两数之和 II](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)
- [35. 搜索插入位置](https://leetcode.cn/problems/search-insert-position/)
- [56. 合并区间](https://leetcode.cn/problems/merge-intervals/)
- [189. 轮转数组](../problems/leetcode/0189_rotate_array.md)
- [303. 区域和检索](https://leetcode.cn/problems/range-sum-query-immutable/)

## 相关知识点

- [链表](linked_list.md)——同一接口的另一实现，快慢指针在数组上是「读写头分离」
- [二分查找模式](../patterns/search.md)、[双指针模式](../patterns/two_pointers.md)、[滑动窗口模式](../patterns/sliding_window.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把两串换成你自己的，逐帧观察
二维 DP 表每格如何填写——一维数组的题在「前缀长度」两个轴上铺开。
