# @nc app=nowcoder id=181a1a71c7574266ad07f9739f791506 question=36889 lang=Python3
# 2026-09-29
# https://www.nowcoder.com/practice/181a1a71c7574266ad07f9739f791506
# [HJ21] 查找两个字符串a,b中的最长公共子串
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
