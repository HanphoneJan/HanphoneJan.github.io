#
# @lc app=leetcode.cn id=494 lang=python3
# @lcpr version=30204
#
# [494] 目标和
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    目标和 - 0/1背包问题

    核心思路：
    - 将数组分为两部分，一部分加正号，一部分加负号
    - 设正号部分和为P，负号部分和为N，则 P - N = target，且 P + N = sum(nums)
    - 推导得：2P = target + sum(nums)，即 P = (target + sum(nums)) / 2
    - 问题转化为：从数组中选出若干个数，使它们的和等于P

    为什么正确：
    - 如果 target + sum(nums) < 0 或 为奇数，则无解
    - 否则就是经典的0/1背包问题：从nums中选物品，使重量和恰好为P

    时间复杂度：O(n * m) - n为数组长度，m为背包容量
    空间复杂度：O(m) - 一维DP数组
    """

    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        s = sum(nums) - abs(target)
        if s < 0 or s % 2:
            return 0

        m = s // 2  # 背包容量（正号部分的和）
        f = [1] + [0] * m  # f[c]表示凑出和c的方案数
        for x in nums:
            # 倒序遍历，避免重复计算（0/1背包）
            for c in range(m, x - 1, -1):
                f[c] += f[c - x]
        return f[m]

# 记忆化搜索解法（供参考）：
# @cache
# def dfs(i: int, c: int) -> int:
#     if i < 0:
#         return 1 if c == 0 else 0
#     if c < nums[i]:
#         return dfs(i - 1, c)  # 只能不选
#     return dfs(i - 1, c) + dfs(i - 1, c - nums[i])  # 不选 + 选
# @lc code=end



#
# @lcpr case=start
# [1,1,1,1,1]\n3\n
# @lcpr case=end

# @lcpr case=start
# [1]\n1\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([1, 1, 1, 1, 1], 3, 5),
        # sum=5, target=3, s = 5-3=2, m=1
        # 需要正号部分和为1，有5种方式选1个1
        ([1], 1, 1),
        ([1], 2, 0),
        # sum=1, target=2, s=1-2=-1<0, 无解
        ([1, 2, 3], 0, 2),
        # +1+2-3=0, -1-2+3=0，共2种
        ([0, 0, 0, 0, 0], 0, 32),
        # 5个0，每个可以+或-，但效果一样，2^5=32种
    ]

    for nums, target, expected in tests:
        result = sol.findTargetSumWays(nums, target)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} findTargetSumWays({nums}, {target}) = {result}, expected = {expected}")
