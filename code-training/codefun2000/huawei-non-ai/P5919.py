"""
P5919. 脉冲后序右侧和 - 单调栈还原 BST + 右缘轮廓

一段两两不同的正整数序列，声称是某棵二叉排序树的后序遍历。
先校验它能否还原；能还原时，求「右缘轮廓」的强度总和——从树的
右侧望过去，每层最后一个（最靠右的）结点强度之和；不能还原输出 -1。

输入格式：
- 单独一行，若干空格隔开的正整数（长度 m ≤ 10000，值 ≤ 1e9 且互不相同）。

输出格式：
- 能还原时输出右缘轮廓强度总和；否则输出 -1。

核心思路：
后序遍历倒着读是「根 → 右子树 → 左子树」。维护一条单调递增的栈
（还没向左分叉的右脊）：当前值比栈顶大，就作为栈顶的右孩子入栈，
必须落在 (栈顶, 栈顶上界) 这个开区间里；比栈顶小，就把所有比它大的
结点弹出，最后一个弹出的是它的父亲，它作为左孩子必须大于父亲自己的
下界。两处区间检查任一不满足即整段作废。整个过程每条边只处理一次，
O(m) 内还原完毕，也不受树退化成链时的递归深度影响。校验通过后再用
显式栈做一次「先右后左」的 DFS，每个深度第一次到达的结点就是该层
最靠右的结点。

时间复杂度：O(m)
空间复杂度：O(m)
"""

# https://codefun2000.com/p/P5919
import io
import sys

# @sample-start
"""
样例输入 1:
3 8 6 12 15 10

样例输出 1:
37
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 10 5 8

样例输出 2:
-1
"""
# @sample-end

# @sample-start
"""
样例输入 3:
4 7 9

样例输出 3:
20
"""
# @sample-end


def run(post):
    """校验并求右缘轮廓和；不能还原返回 -1。"""
    m = len(post)
    if m == 1:
        return post[0]

    left = [-1] * m
    right = [-1] * m
    # 栈元素：(值, 子树取值下界, 子树取值上界, 结点下标)，
    # 左右孩子的取值都必须落在开区间（下界, 上界）之内
    stack = [(post[-1], 0, 1 << 62, m - 1)]

    for i in range(m - 2, -1, -1):
        v = post[i]
        if v > stack[-1][0]:
            # 比栈顶大：作为栈顶的右孩子
            val, _lo, hi, p = stack[-1]
            if v >= hi:
                return -1
            right[p] = i
            stack.append((v, val, hi, i))
        else:
            # 比栈顶小：弹出所有更大的结点，最后弹出的就是父亲
            parent = stack.pop()
            while stack and stack[-1][0] > v:
                parent = stack.pop()
            # v 是父亲的左孩子，必须落在父亲子树的开区间下界之上
            if v <= parent[1]:
                return -1
            left[parent[3]] = i
            stack.append((v, parent[1], parent[0], i))

    # 先右后左的 DFS：栈是后进先出，左孩子先入队、右孩子后入队，
    # 每个深度第一次出栈的就是该层最靠右的结点
    total = 0
    visited = set()
    work = [(m - 1, 0)]
    while work:
        node, depth = work.pop()
        if depth not in visited:
            visited.add(depth)
            total += post[node]
        if left[node] != -1:
            work.append((left[node], depth + 1))
        if right[node] != -1:
            work.append((right[node], depth + 1))
    return total


def solve():
    post = [int(x) for x in sys.stdin.buffer.read().split()]
    if not post:
        return
    print(run(post))


def run_tests():
    """运行嵌入的官方样例与边界/随机对拍用例，方便本地自测。"""
    import random
    from itertools import permutations

    cases = [
        # 官方样例 1：右缘 10 + 15 + 12 = 37
        ("3 8 6 12 15 10\n", "37"),
        # 官方样例 2：10 落在左子树里，破坏 BST 性质
        ("3 10 5 8\n", "-1"),
        # 官方样例 3：一路向左的链，右缘就是这条链
        ("4 7 9\n", "20"),
        # 单结点：它自己就是全部
        ("5\n", "5"),
        # 严格递增：整棵树是一条左链，右缘从底到顶全部可见
        ("1 2 3 4 5 6 7\n", "28"),
        # 严格递减：整棵树是一条右链，右缘就是全链之和
        ("7 6 5 4 3 2 1\n", "28"),
        # 3 挂成根 4 的左孩子后，5 再无处可挂（越 4 的上界）
        ("5 3 4\n", "-1"),
        # 右孩子的孩子越过（祖父）上界：5 只能挂在 2 的右孩子上，却大于 4 的上界
        ("1 5 2 4\n", "-1"),
        # 比样例 1 多一枚挂在最左下、轮廓仍与样例 1 相同
        ("5 6 12 15 10\n", "37"),
        # 双结点两种次序：和都是 3
        ("1 2\n", "3"),
        ("2 1\n", "3"),
        # 10000 长度左链（严格递增序列），O(m) 直通
        (" ".join(map(str, range(1, 10001))) + "\n", str(sum(range(1, 10001)))),
        # 10000 长度右链（严格递减序列）
        (" ".join(map(str, range(10000, 0, -1))) + "\n", str(sum(range(1, 10001)))),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout
        status = "✓" if output == expected else "✗"
        print(f"用例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机对拍：小规模全排列穷举 + 较大规模随机抽样，
    # 与「递归区间校验 + 递归建树求右缘」的独立实现比对
    random.seed(20261027)
    fails = 0
    checked = 0

    def brute(post):
        """递归版：区间校验通过则建树求右缘和，否则 -1。"""
        def ok(seq, lo, hi):
            if not seq:
                return True
            root = seq[-1]
            if not (lo < root < hi):
                return False
            k = len(seq) - 1
            while k > 0 and seq[k - 1] > root:
                k -= 1
            # 后半段 > root 是右子树，前半段 < root 是左子树
            return ok(seq[k:-1], root, hi) and ok(seq[:k], lo, root)

        if not ok(post, 0, 1 << 62):
            return -1

        def build(seq, lo, hi):
            root = seq[-1]
            k = len(seq) - 1
            while k > 0 and seq[k - 1] > root:
                k -= 1
            left_sub = build(seq[:k], lo, root) if k else None
            right_sub = build(seq[k:-1], root, hi) if k < len(seq) - 1 else None
            return (root, left_sub, right_sub)

        tree = build(post, 0, 1 << 62)
        seen, total = set(), 0

        def walk(node, depth):
            nonlocal total
            if node is None:
                return
            # 先右后左：每个深度第一次到达的就是最靠右结点
            if depth not in seen:
                seen.add(depth)
                total += node[0]
            walk(node[2], depth + 1)
            walk(node[1], depth + 1)

        walk(tree, 0)
        return total

    for m in (1, 2, 3, 4, 5, 6):
        for perm in permutations(range(1, m + 1)):
            got, expect = run(list(perm)), brute(list(perm))
            checked += 1
            if got != expect:
                fails += 1
                print(f"穷举不一致: {list(perm)} got={got} expect={expect}")
    for _ in range(400):
        m = random.randint(7, 11)
        perm = list(range(1, m + 1))
        random.shuffle(perm)
        got, expect = run(perm), brute(perm)
        checked += 1
        if got != expect:
            fails += 1
            print(f"抽样不一致: {perm} got={got} expect={expect}")
    print(f"对拍 {checked} 组: {'全部一致 ✓' if fails == 0 else f'{fails} 组不一致 ✗'}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
