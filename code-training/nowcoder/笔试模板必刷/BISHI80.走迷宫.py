# @nc app=nowcoder id=e88b41dc6e764b2893bc4221777ffe64 topic=389 question=2373924 lang=Python3
# 2026-10-15 20:07:30
# https://www.nowcoder.com/practice/e88b41dc6e764b2893bc4221777ffe64?tpId=389&tqId=2373924
# [BISHI80] 走迷宫

"""
BISHI80. 走迷宫 —— 网格最短路（BFS）

题目描述：
给定一个 n 行 m 列的网格，从起点 s 出发，每一步可以向上、下、左、右移动一格
（不能越界）。有些格子上有障碍物，无法经过。
求从 s 移动到终点 t 的最少步数；若无法到达，输出 -1。

输入格式：
第一行两个整数 n、m，代表行数与列数。
第二行四个整数 x1 y1 x2 y2，代表起点与终点的坐标（行列均从 1 开始）。
此后 n 行，每行一个长度为 m 的字符串：'*' 表示障碍物，'.' 表示可通行。
保证起点所在格子可通行。

输出格式：
一个整数：最少移动次数；无法到达输出 -1。

核心思路：
边长全为 1 的网格图最短路 —— BFS 的教科书场景。
从起点入队，每次向四个方向扩展一层，第一次到达终点时层数就是最短步数。
用一个 dist 数组同时记录「是否访问过」和「到起点的距离」。

时间复杂度：O(n * m)
空间复杂度：O(n * m)
"""

# @sample-start
"""
样例输入 1:
5 5
1 1 5 5
.....
****.
.....
**.**
.....

样例输出 1:
12
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5 5
1 1 4 5
.....
****.
.....
**.**
.....

样例输出 2:
-1
"""
# @sample-end

# @sample-start
"""
样例输入 3:
5 5
1 1 5 5
.....
****.
.....
*****
.....

样例输出 3:
-1
"""
# @sample-end

# @nc code=start

import sys
from collections import deque


def solve() -> None:
    """BFS 求网格最短步数"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); m = int(data[idx + 1]); idx += 2
    x1 = int(data[idx]); y1 = int(data[idx + 1])
    x2 = int(data[idx + 2]); y2 = int(data[idx + 3]); idx += 4
    grid = data[idx:idx + n]

    sx, sy = x1 - 1, y1 - 1          # 题目坐标从 1 开始，转成 0 开始
    tx, ty = x2 - 1, y2 - 1

    dist = [[-1] * m for _ in range(n)]
    dist[sx][sy] = 0
    queue = deque([(sx, sy)])
    while queue:
        x, y = queue.popleft()
        if x == tx and y == ty:
            break
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < m and dist[nx][ny] == -1 and grid[nx][ny] == '.':
                dist[nx][ny] = dist[x][y] + 1
                queue.append((nx, ny))
    sys.stdout.write(str(dist[tx][ty]) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("5 5\n1 1 5 5\n.....\n****.\n.....\n**.**\n.....\n", "12"),
        ("5 5\n1 1 4 5\n.....\n****.\n.....\n**.**\n.....\n", "-1"),
        ("5 5\n1 1 5 5\n.....\n****.\n.....\n*****\n.....\n", "-1"),
        ("1 1\n1 1 1 1\n.\n", "0"),
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
