#
# @lc app=leetcode.cn id=16 lang=python3
# @lcpr version=30204
#
# [16] 最接近的三数之和
#


# @lcpr-template-start

# @lcpr-template-end
# @lc code=start
class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        nums.sort()
        result=None
        min_sub = float('inf')
        for i in range(len(nums)-2):
            left,right = i + 1,len(nums)-1
            while left<right:
                sub = target-nums[i]-nums[left]-nums[right]
                if sub==0:
                    return nums[i]+nums[left]+nums[right]
                if abs(sub)<min_sub:
                    min_sub = abs(sub)
                    result = nums[i]+nums[left]+nums[right]
                if sub>0:
                    left += 1
                else:
                    right -= 1
        return result
    
# @lc code=end



#
# @lcpr case=start
# [-1,2,1,-4]\n1\n
# @lcpr case=end

# @lcpr case=start
# [0,0,0]\n1\n
# @lcpr case=end

#

