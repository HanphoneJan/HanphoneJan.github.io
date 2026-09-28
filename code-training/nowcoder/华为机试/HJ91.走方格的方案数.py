# @nc app=nowcoder id=e2a22f0305eb4f2f9846e7d644dba09b topic=37 question=21314 lang=Python3
# 2026-09-29 01:14:30
# https://www.nowcoder.com/practice/e2a22f0305eb4f2f9846e7d644dba09b?tpId=37&tqId=21314
# [HJ91] 走方格的方案数

"""
HJ91. 走方格的方案数 —— 动态规划 / 组合数

题目描述：
在 n×m 的方格矩阵中，从左上角走到右下角，每次只能向右或向下走一格，
问有多少种不同的走法。

输入格式：
一行两个整数 n、m。

输出格式：
方案数（整数）。

核心思路：
- dp[i][j] = 到达 (i,j) 的方案数。
- 边界：第一行、第一列均为 1（只能直线走）。
- 转移：dp[i][j] = dp[i-1][j] + dp[i][j-1]（来自上方 + 来自左方）。
- 等价组合数公式：C(n+m, n)。
"""

# @sample-start
"""
样例输入 1:
2 3

样例输出 1:
10
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    n, m = map(int, sys.stdin.readline().split())

    # dp[i][j] 表示从 (0,0) 到 (i,j) 的方案数
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = 1          # 第一列只有向下一路
    for j in range(m + 1):
        dp[0][j] = 1          # 第一行只有向右一路

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]

    print(dp[n][m])


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("2 3\n", "10"),
        ("1 1\n", "2"),
        ("0 0\n", "1"),
        ("2 2\n", "6"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end