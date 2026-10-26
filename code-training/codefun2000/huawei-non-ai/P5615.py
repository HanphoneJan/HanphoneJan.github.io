"""
P5615. 隔断染病计时 - 多源 BFS

长方形屋子是一张 r×c 的格子表：0 表示尚未染病、1 表示已经染病、
x 表示挡住去路的物体。病菌每一轮只迈进上下左右紧邻的格子，一轮
记作 1 小时。要输出把所有「还有机会」染上的人全部染完所需的最少
小时数；只要仍有人被挡路物体隔开、永远染不上，输出 -1。

输入格式：
- 第 1 行：r c（行数与列数）；
- 随后 r 行：每行一个长度为 c 的字符串，字符为 0 / 1 / x。

输出格式：
- 一个整数：把可染尽的人全部染完所需的小时数；有人永远染不上则为 -1。

核心思路：
答案是「最晚染上的人发生在第几小时」。所有染病者从 0 时刻同时向外
扩散，谁先谁后不影响每个格子被染上的时刻，因此把全部染病者（时刻 0）
一起入队做多源 BFS：每个 0 格第一次被染上的时刻，就是它被染上的
最小时刻。队列清空后若仍有 0 格没被到达，说明有人被隔开，输出 -1；
否则输出扩散过程中出现的最大时刻。

时间复杂度：O(r * c)，每个格子至多入队一次
空间复杂度：O(r * c)
"""

# https://codefun2000.com/p/P5615
import sys
from collections import deque

# @sample-start
"""
样例输入 1:
3 4
0100
00x0
x010

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 3
0x0
x1x
00x

样例输出 2:
-1
"""
# @sample-end


def spread(r, c, rows):
    """多源 BFS：返回全部可染尽时的小时数；仍有人永远染不上时返回 -1。"""
    dist = [[-1] * c for _ in range(r)]
    queue = deque()
    remaining = 0  # 尚未被染上的 0 格数量
    best = 0       # 最晚一次染上发生在第几小时
    for i in range(r):
        for j, ch in enumerate(rows[i]):
            if ch == '1':
                dist[i][j] = 0
                queue.append((i, j))
            elif ch == '0':
                remaining += 1

    while queue:
        i, j = queue.popleft()
        d = dist[i][j] + 1
        for ni, nj in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)):
            if 0 <= ni < r and 0 <= nj < c and rows[ni][nj] == '0' and dist[ni][nj] == -1:
                dist[ni][nj] = d
                remaining -= 1
                if d > best:
                    best = d
                queue.append((ni, nj))

    return -1 if remaining else best


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    r, c = int(data[0]), int(data[1])
    rows = [data[2 + i].decode() for i in range(r)]
    print(spread(r, c, rows))


def run_tests():
    """运行嵌入的官方样例与边界/变形用例，方便本地自测。"""
    import io

    def run_once(text):
        """solve() 走 sys.stdin.buffer，这里提供带 buffer 的文本流。"""
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(text.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    hundred_zeros = "0" * 100
    cases = [
        # 官方样例 1：两处病源同时扩散，2 小时染完全部
        ("3 4\n0100\n00x0\nx010\n", "2"),
        # 官方样例 2：左上与右上两格被挡板围死，永远染不上
        ("3 3\n0x0\nx1x\n00x\n", "-1"),
        # 没有任何染病者：所有人都染不上，输出 -1
        ("3 3\n000\n000\n000\n", "-1"),
        # 单格已经染病：没有待染的人，0 小时
        ("1 1\n1\n", "0"),
        # 全部已染病：同样 0 小时
        ("2 3\n111\n111\n", "0"),
        # 屋子里全是挡路物体：没有可染的人，按 0 处理
        ("2 2\nxx\nxx\n", "0"),
        # 单个染病者在一行中间，向两边扩散，最远端要 2 小时
        ("1 5\n00100\n", "2"),
        # 挡板把屋子切成两半，染病者只在一侧：另一侧永远染不上
        ("3 3\n1x0\nxx0\nxx0\n", "-1"),
        # 样例 1 的最小变形：(2,3) 换成 x，最右一列要拐到第 3 小时才染完
        ("3 4\n0100\n00x0\nx01x\n", "3"),
        # 100×100 空屋，左上角一个病源：最远的右下角要 99+99=198 小时
        ("100 100\n" + "1" + "0" * 99 + "\n" + (hundred_zeros + "\n") * 99, "198"),
        # 100×100 空屋居中一个病源：到任一角都是 50+50=100 小时
        (
            "100 100\n"
            + (hundred_zeros + "\n") * 49
            + "0" * 49 + "1" + "0" * 50 + "\n"
            + (hundred_zeros + "\n") * 50,
            "100",
        ),
        # 两条走廊被中央挡板分开，两个对角病源各自沿同行同列扩散，最远点 3 小时
        ("4 4\n1000\n0xx0\n0xx0\n0001\n", "3"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        output = run_once(inp)
        status = "✓" if output == expected else "✗"
        print(f"用例 {i}: 期望={expected}, 实际={output} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
