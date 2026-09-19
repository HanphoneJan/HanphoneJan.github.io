---
title: 字符串
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-03-23
---
# 字符串

## 知识点概述

字符串是字符序列的抽象表示，常见操作包括索引、匹配、分割和拼接。

在 Python 中字符串是**不可变**对象：任何"修改"（拼接、替换、切片）都会创建新字符串。因此循环中用 `s += c` 是 O(n²)，应改用 `''.join(list)`（O(n)）。

### 核心特性

- **不可变**：无法原地修改，所有操作返回新字符串
- **可索引 / 可切片**：`s[i]`、`s[a:b]`、`s[::-1]`
- **支持 `in` 与比较**：`sub in s`、字典序比较
- **字符本质是长度为 1 的字符串**：Python 没有单独的 char 类型

### 时间复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| `s[i]` 索引 | O(1) | 按偏移计算地址 |
| `s[a:b]` 切片 | O(k)，k=长度 | 创建新字符串 |
| `s1 + s2` / `join` | O(n+m) | 创建新字符串 |
| `sub in s` / `find` | O(n·m) 最坏 | CPython 用优化过的 Boyer-Moore-Horspool |
| `split` / `replace` | O(n) | 线性扫描 |

## 常见考点

- **双指针与滑动窗口**：最长不重复子串、最小覆盖子串
- **子串与子序列**：区分连续（子串）与不连续（子序列）
- **字符计数与映射**：用哈希表统计字符频率（字母异位词）
- **字符串匹配**：BF / KMP
- **回文**：中心扩展、双指针

## 常用操作速查

```python
# 统计 / 查找
s.count('a')              # 子串出现次数
s.find('a')               # 第一个匹配下标，找不到返回 -1
s.index('a')              # 同 find，找不到抛 ValueError
s.startswith(prefix)      # 是否以 prefix 开头
s.endswith(suffix)        # 是否以 suffix 结尾

# 分割 / 拼接
s.split(',')              # 按分隔符切
''.join(list)             # 列表拼接成字符串（比 += 高效）

# 大小写 / 判断
s.lower()                 # 转小写（比较时常用，避免大小写干扰）
s.isdigit()               # 是否全为数字

# 字符 ↔ 数值
ord('a')                  # 97，字符转 ASCII
chr(97)                   # 'a'，ASCII 转字符
```

## 字符串匹配算法

### BF（暴力匹配）

O(n·m)，简单但效率低，仅适合小规模数据。

```python
def bf_match(s: str, p: str) -> int:
    """在 s 中找模式串 p，返回首个匹配下标，找不到返回 -1"""
    n, m = len(s), len(p)
    for i in range(n - m + 1):
        if s[i:i + m] == p:   # 逐位比较
            return i
    return -1
```

### KMP 算法

利用**前缀函数（next 数组）**避免重复匹配，O(n+m)。

```python
def kmp_search(s: str, p: str) -> int:
    """KMP 匹配，返回 p 在 s 中首次出现的下标，找不到返回 -1"""
    n, m = len(s), len(p)
    if m == 0:
        return 0

    # 1. 构建 next 数组：next[i] = p[:i] 的最长相等前后缀长度
    next_ = [0] * m
    j = 0  # 前缀长度（也是已匹配长度）
    for i in range(1, m):
        while j > 0 and p[i] != p[j]:
            j = next_[j - 1]      # 回退到次长前后缀
        if p[i] == p[j]:
            j += 1
        next_[i] = j

    # 2. 匹配主串
    j = 0
    for i in range(n):
        while j > 0 and s[i] != p[j]:
            j = next_[j - 1]      # 匹配失败，按 next 回退（不用回溯主串 i）
        if s[i] == p[j]:
            j += 1
        if j == m:                # 完全匹配
            return i - m + 1
    return -1
```

> **核心思想**：匹配失败时，主串指针**不回溯**，只把模式串指针回退到"最长相等前后缀"处，从而把暴力法的 O(n·m) 降到 O(n+m)。算法题中多数字符串匹配可直接用 `find` / `index`，手写 KMP 主要考查对前缀函数的理解。

## 解题技巧

### 技巧 1：字母计数（哈希表）

用 `Counter` 或数组下标 `[ord(c)-ord('a')]` 统计频率，是判断异位词、覆盖子串的基石。

```python
from collections import Counter
Counter(s) == Counter(t)              # 判断字母异位词

# 更省空间：用长度 26 的数组（仅限小写字母）
cnt = [0] * 26
for c in s:
    cnt[ord(c) - ord('a')] += 1
```

### 技巧 2：子串 vs 子序列

- **子串**：连续，用滑动窗口/双指针
- **子序列**：不连续，用动态规划（如最长公共子序列）

### 技巧 3：回文判断

```python
def is_palindrome(s: str) -> bool:
    return s == s[::-1]               # 直接反转比较

def is_palindrome_range(s: str, l: int, r: int) -> bool:
    """双指针判断区间 [l, r] 是否为回文（中心扩展法的子步骤）"""
    while l < r:
        if s[l] != s[r]:
            return False
        l += 1
        r -= 1
    return True
```

### 技巧 4：进制转换

```python
int("ff", 16)              # 十六进制字符串转整数 => 255
int("1010", 2)             # 二进制字符串转整数 => 10
format(10, 'b')            # 整数转二进制字符串 => '1010'
```

## 相关知识点

- [数组](array.md)
- [哈希表](hash_table.md)
- [双指针模式](../patterns/two_pointers.md)
- [滑动窗口模式](../patterns/sliding_window.md)
- [Python 数据结构速查](../review/Python数据结构速查.md)

## 题目列表

按难度分类：

**简单：**
- [3. 无重复字符的最长子串](../problems/leetcode/0003_longest_substring_without_repeating_characters.md)
- 有效的括号
- 字符串转换整数 (atoi)

**中等：**
- 字母异位词分组
- 最长回文子串
- 字符串的排列

**困难：**
- 最小覆盖子串
- 正则表达式匹配

## 学习资源

- [几道常见的字符串算法题 | JavaGuide](https://javaguide.cn/cs-basics/algorithms/string-algorithm-problems.html)
- LeetCode 字符串专题