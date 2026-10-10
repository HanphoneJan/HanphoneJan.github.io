---
title: BFS 模式
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 树
  - 图
  - 矩阵
last_updated: 2026-02-25
---
# BFS（广度优先搜索）模式

## 模式概述

BFS 是一种图遍历算法，从起点开始，先访问所有相邻节点，再访问下一层的节点。

## 核心特点

- **层序遍历**：逐层访问
- **最短路径**：保证找到的是最短路径（无权图）
- **使用队列**：FIFO 数据结构

## 适用场景

1. **树的层序遍历**
2. **图的最短路径**（无权图）
3. **矩阵中的最短距离**
4. **拓扑排序**

## 基本模板

### 树的 BFS

```python
from collections import deque

def bfs_tree(root):
    if not root:
        return []
  
    result = []
    queue = deque([root])
  
    while queue:
        level_size = len(queue)  # 当前层的节点数
        current_level = []
      
        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)
          
            # 将下一层节点加入队列
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
      
        result.append(current_level)
  
    return result
```

### 图的 BFS

```python
from collections import deque

def bfs_graph(start, graph):
    visited = set([start])
    queue = deque([start])
  
    while queue:
        node = queue.popleft()
        process(node)  # 处理当前节点
      
        # 遍历所有邻居
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

### 矩阵的 BFS

```python
from collections import deque

def bfs_matrix(matrix, start_row, start_col):
    rows, cols = len(matrix), len(matrix[0])
    visited = set([(start_row, start_col)])
    queue = deque([(start_row, start_col, 0)])  # (row, col, distance)
  
    # 四个方向
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
  
    while queue:
        row, col, dist = queue.popleft()
      
        # 检查是否是目标
        if is_target(row, col):
            return dist
      
        # 遍历四个方向
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
          
            # 检查边界和访问状态
            if (0 <= new_row < rows and 
                0 <= new_col < cols and 
                (new_row, new_col) not in visited and
                matrix[new_row][new_col] != obstacle):
              
                visited.add((new_row, new_col))
                queue.append((new_row, new_col, dist + 1))
  
    return -1  # 未找到
```

## 实战案例

### 案例 1：二叉树的层序遍历

```python
def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
    if root is None:
        return []
    ans = []
    q = deque([root])
    while q:
        vals = []
        for _ in range(len(q)):
            node = q.popleft()
            vals.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        ans.append(vals)
    return ans
```

**相关题目：**

- 二叉树的层序遍历
- N 叉树的层序遍历
- 二叉树的右视图

### 案例 2：图的最短路径

```python
def shortestPath(graph, start, end):
    queue = deque([(start, 0)])
    visited = set([start])
  
    while queue:
        node, distance = queue.popleft()
      
        if node == end:
            return distance
      
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, distance + 1))
  
    return -1
```

## BFS vs DFS

| 特性       | BFS                | DFS            |
| ---------- | ------------------ | -------------- |
| 数据结构   | 队列               | 栈/递归        |
| 遍历顺序   | 逐层               | 逐深度         |
| 最短路径   | ✅ 是              | ❌ 否          |
| 空间复杂度 | O(w) 宽度          | O(h) 高度      |
| 应用场景   | 最短路径、层序遍历 | 路径搜索、回溯 |

## 解题步骤

1. **初始化队列**：将起点加入队列
2. **初始化访问集合**：标记起点已访问
3. **循环处理队列**：
   - 取出队首元素
   - 处理当前元素
   - 将未访问的邻居加入队列
4. **返回结果**

## 常见变体

### 1. 多源 BFS

从多个起点同时开始。

```python
def multi_source_bfs(sources):
    queue = deque(sources)
    visited = set(sources)
  
    while queue:
        node = queue.popleft()
        # 处理逻辑
```

### 2. 双向 BFS

从起点和终点同时搜索。

### 3. 带层数的 BFS

记录每个节点的层数。

```python
while queue:
    level_size = len(queue)
    for _ in range(level_size):
        # 处理当前层
