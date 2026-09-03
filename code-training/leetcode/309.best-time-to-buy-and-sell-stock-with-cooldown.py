#
# @lc app=leetcode.cn id=309 lang=python3
# @lcpr version=30204
#
# [309] 买卖股票的最佳时机含冷冻期
#


# @lcpr-template-start
from typing import List
from math import inf
from functools import cache


# @lcpr-template-end
# @lc code=start
class Solution:
    """
    买卖股票的最佳时机含冷冻期 - 状态机动态规划

    核心思想：
    每天结束时，我们处于以下两种状态之一：
    - 持有股票（hold）
    - 不持有股票（not hold）

    与普通股票问题的区别：卖出后需要冷冻一天才能再次买入。
    这意味着：第 i 天买入时，依赖的是第 i-2 天的不持有状态。

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def maxProfitBruteForce(self, prices: List[int]) -> int:
        """
        解法一：暴力枚举（超时，仅供理解）

        思路：枚举每一天的操作（买入/卖出/冷冻/什么都不做）
        每天有4种选择，n天就是 O(4^n)，不可行。

        为什么超时？因为存在大量重复子问题，同一状态被多次计算。
        """
        n = len(prices)

        def dfs(day: int, hold: bool, cooldown: bool) -> int:
            """
            day: 当前天数
            hold: 是否持有股票
            cooldown: 是否处于冷冻期
            返回：从 day 开始到最后的最大利润
            """
            if day == n:
                return 0

            # 什么都不做
            best = dfs(day + 1, hold, False)

            if hold:
                # 持有股票，可以选择卖出
                best = max(best, prices[day] + dfs(day + 1, False, True))
            else:
                if not cooldown:
                    # 不持有且不在冷冻期，可以买入
                    best = max(best, -prices[day] + dfs(day + 1, True, False))

            return best

        return dfs(0, False, False)

    def maxProfitMemo(self, prices: List[int]) -> int:
        """
        解法二：记忆化搜索（DFS + 缓存）

        核心思想：
        暴力法的问题在于重复计算。用 cache 缓存 (day, hold) 的结果。

        状态定义：
        dfs(i, hold) = 从第 i 天开始，当前持有/不持有股票的最大利润

        状态转移：
        - dfs(i, 持有) = max(继续持有, 卖出后进入冷冻期)
                          = max(dfs(i+1, 持有), prices[i] + dfs(i+2, 不持有))
                          注意：卖出后下一天不能买入，所以从 i+2 继续
        - dfs(i, 不持有) = max(继续不持有, 买入)
                            = max(dfs(i+1, 不持有), -prices[i] + dfs(i+1, 持有))
                            注意：买入不受冷冻期限制，从 i+1 继续

        时间复杂度：O(n) - 每个状态只计算一次
        空间复杂度：O(n) - 递归栈深度 + 缓存
        """
        n = len(prices)

        @cache
        def dfs(i: int, hold: bool) -> int:
            if i >= n:
                return 0

            if hold:
                # 持有：保持持有 或 卖出（卖出后冷冻一天，从 i+2 继续）
                return max(
                    dfs(i + 1, True),                # 不卖
                    prices[i] + dfs(i + 2, False)    # 卖出，跳过冷冻期
                )
            else:
                # 不持有：保持不持有 或 买入（买入不受冷冻期限制）
                return max(
                    dfs(i + 1, False),               # 不买
                    -prices[i] + dfs(i + 1, True)    # 买入
                )

        return dfs(0, False)

    def maxProfit(self, prices: List[int]) -> int:
        """
        解法三：状态压缩动态规划（最优）

        核心思想：
        将记忆化搜索改为迭代形式，并压缩状态空间。

        状态定义：
        - f0: 第 i 天结束时，不持有股票的最大利润
        - f1: 第 i 天结束时，持有股票的最大利润
        - pre0: 第 i-1 天结束时，不持有股票的最大利润
                  （用于冷冻期判断：买入时只能从前天的不持有状态转移）

        状态转移：
        - 不持有 = max(前一天不持有, 前一天持有+卖出)
                   f0 = max(f0, f1 + price)
        - 持有 = max(前一天持有, 前天不持有-买入)
                 f1 = max(f1, pre0 - price)
                 注意：买入依赖 pre0（前天不持有），因为昨天卖出后有冷冻期

        同时更新技巧：
        pre0, f0, f1 = f0, max(f0, f1 + p), max(f1, pre0 - p)
        先保存当前 f0 到 pre0，再用旧的 f0 和 f1 计算新的 f0 和 f1

        时间复杂度：O(n) - 只需遍历价格数组一次
        空间复杂度：O(1) - 只使用 3 个变量
        """
        pre0, f0, f1 = 0, 0, -inf  # pre0 表示两天前的不持有状态
        for p in prices:
            # 同时更新三个状态：
            # pre0 <- f0（当前 f0 变成下一次的 pre0）
            # f0 <- max(保持不持有, 卖出) = max(f0, f1 + p)
            # f1 <- max(保持持有, 前天不持有-买入) = max(f1, pre0 - p)
            pre0, f0, f1 = f0, max(f0, f1 + p), max(f1, pre0 - p)
        return f0


# @lc code=end



#
# @lcpr case=start
# [1,2,3,0,2]\n
# @lcpr case=end

# @lcpr case=start
# [1]\n
# @lcpr case=end

#

# ========== 示例推演：prices = [1,2,3,0,2] ==========
#
# 最优交易序列：
#   第0天买入(1) → 第1天卖出(2) 利润+1 → 冷冻第2天
#   → 第3天买入(0) → 第4天卖出(2) 利润+2
#   总利润 = 3
#
# DP状态转移表：
# ┌─────┬────────┬────────┬────────┬────────────────────────┐
# │ 天  │ 价格   │ pre0   │ f0     │ f1     │ 说明           │
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 初  │ -      │ 0      │ 0      │ -inf   │ 初始状态       │
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 0   │ 1      │ 0      │ 0      │ -1     │ 买入(1)        │
# │     │        │        │        │        │ f0=max(0,-inf+1)=0 │
# │     │        │        │        │        │ f1=max(-inf,0-1)=-1│
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 1   │ 2      │ 0      │ 1      │ -1     │ 卖出(2)        │
# │     │        │        │        │        │ f0=max(0,-1+2)=1   │
# │     │        │        │        │        │ f1=max(-1,0-2)=-1  │
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 2   │ 3      │ 1      │ 1      │ -1     │ 冷冻期，不操作 │
# │     │        │        │        │        │ f0=max(1,-1+3)=1   │
# │     │        │        │        │        │ f1=max(-1,1-3)=-1  │
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 3   │ 0      │ 1      │ 1      │ 1      │ 买入(0)        │
# │     │        │        │        │        │ f0=max(1,-1+0)=1   │
# │     │        │        │        │        │ f1=max(-1,1-0)=1   │
# ├─────┼────────┼────────┼────────┼────────┼────────────────┤
# │ 4   │ 2      │ 1      │ 3      │ 1      │ 卖出(2)        │
# │     │        │        │        │        │ f0=max(1,1+2)=3    │
# │     │        │        │        │        │ f1=max(1,1-2)=1    │
# └─────┴────────┴────────┴────────┴────────┴────────────────┘
#
# 最终结果：f0 = 3


if __name__ == "__main__":
    sol = Solution()

    tests = [
        # (价格列表, 期望利润, 说明)
        ([1, 2, 3, 0, 2], 3, "基本示例"),
        ([1], 0, "只有一天，无法交易"),
        ([1, 2, 3, 0, 2, 5], 6, "第0天买(1)第1天卖(2)利润1，冷冻，第3天买(0)第5天卖(5)利润5，总6"),
        ([2, 1, 4], 3, "第1天买(1)，第2天卖(4)利润3"),
        # 边界：价格递减
        ([5, 4, 3, 2, 1], 0, "一直跌，不交易最优"),
        # 边界：价格递增
        ([1, 2, 3, 4, 5], 4, "第0天买第4天卖利润4，冷冻期不影响"),
        # 边界：交替波动
        ([1, 2, 1, 2, 1, 2], 2, "买入(1)->卖出(2)利润1，冷冻，买入(1)->卖出(2)利润1，总2"),
    ]

    for prices, expected, desc in tests:
        result = sol.maxProfit(prices)
        result_memo = sol.maxProfitMemo(prices)
        status = "✓" if result == expected and result_memo == expected else "✗"
        print(f"{status} maxProfit({prices}) = {result} (memo={result_memo}), expected = {expected}  [{desc}]")
