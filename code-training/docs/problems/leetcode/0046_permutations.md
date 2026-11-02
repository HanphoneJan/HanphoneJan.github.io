---
title: 46. 全排列
platform: LeetCode
difficulty: Medium
id: 46
url: https://leetcode.cn/problems/permutations/
tags:
  - 数组
  - 回溯
  - 排列
topics: []
patterns:
  - ../../patterns/backtracking.md
date_added: 2026-03-30
date_reviewed: []
---

# 46. 全排列

## 题目描述

给定一个不含重复数字的数组 `nums`，返回其**所有可能的全排列**。你可以**按任意顺序**返回答案。

**提示：**

- `1 <= nums.length <= 6`
- `-10 <= nums[i] <= 10`
- `nums` 中的所有整数**互不相同**

## 示例

### 示例 1

**输入：** nums = [1,2,3]

**输出：** [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]

### 示例 2

**输入：** nums = [0,1]

**输出：** [[0,1],[1,0]]

### 示例 3

**输入：** nums = [1]

**输出：** [[1]]

## 解题思路

全排列就是「每一个位置都从还没用过的数里挑一个」。按位置递归：第 0 位挑一个、第 1 位从剩下的里挑一个……挑满 `n` 位就是一个答案。要做的只有两件事——记住哪些数已经用过，以及在叶子处把当前路径**复制**一份存进答案。

### 每层从「没用过」的数里挑一个

用 `used[i]` 标记 `nums[i]` 是否已经在当前路径里。进入下一层前标记、返回后取消标记，这就是回溯的全部动作。

```python
def dfs():
    if len(path) == n:
        ans.append(path[:])         # 必须复制
        return
    for i in range(n):
        if used[i]:
            continue
        used[i] = True
        path.append(nums[i])
        dfs()
        path.pop()
        used[i] = False
```

`used` 记的是**下标**不是值：`nums` 里可能有负数或大于 `n` 的数，拿值当下标会越界；而且题目允许值重复时（47 题），按值标记会把两个不同的位置当成同一个。

### 为什么 `ans.append(path[:])`

`path` 全程只有一个列表对象。直接 `ans.append(path)` 存的是引用，等递归返回、`path.pop()` 把元素弹空，答案里那 `n!` 项会一起变成空列表——最后得到一个「长度正确、内容全空」的结果，比报错更难查。

### 另一种写法：原地交换

不额外开 `used`，而是把「选中的数」换到当前位：

```python
def dfs(k):
    if k == n:
        ans.append(nums[:])
        return
    for i in range(k, n):
        nums[k], nums[i] = nums[i], nums[k]
        dfs(k + 1)
        nums[k], nums[i] = nums[i], nums[k]
```

`dfs(k)` 表示前 `k` 位已经确定，第 `k` 位从 `[k, n)` 里挑。代码更短，但「哪些数用过」这件事藏在数组的前缀里，读者要自己在脑子里维护；而且遇到重复元素需要额外的同层去重（47 题）。本篇主推 `used` 版本。

### 推演：示例 1 的前两层

`nums = [1,2,3]`，`path` 为空。

| 层 | 选择 | `path` | 说明 |
| --- | --- | --- | --- |
| 0 | 1 | [1] | `used = [T,F,F]` |
| 1 | 2 | [1,2] | 剩 3 |
| 2 | 3 | [1,2,3] | 收下第一个排列 |
| 1 回退 | 3 | [1,3] | 换第二个分支 |
| 2 | 2 | [1,3,2] | 收下第二个 |
| 0 回退 | 2 | [2] | 第一位换成 2，后面同理 |

第一位有 3 种选法，每种第一位下第二位剩 2 种、第三位剩 1 种，共 `3 × 2 × 1 = 6` 个排列。

## 完整代码实现

```python
from typing import List


class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        n = len(nums)
        ans = []
        path = []
        used = [False] * n

        def dfs() -> None:
            if len(path) == n:          # 每个位置都填满了
                ans.append(path[:])     # 复制一份，否则后续 pop 会清空它
                return
            for i in range(n):
                if used[i]:
                    continue
                used[i] = True
                path.append(nums[i])
                dfs()
                path.pop()              # 恢复现场
                used[i] = False

        dfs()
        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 回溯 + `used` 数组（最优） | O(n · n!) | O(n) | 共 n! 个排列，每个复制一次长度 n 的路径；递归深度 n |
| 原地交换 | O(n · n!) | O(n) | 少一个 `used` 数组，但分支语义藏在数组前缀里 |

## 易错点总结

### 1. `ans.append(path)` 而不是 `path[:]`

存引用的话，递归结束后 `path` 被弹空，示例 1 会返回六个空列表 `[[],[],[],[],[],[]]`。长度看着对（6 个），内容全没了。

### 2. `used` 用值当下标

`used[nums[i]]` 在 `nums = [7,8]` 时会直接 `IndexError: list index out of range`（下标 7 越界）；即使不越界也会出错：`nums = [-2,0,1]` 时 `-2` 被当成下标 1，与值 `1` 抢同一个位置，结果一个排列都生成不出来（返回 `[]`，正确是 6 个）。`used` 的下标必须是数组下标 `i`。

## 扩展思考

- 数组含重复元素时（[47. 全排列 II](https://leetcode.cn/problems/permutations-ii/)），先排序，再在每一层跳过「和同层上一个候选相同」的 `nums[i]`。
- 组合（[77](https://leetcode.cn/problems/combinations/)）是「从 `i+1` 往后挑」，排列是「从所有没用过的里挑」，两者的差别就在循环起点和 `used` 上。
