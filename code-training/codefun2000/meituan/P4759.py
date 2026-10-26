"""
P4759. 纯净之力 - 构造

题面要点：一个字符串的「纯净力」= 把所有字符互不相同的子串按起始位置
计数后，最长的那一波的数量。给 L 和 M，构造长度恰好为 L 的小写串使纯净力
恰好为 M，构造不出输出 -1。

输入：一行两个整数 L M。
输出：合法串或 -1。

核心思路：
1. M = L：全 'a'，最长纯净子串长度 1，个数恰为 L。
2. M < L：交替写 M+1 个字符 'abab…'（相邻字符两两不同），尾部全部填
   交替段的最后一个字符。这样整串只用 'a'/'b' 两个字母：
   - 最长纯净子串长度为 2（三个字符里必有一个重复）；
   - 长度为 2 的纯净子串 = 相邻两字符不同的位置对，交替段贡献 M 个，
     且尾部首字符与交替段末字符相同，边界处不额外产生 → 纯净力 = M。
   尾部字符必须抄交替段末字符，否则 M 为奇数时边界会多出一个 (b,a) 对。

约束给的是 M ≤ L；若 M > L 则不可能，输出 -1。

时间复杂度：O(L)
空间复杂度：O(L)
"""

# https://codefun2000.com/p/P4759
import sys

# @sample-start
"""
样例输入 1:
1 1

样例输出 1:
a
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6 6

样例输出 2:
aaaaaa
"""
# @sample-end

# @sample-start
"""
样例输入 3:
5 2

样例输出 3:
abaaa
"""
# @sample-end

# @sample-start
"""
样例输入 4:
4 3

样例输出 4:
abab
"""
# @sample-end


def build(L, M):
    """返回一个纯净力恰为 M 的长度 L 小写串；无解返回 None。"""
    if M > L:
        return None
    if M == L:
        return "a" * L
    # M < L：交替段 M+1 个字符，尾部抄交替段末字符
    core = ("ab" * ((M + 1 + 1) // 2))[: M + 1]
    return core + core[-1] * (L - M - 1)


def purity(s):
    """按题面定义计算纯净力：最长纯串的数量（按起始位置）。"""
    n = len(s)
    # 以每个起点为始的最长全不同子串长（双指针）
    best = 0
    starts = []
    seen = set()
    left = 0
    for right, ch in enumerate(s):
        while ch in seen:
            seen.discard(s[left])
            left += 1
        seen.add(ch)
        length = right - left + 1
        if length > best:
            best = length
            starts = [left]
        elif length == best:
            starts.append(left)
    return len(starts)


def solve():
    L, M = (int(x) for x in sys.stdin.read().split())
    res = build(L, M)
    sys.stdout.write(res if res is not None else "-1")
    sys.stdout.write("\n")


def run_tests():
    """官方样例 + 构造正确性校验（用 purity 反验每个输出）。"""
    import io

    test_cases = [
        # 官方样例 1~4
        ("1 1\n", "a"),
        ("6 6\n", "aaaaaa"),
        ("5 2\n", "abaaa"),
        ("4 3\n", "abab"),
        # M < L 的奇数 M：边界不能多出 (b,a) 对
        ("6 3\n", "abab" + "b" + "b"),
        # M=1：交替段长度 2
        ("4 1\n", "ab" + "b" + "b"),
        # 极端：M=L=1 与 M=2,L=2
        ("2 2\n", "aa"),
        # M=1, L=2：交替段本身就占满长串
        ("2 1\n", "ab"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        # expected 里写的是构造意图时，用 purity 反验
        if expected is None:
            expected = output
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 程序性的通盘校验：对一批 (L, M) 跑 build 并用 purity 复核 = M
    import random

    rng = random.Random(20260328)
    ok = True
    for case in range(500):
        L = rng.randint(1, 60)
        M = rng.randint(1, L)  # 约束里 M ≤ L
        s = build(L, M)
        if s is None or len(s) != L or purity(s) != M:
            ok = False
            print(f"构造失败: L={L} M={M} s={s} purity={None if not s else purity(s)}")
            break
    print(f"随机构造自检 500 组: {'✓' if ok else '✗'}")

    # M > L 无解
    print("M > L:", build(3, 5))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
