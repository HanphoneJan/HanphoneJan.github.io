"""
P5347. 时序数据修复与加权特征评分 - 四阶段按公式模拟

按时间顺序给出 n 条记录 (t_i, v_i, q_i)，其中 q_i 是质量标记：
0 表示有效、1 表示可疑、2 表示无效。需要依次完成四步处理：

阶段一（无效数据修复）：对每个 q_i=2 的位置，找它左边和右边最近的 q=0 记录，
两侧都有就按时间戳线性插值，只有一侧就取那一侧的值，都没有就保留原值。
阶段二（局部异常处理）：半径 h=(w-1)/2，窗口 [max(1,i-h), min(n,i+h)]，
用阶段一的序列 a 算窗口均值 mu 与总体标准差 sigma，若 |a_i-mu| > k*sigma
则把 b_i 换成 mu，否则 b_i=a_i。所有窗口都基于 a，本阶段互不影响。
阶段三（z-score 标准化）：用 b 的全局均值与总体标准差做标准化；
标准差为 0 时最终分数直接为 0。
阶段四（加权评分）：按质量标记给权重 p（1 / 0.5 / 0.25），
S = sum_i p_i|b_i| / sum_j p_j|b_j| * |z_i|，输出 round(S*100)。

输入格式：
- 第 1 行：三个整数 n、w、k（w 为奇数）；
- 接下来 n 行：每行三个整数 t_i、v_i、q_i。

输出格式：
- 一个整数，即 S 乘以 100 后四舍五入的结果。

核心思路：
1. 阶段一左右各扫一遍，预处理出“每个位置左边/右边最近的 q=0 下标”，
   这样每个无效点 O(1) 就能拿到插值端点。
2. 阶段二的窗口均值与方差用前缀和 O(1) 求出，总复杂度从 O(nw) 降到 O(n)。
   计算方差时先把序列整体平移 a_0，避免“数值很大但差异很小”时
   平方和相减丢失有效数字。
3. 阶段三、四都是对整条序列的一次求和，用 math.fsum 降低累加误差。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P5347
import math
import sys

# @sample-start
"""
样例输入 1:
1 1 1
1 5 0

样例输出 1:
0
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 1 1
1 1 0
2 2 1
3 3 2

样例输出 2:
102
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3 3 1
1 0 0
2 0 0
3 1 0

