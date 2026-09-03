---
title: 删除无效的括号
platform: LeetCode
difficulty: Hard
id: 301
url: https://leetcode.cn/problems/remove-invalid-parentheses/
tags:
  - 字符串
  - 回溯
  - BFS
date_added: 2026-04-24
---

# 301. 删除无效的括号

## 题目描述

给你一个由若干括号和字母组成的字符串 `s`，删除最少数量的无效括号，使得输入的字符串有效，并返回所有可能的结果。

答案可以按 **任意顺序** 返回。

## 示例

**示例 1：**
```
输入：s = "()())()"
输出：["(())()","()()()"]
```

**示例 2：**
```
输入：s = "(a)())()"
输出：["(a())()","(a)()()"]
```

**示例 3：**
```
输入：s = ")("
输出：[""]
```

---

## 解题思路

### 第一步：理解问题本质

我们需要删除最少数量的括号使字符串合法。关键问题是：**如何判断需要删除多少个括号？**

### 第二步：统计需要删除的括号数

遍历字符串，维护两个计数器：
- `lremove`：需要删除的左括号数
- `rremove`：需要删除的右括号数

规则：
- 遇到 `'('`，`lremove++`
- 遇到 `')'`：如果 `lremove > 0`，说明有匹配的 `'('`，`lremove--`；否则 `rremove++`

例如 `"()())()"`：
- `(`: lremove=1
- `)`: lremove=0
- `(`: lremove=1
- `)`: lremove=0
- `)`: rremove=1
- `(`: lremove=1
- `)`: lremove=0

需要删除 1 个左括号和 0 个右括号... 等等，让我重新算：

实际：`"()())()"`
- `(`: lremove=1
- `)`: lremove=0 (匹配)
- `(`: lremove=1
- `)`: lremove=0 (匹配)
- `)`: rremove=1 (多余的右括号)
- `(`: lremove=1
- `)`: lremove=0 (匹配)

结果：lremove=0, rremove=1

### 第三步：回溯法

**思路**：尝试删除多余的括号，用 `isValid` 验证结果。

**剪枝策略**：
- 跳过连续相同的括号（避免重复结果）
- 如果剩余字符不足以删除所需数量，提前返回

### 第四步：BFS 解法

**核心洞察**：
- 逐层删除括号，第一次遇到合法字符串时即为最少删除
- 每层删除一个括号，生成所有可能的新字符串

```python
class Solution:
    def removeInvalidParentheses(self, s: str) -> List[str]:
        def isValid(s):
            count = 0
            for c in s:
                if c == '(':
                    count += 1
                elif c == ')':
                    count -= 1
                    if count < 0:
                        return False
            return count == 0

        ans = []
        currSet = set([s])

        while True:
            for ss in currSet:
                if isValid(ss):
                    ans.append(ss)
            if len(ans) > 0:
                return ans
            nextSet = set()
            for ss in currSet:
                for i in range(len(ss)):
                    if ss[i] == '(' or ss[i] == ')':
                        nextSet.add(ss[:i] + ss[i+1:])
            currSet = nextSet
```

---

## 完整代码实现

```python
from typing import List


class Solution:
    """
    删除无效的括号 - 回溯法

    先统计需要删除的左右括号数量，然后用回溯尝试所有删除方案
    时间复杂度：O(2^n) 最坏情况
    空间复杂度：O(n) 递归栈
    """

    def removeInvalidParentheses(self, s: str) -> List[str]:
        res = []
        lremove, rremove = 0, 0

        # 统计需要删除的括号数
        for c in s:
            if c == '(':
                lremove += 1
            elif c == ')':
                if lremove == 0:
                    rremove += 1
                else:
                    lremove -= 1

        def isValid(str):
            cnt = 0
            for c in str:
                if c == '(':
                    cnt += 1
                elif c == ')':
                    cnt -= 1
                    if cnt < 0:
                        return False
            return cnt == 0

        def helper(s, start, lremove, rremove):
            if lremove == 0 and rremove == 0:
                if isValid(s):
                    res.append(s)
                return

            for i in range(start, len(s)):
                # 跳过连续相同的括号，避免重复结果
                if i > start and s[i] == s[i - 1]:
                    continue
                # 剩余字符不足以删除所需数量
                if lremove + rremove > len(s) - i:
                    break
                # 尝试去掉一个左括号
                if lremove > 0 and s[i] == '(':
                    helper(s[:i] + s[i + 1:], i, lremove - 1, rremove)
                # 尝试去掉一个右括号
                if rremove > 0 and s[i] == ')':
                    helper(s[:i] + s[i + 1:], i, lremove, rremove - 1)

        helper(s, 0, lremove, rremove)
        return res
```

---

## 示例推演

以 `s = "()())()"` 为例：

**第一步：统计**
- 遍历后：lremove=0, rremove=1

**第二步：回溯**
- 需要删除 1 个右括号
- 尝试删除位置 4 的 `)`：`"()()()"` -> isValid=True -> 加入结果
- 尝试删除位置 6 的 `)`：`"()())("` -> isValid=False

以 `s = "(a)())()"` 为例：

**第一步：统计**
- lremove=0, rremove=1

**第二步：回溯**
- 尝试删除位置 4 的 `)`：`"(a)()()"` -> isValid=True
- 尝试删除位置 5 的 `)`：`"(a())()"` -> isValid=True

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 暴力枚举 | O(2^n * n) | O(2^n) | 枚举所有子集并验证 |
| BFS | O(n * C(n,k)) | O(C(n,k)) | k为最少删除数 |
| **回溯（最优）** | **O(2^n)** | **O(n)** | 剪枝后实际更快 |

---

## 易错点总结

### 1. 跳过连续相同字符

**错误**：不跳过连续相同的括号，导致重复结果。

**正确**：`if i > start and s[i] == s[i - 1]: continue`

**原因**：连续相同的括号删除任意一个效果相同，只需要尝试第一个。

### 2. 统计括号数

`lremove` 和 `rremove` 的统计要正确：遇到 `')'` 时，优先尝试匹配之前的 `'('`。

### 3. 只删除括号

不要删除字母！检查 `s[i] == '(' or s[i] == ')'` 后再删除。

---

## 扩展思考

### 1. 如果只要求一个结果？

可以用栈找到不匹配的括号位置，直接删除即可。

### 2. 如果要求最少删除数？

回溯和BFS都能保证，因为它们都是按删除数递增的顺序尝试。

---

## 相关题目

- [20. 有效的括号](https://leetcode.cn/problems/valid-parentheses/)
- [32. 最长有效括号](https://leetcode.cn/problems/longest-valid-parentheses/)
- [921. 使括号有效的最少添加](https://leetcode.cn/problems/minimum-add-to-make-parentheses-valid/)
