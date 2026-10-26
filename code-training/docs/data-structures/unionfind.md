---
title: 并查集
category: 数据结构
difficulty_range: [中等, 较难]
last_updated: 2026-10-26
---

# 并查集（Union-Find）

## 一句话理解

**并查集管理的是「谁跟谁是一伙的」**：它维护一族互不相交的集合，只支持两个动作——

- **find(x)**：x 这一伙的「代表元」是谁？（查同一个代表元 = 认识同伙）
- **union(x, y)**：把 x 和 y 两伙合并成一伙

它 **不支持**：删除一个元素、把一个集合拆开、查询某个集合的完整成员列表。这个「只会合、不会分」的偏科不是缺陷——所有「动态连通性」问题恰好只需要这两个动作，比如「加了这条边之后，甲乙两地通不通？」「现在图里还有几片互不连通的孤岛？」

现实模型很直观：微信好友关系。成百上千万用户，你只关心「这个人跟我是不是间接认识」与「两个团队合并了」。并查集就是这件事的 O(α(n)) 实现。

## 复杂度与直觉

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| find（带路径压缩） | 均摊 O(α(n)) | α 是阿克曼反函数，宇宙尺度下都 ≤ 4，**视作常数** |
| union（按大小合并） | 均摊 O(α(n)) | 先 find 两次再挂接 |
| 初始化 | O(n) | n 个节点各成独立集合 |

不做任何优化的话 find 最坏 O(n)（链退化）；两个优化齐上后 α(n) 这个数字看着神秘，工程感受就是**「每次操作几乎是 O(1)」**。反过来说，这题数据范围大到 10^7 仍能跑，靠的就是这俩。

## 实现：一个数组走天下

### 朴素版（理解用的起点）

```python
fa = list(range(n))    # fa[x] = x 的父节点；自己当父 = 自己是代表元

def find(x):
    while fa[x] != x:          # 顺着父指针一路往上爬
        x = fa[x]
    return x

def union(x, y):
    fa[find(x)] = find(y)      # 把 x 的代表元挂到 y 的代表元下
```

朴素版在「链状合并」下会退化成一条长链：`union(1,2), union(2,3), union(3,4)…` 之后 `find(1)` 要爬完全程。下面两个优化就是针对这条链的。

### 优化一：路径压缩（find 时砍平）

```python
def find(x):
    if fa[x] != x:
        fa[x] = find(fa[x])    # 祖父直接变成父；递归回程顺手拍扁
    return fa[x]
```

查找路上经过的每个节点，回程时**全部直接挂到代表元名下**。效果是这棵树越用越扁——查过的路，第二次走一步就到。递归写法深链时会爆栈，最坏 n 层；工程上更稳的写法是「写两步拍扁」的迭代版（父指针跳两次取值），效果略差但够用且不递归。

### 优化二：按大小合并（union 时矮树挂高树）

```python
size = [1] * n

def union(x, y):
    root_x, root_y = find(x), find(y)
    if root_x == root_y:
        return False           # 已经是一伙，合并失败（环检测就靠这个 False！）
    if size[root_x] < size[root_y]:
        root_x, root_y = root_y, root_x
    fa[root_y] = root_x        # 小的挂到大的
    size[root_x] += size[root_y]
    return True
```

不加它也能跑，但「把大树挂到小树下面」会主动制造长链。两个优化是搭档：一个在 find 时拍扁历史，一个在 union 时预防新链。**合并挂接方向的选择依据是 size（按大小）或 rank（按秩），两者效果等价，按大小额外送一份「集合多大」的信息**，常用的是 size 版。

### 完整模板（背这份就够）

```python
class UnionFind:
    def __init__(self, n: int):
        self.fa = list(range(n))    # fa[x]：x 的父节点，初始自成一派
        self.size = [1] * n         # 每个集合的大小（挂接时用）
        self.cc = n                 # connected components：连通块个数

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])   # 路径压缩
        return self.fa[x]

    def is_same(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)

    def merge(self, x: int, y: int) -> bool:
        """合并两集合；返回 False 表示本来就一组（调用方常用它当环信号）"""
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
        """x 所在集合有多大"""
        return self.size[self.find(x)]
```

