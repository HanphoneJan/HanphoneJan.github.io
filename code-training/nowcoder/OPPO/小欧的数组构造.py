# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/7e86d90777ad41e4a59d2e937bf9afc2
# 小欧的数组构造（2024 秋招 · 移动端）

"""
小欧的数组构造 —— 数学 / 事件扫描

题目描述：
已知数组 b，其中 b_i = a_i + a_{i+1}（1 <= i <= n-1）。
问原来的整数数组 a 中最多可能有多少个正数。

输入格式：
第一行一个整数 n（2 <= n <= 10^5）。
第二行 n-1 个整数 b_i（-10^9 <= b_i <= 10^9）。

输出格式：
一个整数，表示 a 中最多可能有多少个正数。

核心思路：
只要确定 a_1 = x，整个数组就被 b 唯一确定：
a_2 = b_1 - x，a_3 = b_2 - a_2 = b_2 - b_1 + x，……
把通项写成 a_i = c_i + s_i * x，其中 s_i = (-1)^(i-1)、c_1 = 0、c_{i+1} = b_i - c_i。
于是 a_i > 0 变成对 x 的一个单侧限制：
  - i 为奇数：x >= -c_i + 1
  - i 为偶数：x <= c_i - 1
x 的可行范围是无限的，枚举 x 不现实；但答案只会在这 2n 个「分界点」处发生变化，
所以把每个限制当成一条事件（进入时 +1、离开时 -1），按 x 从小到大扫一遍，
过程中出现的最大值就是答案。

时间复杂度：O(n log n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3
1 2

样例输出 1:
2
"""
# @sample-end

import sys


def solve():
    """把每个 a_i > 0 化成对 a_1 = x 的区间限制，扫描分界点求最大值"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    b = [int(t) for t in data[1:1 + n - 1]]

    # c_1 = 0，c_i = b_{i-1} - c_{i-1}
    delta = {}          # x 走到这个位置时，「满足条件的个数」的变化量
    cur = 0             # 当前有 cur 个限制成立
    c = 0
    for i in range(1, n + 1):
        if i == 1:
            c = 0
        else:
            c = b[i - 2] - c
        if i % 2 == 1:
            # a_i = c + x > 0  =>  x >= -c + 1，即 x 到达该点时这个限制才成立
            pos = -c + 1
            delta[pos] = delta.get(pos, 0) + 1
        else:
            # a_i = c - x > 0  =>  x <= c - 1，即 x 越过 c-1 之后这个限制失效
            cur += 1                     # x 取 -inf 时偶数位全部为正
            pos = c                      # 走到 x = c 时 -1
            delta[pos] = delta.get(pos, 0) - 1

    best = cur
    for pos in sorted(delta):
        cur += delta[pos]
        if cur > best:
            best = cur

    sys.stdout.write(str(best) + "\n")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    tests = [
        # 题面样例
        ("3\n1 2\n", "2"),
        # n = 2：b = 5 时取 a = [1, 4]，两个都是正数
        ("2\n5\n", "2"),
        # n = 2：b = -3 时不可能两个都为正，最多 1 个
        ("2\n-3\n", "1"),
        # n = 2：b = 0 时 a 与 -a 相对，最多 1 个正数
        ("2\n0\n", "1"),
        # 正数 b 全为 1：a = [0, 1, 0, 1] 之类，最多 2 个正数
        ("4\n1 1 1\n", "2"),
    ]

    for i, (inp, expected) in enumerate(tests, 1):
        # 用 BytesIO 包一层，solve() 里的 sys.stdin.buffer 才有内容可读
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
