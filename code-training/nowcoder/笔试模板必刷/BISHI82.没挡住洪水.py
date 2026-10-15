# @nc app=nowcoder id=6d62436fda5f4ef997e68d1ce1dd6eb2 topic=389 question=11262542 lang=Python3
# 2026-10-15 20:07:40
# https://www.nowcoder.com/practice/6d62436fda5f4ef997e68d1ce1dd6eb2?tpId=389&tqId=11262542
# [BISHI82] 没挡住洪水

"""
BISHI82. 没挡住洪水 —— 网格连通块（BFS/DFS）

题目描述：
地图是一个 N 行 N 列的字符矩阵：'.' 表示已经被洪水淹没的区域，
'#' 表示空地。四联通的 '#' 组成一个区域。
洪水还会继续上涨：所有与「已经被洪水淹没的区域」上下左右相邻的空地格子
都会在这一次上涨中被淹没。
请计算此次上涨后，有多少个空地区域会被「完全淹没」。

输入格式：
第一行一个整数 N。
随后 N 行，每行 N 个字符，构成地图，只含 '.' 与 '#'。
已知边界四条边全部是已经被洪水淹没的区域。

输出格式：
一个整数，表示一天后会完全消失的空地区域数量。

核心思路：
一个 '#' 区域被「完全淹没」，当且仅当它的**每一个格子**都与洪水相邻 ——
只要有一个格子的上下左右全是 '#'，它这次就不会进水，区域就没被完全淹没。
所以分两步：
1. 找出所有四联通的 '#' 区域（BFS/DFS 染色）；
2. 对每个区域，检查其中每个格子是否至少有一个上下左右的洪水邻居。

时间复杂度：O(N^2)
空间复杂度：O(N^2)
"""

# @sample-start
"""
样例输入 1:
1
.

样例输出 1:
0
"""
# @sample-end

# @nc code=start

import sys
from collections import deque


def solve() -> None:
    """统计每个 '#' 区域是否每个格子都临水，输出完全淹没的区域数"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    grid = data[1:1 + n]

    seen = [[False] * n for _ in range(n)]
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    fully_submerged = 0

    for i in range(n):
        for j in range(n):
            if grid[i][j] != '#' or seen[i][j]:
                continue
            # 找到一个新区域，BFS 收集它所有格子
            seen[i][j] = True
            queue = deque([(i, j)])
            every_cell_touches_water = True
            while queue:
                x, y = queue.popleft()
                touches_water = False
                for dx, dy in dirs:
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < n and 0 <= ny < n):
                        touches_water = True          # 出界也算临水
                    elif grid[nx][ny] == '.':
                        touches_water = True
                    elif not seen[nx][ny]:
                        seen[nx][ny] = True
                        queue.append((nx, ny))
                if not touches_water:
                    every_cell_touches_water = False
            if every_cell_touches_water:
                fully_submerged += 1

    sys.stdout.write(str(fully_submerged) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("1\n.\n", "0"),
        # 一个 1×3 的细长空地，两端都邻水 → 全部被淹
        ("5\n.....\n.#.#.\n.....\n.....\n.....\n", "2"),
        # 3×3 的实心块，中心格四周全是 '#' → 不会被完全淹没
        ("5\n.....\n.###.\n.###.\n.###.\n.....\n", "0"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()

# @nc code=end
