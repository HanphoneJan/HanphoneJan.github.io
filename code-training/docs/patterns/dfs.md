---
title: DFS 模式
category: 算法模式
difficulty: 简单-困难
applicable_to:
  - 树
  - 图
  - 回溯
last_updated: 2026-02-25
---

# DFS（深度优先搜索）模式

## 模式概述

DFS 是一种图遍历算法，沿着一条路径尽可能深入，直到无法继续，再回溯到上一节点继续探索。

## 核心特点

- **深度优先**：先访问子节点
- **使用递归或栈**：LIFO 数据结构
- **回溯思想**：探索完一条路径后返回

## 适用场景

1. **树的遍历**（前序、中序、后序）
2. **图的遍历**
3. **路径搜索**
4. **排列组合**
5. **回溯算法**

## 基本模板

### 递归 DFS（树）

```python
def dfs_tree(root):
    # 1. 终止条件
    if not root:
        return
    
    # 2. 前序位置：处理当前节点
    process(root)
    
    # 3. 递归左子树
    dfs_tree(root.left)
    
    # 4. 中序位置
    process(root)
    
    # 5. 递归右子树
    dfs_tree(root.right)
    
    # 6. 后序位置
    process(root)
```

### 迭代 DFS（栈）

```python
def dfs_iterative(root):
    if not root:
        return
    
    stack = [root]
    
    while stack:
        node = stack.pop()
        process(node)
        
        # 注意：先右后左，保证左子树先被处理
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
```

### 图的 DFS

```python
def dfs_graph(node, visited):
    if node in visited:
        return
    
    visited.add(node)
    process(node)
    
    for neighbor in graph[node]:
        dfs_graph(neighbor, visited)
```

### 矩阵的 DFS

```python
def dfs_matrix(matrix, row, col, visited):
    rows, cols = len(matrix), len(matrix[0])
    
    # 边界检查
    if (row < 0 or row >= rows or 
        col < 0 or col >= cols or 
        (row, col) in visited or
        matrix[row][col] == obstacle):
        return
    
    visited.add((row, col))
    process(row, col)
    
    # 四个方向递归
    dfs_matrix(matrix, row + 1, col, visited)  # 下
    dfs_matrix(matrix, row - 1, col, visited)  # 上
    dfs_matrix(matrix, row, col + 1, visited)  # 右
    dfs_matrix(matrix, row, col - 1, visited)  # 左
```

## 实战案例

### 案例 1：二叉树的前序遍历

```python
def preorder(root):
    result = []
    
    def dfs(node):
        if not node:
            return
        
        result.append(node.val)  # 前序：根
        dfs(node.left)           # 左
        dfs(node.right)          # 右
    
    dfs(root)
    return result
```

### 案例 2：求树的最大深度

```python
def maxDepth(root):
    if not root:
        return 0
    
    left_depth = maxDepth(root.left)
    right_depth = maxDepth(root.right)
    
    return max(left_depth, right_depth) + 1
```

### 案例 3：路径和

```python
def hasPathSum(root, target):
    if not root:
        return False
    
    # 叶子节点
    if not root.left and not root.right:
        return root.val == target
    
    # 递归左右子树
    return (hasPathSum(root.left, target - root.val) or
            hasPathSum(root.right, target - root.val))
```

## DFS 的三种位置

```python
def traverse(root):
    if not root:
        return
    
    # 【前序位置】
    # - 刚进入节点时
    # - 适合：复制节点、记录路径
    
    traverse(root.left)
    
    # 【中序位置】
    # - 左子树处理完
    # - 适合：BST 的有序遍历
    
    traverse(root.right)
    
    # 【后序位置】
    # - 左右子树都处理完
    # - 适合：计算子树信息、删除节点
```

## 回溯模板

```python
def backtrack(path, choices):
    # 终止条件：当达到目标状态时记录答案（注意要调用判断函数）
    if satisfy_condition():          # 根据具体问题定义终止条件
        result.append(path[:])       # 记录答案（用切片拷贝，避免引用污染）
        return
    
    # 遍历所有选择
    for choice in choices:
        # 做选择
        path.append(choice)
        
        # 递归
        backtrack(path, next_choices)
        
        # 撤销选择（回溯）
        path.pop()
```

## BFS vs DFS

| 特性 | DFS | BFS |
|------|-----|-----|
| 数据结构 | 栈/递归 | 队列 |
| 遍历顺序 | 深度优先 | 广度优先 |
| 路径搜索 | ✅ 是 | ❌ 不适合 |
| 最短路径 | ❌ 否 | ✅ 是 |
| 空间复杂度 | O(h) 高度 | O(w) 宽度 |

## 解题步骤

1. **确定递归函数签名**
   - 参数：当前节点、必要的状态
   - 返回值：需要的结果类型

2. **确定终止条件**
   - 空节点
   - 叶子节点
   - 找到答案

3. **确定单层逻辑**
   - 处理当前节点
   - 递归子问题
   - 合并结果

4. **选择遍历位置**
   - 前序：需要向下传递信息
   - 后序：需要向上返回信息

