# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/7c29bf99543040efa8e493b803050bdc
# 小欧的等差数列（OPPO 2024 秋招 · 后端岗）

"""
小欧的等差数列 —— 数学 / 数论

题目描述：
有一个长度为 n、首项为 a、公差为 d 的等差数列 a, a+d, ..., a+(n-1)d，把它看成一个集合。
每次操作可以任取集合里两个数 ai、aj，若 ai+aj 是偶数，就把 (ai+aj)/2 加入集合。
问若干次操作后集合里最多能有多少个数。

输入格式：
一行三个整数 n、a、d（1 <= n <= 1e5，1 <= a, d <= 1e9）。

输出格式：
一个整数，表示集合中最多能有多少个数。

核心思路：
两个数能取平均，等价于它们同奇偶，也就等价于它们的下标 i、j 之差是偶数（d 的奇偶决定）。
1) d 为奇数时：下标差为偶数的两项，中点是 a + ((i+j)/2)·d，下标 (i+j)/2 是整数，
   这个数本来就在集合里 —— 一个新产品都造不出来，答案是 n。
2) d 为偶数时：所有项同奇偶，任意两项都能取平均，相邻两项的中点是 a + i·d + d/2，
   于是集合从步长 d 变成步长 d/2 的等差数列（下标 0..2n-2），项数翻倍。
   继续减半，直到步长变成 d 的奇数部分 m，此时得到完整的
   a, a+m, a+2m, ..., a+(n-1)d，项数为 (n-1)·d/m + 1；步长已是奇数，再操作也没有新数。

时间复杂度：O(log d)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
5 1 2

样例输出 1:
9
"""
# @sample-end

import sys


def solve() -> None:
    """d 为奇数时无新数；d 为偶数时不断把公差减半"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    a = int(data[1])
    d = int(data[2])

    if d % 2 == 1:
        # 同奇偶的两项下标差为偶数，中点恰好是已有的项
        sys.stdout.write(str(n) + "\n")
        return

    # 去掉 d 里所有的因子 2，得到奇数步长 m
    m = d
    while m % 2 == 0:
        m //= 2

    # 最终集合是 a, a+m, ..., a+(n-1)d 的完整等差数列
    total = (n - 1) * d // m + 1
    sys.stdout.write(str(total) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("5 1 2\n", "9"),                    # 样例 1：步长 2 -> 1
        ("1 1 1\n", "1"),                    # 只有一个数
        ("3 1 1\n", "3"),                    # d 为奇数：没有新数
        ("4 1 3\n", "4"),                    # d 为奇数：1,4,7,10 中点全是已有项
        ("2 1 4\n", "5"),                    # 步长 4 -> 2 -> 1
        ("3 1 6\n", "5"),                    # 步长 6 -> 3（奇数部分 3）
        ("4 3 6\n", "7"),                    # 3,9,15,21 -> 步长 3 的完整序列
        ("5 1000000000 1000000000\n", "2049"),  # 步长 1e9 = 2^9 * 5^9，减半 9 次
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
