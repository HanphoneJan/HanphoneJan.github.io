# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/7ed67c83ade147b189e51d40181e9c1d
# 推导式（OPPO 2023 秋招 · 后端岗）

"""
推导式 —— 图 / DFS（可达性）

题目描述：
n 条形如 x -> y 的推导式，表示结论 x 可以推导出结论 y。推导具有传递性
（1->3 且 3->5 则 1->5）。问结论 c 能推导出多少个不同的结论（含 c 自己）。

输入格式：
第一行两个整数 n, c（1 <= n <= 1e5，1 <= x, y, c <= 10000）。
接下来 n 行，每行两个整数 x, y，表示 x -> y（可能有重复）。

输出格式：
一个整数，表示 c 能推导出的不同结论数。

核心思路：
1. 「能推导出」就是有向图上的「可达」。传递性恰好等价于走任意多步。
2. 从 c 出发做一次 DFS/BFS，沿有向边 x -> y 走，能访问到的不同结点数
   就是答案（起点 c 自己算一个）。
3. 注意方向：样例里的 8 -> 1、4 -> 2 不能反过来用，所以不能把有向边当
   无向边合并（这与「并查集求连通块」是两件事）。
4. 结论编号最大只有 10000，直接开 10001 个桶的邻接表，去重交给 visited。

时间复杂度：O(n + V)，V = 最大结论编号
空间复杂度：O(n + V)
"""

# @sample-start
"""
样例输入 1:
5 1
1 2
1 3
3 9
4 2
8 1

样例输出 1:
4

样例输入 2:
2 2
1 2
3 2

样例输出 2:
1
"""
# @sample-end

import sys

MAX_ID = 10000


def solve() -> None:
    """从 c 出发沿有向边 DFS，数一数能到达多少个结点"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    pos = 0
    n = int(data[pos]); pos += 1
    c = int(data[pos]); pos += 1

    graph = [[] for _ in range(MAX_ID + 1)]
    for _ in range(n):
        x = int(data[pos]); y = int(data[pos + 1]); pos += 2
        graph[x].append(y)

    visited = [False] * (MAX_ID + 1)
    visited[c] = True
    stack = [c]
    count = 1
    while stack:
        u = stack.pop()
        for v in graph[u]:
            if not visited[v]:
                visited[v] = True
                count += 1
                stack.append(v)

    sys.stdout.write(str(count) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("5 1\n1 2\n1 3\n3 9\n4 2\n8 1\n", "4"),
        ("2 2\n1 2\n3 2\n", "1"),
        ("1 5\n1 2\n", "1"),                        # c 根本不在任何式子里
        ("3 1\n1 1\n1 2\n2 1\n", "2"),              # 自环 + 环，visited 防死循环
        ("4 1\n1 2\n1 2\n2 3\n3 3\n", "3"),         # 重复的推导式不影响答案
    ]
    class FakeStdin:
        """把字符串包成带 buffer 的 stdin，供 sys.stdin.buffer.read() 使用"""

        def __init__(self, text: str) -> None:
            self.buffer = io.BytesIO(text.encode())

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = FakeStdin(inp)
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
