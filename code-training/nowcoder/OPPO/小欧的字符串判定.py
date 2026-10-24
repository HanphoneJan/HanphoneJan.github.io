# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/36f1cc91b5d04df2896b91f5e18fa092
# 小欧的字符串判定（2024 秋招 · 研发岗）

"""
小欧的字符串判定 —— 字符串 / 枚举

题目描述：
给定长度都为 n 的两个字符串 s、t 和目标串 target。
target 的第 i 位必须从 s[i] 或 t[i] 中二选一，问能否拼出 target。

输入格式：
第一行一个正整数 n（1 <= n <= 100）。
接下来三行分别是 s、t、target。

输出格式：
可以则输出 Yes，否则输出 No。

核心思路：
每一位的选择互不影响，所以逐位检查即可：
只要存在某一位 target[i] 既不等于 s[i] 也不等于 t[i]，这一位就无解，
整题输出 No；全部位都能对上则输出 Yes。

不需要搜索，也不需要考虑「选了 s[i] 会不会影响后面」——
每一位独立，答案是所有位置条件的与。

时间复杂度：O(n)
空间复杂度：O(1)（只读入，不额外建结构）
"""

# @sample-start
"""
样例输入 1:
3
abc
bad
aac

样例输出 1:
Yes

样例输入 2:
2
ab
bb
aa

样例输出 2:
No
"""
# @sample-end

import sys


def solve() -> None:
    """逐位判断 target[i] 是否在 {s[i], t[i]} 中"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    s, t, target = data[1], data[2], data[3]
    for i in range(n):
        if target[i] != s[i] and target[i] != t[i]:
            sys.stdout.write("No\n")
            return
    sys.stdout.write("Yes\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3\nabc\nbad\naac\n", "Yes"),   # 样例 1
        ("2\nab\nbb\naa\n", "No"),       # 样例 2
        ("1\na\nb\nb\n", "Yes"),         # 只有一位，取 t 的字符
        ("1\na\nb\nc\n", "No"),          # 两边都不是目标字符
        ("4\nabcd\nabce\nabcf\n", "No"),  # 只有最后一位无解
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
