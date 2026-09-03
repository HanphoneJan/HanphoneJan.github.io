#
# @lc app=leetcode.cn id=101 lang=python3
# @lcpr version=30204
#
# [101] 对称二叉树
#


# @lcpr-template-start
from typing import Optional, List
from collections import deque


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
    对称二叉树 - 判断二叉树是否轴对称

    核心思想：
    一棵二叉树对称，当且仅当它的左子树和右子树互为镜像。
    两个子树镜像的条件：
    1. 根节点值相等
    2. 左子树的左子树 与 右子树的右子树 镜像
    3. 左子树的右子树 与 右子树的左子树 镜像

    时间复杂度：O(n)，遍历每个节点一次
    空间复杂度：O(h)，递归栈深度，h为树的高度
    """

    # 100. 相同的树（改成镜像判断）
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        """
        辅助函数：判断两棵树是否互为镜像

        对比普通的"相同树"判断，这里交换了比较方向：
        - 相同树：p.left vs q.left, p.right vs q.right
        - 镜像树：p.left vs q.right, p.right vs q.left
        """
        if p is None or q is None:
            return p is q
        return (
            p.val == q.val
            and self.isSameTree(p.left, q.right)
            and self.isSameTree(p.right, q.left)
        )

    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        """
        解法一：递归（DFS）

        思路：调用 isSameTree 比较 root 的左右子树是否镜像
        """
        if not root:
            return True
        return self.isSameTree(root.left, root.right)

    def isSymmetricIterative(self, root: Optional[TreeNode]) -> bool:
        """
        解法二：迭代（BFS / 队列）

        思路：
        用队列存储需要比较的节点对，每次取出两个节点进行比较：
        1. 如果两个都为空，继续
        2. 如果一个为空一个不为空，不对称
        3. 如果值不相等，不对称
        4. 否则，将 (左左, 右右) 和 (左右, 右左) 入队

        队列的作用：按层序遍历的顺序，确保镜像位置的节点成对出现

        时间复杂度：O(n)
        空间复杂度：O(n)，队列最多存储 n/2 个节点
        """
        if not root:
            return True

        queue = deque([(root.left, root.right)])

        while queue:
            left, right = queue.popleft()

            # 两个都为空，对称，继续
            if not left and not right:
                continue

            # 一个为空一个不为空，不对称
            if not left or not right:
                return False

            # 值不相等，不对称
            if left.val != right.val:
                return False

            # 将镜像位置的节点对入队
            queue.append((left.left, right.right))
            queue.append((left.right, right.left))

        return True


# @lc code=end



#
# @lcpr case=start
# [1,2,2,3,4,4,3]\n
# @lcpr case=end

# @lcpr case=start
# [1,2,2,null,3,null,3]\n
# @lcpr case=end

#

# ========== 示例推演：root = [1,2,2,3,4,4,3] ==========
#
#       1
#      / \
#     2   2
#    / \ / \
#   3  4 4  3
#
# isSymmetric(1):
#   isSameTree(2(left), 2(right)):
#     2.val == 2.val ✓
#     isSameTree(2.left=3, 2.right=3):
#       3.val == 3.val ✓
#       isSameTree(3.left=None, 3.right=None) → True
#       isSameTree(3.right=None, 3.left=None) → True
#       返回 True
#     isSameTree(2.right=4, 2.left=4):
#       4.val == 4.val ✓
#       isSameTree(4.left=None, 4.right=None) → True
#       isSameTree(4.right=None, 4.left=None) → True
#       返回 True
#     返回 True
#   返回 True
#
# ========== 示例推演：root = [1,2,2,null,3,null,3] ==========
#
#       1
#      / \
#     2   2
#      \   \
#       3   3
#
# isSymmetric(1):
#   isSameTree(2(left), 2(right)):
#     2.val == 2.val ✓
#     isSameTree(2.left=None, 2.right=3):
#       None != 3 → 返回 False
#     返回 False
#   返回 False
#
# ========== 示例推演（迭代法）：root = [1,2,2,3,4,4,3] ==========
#
# 初始队列：[(2(left), 2(right))]
#
# 第1轮：取出 (2, 2)
#   2.val == 2.val ✓
#   入队：(2.left=3, 2.right=3), (2.right=4, 2.left=4)
#   队列：[(3, 3), (4, 4)]
#
# 第2轮：取出 (3, 3)
#   3.val == 3.val ✓
#   入队：(3.left=None, 3.right=None), (3.right=None, 3.left=None)
#   队列：[(4, 4), (None, None), (None, None)]
#
# 第3轮：取出 (4, 4)
#   4.val == 4.val ✓
#   入队：(4.left=None, 4.right=None), (4.right=None, 4.left=None)
#   队列：[(None, None), (None, None), (None, None), (None, None)]
#
# 第4-7轮：取出 (None, None)
#   都为空，continue
#   队列：[]
#
# 队列空，返回 True


# 辅助函数：根据层序遍历列表构建二叉树（null 表示空节点）
def build_tree(nums: List[Optional[int]]) -> Optional[TreeNode]:
    """根据列表构建二叉树，null 表示空节点"""
    if not nums or nums[0] is None:
        return None

    root = TreeNode(nums[0])
    queue = deque([root])
    i = 1

    while queue and i < len(nums):
        node = queue.popleft()

        # 左子节点
        if i < len(nums) and nums[i] is not None:
            node.left = TreeNode(nums[i])
            queue.append(node.left)
        i += 1

        # 右子节点
        if i < len(nums) and nums[i] is not None:
            node.right = TreeNode(nums[i])
            queue.append(node.right)
        i += 1

    return root


if __name__ == "__main__":
    sol = Solution()

    tests = [
        # (输入列表, 期望输出)
        ([1, 2, 2, 3, 4, 4, 3], True),
        ([1, 2, 2, None, 3, None, 3], False),
        # 边界：空树
        ([], True),
        # 边界：单个节点
        ([1], True),
        # 边界：两个节点，值相同
        ([1, 2, 2], True),
        # 边界：两个节点，值不同
        ([1, 2, 3], False),
        # 边界：只有左子树
        ([1, 2, None], False),
    ]

    for i, (nums, expected) in enumerate(tests):
        root = build_tree(nums)
        result = sol.isSymmetric(root)
        result_iter = sol.isSymmetricIterative(root)
        status = "✓" if result == expected and result_iter == expected else "✗"
        print(f"Test {i+1}: {status} isSymmetric({nums}) = {result}, expected = {expected}")
