from collections import deque
from typing import List

#
# Note: 类名、方法名、参数名已经指定，请勿修改
#
# 地图分析 · 计算 0 到最近 1 的最大距离
# def maxDistance(self, grid)
# @param grid int整型 二维数组 网格的二维数组
# @return int整型
#

# ================= 原始实现（未完成，保留作对比参考） =================
# 原解法只开了个双重循环去找 0，但没有实现"每个 0 到最近 1 的距离"
# 的计算逻辑，属于未完成的框架。
#
# class Solution:
#     def maxDistance(self, grid) :
#         # write code here
#         m,n = len(grid),len(grid[0])
#         result = -1
#         for i in range(m):
#             for j in range(n):
#                 if grid[i][j]==0:
#                     # 缺少距离计算逻辑
#         return result
# =====================================================================


class Solution:
    """
    地图分析 - 计算 0 到最近 1 的最大距离（多源 BFS）

    问题描述：
    给定一个 n×n 的 0-1 网格，0 表示海洋，1 表示陆地。
    对每个海洋格子（0），计算它到最近的陆地格子（1）的距离
    （只能上下左右移动，每走一步距离 +1），
    返回所有海洋格子中该距离的最大值。
    若网格中没有陆地，或没有海洋，返回 -1。

    核心思路（多源 BFS）：
    把所有陆地格子同时作为 BFS 的起点，一起向外逐层扩散。
    - 从陆地出发，第一层扩散到的海洋格子，距离为 1；
    - 第二层扩散到的海洋格子，距离为 2；
    - 依此类推，被访问到时的层数，就是它到最近陆地的距离。
    因此最后一个被访问到的海洋格子，其层数就是题目要求的最大距离。

    为什么用 BFS：
    BFS 天然按"距离递增"的顺序访问节点，且第一次访问到某个格子
    的层数一定是最短距离（最短路性质）。

    时间复杂度：O(n*n)，每个格子最多入队一次
    空间复杂度：O(n*n)，队列 + 原地标记
    """

    def maxDistance(self, grid: List[List[int]]) -> int:
        n = len(grid)
        # 多源 BFS：把所有陆地格子(1)都作为起点入队
        q = deque()
        for i in range(n):
            for j in range(n):
                if grid[i][j] == 1:
                    q.append((i, j))

        # 没有陆地，或没有海洋，都不存在合法答案
        if not q or len(q) == n * n:
            return -1

        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        distance = -1  # 记录当前 BFS 层数（即到最近陆地的距离）

        while q:
            distance += 1                     # 进入下一层
            for _ in range(len(q)):           # 只处理当前层
                x, y = q.popleft()
                for dx, dy in directions:
                    nx, ny = x + dx, y + dy
                    # 是未访问的海洋格子，就"被陆地感染"，入队
                    if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == 0:
                        grid[nx][ny] = 1      # 原地标记为已访问
                        q.append((nx, ny))

        # 最后一层处理完的格子，就是离所有陆地最远的海洋格子
        return distance


if __name__ == "__main__":
    sol = Solution()

    tests = [
        # (网格, 期望输出)
        ([[1, 0, 1], [0, 0, 0], [1, 0, 1]], 2),
        ([[1, 0, 0], [0, 0, 0], [0, 0, 0]], 4),
        ([[1, 1], [1, 1]], -1),   # 没有海洋
        ([[0, 0], [0, 0]], -1),   # 没有陆地
        ([[0, 0, 1], [0, 0, 0], [0, 0, 0]], 4),
        ([[1]], -1),              # 既无海洋也无陆地可用
    ]

    for i, (grid, expected) in enumerate(tests, 1):
        result = sol.maxDistance([row[:] for row in grid])
        status = "OK " if result == expected else "FAIL"
        print(f"[{status}] Test {i}: maxDistance(...) = {result}, expected = {expected}")
        assert result == expected, f"Test {i} failed: got {result}, expected {expected}"

    print("All tests passed!")