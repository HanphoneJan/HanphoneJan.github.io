# @nc app=nowcoder id=b9eae162e02f4f928eac37d7699b352e topic=37 question=21251 lang=Python3
# 2026-09-29 01:07:55
# https://www.nowcoder.com/practice/b9eae162e02f4f928eac37d7699b352e?tpId=37&tqId=21251
# [HJ28] 素数伴侣

"""
HJ28. 素数伴侣 —— 二分图最大匹配（匈牙利算法）

题目描述：
给定 n（偶数）个正整数，将它们两两配对，使每一对的和都是素数。
求最多能组成多少对。

输入格式：
- 第1行：n（偶数）
- 第2行：n 个正整数

输出格式：
最多能组成的素数伴侣对数。

核心思路：
- 关键观察：除 2 以外的素数都是奇数，而两个数的和要为素数（奇数），
  必须一个是偶数、一个是奇数（偶+偶=偶、奇+奇=偶，均非素数）。
  因此把偶数、奇数分成两组，问题转为二分图最大匹配。
- 偶数 <-> 奇数之间若两数和为素数则连边，求最大匹配。
- 用匈牙利（Kuhn）算法：对每个偶数做 DFS 增广，找可匹配的奇数。
- 时间复杂度 O(E·V)（E 为边数），n 规模小可直接通过。
"""

# @sample-start
"""
样例输入 1:
4
2 5 6 13

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6
1 2 3 4 5 6

样例输出 2:
3
"""
# @sample-end

# @nc code=start

import sys


def is_prime(x: int) -> bool:
    """判断是否为素数"""
    if x < 2:
        return False
    for i in range(2, int(x ** 0.5) + 1):
        if x % i == 0:
            return False
    return True


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))

    evens = [x for x in nums if x % 2 == 0]
    odds = [x for x in nums if x % 2 == 1]

    # 匈牙利算法：match_odd[oi] 记录当前与第 oi 个奇数配对的偶数下标（-1 表示未配对）
    match_odd = [-1] * len(odds)

    def dfs(ei: int, seen) -> bool:
        """尝试为第 ei 个偶数寻找匹配的奇数"""
        for oi, o in enumerate(odds):
            if not seen[oi] and is_prime(evens[ei] + o):
                seen[oi] = True
                if match_odd[oi] == -1 or dfs(match_odd[oi], seen):
                    match_odd[oi] = ei
                    return True
        return False

    ans = 0
    for ei in range(len(evens)):
        seen = [False] * len(odds)
        if dfs(ei, seen):
            ans += 1

    print(ans)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    from itertools import permutations

    # 暴力验证参考实现
    def brute(arr):
        n = len(arr)
        best = 0
        for perm in permutations(range(n)):
            cnt = 0
            for i in range(0, n, 2):
                if is_prime(arr[perm[i]] + arr[perm[i + 1]]):
                    cnt += 1
            best = max(best, cnt)
        return best

    test_cases = [
        ("4\n2 5 6 13\n", "2"),
        ("6\n1 2 3 4 5 6\n", "3"),
        ("2\n2 3\n", "1"),
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