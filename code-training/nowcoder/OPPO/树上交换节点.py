# 牛客 · OPPO 笔试真题
# https://www.nowcoder.com/practice/cff486989bba4f359847a8845fcc518a
# 树上交换节点（OPPO 2023 秋招 · 后端岗）

"""
树上交换节点 —— 置换 / 找环

题目描述：
一棵 n 个结点的树，每个结点有一个权值，权值恰好是 1..n 的一个排列 a。
每次操作可以交换任意两个结点的权值，问最少多少次交换能让第 i 个结点的
权值变成 i。

输入格式：
第一行一个正整数 n（2 <= n <= 1000）。
第二行 n 个正整数 a_i，是 1..n 的排列。
接下来 n-1 行，每行两个整数 u, v，表示一条边。

输出格式：
一个整数，表示最小交换次数。

核心思路：
1. 把「结点 i 上放着权值 a_i」看成置换 i -> a_i。目标状态是每个结点
   放自己的编号，即所有环都拆成自环。
2. 一个长度 L 的环，最少用 L-1 次交换就能全部归位：固定第一个位置，
   依次把该来的权值换过来即可。L 个自环不需要交换。
3. 所以总次数 = sum(L_i - 1) = n - 环的个数。
4. 树的结构完全用不上：题目允许交换「任意两个结点」的权值，与两点在树上
   是否相邻无关。给出的边只是为了把题面包装成树，读入后直接忽略。

时间复杂度：O(n)
空间复杂度：O(n)
"""

# @sample-start
"""
样例输入 1:
4
2 1 4 3
1 2
2 3
2 4

样例输出 1:
2
"""
# @sample-end

import sys


def solve() -> None:
    """置换分解成环，答案 = n - 环数；树的边读掉即可，不参与计算"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    pos = 0
    n = int(data[pos]); pos += 1
    perm = [0] * (n + 1)
    for i in range(1, n + 1):
        perm[i] = int(data[pos]); pos += 1
    # 后面的 n-1 条边与答案无关，直接跳过（token 已经全部读进 data 里）

    visited = [False] * (n + 1)
    cycles = 0
    for i in range(1, n + 1):
        if not visited[i]:
            cycles += 1
            j = i
            while not visited[j]:               # 顺着置换走完整个环
                visited[j] = True
                j = perm[j]

    sys.stdout.write(str(n - cycles) + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io
    tests = [
        ("4\n2 1 4 3\n1 2\n2 3\n2 4\n", "2"),
        ("2\n2 1\n1 2\n", "1"),                 # 一个二元环
        ("3\n2 3 1\n1 2\n2 3\n", "2"),          # 一个三元环 = 3-1 次
        ("3\n1 2 3\n1 2\n2 3\n", "0"),          # 已经有序
        ("5\n2 1 3 5 4\n1 2\n1 3\n1 4\n1 5\n", "2"),  # 两个二元环
    ]
    class FakeStdin:
        """把字符串包成带 buffer 的 stdin，供 sys.stdin.buffer.read() 使用"""

        def __init__(self, text: str) -> None:
            self.buffer = io.BytesIO(text.encode())

    for i, (inp, expected) in enumerate(tests, 1):
        sys.stdin = FakeStdin(inp)
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
