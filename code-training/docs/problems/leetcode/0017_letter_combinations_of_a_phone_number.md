---
title: 17. 电话号码的字母组合
platform: LeetCode
difficulty: Medium
id: 17
url: https://leetcode.cn/problems/letter-combinations-of-a-phone-number/
tags:
  - 字符串
  - 回溯
  - 递归
topics: []
patterns:
  - ../../patterns/backtracking.md
  - ../../patterns/recursion.md
date_added: 2026-03-25
date_reviewed: []
---

# 17. 电话号码的字母组合

## 题目描述

给定一个仅包含数字 `2-9` 的字符串，返回它能表示的所有字母组合。答案可以按任意顺序返回。

数字与字母的对应关系：

```text
2: abc    3: def    4: ghi    5: jkl
6: mno    7: pqrs   8: tuv    9: wxyz
```

## 示例

### 示例 1

**输入：** digits = "23"
**输出：** ["ad","ae","af","bd","be","bf","cd","ce","cf"]

### 示例 2

**输入：** digits = ""
**输出：** []

### 示例 3

**输入：** digits = "2"
**输出：** ["a","b","c"]

## 解题思路

### 路线：每一位各盖一个字母

答案是各位字母集合的笛卡尔积：第一位有 3 或 4 种盖法，第二位又各有 3 或 4 种，乘起来就是全部组合。每一位互不影响，也没有「选过的不能再用」这类约束，所以不需要排序、去重或剪枝。

整题只有一个决定：第 `i` 位现在该盖哪个字母。把「盖到第几位」写成递归参数，函数返回时把这一位换下一个字母继续试，走完 `n` 位就收一个答案。

### 手法：逐位盖章

`path` 一开始就开成 `n` 个空位，`dfs(i)` 负责给第 `i` 位盖章：

1. **落章**：`path[i] = c`；
2. **递归**：`dfs(i + 1)`，交给下一位；
3. **换下一个字母**：循环自然推进到 `MAPPING[数字]` 的下一个字符。

```python
MAPPING = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"]

def dfs(i: int) -> None:
    if i == n:                       # 每一位都盖完了
        ans.append(''.join(path))
        return
    for c in MAPPING[int(digits[i])]:
        path[i] = c                  # ① 落章
        dfs(i + 1)                   # ② 交给下一位
```

这里**不需要撤销**：`path[i]` 是一个固定槽位，下一轮循环直接用新字母覆盖它，不会留下上一位的残值。只有把 `path` 写成会增长的列表、靠 `append` / `pop` 维护时，才需要显式弹出。

`digits` 为空时，`dfs(0)` 会立刻命中 `i == n`，收下一个空串 `""`；而答案应当是空列表，所以入口要先单独挡掉。

### 另一条写法：交给 `itertools.product`

同一个笛卡尔积也可以不写递归，让标准库在 C 层展开：

```python
from itertools import product

choices = [MAPPING[int(d)] for d in digits]
return [''.join(combo) for combo in product(*choices)]
```

两条路生成的组合完全相同、顺序也相同（都是按映射表的字符顺序做笛卡尔积）。递归版多一层函数调用，但每一步都能停下来做判断；本题没有可剪枝的地方，`product` 反而更短。要按条件筛掉部分组合时，递归版才有优势。

### 推演：`digits = "23"`

`n = 2`，`MAPPING[2] = "abc"`、`MAPPING[3] = "def"`。按「①落章 ②递归」走一遍：

```text
dfs(0)：第 0 位取 'a'
  ① path = ['a', '']
  ② dfs(1)：第 1 位依次取 d、e、f
       ① path = ['a','d'] → 收 "ad"
       ① path = ['a','e'] → 收 "ae"
       ① path = ['a','f'] → 收 "af"
dfs(0)：第 0 位取 'b'
  ① path = ['b', '']
  ② dfs(1)：收 "bd"、"be"、"bf"
dfs(0)：第 0 位取 'c'
  ② dfs(1)：收 "cd"、"ce"、"cf"
```

`ans` 依次得到 `["ad","ae","af","bd","be","bf","cd","ce","cf"]`，与示例一致。

## 完整代码实现

```python
from typing import List

MAPPING = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"]


class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        n = len(digits)
        if n == 0:
            return []

        ans = []
        path = [''] * n                  # 固定 n 个槽位，逐位覆盖

        def dfs(i: int) -> None:
            if i == n:
                ans.append(''.join(path))
                return
            for c in MAPPING[int(digits[i])]:
                path[i] = c              # ① 落章
                dfs(i + 1)               # ② 交给下一位

        dfs(0)
        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 回溯（最优） | O(n · 4^n) | O(n) | 最多 4^n 个答案，每个答案拼接一次要 O(n)；递归深度为 n |
| `itertools.product` | O(n · 4^n) | O(n · 4^n) | 组合由标准库生成，但结果列表本身要占满输出规模 |

指数来自答案规模，不是实现选择：任何写法都要把 `4^n` 个长度为 `n` 的串交出来。

## 易错点总结

### 1. `path` 用空列表起手，却按下标赋值

写成 `path = []` 再执行 `path[i] = c`，第一个字符就抛 `IndexError: list assignment index out of range`。`path` 的长度必须一开始就是 `n`（`[''] * n`），因为这里的下标表示「第几位」，不是「追加到末尾」。

### 2. 空输入返回了 `[""]`

`digits = ""` 时如果不提前返回，`dfs(0)` 会命中 `i == n` 并把 `''.join([])` 收进答案，结果是 `[""]` 而不是 `[]`。长度差 1，判题直接判错。

### 3. 映射表用字符当下标

`MAPPING[digits[i]]` 里的 `digits[i]` 是字符 `'2'`，列表下标必须是整数，会抛 `TypeError: list indices must be integers or slices, not str`。要写成 `MAPPING[int(digits[i])]`。

## 扩展思考

- **顺序**：回溯按 `MAPPING` 的字符顺序展开，结果天然是字典序；换成 `product` 也一样。题目允许任意顺序，但如果判题改成要求字典序，这两份代码都不用改。
- **有非法数字时**：若输入可能含 `0` 或 `1`，它们的字母表是空串，`for` 循环一次都不进，该分支自然消失；若希望整体判为无解，则要在入口另加检查。

## 相关题目

- [39. 组合总和](0039_combination_sum.md)：同样逐位做选择，但候选可以重复使用，需要额外的起点参数
- [46. 全排列](0046_permutations.md)：每一位的选择集相同，且要排除已用过的元素
- [22. 括号生成](0022_generate_parentheses.md)：逐位盖章，但每一步的合法选择由前面的状态决定
