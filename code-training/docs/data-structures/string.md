---
title: 字符串
category: 数据结构
difficulty_range: [简单, 中等]
last_updated: 2026-10-26
---

# 字符串

## 一句话理解

**字符串是「字符的序列」，但操作它的功夫全在「不可变」三个字上**：Python 的任何「修改」（拼接、替换、切片）都是造一个新字符串。整个字符串篇章的路数——用什么 API、代码为什么这么写——都从这条不变性开始。

现实模型是刻好的石碑：想改一个字，只能重新刻一块碑。理解了「每改一次都付整块碑的成本」，`s += c` 循环拼接为什么是 O(n²)、`''.join` 为什么是 O(n)，就不再是要背的结论，而是必然。

## 核心特性

- **不可变**：无法原地修改，所有操作返回新字符串
- **可索引 / 可切片**：`s[i]`、`s[a:b]`、`s[::-1]`；负下标从尾数
- **支持 `in` 与比较**：`sub in s`、字典序比较直接对字符串用 `<` `==`
- **字符本质是长度为 1 的字符串**：Python 没有单独的 char 类型，`ord` / `chr` 负责与码点互转

### 时间复杂度

| 操作 | 复杂度 | 说明 |
|------|-------|------|
| `s[i]` 索引 | O(1) | 按偏移取 |
| `s[a:b]` 切片 | O(k)，k 为片段长度 | 产生新串 |
| `s1 + s2` | O(n + m) | 产生新串；**循环里连用是 O(n²)** |
| `''.join(list)` | O(n) | 正确的成串姿势 |
| `sub in s` / `find` | 期望 O(n) | CPython 用优化的 Boyer-Moore-Horspool 变体，最坏仍 O(n·m) |
| `split` / `replace` | O(n) | 全串线性扫描 |

**循环拼接的正确姿势**（面试里拿出来讲是加分点）：

```python
parts = []
for piece in pieces:
    parts.append(piece)
s = ''.join(parts)     # 一次成串，O(n)
```

CPython 的 `+=` 在**引用计数恰为 1**时有原地扩容优化（很多场景跑起来像 O(n)），但这是实现细节不是语言承诺，别当依赖。

## 常考点一：Python 字符串 API 速查（笔试现场最省时间的一张表）

| 需求 | 写法 |
|------|------|
| 大小写 | `s.upper()` `s.lower()` `s.capitalize()` `s.title()` |
| 判断组成 | `s.isdigit()` `s.isalpha()` `s.isalnum()` `s.isspace()` |
| 去空白 | `s.strip()` `s.lstrip()` `s.rstrip()` |
| 查找 | `s.find(sub)`（没找到返回 -1）、`s.count(sub)`、`sub in s` |
| 拆装 | `s.split(sep)`（默认按任意空白）、`s.splitlines()`、`sep.join(list)` |
| 替换 | `s.replace(old, new, count=-1)` |
| 对齐补位 | `s.zfill(n)`（前补 0）、`s.ljust(n)` `s.rjust(n)` |
| 单字符转换 | `ord('A')=65`、`chr(97)='a'`；`ord(c) - ord('a')` 得字母 0~25 下标 |
| 变映射表 | `str.maketrans` + `s.translate(table)`（一表批量换字符） |

「`ord(c) - ord('a')` 定位字母下标」与「`''.join` 成串」这两个动作，把后面一半字符串题串成一条线。

## 常考点二：双指针反转与回文

**反转字符串（344）**是原地双指针的敲门砖：

```python
def reverseString(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]   # Python 的 str 不能这么干！
        left += 1
        right -= 1
```

注意这题在 LeetCode 的 Python 接口里传进来的 `s` 是 `List[str]`（列表），**原地才可能**；真正的 `str` 做不到原地修改，面试问到要说得出这层区别。

**验证回文（125）**：双指针 + 跳过非字母数字 + 统一小写。**回文子串计数（647）**用「中心扩展」：每个位置（含两字符间的缝隙）当中心、向两边扩到不同为止，2n-1 个中心各扩一次，O(n²) 拿到全部回文数——这是不学 KMP 时面试最稳的回文计数解法。

## 常考点三：滑动窗口找子串

