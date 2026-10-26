"""
P4760. 跳转指令的开销 - 函数图染色 + 环前缀和

题意：n 条指令，从 i 执行完必跳到 next_i（每个点出度为 1 的函数图）。
第 i 条指令每次被第 t 次执行时产生 t*i 的开销（t 对每条指令独立计数）。
q 次询问：从 p 开始执行 k 条指令（含起始那次），求总开销模 1e9+7。

结构观察：每个点出度为 1，图是「若干棵树挂向环 + 若干个环」的函数图。
从 p 出发的执行序列必先走完 tail 链（tail 链上的点各只被执行一次），
然后进入环内循环。设 d = depth(p)（p 走到第一个环点需要 d 步）：
- k <= d：全程没进环，k 个点各执行一次，开销 = 这 k 个点编号之和；
- k > d：tail 部分（d 个点，各一次）开销为编号和；环上执行 c = k - d 条，
  从入口点在环中的位置 start 起，第 r 条代价是 (r // L + 1)，
  其中 L 是环长——每绕一圈同一批点各自的历史执行次数加一。
  把 c 拆成 full 圈 + 剩 rem 条：每个环点先被执行 full 次（权重 1..full），
  从 start 起的前 rem 个点再多一次执行（权重 full+1）。于是

    环开销 = full*(full+1)/2 * (环上点的编号和)
           + (full+1) * (从 start 出发 rem 个环点编号的前缀和)。

实现映射：
- 用一次迭代染色的 DFS（非递归）标记每个点：所在环编号、环内位置、
  tail 深度 d、tail 编号后缀和 F（进环之前所有点各一次的编号和）、
  以及进环的入口点 entry；
- 每个环存「环点编号和」与「环序列重复两遍的前缀和 pre2」，
  从任意 start 取 rem 个的前缀和用 pre2[start+rem]-pre2[start] 在 O(1) 得到；
- k <= d 的分支要走到路径上第 k 个点：q 次询问各自跳 k 步不能线性走，
  用倍增表 O(log n) 完成。k 本身可达 1e9，但 c = k - d 的环内循环部分
  由上面的闭式给出，不需要逐条模拟。

输入格式：
- 第 1 行：n 和 q；
- 第 2 行：next_1 .. next_n；
- 接下来 q 行：每行 p 和 k。

输出格式：
- 每个询问一行，总开销对 1e9+7 取模。

时间复杂度：O(n log n + q log n)（染色与前后缀预处理 O(n)，倍增表 O(n log n)，
环内询问 O(1)，进 tail 分支的询问 O(log n)）
空间复杂度：O(n log n)
"""

# https://codefun2000.com/p/P4760
import sys

MOD = 10**9 + 7

# @sample-start
"""
样例 1:
1 2
1
1 1
1 5
->
1
15
"""
# @sample-end

# @sample-start
"""
样例 2:
2 3
2 1
1 1
1 4
2 3
->
1
9
7
"""
# @sample-end

# @sample-start
"""
样例 3:
5 4
2 3 4 2 4
1 2
1 8
5 4
5 10
->
3
34
14
59
"""
# @sample-end


