"""
P5565. 登岛最大功力 - 线段树（区间加 + 区间最大值）上的至少两段区间选择

在秘岛上每个单位时间扣 c 点功力；每起异事发力于闭区间 [a_k, b_k]、功力
w_k，只有整段 [a_k, b_k] 完全落进某次停留 [L, R]（L <= a_k 且 b_k <= R）
才算拿到。停留进出时刻只能取自异事出现过的时刻，至多两段且第二段进入
时刻严格晚于第一段离开（L_2 > R_1），每一段单独的净功力（异事功力和减
c*(R-L)）都必须大于 0。求总功力最大的进出方案；无正收益方案输出 0 / NA；
并列最优取停留列表字典序最小的一组。

输入格式：
- 第一行 p、c（1 <= p <= 1e4，0 <= w_k, c <= 1e9）；
- 随后 p 行，每行 a_k、b_k、w_k（a_k <= b_k）。

输出格式：
- 第一行最大结算功力；
- 后面一行或两行"进入,离开"（两段时按进入时刻从早到晚）；无上岛方案写 NA。

核心思路：
1. 候选起止时刻只有异事件出现过的 ~2p 个离散值，把停留 [L, R] 的净功力
   改写成   net(L,R) = prefW(b <= R 且 a >= L) - c*R + c*L，
   对固定的"进入下标 i"而言，prefW 通过"按 b 落位"的后缀加法进一张
   线段树（叶子 j 存 prefW_{b<=times[j]} - c*times[j]），所以「单段」
   与「接一段」两种查询都落在同一棵树上。
2. 自晚时间往早扫一遍可同时得到：
   single[i] = c*times[i] + max_{R >= times[i]} net  （以 times[i] 进入的最好单段）
   再从 single 的后缀最大值得 ssuf[j] = max_{L > times[j]} single  （在 R 之后
   能接到的最好一段）。第二遍扫描把 ssuf 预置进叶子里，得到
   first[i] = max_{R >= times[i]} (net + ssuf[R])  （以 times[i] 进入、
   补满第二段的总功力）。最优总功力 T = max(0, max_i max(single[i], first[i]))。
3. 输出重建按字典序贪心：从小到大枚举进入时刻 L、再枚举离开时刻 R，
   满足（net > 0 且 net + max(0, ssuf[R]) == T），即存在总功力恰为 T 的
   正收益解；找到后若还有第二段，再在 R 之后贪最小进入、最早离岛时刻。

时间复杂度：两遍扫描 O((p + |S|) log |S|)，重建每段的净功力时间线 O(p log p)
空间复杂度：O(|S| + p)
"""

# https://codefun2000.com/p/P5565
import sys

NEG = -(1 << 60)


class SegMax:
    """区间加、区间最大值的迭代式线段树（push 沿边界路径的标准模板）。"""

    def __init__(self, base):
        n = len(base)
        sz = 1
        while sz < n:
            sz <<= 1
        self.sz = sz
        self.h = sz.bit_length() - 1
        self.t = [NEG] * (2 * sz)
        self.d = [0] * sz
        self.t[sz : sz + n] = base
        for x in range(sz - 1, 0, -1):
            self.t[x] = max(self.t[2 * x], self.t[2 * x + 1])

    def _apply(self, x, v):
        self.t[x] += v
        if x < self.sz:
            self.d[x] += v

    def _push(self, leaf):
        i = leaf
        for s in range(self.h, 0, -1):
            j = i >> s
            dv = self.d[j]
            if dv:
                self._apply(j << 1, dv)
                self._apply((j << 1) | 1, dv)
                self.d[j] = 0

    def _pull(self, leaf):
        x = leaf >> 1
        while x:
            self.t[x] = max(self.t[2 * x], self.t[2 * x + 1]) + self.d[x]
            x >>= 1

    def update(self, l, r, v):
        """给 [l, r) 加 v。"""
        if l >= r:
            return
        l += self.sz
        r += self.sz
        self._push(l)
        self._push(r - 1)
        l0, r0 = l, r
        while l < r:
            if l & 1:
                self._apply(l, v)
                l += 1
            if r & 1:
                r -= 1
                self._apply(r, v)
            l >>= 1
            r >>= 1
        self._pull(l0)
        self._pull(r0 - 1)

    def query(self, l, r):
        """返回 [l, r) 的最大值。"""
        if l >= r:
            return NEG
        l += self.sz
        r += self.sz
        self._push(l)
        self._push(r - 1)
        res = NEG
        while l < r:
            if l & 1:
                if self.t[l] > res:
                    res = self.t[l]
                l += 1
            if r & 1:
                r -= 1
                if self.t[r] > res:
                    res = self.t[r]
            l >>= 1
            r >>= 1
        return res


