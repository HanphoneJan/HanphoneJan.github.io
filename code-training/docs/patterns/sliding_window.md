---
title: 滑动窗口模式
category: 算法模式
difficulty: 中等
applicable_to:
  - 数组
  - 字符串
  - 子数组/子串问题
last_updated: 2026-10-19
---

# 滑动窗口

## 一句话说清滑动窗口

维护一个**连续区间** `[left, right]`，右端负责「把新元素纳入」，左端负责「把不合格的元素踢出」。
两个指针都只向右走，所以每个元素最多进出窗口各一次，总复杂度 `O(n)`。

滑动窗口是双指针的一个分支，专门解决**连续子数组 / 子串**问题：

- 最长 / 最短的满足条件的连续区间；
- 固定长度的区间统计；
- 区间内频率、不同元素个数、覆盖关系。

## 为什么是 O(n)

```
right → → → → → → → → →
left  → → → → → → → → →
```

- `right` 从 0 走到 `n-1`，最多走 `n` 步；
- `left` 也只会向右走，最多走 `n` 步；
- 内层 `while` 的总执行次数不超过 `n`，不是每个 `right` 都跑满。

所以总操作次数是 `O(n)`，不是 `O(n²)`。这是「均摊分析」的典型例子。

## 两个基本模板

### 模板一：求最长（窗口不满足时收缩）

```python
def longest_window(arr):
    left = 0
    window = {}                 # 窗口内的状态：计数、和、不同元素数……
    ans = 0

    for right in range(len(arr)):
        add(arr[right])         # 1. 扩大窗口

        while not valid(window):    # 2. 不满足条件时收缩
            remove(arr[left])
            left += 1

        ans = max(ans, right - left + 1)   # 3. 此时窗口一定合法，更新答案

    return ans
```

**关键：先收缩到合法，再更新答案。** 如果先更新再收缩，会把不合法的窗口算进去。

### 模板二：求最短（窗口满足时收缩）

```python
def shortest_window(arr, target):
    left = 0
    total = 0
    ans = float('inf')

    for right in range(len(arr)):
        total += arr[right]             # 1. 扩大窗口

        while total >= target:          # 2. 满足条件时，先更新答案
            ans = min(ans, right - left + 1)
            total -= arr[left]          # 再尝试缩小
            left += 1

    return 0 if ans == float('inf') else ans
```

**关键：先更新答案，再收缩。** 因为「满足条件」的窗口正是我们要找的，
缩小时可能就不再满足了。

### 模板三：固定窗口

窗口长度固定为 `k`，进一个就出一个：

```python
def max_sum_window(nums, k):
    window = sum(nums[:k])
    ans = window

    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]   # 进右端，出左端
        ans = max(ans, window)

    return ans
```

固定窗口不需要 `while`，因为窗口大小不会变。

## 什么时候能用滑动窗口

滑动窗口成立的核心是**单调性**：

> 当右端向右扩展时，窗口的「合法性」只会朝一个方向变化；
> 左端收缩后，又能恢复合法。

常见条件都满足单调性：

- 窗口内的**和**（元素非负时）；
- 窗口内的**不同元素个数**（只增不减）；
- 窗口对目标串的**覆盖程度**（只增不减）；
- 固定长度的统计。

**反例：数组含负数时，不能用滑动窗口求和。**

```
nums = [1, -2, 3, -1, 2], target = 3
```

右端扩展时，和可能变小；左端收缩时，和可能变大。
「和 ≥ target」不再随窗口扩大而单调成立，`while` 收缩会错过更短的解。
这类题要用前缀和 + 哈希（见 [哈希映射](hash_map.md)）或前缀和 + 单调队列。

> 看到「连续子数组」先别急着滑窗，先确认条件是否单调。
> **含负数求和、含负数的最短区间，通常不是滑窗题。**

## 例 1：无重复字符的最长子串（LeetCode 3）

