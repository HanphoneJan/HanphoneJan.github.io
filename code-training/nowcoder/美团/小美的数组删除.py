# 牛客 · 美团笔试真题（2024-08-10 后端，编程题第 2 题）
# https://www.nowcoder.com/discuss/653688247670878208
# 小美的数组删除

"""
小美的数组删除 —— 动态规划 + 动态维护 MEX

题目描述：
小美有一个长度为 n 的数组 a，她可以对数组进行如下操作：
- 删除第一个元素 a[1]，同时数组长度减一，花费为 x；
- 删除整个数组，花费为 k * MEX(a)，其中 MEX(a) 表示 a 中未出现过的
  最小非负整数（例如 [0,1,2,4] 的 MEX 为 3）。
小美想知道将数组全部清空的最小代价。

输入格式：
第一行一个整数 T，代表数据组数。
每组数据：
  第一行三个正整数 n、k、x；
  第二行 n 个整数 a[i]（0 ≤ a[i] ≤ n）。
保证所有数据组的 n 之和不超过 2×10^5。

输出格式：
对每组数据，在一行输出一个整数，表示清空数组的最小花费。

核心思路：
设 f[i] 表示「清空 a[i..n-1] 这段后缀」的最小花费（下标 0 起）。
最后一招只有两种选择：

  f[i] = min( x + f[i+1],            # 单独删掉 a[i]，剩下的继续处理
              k * MEX(a[i..n-1]) )   # 直接整段删除

边界 f[n] = 0。答案就是 f[0]。

难点在 MEX(a[i..n-1])：如果每次都重新算会超时。观察发现
i 从 n-1 递减到 0 的过程中，后缀是**不断变大**的，
所以 MEX 只会**单调不减**，可以用一个指针边走边扩：

  加入 a[i] 后，如果 a[i] == mex，就让 mex 一直自增到第一个「没出现过」的值。

时间复杂度：O(n)（每组）
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
1
6 3 3
4 5 2 3 1 0

样例输出 1:
15
"""
# @sample-end

import sys


def solve() -> None:
    """后缀 DP + 单调递增的 MEX 指针"""
    data = sys.stdin.read().split()
    if not data:
        return
    idx = 0
    t = int(data[idx]); idx += 1
    out = []
    for _ in range(t):
        n = int(data[idx]); k = int(data[idx + 1]); x = int(data[idx + 2]); idx += 3
        a = [int(v) for v in data[idx:idx + n]]; idx += n

        present = [False] * (n + 2)
        mex = 0
        f_next = 0                      # f[n]
        for i in range(n - 1, -1, -1):
            v = a[i]
            if v < len(present):
                present[v] = True
            while mex < len(present) and present[mex]:
                mex += 1
            f_cur = min(x + f_next, k * mex)
            f_next = f_cur
        out.append(str(f_next))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("1\n6 3 3\n4 5 2 3 1 0\n", "15"),
        # 删第一个就破坏了 MEX，整段删除更划算
        ("1\n3 1 100\n0 1 2\n", "3"),
        ("1\n1 10 1\n0\n", "1"),
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
