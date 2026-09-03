# @nc app=nowcoder id=ae809795fca34687a48b172186e3dafe topic=37 question=21234 lang=Python3
# 2026-04-28 11:27:17
# https://www.nowcoder.com/practice/ae809795fca34687a48b172186e3dafe?tpId=37&tqId=21234
# [HJ11] 数字颠倒

"""
HJ11. 数字颠倒 —— 字符串基础

题目描述：
输入一个整数，以字符串形式逆序输出。程序不考虑负数的情况；
若数字末尾含0，逆序之后也需要含0，如输入100，输出001。

输入格式：
输入一个int型整数

输出格式：
将这个整数以字符串形式逆序输出

核心思路：
方法一：字符串切片法（最简洁，推荐）
- 读取输入，直接转换为字符串
- 使用切片 [::-1] 逆序
- 时间复杂度 O(n)，空间复杂度 O(n)

方法二：reversed 函数法
- 使用 reversed() 反转字符串序列，通过 ''.join() 拼接
- 时间复杂度 O(n)，空间复杂度 O(n)

方法三：数学倒序法（进阶）
- 循环对数字取余，逐位取出并构建逆序字符串
- 时间复杂度 O(log10(n))，空间复杂度 O(log10(n))
"""

# @sample-start
"""
样例输入 1:
1516000

样例输出 1:
0006151
"""
# @sample-end

# @sample-start
"""
样例输入 2:
0

样例输出 2:
0
"""
# @sample-end

# @nc code=start

import sys


def reverse_number_slice(num_str: str) -> str:
    """字符串切片法逆序输出（最简洁）

    思路：利用 Python 字符串切片的步长特性 [::-1]，直接生成逆序字符串。
    时间复杂度 O(n)，空间复杂度 O(n)。

    Args:
        num_str: 已经去除换行符的数字字符串

    Returns:
        逆序后的字符串
    """
    return num_str[::-1]


def reverse_number_reversed(num_str: str) -> str:
    """使用 reversed() 函数逆序

    思路：reversed() 返回反向迭代器，再用 ''.join() 拼接成字符串。
    时间复杂度 O(n)，空间复杂度 O(n)。

    Args:
        num_str: 数字字符串

    Returns:
        逆序后的字符串
    """
    return ''.join(reversed(num_str))


def reverse_number_math(num_str: str) -> str:
    """通过数学取余方式逆序（不依赖字符串反转操作）

    思路：将字符串转为整数，循环 %10 取最后一位，构建逆序列表。
    注意：输入 "100" 转整数为 100，取余后得到 "1"，再追加两个 0？
    实际上此方法会丢失前导零信息，本题不推荐。

    Args:
        num_str: 数字字符串

    Returns:
        逆序后的字符串
    """
    n = int(num_str) if num_str else 0
    if n == 0:
        return "0"
    result = []
    while n > 0:
        result.append(str(n % 10))
        n //= 10
    return ''.join(result)


# 嵌入测试用例
test_cases = [
    ("1516000", "0006151"),
    ("0", "0"),
    ("1", "1"),
    ("123", "321"),
    ("9876543210", "0123456789"),
]


def run_tests():
    """运行嵌入的样例测试"""
    for i, (inp, expected) in enumerate(test_cases, 1):
        result = reverse_number_slice(inp)
        status = "✓" if result == expected else "✗"
        print(f"样例 {i}: {status} 输入={repr(inp)}, 期望={expected}, 实际={result}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        # 处理标准输入
        for line in sys.stdin:
            s = line.strip()
            if s:
                print(reverse_number_slice(s))


# @nc code=end
