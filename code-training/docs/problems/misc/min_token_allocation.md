---
title: 最小 Token 分配
platform: 自定义
difficulty: Easy
id: min-token-allocation
url: ""
tags:
  - 贪心
  - 双指针
topics: []
patterns:
  - ../../patterns/greedy.md
  - ../../patterns/two_pointers.md
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

### 非正数把数组切成互不影响的段

约束只发生在**相邻的两个正数**之间。优先级为 0 或负数的任务不分配 token，它左右两边的正数任务也不再相邻，所以可以把数组按非正数切开，每一段单独处理，最后把各段的 token 数相加。

例如 `[1, 0, 2]` 被切成 `[1]` 和 `[2]` 两段，各分配 1 个，答案是 2；中间那个 0 既不参与比较，也不占 token。

### 每一段就是「分发糖果」

固定一段正数 `a[l..r]`，要求：

- 每个位置至少 1 个 token；
- 若 `a[i] > a[i-1]`，则 `t[i] > t[i-1]`；
- 若 `a[i] > a[i+1]`，则 `t[i] > t[i+1]`。

如果只从左往右扫，能保证「上升」方向正确，但下降方向会漏：`[5,4,3,2,1]` 会全部分到 1。只从右往左扫则反过来。两个方向都必须满足，所以扫两遍：

1. **从左到右**：遇到 `a[i] > a[i-1]` 就令 `t[i] = t[i-1] + 1`，处理所有上升沿；
2. **从右到左**：遇到 `a[i] > a[i+1]` 就令 `t[i] = max(t[i], t[i+1] + 1)`，处理所有下降沿。

第二遍必须取 `max`，不能直接赋值：一个位置可能同时比左边和右边高（山峰），第一遍已经给它算过一个较大的值，直接覆盖会把它压小。

```python
def solve_segment(a, l, r):
    """处理正数段 a[l:r]，返回这一段的最小 token 列表。"""
    m = r - l
    t = [1] * m

    # 上升沿：右边比左边高，右边至少多 1
    for i in range(1, m):
        if a[l + i] > a[l + i - 1]:
            t[i] = t[i - 1] + 1

    # 下降沿：左边比右边高，左边至少多 1；取 max 保住上升沿的结果
    for i in range(m - 2, -1, -1):
        if a[l + i] > a[l + i + 1]:
            t[i] = max(t[i], t[i + 1] + 1)

    return t
```

**为什么这样最小**：每个位置的 token 下界由它和邻居的差决定。上升沿要求它至少比左边多 1，下降沿要求它至少比右边多 1；两遍扫描分别取到了这两个下界，最后取较大者，正好是同时满足两边的最小值。没有额外加 1 的空间，所以总和最小。

外层只需要扫描一次，找到每一段正数的 `[l, r)`：

```python
def min_total_tokens(priorities):
    n = len(priorities)
    total = 0
    i = 0
    while i < n:
        if priorities[i] <= 0:
            i += 1
            continue
        l = i
        while i < n and priorities[i] > 0:
            i += 1
        total += sum(solve_segment(priorities, l, i))
    return total
```

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

### 示例 1：`1,2,2`

整段都是正数，初始 `t = [1,1,1]`。

**从左到右：**

| 位置 | 比较 | `t` |
|---|---|---|
| 1 | `2 > 1` | `[1,2,1]` |
| 2 | `2 > 2` 不成立 | `[1,2,1]` |

**从右到左：**

| 位置 | 比较 | `t` |
|---|---|---|
| 1 | `2 > 2` 不成立 | `[1,2,1]` |
| 0 | `1 > 2` 不成立 | `[1,2,1]` |

总和 `1+2+1 = 4`。

### 示例 2：`1,0,2`

非正数把数组切成 `[1]` 和 `[2]` 两段：

- `[1]`：只有一个元素，`t = [1]`；
- `[2]`：只有一个元素，`t = [1]`。

两段相加是 2。中间的 0 不分配 token，也不把两段连起来比较。

### 示例 3：`5,4,3,2,1`

整段是严格递减，初始 `t = [1,1,1,1,1]`。

- 从左到右没有上升沿，`t` 不变；
- 从右到左，每个位置都比右边高，依次得到 `[5,4,3,2,1]`。

总和 15。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 分段 + 双向扫描（最优） | O(N) | O(N) | 每个正数位置被左右各扫一次；`tokens` 数组存结果 |
| 只扫一遍 | O(N) | O(N) | 只能满足一个方向，下降段会分配不足 |

---

## 易错点总结

1. **把非正数当成 1 参与比较**：`[1,0,2]` 里如果给 0 也分配 1 个，并把 `1→0→2` 当成连续段，第二个位置会被迫拿到比 1 大的 token，答案从 2 变成 3 以上。非正数必须直接跳过并切断分段。
2. **第二遍从右往左直接赋值**：写成 `t[i] = t[i+1] + 1` 会覆盖第一遍在上升沿算出的较大值。山峰形 `[1,3,1]` 会从 `[1,2,1]` 被改成 `[2,2,1]`，第一个位置多拿 1 个。
3. **比较符写成 `>=`**：相邻优先级相等时不需要更多 token，`1,2,2` 的第三个位置应为 1；用 `>=` 会把它抬到 3，答案变成 6。

---

## 扩展思考

- **环形数组变体**：首尾也相邻时，先找最小值的位置断开，再按线性问题处理；或者分类讨论环上的山峰。
- **token 有上限**：如果每个任务最多 5 个 token，需要先判断约束是否可满足，再在分配时截断。
- **LeetCode 135 Candy**：同一套双向扫描，只是输入输出格式不同。

---

## 相关题目

- [LeetCode 135. Candy](https://leetcode.com/problems/candy/) — 经典贪心问题
