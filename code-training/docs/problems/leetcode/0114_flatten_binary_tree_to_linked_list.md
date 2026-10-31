---
title: 114. 二叉树展开为链表
platform: LeetCode
difficulty: Medium
id: 114
url: https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/
tags:
  - 树
  - 链表
  - 二叉树
  - 栈
  - 深度优先搜索
patterns:
  - ../../patterns/dfs.md
date_added: 2026-03-25
---

# 114. 二叉树展开为链表

## 题目描述

给你二叉树的根结点 `root` ，请你将它展开为一个单链表：

- 展开后的单链表应该同样使用 `TreeNode` ，其中 `right` 子指针指向链表中下一个结点，而左子指针始终为 `null` 。
- 展开后的单链表应该与二叉树**先序遍历**顺序相同。

## 示例

**示例 1：**
```
输入：root = [1,2,5,3,4,null,6]
输出：[1,null,2,null,3,null,4,null,5,null,6]
```

**示例 2：**
```
输入：root = []
输出：[]
```

**示例 3：**
```
输入：root = [0]
输出：[0]
```

---

## 解题思路

### 前序序列已经把接法说完了

先用最省事的写法确认要什么：前序遍历把节点收进列表，再按顺序把 `right` 串起来、`left` 清空，`O(n)` 空间，一次就能写对。题目真正的难点是那句「原地」—— 不允许额外开数组，只能靠改指针。

原地之所以做得到，是因为前序的定义本身就给出了接法：

```text
前序(树) = [根] + 前序(左子树) + 前序(右子树)
```

展开后 `root.right` 要指向「左子树前序的第一项」，也就是 `root.left` 本身；而**左子树前序的最后一项**后面接的正是原来的右子树。前序里左子树的最后一项是谁？从 `root.left` 一路沿 `right` 走到底的那个节点 —— 左子树的**最右节点**。

于是每个有左孩子的节点都做同一件事：

> 找到左子树的最右节点 `pre`，把 `pre.right` 接上 `cur.right`；再把 `cur.right` 换成 `cur.left`，`cur.left` 置空。

接完之后 `cur.right` 就是原来的左子树，所以顺着 `cur = cur.right` 往下走，正好是**前序**的顺序继续处理 —— 这就是为什么不需要栈：**指针改完，遍历路径自己就搭好了**。

### 循环不变式：左边是已完成的链，右边是待处理的子树

进入每轮循环时：

- 从 `root` 到 `cur` 这一段已经是纯粹的 `right` 链，顺序与前序一致；
- `cur` 是链上第一个还没处理左孩子的节点，它的右子树还在原位、没动过。

一轮做三件事 + 前进一步：

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def flatten(self, root: TreeNode) -> None:
        curr = root
        while curr:
            if curr.left:
                # 1. 左子树的最右节点 = 前序里左子树的最后一个
                predecessor = curr.left
                while predecessor.right:
                    predecessor = predecessor.right
                # 2. 它后面接原来的右子树
                predecessor.right = curr.right
                # 3. 左子树整体搬到右边，左指针清空
                curr.right = curr.left
                curr.left = None
            # 4. 前进：此时 curr.right 已经是原来的左子树
            curr = curr.right
```

第 3 步那两行的顺序不能换；第 4 步在 `if` 外面 —— 没有左孩子的节点不需要拼接，直接往右走一格。

函数返回 `None`，结果体现在 `root` 的 `right` 链上，所以调用方看的是树本身，不是返回值。

### 递归：先展开两棵子树再拼

换个顺序：先把左右子树各自展开成链，再把「左链」整条塞到根和右链之间。递归需要知道**左链的尾巴**才能接上右链，所以让 `dfs` 返回「以该节点为根的子树展开后的最后一个节点」。

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def flatten(self, root: TreeNode) -> None:
        def dfs(node):
            """返回 node 这棵子树展开后的最后一个节点。"""
            if node is None:
                return None
            left_tail = dfs(node.left)
            right_tail = dfs(node.right)      # 先递归完右侧，node.right 仍是右子树的头
            if left_tail:
                left_tail.right = node.right  # 左链尾巴接原右子树
                node.right = node.left        # 左链整体搬到右边
                node.left = None
            return right_tail or left_tail or node

        dfs(root)
```

注意 `left_tail.right = node.right` 接的是**右子树的头**（`node.right` 本身没被递归改过引用，只是内部被重排了），不是 `right_tail` —— 接错成 `right_tail` 会让右子树的第一个节点被跳过。

两种写法的差别只在空间：

