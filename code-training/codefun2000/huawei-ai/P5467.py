"""
P5467. 全局位与窗口注意力 - 按定义模拟

给定三个 L x D 的整数矩阵 Q、K、V，以及 G 个全局位置集合 P。
对每个位置 i 先确定可参与注意力的下标集合 C_i：
- 若 i 是全局位置（i 属于 P），C_i 是全部位置 {0..L-1}；
- 否则 C_i = P 并上窗口 {j | |i-j| <= W}，同一位置只算一次。
然后计算 score(i,j) = Q[i] 与 K[j] 的点积，丢掉非正分数，按分数从大到小取至多 T 个
（分数相同取下标小的）。最后用这些分数对 V 的对应行加权求和得到 O[i]；
若一个候选都没有，O[i] 整行为 0。

输入格式：
- 第 1 行：L、D、G、W、T；
- 若 G > 0，接下来一行 G 个互不相同的整数，表示全局位置；
- 随后 L 行，每行 D 个整数，为 Q；
- 随后 L 行，每行 D 个整数，为 K；
- 随后 L 行，每行 D 个整数，为 V。

输出格式：
- L 行，每行 D 个整数，同一行内用空格分隔。

核心思路：
1. 逐行处理：先按定义拼出候选下标集合（窗口 + 全局位置，注意去重）。
2. 每个候选算一次点积，只保留正分。
3. 按「分数降序、下标升序」排序，截取前 T 个。
4. 用分数加权累加 V 的对应行，得到输出行。
   全局位置最多 32 个、窗口最多 2W+1 个，所以每行的候选数很小，
   直接按定义模拟即可，不需要建完整的 L x L 注意力矩阵。

时间复杂度：O(L * D * (2W + 1 + G))，最坏约 1e4 * 64 * 289 次乘加。
空间复杂度：O(L * D)，保存 Q、K、V 三个矩阵。
"""

import sys

try:
    # Python 3.12 起标准库提供了 C 实现的点积，比手写循环快将近一倍
    from math import sumprod as dot
except ImportError:                     # 旧版本 Python 的等价写法
    from operator import mul

    def dot(a, b):
        """返回两个等长向量的点积。"""
        return sum(map(mul, a, b))

# @sample-start
"""
样例输入 1:
5 2 2 1 2
0 3
1 0
1 0
2 0
0 1
1 1
2 0
1 0
3 0
0 2
-1 1
1 1
2 2
3 3
4 4
5 5

样例输出 1:
11 11
11 11
22 22
13 13
10 10
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 1 0 0 1
1
2
-1
-2
3
1
10
20
30

样例输出 2:
0
120
0
"""
# @sample-end


