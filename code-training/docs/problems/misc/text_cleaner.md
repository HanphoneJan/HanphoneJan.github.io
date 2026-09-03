---
title: 数据清洗引擎 – 文档过滤与去重
platform: 自定义
difficulty: 中等
id: text-cleaner
url: ""
tags:
  - 字符串处理
  - 正则表达式
  - 去重
topics:
  - ../../topics/string-processing.md
patterns:
  - ../../patterns/multi-stage-filtering.md
date_added: 2025-04-30
date_reviewed: []
---

# 数据清洗引擎 – 文档过滤与去重

## 题目描述

某数据清洗系统需要对输入文档进行多阶段过滤与去重处理，规则如下：

1. **空格规范化：** 将文档中所有连续空白字符（空格、制表符、换行等）替换为单个空格，并去除首尾空格。
2. **长度过滤：** 规范化后的文档长度必须在 $[L, R]$ 范围内（包含端点），否则丢弃。
3. **语义单词提取：** 从规范化文档中提取所有连续字母数字序列作为语义单词（保留大小写用于显示，判断时用小写）。
4. **黑名单拦截：** 如果文档中存在任何语义单词出现在黑名单中（大小写不敏感），整篇文档丢弃。
5. **3-gram 复读惩罚：** 将文档的语义单词序列按连续 3 个一组划分（3-gram），如果某个 3-gram 出现次数超过 $M$ 次，则整篇文档丢弃。
6. **规范化语义去重：** 将文档的语义单词全部转为小写，如果该序列已出现过，则丢弃。

## 输入格式

- 第1行：5个整数 $N\ L\ R\ M\ K$（文档数、最小长度、最大长度、3-gram 阈值、黑名单词数）
- 第2行：$K$ 个黑名单词（空格分隔，$K=0$ 时可能无此行）
- 接下来 $N$ 行：每行一篇原始文档

## 输出格式

- 过滤后保留的所有文档，每行一篇，按原始顺序输出

## 示例

### 示例 1

**输入：**
```
3 10 100 2 1
spam
Buy cheap SPAM!!!
He is a spammer
He is, A! Spammer.
```

**输出：**
```
He is a spammer
```

**说明：**
- 第1篇 "Buy cheap SPAM!!!"：包含黑名单词 spam（大小写不敏感），丢弃
- 第2篇 "He is a spammer"：通过所有检查
- 第3篇 "He is, A! Spammer."：语义单词序列与第2篇相同（he/is/a/spammer），去重丢弃

### 示例 2

**输入：**
```
2 10 200 2 0
a b c a b c a b c
a b c a b c
```

**输出：**
```
a b c a b c
```

**说明：**
- 第1篇 "a b c a b c a b c"：3-gram (a,b,c) 出现 3 次，超过阈值 2，丢弃
- 第2篇 "a b c a b c"：3-gram (a,b,c) 出现 2 次，未超过阈值，保留

---

## 解题思路

### 第一步：理解问题本质

本题是一个多阶段流水线处理的问题。每个文档依次经过 6 个过滤阶段，任一阶段不通过即被丢弃。需要严格按照顺序执行，且每个阶段的判断逻辑不同。

### 第二步：暴力解法

直接按题意逐阶段实现即可。本题没有算法复杂度上的挑战，主要是正确实现每个规则。

### 第三步：最优解法

按顺序实现 6 个过滤阶段：

1. **空格规范化：** `re.sub(r'\s+', ' ', text).strip()`
2. **长度过滤：** `L <= len(text) <= R`
3. **语义提取：** `re.findall(r'[A-Za-z0-9]+', text)`
4. **黑名单检查：** `any(word.lower() in blacklist for word in words)`
5. **3-gram 复读：** 用字典计数，任一元组出现次数 > M 即丢弃
6. **去重：** 用小写单词元组作为 key，已出现过则丢弃

---

## 完整代码实现

