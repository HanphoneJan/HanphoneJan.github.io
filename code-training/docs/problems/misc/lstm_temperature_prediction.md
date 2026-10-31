---
title: LSTM 室内温度预测
platform: 自定义
difficulty: Hard
id: lstm-temperature
url: ""
tags:
  - LSTM
  - 神经网络
  - 序列建模
topics: []
patterns: []
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
- 参数按空白分隔的 token 流读取，行怎么断不影响结果；样例 1 就把每组 16 个数拆成了 12 + 4 两行

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

### 先定形状：谁乘谁，最后展平成什么顺序

输入是一个 $T\times B\times D$ 的三维数组：$T$ 个时间步，每步 $B$ 个样本，每个样本 $D=5$ 个特征。隐藏状态和细胞状态都是 $B\times H$。

权重按**行向量**约定来读最省事：把 $x_t$ 当成 $B\times D$ 的矩阵（单样本时是 $1\times D$），那么

$$
z_t^{(g)} = x_t\,W_x^{(g)} + h_{t-1}\,W_h^{(g)} + b^{(g)} \in \mathbb{R}^{B\times H}
$$

其中 $W_x^{(g)}\in\mathbb{R}^{D\times H}$、$W_h^{(g)}\in\mathbb{R}^{H\times H}$、$b^{(g)}\in\mathbb{R}^{H}$。题目描述里写的是列向量形式 $W\cdot[h_{t-1},x_t]$，两者只是拼接顺序与转置的差别，算出来是同一个 $H$ 维向量：$W_h h_{t-1} + W_x x_t$。**输入给的是拆开的两块**，所以按 $xW_x$、$hW_h$ 分别算再相加，不要去找一个拼接起来的矩阵。

输出展平顺序是固定的：

- 隐藏状态按 $t\to b\to h$，即第 1 个时间步所有批次的 $H$ 个数、再第 2 个时间步……
- 细胞状态只保留最后一个时间步，按 $b\to h$。

### 参数是一串扁平数：每门 $D\cdot H + H\cdot H + H$ 个

四组参数依次是**输入门、遗忘门、输出门、候选细胞状态**。每组内部先 $W_x$（$D$ 行 $H$ 列）、再 $W_h$（$H$ 行 $H$ 列）、最后 $b$（$H$ 个），全部按行优先排成一维。

```python
total = D * H + H * H + H
row = [float(next(it)) for _ in range(total)]
wx = row[:D*H]
wh = row[D*H:D*H+H*H]
b  = row[D*H+H*H:]
wx_mat = [wx[i*H:(i+1)*H] for i in range(D)]   # D 行，每行 H 个
wh_mat = [wh[i*H:(i+1)*H] for i in range(H)]   # H 行，每行 H 个
```

切 $W_x$ 时**行数是 $D$、列宽是 $H$**，两者不能对调：写成 `wx[i*D:(i+1)*D]` 时每行会吃掉 $D$ 个元素，$D\cdot H$ 个数只够填 $H$ 行（样例里是 2 行），再往后切出来的都是空列表，取 `W[2][0]` 直接 `IndexError`。

两点输入细节会直接影响能不能读对：

- 参数是**按空白切分**的，不按行。样例 1 每组 16 个数被排成了 `12 + 4` 两行，如果按「一行一组」读就会错位，所以只能 `sys.stdin.read().split()` 之后顺序取。
- 门顺序不是教科书里常见的 $f,i,o,g$。把 `params[0]` 当成遗忘门，样例 1 的第一行会变成 `0.7596 0.7616`、第二行 `0.9953 1.0000`。

### 门方程：σ 管开关，tanh 管候选值

四个门拿到同一个 $z$ 形状的输入，区别只在激活函数：

$$
\begin{aligned}
i_t &= \sigma(z_t^{(i)}), &\quad f_t &= \sigma(z_t^{(f)}),\\
o_t &= \sigma(z_t^{(o)}), &\quad \tilde c_t &= \tanh(z_t^{(c)}),\\
c_t &= f_t \odot c_{t-1} + i_t \odot \tilde c_t, &\quad h_t &= o_t \odot \tanh(c_t)
\end{aligned}
$$

每个符号的含义与形状：

| 量 | 形状 | 作用 |
|---|---|---|
| $i_t$ | $B\times H$ | 输入门：候选值有多少写进细胞状态 |
| $f_t$ | $B\times H$ | 遗忘门：上一步的 $c_{t-1}$ 保留多少 |
| $o_t$ | $B\times H$ | 输出门：细胞状态有多少暴露成 $h_t$ |
| $\tilde c_t$ | $B\times H$ | 候选值，带符号，由 $\tanh$ 压到 $(-1,1)$ |
| $c_t$ | $B\times H$ | 细胞状态，**加法**更新，不做压缩 |
| $h_t$ | $B\times H$ | 隐藏状态，$c_t$ 过一遍 $\tanh$ 再被 $o_t$ 门控 |

