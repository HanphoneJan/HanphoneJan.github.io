#
# @lc app=leetcode.cn id=581 lang=python3
# @lcpr version=30204
#
# [581] 最短无序连续子数组
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    最短无序连续子数组 - 双指针一次遍历

    核心思路：
    - 从左向右遍历，维护最大值maxn，如果nums[i] < maxn，说明i位置需要调整，更新right
    - 从右向左遍历，维护最小值minn，如果nums[n-1-i] > minn，说明该位置需要调整，更新left
    - 最终[left, right]就是需要排序的最短子数组

    为什么正确：
    - 从左到右：如果当前值小于之前出现过的最大值，说明当前值"掉队"了，需要被包含在排序区间内
    - 从右到左：如果当前值大于之后出现过的最小值，说明当前值"超前"了，也需要被包含
    - 这两个扫描确定了排序区间的左右边界

    时间复杂度：O(n) - 只需遍历数组一次（双向同时）
    空间复杂度：O(1) - 只使用常数额外空间
    """

    def findUnsortedSubarray(self, nums: List[int]) -> int:
        n = len(nums)
        maxn, right = float("-inf"), -1
        minn, left = float("inf"), -1

        for i in range(n):
            # 从左向右：找右边界
            if maxn > nums[i]:
                right = i  # 当前值小于之前最大值，需要排序
            else:
                maxn = nums[i]  # 更新最大值

            # 从右向左：找左边界
            if minn < nums[n - i - 1]:
                left = n - i - 1  # 当前值大于之后最小值，需要排序
            else:
                minn = nums[n - i - 1]  # 更新最小值

        return 0 if right == -1 else right - left + 1

# @lc code=end



#
# @lcpr case=start
# [2,6,4,8,10,9,15]\n
# @lcpr case=end

# @lcpr case=start
# [1,2,3,4]\n
# @lcpr case=end

# @lcpr case=start
# [1]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([2, 6, 4, 8, 10, 9, 15], 5),
        # 子数组[6,4,8,10,9]需要排序，长度为5
        # 从左到右：maxn=2,6, 到4时maxn>4, right=2
        #          maxn=6,8,10, 到9时maxn>9, right=5
        # 从右到左：minn=15,9,10,8, 到4时minn>4? 不对，minn=8>4? 4<8, minn<4, left=2
        #          到6时minn=4<6, left=1; 到2时minn=2, 不更新
        # left=1, right=5, 长度=5
        ([1, 2, 3, 4], 0),
        # 已有序，right=-1，返回0
        ([1], 0),
        ([2, 1], 2),
        ([1, 3, 2, 4, 5], 2),
        # 子数组[3,2]需要排序
    ]

    for nums, expected in tests:
        result = sol.findUnsortedSubarray(nums)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} findUnsortedSubarray({nums}) = {result}, expected = {expected}")
