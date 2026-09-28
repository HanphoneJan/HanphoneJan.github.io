# @nc app=nowcoder id=6d9d69e3898f45169a441632b325c7b4 topic=37 question=21247 lang=Python3
# 2026-09-25 16:06:30
# https://www.nowcoder.com/practice/6d9d69e3898f45169a441632b325c7b4?tpId=37&tqId=21247
# [HJ24] 合唱队

"""
HJ24. 合唱队 —— 最长递增子序列（LIS）

题目描述：
N 位同学站成一排，音乐老师要请其中的 (N-K) 位同学出列，使得剩下的 K 位同学
排成合唱队形。合唱队形要求：从左到右先递增后递减，即存在一个"最高点"。
求最少需要出列多少人。

输入格式：
- 第1行：整数 N（同学人数）
- 第2行：N 个正整数，表示每个同学的身高

输出格式：
- 一个整数，表示最少需要出列的人数

核心思路：
- 合唱队形 = "先升后降"，最高点 k 处要求：
  左侧 [0..k] 严格递增、右侧 [k..N-1] 严格递减。
- 用两次最长递增子序列（LIS）：
  - inc[i]：以位置 i 结尾的最长递增子序列长度（从左到右）
  - dec[i]：以位置 i 结尾的最长递增子序列长度（从右到左）
- 位置 i 作为最高点时，最多可保留人数 = inc[i] + dec[i] - 1。
- 最少出列人数 = N - max(inc[i] + dec[i] - 1)。
"""

# @sample-start
"""
样例输入 1:
8
186 186 150 200 160 130 197 200

样例输出 1:
4
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6
2 1 5 3 4 2

样例输出 2:
2
"""
# @sample-end

# @nc code=start

import sys


def lis_len(seq):
    """返回以每个位置结尾的最长递增子序列长度列表

    经典 LIS：遍历每个元素，往前找比自己小且 dp 值最大的位置，加 1。
    注意本题"严格递增"，需要严格小于才可接续。
    """
    n = len(seq)
    dp = [1] * n
    for i in range(n):
        for j in range(i):
            if seq[j] < seq[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return dp


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    heights = list(map(int, data[1:1 + n]))

    inc = lis_len(heights)                      # 从左到右 LIS
    dec = lis_len(heights[::-1])[::-1]          # 从右到左 LIS（反转后算再反转回来）

    max_keep = max(inc[i] + dec[i] - 1 for i in range(n))
    print(n - max_keep)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("8\n186 186 150 200 160 130 197 200\n", "4"),
        ("6\n2 1 5 3 4 2\n", "2"),
        ("3\n1 2 3\n", "0"),
        ("1\n100\n", "0"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        class FakeStdin:
            def __init__(self, s):
                self.buffer = io.BytesIO(s.encode())
        sys.stdin = FakeStdin(inp)
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