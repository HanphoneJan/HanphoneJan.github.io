# @nc app=nowcoder id=5190a1db6f4f4ddb92fd9c365c944584 topic=37 question=21249 lang=Python3
# 2026-09-25 15:39:40
# https://www.nowcoder.com/practice/5190a1db6f4f4ddb92fd9c365c944584?tpId=37&tqId=21249
# [HJ26] 字符串排序

"""
HJ26. 字符串排序 —— 稳定排序 / 字符分类

题目描述：
编写程序，对输入的字符串按如下规则排序：
1. 英文字母按 ASCII 大小排序，但不区分大小写，即 'A'<'a'<'B'<'b'...
   实际规则：不区分大小写，且相同字母（如 A 和 a）按输入顺序保持相对位置。
2. 同一字母的大小写同时存在时，按输入顺序排列（稳定排序）。
3. 非字母字符保持原位不动。

输入格式：
一行待排序的字符串（可含空格、数字、标点）。

输出格式：
排序后的字符串。

核心思路：
- 先提取所有字母，按"不区分大小写"排序，且保证稳定（相同字母保持原相对顺序）。
- Python 的 sorted 是稳定的，用 key=str.lower 即可：大小写不敏感，且同字母稳定。
- 再按原字符串位置回填：遇到字母就依次取排序后的字母，遇到非字母则原样保留。
"""

# @sample-start
"""
样例输入 1:
A Famous Saying: Much Ado About Nothing (2012/8).

样例输出 1:
A aaAAbc dFgghh: iimM nNn oooos Sttuuuy (2012/8).
"""
# @sample-end

# @sample-start
"""
样例输入 2:
a1b2c3

样例输出 2:
a1b2c3
"""
# @sample-end

# @nc code=start

import sys


def sort_string(s: str) -> str:
    """按规则排序字符串并返回

    规则：
    - 字母按不区分大小写排序，稳定（相同字母保持输入顺序）
    - 非字母字符保持在原位置
    """
    # 提取所有字母并按小写稳定排序
    letters = sorted([ch for ch in s if ch.isalpha()], key=str.lower)

    res = []
    idx = 0
    for ch in s:
        if ch.isalpha():
            res.append(letters[idx])  # 依次回填排序后的字母
            idx += 1
        else:
            res.append(ch)            # 非字母原样保留
    return ''.join(res)


def solve() -> None:
    """主求解函数"""
    line = sys.stdin.readline().rstrip('\n')
    print(sort_string(line))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("A Famous Saying: Much Ado About Nothing (2012/8).\n",
         "A aaAAbc dFgghh: iimM nNn oooos Sttuuuy (2012/8)."),
        ("a1b2c3\n", "a1b2c3"),
        ("cba\n", "abc"),
        ("Case\n", "aCes"),
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