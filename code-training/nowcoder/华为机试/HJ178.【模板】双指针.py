# @nc app=nowcoder id=a2fd81391e1e4177aa6d506da895381b question=11264996 lang=Python3
# 2026-09-29
# https://www.nowcoder.com/practice/a2fd81391e1e4177aa6d506da895381b
# [HJ178] 【模板】双指针
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
