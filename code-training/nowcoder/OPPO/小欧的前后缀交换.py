# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/79e1a3eb38cd4473b490172619326be2
# 小欧的前后缀交换（2024 秋招 · 移动端）

"""
小欧的前后缀交换 —— 字符串 / 模拟

题目描述：
给定一个只由 'o' 和 'p' 组成的字符串，把「开头尽可能多的连续 'o'」
与「结尾尽可能多的连续 'p'」交换一次，输出交换后的字符串。

输入格式：
一行一个字符串，长度不超过 100000。

输出格式：
一行，交换后的字符串。

核心思路：
先数清楚两段各有多长：
  - 前缀 'o' 的个数 i：从下标 0 开始数，遇到非 'o' 就停；
  - 后缀 'p' 的个数 j：从末尾开始数，遇到非 'p' 就停。

交换之后，原来的前缀位置全部变成 'p'（共 i 个），原来的后缀位置全部
变成 'o'（共 j 个），中间没参与交换的一段原样保留。于是结果就是：

    'p' * j + s[i : n - j] + 'o' * i

前缀段只含 'o'、后缀段只含 'p'，两段不可能重叠，所以直接切片不会越界。

时间复杂度：O(n)
空间复杂度：O(n)（构造结果字符串）
"""

# @sample-start
"""
样例输入 1:
ooppoopp

样例输出 1:
ppppoooo

样例输入 2:
ooooop

样例输出 2:
pooooo

样例输入 3:
ppppopo

样例输出 3:
ppppopo
"""
# @sample-end

import sys


def solve() -> None:
    """数出前缀 'o' 与后缀 'p' 的长度，拼出交换后的字符串"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    s = data[0].decode()
    n = len(s)

    i = 0
    while i < n and s[i] == 'o':      # 前缀连续 'o' 的个数
        i += 1

    j = 0
    while j < n and s[n - 1 - j] == 'p':  # 后缀连续 'p' 的个数
        j += 1

    result = 'p' * j + s[i:n - j] + 'o' * i
    sys.stdout.write(result + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("ooppoopp\n", "ppppoooo"),   # 样例 1
        ("ooooop\n", "pooooo"),       # 样例 2
        ("ppppopo\n", "ppppopo"),     # 样例 3：没有可交换的前缀或后缀
        ("o\n", "o"),                 # 只有一个 'o'
        ("p\n", "p"),                 # 只有一个 'p'
        ("op\n", "po"),               # 前缀、后缀各一个字符
        ("oooppp\n", "pppooo"),       # 前段与后段正好把整串分完
        ("pppooo\n", "pppooo"),       # 前后都没有可交换的段
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
