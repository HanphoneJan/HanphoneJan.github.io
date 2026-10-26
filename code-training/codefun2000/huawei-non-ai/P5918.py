"""
P5918. 落选加价成交额 - 按规则逐轮模拟

买方委托按递单先后依次配对。每一轮在「开价不超过该买方出价」的
卖方里，挑开价最高的那笔（与出价隔得最近）；开价并列且都是当前
最高时取更早递出的。双方按手数较少的一边成交，成交额累加
「成交价 × 手数」。每轮结束后，所有仍有手数、且开价严格低于本笔
成交价的卖方把开价上调 w 元；同价没被挑中的不上调，开价高于成交价
的不动。某买方一轮里挑不到任何开价不高于其出价的卖方时跳过。

输入格式：
- 第 1 行：w（每错过一轮的上调幅度）；
- 第 2 行：a，随后 a 行「开价 手数」；
- 然后一行：b，随后 b 行「开价 手数」（买方按递单先后）。

输出格式：
- 一个整数：全部配对成功的「开价乘手数」之和。

核心思路：
每笔买方委托在剩余手数用完或无可配卖方之前反复进入下一轮；每轮
挑一次、成一次交、上调一次。每收掉一整笔卖方或耗完一个买方才
进入下一轮，总轮数不超过 a + b，逐轮线性扫描卖方列表即可。

时间复杂度：O((a + b) * a) 次卖方扫描；现实数据规模下绰绰有余
空间复杂度：O(a + b)
"""

# https://codefun2000.com/p/P5918
import io
import sys

# @sample-start
"""
样例输入 1:
5
3
6 2
6 1
2 1
1
15 4

样例输出 1:
30
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2
4
5 4
9 2
14 1
30 1
3
8 3
16 1
12 4

样例输出 2:
60
"""
# @sample-end


def match_total(w, sellers, buyers):
    """按配对办法逐轮模拟，返回最终成交额。sellers/buyers 为 (开价, 手数)。"""
    pool = [[p, q] for p, q in sellers]  # [当前开价, 剩手数]，保持递单顺序
    total = 0
    died = 0  # 自上次压缩起配完卖出的笔数，只堆不压缩会让扫描越来越长

    for buy_price, buy_qty in buyers:
        while buy_qty > 0:
            # 挑开价不超过出价且最高的卖方；先扫描到的（递单更早）
            # 在同价时胜出
            best = None
            for s in pool:
                if s[1] > 0 and s[0] <= buy_price:
                    if best is None or s[0] > best[0]:
                        best = s
            if best is None:
                break  # 剩余卖方开价全部高于出价，本买方跳过

            deal = buy_qty if buy_qty < best[1] else best[1]
            total += best[0] * deal
            buy_qty -= deal
            best[1] -= deal

            # 本轮错过且开价严格低于成交价的卖方上调 w；同价不上调
            if w:
                price = best[0]
                for s in pool:
                    if s[1] > 0 and s[0] < price:
                        s[0] += w

            if best[1] == 0:
                died += 1
                if died >= 64 and died * 2 >= len(pool):
                    pool = [s for s in pool if s[1] > 0]
                    died = 0
    return total


def solve():
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    pos = 0
    w = int(data[pos]); pos += 1
    a = int(data[pos]); pos += 1
    sellers = []
    for _ in range(a):
        sellers.append((int(data[pos]), int(data[pos + 1])))
        pos += 2
    b = int(data[pos]); pos += 1
    buyers = []
    for _ in range(b):
        buyers.append((int(data[pos]), int(data[pos + 1])))
        pos += 2
    print(match_total(w, sellers, buyers))


