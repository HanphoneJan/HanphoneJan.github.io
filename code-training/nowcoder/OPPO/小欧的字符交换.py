# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/e2aea9d40feb423ab33c09c0ca8cf672
# 小欧的字符交换（2023 秋招 · 后端岗）

"""
小欧的字符交换 —— 字符串 / 模拟

题目描述：
有 q 组询问，每组给两个等长字符串 s、t。
问能否在 s 中交换一对相邻字符（最多一次，也可以不换）使得 s 与 t 相等。

输入格式：
第一行一个正整数 q（1 <= q <= 100）。
接下来 2q 行，每两行为一组 s 和 t，仅含小写字母，长度不超过 100。

输出格式：
每组询问输出一行 Yes 或 No。

核心思路：
一次相邻交换只会改动两个相邻位置，所以先看 s 与 t 有几处不同：

  - 0 处不同：本来就相等，交换 0 次即可，输出 Yes；
  - 1 处不同：一次相邻交换必然同时改动两个位置，另一处会被改坏，
    不可能修好，输出 No；
  - 恰好 2 处不同：只有当这两处相邻，且交叉相等
    （s[i] == t[j] 且 s[j] == t[i]）时，交换它们才能对上，否则 No；
  - 3 处及以上：一次交换最多消掉两处差异，不可能，输出 No。

时间复杂度：O(q * L)，L 为字符串长度
空间复杂度：O(L)（存放不同位置的下标）
"""

# @sample-start
"""
样例输入 1:
3
acb
cab
abcxz
cbaxz
wa
wa

样例输出 1:
Yes
No
Yes
"""
# @sample-end

import sys


def can_make_equal(s: str, t: str) -> bool:
    """最多交换一对相邻字符，s 能否变成 t"""
    if s == t:
        return True

    diff = [i for i in range(len(s)) if s[i] != t[i]]
    if len(diff) != 2:
        return False

    i, j = diff
    # 必须相邻，且两个字符互换后正好各自对上
    return j == i + 1 and s[i] == t[j] and s[j] == t[i]


def solve() -> None:
    """逐组询问判断并输出 Yes / No"""
    data = sys.stdin.read().split()
    if not data:
        return
    q = int(data[0])
    out = []
    pos = 1
    for _ in range(q):
        s, t = data[pos], data[pos + 1]
        pos += 2
        out.append("Yes" if can_make_equal(s, t) else "No")
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3\nacb\ncab\nabcxz\ncbaxz\nwa\nwa\n", "Yes\nNo\nYes"),  # 样例 1
        ("1\nab\nba\n", "Yes"),          # 交换一次正好相等
        ("1\na\na\n", "Yes"),            # 单字符，不交换
        ("1\nab\nac\n", "No"),           # 只有一处不同，换不动
        ("1\nabc\ncba\n", "No"),         # 两处不同但不相邻
        ("1\nab\ncd\n", "No"),           # 两处不同且交叉不相等
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
