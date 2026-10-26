"""
P5456. 聚餐汇合最短 - Dijkstra + 状压枚举接人集合

路网里有单向路（z=0，只准 x 驶向 y）与双向路（z=1），行人和车辆
都受同样的方向限制。小红驾车按每公里 2 分钟行进，同伴步行按每公里
10 分钟。小红从 a 出发去馆子 b，可以顺路接若干同伴（每人只能在
自己所在路口上车），没接到的同伴按步行全程走过去；每人上车或步行
二选一，中途不改。求「最晚到达的人」最早是多少分钟。
车子不限载量，路与点都可以重复走。

输入格式：
- 第 1 行：p e a b（路口数 <= 1e3，路段数 <= 1e3，起点、馆子）；
- 随后 e 行：x y c z，一条 c 公里的路（c <= 1e2），z=0 单向、z=1 双向；
- 再一行：q（同伴数 0 <= q <= 15）；
- 再一行：q 个整数，各同伴所在路口。

输出格式：
- 一个整数：最晚到达时刻的最小值（分钟）。

核心思路：
1. 只有起终关键点之间的最短距离会影响答案。对 a、b 与 q 名同伴所在
   的路口（去重后 <= 17 个）各做一次 Dijkstra（按公里计），得到
   关键点两两之间的最短公里数。车与步行同走一张图，只是计时系数不同：
   车程 = 2 * 公里数，步行 = 10 * 公里数。
2. 接谁、按什么顺序接：q <= 15，用状压 DP 枚举而非排列。
   dp[mask][i] = 从 a 出发、已接到 mask 中全部同伴、此刻停在同伴 i
   处的最短公里数（i ∈ mask）。转移
   dp[mask | 1<<j][j] = min(dp[mask][i] + km(i -> j))。
3. 对每个接人集合 mask 评估方案：车程公里 = mask 为空时 km(a -> b)，
   否则 min over i∈mask 的 dp[mask][i] + km(i -> b)；到达时刻 =
   max(2 * 车程公里, 未接到同伴步行时间的最大值)。答案取全程最小。

时间复杂度：O(K * (p + e) log p + 2^q * q^2)，K = 关键点数 <= q + 2
空间复杂度：O(2^q * q + (p + e))
"""

# https://codefun2000.com/p/P5456
import heapq
import sys

# @sample-start
"""
样例输入 1:
4 4 1 4
1 2 3 1
2 4 4 1
1 3 5 1
3 4 2 1
2
2 3

样例输出 1:
20
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 3 1 3
1 2 10 1
2 3 10 1
1 3 2 1
1
2

样例输出 2:
40
"""
# @sample-end

INF = float("inf")


def dijkstra(adj, src, n):
    """单源最短路（按公里），返回 dist 数组，下标 1..n。"""
    dist = [INF] * (n + 1)
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, c in adj[u]:
            nd = d + c
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist


def solve():
    """读入路网与同伴位置，枚举接人集合求最早汇合时刻。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    p = int(next(it))
    e = int(next(it))
    a = int(next(it))
    b = int(next(it))

    adj = [[] for _ in range(p + 1)]
    for _ in range(e):
        x = int(next(it))
        y = int(next(it))
        c = int(next(it))
        z = int(next(it))
        adj[x].append((y, c))
        if z == 1:
            adj[y].append((x, c))

    q = int(next(it))
    friends = [int(next(it)) for _ in range(q)]

    # 关键点：起点、馆子、各同伴所在路口（去重后逐个跑 Dijkstra）
    key_nodes = sorted(set([a, b] + friends))
    dist = {node: dijkstra(adj, node, p) for node in key_nodes}

    km_a_b = dist[a][b]
    km_a_friend = [dist[a][f] for f in friends]
    km_friend_friend = [[dist[friends[i]][friends[j]] for j in range(q)] for i in range(q)]
    km_friend_b = [dist[f][b] for f in friends]

    # 步行是每名「未接到」同伴的固定代价；wmax[S] = S 集合里步行时间最大值
    walk = [10 * km_friend_b[j] for j in range(q)]
    wmax = [0] * (1 << q)
    for s in range(1, 1 << q):
        low = s & -s
        j = low.bit_length() - 1
        wmax[s] = max(wmax[s ^ low], walk[j])

    # dp[mask][i]：已接到 mask 里的同伴、车停在同伴 i 处的最短公里数
    dp = [[INF] * q for _ in range(1 << q)]
    for i in range(q):
        dp[1 << i][i] = km_a_friend[i]
    for mask in range(1, 1 << q):
        row = dp[mask]
        for i in range(q):
            if row[i] == INF or not (mask >> i & 1):
                continue
            base = row[i]
            for j in range(q):
                if mask >> j & 1:
                    continue
                cand = base + km_friend_friend[i][j]
                nm = mask | (1 << j)
                if cand < dp[nm][j]:
                    dp[nm][j] = cand

    ans = INF
    for mask in range(1 << q):
        if mask == 0:
            car_km = km_a_b
        else:
            car_km = min(
                dp[mask][i] + km_friend_b[i]
                for i in range(q)
                if mask >> i & 1
            )
        arrive = max(2 * car_km, wmax[(1 << q) - 1 ^ mask])
        if arrive < ans:
            ans = arrive
    print(ans)


def run_tests():
    """运行官方样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：只接路口 2，同伴 3 步行 20 分钟
        (
            "4 4 1 4\n1 2 3 1\n2 4 4 1\n1 3 5 1\n3 4 2 1\n2\n2 3\n",
            "20",
        ),
        # 官方样例 2：绕路接人（40 分钟）优于让同伴步行（100 分钟）
        (
            "3 3 1 3\n1 2 10 1\n2 3 10 1\n1 3 2 1\n1\n2\n",
            "40",
        ),
        # q=0：直接看车程
        (
            "2 1 1 2\n1 2 5 1\n0\n",
            "10",
        ),
        # 同伴已在馆子：步行时间 0，只看车程
        (
            "2 1 1 2\n1 2 5 1\n1\n2\n",
            "10",
        ),
        # 单向路 z=0：车开不进同伴路口，只能让他步行 2->1->3（120 分钟）
        (
            "3 2 1 3\n2 1 10 0\n1 3 2 1\n1\n2\n",
            "120",
        ),
        # 接人顺序：先接远的（20 分钟就近端顺序 24 分钟）
        (
            "4 3 1 4\n1 2 1 1\n2 3 1 1\n3 4 8 1\n2\n2 3\n",
            "20",
        ),
        # 两人同在路口 2：接一次等于接两人
        (
            "3 2 1 3\n1 2 2 1\n2 3 6 1\n2\n2 2\n",
            "16",
        ),
        # 同伴起点即小红出发路口：上车 0 公里，只看车程
        (
            "2 1 1 2\n1 2 9 1\n1\n1\n",
            "18",
        ),
        # 绕路接人代价高于步行：单向路 1->3 要 6 公里，
        # 接人车程 14 分钟，不如让同伴沿 3->2 步行 10 分钟
        (
            "3 3 1 2\n1 2 2 1\n1 3 6 0\n3 2 1 0\n1\n3\n",
            "10",
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
