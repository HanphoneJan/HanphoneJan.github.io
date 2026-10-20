"""
P5311. 双资源约束下的运维任务收益最大化 - 二维 0/1 背包

在华为的运维场景中，每个任务都会消耗一定的内存和算力，并带来一定的收益。
系统可用的内存上限为 A，算力上限为 B，每个任务最多执行一次。
要求选出若干任务，在不超过两种资源上限的前提下最大化总收益。

如果最大收益有多种方案，题目还要求：
1. 优先选择内存消耗更小的方案；
2. 如果内存消耗也相同，再选择算力消耗更小的方案。

输入格式：
- 第 1 行：三个整数 n、A、B，分别表示任务数、内存上限、算力上限；
- 接下来 n 行：每行三个正整数 x_i、y_i、w_i，分别表示第 i 个任务的内存消耗、
  算力消耗和收益。

输出格式：
- 一行三个整数：最大收益、对应的总内存消耗、对应的总算力消耗。

核心思路：
1. 把每个任务看成一个物品，它同时占用“内存”和“算力”两种容量，
   因此这是一个二维 0/1 背包问题。
2. 普通二维背包的 dp[a][b] 只记录最大收益，无法区分“收益相同但资源消耗不同”
   的方案。这里把三个目标编码进一个整数：
       score = 收益 * BIG - 内存 * SMALL - 算力
   只要 BIG 足够大，就能保证“收益优先”；SMALL 大于算力上限，就能保证
   “同收益下内存优先、再算力优先”。
3. 按 0/1 背包的方式倒序枚举两种容量，避免同一个任务被重复选择。
4. 最后从 score 反解出收益、内存和算力。

时间复杂度：O(n * A * B)
空间复杂度：O(A * B)
"""

# https://codefun2000.com/p/P5311
import sys

# @sample-start
"""
样例输入 1:
4 12 10
5 4 8
6 3 10
4 6 9
3 2 5

样例输出 1:
19 10 9
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 9 8
4 3 7
5 4 9
3 4 6

样例输出 2:
16 9 7
"""
# @sample-end


def solve():
    """读取输入并输出最大收益、总内存消耗、总算力消耗。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    max_memory = int(next(it))
    max_compute = int(next(it))

    # 两种资源的上限都不超过 500，二维 DP 的状态数是 (A + 1) * (B + 1)。
    # 这里把二维表压成一维数组，减少 Python 列表的寻址开销。
    width = max_compute + 1
    dp = [0] * ((max_memory + 1) * width)

    # 编码参数：
    # - small 必须严格大于“算力上限”，否则 (内存, 算力) 的进位会串位；
    # - big 必须严格大于“所有可能方案的最大惩罚值”，否则收益差 1 可能
    #   被资源差抵消。
    small = max_compute + 1
    big = max_memory * small + max_compute + 1

    for _ in range(n):
        memory = int(next(it))
        compute = int(next(it))
        profit = int(next(it))

        # 单个任务就超过任一上限时，它不可能被选中，直接跳过。
        if memory > max_memory or compute > max_compute:
            continue

        gain = profit * big - memory * small - compute

        # 0/1 背包：两种容量都必须倒序枚举，保证当前任务只被使用一次。
        for a in range(max_memory, memory - 1, -1):
            base = a * width
            prev_base = (a - memory) * width
            for b in range(max_compute, compute - 1, -1):
                candidate = dp[prev_base + b - compute] + gain
                index = base + b
                if candidate > dp[index]:
                    dp[index] = candidate

    best = dp[max_memory * width + max_compute]

    # score = profit * big - penalty，其中 0 <= penalty < big。
    # 因此向上取整即可还原 profit，再反推出 penalty。
    profit = (best + big - 1) // big
    penalty = profit * big - best
    memory_used = penalty // small
    compute_used = penalty % small

    print(profit, memory_used, compute_used)


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "4 12 10\n5 4 8\n6 3 10\n4 6 9\n3 2 5\n",
            "19 10 9",
        ),
        # 官方样例 2
        (
            "3 9 8\n4 3 7\n5 4 9\n3 4 6\n",
            "16 9 7",
        ),
        # 所有任务都超过容量：只能选择空集
        (
            "1 1 1\n2 2 5\n",
            "0 0 0",
        ),
        # 收益相同时，优先选择内存更小的方案
        (
            "2 10 10\n6 6 10\n5 5 10\n",
            "10 5 5",
        ),
        # 内存相同、收益相同时，再比较算力
        (
            "2 4 10\n4 6 10\n4 2 10\n",
            "10 4 2",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 使用 sys.stdin.buffer 做快速读取，所以这里要提供带 buffer
        # 的文本流，而不是普通的 io.StringIO。
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
