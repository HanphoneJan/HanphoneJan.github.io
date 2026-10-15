# @nc app=nowcoder id=64b4262d4e6d4f6181cd45446a5821ec topic=295 question=625 lang=Python3
# 2026-10-15 20:06:38
# https://www.nowcoder.com/practice/64b4262d4e6d4f6181cd45446a5821ec?tpId=295&tqId=625
# [BM80] 买卖股票的最好时机(一)

"""
BM80. 买卖股票的最好时机（一）—— 贪心

题目描述：
给定数组 prices，prices[i] 是股票第 i 天的价格。
你只能买入一次、卖出一次，且买入必须在卖出之前的某一天。
求能获得的最大收益；如果不能获利返回 0。

核心思路：
遍历每一天，把「当天价格 - 之前见过的最低价格」作为「当天卖出」的收益，
取所有天里的最大值。只用一个变量记录「到目前为止的最低买入价」即可，
不需要真的去枚举买入日。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
prices = [8,9,2,5,4,7,1]

样例输出 1:
5
"""
# @sample-end

# @sample-start
"""
样例输入 2:
prices = [2,4,1]

样例输出 2:
2
"""
# @sample-end

# @sample-start
"""
样例输入 3:
prices = [3,2,1]

样例输出 3:
0
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        """一次交易：维护历史最低价，更新最大利润"""
        min_price = float('inf')
        best = 0
        for p in prices:
            min_price = min(min_price, p)      # 到当天为止的最低价
            best = max(best, p - min_price)    # 今天卖出的最大收益
        return best


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([8, 9, 2, 5, 4, 7, 1], 5),
        ([2, 4, 1], 2),
        ([3, 2, 1], 0),
        ([1], 0),
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
