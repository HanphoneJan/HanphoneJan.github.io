# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/6afe13c512d44b30b03933471d259ba4
# 小欧皇（OPPO 2024 秋招 · 算法岗）

"""
小欧皇 —— 图 / 并查集

题目描述：
n 个城市、m 条无向道路，01 串表示每个城市是否已被占领。若两个城市之间
存在一条只经过「已占领城市」的路径，则这两个城市之间产生收益 1（每对城市
只算一次）。现在要再占领一个未占领的城市，使总收益最大；收益相同时优先
占领编号最小的城市。输出占领的城市编号与占领后的总收益。

输入格式：
第一行 n, m（1 <= n, m <= 1e5）。
第二行一个长度为 n 的 01 串。
接下来 m 行，每行 u, v，表示一条道路。

输出格式：
一行两个整数：占领的城市编号、占领后的总收益。

核心思路：
1. 只走已占领城市，所以「能互相到达」就等于在「只保留已占领城市」的
   导出子图里处于同一个连通块。一个有 s 个城市的连通块贡献 C(s,2) 对收益。
2. 用并查集只合并「两端都已占领」的边，就得到当前所有连通块的大小，
   当前总收益 base = sum C(s_i, 2)。
3. 对每个未占领的城市 u，看它连着哪些已占领的连通块（去重后大小
   s_1..s_d）。占领 u 之后这些块与 u 合并成一个大小 S = 1 + s_1 + ... + s_d
   的大块，收益变化为 C(S,2) - sum C(s_j,2)。
4. 枚举所有未占领城市，取 base + 变化量最大的那个；相等时保留编号更小的。

时间复杂度：O((n + m) α(n))
空间复杂度：O(n + m)
"""

# @sample-start
"""
样例输入 1:
5 5
01010
1 2
1 3
1 4
4 5
1 5

样例输出 1:
1 3
"""
# @sample-end

import sys


class DSU:
    """路径压缩 + 按大小合并的并查集"""

    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x: int) -> int:
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:          # 路径压缩
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]


def solve() -> None:
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    m = int(data[1])
    occupied = [c == 49 for c in data[2]]       # 49 是字符 '1' 的字节值

    edges = []
    pos = 3
    for _ in range(m):
        u = int(data[pos]) - 1
        v = int(data[pos + 1]) - 1
        pos += 2
        edges.append((u, v))

    graph = [[] for _ in range(n)]
    dsu = DSU(n)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
        if occupied[u] and occupied[v]:         # 只有两端都被占领才连通
            dsu.union(u, v)

    # 当前收益：每个已占领连通块贡献 C(s, 2)
    base = 0
    for i in range(n):
        if occupied[i] and dsu.find(i) == i:
            s = dsu.size[i]
            base += s * (s - 1) // 2

    best_city = -1
    best_total = -1
    for u in range(n):
        if occupied[u]:
            continue
        roots = set()
        for v in graph[u]:
            if occupied[v]:
                roots.add(dsu.find(v))
        joined = 1
        lost = 0
        for r in roots:
            s = dsu.size[r]
            joined += s
            lost += s * (s - 1) // 2
        total = base + joined * (joined - 1) // 2 - lost
        if total > best_total:                  # 严格大于，天然保留最小编号
            best_total = total
            best_city = u

    if best_city == -1:                         # 题目保证至少有一个未占领城市
        best_city, best_total = 0, base
    sys.stdout.write(f"{best_city + 1} {best_total}\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("5 5\n01010\n1 2\n1 3\n1 4\n4 5\n1 5\n", "1 3"),
        ("2 1\n01\n1 2\n", "1 1"),                          # 占领 1 号，与 2 号连通
        ("3 2\n110\n1 2\n2 3\n", "3 3"),                    # 已有 {1,2} 收益 1，占领 3 后 3 对
        ("3 2\n101\n1 2\n2 3\n", "2 3"),                    # 两头都占领但被隔开，占领中间打通
        ("4 3\n1110\n1 2\n2 3\n3 4\n", "4 6"),              # 已有 3 个连通，占领 4 后 C(4,2)=6
    ]
    class FakeStdin:
        """把字符串包成带 buffer 的 stdin，供 sys.stdin.buffer.read() 使用"""

        def __init__(self, text: str) -> None:
            self.buffer = io.BytesIO(text.encode())

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = FakeStdin(inp)
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
