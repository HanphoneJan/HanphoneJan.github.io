# @nc app=nowcoder id=2aa32b378a024755a3f251e75cbf233a topic=37 question=21252 lang=Python3
# 2026-09-29 01:08:15
# https://www.nowcoder.com/practice/2aa32b378a024755a3f251e75cbf233a?tpId=37&tqId=21252
# [HJ29] 字符串加解密

"""
HJ29. 字符串加解密 —— 字符串 / 模拟

题目描述：
加密规则：
- 字母：按字母表后移一位，同时改变大小写。如 a→B，A→b，z→A，Z→a。
- 数字：增加 1，9→0。
解密规则为加密的逆过程。

输入格式：
- 第1行：明文，仅含字母和数字
- 第2行：密文，仅含字母和数字

输出格式：
- 第1行：加密后的明文
- 第2行：解密后的密文

核心思路：
- 加密：字母后移一位并切换大小写；数字 +1。
- 解密：字母前移一位并切换大小写；数字 -1。
- 用取模运算处理边界（z→A，Z→a，9→0）。
"""

# @sample-start
"""
样例输入 1:
abcdefg1
0BCDEFGH

样例输出 1:
BCDEFGH2
9abcdefg
"""
# @sample-end

# @nc code=start

import sys


def encrypt(ch: str) -> str:
    """加密单个字符：字母后移一位并切换大小写，数字 +1"""
    if ch.islower():
        return chr((ord(ch) - ord('a') + 1) % 26 + ord('A'))  # a→B, z→A
    if ch.isupper():
        return chr((ord(ch) - ord('A') + 1) % 26 + ord('a'))  # A→b, Z→a
    if ch.isdigit():
        return str((int(ch) + 1) % 10)                         # 9→0
    return ch


def decrypt(ch: str) -> str:
    """解密单个字符：字母前移一位并切换大小写，数字 -1"""
    if ch.islower():
        return chr((ord(ch) - ord('a') - 1) % 26 + ord('A'))  # a→Z, b→A
    if ch.isupper():
        return chr((ord(ch) - ord('A') - 1) % 26 + ord('a'))  # B→a, A→z
    if ch.isdigit():
        return str((int(ch) - 1) % 10)                         # 0→9
    return ch


def solve() -> None:
    """主求解函数"""
    plain = sys.stdin.readline().strip()
    cipher = sys.stdin.readline().strip()
    print(''.join(encrypt(c) for c in plain))
    print(''.join(decrypt(c) for c in cipher))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("abcdefg1\n0BCDEFGH\n", "BCDEFGH2\n9abcdefg"),
        ("aZ9\nB0A\n", "Ba0\na9z"),
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