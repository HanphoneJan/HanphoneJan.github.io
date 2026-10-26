"""
P4676. 守望塔对 - 单调栈找支配区间 + 离线值域树状数组

题面要点：塔高 h_1..h_n（每座 ≥ 1）。塔对 (i, j)（i < j）可以互相通信
当且仅当 h_i + h_j > max(h_i..h_j)。n ≤ 1e5，统计这样的塔对数量。

输入：第一行 n，第二行 n 个高度。
输出：一个整数。

核心思路：
1. 每座塔高 ≥ 1，h_i + h_j 恒大于 h_i 与 h_j，所以「不能通信」当且仅当
   开区间 (i, j) 内存在高度 ≥ h_i + h_j 的塔——这样的塔必然比两端都高。
2. 给每个无效对 (i, j) 唯一归因：m = 该区间最大值的最左出现位置。
   记 L_m = m 左侧最近的高度 ≥ h_m 的塔位（没有记为 −1），
      R_m = m 右侧最近的高度 >  h_m 的塔位（没有记为 n），
   则「m 是 (i, j) 的最左最大值」恰好等价于 i ∈ (L_m, m) 且 j ∈ (m, R_m)；
   这时该对无效 ⟺ h_i + h_j ≤ h_m。左侧用 ≥、右侧用 > 的邻界取法让等高的
   塔互为边界，保证归因既不重复也不遗漏（等高塔出现在 (m, R_m) 内不会
   抢走 m 的最左最大地位，也不会双计）。
   于是：无效对总数 = Σ_m #{i ∈ (L_m, m), j ∈ (m, R_m) : h_i + h_j ≤ h_m}。
3. 每个塔只对「较小 gap」逐值枚举：枚举 v 的一次贡献是
   「位置 > X 且高度 ≤ h_m − v 的塔数」的窗口差（一个后缀减另一个后缀）。
4. 所有查询离线批量回答：按位置阈值降序排序指针从右往左把塔逐座激活，
   用高度离散值作坐标的树状数组做前缀计数。归因唯一的性质保证每个无效对
   恰好被统计一次，总方案 = 全部塔对数 − 无效对数。

时间复杂度：O((n + Q) log maxH)，Q = Σ 每个塔上较小 gap 的大小
空间复杂度：O(n + Q)
"""

# https://codefun2000.com/p/P4676
import sys
from bisect import bisect_right

# @sample-start
"""
样例输入 1:
1
5

样例输出 1:
0
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2
1 2

样例输出 2:
1
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3
1 5 2

样例输出 3:
2
"""
# @sample-end

# @sample-start
"""
样例输入 4:
4
5 1 3 2

样例输出 4:
5
"""
# @sample-end


def _prefix(tree, r):
    """树状数组前缀和：坐标 ≤ r 的元素个数。"""
    s = 0
    while r > 0:
        s += tree[r]
        r -= r & -r
    return s


def answer_suffix_value_queries(n, h, queries):
    """求 Σ sign · #{p: 位置阈值 X < p, h_p ≤ T}。

    queries 是 (X, T, sign) 的列表，X ∈ [−1, n−1)。
    离线：按 X 降序处理；激活指针从最右塔往左走，位置过线即入树状数组，
    高度阈值 T 经离散坐标做前缀计数。
    """
    if not queries:
        return 0
    coords = sorted(set(h) | {t for _, t, _ in queries})
    size = len(coords)
    tree = [0] * (size + 1)
    rank_h = [bisect_right(coords, x) for x in h]

    order = sorted(queries, key=lambda q: -q[0])
    ptr = n - 1        # 下一个激活的塔位（0 起，从右往左）；已激活区间 = (ptr, n-1]
    total = 0
    for x, t, sign in order:
        while ptr > x:
            r = rank_h[ptr]
            while r <= size:
                tree[r] += 1
                r += r & -r
            ptr -= 1
        r = bisect_right(coords, t)
        s = 0
        while r > 0:
            s += tree[r]
            r -= r & -r
        total += sign * s
    return total


