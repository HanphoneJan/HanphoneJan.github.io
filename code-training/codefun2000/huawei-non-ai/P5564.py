"""
P5564. 迷宫最短救援 - 带宝剑状态的广度优先搜索

王子从 S 出发，用最少的四向步数到达 P。没拿到宝剑时，怪物格自己以及
它上下左右相邻的格都不能踏入（宝剑格例外——即使贴着怪物也放行，进格
即捡剑）；拿到宝剑后这些限制全部消失，还能踩进怪物格并击倒脚下这一只。

输入格式：
- 第 1 行：h、w（1 <= h, w <= 100）；
- 接下来 h 行、每行 w 个字符：'.'空地 '#'墙 'S'王子 'P'公主 'M'怪物 'W'宝剑。

输出格式：
- 最少步数；公主不可达输出 -1。

核心思路：
1. 关键观察：怪物有两类影响——"贴身格禁入"只在没剑时生效；"踩进怪物格
   只击倒脚下这一只"在持剑后对剩余怪物毫无约束力（持剑者本来就能进任何
   贴身格和怪物格）。因此持剑与否是唯一需要记忆的资格状态，不必记录
   每只怪物的死活。
2. 求最少步数 -> 边权全为 1 的 BFS。状态扩成 (行, 列, 是否持剑)：同一格
   在两个资格层各有一个最短步数，互不吞并——先捡剑再回来的路线不会被
   无剑层的旧访问挡掉。
3. 无剑搬家规则：目标格是墙跳过；是怪物跳过；是"贴身危险格"跳过，但
   该格恰好是宝剑则放行（进格即捡剑，状态切到持剑层）。
4. 起点即使贴着怪物也从 (S, 无剑) 开始——禁入只约束"踏入"这个动作，
   不约束起点本身。

时间复杂度：O(h * w)，每个格子至多入队两次（两个资格层）
空间复杂度：O(h * w)
"""

# https://codefun2000.com/p/P5564
import sys

# @sample-start
"""
样例输入 1:
3 3
S.M
...
.MP

样例输出 1:
-1
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3 5
S.#.P
..#..
W.M..

样例输出 2:
8
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 5
S...P

样例输出 3:
4
"""
# @sample-end


def solve():
    data = sys.stdin.buffer.read().split()
    h, w = int(data[0]), int(data[1])
    grid = [data[2 + r].decode() for r in range(h)]

    from collections import deque

    sr = sc = pr = pc = -1
    sword_cells = []
    monsters = []
    for r in range(h):
        row = grid[r]
        for c in range(w):
            ch = row[c]
            if ch == "S":
                sr, sc = r, c
            elif ch == "P":
                pr, pc = r, c
            elif ch == "M":
                monsters.append((r, c))
            elif ch == "W":
                sword_cells.append((r, c))

    # danger[r][c]：怪物所在格及其四邻（没剑时不能踏入的格）
    danger = [[False] * w for _ in range(h)]
    for r, c in monsters:
        for dr, dc in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w:
                danger[nr][nc] = True
    swordset = set(sword_cells)

    # BFS 状态 (r, c, 持剑?)；同一格在两个资格层里各有自己的最短步数
    dist = [[[-1, -1] for _ in range(w)] for _ in range(h)]
    dist[sr][sc][0] = 0
    q = deque([(sr, sc, 0)])
    while q:
        r, c, sw = q.popleft()
        steps = dist[r][c][sw]
        if r == pr and c == pc:
            print(steps)
            return
        for dr, dc in ((-1, 0), (0, -1), (0, 1), (1, 0)):
            nr, nc = r + dr, c + dc
            if not (0 <= nr < h and 0 <= nc < w):
                continue  # 越界按墙处理
            ch = grid[nr][nc]
            if ch == "#":
                continue  # 墙踩不上去
            if sw == 0:
                if ch == "M":
                    continue  # 没剑不能踏进怪物格
                if danger[nr][nc] and (nr, nc) not in swordset:
                    continue  # 贴身危险格禁入；宝剑格是例外，进格即捡剑
            nsw = 1 if (sw or ch == "W") else 0
            if dist[nr][nc][nsw] == -1:
                dist[nr][nc][nsw] = steps + 1
                q.append((nr, nc, nsw))

    print(-1)


def run_tests():
    """官方样例 + 语义角落用例（每个用例的答案都手工推过）。"""
    import io

    test_cases = [
        # 官方样例 1：没剑、公主贴着怪物 -> 无解
        ("3 3\nS.M\n...\n.MP\n", "-1"),
        # 官方样例 2：先到 (2,0) 捡剑，持剑后穿过怪物一排，共 8 步
        ("3 5\nS.#.P\n..#..\nW.M..\n", "8"),
        # 官方样例 3：无怪无剑的直线
        ("1 5\nS...P\n", "4"),
        # 宝剑贴着怪物：W 格例外放行，捡剑后踩进怪物格再进公主格，共 4 步
        ("1 5\nS.WMP\n", "4"),
        # P 贴着怪物且无剑可达必经危险格 -> 无解
        ("1 3\nSMP\n", "-1"),
        # 无剑时绕不开贴身格、必须先捡剑：W 位于怪物正下方
        ("2 3\nS.M\n.WP\n", "3"),
        # 无怪无墙的平凡 BFS
        ("2 2\nSP\n..\n", "1"),
        # 起点贴身怪物：起点不受禁入约束，可以迈出第一步
        ("3 3\nSM.\n...\n..P\n", "4"),
        # 两只怪物：持剑后过路，贴身规则消失即够用，无需逐只记死活
        ("3 5\nS.M.P\n..M..\nW....\n", "8"),
        # 怪物贴身只算上下左右，对角不算
        ("3 3\nSM.\n.#.\nP.W\n", "2"),
        # 同一格"无剑先到"会锁死持剑迟到状态：单层判重直接判无解（正确 5 步）
        ("2 4\nS.MP\nW...\n", "5"),
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


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
