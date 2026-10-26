"""
P4801. 脉冲同步 - 位置映射 + 顺序关系 DP（最长链 + 字典序最大构造）

题意：两段长度为 n 的排列 A、B，求最长公共子序列的长度，并在所有最长
公共子序列中输出字典序最大的那条。

关键观察 1（把公共子序列变成「链」）：两段都是 1..n 的排列，每个数恰好
出现一次。选中的这批数，在 A 中按某种顺序出现、在 B 中也要按同样的顺序
出现——所以一条公共子序列就是数集 {1..n} 上的这样一组数：把每个数 v 映射
到它在两段中的出现位置构成一对坐标，被选中的数必须让两维坐标同时严格递增。
构造数组 C[i] = posB[A[i]]，则「从 A 中选出合法子序列」与「C 的上升子序列」
一一对应（选出的数在 B 中也要依次出现，等价于它们的 posB 依次增大）。
最长公共子序列长度 = C 的最长上升子序列（LIS）长度 K。

关键观察 2（字典序最大怎样贪）：可以在值域上做贪心。先对 A 的每个下标 i
算出 f(i) = 从 i 出发（含自身）还能接出的最长链长（C 的后缀 LIS），任何
一条长度为 K 的链，第 t 个选中元素必须恰好满足 f = K-t+1：下界来自
「后面还要接满剩余的个数」，上界来自 f(i) 的定义（链上排它后面的元素
最多只能贡献 f(i)-1）。于是每个数只属于唯一的一个 f 值，把它称作这个
数的「格」；一条最长的链恰好从格 K, K-1, ..., 1 里各取一个数。构造按格
进行：同一 f 值的数收进一个桶并按值降序排好，rem 从 K 逐层降到 1，每层
在 bucket[rem] 里找第一个「A 位置在已选末位之后、posB 也在末位之后」的
数——第一个满足的就是本层最优选（本层任意满足条件的数都能凑满 K，取
值最大者为字典序最优）；坐标条件失败的数，随着已选末位只会往右上收紧，
此格以后永远没资格被再看一次。

实现映射：
- f(i) 用「从右往左 + 树状数组上取前缀最大值」在 O(n log n) 内算出：
  把 C 值反转成 n-C 后，C[j] > C[i] 的查询变成一段前缀最大值查询；
- 把带相同 f 的值收集进桶 bucket[r]，桶内按值降序排好；
- 贪心时 rem 从 K 递减到 1，每次只在 bucket[rem] 里按值降序找第一个
  「A 位置与 posB 都已越过已选末位」的数。

输入格式：
- 第 1 行：测试组数 T；
- 每组三行：n、排列 A（n 个数）、排列 B（n 个数）。

输出格式：
- 每组两行：K 与字典序最大的最长同步序列。

时间复杂度：O(sum(n log n))，n 的总和不超过 2*10^5
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4801
import sys

# @sample-start
"""
样例 1:
1
5
1 2 3 4 5
5 4 3 2 1
->
1
5
"""
# @sample-end

# @sample-start
"""
样例 2:
1
6
1 3 2 4 6 5
1 2 3 4 5 6
->
4
1 3 4 6
"""
# @sample-end

# @sample-start
"""
样例 3:
1
2
2 1
1 2
->
1
2
"""
# @sample-end


def solve():
    """位置映射 + 后缀 LIS + 按值降序贪心，输出长度与序列。"""
    data = sys.stdin.buffer.read().split()
    pos = 1
    t = int(data[0])
    out = []
    for _ in range(t):
        n = int(data[pos])
        pos += 1
        arr = [int(x) for x in data[pos:pos + n]]
        pos += n
        brr = [int(x) for x in data[pos:pos + n]]
        pos += n

        # 每个值在 B 中的位置（0 基）
        pos_b = [0] * (n + 1)
        for j, v in enumerate(brr):
            pos_b[v] = j
        # A 下标 i 处上的值的 posB，构成 C
        c = [pos_b[v] for v in arr]

        # f[i] = 1 + max{ f[j] : j>i, C[j] > C[i] }，从右往左用树状数组求前缀最大。
        # 把 C 值 m 映射到 m' = n - m 后，"C[j] > C[i]" 变成
        # "m' < n - C[i]"，即前缀 [1 .. n - C[i]] 的最大值。
        fen = [0] * (n + 1)  # 1 基，存前缀最大值

        def query(i):
            best = 0
            while i > 0:
                if fen[i] > best:
                    best = fen[i]
                i -= i & (-i)
            return best

        def update(i, v):
            while i <= n:
                if v > fen[i]:
                    fen[i] = v
                i += i & (-i)

        f = [0] * n
        buckets = [[] for _ in range(n + 2)]
        k = 0
        for i in range(n - 1, -1, -1):
            fi = 1 + query(n - c[i])
            f[i] = fi
            update(n - c[i] + 1, fi)
            if fi > k:
                k = fi
            # 桶里同时记录值与它的两个坐标（A 中的位置、posB），供贪心使用
            buckets[fi].append((arr[i], i, c[i]))

        # f 的填充按 A 下标从右往左进行，桶内顺序不是值序；
        # 贪心要求「值大者优先」，按值降序排一次（值在排列里互不相同）。
        for r in range(1, k + 1):
            buckets[r].sort(reverse=True)

        # 贪心：rem 从 K 降到 1，在 bucket[rem] 里找第一个
        # 「A 位置在已选末位之后、posB 也在末位之后」的数（值已降序）。
        # 位置/posB 的下界只增不减，单次扫不过的数后续也无望，直接略过。
        ans = []
        last_a = -1
        last_b = -1
        rem = k
        for r in range(k, 0, -1):
            bv = buckets[r]
            for v, ia, ib in bv:  # 已按值降序
                if ia > last_a and ib > last_b:
                    ans.append(v)
                    last_a = ia
                    last_b = ib
                    break
            rem -= 1

        out.append(str(k))
        out.append(" ".join(map(str, ans)))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的官方样例与自加的边界/变形用例。"""
    import io
    import random

    def run_once(inp):
        old = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().rstrip("\n")
        finally:
            sys.stdin, sys.stdout = old

    def brute_two(a, b):
        """参照实现：枚举 A 的全部子序列，取为双方公共子序列的最长者，
        同长中取值序列字典序最大，O(2^n) 可承受 n<=8。"""
        from itertools import combinations

        def is_sub(vals, t):
            it = iter(t)
            return all(v in it for v in vals)

        for m in range(len(a), 0, -1):
            best = None
            for comb in combinations(range(len(a)), m):
                vals = tuple(a[i] for i in comb)
                if is_sub(vals, b):
                    if best is None or vals > best:
                        best = vals
            if best is not None:
                return m, list(best)
        return 0, None

    cases = [
        # 官方样例 1：完全逆序，只能选一个数，取 5
        ("1\n5\n1 2 3 4 5\n5 4 3 2 1\n", "1\n5"),
        # 官方样例 2：B 升序，在 A 中挑最长上升子序列，字典序最大 1 3 4 6
        ("1\n6\n1 3 2 4 6 5\n1 2 3 4 5 6\n", "4\n1 3 4 6"),
        # 官方样例 3：n=2 逆序对，取 2
        ("1\n2\n2 1\n1 2\n", "1\n2"),
        # 两段完全相同：最长同步序列是整段，本身就是字典序最大（排列递增）
        ("1\n6\n3 1 4 2 6 5\n3 1 4 2 6 5\n", "6\n3 1 4 2 6 5"),
        # B 逆序、A 升序：K=1，取 n
        ("1\n7\n1 2 3 4 5 6 7\n7 6 5 4 3 2 1\n", "1\n7"),
        # 字典序最大在首个元素就分高下：值 3 与 1 都能当链首，应取 3
        ("1\n3\n3 1 2\n1 3 2\n", "2\n3 2"),
        # 最后一层的 posB 坐标检查：值 2 在 B 里位于 4、5 之前，不能接在尾巴上
        ("1\n5\n3 4 5 1 2\n2 4 3 5 1\n", "3\n4 5 1"),
        # 多组数据混排
        ("2\n2\n1 2\n2 1\n3\n1 2 3\n3 2 1\n", "1\n2\n1\n3"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        got = run_once(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")

    # 随机对拍（n<=8）：长度用 BFS 式参考、序列用「是双方子序列 + 字典序最大」双重验证
    rng = random.Random(20260418)
    ok = True
    for trial in range(200):
        n = rng.randint(2, 8)
        a = list(range(1, n + 1))
        rng.shuffle(a)
        b = list(range(1, n + 1))
        rng.shuffle(b)
        got = run_once("1\n%d\n%s\n%s\n" % (n, " ".join(map(str, a)), " ".join(map(str, b))))
        lines = got.split("\n")
        k = int(lines[0])
        seq = list(map(int, lines[1].split())) if k else []
        # 长度与参照实现一致
        blen, bseq = brute_two(a, b)
        # 声称的序列必须是两段的公共子序列，且长度正确
        def is_sub(s, t):
            it = iter(t)
            return all(v in it for v in s)
        # 参照实现给出的也必须是字典序 <= 我们的
        if k != blen or not is_sub(seq, a) or not is_sub(seq, b) or bseq is not None and seq < bseq:
            ok = False
            print(f"对拍失败: A={a} B={b} 期望长={blen} 参照序列={bseq} 实际长={k} 实际序列={seq}")
    print("随机对拍:", "全部通过" if ok else "存在失败")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
