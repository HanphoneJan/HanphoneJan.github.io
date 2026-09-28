# @nc app=nowcoder id=de538edd6f7e4bc3a5689723a7435682 topic=37 question=21241 lang=Python3
# 2026-09-29 01:04:54
# https://www.nowcoder.com/practice/de538edd6f7e4bc3a5689723a7435682?tpId=37&tqId=21241
# [HJ18] 识别有效的IP地址和掩码并进行分类统计

"""
HJ18. 识别有效的IP地址和掩码并进行分类统计 —— 模拟 / 分类

题目描述：
统计 A、B、C、D、E 类地址数量、错误 IP/掩码数量、私有 IP 数量。
每行输入一条 "IP~掩码"。

规则：
- 五类地址按首段划分：A:1-126，B:128-191，C:192-223，D:224-239，E:240-255。
- 私有地址：10.x.x.x；172.16-31.x.x；192.168.x.x（与类别分别累计）。
- 合法掩码：四段拼接的 32 位二进制必须是连续的 1 后跟连续的 0，且不能全 0 或全 1。
- 首段为 0 或 127 的 IP 为特殊地址，整行跳过（无论掩码是否合法，优先级最高）。
- 其余：IP 格式非法或掩码非法 → 错误数 +1；否则按类别计数（可能同时计私有）。

输入格式：
多行 "IP~掩码"，读到文件结尾。

输出格式：
一行七个整数：A B C D E 错误数 私有数。

核心思路：
- 先判断特殊 IP（首段 0/127）直接跳过。
- 再判 IP 格式与掩码合法性，任一非法则错误数 +1。
- 合法则按首段分类，并判断是否私有。
"""

# @sample-start
"""
样例输入 1:
10.70.44.68~1.1.1.5
1.0.0.1~255.0.0.0
192.168.0.2~255.255.255.0
19..0.~255.255.255.0

样例输出 1:
1 0 1 0 0 2 1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
0.201.56.50~255.255.255.0
127.201.56.50~255.255.111.255

样例输出 2:
0 0 0 0 0 0 0
"""
# @sample-end

# @nc code=start

import sys


def valid_ip(ip: str) -> bool:
    """判断 IP 是否合法（四段数字，每段 0~255）"""
    parts = ip.split('.')
    if len(parts) != 4:
        return False
    for p in parts:
        if not p.isdigit() or not (0 <= int(p) <= 255):
            return False
    return True


def valid_mask(mask: str) -> bool:
    """判断掩码是否合法：32 位二进制为连续 1 后连续 0，且不全 0 不全 1"""
    parts = mask.split('.')
    if len(parts) != 4:
        return False
    bits = ''
    for p in parts:
        if not p.isdigit() or not (0 <= int(p) <= 255):
            return False
        bits += format(int(p), '08b')
    if '0' not in bits or '1' not in bits:   # 全 0 或全 1 非法
        return False
    return '01' not in bits                  # 一旦出现 0 不能再出现 1


def classify(a: int) -> int:
    """按首段返回类别：0:A 1:B 2:C 3:D 4:E，返回 -1 表示不落入五类"""
    if 1 <= a <= 126:
        return 0
    if 128 <= a <= 191:
        return 1
    if 192 <= a <= 223:
        return 2
    if 224 <= a <= 239:
        return 3
    if 240 <= a <= 255:
        return 4
    return -1


def solve() -> None:
    """主求解函数"""
    counts = [0, 0, 0, 0, 0, 0, 0]   # A B C D E 错误 私有

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        ip, mask = line.split('~')

        # 特殊 IP（首段 0 或 127）：优先级最高，整行跳过
        first = ip.split('.')[0]
        if first in ('0', '127'):
            continue

        # IP 或掩码非法 → 错误
        if not valid_ip(ip) or not valid_mask(mask):
            counts[5] += 1
            continue

        # 分类
        parts = ip.split('.')
        a = int(parts[0])
        c = classify(a)
        if c != -1:
            counts[c] += 1

        # 私有地址
        if parts[0] == '10':
            counts[6] += 1
        elif parts[0] == '172' and 16 <= int(parts[1]) <= 31:
            counts[6] += 1
        elif parts[0] == '192' and parts[1] == '168':
            counts[6] += 1

    print(' '.join(map(str, counts)))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("10.70.44.68~1.1.1.5\n1.0.0.1~255.0.0.0\n192.168.0.2~255.255.255.0\n19..0.~255.255.255.0\n",
         "1 0 1 0 0 2 1"),
        ("0.201.56.50~255.255.255.0\n127.201.56.50~255.255.111.255\n",
         "0 0 0 0 0 0 0"),
        ("255.255.255.255~0.0.0.0\n", "0 0 0 0 0 1 0"),
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