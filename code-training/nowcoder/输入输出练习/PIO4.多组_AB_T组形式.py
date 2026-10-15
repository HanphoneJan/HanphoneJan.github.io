# @nc app=nowcoder id=cc937d32225340469bfb60a0797bad77 topic=372 question=10979356 lang=Python3
# 2026-10-15 20:10:15
# https://www.nowcoder.com/practice/cc937d32225340469bfb60a0797bad77?tpId=372&tqId=10979356
# [PIO4] 多组_AB_T组形式

"""
PIO4. 多组 A+B（T 组形式）—— ACM 输入输出基础

题目描述：
给定 T 组测试数据，每组包含两个整数 a 和 b，请你分别求出 a + b。

输入格式：
第一行一个整数 T，代表测试数据组数。
接下来 T 行，每行两个整数 a 和 b。

输出格式：
输出 T 行，每行一个整数，代表对应组的 a + b。

核心思路：
先读出组数 T，再循环 T 次，每次读入一行中的两个整数并输出它们的和。
所有数据一次性读入（sys.stdin.read().split()）后用下标推进，避免逐行读的
I/O 开销，是 ACM 模式处理「T 组数据」最稳的写法。

时间复杂度：O(T)
空间复杂度：O(1)（不计输出）
"""

# @sample-start
"""
样例输入 1:
3
1 2
114 514
2024 727

样例输出 1:
3
628
2751
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读取 T 组 a b，逐行输出 a + b"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    t = int(data[idx])
    idx += 1
    out = []
    for _ in range(t):
        a = int(data[idx])
        b = int(data[idx + 1])
        idx += 2
        out.append(str(a + b))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3\n1 2\n114 514\n2024 727\n", "3\n628\n2751"),
        ("1\n0 0\n", "0"),
        ("2\n-1 1\n1000000000 1000000000\n", "0\n2000000000"),
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
