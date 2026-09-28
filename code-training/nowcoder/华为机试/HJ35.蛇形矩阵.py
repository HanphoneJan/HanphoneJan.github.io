# @nc app=nowcoder id=649b210ef44446e3b1cd1be6fa4cab5e topic=37 question=21258 lang=Python3
# 2026-09-29 01:09:26
# https://www.nowcoder.com/practice/649b210ef44446e3b1cd1be6fa4cab5e?tpId=37&tqId=21258
# [HJ35] 蛇形矩阵

"""
HJ35. 蛇形矩阵 —— 模拟 / 数学

题目描述：
输出一个 n 行 n 列的上三角蛇形矩阵。构造方法：从 1 开始填充自然数，
第 1 行第 1 列元素为 1，不断沿"右上"方向斜向填充，直到填满上三角 n(n+1)/2 个格子。

输入格式：
一行一个整数 n。

输出格式：
n 行，第 i 行输出 n-i+1 个数（上三角），行内空格分隔。

核心思路：
- 按"副对角线"（i+j 相等）逐条填充。第 d 条副对角线上有 d+1 个格子。
- 填充顺序：对每条副对角线，从行号大到小依次填（row 从 d 到 0，col = d - row）。
- 输出：第 row 行输出 col 从 0 到 n-1-row 的格子。
"""

# @sample-start
"""
样例输入 1:
4

样例输出 1:
1 3 6 10
2 5 9
4 8
7
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    n = int(sys.stdin.readline().strip())
    mat = [[0] * n for _ in range(n)]

    num = 1
    # 按副对角线（row+col=d）逐条填充
    for d in range(n):
        for row in range(d, -1, -1):
            col = d - row
            mat[row][col] = num
            num += 1

    # 输出上三角：第 row 行输出 col 0..n-1-row
    out = []
    for row in range(n):
        out.append(' '.join(str(mat[row][col]) for col in range(n - row)))
    print('\n'.join(out))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("4\n", "1 3 6 10\n2 5 9\n4 8\n7"),
        ("3\n", "1 3 6\n2 5\n4"),
        ("1\n", "1"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
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