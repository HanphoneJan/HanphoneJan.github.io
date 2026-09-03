#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
题目：LSTM 室内温度预测

背景：智能家居系统使用 LSTM 模型预测未来时刻室内温度，输入特征包括：
室内温度、室外温度、空调功率、门窗开合状态、室内人员数量。

任务：基于过去 T 个时间步的 5 个特征，计算 LSTM 每个时间步的隐藏状态和最终细胞状态。

LSTM 核心公式：
    f_t = σ(W_f·[h_{t-1}, x_t] + b_f)
    i_t = σ(W_i·[h_{t-1}, x_t] + b_i)
    c̃_t = tanh(W_c·[h_{t-1}, x_t] + b_c)
    c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t
    o_t = σ(W_o·[h_{t-1}, x_t] + b_o)
    h_t = o_t ⊙ tanh(c_t)

初始状态 h_0, c_0 均为 0 向量。

输入描述：
第一行：T, B, D, H （D 固定为 5）
接下来 T 行：每行 B×D 个浮点数，按时间步顺序，每个时间步内按批次顺序排列（先第1个房间的 D 个特征，再第2个房间...）
最后四行：分别对应输入门、遗忘门、输出门、候选细胞状态的参数。
每行依次包含：输入权重（D×H）、隐藏权重（H×H）、偏置（H）的所有元素，按行优先展平。

输出描述：
第一行：所有时间步的隐藏状态（T×B×H），按时间步顺序展平，保留4位小数。
第二行：最终细胞状态（B×H），按批次顺序展平，保留4位小数。

样例1：
输入：
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
输出：
0.7615 0.7616
0.9997 1.0000

样例2：
输入：
2 2 5 1
21.0 25.0 22.0 25.5 1 21.0 25.0 22.0 25.5 2
22.0 26.0 20.5 24.0 2 22.0 26.0 20.5 24.0 1
0.1 0.15 0.2 0.1 0.15 0.3 0.3
0.4 0.45 0.5 0.4 0.45 0.5 0.6
0.7 0.6 0.8 0.7 0.6 0.8 0.9
1.0 0.9 1.1 1.0 0.9 1.1 1.2
输出：
0.7616 0.7616 0.9640 0.9640
2.0000 2.0000
"""

import sys
import math

# @sample-start
"""
样例输入 1:
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

样例输出 1:
0.7615 0.7616
0.9997 1.0000
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 2 5 1
21.0 25.0 22.0 25.5 1 21.0 25.0 22.0 25.5 2
22.0 26.0 20.5 24.0 2 22.0 26.0 20.5 24.0 1
0.1 0.15 0.2 0.1 0.15 0.3 0.3
0.4 0.45 0.5 0.4 0.45 0.5 0.6
0.7 0.6 0.8 0.7 0.6 0.8 0.9
1.0 0.9 1.1 1.0 0.9 1.1 1.2

