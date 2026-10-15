# @nc app=nowcoder id=35f6f4e9173943e3b3f462b697fefd8b topic=372 question=10979378 lang=Python3
# 2026-10-15 20:10:29
# https://www.nowcoder.com/practice/35f6f4e9173943e3b3f462b697fefd8b?tpId=372&tqId=10979378
# [PIO11] 多组_字符串_T组形式

"""
PIO11. 多组 字符串（T 组形式）—— ACM 输入输出基础

题目描述：
给定 T 组询问，每次给出一个长度为 n 的字符串 s（仅含小写英文字母），
请你将其倒置后输出。

输入格式：
第一行一个整数 T。
随后 T 组数据。每组的第一行有一个整数 n，代表字符串长度。
每组的第二行有一个字符串 s。

输出格式：
输出 T 行，每行一个字符串，代表倒置后的 s。

核心思路：
逐行读入：先读 T，再对每组读长度 n 与字符串 s。
倒置用 Python 切片 s[::-1] 一步完成，时间复杂度 O(n)。

注意：n 是题面给出的长度，实际倒置直接用字符串本身即可，
不要依赖 n 去截取（除非题目另有说明）。

时间复杂度：O(Σn)
空间复杂度：O(n)（每个字符串的副本）
"""

# @sample-start
"""
样例输入 1:
3
5
abcde
8
redocwon
9
tfarcenim

样例输出 1:
edcba
nowcoder
minecraft
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读取 T 组字符串并倒置输出"""
    input = sys.stdin.readline
    t_line = input()
    if not t_line:
        return
    t = int(t_line)
    out = []
    for _ in range(t):
        _n = int(input())              # 长度，仅用于读掉这一行
        s = input().rstrip("\n")       # 字符串本体
        out.append(s[::-1])
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3\n5\nabcde\n8\nredocwon\n9\ntfarcenim\n", "edcba\nnowcoder\nminecraft"),
        ("1\n1\na\n", "a"),
        ("2\n3\nabc\n4\nabba\n", "cba\nabba"),
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
