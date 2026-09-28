# @nc app=nowcoder id=b8dc67c35bdb47e489da682e908379f7 topic=37 question=46439 lang=Python3
# 2026-09-29 01:19:16
# https://www.nowcoder.com/practice/b8dc67c35bdb47e489da682e908379f7?tpId=37&tqId=46439
# [HJ171] 排座椅

"""
HJ171. 排座椅 —— 贪心 / 计数

题目描述：
教室 M 行 N 列，需设置 K 条横向通道和 L 条纵向通道。有 D 对相邻的同学常交头接耳。
放置通道后，希望被通道隔开的交头接耳对尽可能多（即未被隔开的对最少）。
输出唯一最优方案：第一行 K 个横向通道位置（行号，递增），第二行 L 个纵向通道位置（列号，递增）。

输入格式：
- 第1行：M、N、K、L、D
- 接下来 D 行：每行 4 个整数，表示相邻的两对坐标

输出格式：
- 第1行：K 个行号（递增）
- 第2行：L 个列号（递增）

核心思路：
- 一条横向通道（位于第 x 行与第 x+1 行之间）能隔开"上下相邻"的交头接耳对（行号分别为 x、x+1）。
- 一条纵向通道同理隔开"左右相邻"对。
- 分别统计每个候选通道能隔开的对数，贪心选取能隔开对数最多的前 K / L 条，
  最后按编号递增输出（题目保证最优方案唯一）。
"""

# @sample-start
"""
样例输入 1:
4 5 1 2 3
4 2 4 3
2 3 3 3
2 5 2 4

样例输出 1:
2
2 4
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    M, N, K, L, D = int(next(it)), int(next(it)), int(next(it)), int(next(it)), int(next(it))

    row_cnt = [0] * (M + 1)   # row_cnt[x]：在第 x 与 x+1 行之间设通道能隔开的对数
    col_cnt = [0] * (N + 1)   # col_cnt[y]：在第 y 与 y+1 列之间设通道能隔开的对数

    for _ in range(D):
        x1, y1, x2, y2 = int(next(it)), int(next(it)), int(next(it)), int(next(it))
        if x1 == x2:          # 左右相邻，用纵向通道隔开
            col_cnt[min(y1, y2)] += 1
        else:                 # 上下相邻，用横向通道隔开
            row_cnt[min(x1, x2)] += 1

    # 贪心：选能隔开对数最多的 K 条横向通道
    rows = sorted(range(1, M), key=lambda x: row_cnt[x], reverse=True)[:K]
    cols = sorted(range(1, N), key=lambda y: col_cnt[y], reverse=True)[:L]

    print(' '.join(map(str, sorted(rows))))
    print(' '.join(map(str, sorted(cols))))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("4 5 1 2 3\n4 2 4 3\n2 3 3 3\n2 5 2 4\n",
         "2\n2 4"),
        ("2 2 1 1 4\n1 1 1 2\n1 1 2 1\n2 1 2 2\n1 2 2 2\n",
         "1\n1"),
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
        print(f"样例 {i}: {status} 期望={expected!r}, 实际={output!r}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end