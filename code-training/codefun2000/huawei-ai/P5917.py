"""
P5917. 用 CART 分类树预测客户是否购房 - 基尼指数 + 二叉决策树

给定 N 条训练样本（4 个特征 + 1 个 0/1 标签）和 M 条待预测样本，
按 CART 的思路建一棵二叉树，每个节点用加权基尼指数挑选「最优二元切分」：
- 左子集：该特征取值等于切分点 v；
- 右子集：该特征取值不等于 v。

停止分裂的条件（满足任一即成为叶子）：
1. 节点内标签全部相同；
2. 节点内样本数小于 2；
3. 不存在能让基尼指数严格下降的切分点。

平局规则：
- 特征按编号从小到大尝试，取值按从小到大尝试，只保留严格更优的候选，
  于是「同样小」时自然留下编号更小的特征、更小的取值；
- 叶子输出人数最多的类别，人数相同取编号较小的类别。

输入格式：
- 第 1 行：N；
- 随后 N 行：每行 4 个特征 + 1 个标签；
- 第 N+2 行：M；
- 随后 M 行：每行 4 个特征。

输出格式：
- 一行 M 个整数，依次是 M 个测试样本的预测结果。

核心思路：
1. 递归建树：每个节点只看落在该节点上的样本下标；
2. 对每个候选 (特征, 取值) 一次遍历统计左右两侧的标签计数，
   加权基尼指数 = |D1|/|D| * Gini(D1) + |D2|/|D| * Gini(D2)；
3. 基尼指数用 Fraction 精确表示，避免浮点误差破坏平局规则；
4. 预测时沿树下降：等于切分点走左子树，否则走右子树。

时间复杂度：O(F * V * N * H)，F = 4 个特征，V 为节点内不同取值个数（<= N），
            H 为树高（<= N），最坏 O(N^3)；本题 N <= 20，规模很小。
空间复杂度：O(N)，保存样本、节点下标列表与树本身。
"""

# https://codefun2000.com/p/P5917
import sys
from fractions import Fraction

# 每条记录的特征个数（标签在它后面一位）
FEATURES = 4

# @sample-start
"""
样例输入 1:
8
0 0 0 0 0
1 1 0 1 0
2 2 0 0 0
3 1 0 1 0
0 1 1 0 1
1 2 1 1 1
2 0 1 0 1
3 2 1 1 1
4
2 1 0 1
0 2 1 0
3 0 0 0
1 1 1 1

样例输出 1:
0 1 0 1
"""
# @sample-end


def gini(counts):
    """按标签计数计算基尼指数 Gini = 1 - sum(p_k^2)，用分数保证精确。

    counts 是「标签 -> 人数」的字典。分母取总人数的平方，
    这样结果天然是 Fraction，不会出现 0.4999999 与 0.5 不相等的情况。
    """
    total = sum(counts.values())
    if total == 0:
        # 空集合没有不纯度可言，返回 0，加权时它前面还有 0 权重的因子
        return Fraction(0)
    square_sum = sum(count * count for count in counts.values())
    return 1 - Fraction(square_sum, total * total)


def majority_label(counts):
    """返回人数最多的标签；人数相同时返回编号较小的标签。"""
    # min 按 (-人数, 标签编号) 比较：人数多者优先，同人数时编号小者优先
    return min(counts, key=lambda label: (-counts[label], label))


def build(indices, rows):
    """递归建造 CART 分类树，返回节点。

    节点用元组表示：
    - ("leaf", 标签)：叶子节点直接给出预测类别；
    - ("split", 特征下标, 切分点, 左子树, 右子树)。
    """
    counts = {}
    for i in indices:
        label = rows[i][FEATURES]
        counts[label] = counts.get(label, 0) + 1

    # 停止条件 1、2：标签已经纯了，或者剩不到两个样本
    if len(indices) < 2 or len(counts) == 1:
        return ("leaf", majority_label(counts))

    total = len(indices)
    parent_gini = gini(counts)
    best = None  # (加权基尼, 特征下标, 切分点)

    # 特征按编号从小到大遍历
    for feature in range(FEATURES):
        # 候选切分点只取「本节点中出现过的取值」：没出现过的取值切出来是空集，
        # 加权基尼与父节点完全相同，永远不会让基尼下降
        for value in sorted({rows[i][feature] for i in indices}):
            left_counts = {}
            right_counts = {}
            left_size = 0

            # 一次遍历同时统计左、右两侧的标签计数
            for i in indices:
                label = rows[i][FEATURES]
                if rows[i][feature] == value:
                    left_counts[label] = left_counts.get(label, 0) + 1
                    left_size += 1
                else:
                    right_counts[label] = right_counts.get(label, 0) + 1
            right_size = total - left_size

            # 加权基尼指数：两侧按人数占比加权
            score = (Fraction(left_size, total) * gini(left_counts)
                     + Fraction(right_size, total) * gini(right_counts))

            # 只用「严格更小」更新：候选按特征升序、取值升序枚举，
            # 于是平局时保留的是编号更小的特征、更小的切分点
            if best is None or score < best[0]:
                best = (score, feature, value)

    # 停止条件 3：没有任何切分能让基尼指数严格下降
    if best is None or best[0] >= parent_gini:
        return ("leaf", majority_label(counts))

    _, feature, value = best
    left = [i for i in indices if rows[i][feature] == value]
    right = [i for i in indices if rows[i][feature] != value]
    return ("split", feature, value, build(left, rows), build(right, rows))


