"""
P5303. 拍品价差总和 - 离散化 + 树状数组维护排名加权和（增量改单件）

对当前出价数组 v（k 件），W(v) = 所有下标对 p<q 的 |v_p - v_q| 之和。
支持单件改价与随时查询。

核心思路：
1. 不重算全部数对，把 W 拆成排序视角的两个量：
       W = 2F - (k-1)·S，其中
       S = Σ v_i（总出价和）
       F = Σ_r r·v_(r)（r 为 0 基排名；排序数组上每个元素乘名次求和）
2. 增量改价只影响 F 的少量项。往多重集里插入 y（插入前总和 S、比 y
   严格小的元素个数 cnt_less、严格小的元素之和 sum_less）：
       ΔF = y·cnt_less + S - sum_less
   推导：新元素排在 cnt_less 个更小元素以及已排定的 c 个同值元素之后，
   自身贡献 y·(cnt_less + c)；比 y 大的元素名次各 +1，共同贡献它们的
   总和；同值元素的 c·y 两处一正一负相消，只剩 y·cnt_less + S - sum_less。
   删除一个值取负即可。
3. cnt_less / sum_less 用两棵树状数组：值域取「初值 ∪ 所有修改值」离散化，
   每个离散下标维护出现次数与出现值之和，前缀查询给出严格小于 y 的部分
   （同值元素共享下标，前缀到 idx-1 即严格小于）。
4. 每次查询输出 2F - (k-1)·S，O(1)。

输入格式：
- 第 1 行：G；
- 每段：第一行 k、q；第二行 k 个初值；接下来若干行指令，
  "1 p y" 为改价、"2" 为查询。
  注：按官网样例，样例 1 段头 q=4 但实际给出 5 条指令，样例 2 q=2 配
  3 条指令；而本场考试的原始数据口径是「操作数与段头一致」。解析按
 两者兼容实现：段内先严格读段头声明的操作数；最后一段若仍有剩余
  整数，按自描述指令流继续吸收（"1" 后面跟 p、y，"2" 单独一条）。

输出格式：
- 每条查询一行一个整数。

时间复杂度：每条指令 O(log n)，总计 O((k+q) log n)
空间复杂度：O(k + q)（值域离散化）
"""

# https://codefun2000.com/p/P5303
import io
import sys
from bisect import bisect_left


