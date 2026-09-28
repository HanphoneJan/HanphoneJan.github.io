# @nc app=nowcoder id=74cb703f25dc4956acb3b08028a1f4b4 topic=37 question=43286 lang=Python3
# 2026-09-25 15:44:58
# https://www.nowcoder.com/practice/74cb703f25dc4956acb3b08028a1f4b4?tpId=37&tqId=43286
# [HJ98] 喜欢切数组的红

"""
HJ98. 喜欢切数组的红 —— 前缀和 + 计数

题目描述：
小红有一个长度为 n 的数组，她打算将数组切两刀变成三个非空子数组，
使得每一个子数组中至少存在一个正数，且每个子数组的和都相等。
求一共有多少种不同的切分方案。

输入格式：
- 第1行：数组长度 n
- 第2行：n 个整数（可为负数、零、正数）

输出格式：
- 一个整数，表示满足条件的切分方案数。

核心思路：
- 设数组总和为 S，三段和相等则每段和 = S/3，因此 S 必须能被 3 整除。
- 用前缀和 pre[i] 和正数个数前缀 pos[i]。
- 切点为 i < j（1 基前缀下标），需满足：
    pre[i] == m            （第一段和 = m）
    pre[j] == 2*m          （前两段和 = 2m）
    pos[i] > 0             （第一段含正数）
    pos[j] - pos[i] > 0    （中间段含正数）
    pos[n] - pos[j] > 0    （第三段含正数）
- 按位置从左到右扫描 j，用 Fenwick 树维护已见过的 i 的 pos 值，
  查询 pos[i] < pos[j] 的个数，即可 O(n log n) 统计所有合法 (i, j)。
"""

# @sample-start
"""
样例输入 1:
3
3 3 3

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6
1 1 4 5 1 4

样例输出 2:
0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
10
0 3 4 2 3 2 1 -1 3 4

样例输出 3:
2
"""
# @sample-end

# @nc code=start

import sys


class Fenwick:
    """树状数组，支持单点加、前缀和查询"""

    def __init__(self, n):
        self.n = n
        self.bit = [0] * (n + 2)

    def add(self, idx, val):
        idx += 1  # 转 1 基
        while idx <= self.n + 1:
            self.bit[idx] += val
            idx += idx & -idx

    def query(self, idx):
        """返回下标在 [0, idx] 的累加和"""
        idx += 1
        s = 0
        while idx > 0:
            s += self.bit[idx]
            idx -= idx & -idx
        return s


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    if not data:
        print(0)
        return

    n = int(data[0])
    a = list(map(int, data[1:1 + n]))

    total = sum(a)
    if total % 3 != 0:          # 总和必须能被 3 整除
        print(0)
        return
    m = total // 3

    pre = [0] * (n + 1)          # 前缀和
    pos = [0] * (n + 1)          # 正数个数前缀
    for i in range(1, n + 1):
        pre[i] = pre[i - 1] + a[i - 1]
        pos[i] = pos[i - 1] + (1 if a[i - 1] > 0 else 0)

    if pos[n] == 0:              # 没有正数，任何段都不可能含正数
        print(0)
        return

    bit = Fenwick(n + 1)
    ans = 0

    # 从 1 到 n-1 扫描（j 至少 n-1 保证第三段非空）
    for p in range(1, n):
        # p 作为第二段末尾 j：pre[j]==2m 且第三段含正数
        if pre[p] == 2 * m and pos[n] - pos[p] > 0:
            ans += bit.query(pos[p] - 1)  # 累加 pos[i] < pos[j] 的 i 个数
        # p 作为第一段末尾 i：pre[i]==m 且第一段含正数
        if pre[p] == m and pos[p] > 0:
            bit.add(pos[p], 1)

    print(ans)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n3 3 3\n", "1"),
        ("6\n1 1 4 5 1 4\n", "0"),
        ("10\n0 3 4 2 3 2 1 -1 3 4\n", "2"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        class FakeStdin:
            def __init__(self, s):
                self.buffer = io.BytesIO(s.encode())
        sys.stdin = FakeStdin(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end