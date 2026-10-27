---
title: 394. 字符串解码
platform: LeetCode
difficulty: Medium
id: 394
url: https://leetcode.cn/problems/decode-string/
tags:
  - 字符串
  - 栈
  - 递归
topics: []
patterns:
  - ../../patterns/recursion.md
date_added: 2026-04-09
date_reviewed: []
---

# 394. 字符串解码

## 题目描述

给定一个经过编码的字符串，返回它解码后的字符串。

编码规则是：`k[encoded_string]`，表示其中方括号内部的 `encoded_string` 正好重复 k 次。

你可以认为输入字符串总是有效的；输入字符串中没有额外的空格，且输入的方括号总是符合格式要求的。

此外，你可以认为原始数据不包含数字，所有的数字只表示重复的次数 k ，例如不会出现像 `3a` 或 `2[4]` 的输入。

**示例 1：**
```
输入：s = "3[a]2[bc]"
输出："aaabcbc"
```

**示例 2：**
```
输入：s = "3[a2[c]]"
输出："accaccacc"
```

**示例 3：**
```
输入：s = "2[abc]3[cd]ef"
输出："abcabccdcdcdef"
```

---

## 解题思路

### 第一步：理解问题本质

这道题的核心是**处理嵌套结构**。编码字符串中括号可以嵌套，如 `3[a2[c]]` 表示 `a2[c]` 重复 3 次，而 `2[c]` 又表示 `c` 重复 2 次。

这种**嵌套结构**天然适合用**栈**或**递归**来处理。

### 方法一：栈（模拟）

**思路：** 从左到右遍历，遇到数字就展开括号内容。

**问题：** 嵌套括号需要多次遍历，实现复杂且效率低。

### 方法二：栈

**关键洞察：** 遇到 `[` 时，需要将当前状态（已解码的字符串和待重复次数）保存起来，进入子问题；遇到 `]` 时，恢复状态并合并结果。

**栈的设计：**
- 栈中存储字符串和数字
- 遇到 `[` 将当前字符串入栈，开始新的子串
- 遇到 `]` 弹出栈顶，将子串重复后拼接

```python
class Solution:
    def decodeString(self, s: str) -> str:
        # 栈里存 (外层已解码的串, 待重复次数)，每遇到 [ 就压一层
        stack = []
        # 数字可能有多位，要边读边累加
        num = 0
        # res 是「当前层」已经解码出来的内容
        res = ''
        
        # 逐字符扫描，每种字符对应一个动作
        for c in s:
            if c.isdigit():
                # 连续数字按十进制累加，否则 "12" 会被读成 1 和 2
                num = num * 10 + int(c)
            elif c == '[':
                # 进入子问题前，先把外层的进度和重复次数存起来
                stack.append((res, num))
                # 新的一层从空串、次数 0 开始
                res, num = '', 0
            elif c == ']':
                # 出栈恢复外层状态，repeat 是这段子串要重复的次数
                prev_res, repeat = stack.pop()
                # 子串重复后接回外层已解码的部分
                res = prev_res + res * repeat
            else:
                # 普通字母直接拼到当前层
                res += c
        
        # 扫完时栈必为空，res 就是完整结果
        return res
```

### 方法三：递归

**关键洞察：** 每个 `[...]` 都是一个子问题，可以用递归解决。

**递归设计：**
- 遇到数字，解析完整数字
- 遇到 `[`，递归解码括号内的内容
- 遇到 `]`，返回当前解码结果
- 遇到字母，直接加入结果

```python
class Solution:
    def decodeString(self, s: str) -> str:
        def dfs(i):
            # 从位置 i 开始解码，返回 (解码结果, 停下来的下标)
            res = ''
            # num 记录最近读到的重复次数
            num = 0
            # 一路向右扫，遇到 ] 或字符串结尾就返回
            while i < len(s):
                if s[i].isdigit():
                    # 多位数字按十进制累加
                    num = num * 10 + int(s[i])
                elif s[i] == '[':
                    # 递归解码括号内部，返回的新下标要接住
                    sub, i = dfs(i + 1)
                    # 括号内容重复后接上，次数清空给下一段用
                    res += sub * num
                    num = 0
                elif s[i] == ']':
                    # 当前层结束，把结果和 ] 的位置一起交回上层
                    return res, i
                else:
                    # 普通字母直接追加
                    res += s[i]
                # 各分支统一前进一步；[ 分支返回时停在 ] 上，正好跳过它
                i += 1
            return res, i
        
        # 只关心解码后的字符串，下标用不上
        return dfs(0)[0]
```