[3. 无重复字符的最长子串](../problems/leetcode/0003_longest_substring_without_repeating_characters.md)

窗口内不能有重复字符。右端加入字符后，如果它出现了两次，就不断从左端删除，直到只剩一次。

```python
def length_of_longest_substring(s):
    window = {}
    left = 0
    ans = 0

    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1

        while window[ch] > 1:          # 当前字符重复了
            window[s[left]] -= 1
            left += 1

        ans = max(ans, right - left + 1)

    return ans
```

推演 `s = "abcabcbb"`：

| right | 字符 | 窗口 | left | 长度 |
| --- | --- | --- | --- | --- |
| 0 | a | `a` | 0 | 1 |
| 1 | b | `ab` | 0 | 2 |
| 2 | c | `abc` | 0 | 3 |
| 3 | a | `abca` → 去掉 a → `bca` | 1 | 3 |
| 4 | b | `bcab` → 去掉 b → `cab` | 2 | 3 |
| 5 | c | `cabc` → 去掉 c → `abc` | 3 | 3 |
| 6 | b | `abcb` → 去掉 a、b → `cb` | 5 | 2 |
| 7 | b | `cbb` → 去掉 c、b → `b` | 7 | 1 |

答案 3（`abc`）。

> 这里 `left` 是**窗口左端**，窗口是 `[left, right]`，长度 `right - left + 1`。
> 还有一种写法让 `left` 指向「被排除的那个字符」，窗口是 `(left, right]`，
> 长度就是 `right - left`。两种写法都对，**但不要在同一个函数里混用**。
> 可视化播放器用的是后一种，详见文末。

## 例 2：最小覆盖子串（LeetCode 76）

[76. 最小覆盖子串](../problems/leetcode/0076_minimum_window_substring.md)

在 `s` 里找最短的连续子串，使它包含 `t` 的所有字符（包括重复次数）。

维护 `need`：还差多少个字符。右端纳入字符时，如果它是需要的，`missing` 减一；
当 `missing == 0` 时窗口已经覆盖 `t`，此时收缩左端并更新答案。

```python
from collections import Counter

def min_window(s, t):
    if not t or len(t) > len(s):
        return ""

    need = Counter(t)
    missing = len(t)            # 还差多少个字符（按次数算）
    left = 0
    start = 0
    best = float('inf')

    for right, ch in enumerate(s):
        if need[ch] > 0:        # 这个字符确实还缺
            missing -= 1
        need[ch] -= 1

        while missing == 0:     # 已覆盖 t，尝试缩短
            if right - left + 1 < best:
                best = right - left + 1
                start = left

            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1     # 移除了一个仍然需要的字符
            left += 1

    return s[start:start + best] if best != float('inf') else ""
```

推演 `s = "ADOBECODEBANC"`、`t = "ABC"`：

- 右端走到 `C`（下标 5）时首次覆盖，窗口 `ADOBEC`，长度 6；
- 左端收缩到 `O`，窗口变成 `DOBEC`，仍覆盖；
- 继续扩展到下一个 `A`，窗口 `DOBECODEBA`，收缩到 `CODEBA`；
- 最终在 `BANC` 处得到最短窗口，长度 4。

**易错点：**

- `need[ch]` 对不在 `t` 里的字符会变成负数，这是正常的，表示「多出来的」；
- 收缩时只有 `need[...] > 0` 才说明「移除了一个必需的字符」，`missing` 才加一；
- 答案在 `while` 内部更新，不是在循环外。

## 例 3：找到字符串中所有字母异位词（LeetCode 438）

[438. 找到字符串中所有字母异位词](../problems/leetcode/0438_find_all_anagrams_in_a_string.md)

异位词的长度一定等于 `p` 的长度，所以是**固定窗口**。
维护窗口内 26 个字母的计数，与 `p` 的计数比较。

