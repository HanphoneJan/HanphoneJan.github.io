# @nc app=nowcoder id=9999764a61484d819056f807d2a91f1e topic=37 question=21273 lang=Python3
# 2026-09-29 01:09:51
# https://www.nowcoder.com/practice/9999764a61484d819056f807d2a91f1e?tpId=37&tqId=21273
# [HJ50] 四则运算

"""
HJ50. 四则运算 —— 表达式求值 / 递归下降

题目描述：
计算给定四则运算表达式的值。表达式由数字、+、-、*、/、小括号()、中括号[]、大括号{}
组成，运算符之间没有空格。保证表达式合法、过程中无需使用实数、结果为整数。

输入格式：
一行表达式字符串。

输出格式：
计算结果（整数）。

核心思路：
- 把所有括号统一替换为小括号 ()，便于统一处理。
- 用递归下降法解析：
  - expression：由 term 以 + / - 连接
  - term：由 factor 以 * / 连接
  - factor：整数 或 ( expression )
- 除法用整数除法 //（题目保证中间结果均为整数）。
"""

# @sample-start
"""
样例输入 1:
3+2*{1+2*[-4/(8-6)+7]}

样例输出 1:
25
"""
# @sample-end

# @nc code=start

import sys


def evaluate(expr: str) -> int:
    """递归下降求值"""
    expr = expr.replace('{', '(').replace('}', ')').replace('[', '(').replace(']', ')')
    n = len(expr)
    i = 0

    def parse_expr() -> int:
        nonlocal i
        value = parse_term()
        while i < n and expr[i] in '+-':
            op = expr[i]
            i += 1
            rhs = parse_term()
            value = value + rhs if op == '+' else value - rhs
        return value

    def parse_term() -> int:
        nonlocal i
        value = parse_factor()
        while i < n and expr[i] in '*/':
            op = expr[i]
            i += 1
            rhs = parse_factor()
            value = value * rhs if op == '*' else value // rhs
        return value

    def parse_factor() -> int:
        nonlocal i
        if expr[i] == '(':          # 括号表达式
            i += 1
            val = parse_expr()
            i += 1                  # 跳过 ')'
            return val
        # 数字（可能带负号，负号作为一元已在前面处理，这里直接读连续数字）
        sign = 1
        if expr[i] == '-':
            sign = -1
            i += 1
        start = i
        while i < n and expr[i].isdigit():
            i += 1
        return sign * int(expr[start:i])

    return parse_expr()


def solve() -> None:
    """主求解函数"""
    expr = sys.stdin.readline().strip()
    print(evaluate(expr))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3+2*{1+2*[-4/(8-6)+7]}\n", "25"),
        ("3+2*{1+2*[-4/(8-6)+7]}\n", "25"),
        ("1+2*3\n", "7"),
        ("(1+2)*3\n", "9"),
        ("[1+2]/[3-1]\n", "1"),
        ("100-50*2\n", "0"),
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