def predict(tree, sample):
    """沿树下降，返回测试样本的预测标签。"""
    node = tree
    while node[0] == "split":
        _, feature, value, left, right = node
        # 等于切分点走左子树，不等于走右子树
        node = left if sample[feature] == value else right
    return node[1]


def solve():
    """读取训练集建树，再对测试集逐个预测并输出一行结果。"""
    tokens = sys.stdin.buffer.read().split()
    if not tokens:
        return

    pos = 0
    n = int(tokens[pos])
    pos += 1

    rows = []
    for _ in range(n):
        rows.append([int(tokens[pos + k]) for k in range(FEATURES + 1)])
        pos += FEATURES + 1

    m = int(tokens[pos])
    pos += 1

    # 建树只需要看样本下标，rows 通过参数传下去，避免使用全局变量
    tree = build(list(range(n)), rows)

    answers = []
    for _ in range(m):
        sample = [int(tokens[pos + k]) for k in range(FEATURES)]
        pos += FEATURES
        answers.append(str(predict(tree, sample)))

    print(" ".join(answers))


def run_tests():
    """运行嵌入的样例与边界用例，方便本地自测。"""
    import io

    test_cases = [
        # 官方样例：根节点按「是否有房」分裂，左右各自成为纯叶子
        (
            "8\n"
            "0 0 0 0 0\n"
            "1 1 0 1 0\n"
            "2 2 0 0 0\n"
            "3 1 0 1 0\n"
            "0 1 1 0 1\n"
            "1 2 1 1 1\n"
            "2 0 1 0 1\n"
            "3 2 1 1 1\n"
            "4\n"
            "2 1 0 1\n"
            "0 2 1 0\n"
            "3 0 0 0\n"
            "1 1 1 1\n",
            "0 1 0 1",
        ),
        # 全部标签相同：根节点就是叶子，所有样本预测同一个类别
        (
            "4\n"
            "0 0 0 0 1\n"
            "1 1 1 1 1\n"
            "2 2 0 0 1\n"
            "3 0 1 1 1\n"
            "2\n"
            "0 0 0 0\n"
            "3 3 3 3\n",
            "1 1",
        ),
        # 所有特征都只有一个取值：切分无法降低基尼，叶子平票取较小的标签 0
        (
            "4\n"
            "0 0 0 0 0\n"
            "0 0 0 0 0\n"
            "0 0 0 0 1\n"
            "0 0 0 0 1\n"
            "2\n"
            "0 0 0 0\n"
            "0 0 0 0\n",
            "0 0",
        ),
        # 深度为 2 的树：labels 相当于「特征1 = 0 且 特征2 = 0」才为 1
        (
            "4\n"
            "0 0 0 0 1\n"
            "0 1 0 0 0\n"
            "1 0 0 0 0\n"
            "1 1 0 0 0\n"
            "4\n"
            "0 0 0 0\n"
            "0 1 0 0\n"
            "1 0 0 0\n"
            "1 1 0 0\n",
            "1 0 0 0",
        ),
        # 右子节点内标签 1:1 平票，取较小标签 0；左子节点纯 1
        (
            "4\n"
            "0 0 0 0 1\n"
            "0 0 0 0 1\n"
            "1 0 0 0 0\n"
            "1 0 0 0 1\n"
            "3\n"
            "0 0 0 0\n"
            "1 0 0 0\n"
            "0 0 0 0\n",
            "1 0 1",
        ),
        # 根节点四个候选切分的加权基尼指数并列 1/3：
        # 特征1 的 v=0/v=1 与特征2 的 v=0/v=1。按规则取编号最小的特征1、取值 0；
        # 若误按特征2 先切，第 3 个查询的预测会变成 1，因此这组用例能守住平局规则
        (
            "4\n"
            "0 0 0 0 1\n"
            "0 1 0 0 1\n"
            "1 1 0 0 0\n"
            "0 1 0 0 0\n"
            "4\n"
            "0 0 0 0\n"
            "0 1 0 0\n"
            "1 0 0 0\n"
            "1 1 0 0\n",
            "1 0 0 0",
        ),
    ]

    passed = 0
    for i, (inp, expected) in enumerate(test_cases, 1):
        old_stdin, old_stdout = sys.stdin, sys.stdout
        sys.stdin = io.TextIOWrapper(io.BytesIO(inp.encode("utf-8")))
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdin, sys.stdout = old_stdin, old_stdout

        ok = output == expected
        passed += ok
        status = "✓" if ok else "✗"
        print(f"用例 {i}: {status} (期望={expected!r}, 实际={output!r})")

    print(f"\n通过 {passed}/{len(test_cases)}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()
