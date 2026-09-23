#
# @lc app=leetcode.cn id=1480 lang=python3
# @lcpr version=30204
#
# [1480] 一维数组的动态和
#


# @lcpr-template-start
from typing import List

# @lcpr-template-end
# @lc code=start
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        n = len(nums)
        runningSum = [None]*n
        if n==0:
            return runningSum
        runningSum[0] = nums[0]
        if n==1:
            return runningSum
        for i in range(1,n):
            runningSum[i] = runningSum[i-1]+nums[i]
        return runningSum
# @lc code=end

