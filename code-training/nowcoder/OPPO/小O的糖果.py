# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/c090ece039314d578e51913e758ce262
# 小O的糖果（OPPO 2024 秋招 · 移动开发）

"""
小O的糖果 —— 数学 / 分类讨论

题目描述：
小O 原有三盒糖果，数量为 a、b、c（编号 1、2、3）。他又拿到 x 颗糖，
要**恰好**分到 k 个新盒子里，每盒至少 1 颗，于是共有 k+3 盒（编号 4 ~ k+3）。
问：无论他怎么分，糖果最多的那一盒的编号是否「确定且唯一」？
是则输出 YES，否则输出 NO。

输入格式：
第一行三个整数 a、b、c（1 <= a,b,c <= 1e9）。
第二行两个整数 x、k（1 <= k <= x <= 1e9）。

输出格式：
输出一行 YES 或 NO。

核心思路：
三盒原有的糖果数是固定的，唯一会变的是新盒子。设原有三盒的最大值是 M、
取到 M 的盒数为 cnt。

1. 一个**新**盒子最多能装 x-(k-1) = x-k+1 颗（其它 k-1 盒各留 1 颗），
   记为 top。所有新盒子的取值都在 [1, top] 内，且这个上界真的能取到。
2. 如果 top > M，这一颗「大头」既可以放在 4 号盒、也可以放在 5 号盒，
   最多盒的编号就不确定了（k >= 2）；k = 1 时新盒只有一个，编号固定是 4，
   所以 x > M 时反而是 YES。
3. 如果 top < M，最多的一定还是原来那盒。此时只有 cnt = 1（最大值唯一）
   才能说编号确定且唯一。
4. 如果 top == M，可以让某个新盒子也拿到 M，与原最大值并列，不唯一。

时间复杂度：O(1)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
4 2 3
2 2

样例输出 1:
YES

样例输入 2:
5 3 6
100 2

样例输出 2:
NO
"""
# @sample-end

import sys


def solve() -> None:
    """比较「原有最大值」与「新盒子可能的最大值」，分情况判断"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    a, b, c = int(data[0]), int(data[1]), int(data[2])
    x, k = int(data[3]), int(data[4])

    m = max(a, b, c)
    cnt_m = (a == m) + (b == m) + (c == m)   # 有几盒并列最大
    top = x - k + 1                          # 单个新盒子最多能装多少

    if k == 1 and x > m:
        # 只有一个新盒子，它必然就是最多的那一盒，编号确定为 4
        ans = True
    elif top < m and cnt_m == 1:
        # 新盒子全都比 m 小，且原来最大的那盒唯一
        ans = True
    else:
        ans = False

    sys.stdout.write(("YES" if ans else "NO") + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4 2 3\n2 2\n", "YES"),        # 题面样例 1：新盒子各 1 颗，4 号最大
        ("5 3 6\n100 2\n", "NO"),       # 题面样例 2：100 颗想给谁就给谁
        ("1 1 1\n1 1\n", "NO"),         # 四盒全是 1，最多不唯一
        ("1 1 1\n2 1\n", "YES"),        # 唯一的新盒子拿 2 颗
        ("10 2 3\n4 2\n", "YES"),       # top = 3 < 10，且 10 只有一盒
        ("10 10 3\n4 2\n", "NO"),       # top = 3 < 10，但 10 有两盒并列
        ("3 2 1\n10 2\n", "NO"),        # top = 9 > 3，最大盒可能是 4 号或 5 号
        ("5 3 6\n7 2\n", "NO"),         # top = 6 正好追平原最大值
        ("5 3 6\n6 2\n", "YES"),        # top = 5 < 6，追不上
        ("1000000000 1 1\n1000000000 1\n", "NO"),  # 新盒子 10^9 颗，与原最大并列
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