「找一个包含/不含某些字符的最短、最长子串」是字符串+滑动窗口的合体考点（[76. 最小覆盖子串](https://leetcode.cn/problems/minimum-window-substring/)、438 异位词、3 无重复最长子串）：

```python
from collections import Counter

def minWindow(s: str, t: str) -> str:
    need = Counter(t)          # 需要的字母与个数
    missing = len(t)           # 还缺多少个「必需」字母
    left = 0
    best = (float('inf'), 0)   # (长度, 起点)
    for right, ch in enumerate(s, 1):        # 右指针一枚枚放进窗口
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:                      # 窗口已凑齐
            while need[s[left]] < 0:          # 左边是盈余的（负数）就压掉
                need[s[left]] += 1
                left += 1
            if right - left < best[0]:
                best = (right - left, left)
    left, length = best[1], best[0]
    return '' if length == float('inf') else s[left:left + length]
```

窗口算法的骨架永远是三件事：**右指针扩、欠账计数、左指针缩**；这题变量换成了「字母频次」而已。模板细节见 [patterns/sliding_window.md](../patterns/sliding_window.md)。

## 常考点四：KMP（讲思想，不现场手写）

子串查找的最优解 O(n + m)。KMP 的洞见一句话：**失配时已经匹配过的那一段里，藏着可复用的自信息（模式串自己就是自己的样本）**——模式串对每个位置 i 预先算好 `next[i]`（最长的「相等真前缀 = 真后缀」的长度），失配后模式串直接跳到 next 位置再比，**主串指针永不回头**。

「next 数组怎么求」白板手写是困难档；面试最常见的考法是**说出两个复杂度与直觉即可**：

- 匹配阶段 O(n)（主串指针不回退）
- 预处理 O(m)（模式串对自身用同样的跳转法算 next）

不写 KMP 时，退一步的答案要能报出来：`sub in s` / 双指针暴力 O(n·m) 能吃下日常规模。更冷门场景（很多模式找出处）用 Aho-Corasick 或后缀自动机，知道名字和「多模式场景」这个定位即可。

## 常考点五：编码与字节

- **str 与 bytes 分家**：`str` 是码点序列，`encode('utf-8')`/`decode` 负责与字节序列互转；处理网络与文件时「先开 bytes、再解码」是默认姿势
- **CJK 宽度对齐**：`len('中') == 1` 但显示宽度占 2 格——终端对齐时用 `unicodedata.east_asian_width` 自己算显示宽
- **大数与转换**：`int(s)`、`int(str_num, 16)`（指定进制）、`bin`/`oct`/`hex` 与 `int(x, 0)` 解析前缀

## 易错点总结

- 循环里 `s += c`（潜在 O(n²)），要用 `''.join`
- 对 `str` 试图原地赋值 `s[i] = 'x'`——不可变对象，要么用 `list` 中转再 join，要么 `s = s[:i] + 'x' + s[i+1:]`（O(n)，一次性才划算）
- 切片下标搞反「含头不含尾」：`s[a:b]` 包 a 不包 b，步长与负下标叠加时画一条数轴再动手
- `find` 与 `index` 混用：没找到时前者返 -1，后者抛异常——判断场景挑对应的那种
- `split()` 默认版连续空白会当一整个分隔符，`split(' ')` 则不会——两种行为完全不同
- 回文判断忘归一化：大小写与标点要按题意先处理（125 题的输入是「带标点的句子」）

## 相关题目

- [3. 无重复字符的最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)
- [5. 最长回文子串](https://leetcode.cn/problems/longest-palindromic-substring/)（中心扩展 / DP）
- [125. 验证回文串](https://leetcode.cn/problems/valid-palindrome/)
- [242. 有效的字母异位词](https://leetcode.cn/problems/valid-anagram/)

## 相关知识点

- [哈希表](hash_table.md)——字符频率统计的存放方式
- [滑动窗口模式](../patterns/sliding_window.md)——子串匹配的通用模板
- [双指针](../patterns/two_pointers.md)——反转与验证回文的用法

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把两串换成你自己的，逐步看二维 DP
表每个格子怎么填。「最长公共子序列」的表就是字符串对比过程的全记录。