#
# @lc app=leetcode.cn id=337 lang=python3
# @lcpr version=30204
#
# [337] 打家劫舍 III
#


# @lcpr-template-start
from typing import Optional, Tuple


# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


# @lcpr-template-end
# @lc code=start
class Solution:
    """
    打家劫舍 III - 树形动态规划

    核心思路：
    - 对于每个节点，有两种选择：偷或不偷
    - 偷当前节点：则不能偷左右子节点，但可以偷孙子节点
    - 不偷当前节点：则左右子节点可偷可不偷，取最大值

    状态定义（后序遍历返回二元组）：
    - rob: 偷当前节点时，以该节点为根的子树能获得的最大金额
    - not_rob: 不偷当前节点时，以该节点为根的子树能获得的最大金额

    状态转移：
    - rob = left_not_rob + right_not_rob + node.val
    - not_rob = max(left_rob, left_not_rob) + max(right_rob, right_not_rob)

    时间复杂度：O(n) - 每个节点只访问一次
    空间复杂度：O(h) - 递归栈深度，h为树的高度
    """

    def rob(self, root: Optional[TreeNode]) -> int:
        def dfs(node: Optional[TreeNode]) -> Tuple[int, int]:
            if node is None:  # 递归边界
                return 0, 0  # 没有节点，怎么选都是 0
            l_rob, l_not_rob = dfs(node.left)  # 递归左子树
            r_rob, r_not_rob = dfs(node.right)  # 递归右子树
            rob = l_not_rob + r_not_rob + node.val  # 偷当前节点
            not_rob = max(l_rob, l_not_rob) + max(r_rob, r_not_rob)  # 不偷当前节点
            return rob, not_rob
        return max(dfs(root))  # 根节点选或不选的最大值

# @lc code=end



#
# @lcpr case=start
# [3,2,3,null,3,null,1]\n
# @lcpr case=end

# @lcpr case=start
# [3,4,5,1,3,null,1]\n
# @lcpr case=end

#

def build_tree(vals):
    """从层序列表构建二叉树，None表示空节点"""
    if not vals:
        return None
    root = TreeNode(vals[0])
    queue = [root]
    i = 1
    while queue and i < len(vals):
        node = queue.pop(0)
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            queue.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            queue.append(node.right)
        i += 1
    return root


if __name__ == "__main__":
    sol = Solution()

    # 测试用例1: [3,2,3,null,3,null,1]
    #       3
    #      / \
    #     2   3
    #      \   \
    #       3   1
    # 最优：偷3(根) + 3(右左null.. 不对)
    # 重新画：
    #       3
    #      / \
    #     2   3
    #      \   \
    #       3   1
    # 偷根(3) + 左子树的孙子(3) + 右子树的孙子(1) = 3+3+1 = 7
    # 不偷根：左子树max(偷2=2, 不偷2但偷3=3) = 3，右子树max(偷3=3, 不偷3但偷1=1) = 3，总6
    # 最优 = max(7, 6) = 7
    root1 = build_tree([3, 2, 3, None, 3, None, 1])

    # 测试用例2: [3,4,5,1,3,null,1]
    #       3
    #      / \
    #     4   5
    #    / \   \
    #   1   3   1
    # 偷根(3) + 左孙子(1+3) + 右孙子(1) = 3+1+3+1 = 8? 不对，左右子节点不能偷
    # 偷根(3) + 左子树不偷4但max(1,3)=3 + 右子树不偷5但偷1=1 = 3+3+1 = 7
    # 不偷根：左子树max(偷4+1+3=... 实际4有子节点1和3，偷4就不能偷1和3，所以偷4=4；不偷4可以偷1+3=4) = 4
    #        右子树：偷5就不能偷1，所以偷5=5；不偷5可以偷1=1；max=5
    # 不偷根 = 4 + 5 = 9
    # 最优 = max(7, 9) = 9
    root2 = build_tree([3, 4, 5, 1, 3, None, 1])

    tests = [
        (root1, 7),
        (root2, 9),
    ]

    for i, (root, expected) in enumerate(tests):
        result = sol.rob(root)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} test case {i+1}: rob = {result}, expected = {expected}")
