"""
P5335. 小美的三角形图游走 - 欧拉回路（Hierholzer 算法）

栈道图是三角分割图：第 r 层的 r 个台位编号为 r(r-1)/2+c（c=1..r）。
对每个 r>=2 与 c<r 有三条无向边——同层相邻 (r,c)-(r,c+1)、
连向上层 (r,c)-(r-1,c)、斜向 (r,c+1)-(r-1,c)——恰好是 (h-1)^2 个
小三角形的全部三条边。每个台位恰好属于 t 个小三角形（t 取 1/2/3），
度为 2t 是偶数，图又连通，所以欧拉回路存在；题面对本数据范围同样保证。

输入格式：
- 第一行任务数 k；
- 接下来 k 行，每行两个整数 h 与出发台位 s。

输出格式：
- 每个任务一行：3*h*(h-1)/2 + 1 个整数，首尾都是 s，
  相邻两个数之间都是一段栈道，每段栈道恰好走一次。

核心思路：Hierholzer 算法。当前点没有未用过的边就弹进答案数组，
否则沿一条未用边前进并把它两个方向都标记为已用；弹栈收集到的
序列是回路的逆序，反转后从出发点读出。无向边用全局边号做已用
标记（bytearray），配一个每点一个的扫描指针实现均摊 O(E)。
边按 r 从小到大、同 r 内 c 从小到大、每个 (r,c) 内按
[同层、上层、斜向] 的顺序加入邻接表，这正是官方样例输出
所对应的遍历顺序。

复杂度：单个任务 O(h^2) 时间与空间（边数 3*h*(h-1)/2 是平方级），
全部任务之和受 sum(h) <= 1000 约束，边总量在百万级。
"""

# https://codefun2000.com/p/P5335
# @sample-start
"""
样例输入 1:
1
2 3

样例输出 1:
3 2 1 3
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
3 4

样例输出 2:
4 5 2 3 5 6 3 1 2 4
"""
# @sample-end

# @sample-start
"""
样例输入 3:
2
2 2
4 7

样例输出 3:
2 3 1 2
7 8 4 5 2 3 5 6 9 8 5 9 10 6 3 1 2 4 7
"""
# @sample-end

import sys
from math import isqrt

# 台位编号上限 h*(h+1)/2 <= 500500 < 2^19，邻接表元素把「边号 << 19 | 台位号」
# 编码成一个整数，省掉逐元组寻址的开销。
VTX_BITS = 19
VTX_MASK = (1 << VTX_BITS) - 1


