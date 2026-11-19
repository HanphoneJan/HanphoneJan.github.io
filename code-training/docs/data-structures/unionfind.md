---
title: 并查集
sidebar_position: 11
category: 数据结构
difficulty_range: [中等, 较难]
last_updated: 2026-11-19
---

# 并查集（Union-Find）

## 定义

并查集维护一个**不相交集合的划分**：n 个元素初始各自成集，支持合并两个集合，并回答「两个元素是否同集」。它还有一个别名：不相交集合数据结构（disjoint-set data structure）。

实现用「森林」表示集合：每个元素持有父指针，每个集合里选一个元素作**代表元（representative）**——它的父指针指向自己，自成一个环，其余元素沿父指针逐级向上都能到达它。结构只有一条不变量：

> 不相交的集合不共享代表元。判定「x、y 同集」的唯一依据是 `find(x) == find(y)`，即两者向上追溯到的自环节点相同。

接口与复杂度：

| 操作 | 语义 | 复杂度（两个优化齐开） |
|------|------|----------------------|
| `find(x)` | 返回 x 所在集合的代表元 | 均摊 O(α(n)) |
| `union(x, y)`（即 merge） | 合并 x、y 所在的两个集合 | 均摊 O(α(n)) |
| 初始化 | n 个元素各自成集 | O(n) |

α 是阿克曼反函数，任何现实可行的规模下都 ≤ 4，**工程上当常数看**。两个优化都不做时 find 最坏 O(n)：合并方向选错会拉出一条链，反复查同一条链就每次白爬一遍。

它不支持的操作同样值得写清：删除元素、把集合拆开、列出集合成员。动态连通性的需求恰好只落在 find / union 两个动作上，超出这个范围的题（比如「支持回滚的合并」）要换结构或离线重排。

## 结构剖面

并查集的全部状态就是一个 `fa` 数组：`fa[x]` 是 x 的父亲，`fa[x] == x` 说明它是某个集合的代表元。

![拍扁一条链，把小树挂到大树上](/diagrams/unionfind-compress.png)

朴素版的 `find` 顺着父指针往上爬，`union` 把一棵树挂到另一棵下面。两个动作各有一个退化来源：合并方向选错会长出一条越来越长的链，反复查同一条链则每次都白爬一遍。

两个优化各封一个来源。路径压缩在 `find` 的回程把路过的节点全挂到根上，一次拍扁、之后一步到，是**事后**补救；按大小合并让小树挂到大树下，树高不超过 log n，是**事前**预防。两者合起来把均摊代价压到 O(α(n))。

## 朴素版本

```python
n = 10
fa = list(range(n))            # fa[x]：x 的父亲，等于自己即代表元

def find(x: int) -> int:
    """返回 x 所在集合的代表元。最坏 O(n)"""
    while fa[x] != x:          # ① 不是根，继续往上爬
        x = fa[x]              # ② 一次只走一层，链长即代价
    return x                   # ③ 撞上自环，它就是代表元

def union(x: int, y: int) -> None:
    """把 x 的集合挂到 y 的集合下面。最坏 O(n)"""
    rx, ry = find(x), find(y)  # ① 判同集看根，不看原始下标
    fa[rx] = ry                # ② 整棵树直接挂过去
```

`union` 只做两件事：两端各找一次根，然后把一个根挂到另一个根下。挂完不记录任何额外信息，所以下一次合并无从判断该往哪边挂。

朴素版在「链式合并」下退化：`union(1, 2), union(2, 3), union(3, 4)…` 之后 `find(1)` 要爬完整条链。下面两个优化分别封掉这条链的两个来源。

## 优化一：路径压缩（find 时加速）

```python
n = 10
fa = list(range(n))          # 与上一节同一份父指针

def find(x: int) -> int:
    """返回 x 的代表元，回程顺手压平路径。均摊 O(α(n))"""
    if fa[x] != x:           # ① 不是根，先把上面处理干净
        fa[x] = find(fa[x])  # ② 回程让 x 直连根
    return fa[x]             # ③ 这一步读到的已经是根
```

find 经过的每个节点，回程时都直接挂到代表元下——树越用越扁，同一条路径第二次 find 一步就到。递归深度等于树高：两个优化齐开时 ≤ log n，碰不到 Python 的递归上限；只压不并、链仍很长时才会爆栈。

