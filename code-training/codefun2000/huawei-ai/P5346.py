"""
P5346. 双配置训练任务的最优资源调度 - 带两个目标的一维 DP

有 n 个任务，每个任务必须且只能从两套配置中选一套。第 i 个任务的配置有
(资源消耗, 训练耗时) 两组数：配置 1 是 (c1, t1)，配置 2 是 (c2, t2)。
要求所有任务的资源消耗之和不超过 C，在这个前提下：
1. 先最小化总训练耗时；
2. 总耗时相同时，再最小化实际使用的资源量。

输入格式：
- 第 1 行：两个整数 n、C；
- 接下来 n 行：每行四个正整数 c1、t1、c2、t2。

输出格式：
- 一行三个整数：最小总耗时、该方案实际消耗的资源、剩余资源 C - 实际消耗。

核心思路：
1. 每个任务恰好选一次，这就是“分组背包”：每组只有两件物品，必须选一件。
2. 令 dp[r] = 资源恰好用掉 r 时，能达到的最小“编码分数”，
   编码方式为 score = 总耗时 * BIG + 实际资源，BIG = C + 1。
   因为实际资源 <= C < BIG，分数的小数部分就是资源，整数部分就是耗时，
   所以“分数最小”等于“先比耗时、再比资源”，两级目标一次比较搞定。
3. 逐任务推进：新状态只能从上一个任务处理完的状态转移过来，
   所以每轮都用一张新表，天然保证每个任务只被选一次。
4. 答案取 min(dp[0..C])，再按 BIG 反解出耗时与资源。

时间复杂度：O(n * C * 2)
空间复杂度：O(C)
"""

# https://codefun2000.com/p/P5346
import sys

# @sample-start
"""
样例输入 1:
3 10
4 5 2 3
3 4 5 2
1 2 2 2

样例输出 1:
7 8 2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1 1
1 5 2 3

样例输出 2:
5 1 0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
2 5
3 4 2 6
2 5 4 1

样例输出 3:
9 5 0
"""
# @sample-end

# @sample-start
"""
样例输入 4:
3 1000
10 20 5 25
3 15 4 15
6 7 2 12

样例输出 4:
42 19 981
"""
# @sample-end


def solve():
    """读取任务与资源上限，输出最小耗时、实际资源消耗与剩余资源。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    capacity = int(next(it))

    # BIG 要比任何可能的资源消耗都大，这样 score 的“高位”才是耗时，
    # “低位”才是资源，反解时用整除和取余就能拆开，不会互相进位。
    big = capacity + 1

    # dp[r] = 恰好用掉 r 点资源时的最小编码分数，None 表示该资源量不可达。
    # 用 big 倍而不是无穷大，是为了让“耗时相同、资源更少”自动胜出。
    inf = None
    dp = [inf] * (capacity + 1)
    dp[0] = 0  # 一个任务都不选时，资源为 0、耗时为 0

    for _ in range(n):
        c1 = int(next(it))
        t1 = int(next(it))
        c2 = int(next(it))
        t2 = int(next(it))

        # 每轮用一张新表：第 i 个任务只能从“处理完前 i-1 个任务”的状态
        # 转移一次。倒序枚举也能达到同样的效果，但新开一张表让
        # “每组只选一次”成为结构上的保证，不再依赖枚举方向这种易错细节。
        next_dp = [inf] * (capacity + 1)

        for used in range(capacity + 1):
            base = dp[used]
            if base is None:
                continue  # 这个资源量凑不出来，跳过

            # 枚举这一组的两个物品：配置 1 与配置 2，各试一次。
            for cost, time in ((c1, t1), (c2, t2)):
                new_used = used + cost
                if new_used > capacity:
                    continue  # 超出资源上限，这个选择非法

                # 编码分数：耗时放在高位，资源放在低位。
                # 于是“耗时小”优先，“耗时相同再资源少”自动成为次级比较。
                candidate = base + time * big + cost
                if next_dp[new_used] is None or candidate < next_dp[new_used]:
                    next_dp[new_used] = candidate

        dp = next_dp

    # 资源上限是“不超过 C”，所以在所有恰好用掉 r <= C 的方案里挑分数最小的。
    best = None
    for used in range(capacity + 1):
        if dp[used] is not None and (best is None or dp[used] < best):
            best = dp[used]

    if best is None:
        # 题目保证至少存在一种合法选择（每个任务都有一组配置装得下）。
        # 这里输出 -1 只是防御性处理，避免对不存在的方案算出一个假答案。
        print(-1)
        return

    # 反解：score = 耗时 * big + 资源，且资源 <= C < big
    total_time = best // big
    total_cost = best % big
    print(total_time, total_cost, capacity - total_cost)


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "3 10\n4 5 2 3\n3 4 5 2\n1 2 2 2\n",
            "7 8 2",
        ),
        # 官方样例 2：只有配置 1 装得下
        (
            "1 1\n1 5 2 3\n",
            "5 1 0",
        ),
        # 官方样例 3：耗时优先于资源
        (
            "2 5\n3 4 2 6\n2 5 4 1\n",
            "9 5 0",
        ),
        # 官方样例 4：资源充裕，各任务独立选耗时最小的配置
        (
            "3 1000\n10 20 5 25\n3 15 4 15\n6 7 2 12\n",
            "42 19 981",
        ),
        # 单个任务、两套配置都装得下：选耗时更小的那一套
        (
            "1 100\n50 30 40 20\n",
            "20 40 60",
        ),
        # 总耗时相同，必须选资源更少的方案
        (
            "2 10\n3 5 4 5\n2 7 5 7\n",
            "12 5 5",
        ),
        # 资源刚好用满
        (
            "2 5\n3 2 4 9\n2 3 1 8\n",
            "5 5 0",
        ),
        # 每个任务都被资源上限逼到唯一配置
        (
            "3 6\n1 5 10 9\n1 5 10 9\n1 5 10 9\n",
            "15 3 3",
        ),
        # 所有配置都超过上限：不存在合法方案（防御性输出 -1）
        (
            "1 1\n2 3 4 5\n",
            "-1",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读数据，所以要给带 buffer 的文本流
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
