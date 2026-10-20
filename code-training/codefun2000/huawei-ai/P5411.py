"""
P5411. CDN 节点聚类选址与用户覆盖计算 - 按规则模拟 k-means

给定 p 座城市的坐标与用户数，要建 q 台 CDN，按题目给出的 k-means 流程迭代：
- 初始选址：输入顺序的前 q 座城市；
- 分配：每座城市分给距离最近的 CDN，平局分给编号更小的 CDN；
- 更新：每台 CDN 在自己的簇内选一座城市作为新址，使簇内所有用户到它的
  加权距离之和最小，平局选输入编号更小的城市；
- 所有 CDN 所在城市不再变化时停止。

输入格式：
- 第 1 行：正整数 p；
- 接下来 p 行：每行三个英文逗号分隔的浮点数 a,b,c（横坐标、纵坐标、用户数，单位万人）；
- 最后一行：正整数 q。

输出格式：
- q 行，每行三个英文逗号分隔的浮点数（横坐标、纵坐标、覆盖用户数），保留 2 位小数；
- CDN 按横坐标升序输出，横坐标相同则按纵坐标升序。

核心思路：
1. 用“城市编号”表示 CDN 的选址，坐标随时可以从城市表里取出来。
2. 每轮迭代：先按平方欧氏距离分配城市（比较平方距离即可，不必开方），
   再在每台 CDN 的簇内枚举候选城市、算加权距离和，取最小者。
3. 位置（城市编号）完全不变就收敛。输出时重新算一次覆盖用户数并排序。

时间复杂度：O(K * p^2)，K 为迭代轮数（实际远小于 p）；p < 100 时非常宽松
空间复杂度：O(p + q)
"""

# https://codefun2000.com/p/P5411
import math
import sys

# @sample-start
"""
样例输入 1:
4
1.00,1.00,10.00
2.00,1.00,1.00
5.00,5.00,1.00
6.00,5.00,10.00
2

样例输出 1:
1.00,1.00,11.00
6.00,5.00,11.00
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
5.50,6.25,7.75
1

样例输出 2:
5.50,6.25,7.75
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3
1.00,1.00,2.00
1.00,3.00,4.00
4.00,2.00,6.00
3

样例输出 3:
1.00,1.00,2.00
1.00,3.00,4.00
4.00,2.00,6.00
"""
# @sample-end


def format_number(value: float) -> str:
    """保留两位小数，并避免输出 -0.00。"""
    if abs(value) < 0.005:
        value = 0.0
    return f"{value:.2f}"


