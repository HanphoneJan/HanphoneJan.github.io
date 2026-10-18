---
title: 哈希映射模式
category: 算法模式
difficulty: 简单-中等
applicable_to:
  - 数组
  - 字符串
  - 查找问题
last_updated: 2026-10-19
---

# 哈希映射

## 一句话说清哈希表

**用空间换时间**：把「我要找的东西」直接映射到它的位置或计数，
让查找从「翻一遍」变成「查一下」。

```
数组：找 target  → 从头扫到尾                 O(n)
哈希：找 target  → 算哈希，直接到对应桶       O(1) 平均
```

代价是要额外存一张表，而且**不保证顺序**（不能问「比 x 大的下一个是谁」）。

## 哈希表为什么能做到 O(1)

哈希表内部是一个数组 + 一个哈希函数：

```
key ──hash──► 桶的下标 ──► 桶里存 value
```

- **插入**：算出下标，放进桶；
- **查找**：算出下标，去桶里找；
- **冲突**：不同的 key 可能落到同一个桶。常见处理方式是链地址法（桶里挂链表）
  或开放寻址法（往下一个空位找）。

Python 的 `dict` / `set` 使用开放寻址法，并在负载因子过高时扩容。
所以：

| 操作 | 平均 | 最坏 |
| --- | --- | --- |
| 查找 | O(1) | O(n) |
| 插入 | O(1) | O(n) |
| 删除 | O(1) | O(n) |

最坏情况发生在所有 key 都冲突到同一个桶里。实际使用中很少遇到，
但要知道「平均 O(1)」不是数学保证。

> **key 必须可哈希且不可变**：`int`、`str`、`tuple`（元素也都不可变）可以；
> `list`、`dict`、`set` 不可以。需要把一组值当 key 时，转成 `tuple`。

## 什么时候该想到哈希表

| 题目信号 | 用哈希做什么 |
| --- | --- |
| 「是否存在」「是否出现过」 | `set` 记录访问过的值 |
| 「两数之和」「配对」 | `dict` 存「值 → 下标」 |
| 「出现次数」「频率」 | `Counter` / `dict` 计数 |
| 「分组」「归类」 | `dict`：key 是组的特征，value 是成员列表 |
| 「连续序列」「去重」 | `set` 后只从序列起点扩展 |
| 「子数组和等于 k」 | 前缀和 → 出现次数 |
| 「第一个缺失的正数」 | 把数组本身当哈希表（原地交换） |

**不适合哈希表的情况：**

- 需要**顺序**（最大/最小/前驱/后继）→ 平衡树、排序；
- 需要**范围查询**（`[l, r]` 内有多少个数）→ 树状数组、线段树；
- 数据范围很小且固定（小写字母、0~100 的分数）→ 直接用数组，常数更小；
- 对**最坏情况**有严格要求 → 平衡树能保证 `O(log n)`。

## Python 工具箱

```python
# 字典
d = {}
d.get(key, default)          # 不存在时返回 default，不会插入
d.setdefault(key, [])        # 不存在时插入默认值并返回

# 默认字典
from collections import defaultdict
count = defaultdict(int)     # 缺失键默认 0
groups = defaultdict(list)   # 缺失键默认 []

# 计数器
from collections import Counter
cnt = Counter("abracadabra")
cnt.most_common(2)           # [('a', 5), ('b', 2)]
cnt["z"]                     # 0，不会抛 KeyError

# 集合
seen = set()
seen.add(x)
x in seen
```

> `defaultdict` 的 `d[key]` 在键不存在时会**插入**一个默认值。
> 如果只是查询，用 `d.get(key)` 或 `key in d`，否则 `len(d)` 会悄悄变大。

## 模式一：查找配对

### 两数之和（LeetCode 1）

[1. 两数之和](../problems/leetcode/0001_two_sum.md)

对每个数 `x`，问「`target - x` 之前出现过吗」。哈希表存「值 → 下标」。

```python
def two_sum(nums, target):
    seen = {}

    for i, x in enumerate(nums):
        need = target - x
        if need in seen:            # 先查
            return [seen[need], i]
        seen[x] = i                 # 后存

    return []
```

**先查后存**：如果先存再查，当 `target = 2 * x` 时会把当前元素自己当成配对。

推演 `nums = [2, 7, 11, 15]`、`target = 9`：

| i | x | need | seen | 结果 |
| --- | --- | --- | --- | --- |
| 0 | 2 | 7 | `{}` | 没找到，存 `{2: 0}` |
| 1 | 7 | 2 | `{2: 0}` | 找到，返回 `[0, 1]` |

时间复杂度 `O(n)`，空间 `O(n)`。暴力两重循环是 `O(n²)`。

## 模式二：计数与去重

### 最长连续序列（LeetCode 128）

[128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)

要求 `O(n)`，所以不能排序。把所有数放进 `set`，然后**只从序列的起点开始数**：

```python
def longest_consecutive(nums):
    num_set = set(nums)
    ans = 0

    for x in num_set:
        if x - 1 in num_set:        # 不是起点，跳过
            continue

        cur = x
        length = 0
        while cur in num_set:
            cur += 1
            length += 1

        ans = max(ans, length)

    return ans
```

