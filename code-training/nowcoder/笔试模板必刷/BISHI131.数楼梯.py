# @nc app=nowcoder id=c7e5f164fa5d471f8f83c90fe4ee3f05 topic=389 question=11255462 lang=Python3
# 2026-10-15 20:09:40
# https://www.nowcoder.com/practice/c7e5f164fa5d471f8f83c90fe4ee3f05?tpId=389&tqId=11255462
# [BISHI131] 数楼梯

"""
BISHI131. 数楼梯 —— 线性递推 / 动态规划

题目描述：
有一段 n 阶的楼梯，每一步可以选择上 1 阶或 2 阶。
求从楼梯底端走到顶端共有多少种不同的走法。
答案可能很大，请对 998244353 取模后输出。

输入格式：
一行一个整数 n，表示楼梯的阶数。

输出格式：
一行一个整数，表示走法数量对 998244353 取模后的结果。

核心思路：
设 f(n) 为走到第 n 阶的走法数。最后一步要么从 n-1 阶迈 1 阶，
要么从 n-2 阶迈 2 阶，所以 f(n) = f(n-1) + f(n-2)，
即斐波那契数列（f(0)=1, f(1)=1）。
取模运算对加法满足结合律，一边加一边取模即可，
不必等全算完再取模。用两个变量滚动就能把空间降到 O(1)。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
1

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4

样例输出 2:
5
"""
# @sample-end

# @sample-start
"""
样例输入 3:
721

样例输出 3:
670483856
"""
# @sample-end

# @nc code=start

import sys

MOD = 998244353


def solve() -> None:
    """斐波那契递推，滚动变量 + 取模"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    a, b = 1, 1  # a = f(1), b = f(2)；滚动到 a = f(n+1)
    for _ in range(n):
        a, b = b, (a + b) % MOD
    sys.stdout.write(str(a % MOD) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("1\n", "1"),
        ("4\n", "5"),
        ("721\n", "670483856"),
        ("2\n", "2"),
        ("3\n", "3"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()

# @nc code=end
