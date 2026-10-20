"""
P5459. 骨干网管理域划分 - 二分 K-means（Bi-K-means）

把 L 台路由器（二维坐标点）划分成 N 个簇。做法是二分 K-means：
- 一开始全部点属于同一个簇 C0；
- 每一轮从当前簇集合中选一个“最值得分裂”的簇，用 K=2 的 K-means 把它裂成两个；
- 直到簇的个数达到 N。

选择规则（按优先级）：
1. SSE_Grad 更大（分裂带来的误差平方和下降更多）的簇优先；
2. SSE_Grad 相同，设备数更多的簇优先；
3. 设备数也相同，生成时间更早的簇优先。
簇的生成时间：C0 最早，每次分裂先产生“归入 x 最小初始质心一侧”的子簇，
再产生“归入 x 最大初始质心一侧”的子簇，两者都晚于父簇。

2-means 的实现约定：
- 初始质心固定取簇内 x 坐标最小和 x 坐标最大的两个设备（禁止随机初始化）；
- 距离相等时划入“x 坐标较小的初始质心”所在簇；
- 迭代终止条件：两个新质心的最大偏移量小于 1e-6，或所有设备的归属不再变化；
- 质心是簇内点坐标的算术平均，SSE 是到质心的欧氏距离平方和。

输入格式：
- 第 1 行：整数 N（期望簇数，1 <= N <= 20）；
- 第 2 行：整数 L（路由器台数，1 <= L <= 100）；
- 接下来 L 行：每行两个整数 x y（0 <= x, y <= 1000，且各点 x 互不相同）。

输出格式：
- 共 N 行。第 0 行只有一个数 L（初始簇的设备数）；第 i 行是已经得到 i+1 个簇时，
  各簇设备数按降序排列、以空格分隔的列表。

核心思路：
1. 每个簇只需保存“成员下标 + 生成时间”，点坐标单独存一张表；
2. 计算某个簇的分裂方案时，先按 x 排序取首尾两个点作为初始质心，跑 2-means，
   再算 SSE_Grad = SSE(父) - SSE(子1) - SSE(子2)；
3. 每一轮对所有可分裂的簇都算一遍分裂方案，按（SSE_Grad 降序，成员数降序，
   生成时间升序）挑出要分裂的那个，其余候选直接丢弃，下一轮重算即可；
4. 输出时把当前各簇规模排序后打印。

时间复杂度：O(N * K * L * I)，其中 K 为当前簇数、I 为 2-means 的迭代次数
（实际很小）；L <= 100、N <= 20，完全够用。
空间复杂度：O(L + K)。
"""

# https://codefun2000.com/p/P5459
import math
import sys

# 2-means 的质心偏移阈值，题面规定为 1e-6。
CENTROID_EPS = 1e-6

# SSE_Grad 的并列判定容差。浮点累加会有末位误差，直接用 == 比较会把
# “本来相等”的两个下降量判成不等，从而破坏“同分看设备数 / 生成时间”的规则。
GRAD_EPS = 1e-12

# @sample-start
"""
样例输入 1:
3
4
0 0
1 0
8 0
9 1

样例输出 1:
4
2 2
2 1 1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
3
4 2
7 9
11 3

样例输出 2:
3
"""
# @sample-end


def squared_distance(p, q):
    """两点欧氏距离的平方。比较远近时不必开方，避免多余误差。"""
    dx = p[0] - q[0]
    dy = p[1] - q[1]
    return dx * dx + dy * dy


def sse_of(points, indices, center):
    """簇内所有点到给定质心的距离平方和。"""
    return sum(squared_distance(points[i], center) for i in indices)


def mean_point(points, indices):
    """簇内所有点坐标的算术平均，即质心。"""
    sx = sum(points[i][0] for i in indices)
    sy = sum(points[i][1] for i in indices)
    n = len(indices)
    return (sx / n, sy / n)


def two_means(points, indices):
    """
    对已按 x 升序排列的下标列表做 2-means，返回两个子簇的下标列表。

    返回值顺序固定：第 1 个子簇对应“x 最小的初始质心”，
    第 2 个子簇对应“x 最大的初始质心”，这样调用方可以直接按题面规则
    给它们分配生成时间。
    """
    # 初始质心必须取簇内 x 最小、x 最大的两个设备。
    centroid_a = points[indices[0]]
    centroid_b = points[indices[-1]]

    def assign(center_a, center_b):
        """按最近的质心分配；距离相等时归入 a（a 的初始质心 x 更小）。"""
        labels = []
        for idx in indices:
            p = points[idx]
            da = squared_distance(p, center_a)
            db = squared_distance(p, center_b)
            # 用 <= 保证“距离相等归入 x 较小的一侧”。
            labels.append(0 if da <= db else 1)
        return labels

    labels = assign(centroid_a, centroid_b)

    while True:
        group_a = [idx for idx, lab in zip(indices, labels) if lab == 0]
        group_b = [idx for idx, lab in zip(indices, labels) if lab == 1]

        # 若某一侧为空，保留旧质心。正常数据下初始质心分别是首尾两个不同的点，
        # 不会出现空簇，这里只是防御性处理。
        new_a = mean_point(points, group_a) if group_a else centroid_a
        new_b = mean_point(points, group_b) if group_b else centroid_b

        # 两个新质心的最大欧氏偏移量。
        shift = max(
            math.sqrt(squared_distance(new_a, centroid_a)),
            math.sqrt(squared_distance(new_b, centroid_b)),
        )

        new_labels = assign(new_a, new_b)

        # 两个终止条件任一成立就停：质心基本不动，或归属不再变化。
        if shift < CENTROID_EPS or new_labels == labels:
            centroid_a, centroid_b = new_a, new_b
            labels = new_labels
            break

        centroid_a, centroid_b = new_a, new_b
        labels = new_labels

    group_a = [idx for idx, lab in zip(indices, labels) if lab == 0]
    group_b = [idx for idx, lab in zip(indices, labels) if lab == 1]
    return group_a, group_b


