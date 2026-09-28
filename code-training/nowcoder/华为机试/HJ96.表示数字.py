# @nc app=nowcoder id=637062df51674de8ba464e792d1a0ac6 topic=37 question=21319 lang=Python3
# 2026-09-29 01:14:55
# https://www.nowcoder.com/practice/637062df51674de8ba464e792d1a0ac6?tpId=37&tqId=21319
# [HJ96] 表示数字

"""
HJ96. 表示数字 —— 字符串 / 正则

题目描述：
将字符串中每一个连续的数字串用符号 "*" 括起来，其余字符不变。

输入格式：
一行字符串（可能含字母、数字等）。

输出格式：
处理后的字符串：每个连续数字段前后各加一个 "*"。

核心思路：
- 用正则匹配所有连续数字段 \d+，替换为 *\1*。
- 非数字字符保持不变。
"""

# @sample-start
"""
样例输入 1:
Jkdi234klowe90a3

样例输出 1:
Jkdi*234*klowe*90*a*3*
"""
# @sample-end

# @nc code=start

import sys
import re


def solve() -> None:
    """主求解函数"""
    s = sys.stdin.readline().strip()
    # 连续数字段用 * 括起来
    result = re.sub(r'(\d+)', r'*\1*', s)
    print(result)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("Jkdi234klowe90a3\n", "Jkdi*234*klowe*90*a*3*"),
        ("abc\n", "abc"),
        ("123\n", "*123*"),
        ("1a2b3\n", "*1*a*2*b*3*"),
        ("\n", ""),
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