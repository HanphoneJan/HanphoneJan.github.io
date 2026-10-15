---
title: 多组 带空格的字符串（T 组形式）
platform: NowCoder
difficulty: 入门
id: PIO13
url: https://www.nowcoder.com/practice/cff28a28d7f54419a640a8bb19f4275f
tags:
  - 输入输出
  - 字符串
  - 模拟
topics: []
patterns: []
date_added: 2026-10-16
date_reviewed: []
---

# PIO13. 多组 带空格的字符串（T 组形式）

## 题目描述

给定 T 组询问，每次给出一个长度为 n 的带空格的字符串 s（仅含小写英文字符
和空格，且首尾都不是空格），请你去掉空格之后，将其倒置并输出。

## 输入格式

第一行一个整数 T。
随后 T 组数据。每组的第一行有一个整数 n。
每组的第二行有一个字符串 s（可能包含空格）。

## 输出格式

输出 T 行，每行一个字符串，代表「去掉空格并倒置」后的 s。

## 示例

### 示例 1

**输入：**
```
3
9
one space
11
two  spaces
14
three   spaces
```

**输出：**
```
ecapseno
secapsowt
secapseerht
```

**说明：**
`one space` 去掉空格得 `onespace`，倒置为 `ecapseno`；
`two  spaces` 去掉空格得 `twospaces`，倒置为 `secapsowt`；以此类推。

---

## 解题思路

### 第一步：理解问题本质

和上一题相比，唯一的区别是字符串**含空格**，所以顺序很重要：
先把空格全部去掉，再倒置。两句的顺序不能反 —— 先倒置再去空格
虽然结果**恰好**一样（去空格和倒置互不干扰），但按题意先去掉空格更自然。

### 第二步：为什么不能用 `read().split()`

读整数时常用的 `sys.stdin.read().split()` 会把**空格当成 token 分隔符**，
`one space` 会被切成 `["one", "space"]` 两个 token，
之后无论怎么读都拼不回原来的字符串。

所以含空格的字符串必须**逐行读**：

```python
input = sys.stdin.readline
```

### 第三步：一行完成去空格 + 倒置

```python
s.replace(" ", "")[::-1]
```

`replace(" ", "")` 把所有空格删掉，`[::-1]` 再倒置，链式调用一气呵成。

---

## 完整代码实现

```python
import sys


def solve() -> None:
    """读取 T 组带空格的字符串，去空格后倒置输出"""
    input = sys.stdin.readline
    t_line = input()
    if not t_line:
        return
    t = int(t_line)
    out = []
    for _ in range(t):
        _n = int(input())                  # 长度，仅用于读掉这一行
        s = input().rstrip("\n")           # 整行读取，保留中间的空格
        out.append(s.replace(" ", "")[::-1])
    sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    solve()
```

---

## 示例推演

以 `two  spaces` 为例（注意中间是两个空格）：

| 步骤 | 结果 |
|------|------|
| 原字符串 | `two  spaces` |
| 去掉所有空格 | `twospaces` |
| 倒置 | `secapsowt` |

结果与样例一致。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 去空格 + 切片倒置 | O(n) | O(n) | 推荐 |

> n 为单个字符串长度；多组时为 Σn。

---

## 易错点总结

### 1. 用 `split()` 读字符串

`read().split()` 会把空格吃掉，导致读进来的字符串缺字。
含空格的字符串必须 `readline` 整行读。

### 2. 顺序颠倒

先倒置再去空格虽然结果一样，但严格按题意应先去掉空格；
如果题目还要求保留其它空白字符，顺序就可能影响结果。

### 3. 只去掉一个空格

`replace(" ", "")` 去掉的是**所有**空格，
不能用 `s.replace(" ", "", 1)` 只删一个。

---

## 扩展思考

- 如果要去掉的是「任意空白」（空格、制表符、换行），可以用正则
  `re.sub(r"\s+", "", s)`。
- 处理「按空格切词再输出」的题（如单词倒排）时，恰好相反：
  这时用 `split()` 更方便。

---

## 相关题目

- [PIO11. 多组 字符串倒置（T 组形式）](PIO11.多组_字符串_T组形式.md)
- [HJ31. 单词倒排](../华为机试/HJ31.单词倒排.md)
