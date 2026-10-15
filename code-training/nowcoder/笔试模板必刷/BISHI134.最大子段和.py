# @nc app=nowcoder id=f04519cd1d904f50b68f4229a126ab08 topic=389 question=10766281 lang=Python3
# 2026-10-15 20:09:46
# https://www.nowcoder.com/practice/f04519cd1d904f50b68f4229a126ab08?tpId=389&tqId=10766281
# [BISHI134] 最大子段和

"""
BISHI134. 最大子段和 —— 动态规划（Kadane 算法）

题目描述：
给定一个长度为 n 的整数数组 A。请你从中选取一个非空子数组，
使得其元素之和最大，求出这个最大和。
「子数组」指从原数组中连续选取一段元素。

输入格式：
第一行一个整数 n，代表数组长度。
第二行 n 个整数 A[i]。

输出格式：
一行一个整数，代表所能得到的最大子数组元素和。

核心思路（Kadane）：
设 cur 为「以当前元素结尾的最大子数组和」，best 为全局最大值。
每遇到一个新元素 x：
    cur = max(x, cur + x)
    best = max(best, cur)
含义：要么从 x 重新开始一段，要么把它接到前面那段后面。
因为是「非空子数组」，初值必须取 A[0] 而不是 0，
否则数组全为负数时会错误地返回 0。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
4
2 2 -3 2

样例输出 1:
4
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4
2 -1 3 -1

样例输出 2:
4
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """Kadane 算法求最大子段和（非空）"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = list(map(int, data[1:1 + n]))

    best = cur = arr[0]  # 非空：用首元素初始化
    for x in arr[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    sys.stdout.write(str(best) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("4\n2 2 -3 2\n", "4"),
        ("4\n2 -1 3 -1\n", "4"),
        ("3\n-1 -2 -3\n", "-1"),      # 必须非空，取最大的单个负数
        ("1\n-5\n", "-5"),
        ("5\n1 2 3 4 5\n", "15"),
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
