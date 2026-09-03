---
title: 路由器资源用量预测
platform: CodeFun2000
difficulty: 中等
id: P4729
url: https://codefun2000.com/p/P4729
tags:
  - 机器学习
  - 线性回归
  - 梯度下降
topics:
  - ../../topics/linear-regression.md
patterns:
  - ../../patterns/gradient-descent.md
date_added: 2025-04-30
date_reviewed: []
---

# P4729. 路由器资源用量预测

## 题目描述

路由器的某资源利用率与多个运行特征强相关：协议连接数（单位：个）、转发数据包速率（单位：Mpps）、内存占用率（单位：%）。为了精准预测不同负载下的路由器资源利用率，保障网络稳定运行，请实现批量梯度下降法（BGD）来训练资源预测线性回归模型的参数。

**资源预测模型：** $y = w_0 + w_1 \cdot x_1 + w_2 \cdot x_2 + w_3 \cdot x_3$（$w_0$ 为偏置项，$w_1, w_2, w_3$ 为特征权重）

**损失函数：** 均方误差（MSE），$L = \frac{1}{2m} \sum_{i=1}^{m} (y_{\text{pred},i} - y_{\text{true},i})^2$（$m$ 为样本数）

**梯度更新规则：** $w_j = w_j - \alpha \cdot \frac{1}{m} \sum_{i=1}^{m} (y_{\text{pred},i} - y_{\text{true},i}) \cdot x_{ij}$（偏置项 $w_0$ 对应 $x_{i0}=1$，$\alpha$ 为学习率）

**迭代规则：** 初始权重（含偏置）全为0，迭代固定 $N$ 次后停止，无需判断收敛

**特征归一化与还原：**
- 归一化：$x_j^{\text{norm}} = \frac{x_j - \min(x_j)}{\max(x_j) - \min(x_j)}$，若 $\max = \min$ 则归一化值为 0
- 权重还原：$w_j = \frac{w_j^{\text{norm}}}{\max(x_j) - \min(x_j)}$，若差为 0 则 $w_j = 0$
- 偏置还原：$w_0 = w_0^{\text{norm}} - \sum_{j=1}^{3} w_j \cdot \min(x_j)$

## 输入格式

- 第一行：整数 $m$（样本数量，$[1, 10000]$）
- 第二行：整数 $N$（迭代次数，$[1, 1000]$）
- 第三行：浮点数 $\alpha$（学习率，$[0, 1]$，保留2位小数）
- 后续 $m$ 行：每行4个整数 $x_1, x_2, x_3, y$

## 输出格式

- 一行，4个浮点数，依次为还原后的 $w_0, w_1, w_2, w_3$，结果保留2位小数，银行家舍入

## 示例

### 示例 1

**输入：**
```
3
100
0.10
100 200 150 6000
200 800 600 7500
300 70 60 6500
```

**输出：**
```
4394.59 6.82 1.20 1.55
```

**说明：**
样本数：3；迭代次数：100；学习率：$\alpha = 0.10$

### 示例 2

**输入：**
```
2
50
0.05
0 0 0 0
1000 10000 100 100000
```

**输出：**
```
11419.33 28.26 2.83 282.62
```

---

## 解题思路

### 第一步：理解问题本质

本题是经典的线性回归参数求解问题。与最小二乘法直接求解闭式解不同，这里要求用批量梯度下降（BGD）迭代求解。关键步骤包括：特征归一化、梯度下降训练、权重还原。

### 第二步：暴力解法

直接使用原始特征进行梯度下降。问题在于不同特征的量级差异很大（如 $x_2$ 可达 10000，$x_3$ 只有 100），导致梯度更新不稳定，收敛极慢。

### 第三步：优化解法 — 特征归一化

在训练前对每个特征进行 Min-Max 归一化，将所有特征缩放到 $[0, 1]$ 范围。这样各特征的梯度量级相近，训练更稳定、收敛更快。

