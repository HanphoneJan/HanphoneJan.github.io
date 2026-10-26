"""
P5469. 主机灰度分批 - 贪心规则模拟

p 台主机各带 d（<= 2）个维度的标签，要切成 b 波灰度。规则由题面写死，
本质是按规则模拟，不另寻最优划分：
1. 容量：q = p // b，r = p % b；前 b-r 波容量 q，最后 r 波容量 q+1。
2. 每波从空集开始，逐台从未入选主机里挑「增量」最大者：该机某一维的
   标签若在本波已入选机器中还没出现过记 1 分；增量打平拿 nid 更小者。
   增量相对的是「本波次」已见标签，换波即清空。
3. 某台进过一波后不再参与。输出每波成员，行内按 nid 数值升序。

输入格式：
- 第 1 行：p d（1<=p<=2e2，1<=d<=2）；
- 随后 p 行：nid tag_1 [tag_2]；
- 末行：b（1<=b<=2e1）。

输出格式：
- b 行：每波 nid 升序、空格分隔（容量为 0 的波输出空行）。

时间复杂度：O(p^2 * d)（每波每选一台扫全部未选主机）
空间复杂度：O(p * d)
"""

# https://codefun2000.com/p/P5469
import sys

# @sample-start
"""
样例输入 1:
4 1
10 A
11 A
12 A
13 A
2

样例输出 1:
10 11
12 13
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6 2
1 X P
2 X Q
3 Y P
4 Y Q
5 Z Q
6 Z R
2

样例输出 2:
1 4 6
2 3 5
"""
# @sample-end


def solve():
    """按题面规则逐波模拟：容量前少后多，波内挑增量最大且 nid 最小者。"""
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    it = iter(data)
    p = int(next(it))
    d = int(next(it))
    hosts = []  # (nid, tags 元组)
    for _ in range(p):
        nid = int(next(it))
        tags = tuple(next(it) for _ in range(d))
        hosts.append((nid, tags))
    b = int(next(it))
    used = [False] * p

    # 容量分布：基准 q，余数 r 摊到最后的 r 个波次，后面的波只大不小
    q, r = divmod(p, b)
    caps = [q] * (b - r) + [q + 1] * r

    out_lines = []
    for wave in range(b):
        dim_seen = [set() for _ in range(d)]  # 本波已出现过的各维标签
        picked = []
        for _ in range(caps[wave]):
            best = -1
            best_gain = -1
            best_nid = None
            for h in range(p):
                if used[h]:
                    continue
                nid, tags = hosts[h]
                gain = sum(1 for j in range(d) if tags[j] not in dim_seen[j])
                if gain > best_gain or (gain == best_gain and nid < best_nid):
                    best, best_gain, best_nid = h, gain, nid
            used[best] = True
            picked.append(hosts[best][0])
            for j in range(d):
                dim_seen[j].add(hosts[best][1][j])
        picked.sort()
        out_lines.append(" ".join(map(str, picked)))
    print("\n".join(out_lines))


def run_tests():
    """运行官方样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1：全同标签，增量全 0，按 nid 顺次进波
        (
            "4 1\n10 A\n11 A\n12 A\n13 A\n2\n",
            "10 11\n12 13",
        ),
        # 官方样例 2：两波各 3 台，第一波三连增量 2
        (
            "6 2\n1 X P\n2 X Q\n3 Y P\n4 Y Q\n5 Z Q\n6 Z R\n2\n",
            "1 4 6\n2 3 5",
        ),
        # b=1：所有主机进同一波，行内按 nid 升序
        (
            "3 1\n30 A\n10 B\n20 A\n1\n",
            "10 20 30",
        ),
        # 余数 r>0：p=5、b=2，前波容量 2、后波容量 3
        (
            "5 1\n1 A\n2 A\n3 A\n4 A\n5 A\n2\n",
            "1 2\n3 4 5",
        ),
        # 增量对照本波次而非全局：第二波里标签 A 应重新计分，
        # 于是 nid 2（A，增量 1）先于 nid 9（C，增量 1）按平手 nid 取 2
        (
            "4 1\n1 A\n2 A\n3 B\n9 C\n2\n",
            "1 3\n2 9",
        ),
        # nid 与输入顺序相反：平手时应拿 nid 更小的那台
        (
            "2 1\n20 A\n10 A\n2\n",
            "10\n20",
        ),
        # 两波之间标签集清空：第二波第一台增量恢复为满 d
        (
            "4 2\n1 X X\n2 Y Y\n3 X X\n4 Y Y\n2\n",
            "1 2\n3 4",
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
