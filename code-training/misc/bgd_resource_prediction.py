"""
第2题-路由器资源用量预测 - 批量梯度下降(BGD)线性回归

路由器的某资源利用率与多个运行特征强相关：协议连接数、转发数据包速率、内存占用率。
请实现批量梯度下降法(BGD)来训练资源预测线性回归模型的参数。

模型：y = w0 + w1*x1 + w2*x2 + w3*x3
损失函数：均方误差 MSE = (1/2m) * Σ(y_pred - y_true)^2
优化方法：批量梯度下降，迭代固定N次

输入格式：
- 第1行：整数 m（样本数量）
- 第2行：整数 N（迭代次数）
- 第3行：浮点数 alpha（学习率）
- 接下来 m 行：每行4个整数 x1 x2 x3 y

输出格式：
- 一行4个浮点数 w0 w1 w2 w3，保留2位小数

核心思路：
1. 对每个特征进行 Min-Max 归一化，提升收敛速度
2. 批量梯度下降：每轮用全部样本计算平均梯度
3. 训练完成后将权重还原到原始特征尺度

时间复杂度：O(N * m)
空间复杂度：O(m)
"""

# https://codefun2000.com/p/P4729
import sys

# @sample-start
"""
样例输入 1:
3
100
0.10
100 200 150 6000
200 800 600 7500
300 70 60 6500

样例输出 1:
4394.59 6.82 1.20 1.55
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2
50
0.05
0 0 0 0
1000 10000 100 100000

样例输出 2:
11419.33 28.26 2.83 282.62
"""
# @sample-end

def main():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    m = int(next(it))
    N = int(next(it))
    alpha = float(next(it))
    samples = []
    x1_vals, x2_vals, x3_vals = [], [], []
    for _ in range(m):
        x1 = float(next(it))
        x2 = float(next(it))
        x3 = float(next(it))
        y = float(next(it))
        samples.append([x1, x2, x3, y])
        x1_vals.append(x1)
        x2_vals.append(x2)
        x3_vals.append(x3)

    # 计算每个特征的最小最大值
    min_x1, max_x1 = min(x1_vals), max(x1_vals)
    min_x2, max_x2 = min(x2_vals), max(x2_vals)
    min_x3, max_x3 = min(x3_vals), max(x3_vals)

    # 归一化特征
    def normalize(val, min_val, max_val):
        if max_val == min_val:
            return 0.0
        return (val - min_val) / (max_val - min_val)

    norm_samples = []
    for x1, x2, x3, y in samples:
        nx1 = normalize(x1, min_x1, max_x1)
        nx2 = normalize(x2, min_x2, max_x2)
        nx3 = normalize(x3, min_x3, max_x3)
        norm_samples.append([nx1, nx2, nx3, y])

    # 初始化权重 [w0, w1, w2, w3]
    w = [0.0, 0.0, 0.0, 0.0]

    # 批量梯度下降
    for _ in range(N):
        grad = [0.0, 0.0, 0.0, 0.0]  # 存放梯度累加和
        for nx1, nx2, nx3, y_true in norm_samples:
            # 预测值
            y_pred = w[0] + w[1] * nx1 + w[2] * nx2 + w[3] * nx3
            error = y_pred - y_true
            # 累加梯度
            grad[0] += error * 1.0      # x0 = 1
            grad[1] += error * nx1
            grad[2] += error * nx2
            grad[3] += error * nx3
        # 更新权重
        for j in range(4):
            w[j] -= alpha * (grad[j] / m)

    # 权重还原
    w1_norm, w2_norm, w3_norm = w[1], w[2], w[3]
    # 特征权重还原
    if max_x1 != min_x1:
        w1 = w1_norm / (max_x1 - min_x1)
    else:
        w1 = 0.0
    if max_x2 != min_x2:
        w2 = w2_norm / (max_x2 - min_x2)
    else:
        w2 = 0.0
    if max_x3 != min_x3:
        w3 = w3_norm / (max_x3 - min_x3)
    else:
        w3 = 0.0
    # 偏置还原
    w0 = w[0] - (w1 * min_x1 + w2 * min_x2 + w3 * min_x3)

    # 输出保留两位小数
    print(f"{w0:.2f} {w1:.2f} {w2:.2f} {w3:.2f}")

def run_tests():
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3\n100\n0.10\n100 200 150 6000\n200 800 600 7500\n300 70 60 6500\n", "4394.59 6.82 1.20 1.55"),
        ("2\n50\n0.05\n0 0 0 0\n1000 10000 100 100000\n", "11419.33 28.26 2.83 282.62"),
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
