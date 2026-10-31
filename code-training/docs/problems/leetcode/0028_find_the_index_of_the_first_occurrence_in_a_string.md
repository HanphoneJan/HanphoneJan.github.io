---
title: 28. 找出字符串中第一个匹配项的下标
platform: LeetCode
difficulty: Easy
id: 28
url: https://leetcode.cn/problems/find-the-index-of-the-first-occurrence-in-a-string/
tags:
  - 字符串
  - 双指针
  - 字符串匹配
  - KMP 算法
  - Boyer–Moore 算法
  - 扩展 KMP
topics: []
patterns:
  - ../../patterns/two_pointers.md
date_added: 2026-09-29
date_reviewed: []
---

# 28. 找出字符串中第一个匹配项的下标

## 题目描述

给你两个字符串 `haystack` 和 `needle`，请你在 `haystack` 字符串中找出 `needle` 字符串的第一个匹配项的下标（下标从 0 开始）。如果 `needle` 不是 `haystack` 的一部分，则返回 `-1`。

## 示例

**示例 1：**
```
输入：haystack = "sadbutsad", needle = "sad"
输出：0
```

**示例 2：**
```
输入：haystack = "leetcode", needle = "leeto"
输出：-1
```

---

## 解题思路

### 输出是什么，怎么判对

返回 `needle` 在 `haystack` 里**第一次**出现的起点下标，找不到返回 `-1`。判定标准只有一条：从 `left` 开始的连续 `len(needle)` 个字符与 `needle` 逐位相等。

「第一个」这三个字意味着从左往右扫、**一旦命中就返回**：不需要收集全部出现位置再取最小，也就没有「在多个解之间取舍」的问题。真正的成本全在另一件事上——某一次比较失败之后，下一次该从哪儿开始比。

### 朴素窗口：失败一次，就把比对过的信息全丢掉

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        n, m = len(haystack), len(needle)
        for left in range(n - m + 1):                  # 右端 left + m 最远取到 n
            if haystack[left:left + m] == needle:      # 整窗比较交给 C 层的切片
                return left
        return -1
```

它的最坏情况长这样：`haystack = "aaaaaab"`、`needle = "aaab"`。

| left | 窗口内容 | 结果 |
|---|---|---|
| 0 | `aaaa` | 比到第 4 个字符才失败（`a` ≠ `b`） |
| 1 | `aaaa` | 又比到第 4 个才失败 |
| 2 | `aaaa` | 还是比到第 4 个才失败 |
| 3 | `aaab` | 全部相等，返回 3 |

每个窗口都要比到 `m - 1` 个字符才发现失败，把长度放大就是 `O(n·m)`。而失败时丢掉的东西其实是**免费拿到的信息**：`left = 1` 那一轮重新比的前三个字符，上一轮刚刚确认过它们等于 `needle` 的前三个字符。

Python 的切片比较在 C 层完成，常数很小，本题 `n ≤ 10⁴` 实际跑得很快；但「重新比一遍」这件事在算法上是可以消掉的，消掉它的办法就是 KMP。

### KMP：失配时保留「已经对上的那一截」

假设现在比到 `needle[k]` 失配，说明 `haystack` 刚走过的这一段已经确认等于 `needle[0..k-1]`。下一轮不必从 `needle[0]` 重头来：只要找一个 `k' < k`，使得 `needle[0..k'-1]` 同时是 `needle[0..k-1]` 的**后缀**，那么刚比过的尾巴就已经等于 `needle` 的前 `k'` 个字符，可以直接从 `needle[k']` 接着比。

`k'` 取最大的那个，这就是前缀函数：

> `pi[i]` = `needle[:i+1]` 的最长**真**前缀的长度，且这个前缀同时是 `needle[:i+1]` 的后缀。

`"aaab"` 的 `pi` 是 `[0, 1, 2, 0]`：`"aaa"` 的最长「前缀 = 后缀」是 `"aa"`，长度 2。所以第 4 个字符 `b` 失配时，已对上的长度从 3 退到 2，而不是退到 0——前两个 `a` 不用再比。

