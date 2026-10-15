# @nc app=nowcoder id=a5c127769dd74a63ada7bff37d9c5815 topic=295 question=2285837 lang=Python3
# 2026-10-15 20:06:32
# https://www.nowcoder.com/practice/a5c127769dd74a63ada7bff37d9c5815?tpId=295&tqId=2285837
# [BM79] 打家劫舍(二)

"""
BM79. 打家劫舍（二）—— 环形动态规划

题目描述：
沿湖有一排房间，组成一个闭合的圆环 —— 第一个房间和最后一个房间相邻。
仍然不能偷相邻的两家，求最多能偷到的金额。

核心思路：
环形比线性多了「首尾也不能同时偷」这一条约束。分三种情况：
1. 偷了第一个，就不能偷最后一个 → 等价于在 nums[0..n-2] 上做线性打家劫舍；
2. 偷了最后一个，就不能偷第一个 → 等价于在 nums[1..n-1] 上做线性打家劫舍；
3. 首尾都不涉及的情况已包含在上面两种里。
答案就是这两种线性结果的最大值。
n == 1 时只有一个房间，直接返回 nums[0]。

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
6
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def rob(self, nums: List[int]) -> int:
        """环形打家劫舍：拆成两个线性子问题取最大值"""
        n = len(nums)
        if n == 0:
            return 0
        if n == 1:
            return nums[0]
        # 方案一：不考虑最后一个房间；方案二：不考虑第一个房间
        return max(self._rob_line(nums[:-1]), self._rob_line(nums[1:]))

    def _rob_line(self, arr: List[int]) -> int:
        """线性打家劫舍（辅助方法，下划线开头）"""
        prev, cur = 0, 0
        for x in arr:
            prev, cur = cur, max(cur, prev + x)
        return cur


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([1, 2, 3, 4], 6),
        ([1, 3, 6], 6),
        ([5], 5),
        ([2, 3, 2], 3),
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
