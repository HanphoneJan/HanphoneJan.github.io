"""
P5471. 时窗巡回最短 - 状态压缩动态规划（哈密顿回路 + 时间窗等待）

快递员从仓站（0 号站）出发，把客户 1..m-1 各送一次，最后回到仓站。
到达任何站点 p 的时刻必须落在窗口 [lo_p, hi_p] 内：早到要等到 lo_p（等待计入总时长），
晚到则这条走法作废。求"回到仓站的时刻"的最小值；无合法走法输出 -1。

输入格式：
- 第 1 行：站点数 m（2 <= m <= 15）；
- 接下来 m 行：每行两个整数 lo_p、hi_p（仓站是 [0, 1440]）；
- 再接下来 m 行：耗时表 dur，第 p 行第 q 列为 p -> q 的分钟数。

核心思路：
1. 每位客户只有"送过 / 没送过"两种状态，m-1 位客户共 2^(m-1) 个子集；
   状压 DP 的状态 dp[mask][u] = 送完 mask 里的客户、正停在客户 u 时
   "离开 u 的最早时刻"（即该站的送达时刻，已扣掉必要的等待）。
2. 到达下一个客户 v 时，实际送达时刻 = max(到达时刻, lo_v)；超过 hi_v 就剪掉。
   等待贪心发生在"能等就等到 lo"这一点上：送完一站后立刻下一站的走法里，
   早到的等待全部折算在下一站上，任何多余的滞留只会把后续越推越晚，贪足即最优。
3. 全部客户送完后，从 dp[full][u] 加 dur[u][0] 回仓站，按题面"同样卡 [lo0, hi0]"
   校验回程时刻，取最小；一个合法走法都没有则输出 -1。

时间复杂度：O(2^m * m^2)，m = 15 时约 7.4e5 次转移
空间复杂度：O(2^m * m)
"""

# https://codefun2000.com/p/P5471
import sys

INF = 10 ** 9

# @sample-start
"""
样例输入 1:
4
0 1440
6 18
20 45
14 28
0 4 18 8
6 0 9 20
10 12 0 7
9 16 11 0

样例输出 1:
36
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4
0 1440
5 12
5 12
5 12
0 4 4 4
4 0 10 10
4 10 0 10
4 10 10 0

样例输出 2:
-1
"""
# @sample-end


def solve():
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    m = int(next(it))

    lo = [0] * m
    hi = [0] * m
    for p in range(m):
        lo[p] = int(next(it))
        hi[p] = int(next(it))

    # dur[p][q]：从站点 p 到站点 q 的行驶分钟数，正反向未必相同
    dur = [[int(next(it)) for _ in range(m)] for _ in range(m)]

    nc = m - 1  # 客户数（站点 1..m-1）
    full = (1 << nc) - 1

    # dp[mask][u]：送完 mask 的客户、停在客户 u（站点 u+1）时的最早离开时刻。
    # 存的是"送达时刻"（早到已等到 lo），它是后续所有转移的唯一时间基准。
    dp = [[INF] * nc for _ in range(1 << nc)]

    # 起点：时刻 0 从仓站出发，直接驶向第一个客户
    for v in range(nc):
        t = max(dur[0][v + 1], lo[v + 1])
        if t <= hi[v + 1]:
            dp[1 << v][v] = t

    for mask in range(1 << nc):
        row = dp[mask]
        for u in range(nc):
            t0 = row[u]
            if t0 >= INF:
                continue
            # 枚举还没送的客户 v（取 mask 的补集里逐个低位）
            rest = full ^ mask
            while rest:
                bit = rest & (-rest)
                rest ^= bit
                v = bit.bit_length() - 1
                t = max(t0 + dur[u + 1][v + 1], lo[v + 1])
                if t <= hi[v + 1] and t < dp[mask | bit][v]:
                    dp[mask | bit][v] = t

    # 回到仓站：回程时刻同样要落在仓站窗口 [lo[0], hi[0]] 内
    ans = INF
    for u in range(nc):
        if dp[full][u] < INF:
            back = max(dp[full][u] + dur[u + 1][0], lo[0])
            if back <= hi[0] and back < ans:
                ans = back

    sys.stdout.write(str(ans if ans < INF else -1) + "\n")


