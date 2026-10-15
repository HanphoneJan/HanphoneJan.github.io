# @nc app=nowcoder id=25da45d0d4fb4faba45094cbb0649062 topic=389 question=11255450 lang=Python3
# 2026-10-15 20:09:44
# https://www.nowcoder.com/practice/25da45d0d4fb4faba45094cbb0649062?tpId=389&tqId=11255450
# [BISHI133] 最长不下降子序列

"""
BISHI133. 最长不下降子序列 —— 动态规划 / 贪心 + 二分

题目描述：
给定由 n 个正整数组成的数组 A，求它的最长不下降子序列（LNDS）长度。
「子序列」指删除任意个元素后、保持相对顺序得到的新数组；
「不下降」指序列中的每个元素都不小于前一个元素。

输入格式：
第一行一个整数 n，代表元素数量。
第二行 n 个整数 A[i]。

输出格式：
一行一个整数，表示最长不下降子序列的长度。

核心思路：
1. 暴力 DP：dp[i] 表示以 A[i] 结尾的最长不下降子序列长度，
   转移 dp[i] = max(dp[j] + 1)（j < i 且 A[j] <= A[i]），O(n^2)。
2. 贪心 + 二分：维护一个数组 tails，tails[k] 表示长度为 k+1 的
   不下降子序列「结尾元素的最小值」。遍历每个 x，用二分找到第一个
   「大于 x」的位置替换掉它（不下降用 bisect_right）。
   tails 的长度就是答案，整体 O(n log n)。

时间复杂度：O(n log n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
6
1 2 4 2 3 4

样例输出 1:
5
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5
5 4 3 2 1

样例输出 2:
1
"""
# @sample-end

# @nc code=start

import sys
from bisect import bisect_right


def solve() -> None:
    """O(n log n) 求最长不下降子序列长度"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = list(map(int, data[1:1 + n]))

    tails = []  # tails[k] = 长度 k+1 的不下降子序列的最小结尾
    for x in arr:
        # 不下降：找第一个「大于 x」的位置替换（相等可以接在后面）
        pos = bisect_right(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    sys.stdout.write(str(len(tails)) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("6\n1 2 4 2 3 4\n", "5"),
        ("5\n5 4 3 2 1\n", "1"),
        ("4\n1 1 1 1\n", "4"),   # 全部相等也是不下降
        ("3\n1 3 2\n", "2"),
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
