"""
P5434. 整除最少操作 - 有界枚举（终态拆解 + 双部分枚举）

两个正整数 n、m，每次操作把其中一个加一或减一（保持为正），求最少操作
次数使得最终的 n 整除 m（m % (改后 n) == 0）。

输入格式：
- 第一行组数 T；
- 接下来 T 行，每行两个正整数 n、m（1 <= n, m <= 1e6）。

输出格式：
- 每组一行，最少操作次数。

核心思路：设最终的 n 为 x（x>=1），最终的 m 为 x 的 k 倍（k>=1），
代价为 |x - n| + |k*x - m|。直接枚举 (x, k) 是乘积级的大数，必须先
缩范围。两个天然上界给出答案 U：
1. 把 n 改成 1：代价 n-1，任何 m 都被 1 整除；
2. 把 m 改成 n：代价 |m-n|（k=1，x=n）。
设 S 满足 S^2 > 1e6 + U_max。U_max <= m + |m-n| <= 2e6 - 1，取
S = 1500（S^2 = 2250000）即封顶。若 x > S 且 kx > S^2*... 若 x > S 且
k > S，则 k*x > S^2 > m + U，与 x*k <= m + U 矛盾（k*x 超出上界的
方案不可能优于初始上界，随后剪枝也不会选中它）。所以最优 x 与 k
至少有一个不超过 S，分两个部分枚举：
- 部分 1（x <= S）：对每个 x，m 就近写成正倍数，代价 |x-n| +
  min(m%x, x - m%x)（x > m 时只有 x 本身这个倍数可选）；
- 部分 2（k <= S）：固定 k 后 |x-n| + |k*x-m| 是关于 x 的凸折线，
  最小值只可能落在断点 x = n 或 x = m/k 附近，取整数候选
  {m//k, m//k+1, n} 三个点求值即可。

复杂度：每组 O(S) 次转移（S=1500），T 组总量 O(T*S)。
"""

# https://codefun2000.com/p/P5434
# @sample-start
"""
样例输入 1:
4
4 15
11 25
7 7
10 7

样例输出 1:
1
2
0
3
"""
# @sample-end

import sys

S = 1500  # S^2 = 2250000 > 2e6 - 1 = max(m) + max(U)，双部分枚举的分界


