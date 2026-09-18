---
title: 递归
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 树
  - 分治
  - 动态规划
last_updated: 2026-03-05
---

# 递归

## 模式概述

递归是指**函数调用自身**来解决问题的方法，核心思想是：把一个大问题**分解**成若干个结构相同的子问题，逐层向下求解，再逐层向上返回结果。

## 核心特点

- **函数调用自身**：解决问题的代码与子问题的代码完全相同，只是规模更小
- **终止条件**：必须有一个"不能再分解"的基准情形（base case），否则无限递归
- **递推关系**：当前问题的解由子问题的解组合而成
- **依赖调用栈**：每次调用占用栈帧，递归过深会栈溢出（Python 默认递归深度约 1000）

## 递归三要素

| 要素 | 说明 | 例子 |
|------|------|------|
| **终止条件** | 最小子问题的直接答案 | `n <= 1` 返回 `1` |
| **递推公式** | 当前问题如何由子问题推出 | `fact(n) = n * fact(n-1)` |
| **递归调用** | 向更小规模调用自身 | `fact(n-1)` |

> 写递归先写**终止条件**，再写**递推公式**——只要这两点明确，代码就顺理成章。

## 基本模板

### 线性递归（一个子问题）

```python
def linear_recursion(n):
    # 1. 终止条件
    if base_case(n):
        return base_value
    
    # 2. 递推：向更小规模调用自身
    return combine(n, linear_recursion(n - 1))
```

### 树形递归（多个子问题）

```python
def tree_recursion(root):
    # 1. 终止条件
    if not root:
        return base_value
    
    # 2. 递归多个子问题（如左右子树）
    left = tree_recursion(root.left)
    right = tree_recursion(root.right)
    
    # 3. 合并子问题的结果
    return merge(left, right, root.val)
```

### 分治模板

```python
def divide_conquer(problem):
    # 1. 终止条件：问题足够小，直接求解
    if problem.is_trivial():
        return problem.solve_directly()
    
    # 2. 分解：拆成若干子问题
    sub_problems = problem.split()
    
    # 3. 求解：递归处理每个子问题
    sub_results = [divide_conquer(sub) for sub in sub_problems]
    
    # 4. 合并：把子问题的解组合成原问题的解
    return problem.merge(sub_results)
```

## 实战案例

### 案例 1：阶乘（线性递归）

```python
def factorial(n: int) -> int:
    """n! = n * (n-1)!，递归体现"大事化小" """
    if n <= 1:            # 终止条件
        return 1
    return n * factorial(n - 1)   # 递推公式
```

### 案例 2：斐波那契数列（树形递归）

```python
def fib(n: int) -> int:
    if n <= 1:                        # 终止条件
        return n
    return fib(n - 1) + fib(n - 2)    # 两个子问题，呈指数级调用树

# 注意：朴素的 fib(50) 会慢到无法运行（O(2^n)）。
# 大量重复子问题 → 用记忆化（@lru_cache）优化为 O(n)，见"优化"一节
```

### 案例 3：树的最大深度（分治 + 后序合并）

```python
def max_depth(root) -> int:
    if not root:                 # 终止条件：空树深度为 0
        return 0
    left = max_depth(root.left)  # 求左子树深度
    right = max_depth(root.right)  # 求右子树深度
    return max(left, right) + 1  # 合并：当前深度 = 较深子树 + 1
```

### 案例 4：反转链表（后序，先递归后处理）

```python
def reverse_list(head):
    if not head or not head.next:   # 终止条件：空链表或单节点
        return head
    
    new_head = reverse_list(head.next)  # 先反转后面的链表
    
    # 后序位置：让当前节点指向自己（核心是切断并反转指向）
    head.next.next = head
    head.next = None
    
    return new_head
```

## 递归的优化

### 1. 记忆化（自顶向下）

```python
from functools import lru_cache

@lru_cache(maxsize=None)   # 缓存相同参数的返回值，避免重复计算
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)   # 复杂度从 O(2^n) 降到 O(n)
```

### 2. 尾递归 / 迭代（自底向上）

```python
def fib_iter(n: int) -> int:
    """把递归改写成迭代，避免栈溢出，O(n)"""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

> Python **不优化尾递归**，所以深递归应优先改写为迭代或加记忆化，避免栈溢出。

## 递归 vs 迭代

| 特性 | 递归 | 迭代 |
|------|------|------|
| 实现 | 函数调用自身 | 循环 |
| 代码 | 简洁、贴近数学定义 | 稍繁琐，需手动维护状态 |
| 栈 | 占用调用栈，可能溢出 | 不额外占用（O(1) 空间） |
| 适用 | 树、分治、回溯 | 线性遍历、动态规划 |

## 递归 vs 回溯 vs 分治

- **递归**：一种"实现手段"（函数自调用）
- **分治**：一种"分解策略"（拆成子问题再合并），用递归实现
- **回溯**：递归 + **撤销选择**（枚举所有路径），在递归的每一层做"选/不选"

## 时间复杂度分析

- **线性递归**：O(n)，每次只调一个子问题
- **树形递归**：O(n)（若每个节点 O(1)），如树遍历
- **多分支递归**：可能 O(branch^depth)，如朴素斐波那契 O(2^n)，需记忆化
- **主定理**：`T(n) = a·T(n/b) + f(n)` 可用于分治复杂度分析

## 常见错误

- ❌ **忘记终止条件** → 无限递归 / 栈溢出
- ❌ **终止条件写错边界**（如 `n <= 1` 写成 `n < 1`）
- ❌ **递推公式不正确**，子问题未向基准情形收敛
- ❌ **递归深度过大**（Python 默认 ~1000）→ 改用迭代或记忆化
- ❌ 在递归中**共享可变状态**（如列表）未及时恢复，导致状态污染

## 相关知识点

- [DFS 模式](dfs)
- [回溯模式](backtracking)
- [树](../topics/tree)
- [动态规划](../topics/dynamic_programming)

## 练习题目

**简单：**
- 爬楼梯
- 反转链表
- 二叉树的最大深度

**中等：**
- 两两交换链表中的节点
- 二叉树展开为链表
- 不同的二叉搜索树

**困难：**
- 正则表达式匹配
- 二叉树中的最大路径和

## 要点总结

- ✅ 递归 = 终止条件 + 递推公式
- ✅ 先写终止条件，再写递推关系
- ✅ 树形问题天然适合递归（前中后序）
- ✅ 大量重复子问题时用记忆化优化
- ✅ Python 不优化尾递归，深递归用迭代