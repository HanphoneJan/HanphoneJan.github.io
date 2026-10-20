"""
P5425. 语义邻域可达 - DBSCAN 密度相连判定

给 N 个平面上的点和两个参数 eps、MinPts，回答 M 次询问：
点 a 与点 b 是否“密度相连”（即是否属于同一个语义簇）。

输入格式：
- 第 1 行：四个数 N、M、eps、MinPts；
- 接下来 N 行：每行两个浮点数 x_i、y_i，按顺序编号为 0 到 N-1；
- 接下来 M 行：每行两个整数 a、b，表示一次询问。

输出格式：
- 共 M 行，每行一个整数：1 表示密度相连，0 表示不密度相连。

核心思路：
1. 先数出每个点 eps-邻域内的点数（含自身），不少于 MinPts 的点是核心点。
2. 题目规定“路径上的每一步都必须从一个核心点走到它邻域内的某个点”，
   所以只有**核心点**能充当路径的中转站：把互相在 eps 以内的核心点用
   并查集合并，得到若干“核心连通块”。
3. 每个点记录它能挂到哪些核心连通块上：
   - 核心点挂到自己所在的块；
   - 边界点（自身不是核心，但落在某些核心点的邻域里）挂到覆盖它的那些核心点所在的块；
   - 噪声点（不在任何核心点邻域内）挂不到任何块。
4. 询问 a、b：两边的块集合有交集，当且仅当存在一个核心点 o 能同时走到
   a 和 b，也就是题目定义的密度相连。

时间复杂度：O(N^2 + M)，N = 1000 时约 1.5 * 10^6 次距离计算。
空间复杂度：O(N + M)，用两遍扫描代替保存 N^2 条邻边。
"""

# https://codefun2000.com/p/P5425
import sys

# @sample-start
"""
样例输入 1:
6 4 2.0 3
0.0 0.0
1.2 0.0
0.4 1.0
12.0 0.0
12.5 0.4
6.0 6.0
0 2
0 3
3 4
1 5

样例输出 1:
1
0
0
0
"""
# @sample-end

# @sample-start
"""
样例输入 2:
8 4 2.0 3
0.0 0.0
1.5 0.0
0.3 1.4
3.2 0.2
8.0 8.0
8.6 8.2
8.3 9.5
0.0 8.0
0 2
0 3
4 5
3 4

样例输出 2:
1
1
1
0
"""
# @sample-end


