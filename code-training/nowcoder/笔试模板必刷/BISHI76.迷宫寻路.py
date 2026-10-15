# @nc app=nowcoder id=0c8930e517444d04b426e9703d483ed4 topic=389 question=11262526 lang=Python3
# 2026-10-15 20:07:43
# https://www.nowcoder.com/practice/0c8930e517444d04b426e9703d483ed4?tpId=389&tqId=11262526
# [BISHI76] 迷宫寻路

"""
BISHI76. 迷宫寻路 —— 图的连通性（BFS/DFS）

题目描述：
旺仔哥哥被困在一个 n 行 m 列的矩形迷宫里。每个格子要么是空地（'.'），
要么是墙（'#'）。他只能从空地移动到上下左右相邻的空地。
起点是左上角 (1, 1)，终点是右下角 (n, m)。请判断他能否到达终点。

输入格式：
第一行两个正整数 n、m。
接下来 n 行，每行一个长为 m 的、只含 '.' 与 '#' 的字符串。
保证起点和终点均为空地。

输出格式：
能走到终点输出 Yes，否则输出 No。

核心思路：
把「能否到达」看作图的可达性问题：每个空地是图上的点，相邻空地之间有边。
从起点出发做一次 BFS（或 DFS），判断能否访问到终点。
BFS 用队列一层层扩散，天然最短；本题只问可达，两种都行。

时间复杂度：O(n * m)
空间复杂度：O(n * m)
"""

# @sample-start
"""
样例输入 1:
3 5
.##.#
.#...
...#.

样例输出 1:
Yes
"""
# @sample-end

# @nc code=start

import sys
from collections import deque


def solve() -> None:
    """从左上角 BFS，判断能否到达右下角"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    m = int(data[1])
    grid = data[2:2 + n]

    start_walkable = grid[0][0] == '.'
    end_walkable = grid[n - 1][m - 1] == '.'
    if not start_walkable or not end_walkable:
        sys.stdout.write("No\n")
        return

    seen = [[False] * m for _ in range(n)]
    seen[0][0] = True
    queue = deque([(0, 0)])
    while queue:
        x, y = queue.popleft()
        if x == n - 1 and y == m - 1:
            sys.stdout.write("Yes\n")
            return
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < m and not seen[nx][ny] and grid[nx][ny] == '.':
                seen[nx][ny] = True
                queue.append((nx, ny))
    sys.stdout.write("No\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3 5\n.##.#\n.#...\n...#.\n", "Yes"),
        ("2 2\n.#\n#.\n", "No"),
        ("2 2\n..\n..\n", "Yes"),
        ("1 1\n.\n", "Yes"),
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
