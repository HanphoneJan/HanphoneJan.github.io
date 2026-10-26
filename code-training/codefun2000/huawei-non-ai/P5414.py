"""
P5414. 奖励清单：最优四件礼品组合 - 位掩码后缀背包 + 按编号贪心

题面要点：
- 从 m 件礼品（唯一编号 b_i、售价 w_i）中恰好挑 4 件，总价不超过 10000。
- 双级判定标准：先让总价尽可能大（接近 10000）；总价并列时，取
  「编号升序排列后」字典序最小的组合，输出这 4 个编号。
- m < 4，或任何 4 件组合的总价都超过 10000 时，输出 0。

输入格式：
- 第 1 行：m（1 <= m <= 2000）；
- 接下来 m 行：每行两个整数 b_i、w_i（均 <= 10000，编号互不相同）。

输出格式：合法组合的 4 个编号（升序、空格分隔）；不存在则输出 0。

核心思路（为什么不用背包 DP 而用位掩码）：
1. 双级判定标准决定了「只记录可达总价集合」就够：最优总价 S* 是
   「恰好 4 件、总价 <= 10000」可达总价里的最大值，不需要 O(m^4) 枚举
   也无需记方案——方案由后面的贪心重建。
2. 贪心按编号从小到大逐位确定答案，不变量是「已选前缀用了 s 元，
   还需 r 件，全部来自编号比上一件大的后缀」。在候选里挑第一个 c 使
       s + w_c + remain_best == S*
   其中 remain_best 是「从 c 之后的后缀恰好选 r-1 件、总价不超过剩余
   预算」的最大总价。若这样的 c 存在，最优解里下一件就取 c：
   更小的 c 都已被检查并证伪，取 c 后复合不变量仍然成立。
3. remain_best 与 S* 都靠位掩码一次算好：把「总价 v 可达」编码成
   大整数的第 v 位。倒序扫一遍编号得到 suffix1/suffix2/suffix3[k]，
   分别是「从下标 k 起恰好选 1/2/3 件能达到的总价集合」；恰好 4 件的
   全局集合由 suffix3 拼出。把不超过预算的位段截出来读最高位，就是
   「不超过预算的最大总价」。C(2000,4) ~ 2.7e12 的枚举被压成
   几千次大整数移位，Python 里毫秒级完成。

时间复杂度：O(m * W / 64)（W = 10000 位宽，大整数按机器字并行运算）
空间复杂度：O(m * W / 64)
"""

# https://codefun2000.com/p/P5414
import sys

BUDGET = 10000

# @sample-start
"""
样例输入 1:
3
1 100
2 200
3 300

样例输出 1:
0
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4
10 1000
20 2000
30 3000
40 4000

样例输出 2:
10 20 30 40
"""
# @sample-end

# @sample-start
"""
样例输入 3:
5
1 2000
2 2000
3 2000
4 2000
5 2000

样例输出 3:
1 2 3 4
"""
# @sample-end

# @sample-start
"""
样例输入 4:
6
1 3000
2 3000
3 3000
4 3000
5 1000
6 1000

样例输出 4:
1 2 3 5
"""
# @sample-end


