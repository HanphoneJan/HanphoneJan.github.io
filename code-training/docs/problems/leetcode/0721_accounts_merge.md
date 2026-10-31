---
title: 721. 账户合并
platform: LeetCode
difficulty: Medium
id: 721
url: https://leetcode.cn/problems/accounts-merge/
tags:
  - 深度优先搜索
  - 广度优先搜索
  - 并查集
  - 数组
  - 字符串
topics: []
patterns:
  - ../../patterns/dfs.md
  - ../../patterns/bfs.md
date_added: 2026-10-27
date_reviewed: []
---

# 721. 账户合并

## 题目描述

给定一个列表 `accounts`，每个元素 `accounts[i]` 是一个字符串列表，其中第一个元素 `accounts[i][0]` 是 **名称 (name)**，其余元素是 **邮箱 (email)** 用于联系该账户的人。

现在，我们想合并这些账户。如果两个账户都有一些共同的邮箱地址，则两个账户必定属于同一个人。注意：即使两个账户没有共同的邮箱地址，但名称相同，也可能属于不同的人。

请你将账户合并后返回。合并后，账户的第一个元素是名称，其余元素是 **按字母顺序排列的邮箱**。账户本身可以以任意顺序返回。

**示例 1：**

```
输入：accounts = [["John", "johnsmith@mail.com", "john_newyork@mail.com"], 
                ["John", "johnsmith@mail.com", "john00@mail.com"], 
                ["Mary", "mary@mail.com"], 
                ["John", "johnnybravo@mail.com"]]
输出：[
         ["John", 'john00@mail.com', 'john_newyork@mail.com', 'johnsmith@mail.com'], 
         ["Mary", 'mary@mail.com'], 
         ["John", 'johnnybravo@mail.com']
       ]
解释：第一个和第二个客户有共同的邮箱 "johnsmith@mail.com"，因此属于同一个人。
```

**示例 2：**

```
输入：accounts = [["Gabe","Gabe0@m.co","Gabe3@m.co","Gabe1@m.co"],["Kevin","Kevin3@m.co","Kevin5@m.co","Kevin0@m.co"],["Ethan","Ethan5@m.co","Ethan3@m.co","Ethan0@m.co"],["Hanzo","Hanzo3@m.co","Hanzo1@m.co","Hanzo0@m.co"],["Fern","Fern5@m.co","Fern1@m.co","Fern0@m.co"]]
输出：[
         ["Ethan","Ethan0@m.co","Ethan3@m.co","Ethan5@m.co"],
         ["Gabe","Gabe0@m.co","Gabe1@m.co","Gabe3@m.co"],
         ["Hanzo","Hanzo3@m.co","Hanzo0@m.co","Hanzo1@m.co"],
         ["Kevin","Kevin0@m.co","Kevin3@m.co","Kevin5@m.co"],
         ["Fern","Fern0@m.co","Fern1@m.co","Fern5@m.co"]
       ]
```

## 解题思路

### 合并的判据只有一条：共享邮箱

题面把规则说得很硬：**两个账户有共同邮箱 ⇒ 同一个人**；反过来，**名称相同不构成任何证据**（示例 1 里第 4 个 `John` 只有 `johnnybravo@mail.com`，与另外两个 `John` 没有交集，所以它是独立的一条）。

「共享」还有传递性：`A` 与 `B` 共享 `e1`、`B` 与 `C` 共享 `e2`，则三者是同一个人，尽管 `A` 与 `C` 一个邮箱都不重合。要判断的因此不是「两两有没有交集」，而是「沿着共享关系能走到一起的一组邮箱有哪些」—— 这是**连通块**问题。

输出形状也要一起看：

- 每条结果是 `[name, 邮箱1, 邮箱2, ...]`，邮箱**必须按字母升序**；
- 组与组之间的顺序任意；
- 同一个连通块里的名字是一致的（题面把「共享邮箱」直接定义成同一个人），所以取组里任意一个邮箱对应的名字都行。

### 关键建模：节点选邮箱，不选账户

如果拿账户当节点，就需要先建一张「邮箱 → 出现在哪些账户」的倒排表，再把同一邮箱下的账户两两相连 —— 一个热门邮箱被 `k` 个账户共用时，光连边就是 `O(k²)`，而且「同一账户里的邮箱属于同一个人」这条信息还得单独处理。

换成**邮箱当节点**，两件事同时变简单：

- 同一个账户里的所有邮箱属于同一个人 → 它们本来就该在同一个集合，一个循环全合并掉；
- 两个账户共享一个邮箱 → 这个邮箱在全表里只有**一个下标**，合并时天然把两个账户连在一起。

这样一来，「合并」只需要对每个账户做 `k-1` 次 `merge`，总次数是「所有账户的邮箱数之和」，没有两两配对。

题目规模也印证这条路够用：账户最多 1000 个、每个账户最多 10 个邮箱，总邮箱数 `M ≤ 9000`。`O(M α(M))` 和 `O(M log M)` 都在毫秒级，选哪种写法只取决于可读性与实现代价，不需要为了常数去抠。