- 迭代版是题目要的 `O(1)` 额外空间。那个 `while predecessor.right` 看着像嵌套循环，实际每条边最多被走两遍，总代价仍是 `O(n)`（和 Morris 遍历同一套均摊分析）。
- 递归版写法短、思路顺，但调用栈是 `O(h)`，链状树能到 `O(n)`。`n = 2000` 时就要担心 Python 的递归限制。

顺带一提第三种：前序遍历收集节点再串起来是 `O(n)` 空间，最容易写对、最适合用来对拍，但不符合题目的原地要求。

---

## 完整代码实现

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    """
    二叉树展开为链表 - O(1)空间复杂度

    核心思想：
    使用 Morris 遍历的变种，将二叉树原地展开为链表。

    算法步骤：
    1. 对于当前节点curr，如果它有左子树：
       a. 找到左子树的最右节点（前驱节点）
       b. 将curr的右子树接到前驱节点的右边
       c. 将curr的左子树变为右子树，左子树置空
    2. curr移动到右子节点

    时间复杂度：O(n)
    空间复杂度：O(1)
    """

    def flatten(self, root: TreeNode) -> None:
        curr = root
        while curr:
            if curr.left:
                # 找到左子树的最右节点
                predecessor = curr.left
                while predecessor.right:
                    predecessor = predecessor.right

                # 将右子树接到前驱节点右边
                predecessor.right = curr.right

                # 左子树移到右边
                curr.right = curr.left
                curr.left = None

            curr = curr.right
```

---

## 示例推演

`root = [1,2,5,3,4,null,6]`：

```text
        1
       / \
      2   5
     / \   \
    3   4   6
```

前序序列是 `1, 2, 3, 4, 5, 6`，展开后的链就应该是这个顺序。

| 轮次 | `curr` | 左子树的最右节点 `pre` | 拼接动作 | 处理后的链 |
|---|---|---|---|---|
| 1 | 1 | 4（`2 → 4`） | `4.right = 5`；`1.right = 2`，`1.left = None` | `1 → 2`，2 的两个孩子 3、4 还在，4 已经指向 5 |
| 2 | 2 | 3（`curr.left` 本身，无右孩子） | `3.right = 4`；`2.right = 3`，`2.left = None` | `1 → 2 → 3 → 4 → 5 → 6` |
| 3 | 3 | — 没有左孩子 | 只前进到 `3.right = 4` | 同上 |
| 4 | 4 | — 没有左孩子 | 只前进到 `4.right = 5` | 同上 |
| 5 | 5 | — 没有左孩子 | 只前进到 `5.right = 6` | 同上 |
| 6 | 6 | — 没有左孩子 | `6.right` 是 `None`，`curr` 变成 `None`，循环结束 | 同上 |

真正改变结构的只有前两轮：

- 第 1 轮把 `4.right` 接上 `5`，这一步把「左子树的尾巴」和「原来的右子树」缝在了一起；漏掉它，`5` 和 `6` 会整支丢掉。
- 第 2 轮把 `3.right` 接上 `4`（此时 4 已经指向 5），链就通了。剩下几轮只是顺着已经搭好的 `right` 链往前走，什么也不用改。

最后把链按 `right` 读出来是 `1 → 2 → 3 → 4 → 5 → 6`，每个节点的 `left` 都是 `None`，正是示例要求的输出。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 先序收集再串 | O(n) | O(n) | 数组存一遍前序，最容易写对 |
| 递归（后序拼接） | O(n) | O(h) | 调用栈为树高，链状树退化成 O(n) |
| 迭代原地（Morris遍历）（最优） | O(n) | O(1) | 找前驱的 `while` 均摊线性，每条边最多走两遍 |

> `n` 为节点数，`h` 为树高。

---

## 易错点总结

1. **`curr.right = curr.left` 与 `curr.left = None` 顺序颠倒**：先置空再赋值，`curr.right` 拿到的是 `None`，整棵左子树当场丢掉；示例 1 输出只剩一个 `1`。
2. **找前驱时走错方向**：把 `while predecessor.right` 写成 `while predecessor.left`，拿到的是左子树最左下的节点，拼接点错位；示例 1 输出 `1 → 2 → 3 → 4`，`5` 和 `6` 消失。
3. **`curr = curr.right` 被写进了 `if curr.left:` 里面**：没有左孩子的节点不会前进，`curr` 原地打转，直接超时。

---

## 相关题目

- [430. 扁平化多级双向链表](https://leetcode.cn/problems/flatten-a-multilevel-doubly-linked-list/)