def count_pairs(h):
    """返回可以互相通信的塔对数量。h 为 0 起下标的塔高序列。"""
    n = len(h)
    if n < 2:
        return 0

    # L[m]：m 左侧最近的高度 >= h_m 的塔位（弱邻界），没有记为 −1
    # R[m]：m 右侧最近的高度 >  h_m 的塔位（严格邻界），没有记为 n
    L = [-1] * n
    R = [n] * n
    stack = []
    for i in range(n):
        while stack and h[stack[-1]] < h[i]:
            stack.pop()
        L[i] = stack[-1] if stack else -1
        stack.append(i)
    stack = []
    for i in range(n - 1, -1, -1):
        while stack and h[stack[-1]] <= h[i]:
            stack.pop()
        R[i] = stack[-1] if stack else n
        stack.append(i)

    queries = []
    add_q = queries.append
    for m in range(n):
        left_len = m - L[m] - 1
        right_len = R[m] - m - 1
        if left_len == 0 or right_len == 0:
            continue          # gap 空的一侧没有任何 i（或 j）可归因
        cap = h[m]
        rm = R[m]
        lm = L[m]
        if left_len <= right_len:
            # 枚举左 gap 的每个值：跨 gap 塔 = 位置 (m, R_m) 上的塔
            for i in range(lm + 1, m):
                t = cap - h[i]
                add_q((m, t, 1))          # p > m 且 h_p ≤ cap − v
                add_q((rm - 1, t, -1))    # 再去掉 p ≥ R_m 的部分
        else:
            # 枚举右 gap 的每个值：跨 gap 塔 = 位置 (L_m, m) 上的塔
            for j in range(m + 1, rm):
                t = cap - h[j]
                add_q((lm, t, 1))         # p > L_m 且 h_p ≤ cap − w
                add_q((m - 1, t, -1))     # 再去掉 p ≥ m 的部分

    invalid = answer_suffix_value_queries(n, h, queries)
    return n * (n - 1) // 2 - invalid


def solve():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    h = [int(x) for x in data[1:1 + n]]
    print(count_pairs(h))


def _brute(h):
    """O(n^2) 暴力计数，供对拍使用。"""
    n = len(h)
    cnt = 0
    for i in range(n):
        cur_max = h[i]
        for j in range(i + 1, n):
            if h[j] > cur_max:
                cur_max = h[j]
            if h[i] + h[j] > cur_max:
                cnt += 1
    return cnt


def run_tests():
    """官方样例 + 形状边界 + 随机暴力对拍 + 规模冒烟。"""
    import io
    import random
    import time

    test_cases = [
        # 官方样例 1：只有一座塔，没有塔对
        ("1\n5\n", "0"),
        # 官方样例 2：相邻两塔恒可通信
        ("2\n1 2\n", "1"),
        # 官方样例 3：隔山对 (1,3) 被内部最高塔 5 压死
        ("3\n1 5 2\n", "2"),
        # 官方样例 4：六对中只有 (2,4) 不通信
        ("4\n5 1 3 2\n", "5"),
        # 两座等高塔：和 > 最大值，通信
        ("2\n7 7\n", "1"),
        # 全等高：区间最大值就是端点值，全部通信
        ("5\n3 3 3 3 3\n", "10"),
        # 严格递增 / 递减：端点是最大值，全部通信
        ("5\n1 2 3 4 5\n", "10"),
        ("5\n5 4 3 2 1\n", "10"),
        # 高塔居中：自身参与的 4 对都通信，两侧小塔两两隔山不通信
        ("5\n1 1 100 1 1\n", "6"),
        # 全对可通信：谷底两小塔靠右端点当最大值
        ("4\n3 1 1 2\n", "6"),
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

    # 随机暴力对拍：小 n 多轮，覆盖低值域碰撞、两极分化、有序、全值域
    rng = random.Random(20260328)
    ok = True
    for case in range(600):
        n = rng.randint(1, 24)
        style = case % 4
        if style == 0:
            h = [rng.randint(1, 8) for _ in range(n)]           # 低值域重碰撞
        elif style == 1:
            h = [rng.choice([1, 100]) for _ in range(n)]        # 两极分化
        elif style == 2:
            h = sorted(rng.randint(1, 50) for _ in range(n))    # 升/降有序
            if rng.random() < 0.5:
                h.reverse()
        else:
            h = [rng.randint(1, 1000000) for _ in range(n)]     # 全值域
        got = count_pairs(h)
        want = _brute(h)
        if got != want:
            ok = False
            print(f"对拍失败: h={h} got={got} want={want}")
            break
    print(f"随机暴力对拍 600 组: {'✓' if ok else '✗'}")

    # 规模冒烟：n = 1e5 的多种形态，只计时不校验值
    for name, h in (
        ("随机", [rng.randint(1, 10**6) for _ in range(100000)]),
        ("严格递增", list(range(1, 100001))),
        ("锯齿交替", [(10**6 if k % 2 else rng.randint(1, 10**6))
                      for k in range(100000)]),
        ("阶梯塔", [x if k % 2 == 0 else 1 for k, x in
                    enumerate(rng.sample(range(1, 10**6), 50000) * 1)]),
        ("大平台", [1000] * 100000),
        ("双层峰", [(10**6 if k % 1000 == 500 else
                     max(10**6 - k // 500, 1)) for k in range(100000)]),
    ):
        t0 = time.time()
        cnt = count_pairs(h)
        print(f"冒烟 n=1e5 {name}: pairs={cnt} 用时 {time.time() - t0:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