---

## 完整代码实现

```python
class Solution:
    """
    字符串解码 - 栈解法

    核心思路：
    使用栈来处理嵌套结构。遇到 '[' 时将当前状态（已解码字符串和重复次数）入栈，
    遇到 ']' 时出栈并解码。

    时间复杂度: O(n * k)
    空间复杂度: O(n)
    """
    def decodeString(self, s: str) -> str:
        ptr = 0
        stack = []
        n = len(s)

        def get_digits() -> str:
            """解析连续的数字字符"""
            nonlocal ptr
            start = ptr
            while ptr < n and s[ptr].isdigit():
                ptr += 1
            return s[start:ptr]

        while ptr < n:
            cur = s[ptr]
            if cur.isdigit():
                digits = get_digits()
                stack.append(digits)
            elif cur.isalpha() or cur == '[':
                stack.append(cur)
                ptr += 1
            else:  # cur == ']'
                ptr += 1
                sub = []
                while stack and stack[-1] != '[':
                    sub.append(stack.pop())
                sub.reverse()
                stack.pop()  # 弹出 '['
                rep_time = int(stack.pop())
                decoded_part = ''.join(sub) * rep_time
                stack.append(decoded_part)

        return ''.join(stack)
```

---

## 示例推演

以 `s = "3[a2[c]]"` 为例：

**栈的变化过程：**

| 字符 | 操作 | 栈状态 |
|------|------|--------|
| 3 | 数字入栈 | ['3'] |
| [ | 入栈 | ['3', '['] |
| a | 字母入栈 | ['3', '[', 'a'] |
| 2 | 数字入栈 | ['3', '[', 'a', '2'] |
| [ | 入栈 | ['3', '[', 'a', '2', '['] |
| c | 字母入栈 | ['3', '[', 'a', '2', '[', 'c'] |
| ] | 解码：c 重复 2 次 | ['3', '[', 'acc'] |
| ] | 解码：acc 重复 3 次 | ['accaccacc'] |

**最终结果：** `"accaccacc"`

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 栈 | O(n × k) | O(n) | k 是最大重复次数 |
| 递归 | O(n × k) | O(n) | 递归栈深度 |

**说明：**
- n 是编码字符串长度
- k 是最大重复次数
- 时间复杂度考虑字符串拼接的开销

---

## 易错点总结

### 1. 多位数字的处理

**错误：** 将每个数字字符单独处理。

```python
# 错误
num = int(c)  # 遇到 '1' 就认为是 1

# 正确
# 遇到 "12" 时先得到 1，再算 1*10+2 得到 12
num = num * 10 + int(c)  # 连续数字要累加
```

### 2. 栈中存储的内容

**两种常见设计：**

```python
# 设计一：存储 (字符串, 数字) 元组
# 元组把两种状态绑在一起，出栈时不会错位
stack.append((current_str, repeat_count))

# 设计二：统一存储字符串，数字也作为字符串
# 取出时还要再 int() 还原成次数
stack.append(str(num))
```

### 3. 递归的终止条件

```python
# 遇到 ']' 时返回
# 递归的出口：括号闭合就交回上层，由上层继续推进下标
if s[i] == ']':
    return res, i  # 返回结果和当前位置
```

---

## 扩展思考

### 1. 如何处理更复杂的编码？

如果编码规则扩展，如支持 `k{encoded}` 或多种括号，栈/递归框架依然适用，只需调整匹配逻辑。

### 2. 空间优化

如果结果字符串非常大，可以考虑用列表存储片段，最后再用 `join` 合并，避免频繁的字符串拼接。

### 3. 相关题目

- [726. 原子的数量](https://leetcode.cn/problems/number-of-atoms/) - 类似的嵌套解析
- [385. 迷你语法分析器](https://leetcode.cn/problems/mini-parser/) - 嵌套结构解析
- [224. 基本计算器](https://leetcode.cn/problems/basic-calculator/) - 栈处理表达式

---

## 相关题目

- [726. 原子的数量](https://leetcode.cn/problems/number-of-atoms/)
- [385. 迷你语法分析器](https://leetcode.cn/problems/mini-parser/)
- [224. 基本计算器](https://leetcode.cn/problems/basic-calculator/)
