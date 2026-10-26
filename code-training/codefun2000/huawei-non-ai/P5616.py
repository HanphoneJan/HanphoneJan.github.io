"""
P5616. 旧街爆破预算 - 排序 + 区间线性 DP

一条坐标轴上有 P 间两两不同坐标的旧房，Q 种覆盖半径的爆破弹。
弹的落点必须挑在某一间旧房里，覆盖半径为 r 的一发清掉与落点间距
不超过 r 的所有旧房，付出的资源数目恰好等于 r。求把全部旧房清完
的最少总资源数。

输入格式：
- 第 1 行：P Q；
- 第 2 行：P 个两两不同的坐标 x_i；
- 第 3 行：Q 个两两不同的半径 r_i。

输出格式：
- 一个整数：最少付出的资源数目。

核心思路：
把旧房按坐标升序排好，一枚弹盖得住的旧房在排序后是连续下标段。
设 dp[k] 为「前 k 间（下标 0..k-1）已清完」的最少花费。轮到最左
还没清的第 i 间时，必须有一枚弹盖住它：落点取坐标不小于 x_i 的
第 j 间（落点更靠左的那发可被同半径落在 x_i 的弹完全替代，右端
覆盖只多不少），半径 r 不小于 x_j - x_i。这发弹向右一路盖到坐标
不超过 x_j + r 的最后一间，即用 dp[i] + r 推 dp[hi+1]。落点×半径
的右端覆盖可以按半径从大到小的单调性用双指针一次算好，主循环
自左向右松弛一遍。

时间复杂度：O(P * P * Q)，P ≤ 100、Q ≤ 10 时约 1e5 次转移
空间复杂度：O(P * Q)（落点×半径的覆盖右端点表）
"""

# https://codefun2000.com/p/P5616
import io
import sys

# @sample-start
"""
样例输入 1:
3 3
0 12 40
8 12 30

样例输出 1:
20
"""
# @sample-end

# @sample-start
"""
样例输入 2:
8 3
0 3 6 50 54 58 100 130
3 4 10

样例输出 2:
13
"""
# @sample-end


def min_cost(P, Q, xs, radii):
    """返回清完全部旧房的最少资源数；xs 升序，radii 在此升序处理。"""
    INF = float("inf")
    radii = sorted(radii)

    # reach[j][k]：以第 j 间为落点、半径 radii[k] 的弹能向右盖到的
    # 最大下标。对固定落点，半径越大右端越远，双指针单调推进。
    reach = []
    for j in range(P):
        row = []
        start = j
        for r in radii:
            limit = xs[j] + r
            while start + 1 < P and xs[start + 1] <= limit:
                start += 1
            row.append(start)
        reach.append(row)

    dp = [INF] * (P + 1)
    dp[0] = 0
    for i in range(P):
        base = dp[i]
        if base == INF:
            continue
        xi = xs[i]
        for j in range(i, P):
            need = xs[j] - xi  # 把第 i 间罩进来所需的最小半径
            row = reach[j]
            for k in range(Q):
                if radii[k] < need:
                    continue
                cost = base + radii[k]
                if cost < dp[row[k] + 1]:
                    dp[row[k] + 1] = cost
    return dp[P]


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    P, Q = int(data[0]), int(data[1])
    xs = sorted(int(x) for x in data[2:2 + P])
    radii = sorted(int(x) for x in data[2 + P:2 + P + Q])
    print(min_cost(P, Q, xs, radii))


def run_tests():
    """运行嵌入的官方样例与边界/随机对拍用例，方便本地自测。"""
    import random

    run_cases = [
        # 官方样例 1：半径 12 放坐标 0，半径 8 放坐标 40，合计 20
        ("3 3\n0 12 40\n8 12 30\n", "20"),
        # 官方样例 2：小团各自罩住，100 与 130 距离 30 只能各发一发
        ("8 3\n0 3 6 50 54 58 100 130\n3 4 10\n", "13"),
        # 单间旧房：最小半径的那一发足够，落点就是它自己
        ("1 3\n7\n100 5 9\n", "5"),
        # 两间相距 10、只有半径 5：谁也罩不住对方，只能各发一发
        ("2 1\n0 10\n5\n", "10"),
        # 两间相距 10、半径 10：一发罩住两端，落点任选其一
        ("2 1\n0 10\n10\n", "10"),
        # 小街全长 4：半径 3 放在中间那间上就能一发罩住全部
        ("5 2\n0 1 2 3 4\n100 3\n", "3"),
        # 半径大到正好卡住整条街：一发放中间的旧房上
        ("3 1\n0 50 100\n50\n", "50"),
    ]

    for i, (inp, expected) in enumerate(run_cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"用例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机对拍：与「枚举全部(落点,半径)区间 + 区间 DP」的独立实现比对
    random.seed(20261027)
    fails = 0
    for t in range(300):
        P = random.randint(1, 6)
        Q = random.randint(1, 3)
        xs = sorted(random.sample(range(0, 60), P))
        radii = random.sample(range(1, 40), Q)
        expect = interval_dp(P, Q, xs, radii)
        got = min_cost(P, Q, xs, radii)
        if got != expect:
            fails += 1
            print(f"对拍不一致: xs={xs} radii={radii} got={got} expect={expect}")
    print(f"随机对拍 300 组: {'全部一致 ✓' if fails == 0 else f'{fails} 组不一致 ✗'}")

    # 极端规模：P=100、Q=10、坐标与半径都顶到 1e9，验证限时内跑完
    big_xs = sorted(random.sample(range(0, 10**9), 100))
    big_radii = random.sample(range(1, 10**9), 10)
    import time

    start = time.time()
    answer = min_cost(100, 10, big_xs, sorted(big_radii))
    print(f"极端规模 P=100 Q=10: 最少资源数={answer}, 耗时 {time.time() - start:.2f}s")


def run_case(text):
    """把一段输入喂给 solve()，取回输出。"""
    old_stdin, old_stdout = sys.stdin, sys.stdout
    sys.stdin = io.TextIOWrapper(io.BytesIO(text.encode("utf-8")))
    sys.stdout = io.StringIO()
    try:
        solve()
        return sys.stdout.getvalue().strip()
    finally:
        sys.stdin, sys.stdout = old_stdin, old_stdout


def interval_dp(P, Q, xs, radii):
    """独立实现：暴力扫出每枚弹的覆盖区间 [L, R]，区间 DP 松弛。"""
    INF = float("inf")
    dp = [INF] * (P + 1)
    dp[0] = 0
    for j in range(P):
        for r in radii:
            lo, hi = j, j
            while lo > 0 and xs[lo - 1] >= xs[j] - r:
                lo -= 1
            while hi + 1 < P and xs[hi + 1] <= xs[j] + r:
                hi += 1
            dp2 = dp[:]
            # 这枚弹盖住的连续段是 [lo, hi]；把它接在任意
            # 「左边界已被清完」的状态后面
            for k in range(P, -1, -1):
                if dp[k] == INF:
                    continue
                if lo <= k <= hi + 1:
                    t = hi + 1
                    if dp[k] + r < dp2[t]:
                        dp2[t] = dp[k] + r
            dp = dp2
    return dp[P]


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
