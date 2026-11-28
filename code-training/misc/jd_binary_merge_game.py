"""
01 数组合并博弈 - 判断先手甲是否有必胜策略

题目描述：
给出一个长度为 n 的 01 数组。甲、乙轮流操作，甲先手。
一次操作选择一段长度至少为 2 的连续区间 [l, r]，把这段区间替换成一个数：
    (a[l] + a[l+1] + ... + a[r] + 1) mod 2
区间被替换成一个元素后，数组长度减少 r-l。数组长度变成 1 时游戏结束；
此时唯一的元素为 1 则甲胜，为 0 则乙胜。
问甲是否有必胜策略。

输入格式：
- 第一行：整数 n
- 第二行：n 个 0/1，空格分隔

输出格式：
- 一行：Yes 或 No

核心思路：
n = 1：没有操作，甲胜当且仅当 a[0] == 1。
n = 2：只有一种操作，合并两个数，结果 = (a0 + a1 + 1) % 2，
       甲胜当且仅当 a0 == a1（和为偶数）。
n >= 3：
    - 总和 S 为偶数：甲直接合并整个数组，(S+1)%2 = 1，一步获胜。
    - 总和 S 为奇数：甲合并前 n-1 个数。新元素
          (S - a[n-1] + 1) % 2
      S 为奇数时 S+1 为偶数，所以它等于 a[n-1]（模 2）。
      数组剩下两个相等的数，乙只能合并它们，
      (2*a[n-1] + 1) % 2 = 1，甲胜。
    所以 n >= 3 时甲恒有必胜策略。

时间复杂度：O(n)（读入数组）
空间复杂度：O(n)
"""

import sys

# @sample-start
"""
样例输入 1:
3
0 1 0

样例输出 1:
Yes
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2
0 1

样例输出 2:
No
"""
# @sample-end

# @sample-start
"""
样例输入 3:
2
1 1

样例输出 3:
Yes
"""
# @sample-end

# @sample-start
"""
样例输入 4:
1
0

样例输出 4:
No
"""
# @sample-end


def first_player_wins(a) -> bool:
    """返回先手甲是否有必胜策略。"""
    n = len(a)
    if n == 1:
        return a[0] == 1
    if n == 2:
        return a[0] == a[1]
    # n >= 3：总和为偶数就一次合并全部；为奇数就合并前 n-1 个，留下两个相等的数
    return True


def solve() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    rest = data[1:]
    # 兼容两种写法：第二行是 n 个空格分隔的数，或一整串 "010"
    if len(rest) == 1 and len(rest[0]) == n and set(rest[0]) <= {"0", "1"}:
        a = [int(c) for c in rest[0]]
    else:
        a = [int(x) for x in rest[:n]]

    print("Yes" if first_player_wins(a) else "No")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n0 1 0\n", "Yes"),
        ("3\n0 0 0\n", "Yes"),
        ("3\n1 1 1\n", "Yes"),
        ("2\n0 1\n", "No"),
        ("2\n1 1\n", "Yes"),
        ("1\n0\n", "No"),
        ("1\n1\n", "Yes"),
        ("3\n010\n", "Yes"),
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

        status = "[PASS]" if output == expected else "[FAIL]"
        print(f"样例 {i}: {status} (期望={expected}, 实际={output})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
