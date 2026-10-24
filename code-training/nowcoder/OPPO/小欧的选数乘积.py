# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/a94f523ebe424d0481533dc9e6138724
# 小欧的选数乘积（OPPO 2023 秋招 · 算法岗）

"""
小欧的选数乘积 —— 贪心 / 排序

题目描述：
给定两个正整数 x、y 和一个长度为 n 的正整数数组 a。每次操作方法：
选一个元素 a_i，把 x 乘上 a_i，并删掉数组里**所有等于 a_i 的元素**。
问最少几次操作能让 x >= y；做不到输出 -1。

输入格式：
第一行两个正整数 x、y；
第二行一个正整数 n；
第三行 n 个正整数 a_i（1 <= x, y, a_i <= 1e9，1 <= n <= 1e5）。

输出格式：
一个整数，表示最少操作次数；无解输出 -1。

核心思路：
选择某个值会把它的所有副本一起删掉，所以每种**不同的值**最多用一次。
次数固定时想让 x 涨得最多，就该挑最大的那些值，于是：
把不同的值从大到小排序，依次乘上去，乘到 x >= y 就停；全乘完还不够就是 -1。
值为 1 的元素乘上去不改变 x，直接视作没用。
注意「无解」不只出现在全是 1 的情况：不同值的个数不够多时同样乘不到 y。

时间复杂度：O(n log n)（排序去重）
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3 40
4
2 3 4 4

样例输出 1:
3
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 5
5
2 2 2 2 2

样例输出 2:
-1
"""
# @sample-end

# @sample-start
"""
样例输入 3:
5 5
5
2 2 2 2 2

样例输出 3:
0
"""
# @sample-end

import sys


def solve() -> None:
    """不同值降序去重后依次相乘，乘到不小于 y 为止"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    x = int(data[0])
    y = int(data[1])
    n = int(data[2])

    if x >= y:
        sys.stdout.write("0\n")
        return

    # 同一个值只能选一次，先把重复的合并掉，再从大到小用
    values = sorted({int(v) for v in data[3:3 + n]}, reverse=True)

    ops = 0
    for v in values:
        if v == 1:
            # 后面全是 1 了，乘上去没有任何效果
            break
        x *= v
        ops += 1
        if x >= y:
            sys.stdout.write(str(ops) + "\n")
            return

    sys.stdout.write("-1\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3 40\n4\n2 3 4 4\n", "3"),            # 样例 1：4,3,2 -> 12,36,72
        ("2 5\n5\n2 2 2 2 2\n", "-1"),          # 样例 2：只有 2 可选，4 还不够
        ("5 5\n5\n2 2 2 2 2\n", "0"),           # 样例 3：已经满足
        ("1 8\n3\n2 2 2\n", "-1"),              # 只有一个不同值 2
        ("1 1\n1\n1\n", "0"),                   # x 已经不小于 y
        ("6 100\n3\n2 3 5\n", "3"),             # 5,3,2 -> 30,90,180
        ("1 100\n2\n1 1\n", "-1"),              # 只有 1，永远乘不动
        ("1 1000000000\n2\n1000000000 3\n", "1"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
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
