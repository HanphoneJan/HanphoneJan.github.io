---
title: 字符串
sidebar_position: 2
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-11-20
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
"""循环拼接的正确姿势：先攒进列表，最后一次 join。O(n)"""
pieces = ['ab', 'cd', 'ef']
parts = []
for piece in pieces:
    parts.append(piece)       # ① 每段只入表，不产生新串
s = ''.join(parts)            # ② 一次分配、一次拷贝，回到 O(n)
print(s)                      # -> abcdef
```

## 结构剖面

`str` 不是「字符的列表」，而是一段**定长的字节块**加一个长度字段：取第 i 个字符 = 基址 + i × 每字符字节数。

![两种实现都是「长度 + 一段字符」](/diagrams/string-layout.png)

CPython 按串里最大的码点决定每字符占 1 / 2 / 4 字节（PEP 393）；Java 9 起用 `byte[]` + `coder`，纯拉丁字符每字符 1 字节，出现其它字符才整串切成 UTF-16。两边都用「定宽」换 O(1) 下标——变长编码（UTF-8）做不到按下标直接定位。

「不可变」的代价也在同一处：没有「就地写一个字符」这条路，任何修改都只能新申请一整块。

![原串不动，结果都是新对象](/diagrams/string-immutable.png)

所以 `s += c` 在循环里是 O(n²)：每轮都复制一遍已有内容。把片段攒进 list 再 `''.join()`，一次分配、一次拷贝，回到 O(n)。

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

`ord(c) - ord('a')` 一步算出 0~25 的下标，也就是 26 个字母的序号——计数数组、差分、「下标对应字典序」的题全靠它。

## 题型一：反转与回文（双指针）

反转属于原地双指针一类（344），注意 LeetCode Python 接口传入的一般是 `List[str]`（列表），**原地才可行**：真正的 `str` 无原地改法，面试口头说明这层差异即可。

```python
def reverseString(s):
    """原地反转字符列表；O(n) 时间、O(1) 额外空间"""
    left, right = 0, len(s) - 1        # ① 两端各一根指针
    while left < right:                # ② 相遇即停，奇数位不动
        s[left], s[right] = s[right], s[left]  # ③ 交换后内收
        left += 1
        right -= 1
    return s
```

回文验证（125）：跳过非字母数字、统一小写之后，用同款双指针逐位比较。

回文子串计数（647）的稳解是**中心扩展**：以每个字符为候选中心，向两侧扩展直到字符不再相等，途经的每个半径都是一个回文；长度为奇/偶的中心分别取在字符处与两个字符之间，共 2n−1 个。每次扩展最多走 O(n) 层，总 O(n²)——比 DP 少一维，也比 Manacher 算法（线性时间求回文半径）好写；不要求线性时间时，中心扩展就是标准答案。

## 题型二：滑动窗口找子串

「找包含/不含某些字符的最短或最长连续子串」是一套模板换约束（[76. 最小覆盖子串](https://leetcode.cn/problems/minimum-window-substring/)、[3 无重复最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)、438 异位词），见[滑动窗口模式](../patterns/sliding_window.md)。最小覆盖子串的完整实现即「右针扩张、欠账计数、左针收缩」三件事：

```python
from collections import Counter


def minWindow(s: str, t: str) -> str:
    """s 中覆盖 t 全部字符的最短子串；没有返回空串。O(n + m)"""
    need = Counter(t)                # ① 缺口表：正数缺、负数盈余
    missing = len(t)                 # ① 缺口总数，归零即凑齐
    left = 0                         # 窗口 [left, right)，左端收缩
    inf = float('inf')
    best = (inf, 0)                  # (长度, 起点)，用 inf 省特判
    for right, ch in enumerate(s, 1):     # ② 右针吃进一个字符
        if need[ch] > 0:                  # 确实是缺的，缺口减一
            missing -= 1
        need[ch] -= 1                     # 记成负数 = 窗口里多出来的
        if missing == 0:                  # 已凑齐，可以收缩
            while need[s[left]] < 0:      # ③ 左端盈余就压掉
                need[s[left]] += 1
                left += 1
            if right - left < best[0]:
                best = (right - left, left)
    left, length = best[1], best[0]
    return '' if length == inf else s[left:left+length]
