“””
平衡路径计数 - 二叉树 DFS

定义二叉树的平衡路径需同时满足以下3个条件：
1. 路径从任意节点出发，仅能向下延伸（只能向左/右子节点，不可向上回溯）。
2. 路径上所有节点的和相加为0。
3. 路径长度（包含的节点个数）至少为2。

请实现一个Python函数，输入二叉树的根节点（按层序遍历规则构建），返回该树中所有”平衡路径”的总数。

建树规则：层序遍历列表按「从上到下、从左到右」的顺序构建二叉树，None表示对应位置无节点。
路径延伸：从起点出发，仅沿左子节点 OR 右子节点单向向下（单链，不可分叉）。
统计方式：每个符合条件的单链路径独立计数（即使路径有重叠）。

输入格式：
- 一行：二叉树的层序遍历列表（元素为整数或None，None表示空节点）

输出格式：
- 整数，表示平衡路径的总数

核心思路：
1. 按层序遍历构建二叉树
2. 收集所有节点作为路径起点
3. 对每个起点进行 DFS，统计和为0且长度≥2的路径数

时间复杂度：O(N^2)（最坏情况，每个节点作为起点向下遍历）
空间复杂度：O(N)
“””

import sys
from collections import deque

# @sample-start
“””
样例输入 1:
[10, -5, -5, 2, -2, 3, -3]

样例输出 1:
0
“””
# @sample-end

# @sample-start
“””
样例输入 2:
[0, 0, None]

样例输出 2:
1
“””
# @sample-end

# @sample-start
“””
样例输入 3:
[1, -1, 2, -2, None, 3, -3]

样例输出 3:
2
“””
# @sample-end

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(level_order):
    """根据层序遍历列表构建二叉树，返回根节点"""
    if not level_order or level_order[0] is None:
        return None
    root = TreeNode(level_order[0])
    queue = deque([root])
    i = 1
    n = len(level_order)
    while queue and i < n:
        node = queue.popleft()
        # 左孩子
        if i < n and level_order[i] is not None:
            node.left = TreeNode(level_order[i])
            queue.append(node.left)
        i += 1
        # 右孩子
        if i < n and level_order[i] is not None:
            node.right = TreeNode(level_order[i])
            queue.append(node.right)
        i += 1
    return root

def count_balance_paths(root):
    """统计所有平衡路径的个数"""
    if not root:
        return 0
    total = 0
    # 层序遍历收集所有节点（作为路径起点）
    nodes = []
    q = deque([root])
    while q:
        cur = q.popleft()
        nodes.append(cur)
        if cur.left:
            q.append(cur.left)
        if cur.right:
            q.append(cur.right)
    
    # 对每个起点，向下DFS统计合法路径
    for start in nodes:
        stack = [(start, start.val, 1)]  # (当前节点, 从起点到当前节点的和, 路径长度)
        while stack:
            node, cur_sum, length = stack.pop()
            # 长度>=2且和为0，计数
            if length >= 2 and cur_sum == 0:
                total += 1
            if node.left:
                stack.append((node.left, cur_sum + node.left.val, length + 1))
            if node.right:
                stack.append((node.right, cur_sum + node.right.val, length + 1))
    return total

def test():
    """使用自行构建的测试用例验证函数正确性"""
    test_cases = [
        ([10, -5, -5, 2, -2, 3, -3], 0, "样例1：无合法路径"),
        ([0, 0, None], 1, "样例2：根→左子，和0长度2"),
        ([1, -1, 2, -2, None, 3, -3], 2, "样例3：1→-1 和 2→-2"),
        ([5], 0, "单节点树，路径长度不足2"),
        ([0, 0, None, 0, None, None, None], 3, "链式全零：三条路径"),
        ([], 0, "空列表，无节点"),
        ([None], 0, "无节点树"),
        ([3, 1, -4, 2, -1, -2, 2], 1, "负数抵消路径（实际1条）"),
        ([0, 0, 0, 0, 0, 0, 0], 10, "全零完全二叉树，共10条路径"),
    ]
    for i, (level_order, expected, desc) in enumerate(test_cases, 1):
        root = build_tree(level_order)
        result = count_balance_paths(root)
        status = "✓" if result == expected else "✗"
        print(f"测试用例 {i}: {desc}")
        print(f"  输入: {level_order}")
        print(f"  预期输出: {expected}, 实际输出: {result} {status}")
        if result != expected:
            print(f"  【失败】")
        print()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        test()
    else:
        line = sys.stdin.readline().strip()
        if not line:
            print(0)
        else:
            level_order = eval(line)
            root = build_tree(level_order)
            result = count_balance_paths(root)
            print(result)