同一个效果也可以不递归地做：

```python
n = 10
fa = list(range(n))          # 建一条链只为看清压平过程

def find_iter(x: int) -> int:
    """迭代版：先爬到根，再回填整条路径。均摊 O(α(n))"""
    root = x
    while fa[root] != root:  # ① 第一趟只找根，一个指针都不改
        root = fa[root]
    while fa[x] != x:        # ② 第二趟把沿途节点全挂到根下
        parent = fa[x]       # ③ 先备份父节点，④ 会覆盖它
        fa[x] = root         # ④ 覆盖之后 fa[x] 不再是上一层
        x = parent           # ⑤ 只能靠备份往上走
    return root

for i in range(9):           # 造链 0 → 1 → … → 9
    fa[i] = i + 1
fa[9] = 9
find_iter(0)                 # 一次调用把整条链压平
```

迭代版把「找根」和「压扁」拆成两趟，不占调用栈；代价是每个节点多读一次父指针。写它唯一容易栽的地方是顺序：`parent` 必须在 `fa[x]` 被改写**之前**取出。若改成先 `fa[x] = root` 再 `x = fa[x]`，第二步拿到的是刚写进去的根，循环立刻结束，整条路径只有第一个节点被压扁，其余照旧挂着。

## 优化二：按大小合并（union 时防新链）

```python
n = 10
fa = list(range(n))                     # 承接上一节：同一份父指针
size = [1] * n                          # size[r]：根 r 那块的大小

# 沿用上一节的压缩版 find，本节只改 union
def find(x: int) -> int:
    """返回 x 的代表元。均摊 O(α(n))"""
    if fa[x] != x:
        fa[x] = find(fa[x])
    return fa[x]

def union2(x: int, y: int) -> bool:
    """按大小合并：小树挂到大树下。均摊 O(α(n))"""
    root_x, root_y = find(x), find(y)   # ① 两端各找代表元
    if root_x == root_y:
        return False                    # ② 本已同集（环检测的信号）
    if size[root_x] < size[root_y]:
        root_x, root_y = root_y, root_x  # ③ 让 root_x 成为较大的根
    fa[root_y] = root_x                 # ④ 小树挂过去，深度最多 +1
    size[root_x] += size[root_y]        # ⑤ size 只维护在根上
    return True
```

没有它，「大集挂到小集下」会重造深链。两个优化在分工上互补：路径压缩**事后**补救，按大小合并**事前**预防。也可以按秩（rank）记树高，理论效果等价；按 size 的版本额外附送「集有多大」，实践中更常用。

## 完整模板

```python
class UnionFind:
    """路径压缩 + 按大小合并；单次操作均摊 O(α(n))"""

    def __init__(self, n: int):
        self.fa = list(range(n))        # ① fa[x]：x 的父节点
        self.size = [1] * n             # ② 只在根上有意义
        self.cc = n                     # ③ 连通块数，起始 n 块

    def find(self, x: int) -> int:
        """返回 x 的代表元，并把路径压平。均摊 O(α(n))"""
        if self.fa[x] != x:             # ① 不是根：先让父节点到根
            root = self.find(self.fa[x])
            self.fa[x] = root           # ② 回程把 x 直接挂到根上
        return self.fa[x]               # ③ 已压平，一步到根

    def is_same(self, x: int, y: int) -> bool:
        """x、y 是否同集。均摊 O(α(n))"""
        return self.find(x) == self.find(y)

    def merge(self, x: int, y: int) -> bool:
        """合并两集合；False 表示本已同集（环信号）。均摊 O(α(n))"""
        rx, ry = self.find(x), self.find(y)  # ① 先各自找到根
        if rx == ry:
            return False                # ② 同根，什么都不改
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx             # ③ 让 rx 是较大的根
        self.fa[ry] = rx                # ④ 小树挂大树
        self.size[rx] += self.size[ry]  # ⑤ 只更新根上的 size
        self.cc -= 1                    # ⑥ 两块并成一块
        return True

    def get_size(self, x: int) -> int:
        """x 所在集合的成员数。均摊 O(α(n))"""
        return self.size[self.find(x)]
```

`merge` 一共六步：① 找根，② 同根就直接返回 `False`，③ 定方向，④ 挂接，⑤ 维护 `size`，⑥ `cc` 减一。判环要的就是第 ② 步。

