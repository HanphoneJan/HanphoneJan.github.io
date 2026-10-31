---
title: 76. 最小覆盖子串
platform: LeetCode
difficulty: Hard
id: 76
url: https://leetcode.cn/problems/minimum-window-substring/
tags:
  - 字符串
  - 滑动窗口
  - 哈希表
patterns:
  - ../../patterns/hash_map.md
  - ../../patterns/sliding_window.md
date_added: 2026-03-25
---

# 76. 最小覆盖子串

## 题目描述

给你一个字符串 `s`、一个字符串 `t`。返回 `s` 中涵盖 `t` 所有字符的最小子串。如果不存在符合条件的子串，则返回空字符串 `""`。

**注意**：
- 对于 `t` 中重复字符，我们寻找的子字符串中该字符数量必须不少于 `t` 中该字符数量。
- 如果 `s` 中存在这样的子串，我们保证它是唯一的答案。

## 示例

**示例 1：**
```
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"
解释：最小覆盖子串 "BANC" 包含来自字符串 t 的 'A'、'B' 和 'C'。
```

**示例 2：**
```
输入：s = "a", t = "a"
输出："a"
解释：整个字符串 s 是最小覆盖子串。
```

**示例 3：**
```
输入：s = "a", t = "aa"
输出：""
解释：t 中两个字符 'a' 均应包含在 s 的子串中，因此没有符合条件的子字符串，返回空字符串。
```

---

## 解题思路

### 覆盖是一个单调性质，右指针因此不必回头

先把「覆盖」说准：`s[l..r]` 覆盖 `t`，当且仅当 `t` 里每个字符 `c` 在窗口中的个数都不少于它在 `t` 中的个数。重复字符按**个数**算 —— 题面那句「注意」的全部内容就在这里，也是后面记账要记「还缺几个」而不是「出现过没有」的原因。

两条单调性把整道题定住了：

1. 固定左端点 `l`，若 `s[l..r]` 覆盖 `t`，则 `s[l..r+1]` 也覆盖（窗口变大只会多字符）。所以每个 `l` 都有一个最小的 `r_min(l)`，答案就是所有 `[l, r_min(l)]` 里最短的那个。
2. `r_min(l)` 随 `l` 单调不减：把左端点往右挪只会从窗口里拿走字符，想重新覆盖只能继续往右扩，不可能回头。

第 2 条是枢纽。它意味着右指针**永远不用后退**，于是两个指针各沿 `s` 走一遍，总扩张加收缩次数是 `2|s|`。相比之下，「对每个 `l` 都从 `l` 重新往右扩张」要 `O(|s|²)`。滑动窗口相对暴力的全部收益就在这里，没有别的魔法。

### 方法一：用 Counter 比较判断覆盖

按上面的两条单调性，两个指针的结构就定死了：`right` 每轮前进一格，`left` 在「仍然覆盖」时一路前进。

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        cnt_s = Counter()     # 窗口内各字符的出现次数
        cnt_t = Counter(t)    # t 里各字符需要的次数

        ans_left, ans_right = -1, len(s)      # 没找到时 ans_left 保持 -1
        left = 0

        for right, c in enumerate(s):         # 右指针扩张
            cnt_s[c] += 1

            while cnt_s >= cnt_t:             # 覆盖：每个字符都不少
                if right - left < ans_right - ans_left:
                    ans_left, ans_right = left, right
                cnt_s[s[left]] -= 1           # 左指针收缩
                left += 1

        return "" if ans_left < 0 else s[ans_left: ans_right + 1]
