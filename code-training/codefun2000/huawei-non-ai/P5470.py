"""
P5470. 推理模型分批约束 - DAG 上拓扑序 DP（最长链长度）

一次推理拉起 p 份模型，约束 rel[k]=[u,v] 表示 u 必须排在 v 前面
（v 要等 u 结束）。同一波次内的模型必须互无先后约束，允许同时开工；
求让全部模型跑完的最少波次数。

输入格式：
- 第 1 行：模型份数 p 与约束条数 e
  （1<=p<=1e5，0<=e<=min(p*(p-1), 1.5e6)，保证无环）；
- 随后 e 行：每行先 u 后 v，即 u 排在 v 前面。

输出格式：
- 一个整数：最少波次数。

核心思路：
1. 每条约束 u -> v 把 v 至少推到比 u 更后的一波，所以「最少波次」
   就是依赖链最长那条的长度：沿链上的模型只能一波一个、逐波排开，
   而任何不在链上的模型总可以在链头那波一起跑。
2. dp[x] = 以 x 结尾（x 是链上最后一个）的最长链的模型数。初值 1，
   拓扑序下松弛 dp[v] = max(dp[v], dp[u] + 1)。用 Kahn 队列实现：
   入度为 0 的点先入队，每弹出一个 u，就把它还没有依赖的邻居 v 的
   dp 与入度一并更新，入度归零再入队。
3. 答案 = max(dp[1..p])。e=0 时所有点都是孤立点，答案 1；
   一条贯穿 p 个点的链答案 p。

时间复杂度：O(p + e)
空间复杂度：O(p + e)
"""

# https://codefun2000.com/p/P5470
import sys

# @sample-start
"""
样例输入 1:
6 5
2 1
2 5
1 4
5 4
3 6

样例输出 1:
3
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5 4
5 3
3 2
2 1
1 4

样例输出 2:
5
"""
# @sample-end


def solve():
    """读入约束建 DAG，Kahn 拓扑序上做最长链 DP。"""
    readline = sys.stdin.buffer.readline

    def read_ints():
        parts = readline().split()
        while not parts:  # 跳过可能出现的空行
            parts = readline().split()
        return [int(x) for x in parts]

    head = read_ints()
    p, e = head[0], head[1]

    adj = [[] for _ in range(p + 1)]
    indeg = [0] * (p + 1)
    for _ in range(e):
        pair = read_ints()
        u, v = pair[0], pair[1]
        adj[u].append(v)
        indeg[v] += 1

    # dp[x]：以 x 结尾的最长链长度；成链前每个模型自成一波
    dp = [1] * (p + 1)
    queue = [x for x in range(1, p + 1) if indeg[x] == 0]
    ans = 1
    qi = 0
    while qi < len(queue):
        u = queue[qi]
        qi += 1
        if dp[u] > ans:
            ans = dp[u]
        du1 = dp[u] + 1
        out = adj[u]
        for v in out:
            if du1 > dp[v]:
                dp[v] = du1
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    print(ans)


def run_tests():
    """运行官方样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：(2,3) -> (1,5,6) -> (4) 三波
        (
            "6 5\n2 1\n2 5\n1 4\n5 4\n3 6\n",
            "3",
        ),
        # 官方样例 2：一条贯成全链，5 波
        (
            "5 4\n5 3\n3 2\n2 1\n1 4\n",
            "5",
        ),
        # 无任何约束：一波全并行
        (
            "3 0\n",
            "1",
        ),
        # 单个模型
        (
            "1 0\n",
            "1",
        ),
        # 菱形两链等长：1->2 与 1->3 汇合到 4，最长链 3
        (
            "4 4\n1 2\n1 3\n2 4\n3 4\n",
            "3",
        ),
        # 两条独立短链：最长各 2
        (
            "4 2\n1 2\n3 4\n",
            "2",
        ),
        # 记录重复出现的同一条约束：不应多算波次
        (
            "3 3\n1 2\n1 2\n2 3\n",
            "3",
        ),
        # 分叉汇聚且长短不一：长链决定答案
        (
            "5 5\n1 2\n2 3\n1 4\n4 5\n5 3\n",
            "4",
        ),
        # 链头编号大于链身：按编号直扫会漏掉靠后前驱的贡献
        (
            "3 2\n3 1\n1 2\n",
            "3",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
