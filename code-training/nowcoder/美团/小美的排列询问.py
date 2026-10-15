# 牛客题霸 · 美团笔试真题
# https://www.nowcoder.com/practice/2a9dd3471bf1475aab0117a58d9d45d4
# 小美的排列询问（美团 2024 秋招第一场）

"""
小美的排列询问 —— 数组 / 哈希

题目描述：
小美拿到了一个排列（长度为 n 的数组，1 到 n 每个数恰好出现一次）。
她想知道在这个排列中，数字 x 和 y 是否是相邻的。

输入格式：
第一行一个正整数 n，代表排列的长度。
第二行 n 个正整数，代表排列的元素。
第三行两个正整数 x、y，用空格隔开。

输出格式：
如果 x 和 y 在排列中相邻，输出 "Yes"；否则输出 "No"。

核心思路：
「相邻」在数组里只有一种含义：两个数字的下标相差 1。
所以只要记下每个值出现的位置，比较 abs(pos[x] - pos[y]) 是否等于 1。
用字典（或长度 n+1 的数组）做值 → 下标 的映射，查询 O(1)。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
1 4 2 3
2 4

样例输出 1:
Yes
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5
3 4 5 1 2
3 2

样例输出 2:
No
"""
# @sample-end

import sys


def solve() -> None:
    """记录每个值的位置，判断下标是否相差 1"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    a = data[1:1 + n]
    x = data[1 + n]
    y = data[2 + n]

    pos = {}
    for i, v in enumerate(a):
        pos[v] = i
    sys.stdout.write("Yes\n" if abs(pos[x] - pos[y]) == 1 else "No\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4\n1 4 2 3\n2 4\n", "Yes"),
        ("5\n3 4 5 1 2\n3 2\n", "No"),
        ("2\n1 2\n1 2\n", "Yes"),
        ("3\n1 2 3\n1 3\n", "No"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.StringIO(inp)
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
