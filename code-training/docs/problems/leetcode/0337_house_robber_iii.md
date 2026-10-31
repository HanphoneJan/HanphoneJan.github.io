---
title: 337. 打家劫舍 III
platform: LeetCode
difficulty: Medium
id: 337
url: https://leetcode.cn/problems/house-robber-iii/
tags:
  - 树
  - 动态规划
  - 树形DP
  - 深度优先搜索
  - 二叉树
patterns:
  - ../../patterns/dfs.md
  - ../../patterns/dynamic_programming.md
date_added: 2026-04-24
---

# 337. 打家劫舍 III

## 题目描述

小偷又发现了一个新的可行窃的地区。这个地区只有一个入口，我们称之为 `root` 。

除了 `root` 之外，每栋房子有且只有一个“父”房子与之相连。一番侦察之后，聪明的小偷意识到“这个地方的所有房屋的排列类似于一棵二叉树”。如果 **两个直接相连的房子在同一天晚上被打劫** ，房屋将自动报警。

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

### 约束只落在父子边上：每个子树只需要两个数

除了根，每栋房子有且只有一个父房子；报警的条件也只有一条——**直接相连的两栋在同一天被偷**。所以整棵树里唯一的冲突发生在父子之间，兄弟之间、隔代之间互不影响。

这条性质决定了「一棵子树该怎么描述」。父节点做决定时只关心一件事：子树的根被偷了没有。子树内部拿到多少钱、用了什么方案，它都用不上；但如果只知道「这棵子树最多能偷 8」而不知道这 8 是靠偷根得到的，父节点就没法判断自己还能不能偷。**一个数不够，得带两个**：

- `rob(u)`：偷 `u` 的前提下，以 `u` 为根的子树能拿到的最大金额；
- `not_rob(u)`：不偷 `u` 的前提下，同一棵子树的最大金额。

父节点拿到的就是这两个数，也只需要这两个数。这就是这题的 DP 状态：它没有下标，状态是「节点 + 偷不偷」这一对。

**为什么不能贪心**：根是 10、两个孩子各 6 的树，偷根得 10，偷两个孩子得 12。节点大不代表方案好，因为偷一个节点会锁住它所有的孩子。所以两种选择都得算出来再比。

### 写法一：把约束直接翻译成递归，再加记忆化

最直白的定义来自题面：偷 `u` 时孩子必须空着，但孙子不受限制；不偷 `u` 时两个孩子各自尽力。

```python
from functools import cache
from typing import Optional

class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        @cache
        def dfs(u: Optional[TreeNode]) -> int:
            if u is None:
                return 0
            # 偷 u：孩子必须空着，孙子可以随便偷
            take = u.val
            if u.left:
                take += dfs(u.left.left) + dfs(u.left.right)
            if u.right:
                take += dfs(u.right.left) + dfs(u.right.right)
            # 不偷 u：两个孩子各自尽力
            return max(take, dfs(u.left) + dfs(u.right))

        return dfs(root)
```

`take` 那几行与 `max(take, dfs(u.left) + dfs(u.right))` 就是「偷 / 不偷」两种选择，和题面几乎逐字对应。代价在调用次数：`dfs(u)` 会从父节点（作为 `dfs(parent.left)` 的一部分）和祖父节点（作为孙子）各被调用一次，同一棵子树因此被反复展开，节点一多就是指数级。

`@cache` 治的正是这个：键是节点对象本身（按对象身份哈希），同一个节点只算一次，时间降到 `O(n)`。这里有个容易忽略的点——**缓存必须按节点身份，不能按节点值**。示例 1 里有三个值为 3 的节点，它们的子树完全不同；按值缓存会把三份答案混成一份。

代价是缓存表要存 `n` 个条目，空间 `O(n)`，而且这些节点在调用期间一直被字典引用着。

### 写法二：让返回值带上两个状态

既然父节点要的本来就是「偷 / 不偷」两个数，那就让 `dfs` 一次返回这两个数，父节点直接用，不必再去问孙子：

- 偷 `u`：两个孩子都不能偷，只能用它们的 `not_rob` —— `rob = l_not_rob + r_not_rob + u.val`；
- 不偷 `u`：每个孩子可以偷也可以不偷，取较大者 —— `not_rob = max(l_rob, l_not_rob) + max(r_rob, r_not_rob)`；
- 空节点返回 `(0, 0)`：有了这对零点，上面两条公式对叶子节点也成立，不需要再写「有没有左孩子」的分支。写法一里那几行 `if u.left` / `if u.right` 正是被这一对零点替代掉的。

```python
from typing import Optional

class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        def dfs(node):
            if node is None:
                return 0, 0                  # 空树：偷与不偷都是 0
            l_rob, l_skip = dfs(node.left)
            r_rob, r_skip = dfs(node.right)
            # 偷自己 → 两个孩子都必须跳过；不偷自己 → 孩子各取较优
            return l_skip + r_skip + node.val, max(l_rob, l_skip) + max(r_rob, r_skip)

        return max(dfs(root))
```

