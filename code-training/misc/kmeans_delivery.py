"""
第3题-快递员极速配送挑战 - K-Means 聚类 + 路径规划

某快递员负责一个片区的快递配送业务，需要将 N 个包裹划分为 K 个簇（社区），
快递员只需将快递送到社区中心。按照每个社区中心与起点之间的距离由近到远排序，
依次送完所有社区的快递，最后返回起始位置。

输入格式：
- 第1行：3个整数 K, N, speed（社区数、包裹数、速度 km/h）
- 接下来 N 行：每行2个浮点数 x, y（包裹坐标）

输出格式：
- 一个整数，配送总时间（秒），向下取整

K-Means 聚类步骤：
1. 种子点初始化：按到原点距离升序排序，取前 K 个点
2. 分配：每个点分配到最近的中心
3. 更新：重新计算每个簇的中心（均值）
4. 收敛判断：中心移动距离之和 < 1e-4 或达到最大迭代次数

时间复杂度：O(max_iters * N * K)
空间复杂度：O(N + K)
"""

# https://codefun2000.com/p/P4730
import sys
import math

# 一般只能用标准库，不能用numpy

# @sample-start
"""
样例输入 1:
3 10 30
1.2 1.5
1.8 1.2
5.0 5.2
5.5 4.8
4.9 5.5
-2.0 3.0
-2.5 3.5
-1.8 2.8
1.5 1.8
5.2 5.0

样例输出 1:
2502
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5 3 10
1.00 1.00
2.00 2.00
3.00 3.00

样例输出 2:
3054
"""
# @sample-end

def kmeans_clustering(points, K, max_iters=1000, tol=1e-4):
    """
    对 points 进行 K-means 聚类，返回最终的中心点列表。
    - points: list of (x, y)
    - K: 簇数量
    - max_iters: 最大迭代次数
    - tol: 中心移动距离之和的收敛阈值
    """
    # 1. 初始化中心：按到原点距离从小到大排序，取前 K 个（距离相同保持输入顺序）
    # sorted(iterable, key=None, reverse=False)
    sorted_points = sorted(points, key=lambda p: math.hypot(p[0], p[1]))
    centers = sorted_points[:K]  # 每个中心为 (x, y)

    for _ in range(max_iters):
        # 分配每个点到最近的中心
        labels = []
        for p in points:
            # 计算到各个中心的距离
            min_dist = math.inf
            best_k = 0
            for k, c in enumerate(centers):
                dist = math.hypot(p[0] - c[0], p[1] - c[1])
                if dist < min_dist:
                    min_dist = dist
                    best_k = k
            labels.append(best_k)

        # 计算新的中心
        new_centers = []
        for k in range(K):
            # 收集属于当前簇的所有点
            cluster_points = [points[i] for i, label in enumerate(labels) if label == k]
            if cluster_points:
                mean_x = sum(p[0] for p in cluster_points) / len(cluster_points)
                mean_y = sum(p[1] for p in cluster_points) / len(cluster_points)
                new_centers.append((mean_x, mean_y))
            else:
                # 若簇为空，保留原中心
                new_centers.append(centers[k])

        # 计算所有中心的移动距离之和
        movement = sum(math.hypot(new_centers[k][0] - centers[k][0],
                                  new_centers[k][1] - centers[k][1])
                       for k in range(K))

        centers = new_centers
        if movement < tol:
            break

    return centers

def main():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    K = int(next(it))
    N = int(next(it))
    speed = int(next(it))
    points = []
    for _ in range(N):
        x = float(next(it))
        y = float(next(it))
        points.append((x, y))

    centers = kmeans_clustering(points, K)
    distances = [math.hypot(cx, cy) for cx, cy in centers]
    # lambda x: x[0]，匿名函数，等价于def func(x): return x[0]
    sorted_centers = sorted(zip(distances, centers), key=lambda x: x[0])
    total_distance = 0.0
    prev = (0.0, 0.0)
    for dist, center in sorted_centers:
        total_distance += math.hypot(center[0] - prev[0], center[1] - prev[1])
        prev = center
    total_distance += math.hypot(prev[0], prev[1])
    total_distance = int(total_distance / speed * 3600)
    print(total_distance)

def run_tests():
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3 10 30\n1.2 1.5\n1.8 1.2\n5.0 5.2\n5.5 4.8\n4.9 5.5\n-2.0 3.0\n-2.5 3.5\n-1.8 2.8\n1.5 1.8\n5.2 5.0\n", "2502"),
        ("5 3 10\n1.00 1.00\n2.00 2.00\n3.00 3.00\n", "3054"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            main()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        main()
