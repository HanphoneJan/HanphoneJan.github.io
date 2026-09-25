"""
铺砖问题 - 用 1*2 / 2*2 方块铺满 r*c 空间

题目描述：
有一块 r*c 的矩形空间，现在有 1*2（可横放或竖放）和 2*2 两种方块，
要求用这些方块把空间填满（不能重叠、不能留空、不能超出边界）。
判断能否填满，若能填满，输出最少需要多少块方块。

输入格式：
- 第 1 行：整数 t，表示 t 组数据
- 接下来 t 行：每行两个整数 r c，表示空间的行数和列数

输出格式：
- 每组数据输出两行：
    第 1 行：Y（能填满）或 N（不能填满）
    第 2 行：最少需要的方块数；若不能填满则输出 -1

核心思路：
1. 可行性：每种方块覆盖的格子数为偶数（1*2 覆盖 2 格，2*2 覆盖 4 格），
   所以 r*c 必须是偶数；否则一定无法填满，输出 N 和 -1。
2. 最少块数：要让块数最少，就要尽量多用覆盖面积更大的 2*2 方块。
   设偶数维为 ev，奇数维为 od（若两维都偶，任取一维为 ev）：
   - 在 ev*od 区域中，能放下 ev/2 * (od-1)/2 个 2*2 方块；
   - 剩下的 ev*1 条状区域用 ev/2 个竖放的 1*2 方块填满；
   - 总块数 = (ev/2) * ((od-1)/2) + ev/2 = (ev/2) * ceil(od/2)。
   当两维都是偶数时，该式退化为 (r/2)*(c/2)，即全部用 2*2。

时间复杂度：O(t)，每组数据 O(1)
空间复杂度：O(1)
"""

import sys

# @sample-start
"""
样例输入 1:
3
2 3
1 3
2 2

样例输出 1:
Y
2
N
-1
Y
1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4
1 2
3 4
1 1
6 5

样例输出 2:
Y
1
Y
4
N
-1
Y
9
"""
# @sample-end


def min_blocks(r: int, c: int):
    """
    返回 (是否可填满, 最少方块数)
    - 不可填满时返回 (False, -1)
    """
    if (r * c) % 2 == 1:
        # 面积是奇数，任何方案都覆盖不了
        return False, -1

    if r % 2 == 0:
        # 以 r 为"偶数维"，按 2 行一组铺 2*2，剩余一列用竖放 1*2 补齐
        return True, (r // 2) * ((c + 1) // 2)
    else:
        # r 为奇数则 c 必为偶数，以 c 为"偶数维"
        return True, (c // 2) * ((r + 1) // 2)


# ============ 写法一（主）：逐行读取 sys.stdin.readline ============
# 每行一个测试用例，读一行处理一行，可读性最好。
# 注意：input = sys.stdin.readline 必须写在 solve() 内部，
# 才能兼容 run_tests() 里把 sys.stdin 换成 StringIO 的情况。
def solve():
    """主求解函数：读取输入、处理数据、输出结果"""
    input = sys.stdin.readline

    first = input()
    if not first:            # 空输入直接结束
        return
    t = int(first)

    out = []
    for _ in range(t):
        r, c = map(int, input().split())
        ok, blocks = min_blocks(r, c)
        out.append("Y" if ok else "N")
        out.append(str(blocks))

    sys.stdout.write("\n".join(out) + "\n")


# ============ 写法二（备选，注释保留）：一次性读取全部 token ============
# 用 sys.stdin.buffer.read() 一次读完再按 token 取用，
# 速度快、不关心输入分布在几行；StringIO 没有 .buffer，需用 .read().encode() 兜底。
#
# def _read_input():
#     """读取全部输入（兼容真实评测 stdin 与本地 StringIO 测试）"""
#     try:
#         return sys.stdin.buffer.read()
#     except AttributeError:
#         return sys.stdin.read().encode()
#
# def solve():
#     """主求解函数：读取输入、处理数据、输出结果"""
#     data = _read_input().split()
#     if not data:
#         return
#     it = iter(data)
#     t = int(next(it))
#
#     out = []
#     for _ in range(t):
#         r = int(next(it))
#         c = int(next(it))
#         ok, blocks = min_blocks(r, c)
#         out.append("Y" if ok else "N")
#         out.append(str(blocks))
#
#     sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        (
            "3\n2 3\n1 3\n2 2\n",
            "Y\n2\nN\n-1\nY\n1",
        ),
        (
            "4\n1 2\n3 4\n1 1\n6 5\n",
            "Y\n1\nY\n4\nN\n-1\nY\n9",
        ),
        (
            "1\n7 7\n",
            "N\n-1",
        ),
        (
            "1\n4 4\n",
            "Y\n4",
        ),
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
        print(f"样例 {i}: {status} (期望=...{expected!r}, 实际=...{output!r})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()