#
# @lc app=leetcode.cn id=85 lang=python3
# @lcpr version=30204
#
# [85] 最大矩形
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    最大矩形 - 单调栈

    核心思路：
    - 设 matrix 有 m 行，枚举每一行作为矩形的底边
    - 计算每个位置向上连续的1的高度，形成柱状图
    - 对每行的柱状图，调用84题的最大矩形算法（单调栈）

    为什么正确：
    - 以第i行为底边的最大矩形，对应以该行为底边的柱状图中的最大矩形
    - 通过枚举每一行作为底边，可以覆盖所有可能的矩形

    时间复杂度：O(m * n) - 遍历矩阵，每行单调栈O(n)
    空间复杂度：O(n) - 柱状图数组和单调栈
    """

    # 84. 柱状图中最大的矩形
    def largestRectangleArea(self, heights: List[int]) -> int:
        st = [-1]  # 在栈中只有一个数的时候，栈顶的「下面那个数」是 -1，对应 left[i] = -1 的情况
        ans = 0
        for right, h in enumerate(heights):
            while len(st) > 1 and heights[st[-1]] >= h:
                i = st.pop()  # 矩形的高（的下标）
                left = st[-1]  # 栈顶下面那个数就是 left
                ans = max(ans, heights[i] * (right - left - 1))
            st.append(right)
        return ans

    def maximalRectangle(self, matrix: List[List[str]]) -> int:
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

# @lc code=end



#
# @lcpr case=start
# [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]\n
# @lcpr case=end

# @lcpr case=start
# [["0"]]\n
# @lcpr case=end

# @lcpr case=start
# [["1"]]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ([["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], 6),
        # 最大矩形在最后一行之前，面积=2*3=6（2行3列的矩形）
        ([["0"]], 0),
        ([["1"]], 1),
        ([["1","0"],["1","0"]], 2),
        # 两行的第一列形成2*1的矩形，面积=2
    ]

    for matrix, expected in tests:
        result = sol.maximalRectangle(matrix)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} maximalRectangle({matrix}) = {result}, expected = {expected}")
