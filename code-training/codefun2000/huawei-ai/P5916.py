"""
P5916. 轻量化推理引擎中的 Masked Fused RMSNorm 算子 - 逐元素模拟

题目把推理引擎里的五个小算子融合成一个：残差连接、RMSNorm、逐元素缩放、
逐元素偏置、Padding Mask。给定 m 个样本，对每个样本：
1. 残差融合：h_i = x_i + alpha * r_i；
2. 只在前 l 个「有效位置」上统计 energy = sum(h_i^2)，
   RMS = sqrt(energy / max(l, 1) + eps)；
3. 有效位置输出 y_i = gamma_i * h_i / RMS + beta_i，
   无效位置（padding）一律输出 0；
4. 同时输出该样本的 RMS 与 energy。

输入格式：
- 第 1 行：m、n、eps（样本数、向量最大长度、数值稳定项）；
- 第 2 行：n 个浮点数，缩放向量 gamma；
- 第 3 行：n 个浮点数，偏置向量 beta；
- 随后 m 行，每行 1 + 1 + n + n 个数：l、alpha、x_1..x_n、r_1..r_n。

输出格式：
- 每行 n 个结果、一个 "|"、RMS、一个 "|"、energy；
- 所有浮点数保留两位小数，且不输出 "-0.00"。

核心思路：
1. 每个样本的计算是独立的，逐个样本处理即可，不需要保存全部样本；
2. 残差融合、energy 累加可以在同一次遍历里完成，避免重复计算 h；
3. energy 与 RMS 只统计前 l 个位置，padding 位置既不进 energy，
   也不参与归一化输出；
4. 分母用 d = max(l, 1)，这样 l = 0 时仍然是合法表达式 sqrt(eps)；
5. 格式化时把绝对值小于 0.005 的数统一写成 0.00，避免浮点误差造成的 "-0.00"。

时间复杂度：O(m * n)
空间复杂度：O(n)，只保存当前样本的 x、r、h 与输出
"""

# https://codefun2000.com/p/P5916
import math
import sys

# @sample-start
"""
样例输入 1:
2 3 0.5
1.0 1.0 1.0
0.0 2.0 -1.0
3 1.0 2.0 1.0 2.0 1.0 1.0 0.0
2 1.0 0.0 0.0 9.0 0.0 0.0 8.0

样例输出 1:
1.21 2.81 -0.19 | 2.48 | 17.00
0.00 2.00 0.00 | 0.71 | 0.00
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 3 0.000004
2.0 1.0 0.5
1.0 0.0 -1.0
3 0.0 2.0 2.0 4.0 1.0 3.0 3.0
0 1.0 6.0 6.0 6.0 2.0 2.0 2.0

样例输出 2:
2.41 0.71 -0.29 | 2.83 | 24.00
0.00 0.00 0.00 | 0.00 | 0.00
"""
# @sample-end


def format_number(value):
    """保留两位小数，并保证不会输出 "-0.00"。

    浮点运算会留下 -1e-17 这种「数学上是 0、符号却是负」的残渣，
    直接格式化就变成 "-0.00"。题面要求绝对值小于 0.005 的数一律写 0.00，
    所以这里先做一次就近归零，再格式化。
    """
    if abs(value) < 0.005:
        return "0.00"
    text = f"{value:.2f}"
    # 双保险：极端情况下舍入后仍可能拼出 "-0.00"
    return "0.00" if text == "-0.00" else text


