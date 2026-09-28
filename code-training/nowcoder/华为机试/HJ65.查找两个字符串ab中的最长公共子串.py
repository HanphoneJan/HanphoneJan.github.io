# @nc app=nowcoder id=181a1a71c7574266ad07f9739f791506 topic=37 question=21288 lang=Python3
# 2026-09-29 01:11:12
# https://www.nowcoder.com/practice/181a1a71c7574266ad07f9739f791506?tpId=37&tqId=21288
# [HJ65] 查找两个字符串a,b中的最长公共子串

"""
HJ65. 查找两个字符串a,b中的最长公共子串 —— 动态规划

题目描述：
给定两个字符串 a 和 b，找出它们的最长公共子串。
若存在多个答案，输出在较短串中最先出现的那个。

输入格式：
- 第1行：字符串 a（小写字母）
- 第2行：字符串 b（小写字母）

输出格式：
最长公共子串；若有多个，输出较短串中最先出现的。

核心思路：
- 用二维 DP：dp[i][j] 表示以 a[i-1]、b[j-1] 结尾的公共子串长度。
  - 若 a[i-1]==b[j-1]，dp[i][j]=dp[i-1][j-1]+1；否则为 0。
- 把较短串作为 a，按 i 递增遍历，当 dp[i][j] 超过当前最大值时更新，
  从而保证"较短串中最先出现"的最大子串被记录。
- 时间复杂度 O(n·m)，空间 O(n·m)（可滚动优化）。
"""

# @sample-start
"""
样例输入 1:
awaabb
aawbb

样例输出 1:
aa
"""
# @sample-end

# @sample-start
"""
样例输入 2:
abcdefghijklmnop
abcsafjklmnopqrstuvw

样例输出 2:
jklmnop
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    a = sys.stdin.readline().strip()
    b = sys.stdin.readline().strip()

    # 让 a 为较短串，保证"较短串中最先出现"
    if len(a) > len(b):
        a, b = b, a

    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    best = 0
    end = 0  # 在较短串 a 中的结束下标（开区间）

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                if dp[i][j] > best:   # 仅严格大于才更新，保留"最先出现"
                    best = dp[i][j]
                    end = i
            else:
                dp[i][j] = 0

    print(a[end - best:end])


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("awaabb\naawbb\n", "aa"),
        ("abcdefghijklmnop\nabcsafjklmnopqrstuvw\n", "jklmnop"),
        ("abc\nabc\n", "abc"),
        ("abc\ndef\n", ""),
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
        print(f"样例 {i}: {status} 期望={expected!r}, 实际={output!r}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end