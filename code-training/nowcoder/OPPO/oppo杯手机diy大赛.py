# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/e4a33743de5f4d82905d3b56a652858f
# oppo杯手机diy大赛（2024 秋招 · 研发岗）

"""
oppo杯手机diy大赛 —— 排序 / 预处理最值

题目描述：
n 个评委分别给小欧的作品打了外观分 a_i 和性能分 b_i。
每个指标的分数是「去掉一个最高分和一个最低分后剩下分数的平均值」，
两个指标的分数再取平均，就是最终得分。
现在第 i 个评委可能失去资格，需要回答 i = 1, 2, ..., n 时各自的最终得分。

输入格式：
第一行一个正整数 n（4 <= n <= 10^5）。
接下来 n 行，每行两个正整数 a_i、b_i（1 <= a_i, b_i <= 10^9）。

输出格式：
输出 n 行，第 i 行是第 i 个评委失去资格后的最终得分（相对误差 <= 1e-5）。

核心思路：
记某个指标的全部分数之和为 S。第 i 个评委失去资格后，这个指标还剩 n-1 个数，
再从中去掉最大值和最小值，剩下 n-3 个，其和为 S - v_i - max - min。

关键只在于「去掉 v_i 之后的 max / min」要能 O(1) 求出来：
把该指标的分数排序。若 v_i 是全局唯一的最大值，去掉它之后最大值变成次大值，
否则最大值仍是全局最大值；最小值同理（看全局最小值的出现次数）。
两个指标各算一遍，最后把两个平均值再取平均。

时间复杂度：O(n log n)（排序一次），每次查询 O(1)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
1 1
2 3
3 2
4 1

样例输出 1:
2.5
2
1.5
2
"""
# @sample-end

import sys


def residual_sums(vals):
    """返回数组 res：res[i] 表示去掉第 i 个数、以及剩下那些数里的最大值和最小值之后的元素和

    n >= 4，所以去掉一个数后还剩至少 3 个，最大值和最小值总是两个不同的位置。
    """
    n = len(vals)
    total = sum(vals)
    ordered = sorted(vals)
    lo, hi = ordered[0], ordered[-1]

    # 全局最小 / 最大值各出现了多少次
    cnt_lo = 0
    while cnt_lo < n and ordered[cnt_lo] == lo:
        cnt_lo += 1
    cnt_hi = 0
    while cnt_hi < n and ordered[n - 1 - cnt_hi] == hi:
        cnt_hi += 1

    res = [0] * n
    for i, v in enumerate(vals):
        # 去掉 v 之后，剩下的数里的最大值 / 最小值
        mx = ordered[-2] if (v == hi and cnt_hi == 1) else hi
        mn = ordered[1] if (v == lo and cnt_lo == 1) else lo
        res[i] = total - v - mx - mn
    return res


def fmt(x):
    """把浮点数输出成不带多余尾零的写法（2.5 / 2 / 1.5）"""
    s = "%.12f" % x
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s


def solve():
    """主求解函数：对每个评委算出「去掉他之后」的两个指标平均值，再取平均"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    appearance = [0] * n
    performance = [0] * n
    p = 1
    for i in range(n):
        appearance[i] = int(data[p])
        performance[i] = int(data[p + 1])
        p += 2

    rest_a = residual_sums(appearance)
    rest_b = residual_sums(performance)

    # 每个指标剩下 n-3 个数，两个指标再取平均 -> 除以 2*(n-3)
    denom = 2 * (n - 3)
    out = [fmt((rest_a[i] + rest_b[i]) / denom) for i in range(n)]
    sys.stdout.write("\n".join(out) + "\n")


def _same(actual, expected):
    """逐项比较：能当浮点数解析时按 1e-6 的绝对误差比较，否则按字符串比较"""
    got, want = actual.split(), expected.split()
    if len(got) != len(want):
        return False
    for x, y in zip(got, want):
        try:
            if abs(float(x) - float(y)) > 1e-6:
                return False
        except ValueError:
            if x != y:
                return False
    return True


def run_tests():
    """运行嵌入的样例测试"""
    import io

    tests = [
        # 题面样例
        ("4\n1 1\n2 3\n3 2\n4 1\n", "2.5\n2\n1.5\n2"),
        # n = 4：去掉一个评委后只剩 3 个，再去掉最大最小，只剩中间那个数
        ("4\n5 5\n5 5\n5 5\n5 5\n", "5\n5\n5\n5"),
        # n = 5：外观 1..5，性能 10..50
        ("5\n1 10\n2 20\n3 30\n4 40\n5 50\n", "19.25\n19.25\n16.5\n13.75\n13.75"),
        # 最大值有重复：去掉其中一个之后最大值并不改变
        ("4\n4 1\n4 2\n1 3\n2 4\n", "2.5\n2.5\n3\n3"),
    ]

    for i, (inp, expected) in enumerate(tests, 1):
        # 用 BytesIO 包一层，solve() 里的 sys.stdin.buffer 才有内容可读
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if _same(actual, expected) else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
