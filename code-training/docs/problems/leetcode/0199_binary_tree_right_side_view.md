---
title: 199. 二叉树的右视图
platform: LeetCode
difficulty: Medium
id: 199
url: https://leetcode.cn/problems/binary-tree-right-side-view/
tags:
  - 树
  - 二叉树
  - 广度优先搜索
  - 深度优先搜索
topics: []
patterns:
  - ../../patterns/bfs.md
  - ../../patterns/dfs.md
date_added: 2026-04-18
date_reviewed: []
---

# 199. 二叉树的右视图

## 题目描述

给定一个二叉树的根节点 `root`，想象自己站在它的右侧，按照从顶部到底部的顺序，返回从右侧所能看到的节点值。

**提示：**

- 二叉树的节点个数的范围是 `[0, 100]`
- `-100 <= Node.val <= 100`

## 示例

### 示例 1

**输入：** root = [1,2,3,null,5,null,4]

**输出：** [1,3,4]

**解释：** 第 1 层看到 1，第 2 层看到 3，第 3 层看到 4。

### 示例 2

**输入：** root = [1,2,3,4,null,null,null,5]

**输出：** [1,3,4,5]

**解释：** 第 3 层最靠右的是节点 4，第 4 层只有节点 5——它挂在了左边那条链上，但那一层只有它。

### 示例 3

**输入：** root = [1,null,3]

**输出：** [1,3]

### 示例 4

**输入：** root = []

**输出：** []

## 解题思路

右视图就是**每一层最靠右的那个节点**，从上到下一层取一个。拿到它的办法有两种：按层把节点摆开、取每层最后一个（BFS）；或者先钻右子树、每个深度第一次到达时记下来（DFS）。后一种不用存整层节点，代码也更短。

### 按层扫：每层最后一个就是答案

用两个列表交替：`cur` 是当前层的全部节点，`nxt` 收集下一层。`cur[-1]` 是本层最右，直接记进答案；扫完本层再把 `nxt` 换成新的 `cur`。

```python
if not root:
    return []
ans, cur = [], [root]
while cur:
    ans.append(cur[-1].val)          # 本层最右
    nxt = []
    for node in cur:                 # 从左到右摊开下一层
        if node.left: nxt.append(node.left)
        if node.right: nxt.append(node.right)
    cur = nxt
```

关键在于「同一层的节点在 `cur` 里是按从左到右排的」：只要按 `left`、`right` 的顺序摊开，这个顺序就自动保持，`cur[-1]` 自然是最右。

### 先右后左：第一次到某个深度，就是那个深度的最右

换个角度想：如果 DFS **先走右子树再走左子树**，那么第一次到达深度 `d` 的节点，一定是第 `d` 层最靠右的那个——因为所有更靠左的节点要等右边整棵树走完才会被访问。

于是只需要一个「已经记录到第几层」的计数器，也就是 `len(ans)`：

```python
def dfs(node, depth):
    if not node:
        return
    if depth == len(ans):            # 这个深度第一次到达
        ans.append(node.val)
    dfs(node.right, depth + 1)       # 先右：保证首次到达的是最右
    dfs(node.left, depth + 1)
```

`depth == len(ans)` 的意思是「`ans` 里还没有第 `depth` 层」。空树进不去 `dfs`，`ans` 自然是空列表，不用额外判。

### 推演：示例 2 的 DFS

层序 `[1,2,3,4,null,null,null,5]` 还原出的树是：

```
      1
     / \
    2   3
   /
  4
 /
5
```

3 没有孩子，所以第 3 层只有左边那条链上的 4。

| 访问顺序 | 深度 | `len(ans)` | 是否记录 | `ans` |
| --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 是 | [1] |
| 3 | 1 | 1 | 是 | [1,3] |
| 2 | 1 | 2 | 否（第 1 层已有） | [1,3] |
| 4 | 2 | 2 | 是 | [1,3,4] |
| 5 | 3 | 3 | 是 | [1,3,4,5] |

第 4 层的 5 挂在最左边的链上，但那一层只有它一个，所以它也是「最右」。走完 3 这一支再回到 2 时，深度 1 已经记录过，`depth == len(ans)` 不成立，直接跳过——这就是「先右后左」省下的判断。

## 完整代码实现

```python
from typing import List, Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        ans = []

        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if not node:
                return
            # 这个深度第一次到达：当前节点就是这一层最右
            if depth == len(ans):
                ans.append(node.val)
            dfs(node.right, depth + 1)   # 先右，保证首次到达的是最右
            dfs(node.left, depth + 1)

        dfs(root, 0)
        return ans
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 按层 BFS | O(n) | O(w) | `w` 是树的最大宽度，宽树上要存整层节点 |
| 先右后左 DFS（最优） | O(n) | O(h) | `h` 是树高，只压递归栈；平衡树 O(log n)，链状树 O(n) |

## 易错点总结

### 1. 以为右视图就是「一路走右孩子」

沿着 `root.right` 走到底，示例 2 会输出 `[1,3]`：3 没有右孩子就停了，而题目要的是每一层的最右——第 3 层是 3 左子树里的 4，第 4 层是最左边那条链上的 5。右视图是「每层取一个」，不是「一条路径」。

### 2. DFS 先左后右，却还写 `depth == len(ans)`

先左后右时，每个深度第一次到达的是**最左**节点。示例 1 会输出 `[1,2,5]`（正确 `[1,3,4]`），示例 2 会输出 `[1,2,4,5]`。要么把两行递归换成先 `right` 后 `left`，要么保留先左后右但改成「每层覆盖」：`if depth == len(ans): append` 换成 `ans[depth] = node.val`。

## 扩展思考

- 把「每层一个值」换成「每层一串值」，就是 [102. 二叉树的层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/)；BFS 骨架完全一样，只是收集方式变了。
- 把 `cur[-1]` 换成 `cur[0]`、先左后右换成先右后左，就是左视图——两题只差一个端点。