## 常见模式

### 1. 分治

将问题分解为子问题，合并子问题的解。

```python
def divide_conquer(root):
    if not root:
        return base_case
    
    left = divide_conquer(root.left)
    right = divide_conquer(root.right)
    
    return merge(left, right, root.val)
```

### 2. 回溯

探索所有可能的路径。

### 3. 记忆化搜索

使用缓存避免重复计算。

```python
memo = {}

def dfs_with_memo(state):
    if state in memo:
        return memo[state]
    
    result = compute(state)
    memo[state] = result
    return result
```

## 时间与空间复杂度

- **时间复杂度**：O(V + E)，V 是顶点数，E 是边数
- **空间复杂度**：O(h)，h 是递归深度

## 相关知识点

- [树](../data-structures/tree)
- [二叉树](../data-structures/binary_tree)
- [BFS 模式](bfs)
- [回溯模式](backtracking)

## 练习题目

**简单：**
- 二叉树的前序遍历
- 二叉树的最大深度
- 路径总和

**中等：**
- 二叉树的所有路径
- 岛屿数量
- 全排列

**困难：**
- N 皇后
- 单词搜索 II

## 要点总结

- ✅ 递归是最常用的实现方式
- ✅ 理解前中后序的位置含义
- ✅ 回溯 = DFS + 撤销操作
- ✅ 注意递归终止条件
- ✅ 空间复杂度取决于递归深度

---

---

## 标准实现与变体

### 二叉树遍历（递归）

#### 前序遍历

```python
from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def preorder_traversal(root: Optional[TreeNode]) -> List[int]:
    """
    前序遍历：根 -> 左 -> 右
    时间复杂度：O(n)
    空间复杂度：O(h)，h 是树的高度
    """
    result = []
    
    def dfs(node):
        if not node:
            return
        
        result.append(node.val)  # 访问根节点
        dfs(node.left)           # 遍历左子树
        dfs(node.right)          # 遍历右子树
    
    dfs(root)
    return result
```

#### 中序遍历

```python
def inorder_traversal(root: Optional[TreeNode]) -> List[int]:
    """
    中序遍历：左 -> 根 -> 右
    BST 的中序遍历是有序的
    """
    result = []
    
    def dfs(node):
        if not node:
            return
        
        dfs(node.left)          # 遍历左子树
        result.append(node.val) # 访问根节点
        dfs(node.right)         # 遍历右子树
    
    dfs(root)
    return result
```

#### 后序遍历

```python
def postorder_traversal(root: Optional[TreeNode]) -> List[int]:
    """
    后序遍历：左 -> 右 -> 根
    适合需要先处理子树的问题
    """
    result = []
    
    def dfs(node):
        if not node:
            return
        
        dfs(node.left)          # 遍历左子树
        dfs(node.right)         # 遍历右子树
        result.append(node.val) # 访问根节点
    
    dfs(root)
    return result
```

### 二叉树遍历（迭代）

#### 前序遍历（迭代）

```python
def preorder_iterative(root: Optional[TreeNode]) -> List[int]:
    """
    使用栈实现前序遍历
    """
    if not root:
        return []
    
    result = []
    stack = [root]
    
    while stack:
        node = stack.pop()
        result.append(node.val)
        
        # 先右后左，保证左子树先被处理
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    
    return result
```

#### 中序遍历（迭代）

```python
def inorder_iterative(root: Optional[TreeNode]) -> List[int]:
    """
    使用栈实现中序遍历
    """
    result = []
    stack = []
    current = root
    
    while stack or current:
        # 一直往左走
        while current:
            stack.append(current)
            current = current.left
        
        # 处理栈顶节点
        current = stack.pop()
        result.append(current.val)
        
        # 转向右子树
        current = current.right
    
    return result
```

### 图的 DFS

```python
from typing import Dict, List, Set

def dfs_graph(graph: Dict[int, List[int]], start: int) -> List[int]:
    """
    图的深度优先搜索
    时间复杂度：O(V + E)
    空间复杂度：O(V)
    """
    visited = set()
    result = []
    
    def dfs(node):
        if node in visited:
            return
        
        visited.add(node)
        result.append(node)
        
        # 遍历所有邻居
        for neighbor in graph.get(node, []):
            dfs(neighbor)
    
    dfs(start)
    return result
```

### 矩阵的 DFS

```python
from typing import List

def dfs_matrix(matrix: List[List[int]], row: int, col: int) -> int:
    """
    矩阵的深度优先搜索
    """
    rows, cols = len(matrix), len(matrix[0])
    visited = set()
    
    def dfs(r, c):
        # 边界检查
        if (r < 0 or r >= rows or 
            c < 0 or c >= cols or 
            (r, c) in visited or
            matrix[r][c] == -1):  # -1 表示障碍物
            return 0
        
        visited.add((r, c))
        
        # 处理当前格子
        count = 1
        
        # 四个方向递归
        count += dfs(r + 1, c)  # 下
        count += dfs(r - 1, c)  # 上
        count += dfs(r, c + 1)  # 右
        count += dfs(r, c - 1)  # 左
        
        return count
    
    return dfs(row, col)
```

