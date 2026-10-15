# @nc app=nowcoder id=a561ad77e7bb45679db2bd7317fded84 topic=372 question=10979357 lang=Python3
# 2026-10-15 20:10:22
# https://www.nowcoder.com/practice/a561ad77e7bb45679db2bd7317fded84?tpId=372&tqId=10979357
# [PIO5] 多组_AB_零尾模式

"""
PIO5. 多组 A+B（零尾模式）—— ACM 输入输出基础

题目描述：
给定若干组测试数据，最后一组数据为 0 0，作为输入的结尾。
每组数据有两个整数 a 和 b，请你分别求出 a + b。

输入格式：
每行有两个整数 a 和 b。
最后一行为 0 0，代表输入结束（这一组不是需要计算的数据）。

输出格式：
输出若干行，每行一个整数，代表对应组的 a + b（不含结尾的 0 0）。

核心思路：
不断读入 a、b，一旦遇到 a == 0 且 b == 0 就立即结束，不再输出。
因为是「读到特定结束标记为止」，所以不能预先知道组数，
需要用 while 循环配合 break。

时间复杂度：O(T)，T 为实际数据组数
空间复杂度：O(1)（不计输出）
"""

# @sample-start
"""
样例输入 1:
1 2
114 514
2024 727
0 0

样例输出 1:
3
628
2751
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读到 0 0 为止，逐行输出 a + b"""
    data = sys.stdin.read().split()
    out = []
    i = 0
    while i + 1 < len(data):
        a = int(data[i])
        b = int(data[i + 1])
        i += 2
        if a == 0 and b == 0:  # 结束标记
            break
        out.append(str(a + b))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("1 2\n114 514\n2024 727\n0 0\n", "3\n628\n2751"),
        ("0 0\n", ""),
        ("0 5\n5 0\n0 0\n", "5\n5"),  # 只有两个数同时为 0 才结束
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
