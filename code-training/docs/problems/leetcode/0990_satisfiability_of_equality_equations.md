---
title: 990. 等式方程的可满足性
platform: LeetCode
difficulty: Medium
id: 990
url: https://leetcode.cn/problems/satisfiability-of-equality-equations/
tags:
  - 并查集
  - 图
  - 数组
  - 字符串
topics: []
patterns: []
date_added: 2026-10-27
date_reviewed: []
---

# 990. 等式方程的可满足性

## 题目描述

给定一个由表示变量之间关系的字符串方程组成的数组，每个字符串方程 `equations[i]` 的长度为 `4`，并采用两种不同的形式之一：`"a==b"` 或 `"a!=b"`。在这里，`a` 和 `b` 是小写字母（不一定不同），表示单字母变量名。

只有当可以将整数分配给变量名，以便满足所有给定的方程时才返回 `true`，否则返回 `false`。

**示例 1：**

```
输入：["a==b","b!=c","c==a"]
输出：false
```

**示例 2：**

```
输入：["a==b","b==c","c==a"]
输出：true
```

**示例 3：**

```
输入：["a==b","b!=a"]
输出：false
```

**提示：**

- `1 <= equations.length <= 500`
- `equations[i].length == 4`
- `equations[i][0]` 是小写字母
- `equations[i][1]` 要么是 `'='` 要么是 `'!'`
- `equations[i][2]` 要么是 `'='` 要么是 `'!'`
- `equations[i][3]` 是小写字母

## 解题思路

### 问题分析

变量名都是单个小写字母，共有 26 个变量，关系是等式（`==`）和不等式（`!=`）。等式具有**传递性、对称性、自反性**，本质是把变量划分成若干个**等价类**。

### 解法思路

1. **先处理所有 `==`**：将等号两边的字母合并到同一个集合中。经过所有 `==` 之后，同一集合内的任意两个变量都必须相等。
2. **再检查所有 `!=`**：如果不等号两边的字母在同一个集合中，说明前面强制要求它们相等却又要求不等，矛盾，返回 `false`。全部检查通过则返回 `true`。

只要有 26 个变量就够用，直接用数组实现并查集即可，不用哈希表。

### 实现要点

- 用并查集维护等价关系，初始 26 个独立集合。
- 遍历 `equations`，先把所有 `==` 的 `(a,b)` 调用 `merge`。
- 再遍历 `equations`，对于 `!=` 的 `(a,b)`，若 `find(a) == find(b)` 返回 `false`。
- 全部通过返回 `true`。

## 完整代码实现

```python
from typing import List

class UnionFind:
    def __init__(self, n: int = 26):
        self.fa = list(range(n))
        self.size = [1] * n

    def find(self, x: int) -> int:
        if self.fa[x] != x:
            self.fa[x] = self.find(self.fa[x])
        return self.fa[x]

    def merge(self, x: int, y: int) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.fa[ry] = rx
        self.size[rx] += self.size[ry]
        return True


class Solution:
    def equationsPossible(self, equations: List[str]) -> bool:
        uf = UnionFind(26)
        for e in equations:
            if e[1] == '=':
                x = ord(e[0]) - ord('a')
                y = ord(e[3]) - ord('a')
                uf.merge(x, y)
        for e in equations:
            if e[1] == '!':
                x = ord(e[0]) - ord('a')
                y = ord(e[3]) - ord('a')
                if uf.find(x) == uf.find(y):
                    return False
        return True
```

## 示例推演

**示例 1：** `["a==b","b!=c","c==a"]`

1. 处理 `==`：`a==b` 合并 a、b；`c==a` 合并 c、a。此时 a、b、c 在同一个集合
2. 处理 `!=`：`b!=c`，`find(b) == find(c)`，返回 `false`

**示例 2：** `["a==b","b==c","c==a"]`

1. 全部 `==` 都合并，a、b、c 同集合
2. 没有 `!=`，返回 `true`

**示例 3：** `["a==b","b!=a"]`

1. `a==b` 合并
2. `b!=a`，`find(b)==find(a)`，返回 `false`

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 并查集（最优） | O((n + α(26)) * 1) | O(1) | n 为方程数，变量数固定 26，α(26) 极小 |

## 易错点总结

- **顺序不能颠倒**：必须先合并所有等式，再检查所有不等式。如果先检查，`==` 传递性还没建立，会误判。
- **只处理 26 个字母**：变量都是小写字母，直接用 `ord(c)-ord('a')` 做下标即可。
- **不等号的检查**：只要 `find(x) == find(y)` 就说明它们被强制等价，违反 `!=`，立刻返回 `false`。

## 扩展思考

等式方程的可满足性是「等价类」思想的典型应用。若变量更多也能用哈希映射动态创建并查集节点，只是本题限定了小写字母范围。
