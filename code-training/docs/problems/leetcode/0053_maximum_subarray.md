---
title: 53. 最大子数组和
platform: LeetCode
difficulty: Medium
id: 53
url: https://leetcode.cn/problems/maximum-subarray/
tags:
  - 数组
  - 动态规划
  - 分治
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
  - ../../patterns/recursion.md
date_added: 2026-03-23
date_reviewed: []
---

# 0053. 最大子数组和

## 题目描述

给你一个整数数组 `nums` ，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。

**子数组** 是数组中的一个连续部分。

## 示例

**示例 1：**
```
输入：nums = [-2,1,-3,4,-1,2,1,-5,4]
输出：6
解释：连续子数组 [4,-1,2,1] 的和最大，为 6 。
```

**示例 2：**
```
输入：nums = [1]
输出：1
```

**示例 3：**
```
输入：nums = [5,4,-1,7,8]
输出：23
解释：整个数组的和最大，为 23 。
```

---

## 解题思路

### 先明确输出：答案是「所有以某处结尾的子数组」里最大的那个和

输出是一个数，不是子数组本身，也不是「以最后一个元素结尾」的那一段的和。这句话决定了状态该长什么样：**得给「右端点」留一个位置**，再到所有右端点上取最大值。

只记住一个「当前最优」不够用：下一步能不能接上，取决于上一段是不是**正好贴着当前元素结束**。同样和很大的两段，一段停在 `nums[i-1]`，就能顺势延长；另一段在别处结束，接到 `nums[i]` 上中间就断了。

于是定义：`dp[i]` = 以 `nums[i]` 结尾的最大子数组和。任何子数组都唯一对应一个右端点，所以答案是 `max(dp)`。

### 关键观察：接上还是另起，只看上一段的正负

固定右端点 `i`，这一段子数组的左端点只有两种处境：

- 左端点就是 `i` 自己，和是 `nums[i]`；
- 左端点在 `i` 之前，那么 `[l, i]` 去掉 `nums[i]` 之后就是 `[l, i-1]` —— 一个以 `i-1` 结尾的子数组。要让总和最大，就该取其中和最大的那个，也就是 `dp[i-1]`。

两者取大：

```text
dp[i] = max(nums[i], dp[i-1] + nums[i])
```

后一项比前一项小，当且仅当 `dp[i-1] < 0`：前一段是净亏损，不如砍掉从头开始。这一条判断就是 Kadane 算法里的 `if current_sum < 0`。

### 方法一：直接枚举左右端点（O(n²)，用来对照）

最直白的写法是固定右端点，让左端点往左退，边退边累加：

```python
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = nums[0]
        for i in range(len(nums)):
            cur = 0
            for j in range(i, -1, -1):     # 左端点往左退，边退边加
                cur += nums[j]
                best = max(best, cur)
        return best
```

它把「以 `i` 结尾的所有子数组」都看了一遍，`O(n²)`，`n = 10^5` 时过不了。写出来是为了看清一件事：**右端点固定后，左端点有 `i+1` 种选择，而上面那条转移把这一整排压成了一个数。**

### 方法二：按定义填表（dp 数组，最贴推理）

```python
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        dp = [0] * len(nums)
        dp[0] = nums[0]
        best = dp[0]
        for i in range(1, len(nums)):
            dp[i] = max(nums[i], dp[i - 1] + nums[i])
            best = max(best, dp[i])
        return best
```

`dp[0]` 只能是 `nums[0]`（哪怕它是负数），`best` 也必须用它起手 —— 全负数组的答案是那个最大的负数，不是 0。循环从下标 1 开始，因为 `dp[0]` 已经在初始化时算过了。

### 方法三：Kadane，把表压成一个变量（O(1) 空间）

`dp[i]` 只用到 `dp[i-1]`，整个数组可以换成一个滚动变量。转移写成 `max(x, cur + x)` 之后只剩三行：

```python
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        cur = best = nums[0]
        for x in nums[1:]:
            cur = max(x, cur + x)     # 前一段是净亏损就另起一段
            best = max(best, cur)
        return best
```

`cur = max(x, cur + x)` 与完整代码里 `if current_sum < 0: current_sum = nums[i] else: current_sum += nums[i]` 判断的是同一件事：`cur + x < x` 当且仅当 `cur < 0`。前者少一个分支，后者把「为什么」写在了注释里。

