# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/0b461d2b82834cb1881567744effb0c1
# 小欧的括号嵌套（OPPO 2024 秋招 · 后端岗）

"""
小欧的括号嵌套 —— 构造 / 贪心

题目描述：
构造一个合法的括号序列，长度恰好为 2n，且括号的最大嵌套深度恰好为 r。

输入格式：
一行两个整数 n、r（1 <= r <= n <= 10^5）。

输出格式：
一行一个字符串，表示构造出的括号序列。多种方案输出任意一个。

核心思路：
想要「深度恰好为 r」，最直接的办法是搭一个深度为 r 的块：
    "(" * r  +  ")" * r
它的深度从 1 一路涨到 r 再降回 0，正好是 r。
剩下的 n - r 对括号平铺成 "()"，每对自成一层，深度只到 1，不会超过 r。
把两段拼起来，整体就是若干合法块的连接：任意前缀的右括号都不多于左括号，
最终深度回到 0，总长度 2r + 2(n-r) = 2n。

时间复杂度：O(n)
空间复杂度：O(n)（输出本身）
"""

# @sample-start
"""
样例输入 1:
3 2

样例输出 1:
()(())
"""
# @sample-end

import sys


def solve() -> None:
    """先搭一个深度为 r 的块，剩下的对括号平铺"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    r = int(data[1])

    # "("*r + ")"*r 深度恰好到 r；剩下的 n-r 对 "()" 深度只有 1
    ans = "(" * r + ")" * r + "()" * (n - r)
    sys.stdout.write(ans + "\n")


def _judge(n: int, r: int, out: str) -> bool:
    """校验构造结果：长度 2n、合法、最大嵌套深度恰为 r"""
    if len(out) != 2 * n:
        return False
    depth = 0
    best = 0
    for ch in out:
        if ch == '(':
            depth += 1
            best = max(best, depth)
        elif ch == ')':
            depth -= 1
            if depth < 0:
                return False
        else:
            return False
    return depth == 0 and best == r


def run_tests() -> None:
    """运行嵌入的样例测试（构造题是特判，只校验合法性）"""
    import io
    # (输入, 题面给出的样例输出)：样例输出只是众多合法答案中的一个
    tests = [
        ("3 2\n", "()(())"),
        ("1 1\n", "()"),
        ("5 5\n", "((((()))))"),
        ("5 1\n", "()()()()()"),
        ("6 3\n", "((()))()()()"),
        ("4 4\n", "(((())))"),
        ("2 1\n", "()()"),
    ]
    for i, (inp, expected) in enumerate(tests, 1):
        n, r = map(int, inp.split())
        sys.stdin = io.StringIO(inp)
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        same = "，与样例相同" if actual == expected else "，与样例不同但同样合法"
        status = "✓" if _judge(n, r, actual) else "✗"
        print(f"样例 {i}: {status} (n={n}, r={r}, 输出={actual!r}{same})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
