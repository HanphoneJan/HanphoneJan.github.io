---
title: 反序输出
platform: NowCoder
difficulty: 入门
id: KY4
url: https://www.nowcoder.com/practice/171278d170c64d998ab342b3b40171bb
tags:
  - 字符串
topics: []
patterns: []
date_added: 2026-09-25
date_reviewed: []
---

# KY4. 反序输出

## 题目描述

输入任意 4 个字符（如 `abcd`），按反序输出（如 `dcba`）。题目可能包含多组用例，每组用例占一行。

## 输入格式

多行，每行 4 个任意字符。

## 输出格式

对每组输入，输出一行反序后的字符串。

## 示例

### 示例 1

**输入：**
```
Upin
cvYj
WJpw
cXOA
```

**输出：**
```
nipU
jYvc
wpJW
AOXc
```

---

## 解题思路

### 第一步：理解问题本质

把每行字符串整体反转输出。这是字符串最基础的操作。

### 第二步：暴力解法

用双指针从头尾交换字符，手动实现反转。可行但代码冗长。

### 第三步：最优解法（切片反转）

Python 切片 `[::-1]` 一步完成反转，最简洁高效：

```python
for line in sys.stdin:
    s = line.rstrip('\n')
    print(s[::-1])
```

`[::-1]` 表示从头到尾、步长 -1，即逆序取整个字符串。

---

## 完整代码实现

```python
import sys


def solve():
    for line in sys.stdin:
        s = line.rstrip('\n').rstrip('\r')
        print(s[::-1])


if __name__ == "__main__":
    solve()
```

---

## 示例推演

以 `Upin` 为例：`[::-1]` 逆序取字符 → `nipU`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 双指针反转 | O(n) | O(1) | 需手动实现 |
| 切片反转 | O(n) | O(n) | 一行完成，简洁 |

> n 为字符串长度

---

## 易错点总结

### 1. 忘记去换行符
`input()` 读入带换行，若不 `strip()`/`rstrip('\n')`，反序后换行符会跑到行首。

### 2. 多组用例
题目含多组用例，需用 `for line in sys.stdin` 循环处理，不能只读一行。

---

## 扩展思考

- `[::-1]` 反转也可用于回文判断：`s == s[::-1]`。
- 若只反转单词顺序（而非字符），可用 `s.split()[::-1]`。

---

## 相关题目

- [HJ1. 字符串最后一个单词的长度](../华为机试/HJ1.字符串最后一个单词的长度.md)