推演 `[100, 4, 200, 1, 3, 2]`：

- `100` 是起点（99 不在），向后数到 100，长度 1；
- `4` 不是起点（3 在），跳过；
- `200` 是起点，长度 1；
- `1` 是起点，向后数 1、2、3、4，长度 4；
- `3`、`2` 都不是起点，跳过。

答案 4。

**为什么是 O(n)？** 外层循环最多遍历 `n` 个数，内层 `while` 只会沿着序列走，
而每个数只会被数一次（只有起点会进入内层）。均摊下来是 `O(n)`。

### 前 K 个高频元素（LeetCode 347）

[347. 前 K 个高频元素](../problems/leetcode/0347_top_k_frequent_elements.md)

`Counter` 计数后用堆取前 `k` 个：

```python
from collections import Counter
import heapq

def top_k_frequent(nums, k):
    count = Counter(nums)
    return heapq.nlargest(k, count.keys(), key=count.get)
```

`heapq.nlargest` 的时间是 `O(n log k)`。也可以按频率桶排序做到 `O(n)`。

## 模式三：分组

### 字母异位词分组（LeetCode 49）

[49. 字母异位词分组](../problems/leetcode/0049_group_anagrams.md)

异位词排序后得到同一个字符串，可以作为分组的 key：

```python
from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)

    for s in strs:
        key = tuple(sorted(s))      # tuple 可哈希
        groups[key].append(s)

    return list(groups.values())
```

推演 `["eat", "tea", "tan", "ate", "nat", "bat"]`：

| 字符串 | 排序后的 key | 分组 |
| --- | --- | --- |
| eat | `('a','e','t')` | `[eat]` |
| tea | `('a','e','t')` | `[eat, tea]` |
| tan | `('a','n','t')` | `[tan]` |
| ate | `('a','e','t')` | `[eat, tea, ate]` |
| nat | `('a','n','t')` | `[tan, nat]` |
| bat | `('a','b','t')` | `[bat]` |

时间复杂度 `O(n × L log L)`（`L` 是字符串长度）。如果字符集固定，
可以用长度 26 的计数数组转成 `tuple` 当 key，降到 `O(n × L)`。

**分组题的通用套路：** 找到一个「同组元素一定相同、不同组一定不同」的特征，
把它转成可哈希的 key。

## 模式四：前缀和 + 哈希

### 和为 K 的子数组（LeetCode 560）

[560. 和为 K 的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)

子数组和 `nums[i..j]` 可以写成两个前缀和之差：

```
prefix[j] - prefix[i-1] = k
=> prefix[i-1] = prefix[j] - k
```

所以扫描到 `j` 时，只需要知道「前面有多少个前缀和等于 `prefix[j] - k`」。

```python
def subarray_sum(nums, k):
    prefix = {0: 1}          # 前缀和 0 出现过 1 次（空前缀）
    cur = 0
    ans = 0

    for x in nums:
        cur += x
        ans += prefix.get(cur - k, 0)
        prefix[cur] = prefix.get(cur, 0) + 1

    return ans
```

推演 `nums = [1, 1, 1]`、`k = 2`：

| 位置 | cur | cur - k | 命中次数 | 累计答案 | prefix |
| --- | --- | --- | --- | --- | --- |
| 初始 | 0 | — | — | 0 | `{0: 1}` |
| 0 | 1 | -1 | 0 | 0 | `{0:1, 1:1}` |
| 1 | 2 | 0 | 1 | 1 | `{0:1, 1:1, 2:1}` |
| 2 | 3 | 1 | 1 | 2 | `{0:1, 1:1, 2:1, 3:1}` |

答案 2：`[1,1]`（下标 0~1）和 `[1,1]`（下标 1~2）。

**`{0: 1}` 不能省**：它代表「从数组开头到当前位置」这一种情况。
没有它，所有从下标 0 开始的子数组都会被漏掉。

> 这个技巧也能处理**含负数**的数组，因为前缀和只做减法，不要求单调。
> 滑动窗口在含负数时失效，前缀和 + 哈希仍然有效。

## 模式五：原地哈希

当数组长度是 `n`、元素范围是 `1..n` 时，可以把数组本身当成哈希表：
**值 `v` 应该放在下标 `v-1` 的位置**。

### 缺失的第一个正数（LeetCode 41）

[41. 缺失的第一个正数](../problems/leetcode/0041_first_missing_positive.md)

```python
def first_missing_positive(nums):
    n = len(nums)

    for i in range(n):
        # 把 nums[i] 换到它该在的位置，直到换不动为止
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            j = nums[i] - 1
            nums[i], nums[j] = nums[j], nums[i]

    for i in range(n):
        if nums[i] != i + 1:
            return i + 1

    return n + 1
```

`[3, 4, -1, 1]` 的调整过程：

```
[3, 4, -1, 1]  → 3 应在下标 2 → [-1, 4, 3, 1]
                → -1 越界，跳过
                → 4 越界，跳过
                → 1 应在下标 0 → [1, 4, 3, -1]
扫描：[1, 4, 3, -1]，下标 1 应该是 2，返回 2
```

