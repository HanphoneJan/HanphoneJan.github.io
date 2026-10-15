# 牛客题霸 · 美团笔试真题
# https://www.nowcoder.com/practice/5cf15987d8654d69b67e46fb25fe051b
# 小美的彩带（美团 2024 秋招，循环数组 + 离线树状数组）

"""
小美的彩带 —— 离散化 + 离线树状数组

题目描述：
小美的彩带是由一条长度为 n 的彩带无限循环得到的（即 i > n 时 a[i] = a[i-n]），
每个位置有一个颜色 a[i]。小美每次会从左往右或从右往左剪一段长度为 x 的彩带，
她想知道每次剪下来的彩带里有多少种颜色。

输入格式：
第一行两个整数 n、q，代表彩带长度和裁剪次数。
第二行 n 个整数 a[i]，代表每个位置的颜色。
此后 q 行，每行一个字符 c 和一个整数 x：'L' 表示从左往右剪，'R' 表示从右往左剪。

输出格式：
对每次裁剪，在一行输出一个整数，代表剪下来的彩带中不同颜色的数量。

核心思路（关键在「裁剪位置是累积的」）：
- 'L' 的第 i 次裁剪，接在上一次 'L' 裁剪的右边 —— 用一个左指针 l 记录；
- 'R' 的第 i 次裁剪，接在上一次 'R' 裁剪的左边 —— 用一个右指针 r 记录；
- 两个指针分别维护，互不影响。
  指针越界时按周期平移回 1..n 内。

把彩带复制一份接在后面（长度变成 2n），所有裁剪区间就都落在这条
「倍增数组」上。问题变成「求倍增数组上区间 [l, r] 内不同颜色数」：

- 按区间右端点 r 升序离线处理；
- 从左往右扫，树状数组里只保留每种颜色**当前最后一次出现**的位置
  （旧位置 -1，新位置 +1）；
- 答案 = sum(r) - sum(l - 1)。

时间复杂度：O((n + q) log n)
空间复杂度：O(n + q)
"""

# @sample-start
"""
样例输入 1:
6 4
1 1 4 5 1 4
L 2
L 3
R 12
R 1

样例输出 1:
1
3
3
1
"""
# @sample-end

import sys


def solve() -> None:
    """离线树状数组求倍增数组上的区间不同颜色数"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); q = int(data[idx + 1]); idx += 2
    colors = data[idx:idx + n]; idx += n

    # 颜色离散化
    comp = {v: i for i, v in enumerate(sorted(set(colors)))}
    arr = [comp[v] for v in colors]
    doubled = arr + arr
    size = 2 * n

    # 累积指针：L 从左往右推进，R 从右往左回退（下标 0 起）
    left = 0
    right = size - 1
    queries = []  # (l, r, query_index)
    for qi in range(q):
        c = data[idx]; x = int(data[idx + 1]); idx += 2
        if c == 'L':
            while left >= n:
                left -= n
            l = left
            r = min(left + x - 1, size - 1)
            queries.append((l, r, qi))
            left = l + x
        else:  # 'R'
            while right < n:
                right += n
            r = right
            l = max(right - x + 1, 0)
            queries.append((l, r, qi))
            right = l - 1

    # 树状数组（下标 1 起）
    bit = [0] * (size + 1)

    def add(i: int, v: int) -> None:
        i += 1
        while i <= size:
            bit[i] += v
            i += i & -i

    def prefix(i: int) -> int:
        i += 1
        s = 0
        while i > 0:
            s += bit[i]
            i -= i & -i
        return s

    ans = [0] * q
    last = {}
    ptr = 0
    for l, r, qi in sorted(queries, key=lambda t: t[1]):
        while ptr <= r:
            col = doubled[ptr]
            if col in last:
                add(last[col], -1)
            last[col] = ptr
            add(ptr, 1)
            ptr += 1
        ans[qi] = prefix(r) - (prefix(l - 1) if l > 0 else 0)

    sys.stdout.write("\n".join(map(str, ans)) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("6 4\n1 1 4 5 1 4\nL 2\nL 3\nR 12\nR 1\n", "1\n3\n3\n1"),
        ("3 3\n1 2 3\nL 1\nL 3\nR 2\n", "1\n3\n2"),
        ("1 2\n7\nL 5\nR 1\n", "1\n1"),
        ("4 2\n1 2 1 2\nR 2\nR 2\n", "2\n2"),
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
