"""
饼干分配 - 一个孩子可以拿多块饼干，求最多能满足多少个孩子

题目描述：
有 n 个孩子和 m 块饼干。第 i 个孩子的胃口是 g[i]，第 j 块饼干的尺寸是 s[j]。
每块饼干最多分给一个孩子，一个孩子可以拿多块饼干。
一个孩子拿到的饼干总尺寸大于等于它的胃口时，这个孩子才算被满足。
求最多能满足多少个孩子。

输入格式：
- 第一行：两个整数 n m
- 第二行：n 个整数，表示每个孩子的胃口
- 第三行：m 个整数，表示每块饼干的尺寸

输出格式：
- 一行：一个整数，最多能满足的孩子数量

核心思路：
整块分配、一个孩子可拿多块时，问题的一般形式是 NP-hard（所有胃口相同就退化成
bin covering）。下面按 m <= 16 的规模给出精确解。

1. 把胃口升序排序。最优解一定是满足胃口最小的前 k 个孩子：
   如果能满足某个孩子，用同一组饼干去满足一个胃口更小的孩子一定也可以。
2. 用二进制掩码表示“哪些饼干已经被使用”。sum[mask] 是这些饼干的尺寸和。
3. f[mask] 表示用 mask 里的饼干（可以剩一些不用）最多能满足前几个孩子。
   枚举 mask 的一个非空子集 sub 作为下一个孩子的饼干：
       rest = mask ^ sub
       k = f[rest]
       若 sum[sub] >= g[k]，则 f[mask] = max(f[mask], k + 1)
   也就是把 sub 分给第 k 个孩子，剩下的 rest 继续满足前 k 个孩子。
4. 答案是 f[(1 << m) - 1]。

时间复杂度：O(3^m)
空间复杂度：O(2^m)
"""

import sys

# @sample-start
"""
样例输入 1:
1 1
3
3

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 4
1 4 5
1 2 3 4

样例输出 2:
3
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 2
5
2 2

样例输出 3:
0
"""
# @sample-end

# @sample-start
"""
样例输入 4:
3 2
1 2 3
1 1

样例输出 4:
1
"""
# @sample-end


def max_satisfied(g, s) -> int:
    """返回最多能满足的孩子数量。"""
    g = sorted(g)
    s = sorted(s)
    n, m = len(g), len(s)
    if n == 0 or m == 0:
        return 0

    total = 1 << m
    # sum_mask[mask] = mask 里所有饼干的尺寸和
    sum_mask = [0] * total
    for mask in range(1, total):
        low = mask & -mask
        sum_mask[mask] = sum_mask[mask ^ low] + s[low.bit_length() - 1]

    # f[mask] = 用 mask 里的饼干最多能满足前几个孩子
    f = [0] * total
    for mask in range(1, total):
        best = 0
        sub = mask
        while sub:
            rest = mask ^ sub
            k = f[rest]
            # 把 sub 这一组饼干分给第 k 个孩子（胃口为 g[k]）
            if k < n and sum_mask[sub] >= g[k]:
                cand = k + 1
                if cand > best:
                    best = cand
                    if best == n:      # 已经满足所有孩子，不可能更好
                        break
            sub = (sub - 1) & mask
        f[mask] = best
    return f[total - 1]


def solve() -> None:
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    n, m = data[0], data[1]
    g = data[2:2 + n]
    s = data[2 + n:2 + n + m]
    print(max_satisfied(g, s))


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3 2\n1 2 3\n1 1\n", "1"),
        ("3 4\n1 4 5\n1 2 3 4\n", "3"),
        ("1 2\n5\n2 2\n", "0"),
        ("2 3\n1 2\n1 2 3\n", "2"),
        ("1 1\n2\n3\n", "1"),
        ("1 1\n3\n3\n", "1"),
        ("1 1\n4\n3\n", "0"),
        ("2 4\n3 3\n1 2 3 3\n", "2"),
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
