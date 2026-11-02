---
title: 301. 删除无效的括号
platform: LeetCode
difficulty: Hard
id: 301
url: https://leetcode.cn/problems/remove-invalid-parentheses/
tags:
  - 字符串
  - 回溯
  - 广度优先搜索
topics: []
patterns:
  - ../../patterns/backtracking.md
  - ../../patterns/bfs.md
date_added: 2026-04-24
date_reviewed: []
---

# 301. 删除无效的括号

## 题目描述

给你一个由括号和字母组成的字符串 `s`，删除最少数量的无效括号使字符串有效，返回所有可能的结果。答案可以按任意顺序返回。

合法字符串满足：任意前缀中 `')'` 不多于 `'('`，且最终两者数量相等。

## 示例

### 示例 1

**输入：** s = "()())()"
**输出：** ["(())()","()()()"]

### 示例 2

**输入：** s = "(a)())()"
**输出：** ["(a())()","(a)()()"]

### 示例 3

**输入：** s = ")("
**输出：** [""]

## 解题思路

### 路线：先数出「欠几个左、欠几个右」

最少删几个不是试出来的，扫一遍就能定：把能配对的括号互相抵消，剩下没配上的就是多余的。左括号多出来几个、右括号多出来几个，两个计数就是最少删除量。

数完之后，问题变成「从原串里删掉恰好 `lremove` 个左括号、`rremove` 个右括号，列出所有合法结果」。删除的位置必须真的只是这几类，字母一个都不能动。

### 手法一：一遍扫描数欠账

维护 `lremove`（目前多出来的左括号）与 `rremove`（已经确定多余的右括号）：

```python
lremove = rremove = 0
for ch in s:
    if ch == '(':
        lremove += 1          # 先记下，等一个右括号来配
    elif ch == ')':
        if lremove == 0:
            rremove += 1      # 没有左括号可配，这个右括号必须删
        else:
            lremove -= 1      # 配对成功，抵消一个
```

扫描结束时 `lremove` 是剩下的未配对左括号数，`rremove` 是从头到尾没配上的右括号数。以 `"()())()"` 为例：前四个字符两两配对，第 4 位的 `)` 无人可配，`rremove = 1`；后面的 `()` 再配对，最后 `lremove = 0`、`rremove = 1`。示例 3 的 `")("` 则是 `rremove = 1`、`lremove = 1`，两个都要删。

### 手法二：回溯删除，只在「真删」上分支

搜索的状态是「当前串 + 还能删几个左/右」。当两个计数都归零，当前串就是候选，验证一次合法性即可：

```python
def dfs(cur, start, lremove, rremove):
    if lremove == 0 and rremove == 0:
        if is_valid(cur):
            ans.append(cur)
        return
    for i in range(start, len(cur)):
        # 连续相同的括号只试最左边那个，见下
        if i > start and cur[i] == cur[i - 1]:
            continue
        # 剩下的字符不够删了，后面的 i 更不够
        if lremove + rremove > len(cur) - i:
            break
        if lremove > 0 and cur[i] == '(':
            dfs(cur[:i] + cur[i + 1:], i, lremove - 1, rremove)
        if rremove > 0 and cur[i] == ')':
            dfs(cur[:i] + cur[i + 1:], i, lremove, rremove - 1)
```

`start` 传 `i` 而不是 0：删掉第 `i` 位后，下一位只能从原位置往后找，否则「先删 3 再删 1」与「先删 1 再删 3」会被当成两条不同的路径，同一结果被枚举多次。

连续相同括号只留一个分支，是因为删掉其中任意一个得到的串完全一样。`"()())()"` 里第 3、4 位都是 `)`，删哪一个都得到 `"()()()"`；跳过第 4 位只保留第 3 位，既去重又不丢解。

### 另一条路：BFS 逐层删

把「删一个括号」看成一条边，起点是原串。BFS 第 `k` 层就是「删了 `k` 个括号」的全部串；第一次在某层发现合法串，这一层就是最少删除，整层收集即可。

```python
cur = {s}
while True:
    ans = [t for t in cur if is_valid(t)]
    if ans:
        return ans
    nxt = set()
    for t in cur:
        for i, ch in enumerate(t):
            if ch in '()':
                nxt.add(t[:i] + t[i + 1:])
    cur = nxt
```

每层字符串都更短，图无环，不需要 `visited`。BFS 不用数 `lremove/rremove`，写起来短；代价是它会把同层所有「删法」都展开，集合里可能堆积大量重复串，删除数大时明显比回溯慢。

