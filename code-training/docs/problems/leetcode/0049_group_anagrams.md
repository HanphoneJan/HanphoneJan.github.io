---
title: 49. 字母异位词分组
platform: LeetCode
difficulty: Medium
id: 49
url: https://leetcode.cn/problems/group-anagrams/
tags:
  - 数组
  - 字符串
  - 哈希表
  - 排序
topics: []
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/sorting.md
date_added: 2026-03-25
date_reviewed: []
---

# 49. 字母异位词分组

## 题目描述

给你一个字符串数组，请你将**字母异位词**组合在一起。可以按任意顺序返回结果列表。

字母异位词是由重新排列源单词的所有字母得到的一个新单词。

**提示：**

- `1 <= strs.length <= 10^4`
- `0 <= strs[i].length <= 100`
- `strs[i]` 仅包含小写英文字母

## 示例

### 示例 1

**输入：** strs = ["eat","tea","tan","ate","nat","bat"]

**输出：** [["bat"],["nat","tan"],["ate","eat","tea"]]

### 示例 2

**输入：** strs = [""]

**输出：** [[""]]

### 示例 3

**输入：** strs = ["a"]

**输出：** [["a"]]

## 解题思路

字母异位词的定义就是「字母组成相同、顺序不同」，那么把它们按字母排序之后，得到的串一定一模一样。于是问题变成最简单的分组：给每个串算一个**规范键**，键相同的放一组。键用哈希表存，一次遍历就够了。

### 键取「排序后的串」

`"eat"`、`"tea"`、`"ate"` 排序后都是 `"aet"`，`"tan"`、`"nat"` 都是 `"ant"`。排序把「顺序」这个干扰项彻底去掉了，剩下的就是字母组成本身。

```python
key = ''.join(sorted(s))       # 排序后拼成字符串
groups.setdefault(key, []).append(s)
```

`join` 这一步不能省：`sorted(s)` 返回的是**列表**，列表不可哈希，直接拿去当下标就是 `TypeError: unhashable type: 'list'`。拼成字符串（或 `tuple(sorted(s))`）才能当字典的键。

### 用 `defaultdict` 省掉「先判断再建列表」

```python
groups = defaultdict(list)
for s in strs:
    groups[''.join(sorted(s))].append(s)
return list(groups.values())
```

缺键时自动建空列表，比 `if key not in groups: groups[key] = []` 少两行。返回 `list(groups.values())` 即可——题面允许任意顺序。

### 另一种键：26 个字母的计数

既然只比较字母组成，也可以把每个字母的出现次数做成键：

```python
count = [0] * 26
for ch in s:
    count[ord(ch) - ord('a')] += 1
key = tuple(count)
```

两种键的分工：排序键 `O(k log k)` 一行写完，适合 `k` 小的场景（本题 `k <= 100`）；计数键 `O(k)`，字符集固定为 26 时更快，但要写一个循环。两者都正确，键的「不可变」要求完全一样。

### 推演：示例 1 的键

| 字符串 | 排序后 | 键 |
| --- | --- | --- |
| eat | aet | `"aet"` |
| tea | aet | `"aet"` |
| ate | aet | `"aet"` |
| tan | ant | `"ant"` |
| nat | ant | `"ant"` |
| bat | abt | `"abt"` |

按插入顺序分组，`"aet"` 组是 `[eat, tea, ate]`，`"ant"` 组是 `[tan, nat]`，`"abt"` 组只有 `[bat]`。三组就是答案，组内顺序取决于输入顺序，题面不要求。

## 完整代码实现

```python
from collections import defaultdict
from typing import List


class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for s in strs:
            key = ''.join(sorted(s))   # 排序后的串作规范键；列表不可哈希，必须拼成字符串
            groups[key].append(s)
        return list(groups.values())
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 两两比较是否互为异位词 | O(n² · k log k) | O(n · k) | 每个串都要和已有分组逐一比 |
| 排序后的串作键（最优） | O(n · k log k) | O(n · k) | 每个串排序一次，哈希均摊 O(1) |
| 26 个字母计数作键 | O(n · k) | O(n · k) | 字符集固定时省掉排序；键是长度 26 的元组 |

`n` 是字符串个数，`k` 是最长串长度。

## 易错点总结

### 1. 直接拿 `sorted(s)` 当键

`groups[sorted(s)].append(s)` 会抛 `TypeError: unhashable type: 'list'`——排序结果是列表，字典的键必须可哈希。要么 `''.join(sorted(s))`，要么 `tuple(sorted(s))`。

### 2. 往组里放的是排序后的串

`groups[key].append(''.join(sorted(s)))` 把 `"eat"` 存成了 `"aet"`，示例 1 会输出 `[["aet","aet","aet"],["ant","ant"],["abt"]]`，元素全变了。键用排序结果，**值必须存原串**。

## 扩展思考

- 计数键还有一种紧凑写法：把 26 个计数拼成字符串 `"1#0#0#..."`，避免元组比较的开销；本质相同。
- 若字符串里可能出现任意 Unicode 字符，26 位的计数表就不够用了，此时排序键更省心。
