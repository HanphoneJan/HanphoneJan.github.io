# @nc app=nowcoder id=4892d3ff304a4880b7a89ba01f48daf9 topic=295 question=1073487 lang=Python3
# 2026-10-15 20:06:44
# https://www.nowcoder.com/practice/4892d3ff304a4880b7a89ba01f48daf9?tpId=295&tqId=1073487
# [BM82] 买卖股票的最好时机(三)

"""
BM82. 买卖股票的最好时机（三）—— 状态机动态规划

题目描述：
给定数组 prices，你最多可以对该股票进行两笔交易（一笔 = 一次买入 + 一次
卖出），再次购买前必须卖出之前的股票。求最大收益；不能获利返回 0。

核心思路：
把整个过程拆成四个状态，滚动更新：
- buy1  ：完成「第一次买入」后的最大收益（此时账面为负）
- sell1 ：完成「第一次卖出」后的最大收益
- buy2  ：完成「第二次买入」后的最大收益
- sell2 ：完成「第二次卖出」后的最大收益
每天依次用当天价格更新这四者，最后 sell2 就是答案。
初值设为 -inf，保证「最多两笔」——即使只做一笔，
sell2 也会通过 sell1 直接转移得到同样的值。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
prices = [8,9,3,5,1,3]

样例输出 1:
4
"""
# @sample-end

# @sample-start
"""
样例输入 2:
prices = [9,8,4,1]

样例输出 2:
0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
prices = [1,2,8,3,8]

样例输出 3:
12
"""
# @sample-end

# @nc code=start

from typing import List

NEG = float('-inf')


class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        """最多两笔交易：四状态滚动 DP"""
        buy1 = sell1 = buy2 = sell2 = NEG
        for p in prices:
            buy1 = max(buy1, -p)             # 第一次买入：账面 -p
            sell1 = max(sell1, buy1 + p)     # 第一次卖出
            buy2 = max(buy2, sell1 - p)      # 第二次买入
            sell2 = max(sell2, buy2 + p)     # 第二次卖出
        return max(sell2, 0)


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([8, 9, 3, 5, 1, 3], 4),
        ([9, 8, 4, 1], 0),
        ([1, 2, 8, 3, 8], 12),
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