### 方法四：分治，从中间切开（O(n log n)）

换一个完全不同的切法：取中点 `mid`，把数组分成左右两半。最大子数组只有三种落点 —— 全在左半、全在右半、**跨过中点**。前两种递归求解；第三种必须同时包含 `nums[mid]` 与 `nums[mid+1]`，于是可以从中间向两侧各扩展出一段最大和再拼起来。

```python
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        def solve(lo: int, hi: int) -> int:
            if lo == hi:
                return nums[lo]
            mid = (lo + hi) // 2
            # 情况一、二：完全落在某一半里
            best = max(solve(lo, mid), solve(mid + 1, hi))
            # 情况三：跨中点。左半取「含 mid 的最大后缀」
            left = cur = nums[mid]
            for i in range(mid - 1, lo - 1, -1):
                cur += nums[i]
                left = max(left, cur)
            # 右半取「含 mid+1 的最大前缀」
            right = cur = nums[mid + 1]
            for i in range(mid + 2, hi + 1):
                cur += nums[i]
                right = max(right, cur)
            return max(best, left + right)

        return solve(0, len(nums) - 1)
```

关键在于**左半只取含 `mid` 的后缀、右半只取含 `mid+1` 的前缀**：两段拼起来才是一条连续且恰好跨过中点的子数组，`mid` 也只被算一次。

分治是 `O(n log n)`，比 Kadane 慢，递归还要 `O(log n)` 的栈。它值得写下来的理由是：当数组会被**反复修改、反复查询区间最大子数组**时，「左半最优 / 右半最优 / 跨中点最优 / 区间总和」这四个数正好能挂在线段树的节点上，合并一次 `O(1)`、查询 `O(log n)`；而 Kadane 每改一个数都得重扫一遍。单次查询的场景不要用它。

### 四种写法怎么选

| 写法 | 时间 | 空间 | 什么时候用 |
|---|---|---|---|
| 枚举左右端点 | O(n²) | O(1) | 只想说明「右端点固定后左端点有很多选择」 |
| dp 数组 | O(n) | O(n) | 第一次写，转移一眼可见 |
| Kadane | O(n) | O(1) | 默认写法 |
| 分治 | O(n log n) | O(log n) | 区间会被修改，或需要回答多次区间查询 |

---

## 完整代码实现

下面这段是本题的基准实现（页面上的「跑样例」与逐帧可视化回放的也是这一段）：第一个方法用 `if current_sum < 0` 判断是否另起一段，第二个方法按定义填表，方便对照。更短的 `max(x, cur + x)` 写法与分治版见上文。

```python
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        """
        最大子数组和 - Kadane算法

        核心思想：维护以当前位置结尾的最大子数组和
        """
        # 当前子数组和（以当前元素结尾的最大子数组和）
        current_sum = nums[0]
        # 全局最大子数组和
        max_sum = nums[0]

        for i in range(1, len(nums)):
            # 关键决策：
            # 如果当前子数组和 < 0，说明前面的子数组对后面是负贡献
            # 不如从当前元素重新开始
            if current_sum < 0:
                current_sum = nums[i]
            else:
                current_sum += nums[i]

            # 更新全局最大值
            max_sum = max(max_sum, current_sum)

        return max_sum

    def maxSubArrayDP(self, nums: List[int]) -> int:
        """
        标准动态规划写法，更容易理解
        """
        n = len(nums)
        # dp[i] = 以 nums[i] 结尾的最大子数组和
        dp = [0] * n
        dp[0] = nums[0]
        max_sum = dp[0]

        for i in range(1, n):
            # 状态转移：要么重新开始，要么延续前面的子数组
            dp[i] = max(nums[i], dp[i-1] + nums[i])
            max_sum = max(max_sum, dp[i])

        return max_sum
```

---

## 示例推演

以示例 1 的 `nums = [-2,1,-3,4,-1,2,1,-5,4]` 为例。`dp[i]` 是「以 `nums[i]` 结尾」的最大和，`best` 是所有 `dp` 里的最大值：