```

## 时间与空间复杂度

- **时间复杂度**：O(V + E)，V 是顶点数，E 是边数
- **空间复杂度**：O(V)，队列和访问集合

## 相关知识点

- [树](../data-structures/tree)
- [二叉树](../data-structures/binary_tree)
- [图](../data-structures/graph)
- [DFS 模式](dfs)

## 练习题目

**简单：**

- [102. 二叉树的层序遍历](../problems/leetcode/102)
- N 叉树的层序遍历

**中等：**

- 二叉树的锯齿形层序遍历
- 腐烂的橘子
- 岛屿数量

**困难：**

- 单词接龙
- 最小基因变化

## 要点总结

- ✅ 使用队列实现
- ✅ 记录访问状态避免重复
- ✅ 适合求最短路径
- ✅ 层序遍历是 BFS 的典型应用

---

---

## 标准实现与变体

### 1. 二叉树层序遍历

#### Python

```python
from collections import deque
from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:
    """二叉树的层序遍历"""
    if not root:
        return []
  
    result = []
    queue = deque([root])
  
    while queue:
        level_size = len(queue)  # 当前层的节点数
        current_level = []
  
        # 处理当前层的所有节点
        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)
      
            # 将下一层节点加入队列
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
  
        result.append(current_level)
  
    return result
```

#### C++

```cpp
#include <vector>
#include <queue>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};

vector<vector<int>> levelOrder(TreeNode* root) {
    if (!root) return {};
  
    vector<vector<int>> result;
    queue<TreeNode*> q;
    q.push(root);
  
    while (!q.empty()) {
        int levelSize = q.size();
        vector<int> currentLevel;
  
        for (int i = 0; i < levelSize; i++) {
            TreeNode* node = q.front();
            q.pop();
            currentLevel.push_back(node->val);
      
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
  
        result.push_back(currentLevel);
    }
  
    return result;
}
```

### 2. 图的 BFS

#### Python

```python
from collections import deque
from typing import Dict, List, Set

def bfs_graph(graph: Dict[int, List[int]], start: int) -> List[int]:
    """图的广度优先搜索"""
    visited = set([start])
    queue = deque([start])
    result = []
  
    while queue:
        node = queue.popleft()
        result.append(node)
  
        # 遍历所有邻居
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
  
    return result
```

#### 带距离的 BFS

```python
def bfs_with_distance(graph: Dict[int, List[int]], 
                      start: int, 
                      end: int) -> int:
    """返回从 start 到 end 的最短距离"""
    if start == end:
        return 0
  
    visited = set([start])
    queue = deque([(start, 0)])  # (节点, 距离)
  
    while queue:
        node, distance = queue.popleft()
  
        for neighbor in graph.get(node, []):
            if neighbor == end:
                return distance + 1
      
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, distance + 1))
  
    return -1  # 不可达
```

### 3. 矩阵的 BFS

#### Python

```python
from collections import deque
from typing import List, Tuple

def bfs_matrix(matrix: List[List[int]], 
               start: Tuple[int, int]) -> List[List[int]]:
    """
    矩阵的 BFS，返回每个位置到起点的距离
    0 表示可通过，1 表示障碍
    """
    if not matrix or not matrix[0]:
        return []
  
    rows, cols = len(matrix), len(matrix[0])
    distances = [[-1] * cols for _ in range(rows)]
  
    # 初始化
    start_row, start_col = start
    distances[start_row][start_col] = 0
    queue = deque([(start_row, start_col)])
  
    # 四个方向：上、下、左、右
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  
    while queue:
        row, col = queue.popleft()
        current_dist = distances[row][col]
  
        # 遍历四个方向
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
      
            # 检查边界、障碍和访问状态
            if (0 <= new_row < rows and 
                0 <= new_col < cols and 
                matrix[new_row][new_col] == 0 and
                distances[new_row][new_col] == -1):
          
                distances[new_row][new_col] = current_dist + 1
                queue.append((new_row, new_col))
  
    return distances
```

#### C++

```cpp
#include <vector>
#include <queue>
using namespace std;