# @sample-start
"""
样例输入 1:
2 10
1 2 3
5 6 4

样例输出 1:
0
NA
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 3
1 4 20
2 3 5
8 9 12

样例输出 2:
25
1,4
8,9
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3 4
2 5 30
3 4 6
10 14 5

样例输出 3:
24
2,5
"""
# @sample-end


def solve():
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    p = int(next(it))
    c = int(next(it))
    events = []
    for _ in range(p):
        a = int(next(it))
        b = int(next(it))
        w = int(next(it))
        events.append((a, b, w))

    # 候选进出时刻 = 全部异事出现过的时刻（离散化）
    times = sorted({t for e in events for t in (e[0], e[1])})
    n = len(times)
    idx = {t: i for i, t in enumerate(times)}
    by_a_desc = sorted(events, key=lambda e: -e[0])

    # 第一遍扫描：single[i] = 以 times[i] 进入的最好单段净功力
    # 叶子 j 存 net(L=fixed, R=times[j]) 中随 L 变化的公共部分：
    #   prefW_{激活异事, b<=times[j]} - c*times[j]
    single = [0] * n
    tree1 = SegMax([-c * t for t in times])
    ptr = 0
    for i in range(n - 1, -1, -1):
        while ptr < p and by_a_desc[ptr][0] >= times[i]:
            _, b, w = by_a_desc[ptr]
            tree1.update(idx[b], n, w)
            ptr += 1
        single[i] = c * times[i] + tree1.query(i, n)

    # ssuf[i] = 在 times[i] 之后（严格晚）进入的最好单段净功力
    ssuf = [NEG] * n
    run = NEG
    for i in range(n - 1, -1, -1):
        ssuf[i] = run
        if single[i] > run:
            run = single[i]

    # 第二遍扫描：多段情形。叶子额外带上 ssuf[j]：
    # 第一段 [times[i], R] 的净功力 + 之后最好一段的净功力
    tree2 = SegMax([-c * t + ssuf[j] for j, t in enumerate(times)])
    ptr = 0
    first = [NEG] * n
    for i in range(n - 1, -1, -1):
        while ptr < p and by_a_desc[ptr][0] >= times[i]:
            _, b, w = by_a_desc[ptr]
            tree2.update(idx[b], n, w)
            ptr += 1
        first[i] = c * times[i] + tree2.query(i, n)

    best_first = [
        (single[i] if single[i] > first[i] else first[i]) for i in range(n)
    ]
    T = max(0, max(best_first))

    if T <= 0:
        print(0)
        print("NA")
        return

    # 输出重建：字典序贪心。第一段最小的进入时刻，再最小离开时刻。
    def timeline(L0):
        """给定进入时刻 L0，沿候选离岛时刻算出净功力时间线（事件按 b 前缀和）。"""
        evs = sorted((e for e in events if e[0] >= L0), key=lambda e: e[1])
        out = []
        k2 = 0
        pref = 0
        for t in times:
            if t < L0:
                out.append(None)
                continue
            while k2 < len(evs) and evs[k2][1] <= t:
                pref += evs[k2][2]
                k2 += 1
            out.append(pref - c * (t - L0))
        return out

    start_i = None
    for i in range(n):
        if best_first[i] != T:
            continue
        lines = timeline(times[i])
        for j in range(i, n):
            net = lines[j]
            if net is None or net <= 0:
                continue  # 每一段独立净功力都必须为正
            cont = ssuf[j] if ssuf[j] > 0 else 0
            if net + cont == T:
                start_i = (i, j, net)
                break
        if start_i:
            break
    i1, j1, net1 = start_i
    L1, R1 = times[i1], times[j1]

    print(T)
    out = [f"{L1},{R1}"]

    cont = ssuf[j1] if ssuf[j1] > 0 else 0
    if cont > 0:
        # 第二段：贪最小进入时刻（须严格晚于第一段的离开），最早离岛时刻
        target = cont
        second = None
        for i2 in range(j1 + 1, n):
            if single[i2] < target:
                continue  # 从这里进入的最好一段都压不到 target，出不了精确命中
            lines2 = timeline(times[i2])[i2:]
            for off, net in enumerate(lines2):
                if net is None:
                    continue
                if net == target:
                    second = (i2, i2 + off)
                    break
                if net > target:
                    # 净功力还可能随离岛时刻回落（-c），继续等精确命中
                    continue
            if second:
                break
        i2, j2 = second
        out.append(f"{times[i2]},{times[j2]}")

    print("\n".join(out))


