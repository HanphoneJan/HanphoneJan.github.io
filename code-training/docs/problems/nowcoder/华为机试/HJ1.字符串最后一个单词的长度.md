---
title: 字符串最后一个单词的长度
platform: NowCoder
difficulty: 入门
id: HJ1
url: https://www.nowcoder.com/practice/8c949ea5f36f422594b306a2300315da
tags:
  - 字符串
  - 双指针
topics: []
patterns: []
date_added: 2026-04-27
date_reviewed: []
---

# HJ1. 字符串最后一个单词的长度

## 题目描述

计算字符串最后一个单词的长度，单词以空格隔开，字符串长度小于 5000。

## 输入格式

一行字符串，末尾可能有空格，单词之间以空格分隔。

## 输出格式

整数 N，表示最后一个单词的长度。

## 示例

### 示例 1

**输入：**
```
HelloNowcoder
```

**输出：**
```
13
```

### 示例 2

**输入：**
```
Hello World
```

**输出：**
```
5
```

### 示例 3

**输入：**
```
   fly me   to   the moon
```

**输出：**
```
4
```

---

## 解题思路

### 第一步：理解问题本质

题目要求找到字符串中"最后一个单词"的长度。单词由空格分隔，末尾可能有空格。这意味着：
- 需要先去除末尾空格，再找到最后一个单词
- 或者直接从末尾开始遍历，跳过末尾空格，统计最后一个单词的字符数

### 第二步：暴力解法

使用 `split()` 方法分割字符串，取最后一个元素：

```python
def last_word_split(line):
    words = line.split()
    return len(words[-1]) if words else 0
```

**问题**：`split()` 会创建所有单词的列表，空间复杂度 O(n)，且需要扫描整个字符串。

### 第三步：优化解法 —— 逆向遍历

从字符串末尾开始遍历，跳过末尾空格，遇到第一个空格时停止计数：

```python
def last_word(line):
    line = line.strip()  # 去除首尾空格
    count = 0
    for ch in reversed(line):
        if ch == ' ':
            break
        count += 1
    return count
```

**优势**：不需要创建额外的列表，空间复杂度 O(1)。

---

## 完整代码实现

```python
import sys


def last_word(line: str) -> int:
    """计算字符串最后一个单词的长度（逆向遍历法，最优）"""
    if not line:
        return 0

    line = line.strip()  # 去除首尾空格
    count = 0

    # 从后向前遍历，遇到第一个空格停止
    for ch in reversed(line):
        if ch == ' ':
            break
        count += 1

    return count


def last_word_split(line: str) -> int:
    """使用 split 方法的解法（简洁但空间复杂度较高）"""
    words = line.split()
    return len(words[-1]) if words else 0


if __name__ == "__main__":
    for line in sys.stdin:
        print(last_word(line))
```

---

## 示例推演

以输入 `"   fly me   to   the moon  "` 为例：

**步骤 1**：`strip()` 去除首尾空格 → `"fly me   to   the moon"`

**步骤 2**：从末尾开始逆向遍历：

| 步骤 | 字符 | 操作 | count |
|------|------|------|-------|
| 1    | 'n'  | 计数+1 | 1    |
| 2    | 'o'  | 计数+1 | 2    |
| 3    | 'o'  | 计数+1 | 3    |
| 4    | 'm'  | 计数+1 | 4    |
| 5    | ' '  | 遇到空格，停止 | 4    |

**结果**：最后一个单词 `"moon"` 的长度为 4。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| split 法 | O(n) | O(n) | 创建单词列表，代码最简洁 |
| 逆向遍历 | O(n) | O(1) | 最优解法，无额外空间 |

> n 为字符串长度

---

## 易错点总结

### 1. 忽略末尾空格

```python
# 错误：没有 strip，末尾空格会导致错误
for ch in reversed(line):  # 如果 line 末尾有空格，会先遇到空格
```

**解决**：先用 `strip()` 去除首尾空格。

### 2. 空字符串处理

如果输入为空字符串或全空格，`split()` 返回空列表，`words[-1]` 会报错。需要加判断：

```python
return len(words[-1]) if words else 0
```

### 3. 混淆 `strip()` 和 `rstrip()`

- `strip()`：去除首尾空格
- `rstrip()`：仅去除尾部空格

本题两种情况都可以，因为开头的空格不影响从末尾遍历的结果。

---

## 扩展思考

- **如何找到倒数第二个单词的长度？** 使用 `split()` 取倒数第二个元素更简单。
- **如果单词间有多个空格怎么办？** `split()` 会自动处理多个空格；逆向遍历法不受影响。
- **如果要求不创建额外空间？** 严格 O(1) 空间只能使用逆向遍历法。

---

## 相关题目

- [HJ11. 数字颠倒](HJ11.数字颠倒.md)
- [HJ85. 最长回文子串](HJ85.最长回文子串.md)
