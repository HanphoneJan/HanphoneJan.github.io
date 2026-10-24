# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/6c1271ba007148469ec9058ebad5066a
# 小欧的平面连线（OPPO 2023 秋招 · 研发岗）

"""
小欧的平面连线 —— 数学 / 贪心 / 分类讨论

题目描述：
平面上有 n 个点（n 为偶数，x、y 均非零、互不相同），两两配对连线段。
线段每与一条坐标轴相交得 1 分（同时交 x 轴与 y 轴得 2 分，过原点也算 2 分），
求 n/2 条线段的权值之和的最大值。

输入格式：
第一行一个整数 n。
接下来 n 行，每行两个非零整数 x、y。

输出格式：
一个整数，表示最大权值。

核心思路：
1. 一条线段与 x 轴相交 <=> 两个端点的 y 异号；
   与 y 轴相交 <=> 两个端点的 x 异号。
   所以一对点的权值只取决于它们各自落在哪个象限：
   两个坐标都异号得 2 分，只有一个异号得 1 分，同象限得 0 分。
2. 四个象限记为：(+,+) 与 (-,-) 互补，( +,-) 与 (-,+) 互补。
   只有「互补」的两类配对才能拿到 2 分。
3. 先把能配的互补对全部配上，得到 2 * min(q++ , q--) + 2 * min(q+-, q-+) 分。
4. 剩下的是某一类「同号组」的残余和另一类「异号组」的残余，
   它们之间任意配对恰好只有一个坐标异号，得 1 分，能配 min(r1, r2) 对；
   再剩下的点同类，只能得 0 分。
5. 每对 2 分的配对与「拆成两对 1 分」等价（都是 2 分 / 2 个点），
   所以先配互补对不影响最优性。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
2
1 1
-1 -1

样例输出 1:
2

样例输入 2:
4
1 1
-1 1
2 1
-2 1

样例输出 2:
2

说明：示例 2 中所有点都在 x 轴上方，(1,1) 配 (-2,1)、(2,1) 配 (-1,1)，
两条线段都只与 y 轴相交，各得 1 分，共 2 分。
"""
# @sample-end

import sys


def solve() -> None:
    """按象限分类计数，先配互补类再配残余"""
    data = list(map(int, sys.stdin.buffer.read().split()))
    if not data:
        return

    n = data[0]
    q = [0, 0, 0, 0]          # 下标 (x 正?, y 正?) -> 象限计数
    for i in range(n):
        x = data[1 + 2 * i]
        y = data[2 + 2 * i]
        q[(1 if x > 0 else 0) * 2 + (1 if y > 0 else 0)] += 1

    q_pp, q_pn, q_np, q_nn = q[3], q[1], q[2], q[0]

    # 两个坐标都异号的互补配对，每对 2 分
    ans = 2 * min(q_pp, q_nn) + 2 * min(q_pn, q_np)

    # 残余之间恰好一个坐标异号，每对 1 分
    r1 = abs(q_pp - q_nn)
    r2 = abs(q_pn - q_np)
    ans += min(r1, r2)

    sys.stdout.write(str(ans) + "\n")


def run_tests() -> None:
    """运行样例与边界用例"""
    import io

    tests = [
        ("2\n1 1\n-1 -1\n", "2"),                            # 题面样例 1，过原点
        ("4\n1 1\n-1 1\n2 1\n-2 1\n", "2"),                   # 题面样例 2
        ("2\n1 1\n2 2\n", "0"),                               # 同象限，0 分
        ("2\n1 -1\n-1 1\n", "2"),                             # 两个坐标都异号
        ("4\n1 1\n-1 -1\n1 -1\n-1 1\n", "4"),                 # 四象限各一个，全 2 分
        ("6\n1 1\n2 2\n3 3\n1 -1\n-1 1\n-1 -1\n", "4"),       # 3 个同象限 + 3 个不同象限
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