样例输出 2:
0.7616 0.7616 0.9640 0.9640
2.0000 2.0000
"""
# @sample-end

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
    D = int(next(it))   # 固定为5
    H = int(next(it))

    # 读取输入序列
    X = []  # 列表 of shape (T, B, D)
    for _ in range(T):
        vals = [float(next(it)) for _ in range(B * D)]
        # 重塑为 (B, D)
        x_t = [vals[i*D:(i+1)*D] for i in range(B)]
        X.append(x_t)

    # 读取四个门的参数（输入门、遗忘门、输出门、候选细胞状态）
    params = []
    for _ in range(4):
        total = D * H + H * H + H
        row = [float(next(it)) for _ in range(total)]
        wx = row[:D*H]          # 长度 D*H
        wh = row[D*H:D*H+H*H]   # 长度 H*H
        b = row[D*H+H*H:]       # 长度 H
        # 重塑矩阵: wx (D x H), wh (H x H)
        wx_mat = [wx[i*H:(i+1)*H] for i in range(D)]
        wh_mat = [wh[i*H:(i+1)*H] for i in range(H)]
        b_vec = b
        params.append((wx_mat, wh_mat, b_vec))

    # 按顺序：0-输入门,1-遗忘门,2-输出门,3-候选细胞
    Wi, Wh_i, bi = params[0]
    Wf, Wh_f, bf = params[1]
    Wo, Wh_o, bo = params[2]
    Wc, Wh_c, bc = params[3]

    # 初始化隐藏状态和细胞状态
    h_prev = [[0.0] * H for _ in range(B)]   # (B, H)
    c_prev = [[0.0] * H for _ in range(B)]   # (B, H)

    all_h = []  # 存储每个时间步的隐藏状态 (T, B, H)

    for t in range(T):
        x_t = X[t]   # (B, D)
        i_t = [[0.0]*H for _ in range(B)]
        f_t = [[0.0]*H for _ in range(B)]
        o_t = [[0.0]*H for _ in range(B)]
        c_tilde = [[0.0]*H for _ in range(B)]
        c_t = [[0.0]*H for _ in range(B)]
        h_t = [[0.0]*H for _ in range(B)]

        for b in range(B):
            xb = x_t[b]        # 长度 D
            hb = h_prev[b]     # 长度 H

            # 输入门
            wx_sum = [0.0]*H
            for d in range(D):
                for h_idx in range(H):
                    wx_sum[h_idx] += xb[d] * Wi[d][h_idx]
            wh_sum = [0.0]*H
            for h_prev_idx in range(H):
                for h_idx in range(H):
                    wh_sum[h_idx] += hb[h_prev_idx] * Wh_i[h_prev_idx][h_idx]
            for h_idx in range(H):
                val = wx_sum[h_idx] + wh_sum[h_idx] + bi[h_idx]
                i_t[b][h_idx] = sigmoid(val)

            # 遗忘门
            wx_sum = [0.0]*H
            for d in range(D):
                for h_idx in range(H):
                    wx_sum[h_idx] += xb[d] * Wf[d][h_idx]
            wh_sum = [0.0]*H
            for h_prev_idx in range(H):
                for h_idx in range(H):
                    wh_sum[h_idx] += hb[h_prev_idx] * Wh_f[h_prev_idx][h_idx]
            for h_idx in range(H):
                val = wx_sum[h_idx] + wh_sum[h_idx] + bf[h_idx]
                f_t[b][h_idx] = sigmoid(val)

            # 输出门
            wx_sum = [0.0]*H
            for d in range(D):
                for h_idx in range(H):
                    wx_sum[h_idx] += xb[d] * Wo[d][h_idx]
            wh_sum = [0.0]*H
            for h_prev_idx in range(H):
                for h_idx in range(H):
                    wh_sum[h_idx] += hb[h_prev_idx] * Wh_o[h_prev_idx][h_idx]
            for h_idx in range(H):
                val = wx_sum[h_idx] + wh_sum[h_idx] + bo[h_idx]
                o_t[b][h_idx] = sigmoid(val)

            # 候选细胞状态
            wx_sum = [0.0]*H
            for d in range(D):
                for h_idx in range(H):
                    wx_sum[h_idx] += xb[d] * Wc[d][h_idx]
            wh_sum = [0.0]*H
            for h_prev_idx in range(H):
                for h_idx in range(H):
                    wh_sum[h_idx] += hb[h_prev_idx] * Wh_c[h_prev_idx][h_idx]
            for h_idx in range(H):
                val = wx_sum[h_idx] + wh_sum[h_idx] + bc[h_idx]
                c_tilde[b][h_idx] = tanh(val)

            # 更新细胞状态
            cb = c_prev[b]
            for h_idx in range(H):
                c_t[b][h_idx] = f_t[b][h_idx] * cb[h_idx] + i_t[b][h_idx] * c_tilde[b][h_idx]

            # 更新隐藏状态
            for h_idx in range(H):
                h_t[b][h_idx] = o_t[b][h_idx] * tanh(c_t[b][h_idx])

        all_h.append(h_t)
        h_prev = h_t
        c_prev = c_t

    # 输出第一行：所有时间步隐藏状态展平 (T*B*H)
    out_h = []
    for t in range(T):
        for b in range(B):
            for h_idx in range(H):
                out_h.append(all_h[t][b][h_idx])

    # 输出第二行：最终细胞状态展平 (B*H)
    out_c = []
    for b in range(B):
        for h_idx in range(H):
            out_c.append(c_prev[b][h_idx])

    sys.stdout.write(' '.join(f"{x:.4f}" for x in out_h) + '\n')
    sys.stdout.write(' '.join(f"{x:.4f}" for x in out_c))

def test():
    """运行题目提供的测试用例"""
    import io

    # 测试用例1
    input1 = """1 1 5 2
2.5 5.0 3.2 5.0 1
0.1 0.1 0.3 3.4 0.5 0.4 0.7 0.3 0.2 1.0 0.7 0.5
0.8 1.0 1.1 1.4
0.1 0.7 0.1 1.4 0.5 0.6 0.3 0.2 0.3 1.0 0.8 0.7
0.7 1.1 1.2 1.2
0.1 0.8 3.3 0.4 0.1 0.5 0.4 0.8 0.9 1.0 0.6 0.9
0.5 1.2 1.1 1.5
0.1 0.1 0.3 0.4 0.5 0.6 0.6 0.8 0.2 1.0 0.7 0.1
0.9 1.3 1.6 1.2"""
    expected1_h = "0.7615 0.7616"
    expected1_c = "0.9997 1.0000"

    # 测试用例2
    input2 = """2 2 5 1
21.0 25.0 22.0 25.5 1 21.0 25.0 22.0 25.5 2
22.0 26.0 20.5 24.0 2 22.0 26.0 20.5 24.0 1
0.1 0.15 0.2 0.1 0.15 0.3 0.3
0.4 0.45 0.5 0.4 0.45 0.5 0.6
0.7 0.6 0.8 0.7 0.6 0.8 0.9
1.0 0.9 1.1 1.0 0.9 1.1 1.2"""
    expected2_h = "0.7616 0.7616 0.9640 0.9640"
    expected2_c = "2.0000 2.0000"

    # 测试1
    sys.stdin = io.StringIO(input1)
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        solve()
        out = sys.stdout.getvalue().strip().split('\n')
        out_h = out[0].strip()
        out_c = out[1].strip()
        status1 = (out_h == expected1_h and out_c == expected1_c)
    finally:
        sys.stdout = old_stdout

    # 测试2
    sys.stdin = io.StringIO(input2)
    sys.stdout = io.StringIO()
    try:
        solve()
        out = sys.stdout.getvalue().strip().split('\n')
        out_h = out[0].strip()
        out_c = out[1].strip()
        status2 = (out_h == expected2_h and out_c == expected2_c)
    finally:
        sys.stdout = old_stdout

    print("测试用例1:", "✓" if status1 else "✗")
    if not status1:
        print(f"  期望: {expected1_h}\n       {expected1_c}")
    print("测试用例2:", "✓" if status2 else "✗")
    if not status2:
        print(f"  期望: {expected2_h}\n       {expected2_c}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        test()
    else:
        solve()