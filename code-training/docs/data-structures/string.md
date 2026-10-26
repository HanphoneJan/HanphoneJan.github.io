---
title: 字符串
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-27
---

# 字符串

## 定义与不可变性

字符串（string）是有限字符组成的序列。Python 的 `str` 支持 O(1) 下标、切片、`in`、字典序比较，但有一个贯穿全部考点的性质：**不可变（immutable）**——任何「修改」（拼接、替换、切片重组）都产生新对象，原串不动。

由此而来的复杂度分工：

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| `s[i]` | O(1) | 按偏移取 |
| `s[a:b]` 切片 | O(k)（k 为片段长） | 产生新串 |
| `s1 + s2` | O(n + m) | 产生新串；**循环里连用是 O(n²)** |
| `''.join(list)` | O(n) | 多段成串的正确姿势 |
| `sub in s` / `find` | 期望 O(n) | CPython 用 Boyer-Moore-Horspool 变体，最坏 O(n·m) |
| `split` / `replace` | O(n) | 全串线性扫描 |

**循环拼接的正确写法**：攒在一个列表里，最后一次 join（O(n)）。`s += c` 每次都产生长度递增的新串，叠加成 O(n²)。CPython 对引用计数为 1 的串做了原地扩容优化，实践中很多场景感觉不到开销——但这是实现细节不是语言承诺，不能写进依赖它的代码。

```python
parts = []
for piece in pieces:
    parts.append(piece)
s = ''.join(parts)
```

## 常用 API 速查（笔试现场省时）

| 需求 | 写法 |
|------|------|
| 大小写 | `s.upper()` `s.lower()` `s.capitalize()` `s.title()` |
| 判断组成 | `s.isdigit()` `s.isalpha()` `s.isalnum()` `s.isspace()` |
| 去空白 | `s.strip()` `s.lstrip()` `s.rstrip()` |
| 查找 | `s.find(sub)`（缺席返回 -1）、`s.count(sub)`、`sub in s` |
| 拆装 | `s.split(sep)`（默认按任意空白）、`s.splitlines()`、`sep.join(list)` |
| 替换 | `s.replace(old, new, count=-1)` |
| 补位 | `s.zfill(n)`（前补 0）、`s.ljust(n)` `s.rjust(n)` |
| 单字符 ↔ 码点 | `ord('A')==65`、`chr(97)=='a'`；`ord(c) - ord('a')` 得字母 0~25 |
| 批量映射 | `str.maketrans` + `s.translate(table)` |

`ord(c) - ord('a')` 定位26 个字母的下标一步算出——计数数组、差分、「下标对应字典序」的题全靠它。

## 题型一：反转与回文（双指针）

反向是原地双指针一类（344），注意 LeetCode Python 接口传入的一般是 `List[str]`（列表），**原地才可行**：真正的 `str` 无原地改法，面试口头说明这层差异即可。

```python
def reverseString(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
```

回文验证（125）：跳过非字母数字 + 统一小写之后同款双指针逐位比较。

回文子串计数（647）的稳解是**中心扩展**：以每个字符为候选中心「向两侧扩展到字符不再相等，途经的每个半径都是一个回文」，长度为奇/偶的中心分别取在字符处与两个字符之间，共 2n−1 个。扩展各遍历最多 O(n) 层，总 O(n²)——比 DP 少一维、比 Manacher 简单，不写 KMP 时就是这么答。

## 题型二：滑动窗口找子串

「找包含/不含某些字符的最短或最长连续子串」是一套模板换约束（[76. 最小覆盖子串](https://leetcode.cn/problems/minimum-window-substring/)、[3 无重复最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)、438 异位词），见 [patterns/sliding_window.md](../patterns/sliding_window.md)。最小覆盖子串的完整实现即「右针扩张、欠账计数、左针收缩」三件事：

```python
from collections import Counter

def minWindow(s: str, t: str) -> str:
    need = Counter(t)          # 需要的字符与个数
    missing = len(t)           # 还缺的必需字符总数
    left = 0
    best = (float('inf'), 0)   # (长度, 起点)
    for right, ch in enumerate(s, 1):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:                       # 窗口已凑齐
            while need[s[left]] < 0:           # 左端是盈余（负数）就压掉
                need[s[left]] += 1
                left += 1
            if right - left < best[0]:
                best = (right - left, left)
    left, length = best[1], best[0]
    return '' if length == float('inf') else s[left:left + length]
```

这题的变量语义可以背下来：`need` 记缺口（负 = 盈余）、`missing` 记总缺口、回到 0 触发收缩。窗口不变量是「入右针、若已齐则能收多紧收多紧」，答案在每次「齐」的极小窗口处取。

## 题型三：KMP（讲思想，不要求手写）

子串查找最优解 O(n + m)。KMP 洞见：**失配时，已匹配的那一段自己就包含可复用的自匹配信息**——模式串对每个位置 i 预先算出 `next[i]`，含义是「模式串前 i 个字符中，最长相等的真前缀与真后缀的长度」；失配后模式串依 `next` 跳转，**主串指针永不回退**。

- 匹配阶段 O(n)：主串指针只前进
- 预处理 O(m)：用同样的跳转法对模式串自身算 `next`

日常规模的查找 `sub in s`（暴力 O(n·m) 期望 O(n)）就能吃下；「在一篇文章里同时找很多模式」的冷门场景是 Aho-Corasick / 后缀结构，答到名字与定位即可。

## 题型四：编码与字节

- `str`（码点序列）与 `bytes`（字节序列）分家，`encode('utf-8')` / `decode` 互转；读文件与网络通信先交 bytes 再解码是默认姿势
- CJK 显示问题：`len('中') == 1` 但终端占 2 格；对齐用 `unicodedata.east_asian_width` 自算显示宽
- 进制：`int(s)`、`int(s, 16)`（指定进制）、`bin/oct/hex` 与 `int(s, 0)`（识别 `0x` 前缀）

## 易错点总结

- 循环里 `s += c`（潜在 O(n²)）：用列表攒 + 一次 join
- 对 `str` 原地赋值 `s[i] = 'x'` 直接 TypeError；单向替换可以 `s[:i] + 'x' + s[i+1:]`（O(n)，只允许一次划算）
- 切片下标口径是含头不含尾：`s[a:b]` 包 a 不包 b；步长与负下标叠加时建议画数轴
- `find` 与 `index` 分工：前者缺席返回 -1，后者抛异常——按题意挑
- `split()`（无参）把连续空白当一个分隔符，`split(' ')` 则逐个空格——两者不是同一种行为
- 回文题先归一化：大小写、标点按题意先清理（125 的输入就是带标点的句子）
- 344 的接口是 `List[str]`，不要对 Python `str` 想当然原地改

## 相关题目

- [3](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)、[5. 最长回文子串](https://leetcode.cn/problems/longest-palindromic-substring/)（中心扩展 / DP）
- [125. 验证回文串](https://leetcode.cn/problems/valid-palindrome/)
- [242. 有效的字母异位词](https://leetcode.cn/problems/valid-anagram/)

## 相关知识点

- [哈希表](hash_table.md)——字符频率的存放方式
- [滑动窗口模式](../patterns/sliding_window.md)——子串匹配的模板出处
- [双指针](../patterns/two_pointers.md)——反转与回文的写法

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把两串换成你自己的，逐帧观察
二维 DP 表的每个格子如何填写。「最长公共子序列」的表就是字符串
对比过程本身。