`pi` 自己也要用同一套思路算：先看 `needle[i]` 能不能接在已对上的长度 `j` 后面；接不上就沿着 `pi` 链往回退，退到能接上为止。

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        m = len(needle)
        if m == 0:
            return 0

        # 1) 前缀函数：pi[i] 是 needle[:i+1] 的最长「真前缀 = 后缀」长度
        pi = [0] * m
        j = 0
        for i in range(1, m):
            while j and needle[i] != needle[j]:
                j = pi[j - 1]          # 接不上，退到次长的候选
            if needle[i] == needle[j]:
                j += 1                 # 接上了，长度加一
            pi[i] = j

        # 2) 扫描 haystack：j 表示「此刻已经对上 needle 的前 j 个字符」
        j = 0
        for i, ch in enumerate(haystack):
            while j and ch != needle[j]:
                j = pi[j - 1]          # 失配只退 j，i 绝不回头
            if ch == needle[j]:
                j += 1
            if j == m:
                return i - m + 1       # i 是匹配的最后一个字符，起点要减 m-1
        return -1
```

三处具体决策，对应三行代码：

- `while j and ch != needle[j]: j = pi[j - 1]`——退的位置不是「`k - 1`」而是 `pi[k - 1]`，后者才是「既仍然对得上、又最长」的那个后缀长度；`j` 退到 0 就停下，此时连 `needle[0]` 都要重新比。
- `if ch == needle[j]: j += 1`——对上才前进；`i` 每轮固定加 1，从头到尾不回退。
- `return i - m + 1`——`i` 停在匹配成功的最后一个字符上，起点是它左边第 `m - 1` 个位置。

**为什么是 `O(n + m)`**：`i` 每轮加 1、一次不减；`j` 每轮最多加 1，所以整个主循环里 `j` 加起来不超过 `n`，而每次回退至少让 `j` 减 1，回退总次数也就不超过 `n`。加在一起是线性的。`pi` 的构造是同一个论证，代价 `O(m)`。

### 一行 `str.find`：工程里最快的那个选择

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        return haystack.find(needle)
```

CPython 的 `str.find` 走 `fastsearch`：短模式串用带位图过滤的 Horspool 式扫描，长模式串切到 Two-Way（Crochemore–Perrin），最坏情况同样是 `O(n + m)`。所以在 Python 里它的复杂度不比手写 KMP 差，实际还更快（全在 C 里跑）。

代价是这套东西交不出推导：面试追问「为什么是线性的」，一行 `find` 答不上来；换个语言也未必成立——Java 的 `String.indexOf` 就是朴素的逐位比较，最坏 `O(n·m)`。所以三种写法的分工是：面试写 KMP，工程代码用 `find`，朴素窗口用来对照和铺垫问题。

---

## 完整代码实现

下面第一份是朴素滑动窗口（本题数据范围下提交也能过），追加的第二份是 KMP。

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        # 先取好两个长度，循环里反复用到
        length = len(haystack)
        window = len(needle)
        # 空模式串在任意位置都算匹配，按题意返回 0
        if window == 0:
            return 0
        # 长串比模式还短，任何窗口都装不下它
        if length < window:
            return -1
        # left 是窗口起点；右端 left+window 最远取到 length，不能越界
        for left in range(0, length - window + 1):
            # 整窗比较交给切片，比较在 C 层完成，比手写逐字符快
            if needle == haystack[left:left + window]:
                return left
        # 所有窗口都比过，说明 needle 不在 haystack 中
        return -1
```

```python
class Solution:
    def strStrKMP(self, haystack: str, needle: str) -> int:
        """KMP：先用 O(m) 造前缀函数，再 O(n) 扫描，指针不回退。"""
        m = len(needle)
        if m == 0:
            return 0

        pi = [0] * m
        j = 0
        for i in range(1, m):
            while j and needle[i] != needle[j]:
                j = pi[j - 1]
            if needle[i] == needle[j]:
                j += 1
            pi[i] = j

        j = 0
        for i, ch in enumerate(haystack):
            while j and ch != needle[j]:
                j = pi[j - 1]
            if ch == needle[j]:
                j += 1
            if j == m:
                return i - m + 1
        return -1