def _run(inp):
    import io

    old_in, old_out = sys.stdin, sys.stdout
    sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
    sys.stdout = io.StringIO()
    try:
        solve()
        return sys.stdout.getvalue().strip()
    finally:
        sys.stdin, sys.stdout = old_in, old_out


def _brute(events, c):
    """小规模暴力：枚举全部候选停留与两段组合，连带字典序最小方案。"""
    times = sorted({t for e in events for t in (e[0], e[1])})

    def net(L, R):
        s = sum(w for (a, b, w) in events if L <= a and b <= R)
        return s - c * (R - L)

    stays = [
        (L, R, net(L, R))
        for L in times
        for R in times
        if L <= R and net(L, R) > 0
    ]
    sols = [([], 0)]
    for L, R, nw in stays:
        sols.append(([(L, R)], nw))
    for x, (L1, R1, n1) in enumerate(stays):
        for L2, R2, n2 in stays[x + 1 :]:
            if L2 > R1:
                sols.append(([(L1, R1), (L2, R2)], n1 + n2))

    best = max((sol[1] for sol in sols), default=0)
    if best <= 0:
        return "0\nNA"
    winners = sorted(sol[0] for sol in sols if sol[1] == best)
    lines = [str(best)] + [f"{L},{R}" for L, R in winners[0]]
    return "\n".join(lines)


def run_tests():
    """官方样例 + 边界用例 + 随机对拍（暴力含字典序最小方案）。"""
    test_cases = [
        # 官方样例 1：每一段都是负收益 -> 不上岛
        ("2 10\n1 2 3\n5 6 4\n", "0\nNA"),
        # 官方样例 2：拆两段 16+9=25 优于一段 13
        ("3 3\n1 4 20\n2 3 5\n8 9 12\n", "25\n1,4\n8,9"),
        # 官方样例 3：第二段负收益，只保留第一段 24
        ("3 4\n2 5 30\n3 4 6\n10 14 5\n", "24\n2,5"),
        # 等长进入时刻允许 L==R：零长度停留照样拿 [t,t] 的功力
        ("2 1000000000\n7 7 5\n8 9 1\n", "5\n7,7"),
        # 字典序平局：两组同样 8 总功力的段组合，取首段更小的一组
        ("3 1\n1 2 5\n4 5 5\n7 8 5\n", "10\n1,2\n4,8"),
        # w 可为 0：零价值异事不改变结论
        ("1 0\n3 9 0\n", "0\nNA"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        got = _run(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected.replace(chr(10), ' / ')}, 实际={got.replace(chr(10), ' / ')} {status}")

    # 随机小规模对拍：总功力与输出（含字典序）都要和暴力一致
    import random

    rng = random.Random(20260923)
    bad = 0
    for case in range(300):
        p = rng.randint(1, 6)
        c = rng.choice([0, 1, 2, 5])
        events = []
        for _ in range(p):
            a = rng.randint(0, 12)
            b = a + rng.randint(0, 12)
            w = rng.randint(0, 10)
            events.append((a, b, w))
        inp = f"{p} {c}\n" + "".join(f"{a} {b} {w}\n" for a, b, w in events)
        got = _run(inp)
        want = _brute(events, c)
        if got != want:
            bad += 1
            print(f"对拍失败 case {case}: got={got!r} want={want!r} 输入:\n{inp}")
            if bad > 3:
                break
    print("对拍: 300 组随机用例与暴力一致 ✓" if bad == 0 else f"对拍失败 {bad} 组")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
