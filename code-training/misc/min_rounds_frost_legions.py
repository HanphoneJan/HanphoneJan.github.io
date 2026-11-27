"""
冰冻清剿 - 求清空全部军团所需的最少回合数

题目描述：
敌方有 n 支军团，第 i 支军团的血量为 a_i。
我方每回合先选择一支军团造成 x 点单体伤害，再对全体军团造成 y 点冰冻伤害。
单体伤害一次只能打一支军团，超出其剩余血量的部分直接作废；
两段伤害都在当回合结算。所有军团血量都不大于 0 时获胜。
求获胜所需的最少回合数。

输入格式：
- 第一行：三个整数 n x y
- 第二行：n 个整数 a_1 ... a_n

输出格式：
- 一行：一个整数，最少回合数

核心思路（二分答案）：
固定回合数 R，每支军团会吃到 R*y 点冰冻伤害，
剩余 d_i = max(0, a_i - R*y) 只能靠单体伤害补。
一次单体伤害只能打一支军团且溢出作废，所以需要 ceil(d_i / x) 次。
R 回合只有 R 次单体机会，因此 R 可行 <=> sum(ceil(d_i / x)) <= R。
R 越大判定越松，所以可以二分 R。
上界取「完全不用冰冻、每支军团纯靠单体打掉」的总次数。

时间复杂度：O(n log S)，S = sum(ceil(a_i / x))
空间复杂度：O(n)
"""

import sys

# @sample-start
"""
样例输入 1:
3 2 1
5 4 3

样例输出 1:
3
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5 100 1
4 4 4 4 4

样例输出 2:
4
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 3 2
5

样例输出 3:
1
"""
# @sample-end


def min_rounds(x: int, y: int, hp) -> int:
    """返回清空全部军团所需的最少回合数。"""
    # 上界：完全不用冰冻，每支军团都靠单体伤害单独打掉，一定可行
    lo, hi = 0, sum((h + x - 1) // x for h in hp)

    def ok(rounds: int) -> bool:
        """rounds 回合内能否清空。"""
        hits = 0
        for h in hp:
            rest = h - rounds * y
            if rest > 0:
                # 一次单体只能打一支军团，且溢出作废，所以按军团向上取整
                hits += (rest + x - 1) // x
                if hits > rounds:      # 后面只会更多，提前结束
                    return False
        return True

    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid        # mid 可行，答案在 [lo, mid]
        else:
            lo = mid + 1    # mid 不可行，答案在 [mid+1, hi]
    return lo


def solve() -> None:
    """主求解函数：读取输入、处理数据、输出结果"""
    data = sys.stdin.read().split()
    if not data:                   # 空输入直接结束
        return
    n, x, y = map(int, data[:3])
    hp = list(map(int, data[3:3 + n]))
    print(min_rounds(x, y, hp))


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3 2 1\n5 4 3\n", "3"),
        ("5 100 1\n4 4 4 4 4\n", "4"),
        ("1 3 2\n5\n", "1"),
        ("1 3 2\n10\n", "2"),
        ("1 1 1\n1\n", "1"),
        ("2 10 0\n6 6\n", "2"),
        ("3 5 1\n6 6 6\n", "3"),
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

        status = "[PASS]" if output == expected else "[FAIL]"
        print(f"样例 {i}: {status} (期望={expected}, 实际={output})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
