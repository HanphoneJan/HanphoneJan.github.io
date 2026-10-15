# 牛客 · 美团笔试真题（2024-03-09 春招，编程题第 3 题 25 分）
# https://www.nowcoder.com/discuss/597820088263221248
# 小美的平衡矩阵

"""
小美的平衡矩阵 —— 二维前缀和 + 枚举

题目描述：
小美拿到了一个 n × n 的矩阵，其中每个元素是 0 或者 1。
小美认为一个矩形区域是完美的，当且仅当该区域内 0 的数量恰好等于 1 的数量。
现在，小美希望你回答：存在多少个 i × i 的完美矩形区域？
你需要回答 1 ≤ i ≤ n 的所有答案。

输入格式：
第一行一个正整数 n，代表矩阵大小。
接下来的 n 行，每行一个长度为 n 的 01 串，用来表示矩阵。

输出格式：
输出 n 行，第 i 行输出 i × i 的完美矩形区域的数量。

核心思路：
1. 矩阵只有 0 和 1，「0 与 1 数量相等」等价于「区域里 1 的个数 = 面积 / 2」。
   因此只要能快速求任意子矩阵里 1 的个数即可 —— 用**二维前缀和** O(1) 查询。
2. 边长 i 为奇数时，面积 i² 是奇数，不可能被 2 整除，答案恒为 0；
   所以只枚举偶数边长。
3. 枚举每个偶数边长 k，再枚举所有 k × k 子矩阵的右下角，判断 1 的个数
   是否等于 k² / 2。

时间复杂度：O(n³)
空间复杂度：O(n²)
"""

# @sample-start
"""
样例输入 1:
4
1010
0101
1100
0011

样例输出 1:
0
7
0
1
"""
# @sample-end

import sys


def solve() -> None:
    """二维前缀和，枚举偶数边长的子矩阵"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    grid = data[1:1 + n]

    pre = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n):
        row = grid[i]
        for j in range(n):
            pre[i + 1][j + 1] = (
                pre[i][j + 1] + pre[i + 1][j] - pre[i][j]
                + (1 if row[j] == '1' else 0)
            )

    res = [0] * (n + 1)
    for k in range(2, n + 1, 2):          # 奇数边长必为 0，跳过
        half = k * k // 2
        for i in range(k, n + 1):
            for j in range(k, n + 1):
                ones = (pre[i][j] - pre[i - k][j]
                        - pre[i][j - k] + pre[i - k][j - k])
                if ones == half:
                    res[k] += 1

    sys.stdout.write("\n".join(str(res[i]) for i in range(1, n + 1)) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4\n1010\n0101\n1100\n0011\n", "0\n7\n0\n1"),
        ("2\n10\n01\n", "0\n1"),      # 1×1 不可能完美，2×2 恰好一半 1
        ("1\n0\n", "0"),
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
