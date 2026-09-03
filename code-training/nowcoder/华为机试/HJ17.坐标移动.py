# @nc app=nowcoder id=119bcca3befb405fbe58abe9c532eb29 topic=37 question=21240 lang=Python3
# 2026-04-28 11:27:17
# https://www.nowcoder.com/practice/119bcca3befb405fbe58abe9c532eb29?tpId=37&tqId=21240
# [HJ17] 坐标移动

"""
HJ17. 坐标移动 —— 字符串解析与模拟

题目描述：
无限大二维网格上有小人，初始位置为原点 (0, 0)。
接收一系列指令进行移动，指令格式：首字符为 A/S/D/W（左/下/右/上），
末字符固定为 ";"，中间为 1-99 的数字（可含前导零）。
非法指令（格式不正确、数字超出范围、方向字符非法等）应被忽略。

输入格式：
一行字符串，长度 ≤ 10000，由大写字母、数字和分号组成。
保证至少一个 ";" 且末尾为 ";"。

输出格式：
一行两个整数，横纵坐标用逗号间隔。

核心思路：
1. 按 ";" 分割指令
2. 逐个验证指令合法性：
   - 长度 ≥ 2（方向字符 + 至少一个数字 + 末尾分号）
   - 首字符必须是 A/S/D/W 之一
   - 中间部分必须全是数字
   - 数字值在 1-99 范围内（含前导零时按实际值计算，如 "001"=1 合法；"100"=100 非法；"00"=0 非法）
3. 合法指令按方向更新坐标
"""

# @sample-start
"""
样例输入 1:
A10;S20;W10;D30;X;A1A;B10A11;;A10;

样例输出 1:
10,-10
"""
# @sample-end

# @sample-start
"""
样例输入 2:
ABC;AKL;DA1;D001;W023;A100;S00;

样例输出 2:
0,0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
A00;S01;W2;

样例输出 3:
0,1
"""
# @sample-end

# @nc code=start

import sys
import re


def solve():
    """坐标移动主求解函数

    思路：
    1. 读取输入字符串，按 ';' 分割得到每条指令
    2. 用正则表达式验证指令格式：^[ASDW](\d{1,2});$
       - 必须以 A/S/D/W 开头
       - 后跟 1-2 位数字
       - 必须以分号结尾
    3. 提取数字并验证范围 1-99
    4. 按方向更新坐标
    """
    line = sys.stdin.readline().strip()

    # 方向映射：A=左(x-), D=右(x+), W=上(y+), S=下(y-)
    delta = {
        'A': (-1, 0),
        'D': (1, 0),
        'W': (0, 1),
        'S': (0, -1),
    }

    x, y = 0, 0

    # 按分号分割指令
    # 注意：末尾的分号会产生一个空字符串，需要过滤
    commands = line.split(';')

    for cmd in commands:
        # 空指令跳过
        if not cmd:
            continue

        # 验证指令格式：方向字符 + 1-2位数字
        # 使用正则匹配：A/S/D/W 后跟 1-2 个数字
        match = re.fullmatch(r'([ASDW])(\d{1,2})', cmd)
        if not match:
            continue  # 非法指令，忽略

        direction = match.group(1)
        distance = int(match.group(2))

        # 验证数字范围：1-99
        if distance < 1 or distance > 99:
            continue  # 非法指令，忽略

        # 更新坐标
        dx, dy = delta[direction]
        x += dx * distance
        y += dy * distance

    print(f"{x},{y}")


# 嵌入测试用例（输入字符串, 期望输出）
test_cases = [
    ("A10;S20;W10;D30;X;A1A;B10A11;;A10;\n", "10,-10"),
    ("ABC;AKL;DA1;D001;W023;A100;S00;\n", "0,0"),
    ("A00;S01;W2;\n", "0,1"),
]


def run_tests():
    """运行嵌入的样例测试"""
    import io
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