```

四个位置与上面的推理一一对应：`for right` 是扩张；`while cnt_s >= cnt_t` 是覆盖判定；`if right - left < ans_right - ans_left` 是「在所有 `r_min(l)` 里取最短」；`cnt_s[s[left]] -= 1; left += 1` 是收缩。

`Counter` 的 `>=` 语义正是「每个键都不少于」，读起来和定义一模一样。但它的实现是逐个键比较，代价 `O(|Σ|)` 而不是 `O(1)`，而这里把它放在了最内层循环。字符集限定为 ASCII 时这算常数，所以常见写法是 `O(|s| + |t|)`；严格算应该是 `O(|s| × |Σ|)`。

### 方法二：用「还缺几个字符」计数，把判定降到 O(1)

覆盖判定贵在它在问「所有字符都够了吗」。换一种记账：`need[c]` 记窗口**还差**多少个 `c`（初值是 `t` 的计数），`missing` 记还差的字符总数（初值 `len(t)`，重复字符分别计）。于是「覆盖」等价于 `missing == 0`，一次整数比较。

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = Counter(t)
        missing = len(t)                     # 还差多少个字符
        left = 0
        ans_left, ans_right = 0, len(s) + 1  # 用一个不可能达到的长度当哨兵

        for right, c in enumerate(s):
            if need[c] > 0:                  # 先看再减：这一次真的补上了一个缺口
                missing -= 1
            need[c] -= 1

            while missing == 0:
                if right - left < ans_right - ans_left:
                    ans_left, ans_right = left, right
                d = s[left]
                need[d] += 1
                if need[d] > 0:              # 移出之后这个字符又不够了
                    missing += 1
                left += 1

        return "" if ans_right > len(s) else s[ans_left: ans_right + 1]
```

三处顺序不能调换：

- `if need[c] > 0` 必须在 `need[c] -= 1` **之前**。反过来的话，「刚好补上最后一个缺口」的那一次也会看到非正数，`missing` 少减 1，窗口永远判不成覆盖。
- `t` 里没有的字符，`need[c]` 从 0 一路减到负数，`if need[c] > 0` 自然不成立，所以不必额外判 `c in t`。
- 收缩侧的 `need[d] += 1` 同样要在判 `need[d] > 0` 之前，道理相同、方向相反。

### 两种写法怎么选

窗口的移动完全一致，区别只在「覆盖」这一步：方法一每次判定扫一遍字典，方法二只做两次整数加减。所以方法二是提交版；方法一更短、更贴定义，适合先确认窗口逻辑本身对不对。两者在最坏情况下都只让 `left`、`right` 各前进 `|s|` 次，不会退化。

---

## 完整代码实现

下面这段是本题的基准实现（页面上的逐帧可视化回放的也是这一段）：用 `Counter` 比较判断覆盖。它的覆盖判定是 `O(|Σ|)`，`O(1)` 判定的提交版见上文「方法二」。

```python
from collections import Counter

class Solution:
    """
    最小覆盖子串 - 滑动窗口

    核心思想：
    使用滑动窗口在字符串 s 中寻找包含 t 所有字符的最小子串。

    滑动窗口的关键：
    1. 右指针扩展窗口，直到窗口包含 t 的所有字符
    2. 左指针收缩窗口，在保证包含 t 所有字符的前提下，寻找最小窗口
    3. 记录最小窗口的位置

    如何判断窗口包含 t 的所有字符？
    使用 Counter 比较：cnt_s >= cnt_t 表示 s 的子串中每个字符的出现次数
    都不小于 t 中对应字符的出现次数。

    时间复杂度：O(|s| + |t|)
    空间复杂度：O(|s| + |t|)
    """

    def minWindow(self, s: str, t: str) -> str:
        cnt_s = Counter()   # s 的子串中各字符的出现次数
        cnt_t = Counter(t)  # t 中各字符的出现次数

        ans_left, ans_right = -1, len(s)  # 记录最小窗口的左右边界
        left = 0  # 窗口左边界

        for right, c in enumerate(s):  # 右指针扩展窗口
            cnt_s[c] += 1  # 右端点字母移入窗口

            # 当窗口包含 t 的所有字符时，尝试收缩左边界
            while cnt_s >= cnt_t:
                # 更新最小窗口
                if right - left < ans_right - ans_left:
                    ans_left, ans_right = left, right

                # 左端点字母移出窗口
                cnt_s[s[left]] -= 1
                left += 1

        return "" if ans_left < 0 else s[ans_left: ans_right + 1]
```

---

## 示例推演

`s = "ADOBECODEBANC"`、`t = "ABC"`（各需 1 个）。下表把「没覆盖、只能继续扩张」的连续 `right` 合并成一行，其余每个 `right` 各占一行，收缩动作写在「动作」一列里：

