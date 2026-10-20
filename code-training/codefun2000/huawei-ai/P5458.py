"""
P5458. 编码器层前向计算 - Post-LN Transformer Encoder Layer

题目要求实现一层标准的 Transformer Encoder Layer，固定形状与固定权重：
- 输入 x 的形状为 (batch, seq, d_model) = (1, 2, 4)，因此实际上只有一个样本、
  两个位置、每个位置 4 维；
- 头数 h = 2，每头维度 d_k = d_model / h = 2；
- 所有投影矩阵（W_Q、W_K、W_V、W_O、W_1、W_2）都是 4x4 单位矩阵，
  FFN 的两个偏置都是零向量，所以 Q = K = V = x，输出投影和 FFN 的线性层
  等价于“什么都不做”；
- 层归一化的 gamma = 1、beta = 0、eps = 1e-5，在最后一维（d_model）上统计，
  方差用总体方差（除以 d_model）；
- 采用 Post-LN：每个子层先做残差相加，再做层归一化。

输入格式：
- 一行 8 个实数，按行优先给出 x：先是位置 0 的 4 个分量，再是位置 1 的 4 个分量。

输出格式：
- 一行 8 个实数，把输出张量按同样顺序平铺，每个数四舍五入到小数点后 2 位。

核心思路：
1. 权重都是单位矩阵，于是只需要实现“多头切分 + 缩放点积注意力 + 拼接”；
2. 两个头各自在 (2, 2) 的子空间里做 softmax（序列维上归一化），
   再按原来的特征区间拼回去；
3. 第一个子层：y = LayerNorm(x + MultiHead(x))；
4. 第二个子层：out = LayerNorm(y + ReLU(y))，因为 FFN 的权重是单位矩阵、
   偏置为零，所以 FFN(y) = ReLU(y)；
5. softmax 先减去行最大值再取指数，避免 exp 溢出。

时间复杂度：O(seq^2 * d_model) = O(2^2 * 4)，即常数级；
空间复杂度：O(seq * d_model)，即常数级。
"""

# https://codefun2000.com/p/P5458
import math
import sys

# 题目固定的模型设定。写成常量而不是魔法数字，便于对照题面。
SEQ_LEN = 2          # 序列长度
D_MODEL = 4          # 每个位置的特征维度
NUM_HEADS = 2        # 头数
D_K = D_MODEL // NUM_HEADS  # 每头维度 = 2
LAYER_NORM_EPS = 1e-5

# @sample-start
"""
样例输入 1:
2.00 0.00 0.00 0.00 0.00 2.00 0.00 0.00

样例输出 1:
1.73 -0.55 -0.59 -0.59 -0.55 1.73 -0.59 -0.59
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1.00 0.00 1.00 0.00 0.00 1.00 0.00 1.00

样例输出 2:
1.00 -1.00 1.00 -1.00 -1.00 1.00 -1.00 1.00
"""
# @sample-end


def layer_norm(vector):
    """在最后一维上做层归一化（gamma = 1，beta = 0，总体方差）。"""
    n = len(vector)
    mean = sum(vector) / n

    # 题目明确要求总体方差：除以 n，而不是 n - 1。
    variance = sum((v - mean) ** 2 for v in vector) / n

    # eps 放在根号里面，和题面公式 sqrt(Var + eps) 完全一致。
    std = math.sqrt(variance + LAYER_NORM_EPS)
    return [(v - mean) / std for v in vector]


def multi_head_attention(x):
    """多头自注意力。权重矩阵都是单位矩阵，所以 Q = K = V = x。"""
    scale = math.sqrt(D_K)
    output = [[0.0] * D_MODEL for _ in range(SEQ_LEN)]

    # 按特征区间 [t*d_k, (t+1)*d_k) 逐个处理每个头。
    for head in range(NUM_HEADS):
        lo = head * D_K
        hi = lo + D_K

        for i in range(SEQ_LEN):
            # 第 i 个位置在该头内的 query 与所有位置的 key 做点积并缩放。
            scores = []
            for j in range(SEQ_LEN):
                dot = 0.0
                for t in range(lo, hi):
                    dot += x[i][t] * x[j][t]
                scores.append(dot / scale)

            # 减行最大值只改变数值稳定性，不改变 softmax 的结果。
            max_score = max(scores)
            exp_scores = [math.exp(s - max_score) for s in scores]
            total = sum(exp_scores)

            # 用注意力权重对本头的 V 加权求和，写回拼接结果的对应区间。
            for j in range(SEQ_LEN):
                weight = exp_scores[j] / total
                for t in range(lo, hi):
                    output[i][t] += weight * x[j][t]

    return output


def encoder_layer(x):
    """Post-LN 编码器层：MHSA 子层 + FFN 子层，各带残差与层归一化。"""
    # 子层 1：多头自注意力。W_O 是单位矩阵，所以拼接结果直接就是输出。
    attention = multi_head_attention(x)
    first = [
        layer_norm([x[i][d] + attention[i][d] for d in range(D_MODEL)])
        for i in range(SEQ_LEN)
    ]

    # 子层 2：W_1 = W_2 = I、b_1 = b_2 = 0，因此 FFN(y) = ReLU(y)。
    ffn = [[max(0.0, v) for v in row] for row in first]
    second = [
        layer_norm([first[i][d] + ffn[i][d] for d in range(D_MODEL)])
        for i in range(SEQ_LEN)
    ]

    return second


def format_number(value: float) -> str:
    """保留两位小数，并把极其接近 0 的负数归零，避免输出 -0.00。"""
    if abs(value) < 0.005:
        value = 0.0
    return f"{value:.2f}"


def solve():
    """读取 8 个实数，输出编码器层前向计算结果。"""
    tokens = sys.stdin.buffer.read().split()
    if len(tokens) < SEQ_LEN * D_MODEL:
        return

    values = [float(t) for t in tokens[:SEQ_LEN * D_MODEL]]

    # 按行优先还原成 (seq, d_model) 的二维表：前 4 个是位置 0，后 4 个是位置 1。
    x = [values[i * D_MODEL:(i + 1) * D_MODEL] for i in range(SEQ_LEN)]

    result = encoder_layer(x)

    # 输出同样按行优先平铺，同一个位置的分量挨在一起。
    flat = [format_number(v) for row in result for v in row]
    print(" ".join(flat))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：两个位置分别激活第一个、第二个特征
        (
            "2.00 0.00 0.00 0.00 0.00 2.00 0.00 0.00\n",
            "1.73 -0.55 -0.59 -0.59 -0.55 1.73 -0.59 -0.59",
        ),
        # 官方样例 2：两个位置分别是 (1,0,1,0) 与 (0,1,0,1)
        (
            "1.00 0.00 1.00 0.00 0.00 1.00 0.00 1.00\n",
            "1.00 -1.00 1.00 -1.00 -1.00 1.00 -1.00 1.00",
        ),
        # 全零输入：注意力、残差、ReLU、层归一化全都保持 0
        (
            "0 0 0 0 0 0 0 0\n",
            "0.00 0.00 0.00 0.00 0.00 0.00 0.00 0.00",
        ),
        # 样例 1 放大 25 倍：注意力分数足够大，softmax 退化成 0/1 的“只看自己”，
        # 于是注意力输出恰好等于 x，残差后为 2x，层归一化后两个位置完全相同
        (
            "50 0 0 0 0 50 0 0\n",
            "1.73 -0.58 -0.58 -0.58 -0.58 1.73 -0.58 -0.58",
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
