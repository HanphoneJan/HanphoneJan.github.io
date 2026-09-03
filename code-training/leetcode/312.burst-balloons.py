#
# @lc app=leetcode.cn id=312 lang=python3
# @lcpr version=30204
#
# [312] 戳气球
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    戳气球 - 区间动态规划

    核心思路：
    - 在数组两端添加虚拟气球1，这样每个真实气球被戳破时，左右边界都确定了
    - dp[i][j] 表示戳破 (i,j) 开区间内所有气球能获得的最大硬币数
    - 枚举区间内最后一个被戳破的气球k，将大问题分解为左右两个子问题

    为什么正确：
    - 最后一个被戳破的气球k，其左右两边(i,k)和(k,j)的气球已经被戳破
    - 此时戳破k获得的硬币 = nums[i] * nums[k] * nums[j]
    - 左右子问题的最优解加上当前收益，就是整体最优解

    状态转移方程：
    dp[i][j] = max(dp[i][k] + dp[k][j] + nums[i] * nums[k] * nums[j])，其中 i < k < j

    时间复杂度：O(n^3) - 枚举区间长度、左端点、分割点
    空间复杂度：O(n^2) - 二维DP数组
    """

    def maxCoins(self, nums: List[int]) -> int:
        # 在数组两端添加虚拟气球1，简化边界处理
        nums = [1] + nums + [1]
        n = len(nums)

        # dp[i][j] 表示戳破 (i,j) 开区间内所有气球能获得的最大硬币数
        dp = [[0] * n for _ in range(n)]

        # 按区间长度从小到大枚举（长度至少为2才有中间元素）
        for length in range(2, n):
            for i in range(n - length):
                j = i + length
                # 枚举 (i,j) 区间内最后一个被戳破的气球 k
                for k in range(i + 1, j):
                    dp[i][j] = max(
                        dp[i][j],
                        dp[i][k] + dp[k][j] + nums[i] * nums[k] * nums[j]
                    )

        return dp[0][n - 1]

# @lc code=end



#
# @lcpr case=start
# [3,1,5,8]\n
# @lcpr case=end

# @lcpr case=start
# [1,5]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([3, 1, 5, 8], 167),
        # 解释：nums = [3,1,5,8]，添加虚拟气球后为 [1,3,1,5,8,1]
        # 最优策略：先戳1(3*1*5=15)，再戳5(3*5*8=120)，再戳3(1*3*8=24)，最后戳8(1*8*1=8)
        # 总硬币：15 + 120 + 24 + 8 = 167
        ([1, 5], 10),
        # 解释：先戳1(1*1*5=5)，再戳5(1*5*1=5)，总10；或先戳5再戳1也是10
        ([1], 1),
        ([], 0),
    ]

    for nums, expected in tests:
        result = sol.maxCoins(nums)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} maxCoins({nums}) = {result}, expected = {expected}")
