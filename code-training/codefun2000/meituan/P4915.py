"""
P4915. 对称画布 - 轨道质量分配（构造型）

画布 n 行 m 列，初始颜料 c[i][j]。可以任意搬运颜料（总量守恒、每格非负
整数），要求最终矩阵同时满足水平中轴线对称与垂直中轴线对称。

核心思路：
1. 两个反射把格子分成「轨道」：格子 (i,j) 与 (i, m+1-j)、(n+1-i, j)、
   (n+1-i, m+1-j) 绑在一个轨道里，最终值必须相等。任何方案的总质量
   S = Σ X[i][j] = Σ (轨道大小 × 该轨道的取值)，所以 S 必须能被「可用的
   轨道大小」表出。
2. 轨道大小只有 1、2、4 三种：
   - 大小 1：i、j 都在中轴上，仅当 n、m 都是奇数时存在；
   - 大小 2：恰好一个下标在中轴上，n、m 至少一个为奇数且 ≥2 时存在；
   - 大小 4：两个下标都不在中轴上，n、m 都 ≥2 时必然存在。
3. 于是判定的 gcd 只有三种取值：
   - n、m 都是奇数：存在大小 1 轨道，S 任意都可行（把所有颜料堆到中心格）；
   - 恰好一个奇数：可用轨道大小是 {2,4}，S 为偶数才可行；
   - 都是偶数：只有大小 4 的轨道，S 能被 4 整除才可行。
   可行时把整份 S 填进一个最小轨道（其余格子置 0），天然满足对称。

输入格式：
- 第 1 行：T；
- 每组：第一行 n、m，接下来 n 行每行 m 个整数。

输出格式：
- 无解输出一行 -1；有解输出 n 行，每行 m 个非负整数。

时间复杂度：单组 O(n*m)（读入与输出主导）
空间复杂度：O(n*m)（输出缓冲）
"""

# https://codefun2000.com/p/P4915
import io
import sys


def build_group(n, m, total):
    """给定可行判定（g 整除 total），生成一行行输出字符串。"""
    zero = " ".join(["0"] * m)

    def one_row(cells):
        toks = ["0"] * m
        for col, val in cells:
            toks[col] = val
        return " ".join(toks)

    rows = [zero] * n
    n_odd = n % 2 == 1
    m_odd = m % 2 == 1

    if n_odd and m_odd:
        # 大小 1 轨道：中心格吃下全部质量
        r, c = (n - 1) // 2, (m - 1) // 2
        rows[r] = one_row([(c, str(total))])
    elif n_odd:
        # 中间行上，(r,0) 与 (r,m-1) 是一个大小 2 轨道（m 为偶数 >= 2）
        r = (n - 1) // 2
        rows[r] = one_row([(0, str(total // 2)), (m - 1, str(total // 2))])
    elif m_odd:
        # 中间列上，(0,c) 与 (n-1,c) 是一个大小 2 轨道（n 为偶数 >= 2）
        c = (m - 1) // 2
        rows[0] = one_row([(c, str(total // 2))])
        rows[n - 1] = one_row([(c, str(total // 2))])
    else:
        # 四角构成一个大小 4 轨道
        half = str(total // 4)
        rows[0] = one_row([(0, half), (m - 1, half)])
        rows[n - 1] = one_row([(0, half), (m - 1, half)])
    return rows


def solve():
    data = sys.stdin.buffer.read().split()
    pos = 1
    t = int(data[0])
    out = []
    for _ in range(t):
        n = int(data[pos])
        m = int(data[pos + 1])
        pos += 2
        total = 0
        for _ in range(n * m):
            total += int(data[pos])
            pos += 1

        if n % 2 == 1 and m % 2 == 1:
            g = 1
        elif n % 2 == 1 or m % 2 == 1:
            g = 2
        else:
            g = 4

        if total % g != 0:
            out.append("-1")
        else:
            out.extend(build_group(n, m, total))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的样例与自加用例，另含随机输出的对称性自检。"""
    import random

    test_cases = [
        # 官方样例 1：3x3，全部颜料堆到中心
        (
            "1\n3 3\n1 2 3\n4 5 6\n7 8 9\n",
            "0 0 0\n0 45 0\n0 0 0",
        ),
        # 官方样例 2：2x2 全偶轨道，四角均分
        (
            "1\n2 2\n4 0\n0 0\n",
            "1 1\n1 1",
        ),
        # 官方样例 3：3x2，奇+偶，S=6 为偶数可行
        (
            "1\n3 2\n1 1\n1 1\n1 1\n",
            "0 0\n3 3\n0 0",
        ),
        # 官方样例 4：3x2，S=21 为奇数，不可行
        (
            "1\n3 2\n1 2\n3 4\n5 6\n",
            "-1",
        ),
        # 边界：1x1，唯一格子就是自己的对称中心
        ("1\n1 1\n7\n", "7"),
        # 一行四列（横向对称退化为无约束，纵向对称是成对轨道）：S 偶可行
        ("1\n1 4\n1 2 3 2\n", "4 0 0 4"),
        # 一行四列，S 奇 -> 不可行
        ("1\n1 4\n1 2 3 1\n", "-1"),
        # 两行三列（行偶列奇），中列上下均分
        (
            "1\n2 3\n1 2 2\n0 0 5\n",
            "0 5 0\n0 5 0",
        ),
        # 两行两列 S=8 -> 四角各 2
        ("1\n2 2\n1 2\n2 3\n", "2 2\n2 2"),
        # 两行两列 S=2 -> 不能被 4 整除
        ("1\n2 2\n1 1\n0 0\n", "-1"),
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
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")

    # 随机自检：输出必须满足两条对称 + 总量守恒 + 非负整数；
    # 判 -1 时必须真的无解（S 不能被可用轨道大小表出）。
    random.seed(20261027)
    for case_no in range(1, 301):
        n = random.randint(1, 6)
        m = random.randint(1, 6)
        grid = [[random.randint(0, 9) for _ in range(m)] for _ in range(n)]
        inp = "1\n{} {}\n".format(n, m) + "\n".join(
            " ".join(map(str, row)) for row in grid
        ) + "\n"
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        lines = output.strip().split("\n")
        total = sum(sum(row) for row in grid)
        if n % 2 == 1 and m % 2 == 1:
            g = 1
        elif n % 2 == 1 or m % 2 == 1:
            g = 2
        else:
            g = 4
        feasible = total % g == 0

        ok = True
        if not feasible:
            ok = lines == ["-1"]
        else:
            ok = len(lines) == n and all(len(row.split()) == m for row in lines)
            if ok:
                x = [[int(v) for v in row.split()] for row in lines]
                for i in range(n):
                    for j in range(m):
                        ok = ok and (
                            x[i][j] == x[n - 1 - i][j] and x[i][j] == x[i][m - 1 - j]
                        )
                        ok = ok and x[i][j] >= 0
                ok = ok and sum(sum(row) for row in x) == total
        if not ok:
            print(f"随机用例 {case_no} 校验失败: 输入={inp!r} 输出={output!r}")
            return
    print("随机自检 300 组全部通过")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