`cc`（连通块计数）是最容易被遗忘、却经常是答案本体的量：每次 merge 成功恰减少一块。起始 n 块、终态多少块，就是「省份数量」「岛屿数量」这类题的全部答案。

## 题型一：连通块计数（547 省份数量）

[547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)：`isConnected[i][j] == 1` 表示两城直连，问有多少个省。

```python
def findCircleNum(isConnected: list[list[int]]) -> int:
    """省份数量：沿直连边合并，答案是剩余连通块数。O(n²·α(n))"""
    n = len(isConnected)
    uf = UnionFind(n)              # ① 每座城先各自成一省
    for i in range(n):
        for j in range(i + 1, n):  # ② 矩阵对称，只扫上三角
            if isConnected[i][j] == 1:
                uf.merge(i, j)     # ③ 直连即合并成一个集合
    return uf.cc                   # ④ 剩下的块数就是省数
```

DFS/BFS 也能解：需要 `visited` 数组，且每发现一个未访问城市就发起一次遍历。并查集沿边去 merge、直接读 `cc`，代码量最少，也不用「重新找起点」的逻辑。

## 题型二：冗余连接（684，环检测）

[684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)：给一棵树加了一条边，找出那条多余的。依据：**树中任意两点路径唯一**，因此某条边连接的两个端点若已连通，这条边必在环上。

```python
def findRedundantConnection(edges: list[list[int]]) -> list[int]:
    """返回构成环的那条边；输入是树多一条边。O(n·α(n))"""
    max_node = max(max(e) for e in edges)  # ① 编号从 1 起
    uf = UnionFind(max_node + 1)        # ② 开 max+1，0 号位空着
    ans: list[int] = []
    for u, v in edges:
        if not uf.merge(u, v):          # ③ 合并失败 = 端点已连通
            ans = [u, v]                # ④ 这条边落在环上
    return ans                          # ⑤ 题目保证唯一，最后一条即答案
```

无向图判环最省事的写法就是这一手：merge 的 `False` 直接当环信号。有向图判环走另一路（DFS 三色标记或拓扑排序），见 [patterns/dfs.md](../patterns/dfs.md)、[patterns/bfs.md](../patterns/bfs.md)。

## 题型三：Kruskal 最小生成树

按边权从小到大扫一遍，**能 merge 的才收**（收得下 = 两端恰好分属两个连通块）；收满 n−1 条即得 MST。贪心成立的依据：考虑剩下可用边里最便宜的 `e`，其两端要么已连通（再收只是添一圈），要么分属两块（不收也不亏，连通它们迟早要花更高代价）——单条边的两种结局都与最优解一致。

```python
import math

def min_spanning_tree(n: int, edges: list[tuple[int, int, int]]) -> float:
    """Kruskal：按边权升序收边。O(m log m)；不连通返回 inf"""
    edges = sorted(edges, key=lambda e: e[2])  # ① 瓶颈就在这次排序
    uf = UnionFind(n)
    total = 0.0
    for u, v, w in edges:
        if uf.merge(u, v):              # ② 成功 = 接上两块不同块
            total += w
            if uf.cc == 1:
                return total            # ③ 连成一整块即可停
    return math.inf if uf.cc > 1 else total  # ④ 还有孤块，无生成树
```

复杂度瓶颈是排序本身的 O(m log m)——并查集那部分（O(m·α(n))）反而是次要的。

## 题型四：带权并查集（399）

