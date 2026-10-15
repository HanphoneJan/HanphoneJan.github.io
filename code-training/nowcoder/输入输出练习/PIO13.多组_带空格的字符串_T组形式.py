# @nc app=nowcoder id=cff28a28d7f54419a640a8bb19f4275f topic=372 question=10979388 lang=Python3
# 2026-10-15 20:10:36
# https://www.nowcoder.com/practice/cff28a28d7f54419a640a8bb19f4275f?tpId=372&tqId=10979388
# [PIO13] 多组_带空格的字符串_T组形式

"""
PIO13. 多组 带空格的字符串（T 组形式）—— ACM 输入输出基础

题目描述：
给定 T 组询问，每次给出一个长度为 n 的带空格的字符串 s（仅含小写英文
字符和空格，且首尾都不是空格），请你去掉空格之后，将其倒置并输出。

输入格式：
第一行一个整数 T。
随后 T 组数据。每组的第一行有一个整数 n。
每组的第二行有一个字符串 s（可能包含空格）。

输出格式：
输出 T 行，每行一个字符串，代表「去掉空格并倒置」后的 s。

核心思路：
关键在于必须用 sys.stdin.readline 逐行读，因为字符串里含有空格 ——
如果像读整数那样用 read().split()，空格会被当成 token 分隔符，
一个字符串会被拆成好几段，结果就错了。
读入后：s.replace(" ", "") 去空格，再 [::-1] 倒置。

时间复杂度：O(Σn)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3
9
one space
11
two  spaces
14
three   spaces

样例输出 1:
ecapseno
secapsowt
secapseerht
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读取 T 组带空格的字符串，去空格后倒置输出"""
    input = sys.stdin.readline
    t_line = input()
    if not t_line:
        return
    t = int(t_line)
    out = []
    for _ in range(t):
        _n = int(input())                  # 长度，仅用于读掉这一行
        s = input().rstrip("\n")           # 整行读取，保留中间的空格
        out.append(s.replace(" ", "")[::-1])
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3\n9\none space\n11\ntwo  spaces\n14\nthree   spaces\n",
         "ecapseno\nsecapsowt\nsecapseerht"),
        ("1\n3\na b\n", "ba"),
        ("2\n1\na\n3\n  a\n", "a\na"),  # 去空格后再倒置
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
