#
# @lc app=leetcode.cn id=399 lang=python3
# @lcpr version=30204
#
# [399] 除法求值
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class UnionFind:
    """
    带权并查集

    维护两个数组：
    - parent[i]: i 的父节点
    - weight[i]: i 到父节点的比值，即 i / parent[i] = weight[i]

    路径压缩时，需要同步更新 weight 数组：
    - 如果 x -> origin -> root，则 weight[x] = weight[x] * weight[origin]
    """

    def __init__(self, n: int):
        self.parent = [i for i in range(n)]
        self.weight = [1.0] * n

    def find(self, x: int) -> int:
        """路径压缩，并更新权重"""
        if x != self.parent[x]:
            origin = self.parent[x]
            self.parent[x] = self.find(self.parent[x])
            self.weight[x] *= self.weight[origin]
        return self.parent[x]

    def union(self, x: int, y: int, value: float) -> None:
        """合并两个节点，已知 x / y = value"""
        rootX = self.find(x)
        rootY = self.find(y)
        if rootX == rootY:
            return

        self.parent[rootX] = rootY
        # 推导: weight[rootX] * weight[x] = value * weight[y]
        # 即: rootX / rootY * x / rootX = value * y / rootY
        # 因此: weight[rootX] = value * weight[y] / weight[x]
        self.weight[rootX] = self.weight[y] * value / self.weight[x]

    def is_connected(self, x: int, y: int) -> float:
        """判断两个节点是否连通，返回比值 x / y，不连通返回 -1.0"""
        rootX = self.find(x)
        rootY = self.find(y)
        if rootX == rootY:
            return self.weight[x] / self.weight[y]
        else:
            return -1.0


class Solution:
    """
    除法求值 - 并查集

    核心思路：
    - 将每个变量看作图中的节点，方程式看作带权边
    - a / b = 2 表示从 a 到 b 有一条权值为2的边
    - 查询 a / c 等价于找从 a 到 c 的路径上所有权值的乘积

    为什么用并查集：
    - 并查集可以维护节点的连通性和相对权重
    - 路径压缩时同步更新权重，保证查询效率

    时间复杂度：O((E + Q) * α(N)) - E为方程式数，Q为查询数，α为阿克曼函数反函数
    空间复杂度：O(N) - N为不同变量的数量
    """

    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        equations_size = len(equations)

        # 并查集最多需要 2 * equations_size 个节点（每个变量一个id）
        union_find = UnionFind(2 * equations_size)

        # 第1步：预处理，将变量映射到id
        hash_map = {}
        id_counter = 0

        for i in range(equations_size):
            var1, var2 = equations[i][0], equations[i][1]

            if var1 not in hash_map:
                hash_map[var1] = id_counter
                id_counter += 1
            if var2 not in hash_map:
                hash_map[var2] = id_counter
                id_counter += 1

            union_find.union(hash_map[var1], hash_map[var2], values[i])

        # 第2步：处理查询
        queries_size = len(queries)
        res = [-1.0] * queries_size

        for i in range(queries_size):
            var1, var2 = queries[i][0], queries[i][1]

            if var1 not in hash_map or var2 not in hash_map:
                res[i] = -1.0
            else:
                res[i] = union_find.is_connected(hash_map[var1], hash_map[var2])

        return res

# @lc code=end



#
# @lcpr case=start
# [["a","b"],["b","c"]]\n[2.0,3.0]\n[["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]]\n
# @lcpr case=end

# @lcpr case=start
# [["a","b"],["b","c"],["bc","cd"]]\n[1.5,2.5,5.0]\n[["a","c"],["c","b"],["bc","cd"],["cd","bc"]]\n
# @lcpr case=end

# @lcpr case=start
# [["a","b"]]\n[0.5]\n[["a","b"],["b","a"],["a","c"],["x","y"]]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (
            [["a","b"],["b","c"]],
            [2.0, 3.0],
            [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]],
            [6.0, 0.5, -1.0, 1.0, -1.0]
        ),
        # a/b=2, b/c=3
        # a/c = a/b * b/c = 2*3 = 6
        # b/a = 1/(a/b) = 1/2 = 0.5
        # a/e: e不存在，-1
        # a/a = 1
        # x/x: x不存在，-1
        (
            [["a","b"],["b","c"],["bc","cd"]],
            [1.5, 2.5, 5.0],
            [["a","c"],["c","b"],["bc","cd"],["cd","bc"]],
            [3.75, 0.4, 5.0, 0.2]
        ),
    ]

    for equations, values, queries, expected in tests:
        result = sol.calcEquation(equations, values, queries)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} result={result}, expected={expected}")
