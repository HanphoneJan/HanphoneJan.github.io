---
title: 39. 组合总和
platform: LeetCode
difficulty: Medium
id: 39
url: https://leetcode.cn/problems/combination-sum/
tags:
  - 数组
  - 回溯
topics: []
patterns:
  - ../../patterns/backtracking.md
date_added: 2026-03-20
date_reviewed: []
---

# 0039. 组合总和

## 题目描述

给你一个**无重复元素**的整数数组 `candidates` 和一个目标整数 `target`，找出 `candidates` 中可以使数字和为目标数 `target` 的**所有不同组合**，并以列表形式返回。你可以按**任意顺序**返回这些组合。

`candidates` 中的**同一个**数字可以**无限制重复被选取**。如果至少一个数字的被选数量不同，则两种组合是不同的。

对于给定的输入，保证和为 `target` 的不同组合数少于 `150` 个。

**示例 1：**
```
输入：candidates = [2,3,6,7], target = 7
输出：[[2,2,3],[7]]
```

**示例 2：**
```
输入：candidates = [2,3,5], target = 8
输出：[[2,2,2,2],[2,3,3],[3,5]]
```

**示例 3：**
```
输入：candidates = [2], target = 1
输出：[]
```

---

## 解题思路

### 问题本质

这道题要求找出所有和为 `target` 的**组合**，且组合中元素顺序不影响结果。同一个元素可以无限次使用。搜索「所有合法组合」这类问题常用回溯（DFS）求解。

### 方法一：回溯 + 起始下标 + 剪枝（推荐）

**思路**：
1. 将 `candidates` 排序，便于后续剪枝
2. 用 DFS 构建路径 `path`，传入 `start` 控制搜索范围：每次从 `start` 开始选，且允许选当前元素本身（即传 `i` 而不是 `i+1`）以支持重复使用
3. 当 `remain == 0` 时，将 `path` 的副本加入结果
4. 若 `candidates[i] > remain`，由于数组已排序，后续元素更大，直接 `break` 剪枝

```python
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()
        ans = []
        path = []

        def dfs(start: int, remain: int):
            if remain == 0:
                ans.append(path[:])
                return
            for i in range(start, len(candidates)):
                if candidates[i] > remain:
                    break
                path.append(candidates[i])
                dfs(i, remain - candidates[i])
                path.pop()

        dfs(0, target)
        return ans
```

**说明**：用 `start` 限制搜索起点，既能允许重复使用，又能避免生成顺序不同的同一组合。配合排序剪枝能显著减少无效分支。

---

## 完整代码实现

```python
from typing import List

class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()  # 排序，方便剪枝
        ans = []
        path = []

        def dfs(start: int, remain: int):
            if remain == 0:
                ans.append(path[:])  # 找到一个合法组合，记录副本
                return
            for i in range(start, len(candidates)):
                if candidates[i] > remain:
                    break  # 剪枝：当前数已超过剩余目标，后续更大，无需继续
                path.append(candidates[i])
                dfs(i, remain - candidates[i])  # 允许重复使用，从 i 开始（而非 i+1）
                path.pop()                       # 回溯：撤销上一步选择

        dfs(0, target)
        return ans
```

**关键点**：
- `dfs(i, remain - candidates[i])` 中用 `i` 而非 `i+1`，允许当前数字被重复选取。
- `path[:]` 是列表的浅拷贝，必须拷贝后再存入 `ans`，否则 `path` 后续被修改后 `ans` 中的记录也会变。

---

## 示例推演

以 `candidates = [2, 3, 6, 7]`，`target = 7` 为例（已排序）：

下面展示完整的递归树搜索过程（只展示主要分支）：

```
dfs(start=0, remain=7), path=[]
├── 选 2: path=[2], dfs(start=0, remain=5)
│   ├── 选 2: path=[2,2], dfs(start=0, remain=3)
│   │   ├── 选 2: path=[2,2,2], dfs(start=0, remain=1)
│   │   │   ├── 选 2: 2>1, break（剪枝）
│   │   │   └── 回溯 → path=[2,2]
│   │   ├── 选 3: path=[2,2,3], dfs(start=1, remain=0)
│   │   │   └── remain==0，记录 [2,2,3]
│   │   ├── 选 6: 6>3, break（剪枝）
│   │   └── 回溯 → path=[2]
│   ├── 选 3: path=[2,3], dfs(start=1, remain=2)
│   │   ├── 选 3: 3>2, break（剪枝）
│   │   └── 回溯 → path=[2]
│   ├── 选 6: 6>5, break（剪枝）
│   └── 回溯 → path=[]
├── 选 3: path=[3], dfs(start=1, remain=4)
│   ├── 选 3: path=[3,3], dfs(start=1, remain=1)
│   │   ├── 选 3: 3>1, break（剪枝）
│   │   └── 回溯 → path=[3]
│   ├── 选 6: 6>4, break（剪枝）
│   └── 回溯 → path=[]
├── 选 6: path=[6], dfs(start=2, remain=1)
│   ├── 选 6: 6>1, break（剪枝）
│   └── 回溯 → path=[]
└── 选 7: path=[7], dfs(start=3, remain=0)
    └── remain==0，记录 [7]
```

**最终结果**：`[[2, 2, 3], [7]]`，与预期一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力（无 start、无剪枝） | 指数级，含大量重复 | O(target/min) | 每层都从头枚举，重复状态极多 |
| 回溯+start（无剪枝） | O(n^(target/min)) | O(target/min) | min 为最小候选数，递归深度上限 |
| 回溯+start+剪枝（最优） | 剪枝后大幅减小 | O(target/min) | 排序后遇到大数提前 break |

> 注：组合数问题没有一个简洁的精确时间复杂度，通常用"指数级"描述，剪枝能显著减少实际运行时间。空间复杂度主要由递归栈深度决定，最深为 `target / min(candidates)`。

---

## 易错点总结

- **`ans.append(path[:])` 而不是 `path`**：存引用时后续 `path.pop()` 会把已存入的组合清空。
- **重复使用要写 `dfs(i, ...)`**：写成 `dfs(i + 1, ...)` 每个数只能用一次，变成另一道题（组合总和 II）。
- **剪枝 `break` 依赖排序**：不排序就 `break`，后面可能还有更小的数被一起跳过。

## 扩展思考

- **LeetCode 40. 组合总和 II**：candidates 有重复元素，每个数字只能用一次。需要在 `start` 基础上额外跳过同层重复元素（`if i > start and candidates[i] == candidates[i-1]: continue`）。

- **LeetCode 216. 组合总和 III**：从 1-9 中选 k 个不重复数字，使其和为 n，每个数字最多使用一次。

- **算法本质**：回溯算法是在解空间树上进行深度优先搜索，剪枝是其核心优化手段。`start` 参数的引入从根本上消除了组合重复问题（保证生成的组合字典序单调不降），比生成后去重高效得多。这种"通过限制搜索起点来去重"的技巧在所有组合/子集类问题中普遍适用。
