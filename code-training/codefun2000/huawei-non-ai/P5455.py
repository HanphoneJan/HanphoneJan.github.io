"""
P5455. 推理设备覆盖 - 集合覆盖 · 状压 DP

d 台机器各登记若干能力条目，业务点名 t 条互异条目；入选集合必须让
每一条点名条目都出现在至少一台启用的机器上，求最少启用台数。
怎样挑都凑不齐时输出 0。

输入格式：
- 第 1 行：d w t（机器台数 <= 30，每台条目数 <= 10，点名条目数 <= 20）；
- 随后 d 行：每行 w 个整数，该台机器具备的条目编号；
- 末行：t 个互异整数，业务点名的条目编号。

输出格式：
- 一个整数：最少台数；无解输出 0。

核心思路：
1. 条目编号不连续（示例里出现 8、9），先把点名的 t 条映射到比特
   0..t-1；机器条目只保留落在点名集合里的部分，得到覆盖掩码 c。
   与业务无关的条目直接丢掉，不占比特。
2. 最少台数 = 覆盖住全集 full=(1<<t)-1 的最少机器数，是经典集合
   覆盖。d<=30 无法枚举 2^d 个机器子集，反过来对「已覆盖集合」
   状压：从空集出发，每用一台机器就把掩码并进去，按层数 BFS，
   第几层第一次出现 full，答案就是几。
3. 按位并满足幂等性（c|c=c），一台机器重复使用不带来新覆盖，
   天然不会重复计费。无解时 BFS 不再产出新状态，输出 0。

时间复杂度：O(可达状态数 * d)，可达状态最多 2^t 个
空间复杂度：O(2^t)
"""

# https://codefun2000.com/p/P5455
import sys

# @sample-start
"""
样例输入 1:
4 2 3
2 8
3 5
8 9
5 2
2 5 8

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 3 4
1 2 3
4 5 6
10 11 12 13

样例输出 2:
0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3 1 1
9
8
9
9

样例输出 3:
1
"""
# @sample-end


def solve():
    """读入机器条目与点名条目，BFS 求覆盖全集的最少台数。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    d = int(next(it))
    w = int(next(it))
    t = int(next(it))

    # 机器条目在点名条目之前进入，先整行收下再说
    machine_items = []
    for _ in range(d):
        machine_items.append([int(next(it)) for _ in range(w)])

    # 点名条目 -> 比特位。编号不连续，必须显式映射。
    bit_of = {}
    for k in range(t):
        bit_of[int(next(it))] = k
    full = (1 << t) - 1

    # 每台机器的覆盖掩码：只统计点名的条目，无关条目一律忽略
    masks = set()
    for row in machine_items:
        c = 0
        for v in row:
            b = bit_of.get(v)
            if b is not None:
                c |= 1 << b
        if c:
            masks.add(c)  # 重复掩码只留一份，不影响最少台数

    # 按层数 BFS：layer k = 恰好用 k 台机器能凑出的覆盖集合。
    # full 第一次出现在第 k 层，说明最少台数为 k。
    visited = {0}
    frontier = [0]
    layer = 0
    while True:
        layer += 1
        nxt = {s | c for s in frontier for c in masks}
        if full in nxt:
            print(layer)
            return
        new = nxt - visited
        if not new:
            print(0)  # 有条目从未被任何机器提供，凑不齐
            return
        visited |= new
        frontier = new


def run_tests():
    """运行官方样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：第 1 台 + 第 4 台凑齐 {2,5,8}
        (
            "4 2 3\n2 8\n3 5\n8 9\n5 2\n2 5 8\n",
            "2",
        ),
        # 官方样例 2：点名条目任何机器都没有 -> 0
        (
            "2 3 4\n1 2 3\n4 5 6\n10 11 12 13\n",
            "0",
        ),
        # 官方样例 3：单台单独够用
        (
            "3 1 1\n9\n8\n9\n9\n",
            "1",
        ),
        # 无关条目混在机器里：机器 1 带 9 个环境条目和点名条目 1，
        # 机器 2 带点名条目 2，答案仍是 2
        (
            "2 3 2\n9 9 1\n7 2 7\n1 2\n",
            "2",
        ),
        # 机器内条目重复：掩码去重后单台即够
        (
            "1 4 2\n5 5 5 5\n5 5\n",
            "0",  # 点名 5 之外还有条目 6，永远凑不齐
        ),
        # 单台覆盖全部点名条目
        (
            "1 3 3\n1 2 3\n1 2 3\n",
            "1",
        ),
        # 贪心反例：先拿覆盖最多的机器会多启用一台。
        # 机器 A={1,2,3,4}，B={1,2,5}（外加无关条目 7），C={3,4,6}（加 8），
        # 点名 1..6：贪心先拿 A，再各补 5、6 共 3 台；最优 B+C 两台。
        (
            "3 4 6\n1 2 3 4\n1 2 5 7\n3 4 6 8\n1 2 3 4 5 6\n",
            "2",
        ),
        # 必须三台的链式结构：A={1,2}，B={3,4}，C={5,6}
        (
            "3 2 6\n1 2\n3 4\n5 6\n1 2 3 4 5 6\n",
            "3",
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
