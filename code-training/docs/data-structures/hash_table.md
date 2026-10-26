---
title: 哈希表
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-27
---

# 哈希表

## 定义

哈希表（hash table）是「键 → 值」的映射结构，它把「查找」从逐项比对改写为一次计算：用**哈希函数** `hash(key)` 把键映射成数组下标，取值落到该下标处。理想的分布下每一次操作只花常数步，这就是 O(1) 的来源。

它不是免费承诺，前提有两条：**哈希函数要散得开、负载因子要能控制**。任何一条落空，所有键挤进桶的最坏情形都升到 O(n)。

| 操作 | 平均 | 最坏 | 说明 |
|------|------|------|------|
| 查找 / 插入 / 删除 | O(1) | O(n) | 最坏 = 所有键同落一桶 |
| 遍历 | O(n) | — | 顺序与插入顺序无关（dict 是语言承诺的例外，见下） |

## 底层的三个环节

### 哈希函数：键 → 下标

`index = hash(key) % 桶数`。哈希函数的标准只有两条：**分布均匀**（不同键尽量不同桶）、**计算快**。Python 内建哈希用「MAD（乘加散列）+ 异或混淆」一类经过验证的公式；面试不必自己发明，但要能讲原则。

入口先明确一个约束：**键必须可哈希**——对象要在生命周期内不可变，哈希值才稳定。Python 里 `list`、`dict`、`set` 可原地变，不可哈希；`tuple`、`str`、数字、`frozenset` 可哈希。所以「坐标对当键」必须写 `d[(i, j)]`，写 `d[[i, j]]` 直接 TypeError。

### 冲突处理：两个键哈希到同一个下标

碰撞是必然事件（键数远大于桶可表示的下标理想分布），两派标准解法：

| | 拉链法 | 开放寻址 |
|---|---|---|
| 做法 | 每个桶挂一条链（或小列表），同下标的键都排在链里 | 碰撞后按**探测序列**找下一空位（线性探测 / 二次探测 / 双重哈希） |
| 优点 | 负载因子可 > 1；删除简单 | 内存紧凑、无链表跳转，缓存友好 |
| 缺点 | 指针多、缓存不友好 | 删除需墓碑标记；表近满时性能骤降 |
| 代表实现 | Java HashMap、手写版 | **CPython 的 dict / set** |

**负载因子（load factor）= 元素数 / 桶数**。拉链法工程常见阈值约 0.75 开始扩容；开放寻址必须压在 1 以下且离 1 较远——线性探测在 0.8 以上会串成长簇段。

### 扩容 rehash：重新哈希，不是拷贝

负载因子过阈值就申请新桶（通常翻倍）、**把每个键用新桶数重新算一遍下标**。这一步必然是重算而非拷贝：下标依赖「对桶数取模」，桶数一变所有位置都变。单次 rehash O(n)，均摊到每次插入仍是 O(1)——与动态数组扩容同样的算账法。

## CPython dict / set 有哪些值得知道的事实

- **dict 用开放寻址**（探测序列），桶结构里直接存 index 表——紧凑、缓存友好
- **Python 3.7 起 dict 保证插入顺序**：实现副产品被转正为语言承诺；**set 仍是无序的**，不要把 dict 的经验搬到 set
- **哈希随机化**：`str` / `bytes` 的哈希值每个进程各不相同（防哈希碰撞 DoS），所以哈希值不能做持久化
- `defaultdict` / `Counter` 是写题最常用的两个变体，前者省「缺键先建空」样板、后者自带 `most_common`

```python
from collections import defaultdict, Counter

cnt = defaultdict(int)       # 缺键给 0
for w in words:
    cnt[w] += 1

groups = defaultdict(list)   # 缺键给空列表

Counter('aabbcc').most_common(2)   # [('a', 2), ('b', 2)]
```

## 题型一：规范化键的分组

一类题的骨架是把每个元素先算成一个**规范形（canonical form）**当键，让同质项自动落同一个桶：