### 推演：`s = "()())()"`

数欠账得 `lremove = 0`、`rremove = 1`，只允许删一个右括号。回溯从 `start = 0` 扫：

| 位置 | 字符 | 能否删 | 删除后 | 是否合法 |
| --- | --- | --- | --- | --- |
| 1 | `)` | 可以 | `(())()` | 合法，收下 |
| 3 | `)` | 可以 | `()()()` | 合法，收下 |
| 4 | `)` | 跳过 | 与位置 3 相同 | — |
| 6 | `)` | 可以 | `()())(` | 前缀失衡，不合法 |

位置 6 的 `)` 删掉后，末尾剩一个没配对的 `(`，`is_valid` 返回 false，不进答案。最终得到 `["(())()","()()()"]`，与示例一致。

## 完整代码实现

```python
from typing import List


class Solution:
    def removeInvalidParentheses(self, s: str) -> List[str]:
        # ① 数出最少要删几个左括号、几个右括号
        lremove = rremove = 0
        for ch in s:
            if ch == '(':
                lremove += 1
            elif ch == ')':
                if lremove == 0:
                    rremove += 1
                else:
                    lremove -= 1

        def is_valid(t: str) -> bool:
            left = 0
            for ch in t:
                if ch == '(':
                    left += 1
                elif ch == ')':
                    left -= 1
                    if left < 0:      # 任意前缀右括号更多，已经非法
                        return False
            return left == 0

        ans = []

        # ② 回溯删除；cur 是当前串，start 是下一位可删的位置
        def dfs(cur: str, start: int, lremove: int, rremove: int) -> None:
            if lremove == 0 and rremove == 0:
                if is_valid(cur):
                    ans.append(cur)
                return

            for i in range(start, len(cur)):
                # 连续相同括号只试第一个，避免同一结果被重复收集
                if i > start and cur[i] == cur[i - 1]:
                    continue
                # 剩余字符不足以删完所需数量，再往后更不够
                if lremove + rremove > len(cur) - i:
                    break
                if lremove > 0 and cur[i] == '(':
                    dfs(cur[:i] + cur[i + 1:], i, lremove - 1, rremove)
                if rremove > 0 and cur[i] == ')':
                    dfs(cur[:i] + cur[i + 1:], i, lremove, rremove - 1)

        dfs(s, 0, lremove, rremove)
        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 回溯 | O(2ⁿ · n) | O(n) | 最坏枚举删除子集；剪枝后实际远小于上界，递归深度为 n |
| BFS（最优） | O(n · C(n,k)) | O(C(n,k)) | k 为最少删除数；每层只保留不同串，第一次命中即停 |

`n` 是字符串长度。本题 `n ≤ 25`，两条路都能过；BFS 的层数天然等于最少删除数，回溯则把删除数直接算出来当终止条件。

## 易错点总结

### 1. 不跳过连续相同的括号

`if i > start and cur[i] == cur[i - 1]: continue` 这一行去掉后，`"()())()"` 的第 3、4 位会各走一遍，两次都产出 `"()()()"`，答案里出现重复项。删除的字符相同，剩下的串必然相同，所以只需试最左边那一个。

### 2. `start` 传 0 而不是 `i`

删除是「在原串上挖洞」，下一位只能从当前位置往后找。传 0 会让同一组删除位置按不同顺序被反复枚举（先删 3 再删 1、先删 1 再删 3），结果重复，搜索量也按阶乘膨胀，`n` 稍大就超时。

### 3. 数欠账时先给 `rremove` 加一、再尝试配对

遇到 `)` 必须**先看 `lremove`**：有可配的左括号就抵消，没有才增加 `rremove`。顺序反了会把所有右括号都记成多余，`"()"` 这种本来就合法的串也会被判成要删两个，最后返回 `[""]`。

## 扩展思考

- **只要一个答案**：用栈扫一遍记下每个不匹配括号的下标，直接删掉即可，不需要搜索；本题要求全部方案，才必须枚举。
- **最少「添加」而不是删除**：那就是 921 题，数一遍未配对的左右括号，答案就是它们的数量，连搜索都不用。

## 相关题目

- [20. 有效的括号](0020_valid_parentheses.md)：合法性判定的原型
- [32. 最长有效括号](0032_longest_valid_parentheses.md)：同样用「前缀中右括号不能多于左括号」这条判据
- [921. 使括号有效的最少添加](https://leetcode.cn/problems/minimum-add-to-make-parentheses-valid/)：把删除换成添加
