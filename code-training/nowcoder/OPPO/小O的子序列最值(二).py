# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/ccde5aaa096f418b81ee6ed9dc253504
# 小O的子序列最值(二)（OPPO 2024 秋招 · 移动开发）

"""
小O的子序列最值(二) —— 计数 / 组合数学 / 前缀和

题目描述：
给定两个长度为 n 的数组 a、b，从两个数组中各选一个非空子序列，
要求 a 所选的子序列的最大值不大于 b 所选的子序列的最小值，
求满足条件的选取方案数，答案对 1e9+7 取模。

输入格式：
第一行一个整数 n。
第二行 n 个整数，表示数组 a。
第三行 n 个整数，表示数组 b。

输出格式：
一个整数，表示方案数对 1e9+7 取模的结果。

核心思路：
1. 「选子序列」等价于「选一个非空下标集合」，方案数只与下标集合有关。
2. 设 a 选出部分的最大值恰为 x、b 选出部分的最小值恰为 y，条件就是 x <= y。
   于是答案 = Σ_{x <= y} cnt_a[x] * cnt_b[y]。
3. cnt_a[x]（最大值恰好是 x 的非空子集个数）：设有 k 个元素等于 x、
   有 c 个元素小于 x，则必须至少选一个 x，其余更小的元素随意 ——
   cnt_a[x] = (2^k - 1) * 2^c。
4. cnt_b[y]（最小值恰好是 y 的非空子集个数）：设有 k 个元素等于 y、
   有 c' 个元素大于 y，同理 cnt_b[y] = (2^k - 1) * 2^c'。
5. 把两边的取值合并升序扫描，扫描时维护「最大值 <= 当前值的 a 子集总数」
   这个前缀和，就能一边扫一边累加答案，避免 O(n^2) 的枚举。

时间复杂度：O(n log n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
2
1 2
3 4

样例输出 1:
9

说明：a 的任意非空子序列最大值都不超过 2，b 的任意非空子序列最小值都不小于 3，
两两组合全部合法，共 3 * 3 = 9 种。
"""
# @sample-end

import sys
from collections import Counter

MOD = 10 ** 9 + 7


def solve() -> None:
    """按「最大值 / 最小值」分类计数，再用前缀和合并"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    n = int(data[0])
    a = list(map(int, data[1:1 + n]))
    b = list(map(int, data[1 + n:1 + 2 * n]))

    # 2 的幂表：2^0 .. 2^n
    pow2 = [1] * (n + 1)
    for i in range(1, n + 1):
        pow2[i] = pow2[i - 1] * 2 % MOD

    ca = Counter(a)
    cb = Counter(b)

    ans = 0
    cum_a = 0    # 最大值 <= 当前值的 a 非空子集总数
    less_a = 0   # 已经扫过的 a 元素个数（都严格小于当前值）
    b_le = 0     # 已经扫过的 b 元素个数（都 <= 当前值）

    for v in sorted(set(a) | set(b)):
        ka = ca.get(v, 0)
        kb = cb.get(v, 0)
        b_le += kb

        if ka:
            # 最大值恰为 v：至少选一个 v，更小的元素任选
            ways_a = (pow2[ka] - 1) * pow2[less_a] % MOD
            cum_a = (cum_a + ways_a) % MOD
            less_a += ka

        if kb:
            # 最小值恰为 v：至少选一个 v，更大的元素任选
            greater_b = n - b_le
            ways_b = (pow2[kb] - 1) * pow2[greater_b] % MOD
            ans = (ans + ways_b * cum_a) % MOD

    sys.stdout.write(str(ans) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("2\n1 2\n3 4\n", "9"),                  # 题面样例
        ("1\n5\n3\n", "0"),                      # 无解，方案数 0
        ("1\n3\n3\n", "1"),                      # 相等时唯一方案
        ("2\n1 1\n1 1\n", "9"),                  # 3 * 3 全部合法
        ("3\n1 2 2\n2 3 3\n", "49"),             # 重复值分别计数
        ("2\n2 1\n1 2\n", "5"),                  # 顺序不影响结果
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
