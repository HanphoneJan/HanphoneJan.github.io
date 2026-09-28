# @nc app=nowcoder id=be419f584a3f4c5b818833f1ce856626 topic=37 question=46444 lang=Python3
# 2026-09-29 01:17:06
# https://www.nowcoder.com/practice/be419f584a3f4c5b818833f1ce856626?tpId=37&tqId=46444
# [HJ176] 【模板】滑动窗口

"""
HJ176. 【模板】滑动窗口 —— 单调队列 / 双端队列

题目描述：
给定长度为 n 的整数数组和一个窗口大小 k，滑动窗口从左到右每次右移一位，
输出每个窗口内元素的最大值。

输入格式：
- 第1行：n、k
- 第2行：n 个整数

输出格式：
n-k+1 个整数，为每个窗口的最大值（空格分隔）。

核心思路：
- 用单调递减双端队列维护"候选最大值"的下标。
- 队头始终是当前窗口内最大值。
- 出队规则：
  1. 队头下标滑出窗口（< left）时弹出。
  2. 新元素入队前，弹出所有比它小的队尾（它们不可能是后续窗口最大值）。
- 每个元素至多入队出队一次，时间复杂度 O(n)。
"""

# @sample-start
"""
样例输入 1:
10 3
2 13 6 19 15 13 17 9 19 13

样例输出 1:
13 19 19 19 17 17 19 19
"""
# @sample-end

# @nc code=start

import sys
from collections import deque


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    n, k = int(data[0]), int(data[1])
    arr = list(map(int, data[2:2 + n]))

    dq = deque()      # 存下标，队列从队头到队尾对应值单调递减
    res = []
    for i, v in enumerate(arr):
        # 队头滑出窗口
        if dq and dq[0] < i - k + 1:
            dq.popleft()
        # 弹出所有比当前值小的队尾
        while dq and arr[dq[-1]] <= v:
            dq.pop()
        dq.append(i)
        # 窗口形成后记录队头
        if i >= k - 1:
            res.append(str(arr[dq[0]]))

    print(' '.join(res))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("10 3\n2 13 6 19 15 13 17 9 19 13\n", "13 19 19 19 17 17 19 19"),
        ("10 1\n13 13 5 3 9 19 18 4 17 3\n", "13 13 5 3 9 19 18 4 17 3"),
        ("10 10\n15 20 5 20 19 1 4 18 14 15\n", "20"),
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