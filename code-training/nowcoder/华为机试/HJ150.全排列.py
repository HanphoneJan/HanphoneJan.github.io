# @nc app=nowcoder id=1d1fe38275da44b5848add89f9e223b1 topic=37 question=46415 lang=Python3
# 2026-09-29 01:16:44
# https://www.nowcoder.com/practice/1d1fe38275da44b5848add89f9e223b1?tpId=37&tqId=46415
# [HJ150] 全排列

"""
HJ150. 全排列 —— 回溯 / DFS

题目描述：
给定整数 n，按字典序输出 1 到 n 的所有排列。

输入格式：
一行一个整数 n。

输出格式：
每行输出一个排列（n 个整数，空格分隔），按字典序升序。

核心思路：
- 用回溯法生成全排列：依次选择每个未使用的数字填入当前位置。
- 从小到大遍历候选数字，自然得到字典序。
- 时间复杂度 O(n!)，空间 O(n)（回溯栈）。
"""

# @sample-start
"""
样例输入 1:
3

样例输出 1:
1 2 3
1 3 2
2 1 3
2 3 1
3 1 2
3 2 1
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    n = int(sys.stdin.readline().strip())

    res = []
    path = []
    used = [False] * (n + 1)

    def backtrack():
        if len(path) == n:
            res.append(' '.join(map(str, path)))
            return
        for x in range(1, n + 1):      # 从小到大，保证字典序
            if not used[x]:
                used[x] = True
                path.append(x)
                backtrack()
                path.pop()
                used[x] = False

    backtrack()
    print('\n'.join(res))


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n", "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1"),
        ("1\n", "1"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected!r}, 实际={output!r}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end