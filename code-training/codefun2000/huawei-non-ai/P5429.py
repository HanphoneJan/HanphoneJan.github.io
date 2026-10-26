"""
P5429. 面试官无冲突组题 - 按编号递增的回溯计数

题面要点：
- m 个模块编号 1..m（互不重复），各有难度系数。选出 t 个构成方案：
  编号严格递增；相邻编号差的绝对值 <= g 即为「知识冲突」，禁止；
  t 个难度系数之和必须落在闭区间 [lo, hi]。
- 输出：第一行方案总数；若总数为正，再按字典序输出至多前 3 份方案。

输入格式：
- 第 1 行：m t g lo hi（1 <= m <= 20，1 <= t <= m，0 <= g <= m，
  1 <= lo <= hi <= 1000）；
- 第 2 行：m 个难度系数（1 <= 难度 <= 100），第 k 个对应编号 k。

输出格式：方案个数 +（存在时）至多 3 行方案，编号空格分隔。

核心思路（为什么是按编号递增的回溯）：
1. 编号互不相同且必须递增，方案本质是无序组合按升序写出，
   组合数上界 C(20,10) ≈ 1.8e5，直接搜。关键在于枚举顺序：
   从左到右只允许选比当前更大的编号，DFS 先序正是字典序——数一遍、
   按顺序记前 3 份，无需再排序。
2. 「相邻编号差 > g」不用在选中后再检查：刚选了 c 时，下一个候选
   直接从 c + g + 1 起扫，编号差天然 > g。g = 0 时下一候选从 c+1 起，
   与「只要求递增」一致。t = 1 时根本没有相邻对，不经过这一步。
3. 判定标准在叶子：凑满 t 个时检查难度和是否落在 [lo, hi]，只对
   合法者计数与记录。剪枝只剩一条：剩余编号不足以凑满 need 个。

时间复杂度：O(方案搜索树上界 C(m, t) * t)~ 2^m 级别，m=20 可过
空间复杂度：O(t)（递归栈与当前路径）
"""

# https://codefun2000.com/p/P5429
import sys

# @sample-start
"""
样例输入 1:
6 3 1 8 16
4 2 5 3 6 1

样例输出 1:
3
1 3 5
1 3 6
1 4 6
"""
# @sample-end


def solve():
    """枚举全部合法方案，输出总数与前 3 份字典序方案。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        print(0)
        return
    vals = list(map(int, data))
    m, t, g, lo, hi = vals[:5]
    diff = vals[5 : 5 + m]  # diff[k-1] 是编号 k 的难度系数

    count = 0
    schemes = []
    path = []

    def dfs(start, need, total):
        """从编号 start 起还需选 need 个，当前难度和 total。"""
        nonlocal count
        if need == 0:
            if lo <= total <= hi:
                count += 1
                if len(schemes) < 3:
                    schemes.append(path[:])
            return
        # 剪枝：从 start 出发剩余的编号数不够凑满 need 个。
        if m - start + 1 < need:
            return
        for c in range(start, m + 1):
            path.append(c)
            # 相邻编号差 > g：下一候选直接从 c+g+1 开始。
            dfs(c + g + 1, need - 1, total + diff[c - 1])
            path.pop()

    dfs(1, t, 0)

    print(count)
    for scheme in schemes:
        print(" ".join(map(str, scheme)))


def run_tests():
    """运行嵌入的官方样例与自加用例，方便本地自测。"""
    import io
    import itertools
    import random
    import time

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
        ("6 3 1 8 16\n4 2 5 3 6 1\n", "3\n1 3 5\n1 3 6\n1 4 6"),
        # g=0：相邻无需间隔，全部组合按递增即可
        ("4 2 0 2 10\n1 1 1 1\n", "6\n1 2\n1 3\n1 4"),
        # t=1：没有相邻对，单点难度命中即计
        ("5 1 3 5 5\n2 5 9 2 5\n", "2\n2\n5"),
        # 差恰好等于 g 也是冲突：g=1 时 (1,2) 不合法，只剩 (1,3)
        ("3 2 1 0 100\n1 1 1\n", "1\n1 3"),
        # 难度和全部越界：只打印计数 0，不打印方案行
        ("3 2 1 50 60\n1 1 1\n", "0"),
        # g 达到上限 m：任意相邻对的编号差 <= m-1 都 <= g，无方案
        ("3 2 3 0 100\n7 8 9\n", "0"),
    ]

    failures = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run(inp)
        ok = output == expected
        if not ok:
            failures += 1
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {'✓' if ok else '✗'}")

    # 随机对照：与 combinations 全枚举（含间隔与区间过滤）比对 200 组。
    rng = random.Random(20260911)
    rand_bad = 0
    for _ in range(200):
        m = rng.randint(1, 9)
        t = rng.randint(1, m)
        g = rng.randint(0, m)
        lo = rng.randint(1, 50)
        hi = rng.randint(lo, 200)
        diff = [rng.randint(1, 30) for _ in range(m)]
        inp = f"{m} {t} {g} {lo} {hi}\n" + " ".join(map(str, diff)) + "\n"
        expected_count = 0
        expected_lines = []
        for combo in itertools.combinations(range(1, m + 1), t):
            if all(combo[k + 1] - combo[k] > g for k in range(t - 1)) and lo <= sum(
                diff[c - 1] for c in combo
            ) <= hi:
                expected_count += 1
                if expected_count <= 3:
                    expected_lines.append(" ".join(map(str, combo)))
        expected = str(expected_count) + (
            "\n" + "\n".join(expected_lines) if expected_lines else ""
        )
        output = run(inp)
        if output != expected:
            rand_bad += 1
            print(f"随机对照失败: 输入={inp!r} 期望={expected!r} 实际={output!r}")
    if rand_bad == 0:
        print("随机对照 200 组: 全部一致 ✓")
    failures += rand_bad

    # 极端规模：m=20、t=10、g=0、lo=1、hi=1000（难度全 50），
    # 全部 C(20,10)=184756 个组合都计入，检验计数正确且只输出 3 行。
    inp2 = "20 10 0 1 1000\n" + " ".join(["50"] * 20) + "\n"
    start = time.time()
    output = run(inp2)
    cost = time.time() - start
    lines = output.split("\n")
    ok = (
        lines[0] == "184756"
        and len(lines) == 4
        and lines[1] == "1 2 3 4 5 6 7 8 9 10"
        and lines[3] == "1 2 3 4 5 6 7 8 9 12"
        and cost < 10
    )
    if not ok:
        failures += 1
        print(f"规模 20: 实际前 4 行={lines[:4]} 耗时 {cost:.2f}s ✗")
    else:
        print(f"规模 20: 计数 184756、前 3 行字典序正确，耗时 {cost:.2f}s ✓")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
