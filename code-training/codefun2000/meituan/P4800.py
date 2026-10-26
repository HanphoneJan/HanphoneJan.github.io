"""
P4800. 亲近度排名矩阵 - 逐点排序 + 等值计数

题意：n 个点（整数坐标），对每对点定义亲近度
d(i,j) = (x_i-x_j)^2 + (y_i-y_j)^2。对每个 i 求 S(i,j)：
与 i 相比不比 j 远（d <=，含平手）、既不是 i 也不是 j 的点数；
对角线 S(i,i) = 0。输出整个 n*n 矩阵。

观察：S(i,j) 只依赖 d(i,j) 的「好坏程度」，不依赖 j 本身哪一位。固定 i，
把全部 n 个距离（含 j==i 处的 0）排序，则

    S(i,j) = #{k != i : d(i,k) <= d(i,j)} - 2

（排序数组里混着 d(i,i)=0 与 j 自己那一格，要剔掉；与之平手的其它点保留）。
于是每个 i 只需把距离排序一遍，再为每个不同距离值查出「<= 它的个数」，
矩阵一行就由一次查表得到。等值平手不需要按任何次序打破——平手点彼此
的 S 值都一样，这正是样例 2 中 S(2,1)=S(2,3)=1 的来源。

数据范围：所有组 n 的总和 <= 2000，故 O(sum n^2) 的两两距离 + 每行一次
排序完全可行，不需要任何几何数据结构。

输入格式：
- 第 1 行：测试组数 T；
- 每组：第一行 n，接下来 n 行每行两个整数 x_i, y_i。

输出格式：
- 每组 n 行，第 i 行 n 个整数（空格分隔），为 S(i,1..n)。

时间复杂度：O(T + sum(n^2 log n))，按约束 sum n <= 2000 计算约 4*10^7 次基本运算
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4800
import sys

# @sample-start
"""
样例 1:
1
1
10 20
->
0
"""
# @sample-end

# @sample-start
"""
样例 2:
1
3
1 1
2 2
3 3
->
0 0 1
1 0 1
1 0 0
"""
# @sample-end

# @sample-start
"""
样例 3:
1
3
0 0
0 1
1 0
->
0 1 1
0 0 1
0 1 0
"""
# @sample-end


def solve():
    """逐点计算距离行，排序后按等值段计数，拼出矩阵。"""
    data = sys.stdin.buffer.read().split()
    pos = 1
    t = int(data[0])
    out = []
    for _ in range(t):
        n = int(data[pos])
        pos += 1
        xs = [0] * n
        ys = [0] * n
        for i in range(n):
            xs[i] = int(data[pos])
            ys[i] = int(data[pos + 1])
            pos += 2

        for i in range(n):
            xi = xs[i]
            yi = ys[i]
            # 其余 n-1 个点的亲近度（j==i 处距离为 0，占位不参与计数）
            dist = [(xi - xs[j]) ** 2 + (yi - ys[j]) ** 2 for j in range(n)]

            # 排序后按等值段统计：对每个不同距离值 v，
            # 记录「严格小于 v 的个数 + 该段长度」= 排序数组里该段末尾的位置，
            # 也就是 #{k != i : d(i,k) <= v}。
            sd = sorted(dist)
            le_count = {}
            p = 0
            while p < n:
                v = sd[p]
                q = p
                while q < n and sd[q] == v:
                    q += 1
                le_count[v] = q
                p = q

            # S(i,j) = 上述计数 - 2（排序数组里混着 d(i,i)=0 与 j 自己，
            # 都要剔除）；对角线按定义置 0。与 i 完全重合的点 d 为 0，
            # 公式自然退化，仍然成立。
            row = [le_count[dist[j]] - 2 if j != i else 0 for j in range(n)]
            out.append(" ".join(map(str, row)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的官方样例与自加的边界/变形用例。"""
    import io
    import random

    def run_once(inp):
        old = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().rstrip("\n")
        finally:
            sys.stdin, sys.stdout = old

    def brute(points):
        """参照实现：按矩阵定义逐格统计，O(n^3)。"""
        n = len(points)
        d = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                d[i][j] = (points[i][0] - points[j][0]) ** 2 + (points[i][1] - points[j][1]) ** 2
        res = []
        for i in range(n):
            row = []
            for j in range(n):
                if i == j:
                    row.append(0)
                else:
                    c = sum(1 for k in range(n) if k != i and k != j and d[i][k] <= d[i][j])
                    row.append(c)
            res.append(" ".join(map(str, row)))
        return "\n".join(res)

    cases = [
        # 官方样例 1：n=1 对角线为 0
        ("1\n1\n10 20\n", "0"),
        # 官方样例 2：共线等距，平手使 S(2,1)=S(2,3)=1
        ("1\n3\n1 1\n2 2\n3 3\n", "0 0 1\n1 0 1\n1 0 0"),
        # 官方样例 3：等腰直角三角形，两腰到角点 d 同为 1
        ("1\n3\n0 0\n0 1\n1 0\n", "0 1 1\n0 0 1\n0 1 0"),
        # 边界：两点，互为唯一近邻，S 都是 0
        ("1\n2\n5 5\n6 7\n", "0 0\n0 0"),
        # 四个点两两等距（正方形四角按平方距离看：边 2、对角 8），检验平手计数
        ("1\n4\n0 0\n0 2\n2 0\n2 2\n", "0 1 1 2\n1 0 2 1\n1 2 0 1\n2 1 1 0"),
        # 全部点重合：到任何点的 d 都是 0，除自身外全员平手
        ("1\n3\n7 7\n7 7\n7 7\n", "0 1 1\n1 0 1\n1 1 0"),
        # 多组数据
        ("2\n2\n0 0\n1 1\n1\n3 4\n", "0 0\n0 0\n0"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        got = run_once(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")

    # 随机对拍：与 O(n^3) 定义实现比较
    rng = random.Random(20260418)
    ok = True
    for trial in range(300):
        n = rng.randint(1, 8)
        points = [(rng.randint(0, 10), rng.randint(0, 10)) for _ in range(n)]
        inp = "1\n%d\n%s\n" % (n, "\n".join(f"{x} {y}" for x, y in points))
        got = run_once(inp)
        want = brute(points)
        if got != want:
            ok = False
            print(f"对拍失败: points={points}\n期望:\n{want}\n实际:\n{got}")
    print("随机对拍:", "全部通过" if ok else "存在失败")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
