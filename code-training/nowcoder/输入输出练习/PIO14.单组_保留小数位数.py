# @nc app=nowcoder id=a4bccea7f4644fbda1208f8e0d397bab topic=372 question=10979394 lang=Python3
# 2026-10-15 20:10:08
# https://www.nowcoder.com/practice/a4bccea7f4644fbda1208f8e0d397bab?tpId=372&tqId=10979394
# [PIO14] 单组_保留小数位数

"""
PIO14. 单组 保留小数位数 —— ACM 输入输出基础

题目描述：
给定一个小数 x，请你保留 3 位小数后输出。
如果原来的小数位数少于 3 位，需要补 0；
如果多于 3 位，需要四舍五入到 3 位。

输入格式：
第一行有一个小数 x。

输出格式：
输出一个小数，保留 3 位。

核心思路：
Python 的格式化字符串 f"{x:.3f}" 同时完成三件事：
四舍五入、不足补 0、统一保留固定位数。
注意必须先把输入转成 float；如果直接对字符串做切片补零，
遇到 114.514 这种「刚好 3 位」和 123 这种「没有小数点」的情况
都要单独判断，反而容易出错。

时间复杂度：O(1)
空间复杂度：O(1)
"""

# @sample-start
"""
样例输入 1:
1.23

样例输出 1:
1.230
"""
# @sample-end

# @sample-start
"""
样例输入 2:
114.514

样例输出 2:
114.514
"""
# @sample-end

# @sample-start
"""
样例输入 3:
123

样例输出 3:
123.000
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """读取一个小数，保留 3 位小数输出"""
    line = sys.stdin.readline().split()
    if not line:
        return
    x = float(line[0])
    # 正常只有一个小数；若输入额外给出位数 k，则按 k 保留（兼容变体数据）
    k = int(line[1]) if len(line) > 1 else 3
    sys.stdout.write(f"{x:.{k}f}\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("1.23\n", "1.230"),
        ("114.514\n", "114.514"),
        ("123\n", "123.000"),
        ("3.14159\n", "3.142"),     # 四舍五入
        ("3.14159 2\n", "3.14"),    # 兼容「指定位数」的输入
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            actual = sys.stdout.getvalue().strip()
        finally:
            sys.stdin = sys.__stdin__
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected!r}, 实际={actual!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()

# @nc code=end
