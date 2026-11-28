"""
巷道矿车避碰 - 最多能同时派出多少辆矿车

题目描述：
一条直线巷道上有 m 辆矿车，第 i 辆当前停在 p[i]，指定卸载点是 q[i]。
0 时刻所有被派出的车同时出发，以单位速度朝 q[i] 行驶，到达后停在原地。
任意时刻两车不能停在同一个位置，t = 0 也算相遇。
从 m 辆车中选尽量多辆，要求任意两辆全程不相遇，求最多能选多少辆。

输入格式：
- 第一行：整数 m
- 第二行：m 个整数 p[1..m]
- 第三行：m 个整数 q[1..m]

输出格式：
- 一行：一个整数，最多能同时派出的矿车数量

核心思路：
车在时刻 t 的位置可以统一写成
    z_i(t) = mid(p_i - t, q_i, p_i + t)
其中 mid 是三个数的中位数（它等价于“向 q_i 行驶，到了就停”）。

对两辆车 i、j，假设 p_i < p_j：
- 若 q_i < q_j：三个数 p_i-t、q_i、p_i+t 都分别严格小于
  p_j-t、q_j、p_j+t，所以中位数也严格更小，两车永不相遇。
- 若 q_i >= q_j：t=0 时 z_i < z_j；等两车都停下后 z_i = q_i >= q_j = z_j。
  位置连续变化，中间必有某一刻相等，两车相遇。

所以一组车两两不相遇，当且仅当按 p 从小到大排列后，q 也严格递增。
问题变成二维偏序的最长链：
    按 p 升序、p 相同时按 q 降序排序，再对 q 求严格递增的最长上升子序列。

时间复杂度：O(m log m)
空间复杂度：O(m)
"""

import sys
from bisect import bisect_left

# @sample-start
"""
样例输入 1:
3
4 6 9
7 3 9

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3
8 8 2
3 12 5

样例输出 2:
2
"""
# @sample-end

# @sample-start
"""
样例输入 3:
3
1 3 5
10 8 6

样例输出 3:
1
"""
# @sample-end


def max_non_meeting(p, q) -> int:
    """返回最多能同时派出且全程不相遇的矿车数量。"""
    # p 升序；p 相同时 q 降序，保证严格 LIS 不会同时选到起点相同的两辆车
    cars = sorted(zip(p, q), key=lambda x: (x[0], -x[1]))

    # tails[k] = 长度为 k+1 的严格递增子序列能取到的最小结尾
    tails = []
    for _, end in cars:
        # 严格递增用 lower_bound：找到第一个 >= end 的位置替换
        i = bisect_left(tails, end)
        if i == len(tails):
            tails.append(end)
        else:
            tails[i] = end
    return len(tails)


def solve() -> None:
    data = list(map(int, sys.stdin.read().split()))
    if not data:
        return
    m = data[0]
    p = data[1:1 + m]
    q = data[1 + m:1 + 2 * m]
    print(max_non_meeting(p, q))


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n4 6 9\n7 3 9\n", "2"),
        ("3\n8 8 2\n3 12 5\n", "2"),
        ("3\n1 3 5\n10 8 6\n", "1"),
        ("4\n1 2 3 4\n1 2 3 4\n", "4"),
        ("2\n1 1\n5 5\n", "1"),
        ("2\n1 2\n5 5\n", "1"),
        ("3\n1 2 2\n0 1 2\n", "2"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout

        status = "[PASS]" if output == expected else "[FAIL]"
        print(f"样例 {i}: {status} (期望={expected}, 实际={output})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