```python
def find_anagrams(s, p):
    if len(p) > len(s):
        return []

    need = [0] * 26
    for ch in p:
        need[ord(ch) - ord('a')] += 1

    window = [0] * 26
    ans = []

    for i, ch in enumerate(s):
        window[ord(ch) - ord('a')] += 1

        if i >= len(p):
            window[ord(s[i - len(p)]) - ord('a')] -= 1

        if window == need:
            ans.append(i - len(p) + 1)

    return ans
```

每次比较两个长度 26 的数组是 `O(26)`，可以看成常数。若字符集很大，
可以用「计数差值 `diff`」把比较降到 `O(1)`。

## 例 4：滑动窗口最大值（LeetCode 239）

[239. 滑动窗口最大值](../problems/leetcode/0239_sliding_window_maximum.md)

固定窗口 + 单调队列。队列里存**下标**，对应的值从队首到队尾递减：

- 新元素入队前，弹出所有比它小的队尾元素（它们不可能再成为最大值）；
- 队首下标超出窗口时，弹出队首；
- 队首就是当前窗口的最大值。

```python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()          # 存下标，nums[dq[0]] 是窗口最大值
    ans = []

    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)

        if dq[0] <= i - k:      # 队首已经滑出窗口
            dq.popleft()

        if i >= k - 1:
            ans.append(nums[dq[0]])

    return ans
```

每个下标最多入队、出队各一次，复杂度 `O(n)`。这是「滑动窗口 + 单调结构」的典型组合，
不是单纯的双指针。

## 例 5：长度最小的子数组（LeetCode 209）

在**正整数**数组里找和 `>= target` 的最短连续子数组：

```python
def min_sub_array_len(target, nums):
    left = 0
    total = 0
    ans = float('inf')

    for right, x in enumerate(nums):
        total += x

        while total >= target:
            ans = min(ans, right - left + 1)
            total -= nums[left]
            left += 1

    return 0 if ans == float('inf') else ans
```

这是「求最短」模板的标准形态：**满足条件时先更新答案，再收缩**。

> 如果数组里允许负数，这个 `while` 就不成立了：减去一个负数会让和变大，
> 窗口不再单调。这时要用前缀和 + 哈希/单调队列。

## 常见变体

### 1. 至多 K 个不同字符

```python
def longest_k_distinct(s, k):
    count = {}
    left = 0
    ans = 0

    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1

        while len(count) > k:
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1

        ans = max(ans, right - left + 1)

    return ans
```

`len(count)` 就是窗口内不同字符数。删除计数为 0 的键，才能让 `len` 正确减少。

### 2. 恰好 K 个不同字符

「恰好」很难直接维护，但可以用「至多」作差：

```python
def count_at_most_k(s, k):
    if k < 0:
        return 0

    count = {}
    left = 0
    total = 0

    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1
        total += right - left + 1      # 以 right 结尾的合法子串数

    return total


def count_exactly_k(s, k):
    return count_at_most_k(s, k) - count_at_most_k(s, k - 1)
```

注意：这里统计的是**子串个数**，不是最长长度。每个 `right` 对应
`right - left + 1` 个以它结尾的合法子串。

### 3. 窗口内计数 + 覆盖

用两个计数器：

- `need`：目标还需要什么；
- `window`：当前窗口有什么。

当 `window` 覆盖 `need` 时窗口合法。最小覆盖子串、字符串的排列（567）都是这个模型。

### 4. 窗口 + 单调队列

窗口需要「最大值/最小值」时，普通计数不够，需要单调队列（239）。
窗口需要「中位数」时，需要两个堆或有序容器。

## 复杂度分析

| 场景 | 时间复杂度 | 空间复杂度 | 说明 |
| --- | --- | --- | --- |
| 最长无重复子串 | O(n) | O(字符集) | 每个字符进出窗口一次 |
| 最小覆盖子串 | O(n + m) | O(字符集) | m 是 t 的长度 |
| 固定窗口统计 | O(n) | O(1) ~ O(k) | 进一个出一个 |
| 滑动窗口最大值 | O(n) | O(k) | 单调队列 |
| 长度最小的子数组 | O(n) | O(1) | 正整数前提 |
| 至多 K 个不同字符 | O(n) | O(k) | 哈希表大小不超过 k |