```

这题的变量语义可以背下来：`need` 记缺口（负 = 盈余）、`missing` 记总缺口、回到 0 触发收缩。窗口不变量是「入右针、若已齐则能收多紧收多紧」，答案在每次「齐」的极小窗口处取。

## 题型三：KMP（Knuth-Morris-Pratt，面试要能讲清、能手写 next）

子串查找的最优解是 O(n + m)。暴力的代价在失配之后：主串回退到「起点 + 1」、模式串归零，已经比过的字符又要再比一遍。KMP 的洞见是**失配时，已匹配的那一段自己就包含可复用的自匹配信息**——这段前缀同时是模式串的前缀和后缀，按 `next` 直接挪过去即可，主串指针不必回退。

- 预处理 O(m)：`next` 用同样的跳转法对模式串自身求一遍
- 匹配 O(n)：主串指针只前进，只有模式串在按 `next` 回退

**`next` 的定义（i 从 1 起算）**：`next[i]` 是「模式串前 i 个字符 `pat[:i]` 中，最长相等的真前缀与真后缀的长度」。真前后缀不含整段本身，所以 `next[0] = next[1] = 0`——空串和单字符都没有真前后缀。以 `pat = "ABABCABAB"` 为例：`pat[:4] = "ABAB"` 的最长相等真前后缀是 `AB`，长度 2，故 `next[4] = 2`；整串的 `next` 是 `[0,0,0,1,2,0,1,2,3,4]`，最后一位 4 对应整串的 `ABAB`。

下面代码里的 `nxt` 就是这个定义的原样落地：下标 `i` 即前缀长度，`nxt[i] = next[i]`。两个函数合起来才是完整的 KMP——`build_next` 预处理模式串，`kmp_search` 顺着主串走一遍。

![失配后按 next 跳过已匹配的前缀](/diagrams/kmp-next.png)

```python
def build_next(pat):
    """next[i] = pat[:i] 的最长相等真前后缀长度（i 从 1 起算）。O(m)"""
    m = len(pat)
    nxt = [0] * (m + 1)              # ① 长度 0/1 无真前后缀，先填 0
    j = 0                            # ② j = 已匹配上的前缀长度
    for i in range(2, m + 1):        # 这一轮求 next[i]
        while j > 0 and pat[i - 1] != pat[j]:
            j = nxt[j]               # ③ 接不上：退回这段前缀的边界
        if pat[i - 1] == pat[j]:
            j += 1                   # ③' 接上了，边界长一位
        nxt[i] = j
    return nxt


def kmp_search(s, pat):
    """pat 在 s 中首次出现的下标，找不到返回 -1。O(n + m)"""
    if not pat:
        return 0
    nxt = build_next(pat)
    j = 0                            # ① j：模式串已匹配的字符数
    for i, ch in enumerate(s):       # ② i 只增不减，主串指针不回退
        while j > 0 and ch != pat[j]:
            j = nxt[j]               # ③ 失配只挪模式串，跳到候选前缀
        if ch == pat[j]:
            j += 1
        if j == len(pat):
            return i - j + 1         # 末位也对上：整段出现的起点
    return -1
```

`build_next` 干的是「模式串对自身做一次匹配」。`j` 为每一轮提供候选长度：`pat[i-1] == pat[j]` 说明长度为 `j` 的前缀后面正好接上这一位，长度变 `j+1`；接不上就退到 `nxt[j]`，那是「这段前缀自己的最长相等真前后缀」，只有那里还可能接得上。退到 `j == 0` 仍接不上，就说明这一位没有可复用的边界，`nxt[i]` 记 0。

匹配阶段只有一件事在变：`j` 沿 `next` 往回退。`j` 每退一次都对应丢掉一段不可能的对齐，整个匹配过程 `j` 的净增量不超过 n，所以总时间是 O(n)；`j` 退到 0 还配不上，就从主串下一个字符重新数起。

**什么时候真写它**：日常规模的查找用 `sub in s` 就够（CPython 是 Boyer-Moore-Horspool 变体，期望 O(n)，最坏 O(n·m)），不必手写。KMP 的场合是面试要求「讲清为什么主串不回退 + 当场写出 `next`」。再往上一档「在一篇文章里同时找很多模式」是 Aho-Corasick / 后缀结构，答出名字与定位即可。

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
