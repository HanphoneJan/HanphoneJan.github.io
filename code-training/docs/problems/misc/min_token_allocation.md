---
title: 最小 Token 分配
platform: 自定义
difficulty: 简单
id: min-token-allocation
url: ""
tags:
  - 贪心
  - 双指针
topics:
  - ../../topics/greedy.md
patterns:
  - ../../patterns/two-pass-greedy.md
date_added: 2025-04-30
date_reviewed: []
---

# 最小 Token 分配

## 题目描述

给定一个任务优先级列表 `priorities`，其中 `priorities[i]` 表示第 `i` 个任务的优先级。现在需要为每个任务分配 token，规则如下：

1. 每个正优先级任务至少分配 1 个 token。
2. 优先级为 0 或负数的任务不需要 token。
3. 对于连续的正优先级任务，如果某个任务的优先级高于其相邻任务，则它需要比相邻任务更多的 token。

目标是计算满足上述条件所需的最小 token 总数。

## 输入格式

- 一行：逗号分隔的整数 `priorities`

## 输出格式

- 一个整数，表示最小 token 总数

## 示例

### 示例 1

**输入：**
```
1,2,2
```

**输出：**
```
4
```

**说明：**
三个任务都需要 token。第一个和第三个优先级较低，各分配 1 个；第二个优先级高于第一个，分配 2 个。总计 $1 + 2 + 1 = 4$。

### 示例 2

**输入：**
```
1,0,2
```

**输出：**
```
2
```

**说明：**
中间任务优先级为 0，不需要 token。第一个和第三个各分配 1 个，总计 2。

### 示例 3

**输入：**
```
5,4,3,2,1
```

**输出：**
```
15
```

**说明：**
严格递减序列，分配 $[5, 4, 3, 2, 1]$，总计 15。

---

## 解题思路

### 第一步：理解问题本质

本题是经典的"分发糖果"（Candy）问题的 ACM 变体。核心约束是：相邻的正优先级任务中，优先级高的必须获得更多 token。由于存在双向约束（左邻和右邻），需要双向遍历才能正确求解。

### 第二步：暴力解法

枚举所有可能的 token 分配方案，检查是否满足约束。时间复杂度指数级，不可行。

### 第三步：最优解法 — 双遍历贪心

**关键观察：**
- 非正数任务之间互不影响，可以将优先级序列拆分为若干独立的**连续正数段**
- 对每个正数段，问题等价于经典 Candy 问题：相邻元素中较大者需更多 token

**算法步骤：**
1. 扫描数组，提取所有连续正数段
2. 对每个正数段：
   - 从左到右遍历：若右侧优先级更高，则右侧 token = 左侧 + 1
   - 从右到左遍历：若左侧优先级更高，则左侧 token = max(当前值, 右侧 + 1)
3. 累加所有 token

**为什么正确？**
- 从左到右保证满足"右侧高于左侧"的约束
- 从右到左保证满足"左侧高于右侧"的约束
- 取最大值确保同时满足两个方向的约束

---

## 完整代码实现

```python
"""
最小 Token 分配 - 贪心双遍历

输入格式：
- 一行：逗号分隔的整数 priorities

输出格式：
- 一个整数，表示最小 token 总数
"""

import sys

def min_total_tokens(priorities):
    """计算满足条件的最小 token 总数"""
    n = len(priorities)
    tokens = [0] * n

    i = 0
    while i < n:
        # 跳过非正数任务
        if priorities[i] <= 0:
            i += 1
            continue

        # 找到一个连续的正数段
        start = i
        while i < n and priorities[i] > 0:
            i += 1
        end = i

        # 处理这一段 [start, end)
        seg_len = end - start
        seg_tokens = [1] * seg_len

        # 从左到右：右侧优先级更高时递增
        for j in range(start + 1, end):
            if priorities[j] > priorities[j - 1]:
                seg_tokens[j - start] = seg_tokens[j - start - 1] + 1

        # 从右到左：左侧优先级更高时取最大值
        for j in range(end - 2, start - 1, -1):
            if priorities[j] > priorities[j + 1]:
                seg_tokens[j - start] = max(
                    seg_tokens[j - start],
                    seg_tokens[j - start + 1] + 1
                )

        # 赋值回原数组
        for j in range(start, end):
            tokens[j] = seg_tokens[j - start]

    return sum(tokens)

def main():
    line = sys.stdin.readline().strip()
    if not line:
        print(0)
        return
    priorities = list(map(int, line.split(',')))
    result = min_total_tokens(priorities)
    print(result)

if __name__ == "__main__":
    main()
```

---

## 示例推演

以输入 `1,2,2` 为例：

**提取正数段：** `[1, 2, 2]`（整个数组都是正数）

**从左到右遍历：**
| 位置 | priorities | 条件 | token |
|------|-----------|------|-------|
| 0 | 1 | 初始值 | 1 |
| 1 | 2 | 2 > 1 ✓ | 1 + 1 = 2 |
| 2 | 2 | 2 > 2 ✗ | 保持 1 |

结果：`[1, 2, 1]`

**从右到左遍历：**
| 位置 | priorities | 条件 | token |
|------|-----------|------|-------|
| 2 | 2 | 初始值 | 1 |
| 1 | 2 | 2 > 2 ✗ | 保持 2 |
| 0 | 1 | 1 > 2 ✗ | 保持 1 |

结果仍为：`[1, 2, 1]`

**总计：** $1 + 2 + 1 = 4$

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 暴力 | O(N!) | O(N) | 枚举所有分配方案 |
| 双遍历贪心 | O(N) | O(N) | 线性扫描，每个元素最多访问两次 |

---

## 易错点总结

### 1. 0 和负数的处理

非正数任务不需要 token，且作为分隔符将数组拆成多个独立的正数段。

### 2. 相等优先级的处理

相邻任务优先级相等时，不需要更多的 token，各分配 1 个即可。

### 3. 双遍历的方向

不能只从左到右或只从右到左，必须两次遍历才能同时满足两个方向的约束。

### 4. 从右到左时的 max

第二遍遍历时要用 `max(当前值, 右侧 + 1)`，而不是直接赋值，避免破坏第一遍已经满足的条件。

---

## 扩展思考

- **环形数组变体：** 如果数组是环形的（首尾相邻），问题更复杂，需要分类讨论。
- **评分范围限制：** 如果 token 有上限（如最多 5 个），需要额外的处理逻辑。
- **LeetCode 135：** 原题 Candy 的 ACM 版本，输入输出格式不同但核心思想一致。

---

## 相关题目

- [LeetCode 135. Candy](https://leetcode.com/problems/candy/) — 经典贪心问题
