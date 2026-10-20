"""
P5337. 滑动窗口注意力机制 - 局部窗口 + Softmax

标准自注意力会让每个位置与序列中的所有位置计算注意力，复杂度为 O(N^2 * d)。
本题把每个位置的注意力范围限制在左右各 w 个位置内，只计算窗口内的分数，
从而把复杂度降到 O(N * w * d)。

输入格式：
- 第 1 行：batch_size、seq_len、d_k、window_size；
- 每个 batch 依次给出：
  seq_len 行 Query 矩阵；
  seq_len 行 Key 矩阵；
  seq_len 行 Value 矩阵。

输出格式：
- 每个 batch 输出 seq_len 行，每行 d_k 个保留 2 位小数的浮点数；
- batch 之间用一个空行分隔，最后一组后没有空行；
- 如果输入违反约束（例如 window_size < 1 或 window_size > seq_len），输出 0。

核心思路：
1. 对位置 i，窗口范围是 [max(0, i-w), min(N-1, i+w)]。
2. 只在该窗口内计算 Q[i] 与 K[j] 的点积，并除以 sqrt(d_k)。
3. 用窗口内最大值做数值稳定的 Softmax。
4. 用得到的权重对窗口内的 V[j] 加权求和，得到输出向量。

时间复杂度：O(batch_size * seq_len * (2*w+1) * d_k)
空间复杂度：O(seq_len * d_k)，用于保存一个 batch 的 Q、K、V。
"""

import math
import sys

# @sample-start
"""
样例输入 1:
1 4 4 1
0.1 0.2 0.3 0.4
0.2 0.3 0.4 0.5
0.3 0.4 0.5 0.6
0.4 0.5 0.6 0.7
0.1 0.0 0.1 0.0
0.0 0.1 0.0 0.1
0.1 0.1 0.0 0.0
0.0 0.0 0.1 0.1
1.0 0.0 0.0 0.0
0.0 1.0 0.0 0.0
0.0 0.0 1.0 0.0
0.0 0.0 0.0 1.0

样例输出 1:
0.50 0.50 0.00 0.00
0.33 0.34 0.33 0.00
0.00 0.33 0.33 0.34
0.00 0.00 0.50 0.50
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1 2 2 0
0.3 0.4
0.4 0.5
0.5 0.6
0.6 0.7
0.1 0.0
0.0 0.1

样例输出 2:
0
"""
# @sample-end


def format_number(value: float) -> str:
    """保留两位小数，并避免输出 -0.00。"""
    if abs(value) < 0.005:
        value = 0.0
    return f"{value:.2f}"