三个门用 $\sigma$ 是因为它们的语义是「放多少过去」，取值必须落在 $(0,1)$；候选值用 $\tanh$ 是因为它要能表示正负。$c_t$ 的更新是逐元素乘加、没有经过压缩函数，梯度可以沿 $c$ 一路传下去 —— 这正是 LSTM 比普通 RNN 能记住更远信息的原因。

### 一个时间步内的执行顺序：四个门共用同一个 $h_{t-1}$

一个时间步里只有一种正确顺序：

1. 取上一时刻的 $h_{t-1}$、$c_{t-1}$（不是本步刚算出来的）；
2. 用**同一个** $h_{t-1}$ 把四个门的 $z$ 全算出来并激活，存进四个独立数组；
3. 用 $f_t,i_t,\tilde c_t$ 和 $c_{t-1}$ 算 $c_t$；
4. 用 $o_t$ 和 $c_t$ 算 $h_t$；
5. 整个批次都算完之后，才把 $h_t,c_t$ 交给下一轮。

```python
for b in range(B):
    xb = x_t[b]
    hb = h_prev[b]              # 本步所有门都用这一份 h_{t-1}

    for gate_idx, (W, Wh, b_vec, gate_out) in enumerate([
        (Wi, Wh_i, bi, i_t),
        (Wf, Wh_f, bf, f_t),
        (Wo, Wh_o, bo, o_t),
        (Wc, Wh_c, bc, c_tilde)
    ]):
        wx_sum = [0.0] * H      # x_t · W_x
        for d in range(D):
            for h_idx in range(H):
                wx_sum[h_idx] += xb[d] * W[d][h_idx]
        wh_sum = [0.0] * H      # h_{t-1} · W_h
        for h_prev_idx in range(H):
            for h_idx in range(H):
                wh_sum[h_idx] += hb[h_prev_idx] * Wh[h_prev_idx][h_idx]
        for h_idx in range(H):
            val = wx_sum[h_idx] + wh_sum[h_idx] + b_vec[h_idx]
            if gate_idx < 3:    # 输入 / 遗忘 / 输出门
                gate_out[b][h_idx] = sigmoid(val)
            else:               # 候选细胞状态
                gate_out[b][h_idx] = tanh(val)
```

`hb = h_prev[b]` 这一行是顺序的关键：四个门必须看到同一份 $h_{t-1}$。所以 $h_t$ 算在新数组里，直到这个时间步的所有批次都算完才写回 `h_prev`；如果在门与门之间就改写 `h_prev`，后面的门读到的就不是上一时刻的状态了。

四个门算完才轮到状态更新：

```python
for h_idx in range(H):
    c_t[b][h_idx] = f_t[b][h_idx] * c_prev[b][h_idx] + i_t[b][h_idx] * c_tilde[b][h_idx]
for h_idx in range(H):
    h_t[b][h_idx] = o_t[b][h_idx] * tanh(c_t[b][h_idx])
```

`c_t` 和 `h_t` 分别写成新数组、不去覆盖 `c_prev`/`h_prev`，交接放在批次循环之外：

```python
all_h.append(h_t)
h_prev = h_t
c_prev = c_t
```

### 展平输出

`all_h` 每轮 append 一个 $B\times H$ 的 $h_t$，所以它天然是 $T\to B\to H$ 的嵌套；最终细胞状态只有一份，按 $B\to H$ 展平。用 `f"{x:.4f}"` 输出，题目要求保留四位小数。

```python
for t in range(T):
    for b in range(B):
        for h_idx in range(H):
            out_h.append(all_h[t][b][h_idx])

for b in range(B):
    for h_idx in range(H):
        out_c.append(c_prev[b][h_idx])
```

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

### 示例 1：$T=1$，一个时间步的完整算术

$D=5$，$H=2$，$B=1$，$h_0=c_0=[0,0]$。因为 $h_{t-1}=0$，$W_h\cdot h_{t-1}$ 这一项全为 0，每个门只算 $x\cdot W_x + b$。

输入向量 $x=[2.5,\ 5.0,\ 3.2,\ 5.0,\ 1.0]$。

**输入门**：$W_x^{(i)}$ 的第 0 列是 $(0.1,0.3,0.5,0.7,0.2)$，点积

$$
2.5\times0.1+5.0\times0.3+3.2\times0.5+5.0\times0.7+1.0\times0.2
=0.25+1.5+1.6+3.5+0.2=7.05
$$

加偏置 $1.1$ 得 $z=8.15$。四个门的两列分别算完：

