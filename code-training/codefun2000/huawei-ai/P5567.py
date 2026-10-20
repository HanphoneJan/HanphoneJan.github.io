"""
P5567. 激活检查点放置 - 区间代价 + 分段动态规划

模型共 N 层，前向顺序执行。可以在中间层 c（1 <= c <= N-1）打 Checkpoint，
在第 c 层打点会占用 memory[c-1] 的额外显存，所有 Checkpoint 的显存之和
不得超过 MaxMem。第 0 层是天然起点、第 N 层是天然终点，都不占显存。

相邻两个 Checkpoint c < d 之间的重计算代价为
    Cost(c, d) = sum_{k=c+1}^{d-1} forward_time[k-1] * (d - k)
即夹在中间的每一层都要被重复前向计算若干次：层 d-1 算 1 次，层 d-2 算 2 次……

输入格式：
- 第 1 行：两个整数 N、MaxMem；
- 第 2 行：N 个正整数，第 i 个是第 i 层的 forward_time；
- 第 3 行：N 个正整数，第 i 个是第 i 层的 memory。

输出格式：
- 一行一个整数：在显存预算内可达到的最小总重计算代价。

核心思路：
1. 把「选 Checkpoint」看成「把 0..N 切成若干段」：每个 Checkpoint 就是切点，
   段 (c, d) 的代价只与端点有关，可以在 O(N^2) 内全部预处理出来。
2. 段代价用递推 + 前缀和做到 O(1)：
       cost[c][d] = cost[c][d-1] + (prefix[d-1] - prefix[c])
   其中 prefix[t] = forward_time[0] + ... + forward_time[t-1]。
3. 记 dp[i][w] 为「第 i 层被打成 Checkpoint、已花掉 w 显存」时，
   0..i 这一段的最小代价，则
       dp[i][w] = min_{j < i} dp[j][w - memory[i-1]] + cost[j][i]
4. 答案 = min_{j < N, w <= MaxMem} dp[j][w] + cost[j][N]（终点 N 不占显存）。

时间复杂度：O(N^2 * MaxMem)
空间复杂度：O(N * MaxMem + N^2)
"""

# https://codefun2000.com/p/P5567
import sys

# @sample-start
"""
样例输入 1:
5 3
5 10 5 10 20
1 2 1 3 1

样例输出 1:
15
"""
# @sample-end


def build_costs(forward_time):
    """预处理任意两个 Checkpoint 之间的重计算代价。

    返回 cost，其中 cost[c][d]（0 <= c < d <= N）表示从 c 直接跳到 d 的代价。
    """
    n = len(forward_time)

    # prefix[t] = forward_time[0] + ... + forward_time[t-1]
    # 注意下标含义：第 k 层（1 起编号）的耗时是 forward_time[k-1]，
    # 所以「第 c+1 层到第 d-1 层」的耗时之和是 prefix[d-1] - prefix[c]。
    prefix = [0] * (n + 1)
    for t in range(1, n + 1):
        prefix[t] = prefix[t - 1] + forward_time[t - 1]

    cost = [[0] * (n + 1) for _ in range(n)]

    # 递推关系：把区间右端点从 d-1 拉到 d，中间每一层都会多算一次，
    # 新增的那一次正好是「c+1 到 d-1 每一层各算一次」，也就是这段前缀和。
    for c in range(n):
        for d in range(c + 2, n + 1):
            cost[c][d] = cost[c][d - 1] + prefix[d - 1] - prefix[c]

    return cost


def solve():
    """读取输入并输出最小总重计算代价。"""
    # 一次性读入全部整数，避免逐行 input() 的开销，也不受行末空格影响。
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    max_mem = int(next(it))

    forward_time = [int(next(it)) for _ in range(n)]
    memory = [int(next(it)) for _ in range(n)]

    cost = build_costs(forward_time)

    INF = float("inf")

    # dp[i][w]：第 i 层作为 Checkpoint（i 从 0 开始，0 是天然起点）、
    # 且已占用 w 显存时，第 0 段到第 i 层的最小代价。
    # dp[0][0] = 0：起点不花显存，也不需要重计算。
    dp = [[INF] * (max_mem + 1) for _ in range(n)]
    dp[0][0] = 0

    for i in range(1, n):
        # 在第 i 层（层号 i，对应数组下标 i-1）打 Checkpoint 的显存开销。
        # 如果这一层本身就超预算，它不可能成为 Checkpoint，整行保持 INF。
        weight = memory[i - 1]
        if weight > max_mem:
            continue

        row = dp[i]
        for w in range(weight, max_mem + 1):
            best = INF
            # 枚举上一个 Checkpoint j，把 (j, i) 这一段接在后面。
            for j in range(i):
                prev = dp[j][w - weight]
                if prev == INF:
                    continue
                candidate = prev + cost[j][i]
                if candidate < best:
                    best = candidate
            row[w] = best

    # 收尾：最后一段从某个 Checkpoint j 直接走到终点 N。
    # 终点不占显存，所以任何 w <= max_mem 都合法。
    answer = INF
    for j in range(n):
        tail = cost[j][n]
        row = dp[j]
        for w in range(max_mem + 1):
            used = row[w]
            if used != INF and used + tail < answer:
                answer = used + tail

    print(answer)


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "5 3\n5 10 5 10 20\n1 2 1 3 1\n",
            "15",
        ),
        # 只有 1 层：没有中间层可以打 Checkpoint，起点直接连到终点
        (
            "1 0\n7\n3\n",
            "0",
        ),
        # 2 层、预算为 0：第 1 层打不了 Checkpoint，只能整段重算 1 次
        (
            "2 0\n10 20\n5 5\n",
            "10",
        ),
        # 2 层、预算够：在第 1 层打点，两段都是相邻 Checkpoint，代价 0
        (
            "2 3\n10 20\n3 5\n",
            "0",
        ),
        # 预算刚好等于第 1 层的显存，可以打点：剩下 (1,3) 段代价 10
        (
            "3 4\n5 10 5\n4 9 9\n",
            "10",
        ),
        # 预算不足任一中间层：只能选整段 (0,4)
        (
            "4 1\n1 1 1 1\n9 9 9 9\n",
            "6",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读取，因此这里要给带 buffer 的文本流。
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
