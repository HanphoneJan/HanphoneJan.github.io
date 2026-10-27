---
title: 并查集
category: 数据结构
difficulty_range: [中等, 较难]
last_updated: 2026-10-27
---

# 并查集（Union-Find）

## 定义

并查集维护一个**不相交集合的划分**：n 个元素初始各自成集，支持在集合之间合并，并回答「两个元素是否属于同一集合」。它还有一个别名：不相交集合数据结构（disjoint-set data structure）。

实现用「森林」表示集合：每个元素持有一个父指针，每个集合内选一个元素作**代表元（representative）**——它自成一个环（父指针指向自己），其余元素沿父指针逐级向上可到达它。结构的不变量只有一条：

> 不相交的集合不共享代表元。判定「x、y 同集」的唯一依据是 `find(x) == find(y)`，即两者向上追溯到的自环节点相同。

接口与复杂度：

| 操作 | 语义 | 复杂度（两个优化齐开） |
|------|------|----------------------|
| `find(x)` | 返回 x 所在集合的代表元 | 均摊 O(α(n)) |
| `union(x, y)`（即 merge） | 合并 x、y 所在的两个集合 | 均摊 O(α(n)) |
| 初始化 | n 个元素各自成集 | O(n) |

α 是阿克曼反函数，其对任意现实可行规模都 ≤ 4，**工程上按常数处理**。不做任何优化时 find 最坏 O(n)（合并方式不当形成链）；两个优化（见下）正是针对这条退化链设计的。

它不支持的操作也值得写清：删除、把一个集合拆开、列出集合成员。动态连通性问题的需求集合恰好只落在 find / union 两个动作上，超出范围的题目（比如「支持回滚的合并」）要用别的结构或离线重排。

## 朴素版本

```python
fa = list(range(n))    # fa[x] = x 的父节点；fa[x] == x 即 x 是代表元

def find(x):
    while fa[x] != x:          # 沿父指针向上，直到自环节点
        x = fa[x]
    return x

def union(x, y):
    fa[find(x)] = find(y)      # 把 x 的代表元挂到 y 的代表元下
```

朴素版在「链式合并」下退化：`union(1,2), union(2,3), union(3,4)…` 之后 `find(1)` 要爬完整条链。下面两个优化分别封掉这条链的两个来源。

## 优化一：路径压缩（find 时加速）

```python
def find(x):
    if fa[x] != x:
        fa[x] = find(fa[x])    # 祖父直接升为父；递归回程顺手拍扁
    return fa[x]
```

find 经过路过的每个节点，回程时**全部直接挂在代表元下**——树越用越扁，一条路径第二次 find 一步就到。工程上更稳的是迭代版本（父指针每跳两步取值），不必递归；效果略逊，够用。

## 优化二：按大小合并（union 时防新链）

```python
size = [1] * n

def union2(x, y):
    root_x, root_y = find(x), find(y)
    if root_x == root_y:
        return False           # 本已同集（环检测的信号）
    if size[root_x] < size[root_y]:
        root_x, root_y = root_y, root_x
    fa[root_y] = root_x        # 小树挂大树
    size[root_x] += size[root_y]
    return True
```

没有它，「大集挂到小集下」会重造深链。两个优化在岗位分工上互补：路径压缩**事后**（find 时），按大小合并**事前**（union 时）。挂接方向也可按秩（rank）记录树高，两者理论效果等价；按 size 版额外附送「集多大」，实践中更常用。

## 完整模板

```python
class UnionFind:
    def __init__(self, n: int):
        self.fa = list(range(n))    # fa[x]：x 的父节点
        self.size = [1] * n         # 各集合大小（挂接方向依据）
        self.cc = n                 # 连通块（connected components）数

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])   # 路径压缩
        return self.fa[x]

    def is_same(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)

    def merge(self, x: int, y: int) -> bool:
        """合并两个集合；返回 False 表示二者已在同一集合（调用方常用作环信号）"""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        self.cc -= 1
        return True

    def get_size(self, x: int) -> int:
        """x 所在集合的成员数"""
        return self.size[self.find(x)]
```

