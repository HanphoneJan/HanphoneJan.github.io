"""
P5454. 雷达等距计数 - 枚举原点 + 平方距离分桶计数

m 座两两不同的整点雷达站，统计「等心探测组」：有序三元 (p,q,r)，
p 作探测原点，q、r 是两座互不相同的站，且 p 到 q 与 p 到 r 的
欧氏距离恰好相等。(p,q,r) 与 (p,r,q) 各计一次。

输入格式：
- 第 1 行：站点数 m（3 <= m <= 2e3）；
- 随后 m 行：每行两个整数 u_p、v_p（|坐标| <= 1e5），位置两两不重合。

输出格式：
- 一个整数：等心探测组的总次数。

核心思路：
1. 枚举每个原点 p，把其余 m-1 座站到 p 的距离分桶。比较用平方距离
   dx*dx + dy*dy：两条线段长度相等当且仅当平方距离相等，
   既避开开方的浮点误差，也省一次 sqrt。
2. 到 p 距离相同的站有 c 座时，从中选有序对 (q,r) 共 c*(c-1) 种
   ——是排列数不是组合数，(p,q,r) 与 (p,r,q) 都要计入。
3. 站点两两不同，任一站到原点的距离恒大于 0，桶键不会是 0，
   选出的 q、r 天然互不相同。所有原点的桶贡献累加即答案。

时间复杂度：O(m^2)（m=2000 时约 4e6 次平方距离计算）
空间复杂度：O(m)（每次只保留当前原点的桶）
"""

# https://codefun2000.com/p/P5454
import sys
from collections import Counter

# @sample-start
"""
样例输入 1:
4
0 0
0 3
3 0
3 3

样例输出 1:
8
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3
0 0
4 0
2 3

样例输出 2:
2
"""
# @sample-end


def solve():
    """读入站点坐标，按原点分桶统计等腰三元组。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    m = int(data[0])
    nums = list(map(int, data[1 : 2 * m + 1]))
    xs = nums[0::2]
    ys = nums[1::2]

    total = 0
    for i in range(m):
        xi = xs[i]
        yi = ys[i]
        # 其余 m-1 座站到原点 i 的平方距离，直接进 Counter 分桶
        bucket = Counter(
            (xs[j] - xi) ** 2 + (ys[j] - yi) ** 2 for j in range(m) if j != i
        )
        # 同一距离上 c 座站贡献 c 个「等距点选 q」乘 (c-1) 个「选 r」
        for c in bucket.values():
            total += c * (c - 1)
    print(total)


def run_tests():
    """运行官方样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：正方形四顶点，每个原点 2 座等距站
        (
            "4\n0 0\n0 3\n3 0\n3 3\n",
            "8",
        ),
        # 官方样例 2：等腰三角形，只有顶点作原点时成立
        (
            "3\n0 0\n4 0\n2 3\n",
            "2",
        ),
        # 无任何等对：三点两两距离互不相等，应输出 0
        (
            "3\n0 0\n1 0\n0 3\n",
            "0",
        ),
        # 一个原点带 4 座等距站：桶贡献 4*3=12，另 4 个原点各 2*1=2
        (
            "5\n0 0\n2 0\n0 2\n-2 0\n0 -2\n",
            "20",
        ),
        # 三点共线且等间距：中点作原点时两侧距离相等
        (
            "3\n0 0\n1 0\n2 0\n",
            "2",
        ),
        # 大坐标（1e5）：平方距离达 1e10 量级，检验无精度/溢出问题
        (
            "3\n-100000 0\n100000 0\n0 0\n",
            "2",
        ),
        # 汇合型：两站到同一个中间站等距，与方向无关
        (
            "4\n0 0\n4 0\n2 2\n2 -2\n",
            "8",
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
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
