# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/1150d36c2cd64df9bf373988486c6723
# 压缩二维码（OPPO 2023 秋招 · 移动端岗）

"""
压缩二维码 —— 字符串 / 模拟 / 位运算

题目描述：
二维码是 2^n * 2^n 的黑白方格，'.' 为白（0）、'#' 为黑（1）。
逐行扫描得到一个长度为 4^n 的 01 串，再每 4 位合成一个整数输出。

输入格式：
第一行一个整数 n（1 <= n <= 10）。
接下来 2^n 行，每行 2^n 个字符，由 '.' 与 '#' 组成。

输出格式：
4^n / 4 个整数，空格分隔，每个整数是 4 位二进制对应的十进制值。

核心思路：
1. 边长 side = 2^n，逐行读入后按行优先拼成一条 01 串。
2. 每 4 个比特合成一个数：值 = b1*8 + b2*4 + b3*2 + b4*1，
   等价于把 4 位二进制串按整数解析。
3. side 最大 1024，总比特数最多 2^20，一次遍历即可完成。

时间复杂度：O(4^n)
空间复杂度：O(4^n)
"""

# @sample-start
"""
样例输入 1:
1
.#
#.

样例输出 1:
6

样例输入 2:
2
.##.
#..#
##..
...#

样例输出 2:
6 9 12 1

说明：逐行扫描得到 0110100111000001，四段分别是 0110 / 1001 / 1100 / 0001。
"""
# @sample-end

import sys


def solve() -> None:
    """按行优先拼比特串，每 4 位转一个整数"""
    data = sys.stdin.read().split()
    if not data:
        return

    n = int(data[0])
    side = 1 << n
    rows = data[1:1 + side]

    # 一行一行拼，'.' -> 0，'#' -> 1
    bits = "".join("1" if ch == "#" else "0" for row in rows for ch in row)

    out = [str(int(bits[i:i + 4], 2)) for i in range(0, len(bits), 4)]
    sys.stdout.write(" ".join(out) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("1\n.#\n#.\n", "6"),                                  # 题面样例 1
        ("2\n.##.\n#..#\n##..\n...#\n", "6 9 12 1"),            # 题面样例 2
        (
            "3\n#.##.#.#\n#..#.##.\n###.#.##\n####.##.\n"
            "##..#...\n.##.#.#.\n######.#\n...##.#.\n",
            "11 5 9 6 14 11 15 6 12 8 6 10 15 13 1 10",
        ),                                                      # 题面样例 3
        ("1\n..\n..\n", "0"),                                   # 全白
        ("1\n##\n##\n", "15"),                                  # 全黑
    ]

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.StringIO(inp)
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
