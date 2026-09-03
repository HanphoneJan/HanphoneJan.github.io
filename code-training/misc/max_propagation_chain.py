"""
题目背景
在网络监控中，异常流量的流动通常具有局部聚集性。监控系统需要识别出高负载的基站（关键节点），并判断流量在这些节点之间定向的传播链的最长路径。

题目描述
网络监控规则：
- 直接关联：对于基站 A 和 B，若其曼哈顿距离 |xA-xB|+|yA-yB| ≤ ε_dist，则判定两者具有直接关联。
- 关键节点判定：计算一个基站及其所有具有“直接关联”属性的基站（含自身）的流量负载 w 之和。若该总和 ≥ W_threshold，则该基站被判定为关键节点。

流量传播链路：
流量只能在关键节点之间定向流动，规则如下：
- 链路条件：若两个关键节点具有“直接关联”关系，且发生时间戳 t 不同，则流量从时间较早的基站流向时间较晚的基站。
  注意：若两个关联的关键节点发生时间完全相同，则它们之间无法建立有效的传播链路。
- 传播链条：传播链条是由一系列关键节点通过有向链路首尾相连构成的路径。
- 衡量指标：链条的规模为该路径上所有节点服务的用户数 Users 之和。
- 任务：计算全网中可能形成的所有传播链条中，能够覆盖的最大用户总数。

处理流程指引：
1. 节点识别：基于空间距离和流量负载阈值，从所有基站中筛选出满足要求的关键节点。
2. 构建拓扑：在关键节点间，基于空间关联和时间先后顺序（时间早 → 时间晚）建立定向传播关系。
3. 路径计算：在构成的有向传播网络中，寻找一条或多条连续路径，使得累计服务的用户数 Users 达到最大。

输入描述：
第1行：包含3个整数 N（基站总数，1≤N≤200）、ε_dist（空间阈值）和 W_threshold（负载阈值）。
第2行到第N+1行，每行包含5个整数：x, y, t, w, Users。
所有坐标、时间戳、负载和用户数的取值范围均为 [0, 10^9]。

输出描述：
输出一个整数，代表最大用户数。若全网无法形成任何链路或关键节点，输出0。

样例1：
输入：
3 1 500
0 0 10 100 50
1 0 20 100 50
0 1 30 100 50
输出：
0
说明：三个基站互为邻居，但每个基站的邻域负载和仅为300<500，无关键节点，输出0。

样例2：
输入：
4 1 150
0 0 10 100 10
1 0 20 100 10
5 5 10 200 100
5 6 30 200 100
输出：
200
说明：基站0和1互为邻居，各自负载和200>150，均为关键节点；它们时间不同（10<20），形成有向边0->1，路径用户数10+10=20？不对，样例输出200，说明用户数分别为100和100？实际样例2输出200：基站2和3也是关键节点，用户数100+100=200，形成链路2->3。所以最大用户数为200。
"""

import sys
from functools import lru_cache
import io

# @sample-start
"""
样例输入 1:
3 1 500
0 0 10 100 50
1 0 20 100 50
0 1 30 100 50

样例输出 1:
0
说明：三个基站互为邻居，但每个基站的邻域负载和仅为300<500，无关键节点
"""
# @sample-end

# @sample-start
"""
样例输入 2:
4 1 150
0 0 10 100 10
1 0 20 100 10
5 5 10 200 100
5 6 30 200 100

样例输出 2:
200
说明：基站2和3是关键节点，形成链路2->3，用户数100+100=200
"""
# @sample-end

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    N = int(next(it))
    eps = int(next(it))
    W_threshold = int(next(it))
    nodes = []
    for _ in range(N):
        x = int(next(it)); y = int(next(it)); t = int(next(it)); w = int(next(it)); users = int(next(it))
        nodes.append((x, y, t, w, users))
    
    # 1. 判断关键节点
    is_key = [False] * N
    for i in range(N):
        xi, yi, _, wi, _ = nodes[i]
        total_w = wi
        for j in range(N):
            if i == j:
                continue
            xj, yj, _, wj, _ = nodes[j]
            if abs(xi - xj) + abs(yi - yj) <= eps:
                total_w += wj
        if total_w >= W_threshold:
            is_key[i] = True
    
    key_indices = [i for i in range(N) if is_key[i]]
    if not key_indices:
        print(0)
        return
    
    # 2. 构建有向图
    adj = [[] for _ in range(N)]
    for i in key_indices:
        xi, yi, ti, _, _ = nodes[i]
        for j in key_indices:
            if i == j:
                continue
            xj, yj, tj, _, _ = nodes[j]
            if abs(xi - xj) + abs(yi - yj) <= eps and ti != tj:
                if ti < tj:
                    adj[i].append(j)
    
    # 3. 记忆化搜索
    @lru_cache(maxsize=None)
    def dfs(u):
        best = nodes[u][4]
        for v in adj[u]:
            best = max(best, nodes[u][4] + dfs(v))
        return best
    
    ans = 0
    for u in key_indices:
        if adj[u]:
            ans = max(ans, dfs(u))
    print(ans)

def test():
    test_cases = [
        ("3 1 500\n0 0 10 100 50\n1 0 20 100 50\n0 1 30 100 50\n", 0),
        ("4 1 150\n0 0 10 100 10\n1 0 20 100 10\n5 5 10 200 100\n5 6 30 200 100\n", 200),
        ("2 1 100\n0 0 10 100 50\n1 0 20 100 30\n", 80),
        ("3 1 100\n0 0 10 100 10\n1 0 20 100 20\n2 0 30 100 30\n", 60),
        ("2 1 200\n0 0 10 100 10\n1 0 20 100 10\n", 20),
        ("3 1 100\n0 0 10 50 1\n1 0 10 50 2\n0 1 10 50 3\n", 0),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
            actual = int(output) if output else 0
        finally:
            sys.stdout = old_stdout
        status = "✓" if actual == expected else "✗"
        print(f"测试用例 {i}: 期望={expected}, 实际={actual} {status}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        test()
    else:
        solve()