def split_gain(points, indices):
    """
    计算对一个簇做 2-means 分裂的 SSE_Grad。

    SSE_Grad = SSE(父簇) - SSE(子簇1) - SSE(子簇2)。
    """
    parent_center = mean_point(points, indices)
    parent_sse = sse_of(points, indices, parent_center)

    group_a, group_b = two_means(points, indices)

    child_sse = 0.0
    if group_a:
        child_sse += sse_of(points, group_a, mean_point(points, group_a))
    if group_b:
        child_sse += sse_of(points, group_b, mean_point(points, group_b))

    return parent_sse - child_sse, group_a, group_b


def solve():
    """读取点集，按题意反复分裂，输出每一轮的簇规模列表。"""
    data = sys.stdin.buffer.read().split()
    if len(data) < 2:
        return

    it = iter(data)
    target_clusters = int(next(it))
    total_points = int(next(it))

    points = []
    for _ in range(total_points):
        x = int(next(it))
        y = int(next(it))
        points.append((x, y))

    if total_points == 0 or target_clusters <= 0:
        return

    # 全局生成序号：C0 为 0，之后每分裂一次就分配两个更大的序号。
    # 用序号代替真实时间，比较“谁更早”就是比较序号大小。
    create_clock = 1

    # 每个簇保存成员下标与生成时间。成员按 x 升序，two_means 依赖这个顺序
    # 取首尾作为初始质心。
    clusters = [{
        "members": sorted(range(total_points), key=lambda i: points[i][0]),
        "born": 0,
    }]

    # 第 0 次结果：尚未分裂，只有一个簇。
    lines = [str(total_points)]

    while len(clusters) < target_clusters:
        best_index = -1
        best_gain = -1.0
        best_size = -1
        best_born = 0
        best_groups = None

        for pos, cluster in enumerate(clusters):
            members = cluster["members"]
            # 只有一个点的簇无法再分裂（此时总点数不足，属于越界输入）。
            if len(members) < 2:
                continue

            gain, group_a, group_b = split_gain(points, members)

            # 依次比较：下降量更大 > 成员更多 > 生成时间更早。
            if (gain > best_gain + GRAD_EPS
                    or (abs(gain - best_gain) <= GRAD_EPS
                        and len(members) > best_size)
                    or (abs(gain - best_gain) <= GRAD_EPS
                        and len(members) == best_size
                        and cluster["born"] < best_born)):
                best_index = pos
                best_gain = gain
                best_size = len(members)
                best_born = cluster["born"]
                best_groups = (group_a, group_b)

        # 所有簇都只剩一个点，无法继续分裂。属于 N > L 的越界输入，
        # 直接按当前规模补齐剩余行，避免死循环。
        if best_index == -1:
            current = sorted((len(c["members"]) for c in clusters), reverse=True)
            while len(lines) < target_clusters:
                lines.append(" ".join(map(str, current)))
            break

        group_a, group_b = best_groups

        # 先归入 x 最小初始质心一侧的子簇，再归入 x 最大一侧的子簇。
        child_a = {"members": group_a, "born": create_clock}
        child_b = {"members": group_b, "born": create_clock + 1}
        create_clock += 2

        clusters[best_index:best_index + 1] = [child_a, child_b]

        current = sorted((len(c["members"]) for c in clusters), reverse=True)
        lines.append(" ".join(map(str, current)))

    print("\n".join(lines))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "3\n4\n0 0\n1 0\n8 0\n9 1\n",
            "4\n2 2\n2 1 1",
        ),
        # 官方样例 2：N = 1，不需要分裂
        (
            "1\n3\n4 2\n7 9\n11 3\n",
            "3",
        ),
        # 两个点、两个簇：一次分裂就得到两个单点簇
        (
            "2\n2\n0 0\n10 10\n",
            "2\n1 1",
        ),
        # 四个点等距共线，N = 4：先分成 2+2，再依次裂开两个规模相同的簇。
        # 两个 2 点簇的 SSE_Grad 完全相同，靠“生成时间更早”决出先后。
        (
            "4\n4\n0 0\n1 0\n2 0\n3 0\n",
            "4\n2 2\n2 1 1\n1 1 1 1",
        ),
        # N 等于点数：最终每个点自成一个簇
        (
            "3\n3\n0 0\n5 100\n9 2\n",
            "3\n2 1\n1 1 1",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读取，需要带 buffer 的文本流
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
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
