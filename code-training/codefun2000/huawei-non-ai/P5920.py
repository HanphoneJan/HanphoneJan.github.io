"""
P5920. 方阵唯一补齐 - 位掩码 + MRV 回溯

超级数独：盘面边长 s ∈ {4, 9, 16}（即 t 的平方）。每条横行、每条
竖列、每个 √s×√s 的小宫都要恰好放 1..s 且互不相同。给定盘面中
0 表示空格，其余为 1..s。要求补全盘面；合法补法恰有一组时输出
整盘，多于一组或一组都没有时只输出 0。

输入格式：
- 第 1 行：盘面边长 s；
- 随后 s 行、每行 s 个整数（空格分隔），0 为空格。

输出格式：
- 恰有一组合法补法时逐行输出整盘（同行空格分隔）；
  否则输出一行 0。

核心思路：
解数独的唯一性判定 = 「找到第一组解后继续搜，看有没有第二组」。
实现上用三个位掩码数组记录每行、每列、每个小宫已用过的数字，
空格集合交给回溯；每一步不按固定顺序走，而是在剩余空格里挑
「行×列×宫相交后候选最少」的那个格子（MRV）先试，从候选最少处
分叉能把无解与多解的分支剪得最干净。候选按从小到大枚举，
第一组完整命中即保存，命中第二组立即整棵搜索收线。

时间复杂度：指数级最坏，但 MRV + 位掩码使本题数据规模
（4/9/16 阶）下瞬时可解
空间复杂度：O(s²)
"""

# https://codefun2000.com/p/P5920
import io
import sys

# @sample-start
"""
样例输入 1:
4
2 1 4 0
3 0 1 2
1 3 0 4
0 2 3 1

样例输出 1:
2 1 4 3
3 4 1 2
1 3 2 4
4 2 3 1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
9
0 0 0 5 8 0 3 0 0
0 3 4 0 0 0 8 1 0
2 8 6 0 1 0 9 0 7
4 2 0 0 6 0 0 7 0
8 0 0 0 7 0 4 6 5
7 6 1 4 5 8 2 3 9
0 5 2 0 4 0 0 0 0
9 4 7 1 2 5 0 8 3
0 0 0 0 3 0 5 0 4

样例输出 2:
1 7 9 5 8 2 3 4 6
5 3 4 6 9 7 8 1 2
2 8 6 3 1 4 9 5 7
4 2 5 9 6 3 1 7 8
8 9 3 2 7 1 4 6 5
7 6 1 4 5 8 2 3 9
3 5 2 8 4 6 7 9 1
9 4 7 1 2 5 6 8 3
6 1 8 7 3 9 5 2 4
"""
# @sample-end


