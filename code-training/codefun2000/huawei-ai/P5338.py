"""
P5338. 整数缩放因子下的全整型矩阵乘积 - 按行/按列量化 + 整数点积

题目给定：
- 已经按行量化好的矩阵 A（m x k），每行附带缩放因子 s_A = a_A / 2^{b_A}
  （a_A、b_A 直接给出，是最简形式之外的原始整数表示，不需要约分）；
- 尚未量化的浮点矩阵 B（k x n），输入时按 B 的转置给出，每行是一个列向量。

需要对 B 的每一列做 8 比特量化：
1. 取该列所有元素绝对值的最大值 M；
2. 该列缩放因子 s_B = M / 127；
3. 每个元素量化成 round(B / s_B)，再裁剪到 [-127, 127]；
4. 把 s_B 写成 a_B / 2^{b_B}，其中 a_B 四舍五入，b_B 取“让 a_B 不超过 127”
   的最大整数（b_B 范围为 0 到 30）。

结果矩阵 C = A x B 的每个元素输出三个整数：
- 点积：A 第 i 行的量化整数与 B 第 j 列的量化整数逐项相乘再求和；
- a：a_A * a_B（两个缩放因子的分子相乘，不约分）；
- b：b_A + b_B（两个缩放因子的分母指数相加）。

输入格式：
- 第 1 行：m k n；
- 接下来 m 行：每行 k 个已量化整数，再跟该行缩放因子的 a_A、b_A；
- 再接下来 n 行：每行 k 个浮点数，是矩阵 B 的第 j 列。

输出格式：
- m 行，每行 n 组“点积 a b”，组内与组间都用空格分隔。

核心思路：
1. 缩放因子完全用 (a, b) 两个整数表示，缩放因子的乘积就是分子相乘、指数相加，
   整个过程不需要任何浮点乘法参与最终结果；
2. B 的量化只在“求比值”这一步用到浮点：round(B * 127 / M)，
   所以拿 M 直接当除数，比先算 s_B = M / 127 再除要少一次舍入；
3. A 的行缩放因子本来就已经是整数对，直接读入即可；
4. 输出点积时不做 [-127, 127] 裁剪，题面明确要求保留完整点积。

时间复杂度：O(n * k + m * n * k)，其中 n * k 用于量化 B 的每一列；
空间复杂度：O(m * k + n * k)，保存 A 的量化整数、B 每列的量化整数与缩放因子。
"""

# https://codefun2000.com/p/P5338
import math
import sys

# 8 比特量化，缩放因子的分子上限。
MAX_QUANT = 127
# 缩放因子的指数上限，题面给出 0 <= b <= 30。
MAX_SHIFT = 30

# @sample-start
"""
样例输入 1:
2 3 2
1 2 3 1 0
10 -5 4 3 2
127.0 0.0 -127.0
0.0 127.0 64.0

样例输出 1:
-254 64 6 446 64 6
762 192 8 -379 192 8
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1 1 1
5 1 0
0.0

样例输出 2:
0 0 0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 2 1
5 -3 2 3
1.0 -2.0

样例输出 3:
701 130 15
"""
# @sample-end


def round_half_away(value: float) -> int:
    """四舍五入（.5 向远离 0 的方向取整）。"""
    if value >= 0:
        return int(math.floor(value + 0.5))
    return int(math.ceil(value - 0.5))


def quantize_column(values, max_abs):
    """
    把一列浮点数量化成 [-127, 127] 内的整数。

    s_B = max_abs / 127，所以 value / s_B = value * 127 / max_abs。
    直接用乘法再除，避免先算出 s_B 引入一次额外的舍入。
    """
    if max_abs == 0.0:
        # 整列都是 0：缩放因子退化为 0，量化值也只能是 0。
        return [0] * len(values)

    result = []
    for value in values:
        q = round_half_away(value * MAX_QUANT / max_abs)
        # 理论上 |value| <= max_abs 已经保证 |q| <= 127，
        # 这里再裁剪一次，挡住浮点误差带来的 128 / -128。
        if q > MAX_QUANT:
            q = MAX_QUANT
        elif q < -MAX_QUANT:
            q = -MAX_QUANT
        result.append(q)
    return result


