#
# @lc app=leetcode.cn id=95 lang=python3
# @lcpr version=30204
#
# [95] 不同的二叉搜索树 II
# 题目：返回由 1..n 构成的所有不同结构二叉搜索树的根节点
#

# @lcpr-template-start
from typing import List, Optional


# Definition for a binary tree node.
# TreeNode 定义在模板区域（提交区域外），本地测试需要；LeetCode 会自动提供
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


# @lcpr-template-end
# @lc code=start
class Solution:
    def generateTrees(self, n: int) -> List[Optional[TreeNode]]:
        """
        核心思想：递归 + 分治（自底向上组合）

        二叉搜索树性质：左子树所有值 < 根 < 右子树所有值。
        对闭区间 [lo, hi] 中的每个值 root 作为根：
        - 左子树由 [lo, root-1] 的所有可能结构组成
        - 右子树由 [root+1, hi] 的所有可能结构组成
        - 根与任意左右子树组合，即得到一棵以 root 为根的完整树

        递归终点：lo > hi 时返回 [None]（空子树只有一种"空"结构）。

        时间复杂度：O(4^n / n^(3/2))（生成树的总数由卡特兰数决定）
        空间复杂度：O(4^n / n^(3/2))（需要存储所有树）
        """
        # 递归构建 [lo, hi] 区间内所有 BST
        def build(lo: int, hi: int) -> List[Optional[TreeNode]]:
            if lo > hi:
                return [None]  # 空区间：只有空子树这一种结构

            res = []
            # 依次让区间内每个值作为根
            for root_val in range(lo, hi + 1):
                # 左子树：区间 [lo, root_val-1] 的所有结构
                left_trees = build(lo, root_val - 1)
                # 右子树：区间 [root_val+1, hi] 的所有结构
                right_trees = build(root_val + 1, hi)

                # 笛卡尔积组合：每种左子树 × 每种右子树 × 根
                for left in left_trees:
                    for right in right_trees:
                        node = TreeNode(root_val)
                        node.left = left
                        node.right = right
                        res.append(node)
            return res

        if n == 0:
            return []
        return build(1, n)
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


    # 先序遍历，用于验证树结构
    def preorder(root: Optional[TreeNode]) -> list[int]:
        if root is None:
            return []
        return [root.val] + preorder(root.left) + preorder(root.right)


    tests = [
        (3, 5),   # n=3 共有 5 棵不同的 BST
        (1, 1),   # n=1 只有 1 棵
        (2, 2),   # n=2 有 2 棵
        (0, 0),   # n=0 返回空列表
    ]

    for n, expected in tests:
        trees = sol.generateTrees(n)
        status = "✓" if len(trees) == expected else "✗"
        print(f"generateTrees({n}) 数量 = {len(trees)}, 期望={expected} {status}")
        for t in trees[:4]:  # 仅打印前几棵的先序遍历便于观察
            print("  先序:", preorder(t))