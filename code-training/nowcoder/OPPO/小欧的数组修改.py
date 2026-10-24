# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/9d57195bcec9415e9d12db846545ee0f
# 小欧的数组修改（2023 秋招 · 移动端岗）

"""
小欧的数组修改 —— 哈希表 / 计数

题目描述：
小欧有一个数组，她可以修改其中至多一个元素的值（也可以不改），
希望让「出现次数最多的那个元素」出现得尽可能多，求这个最多的出现次数。

输入格式：
第一行一个正整数 n（1 <= n <= 10^5）。
第二行 n 个正整数 a_i（1 <= a_i <= 10^5）。

输出格式：
一个正整数，代表操作后出现次数最多的元素的出现次数。

核心思路：
设当前出现次数最多的元素出现了 c 次。

- 若 c = n，整个数组都是同一个值，改任何一个都会破坏它，答案就是 n。
- 否则总能从「别的元素」里挑一个改成这个值，让它变成 c+1 次。
  并且答案不可能超过 c+1：一次修改最多让某个值的出现次数 +1，
  而原本出现最多的值也只有 c 次。

于是答案 = min(n, c + 1)。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
3
1 2 3

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
4

样例输出 2:
1
"""
# @sample-end

import sys


def solve():
    """统计每个值出现的次数，取最大值后加一（不超过 n）"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    best = 0
    cnt = {}
    for token in data[1:1 + n]:
        v = int(token)
        c = cnt.get(v, 0) + 1
        cnt[v] = c
        if c > best:
            best = c
    sys.stdout.write(str(min(n, best + 1)) + "\n")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    tests = [
        # 题面样例：1 2 3 各出现一次，改一个即可凑成 2 次
        ("3\n1 2 3\n", "2"),
        # 题面样例：只有一个数
        ("1\n4\n", "1"),
        # 已经全部相同：改成别的只会变少，答案就是 n
        ("4\n7 7 7 7\n", "4"),
        # 出现最多的值只有一半：3 个 5 + 3 个 9
        ("6\n5 5 5 9 9 9\n", "4"),
        # 两个元素相同
        ("2\n1 1\n", "2"),
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
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