样例输出 3:
141
"""
# @sample-end


def solve():
    """读取记录，依次执行四个阶段，输出四舍五入后的特征分数。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    window = int(next(it))
    k = float(next(it))

    times = [0] * n
    values = [0] * n
    quality = [0] * n
    for i in range(n):
        times[i] = int(next(it))
        values[i] = int(next(it))
        quality[i] = int(next(it))

    # ---------------- 阶段一：无效数据修复 ----------------
    # 先预处理“左边最近的 q=0”和“右边最近的 q=0”。
    # 一次扫描就能得到所有位置的答案，避免每个无效点都往回找一遍。
    left_valid = [-1] * n
    last_valid = -1
    for i in range(n):
        left_valid[i] = last_valid  # 注意：先记录再看自己，保证是“严格左侧”
        if quality[i] == 0:
            last_valid = i

    right_valid = [-1] * n
    next_valid = -1
    for i in range(n - 1, -1, -1):
        right_valid[i] = next_valid
        if quality[i] == 0:
            next_valid = i

    a = [0.0] * n
    for i in range(n):
        if quality[i] != 2:
            # 有效数据和可疑数据都原样保留
            a[i] = float(values[i])
            continue

        left = left_valid[i]
        right = right_valid[i]
        if left >= 0 and right >= 0:
            # 两端都有：按时间戳线性插值。t_r > t_l 由输入保证，不会除零。
            v_left = float(values[left])
            v_right = float(values[right])
            a[i] = v_left + (v_right - v_left) * (times[i] - times[left]) / (
                times[right] - times[left]
            )
        elif left >= 0:
            a[i] = float(values[left])
        elif right >= 0:
            a[i] = float(values[right])
        else:
            a[i] = float(values[i])

    # ---------------- 阶段二：局部异常处理 ----------------
    half = (window - 1) // 2

    # 先把整条序列平移一个参考值，再算前缀和。
    # 原因：前缀和里存的是平方，若数值本身接近 1e9 而彼此只差一点点，
    # 直接存平方会把有效数字挤掉，相减得到的方差就不可信了。
    reference = a[0]
    diff = [x - reference for x in a]
    prefix = [0.0] * (n + 1)
    prefix_square = [0.0] * (n + 1)
    for i in range(n):
        d = diff[i]
        prefix[i + 1] = prefix[i] + d
        prefix_square[i + 1] = prefix_square[i] + d * d

    b = [0.0] * n
    for i in range(n):
        # 边界处不补值：窗口下标直接截断到 [0, n-1]（题面是 1 起，这里换成 0 起）
        low = i - half
        if low < 0:
            low = 0
        high = i + half
        if high > n - 1:
            high = n - 1
        count = high - low + 1

        # 前缀和相减得到窗口内 sum(d) 与 sum(d^2)
        sum_d = prefix[high + 1] - prefix[low]
        sum_square = prefix_square[high + 1] - prefix_square[low]

        mean_d = sum_d / count
        # 总体方差（除以窗口大小，不是除以 count-1）
        variance = sum_square / count - mean_d * mean_d
        if variance < 0.0:
            # 浮点相减可能给出极小的负数，夹回 0 以免 sqrt 报错
            variance = 0.0
        sigma = math.sqrt(variance)

        mean = reference + mean_d
        # 严格大于才替换：等于阈值时保持原值
        if abs(a[i] - mean) > k * sigma:
            b[i] = mean
        else:
            b[i] = a[i]

    # ---------------- 阶段三：z-score 标准化 ----------------
    # 全体相等 <=> 全局标准差为 0。先用最大最小判断一遍，
    # 比“算出来的方差是否等于 0”更稳，也不会有 1e-17 抖动。
    if max(b) == min(b):
        print(0)
        return

    mean = math.fsum(b) / n
    variance = math.fsum((x - mean) * (x - mean) for x in b) / n
    std = math.sqrt(variance)

    # ---------------- 阶段四：加权评分 ----------------
    weights = []
    for q in quality:
        if q == 0:
            weights.append(1.0)
        elif q == 1:
            weights.append(0.5)
        else:
            weights.append(0.25)

    # 分母 = sum p_i * |b_i|，为 0 时题目规定最终分数直接为 0
    denominator = math.fsum(p * abs(x) for p, x in zip(weights, b))
    if denominator == 0.0:
        print(0)
        return

    # 每个位置的贡献 = (p_i|b_i| / 分母) * |z_i|，其中 |z_i| = |b_i - mean| / std
    score = math.fsum(
        (p * abs(x) / denominator) * (abs(x - mean) / std)
        for p, x in zip(weights, b)
    )

    # 题目要求四舍五入。Python 的 round() 是“四舍六入五成双”，
    # 所以这里用 floor(x + 0.5) 实现真正的四舍五入；
    # 末尾加一个 1e-9 是为了让“理论值恰好是 x.5”的情况不被浮点误差压到下半区。
    print(int(math.floor(score * 100 + 0.5 + 1e-9)))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：只有一条记录，全局标准差为 0
        (
            "1 1 1\n1 5 0\n",
            "0",
        ),
        # 官方样例 2：右侧没有有效数据，直接取左侧的值
        (
            "3 1 1\n1 1 0\n2 2 1\n3 3 2\n",
            "102",
        ),
        # 官方样例 3：窗口内之外的点被判为异常，被均值替换
        (
            "3 3 1\n1 0 0\n2 0 0\n3 1 0\n",
            "141",
        ),
        # 两端都有有效数据：按时间戳线性插值
        (
            "4 3 1\n1 10 0\n2 100 1\n3 200 2\n4 40 0\n",
            "82",
        ),
        # 只有右侧有效：直接取右侧的值（第 1 条的质量权重是 0.25）
        (
            "3 1 1\n1 100 2\n2 5 0\n3 7 0\n",
            "108",
        ),
        # 所有值相同：全局标准差为 0，直接输出 0
        (
            "2 1 1\n1 5 0\n2 5 0\n",
            "0",
        ),
        # 所有值都是 0：分母为 0，直接输出 0
        (
            "2 1 1\n1 0 0\n2 0 1\n",
            "0",
        ),
        # k 很大时阈值很宽，窗口内不会有任何点被替换
        (
            "3 3 10\n1 1 0\n2 1 0\n3 100 1\n",
            "139",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读数据，所以要给带 buffer 的文本流
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