### 回溯模板

```python
from typing import List

def backtrack_template(nums: List[int]) -> List[List[int]]:
    """
    回溯算法通用模板
    用于排列、组合、子集等问题
    """
    result = []
    path = []
    
    def backtrack(start_index):
        # 1. 终止条件
        if satisfy_condition():
            result.append(path[:])  # 记录答案（需要拷贝）
            return
        
        # 2. 遍历所有选择
        for i in range(start_index, len(nums)):
            # 剪枝
            if should_prune(i):
                continue
            
            # 3. 做选择
            path.append(nums[i])
            
            # 4. 递归
            backtrack(i + 1)  # 或 i（可重复选择）
            
            # 5. 撤销选择（回溯）
            path.pop()
    
    backtrack(0)
    return result

def satisfy_condition() -> bool:
    """判断是否满足终止条件。
    注意：应依据当前 path 判断，例如 len(path) == k 或 len(path) == len(nums)。
    需要访问 path 时，可改为闭包嵌套在 backtrack 外层，或将其作为参数传入。"""
    return True

def should_prune(i: int) -> bool:
    """判断是否需要剪枝。
    例：组合题中"剩余元素不够"时提前终止；需要用到 path 时同样建议改为嵌套闭包。"""
    return False
```

### 全排列

```python
def permute(nums: List[int]) -> List[List[int]]:
    """
    全排列：不重复元素
    时间复杂度：O(n * n!)
    """
    result = []
    path = []
    used = [False] * len(nums)
    
    def backtrack():
        # 终止条件：路径长度等于数组长度
        if len(path) == len(nums):
            result.append(path[:])
            return
        
        for i in range(len(nums)):
            # 剪枝：跳过已使用的元素
            if used[i]:
                continue
            
            # 做选择
            path.append(nums[i])
            used[i] = True
            
            # 递归
            backtrack()
            
            # 撤销选择
            path.pop()
            used[i] = False
    
    backtrack()
    return result
```

### 组合

```python
def combine(n: int, k: int) -> List[List[int]]:
    """
    组合：从 1...n 中选 k 个数
    """
    result = []
    path = []
    
    def backtrack(start):
        # 终止条件：路径长度等于 k
        if len(path) == k:
            result.append(path[:])
            return
        
        # 剪枝：剩余元素不够了
        for i in range(start, n + 1):
            if n - i + 1 < k - len(path):
                break
            
            # 做选择
            path.append(i)
            
            # 递归：从 i+1 开始（避免重复）
            backtrack(i + 1)
            
            # 撤销选择
            path.pop()
    
    backtrack(1)
    return result
```

### 子集

```python
def subsets(nums: List[int]) -> List[List[int]]:
    """
    子集：返回所有子集
    """
    result = []
    path = []
    
    def backtrack(start):
        # 每个节点都是一个答案
        result.append(path[:])
        
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()
    
    backtrack(0)
    return result
```

### 岛屿问题

```python
def num_islands(grid: List[List[str]]) -> int:
    """
    岛屿数量：计算连通区域个数
    """
    if not grid or not grid[0]:
        return 0
    
    rows, cols = len(grid), len(grid[0])
    count = 0
    
    def dfs(r, c):
        # 边界检查
        if (r < 0 or r >= rows or 
            c < 0 or c >= cols or 
            grid[r][c] != '1'):
            return
        
        # 标记为已访问
        grid[r][c] = '0'
        
        # 四个方向递归
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)
    
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    
    return count
```

### 路径和

```python
def has_path_sum(root: Optional[TreeNode], target: int) -> bool:
    """
    路径和：判断是否存在根到叶节点的路径，和为 target
    """
    if not root:
        return False
    
    # 叶子节点
    if not root.left and not root.right:
        return root.val == target
    
    # 递归左右子树
    return (has_path_sum(root.left, target - root.val) or
            has_path_sum(root.right, target - root.val))
```

### DFS 关键点

#### 1. 何时使用 DFS

- ✅ 树的遍历
- ✅ 图的遍历
- ✅ 路径搜索
- ✅ 排列组合
- ✅ 回溯问题

#### 2. 递归三要素

1. **递归函数的参数和返回值**
2. **终止条件**
3. **单层递归逻辑**

#### 3. 前中后序的选择

- **前序**：需要向下传递信息
- **中序**：BST 的有序遍历
- **后序**：需要向上返回信息

#### 4. 回溯关键

- 做选择 → 递归 → 撤销选择
- 一定要撤销选择，恢复状态

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把数组换成你自己的，
逐步看每一帧的状态怎么变。三种遍历的差别只有「访问根」那一句放在哪。把输入的顺序改成前序 / 中序 / 后序，看访问序列怎么变 —— 中序在二叉搜索树上是有序的，这不是巧合。下面还有一个回溯（子集）播放器：回溯就是「选 → 递归 → 撤销」三步一组，撤销那一步被漏掉时画面会立刻自相矛盾。
