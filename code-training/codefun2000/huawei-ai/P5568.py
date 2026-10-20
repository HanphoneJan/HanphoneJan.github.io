"""
P5568. NPU梯度任务均衡调度 - 二分答案 + 回溯搜索

把若干梯度更新任务分配到 k 张 NPU 上：每个任务必须分到恰好一张卡，
先让「各卡耗时之和的最大值」（记作 max_time）尽可能小，再按学习率衰减
计算总训练成本：

    第 j 张卡的学习率 lr_j = base_lr * decay_rate ^ (max_time - sum_time_j)
    第 j 张卡的训练成本     = sum_time_j * lr_j
    总训练成本              = 所有卡成本之和

输入格式：
- 一行字符串，用 ; 分成四段：
      grad_times;NPU数量;base_lr;decay_rate
  例如 8,5,4,3,3,2,1;3;0.1;0.8

输出格式：
- 一行字符串：最小最大总耗时,总训练成本（成本保留 4 位小数）
  例如 9,2.4400

核心思路：
1. 「能否让每张卡的耗时都不超过 cap」这个问题是单调的：cap 变大只会更容易满足。
   于是可以用二分答案求最小的 cap = max_time，下界取 max(最大单个任务, ceil(总和/k))。
2. 判定一个 cap 是否可行用回溯：第 i 个任务依次尝试放进每一张卡，放不下就剪枝。
   两张卡当前负载相同时，它们完全对称，只需要试其中一张。
3. 求出最小的 max_time 之后，用同样的顺序再搜一次，得到一组达到它的负载分配。
4. 按公式算出总成本并格式化输出。

复杂度：二分 O(log(sum)) 次判定，每次判定是带剪枝的回溯搜索，
        最坏 O(k^n)（n 为任务个数，实际数据规模下剪枝后极快）；
        空间复杂度 O(n + k)。

注意：若存在多组划分都能达到最小的 max_time，题目没有规定进一步的规则，
      代码按搜索顺序取第一组负载。测试数据中的最优方案唯一时结果与题意完全一致。
"""

# https://codefun2000.com/p/P5568
import sys

# @sample-start
"""
样例输入 1:
8,5,4,3,3,2,1;3;0.1;0.8

样例输出 1:
9,2.4400
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6;1;0.2;0.9

样例输出 2:
6,1.2000
"""
# @sample-end


def search(times, k, cap):
    """在「每张卡耗时都不超过 cap」的前提下找一个分配方案。

    找到时返回各卡负载列表（长度 k），找不到返回 None。
    """
    n = len(times)
    loads = [0] * k

    # 记录「已经证明无解」的状态，避免同一局面被重复搜索。
    # 状态里的负载要先排序：卡之间是可以互换的，顺序不同但负载集合相同就是同一个局面。
    failed = set()

    def dfs(i):
        # 所有任务都分配完了，说明这一组负载满足上限。
        if i == n:
            return True

        state = (i, tuple(sorted(loads)))
        if state in failed:
            return False

        t = times[i]

        # 本层已经尝试过的「负载值」。两张卡当前负载相同，把任务放进哪一张
        # 得到的负载集合完全一样，因此只需要尝试一次。
        tried = set()

        for j in range(k):
            cur = loads[j]
            if cur in tried:
                continue
            # 剪枝：放进去就超过上限，这条分支不可能给出合法方案。
            if cur + t > cap:
                continue

            tried.add(cur)
            loads[j] = cur + t
            if dfs(i + 1):
                return True
            # 回溯：撤销这次分配，换下一张卡再试。
            loads[j] = cur

        failed.add(state)
        return False

    return loads if dfs(0) else None


def solve():
    """读取输入，输出「最小最大总耗时,总训练成本」。"""
    text = sys.stdin.buffer.read().decode().strip()
    if not text:
        return

    parts = text.split(";")
    if len(parts) < 4:
        return

    times = [int(x) for x in parts[0].split(",") if x.strip()]
    k = int(parts[1])
    base_lr = float(parts[2])
    decay = float(parts[3])

    n = len(times)
    # 题面保证 1 <= k <= n，这里再兜一层，避免空卡数量非法导致无意义的搜索。
    if k > n:
        k = n

    total = sum(times)

    # 二分最小的 max_time：
    # - 下界 1：任何一张卡最多只能装下 sum 的耗时；
    # - 下界 2：k 张卡平均分，至少要约等于 ceil(total / k)；
    # - 下界 3：最大的单个任务必须整块放进某张卡。
    low = max(max(times), (total + k - 1) // k)
    high = total  # 把所有任务都放在一张卡上，一定可行

    while low < high:
        mid = (low + high) // 2
        if search(times, k, mid) is not None:
            high = mid
        else:
            low = mid + 1

    max_time = low

    # 用最小的上限再搜一次，拿到一组具体的负载分配。
    loads = search(times, k, max_time)

    # 按衰减公式累计每张卡的成本：负载越小，距离 max_time 越远，
    # 学习率被衰减得越厉害，成本也越低。
    cost = 0.0
    for s in loads:
        cost += s * base_lr * (decay ** (max_time - s))

    # 严格保留 4 位小数；成本一定非负，不会出现 -0.0000。
    print(f"{max_time},{cost:.4f}")


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例 1
        (
            "8,5,4,3,3,2,1;3;0.1;0.8\n",
            "9,2.4400",
        ),
        # 官方样例 2：只有 1 张卡、1 个任务
        (
            "6;1;0.2;0.9\n",
            "6,1.2000",
        ),
        # 只有一个任务、一张卡：max_time 就等于任务耗时
        (
            "10;1;0.5;0.5\n",
            "10,5.0000",
        ),
        # k 等于任务个数：每个任务独占一张卡，最大耗时就是最大的任务
        (
            "3,4,5;3;1.0;0.5\n",
            "5,7.7500",
        ),
        # 存在 0 耗时的任务：max_time 为 0，成本也为 0
        (
            "0,0;2;1.0;0.5\n",
            "0,0.0000",
        ),
        # 只有一种划分能达到最小最大耗时：6+2=8 与 4+4=8
        (
            "6,4,4,2;2;0.1;0.5\n",
            "8,1.6000",
        ),
        # 总和能被 k 整除，且最大任务不超过平均值：两边都恰好是 8
        (
            "4,4,4,4;2;1.0;0.25\n",
            "8,16.0000",
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
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
