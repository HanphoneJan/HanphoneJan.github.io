# @nc app=nowcoder id=dc90d7c8b7bd44ac8b5029f830cd2e65 topic=379 question=11127715 lang=Python3
# 2026-04-28 11:28:27
# https://www.nowcoder.com/practice/dc90d7c8b7bd44ac8b5029f830cd2e65?tpId=379&tqId=11127715
# [ML23] 实现 k-Means 聚类算法

"""
ML23. 实现 k-Means 聚类算法 —— 机器学习基础

题目描述：
实现 k-Means 聚类算法，接受输入并生成最终质心的列表。

输入格式（4个参数）：
1. points: 数据点列表，每个点为坐标元组，如 [(1, 2), (3, 4), ...]
2. k: 簇的数量（由 initial_centroids 长度决定，但题目保留了参数）
3. initial_centroids: 初始质心列表，形状为 (k, d)
4. max_iterations: 最大迭代次数

输出格式：
簇的最终质心的列表，其中每个质心都四舍五入保留小数点后四位，用元组表示。

核心思路：
k-Means 算法是经典的聚类算法，迭代执行两个步骤直到收敛：
1. 分配阶段（Assignment）：每个点分配到距离最近的质心所在的簇
2. 更新阶段（Update）：重新计算每个簇的质心（簇内所有点的均值）

时间复杂度：O(max_iterations * n * k * d)
  - n: 数据点数量, k: 簇数量, d: 数据维度
空间复杂度：O(n + k * d)
"""

# @sample-start
"""
样例输入:
[(1, 2), (1, 4), (1, 0), (10, 2), (10, 4), (10, 0)]
2
[(1, 1), (10, 1)]
10

样例输出:
[(1.0, 2.0), (10.0, 2.0)]

说明：
- 6 个数据点分为 2 簇
- 初始质心为 (1,1) 和 (10,1)
- 迭代后，靠近 (1,*) 的点聚为一簇，靠近 (10,*) 的点聚为另一簇
- 最终质心为 (1.0, 2.0) 和 (10.0, 2.0)
"""
# @sample-end

# @nc code=start

import numpy as np


def k_means_clustering(points, k, initial_centroids, max_iterations):
    """手动实现 k-Means 聚类算法

    算法步骤：
    1. 将输入数据转为 numpy 数组，便于向量化计算
    2. 迭代执行（最多 max_iterations 次）：
       a. 分配：计算每个点到每个质心的欧氏距离，分配到最近的簇
       b. 更新：计算每个簇内所有点的均值作为新质心
       c. 若质心不再变化，提前结束迭代
    3. 返回保留四位小数的质心列表

    Args:
        points: 数据点列表，每个点为列表或元组，如 [[1,2], [3,4]]
        k: 簇的数量
        initial_centroids: 初始质心列表，形状为 (k, d)
        max_iterations: 最大迭代次数

    Returns:
        最终质心列表，每个质心为保留四位小数的元组
    """
    # 转换为 numpy 数组便于计算
    points = np.array(points)
    centroids = np.array(initial_centroids, dtype=float)

    # 如果初始质心是一维的（点只有一维坐标），转为列向量 (k, 1)
    if centroids.ndim == 1:
        centroids = centroids.reshape(-1, 1)

    n, d = points.shape
    k = centroids.shape[0]

    for _ in range(max_iterations):
        # 1. 分配阶段：计算每个点到每个质心的距离
        # 利用 numpy 广播机制：
        # points[:, np.newaxis, :] 形状 (n, 1, d)
        # centroids[np.newaxis, :, :] 形状 (1, k, d)
        # 相减后形状 (n, k, d)，沿最后一维求范数得到 (n, k)
        distances = np.linalg.norm(
            points[:, np.newaxis, :] - centroids[np.newaxis, :, :], axis=2
        )
        # 每个点分配到距离最近的质心
        labels = np.argmin(distances, axis=1)  # 形状 (n,)

        # 2. 更新阶段：计算每个簇的新质心（均值）
        new_centroids = np.zeros_like(centroids)
        for i in range(k):
            cluster_points = points[labels == i]
            if len(cluster_points) > 0:
                new_centroids[i] = cluster_points.mean(axis=0)
            else:
                # 空簇处理：保留原质心（也可随机选择点）
                new_centroids[i] = centroids[i]

        # 3. 收敛判断：质心变化小于阈值则提前退出
        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids

    # 结果转换为元组列表，每个坐标四舍五入保留四位小数
    result = [tuple(np.round(c, 4)) for c in centroids]
    return result


def solve():
    """标准输入处理"""
    points = eval(input())
    k = int(input())
    initial_centroids = eval(input())
    max_iterations = int(input())
    final_centroids = k_means_clustering(points, k, initial_centroids, max_iterations)
    print(final_centroids)


# 嵌入测试用例
test_cases = [
    (
        "[(1, 2), (1, 4), (1, 0), (10, 2), (10, 4), (10, 0)]\n2\n[(1, 1), (10, 1)]\n10\n",
        "[(1.0, 2.0), (10.0, 2.0)]"
    ),
]


def run_tests():
    """运行嵌入的样例测试"""
    import io
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end