def solve():
    """读取所有输入并输出每个 batch 的滑动窗口注意力结果。"""
    # 输入既有整数（头部 4 个参数）也有浮点数（Q/K/V），
    # 所以先按空白切成字符串，再按需要分别转换。
    tokens = sys.stdin.buffer.read().split()
    if len(tokens) < 4:
        print(0)
        return

    # 头部：batch 数、序列长度、每个 token 的维度、窗口半径
    batch_size, seq_len, d_k, window_size = map(int, tokens[:4])

    # 题目约束：batch_size >= 1、seq_len >= 1、d_k >= 1、
    # 1 <= window_size <= seq_len。任何一条不满足都输出 0。
    if batch_size < 1 or seq_len < 1 or d_k < 1:
        print(0)
        return
    if window_size < 1 or window_size > seq_len:
        print(0)
        return

    # 每个 batch 有 Q、K、V 三个 seq_len x d_k 矩阵，
    # 所以总共需要 3 * batch_size * seq_len * d_k 个浮点数。
    needed = 3 * batch_size * seq_len * d_k
    if len(tokens) < 4 + needed:
        print(0)
        return

    pos = 4
    # 缩放因子 1 / sqrt(d_k)，在算完点积后统一除。
    scale = math.sqrt(d_k)
    groups = []

    for _ in range(batch_size):
        # 读取当前 batch 的 Query 矩阵，形状 seq_len x d_k。
        query = []
        for _ in range(seq_len):
            query.append([float(x) for x in tokens[pos:pos + d_k]])
            pos += d_k

        # 读取 Key 矩阵，形状 seq_len x d_k。
        key = []
        for _ in range(seq_len):
            key.append([float(x) for x in tokens[pos:pos + d_k]])
            pos += d_k

        # 读取 Value 矩阵，形状 seq_len x d_k。
        value = []
        for _ in range(seq_len):
            value.append([float(x) for x in tokens[pos:pos + d_k]])
            pos += d_k

        lines = []
        for i in range(seq_len):
            # 位置 i 的窗口是 [i-w, i+w]。
            # 序列两端没有位置，所以窗口要截断，而不是补零。
            left = max(0, i - window_size)
            right = min(seq_len - 1, i + window_size)

            # 只计算窗口内的注意力分数：
            # score = Q[i] · K[j] / sqrt(d_k)
            scores = []
            qi = query[i]
            for j in range(left, right + 1):
                dot = 0.0
                kj = key[j]
                for t in range(d_k):
                    dot += qi[t] * kj[t]
                scores.append(dot / scale)

            # 数值稳定的 Softmax：
            # 先减去窗口内最大值，再取 exp，最后归一化。
            max_score = max(scores)
            exp_scores = [math.exp(s - max_score) for s in scores]
            total = sum(exp_scores)
            weights = [e / total for e in exp_scores]

            # 用窗口内的权重对 V 加权求和：
            # output[t] = sum_j weight[j] * V[j][t]
            output = [0.0] * d_k
            for offset, j in enumerate(range(left, right + 1)):
                weight = weights[offset]
                vj = value[j]
                for t in range(d_k):
                    output[t] += weight * vj[t]

            lines.append(" ".join(format_number(x) for x in output))

        groups.append("\n".join(lines))

    # batch 之间用空行分隔，最后一组后没有空行
    print("\n\n".join(groups))


def run_tests():
    """运行嵌入的样例测试。"""
    import io

    test_cases = [
        (
            "1 4 4 1\n"
            "0.1 0.2 0.3 0.4\n"
            "0.2 0.3 0.4 0.5\n"
            "0.3 0.4 0.5 0.6\n"
            "0.4 0.5 0.6 0.7\n"
            "0.1 0.0 0.1 0.0\n"
            "0.0 0.1 0.0 0.1\n"
            "0.1 0.1 0.0 0.0\n"
            "0.0 0.0 0.1 0.1\n"
            "1.0 0.0 0.0 0.0\n"
            "0.0 1.0 0.0 0.0\n"
            "0.0 0.0 1.0 0.0\n"
            "0.0 0.0 0.0 1.0\n",
            "0.50 0.50 0.00 0.00\n"
            "0.33 0.34 0.33 0.00\n"
            "0.00 0.33 0.33 0.34\n"
            "0.00 0.00 0.50 0.50",
        ),
        (
            "1 2 2 0\n"
            "0.3 0.4\n"
            "0.4 0.5\n"
            "0.5 0.6\n"
            "0.6 0.7\n"
            "0.1 0.0\n"
            "0.0 0.1\n",
            "0",
        ),
        # 两个 batch：组之间要有空行，最后一组后没有空行
        (
            "2 1 1 1\n"
            "1\n"
            "1\n"
            "2\n"
            "1\n"
            "1\n"
            "3\n",
            "2.00\n\n3.00",
        ),
        # window_size 大于 seq_len，违反约束
        (
            "1 2 1 3\n"
            "1\n"
            "2\n"
            "1\n"
            "2\n"
            "1\n"
            "2\n",
            "0",
        ),
        # 结果接近 0 时不能输出 -0.00
        (
            "1 1 1 1\n"
            "1\n"
            "1\n"
            "-0.001\n",
            "0.00",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
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
