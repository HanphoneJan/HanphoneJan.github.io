# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/0bcbd996fe234e25960abf0c82327dc2
# 小欧的括号操作（OPPO 2023 秋招 · 算法岗）

"""
小欧的括号操作 —— 字符串 / 贪心

题目描述：
给定一个只含 '(' 和 ')' 的字符串，可以反复执行一种操作：把**相邻的一对** "()"
换成单个 '(' 或单个 ')'。问若干次操作后字符串的最短长度。

输入格式：
一行一个只含 '(' 和 ')' 的字符串，长度不超过 200000。

输出格式：
一个整数，表示操作后能得到的最短长度。

核心思路：
每次操作把两个字符换成一个，长度恰好减少 1，所以「最短」=「尽量多删」。
把操作看成「删掉这一对里的一个字符」：
- '(' 只能往右走（它删掉自己右边的 ')'），')' 只能往左走（它删掉自己左边的 '('）。
于是有两类字符永远动不了：
- 第一个 '(' 之前的所有 ')'：它们左边没有任何 '(' 能过来；
- 最后一个 ')' 之后的所有 '('：它们右边没有任何 ')' 能过来。
设这两个数为 c0、o0。若第一个 '(' 已经在最后一个 ')' 的右边（形如 ))(( ），
串里一个 "()" 都没有，答案就是 n。
中间那段（第一个 '(' 到最后一个 ')'）同时含有两种字符，可以一直消到只剩 1 个，
但不可能消空 —— 最后一个被删的字符左边全是 ')'、右边全是 '('，两边都帮不上忙。
所以答案 = c0 + o0 + 1。

时间复杂度：O(n)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
()

样例输出 1:
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
)(

样例输出 2:
2
"""
# @sample-end

import sys


def solve() -> None:
    """统计两端动不了的字符，中间的括号段再留下 1 个"""
    s = sys.stdin.read().strip()
    if not s:
        return
    n = len(s)

    first_open = s.find('(')    # 第一个左括号的位置
    last_close = s.rfind(')')   # 最后一个右括号的位置

    # 没有左括号 / 没有右括号 / 全是「先 ) 后 (」：一次操作也做不了
    if first_open == -1 or last_close == -1 or first_open > last_close:
        sys.stdout.write(str(n) + "\n")
        return

    # 第一个左括号左边的 ')' 与最后一个右括号右边的 '(' 都动不了
    stuck = s.count(')', 0, first_open) + s.count('(', last_close + 1)
    # 中间那段既有 '(' 又有 ')'，可以一路消到只剩 1 个
    sys.stdout.write(str(stuck + 1) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("()\n", "1"),           # 样例 1
        (")(\n", "2"),           # 样例 2：没有相邻的 "()"
        ("(((\n", "3"),          # 全是左括号，动不了
        (")))\n", "3"),          # 全是右括号，动不了
        ("()(\n", "2"),          # 尾巴上多出的 '(' 删不掉
        ("(()))\n", "1"),        # 中间段可以消成一个，左边的括号全被吃掉
        ("(())(\n", "2"),
        ("()()()\n", "1"),       # 整串都能被最后一个 ')' 吃掉
        ("))((", "4"),           # 已经是最简形态
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
