#
# @lc app=leetcode.cn id=16 lang=python3
# @lcpr version=30204
#
# [16] 最接近的三数之和
# 题目：找出和与 target 最接近的三元组，返回该和
#

# @lcpr-template-start

# @lcpr-template-end
# @lc code=start
class Solution:
    def threeSumClosest(self, nums: list[int], target: int) -> int:
        """
        核心思想：排序 + 双指针

        与"三数之和为 0"类似，固定一个数，剩下两个用双指针夹逼。
        双指针移动的依据：sub = target - (nums[i] + nums[left] + nums[right])
        - sub > 0：当前和偏小，需要更大的和 → left 右移（增大较小的数）
        - sub < 0：当前和偏大，需要更小的和 → right 左移（减小较大的数）
        - sub == 0：恰好等于 target，这是最优解，直接返回

        每次更新最小差值，记录对应的和。

        时间复杂度：O(n²)（排序 O(n log n) 被主导）
        空间复杂度：O(1)
        """
        nums.sort()
        result = None
        min_sub = float('inf')

        # 固定第一个数，留至少两个位置给 left、right
        for i in range(len(nums) - 2):
            left, right = i + 1, len(nums) - 1
            while left < right:
                # sub > 0 表示三数和比 target 小
                sub = target - nums[i] - nums[left] - nums[right]

                # 恰好相等，这是最接近（差值 0）的情况，直接返回
                if sub == 0:
                    return nums[i] + nums[left] + nums[right]

                # 更新最小差值及对应和
                if abs(sub) < min_sub:
                    min_sub = abs(sub)
                    result = nums[i] + nums[left] + nums[right]

                # 三数和偏小 → left 右移；偏大 → right 左移
                if sub > 0:
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

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([-1, 2, 1, -4], 1, 2),      # 经典样例
        ([0, 0, 0], 1, 0),           # 全零
        ([1, 1, 1], 0, 3),           # 最小三个
        ([1, 1, 1, 0], -100, 2),     # target 远小于所有和
        ([4, 0, 5, -5, 3, 13, 4, -8], 4, 4),  # 恰好命中
        ([1, 1, 1, 1], -100, 3),     # 边界
    ]

    for nums, target, expected in tests:
        result = sol.threeSumClosest(nums, target)
        status = "✓" if result == expected else "✗"
        print(f"threeSumClosest({nums}, {target}) = {result}, 期望={expected} {status}")