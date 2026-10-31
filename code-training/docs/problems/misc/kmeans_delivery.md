---
title: 快递员极速配送挑战
platform: CodeFun2000
difficulty: Medium
id: P4730
url: https://codefun2000.com/p/P4730
tags:
  - 聚类算法
  - K-Means
  - 几何
topics: []
patterns: []
date_added: 2025-04-30
date_reviewed: []
---

# P4730. 快递员极速配送挑战

## 题目描述

某快递员负责一个片区的快递配送业务。假设他手头有 $N$ 个快递包裹需要派送，每个包裹对应一个具体的收货坐标 $(x_i, y_i)$（单位：公里）。

为了提高效率，公司要求快递员先利用聚类算法将这 $N$ 个包裹自动划分为 $K$ 个簇（代表 $K$ 个社区），快递员只需要将快递送到社区中心（类的中心点）即可。快递员从起始位置出发，**按照每个社区中心与起点之间的距离由近到远排序**，依次送完所有社区的快递，最后返回起始位置。已知快递员的平均行驶速度为 speed km/h。

快递员初始坐标为 $(0, 0)$。请编写程序，计算完成所有配送并返回起点所需的总时间（单位：秒，向下取整）。

### K-Means 聚类计算步骤

- **种子点初始化：** 将所有点按到起点的距离从小到大排序，如果距离相同的点，按照输入坐标点的先后顺序从小到大排序。选择排序后的前 $K$ 个点作为初始聚类中心。
- **迭代优化：** 将每个点 $p_i$ 分配到距离最近的聚类中心 $c_k$，重新计算每个簇的中心点（均值）。
- **收敛判断：** 如果所有聚类中心的移动距离之和 $\lt 1e-4$，则停止迭代；达到最大迭代轮次也停止。

## 输入格式

- 第一行输入 3 个由空格分隔的整数，分别为 $K$（社区个数）、$N$（快递包裹总数）、speed（快递员平均行驶速度，单位 km/h）。
- 接下来的 $N$ 行分别表示每个包裹的 $x$ 和 $y$ 坐标（单位：公里），用空格分割。

## 输出格式

- 输出快递员送完所有快递所需的时间，保留整数，向下取整，单位 s。

## 示例

### 示例 1

**输入：**
```
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
```

**输出：**
```
2502
```

**说明：**
聚类后的 3 个聚类中心按照距离起点的位置远近排序分别为：$(1.5, 1.5)$，$(-2.1, 3.1)$，$(5.15, 5.125)$，总时间约为 2502 秒。

### 示例 2

**输入：**
```
5 3 10
1.00 1.00
2.00 2.00
3.00 3.00
```

**输出：**
```
3054
```

**说明：**
由于 $K \gt N$，3 个包裹本身分别构成了 3 个聚类中心，配送路径为：$(0,0) \to (1,1) \to (2,2) \to (3,3) \to (0,0)$，总距离 $6\sqrt{2}$ km，耗时 $\approx 3054.70$ 秒。

---

## 解题思路

### 两个阶段之间没有反馈

题目把计算拆成两段，顺序固定：

1. **K-Means**：把 `N` 个点聚成 `K` 个簇，输出 `K` 个中心；
2. **路径规划**：按中心到原点的距离排序，从原点依次访问、最后回到原点，算总路程并换算成时间。

第二段只用第一段的结果，不会反过来影响聚类；所以先完整跑完 K-Means，再单独算路线。K-Means 本身按题面给定的步骤执行，不存在「换一种更优的聚类」这种自由度——初始中心、分配规则、更新公式都是题目定死的。

### K-Means：初始化 → 分配 → 重算中心 → 看是否收敛

**初始化**：把所有点按到原点的距离升序排序，取前 `K` 个作为初始中心。这个初始化不是随机的，排序本身决定了结果；不要改成随机取点。

**一轮迭代**做两件事：

```python
# 1. 每个点分给最近的中心（距离相同取编号小的）
labels = []
for p in points:
    best_k, min_dist = 0, float("inf")
    for k, c in enumerate(centers):
        d = math.hypot(p[0] - c[0], p[1] - c[1])
        if d < min_dist:          # 严格小于：平局时保留先出现的中心
            min_dist, best_k = d, k
    labels.append(best_k)

# 2. 每个簇的新中心 = 簇内点的均值；空簇保留原中心
new_centers = []
for k in range(K):
    cluster = [points[i] for i, lab in enumerate(labels) if lab == k]
    if cluster:
        new_centers.append((
            sum(p[0] for p in cluster) / len(cluster),
            sum(p[1] for p in cluster) / len(cluster),
        ))
    else:
        new_centers.append(centers[k])
```

