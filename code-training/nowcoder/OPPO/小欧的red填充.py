# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/f0954d4dfb754494a0d134e15cdd8b23
# 小欧的red填充（OPPO 2023 秋招 · 研发岗）

"""
小欧的red填充 —— 构造 / 字符串

题目描述：
给定仅由 'r'、'e'、'd'、'?' 组成的字符串，把每个 '?' 换成 r/e/d 之一，
使得任意长度为 3 的连续子串里 r、e、d 出现次数相同（各一个）。
共 q 次询问，每次输出一个合法串；无解输出 "No"。

输入格式：
第一行一个正整数 q，代表询问次数；
接下来 q 行，每行一个由 r/e/d/? 组成的字符串。所有串总长度不超过 200000。

输出格式：
q 行，每行一个合法字符串，或 "No"。

核心思路：
相邻两个长度 3 的窗口 [i, i+2] 与 [i+1, i+3] 都必须各含一个 r、e、d，
它们有两个位置重叠，于是 s[i] 与 s[i+3] 必须相同 —— 整串以 3 为周期。
周期定了，串就由前三个字符决定，而前三个字符必须两两不同，
所以答案只可能是 6 个模板之一：red / rde / erd / edr / dre / der 无限重复。
逐个模板与原串比对（'?' 视作通配），第一个能对上的就是答案；六个都不行输出 No。
长度 1 或 2 的串不存在长度为 3 的子串，条件天然满足，'?' 直接填 'r' 即可。

时间复杂度：O(6 · 串长)，总长 2e5 时很快
空间复杂度：O(串长)
"""

# @sample-start
"""
样例输入 1:
3
e???d??
r??e
??

样例输出 1:
edredre
No
rd
"""
# @sample-end

import sys

# 三个字符的全部排列；每个模板无限重复就是一棵合法答案
PERMS = ("red", "rde", "erd", "edr", "dre", "der")


def fill(s: str):
    """按周期 3 填充，返回任意一个合法串；无解返回 None"""
    # 长度不足 3 时没有任何窗口，'?' 填什么都合法
    if len(s) < 3:
        return s.replace('?', 'r')
    for p in PERMS:
        ok = True
        for i, ch in enumerate(s):
            if ch != '?' and ch != p[i % 3]:
                ok = False
                break
        if ok:
            return ''.join(p[i % 3] for i in range(len(s)))
    return None


def solve() -> None:
    """逐个询问套 6 个周期模板"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    q = int(data[0])

    out = []
    for k in range(q):
        s = data[1 + k].decode()
        ans = fill(s)
        out.append(ans if ans is not None else "No")

    sys.stdout.write("\n".join(out) + "\n")


def _fillable(s: str) -> bool:
    """是否存在某个周期模板与原串相容（用于校验 No 的正确性）"""
    for p in PERMS:
        if all(ch == '?' or ch == p[i % 3] for i, ch in enumerate(s)):
            return True
    return False


def _judge(inp: str, out: str) -> bool:
    """校验输出：行数对、字符对、每个长度 3 的窗口都是 r/e/d 各一个"""
    tokens = inp.split()
    q = int(tokens[0])
    srcs = tokens[1:1 + q]
    lines = out.split("\n") if out else []
    if len(lines) != q:
        return False
    for s, t in zip(srcs, lines):
        if t == "No":
            if _fillable(s):
                return False
            continue
        if len(t) != len(s):
            return False
        for a, b in zip(s, t):
            if b not in "red" or (a != '?' and a != b):
                return False
        for i in range(len(t) - 2):
            if sorted(t[i:i + 3]) != ['d', 'e', 'r']:
                return False
    return True


def run_tests() -> None:
    """运行嵌入的样例测试（构造题是特判，只校验合法性）"""
    import io
    tests = [
        "3\ne???d??\nr??e\n??\n",   # 样例 1
        "2\nred\nder\n",
        "2\nrrr\nredd\n",           # 都无解
        "3\nr\n?\nre\n",            # 长度 1、2 没有窗口
        "2\nredre\nredr\n",
        "2\nr?d\ne??\n",
    ]
    for i, inp in enumerate(tests, 1):
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode()))
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old
        status = "✓" if _judge(inp, actual) else "✗"
        print(f"样例 {i}: {status} (输出={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
