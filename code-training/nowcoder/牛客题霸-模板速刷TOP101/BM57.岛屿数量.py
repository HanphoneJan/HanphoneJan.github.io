# @nc app=nowcoder id=0c9664d1554e466aa107d899418e814e topic=295 question=1024684 lang=Python3
# 2026-10-15 20:06:13
# https://www.nowcoder.com/practice/0c9664d1554e466aa107d899418e814e?tpId=295&tqId=1024684
# [BM57] 岛屿数量

"""
BM57. 岛屿数量 —— 网格连通块（DFS / BFS）

题目描述：
给一个 01 矩阵，1 代表陆地，0 代表海洋。上下左右相邻的 1 属于同一个岛。
判断岛屿个数。（存储的 01 数据其实是字符 '0'、'1'。）

核心思路：
遍历每个格子，一旦遇到还没访问过的陆地，就说明发现了一座新岛：
岛屿数量 +1，然后从该格子出发做一次 DFS/BFS，
把与它相连的整片陆地全部标记为已访问（即「淹没」这座岛）。

关键点：
- 入口参数名是 input / grid，字符比较要兼容 '1' 与整数 1；
- 用一个 seen 数组标记，避免修改入参（不同判题机的入参类型可能不同）。

时间复杂度：O(rows * cols)
空间复杂度：O(rows * cols)
"""

# @sample-start
"""
样例输入 1:
grid = [[1,1,0,0,0],[0,1,0,1,1],[0,0,0,1,1],[0,0,0,0,0],[0,0,1,1,1]]

样例输出 1:
3
"""
# @sample-end

# @sample-start
"""
样例输入 2:
grid = [[0]]

样例输出 2:
0
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def solve(self, grid: List[List[str]]) -> int:
        """统计 01 矩阵里的四联通岛屿数量"""
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        seen = [[False] * cols for _ in range(rows)]
        dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
        count = 0

        def is_land(i: int, j: int) -> bool:
            # 兼容字符 '1' 与整数 1 两种入参
            return not seen[i][j] and grid[i][j] in ('1', 1)

        for i in range(rows):
            for j in range(cols):
                if is_land(i, j):
                    count += 1                 # 发现新岛
                    seen[i][j] = True
                    stack = [(i, j)]
                    while stack:               # 淹没整座岛
                        x, y = stack.pop()
                        for dx, dy in dirs:
                            nx, ny = x + dx, y + dy
                            if 0 <= nx < rows and 0 <= ny < cols and is_land(nx, ny):
                                seen[nx][ny] = True
                                stack.append((nx, ny))
        return count


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([[1, 1, 0, 0, 0], [0, 1, 0, 1, 1], [0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0], [0, 0, 1, 1, 1]], 3),
        ([[0]], 0),
        ([[1, 1], [1, 1]], 1),
        ([['1', '0'], ['0', '1']], 2),
    ]
    for i, (grid, expected) in enumerate(tests, 1):
        actual = Solution().solve(grid)
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected}, 实际={actual})")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        _run_tests()

# @nc code=end