普通版只知道「同不同集」；带权版在每个 `fa` 边上**附加一个数**：`weight[x]` 为「x 相对其当前父节点的比值」，find 时沿路径累乘折算到根。代表题是 [399. 除法求值](https://leetcode.cn/problems/evaluate-division/)：给 `a/b = 2.0` 一类等式，回答任意 `x/y`。

```python
class WeightedUnionFind:
    """带权并查集：weight[x] = x / 父(x)。操作均摊 O(α(n))"""

    def __init__(self):
        self.fa: dict[str, str] = {}    # 键任意可哈希，按需加入
        # weight[x]：x 相对父的比值，根上恒为 1
        self.weight: dict[str, float] = {}

    def add(self, x: str) -> None:
        """新键自成一集，相对自己是 1。O(1)"""
        if x not in self.fa:
            self.fa[x] = x
            self.weight[x] = 1.0        # 自己是根，x / x = 1

    def find(self, x: str) -> str:
        """返回 x 的根，沿途比值折算到根。均摊 O(α(n))"""
        if self.fa[x] != x:             # ① 不是根，先压父节点
            root = self.find(self.fa[x])
            # ② 父已直连根，weight[父] 就是「父/根」
            self.weight[x] *= self.weight[self.fa[x]]
            self.fa[x] = root           # ③ 比值算完才能改父指针
        return self.fa[x]

    def merge(self, x: str, y: str, ratio: float) -> None:
        """声明 x / y = ratio；与已有关系冲突时不处理。O(α(n))"""
        self.add(x)
        self.add(y)
        # ① 两端各找一次根
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return                      # ② 关系已隐含
        self.fa[root_x] = root_y        # ③ 根挂到根下
        # ④ 新边的比值 = root_x / root_y，推法见下文
        self.weight[root_x] = ratio * self.weight[y] / self.weight[x]

    def query(self, x: str, y: str) -> float:
        """返回 x / y；缺席或不同集返回 -1.0。均摊 O(α(n))"""
        if x not in self.fa or y not in self.fa:
            return -1.0                 # ① 变量从未出现过
        if self.find(x) != self.find(y):
            return -1.0                 # ② 比值已折算到根
        return self.weight[x] / self.weight[y]  # ③ 同根相除
```

`query` 只在两个根相同时才敢做除法：`weight` 是「相对父节点」的局部量，没折算到根之前相除是没有意义的，而条件里的两次 `find` 恰好完成了折算。

**新边 `root_x → root_y` 上的比值怎么来**，分三步：

① **目标**：`fa[root_x] = root_y` 之后，这条边的权重必须是 `weight[root_x] = root_x / root_y`，否则下一次 find 折算出来的数就是错的。

② **把两个根换成 x、y**：`weight[x] = x / root_x` 反解出 `root_x = x / weight[x]`；同理 `weight[y] = y / root_y` 给出 `root_y = y / weight[y]`。

③ **代入 `x = ratio * y`**：`root_x / root_y = (x / y) · (weight[y] / weight[x]) = ratio · weight[y] / weight[x]`，这就是代码里那行赋值。

`a/b = 2`、`b/c = 3` 依次挂进去，树形与权重这样演化（见下图）：

![带权并查集：边上记比值，find 时沿路径累乘到根](/diagrams/unionfind-weighted.png)

```text
merge(a, b, 2)：fa[a] = b，weight[a] = 2 * 1 / 1 = 2
merge(b, c, 3)：fa[b] = c，weight[b] = 3 * 1 / 1 = 3

树：c ← b ← a；权重：a→b = 2，b→c = 3（各自相对父节点）

query(a, c)：
  find(a) 逐层递归到 c，再沿回程折算
  回程 weight[b] = 3 * weight[c](= 1) = 3
  回程 weight[a] = 2 * weight[b](= 3) = 6，fa[a] 压成 c
  同根，返回 weight[a] / weight[c] = 6 / 1 = 6

query(c, a)：c 已是根，weight[c] = 1 → 1 / 6
```

两次 query 之后 `a`、`b` 都直接挂在 `c` 下，权重变成相对 `c` 的 6 与 3——路径压缩在这里不只是省时间，它顺手把「相对父」的量升级成「相对根」的量。不压缩的话每次 query 都得逐层重算，压缩后只剩一次除法。

## 易错点总结

- merge 里忘了先两次 find——判「同集」的依据是 `find` 后的代表元，不是原始下标
- 扔掉了 merge 的返回值，等于丢了无向图的环信号（684）
- 带权 merge 的比值方向写反：先把「目标 `weight[root_x] = ?`」用代数推一遍，再落到 `weight[root_x] = ratio * weight[y] / weight[x]`
- 初始化范围少一：节点编号最大时数组要开 `max + 1`
- 带权 query 先比较、后读值：条件里的两次 find 必须都跑过，`weight` 才是相对根的
- 迭代路径压缩先备份 `fa[x]` 再改：改完再读 `fa[x]` 拿到的是根，整条路径只有第一个节点被压扁（递归版没有这个顺序问题，代价是深度受树高约束）

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
