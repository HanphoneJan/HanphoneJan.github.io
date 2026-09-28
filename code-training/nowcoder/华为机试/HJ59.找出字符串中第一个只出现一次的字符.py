# @nc app=nowcoder id=e896d0f82f1246a3aa7b232ce38029d4 topic=37 question=21282 lang=Python3
# 2026-09-29 01:11:06
# https://www.nowcoder.com/practice/e896d0f82f1246a3aa7b232ce38029d4?tpId=37&tqId=21282
# [HJ59] 找出字符串中第一个只出现一次的字符

"""
HJ59. 找出字符串中第一个只出现一次的字符 —— 字符串 / 计数

题目描述：
找出字符串中第一个只出现一次的字符。若不存在，输出 -1。

输入格式：
一行字符串。

输出格式：
第一个只出现一次的字符，否则输出 -1。

核心思路：
- 先统计每个字符的出现次数。
- 再从左到右扫描，第一个计数为 1 的字符即答案。
- 时间复杂度 O(n)，空间复杂度 O(1)（字符集有限）。
"""

# @sample-start
"""
样例输入 1:
asdfasdfo

样例输出 1:
o
"""
# @sample-end

# @sample-start
"""
样例输入 2:
aabbcc

样例输出 2:
-1
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    s = sys.stdin.readline().strip()
    if not s:
        print(-1)
        return

    # 统计每个字符出现次数
    cnt = {}
    for ch in s:
        cnt[ch] = cnt.get(ch, 0) + 1

    # 找第一个只出现一次的字符
    for ch in s:
        if cnt[ch] == 1:
            print(ch)
            return
    print(-1)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("asdfasdfo\n", "o"),
        ("aabbcc\n", "-1"),
        ("abc\n", "a"),
        ("a\n", "a"),
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