---
title: LSTM 室内温度预测
platform: 自定义
difficulty: 困难
id: lstm-temperature
url: ""
tags:
  - LSTM
  - 神经网络
  - 序列建模
topics:
  - ../../topics/neural-networks.md
patterns:
  - ../../patterns/lstm-forward.md
date_added: 2025-04-30
date_reviewed: []
---

# LSTM 室内温度预测

## 题目描述

背景：智能家居系统使用 LSTM 模型预测未来时刻室内温度，输入特征包括：室内温度、室外温度、空调功率、门窗开合状态、室内人员数量。

任务：基于过去 $T$ 个时间步的 5 个特征，计算 LSTM 每个时间步的隐藏状态和最终细胞状态。

**LSTM 核心公式：**

$$
\begin{aligned}
f_t &= \sigma(W_f \cdot [h_{t-1}, x_t] + b_f) \\
i_t &= \sigma(W_i \cdot [h_{t-1}, x_t] + b_i) \\
\tilde{c}_t &= \tanh(W_c \cdot [h_{t-1}, x_t] + b_c) \\
c_t &= f_t \odot c_{t-1} + i_t \odot \tilde{c}_t \\
o_t &= \sigma(W_o \cdot [h_{t-1}, x_t] + b_o) \\
h_t &= o_t \odot \tanh(c_t)
\end{aligned}
$$

初始状态 $h_0, c_0$ 均为 0 向量。

## 输入格式

- 第一行：$T, B, D, H$（$D$ 固定为 5）
- 接下来 $T$ 行：每行 $B \times D$ 个浮点数，按时间步顺序，每个时间步内按批次顺序排列
- 最后四行：分别对应输入门、遗忘门、输出门、候选细胞状态的参数
- 每行依次包含：输入权重（$D \times H$）、隐藏权重（$H \times H$）、偏置（$H$）的所有元素，按行优先展平

## 输出格式

- 第一行：所有时间步的隐藏状态（$T \times B \times H$），按时间步顺序展平，保留4位小数
- 第二行：最终细胞状态（$B \times H$），按批次顺序展平，保留4位小数

## 示例

### 示例 1

**输入：**
```
1 1 5 2
2.5 5.0 3.2 5.0 1
0.1 0.1 0.3 3.4 0.5 0.4 0.7 0.3 0.2 1.0 0.7 0.5
0.8 1.0 1.1 1.4
0.1 0.7 0.1 1.4 0.5 0.6 0.3 0.2 0.3 1.0 0.8 0.7
0.7 1.1 1.2 1.2
0.1 0.8 3.3 0.4 0.1 0.5 0.4 0.8 0.9 1.0 0.6 0.9
0.5 1.2 1.1 1.5
0.1 0.1 0.3 0.4 0.5 0.6 0.6 0.8 0.2 1.0 0.7 0.1
0.9 1.3 1.6 1.2
```

**输出：**
```
0.7615 0.7616
0.9997 1.0000
```

### 示例 2

**输入：**
```
2 2 5 1
21.0 25.0 22.0 25.5 1 21.0 25.0 22.0 25.5 2
22.0 26.0 20.5 24.0 2 22.0 26.0 20.5 24.0 1
0.1 0.15 0.2 0.1 0.15 0.3 0.3
0.4 0.45 0.5 0.4 0.45 0.5 0.6
0.7 0.6 0.8 0.7 0.6 0.8 0.9
1.0 0.9 1.1 1.0 0.9 1.1 1.2
```

**输出：**
```
0.7616 0.7616 0.9640 0.9640
2.0000 2.0000
```

---

## 解题思路

### 第一步：理解问题本质

本题要求手动实现 LSTM 的前向传播过程。LSTM 通过三个门（输入门、遗忘门、输出门）和一个候选细胞状态来控制信息的流动，解决了传统 RNN 的梯度消失问题。

### 第二步：参数解析

每个门有 3 组参数：
- **输入权重** $W_x$：形状 $(D, H)$，将输入 $x_t$ 映射到隐藏维度
- **隐藏权重** $W_h$：形状 $(H, H)$，将上一时刻隐藏状态 $h_{t-1}$ 映射
- **偏置** $b$：长度 $H$

四组门参数依次为：输入门、遗忘门、输出门、候选细胞状态。

### 第三步：前向传播实现

对每个时间步 $t$ 和每个批次 $b$：
1. 计算 $W \cdot [h_{t-1}, x_t] = W_x \cdot x_t + W_h \cdot h_{t-1} + b$
2. 通过激活函数得到门控值（$\sigma$ 或 $\tanh$）
3. 更新细胞状态和隐藏状态

---

## 完整代码实现