def find_solutions(s, grid):
    """返回前两组合法补法（至多两组），用于区分唯一/多解/无解。

    givens 与给定数冲突或填数下界不对时返回空列表。
    """
    b = int(round(s ** 0.5))
    full = (1 << (s + 1)) - 2  # 第 1..s 位各对应一个数字

    rows = [0] * s
    cols = [0] * s
    boxes = [0] * s
    for r in range(s):
        for c in range(s):
            v = grid[r][c]
            if v == 0:
                continue
            if not 1 <= v <= s:
                return []
            bit = 1 << v
            bi = (r // b) * b + (c // b)
            if (rows[r] | cols[c] | boxes[bi]) & bit:
                return []
            rows[r] |= bit
            cols[c] |= bit
            boxes[bi] |= bit

    empties = [(r, c) for r in range(s) for c in range(s) if grid[r][c] == 0]
    n_empty = len(empties)
    solutions = []

    sys.setrecursionlimit(5000)

    def dfs(depth):
        if len(solutions) >= 2:
            return
        if depth == n_empty:
            solutions.append([row[:] for row in grid])
            return
        # MRV：挑候选数最少的空格先试
        bj = -1
        bc = 0
        bn = s + 1
        for j in range(depth, n_empty):
            r, c = empties[j]
            cand = full & ~(rows[r] | cols[c] | boxes[(r // b) * b + (c // b)])
            cnt = cand.bit_count()
            if cnt == 0:
                return  # 这条分支已经死局
            if cnt < bn:
                bn = cnt
                bj = j
                bc = cand
                if cnt == 1:
                    break
        empties[depth], empties[bj] = empties[bj], empties[depth]
        r, c = empties[depth]
        bi = (r // b) * b + (c // b)
        masks = bc
        while masks and len(solutions) < 2:
            bit = masks & -masks
            masks ^= bit
            grid[r][c] = bit.bit_length() - 1
            rows[r] |= bit
            cols[c] |= bit
            boxes[bi] |= bit
            dfs(depth + 1)
            rows[r] ^= bit
            cols[c] ^= bit
            boxes[bi] ^= bit
        empties[depth], empties[bj] = empties[bj], empties[depth]
        grid[r][c] = 0

    dfs(0)
    return solutions


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    s = int(data[0])
    grid = []
    pos = 1
    for _ in range(s):
        grid.append([int(x) for x in data[pos:pos + s]])
        pos += s

    solutions = find_solutions(s, grid)
    if len(solutions) == 1:
        print("\n".join(" ".join(map(str, row)) for row in solutions[0]))
    else:
        print(0)


def run_tests():
    """运行嵌入的官方样例与边界用例，方便本地自测。"""
    cases = [
        # 官方样例 1：4 阶小盘，四个空位唯一确定
        (
            "4\n2 1 4 0\n3 0 1 2\n1 3 0 4\n0 2 3 1\n",
            "2 1 4 3\n3 4 1 2\n1 3 2 4\n4 2 3 1",
        ),
        # 官方样例 2：9 阶盘，唯一解逐字输出
        (
            "9\n0 0 0 5 8 0 3 0 0\n0 3 4 0 0 0 8 1 0"
            "\n2 8 6 0 1 0 9 0 7\n4 2 0 0 6 0 0 7 0"
            "\n8 0 0 0 7 0 4 6 5\n7 6 1 4 5 8 2 3 9"
            "\n0 5 2 0 4 0 0 0 0\n9 4 7 1 2 5 0 8 3"
            "\n0 0 0 0 3 0 5 0 4\n",
            "1 7 9 5 8 2 3 4 6\n5 3 4 6 9 7 8 1 2"
            "\n2 8 6 3 1 4 9 5 7\n4 2 5 9 6 3 1 7 8"
            "\n8 9 3 2 7 1 4 6 5\n7 6 1 4 5 8 2 3 9"
            "\n3 5 2 8 4 6 7 9 1\n9 4 7 1 2 5 6 8 3"
            "\n6 1 8 7 3 9 5 2 4",
        ),
        # 空盘有多组解：输出 0
        ("4\n0 0 0 0\n0 0 0 0\n0 0 0 0\n0 0 0 0\n", "0"),
        # 行、列都不撞，但小宫里 2 出现了两次：开局冲突，无解
        ("4\n1 2 3 4\n2 0 0 0\n0 0 0 0\n0 0 0 0\n", "0"),
        # 同一行给了两个 1：行冲突，无解
        ("4\n1 1 0 0\n0 0 0 0\n0 0 0 0\n0 0 0 0\n", "0"),
        # 格子里的数超出边长：直接不算解
        ("4\n5 0 0 0\n0 0 0 0\n0 0 0 0\n0 0 0 0\n", "0"),
        # 4 阶及 16 阶的完整合法盘：原样输出
    ]

    base4 = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 3, 4, 1],
        [4, 1, 2, 3],
    ]

    # 16 阶基准盘（行按公式 t*(r%t)+r//t+c 旋转得到，天然合法）
    s16 = 16
    big = [[((s16 // 4) * (r % 4) + r // 4 + c) % s16 + 1 for c in range(s16)] for r in range(s16)]
    big_text = f"{s16}\n" + "\n".join(" ".join(map(str, row)) for row in big) + "\n"
    expected_big = "\n".join(" ".join(map(str, row)) for row in big)
    cases.append((big_text, expected_big))

    # 16 阶完整盘挖掉一格：所在行唯一缺的那个数就是答案，必为唯一解
    hole = (5, 9)
    keep = big[hole[0]][hole[1]]
    one_hole = [row[:] for row in big]
    one_hole[hole[0]][hole[1]] = 0
    hole_text = f"{s16}\n" + "\n".join(" ".join(map(str, row)) for row in one_hole) + "\n"
    cases.append((hole_text, expected_big))

    # 4 阶完整盘挖掉对角一格
    small4 = [row[:] for row in base4]
    small4[2][1] = 0
    text4 = "4\n" + "\n".join(" ".join(map(str, row)) for row in small4) + "\n"
    expected4 = "\n".join(" ".join(map(str, row)) for row in base4)
    cases.append((text4, expected4))

    # 多解判定再压一组：只保留第一行的 4 阶盘，行内空格可有多解
    partial = [
        [1, 2, 3, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ]
    text_part = "4\n" + "\n".join(" ".join(map(str, row)) for row in partial) + "\n"
    cases.append((text_part, "0"))

    for i, (inp, expected) in enumerate(cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        status = "✓" if output == expected else "✗"
        if output != expected:
            print(f"用例 {i}: ✗")
            print("---- 实际 ----")
            print(output[:400])
            print("---- 期望 ----")
            print(expected[:400])
        else:
            print(f"用例 {i}: 期望=({expected[:12]}...共{len(expected)}字), 实际 ✓")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