| 门 | 第 0 列点积 | $b_0$ | $z_0=\sigma/\tanh$ | 第 1 列点积 | $b_1$ | $z_1=\sigma/\tanh$ |
|---|---|---|---|---|---|---|
| 输入 $i$ | 7.05 | 1.1 | $\sigma(8.15)=0.999711$ | 21.03 | 1.4 | $\sigma(22.43)=1.000000$ |
| 遗忘 $f$ | 4.15 | 1.2 | $\sigma(5.35)=0.995274$ | 12.67 | 1.2 | $\sigma(13.87)=0.999999$ |
| 输出 $o$ | 19.97 | 1.1 | $\sigma(21.07)=1.000000$ | 10.60 | 1.5 | $\sigma(12.10)=0.999994$ |
| 候选 $\tilde c$ | 6.55 | 1.6 | $\tanh(8.15)=1.000000$ | 9.17 | 1.2 | $\tanh(10.37)=1.000000$ |

**细胞状态**（$c_0$ 是 0，遗忘门这一项直接消失）：

$$
c_1 = f_1\odot c_0 + i_1\odot\tilde c_1
= [0.999711\times1.000000,\ 1.000000\times1.000000]
= [0.999711,\ 1.000000]
$$

**隐藏状态**：

$$
\tanh(c_1)=[0.761473,\ 0.761594],\qquad
h_1 = o_1\odot\tanh(c_1)=[0.761473,\ 0.761589]
$$

输出 `0.7615 0.7616` 与 `0.9997 1.0000`。

### 示例 2：两步，细胞状态会累加

$T=2$、$B=2$、$H=1$，所以第一行有 $2\times2\times1=4$ 个数。

**第 1 步**（$h_0=c_0=0$）：两个批次的 $z$ 都很大，四个门都贴近饱和：

| 批次 | $z_i$ | $z_f$ | $z_o$ | $z_c$ | $c_1$ | $h_1$ |
|---|---|---|---|---|---|---|
| 0 | 13.25 | 41.90 | 66.65 | 95.30 | 0.999998 | 0.761593 |
| 1 | 13.40 | 42.35 | 67.25 | 96.20 | 0.999998 | 0.761594 |

**第 2 步**（批次 0）：这次 $h_1=0.761593$ 不为 0，$W_h$ 那一项参与进来，$z_i\approx13.43$、$z_f\approx42.23$、$z_o\approx66.91$、$z_c\approx95.79$，仍然是 $i\approx f\approx o\approx1$、$\tilde c\approx1$。于是

$$
c_2 = f_2\odot c_1 + i_2\odot\tilde c_2 \approx 1\times1.0 + 1\times1.0 = 2.0
$$

$$
h_2 = o_2\odot\tanh(c_2)\approx\tanh(2.0)=0.9640
$$

第一个批次两步的隐藏状态是 $0.7616\to0.9640$；第二个批次同理也是 $0.7616\to0.9640$。按 $t\to b\to h$ 展平就是 `0.7616 0.7616 0.9640 0.9640`，最终细胞状态 `2.0000 2.0000`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|---|---|---|---|
| LSTM 前向 | O(T · B · H · (D + H)) | O(T · B · (D + H)) | 每个时间步、每个批次、每个隐藏单元都要对四个门各做 $D+H$ 次乘加；空间里 $X$ 与全部 $h_t$ 都占 $O(TBD)$、$O(TBH)$ |

---

## 易错点总结

1. **门顺序读错**：`params[0..3]` 是输入门、遗忘门、输出门、候选。把前两个当成遗忘门和输入门（教科书写法 $f$ 在前）之后，样例 1 输出 `0.7596 0.7616` / `0.9953 1.0000`，而正确值是 `0.7615 0.7616` / `0.9997 1.0000`。四组参数长度完全一样，程序不会报错，只能靠数字发现。
2. **`h_prev`/`c_prev` 写在时间步循环里面**：每轮都重置成 0，LSTM 就退化成「每步都从头开始」。样例 1 只有一步看不出来，样例 2 会给出 `0.7616 0.7616 0.7616 0.7616` / `1.0000 1.0000`（正确是 `0.7616 0.7616 0.9640 0.9640` / `2.0000 2.0000`）。初始化必须放在 `for t in range(T)` 之前。
3. **展平顺序写成 $b\to t\to h$**：`out_h` 的三层循环写成 `for b` 在外、`for t` 在内。样例 1 的 $B=1$ 完全看不出来，样例 2 的第一行会变成 `0.7616 0.9640 0.7616 0.9640` —— 四个数都对，只是位置换了。

---

## 相关题目

- [基于 AdamW 优化的网络带宽预测模型](adamw_bandwidth.md) — 优化算法
