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

### 问题分析

- 同一个人可以有多个账户，且这些账户之间**通过至少一个共同的邮箱**相连。传递性也适用：A-B 共用邮箱 e1，B-C 共用邮箱 e2，则 A、B、C 属于同一个人。
- 名称相同不等于同一个人，只有邮箱有交集才合并。
- 合并后每个账户的邮箱要**按字母顺序排列**，账户顺序任意。

### 为什么用并查集

把每个**邮箱**当成一个节点。对于同一个账户列表里的所有邮箱，它们都属于同一个人，直接把它们合并到一起。遍历全部账户后，属于同一个人的所有邮箱都会落到同一个集合。再按集合分组，附上该账户的姓名并对邮箱排序即可。

### 实现要点

- 建立邮箱到**索引**（或直接到代表某个账户的节点）的映射：用 `email_to_index` 把每个邮箱映射到它第一次出现时所在的账户索引，或者直接用并查集管理邮箱。
- 遍历每个 `accounts[i]`，拿出第一个邮箱 `accounts[i][1]` 作为**根邮箱**，将该账户其余邮箱都和根邮箱合并。
- 遍历所有邮箱，将同一集合的邮箱收集到一起，再根据集合找到对应的姓名（任意一个该集合里邮箱对应的账户名称即可）。
- 每组邮箱排序后，拼成 `[name] + sorted(emails)` 返回。

## 完整代码实现

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

## 示例推演

**示例 1：**

`accounts[0] = ["John", "johnsmith@mail.com", "john_newyork@mail.com"]`
`accounts[1] = ["John", "johnsmith@mail.com", "john00@mail.com"]`
`accounts[2] = ["Mary", "mary@mail.com"]`
`accounts[3] = ["John", "johnnybravo@mail.com"]`

1. 收集所有邮箱，建立映射：`johnsmith`、`john_newyork`、`john00`、`mary`、`johnnybravo`
2. 对 `accounts[0]`，用 `johnsmith@mail.com` 为根，把 `john_newyork@mail.com` 和它合并
3. 对 `accounts[1]`，用 `johnsmith@mail.com` 为根，把 `john00@mail.com` 和它合并（此时三者同集合）
4. `accounts[2]` 独立，`accounts[3]` 独立
5. 按集合分组：`[john00@mail.com, john_newyork@mail.com, johnsmith@mail.com]`、`[mary@mail.com]`、`[johnnybravo@mail.com]`
6. 按字母排序后附加姓名返回

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 并查集（最优） | O(M α(K)) | O(M + K) | M 为所有邮箱总数，K 为账户数 |

## 易错点总结

- **以邮箱为节点**：不能以账户为节点，而要以**邮箱**为节点。因为同一个账户内的邮箱已经属于同一个人，同一个邮箱出现在不同账户才是合并的线索。
- **合并时选定根**：每个账户遍历时，用该账户的**第一个邮箱**作为根，把剩下的邮箱都合并到这个根，能确保同一账户内的所有邮箱都在同一个集合。
- **姓名的获取**：分组后每组的邮箱都属于同一个人，任意选取该组中某个邮箱对应的姓名即可（`email_to_name` 保留的是首次出现的姓名）。
- **排序要求**：最终每个账户的邮箱列表必须**按字母顺序排列**，姓名保持在首位。

## 扩展思考

这道题是并查集在「实体合并」场景中的经典用法。思路也能迁移到「用户 ID 合并」「设备合并」等问题：找出所有共享同一个标识（这里是邮箱）而能串联起来的实体，最终合并成同一个组。
