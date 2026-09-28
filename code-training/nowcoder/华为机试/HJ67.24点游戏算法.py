# @nc app=nowcoder id=fbc417f314f745b1978fc751a54ac8cb topic=37 question=21290 lang=Python3
# 2026-09-25 15:45:39
# https://www.nowcoder.com/practice/fbc417f314f745b1978fc751a54ac8cb?tpId=37&tqId=21290
# [HJ67] 24点游戏算法

"""
HJ67. 24点游戏算法 —— DFS / 回溯

题目描述：
给出 4 个 1~10 的正整数，使用加减乘除运算（+ - * /），每个数字必须且只能用一次，
判断是否能组成表达式结果为 24（除法为实数除法）。数字可以组合成括号改变优先级。

输入格式：
一行 4 个正整数。

输出格式：
能组成 24 输出 "true"，否则输出 "false"。

核心思路：
- 深度优先搜索 + 回溯。
- 每次从剩余数字中取出两个数 a、b，尝试六种运算 a+b、a-b、b-a、a*b、a/b、b/a，
  把结果放回集合，递归处理，直到只剩一个数时判断是否等于 24。
- 除法注意分母不为 0；浮点数比较用容差（|x-24|<1e-6）。
- 分支数有限（4 个数全排列组合），很快结束。
"""

# @sample-start
"""
样例输入 1:
7 2 1 10

样例输出 1:
true
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1 1 1 1

样例输出 2:
false
"""
# @sample-end

# @nc code=start

import sys


def can_reach_24(nums) -> bool:
    """判断当前数字集合能否通过运算得到 24"""
    if len(nums) == 1:
        return abs(nums[0] - 24) < 1e-6  # 浮点容差比较

    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = nums[i], nums[j]
            rest = [nums[k] for k in range(n) if k != i and k != j]  # 剩余数字

            candidates = [a + b, a - b, b - a, a * b]
            if b != 0:
                candidates.append(a / b)
            if a != 0:
                candidates.append(b / a)

            for val in candidates:
                if can_reach_24(rest + [val]):  # 递归，结果放回集合
                    return True
    return False


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    nums = [int(x) for x in data]
    print("true" if can_reach_24(nums) else "false")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("7 2 1 10\n", "true"),
        ("1 1 1 1\n", "false"),
        ("3 3 8 8\n", "true"),   # 8/(3-8/3)=24
        ("5 5 5 1\n", "true"),   # 5*(5-1/5)=24
        ("1 1 1 2\n", "false"),
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