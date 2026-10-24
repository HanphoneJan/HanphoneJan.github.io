# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/b5c4d567ca6a450eae7bee2852078b10
# 小欧喝水（OPPO 2024 秋招 · 后端岗）

"""
小欧喝水 —— 概率期望 / 递推

题目描述：
n 个杯子排成一排，其中 k 个装满水，另外 n-k 个是空的。每回合：
随机选一个杯子；若它是空的，回合结束；若它是满的且上一回合喝过水，
回合结束；否则喝掉这杯水，回合结束。
问喝完所有水的回合数期望。

输入格式：
两个正整数 n, k（1 <= k <= n <= 1e6），空格隔开。

输出格式：
一个浮点数，表示期望回合数（误差不超过 1e-6 即算正确）。

核心思路：
设 E(f) 为「还剩 f 杯水、且上一回合没喝水」时，喝完剩余水的期望回合数。
1. 上一回合喝过水时，这一回合无论选到什么都不会喝（满杯子也不会被喝掉），
   所以这个「冷却回合」必然浪费 1 回合，之后回到 E(f)。
2. 只剩 1 杯水（f = 1）时，每回合有 1/n 的概率选中它，选中即喝完结束，
   所以 E(1) = n（几何分布的期望）。
3. f >= 2 时，选中满杯的概率是 f/n：选中就喝掉一杯，之后要浪费一个冷却
   回合才回到「没喝过水」的状态；选不中则原地重来。整理得到
   E(f) = E(f-1) + n/f + 1。
4. 累加得 E(k) = n * (1 + 1/2 + ... + 1/k) + (k - 1)。

时间复杂度：O(k)（调和级数逐项累加）
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
1 1

样例输出 1:
1.000000000

样例输入 2:
2 1

样例输出 2:
2.000000000

样例输入 3:
2 2

样例输出 3:
4.000000000
"""
# @sample-end

import sys
from math import fsum


def solve() -> None:
    """按 E(k) = n * H(k) + k - 1 直接算，调和级数用 fsum 保证精度"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    k = int(data[1])
    harmonic = fsum(1.0 / i for i in range(1, k + 1))
    ans = n * harmonic + (k - 1)
    sys.stdout.write(f"{ans:.9f}\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("1 1\n", "1.000000000"),
        ("2 1\n", "2.000000000"),
        ("2 2\n", "4.000000000"),
        ("3 2\n", "5.500000000"),        # 3*(1+1/2)+1
        ("5 3\n", "11.166666667"),       # 5*(1+1/2+1/3)+2
        ("4 4\n", "11.333333333"),       # 4*(1+1/2+1/3+1/4)+3
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