def solve():
    """按公式逐个样本计算 Masked Fused RMSNorm 并输出。"""
    # 一次性读入全部 token：ACM 模式下比逐行 input() 快，
    # 也不会被行末空格、空行干扰。
    tokens = sys.stdin.buffer.read().split()
    if not tokens:
        return

    pos = 0
    m = int(tokens[pos])
    n = int(tokens[pos + 1])
    eps = float(tokens[pos + 2])
    pos += 3

    # gamma、beta 都是「按位置」取的，与样本编号无关，
    # 所以只需要在学习任何样本之前读入一次。
    gamma = [float(tokens[pos + i]) for i in range(n)]
    pos += n
    beta = [float(tokens[pos + i]) for i in range(n)]
    pos += n

    lines = []

    for _ in range(m):
        # 每个样本的格式：l、alpha、x 向量、r 向量。
        # 约束里 0 <= l <= n，这里再夹一次，保证后面切片安全。
        length = int(tokens[pos])
        alpha = float(tokens[pos + 1])
        pos += 2
        if length < 0:
            length = 0
        elif length > n:
            length = n

        x = [float(tokens[pos + i]) for i in range(n)]
        pos += n
        r = [float(tokens[pos + i]) for i in range(n)]
        pos += n

        # 残差融合与 energy 统计放在同一轮里完成：
        # energy 只累加 i < length 的有效位置，padding 部分不参与。
        h = [0.0] * n
        energy = 0.0
        for i in range(length):
            h[i] = x[i] + alpha * r[i]
            energy += h[i] * h[i]
        # padding 位置的 h 也要算出来，虽然它不会进入输出，
        # 但保留完整的 h 能让「哪些位置被 mask」这件事在代码里更直观。
        for i in range(length, n):
            h[i] = x[i] + alpha * r[i]

        # 分母取 max(l, 1)：l = 0 时没有有效元素，但 RMS 仍要按
        # sqrt(0 / 1 + eps) = sqrt(eps) 输出，不能除以 0。
        divisor = length if length > 0 else 1
        rms = math.sqrt(energy / divisor + eps)

        values = []
        for i in range(n):
            if i < length:
                if rms == 0.0:
                    # 约束允许 eps = 0。此时若有效部分全为 0，RMS 恰好为 0，
                    # 归一化项 h_i / RMS 是 0 / 0。有效位置的 h_i 全为 0，
                    # 按极限处理成 0，输出退化为 beta_i，避免 ZeroDivisionError。
                    values.append(beta[i])
                else:
                    values.append(gamma[i] * h[i] / rms + beta[i])
            else:
                # padding 位置直接输出 0，注意不是 beta_i
                values.append(0.0)

        parts = [format_number(value) for value in values]
        parts.append("|")
        parts.append(format_number(rms))
        parts.append("|")
        parts.append(format_number(energy))
        lines.append(" ".join(parts))

    sys.stdout.write("\n".join(lines) + "\n")


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：常规样本 + 部分 padding
        (
            "2 3 0.5\n"
            "1.0 1.0 1.0\n"
            "0.0 2.0 -1.0\n"
            "3 1.0 2.0 1.0 2.0 1.0 1.0 0.0\n"
            "2 1.0 0.0 0.0 9.0 0.0 0.0 8.0\n",
            "1.21 2.81 -0.19 | 2.48 | 17.00\n"
            "0.00 2.00 0.00 | 0.71 | 0.00",
        ),
        # 官方样例 2：alpha = 0 的样本 + l = 0 的样本
        (
            "2 3 0.000004\n"
            "2.0 1.0 0.5\n"
            "1.0 0.0 -1.0\n"
            "3 0.0 2.0 2.0 4.0 1.0 3.0 3.0\n"
            "0 1.0 6.0 6.0 6.0 2.0 2.0 2.0\n",
            "2.41 0.71 -0.29 | 2.83 | 24.00\n"
            "0.00 0.00 0.00 | 0.00 | 0.00",
        ),
        # l = n：所有位置都是有效位置，没有任何 padding
        (
            "1 2 1.0\n"
            "1.0 2.0\n"
            "0.0 0.0\n"
            "2 0.0 3.0 4.0 0.0 0.0\n",
            "0.82 2.18 | 3.67 | 25.00",
        ),
        # eps = 0 且有效部分全为 0：RMS = 0，输出退化为 beta，不能崩溃
        (
            "1 2 0.0\n"
            "1.0 1.0\n"
            "3.0 4.0\n"
            "2 0.0 0.0 0.0 0.0 0.0\n",
            "3.00 4.00 | 0.00 | 0.00",
        ),
        # 结果极小且为负：不能输出 -0.00
        (
            "1 1 1.0\n"
            "1.0\n"
            "0.0\n"
            "1 0.0 -0.000001 0.0\n",
            "0.00 | 1.00 | 0.00",
        ),
        # l = 0 且 eps = 0：RMS 为 0，所有位置都是 padding
        (
            "1 3 0.0\n"
            "1.0 1.0 1.0\n"
            "5.0 6.0 7.0\n"
            "0 1.0 1.0 2.0 3.0 4.0 5.0 6.0\n",
            "0.00 0.00 0.00 | 0.00 | 0.00",
        ),
        # 负 alpha：残差系数为负时 h 可以变小甚至变号
        (
            "1 2 0.0\n"
            "1.0 1.0\n"
            "0.0 0.0\n"
            "2 -1.0 1.0 3.0 1.0 3.0\n",
            "0.00 0.00 | 0.00 | 0.00",
        ),
    ]

    passed = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读取，所以要提供带 buffer 的文本流，
        # 普通的 io.StringIO 没有 .buffer 属性。
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        ok = output == expected
        passed += ok
        status = "✓" if ok else "✗"
        print(f"用例 {i}: {status} (期望={expected!r}, 实际={output!r})")

    print(f"\n通过 {passed}/{len(test_cases)}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
