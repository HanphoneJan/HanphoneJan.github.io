# 牛客 · 美团笔试真题（2024-08-10 后端）
# https://www.nowcoder.com/discuss/653688247670878208
# 小美的密码

"""
小美的密码 —— 哈希表 / 模拟

题目描述：
小美准备登录美团，需要输入密码。她忘记了密码，只记得密码可能是 n 个字符串
中的一个。小美会按照密码长度从小到大依次尝试每个字符串；对于相同长度的字符串，
她会随机尝试，并且相同的密码只会尝试一次。
小美想知道，她最少需要尝试多少次才能登录成功，最多需要尝试多少次。

输入格式：
第一行一个整数 n，代表密码字符串的个数。
第二行一个只由小写字母组成的字符串 s，代表正确的密码。
接下来 n 行，每行一个字符串，代表小美记得的密码。

输出格式：
在一行上输出两个整数，表示最少和最多尝试次数。

核心思路：
- 长度比 |s| 小的密码一定都是错的，会被全部试一遍（且相同密码只试一次）；
- 长度等于 |s| 的密码有 d 个（去重后），她在这 d 个里随机试，
  最好情况第 1 个就中，最坏情况试到最后一个。

所以设 step = 「长度小于 |s| 的不同密码个数」，答案就是：

    最少 = step + 1
    最多 = step + d

用「长度 → 该长度下不同密码的集合」做统计即可。

时间复杂度：O(总长度)
空间复杂度：O(总长度)
"""

# @sample-start
"""
样例输入 1:
4
ab
abc
ab
ac
ac

样例输出 1:
1 2
"""
# @sample-end

import sys
from collections import defaultdict


def solve() -> None:
    """按长度分组去重，统计比正确密码短的个数"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    s = data[1]
    words = data[2:2 + n]

    by_len = defaultdict(set)
    for w in words:
        by_len[len(w)].add(w)

    step = 0
    mn = mx = -1
    for length in sorted(by_len):
        group = by_len[length]
        if s in group:
            mn = step + 1
            mx = step + len(group)
            break
        step += len(group)

    sys.stdout.write(f"{mn} {mx}\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4\nab\nabc\nab\nac\nac\n", "1 2"),
        ("1\nabc\nabc\n", "1 1"),
        ("3\naa\nb\nc\naa\n", "3 3"),   # 长度 1 的两个错密码先试完
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
