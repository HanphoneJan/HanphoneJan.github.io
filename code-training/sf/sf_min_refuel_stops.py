"""
加油站问题 - 求到达终点所需的最少停靠加油次数

题目描述：
汽车从起点出发驶向距离 L 公里处的终点，初始油量为 startFuel 升。
汽车每行驶 1 公里消耗 1 升油，油箱容量无限（最多能装的油没有上限）。
途中共有 n 个加油站，第 i 个加油站位于距离起点 ai 公里处，可加油 fi 升
（ai 按从小到大给出，0 < a1 < a2 < ... < an < L）。
求汽车到达终点所需的最少停靠加油次数；若无论如何都无法到达终点，输出 -1。

注意：
- 到达加油站时剩余油量为 0，也可以在该站加油；
- 到达终点时剩余油量为 0，也算到达。

输入格式：
- 第 1 行：三个整数 L n startFuel
- 接下来 n 行：每行两个整数 a f，表示加油站位置和油量

输出格式：
- 一行：一个整数，最少停靠加油次数；若无法到达终点，输出 -1

核心思路（贪心 + 大根堆）：
到达加油站时先不急着加油，把该站油量"预存"进大根堆。
每次油量不足以开到下一个站点时，才从堆里取出油量最多的那个站
"补加"一次油（次数 +1）。
这样每次都把油加在收益最大的站点上，保证总加油次数最少。
若堆为空仍然不够油，说明无法到达，输出 -1。

时间复杂度：O(n log n)
空间复杂度：O(n)
"""

import sys
import heapq

# @sample-start
"""
样例输入 1:
100 4 10
10 60
20 30
30 30
60 40

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
100 1 1
10 100

样例输出 2:
-1
"""
# @sample-end


def min_refuel_stops(L: int, n: int, startFuel: int, stations) -> int:
    """
    求最少加油次数；无法到达返回 -1。
    stations 为 [(位置, 油量), ...] 列表
    """
    # 加油站按位置排序（保证按顺序处理）
    stations.sort()
    # 把终点看作一个"虚拟加油站"（油量 0），统一处理最后一段路
    stations.append((L, 0))

    fuel = startFuel   # 当前油量（即当前还能行驶的公里数）
    prev = 0           # 上一个站点的位置
    ans = 0            # 加油次数
    pq = []            # 大根堆：路过但还没加油的站点油量（Python 堆存负数）

    for pos, f in stations:
        fuel -= (pos - prev)        # 消耗油量，尝试开到当前站点
        while fuel < 0 and pq:      # 油不够了，就"反悔"，补加之前油最多的站
            fuel -= heapq.heappop(pq)
            ans += 1
        if fuel < 0:                # 堆空了仍然不够油，无法到达
            return -1
        heapq.heappush(pq, -f)      # 把当前站点油量放入候选堆
        prev = pos

    return ans


# ============ 写法一（主）：逐行读取 sys.stdin.readline ============
# 每行一个加油站，读一行处理一行，可读性最好。
# 注意：input = sys.stdin.readline 必须写在 solve() 内部，
# 才能兼容 run_tests() 里把 sys.stdin 换成 StringIO 的情况。
def solve():
    """主求解函数：读取输入、处理数据、输出结果"""
    input = sys.stdin.readline

    first = input()
    if not first:            # 空输入直接结束
        return
    L, n, startFuel = map(int, first.split())

    stations = []
    for _ in range(n):
        a, f = map(int, input().split())
        stations.append((a, f))

    print(min_refuel_stops(L, n, startFuel, stations))


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
#     L = int(next(it))
#     n = int(next(it))
#     startFuel = int(next(it))
#
#     stations = []
#     for _ in range(n):
#         a = int(next(it))
#         f = int(next(it))
#         stations.append((a, f))
#
#     print(min_refuel_stops(L, n, startFuel, stations))


def run_tests():
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        (
            "100 4 10\n10 60\n20 30\n30 30\n60 40\n",
            "2",
        ),
        (
            "100 1 1\n10 100\n",
            "-1",
        ),
        (
            "1 0 1\n",
            "0",
        ),
        (
            "100 0 50\n",
            "-1",
        ),
        (
            "10 2 5\n4 10\n8 5\n",
            "1",
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
        print(f"样例 {i}: {status} (期望={expected}, 实际={output})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()