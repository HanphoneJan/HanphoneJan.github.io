---
title: 121. 买卖股票的最佳时机
platform: LeetCode
difficulty: Easy
id: 121
url: https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/
tags:
  - 数组
  - 动态规划
  - 贪心
topics: []
patterns:
  - ../../patterns/greedy.md
date_added: 2026-03-24
date_reviewed: []
---

# 121. 买卖股票的最佳时机

## 题目描述

给定一个数组 `prices`，它的第 `i` 个元素 `prices[i]` 表示一支给定股票第 `i` 天的价格。

你只能选择**某一天**买入这只股票，并选择在**未来的某一个不同的日子**卖出该股票。设计一个算法来计算你所能获取的最大利润。

返回你可以从这笔交易中获取的最大利润。如果你不能获取任何利润，返回 `0`。

**提示：**

- `1 <= prices.length <= 10^5`
- `0 <= prices[i] <= 10^4`

## 示例

### 示例 1

**输入：** prices = [7,1,5,3,6,4]

**输出：** 5

**解释：** 在第 2 天（价格 1）买入，第 5 天（价格 6）卖出，利润 `6 - 1 = 5`。

### 示例 2

**输入：** prices = [7,6,4,3,1]

**输出：** 0

**解释：** 价格一路下跌，任何买入都比卖出贵，不交易，利润为 0。

## 解题思路

枚举「在哪一天卖出」，买入日就确定了：一定是这天之前价格最低的那一天。所以只需要一边从左往右扫，一边记住「到目前为止的最低价格」，每遇到一天就算一次「今天卖能赚多少」，取最大值。O(n) 时间、O(1) 空间。

### 卖出日固定时，买入日取前缀最小

设今天是第 `i` 天、价格为 `p`。如果今天卖出，买入价越低利润越高，而买入日只能从 `[0, i-1]` 里挑，所以最优买入价就是前缀最小值 `min_price`。

```python
min_price = prices[0]
best = 0
for p in prices[1:]:
    best = max(best, p - min_price)   # 先按「今天卖」结算
    min_price = min(min_price, p)     # 再把今天并入前缀
```

`best` 初值是 0 而不是 `-inf`：题目允许「不交易」，利润最低就是 0。用 `-inf` 起的话，一路下跌的数组会返回一个负数。

### 顺序其实不影响结果

上面两行交换顺序也能跑通：如果 `p` 比 `min_price` 小，`p - min_price` 是负数，不会更新 `best`，随后 `min_price` 照样被更新。先算后更新读起来更贴近「今天卖、之前买」的语义，但不必把它当成必须遵守的规则。

### 推演：示例 1

`prices = [7,1,5,3,6,4]`，初始 `min_price = 7`、`best = 0`。

| 天 | 价格 | `p - min_price` | `best` | 更新后 `min_price` |
| --- | --- | --- | --- | --- |
| 1 | 1 | −6 | 0 | 1 |
| 2 | 5 | 4 | 4 | 1 |
| 3 | 3 | 2 | 4 | 1 |
| 4 | 6 | 5 | 5 | 1 |
| 5 | 4 | 3 | 5 | 1 |

答案是 5：第 2 天买入（价格 1）、第 5 天卖出（价格 6）。示例 2 里每天都在创新低，`p - min_price` 全是 0 或负数，`best` 一直是 0。

## 完整代码实现

```python
from typing import List


class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        min_price = prices[0]      # 到目前为止的最低买入价
        best = 0                   # 不交易，利润为 0
        for p in prices[1:]:
            best = max(best, p - min_price)   # 今天卖出能赚多少
            min_price = min(min_price, p)     # 今天也可以成为以后的买入日
        return best
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 枚举买入日与卖出日 | O(n²) | O(1) | n = 10^5 时约 5 × 10^9 对 |
| 一次扫描，维护前缀最小值（最优） | O(n) | O(1) | 每个价格只算一次差、更新一次最小值 |

## 易错点总结

### 1. 用「最大值减最小值」当答案

`max(prices) - min(prices)` 忽略了「买入必须在卖出之前」。示例 2 的 `[7,6,4,3,1]` 会得到 `7 - 1 = 6`，而这一天的最低点在最后、最高点在最前，根本没法交易，正确答案是 0。

### 2. `best` 初值用 `-inf`

从 `-inf` 起、最后直接返回 `best`，一路下跌的示例 2 会返回 `-1` 而不是 0。题目允许「不交易」，利润的下界是 0。

## 扩展思考

- 把每天的涨跌看成差分数组，最大利润等于「最大子段和」，和 [53. 最大子数组和](https://leetcode.cn/problems/maximum-subarray/) 是同一个模型。
- 允许多次买卖时（[122. 买卖股票的最佳时机 II](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/)）把每个上涨段都吃掉即可；含冷冻期则是 [309](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-cooldown/)。
