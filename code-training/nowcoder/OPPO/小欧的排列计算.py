# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/88ed2cec55d346348fd6eba838efec40
# 小欧的排列计算（OPPO 2023 秋招 · 算法岗）

"""
小欧的排列计算 —— 组合数学 / 计数

题目描述：
称一个排列是「好排列」，当且仅当任意相邻两个数的乘积都是偶数。
给定 n，求长度 n 的好排列个数，答案对 1e9+7 取模。

输入格式：
一个正整数 n（2 <= n <= 1e5）。

输出格式：
一个整数，表示好排列的数量（对 1e9+7 取模）。

核心思路：
乘积是偶数 <=> 相邻两个数里至少有一个偶数，等价于**两个奇数不能相邻**。
1..n 里偶数有 e = n//2 个，奇数有 o = n-e 个。
若 o > e+1，鸽笼原理下必然出现相邻的两个奇数，答案 0。
否则按「插空」计数：
  先把 e 个偶数随便排：e! 种；
  排好后有 e+1 个空隙（最前面、相邻两个偶数之间、最后面），
  从中挑 o 个空隙各放一个奇数：C(e+1, o) 种；
  放进空隙的 o 个奇数内部再任意排列：o! 种。
答案 = e! · C(e+1, o) · o!  (mod 1e9+7)

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
2

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3

样例输出 2:
2
"""
# @sample-end

import sys
from math import comb

MOD = 10 ** 9 + 7


def solve() -> None:
    """插空法计数：偶数先排，奇数插进空隙"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])

    even = n // 2          # 偶数的个数
    odd = n - even         # 奇数的个数

    # 奇数太多，怎么排都会有两个奇数相邻
    if odd > even + 1:
        sys.stdout.write("0\n")
        return

    # 预处理阶乘（只需要到 even+1）
    fact = [1] * (even + 2)
    for i in range(1, even + 2):
        fact[i] = fact[i - 1] * i % MOD

    # 偶数排列 × 选空隙 × 奇数排列
    ans = fact[even] * (comb(even + 1, odd) % MOD) % MOD * fact[odd] % MOD
    sys.stdout.write(str(ans) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("2\n", "2"),        # 样例 1：1 个偶数 1 个奇数
        ("3\n", "2"),        # 样例 2：奇数 2 个，只能夹在偶数两边
        ("4\n", "12"),       # 2! * C(3,2) * 2!
        ("5\n", "12"),       # 2! * C(3,3) * 3!
        ("6\n", "144"),
        ("7\n", "144"),
        ("8\n", "2880"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.StringIO(inp)
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
