from collections import deque
from typing import List

#
# Note: 类名、方法名、参数名已经指定，请勿修改
#
# 艾尔罗大迷宫
# @param generated_map int整型 二维数组 (N*N 迷宫地图)
# @return int整型 不可到达的格子总数
#

# ================= 原始实现（保留作对比参考） =================
# 原解法只用了一次"从左上角往右下"的单向扫描，
# 只能借助"左/上方向已标记"的格子传播，无法处理需要
# 绕道、先下后上的复杂路径，会漏算大量可达格子。
#
# class Solution:
#     def apply(self, generated_map) :
#         n = len(generated_map)
#         result = 1
#         result_map = [[0]*n for _ in range(n)]
#         result_map[0][0] = 1
#         for i in range(n):
#             for j in range(n):
#                 if result_map[i][j]==1 or generated_map[i][j]==1:
#                     continue
#                 if (generated_map[i][j]==0) and ((i>0 and (result_map[i-1][j]==1)) or (i+1<n and (result_map[i+1][j]==1)) or (j+1<n and (result_map[i][j+1]==1)) or (j>0 and (result_map[i][j-1]==1))):
#                     result_map[i][j] = 1
#                     result += 1
#         return n*n - result
# ============================================================


class Solution:
    """
    艾尔罗大迷宫 - 统计不可到达的格子总数（BFS 洪水填充）

    问题描述：
    0 代表可到达区域，1 代表原生不可到达的障碍。
    玩家从左上角 [0,0] 出发（保证该处值为 0），只能上下左右移动。
    不可到达的格子包含两类：
    - 原生障碍 1；
    - 值为 0、但被障碍隔开而无法从起点到达的格子。

    核心思路：
    不可到达的格子数 = 总格子数 - 从起点能够走到的格子数。
    因此只需要从 (0,0) 做一次 BFS，只扩展值为 0 且未访问过的格子，
    数出"可达空地"数量，再用 N*N 减掉即可。

    为什么这样是对的：
    - 被 BFS 访问到的格子一定是可达空地；
    - 没被访问到的格子要么本身是障碍 1，要么是不与起点连通的 0；
    - 这两类恰好就是要统计的全部不可达格子。

    时间复杂度：O(N*N)，每个格子最多进队一次
    空间复杂度：O(N*N)，visited 数组 + 队列
    """

    def apply(self, generated_map: List[List[int]]) -> int:
        n = len(generated_map)

        # 记录每个格子是否访问过
        visited = [[False] * n for _ in range(n)]

        # 四个方向：上、下、左、右
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

        # BFS 队列，从起点 (0,0) 出发
        q = deque()
        q.append((0, 0))
        visited[0][0] = True

        # 统计从起点能够到达的空地数（起点本身算一个）
        reachable = 0

        while q:
            x, y = q.popleft()
            reachable += 1

            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                # 新位置必须满足：边界内、值为 0、且没有访问过
                if 0 <= nx < n and 0 <= ny < n and generated_map[nx][ny] == 0 and not visited[nx][ny]:
                    visited[nx][ny] = True
                    q.append((nx, ny))

        # 总格子数 - 可达格子数 = 不可达格子数
        return n * n - reachable


if __name__ == "__main__":
    solution = Solution()

    tests = [
        # (迷宫地图, 期望输出)
        # 样例3：3 个障碍全为不可达，其余 0 均可达 => 3
        ([[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 1, 0], [1, 0, 0, 0]], 3),
        # 样例1：起点被围死，只有左上角可达 => 16 - 1 = 15
        ([[0, 1, 1, 0], [1, 0, 0, 0], [0, 1, 0, 1], [0, 1, 1, 0]], 15),
        # 样例2：4 个障碍 + 被隔开的 (2,3) => 16 - 11 = 5
        ([[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]], 5),
        # 单格迷宫，全可达 => 0
        ([[0]], 0),
        # 全 0 迷宫，全部可达 => 0
        ([[0, 0], [0, 0]], 0),
    ]

    for i, (grid, expected) in enumerate(tests, 1):
        result = solution.apply([row[:] for row in grid])
        print(f"Test {i}: apply(...) = {result}, expected = {expected}")
        assert result == expected, f"Test {i} failed: got {result}, expected {expected}"

    print("All tests passed!")