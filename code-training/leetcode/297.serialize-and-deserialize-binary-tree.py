#
# @lc app=leetcode.cn id=297 lang=python3
# @lcpr version=30204
#
# [297] 二叉树的序列化与反序列化
#

# @lcpr-template-start
import collections
from collections import deque


# Definition for a binary tree node.
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None


# @lcpr-template-end
# @lc code=start
class Codec:
    """
    二叉树的序列化与反序列化 - BFS层序遍历

    核心思路：
    - 序列化：使用BFS层序遍历，将节点值按顺序存入列表，空节点记为"null"
    - 反序列化：按同样的顺序重建树，使用队列维护待处理的父节点

    为什么正确：
    - 只要序列化和反序列化使用相同的遍历方式，就能保证数据一致
    - BFS层序遍历能完整保留树的结构信息（包括空节点的位置）

    时间复杂度：O(n) - 需要访问每个节点一次
    空间复杂度：O(n) - 队列和结果列表的大小
    """

    def serialize(self, root):
        """
        序列化：将二叉树转为字符串
        使用BFS层序遍历，空节点记为"null"
        """
        if not root:
            return "[]"
        queue = collections.deque()
        queue.append(root)
        res = []
        while queue:
            node = queue.popleft()
            if node:
                res.append(str(node.val))
                queue.append(node.left)
                queue.append(node.right)
            else:
                res.append("null")
        return '[' + ','.join(res) + ']'

    def deserialize(self, data):
        """
        反序列化：将字符串重建为二叉树
        使用BFS，按层序顺序依次连接左右子节点
        """
        if data == "[]":
            return
        vals, i = data[1:-1].split(','), 1
        root = TreeNode(int(vals[0]))
        queue = collections.deque()
        queue.append(root)
        while queue:
            node = queue.popleft()
            if vals[i] != "null":
                node.left = TreeNode(int(vals[i]))
                queue.append(node.left)
            i += 1
            if vals[i] != "null":
                node.right = TreeNode(int(vals[i]))
                queue.append(node.right)
            i += 1
        return root


# Your Codec object will be instantiated and called as such:
# ser = Codec()
# deser = Codec()
# ans = deser.deserialize(ser.serialize(root))
# @lc code=end



#
# @lcpr case=start
# [1,2,3,null,null,4,5]\n
# @lcpr case=end

# @lcpr case=start
# []\n
# @lcpr case=end

# @lcpr case=start
# [1]\n
# @lcpr case=end

# @lcpr case=start
# [1,2]\n
# @lcpr case=end

#

if __name__ == "__main__":
    codec = Codec()

    def build_tree(vals):
        """辅助函数：从列表构建二叉树"""
        if not vals:
            return None
        root = TreeNode(vals[0])
        queue = deque([root])
        i = 1
        while queue and i < len(vals):
            node = queue.popleft()
            if i < len(vals) and vals[i] is not None:
                node.left = TreeNode(vals[i])
                queue.append(node.left)
            i += 1
            if i < len(vals) and vals[i] is not None:
                node.right = TreeNode(vals[i])
                queue.append(node.right)
            i += 1
        return root

    def tree_to_list(root):
        """辅助函数：将二叉树转为列表（用于对比）"""
        if not root:
            return []
        res = []
        queue = deque([root])
        while queue:
            node = queue.popleft()
            if node:
                res.append(node.val)
                queue.append(node.left)
                queue.append(node.right)
            else:
                res.append(None)
        # 去掉末尾的None
        while res and res[-1] is None:
            res.pop()
        return res

    # 测试用例
    tests = [
        [1, 2, 3, None, None, 4, 5],
        [],
        [1],
        [1, 2],
    ]

    for vals in tests:
        root = build_tree(vals)
        serialized = codec.serialize(root)
        deserialized = codec.deserialize(serialized)
        result = tree_to_list(deserialized)
        status = "[OK]" if result == vals else "[FAIL]"
        print(f"{status} original={vals} -> serialized={serialized} -> deserialized={result}")
