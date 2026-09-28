# @nc app=nowcoder id=e4af1fe682b54459b2a211df91a91cf3 topic=37 question=21259 lang=Python3
# 2026-09-29 01:09:30
# https://www.nowcoder.com/practice/e4af1fe682b54459b2a211df91a91cf3?tpId=37&tqId=21259
# [HJ36] 字符串加密

"""
HJ36. 字符串加密 —— 字符串 / 映射

题目描述：
给定密钥底串 key 和明文：
1. 将 key 去重（保留每个字母第一次出现），得到 key 去重后的字符串；
2. 从 'a' 开始，把 26 个字母中 key 未出现过的字母依次补在末尾，构成完整的新字母表；
3. 加密：明文中的每个字母，替换为新字母表中"相同位置"的字母。

输入格式：
- 第1行：key（仅小写字母）
- 第2行：明文（仅小写字母）

输出格式：
加密后的密文。

核心思路：
- 构建新字母表：key 去重 + 补充缺失字母。
- 对明文每个字符，用新字母表[ord(ch)-97] 替换。
"""

# @sample-start
"""
样例输入 1:
trailblazers
attackatdawn

样例输出 1:
tpptadtpitvh
"""
# @sample-end

# @sample-start
"""
样例输入 2:
nihao
ni

样例输出 2:
le
"""
# @sample-end

# @nc code=start

import sys


def build_alphabet(key: str) -> str:
    """构建新字母表：key 去重 + 补充缺失字母"""
    seen = set()
    alpha = []
    for ch in key:
        if ch not in seen:
            seen.add(ch)
            alpha.append(ch)
    # 补充 a-z 中未出现的字母
    for ch in "abcdefghijklmnopqrstuvwxyz":
        if ch not in seen:
            alpha.append(ch)
    return ''.join(alpha)


def solve() -> None:
    """主求解函数"""
    key = sys.stdin.readline().strip()
    plain = sys.stdin.readline().strip()
    table = build_alphabet(key)
    result = ''.join(table[ord(c) - ord('a')] for c in plain)
    print(result)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("trailblazers\nattackatdawn\n", "tpptadtpitvh"),
        ("nihao\nni\n", "le"),
        ("abc\nabc\n", "abc"),
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