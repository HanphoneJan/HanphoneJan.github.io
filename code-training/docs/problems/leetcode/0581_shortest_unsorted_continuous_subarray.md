---
title: 581. 最短无序连续子数组
platform: LeetCode
difficulty: Medium
id: 581
url: https://leetcode.cn/problems/shortest-unsorted-continuous-subarray/
tags:
  - 数组
  - 双指针
  - 栈
  - 贪心
  - 排序
  - 单调栈
patterns:
  - ../../patterns/greedy.md
  - ../../patterns/sorting.md
  - ../../patterns/two_pointers.md
date_added: 2026-04-24
---

# 581. 最短无序连续子数组

## 题目描述

给你一个整数数组 `nums` ，你需要找出一个 **连续子数组** ，如果对这个子数组进行升序排序，那么整个数组都会变为升序排序。

请你找出符合题意的 **最短** 子数组，并输出它的长度。

## 示例

**示例 1：**
```
输入：nums = [2,6,4,8,10,9,15]
输出：5
解释：只需要对 [6,4,8,10,9] 进行排序
```

**示例 2：**
```
输入：nums = [1,2,3,4]
输出：0
```

---

## 解题思路

### 窗口的两个边界各自由什么决定

判定标准：把某个连续子数组排序之后，整个数组升序。换个说法——窗口外的**前缀**必须已经升序、并且每个元素都不大于窗口内的任何元素；窗口外的**后缀**同理。

一个位置「必须进窗口」只有两种情形：

- 它右边存在比它小的数：它现在的位置太靠后，排序后得往后挪；
- 它左边存在比它大的数：它现在的位置太靠前，得往前挪。

反过来，如果某个位置两件事都不成立（左边全都 ≤ 它，右边全都 ≥ 它），它相对整个数组已经站在正确的位置上，不需要动。于是：

- **左边界** = 最左边那个「右边有更小的数」的下标；
- **右边界** = 最右边那个「左边有更大的数」的下标。

**为什么这两个下标夹出的窗口就是答案**：左边界左侧的每个 `j` 满足「右边没有比它小的数」，即 `nums[j] ≤ min(nums[j+1:])`，所以前缀自身升序、且每个元素都不大于窗口内任何元素；后缀对称。把窗口内部排好序，整个数组必然升序。最小性则由定义直接给出——每个「坏位置」都得在窗口里。数组本来有序时两个条件都不成立，窗口为空，长度 0。

两台扫描各自只需要一个极值：

- 从左往右扫，维护**前缀最大值** `maxn`；`nums[i] < maxn` 就说明左边有更大的数，`i` 太靠后；
- 从右往左扫，维护**后缀最小值** `minn`；`nums[i] > minn` 就说明右边有更小的数，`i` 太靠前。

### 一次遍历同时扫两个方向

两个扫描互不干扰，可以塞进同一个 `i` 循环，一次走完：

```python
from typing import List

class Solution:
    def findUnsortedSubarray(self, nums: List[int]) -> int:
        n = len(nums)
        left, right = n, -1                     # 空窗口的哨兵：left > right
        maxn, minn = float("-inf"), float("inf")

        for i in range(n):
            # 向右看：左边出现过更大的数，i 就得往后挪
            if nums[i] < maxn:
                right = i
            else:
                maxn = nums[i]

            # 向左看：右边出现过更小的数，这个位置就得往前挪
            if nums[n - 1 - i] > minn:
                left = n - 1 - i
            else:
                minn = nums[n - 1 - i]

        return max(0, right - left + 1)
```

几处细节都能对应到上面那两条定义：

- `if nums[i] < maxn` 用**严格小于**，相等不算坏位置——`[1,1,1]` 里每个 1 左边都不存在「更大的数」，答案必须是 0；
- `else` 分支里才更新 `maxn`：条件成立时 `maxn` 本来就更大，再赋一次也没用，但这个 `else` 让「`maxn` 永远是前缀最大值」这条不变式在代码里看得见；
- `nums[n - 1 - i]` 让同一个 `i` 顺带从右往左走，不需要写第二个循环；
- `left = n`、`right = -1` 是一对空窗口哨兵，`max(0, ...)` 把它们折成 0，省掉「数组已有序」的单独分支。

### 方法二：排序后逐位对比

复制一份排好序的数组，和原数组逐位比：第一处不同的位置就是左边界，最后一处不同就是右边界，两点之间就是窗口。

```python
class Solution:
    def findUnsortedSubarray(self, nums: List[int]) -> int:
        ordered = sorted(nums)
        i, j = 0, len(nums) - 1
        while i <= j and nums[i] == ordered[i]:
            i += 1
        while i <= j and nums[j] == ordered[j]:
            j -= 1
        return j - i + 1
```

它短得多，也不需要任何关于边界的推理，重复元素天然正确（相等的值比较相等，不会被误判成坏位置）；代价是 `O(n log n)` 和一份 `O(n)` 的副本。

**必须用 `sorted(nums)` 而不是 `nums.sort()`**：后者会把原数组就地排掉，后面所有比较都变成自己跟自己比，窗口长度恒为 0。这个错误对已经有序的输入完全看不出来，只在乱序用例上暴露。

### 方法三：单调栈

「左边有没有更大的数」等价于「某个元素右边第一个比它小的是谁」，这正好是单调栈能回答的问题：

