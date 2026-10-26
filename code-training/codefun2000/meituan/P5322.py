"""
P5322. 区间最大公约数和 - gcd 恒等式 + 欧拉函数 + 周期归约

两条整型指标序列在偏移 i 处为 x+i 与 y+i，h(i) = gcd(x+i, y+i)。
求 Σ_{i=s}^{t} h(i)，对 1000000007 取模。t-s 可达 1e18，逐项枚举必挂。

核心思路：
1. gcd(x+i, y+i) = gcd(x+i, |y-x|)：两数之差固定，公因子只能整除差。
   记 d = |y-x|，h(i) 只依赖 r = (x+i) mod d。
2. d = 0（x=y）时 h(i) = x+i，窗口和是等差数列，直接取模输出。
3. d > 0 时 h 以 d 为周期。整周期内的和是个数论常数：
       G(d) = Σ_{r=0}^{d-1} gcd(r, d) = Σ_{m | d} m·φ(d/m)
   ——把 0..d-1 按 gcd 值分组，gcd(r,d)=m 的 r 形如 m·c 且
   gcd(c, d/m)=1，恰有 φ(d/m) 个（r=0 归到 gcd=d 那一组，对应 φ(1)=1）。
4. 部分和尾部 Σ gcd(r, d) 用另一个恒等式直接算，不需要预处理数组：
       Σ_{r=a}^{b-1} gcd(r, d)   （a <= b <= d）
     = Σ_{m | d} m·(#r∈[a,b): m | r)
     = Σ_{m | d} m·( (b-1)//m - (a-1)//m )   （a=0 时后者取 0，
       准确写法是 (b//m) 的边界提醒：计数公式为 (x-1)//m，x>=1）
   前缀 P(N) = Σ_{i=0}^{N-1} h(i) = 整周期数·G(d) + 首段余数的前缀和，
   答案 = P(t+1) - P(s)，全程大整数乘法、最后取模。
5. 试除法求 φ；同一 d 的 G 与因子表缓存复用。

输入格式：
- 第 1 行：k（询问数）；
- 接下来 k 行：每行 x、y、s、t。

输出格式：
- 每个询问一行：公约和模 1000000007。

时间复杂度：单询问 O(τ(d)·√d)（τ 为因子个数），k·d 规模完全可控
空间复杂度：O(√d + τ(d)·缓存)
"""

# https://codefun2000.com/p/P5322
import sys

MOD = 1000000007
_period_cache = {}  # d -> (整周期和 G, 因子升序表, 每因子 φ 值表)


def euler_phi(n):
    result = n
    remaining = n
    p = 2
    while p * p <= remaining:
        if remaining % p == 0:
            while remaining % p == 0:
                remaining //= p
            result -= result // p
        p += 1
    if remaining > 1:
        result -= result // remaining
    return result