vector<vector<int>> bfsMatrix(vector<vector<int>>& matrix, 
                               pair<int, int> start) {
    if (matrix.empty() || matrix[0].empty()) return {};
  
    int rows = matrix.size(), cols = matrix[0].size();
    vector<vector<int>> distances(rows, vector<int>(cols, -1));
  
    queue<pair<int, int>> q;
    q.push(start);
    distances[start.first][start.second] = 0;
  
    // 四个方向
    vector<pair<int, int>> directions = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
  
    while (!q.empty()) {
        auto [row, col] = q.front();
        q.pop();
        int currentDist = distances[row][col];
  
        for (auto [dr, dc] : directions) {
            int newRow = row + dr;
            int newCol = col + dc;
      
            if (newRow >= 0 && newRow < rows && 
                newCol >= 0 && newCol < cols &&
                matrix[newRow][newCol] == 0 &&
                distances[newRow][newCol] == -1) {
          
                distances[newRow][newCol] = currentDist + 1;
                q.push({newRow, newCol});
            }
        }
    }
  
    return distances;
}
```

### 4. 多源 BFS

#### Python

```python
from collections import deque
from typing import List

def multi_source_bfs(matrix: List[List[int]]) -> List[List[int]]:
    """
    多源 BFS
    从所有值为 1 的位置同时开始 BFS
    返回每个位置到最近的 1 的距离
    """
    if not matrix or not matrix[0]:
        return []
  
    rows, cols = len(matrix), len(matrix[0])
    distances = [[-1] * cols for _ in range(rows)]
    queue = deque()
  
    # 将所有源点加入队列
    for i in range(rows):
        for j in range(cols):
            if matrix[i][j] == 1:
                distances[i][j] = 0
                queue.append((i, j))
  
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
  
    while queue:
        row, col = queue.popleft()
        current_dist = distances[row][col]
  
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
      
            if (0 <= new_row < rows and 
                0 <= new_col < cols and 
                distances[new_row][new_col] == -1):
          
                distances[new_row][new_col] = current_dist + 1
                queue.append((new_row, new_col))
  
    return distances
```

### 5. N 叉树的层序遍历

#### Python

```python
from collections import deque
from typing import List

class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

def levelOrder(root: Node) -> List[List[int]]:
    """N 叉树的层序遍历"""
    if not root:
        return []
  
    result = []
    queue = deque([root])
  
    while queue:
        level_size = len(queue)
        current_level = []
  
        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)
      
            # 将所有子节点加入队列
            for child in node.children:
                queue.append(child)
  
        result.append(current_level)
  
    return result
```

### 使用说明

#### 何时使用 BFS？

1. **层序遍历**：需要按层处理节点
2. **最短路径**：无权图中的最短路径
3. **连通性**：判断是否连通或找到所有连通节点
4. **最近距离**：找到最近的目标节点

#### 关键要点

1. **使用队列**：FIFO，保证层序
2. **记录访问状态**：避免重复访问
3. **记录层数**：使用 `len(queue)` 确定当前层大小
4. **边界检查**：矩阵中要检查边界

#### 常见错误

❌ 忘记标记已访问，导致死循环
❌ 在加入队列后才标记访问（应该加入时就标记）
❌ 矩阵中没有检查边界
❌ 忘记记录层数

### BFS 关键点

#### 1. 何时使用 BFS

- ✅ 树的层序遍历
- ✅ 图的最短路径（无权图）
- ✅ 矩阵中的最短距离
- ✅ 拓扑排序

#### 2. 数据结构

- **队列**：存储待访问的节点
- **集合**：记录已访问的节点（避免重复）

#### 3. 时间复杂度

- 树/图：O(V + E)，V 是顶点数，E 是边数
- 矩阵：O(m * n)

#### 4. 空间复杂度

- O(V) 或 O(m * n)，取决于队列和访问集合的大小

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把数组换成你自己的，
逐步看每一帧的状态怎么变。「待访问队列」是 BFS 的本质：先进先出决定了扩展顺序，而顺序又决定了第一次到达某格时距离就是最短。换个有障碍的地图，能看到它绕路而不是穿墙。
