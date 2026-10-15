# @nc app=nowcoder id=fd55637d3f24484e96dad9e992d3f62e topic=389 question=2032484 lang=Python3
# 2026-10-15 20:09:35
# https://www.nowcoder.com/practice/fd55637d3f24484e96dad9e992d3f62e?tpId=389&tqId=2032484
# [BISHI136] 【模板】01背包

"""
BISHI136. 【模板】01背包 —— 动态规划

题目描述：
有一个容量为 V 的背包，现有 n 件物品，第 i 件的体积为 w[i]、价值为 v[i]。
求以下两种方案下的最大总价值：
  方案一：不要求装满背包，能获得的最大总价值；
  方案二：要求恰好装满背包，能获得的最大总价值（无解输出 0）。

输入格式：
第一行两个整数 n 和 V。
此后 n 行，第 i 行两个整数 w[i]、v[i]。

输出格式：
两行：第一行是方案一的答案；第二行是方案二的答案（无解输出 0）。

核心思路：
01 背包的一维写法：外层枚举物品，内层**从 V 到 w 倒序**枚举容量。
倒序是关键 —— 它保证每件物品只被用一次（正序会变成完全背包）。
两问的唯一区别在初值：
  - 不要求装满：dp[j] 初值全为 0；
  - 恰好装满：dp[0] = 0，其余为 -inf，只有能从 0 转移来的状态才有效。

时间复杂度：O(n * V)
空间复杂度：O(V)
"""

# @sample-start
"""
样例输入 1:
3 5
2 10
4 5
1 4

样例输出 1:
14
9
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 8
12 6
11 8
6 8

样例输出 2:
8
0
"""
# @sample-end

# @nc code=start

import sys

NEG = float('-inf')


def solve() -> None:
    """01 背包：分别求「不必装满」与「恰好装满」的最大价值"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    n = int(data[idx]); V = int(data[idx + 1]); idx += 2
    items = []
    for _ in range(n):
        w = int(data[idx]); v = int(data[idx + 1]); idx += 2
        items.append((w, v))

    # 方案一：不要求装满
    dp1 = [0] * (V + 1)
    # 方案二：恰好装满（-inf 表示该容量尚不可达）
    dp2 = [NEG] * (V + 1)
    dp2[0] = 0

    for w, v in items:
        for j in range(V, w - 1, -1):        # 倒序：保证每件物品只用一次
            dp1[j] = max(dp1[j], dp1[j - w] + v)
            if dp2[j - w] != NEG:
                dp2[j] = max(dp2[j], dp2[j - w] + v)

    ans1 = dp1[V]
    ans2 = dp2[V] if dp2[V] != NEG else 0
    sys.stdout.write(f"{ans1}\n{ans2}\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3 5\n2 10\n4 5\n1 4\n", "14\n9"),
        ("3 8\n12 6\n11 8\n6 8\n", "8\n0"),
        ("1 3\n3 7\n", "7\n7"),        # 恰好用掉整个容量
        ("1 3\n5 7\n", "0\n0"),        # 装不下，两问都为 0
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()

# @nc code=end
