# 牛客 · 美团笔试真题（2023-09-02，5 道编程题之一）
# https://www.nowcoder.com/discuss/528147381624340480
# 小美的子序列

"""
小美的子序列 —— 贪心 / 双指针

题目描述：
小美在 n 行 m 列的本子上写了许多字母，她会在每一行中找出一个字母，
然后按行序组成一个字符串。小美想知道，组成的字符串中是否存在至少一个
包含 "meituan" 子序列的字符串。

输入格式：
第一行两个整数 n、m (1 ≤ n, m ≤ 1000)。
接下来 n 行，每行一个长度为 m 的字符串，表示小美写下的字母。

输出格式：
若存在至少一个字符串包含 "meituan" 子序列，输出 "YES"，否则输出 "NO"。

核心思路：
每一行只能贡献一个字母，且组出来的字符串的顺序就是行的顺序。
所以问题等价于：能否在**第 1、2、…、n 行中**依次找到
"meituan" 的各个字符，每个字符来自不同的行、且行的次序与字符次序一致。

用双指针贪心：从需要的字符 'm' 开始，自上而下扫每一行，
只要这一行里出现了「当前需要的字符」，就把它匹配掉、指针后移一位。
扫完所有行后，如果 7 个字符都匹配到，就输出 YES。

为什么贪心是对的？越早匹配掉当前字符，后面可用的行就越多，
不会比「故意晚匹配」更差。

时间复杂度：O(n * m)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
3 3
abc
def
ghi

样例输出 1:
NO
"""
# @sample-end

# @sample-start
"""
样例输入 2:
8 2
nm
ex
it
td
ul
qu
ac
nt

样例输出 2:
YES
"""
# @sample-end

import sys

TARGET = "meituan"


def solve() -> None:
    """每行匹配一个目标字符，能匹配完就 YES"""
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    rows = data[2:2 + n]   # 第 2 个整数是列数 m，逐行匹配时用不到

    idx = 0
    for row in rows:
        if idx < len(TARGET) and TARGET[idx] in row:
            idx += 1
    sys.stdout.write("YES\n" if idx == len(TARGET) else "NO\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("3 3\nabc\ndef\nghi\n", "NO"),
        ("8 2\nnm\nex\nit\ntd\nul\nqu\nac\nnt\n", "YES"),
        ("7 1\nm\ne\ni\nt\nu\na\nn\n", "YES"),
        ("1 7\nmeituan\n", "NO"),   # 只有一行，凑不出 7 个字符
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
