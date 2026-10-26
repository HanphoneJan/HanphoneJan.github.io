"""
P5427. 质因数跳跃 - 隐式图 BFS 可达性

题面要点：
- 序列 seq 长 m，位置 p 初始在下标 0；每步取 d = seq[p] 的某个质因数
 （互异的最大只有几个），跳到 p+d 或 p-d，且必须 0 <= p-d 与 p+d <= m-1。
- seq[p] = 1 时没有质因数，该格没有出边；质因数指质数因子（1 不是）。
- 问能否恰好到达最后一个下标 m-1。输出 true / false。

输入格式：一行若干正整数（1 <= m <= 1e4，1 <= seq[p] <= 1e3）。

输出格式：true 或 false。

核心思路（为什么是 BFS）：
1. 「下标 + 现在在哪」没有别的状态：格子值只决定出边，不随路径变化，
   所以这就是一张 m 个点的隐式图，问 0 到 m-1 的可达性——搜索一遍即可。
2. 数据范围把搜索写法定下来：m <= 1e4、值 <= 1e3。每个值的互异质因数
   很少（2*3*5*7*11*13 = 30030，1000 以内至多 4 个），出边常数级，
   BFS 的 O(m) 完全够；质因数用 1000 以内的最小质因数筛预处理后去重可查。
3. 熟知的几个坑都对应边界：m=1 时起点即终点（true）；值为 1 无出边；
   步长是质因数不是任意因子（4、8、9 不行）；走回头路靠 visited 挡住。

时间复杂度：O(1000 + m * k)（k 为单值互异质因数个数上限 4）
空间复杂度：O(m)
"""

# https://codefun2000.com/p/P5427
import sys
from collections import deque

# @sample-start
"""
样例输入 1:
4 1 1 9

样例输出 1:
false
"""
# @sample-end

# @sample-start
"""
样例输入 2:
10 1 4 9 1

样例输出 2:
true
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 6 8

样例输出 3:
false
"""
# @sample-end


def smallest_prime_factors(limit):
    """埃尔拉托式最小质因数筛，spf[x] 是 x 的最小质因数（x >= 2）。"""
    spf = list(range(limit + 1))
    i = 2
    while i * i <= limit:
        if spf[i] == i:
            for j in range(i * i, limit + 1, i):
                if spf[j] == j:
                    spf[j] = i
        i += 1
    return spf


def distinct_prime_factors(spf, cache, x):
    """x 的互异质因数列表；x = 1 时为空（1 不含质因数）。"""
    if x not in cache:
        factors = set()
        v = x
        while v > 1:
            f = spf[v]
            factors.add(f)
            while v % f == 0:
                v //= f
        cache[x] = sorted(factors)
    return cache[x]


def solve():
    """从下标 0 出发按质因数步长搜索，判断能否到达 m-1。"""
    seq = list(map(int, sys.stdin.buffer.read().split()))
    m = len(seq)
    if m == 0:
        print("false")
        return
    if m == 1:
        # 起点就是最后一个下标，不需要任何跳跃。
        print("true")
        return

    spf = smallest_prime_factors(max(seq))
    cache = {}

    target = m - 1
    visited = [False] * m
    visited[0] = True
    queue = deque([0])
    while queue:
        p = queue.popleft()
        if p == target:
            print("true")
            return
        for d in distinct_prime_factors(spf, cache, seq[p]):
            for q in (p + d, p - d):
                if 0 <= q < m and not visited[q]:
                    if q == target:
                        print("true")
                        return
                    visited[q] = True
                    queue.append(q)
    print("false")


def run_tests():
    """运行嵌入的官方样例与自加用例，方便本地自测。"""
    import io

    def run(stdin_text):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 快速读取，这里提供带 buffer 的文本流。
        sys.stdin = io.TextIOWrapper(io.BytesIO(stdin_text.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            return sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

    test_cases = [
        # 官方样例 1：跳到值 1 的格子后无出边
        ("4 1 1 9\n", "false"),
        # 官方样例 2：10 有两个质因数，沿 2 两次到末位；末位是 1 也能到
        ("10 1 4 9 1\n", "true"),
        # 官方样例 3：起点值为 1，无质因数无法离开
        ("1 6 8\n", "false"),
        # m=1：起点即最后一个下标，值为 1 也是 true
        ("1\n", "true"),
        ("5\n", "true"),
        # 步长可以是质数本身：7 是质数，质因数只有 7，一步直达
        ("7 1 1 1 1 1 1 1\n", "true"),
        # 复数因子不是步长：6 的质因数是 2、3，不是 1、6
        ("2 1 1 9 5\n", "false"),
        # m=9 三步一步长 3 的链：0->3->6 后 6+3 越界、6-3 回走己访问，false
        ("3 1 1 1 1 1 1 1 1\n", "false"),
        # 有环也能停住：0(6)->2(4)->4(6)->6 即终点，visited 防止往返死循环
        ("6 4 6 4 6 4 6\n", "true"),
        # 回头跳也允许：0 被 2 送到 2，2 的 4 只能回 0 或去 4；终点 5
        # 需要经过 2(值6, d=3) -> 5
        ("4 1 6 9 1 1\n", "true"),
    ]

    failures = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        output = run(inp)
        ok = output == expected
        if not ok:
            failures += 1
        print(f"样例 {i}: 期望={expected}, 实际={output} {'✓' if ok else '✗'}")

    # 极端规模：m=10000 全 3 的链，0->3->6->...->9999 共 3334 步可达，
    # 必须秒级返回 true
    import time

    n = 10000
    big = "3 " * n + "\n"
    start = time.time()
    output = run(big)
    cost = time.time() - start
    ok = output == "true" and cost < 5
    if not ok:
        failures += 1
    print(f"规模 10000: 实际={output} 耗时 {cost:.2f}s {'✓' if ok else '✗'}")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
