# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/80a2e1aa90a24841bb153d14f13aa24a
# 小O的数位翻转（OPPO 2024 秋招 · 研发通用岗 / 后端开发）

"""
小O的数位翻转 —— 位运算 / 数学

题目描述：
给定长度为 n 的数组 a，从中选出**一个**元素做「二进制翻转」：
把它写成二进制，去掉前导 0 之后反序。例如 12 = (1100)_2，翻转后是
(0011)_2 = 3。问有多少种选择方式，能使操作后的数组总和比不操作更大。

输入格式：
第一行一个正整数 n（1 <= n <= 2*10^5）。
第二行 n 个正整数 a_i（1 <= a_i <= 1e9）。

输出格式：
输出一个整数，表示合法的方案数。

核心思路：
操作只改动一个元素，操作后的总和是
    S - a_i + f(a_i)
其中 S 是原总和、f 是翻转函数。因此「总和变大」与其它元素无关，
等价于
    f(a_i) > a_i
逐个元素判断并计数即可；相同数值出现在不同下标是两种不同的选择方式，
所以按位置计数而不是按数值去重。

时间复杂度：O(n log A)，A 为元素最大值（二进制位数不超过 30）
空间复杂度：O(1)（不计输入本身）
"""

# @sample-start
"""
样例输入 1:
5
11 12 11 13 12

样例输出 1:
2

样例输入 2:
6
1 2 3 4 5 6

样例输出 2:
0
"""
# @sample-end

import sys


def bit_reverse(x: int) -> int:
    """把 x 的二进制表示反序（自动去掉反序后产生的前导 0）"""
    bits = bin(x)[2:]                 # 例如 12 -> '1100'
    return int(bits[::-1], 2)         # '0011' -> 3，int(..., 2) 会忽略前导 0


def solve() -> None:
    """逐个判断 f(a_i) > a_i 是否成立，统计个数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    cnt = 0
    for i in range(1, n + 1):
        x = int(data[i])
        if bit_reverse(x) > x:
            cnt += 1
    sys.stdout.write(str(cnt) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("5\n11 12 11 13 12\n", "2"),    # 题面样例 1：两个 11 都能变大
        ("6\n1 2 3 4 5 6\n", "0"),       # 题面样例 2
        ("1\n1\n", "0"),                 # 单个 1：(1)_2 反序还是 1
        ("2\n3 11\n", "1"),              # 3 -> 3 不变，11 -> 13 变大
        ("3\n7 5 9\n", "0"),             # 111 / 101 / 1001 都是二进制回文
        ("3\n19 21 22\n", "1"),          # 19 -> 25 变大，21 是回文，22 -> 13 变小
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        # 用带 .buffer 的文本流包一层，保证 solve() 里的 bytes 读取路径也被测到
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
