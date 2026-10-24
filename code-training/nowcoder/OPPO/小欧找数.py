# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/e821e1ea74a742208a34b4588b2d78e1
# 小欧找数（OPPO 2024 秋招 · 研发岗）

"""
小欧找数 —— 数学 / 区间

题目描述：
给定两个区间 [l1, r1] 和 [l2, r2]，问存在多少个整数 mid，能找到
x ∈ [l1, r1]、y ∈ [l2, r2]，使得 mid = floor((x + y) / 2)。

输入格式：
一行四个整数 l1, r1, l2, r2（1 <= l1 <= r1 <= 1e14，1 <= l2 <= r2 <= 1e14）。

输出格式：
一行一个整数，表示满足条件的 mid 个数。

核心思路：
1. 令 S = x + y。因为 x、y 各自取自一个连续区间，所有可能的 S 恰好铺满
   连续区间 [l1 + l2, r1 + r2]（没有空洞）。
2. S 每增加 1，floor(S / 2) 要么不变、要么增加 1，所以 S 走完一整段
   连续区间时，floor(S / 2) 也走完一整段连续区间：
   [floor((l1+l2)/2), floor((r1+r2)/2)]。
3. 答案就是这段整数区间的长度：floor((r1+r2)/2) - floor((l1+l2)/2) + 1。

时间复杂度：O(1)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
1 3 2 4

样例输出 1:
3
"""
# @sample-end

import sys


def solve() -> None:
    """所有可能的 x+y 连续铺满一段区间，取两端 floor 后算长度"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    l1, r1, l2, r2 = (int(x) for x in data[:4])
    low = (l1 + l2) // 2      # 最小的 mid
    high = (r1 + r2) // 2     # 最大的 mid
    sys.stdout.write(str(high - low + 1) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("1 3 2 4\n", "3"),
        ("1 1 1 1\n", "1"),                                  # 两个区间都只有一个数
        ("1 10 1 10\n", "10"),                               # 和落在 2..20，mid 落在 1..10
        ("1 1 100000000000000 100000000000000\n", "1"),       # 超过 int 范围的边界
        ("100000000000000 100000000000000 1 1\n", "1"),
    ]
    class FakeStdin:
        """把字符串包成带 buffer 的 stdin，供 sys.stdin.buffer.read() 使用"""

        def __init__(self, text: str) -> None:
            self.buffer = io.BytesIO(text.encode())

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = FakeStdin(inp)
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
