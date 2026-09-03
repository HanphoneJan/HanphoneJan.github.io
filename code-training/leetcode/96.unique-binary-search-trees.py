#
# @lc app=leetcode.cn id=96 lang=python3
# @lcpr version=30204
#
# [96] 不同的二叉搜索树
#


# @lcpr-template-start
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    不同的二叉搜索树 - 动态规划（卡特兰数）

    核心思路：
    - G(n) 表示 n 个节点能构成的不同二叉搜索树的个数
    - 对于根节点i，左子树有i-1个节点，右子树有n-i个节点
    - 以i为根的树的数量 = G(i-1) * G(n-i)
    - G(n) = sum(G(i-1) * G(n-i)) for i in range(1, n+1)

    为什么正确：
    - 二叉搜索树的性质：左子树所有节点 < 根 < 右子树所有节点
    - 当选定根节点i后，左子树只能是[1,i-1]，右子树只能是[i+1,n]
    - 左右子树互相独立，所以用乘法原理

    时间复杂度：O(n^2) - 双重循环
    空间复杂度：O(n) - 一维DP数组
    """

    def numTrees(self, n: int) -> int:
        G = [0] * (n + 1)
        G[0], G[1] = 1, 1  # 0个节点或1个节点都只有1种树

        for i in range(2, n + 1):
            for j in range(1, i + 1):
                # j为根节点：左子树j-1个节点，右子树i-j个节点
                G[i] += G[j - 1] * G[i - j]

        return G[n]

# @lc code=end



#
# @lcpr case=start
# 3\n
# @lcpr case=end

# @lcpr case=start
# 1\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (3, 5),
        # n=3:
        # 根=1: 左0右2, G(0)*G(2)=1*2=2
        # 根=2: 左1右1, G(1)*G(1)=1*1=1
        # 根=3: 左2右0, G(2)*G(0)=2*1=2
        # 总数 = 2+1+2 = 5
        (1, 1),
        (2, 2),
        # n=2: 根=1(左0右1=1) + 根=2(左1右0=1) = 2
        (4, 14),
        # 卡特兰数：1, 1, 2, 5, 14, 42, ...
        (5, 42),
    ]

    for n, expected in tests:
        result = sol.numTrees(n)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} numTrees({n}) = {result}, expected = {expected}")