`cc` 这个计数器常被忽略，却是很多题的答案本体：合并成功一次，连通块就少一块。**「岛屿数量」「省份数量」系列的答案全部来自这个 `cc`**，不用每次重新扫描全图。

## 常考点一：连通块计数（省份数量 / 岛屿数量）

[547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)：`isConnected[i][j] = 1` 表示 i、j 直连，求有多少个「省」。

```python
def findCircleNum(isConnected: list[list[int]]) -> int:
    n = len(isConnected)
    uf = UnionFind(n)
    # 只扫上三角：矩阵是对称的，i-j 和 j-i 是同一条边
    for i in range(n):
        for j in range(i + 1, n):
            if isConnected[i][j] == 1:
                uf.merge(i, j)
    return uf.cc
```

对比 DFS/BFS 解法（要维护 visited 数组、每发现一个没访问过的城市就得重新发起一次遍历），并查集版把「边」过一遍就完事，代码量也最少。**「初始 n 个连通块、每成功 merge 一次减一」这幅画面更容易一眼想清楚**。

## 常考点二：冗余连接（树上多了一根线）

[684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)：一棵树加了一条边变成 n 条边，找出那条多余的。

**这里的钥匙：树里任意两点的路径只有一条，所以「一条边把两个已连通的点连起来」时这条边就是环的闭合处。**

```python
def findRedundantConnection(edges: list[list[int]]) -> list[int]:
    max_node = max(max(e) for e in edges)
    uf = UnionFind(max_node + 1)
    ans = []
    for u, v in edges:
        if not uf.merge(u, v):      # 合并失败：u、v 早已连通 → 这条边多余
            ans = [u, v]
    return ans
```

按边序处理，merge 返回 False 的那条就是答案——并查集给了你「环检测」这个几乎白送的副产品。图论里「判环」在无向图上并查集是最省事的一条路（有向图判环得用 DFS 三色标记或拓扑排序，见 [patterns/bfs.md](../patterns/bfs.md) 的拓扑与 [patterns/dfs.md](../patterns/dfs.md)）。

## 常考点三：Kruskal 最小生成树

并查集最经典的大应用：把边按权值从小到大扫一遍，**能 merge 的才要**——保证「每收一条边都连着两片原来不相干的森林」，收满 n-1 条就是最小生成树。

```python
import math

def min_spanning_tree(n: int, edges: list[tuple[int, int, int]]) -> float:
    """edges: [(u, v, 边权), ...]，返回 MST 总权；不连通返回 inf"""
    edges.sort(key=lambda e: e[2])       # 按边权排序，贪心的起点
    uf = UnionFind(n)
    total = 0.0
    for u, v, w in edges:
        if uf.merge(u, v):               # 成功 = 两块不同连通块被接上
            total += w
            if uf.cc == 1:
                return total             # 提前退：连成一整块即完成
    return math.inf if uf.cc > 1 else total
```

排序本身 O(m log m)（m 为边数），比并查集那边的 O(α(n)) 更贵，这才是 Kruskal 的复杂度瓶颈。

贪心为什么对：当前考虑的是「剩下的最便宜的边」，它的两端要么已连通（收了也只是白添一条圈，丢弃）、要么分属两块（收它能以当前最低代价把两块拼起来，不收的话，稍后要连通它们只能用更贵的边）。**在单条边上决策的这两种结局都不亏，所以逐条贪心成立**。`cc == 1` 之后可以直接停——剩下的边无论多便宜都不该再收，MST 不会多要任何一条边。

## 常考点四：带权并查集（升级版，399 题）

普通版只知道「同伙与否」；**带权版把关系量化**：每条 fa 边上挂一个权重，`weight[x]` 记「x 相对它当前父节点的倍数」，查询时把沿途的倍数连乘折算到根。

