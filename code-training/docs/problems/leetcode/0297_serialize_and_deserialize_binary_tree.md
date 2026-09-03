---
title: 二叉树的序列化与反序列化
platform: LeetCode
difficulty: Hard
id: 297
url: https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/
tags:
  - 树
  - BFS
  - 设计
date_added: 2026-04-24
---

# 297. 二叉树的序列化与反序列化

## 题目描述

序列化是将一个数据结构或者对象转换为连续的比特位的操作，进而可以将转换后的数据存储在一个文件或者内存中，同时也可以通过网络传输到另一个计算机环境，采取相反方式重构得到原数据。

请设计一个算法来实现二叉树的序列化与反序列化。这里不限定你的序列 / 反序列化算法执行逻辑，你只需要保证一个二叉树可以被序列化为一个字符串并且将这个字符串反序列化为原始的树结构。

## 示例

**示例 1：**
```
输入：root = [1,2,3,null,null,4,5]
输出：[1,2,3,null,null,4,5]
```

**示例 2：**
```
输入：root = []
输出：[]
```

---

## 解题思路

### 第一步：理解问题本质

我们需要将二叉树转换为字符串（序列化），并能从字符串恢复原始二叉树（反序列化）。关键问题是：**用什么遍历方式能保证信息不丢失？**

### 第二步：为什么需要记录空节点

如果只用中序、前序或后序遍历，不记录空节点，无法唯一确定一棵二叉树。

例如：`[1,2]` 和 `[1,null,2]` 的前序遍历都是 `1,2`，但结构不同。

**结论**：必须记录空节点的位置，或者使用能保留结构信息的遍历方式。

### 第三步：DFS 解法（前序遍历）

**思路**：使用前序遍历，用特殊标记（如 `"null"`）表示空节点。

```python
class Codec:
    def serialize(self, root):
        def dfs(node):
            if not node:
                res.append("null")
                return
            res.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        res = []
        dfs(root)
        return ",".join(res)

    def deserialize(self, data):
        def dfs():
            val = next(vals)
            if val == "null":
                return None
            node = TreeNode(int(val))
            node.left = dfs()
            node.right = dfs()
            return node
        vals = iter(data.split(","))
        return dfs()
```

**优点**：代码简洁直观
**缺点**：对于完全二叉树，会记录很多末尾的 `"null"`

### 第四步：最优解法 —— BFS 层序遍历

**核心洞察**：
- BFS 按层遍历，能完整保留树的结构信息
- 使用队列，依次处理每个节点的左右子节点
- 空节点也加入队列，用 `"null"` 表示

**为什么正确**：
- 序列化时，按层序将节点值（包括 `"null"`）依次记录
- 反序列化时，按同样的顺序读取，用队列维护待处理节点的父子关系
- 只要序列化和反序列化使用相同的遍历方式，就能保证数据一致

---

## 完整代码实现

```python
import collections
from collections import deque


# Definition for a binary tree node.
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None


class Codec:
    """
    二叉树的序列化与反序列化 - BFS层序遍历

    序列化：使用BFS层序遍历，空节点记为"null"
    反序列化：按同样的顺序重建树，使用队列维护父子关系

    时间复杂度：O(n)
    空间复杂度：O(n)
    """

    def serialize(self, root):
        if not root:
            return "[]"
        queue = collections.deque()
        queue.append(root)
        res = []
        while queue:
            node = queue.popleft()
            if node:
                res.append(str(node.val))
                queue.append(node.left)
                queue.append(node.right)
            else:
                res.append("null")
        return '[' + ','.join(res) + ']'

    def deserialize(self, data):
        if data == "[]":
            return
        vals, i = data[1:-1].split(','), 1
        root = TreeNode(int(vals[0]))
        queue = collections.deque()
        queue.append(root)
        while queue:
            node = queue.popleft()
            if vals[i] != "null":
                node.left = TreeNode(int(vals[i]))
                queue.append(node.left)
            i += 1
            if vals[i] != "null":
                node.right = TreeNode(int(vals[i]))
                queue.append(node.right)
            i += 1
        return root
```

---

## 示例推演

以 `root = [1,2,3,null,null,4,5]` 为例：

**序列化过程**：

| 步骤 | 队列 | 出队 | 结果 | 入队 |
|------|------|------|------|------|
| 1 | [1] | 1 | [1] | 2, 3 |
| 2 | [2,3] | 2 | [1,2] | null, null |
| 3 | [3,null,null] | 3 | [1,2,3] | 4, 5 |
| 4 | [null,null,4,5] | null | [1,2,3,null] | - |
| 5 | [null,4,5] | null | [1,2,3,null,null] | - |
| 6 | [4,5] | 4 | [1,2,3,null,null,4] | null, null |
| 7 | [5,null,null] | 5 | [1,2,3,null,null,4,5] | null, null |
| 8 | [null,null,...] | null | ... | - |

最终结果：`"[1,2,3,null,null,4,5,null,null,null,null]"`

**反序列化过程**：

| 步骤 | 当前节点 | vals[i] | 操作 | vals[i+1] | 操作 |
|------|----------|---------|------|-----------|------|
| 1 | 1(根) | 2 | 左=2 | 3 | 右=3 |
| 2 | 2 | null | 左=null | null | 右=null |
| 3 | 3 | 4 | 左=4 | 5 | 右=5 |

成功重建原树。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| DFS前序 | O(n) | O(n) | 递归栈深度可能很大 |
| **BFS层序（最优）** | **O(n)** | **O(n)** | 队列大小最坏为n/2 |

---

## 易错点总结

### 1. 空树处理

序列化空树时应返回 `"[]"`，反序列化 `"[]"` 时应返回 `None`。

### 2. 索引越界

反序列化时，`vals` 的长度可能超过实际需要（BFS会记录很多末尾的 `"null"`），但只要按队列顺序处理即可，不会越界。

### 3. TreeNode 定义位置

LeetCode 平台会自动提供 `TreeNode` 定义，**不要放在 `@lc code=start` 和 `@lc code=end` 之间**。

---

## 扩展思考

### 1. 如何压缩序列化结果？

- 去掉末尾连续的 `"null"`
- 使用更紧凑的编码（如二进制位）

### 2. N叉树的序列化？

类似思路，每个节点需要记录子节点数量和各个子节点的值。

### 3. 前序 vs BFS 的选择？

- 前序：代码更简洁，递归实现
- BFS：非递归，适合非常深的树

---

## 相关题目

- [449. 序列化和反序列化二叉搜索树](https://leetcode.cn/problems/serialize-and-deserialize-bst/)
- [428. 序列化和反序列化 N 叉树](https://leetcode.cn/problems/serialize-and-deserialize-n-ary-tree/)
