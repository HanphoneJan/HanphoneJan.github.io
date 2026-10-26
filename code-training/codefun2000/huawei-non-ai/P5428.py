"""
P5428. 作业限放接单 - 分层 DP + 单调队列滑动窗口最小值

题面要点：
- 作业队列 arr，从左到右逐个审阅，跑掉就把耗时累加，放掉不累加。
- 硬约束：连续放掉的作业个数 <= lim。
- 目标：恰好跑完 t 个作业，累加耗时最小。队列为空输出 0；
  无法恰好跑完 t 个输出 -1。

输入格式（三行，行数固定）：
- 第 1 行：数组 arr 的全部元素（0 <= len <= 1000），为空表示空队列；
- 第 2 行：整数 t（恰好要跑的作业数）；
- 第 3 行：整数 lim（连续放掉的上限）。

输出格式：最小累加耗时 / 0（空队列）/ -1（无解）。

核心思路：
1. 先把「连续放掉 <= lim」翻译成下标条件：接下的 t 项下标为
   p1 < p2 < ... < pt，被放掉的 n-t 项落在 t+1 个空隙里——队首 p1 个、
   相邻两接单项之间 p_{j+1}-p_j-1 个、队尾 n-1-p_t 个。于是合法解
   当且仅当 p1 <= lim、p_{j+1}-p_j <= lim+1、n-1-p_t <= lim；
   总空位数不够（n - t > (t+1)*lim）时直接无解，这是最快的 -1 判定。
2. 这是一个「段间间隔受限的隔项最小和」问题：min 转移叠加在更小的
   前缀上，逐层做没问题。dp[j][i] = 已接 j 项、最后一项下标为 i 的
   最小耗时，dp[j+1][nxt] = arr[nxt] + min(dp[j][i])，i 的窗口是
   [nxt-1-lim, nxt-1]——窗口随 nxt 单调右移，用单调队列维护最小值，
   总复杂度从 O(n*t*lim) 压到 O(n*t)。
3. t=0 单独处理：一项不接、整段放掉，n <= lim 才是 0 否则 -1；
   空队列直接给 0（t 约束下必为 0，n <= lim 自然成立）。

时间复杂度：O(n * t)（单调队列，每个下标至多进队、出队一次）
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P5428
import sys
from collections import deque

# @sample-start
"""
样例输入 1:
9 8 7 6 11 12 10
2
1

样例输出 1:
-1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
11 4 15 6 8
4
3

样例输出 2:
29
"""
# @sample-end

# @sample-start
"""
样例输入 3:
4 80 4 80 4 80 4
4
2

样例输出 3:
16
"""
# @sample-end

# @sample-start
"""
样例输入 4:

0
4

