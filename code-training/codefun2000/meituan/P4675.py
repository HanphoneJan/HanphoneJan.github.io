"""
P4675. 符石共鸣的最大能量 - 线性 DP（交替符号子序列）

题面要点：从符石序列 v_1..v_n 里挑一个子序列保序拼接，共鸣值为
E = s_1 − s_2 + s_3 − …（首位 +，正负交替）。可以一个都不选（E = 0）。
求 E 的最大值。

输入：第一行 T；每组第一行 n，第二行 n 个能量值（可能为负）。
输出：每组一行最大共鸣值。

核心思路：
1. 把「选好的序列」按已选个数分类只有两种状态——
   f：已选偶数个（含空序列，值 0），下一个填入的符石贡献 +v；
   g：已选奇数个，下一个填入的符石贡献 −v。
2. 从左到右扫，新符石 v 只能接到某个已有序列的尾部：
   f = max(f, g − v)   # 接到奇长度序列后面，该位取负
   g = max(g, f + v)   # 接到偶长度序列后面，该位取正
   两条转移同时用更新前的旧值（元组同时赋值）。
   f 初值 0 兜底了「不选任何符石」；g 初值 −inf（奇长度序列必须非空）。
3. 答案 = max(f, g)。

时间复杂度：O(Σn)
空间复杂度：O(1)（每组）
"""

# https://codefun2000.com/p/P4675
import sys

# @sample-start
"""
样例输入 1:
1
1
100

样例输出 1:
100
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
4
-3 -1 -4 -2

样例输出 2:
3
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1
5
5 -3 4 -2 6

样例输出 3:
20
"""
# @sample-end

NEG_INF = -(1 << 60)


def best_resonance(values):
    """返回该组符石的交替符号子序列最大共鸣值（含空序列的 0）。"""
    f, g = 0, NEG_INF   # f: 偶长度(下一位 +v)；g: 奇长度(下一位 −v)
    for x in values:
        # 两条转移同时使用旧值：x 挂在奇长度后面取负，挂在偶长度后面取正
        f, g = max(f, g - x), max(g, f + x)
    return max(f, g)


def solve():
    data = sys.stdin.buffer.read().split()
    pos = 0
    t = int(data[pos])
    pos += 1
    out = []
    for _ in range(t):
        n = int(data[pos])
        pos += 1
        values = [int(x) for x in data[pos:pos + n]]
        pos += n
        out.append(str(best_resonance(values)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """官方样例 + 边界/变形用例 + 随机暴力对拍。"""
    import io

    test_cases = [
        # 官方样例 1：n = 1，选它就是 100
        (
            "1\n1\n100\n",
            "100",
        ),
        # 官方样例 2：全负数组，选 [-1, -4] 得 (-1) - (-4) = 3
        (
            "1\n4\n-3 -1 -4 -2\n",
            "3",
        ),
        # 官方样例 3：全选，负数恰好都落在减数位
        (
            "1\n5\n5 -3 4 -2 6\n",
            "20",
        ),
        # 全正数组也会丢弃部分正数让前面的正数站到减数位：[10,1,10] -> 10-1+10=19
        (
            "1\n3\n10 1 10\n",
            "19",
        ),
        # 全负且两个：取差值
        (
            "1\n2\n-5 -9\n",
            "4",
        ),
        # 全是 0：最大值 0（空序列也算）
        (
            "1\n3\n0 0 0\n",
            "0",
        ),
        # 两个零夹一大数
        (
            "1\n3\n0 7 0\n",
            "7",
        ),
        # 多组数据串一起
        (
            "2\n1\n-4\n1\n2\n",
            "0\n2",
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

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机暴力对拍：小 n 枚举全部子序列逐个算共鸣值
    import random

    rng = random.Random(20260411)
    ok = True
    for case in range(500):
        n = rng.randint(1, 10)
        values = [rng.randint(-6, 6) for _ in range(n)]
        brute = 0
        for mask in range(1, 1 << n):
            seq = [values[k] for k in range(n) if mask >> k & 1]
            total = 0
            for idx, s in enumerate(seq, 1):
                total += s if idx % 2 == 1 else -s
            brute = max(brute, total)
        got = best_resonance(values)
        if got != brute:
            ok = False
            print(f"对拍失败: values={values} DP={got} 暴力={brute}")
            break
    print(f"随机暴力对拍 500 组: {'✓' if ok else '✗'}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
