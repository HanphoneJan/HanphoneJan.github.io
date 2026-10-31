---
title: 102. 二叉树的层序遍历
platform: LeetCode
difficulty: Medium
id: 102
url: https://leetcode.cn/problems/binary-tree-level-order-traversal/
tags:
  - 树
  - 广度优先搜索
  - 二叉树
patterns:
  - ../../patterns/bfs.md
date_added: 2026-03-25
---

# 102. 二叉树的层序遍历

## 题目描述

给你二叉树的根节点 `root`，返回其节点值的**层序遍历**。（即逐层地，从左到右访问所有节点）。

## 示例

**示例 1：**
```
输入：root = [3,9,20,null,null,15,7]
输出：[[3],[9,20],[15,7]]
```

**示例 2：**
```
输入：root = [1]
输出：[[1]]
```

**示例 3：**
```
输入：root = []
输出：[]
```

---

## 解题思路

### 输出按层分组，算法就必须知道「层边界」在哪

期望输出 `[[3],[9,20],[15,7]]` 不是一个扁平序列，而是「每层一个子列表」。这意味着遍历时除了「下一个访问谁」，还要回答「当前节点属于第几层」。一次扁平的遍历给不出这个信息，事后也切不回来 —— `3,9,20,15,7` 里的切点（第 1 个之后、第 3 个之后）根本不在结果里。

广度优先搜索恰好自带这个信息：从根出发，同一层的节点在队列里是连续的一段；把它们逐个取出、各自的孩子追加到队尾，队尾新增的那些就构成下一层。于是「第几层」不需要额外变量记录，它就等于「本轮开始前队列里已有的节点」。

### 关键一步：每轮开始先把队列长度记下来

做法只有一行，漏了它整题就废：**进内层循环前用 `len(q)` 固定本轮的节点数**，只处理这么多个。

```text
第 1 轮开始：q = [3]        len = 1  -> 取 3，塞入 9、20
第 2 轮开始：q = [9, 20]    len = 2  -> 取 9、20，塞入 15、7
第 3 轮开始：q = [15, 7]    len = 2  -> 取 15、7，没有孩子
第 4 轮开始：q = []         循环结束
```

第 2 轮里 15、7 是在处理 20 时追加到队尾的，可循环次数早在进循环前就被 `len(q)` 定死了，它们排在这一轮之后，天然属于下一层。若内层写成 `while q`，一轮就会把整棵树取完，`res` 只收到一个子列表。

### 方法一：BFS —— 队列 + 每轮长度快照

```python
from collections import deque

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        if root is None:                 # 空树一层都没有
            return []

        res = []
        q = deque([root])                # 队列里放的是「本轮及之后各层」的节点
        while q:
            level = []                   # 本轮收集到的正好是同一层
            for _ in range(len(q)):      # 快照长度：本轮只取这么多，新入队的子节点留到下一轮
                node = q.popleft()
                level.append(node.val)
                if node.left:
                    q.append(node.left)
                if node.right:
                    q.append(node.right)
            res.append(level)            # 一次 append 对应一层

        return res
```

三处对得上上面的分析：

- `q = deque([root])`：队列的初始内容就是第 0 层，只有一个根；
- `for _ in range(len(q))`：本轮的次数在进循环前定死，这就是「层边界」；
- `res.append(level)` 放在内层循环**之外**：放进去会变成每个节点一个长度为 1 的列表。

用 `deque` 而不是 `list`，是因为 `popleft()` 是 `O(1)`，而 `list.pop(0)` 每次要搬动整个列表；BFS 一共 n 次出队，用 list 会把总时间拖到 `O(n²)`。

### 方法二：DFS —— 把层号当参数往下传

层号也可以不由队列提供，而由递归参数携带：`dfs(node, depth)` 表示「`node` 在第 `depth` 层」，访问到就把值追加进 `res[depth]`。

这里有个细节：`res` 是边遍历边长出来的，第一次走到某一层时它还没有对应位置。判断条件是 `depth == len(res)`（层号从 0 开始，正好等于当前已开出的层数），成立就先追加一个空列表。

```python
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        res: List[List[int]] = []

        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if node is None:
                return
            if depth == len(res):        # 首次进入这一层，先占一个空列表
                res.append([])
            res[depth].append(node.val)
            dfs(node.left, depth + 1)    # 先左后右
            dfs(node.right, depth + 1)

        dfs(root, 0)
        return res
```

