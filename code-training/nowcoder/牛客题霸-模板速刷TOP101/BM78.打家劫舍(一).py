# @nc app=nowcoder id=c5fbf7325fbd4c0ea3d0c3ea6bc6cc79 topic=295 question=2285793 lang=Python3
# 2026-10-15 20:06:29
# https://www.nowcoder.com/practice/c5fbf7325fbd4c0ea3d0c3ea6bc6cc79?tpId=295&tqId=2285793
# [BM78] 打家劫舍(一)

"""
BM78. 打家劫舍（一）—— 线性动态规划

题目描述：
沿街有一排房间，每个房间存有一定现金。不能偷相邻的两家。
给定数组 nums，求在不被发现的前提下最多的偷窃金额。

核心思路：
设 dp[i] 为「前 i 个房间能偷到的最大金额」。对第 i 个房间：
- 不偷：金额等于 dp[i-1]；
- 偷：金额等于 dp[i-2] + nums[i]。
所以 dp[i] = max(dp[i-1], dp[i-2] + nums[i])。
因为只用最近两个状态，可以滚动成两个变量，空间 O(1)。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
nums = [1,2,3,4]

样例输出 1:
6
"""
# @sample-end

# @sample-start
"""
样例输入 2:
nums = [1,3,6]

样例输出 2:
7
"""
# @sample-end

# @sample-start
"""
样例输入 3:
nums = [2,10,5]

样例输出 3:
10
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def rob(self, nums: List[int]) -> int:
        """打家劫舍（不可偷相邻），滚动变量优化到 O(1) 空间"""
        prev, cur = 0, 0          # prev = dp[i-2], cur = dp[i-1]
        for x in nums:
            prev, cur = cur, max(cur, prev + x)
        return cur


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([1, 2, 3, 4], 6),
        ([1, 3, 6], 7),
        ([2, 10, 5], 10),
        ([5], 5),
        ([2, 1, 1, 2], 4),
    ]
    for i, (nums, expected) in enumerate(tests, 1):
        actual = Solution().rob(nums)
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected}, 实际={actual})")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        _run_tests()

# @nc code=end
