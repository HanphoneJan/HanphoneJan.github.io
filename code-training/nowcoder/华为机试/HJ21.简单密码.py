# @nc app=nowcoder id=7960b5038a2142a18e27e4c733855dac topic=37 question=21244 lang=Python3
# 2026-09-29 01:05:28
# https://www.nowcoder.com/practice/7960b5038a2142a18e27e4c733855dac?tpId=37&tqId=21244
# [HJ21] 简单密码

"""
HJ21. 简单密码 —— 字符串 / 映射

题目描述：
对密码进行转换：
- 小写字母按键盘九宫格映射为数字：a/b/c→2，d/e/f→3，g/h/i→4，j/k/l→5，
  m/n/o→6，p/q/r/s→7，t/u/v→8，w/x/y/z→9；
- 大写字母统一转为小写（不移动）；
- 数字及其他字符保持不变。

输入格式：
一行字符串（密码）。

输出格式：
转换后的字符串。

核心思路：
- 小写字母：查表映射为数字。
- 大写字母：转小写。
- 其余：原样保留。
"""

# @sample-start
"""
样例输入 1:
YUANzhi1987

样例输出 1:
zvbo9441987
"""
# @sample-end

# @nc code=start

import sys

# 小写字母 -> 数字的映射表
LOWER_TO_DIGIT = {
    'a': '2', 'b': '2', 'c': '2',
    'd': '3', 'e': '3', 'f': '3',
    'g': '4', 'h': '4', 'i': '4',
    'j': '5', 'k': '5', 'l': '5',
    'm': '6', 'n': '6', 'o': '6',
    'p': '7', 'q': '7', 'r': '7', 's': '7',
    't': '8', 'u': '8', 'v': '8',
    'w': '9', 'x': '9', 'y': '9', 'z': '9',
}


def convert(pwd: str) -> str:
    """转换单个密码"""
    res = []
    for ch in pwd:
        if ch.islower():
            res.append(LOWER_TO_DIGIT[ch])   # 小写 -> 数字
        elif ch.isupper():
            # 大写 -> 转小写后，ASCII 后移一位（z 后移回到 a）
            res.append(chr((ord(ch.lower()) - ord('a') + 1) % 26 + ord('a')))
        else:
            res.append(ch)                   # 数字/其他保持不变
    return ''.join(res)


def solve() -> None:
    """主求解函数"""
    pwd = sys.stdin.readline().strip()
    print(convert(pwd))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("YUANzhi1987\n", "zvbo9441987"),
        ("abc\n", "222"),
        ("ABC\n", "bcd"),
        ("xyz\n", "999"),
        ("123aZ\n", "1232a"),
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