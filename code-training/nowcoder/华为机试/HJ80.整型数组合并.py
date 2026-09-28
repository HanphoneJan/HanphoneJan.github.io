# @nc app=nowcoder id=c4f11ea2c886429faf91decfaf6a310b topic=37 question=21303 lang=Python3
# 2026-09-29 01:11:57
# https://www.nowcoder.com/practice/c4f11ea2c886429faf91decfaf6a310b?tpId=37&tqId=21303
# [HJ80] 整型数组合并

"""
HJ80. 整型数组合并 —— 排序 / 去重 / 归并

题目描述：
给定两个升序排列的整数数组，将它们合并，去重后按升序输出。

输入格式：
- 第1行：第一个数组的元素个数 n1
- 第2行：第一个数组的 n1 个数
- 第3行：第二个数组的元素个数 n2
- 第4行：第二个数组的 n2 个数

输出格式：
合并去重排序后的数组（空格分隔）。

核心思路：
- 直接合并两个数组，用 set 去重，再排序。
- 或利用已有序，用归并思想合并并去重（O(n1+n2)）。
"""

# @sample-start
"""
样例输入 1:
3
1 2 5
4
-1 0 3 2

样例输出 1:
-1 0 1 2 3 5
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)

    n1 = int(next(it))
    arr1 = [int(next(it)) for _ in range(n1)]
    n2 = int(next(it))
    arr2 = [int(next(it)) for _ in range(n2)]

    merged = sorted(set(arr1) | set(arr2))  # 合并 + 去重 + 排序
    print(' '.join(map(str, merged)))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n1 2 5\n4\n-1 0 3 2\n", "-1 0 1 2 3 5"),
        ("2\n1 1\n2\n1 2\n", "1 2"),
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