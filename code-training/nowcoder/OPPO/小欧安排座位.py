# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/f90a4314d03f434f93f54b918304f97e
# 小欧安排座位（2024 秋招 · 移动端）

"""
小欧安排座位 —— 贪心 / 构造

题目描述：
n 个小朋友、n 个座位，编号都是 1 到 n。安排一个座位排列后，
第 i 个小朋友如果坐在了 i 号座位上，则他是「不独特」的，否则是「独特」的。
第 i 个小朋友的愿望由字符串 s 的第 i 位给出：'1' 希望独特，'0' 希望不独特。
求一种安排，使满足愿望的人数尽可能多。

输入格式：
第一行一个整数 n（1 <= n <= 10^5）。
第二行一个长度为 n 的、只含 '0' 和 '1' 的字符串。

输出格式：
一行 n 个用空格隔开的整数，第 i 个表示第 i 个小朋友被安排的座位编号。

核心思路：
希望「不独特」的小朋友（s[i] = '0'）直接坐在自己的座位上，愿望立刻满足，
而且不会抢走别人的座位。

剩下的座位恰好是那些「希望独特」的小朋友自己的座位（编号相同）。
于是问题变成：在集合 S（希望独特的小朋友）内部做一个错排。

- |S| >= 2：让 S 里每个人顺时针坐下一个人的座位（循环移位一位），
  没有一个人坐在自己的座位上，所有人全部满足。
- |S| = 1：唯一的人只能坐自己的座位，最多满足其余 n-1 个人。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
5
00110

样例输出 1:
1 2 4 3 5
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2
01

样例输出 2:
1 2
"""
# @sample-end

import sys


def solve():
    """希望不独特的坐原位；希望独特的在自己人内部循环移位一位"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    s = data[1]

    ans = list(range(1, n + 1))          # 默认每个人坐自己的座位
    special = [i for i in range(1, n + 1) if s[i - 1] == '1']

    if len(special) >= 2:
        m = len(special)
        for k in range(m):
            ans[special[k] - 1] = special[(k + 1) % m]

    sys.stdout.write(" ".join(map(str, ans)) + "\n")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    tests = [
        # 题面样例 1：3、4 号希望独特，两人互换座位
        ("5\n00110\n", "1 2 4 3 5"),
        # 题面样例 2：只有 2 号希望独特，他只能坐 2 号座位
        ("2\n01\n", "1 2"),
        # 全部希望不独特：全部坐原位
        ("4\n0000\n", "1 2 3 4"),
        # 全部希望独特：整体循环移位一位
        ("4\n1111\n", "2 3 4 1"),
        # n = 1 且希望独特：无解，只能坐原位
        ("1\n1\n", "1"),
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
