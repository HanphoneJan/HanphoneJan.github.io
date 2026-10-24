# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/246a42faded9456d964ddbc55a79e33c
# 小O的树上加边（OPPO 2024 秋招 · AI/算法岗）

"""
小O的树上加边 —— 图论 / 二分图 / 染色

题目描述：
给定一棵 n 个点的树，问最多还能再加多少条边，使新的图仍然是二分图。

输入格式：
第一行一个整数 n。
接下来 n-1 行，每行两个整数 u、v，表示一条树边。

输出格式：
一个整数，表示最多能添加的边数。

核心思路：
1. 树是连通的，所以它的二分图染色（黑 / 白两类）唯一确定，只有互换两种颜色
   这一种等价的写法。设两类点数为 c0、c1。
2. 加边后仍是二分图，说明存在一种二分划分使所有边都跨类。树的边已经固定，
   划分不能再变，所以新加的边只能连「一个黑点 + 一个白点」。
3. 二分图中边数最多的形状是完全二分图，边数 c0 * c1。
4. 树本身已经有 n - 1 条边，故答案 = c0 * c1 - (n - 1)。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
1 2
2 3
3 4

样例输出 1:
1

说明：染色为 {1,3} 与 {2,4}，完全二分图共 2*2 = 4 条边，
已有 3 条，还能加 1 条（例如 (1,4)）。
"""
# @sample-end

import sys
from collections import deque


def solve() -> None:
    """BFS 染色统计两类点数，再算完全二分图的边数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    n = int(data[0])
    adj = [[] for _ in range(n + 1)]
    idx = 1
    for _ in range(n - 1):
        u = int(data[idx])
        v = int(data[idx + 1])
        idx += 2
        adj[u].append(v)
        adj[v].append(u)

    color = [-1] * (n + 1)
    color[1] = 0
    cnt = [1, 0]                 # cnt[0] / cnt[1] 为两类点的数量

    dq = deque([1])
    while dq:
        u = dq.popleft()
        for w in adj[u]:
            if color[w] == -1:
                color[w] = color[u] ^ 1
                cnt[color[w]] += 1
                dq.append(w)

    sys.stdout.write(str(cnt[0] * cnt[1] - (n - 1)) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("4\n1 2\n2 3\n3 4\n", "1"),                  # 题面样例
        ("1\n", "0"),                                 # 只有一个点，加不了边
        ("2\n1 2\n", "0"),                            # 已经是完全二分图 K(1,1)
        ("3\n1 2\n1 3\n", "0"),                        # 菊花图，c0=1、c1=2，(1,2) 已存在
        ("5\n1 2\n2 3\n3 4\n4 5\n", "2"),              # 链 1-2-3-4-5，两类各 3 / 2
    ]

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
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