**收敛判据**：本轮所有中心移动距离之和小于 `tol`（这里取 `1e-4`）就停；否则继续，最多 `max_iters` 轮。先算移动距离、再替换 `centers`，顺序反了会让「移动距离」永远是 0。

### 路径：中心按到原点的距离排序，依次访问并返回

```python
ordered = sorted(centers, key=lambda c: math.hypot(c[0], c[1]))

total = 0.0
prev = (0.0, 0.0)                  # 从原点出发
for c in ordered:
    total += math.hypot(c[0] - prev[0], c[1] - prev[1])
    prev = c
total += math.hypot(prev[0], prev[1])   # 最后回到原点
```

排序键是**中心到原点的距离**，不是 `x` 坐标，也不是簇的大小。题目规定按这个顺序访问，不是求 TSP 最优路线；不要额外做全排列。

最后 `time = distance / speed * 3600`，再向下取整。先乘 3600 再取整，和先取整再乘会差出几秒。

---

## 完整代码实现

```python
"""
第3题-快递员极速配送挑战 - K-Means 聚类 + 路径规划

输入格式：
- 第1行：3个整数 K, N, speed
- 接下来 N 行：每行2个浮点数 x, y

输出格式：
- 一个整数，配送总时间（秒），向下取整
"""

import sys
import math

def kmeans_clustering(points, K, max_iters=1000, tol=1e-4):
    """
    对 points 进行 K-means 聚类，返回最终的中心点列表。
    """
    # 初始化中心：按到原点距离升序排序，取前 K 个
    sorted_points = sorted(points, key=lambda p: math.hypot(p[0], p[1]))
    centers = sorted_points[:K]

    for _ in range(max_iters):
        # 分配每个点到最近的中心
        labels = []
        for p in points:
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
            cluster_points = [points[i] for i, label in enumerate(labels) if label == k]
            if cluster_points:
                mean_x = sum(p[0] for p in cluster_points) / len(cluster_points)
                mean_y = sum(p[1] for p in cluster_points) / len(cluster_points)
                new_centers.append((mean_x, mean_y))
            else:
                new_centers.append(centers[k])

        # 计算中心移动距离之和
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
    sorted_centers = sorted(zip(distances, centers), key=lambda x: x[0])

    total_distance = 0.0
    prev = (0.0, 0.0)
    for dist, center in sorted_centers:
        total_distance += math.hypot(center[0] - prev[0], center[1] - prev[1])
        prev = center
    total_distance += math.hypot(prev[0], prev[1])

    total_distance = int(total_distance / speed * 3600)
    print(total_distance)

if __name__ == "__main__":
    main()
```

---

## 示例推演

以样例 2 为例：$K=5, N=3, speed=10$

**输入点：** $(1,1), (2,2), (3,3)$

**初始化中心：**
- 按到原点距离排序：$(1,1): \sqrt{2} \approx 1.41$，$(2,2): 2\sqrt{2} \approx 2.83$，$(3,3): 3\sqrt{3} \approx 4.24$
- 取前 5 个，但只有 3 个点，所以 3 个点各自成为中心

**迭代：** 由于每个点已经是自己的中心，不再移动，收敛。

**路径规划：**
- 中心按到原点距离排序：$(1,1), (2,2), (3,3)$
- 路径：$(0,0) \to (1,1) \to (2,2) \to (3,3) \to (0,0)$
- 各段距离：$\sqrt{2}, \sqrt{2}, \sqrt{2}, 3\sqrt{2}$
- 总距离：$6\sqrt{2} \approx 8.485$ km
- 时间：$8.485 / 10 \times 3600 \approx 3054.70$ 秒 → 向下取整 3054

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| K-Means | O(max_iters · N · K) | O(N + K) | N 为点数，K 为簇数 |

---

## 易错点总结

### 1. 距离计算使用欧式距离

$dist = \sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}$，不是曼哈顿距离。

### 2. 空簇处理

如果某个簇没有点（理论上 K-Means 不太会空簇，但实现时要处理），保留原中心。
不处理的话 `mean()` 会对空数组求平均并报错。

### 3. 先取整再乘 3600

代码是 `int(total_distance / speed * 3600)`，先乘 3600 再取整。写成
`int(total_distance / speed) * 3600` 会把不足 1 秒的路程先丢掉，再放大成整秒，结果可能差几十秒。

---

## 扩展思考

- **K-Means++：** 更好的初始化方法，可以加速收敛并改善聚类质量。
- **其他聚类算法：** DBSCAN 不需要预设 K 值，适合发现任意形状的簇。
- **TSP 问题：** 如果社区数量很多，最短路径问题（TSP）的计算复杂度会急剧上升。

---

## 相关题目

- [路由器资源用量预测](bgd_resource_prediction.md) — 机器学习基础算法
