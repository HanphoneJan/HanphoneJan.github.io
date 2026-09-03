---
title: 基于 AdamW 优化的网络带宽预测模型
platform: CodeFun2000
difficulty: 中等
id: P4779
url: https://codefun2000.com/p/P4779
tags:
  - 优化算法
  - AdamW
  - 梯度下降
topics:
  - ../../topics/optimization.md
patterns:
  - ../../patterns/gradient-descent.md
date_added: 2025-04-30
date_reviewed: []
---

# P4779. 基于 AdamW 优化的网络带宽预测模型

## 题目描述

在华为网络通信业务中，网络带宽预测模型是保障数据传输稳定性的核心模块之一，通过历史数据拟合的带宽模型为：$y = w_1 \cdot x_1 + w_2 \cdot x_2 + b$（其中 $y$ 表示带宽，$x_1$ 和 $x_2$ 为影响带宽的因子，$w_1$ 和 $w_2$ 为权重参数，$b$ 为偏置参数）。请实现 AdamW 优化算法，基于给定样本数据迭代更新模型参数。

**核心概念解释：**

**损失函数：** 对于单个样本 $(x_1, x_2, y_{true})$，损失 $L = (y_{pred} - y_{true})^2$，其中 $y_{pred} = w_1 \cdot x_1 + w_2 \cdot x_2 + b$

**AdamW 算法：**
- 动量参数 $\beta_1 = 0.9$，$\beta_2 = 0.999$
- 权重衰减系数 $\lambda = 0.01$
- 学习率 $\alpha = 0.001$
- 数值稳定性常数 $\epsilon = 1e-8$

**一阶动量（$m$）更新：** $m_t = \beta_1 \cdot m_{t-1} + (1 - \beta_1) \cdot g_t$

**二阶动量（$v$）更新：** $v_t = \beta_2 \cdot v_{t-1} + (1 - \beta_2) \cdot g_t^2$

**偏差修正：** $\hat{m}_t = \frac{m_t}{1 - \beta_1^t}$，$\hat{v}_t = \frac{v_t}{1 - \beta_2^t}$

**参数更新：** $\theta_t = \theta_{t-1} - \alpha \cdot \left(\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \cdot \theta_{t-1}\right)$

## 输入格式

- 第一行输入一个整数 $N$，表示样本数量；
- 接下来 $N$ 行，每行 3 个浮点数 $x_1, x_2, y_{true}$，表示一个样本。

## 输出格式

一行，3 个浮点数，依次为还原后的 $w_1, w_2, b$，结果保留 6 位小数，银行家舍入，以一个空格分隔。

## 示例

### 示例 1

**输入：**
```
3
1.0 1.0 2.0
2.0 2.0 4.0
3.0 3.0 6.0
```

**输出：**
```
0.002750 0.002750 0.002923
```

**说明：**
样本 1: $x_1=1.0, x_2=1.0, y_{true}=2.0$
样本 2: $x_1=2.0, x_2=2.0, y_{true}=4.0$
样本 3: $x_1=3.0, x_2=3.0, y_{true}=6.0$

### 示例 2

**输入：**
```
1
0.0 0.0 0.0
```

**输出：**
```
0.000000 0.000000 0.000000
```

**说明：**
样本: $x_1=0.0, x_2=0.0, y_{true}=0.0$，梯度全为 0，参数保持初始值。

---

## 解题思路

### 第一步：理解问题本质

AdamW 是 Adam 优化器的改进版本，核心区别在于权重衰减（weight decay）的处理方式。在 Adam 中，权重衰减与梯度耦合在一起（L2 正则化）；而在 AdamW 中，权重衰减直接作用于参数本身，与动量更新解耦。本题要求严格按照 AdamW 的公式实现参数更新。

### 第二步：暴力解法

本题为公式实现题，不存在传统意义上的"暴力解法"。直接按照题目给定的公式逐步计算即可。

### 第三步：最优解法

直接实现 AdamW 算法，按以下顺序处理每个样本：

1. **计算预测值：** $y_{pred} = w_1 \cdot x_1 + w_2 \cdot x_2 + b$
2. **计算梯度：**
   - $g_{w1} = 2 \cdot (y_{pred} - y_{true}) \cdot x_1$
   - $g_{w2} = 2 \cdot (y_{pred} - y_{true}) \cdot x_2$
   - $g_b = 2 \cdot (y_{pred} - y_{true})$
3. **更新一阶动量：** $m_t = \beta_1 \cdot m_{t-1} + (1 - \beta_1) \cdot g_t$
4. **更新二阶动量：** $v_t = \beta_2 \cdot v_{t-1} + (1 - \beta_2) \cdot g_t^2$
5. **偏差修正：** 消除动量初始阶段的偏差
6. **参数更新：** $\theta_t = \theta_{t-1} - \alpha \cdot \left(\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \cdot \theta_{t-1}\right)$

---

## 完整代码实现