[399. 除法求值](https://leetcode.cn/problems/evaluate-division/)：给 `a/b = 2.0` 这类等式，要求均摊近似 O(1) 地回答任意 `x / y`。用的思想是**把每个变量的「相对值」直接挂在代表元的树形结构上**。

```python
class WeightedUnionFind:
    def __init__(self):
        self.fa = {}         # 节点可以按需加入（字符串/任意可哈希）
        self.weight = {}     # weight[x]：x 相对它父节点的比值

    def add(self, x):
        if x not in self.fa:
            self.fa[x] = x
            self.weight[x] = 1.0   # 路径上没有边 → 倍数 1

    def find(self, x) -> str:
        if self.fa[x] != x:
            root = self.find(self.fa[x])
            self.weight[x] *= self.weight[self.fa[x]]   # 沿途倍数累乘到根
            self.fa[x] = root                            # 顺手路径压缩
        return self.fa[x]

    def merge(self, x: str, y: str, ratio: float):
        """x / y = ratio，合并两集合"""
        self.add(x); self.add(y)
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return                       # 关系已隐含在树里，不用再挂
        self.fa[root_x] = root_y
        # 关键推导（三个已知量）：
        #   x / y = ratio（题目给的），weight[x] = x/root_x，weight[y] = y/root_y
        #   想要的是 weight[root_x] = root_x / root_y（root_x 新变成 root_y 的孩子）
        #   root_x = x / weight[x] = (ratio * y) / weight[x] = ratio * weight[y] * root_y / weight[x]
        self.weight[root_x] = ratio * self.weight[y] / self.weight[x]

    def query(self, x: str, y: str) -> float:   # 求比值，失败（不在一伙）返回 -1.0
        if x not in self.fa or y not in self.fa or self.find(x) != self.find(y):
            return -1.0
        return self.weight[x] / self.weight[y]
```

### 手推一遍（权重怎么被「攒」出来）

等式组：`a/b = 2`、`b/c = 3`。一步一步看挂接与折算：

```text
merge(a, b, 2)：fa[a] = b，weight[a] = 2    （a 挂在 b 下，a 相对 b 是 2）
merge(b, c, 3)：fa[b] = c，weight[b] = 3    （b 挂在 c 下）

现在树：c ← b ← a，weight: a→b=2, b→c=3（各自相对父节点）

query(a, c)：
  find(a) 先递归 find(b)：
    b 的父是 c 转 2 步拍扁成根，weight[b] = 3 * weight[c](=1) = 3
  回来后 weight[a] = 2 * weight[b](=3) = 6，fa[a] 也压成 c
  返回 weight[a] / weight[c] = 6 / 1 = 6

query(c, a)：c 本身就是根，weight[c]=1，weight[a]=6 → 1/6 = 0.1667
```

两个必须记住的点：**相对值 = 沿路径各段倍数的累乘**；**每次 find 顺手压缩**——不压缩的话每次查询都要一层层重算倍数，压缩成「一步到根」后倍数已经折算好存在 weight 里，剩下的就是一次除法，均摊复杂度这才回到 O(α(n))。

## 易错点总结

- **union 前不先 find 就比较**：`union` 内部两次 find 是必须的，比较「同一集合」判断永远用 find 后的代表元，不能用原始下标
- **扔掉 merge 的返回值**：这个 False 就是「无向图的环」信号，判环题（684）全靠它
- 路径压缩的迭代写法（两步一拍扁）容易把父指针更新错序，先备份 `fa[x]` 再改 `fa[x]`，递归版没有这个问题
- 带权并查集 merge 的比值推导方向写反：`weight[root_x] = ratio * weight[y] / weight[x]`，推一遍「root_x / root_y 到底等于多少」再落笔
- 初始化范围少一：节点编号到 max 时数组要开 `max + 1`
- 判断「不在一伙」时机比 find 早了：必须两个都 find 完（顺带各自压缩 + 折算权重）再比较，否则权重还没折算到根，除法结果就是错的

## 相关题目

- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- [684. 冗余连接](https://leetcode.cn/problems/redundant-connection/)
- [399. 除法求值](../problems/leetcode/0399_evaluate_division.md)（带权并查集）
- [128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)（并查集 / 哈希表殊途同归）

## 相关知识点

- [图](graph.md)——连通块、最小生成树的全图视角，可与 DFS 计数互相印证
- [patterns/bfs.md](../patterns/bfs.md)、[patterns/dfs.md](../patterns/dfs.md)——无向图连通性、有向图判环

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把操作序列换成你自己的，逐步看每一帧里
父亲指针怎么变。路径压缩与按大小合并一起做，均摊复杂度才是 O(α(n))。
画面上能看到查找时经过的每个节点都直接指向根，树越用越扁。
