# @nc app=nowcoder id=22fdeb9610ef426f9505e3ab60164c93 topic=37 question=21304 lang=Python3
# 2026-09-25 15:42:21
# https://www.nowcoder.com/practice/22fdeb9610ef426f9505e3ab60164c93?tpId=37&tqId=21304
# [HJ81] 字符串字符匹配

"""
HJ81. 字符串字符匹配 —— 集合 / 字符串

题目描述：
判断短字符串 S 中的所有字符是否都在长字符串 T 中出现。
（注意：这里的字符指的是字符，而非子串；不区分顺序，只关心是否出现。）

输入格式：
- 第1行：短字符串
- 第2行：长字符串

输出格式：
- 若短串每个字符都在长串中出现，输出 "true"，否则输出 "false"。

核心思路：
- 将长字符串转为集合，然后遍历短字符串的每个字符检查是否在集合中。
- 时间复杂度 O(len(S) + len(T))，空间复杂度 O(len(T))。
"""

# @sample-start
"""
样例输入 1:
bc
abc

样例输出 1:
true
"""
# @sample-end

# @sample-start
"""
样例输入 2:
aDc
abc

样例输出 2:
false
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    if len(data) < 2:
        print("false")
        return
    short_s = data[0].decode()
    long_s = data[1].decode()

    long_set = set(long_s)  # 长串字符集合，O(1) 查询
    # 短串每个字符都出现在长串集合中
    result = all(ch in long_set for ch in short_s)
    print("true" if result else "false")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("bc\nabc\n", "true"),
        ("aDc\nabc\n", "false"),
        ("abc\nabc\n", "true"),
        ("z\nabc\n", "false"),
        ("", "false"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        class FakeStdin:
            def __init__(self, s):
                self.buffer = io.BytesIO(s.encode())
        sys.stdin = FakeStdin(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end