def solve():
    """读入城市与 CDN 数量，模拟 k-means 迭代后输出选址与覆盖用户数。"""
    # 输入是“逗号分隔的浮点数”，把逗号统一换成空格再切分，解析最简单。
    tokens = sys.stdin.read().replace(",", " ").split()
    if not tokens:
        return

    p = int(tokens[0])
    pos = 1
    xs = [0.0] * p
    ys = [0.0] * p
    users = [0.0] * p
    for i in range(p):
        xs[i] = float(tokens[pos])
        ys[i] = float(tokens[pos + 1])
        users[i] = float(tokens[pos + 2])
        pos += 3
    q = int(tokens[pos])

    # 题目保证 q <= p；这里再兜一层，避免越界
    q = min(q, p)

    # center[k] 是第 k 台 CDN 当前所在的城市编号。
    # 用编号而不是坐标，判“选址是否变化”时直接比较整数即可。
    center = list(range(q))

    def distance_sq(i: int, city: int) -> float:
        """城市 i 到“位于 city 的 CDN”的平方距离。"""
        dx = xs[i] - xs[city]
        dy = ys[i] - ys[city]
        return dx * dx + dy * dy

    def assign_cities():
        """把每座城市分配给最近的 CDN，返回分配结果与每个簇的成员列表。"""
        assign = [0] * p
        clusters = [[] for _ in range(q)]
        for i in range(p):
            best = 0
            best_d2 = float("inf")
            for k in range(q):
                d2 = distance_sq(i, center[k])
                # 严格更近才换人 => 距离相等时保留编号更小的 CDN（k 从小到大扫）
                if d2 < best_d2 - 1e-9:
                    best_d2 = d2
                    best = k
            assign[i] = best
            clusters[best].append(i)
        return assign, clusters

    def update_centers(clusters):
        """在每台 CDN 的簇内重新选址，返回新的城市编号列表。"""
        new_center = center[:]
        for k in range(q):
            members = clusters[k]
            if not members:
                # 簇为空（例如两台 CDN 落在同一点），没有候选城市，保持原位
                continue
            best_city = members[0]
            best_cost = None
            for cand in members:
                cost = 0.0
                xc = xs[cand]
                yc = ys[cand]
                for j in members:
                    dist = math.hypot(xs[j] - xc, ys[j] - yc)
                    cost += users[j] * dist
                # members 按输入编号升序，只有“明显更小”才换 => 平局留编号小的
                if best_cost is None or cost < best_cost - 1e-6:
                    best_cost = cost
                    best_city = cand
            new_center[k] = best_city
        return new_center

    # 迭代到选址不再变化为止。理论上 k-means 一定收敛，这里给一个上限兜底，
    # 防止极端平局导致的循环。
    for _ in range(1000):
        assign, clusters = assign_cities()
        new_center = update_centers(clusters)
        if new_center == center:
            break
        center = new_center

    # 用最终选址再分配一次，保证“覆盖用户数”与输出的坐标是同一套分配
    assign, clusters = assign_cities()

    coverage = [0.0] * q
    for i in range(p):
        coverage[assign[i]] += users[i]

    # 按横坐标升序、横坐标相同按纵坐标升序输出
    rows = [(xs[center[k]], ys[center[k]], coverage[k]) for k in range(q)]
    rows.sort(key=lambda row: (row[0], row[1]))

    lines = [",".join(format_number(v) for v in row) for row in rows]
    sys.stdout.write("\n".join(lines) + ("\n" if lines else ""))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：两轮迭代收敛
        (
            "4\n"
            "1.00,1.00,10.00\n"
            "2.00,1.00,1.00\n"
            "5.00,5.00,1.00\n"
            "6.00,5.00,10.00\n"
            "2\n",
            "1.00,1.00,11.00\n6.00,5.00,11.00",
        ),
        # 官方样例 2：只有一座城市
        (
            "1\n5.50,6.25,7.75\n1\n",
            "5.50,6.25,7.75",
        ),
        # 官方样例 3：q == p，每座城市自成一簇
        (
            "3\n"
            "1.00,1.00,2.00\n"
            "1.00,3.00,4.00\n"
            "4.00,2.00,6.00\n"
            "3\n",
            "1.00,1.00,2.00\n1.00,3.00,4.00\n4.00,2.00,6.00",
        ),
        # 更新时的平局：两座城市对称，加权距离和相同 -> 选编号更小的城市 0
        (
            "2\n1.00,1.00,1.00\n3.00,1.00,1.00\n1\n",
            "1.00,1.00,2.00",
        ),
        # 分配时的平局：(2,0) 到两台初始 CDN 距离都是 2 -> 归编号更小的第 1 台；
        # 第 1 台随后搬到 (2,0)，于是它覆盖城市 0 和城市 2，第 2 台只覆盖城市 1
        (
            "3\n0.00,0.00,1.00\n4.00,0.00,1.00\n2.00,0.00,100.00\n2\n",
            "2.00,0.00,101.00\n4.00,0.00,1.00",
        ),
        # 两台 CDN 初始就在同一坐标：距离全为 0，城市都给编号小的那台
        (
            "2\n2.00,2.00,3.00\n2.00,2.00,4.00\n2\n",
            "2.00,2.00,7.00\n2.00,2.00,0.00",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.StringIO(inp)
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
