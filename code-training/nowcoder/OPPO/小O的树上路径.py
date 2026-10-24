# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/dba380c6ba674a7084e3214b05cb729b
# 小O的树上路径（OPPO 2024 秋招 · 研发通用岗 / 后端开发）

"""
小O的树上路径 —— 树 / 树形 DP

题目描述：
一棵 n 个点的树，每条边上有一个价值 w 的物品。从 1 号点出发沿着边走，
每个点最多只能「走」两次（即它在走过的点序列里最多出现两次），
物品拿走后就没有了（同一条边只算一次价值）。问最多能拿到多少价值。

输入格式：
第一行一个整数 n（2 <= n <= 1e5）。
随后 n-1 行，每行三个整数 u、v、w（1 <= w <= 1e9），表示一条边。

输出格式：
输出一个整数，表示能拿到的最大价值。

核心思路：
把 1 号点当作根。一次走法里，「被走的点序列」中每个点最多出现两次，
于是每个点能做的动作非常有限：
1. 从父亲进来算一次出现；从某个孩子回来再算一次出现。
   所以一个点最多只能有**一个**「下去再回来」的探路分支。
2. 而「下去不回来」的那一步（走的终点方向）不额外消耗出现次数。
于是整条路线可以看成一条从根往下的主链，主链上每个点还能额外挂
一个「下去再回来」的分支；而那个分支本身也只能是一条向下的链。

记：
  down[u] = 从 u 出发向下走一条链再回到 u 能拿到的最大价值
          = max(0, max_{child c}(w(u,c) + down[c]))
  best[u] = 进入 u 之后（u 还能用一次「回来」）在 u 子树里最多能拿多少
          = max( down[u],                              # 探一次路就停在 u
                 max_{child c}( w(u,c) + best[c]        # 主链走 c
                                + 其它孩子里最好的 walk ) )  # u 上挂的分支
答案就是 best[1]。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
1 2 1
1 3 2
1 4 3

样例输出 1:
5
"""
# @sample-end

import sys


def solve() -> None:
    """迭代后序遍历树，自底向上算 down 与 best"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))

    adj = [[] for _ in range(n + 1)]
    for _ in range(n - 1):
        u = int(next(it)); v = int(next(it)); w = int(next(it))
        adj[u].append((v, w))
        adj[v].append((u, w))

    # 以 1 为根，迭代建出 BFS 序（避免深链递归爆栈）
    parent = [0] * (n + 1)
    parent[1] = -1
    order = [1]
    for u in order:
        for v, _ in adj[u]:
            if v != parent[u]:
                parent[v] = u
                order.append(v)

    down = [0] * (n + 1)   # 向下一条链再回来
    best = [0] * (n + 1)   # 进入 u 后能拿到的最大值

    for u in reversed(order):
        # 先取孩子里最大的两个「探路」收益（留一个给别人，别和主链抢边）
        first = second = 0
        first_child = 0
        for v, w in adj[u]:
            if parent[v] != u:
                continue
            d = w + down[v]
            if d > first:
                second, first, first_child = first, d, v
            elif d > second:
                second = d

        down[u] = first
        cur = first                       # 探一次路就停在 u
        for v, w in adj[u]:
            if parent[v] != u:
                continue
            other = second if v == first_child else first
            cand = w + best[v] + other    # 主链走 v，再挂上最好的那个分支
            if cand > cur:
                cur = cand
        best[u] = cur

    sys.stdout.write(str(best[1]) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4\n1 2 1\n1 3 2\n1 4 3\n", "5"),          # 题面样例：1->4->1->3
        ("2\n1 2 5\n", "5"),                        # 只有一条边
        ("4\n1 2 1\n2 3 2\n3 4 4\n", "7"),          # 一条链，全部拿到
        ("4\n1 2 5\n1 3 5\n2 4 100\n", "110"),      # 1->2->4->2->1->3
        ("5\n1 2 3\n1 3 2\n1 4 5\n1 5 4\n", "9"),   # 菊花图：最大的两条边
        ("3\n1 2 1\n1 3 1\n", "2"),                 # 1->2->1->3
        ("5\n1 2 1\n2 3 50\n2 4 50\n1 5 2\n", "103"),  # 分支挂在主链中间
        ("5\n1 2 1\n2 3 1\n3 4 1\n4 5 1\n", "4"),   # 深链，一条链走到底
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
