"""
P5613. 分组查询注意力（GQA） - 手写缩放点积注意力 + 头分组共享

分组查询注意力（Grouped Query Attention）是标准多头注意力的变体：
Query 头有 num_q_heads 个，Key/Value 头只有 num_kv_heads 个，
每 g = num_q_heads / num_kv_heads 个 Query 头共享同一组 KV 头。
这样既保留了多 Query 头的表达能力，又把 KV 的存储与计算量按 g 倍压下来。

输入格式：
- 第 1 行：n、num_q_heads、num_kv_heads、d_k、d_v；
- 接下来 n 行：Q，每行 num_q_heads * d_k 个浮点数；
- 接下来 n 行：K，每行 num_kv_heads * d_k 个浮点数；
- 接下来 n 行：V，每行 num_kv_heads * d_v 个浮点数；
- 接下来 n 行：mask，每行 n 个整数，1 表示屏蔽、0 表示可见。

输出格式：
- n 行，每行 num_q_heads * d_v 个浮点数，保留 2 位小数。
  第 h 个 Query 头的结果占据输出的第 h * d_v 到 (h + 1) * d_v - 1 列。

核心思路：
1. 按列把 Q 拆成 num_q_heads 个 (n, d_k) 子矩阵，把 K 拆成 num_kv_heads 个
   (n, d_k) 子矩阵，把 V 拆成 num_kv_heads 个 (n, d_v) 子矩阵。
2. 第 h 个 Query 头属于第 h // g 组，与第 h // g 个 KV 头配对。
3. 单头注意力：S = Q_h K_m^T / sqrt(d_k)，掩码处置 -1e30，
   再逐行做减最大值的 softmax，最后乘 V_m 得到 (n, d_v) 的输出。
4. 所有 Query 头的输出按头编号从左到右拼接，得到 (n, num_q_heads * d_v) 的结果。

时间复杂度：O(num_q_heads * n^2 * (d_k + d_v))；
空间复杂度：O(n * (num_q_heads * d_k + num_kv_heads * (d_k + d_v)) + n^2)。
"""

import math
import sys

MASKED = -1e30   # 用题面建议的 -1e30 代替 -inf，避免 nan 传播

# @sample-start
"""
样例输入 1:
2 4 2 1 1
1.0 0.0 0.0 1.0
0.0 1.0 1.0 0.0
0.0 1.0
1.0 0.0
2.0 4.0
8.0 6.0
0 0
0 0

样例输出 1:
6.39 5.00 5.00 4.54
5.00 6.39 4.54 5.00
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 2 2 2 1
1.0 0.0 0.0 1.0
0.0 1.0 1.0 0.0
1.0 0.0 0.0 1.0
0.0 1.0 1.0 0.0
2.0 6.0
4.0 8.0
0 1
0 0

样例输出 2:
2.00 6.00
3.34 7.34
"""
# @sample-end