层内从左到右的顺序不用另外维护：先序遍历总是先走完整棵左子树再走右子树，而同一层的节点恰好是「左子树里的排在前面、右子树里的排在后面」，于是它们被访问的顺序就是从左到右。

两种写法的差别只在额外空间和稳健性上：

- BFS 的额外空间是队列里同时存放的节点数，最多一整层 `O(w)`；DFS 是递归深度，等于树高 `O(h)`。平衡树上前者是 `O(n/2)`、后者是 `O(log n)`，DFS 更省；链状树上两者都退化成 `O(n)`。
- 本题节点数上限是 2000。树退化成一条链时 DFS 的递归深度也是 2000，超过 Python 默认的 1000 层，会抛 `RecursionError`；BFS 没有这个隐患。
- 所以默认给 BFS：它既贴合「按层输出」的语义，也不受递归深度限制。DFS 版本更短，少一个 `deque`，也不需要长度快照这个技巧。

---

## 完整代码实现

与上面方法一逻辑相同，只是把 `q` / `level` 写成了 `cur` / `value`，可以直接提交：

```python
from typing import List, Optional
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    """
    二叉树的层序遍历 - BFS

    核心思想：
    使用队列（BFS）按层遍历二叉树。

    时间复杂度：O(n)
    空间复杂度：O(n)
    """

    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        if not root:
            return []

        res = []
        cur = deque([root])

        while cur:
            value = []
            for _ in range(len(cur)):
                node = cur.popleft()
                value.append(node.val)
                if node.left:
                    cur.append(node.left)
                if node.right:
                    cur.append(node.right)
            res.append(value)

        return res
```

---

## 示例推演

以示例 1 的 `root = [3,9,20,null,null,15,7]` 为例，树形为：

```text
        3
       / \
      9  20
         / \
        15  7
```

BFS 逐轮展开：

| 轮次 | 进循环时 `len(q)` | 本轮出队 | `level` | 本轮入队 | `res` |
|---|---|---|---|---|---|
| 1 | 1 | `3` | `[3]` | `9, 20` | `[[3]]` |
| 2 | 2 | `9, 20` | `[9, 20]` | `15, 7` | `[[3],[9,20]]` |
| 3 | 2 | `15, 7` | `[15, 7]` | 无 | `[[3],[9,20],[15,7]]` |

第 2 轮里 9 出队时没有孩子，什么也不入队；20 出队时把 15、7 入队。这一轮结束时队列里剩 `[15, 7]`，正是第三层。

第 4 轮 `while q` 不成立，循环结束，返回 `[[3],[9,20],[15,7]]`。

另外两个示例走的是同一段逻辑的短路径：`root = [1]` 时第 1 轮取到 1、没有孩子，返回 `[[1]]`；`root = []` 时 `if root is None` 直接返回 `[]`，队列根本不会建立。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| BFS（队列）（最优） | O(n) | O(w) | 队列最多同时放一整层，`w` 为最大层宽，最坏 O(n)；不受递归深度限制 |
| DFS（递归） | O(n) | O(h) | 递归栈深度等于树高，链状树为 O(n) |

> `n` 为节点总数，`w` 为最大层宽，`h` 为树高。两种写法每个节点都只被访问一次。

---

## 易错点总结

1. **内层循环写成 `while q`**：`for _ in range(len(q))` 那一行改成 `while q` 之后，一轮会取完整棵树，输出从 `[[3],[9,20],[15,7]]` 退化成 `[[3,9,20,15,7]]`，`res` 只有一项。
2. **出队写成 `q.pop()`**：`deque` 的 `pop()` 从队尾取，`popleft()` 才是队首。取到的节点不再是同一层，示例 1 得到 `[[3],[20,7],[15,9]]` —— 第 2 项混进了第三层的 7，第 3 项混进了第二层的 9。
3. **没处理空树**：少了 `if root is None: return []`，`deque([None])` 会进循环，执行 `node.val` 时抛 `AttributeError: 'NoneType' object has no attribute 'val'`。示例 3 的 `root = []` 走的正是这条路径。

---

## 相关题目

- [107. 二叉树的层序遍历 II](https://leetcode.cn/problems/binary-tree-level-order-traversal-ii/)
- [103. 二叉树的锯齿形层序遍历](https://leetcode.cn/problems/binary-tree-zigzag-level-order-traversal/)