```python
"""
第2题-基于 AdamW 优化的网络带宽预测模型 - AdamW 优化算法

输入格式：
- 第1行：整数 N，表示样本数量
- 接下来 N 行：每行3个浮点数 x1, x2, y_true

输出格式：
- 一行3个浮点数，依次为 w1, w2, b，保留6位小数
"""

import sys
import math

def main():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    N = int(next(it))

    # 初始化参数和动量
    w1 = w2 = b = 0.0
    mw1 = mw2 = mb = 0.0
    vw1 = vw2 = vb = 0.0

    beta1, beta2 = 0.9, 0.999
    lam, alpha, eps = 0.01, 0.001, 1e-8
    t = 0

    for _ in range(N):
        x1 = float(next(it))
        x2 = float(next(it))
        y_true = float(next(it))
        t += 1

        y_pred = w1 * x1 + w2 * x2 + b
        grad_w1 = 2.0 * (y_pred - y_true) * x1
        grad_w2 = 2.0 * (y_pred - y_true) * x2
        grad_b = 2.0 * (y_pred - y_true)

        # 一阶动量更新
        mw1 = beta1 * mw1 + (1 - beta1) * grad_w1
        mw2 = beta1 * mw2 + (1 - beta1) * grad_w2
        mb = beta1 * mb + (1 - beta1) * grad_b

        # 二阶动量更新
        vw1 = beta2 * vw1 + (1 - beta2) * (grad_w1 * grad_w1)
        vw2 = beta2 * vw2 + (1 - beta2) * (grad_w2 * grad_w2)
        vb = beta2 * vb + (1 - beta2) * (grad_b * grad_b)

        # 偏差修正
        m_hat_w1 = mw1 / (1 - beta1 ** t)
        m_hat_w2 = mw2 / (1 - beta1 ** t)
        m_hat_b = mb / (1 - beta1 ** t)

        v_hat_w1 = vw1 / (1 - beta2 ** t)
        v_hat_w2 = vw2 / (1 - beta2 ** t)
        v_hat_b = vb / (1 - beta2 ** t)

        # 参数更新（AdamW：权重衰减直接作用于参数）
        w1 -= alpha * (m_hat_w1 / (math.sqrt(v_hat_w1) + eps) + lam * w1)
        w2 -= alpha * (m_hat_w2 / (math.sqrt(v_hat_w2) + eps) + lam * w2)
        b  -= alpha * (m_hat_b / (math.sqrt(v_hat_b) + eps) + lam * b)

    print(f"{w1:.6f} {w2:.6f} {b:.6f}")

if __name__ == "__main__":
    main()
```

---

## 示例推演

以样例 1 为例，推演前两个样本的参数更新过程：

**初始状态：** $w_1=0, w_2=0, b=0$，所有动量为 0

**样本 1：** $(x_1=1.0, x_2=1.0, y_{true}=2.0)$，$t=1$

- $y_{pred} = 0 \cdot 1 + 0 \cdot 1 + 0 = 0$
- $g_{w1} = 2 \cdot (0 - 2) \cdot 1 = -4$，$g_{w2} = -4$，$g_b = -4$
- $m_{w1} = 0.9 \cdot 0 + 0.1 \cdot (-4) = -0.4$
- $v_{w1} = 0.999 \cdot 0 + 0.001 \cdot 16 = 0.016$
- $\hat{m}_{w1} = -0.4 / (1 - 0.9) = -4$
- $\hat{v}_{w1} = 0.016 / (1 - 0.999) = 16$
- 更新：$w_1 = 0 - 0.001 \cdot ((-4) / \sqrt{16} + 0.01 \cdot 0) = 0.001$

（$w_2$ 和 $b$ 同理更新）

**样本 2：** $(x_1=2.0, x_2=2.0, y_{true}=4.0)$，$t=2$

继续使用更新后的参数进行下一轮迭代...

经过 3 个样本迭代后，最终输出：$0.002750\ 0.002750\ 0.002923$

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| AdamW | O(N) | O(1) | N 为样本数，只需维护 3 组参数和动量 |

---

## 易错点总结

### 1. 偏差修正的时机

$t$ 从 1 开始计数，每处理一个样本就递增。偏差修正分母是 $1 - \beta^t$，不是 $1 - \beta$。

### 2. AdamW vs Adam 的区别

AdamW 中权重衰减 $\lambda \cdot \theta$ 直接作用于参数更新，不经过动量修正。如果错误地将权重衰减放在梯度计算阶段，就变成了 Adam + L2 正则化，结果会不同。

### 3. 银行家舍入

Python 的 `format` 默认使用银行家舍入（四舍六入五成双），与 `round()` 函数行为一致。

### 4. 二阶动量的计算

$v_t$ 更新时用的是 $g_t^2$（梯度平方），不是 $|g_t|$。

---

## 扩展思考

- **Adam vs SGD：** Adam 使用自适应学习率，适合大多数场景；SGD 需要手动调学习率，但可能收敛到更优的局部最小值。
- **AdamW 的优势：** 解耦了权重衰减和梯度更新，在大规模预训练模型中表现更好（如 BERT、GPT 等）。
- **学习率调度：** 实际训练中通常会配合学习率衰减策略（warmup + cosine decay）。

---

## 相关题目

- [路由器资源用量预测](bgd_resource_prediction.md) — 批量梯度下降线性回归