def softmax_row(scores):
    """对一行分数做 softmax。

    先减去该行最大值：exp 的输入不会超过 0，避免上溢；
    这一步只是把分子分母同时除以同一个常数，不改变结果。
    """
    row_max = max(scores)
    exps = [math.exp(s - row_max) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def single_head_attention(q, k, v, mask, n, d_k, d_v, scale):
    """单头缩放点积注意力：Attention(Q, K, V, mask)，返回 (n, d_v)。"""
    output = []
    for i in range(n):
        qi = q[i]
        mask_i = mask[i]

        # 第 1、2 步：手动矩阵乘法 S[i][j] = Q[i] · K[j]，再除以 sqrt(d_k)
        scores = []
        for j in range(n):
            kj = k[j]
            dot = 0.0
            for t in range(d_k):
                dot += qi[t] * kj[t]
            scores.append(dot / scale)

        # 第 4 步：掩码在缩放之后生效，被屏蔽的位置直接压成 -inf（这里用 -1e30）
        for j in range(n):
            if mask_i[j] == 1:
                scores[j] = MASKED

        # 第 5 步：逐行 softmax
        weights = softmax_row(scores)

        # 第 6 步：用注意力权重对 V 加权求和，得到 d_v 维输出
        row = [0.0] * d_v
        for j in range(n):
            w = weights[j]
            if w == 0.0:
                continue          # 被屏蔽位置的权重是 0，跳过可以省掉一次内层循环
            vj = v[j]
            for t in range(d_v):
                row[t] += w * vj[t]
        output.append(row)

    return output


def split_heads(matrix, num_heads, width):
    """把 (n, num_heads * width) 的矩阵按列切成 num_heads 个 (n, width) 子矩阵。

    第 h 个头占据列区间 [h * width, (h + 1) * width)，切分顺序必须与输入一致。
    """
    return [
        [row[h * width:(h + 1) * width] for row in matrix]
        for h in range(num_heads)
    ]


def format_float(value):
    """保留 2 位小数，并把 -0.00 归一成 0.00。"""
    if abs(value) < 0.005:
        value = 0.0
    return f"{value:.2f}"


def solve():
    """读取输入、计算分组查询注意力并按要求输出。"""
    tokens = sys.stdin.buffer.read().split()
    if not tokens:
        return

    pos = 0
    n, num_q_heads, num_kv_heads, d_k, d_v = (int(x) for x in tokens[pos:pos + 5])
    pos += 5

    def read_matrix(rows, cols, cast=float):
        """从当前位置读取 rows x cols 的矩阵。"""
        nonlocal pos
        mat = []
        for _ in range(rows):
            mat.append([cast(x) for x in tokens[pos:pos + cols]])
            pos += cols
        return mat

    q_total = num_q_heads * d_k      # Q 每行的宽度
    k_total = num_kv_heads * d_k     # K 每行的宽度
    v_total = num_kv_heads * d_v     # V 每行的宽度

    q_mat = read_matrix(n, q_total)
    k_mat = read_matrix(n, k_total)
    v_mat = read_matrix(n, v_total)
    mask = read_matrix(n, n, cast=int)

    # 按列拆头：Q 有 num_q_heads 个、K/V 各有 num_kv_heads 个
    q_heads = split_heads(q_mat, num_q_heads, d_k)
    k_heads = split_heads(k_mat, num_kv_heads, d_k)
    v_heads = split_heads(v_mat, num_kv_heads, d_v)

    scale = math.sqrt(d_k)           # 缩放因子，d_k 越大点积的量级越大
    group_size = num_q_heads // num_kv_heads   # 每组共享同一对 KV 的 Query 头数

    # 每个 Query 头独立算一次注意力，KV 头按组复用
    head_outputs = []
    for h in range(num_q_heads):
        kv_index = h // group_size    # 第 h 个 Query 头属于第 h // g 组
        head_outputs.append(
            single_head_attention(
                q_heads[h], k_heads[kv_index], v_heads[kv_index],
                mask, n, d_k, d_v, scale,
            )
        )

    # 按头编号拼接：位置 i 的输出 = [头 0 的 d_v 维 | 头 1 的 d_v 维 | ...]
    for i in range(n):
        row = []
        for h in range(num_q_heads):
            row.extend(head_outputs[h][i])
        print(" ".join(format_float(x) for x in row))


def run_tests():
    """运行嵌入的样例与边界用例。"""
    import io

    test_cases = [
        (
            # 官方样例 1：4 个 Query 头分组共享 2 组 KV，g=2
            "2 4 2 1 1\n"
            "1.0 0.0 0.0 1.0\n"
            "0.0 1.0 1.0 0.0\n"
            "0.0 1.0\n"
            "1.0 0.0\n"
            "2.0 4.0\n"
            "8.0 6.0\n"
            "0 0\n"
            "0 0\n",
            "6.39 5.00 5.00 4.54\n5.00 6.39 4.54 5.00",
        ),
        (
            # 官方样例 2：g=1，d_k=2，第 0 行第 1 列被掩码屏蔽
            "2 2 2 2 1\n"
            "1.0 0.0 0.0 1.0\n"
            "0.0 1.0 1.0 0.0\n"
            "1.0 0.0 0.0 1.0\n"
            "0.0 1.0 1.0 0.0\n"
            "2.0 6.0\n"
            "4.0 8.0\n"
            "0 1\n"
            "0 0\n",
            "2.00 6.00\n3.34 7.34",
        ),
        (
            # 单头、单 token：softmax 权重恒为 1，输出就是 V 本身
            "1 1 1 2 2\n"
            "1 0\n"
            "1 0\n"
            "3 4\n"
            "0\n",
            "3.00 4.00",
        ),
        (
            # 无掩码时注意力行和为 1，两组 V 完全一样，输出必然是这组 V
            "2 1 1 1 2\n"
            "1\n1\n"
            "1\n1\n"
            "5 7\n"
            "5 7\n"
            "0 0\n"
            "0 0\n",
            "5.00 7.00\n5.00 7.00",
        ),
        (
            # d_v=3 且 g=2：四个 Query 头拼成 12 列，验证列拼接顺序
            "1 4 2 1 3\n"
            "1 1 1 1\n"
            "1 1\n"
            "1 2 3\n"
            "4 5 6\n"
            "0\n",
            "1.00 2.00 3.00 1.00 2.00 3.00 4.00 5.00 6.00 4.00 5.00 6.00",
        ),
    ]

    all_passed = True
    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        passed = output == expected
        if not passed:
            all_passed = False
        status = "✓" if passed else "✗"
        print(f"样例 {i}: {status}")
        if not passed:
            print(f"  期望={expected!r}")
            print(f"  实际={output!r}")

    print("\n全部用例通过" if all_passed else "\n存在失败用例")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
