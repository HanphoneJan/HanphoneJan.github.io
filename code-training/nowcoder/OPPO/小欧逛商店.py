# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/919086dc716a466ba8284d5c749e8c15
# 小欧逛商店（2024 秋招 · 算法岗）

"""
小欧逛商店 —— 贪心 / 模拟

题目描述：
商店里有 n 个物品从左到右摆成一排，第 i 个物品体积为 a_i、价值为 b_i。
背包容量为 x。小欧按顺序走过每个物品，能装下就装、装不下就跳过。
求她买到的物品总价值。

输入格式：
第一行两个正整数 n、x（1 <= n <= 10^5，1 <= x <= 10^9）。
接下来 n 行，每行两个正整数 a_i、b_i，表示体积与价值。

输出格式：
一行一个整数，表示总价值。

核心思路：
题意已经把「挑哪些物品」的规则写死了：从前往后看，装得下就装。
所以这不 0-1 背包问题，而是一道纯模拟题 —— 排不排序、算不算性价比
都没有用，顺序不能改。

只需要维护剩余容量 rest（初始为 x）：
  - 若 a_i <= rest，买下它：ans += b_i，rest -= a_i；
  - 否则跳过，rest 不变。
全部扫完，ans 就是答案。

时间复杂度：O(n)
空间复杂度：O(1)（不存物品，边读边处理）
"""

# @sample-start
"""
样例输入 1:
3 5
4 3
2 5
1 3

样例输出 1:
6
"""
# @sample-end

import sys


def solve() -> None:
    """按顺序模拟：装得下就装"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    rest = int(next(it))          # 剩余容量
    total = 0                     # 已买物品的总价值
    for _ in range(n):
        volume = int(next(it))
        value = int(next(it))
        if volume <= rest:        # 等于剩余容量也算装得下
            rest -= volume
            total += value
    sys.stdout.write(str(total) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3 5\n4 3\n2 5\n1 3\n", "6"),                          # 样例 1
        ("3 1\n5 10\n3 20\n2 30\n", "0"),                       # 所有物品都装不下
        ("1 5\n5 7\n", "7"),                                    # 体积恰好等于容量
        ("4 10\n5 1\n5 2\n1 3\n4 4\n", "3"),                    # 前两个装满后，后面全部跳过
        ("5 100\n101 9\n99 1\n1 2\n1 3\n1 4\n", "3"),           # 第一个太大直接跳过，后面把容量用光
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        # solve() 用的是 buffer.read()，这里给一个带 .buffer 的文本流
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
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
