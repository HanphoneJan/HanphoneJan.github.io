# @nc app=nowcoder id=66ca0e28f90c42a196afd78cc9c496ea topic=37 question=21256 lang=Python3
# 2026-09-29 01:09:05
# https://www.nowcoder.com/practice/66ca0e28f90c42a196afd78cc9c496ea?tpId=37&tqId=21256
# [HJ33] 整数与IP地址间的转换

"""
HJ33. 整数与IP地址间的转换 —— 位运算 / 进制

题目描述：
IP 地址的每一段是一个 0~255 的整数，把四段各自的 8 位二进制拼接成 32 位，
再转换为十进制长整数；反之，把十进制长整数拆成四段得到 IP 地址。

输入格式：
- 第1行：一个 IP 地址（如 10.0.3.193）
- 第2行：一个十进制整数

输出格式：
- 第1行：IP 地址转换成的十进制整数
- 第2行：十进制整数转换成的 IP 地址

核心思路：
- IP -> 整数：int = a<<24 | b<<16 | c<<8 | d
- 整数 -> IP：依次取高 8 位。a=(x>>24)&255，b=(x>>16)&255，c=(x>>8)&255，d=x&255
"""

# @sample-start
"""
样例输入 1:
10.0.3.193
167969729

样例输出 1:
167773121
10.3.3.193
"""
# @sample-end

# @nc code=start

import sys


def ip_to_int(ip: str) -> int:
    """IP 地址 -> 十进制长整数"""
    a, b, c, d = map(int, ip.split('.'))
    return (a << 24) | (b << 16) | (c << 8) | d


def int_to_ip(x: int) -> str:
    """十进制长整数 -> IP 地址"""
    return f"{(x >> 24) & 255}.{(x >> 16) & 255}.{(x >> 8) & 255}.{x & 255}"


def solve() -> None:
    """主求解函数"""
    ip = sys.stdin.readline().strip()
    num = int(sys.stdin.readline().strip())
    print(ip_to_int(ip))
    print(int_to_ip(num))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("10.0.3.193\n167969729\n", "167773121\n10.3.3.193"),
        ("0.0.0.0\n4294967295\n", "0\n255.255.255.255"),
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