递归的顺序只能是后序：父节点这两条公式里的 `l_*`、`r_*` 都是孩子算完才有的值，所以两次递归调用必须写在计算式之前。完整代码里的 `dfs` 与这段是同一个东西，只是把参数与返回值的注解写全了、变量名换成了 `not_rob`。

两种写法都正确，差别在成本：

| | 记忆化版 | 返回二元组版 |
|---|---|---|
| 每个节点被访问 | 一次（靠缓存兜住） | 天然一次 |
| 额外空间 | `O(n)` 缓存 + `O(h)` 栈 | 只有 `O(h)` 栈 |
| 推导成本 | 照抄题面，加一行 `@cache` | 要先想清楚父节点需要哪两个数 |

只想尽快跑对，记忆化版改起来最省事；要求空间、或者想写成标准树形 DP，用返回二元组这一版。两者在 `10^4` 个节点的链状树上都会撞 Python 的递归层数上限，见「扩展思考」。

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

```text
       3
      / \
     2   3
      \   \
       3   1
```

后序遍历，先算叶子，再往上报：

| 节点 | 左孩子 `(rob, not_rob)` | 右孩子 `(rob, not_rob)` | `rob` | `not_rob` |
|---|---|---|---|---|
| 3（2 的右孩子） | (0, 0) | (0, 0) | `0+0+3 = 3` | `max(0,0)+max(0,0) = 0` |
| 1 | (0, 0) | (0, 0) | `1` | `0` |
| 2 | (0, 0) | (3, 0) | `0+0+2 = 2` | `max(0,0)+max(3,0) = 3` |
| 3（右孩子） | (0, 0) | (1, 0) | `0+0+3 = 3` | `max(0,0)+max(1,0) = 1` |
| 3（根） | (2, 3) | (3, 1) | `3+1+3 = 7` | `max(2,3)+max(3,1) = 6` |

根节点取 `max(7, 6) = 7`，与示例一致：偷根 3，两个孩子的根（2 和 3）都不能动，再偷 2 下面的 3 和右边那条链上的 1。

再看示例 2 的 `root = [3,4,5,1,3,null,1]`，它专门用来区分「偷根」与「不偷根」：

```text
       3
      / \
     4   5
    / \   \
   1   3   1
```

| 节点 | `rob` | `not_rob` |
|---|---|---|
| 1（4 的左孩子） | 1 | 0 |
| 3（4 的右孩子） | 3 | 0 |
| 4 | `0+0+4 = 4` | `max(1,0)+max(3,0) = 4` |
| 1（5 的右孩子） | 1 | 0 |
| 5 | `0+0+5 = 5` | `0+max(1,0) = 1` |
| 3（根） | `4+1+3 = 8` | `max(4,4)+max(5,1) = 9` |

`not_rob(根) = 9` 大于 `rob(根) = 8`，答案 9（偷 4 和 5）。注意这 9 是 `max(4,4) + max(5,1) = 4 + 5`，即「不偷 4、偷 5」；如果把两个 `max` 换成只累加孩子「不偷」的那一半，得到的是 `4 + 1 = 5` —— 这正是 `not_rob` 里两个 `max` 的来历。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 无缓存递归 | 指数级 | O(h) | 同一节点被父节点和祖父节点各展开一次 |
| 递归 + 按节点记忆化 | O(n) | O(n) | 缓存 n 个节点，递归栈 O(h) 另算 |
| 后序返回二元组（最优） | O(n) | O(h) | 每个节点算一次，额外空间只有调用栈 |

> `n` 是节点数，`h` 是树高；平衡树 `h = O(log n)`，链状树 `h = O(n)`。

---

## 易错点总结

1. **偷当前节点时错用了孩子的较大值**：写成 `rob = max(l_rob, l_not_rob) + max(r_rob, r_not_rob) + node.val`。孩子可能是被偷的那一半，这一行等于允许父子同时被偷。示例 1 会返回 12、示例 2 返回 17，都比正确答案大，而且不报错。
2. **`not_rob` 漏掉两次 `max`**：写成 `not_rob = l_not_rob + r_not_rob`。不偷当前节点时孩子可以偷，只累加「不偷」那一半会把答案压小，示例 1 返回 3（正确 7）。
3. **空节点返回 `0` 而不是 `(0, 0)`**：在 `l_rob, l_not_rob = dfs(node.left)` 这一行直接抛 `TypeError: cannot unpack non-iterable int object`，只要树里有叶子（一定有）就必现。

---

## 扩展思考

- **与 198 / 213 的关系**：线性版能写成 `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`，靠的是「隔一个」的下标关系，空间还能压到两个变量。树上的节点没有这种下标，等价物正是把两个状态显式带着走。
- **递归深度**：节点数上限 `10^4`，退化成一条链时 Python 默认的 1000 层不够，会抛 `RecursionError`。改法是把后序改成显式栈（先压 `(node, False)`，弹出时再压 `(node, True)` 和两个孩子），或者用 `sys.setrecursionlimit`。

---

## 相关题目

- [198. 打家劫舍](https://leetcode.cn/problems/house-robber/)
- [213. 打家劫舍 II](https://leetcode.cn/problems/house-robber-ii/)
