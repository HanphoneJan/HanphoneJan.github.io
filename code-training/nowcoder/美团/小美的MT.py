# 牛客题霸 · 美团笔试真题
# https://www.nowcoder.com/practice/482aec4b785642fc8a452f34b153a44d
# 小美的MT（美团 2024 春招第一场【技术】）

"""
小美的MT —— 字符串 / 贪心

题目描述：
MT 是美团的缩写，因此小美很喜欢这两个字母。现在小美拿到了一个仅由大写字母
组成的字符串，她最多可以操作 k 次，每次可以修改任意一个字符。
她想知道操作结束后最多共有多少个 'M' 和 'T' 字符。

输入格式：
第一行两个正整数 n、k，代表字符串长度和操作次数。
第二行一个长度为 n 的、仅由大写字母组成的字符串 s。

输出格式：
输出操作结束后最多共有多少个 'M' 和 'T' 字符。

核心思路：
不在 {'M','T'} 里的字符，每改一个就多一个目标字符，一共可以改 k 个。
所以答案 = min(n, 已有的 'M'/'T' 数 + k)。
先把已经很听话的字符算进来，剩多少次操作就拿多少个「名额」，
最多也不会超过字符串长度 n。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
5 2
MTUAN

样例输出 1:
4
"""
# @sample-end

import sys


def solve() -> None:
    """统计 M/T 数量，再加上最多 k 次修改"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    k = int(data[1])
    s = data[2]
    cnt = sum(1 for ch in s if ch == 'M' or ch == 'T')
    sys.stdout.write(str(min(n, cnt + k)) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("5 2\nMTUAN\n", "4"),
        ("3 0\nMTM\n", "3"),        # 不需要操作
        ("4 10\nABCD\n", "4"),      # k 大于剩余字符数，最多也只能到 n
        ("1 1\nA\n", "1"),
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