def run_tests():
    """运行嵌入的官方样例与边界/随机对拍用例，方便本地自测。"""
    import random

    cases = [
        # 官方样例 1：同价取更早，乙同价不上调，丙错一轮上调到 7
        ("5\n3\n6 2\n6 1\n2 1\n1\n15 4\n", "30"),
        # 官方样例 2：每轮成交后低于成交价的卖方统一上调
        ("2\n4\n5 4\n9 2\n14 1\n30 1\n3\n8 3\n16 1\n12 4\n", "60"),
        # 没有卖方：成交额为 0
        ("5\n0\n2\n10 3\n11 1\n", "0"),
        # 卖方开价全部高于出价：买方整笔跳过，成交额为 0
        ("5\n2\n20 1\n30 2\n1\n10 5\n", "0"),
        # 买方 5 手先按 5 配 3 手（15），随后剩余卖方开价 3、5，
        # 只能再按 3 配 1 手（3），合计 18
        ("0\n2\n3 1\n5 4\n2\n5 3\n4 2\n", "18"),
        # 上调把低价卖方推过下一任买方的出价，此后配不上
        ("6\n2\n4 1\n9 5\n2\n10 2\n5 10\n", "18"),
        # 低出价买方先跳过，卖方保持原价让高出价买方按 5 全配
        ("2\n1\n5 10\n2\n4 4\n6 6\n", "30"),
        # 手数一边倒：同一笔卖方被两任买方先后共配 10 手
        ("1\n1\n2 10\n2\n9 3\n3 7\n", "20"),
    ]

    for i, (inp, expected) in enumerate(cases, 1):
        output = run_case(inp)
        status = "✓" if output == expected else "✗"
        print(f"用例 {i}: 期望={expected}, 实际={output} {status}")

    # 随机对拍：与「每轮重建排序表」的独立实现比对
    random.seed(20261027)
    fails = 0
    for _ in range(400):
        w = random.randint(0, 5)
        a = random.randint(0, 6)
        b = random.randint(0, 6)
        sellers = [(random.randint(1, 15), random.randint(1, 4)) for _ in range(a)]
        buyers = [(random.randint(1, 15), random.randint(1, 4)) for _ in range(b)]
        expect = reference_total(w, sellers, buyers)
        got = match_total(w, sellers, buyers)
        if got != expect:
            fails += 1
            print(f"对拍不一致: w={w} sellers={sellers} buyers={buyers} "
                  f"got={got} expect={expect}")
    print(f"随机对拍 400 组: {'全部一致 ✓' if fails == 0 else f'{fails} 组不一致 ✗'}")

    # 中等规模时延：1e3 笔卖方 × 1e3 笔买方
    import time
    random.seed(7)
    big_sellers = [(random.randint(1, 50), random.randint(1, 5)) for _ in range(1000)]
    big_buyers = [(random.randint(1, 60), random.randint(1, 5)) for _ in range(1000)]
    start = time.time()
    answer = match_total(3, big_sellers, big_buyers)
    print(f"中等规模 a=b=1000: 成交额={answer}, 耗时 {time.time() - start:.2f}s")


def run_case(text):
    """把一段输入喂给 solve()，取回输出。"""
    old_stdin, old_stdout = sys.stdin, sys.stdout
    sys.stdin = io.TextIOWrapper(io.BytesIO(text.encode("utf-8")))
    sys.stdout = io.StringIO()
    try:
        solve()
        return sys.stdout.getvalue().strip()
    finally:
        sys.stdin, sys.stdout = old_stdin, old_stdout


def reference_total(w, sellers, buyers):
    """独立实现：每轮都用完整排序表重新挑，逻辑同题面但写法不同。"""
    book = [[p, q, i] for i, (p, q) in enumerate(sellers)]
    total = 0
    for buy_price, buy_qty in buyers:
        while buy_qty > 0:
            alive = [s for s in book if s[1] > 0 and s[0] <= buy_price]
            if not alive:
                break
            # 开价最高者胜；并列时递单序号最小者胜
            pool_price = max(s[0] for s in alive)
            chosen = min((s for s in alive if s[0] == pool_price), key=lambda s: s[2])
            deal = min(buy_qty, chosen[1])
            total += chosen[0] * deal
            buy_qty -= deal
            chosen[1] -= deal
            if w:
                for s in book:
                    if s[1] > 0 and s[0] < chosen[0]:
                        s[0] += w
    return total


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
