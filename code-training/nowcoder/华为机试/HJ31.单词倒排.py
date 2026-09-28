# @nc app=nowcoder id=81544a4989df4109b33c2d65037c5836 topic=37 question=38366 lang=Python3
# 2026-09-29 01:08:38
# https://www.nowcoder.com/practice/81544a4989df4109b33c2d65037c5836?tpId=37&tqId=38366
# [HJ31] 单词倒排

"""
HJ31. 单词倒排 —— 字符串 / 正则

题目描述：
对字符串中的所有单词进行倒排，单词之间以空格分隔。
"单词"由字母（A-Za-z）构成；字符串中的非字母字符（空格、数字、标点等）视为单词间的分隔符。

输入格式：
一行字符串（可能含空格、数字、标点）。

输出格式：
倒排后的单词序列，单词间以单个空格分隔。

核心思路：
- 用正则提取所有"连续字母"构成的单词。
- 将单词列表反转，再用空格连接。
"""

# @sample-start
"""
样例输入 1:
I am a student

样例输出 1:
student a am I
"""
# @sample-end

# @sample-start
"""
样例输入 2:
$bo*y gi!r#l

样例输出 2:
l r gi y bo
"""
# @sample-end

# @nc code=start

import sys
import re


def solve() -> None:
    """主求解函数"""
    s = sys.stdin.readline().strip()
    words = re.findall(r'[A-Za-z]+', s)  # 提取所有单词
    print(' '.join(words[::-1]))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("I am a student\n", "student a am I"),
        ("$bo*y gi!r#l\n", "l r gi y bo"),
        ("a b c\n", "c b a"),
        ("hello\n", "hello"),
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