### 第四步：最优解法 — 完整 BGD 流程

1. **读取数据**并计算每个特征的 $\min$ 和 $\max$
2. **归一化特征**（保留原始 $y$ 不变）
3. **批量梯度下降**迭代 $N$ 轮
4. **权重还原**到原始特征尺度

---

## 完整代码实现

```python
"""
第2题-路由器资源用量预测 - 批量梯度下降(BGD)线性回归

输入格式：
- 第1行：整数 m（样本数量）
- 第2行：整数 N（迭代次数）
- 第3行：浮点数 alpha（学习率）
- 接下来 m 行：每行4个整数 x1 x2 x3 y

输出格式：
- 一行4个浮点数 w0 w1 w2 w3，保留2位小数
"""

import sys

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
        grad = [0.0, 0.0, 0.0, 0.0]
        for nx1, nx2, nx3, y_true in norm_samples:
            y_pred = w[0] + w[1] * nx1 + w[2] * nx2 + w[3] * nx3
            error = y_pred - y_true
            grad[0] += error * 1.0
            grad[1] += error * nx1
            grad[2] += error * nx2
            grad[3] += error * nx3
        for j in range(4):
            w[j] -= alpha * (grad[j] / m)

    # 权重还原
    w1_norm, w2_norm, w3_norm = w[1], w[2], w[3]
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
    w0 = w[0] - (w1 * min_x1 + w2 * min_x2 + w3 * min_x3)

    print(f"{w0:.2f} {w1:.2f} {w2:.2f} {w3:.2f}")

if __name__ == "__main__":
    main()
```

---

## 示例推演

以样例 1 为例，推演训练过程：

**数据：**
| 样本 | $x_1$ | $x_2$ | $x_3$ | $y$ |
|------|-------|-------|-------|-----|
| 1 | 100 | 200 | 150 | 6000 |
| 2 | 200 | 800 | 600 | 7500 |
| 3 | 300 | 70 | 60 | 6500 |

**归一化：**
- $x_1$: min=100, max=300 → [0, 0.5, 1]
- $x_2$: min=70, max=800 → [0.178, 1, 0]
- $x_3$: min=60, max=600 → [0.167, 1, 0]

**梯度下降（第 1 轮）：**
- $w = [0, 0, 0, 0]$
- 样本 1: $y_{pred} = 0$，$error = 0 - 6000 = -6000$
- $grad = [-6000, 0, -1068, -1002]$
- ...累加所有样本梯度后更新权重

经过 100 轮迭代后，权重收敛，再还原到原始尺度，得到最终输出。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| BGD | O(N · m) | O(m) | N 为迭代次数，m 为样本数 |

---

## 易错点总结

### 1. 特征归一化的范围

只对输入特征 $x_1, x_2, x_3$ 归一化，$y$ 不需要归一化。

### 2. 偏置项的梯度

偏置项 $w_0$ 对应 $x_0 = 1$，所以梯度为 $error \cdot 1$。

### 3. 权重还原公式

训练在归一化空间进行，输出必须在原始空间。还原时注意：
- 特征权重要除以 $(\max - \min)$
- 偏置要减去 $\sum w_j \cdot \min(x_j)$

### 4. 除零保护

当某特征的 $\max = \min$ 时，归一化值为 0，还原时权重也为 0。

---

## 扩展思考

- **SGD vs BGD：** SGD 每轮用一个样本更新，BGD 用全部样本。BGD 更稳定但计算量大，实际中常用 Mini-Batch。
- **学习率选择：** 学习率太大导致震荡，太小收敛慢。可以通过观察损失变化来调参。
- **归一化方法：** 除了 Min-Max，还可以用 Z-score 标准化（减均值除标准差）。

---

## 相关题目

- [基于 AdamW 优化的网络带宽预测模型](adamw_bandwidth.md) — AdamW 优化算法