- 字母异位词分组（49）：`''.join(sorted(s))` 当键（`eat/tea → "aet"`），或 26 字母计数元组当键
- 字符频率统计（383）：`Counter(ransom) - Counter(magazine)` 减出「缺多少」
- 快乐数判环：记下出现过的平方和（哈希表当记忆化/判重）

```python
from collections import defaultdict

def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = ''.join(sorted(s))     # 同组元素共享同一个规范形
        groups[key].append(s)
    return list(groups.values())
```

规范形的选择是这道题全部的设计题：排序串 O(k log k)；计数元组 O(k + 26)，26 个字母的固定后缀免排序。两个都合法，按数据规模与字母表宽度定。

## 题型二：用哈希查找压掉一层循环

两数之和（1）是原型：暴力两层循环 O(n²)，改为「边扫边到表里查补集」一路 O(n)。

```python
def twoSum(nums, target):
    seen = {}                        # 值 -> 下标
    for i, x in enumerate(nums):
        if target - x in seen:       # 尚未遍历的前提：之前值已在表里
            return [seen[target - x], i]
        seen[x] = i                  # 先查后存，避免自己配上自己
    return []
```

「**先查后存**」不是风格偏好：先存后查时 `target = 2x` 会把当前元素查到自己头上。「边扫边往表里加」是这一路（128、560 都是同款骨架）公共的正确性所在。

128 最长连续序列进阶一层：把 set 当「哈希查邻」用，只在**序列起点**（`x-1` 不在集合里）位向右膨胀，每个元素至多被两个方向各扫描一次，整体 O(n)。

## 题型三：设计与手写实现

- LRU 缓存（146）：哈希表 + 双向链表，动作见[链表](linked_list.md)
- [705. 设计哈希集合](https://leetcode.cn/problems/design-hashset/)：手写一个最小拉链法，实现「冲突如何挂、键什么是同属一组」的收尾环节

```python
class MyHashSet:      # 705 题：最小拉链法
    def __init__(self):
        self.buckets = [[] for _ in range(1009)]   # 素数桶数，散列更均匀

    def _idx(self, key: int) -> int:
        return key % len(self.buckets)

    def add(self, key: int) -> None:
        b = self.buckets[self._idx(key)]
        if key not in b:
            b.append(key)

    def remove(self, key: int) -> None:
        b = self.buckets[self._idx(key)]
        if key in b:
            b.remove(key)

    def contains(self, key: int) -> bool:
        return key in self.buckets[self._idx(key)]
```

「桶数取素数」是教科书条目：让 `哈希值 % 桶数` 对规律分布的键（如等差）也能均匀散开。

## 易错点总结

- 把 `list` 当 dict 键（不可哈希，TypeError）；坐标类键要写 tuple
- dict 有序（3.7+）但 set 无序，别对 set 的遍历顺序做假设
- 「先存后查」破坏了「同一元素不能配自己」约束（两数之和的变体常在这失手）
- `d.get(x, 默认)` 的缺省语义：`-1` / `0` / `[]` 各是不同的含义，不能一律 `get(x, 0)`
- 手写开放寻址删除时忘了墓碑标记——探测链从该处断裂，后面的键永远查不到
- 把平均 O(1) 当作无条件承诺：恶意构造键会把它拉成长链，工程上靠随机化哈希兜底

## 相关题目

- [1. 两数之和](../problems/leetcode/0001_two_sum.md)
- [217. 存在重复元素](https://leetcode.cn/problems/contains-duplicate/)
- [49. 字母异位词分组](https://leetcode.cn/problems/group-anagrams/)
- [128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)
- [560. 和为K的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)

## 相关知识点

- [数组](array.md)——前缀和 + 哈希联用
- [链表](linked_list.md)——LRU 的另一半
- [哈希表用法快速统计模式](../patterns/hash_map.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把数组换成你自己的，逐帧观察
每个键如何在表里就地累加。计数、分组、判重用的是同一套表操作。
