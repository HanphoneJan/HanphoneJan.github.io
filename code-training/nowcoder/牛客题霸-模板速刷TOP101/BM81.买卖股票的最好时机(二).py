# @nc app=nowcoder id=9e5e3c2603064829b0a0bbfca10594e9 topic=295 question=1073471 lang=Python3
# 2026-10-15 20:06:41
# https://www.nowcoder.com/practice/9e5e3c2603064829b0a0bbfca10594e9?tpId=295&tqId=1073471
# [BM81] 买卖股票的最好时机(二)

"""
BM81. 买卖股票的最好时机（二）—— 贪心

题目描述：
给定数组 prices，你可以多次买卖该股票，但再次购买前必须卖出之前的股票
（同一时刻最多持有一股）。求最大收益；不能获利返回 0。

核心思路（贪心）：
只要能赚钱就做这笔交易 —— 把价格序列拆成一段段上涨的「小波段」，
把每一段相邻两天的正差价都赚到手，总和就是最大收益。
因为「第 i 天买入、第 j 天卖出」的收益正好等于这中间所有相邻正差价之和，
所以逐日累加正差价不会错过任何利润。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
prices = [8,9,2,5,4,7,1]

样例输出 1:
7
"""
# @sample-end

# @sample-start
"""
样例输入 2:
prices = [5,4,3,2,1]

样例输出 2:
0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
prices = [1,2,3,4,5]

样例输出 3:
4
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        """多次交易：累加所有相邻正差价"""
        profit = 0
        for i in range(1, len(prices)):
            if prices[i] > prices[i - 1]:
                profit += prices[i] - prices[i - 1]
        return profit


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([8, 9, 2, 5, 4, 7, 1], 7),
        ([5, 4, 3, 2, 1], 0),
        ([1, 2, 3, 4, 5], 4),
        ([7, 1, 5, 3, 6, 4], 7),
    ]
    for i, (prices, expected) in enumerate(tests, 1):
        actual = Solution().maxProfit(prices)
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected}, 实际={actual})")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        _run_tests()

# @nc code=end