| `right` | 新进窗口 | 窗口 `[left, right]` | 覆盖 `t`？ | 动作 |
|---|---|---|---|---|
| 0–4 | `A D O B E` | `ADOBE` `[0,4]` | 否（缺 C） | 继续扩张 |
| 5 | `C` | `ADOBEC` `[0,5]` | 是：A1 B1 C1 | 长度 6，记为最佳；左移一格丢掉 `A`，`[1,5]` 不再覆盖 |
| 6–9 | `O D E B` | `DOBECODEB` `[1,9]` | 否（缺 A） | 继续扩张 |
| 10 | `A` | `DOBECODEBA` `[1,10]` | 是 | 长度 10 不更新；连续收缩，`[5,10]` = `CODEBA` 仍覆盖（长度 6，仍不更新），再丢掉 `C` 就失效，`left = 6` |
| 11 | `N` | `ODEBAN` `[6,11]` | 否（缺 C） | 继续扩张 |
| 12 | `C` | `ODEBANC` `[6,12]` | 是 | 依次收缩：`DEBANC`（6）、`EBANC`（5，更新）、`BANC`（4，更新）；再丢掉 `B` 后 `ANC` 缺 B，停止，`left = 10` |

两个细节值得盯一眼：

- `left` 从 0 一路走到 10，中途一次都没有后退 —— 这正是「`r_min(l)` 单调不减」在纸面上的样子。
- 第一次找到的 `ADOBEC` 长度是 6，最后被 4 取代。所以答案是 `BANC`，不是第一个覆盖窗口。收缩必须一直做到「刚好不覆盖」才停，`while` 不能换成 `if`。

用方法二跑同一组输入，`missing` 的取值与本表「覆盖」一列一一对应（覆盖 ⟺ `missing == 0`），窗口边界完全相同。单看 `s = "a"`、`t = "aa"`：`missing` 初值 2，全程只补上 1 个，`while` 一次都没进，`ans_right` 停在 `len(s) + 1`，返回 `""`。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 逐左端点重新扩张 | O(\|s\|²) | O(\|Σ\|) | 每个 `left` 都从 `left` 重新找右端点 |
| 滑动窗口 + Counter 比较 | O(\|s\|×\|Σ\|) | O(\|Σ\|) | 覆盖判定逐个键比较 |
| 滑动窗口 + 缺字符计数（最优） | O(\|s\|+\|t\|) | O(\|Σ\|) | 判定降为一次整数比较 |

> `Σ` 是 `s` 与 `t` 中出现过的不同字符（ASCII 下不超过 128 个）。`left`、`right` 各只前进 `|s|` 次，所以滑动窗口两行的循环总次数是线性的。

---

## 易错点总结

1. **`while cnt_s >= cnt_t` 写成 `while cnt_s == cnt_t`**：窗口一旦多出任何字符，两个 `Counter` 就不可能相等，收缩分支永远进不去。示例 1 直接返回 `""`。
2. **收缩时先 `left += 1` 再 `cnt_s[s[left]] -= 1`**：减掉的是新窗口的第一格，计数与窗口错位一格。示例 1 会返回 `"OBEC"` —— 长度同样是 4，但不含 `A`；`s = "aa", t = "aa"` 时 `left` 还会走过 `right`，抛 `IndexError: string index out of range`。
3. **用 `ans_left = 0` 当初值**（想省掉 `-1` 那次判断）：`return "" if ans_left < 0` 这个「没找到」的信号就永远不成立。示例 3 `s = "a", t = "aa"` 会返回 `"a"` 而不是 `""`。要保留 `-1`，或者像方法二那样用 `len(s) + 1` 当哨兵。

---

## 扩展思考

- **438 / 567 是同一个模板**：那两题要求「窗口长度等于 `|p|` 且计数相等」，窗口定长，连 `right - left` 都不用比较，判定换成计数相等即可。
- **3 题（无重复最长子串）把覆盖换成「窗口内无重复」**：收缩条件从「字符不够」变成「某个字符多了」，`while` 的结构原样保留。滑动窗口的骨架一直这两步：扩张到违规，收缩到合法。

---

## 相关题目

- [3. 无重复字符的最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)
- [438. 找到字符串中所有字母异位词](https://leetcode.cn/problems/find-all-anagrams-in-a-string/)
- [567. 字符串的排列](https://leetcode.cn/problems/permutation-in-string/)
