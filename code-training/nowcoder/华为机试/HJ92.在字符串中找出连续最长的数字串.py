# @nc app=nowcoder id=2c81f88ecd5a4cc395b5308a99afbbec topic=37 question=21315 lang=Python3
# 2026-09-25 15:45:17
# https://www.nowcoder.com/practice/2c81f88ecd5a4cc395b5308a99afbbec?tpId=37&tqId=21315
# [HJ92] 在字符串中找出连续最长的数字串

"""
HJ92. 在字符串中找出连续最长的数字串 —— 字符串 / 正则

题目描述：
在字符串中找出连续最长的数字串，并按格式输出。
- 若有多个最长数字串，则把它们全部输出（按出现顺序拼接在一起）。
- 输出格式为：所有最长数字串拼接 + ',' + 最长长度。

输入格式：
一行字符串。

输出格式：
拼接后的最长数字串 + ',' + 最长长度。

核心思路：
- 用正则 \d+ 提取所有连续数字串。
- 找到最大长度，把所有等于最大长度的数字串拼接，末尾加上 ',' 和长度。
"""

# @sample-start
"""
样例输入 1:
abcd12345ed125ss123456789

样例输出 1:
123456789,9
"""
# @sample-end

# @sample-start
"""
样例输入 2:
abcd12345ed125ss123058789

样例输出 2:
123058789,9
"""
# @sample-end

# @nc code=start

import sys
import re


def solve() -> None:
    """主求解函数"""
    s = sys.stdin.readline().strip()
    nums = re.findall(r'\d+', s)  # 提取所有连续数字串
    if not nums:
        return

    maxlen = max(len(x) for x in nums)
    res = ''.join(x for x in nums if len(x) == maxlen)
    print(f"{res},{maxlen}")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("abcd12345ed125ss123456789\n", "123456789,9"),
        ("abcd12345ed125ss123058789\n", "123058789,9"),
        ("abc123def456\n", "123456,3"),
        ("a1b22c333\n", "333,3"),
        ("abc\n", ""),
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
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end