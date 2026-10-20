"""
P5312. 模域双向循环注意力网络前向计算 - 按公式模拟

题目给定一个由多层双向 RNN、多头自注意力和线性输出层组成的网络，
所有运算都在模 MOD 的整数域中进行。需要严格按照题目给出的顺序，
完成一次前向计算。

输入格式：
- 第 1 行：N、F、R、C、S、A、Q、MOD；
- 接下来 N 行：原始输入序列 X，每行 F 个整数；
- 接下来 S 层双向 RNN 参数，每层依次为：
  U_f、V_f、c_f、U_b、V_b、c_b、p_0、r_{N+1}；
- 接下来 A 个注意力头的参数，每个头依次为 Q_h、K_h、V_h；
- 最后依次为 W_p、c_p、W_y、c_y。

输出格式：
- N 行，每行 C 个整数，表示每个位置的最终输出。

核心思路：
1. 逐层计算双向 RNN：正向从 p_0 开始向右递推，反向从 r_{N+1}
   开始向左递推，再把两个方向的状态拼接起来。
2. 对每个注意力头，计算 q_t、k_s、v_s，先求点积得到 beta_{t,s}，
   再用 beta 对 v_s 做加权求和。
3. 把所有头的输出按编号拼接，经过 W_p 投影并与 e_t 做残差，
   最后经过输出层 W_y 得到 y_t。
4. 每一次向量加法、点积和矩阵乘法后都对 MOD 取模。

时间复杂度：O(S*N*R^2 + A*N^2*Q + N*(AQ*R + R*C))，本题数据范围很小。
空间复杂度：O(N*(F + R) + A*R*Q + ...)，主要为输入参数与中间结果。
"""

import sys

# @sample-start
"""
样例输入 1:
1 1 1 1 1 1 1 5
2
3
4
1
2
1
3
4
0
1
0
0
1
4
3
1 4
2 1
2
1
0

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 1 1 2 1 1 1 5
1
2
1
0
0
1
0
0
0
0
1
0
0
1
1
0
1 1
0 0
1 0
0 1
0 0

样例输出 2:
1 1
2 2
"""
# @sample-end


def solve():
    """读取输入，按题目公式完成一次前向计算。"""
    data = list(map(int, sys.stdin.buffer.read().split()))
    if not data:
        return

    pos = 0
    N, F, R, C, S, A, Q, MOD = data[pos:pos + 8]
    pos += 8

    def read_matrix(rows, cols):
        """从当前位置读取 rows x cols 的整数矩阵。"""
        nonlocal pos
        mat = []
        for _ in range(rows):
            row = data[pos:pos + cols]
            pos += cols
            mat.append([x % MOD for x in row])
        return mat

    def read_vector(size):
        """从当前位置读取一个长度为 size 的整数向量。"""
        return read_matrix(1, size)[0]

    def vec_mat(vec, mat):
        """行向量乘矩阵：返回 vec (len d) 乘 mat (d x cols) 的结果。"""
        cols = len(mat[0])
        return [
            sum(vec[i] * mat[i][j] for i in range(len(vec))) % MOD
            for j in range(cols)
        ]

    # 原始输入序列，共 N 个位置
    a = read_matrix(N, F)

    # 逐层双向 RNN
    for layer in range(S):
        d = F if layer == 0 else 2 * R

        U_f = read_matrix(d, R)
        V_f = read_matrix(R, R)
        c_f = read_vector(R)

        U_b = read_matrix(d, R)
        V_b = read_matrix(R, R)
        c_b = read_vector(R)

        p_prev = read_vector(R)      # p_0
        r_next = read_vector(R)      # r_{N+1}

        # 正向：p_t = a_t U_f + p_{t-1} V_f + c_f
        p = [None] * N
        prev = p_prev
        for t in range(N):
            cur = [
                (sum(a[t][i] * U_f[i][j] for i in range(d))
                 + sum(prev[i] * V_f[i][j] for i in range(R))
                 + c_f[j]) % MOD
                for j in range(R)
            ]
            p[t] = cur
            prev = cur

        # 反向：r_t = a_t U_b + r_{t+1} V_b + c_b
        r = [None] * N
        nxt = r_next
        for t in range(N - 1, -1, -1):
            cur = [
                (sum(a[t][i] * U_b[i][j] for i in range(d))
                 + sum(nxt[i] * V_b[i][j] for i in range(R))
                 + c_b[j]) % MOD
                for j in range(R)
            ]
            r[t] = cur
            nxt = cur

        # 正向状态在前、反向状态在后，作为下一层的输入
        a = [p[t] + r[t] for t in range(N)]

    # 经过全部 RNN 层后，a 就是每个位置的编码 e_t
    e = a

    # 多头自注意力
    head_outputs = []
    for _ in range(A):
        Q_h = read_matrix(2 * R, Q)
        K_h = read_matrix(2 * R, Q)
        V_h = read_matrix(2 * R, Q)

        q = [vec_mat(e[t], Q_h) for t in range(N)]
        k = [vec_mat(e[t], K_h) for t in range(N)]
        v = [vec_mat(e[t], V_h) for t in range(N)]

        # beta[t][s] = q_t · k_s
        beta = [
            [
                sum(q[t][j] * k[s][j] for j in range(Q)) % MOD
                for s in range(N)
            ]
            for t in range(N)
        ]

        # c_t[j] = sum_s beta[t][s] * v_s[j]
        c = [
            [
                sum(beta[t][s] * v[s][j] for s in range(N)) % MOD
                for j in range(Q)
            ]
            for t in range(N)
        ]
        head_outputs.append(c)

    # 按头编号拼接：c_t = [c_t^(0) || c_t^(1) || ...]
    c = [
        [head_outputs[h][t][j] for h in range(A) for j in range(Q)]
        for t in range(N)
    ]

    # 投影 + 残差
    W_p = read_matrix(A * Q, 2 * R)
    c_p = read_vector(2 * R)
    u = [
        [
            (sum(c[t][i] * W_p[i][j] for i in range(A * Q))
             + c_p[j] + e[t][j]) % MOD
            for j in range(2 * R)
        ]
        for t in range(N)
    ]

    # 输出层
    W_y = read_matrix(2 * R, C)
    c_y = read_vector(C)
    y = [
        [
            (sum(u[t][i] * W_y[i][j] for i in range(2 * R)) + c_y[j]) % MOD
            for j in range(C)
        ]
        for t in range(N)
    ]

    for row in y:
        print(*row)


def run_tests():
    """运行嵌入的样例测试。"""
    import io

    test_cases = [
        (
            "1 1 1 1 1 1 1 5\n"
            "2\n3\n4\n1\n2\n1\n3\n4\n0\n1\n0\n0\n1\n4\n3\n1 4\n2 1\n2\n1\n0\n",
            "1",
        ),
        (
            "2 1 1 2 1 1 1 5\n"
            "1\n2\n1\n0\n0\n1\n0\n0\n0\n0\n1\n0\n0\n1\n1\n0\n"
            "1 1\n0 0\n1 0\n0 1\n0 0\n",
            "1 1\n2 2",
        ),
        (
            "1 1 1 1 1 2 1 5\n"
            "2\n3\n4\n1\n2\n1\n3\n4\n0\n1\n0\n0\n1\n4\n3\n0\n"
            "1\n1\n2\n1\n4\n1 0\n0 1\n0 0\n1\n1\n0\n",
            "2",
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
