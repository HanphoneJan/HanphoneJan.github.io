# 牛客题霸 · 美团笔试真题
# https://www.nowcoder.com/practice/b83c936695494d4d85b3fd618f35212d
# 小美的修路（美团，最小生成树 + 必选边）

"""
小美的修路 —— 最小生成树（Kruskal + 并查集）

题目描述：
地图上有 n 个城市，小美准备修建一些道路，使得任意两个城市之间都能通过道路
到达。现在给定 m 个修路计划（部分计划是必选的），请你规划出最优方案：
在保证连通且包含全部必选计划的前提下，总花费最小。

输入格式：
第一行两个正整数 n、m。
接下来 m 行，每行四个正整数 u、v、w、required：
在 u 与 v 之间修一条花费为 w 的路；required 为 1 表示必选，0 表示可选。

输出格式：
若无解输出 -1。
否则第一行输出选择的计划数量，第二行输出这些计划的编号（1 起），空格分隔。

核心思路：
这是「带必选边的最小生成树」：
1. 先把所有必选边直接加入并查集（它们的花费是固定要付的）；
2. 再把可选边按花费升序排序，用 Kruskal 依次尝试加入，
   能连通两个不同集合的就选它；
3. 最后若所有城市仍未连通，说明无解，输出 -1。

必选边之间即使成环也照单全收（题目要求必须包含它们），
并查集只用来判断「还需要补哪些边才能连通」。

时间复杂度：O(m log m)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3 4
1 2 3 1
1 2 2 0
1 3 1 0
2 3 3 0

样例输出 1:
2
1 3
"""
# @sample-end

import sys


def solve() -> None:
    """并查集：必选边无条件加入，可选边按花费贪心"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); m = int(data[idx + 1]); idx += 2

    edges = []
    for i in range(1, m + 1):
        u = int(data[idx]); v = int(data[idx + 1])
        w = int(data[idx + 2]); req = int(data[idx + 3])
        idx += 4
        edges.append((u, v, w, req, i))

    parent = list(range(n + 1))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # 路径压缩
            x = parent[x]
        return x

    def union(x: int, y: int) -> bool:
        rx, ry = find(x), find(y)
        if rx == ry:
            return False
        parent[rx] = ry
        return True

    chosen = []
    # 1. 必选边全部加入
    for u, v, w, req, i in edges:
        if req == 1:
            union(u, v)
            chosen.append(i)

    # 2. 可选边按花费升序，Kruskal
    for u, v, w, req, i in sorted(edges, key=lambda e: e[2]):
        if req == 0 and union(u, v):
            chosen.append(i)

    # 3. 判断是否连通
    root = find(1)
    for city in range(2, n + 1):
        if find(city) != root:
            sys.stdout.write("-1\n")
            return

    chosen.sort()
    sys.stdout.write(str(len(chosen)) + "\n" + " ".join(map(str, chosen)) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3 4\n1 2 3 1\n1 2 2 0\n1 3 1 0\n2 3 3 0\n", "2\n1 3"),
        ("1 0\n", "0"),            # 只有一个城市，天然连通
        ("3 1\n1 2 5 1\n", "-1"),  # 必选边连不通所有城市
        ("3 2\n1 2 1 1\n2 3 1 1\n", "2\n1 2"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.StringIO(inp)
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
