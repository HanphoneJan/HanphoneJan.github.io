"""
P5412. 预算约束下基于全局排序的 KV 缓存稀疏保留 - 多关键字排序 + 全局 Top-K

大模型推理时，每一层、每一个注意力头都持有 N 个位置的 KV 缓存。
显存预算只有 M 个 token 的容量，需要决定每个 (层, 头) 保留哪些位置。
规则分三步：
1. 位置 C 是当前正在生成的位置，所有层、所有头都必须保留；
2. 先从预算里扣掉这 L*H 个必留项，剩下的预算按“注意力分数从高到低”
   在所有 (l, h, t) 上做一次全局排序，取前若干名；
3. 分数相同时，依次比较层索引、头索引、token 下标，都是小的优先。

输入格式：
- 第 1 行：四个整数 L、H、N、M；
- 接下来 L 行：每行 H*N 个浮点数，按头编号拼接（前 N 个属于头 0，……）；
- 最后一行：一个整数 C。

输出格式：
- 共 L 行，第 i 行是 H 个用空格分隔的字符串；
- 第 j 个字符串是第 i 层第 j 个头保留的 token 下标，升序、用逗号连接；
- 只保留一个下标时不带逗号。

核心思路：
1. 必留位置 C 先占掉 L*H 的预算，剩下的预算 extra = M - L*H；
2. 把除 C 以外的全部三元组 (l, h, t) 按 (-分数, l, h, t) 排序，
   取前 extra 个；
3. 把选中的下标按 (层, 头) 归组，每组并上 C 后升序输出。

时间复杂度：O(T log T)，T = L*H*N，本题最大约 2*10^5 个候选。
空间复杂度：O(T)，用于保存候选列表。
"""

# https://codefun2000.com/p/P5412
import sys

# @sample-start
"""
样例输入 1:
2 2 3 8
0.1 0.9 0.5 0.8 0.2 0.3
0.7 0.6 0.4 0.0 0.1 0.2
2

样例输出 1:
1,2 0,2
0,1,2 2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
2 2 2 6
0.5 0.5 0.5 0.5
0.5 0.5 0.5 0.5
0

样例输出 2:
0,1 0,1
0 0
"""
# @sample-end

# @sample-start
"""
样例输入 3:
1 2 2 2
0.5 0.9 0.4 0.8
0

样例输出 3:
0 0
"""
# @sample-end


def solve():
    """读取输入，按全局排序选出要保留的 token，并逐层逐头输出。"""
    # 一次性读入所有 token。分数和整数混在一行行里，用 split() 切开后
    # 再按位置解析最省事，也不会被行末空格或空行干扰。
    data = sys.stdin.buffer.read().split()
    if not data:
        return

    layers = int(data[0])
    heads = int(data[1])
    length = int(data[2])
    budget = int(data[3])

    # C 单独占最后一行，因此直接取最后一个 token；中间的分数则是一段
    # 连续的 L*H*N 个 token。这样就不必关心分数是怎么换行的。
    current = int(data[-1])
    total = layers * heads * length
    scores = data[4:4 + total]

    # 必留项先占预算：每个 (层, 头) 都要保留 C，一共 L*H 个。
    # 约束保证 M >= L*H，这里再夹一次只是防止切片出现负数。
    extra = budget - layers * heads
    if extra < 0:
        extra = 0

    # 把候选写成一个可直接比较的元组：
    #   第一项取分数相反数 -> 升序排序就等于分数降序；
    #   后面三项是层、头、下标，天然升序，正好对应题目的并列规则。
    # 用元组默认比较而不是传 key，是因为 key 里也要写同样四元组，
    # 直接排元组少一层函数调用，几十万条候选时更省时间。
    candidates = []
    pos = 0
    for layer in range(layers):
        for head in range(heads):
            for index in range(length):
                if index != current:
                    candidates.append((-float(scores[pos]), layer, head, index))
                pos += 1

    candidates.sort()

    # 归组：kept[layer][head] 收集这个头被选中的非必留下标。
    kept = [[[] for _ in range(heads)] for _ in range(layers)]
    for _, layer, head, index in candidates[:extra]:
        kept[layer][head].append(index)

    lines = []
    for layer in range(layers):
        cells = []
        for head in range(heads):
            # 必留的 C 最后并进来，再统一升序 —— 题目要求按下标升序输出，
            # 而不是按分数顺序输出。
            bucket = kept[layer][head]
            bucket.append(current)
            bucket.sort()
            cells.append(",".join(str(x) for x in bucket))
        lines.append(" ".join(cells))

    sys.stdout.write("\n".join(lines) + "\n")


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "2 2 3 8\n"
            "0.1 0.9 0.5 0.8 0.2 0.3\n"
            "0.7 0.6 0.4 0.0 0.1 0.2\n"
            "2\n",
            "1,2 0,2\n0,1,2 2",
        ),
        # 官方样例 2：所有分数相同，按 (层, 头, 下标) 截断
        (
            "2 2 2 6\n"
            "0.5 0.5 0.5 0.5\n"
            "0.5 0.5 0.5 0.5\n"
            "0\n",
            "0,1 0,1\n0 0",
        ),
        # 官方样例 3：没有额外预算
        (
            "1 2 2 2\n"
            "0.5 0.9 0.4 0.8\n"
            "0\n",
            "0 0",
        ),
        # 只有一个位置，它既是必留项也是唯一候选
        (
            "1 1 1 1\n"
            "0.5\n"
            "0\n",
            "0",
        ),
        # 预算刚好等于全部 token，所有下标都要保留
        (
            "1 2 2 4\n"
            "0.5 0.1 0.2 0.3\n"
            "1\n",
            "0,1 0,1",
        ),
        # 同分时下标小的先入选
        (
            "1 1 4 2\n"
            "0.5 0.9 0.9 0.9\n"
            "3\n",
            "1,3",
        ),
        # 只有一个额外名额时，层索引小的先入选
        (
            "2 1 2 3\n"
            "0.9 0.1\n"
            "0.9 0.1\n"
            "1\n",
            "0,1\n1",
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        # solve() 用 sys.stdin.buffer 读数据，所以要给带 buffer 的文本流
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