```python
"""
数据清洗引擎 – 文档过滤与去重

输入格式：
- 第1行：N L R M K
- 第2行：K 个黑名单词（空格分隔）
- 接下来 N 行：每行一篇原始文档

输出格式：
- 过滤后保留的所有文档，每行一篇
"""

import sys
import re
from collections import defaultdict

def solve():
    data = sys.stdin
    first_line = data.readline()
    if not first_line:
        return
    N, L, R, M, K = map(int, first_line.split())

    blacklist = set()
    if K > 0:
        blackline = data.readline()
        blacklist = set(blackline.strip().split())

    docs = []
    for _ in range(N):
        line = data.readline()
        docs.append(line.rstrip('\n'))

    seen_sequences = set()
    output_lines = []

    for raw in docs:
        # 1. 空格规范化
        normalized = re.sub(r'\s+', ' ', raw).strip()
        if not (L <= len(normalized) <= R):
            continue

        # 2. 语义单词提取
        words = re.findall(r'[A-Za-z0-9]+', normalized)
        words_lower = [w.lower() for w in words]

        # 3. 独立黑名单拦截
        if any(w in blacklist for w in words_lower):
            continue

        # 4. 3-gram 复读惩罚
        if len(words_lower) >= 3:
            counter = defaultdict(int)
            too_many = False
            for i in range(len(words_lower) - 2):
                gram = (words_lower[i], words_lower[i+1], words_lower[i+2])
                counter[gram] += 1
                if counter[gram] > M:
                    too_many = True
                    break
            if too_many:
                continue

        # 5. 规范化语义去重
        seq_tuple = tuple(words_lower)
        if seq_tuple in seen_sequences:
            continue
        seen_sequences.add(seq_tuple)

        output_lines.append(normalized)

    sys.stdout.write("\n".join(output_lines))

if __name__ == "__main__":
    solve()
```

---

## 示例推演

以样例 1 为例：

**输入：**
- $N=3, L=10, R=100, M=2, K=1$
- 黑名单：`spam`
- 文档：
  1. "Buy cheap SPAM!!!"
  2. "He is a spammer"
  3. "He is, A! Spammer."

**文档 1 处理：**
1. 规范化："Buy cheap SPAM!!!"（长度 18，通过）
2. 语义单词：["Buy", "cheap", "SPAM"]
3. 黑名单检查："spam" 在黑名单中 ✗ → 丢弃

**文档 2 处理：**
1. 规范化："He is a spammer"（长度 16，通过）
2. 语义单词：["He", "is", "a", "spammer"]
3. 黑名单检查：无黑名单词 ✓
4. 3-gram 检查：(he,is,a), (is,a,spammer)，各出现 1 次 $\leq$ 2 ✓
5. 去重：序列 (he, is, a, spammer) 未出现过 ✓ → 保留

**文档 3 处理：**
1. 规范化："He is, A! Spammer." → "He is, A! Spammer."（长度 19，通过）
2. 语义单词：["He", "is", "A", "Spammer"]
3. 黑名单检查：无黑名单词 ✓
4. 3-gram 检查：各出现 1 次 $\leq$ 2 ✓
5. 去重：序列 (he, is, a, spammer) 已出现过 ✗ → 丢弃

**最终输出：** "He is a spammer"

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 多阶段过滤 | O(N · W²) | O(N · W) | N 为文档数，W 为单篇文档单词数 |

---

## 易错点总结

### 1. 黑名单大小写不敏感

黑名单匹配时，需要将语义单词转为小写后再比较。

### 2. 3-gram 的计数

是连续 3 个单词组成的三元组，不是任意 3 个单词的组合。例如 "a b c a b c" 的 3-gram 只有 (a,b,c) 出现 2 次。

### 3. 规范化后的长度

长度过滤基于空格规范化后的长度，不是原始长度。

### 4. K=0 的处理

黑名单词数为 0 时，第二行可能不存在，需要特殊处理避免读空行。

---

## 扩展思考

- **N-gram 变体：** 可以泛化为 N-gram 复读检测，调整滑动窗口大小即可。
- **模糊匹配：** 黑名单可以用正则表达式实现更灵活的匹配规则。
- **分布式处理：** 大规模文档清洗可以并行化处理每篇文档。

---

## 相关题目

- [最大传播链](max_propagation_chain.md) — 图论相关