| i | `nums[i]` | `dp[i-1]` | `dp[i-1] + nums[i]` | `dp[i] = max(...)` | `best` |
|---|---|---|---|---|---|
| 0 | -2 | — | — | **-2**（起点） | -2 |
| 1 | 1 | -2 | -1 | **1**（丢弃 -2，重新开始） | 1 |
| 2 | -3 | 1 | -2 | **-2**（延续） | 1 |
| 3 | 4 | -2 | 2 | **4**（丢弃 -2，重新开始） | 4 |
| 4 | -1 | 4 | 3 | **3**（延续） | 4 |
| 5 | 2 | 3 | 5 | **5**（延续） | 5 |
| 6 | 1 | 5 | 6 | **6**（延续） | 6 |
| 7 | -5 | 6 | 1 | **1**（延续） | 6 |
| 8 | 4 | 1 | 5 | **5**（延续） | 6 |

两个「重新开始」的格子值得对照着看：`i = 1` 时 `dp[0] = -2 < 0`，接上去只有 `-1`，不如只要 `nums[1] = 1`；`i = 3` 时 `dp[2] = -2 < 0`，接上去只有 `2`，不如只要 `nums[3] = 4`。

最终 `best = 6`，来自 `dp[6]`，对应子数组 `nums[3..6] = [4,-1,2,1]`。

示例 2 只有一个元素，循环一次都不执行，直接返回 `dp[0] = 1`。示例 3 `[5,4,-1,7,8]` 全程 `dp[i-1] >= 0`，没有一次另起，`dp` 依次是 `5, 9, 8, 15, 23`，答案 23，正好是整个数组。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 枚举左右端点 | O(n²) | O(1) | 固定右端点后左端点逐个回退 |
| 分治 | O(n log n) | O(log n) | 跨中点的一段单独算，适合区间查询 |
| DP 数组 | O(n) | O(n) | 按定义填表 |
| Kadane（最优） | O(n) | O(1) | 只滚动一个变量，每个元素看一次 |

---

## 易错点总结

1. **`current_sum` / `max_sum` 初始化成 0**：全负数组会返回 0，而正确答案是那个最大的负数（`nums = [-3,-1,-2]` 应返回 `-1`）。改成 `nums[0]` 即可，`dp[0]` 同理。
2. **循环写成 `for i in range(len(nums))`**：`nums[0]` 在初始化时已经用掉，下标 0 会被再加一次。`nums = [5,4,-1,7,8]` 会返回 28（10+4-1+7+8）而不是 23。
3. **分治版两侧扩展都从 `mid` 起算**：`mid` 被前后各加一次。`nums = [1,1]` 时 `left = 1`、`right = 2`（`nums[0] + nums[1]`），返回 3，而正确答案是 2。右半必须从 `mid + 1` 起算。

---

## 扩展思考

### 1. 怎么连起止下标一起返回

Kadane 只记和，加上两个「候选起点」就能还原区间：另存一个 `temp_start` 记录当前这一段从哪开始，只有真正刷新 `best` 时才把它转正成 `start`。

```python
from typing import List

class Solution:
    def maxSubArrayWithRange(self, nums: List[int]) -> tuple:
        cur = best = nums[0]
        start = end = temp_start = 0

        for i in range(1, len(nums)):
            if cur < 0:
                cur = nums[i]
                temp_start = i              # 从 i 重新开始
            else:
                cur += nums[i]

            if cur > best:                  # 只有刷新了全局最优，才认这段的起点
                best = cur
                start = temp_start
                end = i

        return best, start, end
```

「只有刷新时才认起点」这一步不能省：`cur` 中途可能是负的，那些 `temp_start` 都不该被记住。

### 2. 如果子数组长度至少为 k

前缀和 `pre[i] = nums[0] + ... + nums[i-1]` 之后，`[j, i-1]` 的和是 `pre[i] - pre[j]`，长度至少 `k` 意味着 `j <= i - k`。于是答案是 `max(pre[i] - min(pre[j]))`，其中 `j <= i - k`。用单调队列维护这个滑动窗口的最小前缀和，`O(n)`；直接两重循环是 `O(n²)`。

---

## 相关题目

- [152. 乘积最大子数组](https://leetcode.cn/problems/maximum-product-subarray/)
- [918. 环形子数组的最大和](https://leetcode.cn/problems/maximum-sum-circular-subarray/)
- [974. 和可被 K 整除的子数组](https://leetcode.cn/problems/subarray-sums-divisible-by-k/)