def solve():
    """函数图染色 + 环前缀和，逐询问输出取模开销。"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    n = int(next(it))
    q = int(next(it))
    nxt = [0] * (n + 1)
    for v in range(1, n + 1):
        nxt[v] = int(next(it))

    queries = []
    for _ in range(q):
        p = int(next(it))
        k = int(next(it))
        queries.append((p, k))

    LOG = max(1, max(n, 1).bit_length())

    # 倍增表：只服务 k <= depth(p) 的「走 k 步还在 tail 上」的分支。
    up = [nxt[:]]
    for lv in range(1, LOG):
        prev = up[-1]
        up.append([prev[prev[v]] for v in range(n + 1)])

    # 迭代染色：0 未访问，1 在当前路径上，2 已归属。
    color = [0] * (n + 1)
    on_path = [0] * (n + 1)
    depth = [0] * (n + 1)   # tail 上还需走多少步进环（环点为 0）
    f_tail = [0] * (n + 1)  # tail 点编号后缀和：自己 + 链上后续 tail 点
    entry = [0] * (n + 1)   # 沿链走到的第一个环点
    cyc_id = [0] * (n + 1)
    cyc_pos = [0] * (n + 1)
    cyc_data = []           # 每个环: (L, 编号和, 重复两遍的前缀和)

    for s in range(1, n + 1):
        if color[s]:
            continue
        path = []
        u = s
        while color[u] == 0:
            color[u] = 1
            on_path[u] = len(path) + 1
            path.append(u)
            u = nxt[u]

        if color[u] == 1:
            # u 在当前路径上 -> 找到新环
            ci = on_path[u] - 1
            cyc = path[ci:]
            cid = len(cyc_data)
            L = len(cyc)
            total = 0
            pre2 = [0] * (2 * L + 1)
            acc = 0
            for i in range(2 * L):
                acc = (acc + cyc[i % L]) % MOD
                pre2[i + 1] = acc
            total = pre2[L]
            cyc_data.append((L, total, pre2))
            for i, v in enumerate(cyc):
                color[v] = 2
                depth[v] = 0
                f_tail[v] = 0
                entry[v] = v
                cyc_id[v] = cid
                cyc_pos[v] = i
            for j in range(ci - 1, -1, -1):
                v = path[j]
                nxtv = path[j + 1]
                color[v] = 2
                depth[v] = depth[nxtv] + 1
                f_tail[v] = (v + f_tail[nxtv]) % MOD
                entry[v] = entry[nxtv]
        else:
            # u 已归属既有环：当前路径全是 tail 点
            for j in range(len(path) - 1, -1, -1):
                v = path[j]
                nxtv = path[j + 1] if j + 1 < len(path) else u
                color[v] = 2
                depth[v] = depth[nxtv] + 1
                f_tail[v] = (v + f_tail[nxtv]) % MOD
                entry[v] = entry[nxtv]

    out = []
    for p, k in queries:
        d = depth[p]
        if k <= d:
            # 前 k 条全部在 tail 上且各执行一次：开销 = 前 k 个点的编号和。
            # 用 F[p] - F[第 k 步的点] 得到这 k 个编号之和。
            v = p
            step = k
            for lv in range(LOG - 1, -1, -1):
                if step >= (1 << lv):
                    step -= 1 << lv
                    v = up[lv][v]
            out.append(str((f_tail[p] - f_tail[v]) % MOD))
        else:
            tail_cost = f_tail[p]
            c = k - d  # 环上执行的条数（>=1）
            entry_node = entry[p]
            L, total, pre2 = cyc_data[cyc_id[entry_node]]
            start = cyc_pos[entry_node]
            full, rem = divmod(c, L)
            # 每个环点先被执行 full 次（权重 1..full），
            # 再有 从 start 数起前 rem 个点各多一次（权重 full+1）。
            base = (full * (full + 1) // 2) % MOD
            cyc_cost = base * total % MOD
            if rem:
                cyc_cost = (cyc_cost + (full + 1) * (pre2[start + rem] - pre2[start])) % MOD
            out.append(str((tail_cost + cyc_cost) % MOD))

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

    def ref_cost(nxt, p, k):
        """独立参照：k 小于阈值时逐条模拟；大 k 以「首次重复 + 从环入口
        一整圈」为检查点——此后每一整圈，各环点的历史执行次数各 +1，
        权重随圈数增长（第 j 圈贡献 w0 + j*环点编号和），再补不足一圈的
        s 步。与 solve() 的 pre2 闭式是两套思路，可互验。"""
        if k <= 5000:
            cnt = {}
            u = p
            total = 0
            for _ in range(k):
                cnt[u] = cnt.get(u, 0) + 1
                total += cnt[u] * u
                u = nxt[u]
            return total % MOD
        # 走到第一次重复：路径上每个点恰好执行一次，u 指向环入口
        cnt = {}
        u = p
        total = 0
        seen = set()
        while u not in seen:
            seen.add(u)
            cnt[u] = cnt.get(u, 0) + 1
            total += cnt[u] * u
            u = nxt[u]
        entry = u
        # 从环入口起完整一圈（这一圈里环点各 +1 次执行）
        ring = []
        v = entry
        while True:
            ring.append(v)
            L = len(ring)
            cnt[v] = cnt.get(v, 0) + 1
            total += cnt[v] * v
            v = nxt[v]
            if v == entry:
                break
        steps = len(seen) + L  # 已执行条数
        rest = k - steps
        m, s = divmod(rest, L)
        w0 = sum(cnt[v] * v for v in ring)  # 检查点处环点的权重和
        ring_sum = sum(ring)
        # 第 j 圈（j=1..m）：各环点执行次数再 +1，贡献 w0 + j*ring_sum
        total += m * w0 + ring_sum * m * (m + 1) // 2
        for v in ring:
            cnt[v] += m  # 虚拟跑过 m 圈后，环点计数补上
        # 再走 s 步（不足一圈），从 entry 起，每步权重 cnt+1
        u = entry
        for _ in range(s):
            cnt[u] = cnt.get(u, 0) + 1
            total += cnt[u] * u
            u = nxt[u]
        return total % MOD

    cases = [
        # 官方样例 1：自环，1+2+...+15 的模意义总开销
        ("1 2\n1\n1 1\n1 5\n", "1\n15"),
        # 官方样例 2：1<->2 两个点的环
        ("2 3\n2 1\n1 1\n1 4\n2 3\n", "1\n9\n7"),
        # 官方样例 3：环 2->3->4->2，1 和 5 各是 1 步 tail
        ("5 4\n2 3 4 2 4\n1 2\n1 8\n5 4\n5 10\n", "3\n34\n14\n59"),
        # 边界：k 恰好等于 depth(p)，k 条全走 tail（编号和分支）
        ("3 1\n2 3 3\n2 1\n", "2"),
        # 边界：k = depth + 1：tail 一个点 + 环上一条
        ("3 1\n2 3 3\n1 2\n", "3"),
        # 自环从自身出发跑 3 轮：1+2+3
        ("1 1\n1\n1 3\n", "6"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        got = run_once(inp)
        status = "✓" if got == expected else "✗"
        print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")

    # 随机对拍：小图、大 k，与独立参照（模拟/检查点外推）比对
    rng = random.Random(20260411)
    ok = True
    for trial in range(120):
        n = rng.randint(1, 12)
        nxt = [0] + [rng.randint(1, n) for _ in range(n)]
        qs = []
        for _ in range(8):
            p = rng.randint(1, n)
            k = rng.choice([1, 2, 3, 50, 4999, 5001, rng.randint(1, 10**9)])
            qs.append((p, k))
        want = "\n".join(str(ref_cost(nxt, pp, kk)) for pp, kk in qs)
        inp = "%d %d\n%s\n%s\n" % (
            n, len(qs), " ".join(map(str, nxt[1:])),
            "\n".join("%d %d" % qq for qq in qs),
        )
        got = run_once(inp)
        if got != want:
            ok = False
            print(f"对拍失败: n={n} nxt={nxt} 查询={qs}\n期望:\n{want}\n实际:\n{got}")
    print("随机对拍:", "全部通过" if ok else "存在失败")

    # 参照自身的中段校验：k 在 5000 ~ 30000 的外推公式与逐条模拟一致
    ok2 = True
    for trial in range(40):
        n = rng.randint(1, 10)
        nxt = [0] + [rng.randint(1, n) for _ in range(n)]
        for _ in range(2):
            p = rng.randint(1, n)
            k = rng.randint(5001, 30000)
            cnt = {}
            u = p
            total = 0
            for _ in range(k):
                cnt[u] = cnt.get(u, 0) + 1
                total += cnt[u] * u
                u = nxt[u]
            if ref_cost(nxt, p, k) != total % MOD:
                ok2 = False
                print(f"参照外推自检失败: nxt={nxt} p={p} k={k}")
    print("参照外推自检:", "全部通过" if ok2 else "存在失败")

    # 大规模趋势检查：10 万点长链挂 3 长环，10 万询问，
    # 结果与一次大范围抽样重新模拟一致（数值上抽样部分重新算）
    import time
    n = 100000
    ring_len = 99900
    # 环：1 -> 2 -> ... -> ring_len -> 1；tail：ring_len+1 -> ... -> n -> 1
    nxt = [0] * (n + 1)
    for v in range(1, ring_len):
        nxt[v] = v + 1
    nxt[ring_len] = 1
    for v in range(ring_len + 1, n):
        nxt[v] = v + 1
    nxt[n] = 1
    qlines = ["100000"]
    rng2 = random.Random(42)
    qs = []
    for _ in range(100000):
        p = rng2.randint(1, n)
        k = rng2.randint(1, 10**9)
        qs.append((p, k))
        qlines.append("%d %d" % (p, k))
    inp = "%d %d\n%s\n%s\n" % (n, 100000, " ".join(map(str, nxt[1:])), "\n".join(qlines[1:]))
    t0 = time.time()
    got = run_once(inp).split("\n")
    dt = time.time() - t0
    # 抽样若干查询做直接模拟（k 截断不看全循环节,靠同余结构对拍会漏环内权重,
    # 这里只验证 k<=n 的小 k 全模拟一致）
    small_ok = True
    cnt = [0] * (n + 1)
    for idx in rng2.sample(range(100000), 30):
        p, k = qs[idx]
        if k <= 3000:
            cc = [0] * (n + 1)
            u = p
            total = 0
            for _ in range(k):
                cc[u] += 1
                total += cc[u] * u
                u = nxt[u]
            small_ok &= int(got[idx]) == total % MOD
    print(f"10万点耗时 {dt:.2f}s; 小k抽样模拟一致: {'是' if small_ok else '否'}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
