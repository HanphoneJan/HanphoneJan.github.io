"""
P5362. 转盘配色 - 环上最小相邻交换（目标枚举 + 中位数）

圆周上 2m 个卡槽各放一块色片，0 与 1 各 m 块；每次交换相邻两格
（含 0 号与 2m-1 号这对环形相邻），要求最终黑白严格交错，求最少交换次数。

输入格式：
- 第一行整数 m；
- 第二行长度 2m 的字符串 d，只含 0/1，两种字符各 m 个。

输出格式：
- 一个整数，最少相邻交换次数。

核心思路：相邻交换不改变同类色片的循环次序，因此第 i 个 0 最终必然落在
目标交错图案的「第 i 个 0 位」上。目标和它在环上的整体旋转合起来是
一个等差目标序列 start + 2i（start 取遍全体整数，偶数起点对应 0 落偶位、
奇数起点对应 0 落奇位）。把起点吃进差值：b_i = p_i - 2i，总代价为
sum |b_i - start|，对 start 的最优值就是 b 的（加权）中位数——绝对值
和的中位数定理在环情形通过 start 的整数范围自然成立。
答案 = sum |b_i - median(b)|。

复杂度：给 0 的下标列表排序 O(m log m)，求和 O(m)。
"""

# https://codefun2000.com/p/P5362
# @sample-start
"""
样例输入 1:
2
1100

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3
110100

样例输出 2:
1
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1
10

样例输出 3:
0
"""
# @sample-end

import sys


def min_swaps(m, colors):
    zero_pos = [i for i, ch in enumerate(colors) if ch == "0"]
    # 第 i 个零槽若与「start + 2i」这一目标对齐，代价项是
    # |zero_pos[i] - start - 2i| = |b_i - start|，start 取遍整数。
    bs = sorted(zero_pos[i] - 2 * i for i in range(m))
    median = bs[m // 2]
    return sum(abs(x - median) for x in bs)


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    m = int(data[0])
    colors = data[1].decode() if isinstance(data[1], bytes) else data[1]
    print(min_swaps(m, colors))


def run_tests():
    import io
    import random
    import time
    from collections import deque

    def run_case(inp):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        return output

    is_ring_alternating = lambda s: all(
        s[i] != s[(i + 1) % len(s)] for i in range(len(s))
    )

    def bfs_min_swaps(m, start):
        """小规模圈上 BFS：状态数为 C(2m, m)，给出精确答案。"""
        if is_ring_alternating(start):
            return 0
        n = 2 * m
        seen = {start}
        queue = deque([(start, 0)])
        while queue:
            state, dist = queue.popleft()
            chars = list(state)
            for i in range(n):
                j = (i + 1) % n
                if chars[i] == chars[j]:
                    continue
                chars[i], chars[j] = chars[j], chars[i]
                nxt = "".join(chars)
                if nxt not in seen:
                    if is_ring_alternating(nxt):
                        return dist + 1
                    seen.add(nxt)
                    queue.append((nxt, dist + 1))
                chars[i], chars[j] = chars[j], chars[i]
        return -1

    def brute_over_starts(m, colors):
        """直接对全部整数起点求最小 sum|b_i - start|，验证中位数取法。"""
        zero_pos = [i for i, ch in enumerate(colors) if ch == "0"]
        bs = [zero_pos[i] - 2 * i for i in range(m)]
        best = min(
            sum(abs(b - start) for b in bs)
            for start in range(-2 * m - 2, 2 * m + 3)
        )
        return best

    test_cases = [
        # 官方样例 1：交换中间相邻的 1 与 0
        ("2\n1100\n", "1"),
        # 官方样例 2：首尾两槽相邻，交换位置 0 与 5
        ("3\n110100\n", "1"),
        # 官方样例 3：本身已交错
        ("1\n10\n", "0"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {'通过' if output == expected else '失败'} {status}")
        assert output == expected, f"样例 {i} 期望 {expected}，实际 {output}"

    # 官方样例都很小，先用圈上 BFS 对拍模型：m=1..4 的全部合法字符串。
    from itertools import combinations

    model_cases = 0
    for m in range(1, 5):
        for zero_idx in combinations(range(2 * m), m):
            chars = ["1"] * (2 * m)
            for p in zero_idx:
                chars[p] = "0"
            line = "".join(chars)
            want = bfs_min_swaps(m, line)
            got = min_swaps(m, line)
            assert got == want, f"BFS 对拍失败 m={m} s={line}: 期望 {want}，实际 {got}"
            model_cases += 1
    print(f"对拍用例 {model_cases} 组（m=1..4 全字符串，圈上 BFS）：通过")

    # 中位数取法检验：随机中等规模字符串，与暴力扫描全部整数起点对照。
    rng = random.Random(20260905)
    scan_cases = 20
    for _ in range(scan_cases):
        m = rng.randint(2, 60)
        idx = rng.sample(range(2 * m), m)
        chars = ["0"] * (2 * m)
        for p in idx:
            chars[p] = "1"
        colors = "".join(chars)
        want = brute_over_starts(m, colors)
        got = min_swaps(m, colors)
        assert got == want, f"暴力对拍失败 m={m}: 期望 {want}，实际 {got}"
    print(f"对拍用例 {scan_cases} 组（随机 m<=60，按整数起点穷举）：通过")

    # 极端规模：m=200000，验证线性排序方案在时限内完成。
    m = 200000
    colors = "1" * m + "0" * m
    t0 = time.perf_counter()
    ans = run_case(f"{m}\n{colors}\n")
    elapsed = time.perf_counter() - t0
    assert int(ans) > 0
    print(f"压力用例 m={m}（先全 1 后全 0）：答案 {ans}，用时 {elapsed:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