## 易错点

- ❌ **收缩用 `if` 而不是 `while`**：新元素可能一次引入多个冲突，`if` 只收缩一次不够。
- ❌ **更新答案的位置错了**：求最长在收缩后更新，求最短在收缩前更新。
- ❌ **窗口状态没有删除键**：计数减到 0 却留在字典里，`len(window)` 会偏大。
- ❌ **`left` 的语义混用**：`[left, right]` 与 `(left, right]` 的长度公式差 1，全程只能选一种。
- ❌ **固定窗口的进/出顺序**：先加入右端、再移除左端，窗口大小始终为 `k`；先移除再加入会让窗口短暂变小，比较时少一个元素。
- ❌ **对含负数的数组求最短和**：窗口和不再单调，滑窗会漏解。
- ❌ **字符集假设**：题目可能是大写字母、数字或 Unicode，数组大小要按字符集调整；不确定就用字典。
- ❌ **空串 / k = 0**：先处理边界，避免 `sum(nums[:0])` 或空窗口造成的错误。

## 相关题目

- [3. 无重复字符的最长子串](../problems/leetcode/0003_longest_substring_without_repeating_characters.md)
- [76. 最小覆盖子串](../problems/leetcode/0076_minimum_window_substring.md)
- [239. 滑动窗口最大值](../problems/leetcode/0239_sliding_window_maximum.md)
- [438. 找到字符串中所有字母异位词](../problems/leetcode/0438_find_all_anagrams_in_a_string.md)
- [560. 和为 K 的子数组](../problems/leetcode/0560_subarray_sum_equals_k.md)（对照：含负数，用前缀和 + 哈希）
- [209. 长度最小的子数组](https://leetcode.cn/problems/minimum-size-subarray-sum/)
- [567. 字符串的排列](https://leetcode.cn/problems/permutation-in-string/)
- [904. 水果成篮](https://leetcode.cn/problems/fruit-into-baskets/)

## 相关模式

- [双指针](two_pointers.md)：滑动窗口的上位概念。
- [哈希映射](hash_map.md)：维护窗口计数、前缀和。
- [查找算法](search.md)：答案二分有时可以替代滑窗。
- [数组](../data-structures/array.md)、[字符串](../data-structures/string.md)。

## 算法可视化

下面的播放器演示「最长无重复子串」，输入里的数字当作字符看待。
它使用的是**另一种 `left` 约定**：

```python
def longest_unique(s):
    last = {}                      # 字符 -> 最近出现的位置
    left = 0                       # left 是「被排除的那个字符」的下标
    ans = result = 0

    for i, ch in enumerate(s):
        if ch not in last:
            ans += 1
        else:
            left = max(left, last[ch])   # 只能右移，不能回退
            ans = i - left               # 窗口是 (left, i]，长度是 i-left

        last[ch] = i
        result = max(result, ans)

    return result
```

两种写法的对应关系：

| 写法 | `left` 的含义 | 窗口 | 长度 |
| --- | --- | --- | --- |
| 计数法 | 窗口左端（包含） | `[left, i]` | `i - left + 1` |
| 最近位置法 | 被排除字符的下标 | `(left, i]` | `i - left` |

输入框里是逗号分隔的数字（每个数字当作一个字符），默认是 `1,2,3,2,2,1,4`。
播放器里 `left` 指针停在「上一个重复字符」的位置，所以它和 `i` 之间的格子数
正好是 `i - left`。把输入改成重复很多的序列（例如 `1,1,1,1`），
会看到 `left` 一路右移、窗口长度始终为 1；再改成全部不同，窗口会一直变长。
