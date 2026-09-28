# @nc app=nowcoder id=995b8a548827494699dc38c3e2a54ee9 topic=37 question=21313 lang=Python3
# 2026-09-25 15:44:48
# https://www.nowcoder.com/practice/995b8a548827494699dc38c3e2a54ee9?tpId=37&tqId=21313
# [HJ90] 合法IP

"""
HJ90. 合法IP —— 字符串 / 模拟

题目描述：
判断输入的字符串是否为合法的 IPv4 地址。
合法的 IPv4 由 4 段组成，每段为 0~255 的十进制整数，段之间用 '.' 分隔。
（本平台规则：段为纯数字、且值在 0~255 之间即视为合法。）

输入格式：
一行字符串，形如 "192.168.1.1"。

输出格式：
合法输出 "YES"，否则输出 "NO"。

核心思路：
- 用 '.' 分割得到 4 段，必须恰好 4 段。
- 每段必须是纯数字、非空，且数值在 0~255 之间。
- 任一不满足则非法。
"""

# @sample-start
"""
样例输入 1:
10.137.9.5

样例输出 1:
YES
"""
# @sample-end

# @sample-start
"""
样例输入 2:
256.1.1.1

样例输出 2:
NO
"""
# @sample-end

# @nc code=start

import sys


def is_valid_ip(ip: str) -> bool:
    """判断是否为合法 IPv4 地址"""
    parts = ip.split('.')
    if len(parts) != 4:      # 必须恰好 4 段
        return False
    for part in parts:
        if not part.isdigit():  # 每段必须是纯数字且非空
            return False
        # 不能有前导零（除非整段就是 "0"，如 "0.0.0.0"）
        if len(part) > 1 and part[0] == '0':
            return False
        if not (0 <= int(part) <= 255):  # 数值范围 0~255
            return False
    return True


def solve() -> None:
    """主求解函数"""
    ip = sys.stdin.readline().strip()
    print("YES" if is_valid_ip(ip) else "NO")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("10.137.9.5\n", "YES"),
        ("256.1.1.1\n", "NO"),
        ("1.2.3\n", "NO"),
        ("1.2.3.4.5\n", "NO"),
        ("a.b.c.d\n", "NO"),
        ("0.0.0.0\n", "YES"),
        ("255.255.255.255\n", "YES"),
        ("01.2.3.8\n", "NO"),    # 前导零非法
        ("1.2.3.04\n", "NO"),    # 前导零非法
        ("1.02.3.4\n", "NO"),    # 前导零非法
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