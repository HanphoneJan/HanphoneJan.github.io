#
# @lc app=leetcode.cn id=84 lang=python3
# @lcpr version=30204
#
# [84] 柱状图中最大的矩形
#


# @lcpr-template-start

# @lcpr-template-end
# @lc code=start
from typing import List

class Solution:
    """
    柱状图中最大的矩形 - 单调栈

    核心思想：
    对于每个柱子 heights[i]，如果能快速知道左侧第一个比它矮的位置 left[i]
    和右侧第一个比它矮的位置 right[i]，那么以 heights[i] 为高的最大矩形宽度
    就是 right[i] - left[i] - 1。

    单调栈的作用：
    维护一个单调递增的栈，栈中存储柱子的索引。
    当遇到比栈顶矮的柱子时，栈顶柱子的右边界就确定了。

    哨兵技巧：
    在数组首尾添加高度为0的哨兵，确保所有柱子都能被处理，且栈永不为空。

    与接雨水的区别：
    - 接雨水找两边第一个比它高的，用递减栈
    - 最大矩形找两边第一个比它矮的，用递增栈

    时间复杂度：O(n)
    空间复杂度：O(n)
    """
    def largestRectangleArea(self, heights: List[int]) -> int:
        # 首尾加哨兵0，确保所有柱子都能被处理，且栈永不为空
        heights = [0] + heights + [0]
        stack = []
        max_area = 0

        for i in range(len(heights)):
            # 当前柱子比栈顶矮，栈顶柱子的右边界确定
            while stack and heights[stack[-1]] > heights[i]:
                h = heights[stack.pop()]  # 栈顶柱子的高度
                # 此时栈顶是左边第一个小于h的柱子索引
                width = i - stack[-1] - 1
                max_area = max(max_area, h * width)
            stack.append(i)

        return max_area


# ========== 示例推演：heights = [2,1,5,6,2,3] ==========
#
# 加哨兵后：[0, 2, 1, 5, 6, 2, 3, 0]
#
# i=0, h=0: stack=[0]
# i=1, h=2: stack=[0,1]
# i=2, h=1: 2>1，弹出1，h=2，width=2-0-1=1，area=2，max_area=2
#           stack=[0,2]
# i=3, h=5: stack=[0,2,3]
# i=4, h=6: stack=[0,2,3,4]
# i=5, h=2: 6>2，弹出4，h=6，width=5-3-1=1，area=6
#           5>2，弹出3，h=5，width=5-2-1=2，area=10，max_area=10
#           stack=[0,2,5]
# i=6, h=3: stack=[0,2,5,6]
# i=7, h=0: 3>0，弹出6，h=3，width=7-5-1=1，area=3
#           2>0，弹出5，h=2，width=7-2-1=4，area=8
#           1>0，弹出2，h=1，width=7-0-1=6，area=6
#           0==0，不弹出
#
# 结果：10（以高度5或6的柱子为高的矩形）
# @lc code=end



#
# @lcpr case=start
# [2,1,5,6,2,3]\n
# @lcpr case=end

# @lcpr case=start
# [2,4]\n
# @lcpr case=end

#


if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([2, 1, 5, 6, 2, 3], 10),
        ([2, 4], 4),
        ([2, 1, 2], 3),
        ([1, 1, 1, 1], 4),
    ]

    for heights, expected in tests:
        result = sol.largestRectangleArea(heights)
        print(f"largestRectangleArea({heights}) = {result}, expected = {expected}")