def solve():
    """读入点集与询问，按 DBSCAN 的定义逐条回答是否密度相连。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    m = int(next(it))
    eps = float(next(it))
    min_pts = int(next(it))

    xs = [0.0] * n
    ys = [0.0] * n
    for i in range(n):
        xs[i] = float(next(it))
        ys[i] = float(next(it))

    # 先把询问读完：坐标点很多时，边算边读容易把“输入流”和“计算”搅在一起。
    queries = [(int(next(it)), int(next(it))) for _ in range(m)]

    # 比较距离时统一用“平方距离”，可以省掉 N^2 次开方。
    # 末尾乘上的极小容差是为了让“距离恰好等于 eps”的点不被浮点误差挡在门外：
    # 例如 eps = 1.5 时，点 (0, 0) 与 (1.2, 0.9) 的距离在数学上正好是 1.5，
    # 但 1.2 * 1.2 + 0.9 * 0.9 在二进制浮点下可能算成 2.2500000000000004。
    eps2 = eps * eps * (1.0 + 1e-9)

    # ---------- 第一遍：数每个点 eps-邻域内有多少个点（含自身） ----------
    counts = [1] * n
    for i in range(n):
        xi = xs[i]
        yi = ys[i]
        cnt = counts[i]
        for j in range(i + 1, n):
            dx = xs[j] - xi
            dy = ys[j] - yi
            if dx * dx + dy * dy <= eps2:
                # 邻域关系是对称的，所以一次比较同时给两边的计数加一
                cnt += 1
                counts[j] += 1
        counts[i] = cnt

    core = [cnt >= min_pts for cnt in counts]

    # ---------- 并查集：把互相连通的核心点合并成一个“核心连通块” ----------
    parent = list(range(n))
    size = [1] * n

    def find(x):
        """路径减半：边走边把节点挂到祖父上，均摊接近 O(1)。"""
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]

    # 只在核心点之间连边：边界点不能作为路径的中转站，
    # 否则「被两个簇同时覆盖的边界点」会把两个本来无关的簇错误地粘在一起。
    for i in range(n):
        if not core[i]:
            continue
        xi = xs[i]
        yi = ys[i]
        for j in range(i + 1, n):
            if not core[j]:
                continue
            dx = xs[j] - xi
            dy = ys[j] - yi
            if dx * dx + dy * dy <= eps2:
                union(i, j)

    # ---------- 第二遍：算出每个点能挂到哪些核心连通块 ----------
    # 用集合而不是单个编号，是因为边界点可能同时落在两个不同簇的核心点邻域里，
    # 那时它和两个簇都密度相连，但两个簇彼此并不相连。
    groups = [None] * n
    for i in range(n):
        if core[i]:
            groups[i] = {find(i)}

    for i in range(n):
        if core[i]:
            continue
        found = set()
        xi = xs[i]
        yi = ys[i]
        for j in range(n):
            if not core[j]:
                continue
            dx = xs[j] - xi
            dy = ys[j] - yi
            if dx * dx + dy * dy <= eps2:
                found.add(find(j))
        # 噪声点的 found 为空集：它不与任何点密度相连（包括它自己）
        groups[i] = found

    out = []
    for a, b in queries:
        # 两个集合有交集 <=> 存在一个核心点能同时走到 a 和 b
        out.append("1" if groups[a] & groups[b] else "0")

    sys.stdout.write("\n".join(out))
    if out:
        sys.stdout.write("\n")


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：{0,1,2} 一个簇；3、4、5 都是噪声
        (
            "6 4 2.0 3\n"
            "0.0 0.0\n"
            "1.2 0.0\n"
            "0.4 1.0\n"
            "12.0 0.0\n"
            "12.5 0.4\n"
            "6.0 6.0\n"
            "0 2\n"
            "0 3\n"
            "3 4\n"
            "1 5\n",
            "1\n0\n0\n0",
        ),
        # 官方样例 2：点 3 是边界点，与核心点 1 同簇
        (
            "8 4 2.0 3\n"
            "0.0 0.0\n"
            "1.5 0.0\n"
            "0.3 1.4\n"
            "3.2 0.2\n"
            "8.0 8.0\n"
            "8.6 8.2\n"
            "8.3 9.5\n"
            "0.0 8.0\n"
            "0 2\n"
            "0 3\n"
            "4 5\n"
            "3 4\n",
            "1\n1\n1\n0",
        ),
        # 距离恰好等于 eps 也要算进邻域：
        # (0,0)、(3,0)、(0,4) 两两距离为 3、4、5，全部 <= 5
        (
            "3 3 5 3\n"
            "0 0\n"
            "3 0\n"
            "0 4\n"
            "0 2\n"
            "0 0\n"
            "1 2\n",
            "1\n1\n1",
        ),
        # 全部是噪声点：噪声点与它自己也不密度相连
        (
            "2 2 1 2\n"
            "0 0\n"
            "10 10\n"
            "0 0\n"
            "0 1\n",
            "0\n0",
        ),
        # 共享边界点：点 6 同时落在簇 A 的核心点 0 与簇 B 的核心点 3 的邻域里，
        # 但 6 自身不是核心点，路径不能经过它，所以两个簇并不相连。
        (
            "7 6 5 4\n"
            "0 0\n"
            "0 4\n"
            "0 -4\n"
            "10 0\n"
            "10 4\n"
            "10 -4\n"
            "5 0\n"
            "0 3\n"
            "6 0\n"
            "6 3\n"
            "1 2\n"
            "1 4\n"
            "6 6\n",
            "0\n1\n1\n1\n0\n1",
        ),
        # 单点 + MinPts = 1：自己就是核心点，自询为 1
        (
            "1 1 1 1\n"
            "0 0\n"
            "0 0\n",
            "1",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 做快速读取，所以这里要提供带 buffer 的文本流
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
