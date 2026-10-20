"""
P5468. 流水线并行的最小峰值负载 - 二分答案 + 贪心校验

把神经网络的 N 层按原顺序切成 K 段（每段叫一个 Stage），每段内的层编号必须连续、
每个 Stage 至少包含一层、每一层恰好属于一个 Stage。Stage 的负载是它包含的各层
前向时间之和，流水线的速度由最慢的 Stage 决定，因此要最小化「各 Stage 负载的最大值」。

输入格式：
- 第 1 行：两个整数 N、K，分别表示层数和 Stage 个数；
- 第 2 行：N 个整数 f[0..N-1]，表示每层的前向时间。

输出格式：
- 一行一个整数，即最小化后的最大 Stage 负载。

核心思路：
1. 这是典型的「最小化最大值」问题，答案一定落在 [max(f), sum(f)] 这个区间里，
   并且「上限为 cap 时能否切成不超过 K 段」这个判定关于 cap 单调：
   cap 变大只会让切分更容易，所以可以对答案二分。
2. 判定函数用贪心：从左往右把层往当前 Stage 里塞，塞不下（会超过 cap）就切一刀。
   因为每一层都是正数，「每段都装到装不下为止」得到的段数是 cap 下所需的最少段数。
3. 若最少段数 <= K，就说明 cap 可行：段数不够时，把任意一个含两层以上的 Stage
   再切开即可增加段数（K <= N 保证总能切到 K 段）。
4. 二分最后一个可行的 cap 就是答案。

时间复杂度：O(N * log(sum(f)))，二分约 log2(5e6) ≈ 23 轮，每轮扫一遍 N 层。
空间复杂度：O(N)，用于保存各层时间。
"""

import sys

# @sample-start
"""
样例输入 1:
7 3
4 6 3 8 2 5 4

样例输出 1:
11
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4 2
2 8 3 5

样例输出 2:
10
"""
# @sample-end


def segments_needed(loads, cap):
    """在每段负载不超过 cap 的前提下，返回最少需要切成多少段。"""
    segments = 1          # 至少有一段，第一段从第 0 层开始
    current = 0           # 当前这一段的负载
    for f in loads:
        if current + f <= cap:
            # 还装得下就继续装：尽量少切，才能判断 cap 是否足够大
            current += f
        else:
            # 装不下了，必须从当前层开始新的一段
            segments += 1
            current = f
    return segments


def min_peak_load(loads, k):
    """二分最小的可行上限 cap，使得数组能切成不超过 k 段连续子数组。"""
    # 下界取单层最大值：任何一层都无法被拆开，所以 cap 不可能小于它。
    # 上界取总和：整段作为一段时负载就是总和，一定可行。
    low = max(loads)
    high = sum(loads)

    while low < high:
        mid = (low + high) // 2
        # 段数 <= k 说明 mid 够用，答案在左半边（含 mid）。
        # 段数 > k 说明 mid 太小，答案一定在 mid 右侧。
        if segments_needed(loads, mid) <= k:
            high = mid
        else:
            low = mid + 1

    return low


def solve():
    """读取输入并输出最小化的最大 Stage 负载。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    n = int(data[0])
    k = int(data[1])
    # 后面正好是 n 个层耗时；用切片一次取出，避免逐行读取的解析开销。
    loads = [int(x) for x in data[2:2 + n]]

    print(min_peak_load(loads, k))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：最优切分 [4,6] [3,8] [2,5,4]
        (
            "7 3\n4 6 3 8 2 5 4\n",
            "11",
        ),
        # 官方样例 2：最优切分 [2,8] [3,5]
        (
            "4 2\n2 8 3 5\n",
            "10",
        ),
        # 只有一个 Stage：整个序列必须连在一起，答案就是总和
        (
            "3 1\n1 2 3\n",
            "6",
        ),
        # Stage 数与层数相同：每层单独一段，答案就是最大的那一层
        (
            "3 3\n5 1 5\n",
            "5",
        ),
        # 只有一层
        (
            "1 1\n1000\n",
            "1000",
        ),
        # 全部相等：6 层切成 3 段，每段 2 层，峰值 4
        (
            "6 3\n2 2 2 2 2 2\n",
            "4",
        ),
        # 中间有个大层：它必须和左边的 1 绑在一段，答案是 1 + 100
        (
            "5 2\n1 100 1 1 1\n",
            "101",
        ),
        # 大层在末尾：切成 [1,1,1,1] [1000]，峰值就是那个大层 1000
        (
            "5 2\n1 1 1 1 1000\n",
            "1000",
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