```

---

## 示例推演

### 第一组：`haystack = "sadbutsad"`、`needle = "sad"`

前缀函数 `pi("sad") = [0, 0, 0]`（`"s"`、`"sa"` 都没有「真前缀 = 后缀」的部分）。扫描过程：

| i | `ch` | 比对 | 失配回退 | 之后 `j` |
|---|---|---|---|---|
| 0 | `s` | `needle[0] = s` 相同 | 无 | 1 |
| 1 | `a` | `needle[1] = a` 相同 | 无 | 2 |
| 2 | `d` | `needle[2] = d` 相同 | 无 | 3 = m |

`j` 第一次等于 `m`，返回 `i - m + 1 = 2 - 3 + 1 = 0`。朴素窗口这一组也是第 0 号窗口就命中，两者都是 0。

### 第二组：`haystack = "leetcode"`、`needle = "leeto"`

前缀函数 `pi("leeto") = [0, 0, 0, 0, 0]`：`"l"` 与后面任何字符都不相等，所以每个位置都退到 0。扫描过程：

| i | `ch` | 与 `needle[j]` 比 | 之后 `j` |
|---|---|---|---|
| 0 | `l` | `needle[0] = l` 相同 | 1 |
| 1 | `e` | `needle[1] = e` 相同 | 2 |
| 2 | `e` | `needle[2] = e` 相同 | 3 |
| 3 | `t` | `needle[3] = t` 相同 | 4 |
| 4 | `c` | 与 `needle[4] = o` 不同，退到 `pi[3] = 0`；`c` 又不等于 `needle[0] = l` | 0 |
| 5 | `o` | 不等于 `l` | 0 |
| 6 | `d` | 不等于 `l` | 0 |
| 7 | `e` | 不等于 `l` | 0 |

扫完仍没有 `j == 5`，返回 `-1`。这里 `i` 从 4 走到 7 一次都没有回头，是对比朴素窗口时最该注意的地方。

### 回退真的会跳到中间位置：`haystack = "aaab"`、`needle = "aab"`

`pi("aab") = [0, 1, 0]`。

| i | `ch` | 过程 | `j` |
|---|---|---|---|
| 0 | `a` | 与 `needle[0]` 相同 | 1 |
| 1 | `a` | 与 `needle[1]` 相同 | 2 |
| 2 | `a` | 与 `needle[2] = b` 不同 → `j = pi[1] = 1`；此时 `a == needle[1]` → 前进 | 2 |
| 3 | `b` | 与 `needle[2] = b` 相同 | 3 = m |

返回 `3 - 3 + 1 = 1`，即 `"aaab"` 里从下标 1 开始的 `"aab"`。第 2 步的失配没有把 `j` 清零，而是退到 1，正是因为 `"aa"` 的后缀 `"a"` 仍然是 `needle` 的前缀。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 朴素滑动窗口 | O(n·m) | O(1) | 每个起点都从头比，最坏要比到第 `m-1` 个字符才失败 |
| KMP（最优） | O(n+m) | O(m) | 前缀函数摊掉了重复比较，主串指针只前进 |
| `str.find` | O(n+m) | O(1) | CPython 内置实现，工程上最快，但交不出推导 |

> `n = len(haystack)`，`m = len(needle)`。

---

## 易错点总结

1. **回退写成 `j = pi[j]` 而不是 `pi[j-1]`**：`j` 是「已经对上的长度」，要查的是这 `j` 个字符自己的答案，即 `pi[j-1]`；`pi[j]` 多算了一位，而 `pi[j]` 可能正好等于 `j`，于是 `j` 原地不动、`while` 永远退不出去。`needle = "aab"` 时 `pi[1] = 1`，构造前缀函数走到第 3 个字符就会卡死在 `j = pi[1] = 1` 上——页面上表现为一直转圈，力扣报超时。
2. **窗口右界少写 `+1`**：`range(n - m + 1)` 写成 `range(n - m)`，最后一个可能的起点被漏掉。`haystack = "aaasad"`、`needle = "sad"` 的答案正好在 `n - m = 3` 这个起点上，改完直接返回 `-1`。
3. **KMP 命中后返回 `i` 而不是 `i - m + 1`**：`i` 是匹配的**最后**一个字符。第一组样例 `"sadbutsad"` 会返回 2 而不是 0——返回值看着像个合法下标，所以错得很隐蔽。

---

## 相关题目

- [14. 最长公共前缀](0014_longest_common_prefix.md)
