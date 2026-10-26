"""
P4674. 最优折扣组合 - 贪心

题面要点：n 件商品标价 p_i，两种券——半价券（该商品价格变为 ⌊p/2⌋）与
固定减免券（价格变为 p − k，允许减成负数）。每件商品最多各用一张两类券
（可叠加在同一个商品上），手中共有 a 张半价券、b 张固定减免券。
最小化最终价格总和。

输入：第一行 T；每组第一行 n a b k，第二行 n 个价格。
输出：每组一行，最小价格总和。

核心思路：
1. 两种券的收益互相独立，且与"用在哪"几乎无关：
   - 固定减免券的收益恒为 k（b <= n 保证总能在不同商品上各用一张），
     所以总减免就是 b*k；
   - 半价券在商品 i 上的收益恒为 p_i − ⌊p_i/2⌋ = ⌈p_i/2⌉，与该商品是否
     再叠一张减免券无关，所以挑 ⌈p_i/2⌉ 最大的 a 个商品即可。
2. 答案 = Σp_i − b*k − (最大的 a 个 ⌈p_i/2⌉ 之和)。

时间复杂度：O(Σn log n)（每组一次排序）
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4674
import sys

# @sample-start
"""
样例输入 1:
1
4 2 1 5
10 3 8 12

样例输出 1:
17
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
3 0 2 4
7 8 9

样例输出 2:
16
"""
# @sample-end

# @sample-start
"""
样例输入 3:
2
1 1 1 100
50
2 0 0 10
100 200

样例输出 3:
-75
300
"""
# @sample-end

# @sample-start
"""
样例输入 4:
1
2 2 1 1
1 1

样例输出 4:
-1
"""
# @sample-end


def solve():
    """逐组读入，输出每组使用优惠券后的最小价格总和。"""
    data = sys.stdin.buffer.read().split()
    pos = 0
    t = int(data[pos])
    pos += 1
    out = []
    for _ in range(t):
        n, a, b, k = (int(data[pos]), int(data[pos + 1]),
                      int(data[pos + 2]), int(data[pos + 3]))
        pos += 4
        total = 0
        half = [0] * n
        for i in range(n):
            p = int(data[pos])
            pos += 1
            total += p
            half[i] = p - p // 2      # 半价收益 = ⌈p/2⌉
        half.sort(reverse=True)
        total -= b * k + sum(half[:a])
        out.append(str(total))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """官方样例 + 边界/变形用例一网打尽。"""
    import io

    test_cases = [
        # 官方样例 1：半价券挑收益最大的两件（12 与 10）
        (
            "1\n4 2 1 5\n10 3 8 12\n",
            "17",
        ),
        # 官方样例 2：没有半价券，只有两张减免券
        (
            "1\n3 0 2 4\n7 8 9\n",
            "16",
        ),
        # 官方样例 3：两组，第一组减成负数，第二组无券可用
        (
            "2\n1 1 1 100\n50\n2 0 0 10\n100 200\n",
            "-75\n300",
        ),
        # 官方样例 4：总和可以为负
        (
            "1\n2 2 1 1\n1 1\n",
            "-1",
        ),
        # 半价券用满 a=n，k 很大把总和减成负数：7 - (2+2) - 1000 = -997
        (
            "1\n2 2 1 1000\n3 4\n",
            "7 - (2 + 2) - 1000",
        ),
        # 半价券挑 top-a：sum=12，收益 4+2=6，再减 b*k=2 → 4
        (
            "1\n3 2 1 2\n8 1 3\n",
            "12 - (4 + 2) - 2",
        ),
        # 收益相同的多件商品选哪件都一样（平局不影响总和）：sum=20 - (3+3)
        (
            "1\n4 2 0 0\n5 5 5 5\n",
            "20 - (3 + 3)",
        ),
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

        # 期望值写成算式（单行、含空格）的条目在这里求值
        if expected and "\n" not in expected and not expected.lstrip("-").isdigit():
            expected = str(eval(expected))
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机小规模暴力对拍：枚举半价券的每种使用组合与穷举对比
    import itertools
    import random

    rng = random.Random(20260328)
    ok = True
    for case in range(300):
        n = rng.randint(1, 6)
        p = [rng.randint(1, 20) for _ in range(n)]
        a = rng.randint(0, n)
        b = rng.randint(0, n)
        k = rng.randint(0, 30)
        base = sum(p) - b * k
        best = base - sum(sorted((x - x // 2 for x in p), reverse=True)[:a])
        # 暴力：逐个尝试半价券的所有用法
        brute = base
        for pick in itertools.combinations(range(n), a):
            gain = sum(p[i] - p[i] // 2 for i in pick)
            brute = min(brute, base - gain)
        if best != brute:
            ok = False
            print(f"对拍失败: n={n} p={p} a={a} b={b} k={k} "
                  f"贪心={best} 暴力={brute}")
            break
    print(f"随机暴力对拍 300 组: {'✓' if ok else '✗'}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
