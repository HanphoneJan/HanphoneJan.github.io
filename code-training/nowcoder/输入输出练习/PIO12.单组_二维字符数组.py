# @nc app=nowcoder id=2316c1fedff14a8d91694a26c9da3310 topic=372 question=10979383 lang=Python3
# 2026-10-15 20:10:33
# https://www.nowcoder.com/practice/2316c1fedff14a8d91694a26c9da3310?tpId=372&tqId=10979383
# [PIO12] 单组_二维字符数组

"""
PIO12. 单组 二维字符数组 —— ACM 输入输出基础

题目描述：
给定一个 n 行 m 列的二维字符数组 A（仅含小写英文字符），
请你对「行和列都倒置」，然后输出。

输入格式：
第一行有两个整数 n 和 m。
随后 n 行，每行有 m 个字符，仅包含小写英文字符。

输出格式：
输出倒置后的二维字符数组，共 n 行，每行 m 个字符。

核心思路：
「行和列都倒置」等价于把整个矩阵旋转 180°：
1. 先把行顺序倒过来（最后一行挪到第一行）；
2. 再把每一行内部倒过来。
两件事合并成一行：reversed(rows) 外层遍历，每行再 [::-1]。

时间复杂度：O(n * m)
空间复杂度：O(n * m)（保存倒置结果）
"""

# @sample-start
"""
样例输入 1:
3 4
abcd
efgh
ijkl

样例输出 1:
lkji
hgfe
dcba
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """把二维字符数组旋转 180° 后输出"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    m = int(data[1])  # noqa: F841  (列数：每行字符串长度天然是 m)
    rows = data[2:2 + n]
    # 行倒置 + 每行倒置
    out = [row[::-1] for row in reversed(rows)]
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3 4\nabcd\nefgh\nijkl\n", "lkji\nhgfe\ndcba"),
        ("1 1\na\n", "a"),
        ("2 2\nab\ncd\n", "dc\nba"),
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