def euler_tour(h, s):
    """返回从 s 出发走遍全部栈道的台位序列（首尾都是 s）。"""
    total = h * (h + 1) // 2          # 台位数
    edge_cnt = 3 * h * (h - 1) // 2   # 栈道数

    adj = [[] for _ in range(total + 1)]
    eid = 0
    for r in range(2, h + 1):
        cur = r * (r - 1) // 2        # 本层最左台位编号
        up = (r - 1) * (r - 2) // 2   # 上一层最左台位编号
        for c in range(1, r):
            u = cur + c
            same = u + 1              # 同层右邻
            w = up + c                # 上一层同号台位
            # 加入顺序固定：同层、上层、斜向（决定样例输出形态）
            for a, b in ((u, same), (u, w), (same, w)):
                adj[a].append((eid << VTX_BITS) | b)
                adj[b].append((eid << VTX_BITS) | a)
                eid += 1

    used = bytearray(edge_cnt)
    ptr = [0] * (total + 1)

    # Hierholzer：走到底再回填，path 收集的是回路的逆序
    stack = [s]
    path_rev = []
    push = stack.append
    pop = stack.pop
    take = path_rev.append
    while stack:
        u = stack[-1]
        aux = adj[u]
        p = ptr[u]
        last = len(aux)
        while p < last and used[aux[p] >> VTX_BITS]:
            p += 1
        ptr[u] = p
        if p < last:
            entry = aux[p]
            used[entry >> VTX_BITS] = 1
            push(entry & VTX_MASK)
        else:
            take(pop())

    path_rev.reverse()
    return path_rev


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    k = int(next(it))
    out = []
    for _ in range(k):
        h = int(next(it))
        s = int(next(it))
        tour = euler_tour(h, s)
        out.append(" ".join(map(str, tour)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    import io

    def run_case(inp):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        return output

    # 通用判题器：路线相邻两数必须是题面规程里的某段栈道，且每段恰好一次。
    def neighbors_of(h, v):
        """按题面规程给出台位 v 的全部邻台。"""
        # 定位层号 r：r(r-1)/2 < v <= r(r+1)/2
        r = isqrt(2 * v)
        while r * (r + 1) // 2 < v:
            r += 1
        while r >= 2 and (r - 1) * r // 2 >= v:
            r -= 1
        base = r * (r - 1) // 2
        c = v - base
        res = set()
        if c < r:
            res.add(v + 1)                                  # 同层右邻
        if c >= 2:
            res.add(v - 1)                                  # 同层左邻
        if r >= 2:
            upper = (r - 1) * (r - 2) // 2
            if c <= r - 1:
                res.add(upper + c)                          # 连上一层 (r,c)-(r-1,c)
            if c >= 2:
                res.add(upper + c - 1)                      # 斜向 (r,c)-(r-1,c-1)
        if r < h:
            lower = (r + 1) * r // 2
            res.add(lower + c)                              # 下层左斜 (r+1,c)
            res.add(lower + c + 1)                          # 下层：v 作为上层点两条边
        return res

    def check_tour(h, s, tokens):
        m = 3 * h * (h - 1) // 2
        assert len(tokens) == m + 1, f"路径长度 {len(tokens)} != {m + 1}"
        assert tokens[0] == s and tokens[-1] == s, "首尾必须都是出发台位"
        seen_pairs = set()
        for a, b in zip(tokens, tokens[1:]):
            assert b in neighbors_of(h, a), f"{a}->{b} 不是合法栈道"
            key = (a, b) if a < b else (b, a)
            assert key not in seen_pairs, f"栈道 {a}-{b} 走了两次"
            seen_pairs.add(key)
        assert len(seen_pairs) == m, f"只覆盖 {len(seen_pairs)} 段，应为 {m} 段"

    test_cases = [
        # 官方样例 1：h=2，从 3 出发
        ("1\n2 3\n", "3 2 1 3"),
        # 官方样例 2：h=3，从 4 出发
        ("1\n3 4\n", "4 5 2 3 5 6 3 1 2 4"),
        # 官方样例 3：多任务
        ("2\n2 2\n4 7\n", "2 3 1 2\n7 8 4 5 2 3 5 6 9 8 5 9 10 6 3 1 2 4 7"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run_case(inp).strip()
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {'通过' if output == expected else '失败'} {status}")
        assert output == expected, f"样例 {i} 官方输出不符: {output}"

    # 官方只有 3 组小样例，下面用判题器验证各规模与各型出发点。
    # h=2 的三个台位轮流当出发点（三角形任何点都成回路）。
    for s in (1, 2, 3):
        out = run_case(f"1\n2 {s}\n").split()
        check_tour(2, s, [int(x) for x in out])
    # h=3..8 覆盖顶点 / 边界 / 内部三种台位（度数 2、4、6）
    small_cases = []
    for h in range(3, 9):
        total = h * (h + 1) // 2
        small_cases.append((h, 1))                    # 全图顶点
        small_cases.append((h, total))                # 最底层右端
        small_cases.append((h, (h - 1) * h // 2 + 1)) # 最底层左端
        mid = 3 + h // 2
        if 1 <= mid <= total:
            small_cases.append((h, mid))
    batch_lines = "\n".join(f"{h} {s}" for h, s in small_cases)
    outs = run_case(f"{len(small_cases)}\n{batch_lines}\n").strip().split("\n")
    for (h, s), line in zip(small_cases, outs):
        check_tour(h, s, [int(x) for x in line.split()])
    print(f"压力用例 {len(small_cases)} 组（h=3..8 各型出发点）: 通过")

    # 边规模用例：h=60（每条约 5310 段栈道）+ 多任务共享 sum(h) 上界
    stress = [(60, 1), (60, 1830)]
    batch = "\n".join(f"{h} {s}" for h, s in stress)
    outs = run_case(f"{len(stress)}\n{batch}\n").strip().split("\n")
    for (h, s), line in zip(stress, outs):
        check_tour(h, s, [int(x) for x in line.split()])
    print("压力用例 h=60 两组: 通过")

    # 极端规模：h=1000（约 150 万段栈道），判题器全量核验一次。
    out = run_case("1\n1000 500000\n").split()
    check_tour(1000, 500000, [int(x) for x in out])
    print("压力用例 h=1000: 通过")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
