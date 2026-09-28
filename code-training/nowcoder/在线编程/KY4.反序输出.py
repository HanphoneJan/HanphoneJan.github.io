# @nc app=nowcoder id=171278d170c64d998ab342b3b40171bb topic=-1 question=21336 lang=Python3
# 2026-09-25 16:15:27
# https://www.nowcoder.com/practice/171278d170c64d998ab342b3b40171bb?tpId=-1&tqId=21336
# [KY4] 反序输出

"""
KY4. 反序输出 —— 字符串基础

题目描述：
输入任意 4 个字符（如 abcd），按反序输出（如 dcba）。
题目可能包含多组用例，每组用例占一行，包含 4 个任意的字符。

输入格式：
多行，每行 4 个字符（可能有空格等，但通常为普通字符）。

输出格式：
对每组输入，输出一行反序后的字符串。

核心思路：
- 逐行读取，去掉末尾换行后反转（[::-1]）输出。
- Python 切片反转 [::-1] 是最简洁的反转方式。
"""

# @sample-start
"""
样例输入 1:
Upin
cvYj
WJpw
cXOA

样例输出 1:
nipU
jYvc
wpJW
AOXc
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数：逐行读取并反序输出"""
    for line in sys.stdin:
        s = line.rstrip('\n').rstrip('\r')  # 去掉换行符
        print(s[::-1])                      # 切片反转


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("Upin\ncvYj\nWJpw\ncXOA\n",
         "nipU\njYvc\nwpJW\nAOXc"),
        ("abcd\n", "dcba"),
        ("a b\n", "b a"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected!r}, 实际={output!r}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end