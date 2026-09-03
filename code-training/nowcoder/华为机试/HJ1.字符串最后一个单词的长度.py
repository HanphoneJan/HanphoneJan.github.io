# @nc app=nowcoder id=8c949ea5f36f422594b306a2300315da topic=37 question=21224 lang=Python3
# 2026-04-27 17:46:01
# https://www.nowcoder.com/practice/8c949ea5f36f422594b306a2300315da?tpId=37&tqId=21224
# [HJ1] 字符串最后一个单词的长度

"""
HJ1. 字符串最后一个单词的长度 —— 字符串基础

题目描述：
计算字符串最后一个单词的长度，单词以空格隔开，字符串长度小于5000。

输入格式：
一行字符串，末尾可能有空格，单词之间以空格分隔

输出格式：
整数N，表示最后一个单词的长度

核心思路：
方法一：字符串分割法
- 使用 split() 分割字符串，取最后一个元素计算长度
- 时间复杂度：O(n)，空间复杂度：O(n)

方法二：逆向遍历法（最优）
- 从字符串末尾开始遍历，遇到第一个空格或到达开头时停止
- 时间复杂度：O(n)，空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
Hello World

样例输出 1:
5
"""
# @sample-end

# @sample-start
"""
样例输入 2:
   fly me   to   the moon

样例输出 2:
4
"""
# @sample-end

# @nc code=start

import sys


def last_word(line: str) -> int:
    """计算字符串最后一个单词的长度（逆向遍历法，最优）

    思路：从字符串末尾开始遍历，跳过尾部空格，统计最后一个单词的字符数。
    遇到空格即停止，时间复杂度 O(n)，空间复杂度 O(1)。

    Args:
        line: 输入字符串

    Returns:
        最后一个单词的长度，空字符串返回0
    """
    if not line:
        return 0

    line = line.strip()  # 去除首尾空格，避免末尾空格干扰
    count = 0

    # 从后向前遍历，遇到第一个空格停止
    for ch in reversed(line):
        if ch == ' ':
            break
        count += 1

    return count


def last_word_split(line: str) -> int:
    """使用 split 方法的解法（简洁但空间复杂度较高）

    思路：split() 按空格分割字符串，返回最后一个非空单词的长度。
    时间复杂度 O(n)，空间复杂度 O(n)（需要创建单词列表）。

    Args:
        line: 输入字符串

    Returns:
        最后一个单词的长度
    """
    words = line.split()
    return len(words[-1]) if words else 0


# 嵌入测试用例
test_cases = [
    ("Hello World", 5),
    ("   fly me   to   the moon  ", 4),
    ("single", 6),
    ("", 0),
    ("   ", 0),
    ("a b c d e", 1),
    ("hello", 5),
    (" trailing space ", 5),
]


def run_tests():
    """运行嵌入的样例测试"""
    for i, (inp, expected) in enumerate(test_cases, 1):
        result = last_word(inp)
        status = "✓" if result == expected else "✗"
        print(f"样例 {i}: {status} 输入={repr(inp)}, 期望={expected}, 实际={result}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        # 处理标准输入
        for line in sys.stdin:
            print(last_word(line))


# @nc code=end
