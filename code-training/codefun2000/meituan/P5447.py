"""
P5447. 巷道穿梭 - 往复运动折叠（O(1) 数学模拟）

长度 L 的直线导轨 [0, L]，车碰 0 端或 L 端立即掉头。初始位置 s、
初始朝向 d（L/R），随后 n 条指令依次行驶 a_i 距离（途中可以反复撞限位
后掉头）。求限位触发总次数、最终位置与最终朝向。若出发时车正停在端点
且朝外（s=0 且 d=L，或 s=L 且 d=R），视为出发前已完成一次不计入的掉头。

输入格式：
- 第一行四个整数 n、L、s 与朝向字符 d；
- 第二行 n 个非负整数 a_i（0 <= a_i <= 1e12）。

输出格式：
- 一行三个值：触发总次数、最终位置、最终朝向字符。

核心思路：逐步按单位距离模拟会达到 O(sum a) = 2e17，必须对每条指令
O(1) 折叠。把运动展开成「周期 2L 的圆」：圆上参数 y 沿行驶方向匀速
前进，真实位置是 y 的三角波 tri(y)（0..L..0），y 增加 L 恰对应撞一次
限位并掉头。构造映射：朝右停 p 处记 y=p，朝左停 p 处记 y=2L-p
（mod 2L）。行驶 a 就是 y -> (y + a) mod 2L：
- 触发次数 = (y+a)//L - y//L，即区间 (y, y+a] 内跨过多少个 L 的倍数；
  起点若是端点（静止朝内）不自计——那次掉头在「抵达时」已计过。
- 终点位置 = tri((y+a) mod 2L)；朝向由 (y+a) mod 2L 落在 [0,L) 还是
  [L,2L) 决定（恰停在 L 端记 L，恰停在 0 端记 R，均是刚弹开的状态）。

复杂度：每条指令 O(1)，总计 O(n)；输入输出 O(n)。
"""

# https://codefun2000.com/p/P5447
# @sample-start
"""
样例输入 1:
4 8 2 L
3 6 10 4

样例输出 1:
3 5 R
"""
# @sample-end

import sys


def simulate(n, L, s, d, distances):
    if s == 0 and d == "L":
        d = "R"      # 出发前已完成的掉头，不计次数
    elif s == L and d == "R":
        d = "L"
    # (位置, 朝向) -> 展开圆上的参数 y，且规定 y 沿行驶方向单调前进
    if d == "R":
        y = s
    else:
        y = 2 * L - s if s != 0 else 0
    hits = 0
    for a in distances:
        y = y + a
        hits += y // L - (y - a) // L
        y %= 2 * L
    # 终态：y mod L 是「刚弹开」的相位
    r = y % L
    if r == 0:
        pos = 0 if y % (2 * L) == 0 else L
        return hits, pos, "R" if y % (2 * L) == 0 else "L"
    if y <= L:
        return hits, y, "R"
    return hits, 2 * L - y, "L"


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    L = int(data[1])
    s = int(data[2])
    d = data[3].decode() if isinstance(data[3], bytes) else data[3]
    distances = [int(x) for x in data[4 : 4 + n]]
    hits, pos, nd = simulate(n, L, s, d, distances)
    print(f"{hits} {pos} {nd}")


def run_tests():
    import io
    import random

    def run_case(inp):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        return output

    def brute(n, L, s, d, distances):
        """按单位距离逐步模拟：小规模下作为精确参照。"""
        if s == 0 and d == "L":
            d = "R"
        elif s == L and d == "R":
            d = "L"
        pos, hits = s, 0
        for a in distances:
            step = 1 if d == "R" else -1
            for _ in range(a):
                nxt = pos + step
                if nxt == L and step == 1 or nxt == 0 and step == -1:
                    hits += 1  # 抵达端点即触发并掉头
                    step = -step
                pos = nxt
            d = "R" if step == 1 else "L"
        return f"{hits} {pos} {d}"

    test_cases = [
        # 官方样例 1
        ("4 8 2 L\n3 6 10 4\n", "3 5 R"),
        # 官方说明逐条拆开的等价新样本：单独跑第一条指令
        ("1 8 2 L\n3\n", "1 1 R"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {'通过' if output == expected else '失败'} {status}")
        assert output == expected, f"样例 {i} 期望 {expected}，实际 {output}"

    # 官方只有 1 组样例：小规模全量对拍折叠公式与逐步模拟。
    rng = random.Random(20260915)
    small = []
    for _ in range(300):
        L = rng.randint(1, 7)
        n = rng.randint(1, 4)
        s = rng.randint(0, L)
        d = rng.choice("LR")
        distances = [rng.choice([0, 1, L, L + 1, L + 2, 2 * L, 2 * L + 1]) for _ in range(n)]
        small.append((n, L, s, d, distances))
    lines = "\n".join(
        f"{n} {L} {s} {d}\n{' '.join(map(str, ds))}" for n, L, s, d, ds in small
    )
    inp_preview = lines  # 展示性变量：逐组独立调用 solve() 便于对拍定位
    for n, L, s, d, ds in small:
        got = run_case(f"{n} {L} {s} {d}\n{' '.join(map(str, ds))}\n")
        want = brute(n, L, s, d, ds)
        assert got == want, f"对拍失败 n={n} L={L} s={s} d={d} a={ds}: 期望 {want}，实际 {got}"
    print(f"对拍用例 {len(small)} 组（L<=7 极限分段，逐步模拟参照）：通过")

    # 关键角落用例（直接断言语义）：初始端点朝外的修正不计数。
    got = run_case("1 5 0 L\n0\n").strip()
    assert got == "0 0 R", f"初始修正失败: {got}"      # 修正朝向 R 后不走，停 0、朝 R
    got = run_case("1 5 5 R\n0\n").strip()
    assert got == "0 5 L", f"初始修正失败: {got}"
    got = run_case("1 5 0 L\n5\n").strip()
    assert got == "1 5 L", f"行程恰触 L 端失败: {got}"  # 走 5：0->5 触发 1 次，停在 5 朝 L
    got = run_case("1 5 5 L\n10\n").strip()
    assert got == "2 5 L", f"双倍程折返失败: {got}"     # 5->0->5 触发 2 次，停 5 朝 L
    got = run_case("2 5 0 R\n4 1\n").strip()
    assert got == "1 5 L", f"跨指令端点失败: {got}"     # 4->5，1->0：共 1 次，停 5 朝 L
    print("角落用例 5 组（端点静止修正、恰达端点、跨指令端点）：通过")

    # 极端规模：a_i=1e12、L=1、纯 Python 折叠不超时。
    import time
    t0 = time.perf_counter()
    big = [10**12 - i for i in range(200000)]
    got = run_case(f"200000 1 0 R\n{' '.join(map(str, big))}\n")
    elapsed = time.perf_counter() - t0
    # L=1 时每次行驶的触发次数恰为行驶距离本身
    assert got.split()[0] == str(sum(big)), f"大数触发次数不符: {got[:50]}"
    print(f"压力用例 n=200000、a_i~1e12、L=1：用时 {elapsed:.2f}s，输出 {got}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
