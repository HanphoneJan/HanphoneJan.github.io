# @nc app=nowcoder id=a2fd81391e1e4177aa6d506da895381b topic=37 question=46446 lang=Python3
# 2026-09-29 01:17:14
# https://www.nowcoder.com/practice/a2fd81391e1e4177aa6d506da895381b?tpId=37&tqId=46446
# [HJ178] 【模板】双指针

"""
HJ178. 【模板】双指针 —— 滑动窗口 / 双指针

题目描述：
给定长度为 n 的数组，找出最长的区间，满足区间内元素两两不同。
若有多个这样的区间，依次输出它们。

输入格式：
- 第1行：n
- 第2行：n 个整数

输出格式：
- 第1行：满足条件的区间数量
- 接下来每行：区间的左右端点 L、R（1 基，L 递增）

核心思路：
- 用双指针维护一个无重复元素的窗口 [left, right]。
- 右指针扩展，遇到重复元素时移动左指针直到无重复。
- 记录并更新最长长度；长度相同时记录所有区间。
- 每个元素进出窗口一次，时间复杂度 O(n)。
"""

# @sample-start
"""
样例输入 1:
6
1 1 4 5 1 4

样例输出 1:
3
2 4
3 5
4 6
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    arr = list(map(int, data[1:1 + n]))

    last_pos = {}       # 元素 -> 最近一次出现的位置
    left = 0            # 窗口左端点
    best = 0
    intervals = []

    for right in range(n):
        v = arr[right]
        # 若 v 在窗口内已出现，则左指针移到其上一次出现位置的下一个
        if v in last_pos and last_pos[v] >= left:
            left = last_pos[v] + 1
        last_pos[v] = right

        cur_len = right - left + 1
        if cur_len > best:
            best = cur_len
            intervals = [(left + 1, right + 1)]   # 转 1 基
        elif cur_len == best:
            intervals.append((left + 1, right + 1))

    print(len(intervals))
    for l, r in intervals:
        print(l, r)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("6\n1 1 4 5 1 4\n", "3\n2 4\n3 5\n4 6"),
        ("4\n1 2 3 4\n", "1\n1 4"),
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