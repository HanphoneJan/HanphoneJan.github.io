---
title: 最长不下降子序列
platform: NowCoder
difficulty: 简单
id: BISHI133
url: https://www.nowcoder.com/practice/25da45d0d4fb4faba45094cbb0649062
tags:
  - 动态规划
  - 二分查找
  - 贪心
  - 最长上升子序列
topics: []
patterns:
  - ../../patterns/dynamic_programming.md
  - ../../patterns/greedy.md
  - ../../patterns/search.md
date_added: 2026-10-16
date_reviewed: []
---

# BISHI133. 最长不下降子序列

## 题目描述

给定由 n 个正整数组成的数组 A，请你计算该数组的最长不下降子序列
（Longest Non-decreasing Subsequence，简称 LNDS）长度。

对于一条子序列，要求保留原数组中的相对顺序，并满足子序列中的元素
依次不小于前一个元素。子序列为从原数组中删除任意个元素后得到的新数组。

## 输入格式

第一行输入一个整数 n，代表数组的元素数量。
第二行输入 n 个整数 A[i]，代表数组元素。

## 输出格式

在一行上输出一个整数，表示最长不下降子序列的长度。

## 示例

### 示例 1

**输入：**
```
6
1 2 4 2 3 4
```

**输出：**
```
5
```

**说明：**
可以选择子序列 1, 2, 2, 3, 4，满足单调不降，长度为 5。

### 示例 2

**输入：**
```
5
5 4 3 2 1
```

**输出：**
```
1
```

**说明：**
任意两个数都不满足不降关系，最长只能取单个元素，长度为 1。

---

## 解题思路

### 第一步：理解问题本质

「子序列」不要求连续，只要求保持相对顺序。要在所有子序列里找一条
最长的、元素不递减的。这是一个经典的动态规划问题。

### 第二步：O(n²) 动态规划

设 `dp[i]` 表示「以 A[i] 结尾的最长不下降子序列长度」。
转移时枚举它前面所有不超过它的元素：

```python
for i in range(n):
    # 只取 A[i] 自己也是一条合法子序列，长度至少为 1
    dp[i] = 1
    # 候选前缀只能来自 i 之前，因为子序列必须保持原数组的相对顺序
    for j in range(i):
        # 不下降允许相等，所以判等用 <=；严格上升才写 <
        if A[j] <= A[i]:
            # 接在「以 j 结尾」的最优解后面，长度加一
            dp[i] = max(dp[i], dp[j] + 1)
```

答案是 `max(dp)`。正确但 O(n²)，n 较大时会超时。

### 第三步：贪心 + 二分 O(n log n)

维护一个辅助数组 `tails`，其中 `tails[k]` 表示「长度为 k+1 的
不下降子序列的**最小可能结尾**」。它天然是**非递减**的，可以二分。

遍历每个元素 x：

- 用 `bisect_right(tails, x)` 找到第一个**严格大于 x** 的位置 `pos`；
- 若 `pos == len(tails)`，说明 x 能接在当前最长序列后面，追加；
- 否则用 x 替换 `tails[pos]`（让结尾更小，未来更容易接上）。

遍历结束后 `len(tails)` 就是答案。

**为什么用 `bisect_right` 而不是 `bisect_left`？**
因为是不下降（允许相等）。对于严格上升子序列要用 `bisect_left`，
两者差一个等号，这是本题最容易写错的地方。

---

## 完整代码实现

```python
import sys
from bisect import bisect_right


def solve() -> None:
    """O(n log n) 求最长不下降子序列长度"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = list(map(int, data[1:1 + n]))

    tails = []  # tails[k] = 长度 k+1 的不下降子序列的最小结尾
    for x in arr:
        # 不下降：找第一个「大于 x」的位置替换（相等可以接在后面）
        pos = bisect_right(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    sys.stdout.write(str(len(tails)) + "\n")


if __name__ == "__main__":
    solve()
```

---

## 示例推演

以 `1 2 4 2 3 4` 为例，`tails` 的变化：

| 处理 x | bisect_right 结果 | tails |
|--------|--------------------|-------|
| 1 | 空 → 追加 | [1] |
| 2 | 1 → 追加 | [1, 2] |
| 4 | 2 → 追加 | [1, 2, 4] |
| 2 | 2 → 替换（4 换成 2） | [1, 2, 2] |
| 3 | 3 → 追加 | [1, 2, 2, 3] |
| 4 | 4 → 追加 | [1, 2, 2, 3, 4] |

最终 `len(tails) = 5`，与答案一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| O(n²) DP | O(n²) | O(n) | 直观，n 大时超时 |
| 贪心 + 二分 | O(n log n) | O(n) | 推荐 |

---

## 易错点总结

1. **二分用错（严格上升 vs 不下降）**：不下降用 `bisect_right`，严格上升用 `bisect_left`。写反了，相等元素会被当成下降，答案偏小。

---

## 扩展思考

- 把 `bisect_right` 换成 `bisect_left` 就变成「最长严格上升子序列」。
- 要求输出具体的子序列时，需要在替换时记录每个位置的前驱。
- 「最长下降子序列」只需把数组取负，再套同样的模板。

---

## 相关题目

- [BISHI134. 最大子段和](BISHI134.最大子段和.md)
- [BISHI136. 【模板】01背包](BISHI136.模板01背包.md)
