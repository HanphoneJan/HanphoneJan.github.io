# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/dcce2d0cc8f740c29e0885df96c9d625
# 23年OPPO-a的翻转（2023 秋招 · 研发岗）

"""
23年OPPO-a的翻转 —— 字符串 / 模拟

题目描述：
把正整数 a 的十进制数位左右翻转得到 b，求 a + b。

输入格式：
一行一个正整数 a（1 <= a <= 10^9），保证 a 在十进制下每一位都不是 0。

输出格式：
一行一个正整数，即 a + b。

核心思路：
数位翻转就是把十进制表示倒着写一遍。把 a 转成字符串、反转、再转回整数，
得到的就是 b，两者相加即可。

题面保证每一位都非 0，所以反转后不会出现前导零，
「倒着写的字符串」和「数字 b」是一一对应的，不必额外处理。

时间复杂度：O(d)，d 为 a 的位数（最多 10 位）
空间复杂度：O(d)
"""

# @sample-start
"""
样例输入 1:
12

样例输出 1:
33

样例输入 2:
23

样例输出 2:
55
"""
# @sample-end

import sys


def solve() -> None:
    """把 a 的数位翻转得到 b，输出 a + b"""
    data = sys.stdin.read().split()
    if not data:
        return
    a = int(data[0])
    # 数位翻转：字符串反转后转回整数
    b = int(str(a)[::-1])
    sys.stdout.write(str(a + b) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("12\n", "33"),                 # 样例 1
        ("23\n", "55"),                 # 样例 2
        ("9\n", "18"),                  # 只有一位，翻转后还是自己
        ("12345\n", "66666"),           # 多位：12345 + 54321
        ("999999999\n", "1999999998"),  # a 的上界附近，答案超过 10 位
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
