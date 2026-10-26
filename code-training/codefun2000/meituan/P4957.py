"""
P4957. 闪耀之塔 - 盒顶数组 + 二分（模拟）

n 个宝石按闪耀值依次放入一排盒子：从左往右找第一个「盒顶严格大于当前
宝石」的盒子叠上去；找不到就在最右侧新建盒子。每次放完记录所有盒子
层数的异或和。

核心思路：
1. 只需维护每个盒子的盒顶值 top[]。盒子一旦放过宝石就永不为空，所以
   放置规则就是「第一个 top 严格大于 x 的盒子，没有就新建」。
2. 关键观察：top[] 始终非递减。归纳：选中盒子 i 时它是第一个严格大于
   x 的位置，即 top[i-1] <= x < top[i]；替换后新的 top[i] = x 落在
   [top[i-1], top[i]) 里，且 x < 原来的 top[i] <= top[i+1]，非递减不变；
   新建盒子时所有盒顶都 <= x，把 x 追加在末尾同样有序。
   于是「第一个严格大于 x 的位置」就是 bisect_right(top, x)，二分完成，
   选中后直接原地赋值即可，数组仍有序。
3. 异或和增量维护：选中第 i 个盒子时层数 h 变为 h+1，异或和
   X ^= h ^ (h+1)；新建盒子时 X ^= 1。

输入格式：
- 第 1 行：T；
- 每组：第一行 n；第二行 n 个闪耀值。

输出格式：
- 每组一行 n 个整数，第 i 个是放入前 i 个宝石后的层层数异或和。

时间复杂度：单组 O(n log n)（bisect 在 C 层）
空间复杂度：O(n)
"""

# https://codefun2000.com/p/P4957
import io
import sys
from bisect import bisect_right


def tower_xors(seq):
    """依次放入 seq 的宝石，返回每一步的层数异或和。"""
    top = []      # 各盒子盒顶闪耀值，始终非递减
    height = []   # 各盒子层数
    cur = 0       # 当前所有盒子层数的异或和
    res = []
    for x in seq:
        pos = bisect_right(top, x)  # 第一个盒顶严格大于 x 的盒子
        if pos == len(top):
            # 没有盒子能放：最右侧新建
            top.append(x)
            height.append(1)
            cur ^= 1
        else:
            h = height[pos]
            # 层数 h -> h+1，异或和先去掉旧值再加上新值
            cur ^= h ^ (h + 1)
            height[pos] = h + 1
            # x >= top[pos-1] 且 x < 原来的 top[pos]，原地赋值仍有序
            top[pos] = x
        res.append(cur)
    return res


def solve():
    data = sys.stdin.buffer.read().split()
    it = iter(data)
    t = int(next(it))
    out = []
    for _ in range(t):
        n = int(next(it))
        seq = [int(next(it)) for _ in range(n)]
        out.append(" ".join(map(str, tower_xors(seq))))
    sys.stdout.write("\n".join(out) + "\n")


def run_tests():
    """运行嵌入的官方样例，并用逐盒暴力模拟对拍随机序列。"""
    import random

    test_cases = [
        # 官方样例 1：一路叠进唯一的盒子
        ("1\n5\n5 4 3 2 1\n", "1 2 3 4 5"),
        # 官方样例 2：找第一个盒顶严格大于当前宝石的盒子
        ("1\n6\n3 5 2 4 2 1\n", "1 0 3 0 1 0"),
        # 官方样例 3：全部相等 -> 「严格大于」不成立，每步都新建
        ("1\n4\n10 10 10 10\n", "1 0 1 0"),
        # 单个宝石
        ("1\n1\n7\n", "1"),
        # 严格递增：每次都新建，异或和 1,0,1,0,...
        ("1\n5\n1 2 3 4 5\n", "1 0 1 0 1"),
        # n=1 组数组相邻（T 组循环边界）
        ("2\n1\n7\n1\n7\n", "1\n1"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

    # 暴力对拍：老实维护每个盒子的栈，找第一个严格大于的盒子
    def brute(seq):
        tops = []   # 每盒只有盒顶有意义
        out = []
        cur = 0
        heights = []
        for x in seq:
            placed = False
            for bi in range(len(tops)):
                if tops[bi] > x:
                    cur ^= heights[bi] ^ (heights[bi] + 1)
                    heights[bi] += 1
                    tops[bi] = x
                    placed = True
                    break
            if not placed:
                tops.append(x)
                heights.append(1)
                cur ^= 1
            out.append(cur)
        return out

    random.seed(20261027)
    fail = None
    for case_no in range(1, 1501):
        n = random.randint(1, 40)
        seq = [random.randint(0, 12) for _ in range(n)]
        got = tower_xors(seq)
        want = brute(seq)
        if got != want:
            fail = (seq, want, got)
            break
    print("暴力对拍 1500 组随机序列：" + ("全部一致" if fail is None else f"失败 {fail}"))
    if fail is not None:
        return

    # 断言「top 非递减」的归纳不变量确实被代码保持
    random.seed(99)
    for case_no in range(1, 501):
        n = random.randint(1, 60)
        seq = [random.randint(0, 30) for _ in range(n)]
        top = []
        for x in seq:
            pos = bisect_right(top, x)
            if pos == len(top):
                top.append(x)
            else:
                top[pos] = x
            if any(top[i] > top[i + 1] for i in range(len(top) - 1)):
                print(f"不变量破坏: seq={seq} top={top}")
                return
    print("top 非递减不变量 500 组随机校验通过")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
