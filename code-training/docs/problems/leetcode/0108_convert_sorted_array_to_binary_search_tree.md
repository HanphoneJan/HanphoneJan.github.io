---
title: 108. 将有序数组转换为二叉搜索树
platform: LeetCode
difficulty: Easy
id: 108
url: https://leetcode.cn/problems/convert-sorted-array-to-binary-search-tree/
tags:
  - 树
  - 二分查找
  - 二叉搜索树
  - 二叉树
  - 数组
  - 分治
patterns:
  - ../../patterns/recursion.md
  - ../../patterns/search.md
date_added: 2026-03-25
---

# 108. 将有序数组转换为二叉搜索树

## 题目描述

给你一个整数数组 `nums` ，其中元素已经按**升序**排列，请你将其转换为一棵**高度平衡**二叉搜索树。

**高度平衡**二叉树是一棵满足「每个节点的左右两个子树的高度差的绝对值不超过 1 」的二叉树。

## 示例

**示例 1：**
```
输入：nums = [-10,-3,0,5,9]
输出：[0,-3,9,-10,null,5]
解释：[0,-10,5,null,-3,null,9] 也将被视为正确答案
```

**示例 2：**
```
输入：nums = [1,3]
输出：[3,1]
解释：[1,null,3] 和 [3,1] 都是高度平衡二叉搜索树
```

---

## 解题思路

### 题目给了两个约束，其中一个几乎是免费的

输出要同时满足两件事：**中序遍历恰好是 `nums`**（BST 性质），以及**每个节点左右子树的高度差不超过 1**（平衡）。

第一条容易被误认为也要额外检查，其实它由「下标区间怎么划」直接保证。BST 有一个等价描述：中序遍历是升序。把它反过来用 —— 只要保证「根的左边只放 `nums` 中根以左那一段、右边只放右边那一段」，中序遍历就自动等于 `nums`。代码里因此不需要任何 `nums[i] < root.val` 的比较。

### 平衡约束把「根取哪个下标」钉死在中点

设区间是 `nums[left..right]`、根取在下标 `k`，那么左子树只能用 `nums[left..k-1]`（`a = k - left` 个元素），右子树只能用 `nums[k+1..right]`（`b = right - k` 个元素）。两棵子树各自也得平衡，高度至少是 `⌈log₂(a+1)⌉` 与 `⌈log₂(b+1)⌉` —— **元素个数越接近，这两个高度就越接近**。

所以 `k` 只能取中点：`mid = (left + right) // 2`。此时左段长 `⌊(L-1)/2⌋`、右段长 `⌈(L-1)/2⌉`（`L = right - left + 1`），两者最多差 1；递归下去每一层维持这个差值，于是每个节点两边的高度差都不超过 1。

由此还能读出一件事：**答案不唯一**。中点有两个取法（下中位、上中位），取哪个都平衡，只是树的形状不同。示例 1 给出的 `[0,-3,9,-10,null,5]` 是「两段都取上中位」的结果，题目另外注明了 `[0,-10,5,null,-3,null,9]` 也算对。

### 方法一：分治 —— `dfs(left, right)` 造一棵子树

给它一个语义：返回「用 `nums[left..right]` 造出来的那棵平衡 BST 的根」。这个返回值正好是父节点需要的东西 —— 父节点要的就是「挂到 `left` 上的那个节点」，而 `None` 意味着「这一侧没有孩子」。

于是函数体只有三件事：空区间返回 `None`、非空时取 `mid` 用 `nums[mid]` 造根、余下两段各自递归挂上去。

区间是左闭右闭的，所以两侧递归必须写 `mid - 1` 和 `mid + 1`，把 `mid` 本身让出去。

```python
class Solution:
    def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
        def dfs(left: int, right: int) -> Optional[TreeNode]:
            if left > right:                      # 空区间：这里没有节点
                return None

            mid = (left + right) // 2             # 下中位，两侧元素个数最多差 1
            node = TreeNode(nums[mid])            # 根取中点的值，左小右大随之成立
            node.left = dfs(left, mid - 1)        # 左半段全部来自 nums[mid] 以左
            node.right = dfs(mid + 1, right)      # 右半段全部来自 nums[mid] 以右
            return node

        return dfs(0, len(nums) - 1)
```

节点里装的是 `nums[mid]` 而不是 `mid`：下标只用来定位，值才是树的键。`(left + right) // 2` 与 `left + (right - left) // 2` 完全等价 —— Python 的整数不会溢出，两种写法取一种即可。

### 方法二：显式栈

要绕开递归，就把「待造的子树」摆进容器里。每一项记四件事：父节点是谁、该挂到左边还是右边、对应区间两端。

```python
from collections import deque

class Solution:
    def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
        if not nums:
            return None

        mid = (len(nums) - 1) // 2
        root = TreeNode(nums[mid])

        # 每一项：(父节点, 是否挂到左边, 区间左端, 区间右端)
        q = deque([(root, True, 0, mid - 1), (root, False, mid + 1, len(nums) - 1)])

        while q:
            parent, to_left, left, right = q.popleft()
            if left > right:                      # 空区间，这一支到此为止
                continue
            mid = (left + right) // 2
            node = TreeNode(nums[mid])
            if to_left:
                parent.left = node
            else:
                parent.right = node
            q.append((node, True, left, mid - 1))
            q.append((node, False, mid + 1, right))

        return root
```