def best_ops(n, m):
    # 初始上界：m 改成 n（k=1），或 n 改成 1
    best = abs(m - n)
    if n - 1 < best:
        best = n - 1
    if best == 0:
        return 0

    # 部分 1：终态 x 取小值（x = 1..S），m 就近写成 x 的倍数
    for x in range(1, S + 1):
        if x > n and x - n >= best:
            break  # x 再大，光改 n 的代价就已不低于当前答案
        k, r = divmod(m, x)
        if k == 0:
            d = x - m  # 倍数只剩下 x 本身（k=1）
        else:
            d = r if r <= x - r else x - r
        cost = abs(x - n) + d
        if cost < best:
            best = cost

    # 部分 2：倍数系数 k 取小值（k = 1..S），终态 x 被 |x-n|+|k*x-m| 决定，
    # 凸性保证最小值在 x=n 或 x=m/k 的整数邻点处取到
    for k in range(1, S + 1):
        fl = m // k
        for x in (fl, fl + 1, n):
            if x < 1:
                continue
            cost = abs(x - n) + abs(k * x - m)
            if cost < best:
                best = cost
    return best


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    t = int(next(it))
    out = []
    for _ in range(t):
        n = int(next(it))
        m = int(next(it))
        out.append(str(best_ops(n, m)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    import io
    import random
    import time

    def run_case(inp):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        return "\n".join(output.split("\n"))

    def brute(n, m):
        """小值域精确参照：在 [1, 60]^2 的状态图上 BFS，逐状态判整除。"""
        from collections import deque

        cap = 60
        dist = [[-1] * (cap + 1) for _ in range(cap + 1)]
        dist[n][m] = 0
        queue = deque([(n, m)])
        while queue:
            a, b = queue.popleft()
            if b % a == 0:
                return dist[a][b]
            for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                na, nb = a + da, b + db
                if 1 <= na <= cap and 1 <= nb <= cap and dist[na][nb] == -1:
                    dist[na][nb] = dist[a][b] + 1
                    queue.append((na, nb))
        return None

    test_cases = [
        # 官方样例（4 组一次读入）
        ("4\n4 15\n11 25\n7 7\n10 7\n", "1\n2\n0\n3"),
        # 官方说明逐组拆出来的等价单组：11 -> 12、25 -> 24
        ("1\n11 25\n", "2"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {'通过' if output == expected else '失败'} {status}")
        assert output == expected, f"样例 {i} 期望 {expected}，实际 {output}"

    # 官方只有 1 组样例，先做小值域全对拍（n、m<=40，与右侧 DP/BFS 精确对照）。
    pairs = [(n, m) for n in range(1, 13) for m in range(1, 13)]
    lines = "\n".join(f"{n} {m}" for n, m in pairs)
    outs = run_case(f"{len(pairs)}\n{lines}\n").strip().split("\n")
    for (n, m), line in zip(pairs, outs):
        want = brute(n, m)
        assert want is not None
        assert int(line) == want, f"对拍失败 n={n} m={m}: 期望 {want}，实际 {line}"
    print(f"对拍用例 {len(pairs)} 组（n,m<=12 全枚举）：通过")

    # 随机大值对拍：与「枚举 x 的全部邻近倍数」的更宽暴力对照（复杂版本）。
    rng = random.Random(20260912)
    rand_pairs = []
    for _ in range(60):
        n = rng.randint(1, 1000000)
        m = rng.randint(1, 1000000)
        rand_pairs.append((n, m))
    lines = "\n".join(f"{n} {m}" for n, m in rand_pairs)
    outs = run_case(f"{len(rand_pairs)}\n{lines}\n").strip().split("\n")

    def wide_brute(n, m):
        """宽松枚举（必须覆盖上面的两部分）：x 与 k 的范围都放大到 2200，
        再各补一个邻域，输出只会不高于两次部分枚举的结果。"""
        best = min(n - 1, abs(n - m))
        for x in range(1, 2201):
            k, r = divmod(m, x)
            d = x - m if k == 0 else (r if r <= x - r else x - r)
            best = min(best, abs(x - n) + d)
        for k in range(1, 2201):
            fl = m // k
            for x in (fl, fl + 1, fl + 2, n - 2, n - 1, n, n + 1, n + 2):
                if x >= 1:
                    best = min(best, abs(x - n) + abs(k * x - m))
        return best

    for (n, m), line in zip(rand_pairs, outs):
        want = wide_brute(n, m)
        assert int(line) == want, f"随机对拍失败 n={n} m={m}: 期望 {want}，实际 {line}"
    print(f"对拍用例 {len(rand_pairs)} 组（随机大值，宽邻域枚举）：通过")

    # 边界用例：n=1 整除一切；n=m 零次；m 是 n 倍数零次。
    edges = [(1, 1000000), (999999, 999999), (500000, 1000000), (2, 999999)]
    lines = "\n".join(f"{n} {m}" for n, m in edges)
    outs = [int(x) for x in run_case(f"{len(edges)}\n{lines}\n").strip().split("\n")]
    assert outs == [0, 0, 0, 1], f"边界用例异常: {outs}"
    print(f"边界用例 {(1, 1000000)}, {(999999, 999999)}, {(500000, 1000000)}, {(2, 999999)}: 通过")

    # 性能上限：一组 (1e6 - 素数附近对)，验证两次部分枚举在最坏主界内时限完成。
    t0 = time.perf_counter()
    rng2 = random.Random(1)
    worst = []
    for _ in range(500):
        worst.append((rng2.randint(990000, 1000000), rng2.randint(990000, 1000000)))
    lines = "\n".join(f"{n} {m}" for n, m in worst)
    run_case(f"{len(worst)}\n{lines}\n")
    elapsed = time.perf_counter() - t0
    print(f"压力用例 500 组 (n,m~1e6)：用时 {elapsed:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
