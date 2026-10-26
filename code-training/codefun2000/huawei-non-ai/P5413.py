"""
P5413. 直线基站部署中的邻近干扰总和 - 单调栈求左右最近严格更大元素

题面要点：
- 每个位置 p 有场强 a[p]。左侧观察区间是从 p-1 向左最多 t 座基站，
  右侧是从 p+1 向右最多 t 座；观察只能落在数组边界内。
- 某侧干扰：从近到远找第一个场强「严格大于」a[p] 的基站，找到（下标 L/R）
 则该侧干扰为 a[p]*(p-L) 或 a[p]*(R-p)，找不到为 0。
- 输出所有基站左右干扰之和，对 1e9+7 取模。

输入格式：
- 第 1 行：数组 a 的全部元素（1 <= m <= 1e5）；
- 第 2 行：整数 t（1 <= t <= m）。

输出格式：一个整数，总和 mod 1e9+7。

核心思路（为什么是单调栈）：
1. 窗口有一个不显眼的机关：要看的是「从近到远第一个」更大值。设某侧
   最近严格更大元素的距离是 dist，那么 dist > t 时窗口内没有任何更大值
   （更远的更大值更远），该侧必为 0；dist <= t 时干扰照算。于是窗口
   只是对「最近严格更大元素的距离」做一个截断，答案完全由
   left[i] / right[i]——左右最近严格更大元素的距离——决定。
2. 最近严格更大元素正是单调栈的经典产出：从五万长度的数组里对每个下标
   O(m) 总时间求出，逐对扫描的 O(m*t) 会退化到 1e10，挂死。
3. 弹栈条件用「<=」保证留下的栈顶是严格大于，相等值不会冒充更大值。

时间复杂度：O(m)（每个下标至多进栈、出栈一次）
空间复杂度：O(m)
"""

# https://codefun2000.com/p/P5413
import sys

MOD = 10**9 + 7

# @sample-start
"""
样例输入 1:
3 1 4 1 5
2

样例输出 1:
18
"""
# @sample-end

# @sample-start
"""
样例输入 2:
10 20 15 30
1

样例输出 2:
40
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1000000000 500000000 1 1000000000
3

样例输出 3:
499999995
"""
# @sample-end

# @sample-start
"""
样例输入 4:
7
1

样例输出 4:
0
"""
# @sample-end


def nearest_greater_distances(a):
    """返回 (left, right)：每个下标到左/右侧最近严格更大元素的距离，没有则为 0。"""
    n = len(a)
    left = [0] * n
    right = [0] * n

    # 从左到右：栈内下标的场强严格递减；弹出所有 <= 当前值的元素后，
    # 栈顶就是当前元素左侧第一个严格更大的位置。
    stack = []
    for i in range(n):
        while stack and a[stack[-1]] <= a[i]:
            stack.pop()
        left[i] = i - stack[-1] if stack else 0
        stack.append(i)

    # 从右到左做对称的一遍，得到右侧最近严格更大的距离。
    stack = []
    for i in range(n - 1, -1, -1):
        while stack and a[stack[-1]] <= a[i]:
            stack.pop()
        right[i] = stack[-1] - i if stack else 0
        stack.append(i)

    return left, right


def solve():
    """读入数组与 t，输出干扰总和 mod 1e9+7。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    nums = list(map(int, data))
    # t 在第二行，是最后一个整数；前面全部是数组（m >= 1）。
    a = nums[:-1]
    t = nums[-1]

    left, right = nearest_greater_distances(a)

    total = 0
    for i, v in enumerate(a):
        # dist 为 0 表示该侧不存在更大值；dist > t 时窗口内没有更大值。
        if 0 < left[i] <= t:
            total = (total + v * left[i]) % MOD
        if 0 < right[i] <= t:
            total = (total + v * right[i]) % MOD
    print(total)


def run_tests():
    """运行嵌入的官方样例与自加用例，方便本地自测。"""
    import io
    import random

    def run(stdin_text):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 快速读取，这里提供带 buffer 的文本流。
        sys.stdin = io.TextIOWrapper(io.BytesIO(stdin_text.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    test_cases = [
        # 官方样例 1
        ("3 1 4 1 5\n2\n", "18"),
        # 官方样例 2：t=1，下标 1 右侧距离 2 的 30 必须被窗口挡住
        ("10 20 15 30\n1\n", "40"),
        # 官方样例 3：1e9 量级乘积触发取模回绕
        ("1000000000 500000000 1 1000000000\n3\n", "499999995"),
        # 官方样例 4：单元素，两侧都无观察对象
        ("7\n1\n", "0"),
        # 全相等：没有「严格更大」，全部为 0（相等不算）
        ("5 5 5\n1\n", "0"),
        # 严格性：下标 1 左侧相邻是 2 不算更大，必须越过它看到下标 0 的 2
        # 也不算，所以只有下标 0/1 借右侧 9 计分
        ("2 2 9\n3\n", "6"),
        # 窗口截断：t=1 时下标 0 到 10 的距离 2 超窗不计
        ("5 1 10\n1\n", "2"),
        # 同一数组放开窗口：距离 2 的贡献回来了
        ("5 1 10\n3\n", "12"),
        # 取模回绕：1999999998 + 2 = 2000000000，减去 1e9+7 剩 999999993
        ("999999999 1 1000000000\n3\n", "999999993"),
    ]

    failures = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run(inp)
        ok = output == expected
        if not ok:
            failures += 1
        print(f"样例 {i}: 期望={expected}, 实际={output} {'✓' if ok else '✗'}")

    # 随机对照：与 O(m*t) 的逐格扫描暴力比对 200 组，钉住单调栈的边界。
    rng = random.Random(20260909)
    rand_bad = 0
    for _ in range(200):
        m = rng.randint(1, 12)
        a = [rng.randint(1, 50) for _ in range(m)]
        t = rng.randint(1, m)
        expected = 0
        for i in range(m):
            for side in (-1, 1):
                for k in range(1, t + 1):
                    j = i + side * k
                    if not 0 <= j < m:
                        break
                    if a[j] > a[i]:
                        expected = (expected + a[i] * k) % MOD
                        break
        output = run(" ".join(map(str, a)) + f"\n{t}\n")
        if output != str(expected):
            rand_bad += 1
            print(f"随机对照失败: a={a} t={t} 期望={expected} 实际={output}")
    if rand_bad == 0:
        print("随机对照 200 组: 全部一致 ✓")
    failures += rand_bad

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