def solve():
    """输出最优四件组合的编号，或 0。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        print(0)
        return
    it = iter(data)
    m = int(next(it))
    # 按编号升序排好，答案序列天然是升序，贪心扫描的顺序就是字典序。
    items = sorted((int(next(it)), int(next(it))) for _ in range(m))
    ids = [b for b, _ in items]
    prices = [w for _, w in items]
    n = len(items)
    if n < 4:
        print(0)
        return

    # 只保留 0..BUDGET 这些位——总价一旦超过预算就没有意义。
    cap_mask = (1 << (BUDGET + 1)) - 1

    # suffix_k[k]：从下标 k 起（编号更大的剩余部分）恰好选 k 件
    # 能达到的总价集合。把下标 k 自己作为「其中一件」时，其余件来自
    # k+1 之前算好的后缀，天然保证四件互不相同。
    suffix1 = [0] * (n + 1)
    suffix2 = [0] * (n + 1)
    suffix3 = [0] * (n + 1)
    best4 = 0
    for k in range(n - 1, -1, -1):
        w = prices[k]
        suffix1[k] = suffix1[k + 1] | (1 << w)
        suffix2[k] = suffix2[k + 1] | (suffix1[k + 1] << w)
        suffix3[k] = suffix3[k + 1] | (suffix2[k + 1] << w)
        # 下标 k 作第一件，剩下三件取自 k+1 之后的后缀：恰好四件的集合。
        best4 |= suffix3[k + 1] << w

    # 不超过预算的最高可达总价；空集时 bit_length 得 0，target <= 0 即无解。
    target = (best4 & cap_mask).bit_length() - 1
    if target <= 0:
        print(0)
        return

    def best(mask, cap):
        """mask 里不超过 cap 的最高总价；返回 -1 表示没有可行总价。"""
        return (mask & ((1 << (cap + 1)) - 1)).bit_length() - 1

    # 贪心逐位确定答案：used 是已选总价，remaining 是还要选的件数，
    # pos 之后的后缀是候选来源（编号都比上一件大）。
    chosen = []
    used = 0
    pos = 0
    remaining = 4
    while remaining:
        picked = False
        for c in range(pos, n):
            new_used = used + prices[c]
            if new_used > BUDGET:
                continue
            left_need = target - new_used
            if left_need < 0:
                continue
            need = remaining - 1
            if need == 0:
                # 最后一件：总价必须正好落在 S* 上。
                if new_used != target:
                    continue
            else:
                # 再从 c 之后选 need 件，其不超过剩余预算的最大总价
                # 必须正好补到 S*——差一点都不行。
                extra = best((suffix3, suffix2, suffix1)[3 - need][c + 1], left_need)
                if extra != left_need:
                    continue
            chosen.append(ids[c])
            used = new_used
            pos = c + 1
            remaining -= 1
            picked = True
            break
        if not picked:
            # 不变量保证上方总能找到一件；走到这里只可能是防御性路径。
            print(0)
            return
    print(" ".join(map(str, chosen)))


def run_tests():
    """运行嵌入的官方样例与自加用例，方便本地自测。"""
    import io
    import itertools
    import random

    def run(stdin_text):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 快速读取，这里提供带 buffer 的文本流。
        sys.stdin = io.TextIOWrapper(io.BytesIO(stdin_text.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    test_cases = [
        # 官方样例 1：件数不足 4
        ("3\n1 100\n2 200\n3 300\n", "0"),
        # 官方样例 2：恰好 4 件全选，总价正好 10000
        ("4\n10 1000\n20 2000\n30 3000\n40 4000\n", "10 20 30 40"),
        # 官方样例 3：总价全部并列时取编号字典序最小的组合
        ("5\n1 2000\n2 2000\n3 2000\n4 2000\n5 2000\n", "1 2 3 4"),
        # 官方样例 4：四件 3000 超预算，改取三 3000 + 一 1000
        ("6\n1 3000\n2 3000\n3 3000\n4 3000\n5 1000\n6 1000\n", "1 2 3 5"),
        # 恰好 4 件但总价 12000 超预算：任何组合都含全部 4 件，无解
        ("4\n1 3000\n2 3000\n3 3000\n4 3000\n", "0"),
        # 件数够但小编号是 9000 的大件：第一件就必须跳过它，
        # 选 3000+3000+2000+1000 = 9000，输出字典序为 2 3 4 5
        ("5\n1 9000\n2 3000\n3 3000\n4 2000\n5 1000\n", "2 3 4 5"),
    ]

    failures = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run(inp)
        ok = output == expected
        if not ok:
            failures += 1
        print(f"样例 {i}: 期望={expected}, 实际={output} {'✓' if ok else '✗'}")

    # 随机对照（小规模）：与 C(m,4) 全枚举取「总价最大、字典序最小」的
    # 暴力比对 150 组，覆盖编号乱序、总价打平等贪心容易写错的分支。
    rng = random.Random(20260909)
    rand_bad = 0
    for _ in range(150):
        m = rng.randint(1, 9)
        id_list = rng.sample(range(1, 100), m)
        price_list = [rng.randint(1, 4000) for _ in range(m)]
        inp = f"{m}\n" + "\n".join(
            f"{b} {w}" for b, w in zip(id_list, price_list)
        ) + "\n"
        items = sorted(zip(id_list, price_list))
        best_sum, best_seq = 0, None
        for combo in itertools.combinations(range(m), 4):
            s = sum(items[i][1] for i in combo)
            if s <= BUDGET and s > best_sum:
                best_sum, best_seq = s, [items[i][0] for i in combo]
        expected = "0" if best_seq is None else " ".join(map(str, best_seq))
        output = run(inp)
        if output != expected:
            rand_bad += 1
            print(f"随机对照失败: 输入={inp!r} 期望={expected} 实际={output}")
    if rand_bad == 0:
        print("随机对照 150 组: 全部一致 ✓")
    failures += rand_bad

    # 极端规模：m=2000 必须瞬时跑完且输出格式为 4 个整数（方法可行性）。
    big = "2000\n" + "\n".join(
        f"{i} {(i * 37) % 10000 + 1}" for i in range(1, 2001)
    ) + "\n"
    output = run(big)
    parts = output.split()
    if len(parts) == 4 and all(p.isdigit() for p in parts):
        print(f"规模 2000: 输出 {output} ✓")
    else:
        failures += 1
        print(f"规模 2000: 输出格式异常 {output!r} ✗")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
