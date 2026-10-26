---
title: 哈希表
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-26
---

# 哈希表（Hash Table）

## 一句话理解

**哈希表是「用计算代替查找」**：存取一个值不再逐个比对，而是先用**哈希函数**把键算成一个下标，直接去数组的那个位置取——理想情况一步到位，这就是 O(1) 的来源。

现实模型是图书馆的编号系统：不是从第一排书架开始找「Python 入门」，而是先按书名算出索书号、直接走到那一格。「算出一个位置」这个动作是哈希的全部灵魂。

## 核心特性与复杂度

| 操作 | 平均 | 最坏 | 说明 |
|------|------|------|------|
| 查找 / 插入 / 删除 | O(1) | O(n) | 最坏发生在所有键撞进同一个桶 |
| 遍历 | O(n) | | 顺序与插入顺序**无关**（dict 例外，见下） |

最坏 O(n) 不是理论玩笑：**哈希表的性能承诺是有条件的**——哈希函数够散、负载因子受控。两条前提失守，O(1) 就塌成 O(n)。

## 它是怎么工作的（三个环节）

### 1. 哈希函数：把键变成下标

`index = hash(key) % 桶数`。好哈希函数的标准只有两条：**散得开**（不同键尽量落到不同桶）、**算得快**。Python 的字符串哈希、Java 的 `hash()` 都是拿「乘大素数 + 异或高位」这类既有研究又验证过的公式，**面试不用自己发明，讲清原则即可**。

必须知道的一个边界：哈希表要求**键可哈希**——值在生命周期内不变、且能算出哈希值的对象。Python 里 `list`、`dict`、`set` 不可哈希（会原地变，哈希值没法承诺），`tuple`、`str`、数字、`frozenset` 可以。所以「用坐标对当键」要写成 `d[(i, j)]` 而不是 `d[[i, j]]`。

### 2. 冲突处理：两个键算到了同一个下标怎么办

这必然会发生（键的个数远多于桶能表示的下标的理想分布），标准解法两派：

| | 拉链法（ chaining） | 开放寻址（open addressing） |
|---|---|---|
| 做法 | 每个桶挂一条链 / 小列表，同下标的都排在链里 | 撞了就按**探测序列**往隔壁找空位（线性探测 / 二次探测 / 双重哈希） |
| 优点 | 负载因子可以 > 1；删除简单 | 内存紧凑、缓存友好（省去链表跳转） |
| 缺点 | 指针多、缓存不友好 | 删除要打墓碑标记；表快满时性能急剧下降 |
| 谁在用 | Java HashMap、算法题手写版 | **CPython 的 dict/set** |

**负载因子（load factor）= 元素数 / 桶数**：拉链法控制在 ~0.75 左右开始扩容是常见工程值；开放寻址必须显著低于 1（填充到 0.8 以上时线性探测会串成长串）。

### 3. 扩容（rehash）：桶不够用了

负载因子超阈值就**申请更大的数组（通常翻倍）、把每个键用新桶数重新哈希一遍**。注意 rehash 不能只拷贝——下标依赖「对桶数取模」，桶数变了位置全变。单次 rehash 是 O(n)，靠**均摊**摊回每次插入：与动态数组扩容同一笔账，均摊 O(1)。

## Python 的 dict / set 底层长什么样

面试「哈希表你了解多少」的加分回答：

- **CPython dict 用开放寻址**（一条探测序列），桶状结构里直接存 index 表——紧凑、缓存友好
- **Python 3.7 起 dict 保证插入顺序**（实现副产品被转正为语言承诺）。但 **set 依然无序**，别把 dict 的经验照搬到 set
- **哈希随机化**：`str`/`bytes` 的哈希值每个进程不同（防哈希碰撞 DoS），所以代码不能拿哈希值做持久化
- `defaultdict` / `Counter` 是写算法题最高频的两个变体：前者免「键不存在先建空」的样板，后者自带计数与 `most_common`

```python
from collections import defaultdict, Counter

cnt = defaultdict(int)       # 缺键自动给 0
for w in words:
    cnt[w] += 1

groups = defaultdict(list)   # 缺键自动给空列表
groups['anagrams'].append(item)

Counter('aabbcc').most_common(2)   # [('a', 2), ('b', 2)]
```

