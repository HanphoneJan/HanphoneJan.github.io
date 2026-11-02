---
title: 6. Z 字形变换
platform: LeetCode
difficulty: Medium
id: 6
url: https://leetcode.cn/problems/zigzag-conversion/
tags:
  - 字符串
  - 模拟
topics: []
patterns: []
date_added: 2026-03-20
date_reviewed: []
---

# 0006. Z 字形变换

## 题目描述

将一个给定字符串 `s` 按从上往下、从左到右的 Z 字形排列成 `numRows` 行，再从左往右逐行读取，拼成新的字符串。

## 示例

### 示例 1

**输入：** s = "PAYPALISHIRING", numRows = 3
**输出：** "PAHNAPLSIIGYIR"
**解释：** 排列成三行后逐行读：

```text
P   A   H   N
A P L S I I G
Y   I   R
```

### 示例 2

**输入：** s = "PAYPALISHIRING", numRows = 4
**输出：** "PINALSIGYAHRPI"
**解释：**

```text
P     I    N
A   L S  I G
Y A   H R
P     I
```

### 示例 3

**输入：** s = "A", numRows = 1
**输出：** "A"

## 解题思路

### 路线：先定每个字符落在第几行

输出是按行拼接的，同一个字符在答案里的位置只由它落在第几行决定，列完全不影响结果。所以整道题只剩一个问题：`s[i]` 在第几行？

行号的轨迹是 `0, 1, ..., numRows-1, numRows-2, ..., 0, 1, ...` 往复。把它看成一部在 `0` 层与 `numRows-1` 层之间往返的电梯：每到端点就换向，中间层只经过、不停留。

顺着这个画面有两条路：让电梯真的走一遍，记住「当前层 + 方向」；或者直接从下标算出层号，连方向都不用存。

### 手法一：让行号走一遍

每个字符做三件事：

1. **落格**：把字符接在当前行的末尾；
2. **换向**：当前行是 `0` 就朝下，是 `numRows-1` 就朝上；
3. **走一层**：行号加上方向。

```python
rows = [''] * numRows
row, step = 0, 1
for ch in s:
    rows[row] += ch          # ① 落格
    if row == 0:
        step = 1             # ② 到顶，朝下
    elif row == numRows - 1:
        step = -1            # ② 到底，朝上
    row += step              # ③ 走一层
```

`numRows == 1` 时电梯的顶和底是同一层：`row == 0` 既满足「到顶」也满足「到底」，而代码只会把它判成朝下，`row` 走到 1 就越界。这一类输入必须在进循环之前原样返回。

### 手法二：从下标算出层号

往复是有周期的：走完一个来回要 `2 * (numRows - 1)` 步。记周期为 `T`，下标 `i` 在周期里的位置是 `r = i % T`：

- `r < numRows`：还在往下走，行号就是 `r`；
- `r >= numRows`：已经在往回走，行号是 `T - r`。

```python
period = 2 * (numRows - 1)
for i, ch in enumerate(s):
    r = i % period
    row = r if r < numRows else period - r
    rows[row] += ch
```

同样的 `numRows == 1` 会让 `period` 变成 0，`i % 0` 直接抛 `ZeroDivisionError`，所以那条提前返回在这里同样不能少。

### 推演：示例 1 的 14 个字符

`s = "PAYPALISHIRING"`，`numRows = 3`，`T = 4`。按手法二的公式逐个定位：

| `i` | 字符 | `r = i % 4` | 行号 | 落格后该行 |
| --- | --- | --- | --- | --- |
| 0 | P | 0 | 0 | `rows[0] = "P"` |
| 1 | A | 1 | 1 | `rows[1] = "A"` |
| 2 | Y | 2 | 2 | `rows[2] = "Y"` |
| 3 | P | 3 | 1 | `rows[1] = "AP"` |
| 4 | A | 0 | 0 | `rows[0] = "PA"` |
| 5 | L | 1 | 1 | `rows[1] = "APL"` |
| 6 | I | 2 | 2 | `rows[2] = "YI"` |
| 7 | S | 3 | 1 | `rows[1] = "APLS"` |
| 8 | H | 0 | 0 | `rows[0] = "PAH"` |
| 9 | I | 1 | 1 | `rows[1] = "APLSI"` |
| 10 | R | 2 | 2 | `rows[2] = "YIR"` |
| 11 | I | 3 | 1 | `rows[1] = "APLSII"` |
| 12 | N | 0 | 0 | `rows[0] = "PAHN"` |
| 13 | G | 1 | 1 | `rows[1] = "APLSIIG"` |

三行分别是 `"PAHN"`、`"APLSIIG"`、`"YIR"`，拼起来就是 `"PAHNAPLSIIGYIR"`。

中间行在同一个周期里被访问两次（`r = 1` 与 `r = 3`），这两个下标关于 `numRows-1 = 2` 对称——这正是手法二里 `r` 与 `T - r` 两条分支的来源。

## 完整代码实现

```python
class Solution:
    def convert(self, s: str, numRows: int) -> str:
        # 单行时电梯的顶和底重合，没有往复可走
        if numRows == 1:
            return s

        rows = [''] * numRows
        row, step = 0, 1

        for ch in s:
            rows[row] += ch          # ① 落格
            if row == 0:
                step = 1             # ② 到顶，朝下
            elif row == numRows - 1:
                step = -1            # ② 到底，朝上
            row += step              # ③ 走一层

        return ''.join(rows)
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 行号折返（最优） | O(n) | O(n) | 每个字符追加一次，最后拼接一次；`rows` 的总长度就是 `n` |
| 周期直接算行号 | O(n) | O(n) | 不维护方向状态，行号由下标算出；空间同为输出本身 |

## 易错点总结

### 1. 漏掉 `numRows == 1` 的提前返回

`numRows = 1` 时 `row == 0` 分支把 `step` 设成 1，下一轮 `rows[1]` 就抛 `IndexError`；换成周期写法则是 `i % 0` 抛 `ZeroDivisionError`。两种写法都要在循环前挡掉这一种输入，而不是在循环里特判。

### 2. 先换向、后落格

把 ② 挪到 ① 前面，第一个字符 `P` 就会被放到第 1 行，`rows[0]` 从空串开始。示例 1 的输出会变成 `"PSIPYAIHRNALIG"`——长度仍然是 14，只有逐字比对才看得出。

### 3. 周期写法把 `i % numRows` 当行号

`numRows = 3` 时 `i % 3` 给出 `0,1,2,0,1,2,...`，看起来也像「在三行之间循环」，但它没有回程：`i = 3` 会落到第 0 行，而正确位置是第 1 行。示例 1 从第 4 个字符起就与答案不同。

## 扩展思考

要单独取出第 `r` 行，不必把整串走一遍：一个周期里它只出现两次，下标分别是 `r + kT` 与 `(T - r) + kT`（`r = 0` 或 `r = numRows-1` 时两组重合）。按这两条等差数列直接取字符，就能只花 `O(该行长度)` 的空间拼出答案。

## 相关题目

- [54. 螺旋矩阵](0054_spiral_matrix.md)：同样是「按固定路径走、到边界换向」，只是方向有四个
- [48. 旋转图像](0048_rotate_image.md)：二维下标变换，可以先定位再落格