def solve():
    data = sys.stdin.buffer.read().split()
    pos = 0
    g = int(data[pos])
    pos += 1
    out = []
    for section in range(g):
        k = int(data[pos])
        declared_ops = int(data[pos + 1])
        pos += 2
        init_vals = [int(x) for x in data[pos:pos + k]]
        pos += k

        # 值域离散化：初值 + 所有修改目标一起排序去重
        uniq_set = set(init_vals)
        # 先按「自描述」语法把指令切出来；段头声明的操作数是保底下限
        ops = []
        for _ in range(declared_ops):
            tok = data[pos]
            pos += 1
            if tok == b"1":
                p = int(data[pos]) - 1
                y = int(data[pos + 1])
                pos += 2
                ops.append((1, p, y))
            else:
                ops.append((2, 0, 0))
        # 官网样例的口径：最后一段可能比段头多出若干条指令。
        # 只在身后再无别的段时继续吸收，避免把下一段的段头当成指令。
        if section == g - 1:
            n_tokens = len(data)
            while pos < n_tokens:
                tok = data[pos]
                if tok == b"1" and pos + 2 < n_tokens:
                    p = int(data[pos + 1]) - 1
                    y = int(data[pos + 2])
                    pos += 3
                    ops.append((1, p, y))
                elif tok == b"2":
                    pos += 1
                    ops.append((2, 0, 0))
                else:
                    break
        for typ, _, y in ops:
            if typ == 1:
                uniq_set.add(y)

        uniq = sorted(uniq_set)
        u = len(uniq)
        idx_of = {val: i + 1 for i, val in enumerate(uniq)}  # 树状数组 1 基
        cnt_bit = [0] * (u + 1)
        sum_bit = [0] * (u + 1)

        def bit_add(idx, dc, ds):
            while idx <= u:
                cnt_bit[idx] += dc
                sum_bit[idx] += ds
                idx += idx & -idx

        def bit_prefix(idx):
            """前缀 [1..idx]：出现次数与出现值之和"""
            c = 0
            s = 0
            while idx > 0:
                c += cnt_bit[idx]
                s += sum_bit[idx]
                idx &= idx - 1
            return c, s

        total = sum(init_vals)
        # 初状态 F = Σ r·v_(r)：排序扫描就是 Σ v 与前面元素的绝对差
        f = 0
        prefix = 0
        for r, val in enumerate(sorted(init_vals)):
            f += r * val
            prefix += val
        for val in init_vals:
            bit_add(idx_of[val], 1, val)

        def remove(z):
            nonlocal total, f
            q_idx = idx_of[z]
            cnt_less, sum_less = bit_prefix(q_idx - 1)
            f -= z * cnt_less + (total - z) - sum_less
            bit_add(q_idx, -1, -z)
            total -= z

        def insert(y):
            nonlocal total, f
            q_idx = idx_of[y]
            cnt_less, sum_less = bit_prefix(q_idx - 1)
            f += y * cnt_less + total - sum_less
            bit_add(q_idx, 1, y)
            total += y

        values = init_vals
        for typ, p, y in ops:
            if typ == 1:
                x = values[p]
                remove(x)
                insert(y)
                values[p] = y
            else:
                out.append(str(2 * f - (k - 1) * total))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """官网样例 + 场次考试来源的两组样例 + 全枚举暴力对拍。"""
    import random

    test_cases = [
        # 官网样例 1（段头 q=4，实际 5 条指令，含末段补吸收路径）
        ("1\n3 4\n0 5 2\n2\n1 3 9\n2\n1 1 5\n2\n", "10\n18\n8"),
        # 官网样例 2（q=2 配 3 条指令）
        ("1\n2 2\n7 7\n2\n1 2 3\n2\n", "0\n4"),
        # 真实口径样例：2026-08-25 场次第一组，操作数与段头一致（q=3 恰好 3 条）
        (
            "2\n3 3\n1 3 6\n2\n1 2 8\n2\n2 3\n-4 4\n2\n1 1 4\n2\n",
            "10\n14\n8\n0",
        ),
        # 真实口径样例：初值全等再改一件
        ("1\n4 3\n2 2 2 2\n2\n1 3 10\n2\n", "0\n24"),
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
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")

    # 暴力对拍：每次查询老实枚举全部数对；指令流按严格 q 口径生成
    def run_ref(vals, ops):
        outs = []
        for op in ops:
            if op[0] == 1:
                vals[op[1]] = op[2]
            else:
                outs.append(
                    sum(
                        abs(vals[a] - vals[b])
                        for a in range(len(vals))
                        for b in range(a + 1, len(vals))
                    )
                )
        return outs

    import io as _io

    def feed_strict(vals, ops):
        """把指令按「操作数与段头一致」的口径喂给 solve()"""
        lines = ["1", f"{len(vals)} {len(ops)}", " ".join(map(str, vals))]
        for op in ops:
            if op[0] == 1:
                lines.append(f"1 {op[1] + 1} {op[2]}")
            else:
                lines.append("2")
        inp = "\n".join(lines) + "\n"
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = _io.TextIOWrapper(_io.BytesIO(inp.encode("utf-8")))
        sys.stdout = _io.StringIO()
        try:
            solve()
            return [int(x) for x in sys.stdout.getvalue().split()]
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    random.seed(20261027)
    fail = None
    for case_no in range(1, 801):
        k = random.randint(1, 15)
        q = random.randint(1, 15)
        vals = [random.randint(-6, 6) for _ in range(k)]
        ops = []
        for _ in range(q):
            if random.random() < 0.5:
                ops.append((1, random.randint(0, k - 1), random.randint(-8, 8)))
            else:
                ops.append((2, 0, 0))
        got = feed_strict(vals, ops)
        want = run_ref(vals[:], ops)
        if got != want:
            fail = (case_no, vals, ops, want, got)
            break
    print("暴力对拍 800 组随机指令流：" + ("全部一致" if fail is None else f"失败 {fail}"))

    def feed_strict_lax(vals, declared_ops):
        """段头声明少于实际指令数：走末段补吸收路径"""
        lines = ["1", f"{len(vals)} {declared_ops}", " ".join(map(str, vals))]
        lines.append("1 2 -3")
        lines.append("2")
        lines.append("2")
        inp = "\n".join(lines) + "\n"
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = _io.TextIOWrapper(_io.BytesIO(inp.encode("utf-8")))
        sys.stdout = _io.StringIO()
        try:
            solve()
            return [int(x) for x in sys.stdout.getvalue().split()]
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    # 场次考试来源样例的口径（q=1 恰好 1 条）+ 官网口径的末段补吸收路径各走一遍：
    # 「1 2 -3 / 2 / 2」，段头只声明 1 条，实际给 3 条，得走到补吸收
    vals0 = [0, 9]
    want = run_ref(list(vals0), [(1, 1, -3), (2, 0, 0), (2, 0, 0)])
    got = feed_strict_lax(vals0, 1)
    status = "✓" if got == want else "✗"
    print(f"末段补吸收路径: 期望={want}, 实际={got} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