```python
class Solution:
    def findUnsortedSubarray(self, nums: List[int]) -> int:
        n = len(nums)
        left, right = n, -1

        stack = []
        for i, x in enumerate(nums):
            # 栈里是「还没遇到更小元素」的递增序列，x 一来就把它们全弹掉
            while stack and nums[stack[-1]] > x:
                left = min(left, stack.pop())
            stack.append(i)

        stack.clear()
        for i in range(n - 1, -1, -1):
            while stack and nums[stack[-1]] < nums[i]:
                right = max(right, stack.pop())
            stack.append(i)

        return max(0, right - left + 1)
```

它是那两条定义的直译：被弹出的下标正是「右边有更小的数」的位置，取其中最小的就是左边界。时间同样是 `O(n)`，但多一个 `O(n)` 的栈、两趟扫描、每个下标进栈出栈各一次——在 Python 里常数比一次遍历的版本大好几倍。这题没有任何需要栈来维护的结构（不像 84 题柱状图要算面积），所以不必为了「用上单调栈」而选它。

---

## 完整代码实现

下面这份与上面是同一个算法，只是收尾写法不同：`left` 一直留在 -1，最后用 `0 if right == -1 else right - left + 1` 判空窗口，等价于上面 `left = n` 配 `max(0, ...)` 的写法。

```python
from typing import List


class Solution:
    """
    最短无序连续子数组 - 双指针一次遍历

    从左向右找右边界：维护最大值，当前值小于最大值则需要排序
    从右向左找左边界：维护最小值，当前值大于最小值则需要排序

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def findUnsortedSubarray(self, nums: List[int]) -> int:
        n = len(nums)
        maxn, right = float("-inf"), -1
        minn, left = float("inf"), -1

        for i in range(n):
            # 从左向右：找右边界
            if maxn > nums[i]:
                right = i
            else:
                maxn = nums[i]

            # 从右向左：找左边界
            if minn < nums[n - i - 1]:
                left = n - i - 1
            else:
                minn = nums[n - i - 1]

        return 0 if right == -1 else right - left + 1
```

---

## 示例推演

以 `nums = [2,6,4,8,10,9,15]` 为例，两个方向同时推进：

| i | `nums[i]` | `maxn` 变化 | `right` | `nums[n-1-i]` | `minn` 变化 | `left` |
|---|---|---|---|---|---|---|
| 0 | 2 | `2 < -inf` 不成立 → `maxn = 2` | -1 | 15 | `15 > inf` 不成立 → `minn = 15` | 7 |
| 1 | 6 | `6 < 2` 不成立 → `maxn = 6` | -1 | 9 | `9 > 15` 不成立 → `minn = 9` | 7 |
| 2 | 4 | `4 < 6` 成立 → `right = 2` | 2 | 10 | `10 > 9` 成立 → `left = 4` | 4 |
| 3 | 8 | `8 < 6` 不成立 → `maxn = 8` | 2 | 8 | `8 > 9` 不成立 → `minn = 8` | 4 |
| 4 | 10 | `10 < 8` 不成立 → `maxn = 10` | 2 | 4 | `4 > 8` 不成立 → `minn = 4` | 4 |
| 5 | 9 | `9 < 10` 成立 → `right = 5` | 5 | 6 | `6 > 4` 成立 → `left = 1` | 1 |
| 6 | 15 | `15 < 10` 不成立 → `maxn = 15` | 5 | 2 | `2 > 4` 不成立 → `minn = 2` | 1 |

- `right` 停在 5：下标 5 的 9 左边有 10，必须往后挪；下标 6 的 15 左边没有比它大的数，不用动。
- `left` 停在 1：下标 1 的 6 右边有 4，必须往前挪；下标 0 的 2 右边没有比它小的数（`min(nums[1:]) = 4`），不用动。

长度 `5 - 1 + 1 = 5`，对应子数组 `[6,4,8,10,9]`。

再看 `nums = [1,2,3,4]`：每次 `nums[i] < maxn` 都不成立（`maxn` 一路跟着 `nums[i]` 走），`right` 保持 -1；`nums[n-1-i] > minn` 也从不成立，`left` 保持 4（即 `n`）。返回 `max(0, -1 - 4 + 1) = 0`。

最后看 `nums = [2,1]`：`i = 1` 时 `nums[1] = 1 < maxn = 2` 更新 `right = 1`，同一轮 `nums[0] = 2 > minn = 1` 更新 `left = 0`，返回 `1 - 0 + 1 = 2`。整个数组就是那个窗口。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 排序后逐位对比 | O(n log n) | O(n) | `sorted` 复制一份，难以想到边界时写它最快 |
| 一次遍历双指针（最优） | O(n) | O(1) | 同一个循环里维护前缀最大值与后缀最小值 |
| 单调栈 | O(n) | O(n) | 定义直译，代码最长、常数也最大 |

---

## 易错点总结

1. **拿相邻元素当参照，而不是前缀最大值 / 后缀最小值**：把 `if nums[i] < maxn` 降级成 `if nums[i] < nums[i-1]`，右往左那半同理与右邻居比，就变成只看邻居。`nums = [5,1,2,3,4]` 会返回 2（正确是 5）——中间的 1、2、3 跟各自邻居比都「正常」，可它们全都得跟着 5 一起挪。而样例 `[2,6,4,8,10,9,15]` 上相邻比较恰好也算出 5，光看样例发现不了。
2. **`maxn` / `minn` 初值写成 0**：`minn < nums[n-1-i]` 对每个正数都成立，`left` 每轮被覆盖成 `n-1-i`，最后停在 0。样例返回 `5 - 0 + 1 = 6` 而不是 5；全负数数组不受影响，已排序的输入又因为 `right == -1` 提前返回 0，所以只有「正数且乱序」才会暴露。

---

## 相关题目

- [215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/)