- 时间 `O(n)`：每个数最多被交换到正确位置一次；
- 空间 `O(1)`：没有额外哈希表；
- `nums[nums[i] - 1] != nums[i]` 这个条件同时处理了重复元素，避免无限交换。

### 找到所有消失的数字（LeetCode 448）

[448. 找到所有消失的数字](../problems/leetcode/0448_find_all_numbers_disappeared_in_an_array.md)

用「负号」当访问标记：值 `v` 出现时，把下标 `v-1` 的位置改成负数。

```python
def find_disappeared_numbers(nums):
    n = len(nums)

    for x in nums:
        idx = abs(x) - 1
        if nums[idx] > 0:
            nums[idx] = -nums[idx]

    return [i + 1 for i in range(n) if nums[i] > 0]
```

最后仍为正数的位置，就是没出现过的数字。时间 `O(n)`，空间 `O(1)`（不计返回结果）。

## 哈希 + 滑动窗口

窗口内需要维护「字符 → 出现次数」时，哈希表和滑动窗口会一起使用：

```python
window = {}
window[ch] = window.get(ch, 0) + 1
...
window[s[left]] -= 1
if window[s[left]] == 0:
    del window[s[left]]      # 必须删，否则 len(window) 不会减少
```

详见 [滑动窗口](sliding_window.md)。

## 复杂度分析

| 操作 / 模式 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 哈希查找 / 插入 / 删除 | O(1) 平均，O(n) 最坏 | O(n) | 最坏是全冲突 |
| 两数之和 | O(n) | O(n) | 一次遍历 |
| 计数 / 去重 | O(n) | O(k) | k 是不同元素个数 |
| 字母异位词分组 | O(n × L log L) | O(n × L) | 排序 key |
| 最长连续序列 | O(n) | O(n) | 每个数只被数一次 |
| 前缀和 + 哈希 | O(n) | O(n) | 适用含负数的数组 |
| 原地哈希 | O(n) | O(1) | 值域在 1..n 时可用 |

## 易错点

- ❌ **两数之和先存后查**：`target = 2 * x` 时会把当前元素自己匹配上，返回 `[i, i]`。
- ❌ **用 `list` 当 key**：`TypeError: unhashable type: 'list'`，要转成 `tuple`。
- ❌ **`defaultdict` 查询也插键**：`d[key]` 会创建默认值，`len(d)` 因此变大；只查询用 `in` 或 `get`。
- ❌ **前缀和忘记 `{0: 1}`**：所有从下标 0 开始的子数组都会漏掉。
- ❌ **前缀和先更新答案再累加当前前缀**：顺序反了会把当前元素自己算进去；正确顺序是「更新答案 → 记录当前前缀」。
- ❌ **窗口计数减到 0 不删键**：`len(window)` 偏大，影响「不同字符数」类判断。
- ❌ **依赖哈希表的顺序**：Python 3.7+ 的 `dict` 保持插入顺序，但 `set` 不保证；题目要求有序输出时要自己排序。
- ❌ **用浮点数当 key**：`0.1 + 0.2 != 0.3`，精度问题会让「相同」的 key 对不上。
- ❌ **原地哈希交换条件写错**：只写 `nums[i] != i + 1` 会在重复元素上无限交换。

## 相关题目

- [1. 两数之和](../problems/leetcode/0001_two_sum.md)
- [41. 缺失的第一个正数](../problems/leetcode/0041_first_missing_positive.md)
- [49. 字母异位词分组](../problems/leetcode/0049_group_anagrams.md)
- [128. 最长连续序列](../problems/leetcode/0128_longest_consecutive_sequence.md)
- [169. 多数元素](../problems/leetcode/0169_majority_element.md)
- [347. 前 K 个高频元素](../problems/leetcode/0347_top_k_frequent_elements.md)
- [448. 找到所有消失的数字](../problems/leetcode/0448_find_all_numbers_disappeared_in_an_array.md)
- [560. 和为 K 的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)

## 相关模式

- [数组](../data-structures/array.md)、[哈希表](../data-structures/hash_table.md)。
- [双指针](two_pointers.md)：有序数组上用对撞指针替代哈希。
- [滑动窗口](sliding_window.md)：窗口计数。
- [查找算法](search.md)：二分与哈希的取舍。
- [排序](sorting.md)：分组 key 常常来自排序。

## 算法可视化

下面的播放器演示**就地词频统计**：上面是输入序列，下面 `cnt` 是哈希表。
每读一个元素，`cnt[x] = cnt.get(x, 0) + 1` 做两件事：

- 没见过的键先按 0 算，所以不需要额外的「在不在表里」判断；
- 见过的键直接在原值上加 1。

输入是逗号分隔的元素（默认 `a,b,a,c,b,a`），最终得到 `a:3, b:2, c:1`。注意新键出现的顺序就是它第一次被遇到的顺序
（Python 字典保序），但这不是「按 key 排序」—— 需要有序输出时仍要自己排序。
把输入换成 `a,a,a,a`，能看到同一个键的值一路累加，而表的键数始终是 1。
