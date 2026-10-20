"""
P5612. K-Median 聚类 - 按题目固定流程模拟 Lloyd 迭代

给定 n 个样本，每个样本有 d 个浮点特征。按题目规定的固定流程做 K-Median 聚类：
- 初始化：用下标 0..k-1 的样本作为 k 个簇的初始中心；
- 分配：每个样本分到曼哈顿距离（L1）最近的中心，距离相同时取编号最小的簇；
- 更新：非空簇用簇内样本在每一维上的中位数替换中心，空簇中心保持不变；
- 停止：中心变化量（所有簇、所有维度上新旧坐标绝对差之和）小于 tol=1e-4，
  或迭代次数达到 max_iter=100。

输入格式：
- 第 1 行：n、d、k；
- 接下来 n 行：每行 d 个浮点数，表示一个样本。

输出格式：
- 第 1 行：n 个整数，最后一轮分配得到的簇编号；
- 接下来 k 行：每行 d 个浮点数（保留 6 位小数），本轮更新后的中心；
- 最后一行：inertia，即每个样本到所属簇中心的曼哈顿距离之和（保留 6 位小数）。

核心思路：
1. 用 L1 距离把每个样本分配给最近的中心，逐簇扫描并保留“严格更小”才替换，
   天然满足“距离相同取编号最小的簇”。
2. 更新中心时对每一维单独排序取中位数：奇数个取正中间，偶数个取中间两项平均。
3. 每轮把新旧中心的坐标绝对差累加得到变化量，小于 1e-4 立即停止。
4. 输出顺序是“先分配、后更新”的最后一轮：簇编号取自该轮分配，
   中心取自该轮更新后的结果，inertia 用这组中心和这组分配计算。

时间复杂度：O(iter * (n*k*d + n*d*log n))，iter <= 100；
空间复杂度：O(n*d + k*d)。
"""

import sys

TOL = 1e-4       # 中心变化量的收敛阈值
MAX_ITER = 100   # 迭代次数上限

# @sample-start
"""
样例输入 1:
3 2 1
2 8
6 1
4 5

样例输出 1:
0 0 0
4.000000 5.000000
11.000000
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4 2 2
1 1
4 2
5 5
8 8

样例输出 2:
0 0 1 1
2.500000 1.500000
6.500000 6.500000
10.000000
"""
# @sample-end


def median_of(values):
    """一维中位数：奇数个取正中间一项，偶数个取中间两项的算术平均。

    题目允许中位数是浮点数（例如 [1,3,5,9] 的中位数是 4），
    所以这里统一返回 float，避免整数除法带来的偏差。
    """
    ordered = sorted(values)
    m = len(ordered)
    mid = m // 2
    if m % 2 == 1:
        return float(ordered[mid])
    # 偶数个：中间两项求和后除以 2，结果是 .0 或 .5，double 可以精确表示
    return (ordered[mid - 1] + ordered[mid]) / 2.0


def l1_distance(x, y, dims):
    """曼哈顿距离：逐维取绝对差再求和。"""
    total = 0.0
    for t in range(dims):
        total += abs(x[t] - y[t])
    return total


def kmedian(samples, k, dims):
    """按题面流程迭代，返回 (最后一轮的分配, 本轮更新后的中心)。"""
    n = len(samples)

    # 初始化中心：直接取前 k 个样本的副本，后面会整体替换，不能和样本共用列表
    centers = [samples[i][:] for i in range(k)]
    labels = [0] * n

    for _ in range(MAX_ITER):
        # ---------- 分配 ----------
        for idx in range(n):
            x = samples[idx]
            best = 0
            best_dist = l1_distance(x, centers[0], dims)

            for j in range(1, k):
                c = centers[j]
                dist = 0.0
                for t in range(dims):
                    dist += abs(x[t] - c[t])
                    # 距离只会越加越大，一旦不严格小于当前最优，
                    # 就不可能再成为更近的簇，直接放弃这个候选
                    if dist >= best_dist:
                        break
                else:
                    # 只有严格更小才替换：距离相等时保留编号更小的簇，
                    # 因为 j 是从小到大枚举的，先到者即为编号最小者
                    best_dist = dist
                    best = j

            labels[idx] = best

        # ---------- 更新 ----------
        # 按簇收集样本，空簇在这里表现为空列表
        members = [[] for _ in range(k)]
        for idx in range(n):
            members[labels[idx]].append(samples[idx])

        new_centers = []
        for j in range(k):
            group = members[j]
            if not group:
                # 空簇没有样本可算中位数，题目要求保留原中心
                new_centers.append(centers[j])
                continue
            # 每一维单独取中位数，所以按列取值后排序
            new_centers.append(
                [median_of([row[t] for row in group]) for t in range(dims)]
            )

        # 中心变化量：所有簇、所有维度上新旧坐标绝对差的总和
        delta = 0.0
        for j in range(k):
            old, new = centers[j], new_centers[j]
            for t in range(dims):
                delta += abs(new[t] - old[t])

        centers = new_centers
        if delta < TOL:
            break

    return labels, centers