样例输出 4:
0
"""
# @sample-end


def solve():
    """读入 arr / t / lim，输出最小累加耗时。"""
    text = sys.stdin.read()
    lines = text.split("\n")

    # 第 1 行是数组；它可以是空行（样例 4 的空队列约定）。
    first = lines[0].strip() if lines else ""
    arr = [int(tok) for tok in first.split()] if first else []

    # 第 2、3 行是 t 与 lim；t、lim 各占一行，多余空行忽略。
    tail = [int(tok) for line in lines[1:] for tok in line.split()]
    t = tail[0] if len(tail) > 0 else 0
    lim = tail[1] if len(tail) > 1 else 0

    n = len(arr)
    if n == 0:
        # 空队列：按约定输出 0。
        print(0)
        return
    if t == 0:
        # 一项不接：整段队列全部连续放掉，n <= lim 才放得下。
        print(0 if n <= lim else -1)
        return
    if n < t or n - t > (t + 1) * lim:
        # 跑满了 n 项都不够 t；或被放掉的 n-t 项塞不进 t+1 个空隙。
        print(-1)
        return

    INF = float("inf")
    # 第 1 层：队首空隙是 p1 个被放掉的作业，p1 <= lim。
    dp = [arr[i] if i <= lim else INF for i in range(n)]

    # 逐层加接：dp[j][nxt] 依赖 dp[j-1][nxt-1-lim .. nxt-1] 的最小值。
    for _ in range(t - 1):
        ndp = [INF] * n
        window = deque()  # 存下标，对应 dp 值从小到大
        for nxt in range(n):
            i = nxt - 1  # 上一接单项最多是 nxt-1
            if i >= 0 and dp[i] != INF:
                while window and dp[window[-1]] >= dp[i]:
                    window.pop()
                window.append(i)
            # 上一项到当前项之间最多放 lim 个空位 → 下标差 <= lim+1。
            while window and window[0] < nxt - 1 - lim:
                window.popleft()
            if window:
                ndp[nxt] = arr[nxt] + dp[window[0]]
        dp = ndp

    # 队尾空隙 n-1-p_t <= lim：最后一项至少是 n-1-lim。
    start = max(0, n - 1 - lim)
    candidates = [dp[i] for i in range(start, n) if dp[i] != INF]
    print(min(candidates) if candidates else -1)


def run_tests():
    """运行嵌入的官方样例与自加用例，方便本地自测。"""
    import io
    import random

    def run(stdin_text):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.StringIO(stdin_text)
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    test_cases = [
        # 官方样例 1：7 项里只跑 2 项、lim=1，空隙总数塞不下
        ("9 8 7 6 11 12 10\n2\n1\n", "-1"),
        # 官方样例 2：把 15 放掉，其余全跑
        ("11 4 15 6 8\n4\n3\n", "29"),
        # 官方样例 3：三个 80 各自单独放掉
        ("4 80 4 80 4 80 4\n4\n2\n", "16"),
        # 官方样例 4：空队列直接 0
        ("\n0\n4\n", "0"),
        # t=0：全放掉，n <= lim 才合法
        ("1 2\n0\n2\n", "0"),
        ("1 2 3\n0\n2\n", "-1"),
        # n= t：全接没有任何放掉的段，lim 再小也合法
        ("5\n1\n0\n", "5"),
        # 空隙正好顶着 lim：跳 1 个（lim=1），间隔 2 项合法
        ("1 9 1\n2\n1\n", "2"),
        # lim=0 时跳任何一项都非法：n=3、t=2 必须恰好空 1 格
        ("1 9 1\n2\n0\n", "-1"),
        # 同一轮里 cheaper 的方案胜：只跳 80，不跳 4
        ("80 4\n1\n1\n", "4"),
    ]

    failures = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run(inp)
        ok = output == expected
        if not ok:
            failures += 1
        print(f"样例 {i}: 期望={expected}, 实际={output} {'✓' if ok else '✗'}")

    # 随机对照：与 2^n 逐掩码枚举的暴力比对 400 组，覆盖 t=0、lim=0、
    # 大 lim、以及「 cheaper 靠后的项被安排上」这类边界。
    rng = random.Random(20260911)

    def brute(arr, t, lim):
        n = len(arr)
        if n == 0:
            return 0
        best = None
        for mask in range(1 << n):
            if bin(mask).count("1") != t:
                continue
            run_len = 0
            ok = True
            for i in range(n):
                if (mask >> i) & 1:
                    run_len = 0
                else:
                    run_len += 1
                    if run_len > lim:
                        ok = False
                        break
            if not ok:
                continue
            cost = sum(arr[i] for i in range(n) if (mask >> i) & 1)
            best = cost if best is None else min(best, cost)
        return -1 if best is None else best

    rand_bad = 0
    for _ in range(400):
        n = rng.randint(1, 11)
        arr = [rng.randint(1, 30) for _ in range(n)]
        t = rng.randint(0, n)
        lim = rng.randint(0, 5)
        expected = brute(arr, t, lim)
        output = run(" ".join(map(str, arr)) + f"\n{t}\n{lim}\n")
        if output != str(expected):
            rand_bad += 1
            print(f"随机对照失败: arr={arr} t={t} lim={lim} 期望={expected} 实际={output}")
    if rand_bad == 0:
        print("随机对照 400 组: 全部一致 ✓")
    failures += rand_bad

    # 极端规模：n=1000、t=500、lim=250（贴着无解边界），必须秒级返回
    import time

    rng.seed(42)
    big_arr = [rng.randint(1, 10000) for _ in range(1000)]
    inp = " ".join(map(str, big_arr)) + "\n500\n250\n"
    start = time.time()
    output = run(inp)
    cost = time.time() - start
    ok = output.lstrip("-").isdigit() and cost < 5
    if not ok:
        failures += 1
    print(f"规模 1000: 实际={output} 耗时 {cost:.2f}s {'✓' if ok else '✗'}")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
