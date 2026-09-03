#
# @lc app=leetcode.cn id=448 lang=python3
# @lcpr version=30204
#
# [448] 找到所有数组中消失的数字
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    找到所有数组中消失的数字 - 原地哈希

    核心思路：
    - 数组长度为n，数字范围是1~n，每个数字出现1次或2次
    - 利用数组本身作为哈希表：将数字num对应到索引(num-1)的位置
    - 出现过的数字会让对应位置的值变大（加上n）
    - 最后值仍 <= n 的位置就是没出现过的数字

    为什么正确：
    - num的范围是1~n，所以(num-1)的范围是0~(n-1)，恰好是合法索引
    - 每个num会让nums[num-1]增加n，所以最后值 > n的位置表示该数字出现过
    - 使用 % n 是为了防止多次加n后索引计算出错

    时间复杂度：O(n) - 遍历数组两次
    空间复杂度：O(1) - 原地修改，只使用结果列表
    """

    def findDisappearedNumbers(self, nums: List[int]) -> List[int]:
        n = len(nums)
        for num in nums:
            x = (num - 1) % n  # 计算该数字对应的索引
            nums[x] += n       # 将该索引位置的值增加n，标记该数字出现过

        # 值仍 <= n 的位置，说明对应的数字(i+1)没有出现过
        ret = [i + 1 for i, num in enumerate(nums) if num <= n]
        return ret

# @lc code=end



#
# @lcpr case=start
# [4,3,2,7,8,2,3,1]\n
# @lcpr case=end

# @lcpr case=start
# [1,1]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([4, 3, 2, 7, 8, 2, 3, 1], [5, 6]),
        # n=8，数字1~8中，5和6没有出现
        # 遍历过程：
        # 4 -> 索引3，nums[3]=7+8=15
        # 3 -> 索引2，nums[2]=2+8=10
        # 2 -> 索引1，nums[1]=3+8=11
        # 7 -> 索引6，nums[6]=3+8=11
        # 8 -> 索引7，nums[7]=1+8=9
        # 2 -> 索引1，nums[1]=11+8=19
        # 3 -> 索引2，nums[2]=10+8=18
        # 1 -> 索引0，nums[0]=4+8=12
        # 最终：[12,19,18,15,8,8,11,9]
        # <=8 的位置：4,5 -> 对应数字 5,6
        ([1, 1], [2]),
        # n=2，数字1出现了两次，2没出现
        ([2, 2], [1]),
    ]

    for nums, expected in tests:
        # 复制数组，因为原数组会被修改
        nums_copy = nums.copy()
        result = sol.findDisappearedNumbers(nums_copy)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} findDisappearedNumbers({nums}) = {result}, expected = {expected}")
