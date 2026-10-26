"""
P4914. 最长质量稳定段 - 线性扫描（模拟）

题意：给定 n 件产品的重量 w_1..w_n 与波动上限 D。一段连续区间 [l, r] 是
「质量稳定段」，当且仅当每对相邻产品都满足 |w_{i+1} - w_i| <= D。
求所有稳定段中最长的一段长度。

判定标准很直接：稳定段由「相邻差都不超 D」这一局部条件决定，
因此一个段的合法性由它的每一条相邻边独立决定——从左到右扫描，
遇到一条满足条件的相邻边就延长当前段，遇到不满足的就重新开段。
段与段之间只通过「断点」分割，没有跨段的全局约束，所以一遍线性扫描即可，
不需要任何二分或 DP。

输入格式：
- 第 1 行：测试组数 T；
- 每组两行：第一行 n 和 D，第二行 n 个整数 w_1..w_n。

输出格式：
- 每组一行，输出最长稳定段的长度。

时间复杂度：O(n)（所有组的 n 总和不超过 2*10^5）
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4914
import sys

# @sample-start
"""
样例 1:
1
7 1
1 2 3 2 5 6 7
->
4
"""
# @sample-end

# @sample-start
"""
样例 2:
1
4 0
5 5 5 6
->
3
"""
# @sample-end

# @sample-start
"""
样例 3:
2
3 1000000000
-1000000000 0 1000000000
2 0
1 2
->
3
1
"""
# @sample-end


def solve():
    """对每组数据线性扫描，输出最长稳定段长度。"""
    data = sys.stdin.buffer.read().split()
    pos = 1
    t = int(data[0])
    out = []
    for _ in range(t):
        n = int(data[pos])
        d_limit = int(data[pos + 1])
        pos += 2
        w = data[pos:pos + n]
        pos += n
        w = [int(x) for x in w]

        # cur 维护「以当前元素结尾的稳定段长度」：
        # 相邻差 <= D 时前一段延长 1；否则从当前元素重新开段（长度 1）。
        # 相邻差的合法性只取决于这一条边，所以逐边判定就足够。
        best = 1
        cur = 1
        for i in range(1, n):
            if abs(w[i] - w[i - 1]) <= d_limit:
                cur += 1
            else:
                cur = 1
            if cur > best:
                best = cur
        out.append(str(best))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的官方样例与自加的边界/变形用例。"""
    import io
    import random

    def run_once(inp):
        old = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().rstrip("\n")
        finally:
            sys.stdin, sys.stdout = old

    def brute(w, d_limit):
        """参照实现：枚举全部区间逐条相邻边校验，O(n^2)。"""
        n = len(w)
        best = 0
        for l in range(n):
            for r in range(l, n):
                ok = all(abs(w[i + 1] - w[i]) <= d_limit for i in range(l, r))
                if ok:
                    best = max(best, r - l + 1)
        return best

    cases = [
        # 官方样例 1：段在 |5-2|=3 处断开，最长 [1,4] 长 4
        ("1\n7 1\n1 2 3 2 5 6 7\n", "4"),
        # 官方样例 2：D=0 要求相邻相等，最长等于相同值的连续个数
        ("1\n4 0\n5 5 5 6\n", "3"),
        # 官方样例 3：两组数据，第二组 n=2 且 D=0 时无任何稳定相邻边
        ("2\n3 1000000000\n-1000000000 0 1000000000\n2 0\n1 2\n", "3\n1"),
        # 边界：n=1，没有任何相邻边，答案只能是 1
        ("1\n1 0\n42\n", "1"),
        # 边界：单元素组混在多组里
        ("2\n1 5\n-3\n2 1\n7 8\n", "1\n2"),
        # 全部相等且 D=0：整条序列是一个稳定段
        ("1\n6 0\n9 9 9 9 9 9\n", "6"),
        # 交替序列且 D=1：每对相邻差都是 1，整条都是稳定段（差可为负方向）
        ("1\n5 1\n5 4 5 4 5\n", "5"),
        # D=0 且相邻差全为 1：每两个就断开，答案 1
        ("1\n5 0\n1 2 3 4 5\n", "1"),
        # 段的方向不影响：3 2 1 且 D=1 整条稳定
        ("1\n3 1\n3 2 1\n", "3"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        got = run_once(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")

    # 随机对拍：小规模下与 O(n^2) 参照实现逐组比对
    rng = random.Random(20260509)
    ok = True
    for trial in range(200):
        n = rng.randint(1, 20)
        d_limit = rng.choice([0, 1, 2, 3, 10])
        w = [rng.randint(-5, 5) for _ in range(n)]
        inp = "1\n%d %d\n%s\n" % (n, d_limit, " ".join(map(str, w)))
        got = run_once(inp)
        want = str(brute(w, d_limit))
        if got != want:
            ok = False
            print(f"对拍失败: n={n}, D={d_limit}, w={w}, 期望={want}, 实际={got}")
    print("随机对拍:", "全部通过" if ok else "存在失败")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
