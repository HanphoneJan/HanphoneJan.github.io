"""
P5562. 双次读数乘积的最大约数个数 - 质因数合并不二枚举

n 个待测器件的标定参数 a_i，允许读两次（可读同一个），把两次读到的数
相乘，最大化乘积的正约数个数并输出这个最大值。
n <= 1000，a_i <= 1e9，乘积可达 1e18，必须按指数合并而非试除乘积。

输入格式：
- 第一行整数 n；
- 第二行 n 个整数 a_i。

输出格式：
- 一个整数，最大的正约数个数。

核心思路：正约数个数对乘法没有分配律——d(a*b) ≠ d(a)·d(b)，除非两数
互质；共有的质因子指数要相加。所以先把每个 a_i 独立试除分解
（素数表上界 sqrt(1e9) ≈ 31623），再对全部 n(n+1)/2 对下标（含 i=j）
按「同质数指数相加、不同质数各自翻倍」的规则合并指数表，用
prod (e_a + e_b + 1) 出答案，取最大。

复杂度：预处理 O(n * sqrt(A)) 试除（素数筛选后约 n * 3400 次）；
成对合并 O(n^2 * 指数个数)，a_i <= 1e9 时每份指数表至多 9 项。
"""

# https://codefun2000.com/p/P5562
# @sample-start
"""
样例输入 1:
4
12 18 7 5

样例输出 1:
16
"""
# @sample-end

import sys

# sqrt(1e9) 取整；所有 <= 1e9 的数试除到 sqrt(当前剩余) 为止已足够
PRIME_BUDGET = 31623


def build_primes(budget):
    sieve = bytearray([1]) * (budget + 1)
    sieve[0:2] = b"\x00\x00"
    for p in range(2, int(budget**0.5) + 1):
        if sieve[p]:
            sieve[p * p : budget + 1 : p] = b"\x00" * len(range(p * p, budget + 1, p))
    return [i for i in range(2, budget + 1) if sieve[i]]


def factorize(x, primes):
    """用素数表试除 x，返回按素数升序的 [(p, e), ...]（x=1 时为空表）。"""
    factors = []
    for p in primes:
        if p * p > x:
            break
        if x % p == 0:
            e = 0
            while x % p == 0:
                x //= p
                e += 1
            factors.append((p, e))
    if x > 1:
        factors.append((x, 1))
    return factors


def merged_divisor_count(fa, fb):
    """合并两份升序指数表，返回 prod (e_a + e_b + 1)。"""
    ans = 1
    i = j = 0
    la, lb = len(fa), len(fb)
    while i < la and j < lb:
        pa, ea = fa[i]
        pb, eb = fb[j]
        if pa == pb:
            ans *= ea + eb + 1
            i += 1
            j += 1
        elif pa < pb:
            ans *= ea + 1
            i += 1
        else:
            ans *= eb + 1
            j += 1
    while i < la:
        ans *= fa[i][1] + 1
        i += 1
    while j < lb:
        ans *= fb[j][1] + 1
        j += 1
    return ans


def best_pair_divisors(values, primes):
    factors = [factorize(v, primes) for v in values]
    best = 1  # 至少读两个 1，约数个数也是 1
    for i in range(len(values)):
        fi = factors[i]
        # i=j：同一枚读两次，指数自乘后再与自身合并
        best = max(best, merged_divisor_count(fi, fi))
        for j in range(i + 1, len(values)):
            best = max(best, merged_divisor_count(fi, factors[j]))
    return best


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    values = [int(x) for x in data[1 : 1 + n]]
    print(best_pair_divisors(values, build_primes(PRIME_BUDGET)))


def run_tests():
    import io
    import random
    import time
    from itertools import combinations_with_replacement

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

    def exact_divisor_count(x):
        """独立参照：从 1 数到 sqrt(x) 逐步数约数（不依赖因数分解）。"""
        cnt = 0
        d = 1
        while d * d <= x:
            if x % d == 0:
                cnt += 2 if d * d != x else 1
            d += 1
        return cnt

    primes = build_primes(PRIME_BUDGET)
    test_cases = [
        # 官方样例 1：12*18 = 216 = 2^3*3^3 -> (3+1)*(3+1) = 16
        ("4\n12 18 7 5\n", "16"),
        # 官方说明里的次优对照：读两次 12，144 = 2^4*3^2 -> 5*3 = 15
        ("1\n12\n", "15"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {'通过' if output == expected else '失败'} {status}")
        assert output == expected, f"样例 {i} 期望 {expected}，实际 {output}"

    # 官方样例很弱：小值域全枚举对拍（素数幂、公因子、同值双读全覆盖）。
    pool = list(range(1, 61))
    rng = random.Random(20260923)
    trials = 0
    for _ in range(40):
        values = rng.sample(pool, 12)
        want = 1
        for a, b in combinations_with_replacement(values, 2):
            want = max(want, exact_divisor_count(a * b))
        got = run_case(f"{len(values)}\n{' '.join(map(str, values))}\n")
        assert int(got) == want, f"对拍失败 values={values}: 期望 {want}，实际 {got}"
        trials += 1
    print(f"对拍用例 {trials} 组（随机 1..60 池，逐对试除参照）：通过")

    # 直接端到端抽查若干含公因子组合的小数组（好构造的陷阱用例）。
    trap_cases = [
        ("2\n4 2\n", "5"),     # 最大来自 4*4 = 16 -> 5 个约数（不是 4*2）
        ("2\n2 2\n", "3"),     # 2*2 = 4 -> 3 个约数
        ("3\n6 6 4\n", "9"),   # 6*6 = 36 -> 9 个；6*4 = 24 -> 8 个
        ("4\n1 1 1 1\n", "1"),
        ("2\n999999937 999999937\n", "3"),  # 读两次同一个大素数，平方后仍只有 3 个约数
    ]
    for i, (inp, expected) in enumerate(trap_cases, 1):
        got = run_case(inp)
        assert got == expected, f"陷阱用例 {i} 期望 {expected}，实际 {got}"
    print(f"陷阱用例 {len(trap_cases)} 组（同值重复/公因子/大素数平方）：通过")

    # 极端规模：n=1000 全 1e9 内随机值，端到端限时检查。
    t0 = time.perf_counter()
    values = [rng.randint(1, 10**9) for _ in range(1000)]
    got = run_case(f"1000\n{' '.join(map(str, values))}\n")
    elapsed = time.perf_counter() - t0
    assert int(got) >= 1
    print(f"压力用例 n=1000（随机 a_i<=1e9）：答案 {got}，用时 {elapsed:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