`cc`（连通块计数）是最容易被遗忘、却经常是答案本体的量：每次 merge 成功恰减少一块。起始 n 块、终态多少块就是「省份数量」「岛屿数量」这类题的全部答案。

## 题型一：连通块计数（547 省份数量）

[547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)：`isConnected[i][j] == 1` 表示两城直连，问有多少个省。

```python
def findCircleNum(isConnected: list[list[int]]) -> int:
    n = len(isConnected)
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):   # 矩阵对称，只扫上三角
            if isConnected[i][j] == 1:
                uf.merge(i, j)
    return uf.cc
```

DFS/BFS 也能解：需要 `visited` 数组，且每发现一个未访问城市就发起一次遍历。并查集的写法沿边去 merge、直接读 `cc`，代码量最少，且天然不需要「重新找起点」的逻辑。

## 题型二：冗余连接（684，环检测）

[684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)：给一棵树加了一条边，找出那条多余的。依据：**树中任意两点路径唯一**，因此某条边连接的两个端点若已连通，则这条边必在环上。

```python
def findRedundantConnection(edges: list[list[int]]) -> list[int]:
    max_node = max(max(e) for e in edges)
    uf = UnionFind(max_node + 1)
    ans = []
    for u, v in edges:
        if not uf.merge(u, v):      # 合并失败 = 端点已连通 = 该边多余
            ans = [u, v]
    return ans
```

无向图判环的最省事的写法就是这一手：merge 的返回 False 直接当环信号。有向图判环走另一路（DFS 三色标记或拓扑排序），见 [patterns/dfs.md](../patterns/dfs.md)、[patterns/bfs.md](../patterns/bfs.md)。

## 题型三：Kruskal 最小生成树

按边权从小到大扫一遍，**能 merge 的才收**（收得下 = 两端恰好分属两个连通块）；收满 n−1 条即得 MST。贪心成立的依据：考虑「剩下可用边里最便宜的 `e`」，其两端要么已连通（再收只是添一圈），要么分属两块（不收也不亏，因为连通它们迟早要花更高代价）——单条边两种结局与最优解一致。

```python
import math

def min_spanning_tree(n: int, edges: list[tuple[int, int, int]]) -> float:
    """edges: [(u, v, 边权), ...]；返回 MST 总权；不连通返回 inf"""
    edges.sort(key=lambda e: e[2])      # 排序 O(m log m)，瓶颈在它
    uf = UnionFind(n)
    total = 0.0
    for u, v, w in edges:
        if uf.merge(u, v):              # 成功 = 恰接上两块不同连通块
            total += w
            if uf.cc == 1:
                return total            # 连成一整块即止，剩余边不必再看
    return math.inf if uf.cc > 1 else total
```

复杂度瓶颈是排序本身的 O(m log m)——并查集那部分（O(m·α(n))）反而是次要的。

## 题型四：带权并查集(399)

