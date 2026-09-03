---
title: 打家劫舍 III
platform: LeetCode
difficulty: Medium
id: 337
url: https://leetcode.cn/problems/house-robber-iii/
tags:
  - 树
  - 动态规划
  - 树形DP
date_added: 2026-04-24
---

# 337. 打家劫舍 III

## 题目描述

小偷又发现了一个新的可行窃的地区。这个地区只有一个入口，我们称之为 `root` 。

除了 `root` 之外，每栋房子有且只有一个"父“房子与之相连。一番侦察之后，聪明的小偷意识到”这个地方的所有房屋的排列类似于一棵二叉树"。如果 **两个直接相连的房子在同一天晚上被打劫** ，房屋将自动报警。

给定二叉树的 `root` 。返回 **在不触动警报的情况下** ，小偷能够盗取的最高金额 。

## 示例

**示例 1：**
```
输入：root = [3,2,3,null,3,null,1]
输出：7
解释：偷 3 + 3 + 1 = 7
```

**示例 2：**
```
输入：root = [3,4,5,1,3,null,1]
输出：9
解释：偷 4 + 5 = 9
```

---

## 解题思路

### 第一步：理解问题本质

这是打家劫舍问题的树形版本。关键规则：**不能偷相邻的节点**（父子节点不能同时被偷）。

### 第二步：状态定义

对于每个节点，有两种选择：**偷** 或 **不偷**。

定义后序遍历返回的二元组：
- `rob`：偷当前节点时，以该节点为根的子树能获得的最大金额
- `not_rob`：不偷当前节点时，以该节点为根的子树能获得的最大金额

### 第三步：状态转移

```
rob = left_not_rob + right_not_rob + node.val      // 偷当前，子节点不能偷
not_rob = max(left_rob, left_not_rob) + max(right_rob, right_not_rob)  // 不偷当前，子节点可选
```

---

## 完整代码实现

```python
from typing import Optional, Tuple


# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Solution:
    """
    打家劫舍 III - 树形动态规划

    后序遍历返回二元组 (rob, not_rob)
    rob: 偷当前节点的最大金额
    not_rob: 不偷当前节点的最大金额

    时间复杂度：O(n)
    空间复杂度：O(h)，h为树的高度
    """

    def rob(self, root: Optional[TreeNode]) -> int:
        def dfs(node: Optional[TreeNode]) -> Tuple[int, int]:
            if node is None:
                return 0, 0

            l_rob, l_not_rob = dfs(node.left)
            r_rob, r_not_rob = dfs(node.right)

            # 偷当前节点：子节点不能偷
            rob = l_not_rob + r_not_rob + node.val
            # 不偷当前节点：子节点可偷可不偷，取最大
            not_rob = max(l_rob, l_not_rob) + max(r_rob, r_not_rob)

            return rob, not_rob

        return max(dfs(root))
```

---

## 示例推演

以 `root = [3,2,3,null,3,null,1]` 为例：

```
      3
     / \
    2   3
     \   \
      3   1
```

**后序遍历**：

| 节点 | 左子树 (rob, not_rob) | 右子树 (rob, not_rob) | rob | not_rob |
|------|----------------------|----------------------|-----|---------|
| 3(叶子) | (0,0) | (0,0) | 3 | 0 |
| 1(叶子) | (0,0) | (0,0) | 1 | 0 |
| 2 | (0,0) | (3,0) | 0+0+2=2 | max(0,0)+max(3,0)=3 |
| 3(右) | (0,0) | (1,0) | 0+0+3=3 | max(0,0)+max(1,0)=1 |
| 3(根) | (2,3) | (3,1) | 3+1+3=7 | max(2,3)+max(3,1)=6 |

最终 `max(7, 6) = 7`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力递归 | O(2^n) | O(h) | 每个节点两种选择 |
| **树形DP（最优）** | **O(n)** | **O(h)** | 每个节点只访问一次 |

---

## 易错点总结

### 1. not_rob 的计算

**错误**：`not_rob = l_not_rob + r_not_rob`

**正确**：`not_rob = max(l_rob, l_not_rob) + max(r_rob, r_not_rob)`

**原因**：不偷当前节点时，子节点**可偷可不偷**，要取最大值。

### 2. 后序遍历

必须先处理子节点，再处理当前节点。因为当前节点的状态依赖子节点的状态。

---

## 扩展思考

### 1. N叉树版本

同样的思路，遍历所有子节点即可。

### 2. 与198题的关系

198题是数组版本（线性结构），本题是树版本。核心思想相同：相邻不能同时选。

---

## 相关题目

- [198. 打家劫舍](https://leetcode.cn/problems/house-robber/)
- [213. 打家劫舍 II](https://leetcode.cn/problems/house-robber-ii/)