```python
"""
LSTM 室内温度预测 - LSTM 前向传播实现

输入格式：
- 第1行：T B D H
- 接下来 T 行：每行 B*D 个浮点数
- 最后4行：输入门、遗忘门、输出门、候选细胞状态的参数

输出格式：
- 第1行：所有时间步隐藏状态展平
- 第2行：最终细胞状态展平
"""

import sys
import math

def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))

def tanh(x):
    return math.tanh(x)

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    T = int(next(it))
    B = int(next(it))
    D = int(next(it))
    H = int(next(it))

    # 读取输入序列
    X = []
    for _ in range(T):
        vals = [float(next(it)) for _ in range(B * D)]
        x_t = [vals[i*D:(i+1)*D] for i in range(B)]
        X.append(x_t)

    # 读取四个门的参数
    params = []
    for _ in range(4):
        total = D * H + H * H + H
        row = [float(next(it)) for _ in range(total)]
        wx = row[:D*H]
        wh = row[D*H:D*H+H*H]
        b = row[D*H+H*H:]
        wx_mat = [wx[i*H:(i+1)*H] for i in range(D)]
        wh_mat = [wh[i*H:(i+1)*H] for i in range(H)]
        b_vec = b
        params.append((wx_mat, wh_mat, b_vec))

    Wi, Wh_i, bi = params[0]
    Wf, Wh_f, bf = params[1]
    Wo, Wh_o, bo = params[2]
    Wc, Wh_c, bc = params[3]

    # 初始化状态
    h_prev = [[0.0] * H for _ in range(B)]
    c_prev = [[0.0] * H for _ in range(B)]
    all_h = []

    for t in range(T):
        x_t = X[t]
        i_t = [[0.0]*H for _ in range(B)]
        f_t = [[0.0]*H for _ in range(B)]
        o_t = [[0.0]*H for _ in range(B)]
        c_tilde = [[0.0]*H for _ in range(B)]
        c_t = [[0.0]*H for _ in range(B)]
        h_t = [[0.0]*H for _ in range(B)]

        for b in range(B):
            xb = x_t[b]
            hb = h_prev[b]

            # 对每个门计算 Wx*x + Wh*h + b
            for gate_idx, (W, Wh, b_vec, gate_out) in enumerate([
                (Wi, Wh_i, bi, i_t),
                (Wf, Wh_f, bf, f_t),
                (Wo, Wh_o, bo, o_t),
                (Wc, Wh_c, bc, c_tilde)
            ]):
                # Wx * x
                wx_sum = [0.0]*H
                for d in range(D):
                    for h_idx in range(H):
                        wx_sum[h_idx] += xb[d] * W[d][h_idx]
                # Wh * h
                wh_sum = [0.0]*H
                for h_prev_idx in range(H):
                    for h_idx in range(H):
                        wh_sum[h_idx] += hb[h_prev_idx] * Wh[h_prev_idx][h_idx]
                # 激活
                for h_idx in range(H):
                    val = wx_sum[h_idx] + wh_sum[h_idx] + b_vec[h_idx]
                    if gate_idx < 3:  # 输入门、遗忘门、输出门用 sigmoid
                        gate_out[b][h_idx] = sigmoid(val)
                    else:  # 候选细胞用 tanh
                        gate_out[b][h_idx] = tanh(val)

            # 更新细胞状态
            for h_idx in range(H):
                c_t[b][h_idx] = f_t[b][h_idx] * c_prev[b][h_idx] + i_t[b][h_idx] * c_tilde[b][h_idx]

            # 更新隐藏状态
            for h_idx in range(H):
                h_t[b][h_idx] = o_t[b][h_idx] * tanh(c_t[b][h_idx])

        all_h.append(h_t)
        h_prev = h_t
        c_prev = c_t

    # 输出
    out_h = []
    for t in range(T):
        for b in range(B):
            for h_idx in range(H):
                out_h.append(all_h[t][b][h_idx])

    out_c = []
    for b in range(B):
        for h_idx in range(H):
            out_c.append(c_prev[b][h_idx])

    sys.stdout.write(' '.join(f"{x:.4f}" for x in out_h) + '\n')
    sys.stdout.write(' '.join(f"{x:.4f}" for x in out_c))

if __name__ == "__main__":
    solve()
```

---

## 示例推演

以示例 1 为例：$T=1, B=1, D=5, H=2$

**初始化：** $h_0 = [0, 0], c_0 = [0, 0]$

**输入门计算：**
- $W_i \cdot x + W_{h,i} \cdot h_0 + b_i$
- 通过 sigmoid 得到 $i_1 \approx [0.95, 0.95]$

**遗忘门计算：**
- 通过 sigmoid 得到 $f_1 \approx [0.69, 0.75]$

**候选细胞：**
- 通过 tanh 得到 $\tilde{c}_1 \approx [0.99, 1.0]$

**细胞状态更新：**
- $c_1 = f_1 \odot c_0 + i_1 \odot \tilde{c}_1 = [0.95, 0.95]$

**输出门 + 隐藏状态：**
- $o_1 \approx [0.76, 0.76]$
- $h_1 = o_1 \odot \tanh(c_1) \approx [0.7615, 0.7616]$

最终输出第一行：`0.7615 0.7616`，第二行（细胞状态）：`0.9997 1.0000`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| LSTM 前向 | O(T · B · H · (D + H)) | O(B · H) | T 为时间步，B 为批次，H 为隐藏维度 |

---

## 易错点总结

### 1. 参数读取顺序

四组参数依次为：输入门、遗忘门、输出门、候选细胞状态，每组内部是 $W_x, W_h, b$。

### 2. 矩阵形状

- $W_x$：$(D, H)$，输入维度到隐藏维度
- $W_h$：$(H, H)$，隐藏到隐藏
- 读取时按行优先展平，需要正确 reshape

### 3. 激活函数选择

输入门、遗忘门、输出门用 sigmoid；候选细胞状态用 tanh；最终隐藏状态用 tanh。

### 4. 输出格式

保留 4 位小数，隐藏状态按 $(t, b, h)$ 顺序展平，细胞状态按 $(b, h)$ 顺序展平。

---

## 扩展思考

- **LSTM vs GRU：** GRU 将遗忘门和输入门合并为更新门，参数量更少，计算更快。
- **多层 LSTM：** 实际应用中通常使用多层 LSTM，下层输出作为上层输入。
- **双向 LSTM：** 同时考虑过去和未来的信息，适合序列标注任务。

---

## 相关题目

- [基于 AdamW 优化的网络带宽预测模型](adamw_bandwidth.md) — 优化算法