普通版只知道「同不同集」；带权版在每个 `fa` 边上**附加一个数**：`weight[x]` 为「x 相对其当前父节点的倍数（比值）」，find 时路径上累乘折算到根。代表的是 [399. 除法求值](https://leetcode.cn/problems/evaluate-division/)：给 `a/b = 2.0` 一类等式，回答任意 `x/y`。

```python
class WeightedUnionFind:
    def __init__(self):
        self.fa = {}         # 任意可哈希键，可按需加入
        self.weight = {}     # weight[x]：x 相对其父节点的比值

    def add(self, x):
        if x not in self.fa:
            self.fa[x] = x
            self.weight[x] = 1.0

    def find(self, x) -> str:
        if self.fa[x] != x:
            root = self.find(self.fa[x])
            self.weight[x] *= self.weight[self.fa[x]]   # 沿途比值折算到根
            self.fa[x] = root                            # 顺手路径压缩
        return self.fa[x]

    def merge(self, x: str, y: str, ratio: float):
        """merge x / y = ratio"""
        self.add(x); self.add(y)
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return                       # 关系已隐含在树里
        self.fa[root_x] = root_y
        # 目标：weight[root_x] = root_x / root_y（root_x 新成 root_y 的孩子）
        # root_x = x / weight[x]，root_y = y / weight[y]
        # 代入 x = ratio * y：
        self.weight[root_x] = ratio * self.weight[y] / self.weight[x]

    def query(self, x: str, y: str) -> float:   # 缺席 / 不在同集返回 -1.0
        if x not in self.fa or y not in self.fa or self.find(x) != self.find(y):
            return -1.0
        return self.weight[x] / self.weight[y]
```

两个必须落笔的推导点：**x / y 的值 = 沿路径各段比值相对代表元的累乘**；merge 时新增边 `root_x → root_y` 的比值按上面 3 行代数推出。每次 find 都要折算并压缩——不压缩的话每次 query 都逐层重算，压缩后比值存进 `weight`，query 只剩一次除法。

`a/b=2, b/c=3` 的演化：

```text
merge(a, b, 2)：fa[a]=b, weight[a]=2    （a 挂在 b 下）
merge(b, c, 3)：fa[b]=c, weight[b]=3

树：c ← b ← a，weight：a→b=2, b→c=3（各自相对父节点）

query(a, c)：
  find(a) 递归 find(b)：b 的父是 c，weight[b]=3*weight[c](=1)=3
  回程 weight[a]=2*weight[b](=3)=6，fa[a] 压成 c
  返回 weight[a]/weight[c] = 6/1 = 6

query(c, a)：c 即根，weight[c]=1，weight[a]=6 → 1/6
```

## 易错点总结

- merge 里忘了先两次 find——判「同集」的依据是 `find` 后的代表元，不是原始下标
- 扔掉了 merge 的返回值，等于丢了无向图的环信号（684）
- 带权 merge 的比值方向写反：先把「目标 `weight[root_x] = ?`」用代数推一遍，再落到 `weight[root_x] = ratio * weight[y] / weight[x]`
- 初始化范围少一：节点编号最大时数组开 `max + 1`
- 带权 query 先比较、后读值：`query` 内的 find 顺序决定了路径上的比值是否已折算，比较之前必须两个 find 都跑过
- 迭代路径压缩的父指针更新顺序：先备份 `fa[x]` 再改；递归版不存在这个问题

## 相关题目

- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)（连通块计数）
- [684. 冗余连接](../problems/leetcode/0684_redundant_connection.md)（无向图环检测）
- [721. 账户合并](../problems/leetcode/0721_accounts_merge.md)（邮箱实体合并）
- [947. 移除最多的同行或同列石头](../problems/leetcode/0947_most_stones_removed_with_same_row_or_column.md)（行列连通分量）
- [990. 等式方程的可满足性](../problems/leetcode/0990_satisfiability_of_equality_equations.md)（等价类）
- [3493. 属性图](../problems/leetcode/3493_properties_graph.md)（属性交集连通）
- [3532. 针对图的路径存在性查询 I](../problems/leetcode/3532_path_existence_queries_in_a_graph_i.md)（连通性查询预处理）
- [399. 除法求值](../problems/leetcode/0399_evaluate_division.md)（带权并查集）
- [128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)（并查集 / 哈希表两路可解）

## 相关知识点

- [图](graph.md)——连通块、最小生成树的全图视角
- [树](tree.md)——父指针表示法的出处
- [patterns/bfs.md](../patterns/bfs.md)、[patterns/dfs.md](../patterns/dfs.md)——无向连通、有向判环

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把操作序列换成你自己的，逐帧观察
每一步父指针的变动——路径压缩与按大小合并同时进行，
所指向的每个节点都直接挂在代表元下。
