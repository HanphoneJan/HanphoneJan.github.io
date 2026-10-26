"""
P4758. 奇偶之选 - 奇偶曼哈顿分类判定

题面要点：把下标按 (1,2), (3,4), … 顺序配对；n 为奇数时最后一只宝箱
单独成组。要恰好打开 x 个组，且从每个被打开的组里恰好取出一只宝箱，
问取出的宝石总价值能否为奇数。

输入：第一行 T；每组第一行 n x，第二行 n 个价值。
输出：每组一行 "Yes" / "No"。

核心思路（只看奇偶）：
1. 组分三类——「灵活组」（组内一奇一偶，取哪只都行，贡献奇偶可选）、
   「奇数组」（怎么取都是奇）、「偶数组」（怎么取都是偶）。
2. 存在灵活组时必 Yes：它自己让总和的奇偶可自由翻转。
3. 全是奇/偶组时，设奇数组有 o 个、偶数组有 e 个，凑出恰好 x 组需要
   选 k 个奇数组：k ∈ [max(0, x−e), min(o, x)]；总和是奇 ⟺ k 为奇数，
   区间里存在奇数即 Yes。

时间复杂度：每组 O(n)
空间复杂度：O(1)（边读边数）
"""

# https://codefun2000.com/p/P4758
import sys

# @sample-start
"""
样例输入 1:
4
4 2
1 2 3 4
4 2
1 3 2 4
4 2
1 3 5 7
1 1
2

样例输出 1:
Yes
Yes
No
No
"""
# @sample-end


def solve():
    data = sys.stdin.buffer.read().split()
    pos = 0
    t = int(data[pos])
    pos += 1
    out = []
    for _ in range(t):
        n, x = int(data[pos]), int(data[pos + 1])
        pos += 2
        odd_cnt = even_cnt = mix_cnt = 0
        for start in range(0, n, 2):
            p = int(data[pos + start]) & 1
            q = (int(data[pos + start + 1]) & 1) if start + 1 < n else p
            # q 复制成与 p 同值时，该单件组的判定走「同奇偶」分支
            if p != q:
                mix_cnt += 1
            elif p:
                odd_cnt += 1
            else:
                even_cnt += 1
        pos += n

        if mix_cnt > 0:
            # 灵活组自由翻转奇偶，一定能拼出奇数
            out.append("Yes")
        else:
            # 恰好开 x 组须挑 k 个奇数组：k ∈ [max(0, x−even), min(odd, x)]
            lo = max(0, x - even_cnt)
            hi = min(odd_cnt, x)
            lo_odd = lo | 1          # 不小于 lo 的最小奇数
            out.append("Yes" if (lo <= hi and lo_odd <= hi) else "No")
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """官方样例 + 分类边界 + 随机暴力对拍。"""
    import io

    test_cases = [
        # 官方样例（四组合并）
        (
            "4\n4 2\n1 2 3 4\n4 2\n1 3 2 4\n4 2\n1 3 5 7\n1 1\n2\n",
            "Yes\nYes\nNo\nNo",
        ),
        # 有灵活组但 x 超过其它组数量：灵活组反复起作用
        (
            "1\n6 3\n1 2 3 4 1 2\n",
            None,  # 下面手动算
        ),
        # 全是偶数组且 x 为奇数个组：必 No
        (
            "1\n4 1\n2 4 6 8\n",
            "No",
        ),
        # 全是奇数组且只开 1 组：必 Yes
        (
            "1\n2 1\n1 3\n",
            "Yes",
        ),
        # 全是奇数组开 3 组：k=3 奇 -> Yes
        (
            "1\n6 3\n1 3 5 7 9 11\n",
            "Yes",
        ),
        # 奇数组 2 个 + 偶数组 1 个，x=2：k ∈ [1,2]，k=1 有奇 -> Yes
        (
            "1\n6 2\n1 3 2 4 5 7\n",
            "Yes",
        ),
        # 奇数组 2 个 + 偶数组 0 个，x=4：k 只能 4 -> No
        (
            "1\n8 4\n1 3 5 7 9 11 13 15\n",
            "No",
        ),
        # 0 也是偶数：单件 0 的组是偶组
        (
            "1\n1 1\n0\n",
            "No",
        ),
    ]

    for i, case in enumerate(test_cases, 1):
        inp, expected = case
        if expected is None:
            # 6 3 | 1 2 3 4 1 2：组 (1,2)mix (3,4)mix (1,2)mix，全灵活 -> Yes
            expected = "Yes"
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机暴力对拍：小 n 枚举「开哪些组 + 每组取哪一只」全部方案
    import itertools
    import random

    rng = random.Random(20260411)
    ok = True
    for case in range(400):
        n = rng.randint(1, 7)
        a = [rng.randint(0, 9) for _ in range(n)]
        x = rng.randint(1, (n + 1) // 2)
        groups = [a[k:k + 2] for k in range(0, n, 2)]
        m = len(groups)
        brute = False
        for pick in itertools.combinations(range(m), x):
            combos = [g for g in (groups[k] for k in pick)]
            for take in itertools.product(*combos):
                if sum(take) % 2 == 1:
                    brute = True
                    break
            if brute:
                break

        # 期望逻辑同 solve
        odd_cnt = even_cnt = mix_cnt = 0
        for g in groups:
            parities = {v & 1 for v in g}
            if len(parities) > 1:
                mix_cnt += 1
            elif 1 in parities:
                odd_cnt += 1
            else:
                even_cnt += 1
        if mix_cnt:
            expect = True
        else:
            lo = max(0, x - even_cnt)
            hi = min(odd_cnt, x)
            expect = lo <= hi and (lo | 1) <= hi
        if expect != brute:
            ok = False
            print(f"对拍失败: n={n} a={a} x={x} 结论={expect} 暴力={brute}")
            break
    print(f"随机暴力对拍 400 组: {'✓' if ok else '✗'}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
