# @nc app=nowcoder id=fe1e902e076b46dd82e7d42e12617893 topic=372 question=10979371 lang=Python3
# 2026-10-15 20:10:03
# https://www.nowcoder.com/practice/fe1e902e076b46dd82e7d42e12617893?tpId=372&tqId=10979371
# [PIO9] 多组_二维数组_T组形式

"""
PIO9. 多组 二维数组（T 组形式）—— ACM 输入输出基础

题目描述：
给定 T 组询问，每次询问给出一个 n 行 m 列的二维正整数数组 A，
请你分别求出每个数组的元素之和。

输入格式：
第一行一个整数 T。
随后 T 组数据。每组的第一行有两个整数 n 和 m。
每组的随后 n 行，每行有 m 个整数 A[i][j]。

输出格式：
输出 T 行，每行一个整数，代表对应数组所有元素之和。

核心思路：
一次性把所有 token 读进来，用下标 idx 依次推进。
每读一组先取 n、m，再连续读 n * m 个数求和。
把二维数组「摊平」成一行 token 读，就不用真去构造二维列表，
省内存又不影响结果。

时间复杂度：O(Σ(n * m))
空间复杂度：O(1)（不计输入与输出）
"""

# @sample-start
"""
样例输入 1:
3
3 4
1 2 3 4
5 6 7 8
9 10 11 12
1 1
2024
3 2
1 1
4 5
1 4

样例输出 1:
78
2024
16
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读取 T 个二维数组，逐行输出各自的元素之和"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    t = int(data[idx])
    idx += 1
    out = []
    for _ in range(t):
        n = int(data[idx])
        m = int(data[idx + 1])
        idx += 2
        total = 0
        for _ in range(n * m):  # 二维数组摊平后逐个累加
            total += int(data[idx])
            idx += 1
        out.append(str(total))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        (
            "3\n3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n1 1\n2024\n3 2\n1 1\n4 5\n1 4\n",
            "78\n2024\n16",
        ),
        ("1\n1 1\n0\n", "0"),
        ("2\n1 3\n1 2 3\n2 2\n1 1\n1 1\n", "6\n4"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()

# @nc code=end