def format_float(value):
    """保留 6 位小数，并把 -0.000000 归一成 0.000000。"""
    if abs(value) < 5e-7:
        value = 0.0
    return f"{value:.6f}"


def solve():
    """读取输入、完成聚类并按要求输出。"""
    tokens = sys.stdin.buffer.read().split()
    if not tokens:
        return

    n = int(tokens[0])
    d = int(tokens[1])
    k = int(tokens[2])
    if n <= 0 or d <= 0 or k <= 0:
        return

    # 样本按行切分：每 d 个数是一个样本
    values = list(map(float, tokens[3:3 + n * d]))
    samples = [values[i * d:(i + 1) * d] for i in range(n)]

    labels, centers = kmedian(samples, k, d)

    # 第一行：最后一轮分配的簇编号
    print(" ".join(str(x) for x in labels))

    # 接下来 k 行：本轮更新后的中心
    for center in centers:
        print(" ".join(format_float(v) for v in center))

    # 最后一行：inertia = 每个样本到自己所属簇中心的曼哈顿距离之和
    inertia = 0.0
    for idx in range(n):
        inertia += l1_distance(samples[idx], centers[labels[idx]], d)
    print(format_float(inertia))


def run_tests():
    """运行嵌入的样例与边界用例。"""
    import io

    test_cases = [
        (
            # 官方样例 1：k=1，中位数把中心拉到 (4,5)
            "3 2 1\n2 8\n6 1\n4 5\n",
            "0 0 0\n4.000000 5.000000\n11.000000",
        ),
        (
            # 官方样例 2：中途出现距离相等的平局，取编号更小的簇
            "4 2 2\n1 1\n4 2\n5 5\n8 8\n",
            "0 0 1 1\n2.500000 1.500000\n6.500000 6.500000\n10.000000",
        ),
        (
            # 偶数个样本的中位数取平均：1,3,5,9 的中位数是 4
            "4 1 1\n1\n3\n5\n9\n",
            "0 0 0 0\n4.000000\n10.000000",
        ),
        (
            # 三个样本完全相同：初始中心都在 5，全部并入簇 0，簇 1 成为空簇
            "3 1 2\n5\n5\n5\n",
            "0 0 0\n5.000000\n5.000000\n0.000000",
        ),
        (
            # k=n：每个样本自成一簇，中心不变，inertia 为 0
            "2 1 2\n0\n10\n",
            "0 1\n0.000000\n10.000000\n0.000000",
        ),
        (
            # 平局写在最终结果里：样本 2 到两个初始中心距离都是 2，归入簇 0，
            # 于是簇 0 的中位数是 1，簇 1 保留 4，最终分配为 0 1 0
            "3 1 2\n0\n4\n2\n",
            "0 1 0\n1.000000\n4.000000\n2.000000",
        ),
        (
            # 单样本单簇：中心就是它自己，inertia 为 0
            "1 2 1\n-3.5 7\n",
            "0\n-3.500000 7.000000\n0.000000",
        ),
    ]

    all_passed = True
    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        passed = output == expected
        if not passed:
            all_passed = False
        status = "✓" if passed else "✗"
        print(f"样例 {i}: {status}")
        if not passed:
            print(f"  期望={expected!r}")
            print(f"  实际={output!r}")

    print("\n全部用例通过" if all_passed else "\n存在失败用例")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
