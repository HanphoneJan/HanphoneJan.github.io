# @nc app=nowcoder id=98dc82c094e043ccb7e0570e5342dd1b topic=37 question=21298 lang=Python3
# 2026-09-29 01:11:31
# https://www.nowcoder.com/practice/98dc82c094e043ccb7e0570e5342dd1b?tpId=37&tqId=21298
# [HJ75] 公共子串计算

"""
HJ75. 公共子串计算 —— 动态规划

题目描述：
给定两个字符串，计算它们的最长公共子串的长度。

输入格式：
- 第1行：字符串1
- 第2行：字符串2

输出格式：
最长公共子串的长度（整数）。

核心思路：
- dp[i][j]：以 a[i-1]、b[j-1] 结尾的最长公共子串长度。
  - a[i-1]==b[j-1] 时 dp[i][j]=dp[i-1][j-1]+1，否则为 0。
- 答案为所有 dp 的最大值。
- 时间复杂度 O(n·m)，空间可滚动到 O(m)。
"""

# @sample-start
"""
样例输入 1:
asdfas
werasdfaswer

样例输出 1:
6
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    a = sys.stdin.readline().strip()
    b = sys.stdin.readline().strip()
    n, m = len(a), len(b)

    # 滚动数组，只需保留上一行
    dp = [0] * (m + 1)
    best = 0
    for i in range(1, n + 1):
        prev = 0  # dp[i-1][j-1]
        for j in range(1, m + 1):
            cur = dp[j]  # 记录 dp[i-1][j]
            if a[i - 1] == b[j - 1]:
                dp[j] = prev + 1
                best = max(best, dp[j])
            else:
                dp[j] = 0
            prev = cur
    print(best)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("asdfas\nwerasdfaswer\n", "6"),
        ("abc\ndef\n", "0"),
        ("abc\nabc\n", "3"),
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