def solve():
    """读取输入并按定义计算 L x D 的输出矩阵。"""
    tokens = sys.stdin.buffer.read().split()
    if not tokens:
        return

    pos = 0
    L = int(tokens[pos])
    D = int(tokens[pos + 1])
    G = int(tokens[pos + 2])
    W = int(tokens[pos + 3])
    T = int(tokens[pos + 4])
    pos += 5

    # is_global 用布尔数组存，判断「i 是不是全局位置」是 O(1)；
    # global_pos 保存原始下标列表，非全局行要把它们补进候选集合。
    is_global = bytearray(L)
    global_pos = []
    for _ in range(G):
        p = int(tokens[pos])
        pos += 1
        is_global[p] = 1
        global_pos.append(p)

    def read_matrix(rows):
        """从 token 流中读出 rows 行、每行 D 个整数的矩阵。"""
        nonlocal pos
        mat = []
        for _ in range(rows):
            mat.append([int(x) for x in tokens[pos:pos + D]])
            pos += D
        return mat

    Q = read_matrix(L)
    K = read_matrix(L)
    V = read_matrix(L)
    # 三个矩阵已经转换成整数，token 列表不再需要，提前释放可以省下大量内存。
    del tokens

    output_lines = []
    for i in range(L):
        qi = Q[i]
        candidates = []          # 只放正分候选，元素为 (分数, 下标)

        if is_global[i]:
            # 全局位置的感受野是整条序列
            for j in range(L):
                score = dot(qi, K[j])
                if score > 0:
                    candidates.append((score, j))
        else:
            # 窗口在序列两端会被截断，而不是补零
            lo = i - W
            if lo < 0:
                lo = 0
            hi = i + W + 1
            if hi > L:
                hi = L

            for j in range(lo, hi):
                score = dot(qi, K[j])
                if score > 0:
                    candidates.append((score, j))

            # 全局位置可能落在窗口内，那它已经在上面被算过一次，
            # 这里只补窗口外的那些，避免同一位置被重复计入。
            for j in global_pos:
                if j < lo or j >= hi:
                    score = dot(qi, K[j])
                    if score > 0:
                        candidates.append((score, j))

        if not candidates:
            # 没有正分候选时整行为 0，这是题目明确规定的
            output_lines.append(" ".join(["0"] * D))
            continue

        if len(candidates) > T:
            # 分数降序、分数相同时下标升序：升序排序键 (-score, j) 正好表达这个顺序
            candidates.sort(key=lambda pair: (-pair[0], pair[1]))
            candidates = candidates[:T]

        row = [0] * D
        for score, j in candidates:
            vj = V[j]
            # O[i][x] += score(i,j) * V[j][x]
            for x in range(D):
                row[x] += score * vj[x]

        output_lines.append(" ".join(map(str, row)))

    sys.stdout.write("\n".join(output_lines))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：含全局位置、窗口、并列分数
        (
            "5 2 2 1 2\n"
            "0 3\n"
            "1 0\n"
            "1 0\n"
            "2 0\n"
            "0 1\n"
            "1 1\n"
            "2 0\n"
            "1 0\n"
            "3 0\n"
            "0 2\n"
            "-1 1\n"
            "1 1\n"
            "2 2\n"
            "3 3\n"
            "4 4\n"
            "5 5\n",
            "11 11\n11 11\n22 22\n13 13\n10 10",
        ),
        # 官方样例 2：G=0 没有全局位置行，W=0 只看自己，非正分数被丢掉
        (
            "3 1 0 0 1\n"
            "1\n"
            "2\n"
            "-1\n"
            "-2\n"
            "3\n"
            "1\n"
            "10\n"
            "20\n"
            "30\n",
            "0\n120\n0",
        ),
        # 只有一个位置，正分数：1 * 5 * 6 * 7 = 210
        (
            "1 1 0 0 1\n"
            "5\n"
            "6\n"
            "7\n",
            "210",
        ),
        # 分数恰好为 0 不算正分，输出 0
        (
            "1 1 0 0 1\n"
            "0\n"
            "5\n"
            "7\n",
            "0",
        ),
        # 所有分数都是 1，并列时永远取下标最小的 j=0
        (
            "3 1 0 2 1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "10\n"
            "20\n"
            "30\n",
            "10\n10\n10",
        ),
        # T=1 时只保留窗口内最大分数的位置
        (
            "3 1 0 1 1\n"
            "1\n"
            "2\n"
            "3\n"
            "1\n"
            "2\n"
            "3\n"
            "1\n"
            "2\n"
            "3\n",
            "4\n18\n27",
        ),
        # W=0 时非全局位置只加自己的分，外加全局位置 0
        (
            "4 1 1 0 2\n"
            "0\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "2\n"
            "3\n"
            "4\n",
            "3\n3\n4\n5",
        ),
        # 全局位置落在窗口内时只算一次（去重）
        (
            "4 1 1 1 4\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "1\n"
            "2\n"
            "3\n"
            "4\n",
            "3\n10\n9\n9",
        ),
        # 二维向量、两个候选都保留：1*[1,2] + 1*[3,4] = [4,6]
        (
            "2 2 0 1 2\n"
            "1 1\n"
            "2 2\n"
            "1 0\n"
            "0 1\n"
            "1 2\n"
            "3 4\n",
            "4 6\n8 12",
        ),
        # 全部为非正分数：D=2 的整行都要输出 0
        (
            "2 2 0 1 2\n"
            "-1 0\n"
            "-2 0\n"
            "1 0\n"
            "2 0\n"
            "1 2\n"
            "3 4\n",
            "0 0\n0 0",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 使用 sys.stdin.buffer 做快速读取，所以这里要提供带 buffer
        # 的文本流，而不是普通的 io.StringIO。
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