def period_info(d):
    """整周期和 G(d) = Σ_{m|d} m·φ(d/m)，以及因子表与 φ 值表。"""
    cached = _period_cache.get(d)
    if cached is not None:
        return cached
    divisors = []
    m = 1
    while m * m <= d:
        if d % m == 0:
            divisors.append(m)
            if m != d // m:
                divisors.append(d // m)
        m += 1
    divisors.sort()
    phi_of = {m: euler_phi(m) for m in divisors}
    # 按 gcd 值分组：gcd(r,d)=m 的 r 形如 m·c 且 gcd(c, d/m)=1，
    # 恰有 φ(d/m) 个；r=0 归入 gcd=d 那组，对应 φ(1)=1
    total = 0
    for m in divisors:
        total += m * euler_phi(d // m)
    _period_cache[d] = (total, divisors, phi_of)
    return total, divisors, phi_of


def gcd_sum_block(d, divisors, phi_of, lo, hi):
    """Σ_{r=lo}^{hi-1} gcd(r, d)，要求 0 <= lo <= hi <= d。

    用 n = Σ_{m|n} φ(m)：gcd(r, d) = Σ_{m|d 且 m|r} φ(m)，故
    Σ gcd(r,d) = Σ_{m|d} φ(m)·#{r∈[lo,hi): m|r}。
    [0,hi) 内 m 的倍数有 (hi-1)//m + 1 个，r=0 一格自动并入，
    其贡献恰好是 Σ_{m|d} φ(m) = d = gcd(0,d)，不需要特判。
    """
    if lo >= hi:
        return 0
    total = 0
    for m in divisors:
        count = (hi - 1) // m - (lo - 1) // m  # lo=0 时 (−1)//m = −1
        total += phi_of[m] * count
    return total


def partial_from_r0(d, divisors, phi_of, r0, rem):
    """从 r0 开始连续 rem 个 gcd((r0+j) mod d, d) 之和。"""
    if rem <= 0:
        return 0
    to_end = d - r0
    if rem <= to_end:
        return gcd_sum_block(d, divisors, phi_of, r0, r0 + rem)
    total = gcd_sum_block(d, divisors, phi_of, r0, d)
    total += gcd_sum_block(d, divisors, phi_of, 0, rem - to_end)
    return total


def window_sum(x, y, s, t):
    """Σ_{i=s}^{t} gcd(x+i, y+i)，未取模。"""
    d = abs(y - x)
    if d == 0:
        # x = y：每项就是 x+i
        length = t - s + 1
        return length * x + (s + t) * length // 2

    period_sum, divisors, phi_of = period_info(d)
    r0 = x % d

    # P(N)：从偏移 0 开始连续 N 项之和
    def prefix(n):
        if n <= 0:
            return 0
        full = n // d
        rem = n % d
        return full * period_sum + partial_from_r0(d, divisors, phi_of, r0, rem)

    return prefix(t + 1) - prefix(s)


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    k = int(next(it))
    out = []
    for _ in range(k):
        x = int(next(it))
        y = int(next(it))
        s = int(next(it))
        t = int(next(it))
        out.append(str(window_sum(x, y, s, t) % MOD))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """官方样例 + 对拍小窗口 + 周期边界 + 大偏移平移不变性。"""
    import io
    import random
    from math import gcd

    test_cases = [
        # 官方样例 1
        ("3\n8 14 0 2\n5 5 1 3\n3 9 0 4\n", "7\n21\n13"),
        # 官方样例 2
        ("2\n2 10 0 0\n7 11 2 5\n", "2\n8"),
        # x=y 且窗口起点不为 0：等差数列 gcd(6,6)+gcd(7,7)+gcd(8,8)=21
        ("1\n4 4 2 4\n", "21"),
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

    def brute(x, y, s, t):
        total = 0
        for i in range(s, t + 1):
            total += gcd(x + i, y + i)
        return total

    random.seed(20261027)
    fail = None
    for case_no in range(1, 3001):
        x = random.randint(1, 200)
        y = random.randint(1, 200)
        s = random.randint(0, 40)
        t = s + random.randint(0, 60)
        got = window_sum(x, y, s, t)
        want = brute(x, y, s, t)
        if got != want:
            fail = (x, y, s, t, want, got)
            break
    print("对拍 3000 组小窗口：" + ("全部一致" if fail is None else f"失败 {fail}"))
    if fail is not None:
        return

    # 周期边界：窗口起点掠过 0、掠过整周期端点；x mod d 落在不同余数段
    bad = None
    for d in (1, 2, 3, 7, 9973, 99991):
        for base in (0, 1, d - 5, d - 1, d, 2 * d - 6):
            for width in (3, 7):
                s = max(0, base)
                t = s + width - 1
                x = d + 3
                y = x + d
                got = window_sum(x, y, s, t)
                want = brute(x, y, s, t)
                if got != want:
                    bad = (d, base, width, want, got)
                    break
            if bad:
                break
        if bad:
            break
    print("周期边界 36 组：" + ("全部一致" if bad is None else f"失败 {bad}"))

    # 大偏移自洽：1e18 级窗口，平移整周期不变
    x, d = 12345, 99991
    y = x + d
    s, t = 10 ** 18 - 3, 10 ** 18 + 4
    base = window_sum(x, y, s, t)
    check1 = window_sum(x, y, s + d, t + d) == base
    check2 = window_sum(x, y, s + 777 * d, t + 777 * d) == base
    # 整周期自洽：恰一个完整周期的窗口和应为 G(d)；恰 5 个周期应为 5·G(d)
    one_period = window_sum(x, y, s + 5 * d, s + 5 * d + d - 1)
    five_period = window_sum(x, y, s + 5 * d, s + 5 * d + 5 * d - 1)
    period_sum_g = period_info(d)[0]
    print(
        f"1e18 偏移平移不变性: {check1}/{check2}, "
        f"1 个周期 == G: {one_period == period_sum_g}, "
        f"5 个周期 == 5·G: {five_period == 5 * period_sum_g}"
    )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