取舍：

- 递归版的栈深就是树高 `⌈log₂(n+1)⌉`，`n = 10^4` 时也只有 14 层，离 Python 的递归上限很远。所以迭代版在本题没有实际收益，只是把调用栈搬到了堆上，还多出拆元组的开销。
- 空间上迭代版反而更差：队列里最多压着一整层待处理的区间，`O(n)`；递归版是 `O(log n)`。
- 迭代版的价值在「递归深度可能达到 `O(n)`」的变体里，那时把可能爆栈的递归换成显式容器是值得的。本题不属于这种情况，默认用递归。

---

## 完整代码实现

与方法一相同，`mid` 写成 `left + (right - left) // 2`，两种写法结果完全一致：

```python
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    """
    将有序数组转换为二叉搜索树 - 递归

    核心思想：
    选择数组中间元素作为根节点，可以保证树的高度平衡。
    然后递归构建左右子树。

    时间复杂度：O(n)
    空间复杂度：O(log n)
    """

    def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
        def dfs(left: int, right: int) -> Optional[TreeNode]:
            if left > right:
                return None

            mid = left + (right - left) // 2
            root = TreeNode(nums[mid])
            root.left = dfs(left, mid - 1)
            root.right = dfs(mid + 1, right)

            return root

        return dfs(0, len(nums) - 1)
```

---

## 示例推演

`nums = [-10,-3,0,5,9]`，按 `mid = (left + right) // 2`（下中位）展开：

| 调用 | 区间内容 | `mid` | 根的值 | 左孩子来自 | 右孩子来自 |
|---|---|---|---|---|---|
| `dfs(0,4)` | `[-10,-3,0,5,9]` | 2 | `0` | `dfs(0,1)` | `dfs(3,4)` |
| `dfs(0,1)` | `[-10,-3]` | 0 | `-10` | `dfs(0,-1)` → `None` | `dfs(1,1)` |
| `dfs(1,1)` | `[-3]` | 1 | `-3` | `dfs(1,0)` → `None` | `dfs(2,1)` → `None` |
| `dfs(3,4)` | `[5,9]` | 3 | `5` | `dfs(3,2)` → `None` | `dfs(4,4)` |
| `dfs(4,4)` | `[9]` | 4 | `9` | `dfs(4,3)` → `None` | `dfs(5,4)` → `None` |

按「谁挂在谁下面」拼起来：

```text
        0
      /   \
   -10      5
     \       \
     -3       9
```

层序序列化（去掉尾部空位）是 `[0,-10,5,null,-3,null,9]`，正是示例 1 注明的另一种正确答案。两处核对：中序遍历得到 `-10 → -3 → 0 → 5 → 9`，与 `nums` 一致；根的两个子树高度都是 2，差为 0。

若把 mid 换成上中位 `(left + right + 1) // 2`：`[-10,-3]` 取到下标 1 的 `-3`（左孩子 `-10`），`[5,9]` 取到下标 4 的 `9`（左孩子 `5`），层序就是示例给出的 `[0,-3,9,-10,null,5]`。

示例 2 的 `nums = [1,3]` 更短：`dfs(0,1)` 的 `mid = 0`，根是 `1`，右孩子来自 `dfs(1,1)` 得到的 `3`，层序为 `[1,null,3]`；改取上中位则得到 `[3,1]`。两种都在题面允许的范围内。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 递归分治（最优） | O(n) | O(log n) | 每个元素恰好造一个节点；栈深等于树高 ⌈log₂(n+1)⌉ |
| 显式栈 | O(n) | O(n) | 队列最多压着一整层待处理区间，比递归的栈深更费空间 |

> `n = len(nums)`。两版都只对每个元素取一次值、造一个节点。

---

## 易错点总结

1. **`if left > right` 写成 `if left >= right`**：长度为 1 的区间被判成空区间，每个叶子都被丢掉。`nums = [1]` 直接返回空树；`[-10,-3,0,5,9]` 只剩 `[0,-10,5]` 三个节点 —— 树仍然平衡、中序仍然升序，只是少了两个元素。
2. **递归区间没把 `mid` 让出去**：`dfs(left, mid - 1)` 写成 `dfs(left, mid)`，单元素区间 `left == right == mid` 会反复调用自己，抛 `RecursionError: maximum recursion depth exceeded`。现象是崩溃而不是答案错，所以很容易被当成「平台限制」。
3. **左右子树挂反**：`root.left = dfs(mid + 1, right)`、`root.right = dfs(left, mid - 1)`。节点数、平衡性都还对，但中序变成降序，BST 性质整个反过来；示例 1 得到 `[0,5,-10,9,null,null,-3]`，最大值跑到了左子树。

---

## 相关题目

- [109. 有序链表转换二叉搜索树](https://leetcode.cn/problems/convert-sorted-list-to-binary-search-tree/)
- [1382. 将二叉搜索树变平衡](https://leetcode.cn/problems/balance-a-binary-search-tree/)
