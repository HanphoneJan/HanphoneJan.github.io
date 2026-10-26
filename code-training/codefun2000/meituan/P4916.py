"""
P4916. 最少生产批次 - 排序分段 DP（阈值变换 + 值域线段树）

n 个零件参数可以任意重排；批次数最少。每批 t 个零件允许的最大极差为
D + E*(t-1)，且每批至多 K 个。

核心思路：
1. 一个批次只关心它的最小值、最大值和零件个数，与中间零件无关；又因为
   可以任意重排，最优方案总可以调整为排序数组上的连续分段（若两批交叉，
   交换交叉的零件只会让两批的极差同时变小或不变）。
2. 排序后设 a[0..n-1]。批量 [i, j]（0 基、含端点）合法当且仅当
   length = j-i+1 <= K 且 a[j] - a[i] <= D + E*(j-i)。令 b[x] = a[x] - E*x，
   第二条变成 b[j] - b[i] <= D：
       a[j] - E*j <= a[i] - E*i + D
   极差约束被压成同一坐标系下两个标尺值之差，长度约束只是下标上下限。
3. 设 f[i] 为前 i 个零件（排序后）的最少批次数，f[0] = 0：
       f[i] = 1 + min{ f[j] : max(0, i-K) <= j <= i-1 且 b[j] >= b[i-1] - D }
   注意 f 不单调：E>0 时从批次尾部删件，极差变小但允许额度 D+E*(t-1) 也
   缩水，前缀可行性不保持（如 3,17,19,23,26 在 D=5,E=7,K=3 下 f[3]=1 而
   f[2]=2）。所以每一步都要在「滑动窗口 ∩ b 达标」这批下标里取真的最小值。
4. 窗口按位置 FIFO 过期（每步恰好过期一个 p = i-K-1），达标条件是对 b 值的
   下确界过滤。做法：把 b 压缩到值域，每格值域叶子挂一个按位置进队的单调
   队列（队头是叶内现行最小 f，过期即从队头弹出），值域线段树维护各叶子
   最小值；查询就是 b 值 >= 阈值那段后缀的最小值。每步 1 插入 + 1 过期 +
   1 查询，各 O(log n)。

输入格式：
- 第 1 行：T；
- 每组：第一行 n、D、E、K；第二行 n 个零件参数。

输出格式：
- 每组一行一个整数：最少批次数。

时间复杂度：单组 O(n log n)
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4916
import io
import sys
from bisect import bisect_left

INF = float("inf")


def min_batches(values, big_d, e, k):
    """排序后做分段 DP，返回最少批次数。"""
    values.sort()
    n = len(values)
    # b[x] = a[x] - E*x：把 "极差 <= D + E*(t-1)" 变成 "b[j] - b[i] <= D"
    b = [values[i] - e * i for i in range(n)]

    uniq = sorted(set(b))
    u = len(uniq)
    rank = {}
    for idx, val in enumerate(uniq):
        rank[val] = idx
    rk = [rank[x] for x in b]

    # 值域线段树：叶子 r 存「b 值恰好为 uniq[r] 且仍在窗口里的下标」的最小 f。
    size = 1
    while size < u:
        size <<= 1
    tree = [INF] * (2 * size)

    # 每个值域叶子一个单调队列：队列内 (下标, f) 按 f 从队头到队尾递增；
    # 插入时从队尾弹掉 f 更大（且更早过期）的元素，过期从队头弹出。
    queues = [None] * u
    heads = [0] * u

    def set_leaf(r, val):
        """更新值域叶子并向上维护最小值。"""
        pos = size + r
        if tree[pos] == val:
            return
        tree[pos] = val
        pos >>= 1
        while pos:
            new_min = tree[pos + pos]
            right = tree[pos + pos + 1]
            if right < new_min:
                new_min = right
            if tree[pos] == new_min:
                break
            tree[pos] = new_min
            pos >>= 1

    def insert(j, r, fv):
        """下标 j 进入窗口：挂到值域叶子 r 的单调队列。"""
        q = queues[r]
        if q is None:
            q = queues[r] = []
        while len(q) > heads[r] and q[-1][1] >= fv:
            q.pop()
        q.append((j, fv))
        set_leaf(r, q[heads[r]][1])

    def expire(j, step):
        """窗口左沿越过下标 j：回到值域叶子，弹出所有已过期队头。"""
        r = rk[j]
        q = queues[r]
        if q is None:
            return
        h = heads[r]
        deadline = j + k + 1
        # 队头按位置从早到晚，若它过期于当前 step 之前则弹出
        while len(q) > h and q[h][0] + k + 1 <= step:
            h += 1
        heads[r] = h
        if len(q) > h:
            set_leaf(r, q[h][1])
        else:
            # 该叶子现行下标全部出窗
            if tree[size + r] != INF:
                set_leaf(r, INF)

    def suffix_min(r):
        """b 值下标 >= r 的窗口内最小 f。"""
        res = INF
        lo = size + r
        hi = size + u - 1
        while lo < hi:
            if lo & 1:
                if tree[lo] < res:
                    res = tree[lo]
                lo += 1
            if hi & 1:
                hi -= 1
                if tree[hi] < res:
                    res = tree[hi]
            lo >>= 1
            hi >>= 1
        if lo == hi and tree[lo] < res:
            res = tree[lo]
        return res

    f = [0] * (n + 1)
    insert(0, rk[0], 0)  # 空前缀：整段作为最后一批，代价 0
    for i in range(1, n + 1):
        expired = i - k - 1
        if expired >= 0:
            expire(expired, i)
        threshold = b[i - 1] - big_d
        r = bisect_left(uniq, threshold)
        best = suffix_min(r)  # i-1 本身必达标，best 一定是有限值
        f[i] = best + 1
        if i < n:
            insert(i, rk[i], f[i])
    return f[n]


def solve():
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    t = int(next(it))
    out = []
    for _ in range(t):
        n = int(next(it))
        big_d = int(next(it))
        e = int(next(it))
        k = int(next(it))
        values = [int(next(it)) for _ in range(n)]
        out.append(str(min_batches(values, big_d, e, k)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的样例、边界用例，并用暴力区间 DP 对拍随机数据。"""
    import random

    test_cases = [
        # 官方样例 1：D=E=0 -> 每批必须全等，且每批至多 K=2 个
        ("1\n5 0 0 2\n1 1 2 2 2\n", "3"),
        # 官方样例 2：K=3 放不下 4 个，拆成 [10,12,15] 与 [20]
        ("1\n4 5 2 3\n10 12 15 20\n", "2"),
        # 官方样例 3：两段各 3 个
        ("1\n6 2 1 4\n3 5 6 10 12 13\n", "2"),
        # 官方样例 4：单零件必为一批
        ("1\n1 10 10 1\n100\n", "1"),
        # K=1：每批只能 1 个
        ("1\n3 5 5 1\n1 2 3\n", "3"),
        # E 很大：长批的极差额度随之变大，能一路合并
        ("1\n5 0 100 5\n1 100 200 300 400\n", "1"),
        # D > 极差且 K 够：全部一批
        ("1\n4 1000 0 4\n5 7 9 11\n", "1"),
        # 极差恰好压线：D + E*(t-1) 与极差相等也算合法
        ("1\n3 2 3 3\n0 2 8\n", "1"),
        # 回归用例：f 不单调，贪"最左合法前驱"会得 3，正解 2
        ("1\n5 5 7 3\n3 23 19 26 17\n", "2"),
        # 同上另一组：前缀不可分的 1 批被第 3 个救回来
        ("1\n3 0 3 3\n0 5 6\n", "1"),
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

    # 暴力对拍：区间 DP 直接用原始条件 a[j]-a[i] <= D + E*(j-i)
    def brute(values, big_d, e, k):
        v = sorted(values)
        n = len(v)
        f = [10 ** 9] * (n + 1)
        f[0] = 0
        for i in range(1, n + 1):
            for j in range(max(0, i - k), i):
                if v[i - 1] - v[j] <= big_d + e * (i - 1 - j):
                    if f[j] + 1 < f[i]:
                        f[i] = f[j] + 1
        return f[n]

    random.seed(20261027)
    fail = None
    for case_no in range(1, 4001):
        n = random.randint(1, 12)
        values = [random.randint(0, 30) for _ in range(n)]
        big_d = random.choice([0, 0, 1, 2, 3, 5, 10])
        e = random.choice([0, 0, 1, 2, 3, 7, 20])
        k = random.randint(1, n)
        got = min_batches(values[:], big_d, e, k)
        want = brute(values, big_d, e, k)
        if got != want:
            fail = (values, big_d, e, k, want, got)
            break
    print("暴力对拍 4000 组随机数据：" + ("全部一致" if fail is None else f"失败 {fail}"))
    if fail is not None:
        return

    # 极端规模走一遍，确认没有死循环/性能塌方（不核对数值）
    big_values = [(i * 37) % 10 ** 9 for i in range(200000)]
    big_values[0] = 10 ** 9
    res = min_batches(big_values, 10 ** 9, 1, 99999)
    print(f"极端规模 n=200000 跑通，结果={res}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
