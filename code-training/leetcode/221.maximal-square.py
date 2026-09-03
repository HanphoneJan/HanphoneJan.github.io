#
# @lc app=leetcode.cn id=221 lang=python3
# @lcpr version=30204
#
# [221] 最大正方形
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    最大正方形 - 柱状图+单调栈解法

    核心思路：
    - 将每一行看作底边，计算每个位置向上的连续1的高度（形成柱状图）
    - 对每行的柱状图，调用84题的最大矩形算法（单调栈）
    - 从每个矩形中取最大可能的正方形（边长 = min(高, 宽)）

    为什么正确：
    - 以(i,j)为右下角的最大正方形，对应以第i行为底边的柱状图中能形成的最大正方形
    - 通过枚举每一行作为底边，可以覆盖所有可能的正方形位置

    时间复杂度：O(m * n) - 遍历矩阵每个元素，每行单调栈O(n)
    空间复杂度：O(n) - 柱状图数组和单调栈
    """

    # 84. 柱状图中最大的矩形（适配正方形版本）
    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]  # 在栈中只有一个数的时候，栈顶的「下面那个数」是 -1，对应 left[i] = -1 的情况
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()  # 矩形的高（的下标）
                left = st[-1]  # 栈顶下面那个数就是 left
                w = right - left - 1
                side = min(heights[i], w)  # 从矩形中取出正方形
                ans = max(ans, side * side)
            st.append(right)
        return ans

    def maximalSquare(self, matrix: List[List[str]]) -> int:
        n = len(matrix[0])
        heights = [0] * (n + 1)  # 末尾多一个 0，理由见我 84 题题解
        ans = 0
        for row in matrix:
            # 计算底边为 row 的柱子高度
            for j, c in enumerate(row):
                if c == '0':
                    heights[j] = 0  # 柱子高度为 0
                else:
                    heights[j] += 1  # 柱子高度加一
            ans = max(ans, self.largestRectangleArea(heights))  # 调用 84 题代码
        return ans

# 动态规划解法（供参考）：
# dp[i][j] 表示以 (i,j) 为右下角的最大正方形边长
# 状态转移：dp[i][j] = min(dp[i-1][j], dp[i-1][j-1], dp[i][j-1]) + 1
# 为什么取 min？因为正方形的边长受限于上方、左方、左上方三个方向的最小值
# 时间复杂度 O(m*n)，空间复杂度 O(n)（可优化为一维）
# @lc code=end



#
# @lcpr case=start
# [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]\n
# @lcpr case=end

# @lcpr case=start
# [["0","1"],["1","0"]]\n
# @lcpr case=end

# @lcpr case=start
# [["0"]]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], 4),
        ([["0","1"],["1","0"]], 1),
        ([["0"]], 0),
        ([["1"]], 1),
    ]

    for matrix, expected in tests:
        result = sol.maximalSquare(matrix)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} maximalSquare({matrix}) = {result}, expected = {expected}")
