"""
P5426. 连续保留与深度量化 - 双指针 + 单调队列

一层的 N 个参数块各有重要度 S_i 与内存占用 M_i。要求：
1. 常规连续剪枝：选一段连续块，满足内存之和 <= B，最大化重要度之和；
2. 位宽折损：在选中的连续段里，把重要度最小的那一块（平局取内存最大的一块）
   内存变成 floor(M_i / 2)、重要度变成 0，再要求内存之和 <= B，
   最大化剩余重要度之和。折损是可选项。

输入格式：
- 第 1 行：N、B；
- 第 2 行：N 个正整数 S_i；
- 第 3 行：N 个正整数 M_i。

输出格式：
- 一行两个整数：常规最大重要度之和、允许折损后的最大重要度之和。

核心思路：
1. 第一问：S_i、M_i 都是正数，所以区间越长，重要度之和越大、内存和也越大。
   固定右端点，把左端点一路右移直到内存不超预算，得到的窗口就是该右端点下
   的最优段。双指针 O(N)。
2. 第二问：先确定“折损谁”。规则是重要度最小、平局内存最大，
   等价于取区间内 (S_i, -M_i, 下标) 最小的那一块，用单调队列维护。
3. 关键性质：把“折损后的有效内存”记作
       Eff(l, r) = sum(M[l..r]) - ceil(M_target / 2)，
   其中 target 是区间的折损对象。往区间里再加一块时，
   - 若新块不是折损对象，Eff 增加 M_new > 0；
   - 若新块成了折损对象，Eff 增加 floor(M_new/2) + ceil(M_old/2) > 0。
   也就是 Eff 关于区间扩张严格递增，于是“可行区间”对扩张封闭，
   第二问同样可以用双指针：右端点右移时，左端点只会右移，不会左移。
4. 因为重要度之和（扣除折损块后）关于区间扩张也严格递增，所以对每个右端点，
   最靠左的可行左端点就是最优左端点。

时间复杂度：O(N)
空间复杂度：O(N)，单调队列
"""

# https://codefun2000.com/p/P5426
import sys
from collections import deque

# @sample-start
"""
样例输入 1:
4 13
80 15 80 15
6 3 6 3

样例输出 1:
110 160
"""
# @sample-end

# @sample-start
"""
样例输入 2:
5 12
8 16 24 32 40
5 6 7 4 3

样例输出 2:
72 72
"""
# @sample-end


def solve():
    """读入参数块信息，分别计算常规剪枝与允许折损后的最大重要度之和。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    it = iter(data)
    n = int(next(it))
    budget = int(next(it))
    score = [int(next(it)) for _ in range(n)]
    memory = [int(next(it)) for _ in range(n)]

    # ---------- 第一问：滑动窗口求“内存和 <= B 的最大重要度和” ----------
    # 因为 M_i >= 1，窗口内存随左端点右移而单调减小，右端点可以只往右走。
    best_plain = 0
    left = 0
    window_memory = 0
    window_score = 0
    for right in range(n):
        window_memory += memory[right]
        window_score += score[right]

        # 收缩到内存不超预算为止；若单块就超预算，窗口会被收成空的
        while window_memory > budget and left <= right:
            window_memory -= memory[left]
            window_score -= score[left]
            left += 1

        # 窗口非空时，它就是“以 right 结尾的最优合法段”：
        # 再往左扩只会增加内存，而所有重要度都是正的，扩不动才是最优。
        if left <= right and window_score > best_plain:
            best_plain = window_score

    # ---------- 第二问：把“折损对象”也纳入滑动窗口 ----------
    # 折损对象的排序键：重要度最小，其次内存最大，最后下标最小（保证唯一）。
    keys = [(score[i], -memory[i], i) for i in range(n)]

    best_discount = best_plain  # 折损是可选项，至少不会比常规方案差
    left = 0
    window_memory = 0
    window_score = 0
    # 单调队列：队首是当前窗口内键最小的元素，也就是折损对象
    min_queue = deque()

    for right in range(n):
        window_memory += memory[right]
        window_score += score[right]

        # 新元素入队前，弹掉队尾所有键比它大的元素：
        # 它们既比新元素“差”，又会比新元素先离开窗口，以后不可能再成为折损对象。
        key_right = keys[right]
        while min_queue and keys[min_queue[-1]] >= key_right:
            min_queue.pop()
        min_queue.append(right)

        while min_queue:
            target = min_queue[0]
            # 折损 target 之后，这段区间实际占用的内存
            effective = window_memory - (memory[target] + 1) // 2
            if effective <= budget:
                break
            # 仍然超预算，只能把左端点右移（Eff 关于扩张严格递增，这里不会漏解）
            window_memory -= memory[left]
            window_score -= score[left]
            if min_queue[0] == left:
                min_queue.popleft()
            left += 1

        if min_queue:
            # 窗口非空，且重要度之和（去掉折损块）关于扩张递增，
            # 所以当前窗口就是以 right 结尾的最优段
            target = min_queue[0]
            candidate = window_score - score[target]
            if candidate > best_discount:
                best_discount = candidate

    print(best_plain, best_discount)


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：常规 110；折损中间的 15 后可以留下 [80, 15, 80]
        (
            "4 13\n80 15 80 15\n6 3 6 3\n",
            "110 160",
        ),
        # 官方样例 2：折损不带来额外收益
        (
            "5 12\n8 16 24 32 40\n5 6 7 4 3\n",
            "72 72",
        ),
        # 单块且本来就放得下：折损只会让重要度变 0，不应被选中
        (
            "1 1\n5\n1\n",
            "5 5",
        ),
        # 单块放不下，但折损后放得下：这段重要度全被折损掉，结果是 0
        (
            "1 1\n5\n3\n",
            "0 0",
        ),
        # 单块折损后仍然放不下：没有任何合法段
        (
            "1 1\n5\n4\n",
            "0 0",
        ),
        # 重要度相同的平局：必须折损内存更大的那一块（第 2 块，M = 9），
        # 折损后内存 1 + 4 + 1 = 6 <= 6，重要度 15 - 5 = 10
        (
            "3 6\n5 5 5\n1 9 1\n",
            "5 10",
        ),
        # 折损块在中间：中间那块内存 10，折损后左右两段才能真正连起来。
        # 区间 [0,3] 有效内存 2+2+10+2-5 = 11 <= 11，重要度 28 - 1 = 27
        (
            "5 11\n9 9 1 9 9\n2 2 10 2 2\n",
            "18 27",
        ),
        # 全段内存 23 超过预算 20，但折损内存 6 的那块后只剩 20，重要度 16
        (
            "5 20\n3 6 1 1 6\n6 4 1 6 6\n",
            "14 16",
        ),
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
        print(f"样例 {i}: 期望={expected!r}, 实际={output!r} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
