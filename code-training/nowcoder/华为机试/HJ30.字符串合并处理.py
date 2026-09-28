# @nc app=nowcoder id=d3d8e23870584782b3dd48f26cb39c8f topic=37 question=21253 lang=Python3
# 2026-09-29 01:08:33
# https://www.nowcoder.com/practice/d3d8e23870584782b3dd48f26cb39c8f?tpId=37&tqId=21253
# [HJ30] 字符串合并处理

"""
HJ30. 字符串合并处理 —— 字符串 / 排序 / 进制转换

题目描述：
给定两个字符串 s1、s2（由大小写字母和数字构成，下标从 1 开始）。

【合并阶段】
1. 将 s1、s2 合并得到新串 str2。
2. 将 str2 中奇数位字符按 ASCII 码升序排序，偶数位字符也按 ASCII 码升序排序，得到 str3。

【调整阶段】
从左到右遍历 str3 的每个字符：
1. 若字符不是合法十六进制字符（0-9、a-f、A-F），原样保留；
2. 否则转十进制数，转成四位二进制（高位补 0），翻转二进制，再转回大写十六进制。

输入格式：
一行两个字符串 s1 s2（用空格分隔）。

输出格式：
处理后的最终字符串。

核心思路：
- 合并后，用切片提取奇数位（1基）与偶数位，分别 sorted()（ASCII 升序），再交错拼回。
- 对每个字符：若 int(ch, 16) 不报错则处理，否则保留。
- 处理：val -> format(val,'04b') -> 反转 -> hex 大写。
"""

# @sample-start
"""
样例输入 1:
dec fab

样例输出 1:
5D37BF
"""
# @sample-end

# @sample-start
"""
样例输入 2:
abV CDw

样例输出 2:
B3VD5w
"""
# @sample-end

# @nc code=start

import sys


def transform(ch: str) -> str:
    """调整阶段：十六进制字符反转二进制后转回大写十六进制，非十六进制字符保留"""
    try:
        val = int(ch, 16)          # 非法十六进制会抛异常
    except ValueError:
        return ch
    # 转四位二进制、反转、再转回十六进制大写
    rev = format(val, '04b')[::-1]
    return hex(int(rev, 2))[2:].upper()


def solve() -> None:
    """主求解函数"""
    s1, s2 = sys.stdin.readline().split()
    merged = s1 + s2

    # 合并阶段：奇数位、偶数位分别按 ASCII 升序排序后交错拼回（下标从 1 开始）
    odd = sorted(merged[0::2])    # 1基奇数位 = 0基偶数
    even = sorted(merged[1::2])   # 1基偶数位 = 0基奇数
    inter = []
    for i in range(len(merged)):
        inter.append(odd[i // 2] if i % 2 == 0 else even[i // 2])
    str3 = ''.join(inter)

    # 调整阶段
    print(''.join(transform(c) for c in str3))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("dec fab\n", "5D37BF"),
        ("abV CDw\n", "B3VD5w"),
        ("123 15\n", "88C4A"),
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