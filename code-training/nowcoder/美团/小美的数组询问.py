# 牛客 · 美团笔试真题（2024-03-09 春招）
# https://www.nowcoder.com/discuss/597820088263221248
# 小美的数组询问

"""
小美的数组询问 —— 模拟 / 数学

题目描述：
小美拿到了一个由正整数组成的数组，但其中有一些元素是未知的（用 0 表示）。
现在小美想知道：如果那些未知元素在区间 [l, r] 内随机取值，
数组所有元素之和的最小值和最大值分别是多少？共有 q 次询问。

输入格式：
第一行两个正整数 n、q，代表数组大小和询问次数。
第二行 n 个整数 a[i]，其中 a[i] = 0 表示该元素未知。
接下来 q 行，每行两个正整数 l、r，代表一次询问。

输出格式：
输出 q 行，每行两个整数，代表数组元素之和的最小值和最大值。

核心思路：
已知元素的和是固定的，设其为 base；未知元素有 cnt 个。
每个未知元素取值都在 [l, r] 内，所以：

    最小值 = base + cnt * l
    最大值 = base + cnt * r

注意每询问一次 l、r 都会变，但 base 和 cnt 只算一次。

时间复杂度：O(n + q)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
3 2
1 0 3
1 2
4 4

样例输出 1:
5 6
8 8
"""
# @sample-end

import sys


def solve() -> None:
    """已知和 + 未知个数 × 边界"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); q = int(data[idx + 1]); idx += 2

    base = 0
    cnt = 0
    for _ in range(n):
        v = int(data[idx]); idx += 1
        if v == 0:
            cnt += 1
        else:
            base += v

    out = []
    for _ in range(q):
        l = int(data[idx]); r = int(data[idx + 1]); idx += 2
        out.append(f"{base + cnt * l} {base + cnt * r}")
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3 2\n1 0 3\n1 2\n4 4\n", "5 6\n8 8"),
        ("3 1\n0 0 0\n1 1\n", "3 3"),
        ("1 1\n7\n5 9\n", "7 7"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = io.StringIO(inp)
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