（上面 `groups` 那 3 行是示意，真实键换成业务值即可。）

## 常考点一：计数与分组

一类题的公共骨架是「**用键的规范形（canonical form）做分桶键**」：

- 字母异位词分组（49）：把 `s` 排序后的串当键——`eat/tea → "aet"` 落同组；或用「26 字母计数元组」当键，免排序
- 字符频率统计（383）：`Counter(ransom) - Counter(magazine)` 可减出「缺多少」
- 和为 K 的子数组（560）：**前缀和 + 哈希表**，见 [数组](array.md) 的前缀和一节——「查某个前缀出现过几次」是哈希表给前缀和方法加的一档提速

```python
from collections import defaultdict

def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = ''.join(sorted(s))     # 异位词共享同一个规范形
        groups[key].append(s)
    return list(groups.values())
```

「选什么当规范形」是这类题的全部思考量：排序串（简单清晰，O(k log k)）还是计数元组（无排序，O(k + 26)）？两个都对，数据特征决定取舍。

## 常考点二：把 O(n²) 的查找压成 O(1)

两数之和（1）是祖师爷题：暴力两层循环 O(n²)，中间存哈希表后「边扫边查补集」降成单次 O(n)。

```python
def twoSum(nums, target):
    seen = {}                        # 值 -> 下标
    for i, x in enumerate(nums):
        if target - x in seen:       # 之前扫过的某个值正好补上我
            return [seen[target - x], i]
        seen[x] = i                  # 先查后存，避免自己配自己
    return []
```

「**先查后存**」这个到序细节经常被问：若先 `seen[x] = i` 再查补集，`target = 2x` 时会把同一个元素用两次。「边扫边往表里加」这个动作顺序，是哈希查找类题的通用正确姿势（128 最长连续序列、560 和为 K 同款）。

最长连续序列（128）是「哈希查邻」的进阶版：只从**序列起点**（`x-1` 不在集合里）向右延伸，配合 set 把 O(n²) 控制回 O(n)——每个数至多被两条扫线经过。

## 常考点三：设计与工程题

- **穷举转为查表**：两数之和 / 三数之和的去重、快乐数记下出现过的平方和（哈希当记忆化）
- **设计类**：LRU 缓存（146，哈希表 + 双向链表，见[链表](linked_list.md)）、设计哈希集合（705）、字母异位词分组（49）
- **手写小哈希表**：面试常考手写一个「拉链法」实现，考对冲突处理和扩容的理解

```python
class MyHashSet:      # 705 题：最朴素的拉链法
    def __init__(self):
        self.buckets = [[] for _ in range(1009)]   # 1009 是素数，散列更均匀

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

「桶数取素数」是个写进教科书的小技巧：让「哈希值 % 桶数」对规律输入（比如步长恒定的键）也不至于成批撞进同一桶。

## 易错点总结

- 把 `list` 当 dict 键（不可哈希，直接 `TypeError`），坐标类键要写 tuple
- dict 有序（3.7+）而 set 无序，在 set 的遍历顺序上做实现假设就翻车
- 「先存后查」破了「元素不能配自己」这条约束（two sum 变体全栽在这里）
- `d.get(x, 默认值)` 的默认值与业务语义没对齐：找不到时返回的 -1、0、[] 各有含义，别一律 `get(x, 0)`
- 手写开放寻址时删除忘了墓碑标记，探测链从此断在该处，后面的键再也查不到
- 把平均 O(1) 当最坏 O(1)：恶意构造键（哈希碰撞攻击）会让单桶串成长链，工程上要靠随机化哈希保底

## 相关题目

- [1. 两数之和](../problems/leetcode/0001_two_sum.md)
- [217. 存在重复元素](https://leetcode.cn/problems/contains-duplicate/)
- [49. 字母异位词分组](https://leetcode.cn/problems/group-anagrams/)
- [128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)
- [560. 和为K的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)

## 相关知识点

- [数组](array.md)——前缀和 + 哈希联用
- [链表](linked_list.md)——LRU 缓存的另一半
- [哈希表用法快速统计模式](../patterns/hash_map.md)

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把数组换成你自己的，逐步看每一帧里
各键是怎么在表里就地累加的。计数、分组、去重共用的是这套「一张表打天下」的动作。