### 方法一：邮箱并查集

三趟扫描，每趟只做一件事：建索引、合并、分组。

```python
from typing import List
import collections

class UnionFind:
    def __init__(self, n: int):
        self.fa = list(range(n))
        self.size = [1] * n

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])
        return self.fa[x]

    def merge(self, x: int, y: int) -> None:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]


class Solution:
    def accountsMerge(self, accounts: List[List[str]]) -> List[List[str]]:
        email_to_index, email_to_name = {}, {}
        for account in accounts:
            for email in account[1:]:
                if email not in email_to_index:          # 只登记第一次出现的
                    email_to_index[email] = len(email_to_index)
                    email_to_name[email] = account[0]

        uf = UnionFind(len(email_to_index))
        for account in accounts:
            root = email_to_index[account[1]]            # 用第一个邮箱当根
            for email in account[2:]:
                uf.merge(root, email_to_index[email])

        groups = collections.defaultdict(list)
        for email, idx in email_to_index.items():
            groups[uf.find(idx)].append(email)           # key 必须是根，不是 idx

        return [
            [email_to_name[emails[0]]] + sorted(emails)
            for emails in groups.values()
        ]
```

三处值得对着代码看：

- `if email not in email_to_index`：同一个邮箱在多个账户里出现时，**只登记一次**，否则同一个邮箱会有两个下标，合并就断在这里。
- `root = email_to_index[account[1]]` 后只对 `account[2:]` 合并：第一个邮箱自己是根，不需要和自己 `merge`。
- 分组的 key 是 `uf.find(idx)`：直接用 `idx` 会把同一个人的邮箱拆成好几组（见「易错点」）。

最后 `sorted(emails)` 不能省 —— 题面要求邮箱按字母序，而 `dict` 的顺序是「第一次出现的顺序」，跟字母序无关。

### 方法二：邮箱图 + DFS 找连通块

把「同一个账户里的邮箱」连成边，问题就变成「求无向图的每个连通块」。为了不让边数膨胀，用**星形**连边：每个账户的第一个邮箱当中心，其余邮箱各连一条边到它。这样一个人有 `k` 个邮箱时只加 `k-1` 条边，连通性和两两相连完全一样。

```python
from typing import List
import collections

class Solution:
    def accountsMerge(self, accounts: List[List[str]]) -> List[List[str]]:
        email_to_name = {}
        graph = collections.defaultdict(list)

        for name, *emails in accounts:
            for email in emails:
                email_to_name[email] = name
            center = emails[0]
            for email in emails[1:]:              # 星形连边，k 个邮箱只加 k-1 条边
                graph[center].append(email)
                graph[email].append(center)

        seen, res = set(), []
        for start in email_to_name:
            if start in seen:
                continue
            seen.add(start)
            stack, block = [start], []
            while stack:                          # 迭代 DFS 收集整个连通块
                u = stack.pop()
                block.append(u)
                for w in graph[u]:
                    if w not in seen:
                        seen.add(w)
                        stack.append(w)
            res.append([email_to_name[start]] + sorted(block))

        return res
```

外层循环遍历的是 `email_to_name` 的键（所有邮箱），不是 `graph` —— 只有单个邮箱的账户在 `graph` 里根本没有键，漏掉就少一条结果。`seen` 在入栈时标记（不是出栈时），否则同一个邮箱会被重复入栈。

### 两种写法怎么选

| | 并查集 | 邮箱图 + DFS |
|---|---|---|
| 合并动作 | `k-1` 次 `merge` | `k-1` 条双向边 + 一次遍历 |
| 分组 | 再扫一遍全部邮箱，按根归档 | 遍历时顺手收集 |
| 深度风险 | 无（`find` 迭代/递归深度是树高，压缩后极浅） | 一个人的邮箱很多时栈会变深 |
| 可读性 | 需要理解「根」的概念 | 直观，就是「找连通块」 |

两者的总时间都由最后那步排序 `O(M log M)` 主导（并查集本身只有 `O(M α(M))`）。并查集的优势是**不需要建图**，多个人共享同一个邮箱时也不会把图造得很大；DFS 的优势是写起来直白，收集连通块和排序一步到位。

---

## 完整代码实现

并查集版（基准实现）：

```python
from typing import List
import collections

class UnionFind:
    def __init__(self, n):
        self.fa = list(range(n))
        self.size = [1] * n

    def find(self, x):
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])
        return self.fa[x]

    def merge(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        return True


class Solution:
    def accountsMerge(self, accounts: List[List[str]]) -> List[List[str]]:
        email_to_index = {}
        email_to_name = {}
        for account in accounts:
            name = account[0]
            for email in account[1:]:
                if email not in email_to_index:
                    email_to_index[email] = len(email_to_index)
                    email_to_name[email] = name

        n = len(email_to_index)
        uf = UnionFind(n)
        for account in accounts:
            first_email = account[1]
            first_idx = email_to_index[first_email]
            for email in account[2:]:
                idx = email_to_index[email]
                uf.merge(first_idx, idx)

        groups = collections.defaultdict(list)
        for email, idx in email_to_index.items():
            groups[uf.find(idx)].append(email)

        res = []
        for emails in groups.values():
            name = email_to_name[emails[0]]
            res.append([name] + sorted(emails))
        return res
```

