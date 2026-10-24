# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/b1c40c55c4724f75a659915c6700e5ce
# 小O的矩阵变换（OPPO 2024 秋招 · 研发通用岗 / 后端开发）

"""
小O的矩阵变换 —— 模拟 / 枚举

题目描述：
给定两个 n 行 n 列的 01 方阵 A 和 B。每次操作可以选择 A 的一行或一列，
把这一整行（整列）的数字取反（0 变 1，1 变 0）。问最少几次操作能把 A
变成 B；做不到输出 -1。

输入格式：
第一行一个整数 T（1 <= T <= 10），表示测试组数。
每组数据：第一行 n（1 <= n <= 4）；
随后 n 行、每行 n 个 0/1，是 A；
再随后 n 行、每行 n 个 0/1，是 B。

输出格式：
每组数据输出一行：最少操作次数，或 -1。

核心思路：
1. 每个格子 (i, j) 最终的值由三样东西决定：A[i][j] 本身、第 i 行有没有
   被翻、第 j 列有没有被翻。所以「翻哪些行、翻哪些列」这 2n 个开关一旦定下，
   结果矩阵就唯一确定。
2. 同一行翻两次等于没翻，翻的顺序也无关紧要，因此所有方案只需看
   「这 2n 个开关的一个子集」，一共 2^(2n) 种。
3. n <= 4，于是 2n <= 8，枚举上界只有 2^8 = 256 种，每组数据全部试一遍，
   挑出能把 A 变成 B 且操作次数最少的即可；一个都不行就输出 -1。

时间复杂度：O(T * 2^(2n) * n^2)，n <= 4 时常数极小
空间复杂度：O(n^2)，存两个方阵
"""

# @sample-start
"""
样例输入 1:
2
2
0 1
1 0
1 0
0 1
2
0 1
1 1
0 0
0 0

样例输出 1:
2
-1
"""
# @sample-end

import sys


def min_ops(a, b, n):
    """枚举 2n 个开关的全部子集，返回最少操作次数；无解返回 -1"""
    best = -1
    for mask in range(1 << (2 * n)):
        ok = True
        for i in range(n):
            flip_row = (mask >> i) & 1           # 第 i 行是否翻转
            for j in range(n):
                flip_col = (mask >> (n + j)) & 1  # 第 j 列是否翻转
                if (a[i][j] ^ flip_row ^ flip_col) != b[i][j]:
                    ok = False
                    break
            if not ok:
                break
        if not ok:
            continue
        ops = bin(mask).count("1")               # 这个子集里翻了几条线
        if best == -1 or ops < best:
            best = ops
    return best


def solve() -> None:
    """按测试组读入两个方阵，逐组枚举求最少操作次数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    pos = 0
    t = int(data[pos]); pos += 1
    out = []
    for _ in range(t):
        n = int(data[pos]); pos += 1
        a = []
        for _ in range(n):
            a.append([int(x) for x in data[pos:pos + n]])
            pos += n
        b = []
        for _ in range(n):
            b.append([int(x) for x in data[pos:pos + n]])
            pos += n
        out.append(str(min_ops(a, b, n)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("2\n2\n0 1\n1 0\n1 0\n0 1\n2\n0 1\n1 1\n0 0\n0 0\n", "2\n-1"),  # 题面样例
        ("1\n1\n0\n1\n", "1"),                     # 1x1：翻一次这一行
        ("1\n1\n1\n1\n", "0"),                     # 已经相等
        ("1\n2\n0 0\n0 0\n0 1\n0 0\n", "-1"),      # 只差一个格子，无解
        ("1\n2\n0 0\n0 0\n1 1\n1 1\n", "2"),       # 翻两行（或两列）
        ("1\n3\n0 0 0\n0 0 0\n0 0 0\n0 1 0\n1 0 1\n0 1 0\n", "2"),  # 棋盘格：翻第二行 + 第二列
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
