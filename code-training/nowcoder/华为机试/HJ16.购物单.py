# @nc app=nowcoder id=f9c6f980eeec43ef85be20755ddbeaf4 topic=37 question=21239 lang=Python3
# 2026-09-25 15:41:12
# https://www.nowcoder.com/practice/f9c6f980eeec43ef85be20755ddbeaf4?tpId=37&tqId=21239
# [HJ16] 购物单

"""
HJ16. 购物单 —— 分组背包（含依赖）

题目描述：
在预算 N 元内购买商品，每件商品有价格 v、重要度 p，可买可不买。
部分商品是"主件"，部分是"附件"（每个主件最多有 2 个附件）。
要购买附件必须先购买其主件。
目标：使"价格 × 重要度"的总和最大。

输入格式：
- 第1行：预算 N、商品总数 m
- 第 m 行：每行 v(价格) p(重要度) q(主件编号；q=0 表示是主件，否则为附件所属主件编号)

输出格式：
- 一个整数，表示不超过预算时"价格×重要度"总和的最大值

核心思路：
- 这是"分组背包"问题：每个主件连同它的附件构成一组。
- 组内枚举所有"合法购买组合"（主件、主件+附件1、主件+附件2、主件+附件1+附件2），
  每组只能从这些组合中选一种（或都不选）。
- 对所有组做 0/1 背包式 DP 即可。
- 价格与预算均为 10 的倍数，先整体除以 10 缩小 DP 数组规模加速。
"""

# @sample-start
"""
样例输入 1:
1000 5
800 2 0
400 5 1
300 5 1
400 3 0
500 2 0

样例输出 1:
2200
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数：读取输入、分组、做分组背包 DP 并输出结果"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)

    money = int(next(it)) // 10  # 预算，除以 10 缩小规模
    m = int(next(it))

    items = [None] * (m + 1)  # items[i] = (价格/10, 价值=价格×重要度)，下标从 1 开始
    main_idx = []  # 所有主件编号
    attachments = {}  # 主件编号 -> 附件编号列表

    for i in range(1, m + 1):
        v = int(next(it))
        p = int(next(it))
        q = int(next(it))
        items[i] = (v // 10, v * p)
        if q == 0:
            main_idx.append(i)
            # 注意：附件可能先于主件出现（输入顺序不定），不能直接覆盖，
            # 否则会清掉之前已登记到 attachments[i] 的附件列表
            attachments.setdefault(i, [])
        else:
            attachments.setdefault(q, []).append(i)

    # 构建分组：每个主件一组，组内含所有"合法组合"
    groups = []
    for mi in main_idx:
        v0, val0 = items[mi]
        atts = attachments[mi]
        combos = [(v0, val0)]  # 只买主件
        # 附件组合（最多 2 个，枚举子集）
        for mask in range(1, 1 << len(atts)):
            w = v0
            value = val0
            for k, ai in enumerate(atts):
                if mask >> k & 1:
                    w += items[ai][0]
                    value += items[ai][1]
            combos.append((w, value))
        groups.append(combos)

    # 分组背包：外层遍历组，内层逆序遍历容量
    dp = [0] * (money + 1)
    for combos in groups:
        for j in range(money, -1, -1):
            for w, value in combos:
                if j >= w and dp[j - w] + value > dp[j]:
                    dp[j] = dp[j - w] + value

    # 价值无需除以 10，直接输出
    print(dp[money])


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        (
            "1000 5\n800 2 0\n400 5 1\n300 5 1\n400 3 0\n500 2 0\n",
            "2200",
        ),
        (
            "1500 7\n500 1 0\n400 4 0\n300 5 1\n400 5 1\n200 5 0\n500 4 0\n400 4 0\n",
            "6200",
        ),
        (
            "800 2\n800 2 0\n400 5 1\n",
            "1600",
        ),
        # 附件先于主件出现（主件编号大于附件编号），且存在多个附件
        (
            "50 5\n20 3 5\n20 3 5\n10 3 0\n10 2 0\n10 1 0\n",
            "130",
        ),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        class FakeStdin:
            def __init__(self, s):
                self.buffer = io.BytesIO(s.encode())
        sys.stdin = FakeStdin(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end