# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/c7e5b649799845dca44b2f9ba0f02177
# 小O的子序列最值（OPPO 2024 秋招 · 移动开发）

"""
小O的子序列最值 —— 排序 / 贪心 / 二分

题目描述：
给定两个长度为 n 的数组 a、b，从两个数组中各选一个非空子序列，
要求 a 所选的子序列的最大值不大于 b 所选的子序列的最小值，
求两个子序列的长度之和的最大值；无解输出 -1。

输入格式：
第一行一个整数 n。
第二行 n 个整数，表示数组 a。
第三行 n 个整数，表示数组 b。

输出格式：
一个整数，表示最大长度之和；无法选出满足条件的子序列时输出 -1。

核心思路：
1. 子序列的「最大值 / 最小值」与顺序无关，所以「选子序列」等价于
   「选任意一个非空下标集合」。
2. 设 a 选出部分的最大值为 x、b 选出部分的最小值为 y，条件就是 x <= y。
3. 固定门槛 v = y，则 a 中所有 <= v 的元素都可以放心选进来（最大值仍 <= v），
   b 中所有 >= v 的元素也都可以选进来（最小值仍 >= v）。
   于是该门槛下的候选答案 = cnt_a(<= v) + cnt_b(>= v)，
   且两边的计数都必须大于 0（子序列非空）。
4. 最优解的 y 一定取自数组 b 的某个元素，因此只需枚举 b 中的每个取值，
   排序后二分即可常数时间算出两个计数。

时间复杂度：O(n log n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
1 2 3 4
3 4 5 6

样例输出 1:
7

说明：第一段取 [1,2,3,4]，第二段取 [4,5,6]，长度之和为 7。
"""
# @sample-end

import sys
from bisect import bisect_left, bisect_right


def solve() -> None:
    """枚举阈值 v，统计 a 中 <= v 与 b 中 >= v 的元素个数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    n = int(data[0])
    a = sorted(map(int, data[1:1 + n]))
    b = list(map(int, data[1 + n:1 + 2 * n]))
    sb = sorted(b)

    best = -1
    # 阈值只需要枚举 b 中出现过的值：最优解里 b 的最小值本身就是 b 的某个元素
    for v in set(b):
        ca = bisect_right(a, v)          # a 中 <= v 的个数
        if ca == 0:                      # a 这边必须非空
            continue
        cb = n - bisect_left(sb, v)      # b 中 >= v 的个数
        if cb == 0:                      # b 这边必须非空
            continue
        if ca + cb > best:
            best = ca + cb

    sys.stdout.write(str(best) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("4\n1 2 3 4\n3 4 5 6\n", "7"),          # 题面样例
        ("1\n1\n2\n", "2"),                      # 单个元素，条件成立
        ("1\n5\n3\n", "-1"),                     # 单个元素，条件不成立
        ("1\n3\n3\n", "2"),                      # 相等也满足 <=
        ("3\n2 2 2\n2 2 2\n", "6"),              # 重复值全部可用
        ("5\n9 1 8 2 7\n5 4 6 3 10\n", "7"),     # a 排序后 <=6 有三个，b 中 >=6 有四个
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
