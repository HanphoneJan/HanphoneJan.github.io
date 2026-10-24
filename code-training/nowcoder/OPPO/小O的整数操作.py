# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/52e3cbb106d54366a3f5fefac03d169f
# 小O的整数操作（OPPO 2024 秋招 · AI/算法岗）

"""
小O的整数操作 —— 贪心 / 数学

题目描述：
给定整数 n，每次可以做两种操作之一：
  1. n = n - 1；
  2. n = n / k（仅当 n 能被 k 整除时）。
问把 n 变成 m 至少需要几次操作（保证 m <= n）。

输入格式：
一行三个整数 n、m、k（1 <= m <= n <= 1e9，1 <= k <= 1e9）。

输出格式：
输出一个整数，表示最少操作次数。

核心思路：
两种操作都只会让数变小，所以从 n 出发一路减到 m，每一步都做「当前最优」
的选择即可：
1. k = 1 时除法是原地踏步，没有意义，答案就是 n - m。
2. k >= 2 时，除法的收益远大于减法：只要能除，就应该除。
   - n 能被 k 整除：若 n/k >= m，除一次；若 n/k < m，除下去就越过 m 了，
     只能一路减到 m（此时一次除法反而更亏）。
   - n 不能被 k 整除：先减掉 n % k 把它变成 k 的倍数，再进入上面的分支。
     若连「减到最近的 k 的倍数」都会掉到 m 以下，就直接减到 m。
每除一次数至少减半，所以循环次数是 O(log n) 量级。

时间复杂度：O(log_k n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
10 4 2

样例输出 1:
2

说明：
先将 10 除以 2 得到 5，再将 5 减去 1 得到 4，共需要 2 次操作。
"""
# @sample-end

import sys


def solve() -> None:
    """贪心地「能除就除，除不动就先补到能除」"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n, m, k = int(data[0]), int(data[1]), int(data[2])

    if k == 1:                     # 除法原地踏步，只剩减法
        sys.stdout.write(str(n - m) + "\n")
        return

    ans = 0
    while n > m:
        if n % k == 0:
            if n // k >= m:        # 除完不会越过 m，除是划算的
                n //= k
                ans += 1
            else:                  # 除完就比 m 小了，只能减
                ans += n - m
                break
        else:
            r = n % k              # 先减到最近的 k 的倍数
            if n - r >= m:
                n -= r
                ans += r
            else:                  # 减不到下一个倍数，直接减到 m
                ans += n - m
                break

    sys.stdout.write(str(ans) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("10 4 2\n", "2"),            # 题面样例：10 -> 5 -> 4
        ("10 10 2\n", "0"),           # 已经相等
        ("1 1 1\n", "0"),             # 最小规模
        ("9 1 3\n", "2"),             # 9 -> 3 -> 1
        ("7 3 2\n", "2"),             # 7 -> 6 -> 3
        ("10 6 2\n", "4"),            # 除以 2 会到 5 < 6，只能一路减
        ("5 4 1\n", "1"),             # k = 1，只能减
        ("1000000000 1 1000000000\n", "1"),  # 一次除法到 1
        ("10 9 1000\n", "1"),         # k 比 n 大，除法用不上
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
