---
title: 39. 组合总和
platform: LeetCode
difficulty: Medium
id: 39
url: https://leetcode.cn/problems/combination-sum/
tags:
  - 数组
  - 回溯
  - 组合
topics: []
patterns:
  - ../../patterns/backtracking.md
date_added: 2026-03-29
date_reviewed: []
---

# 39. 组合总和

## 题目描述

给你一个**无重复元素**的整数数组 `candidates` 和一个目标整数 `target`，找出 `candidates` 中可以使数字和为目标数 `target` 的所有**不同组合**，并以列表形式返回。你可以按**任意顺序**返回这些组合。

`candidates` 中的**同一个**数字可以**无限制重复被选取**。如果至少一个数字的被选数量不同，则两种组合是不同的。

对于给定的输入，保证和为 `target` 的不同组合数少于 150 个。

**提示：**

- `1 <= candidates.length <= 30`
- `2 <= candidates[i] <= 40`
- `candidates` 的所有元素**互不相同**
- `1 <= target <= 40`

## 示例

### 示例 1

**输入：** candidates = [2,3,6,7], target = 7

**输出：** [[2,2,3],[7]]

**解释：** 2 和 3 可以形成 `[2,2,3]`，7 单独成立；注意 2 可以重复使用。

### 示例 2

**输入：** candidates = [2,3,5], target = 8

**输出：** [[2,2,2,2],[2,3,3],[3,5]]

### 示例 3

**输入：** candidates = [2], target = 1

**输出：** []

**解释：** 2 比 1 大，一个数都选不了。

## 解题思路

组合不关心顺序（`[2,3]` 和 `[3,2]` 是同一个），所以枚举时必须保证下标**只往后走**，否则同一个组合会被反复生成。又因为每个数可以无限次使用，递归时把起点停在原地（传 `i`）而不是 `i+1`。排序只是为了在「剩下的数已经比剩余目标大」时提前剪枝。

### 用 `start` 保证下标不减

`dfs(start, remain)` 表示「从 `start` 开始挑数，还差 `remain`」。下一层从 `i` 开始挑，而不是从 `0` 开始，这样 `[2,3]` 只会按 `2 → 3` 的顺序出现一次。

```python
def dfs(start, remain):
    if remain == 0:
        ans.append(path[:])
        return
    for i in range(start, n):
        if candidates[i] > remain:      # 排序后这里可以直接 break
            break
        path.append(candidates[i])
        dfs(i, remain - candidates[i])  # 传 i：同一个数还能再用
        path.pop()
```

### 传 `i` 还是 `i + 1` 决定「能不能重复」

- 传 `i`：下一层还能选当前这个数 → 可以重复使用（本题）；
- 传 `i + 1`：下一层从下一个数开始 → 每个数至多用一次（[40. 组合总和 II](https://leetcode.cn/problems/combination-sum-ii/) 与 [216](https://leetcode.cn/problems/combination-sum-iii/)）。

这一处是两道题唯一的分界线，选错就是另一道题的答案。

### 剪枝依赖排序

`candidates[i] > remain` 时 `break` 而不是 `continue`，前提是数组升序：后面的数只会更大，全都装不下。若没排序就 `break`，可能把后面更小的数一起跳过，导致漏解。所以代码第一行是 `candidates.sort()`。

`remain` 变成负数的情况被 `break` 挡住了，不会进入递归；`remain == 0` 时立刻收答案并返回。

### 推演：示例 1

`candidates = [2,3,6,7]`、`target = 7`。

| 路径 | 剩余 `remain` | 结果 |
| --- | --- | --- |
| 2 → 2 → 2 | 1 | 下一个 2 就超过 1，剪枝 |
| 2 → 2 → 3 | 0 | 收下 `[2,2,3]` |
| 2 → 3 → … | 2 | 只剩 2，但 2 已经用过（`start` 不小于 3），无解 |
| 2 → 6 | −1 | 剪枝 |
| 3 → 3 | 1 | 3 > 1，剪枝 |
| 7 | 0 | 收下 `[7]` |

两个答案：`[2,2,3]` 与 `[7]`。注意 `[3,2,2]` 不会再出现——`start` 让下标只能往后走。

## 完整代码实现

```python
from typing import List


class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()               # 剪枝依赖有序
        n = len(candidates)
        ans = []
        path = []

        def dfs(start: int, remain: int) -> None:
            if remain == 0:
                ans.append(path[:])     # 复制，否则后续 pop 会清空
                return
            for i in range(start, n):
                if candidates[i] > remain:
                    break               # 升序：后面的只会更大
                path.append(candidates[i])
                dfs(i, remain - candidates[i])   # 传 i 表示可以重复选
                path.pop()

        dfs(0, target)
        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 回溯 + `start`（最优） | 指数级，剪枝后远小于上界 | O(target / min(candidates)) | 递归深度不超过 `target / 最小值`；答案数题目保证少于 150 |
| 无 `start`、无剪枝 | 指数级，且含大量重复组合 | O(target / min(candidates)) | 每层都从头枚举，`[2,3]` 与 `[3,2]` 会各生成一次 |

组合类问题没有简洁的精确复杂度，通常按「指数级 + 剪枝」描述。

## 易错点总结

### 1. `ans.append(path)` 而不是 `path[:]`

存引用的话，递归返回后的 `path.pop()` 会把已经收下的组合一起弹空。示例 1 会返回 `[[], []]`——数量对、内容全空。

### 2. 递归传 `i + 1` 而不是 `i`

传 `i + 1` 就变成「每个数最多用一次」，示例 1 只剩 `[[7]]`，`[2,2,3]` 永远生成不出来。能否重复使用，全看这一个参数。

## 扩展思考

- 每个数最多用一次、且数组可能有重复元素时（40 题），要传 `i + 1` 并在同一层跳过 `candidates[i] == candidates[i-1]`。
- 若问的是「组合的个数」而不是列出组合，可以改成完全背包的计数 DP：`f[j] += f[j - x]`，复杂度 O(n · target)。