def run_tests():
    """运行嵌入的官方样例与补充用例，方便本地自测。"""
    test_cases = [
        # 官方样例 1：最优 0->1->2->3->0，含两次等待，回程 36
        (
            "4\n0 1440\n6 18\n20 45\n14 28\n0 4 18 8\n6 0 9 20\n10 12 0 7\n9 16 11 0\n",
            "36",
        ),
        # 官方样例 2：客户互走 10 分钟必超窗，所有排列都不可行
        (
            "4\n0 1440\n5 12\n5 12\n5 12\n0 4 4 4\n4 0 10 10\n4 10 0 10\n4 10 10 0\n",
            "-1",
        ),
        # 最小规模 m=2：单客户送达后立即返回
        (
            "2\n0 1440\n3 9\n0 5\n5 0\n",
            "10",
        ),
        # 等候算进总时长：到得早必须停到 lo
        (
            "2\n0 1440\n5 10\n2 3\n3 2\n",
            "8",
        ),
        # 送达没问题但回到仓站超出仓站窗口上界 1440 -> 无可行走法
        (
            "2\n0 1440\n0 1440\n0 200\n1400 0\n",
            "-1",
        ),
        # 正反向耗时不同：0->1->2->0（6 分钟）远优于 0->2->1->0（27 分钟）
        (
            "3\n0 1440\n0 1440\n0 1440\n0 2 9\n9 0 2\n2 9 0\n",
            "6",
        ),
        # 时间窗把顺序卡死：先送窗口早关的客户 1，再等客户 2 的窗口开启
        (
            "3\n0 1440\n0 6\n10 30\n0 1 5\n1 0 2\n5 2 0\n",
            "15",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io_text(inp)
        sys.stdout = io_string()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机小规模对拍：状压 DP 结果必须与全排列暴力一致
    import random
    from itertools import permutations

    rng = random.Random(20260918)
    for case in range(60):
        m = rng.randint(2, 8)
        lo = [0] + [rng.randint(0, 30) for _ in range(m - 1)]
        hi = [1440] + [lo[k] + rng.randint(0, 40) for k in range(1, m)]
        dur = [[0] * m for _ in range(m)]
        for a in range(m):
            for b in range(m):
                if a != b:
                    dur[a][b] = rng.randint(1, 7)

        def brute():
            best = INF
            for perm in permutations(range(1, m)):
                t = 0
                prev = 0
                ok = True
                for v in perm:
                    t = max(t + dur[prev][v], lo[v])
                    if t > hi[v]:
                        ok = False
                        break
                    prev = v
                if ok:
                    back = max(t + dur[prev][0], lo[0])
                    if back <= hi[0]:
                        best = min(best, back)
            return -1 if best >= INF else best

        def fast(lo, hi, dur, m):
            nc = m - 1
            full = (1 << nc) - 1
            dp = [[INF] * nc for _ in range(1 << nc)]
            for v in range(nc):
                t = max(dur[0][v + 1], lo[v + 1])
                if t <= hi[v + 1]:
                    dp[1 << v][v] = t
            for mask in range(1 << nc):
                row = dp[mask]
                for u in range(nc):
                    t0 = row[u]
                    if t0 >= INF:
                        continue
                    rest = full ^ mask
                    while rest:
                        bit = rest & (-rest)
                        rest ^= bit
                        v = bit.bit_length() - 1
                        t = max(t0 + dur[u + 1][v + 1], lo[v + 1])
                        if t <= hi[v + 1] and t < dp[mask | bit][v]:
                            dp[mask | bit][v] = t
            ans = INF
            for u in range(nc):
                if dp[full][u] < INF:
                    back = max(dp[full][u] + dur[u + 1][0], lo[0])
                    if back <= hi[0]:
                        ans = min(ans, back)
            return -1 if ans >= INF else ans

        got = fast(lo, hi, dur, m)
        want = brute()
        if got != want:
            print(f"对拍失败 case {case}: 期望={want}, 实际={got}")
            print(f"m={m}\nlo/hi={list(zip(lo, hi))}")
            for r in dur:
                print(r)
            return
    print("对拍: 60 组随机用例与全排列暴力一致 ✓")


def io_text(s):
    import io

    return io.TextIOWrapper(io.BytesIO(s.encode("utf-8")))


def io_string():
    import io

    return io.StringIO()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
