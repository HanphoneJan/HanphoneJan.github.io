# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/729b24646e17478db41e4ad2675e9d7e
# 小O的字符串重排（OPPO 2024 秋招 · AI/算法岗）

"""
小O的字符串重排 —— 字符串 / 枚举 + 贪心

题目描述：
给定字符串 s（全小写），以及两个模式串 a、b（首字母大写、其余小写）。
可以任意重排 s 并自由改变每个字符的大小写，得到一个新字符串。
问新字符串中最多能出现多少个「子串 a」和「子串 b」的总数。

输入格式：
第一行一个仅含小写字母的字符串 s。
第二行一个字符串 a（首字母大写，其余小写）。
第三行一个字符串 b（首字母大写，其余小写）。

输出格式：
一个整数，表示最多能包含的子串个数。

核心思路：
1. 大小写可以随意改，所以「字符能否用上」只看字母本身，不看大小写。
   一个子串 a 消耗的字符就是 a 的全部字母（首字母用大写形式出现，
   其余用小写形式出现），b 同理。
2. 把 a 的每个副本看作一块，b 的每个副本看作另一块：排在字符串里互不重叠。
   于是问题变成「用 s 的字符最多能拼出几块 a 加几块 b」。
3. 设拼了 x 块 a，剩下的字符能拼出的 b 的块数是
   min_{c in b} (剩余 c 的个数 // b 中 c 的个数)，可以贪心直接算出。
4. a 的块数 x 只有 0..上限，枚举 x 取 x + (能拼出的 b 块数) 的最大值即可。
   上限不会超过 |s| / |a|，总复杂度 O(|s| / |a| * 26)。

时间复杂度：O(|s| / |a| * 26)
空间复杂度：O(26)
"""

# @sample-start
"""
样例输入 1:
abcdefg
Abc
Fge

样例输出 1:
2

说明：重排并改大小写为 AbcdFge，同时包含子串 Abc 和 Fge。
"""
# @sample-end

import sys
from collections import Counter


def max_copies(remain: Counter, need: Counter) -> int:
    """remain 里最多能装下几份 need（逐字符取最小值）"""
    best = -1
    for ch, c in need.items():
        cur = remain.get(ch, 0) // c
        if best < 0 or cur < best:
            best = cur
    return 0 if best < 0 else best


def solve() -> None:
    """枚举 a 的份数，剩下的字符贪心拼 b"""
    data = sys.stdin.read().split()
    if len(data) < 3:
        return

    s, a, b = data[0], data[1], data[2]

    cnt = Counter(s)
    need_a = Counter(a.lower())   # 只关心字母，大小写可以自由控制
    need_b = Counter(b.lower())

    # a 最多能拼出的份数
    limit = max_copies(cnt, need_a)

    ans = 0
    remain = Counter(cnt)
    for x in range(limit + 1):
        # 当前方案：x 份 a，剩余字符尽量拼 b
        total = x + max_copies(remain, need_b)
        if total > ans:
            ans = total
        # 为下一轮预留：再消耗一份 a
        for ch, c in need_a.items():
            remain[ch] -= c

    sys.stdout.write(str(ans) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("abcdefg\nAbc\nFge\n", "2"),            # 题面样例
        ("aa\nA\nA\n", "2"),                     # 同一个模式串可以重复使用
        ("a\nA\nB\n", "1"),                      # 只能拼出一个
        ("abc\nA\nA\n", "1"),                    # 字符不够拼两份
        ("aaaa\nAb\nAc\n", "0"),                 # 缺 b、c，一份都拼不出
        ("abcabc\nAbc\nCab\n", "2"),             # 两个模式串争用同一批字符
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