def column_scale(max_abs: float):
    """
    把 s_B = max_abs / 127 表示成 a / 2^b。

    b 取“四舍五入后的 a 不超过 127”的最大值：b 越大，分母越细，
    表示精度越高；直到 a 再往上就会越过 8 比特缩放因子的上限。
    """
    if max_abs == 0.0:
        # 与样例 2 一致：0 表示为 0 / 2^0。
        return 0, 0

    scale = max_abs / MAX_QUANT

    # 从大到小找第一个满足 a <= 127 的 b，找到即可返回。
    for shift in range(MAX_SHIFT, -1, -1):
        a = round_half_away(scale * (1 << shift))
        if a <= MAX_QUANT:
            return a, shift

    # 防御性分支：s_B 大到即使 b = 0 也超过 127（题面约束下不会出现）。
    return MAX_QUANT, 0


def solve():
    """读入 A、B，按列量化 B，输出 C 的每个元素与对应缩放因子。"""
    data = sys.stdin.buffer.read().split()
    if len(data) < 3:
        return

    it = iter(data)
    m = int(next(it))
    k = int(next(it))
    n = int(next(it))

    # A 的每行：k 个量化整数 + 缩放因子的 a、b。
    quant_a = []
    scale_a = []
    for _ in range(m):
        row = [int(next(it)) for _ in range(k)]
        a = int(next(it))
        b = int(next(it))
        quant_a.append(row)
        scale_a.append((a, b))

    # B 按列给出：第 j 行就是 B 的第 j 列。
    quant_b = []
    scale_b = []
    for _ in range(n):
        values = [float(next(it)) for _ in range(k)]
        max_abs = max(abs(v) for v in values)
        quant_b.append(quantize_column(values, max_abs))
        scale_b.append(column_scale(max_abs))

    lines = []
    for i in range(m):
        row_a = quant_a[i]
        a_a, b_a = scale_a[i]
        parts = []
        for j in range(n):
            col_b = quant_b[j]
            # 全整型点积：两个量化整数数组逐项相乘再求和。
            dot = sum(row_a[t] * col_b[t] for t in range(k))
            a_b, b_b = scale_b[j]
            # 缩放因子相乘：分子相乘，指数相加，绝不约分。
            parts.append(f"{dot} {a_a * a_b} {b_a + b_b}")
        lines.append(" ".join(parts))

    print("\n".join(lines))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "2 3 2\n"
            "1 2 3 1 0\n"
            "10 -5 4 3 2\n"
            "127.0 0.0 -127.0\n"
            "0.0 127.0 64.0\n",
            "-254 64 6 446 64 6\n"
            "762 192 8 -379 192 8",
        ),
        # 官方样例 2：整列为 0
        (
            "1 1 1\n"
            "5 1 0\n"
            "0.0\n",
            "0 0 0",
        ),
        # 官方样例 3
        (
            "1 2 1\n"
            "5 -3 2 3\n"
            "1.0 -2.0\n",
            "701 130 15",
        ),
        # a_A = 0 时，结果的缩放因子分子也为 0，但 b 仍然要相加
        (
            "1 2 1\n"
            "0 0 0 5\n"
            "3.0 -4.0\n",
            "0 0 16",
        ),
        # 两列的最大绝对值不同：缩放因子按列独立计算
        (
            "2 1 2\n"
            "3 1 0\n"
            "-2 1 0\n"
            "2.0\n"
            "0.5\n",
            "381 65 12 381 65 14\n"
            "-254 65 12 -254 65 14",
        ),
        # 量化时的 .5 处要向远离 0 的方向取整：1.0 / (2/127) = 63.5 -> 64
        (
            "1 2 1\n"
            "1 -1 1 0\n"
            "1.0 2.0\n",
            "-63 65 12",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读取，需要带 buffer 的文本流
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
