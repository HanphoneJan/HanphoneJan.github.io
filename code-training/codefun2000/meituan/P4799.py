"""
P4799. 晶石净化 - 按（能量值, 下标）排序 + 标记删除（模拟）

题意：n 个晶石排成一行，进行 m 轮净化。每轮移除当前剩余晶石中能量值最小的
一个；能量值相同则移除最靠左的。最后按原始顺序输出剩余序列。

关键观察：m 轮删的永远是「当前最小、平局取最左」，而这个选择与删除发生的
次序无关——第 r 轮移除的必定是全体晶石按（能量值, 下标）排序后的第 r 个。
理由：按这个序比较，序数在前的晶石若还在（它本来就比本轮候选更小/更靠左），
就必然先于本轮候选被选中；所以整个 m 轮操作正好删掉排序后的前 m 个。
于是不用逐轮模拟，一次排序 + 标记即可，剩余的按原始顺序输出。

输入格式：
- 第 1 行：测试组数 T；
- 每组两行：第一行 n 和 m（0 <= m < n），第二行 n 个能量值。

输出格式：
- 每组一行，剩余晶石的能量值，空格分隔。

时间复杂度：O(n log n)（所有组的 n 总和不超过 4*10^5）
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4799
import sys

# @sample-start
"""
样例 1:
1
5 3
2 3 2 1 2
->
3 2
"""
# @sample-end

# @sample-start
"""
样例 2:
1
3 0
5 3 7
->
5 3 7
"""
# @sample-end

# @sample-start
"""
样例 3:
1
4 3
4 4 4 4
->
4
"""
# @sample-end


def solve():
    """按（能量值, 下标）排序删除前 m 个，输出剩余序列。"""
    data = sys.stdin.buffer.read().split()
    pos = 1
    t = int(data[0])
    out = []
    for _ in range(t):
        n = int(data[pos])
        m = int(data[pos + 1])
        pos += 2
        vals = [int(x) for x in data[pos:pos + n]]
        pos += n

        # 排序键 (能量值, 下标) 同时表达了两条规则：
        # 能量值小者优先；能量值相同时下标小（更靠左）者优先。
        # 排序后的前 m 个正是 m 轮净化会依次移除的晶石。
        order = sorted(range(n), key=lambda i: (vals[i], i))
        removed = set(order[:m])

        out.append(" ".join(str(vals[i]) for i in range(n) if i not in removed))
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

    def brute(vals, m):
        """参照实现：用逐轮堆模拟还原规则本身，验证排序等价性。"""
        import heapq
        hp = [(v, i) for i, v in enumerate(vals)]
        heapq.heapify(hp)
        alive = [True] * len(vals)
        for _ in range(m):
            v, i = heapq.heappop(hp)
            while not alive[i]:
                v, i = heapq.heappop(hp)
            alive[i] = False
        return [v for i, v in enumerate(vals) if alive[i]]

    cases = [
        # 官方样例 1：平局时移除最靠左的 2
        ("1\n5 3\n2 3 2 1 2\n", "3 2"),
        # 官方样例 2：m=0 不删任何晶石
        ("1\n3 0\n5 3 7\n", "5 3 7"),
        # 官方样例 3：全相等时逐个移除最左边
        ("1\n4 3\n4 4 4 4\n", "4"),
        # 边界：m = n-1 只剩最大值（平局时剩最靠右的最大值）
        ("1\n4 3\n2 9 9 1\n", "9"),
        # 已升序排列：每轮删的都是最左边的（最小的）
        ("1\n5 2\n1 2 3 4 5\n", "3 4 5"),
        # 已降序排列：删的是能量值全局最小的若干个
        ("1\n5 2\n5 4 3 2 1\n", "5 4 3"),
        # 最小值分散在两端：平局取左，第二轮仍在左端
        ("1\n4 2\n1 3 3 1\n", "3 3"),
        # 多组数据混排
        ("2\n3 1\n7 7 7\n5 4\n1 2 2 3 3\n", "7 7\n3"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        got = run_once(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")

    # 随机对拍：与逐轮堆模拟比较
    rng = random.Random(20260418)
    ok = True
    for trial in range(300):
        n = rng.randint(1, 18)
        m = rng.randint(0, n - 1)
        vals = [rng.randint(1, n) for _ in range(n)]
        inp = "1\n%d %d\n%s\n" % (n, m, " ".join(map(str, vals)))
        got = run_once(inp)
        want = " ".join(map(str, brute(vals, m)))
        if got != want:
            ok = False
            print(f"对拍失败: vals={vals}, m={m}, 期望={want}, 实际={got}")
    print("随机对拍:", "全部通过" if ok else "存在失败")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
