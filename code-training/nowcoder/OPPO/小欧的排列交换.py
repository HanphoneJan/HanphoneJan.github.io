# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/1875f9b665544fcfab04056444cd69e9
# 小欧的排列交换（2023 秋招 · 移动端岗）

"""
小欧的排列交换 —— 构造 / 奇偶性

题目描述：
给定 1 到 n 的一个排列，每次操作可以交换任意两个数。
要求在不超过 n-1 次操作后，使得没有两个相邻的数同为奇数、也没有两个相邻的数同为偶数，
输出任意一种合法方案。

输入格式：
第一行一个正整数 n（1 <= n <= 10^5）。
第二行 n 个正整数 a_i，代表这个排列。

输出格式：
第一行输出交换次数 k。
接下来 k 行，每行两个正整数，表示交换这两个「数值」（不是下标）。

核心思路：
1 到 n 中奇数有 ceil(n/2) 个、偶数有 floor(n/2) 个，所以交替排列一定存在，
且只能有一种奇偶骨架：奇数放在第 1、3、5、... 个位置，偶数放在第 2、4、... 个位置。

于是把「位置」分成两类：需要奇数却放着偶数的位置、需要偶数却放着奇数的位置。
这两类位置的个数一定相等（因为总数对得上）。把它们两两配对交换一次，
每个交换同时修好两个位置，次数最多 n/2，一定不超过 n-1。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3
3 1 2

样例输出 1:
1
1 2
"""
# @sample-end

import sys


def solve():
    """把「该放奇数却放了偶数」和「该放偶数却放了奇数」的位置两两交换"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    a = [int(t) for t in data[1:1 + n]]

    need_odd = []    # 位置（1 起）需要奇数，但当前放的是偶数
    need_even = []   # 位置（1 起）需要偶数，但当前放的是奇数
    for idx in range(1, n + 1):
        want_odd = idx % 2 == 1
        is_odd = a[idx - 1] % 2 == 1
        if want_odd and not is_odd:
            need_odd.append(idx)
        elif not want_odd and is_odd:
            need_even.append(idx)

    swaps = []
    for p, q in zip(need_odd, need_even):
        # 交换这两个位置上的「数值」，输出时用的是数值本身
        swaps.append((a[q - 1], a[p - 1]))

    out = [str(len(swaps))]
    out += [f"{x} {y}" for x, y in swaps]
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    tests = [
        # 题面样例
        ("3\n3 1 2\n", "1\n1 2"),
        # 已经是交替的：一次都不用换
        ("4\n1 2 3 4\n", "0"),
        # 只有 n = 1
        ("1\n1\n", "0"),
        # 完全反着放：四个位置两两配对，交换两次
        ("4\n2 1 4 3\n", "2\n1 2\n3 4"),
        # n = 2 逆序
        ("2\n2 1\n", "1\n1 2"),
    ]

    for i, (inp, expected) in enumerate(tests, 1):
        # 用 BytesIO 包一层，solve() 里的 sys.stdin.buffer 才有内容可读
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
