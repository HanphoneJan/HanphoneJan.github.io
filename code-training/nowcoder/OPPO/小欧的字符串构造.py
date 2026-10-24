# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/3cf0c0aa163a44aba2ee1f7062cb8a12
# 小欧的字符串构造（2024 秋招 · 算法岗）

"""
小欧的字符串构造 —— 字符串 / 构造 / 回文

题目描述：
给定字符串 s，构造一个长度为 k 的字符串 t，使得 s+t 或 t+s 是回文串。
存在则输出任意一个合法的 t，不存在输出 -1。

输入格式：
第一行一个长度不超过 10^5 的字符串 s。
第二行一个整数 k（1 <= k <= 10^5）。

输出格式：
一行一个字符串表示答案；无解输出 -1。

核心思路：
分两种长度情况，关键是「t 到底被约束住多少」：

1) k >= n（n = len(s)）：
   s + rev(s) 本身就是回文。中间多出来的 k-n 个字符放在 s 与 rev(s) 之间，
   只要这一段自身是回文，整体就仍然是回文。全填 'a' 一定满足，
   于是 t = 'a' * (k - n) + rev(s) 永远合法。

2) k < n：
   先看 s+t。回文要求首尾对称：s 的前 k 个字符要和末尾的 t 镜像，
   于是 t 被唯一确定为 rev(s[:k])；此时再看剩下没有配对的中间段
   s[k:]，它自身必须是回文，否则无解。
   再看 t+s。同理 t = rev(s[n-k:])，并要求 s[:n-k] 是回文。
   两条路都不通才输出 -1。

时间复杂度：O(n + k)
空间复杂度：O(n + k)
"""

# @sample-start
"""
样例输入 1:
abc
3

样例输出 1:
cba
"""
# @sample-end

import sys


def solve() -> None:
    """按 k 与 len(s) 的大小关系分情况构造 t"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    s = data[0].decode()
    k = int(data[1])
    n = len(s)

    if k >= n:
        # s + rev(s) 是回文，中间塞一段回文（全 'a'）不破坏对称性
        t = "a" * (k - n) + s[::-1]
    elif s[k:] == s[k:][::-1]:
        # 让 s + t 成为回文：t 由 s 的前 k 个字符镜像决定
        t = s[:k][::-1]
    elif s[:n - k] == s[:n - k][::-1]:
        # 让 t + s 成为回文：t 由 s 的后 k 个字符镜像决定
        t = s[n - k:][::-1]
    else:
        t = "-1"

    sys.stdout.write(t + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("abc\n3\n", "cba"),      # 样例 1：k == n，t = rev(s)
        ("ab\n5\n", "aaaba"),     # k > n：补 3 个 'a' 再拼 rev(s)
        ("a\n1\n", "a"),          # 最短情况
        ("ab\n1\n", "a"),         # k < n，s + t = "aba" 是回文
        ("aab\n1\n", "b"),        # k < n，走 t + s = "baab" 这条分支
        ("aba\n1\n", "-1"),       # 两条路都不通
        ("abcd\n2\n", "-1"),      # s[2:] 与 s[:2] 都不是回文
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
