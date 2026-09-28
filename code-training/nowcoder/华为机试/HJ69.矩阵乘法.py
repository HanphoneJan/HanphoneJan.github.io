# @nc app=nowcoder id=ebe941260f8c4210aa8c17e99cbc663b topic=37 question=21292 lang=Python3
# 2026-09-29 01:10:38
# https://www.nowcoder.com/practice/ebe941260f8c4210aa8c17e99cbc663b?tpId=37&tqId=21292
# [HJ69] 矩阵乘法

"""
HJ69. 矩阵乘法 —— 数学 / 模拟

题目描述：
给定 A(m×s)、B(s×n) 两个矩阵，计算乘积 C = A × B。

输入格式：
- 第1行：m、s、n
- 接下来 m 行：A 的每行 s 个数
- 接下来 s 行：B 的每行 n 个数

输出格式：
m 行，每行 n 个数，即 C 的每一行（空格分隔）。

核心思路：
- C[i][j] = Σ_k A[i][k] * B[k][j]
- 三重循环即可。
"""

# @sample-start
"""
样例输入 1:
2 3 2
1 2 3
3 2 1
1 2
2 1
3 3

样例输出 1:
14 13
10 11
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    m, s, n = int(next(it)), int(next(it)), int(next(it))

    A = [[int(next(it)) for _ in range(s)] for _ in range(m)]
    B = [[int(next(it)) for _ in range(n)] for _ in range(s)]

    C = [[0] * n for _ in range(m)]
    for i in range(m):
        for j in range(n):
            total = 0
            for k in range(s):
                total += A[i][k] * B[k][j]
            C[i][j] = total

    for row in C:
        print(' '.join(map(str, row)))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("2 3 2\n1 2 3\n3 2 1\n1 2\n2 1\n3 3\n",
         "14 13\n10 11"),
        ("1 1 1\n2\n3\n", "6"),
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