---

## 示例推演

**示例 1**，`accounts` 共 4 条，先给每个邮箱编号（按第一次出现的顺序）：

| 邮箱 | 下标 | 名字 |
|---|---|---|
| `johnsmith@mail.com` | 0 | John |
| `john_newyork@mail.com` | 1 | John |
| `john00@mail.com` | 2 | John |
| `mary@mail.com` | 3 | Mary |
| `johnnybravo@mail.com` | 4 | John |

并查集初始 `fa = [0, 1, 2, 3, 4]`。第二趟按账户合并：

| 账户 | 根 | 合并 | `fa` 变化 |
|---|---|---|---|
| `John / johnsmith, john_newyork` | 0 | `merge(0, 1)` | `fa[1] = 0` |
| `John / johnsmith, john00` | 0 | `merge(0, 2)` | `fa[2] = 0` |
| `Mary / mary` | 3 | 无其它邮箱 | 不变 |
| `John / johnnybravo` | 4 | 无其它邮箱 | 不变 |

第三个 `John` 账户只出现一次、也没和谁共享邮箱，所以它自成一集合 —— 名字相同不参与判断。

第三趟按根分组：`find(0) = find(1) = find(2) = 0` 归为一组，`3`、`4` 各自一组。

| 根 | 组内邮箱（排序后） | 输出 |
|---|---|---|
| 0 | `john00, john_newyork, johnsmith` | `["John", "john00@mail.com", "john_newyork@mail.com", "johnsmith@mail.com"]` |
| 3 | `mary` | `["Mary", "mary@mail.com"]` |
| 4 | `johnnybravo` | `["John", "johnnybravo@mail.com"]` |

与题面输出一致。排序后的第一个邮箱恰好是 `john00`，而不是最初当根的那个 `johnsmith` —— 说明「根」只用来分组，不决定输出顺序。

**示例 2**：5 条账户两两之间没有任何共同邮箱，所以是 5 个独立的集合，结果就是各自排序后的邮箱。这里有一处要注意：题面示例把 `Hanzo` 那一行写成 `Hanzo3, Hanzo0, Hanzo1`，这与题面自己的要求「邮箱按字母顺序排列」并不一致；按题面要求排序即可，正确结果是 `Hanzo0, Hanzo1, Hanzo3`（只有组与组之间的顺序是任意的）。

**传递性再验一遍**：`[["A","a","b"], ["A","c","d"], ["A","b","c"]]` 里，账户 1 与账户 3 共享 `b`、账户 2 与账户 3 共享 `c`，三个账户最终合成一组 `["A", "a", "b", "c", "d"]`。若只比较「两两是否有交集」而不做连通块，这一步会漏掉。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 并查集（最优） | O(M α(K)) | O(M + K) | `M` 为邮箱总数、`K` 为账户数；合并 O(M α(K))，排序 O(M log M) 才是瓶颈 |
| 邮箱图 + DFS | O(M log M) | O(M) | 建图与遍历都是 O(M)，同样被排序主导 |

> 两行的渐进复杂度实际相当，差别在常数与实现代价：并查集不建图、也没有递归深度问题。

---

## 易错点总结

1. **分组时用 `idx` 当 key，忘了 `find`**：`groups[idx].append(email)` 会把同一个人的邮箱按「各自的下标」拆开。示例 1 会输出 5 条结果（三个 `John` 各占一行），而不是 3 条。
2. **忘了 `sorted(emails)`**：`dict` 保留的是「第一次出现」的顺序，示例 1 第一组会输出 `johnsmith, john_newyork, john00`，与要求的字母序 `john00, john_newyork, johnsmith` 不符，判题 WA。
3. **DFS 版漏 `seen`**：图是双向的，`a → b` 之后 `b → a` 又回去。迭代版会不断把同一个邮箱压栈直到内存耗尽，递归版直接 `RecursionError: maximum recursion depth exceeded`。

---

## 扩展思考

- **同一套「共享标识就合并」的题**：990 题（等式方程的可满足性）把邮箱换成变量，先合并所有 `==`，再检查 `!=` 是否被合并到了同一集合；547 题（省份数量）合并的是城市；1202 题（交换字符串中的元素）合并的是字符下标，最后按连通块排序。它们的骨架都和这题一样：**选对节点 → 合并 → 按根归档**。
- **和 684 题的对照**：684 是「加边前检查两端是否已连通」，用来找多余的边；这题是「先全部合并，再按根分组」，用来找连通块。同一个数据结构，一个在合并时做判断，一个在合并后做查询。

---

## 相关题目

- [990. 等式方程的可满足性](https://leetcode.cn/problems/satisfiability-of-equality-equations/)
- [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/)
- [1202. 交换字符串中的元素](https://leetcode.cn/problems/smallest-string-with-swaps/)
