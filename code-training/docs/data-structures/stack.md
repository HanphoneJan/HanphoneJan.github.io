---
title: 栈
category: 数据结构
difficulty_range: [简单, 较难]
last_updated: 2026-10-26
---

# 栈

## 一句话理解

**栈（Stack）只有一个开口**：进出都走「栈顶」这一个门。最后放进去的东西最先被拿出来，所以叫**后进先出（LIFO, Last In First Out）**。现实里最贴切的模型是一摞叠起来的盘子——只能从最上面拿，也只能往最上面放。

「只有一个开口」这个限制看似苛刻，却正是它的价值：**它逼着你只处理「最新出现」的问题**。函数调用、撤销操作、括号匹配，本质上都是「最新的一条记录最先被处理」，这些场景用栈顺手得像本能。

## 核心特性与复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| push（入栈） | O(1) | 压到栈顶 |
| pop（出栈） | O(1) | 从栈顶弹出 |
| peek / top（看栈顶） | O(1) | 只看不弹 |
| 查找任意元素 | O(n) | 只能一个个弹出来看，随机访问是不存在的 |

空间复杂度 O(n)。注意栈**没有随机访问**——`stack[3]` 在栈的世界里没有语义，除非你明确把它当数组用。

## Python 实现

```python
# CPython 的 list 底层是动态数组，append/pop 都发生在尾部，O(1) 均摊
stack = []
stack.append(1)          # push
stack.append(2)
top = stack[-1]          # peek，看栈顶
stack.pop()              # pop，返回 2
is_empty = len(stack) == 0

# 常见错误写法：把头部当栈顶
stack.insert(0, 1)       # O(n)，不要这样用
stack.pop(0)             # O(n)，同样不要
```

**为什么用尾部当栈顶**：`list.pop(0)` 要把后面 n-1 个元素全部前移一位，O(n)；连续操作会退化成 O(n²)。Python 代码审查里这是第一眼要盯的点。

## 应用场景（面试里的标准答案）

- **函数调用栈**：函数递归调用一层层压栈，返回一层层弹栈——递归本质上就是隐式地用了栈
- **括号匹配**：遇到左括号压栈，右括号与栈顶配对弹出（[20. 有效的括号](../problems/leetcode/0020_valid_parentheses.md)）
- **表达式求值与逆波兰记法**：运算数压栈，遇运算符弹出两个数计算（[150. 逆波兰表达式求值](https://leetcode.cn/problems/evaluate-reverse-polish-notation/)）
- **浏览器的回退/前进**：两个栈，一个存历史、一个存未来，切换时互相倒腾
- **深度优先搜索（DFS）**：显式栈可以替代递归，避免递归过深时爆 Python 的栈帧上限（默认约 1000 层）
- **编辑器的撤销（Ctrl+Z）**：撤销一次弹一次，重做则是另一个栈

## 常考点一：括号匹配

最典型的栈应用，也是面试的入门必考题。

```python
def isValid(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            # 右括号：栈顶必须是对应的左括号
            # not stack 兜住「一进来就是右括号」的情况
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            # 左括号：压栈等待配对
            stack.append(ch)
    return not stack   # 全部配对 = 栈恰好弹空
```

三个必须卡住的边界：右括号先到（栈为空）、类型不匹配（`[` 后跟 `}`）、左括号有富余（最后栈非空）。三处随便漏一个，用例都过不全。

## 常考点二：双栈模拟队列与取最小值

**用栈实现队列（[232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)）**：一个 `in` 栈收数据，一个 `out` 栈发数据。出队时若 `out` 为空，把 `in` 整个倒灌进 `out`——两次后进先出一叠加，先进先出就出来了。均摊仍是 O(1)：每个元素一生至多被推一次、倒一次。

**最小栈（[155. 最小栈](https://leetcode.cn/problems/min-stack/)）**：用一个同步栈存「每个高度下的历史最小值」，`pop` 时同步弹掉，最小值查询永远 O(1)。**不要用「pop 后重新扫一遍求 min」**——那是 O(n)的操作，会让题目失去意义。

```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []   # 与主栈同步增长的辅助栈

    def push(self, x: int) -> None:
        self.stack.append(x)
        # 语义：加入 x 之后，此时整个栈的最小值是多少
        mn = min(x, self.min_stack[-1]) if self.min_stack else x
        self.min_stack.append(mn)

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

## 常考点三：单调栈（重点中的重点）

**单调栈**是栈在面试中最常被深挖的形态：始终保证栈内元素（常存下标）单调递增或递减，遇到破坏单调性的元素就把栈顶「打死换掉」。

> **核心口诀：栈里存的是「还没找到答案的人」**。新元素来了，比它小的、还在等答案的那些人，答案就是它——弹出时结算。所以单调栈真正的名字应该叫「还没结算的候选区」，弹出的那一刻，一个题的局部答案诞生了。

单调栈适用的题型有一条清晰的特征：**求「下一个/上一个 更大/更小」**。只要题目长成这样，第一反应就应该想到它：

| 题目 | 单调方向 | 弹出时结算什么 |
|------|---------|--------------|
| [496. 下一个更大元素](https://leetcode.cn/problems/next-greater-element-i/) | 递减 | 找到比自己大的下一个位置 |
| [739. 每日温度](../problems/leetcode/0739_daily_temperatures.md) | 递减 | 等到第一个更暖的日子还要几天 |
| [84. 柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/) | 递增 | 以自己为高、向两边扩展的矩形 |
| [42. 接雨水](https://leetcode.cn/problems/trapping-rain-water/) | 递减 | 弹出后由左右更高的柱子把凹槽夹出来，凹槽里按层积水 |

```python
# 单调栈模板：下一个更大元素
def nextGreaterElement(nums):
    n = len(nums)
    res = [-1] * n          # 默认答案：没人比我大
    stack = []              # 存下标；栈内对应值从底到顶单调递减
    for i, x in enumerate(nums):
        # x 比栈顶大 → 栈顶等到了它的答案
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res              # 栈里剩的人答案保持 -1
```

段小结构里每个部分都有讲究：

- **用 `<` 弹、退化为等号的含义看题**：「下一个小/严格更大」用 `<`，「下一个 ≥」就放宽成 `<=`。写错等号是这类题第一高频 bug
- **存下标而不是存值**：`res` 是按下标写的，弹栈时需要同时拿到「位置」和「值」
- **正序/倒序遍历**：正序「结算弹出的人」，倒序「查询尚未进栈的人」，两种写法都对，模板固化一种，省得现场纠结
- **复杂度 O(n)**：能保证正确答案的关键是每个元素至多进出栈各一次。很多人担心内层 while 让它变 O(n²)，其实每一层循环里的 while 弹掉一个元素，弹掉就不会再进，总数被入栈次数封顶

推导 `nums = [2, 1, 2]`（每日温度口径，res 存天数差为 1 的值）：

```text
初始 stack = [], res = [-1, -1, -1]

i=0, x=2：栈空，不结算；2 进栈        stack=[0]
i=1, x=1：nums[0]=2 ≥ 1，不弹；1 进栈  stack=[0, 1]
i=2, x=2：nums[1]=1 < 2，弹 1，res[1]=2；
          nums[0]=2 ≥ 2（严格大于不成立），停止；2 进栈  stack=[0, 2]

遍历结束：栈里剩 0 号（值 2）与 2 号（值 2），res = [2, 2, -1]
```

最后一句确认一下：0 号的下一个大答案其实不存在（后面没有严格大于 2 的），所以保留 -1 —— 它不是被「算」成 -1 的，是**从没被弹出、默认值一直没改**。

## 易错点总结

- 用 `list.pop(0)` 或 `insert(0, x)` 模拟栈（O(n)，必须从尾部操作）
- 单调栈里存了值却需要下标，结算时定位失败——存下标，值按需查
- 括号匹配漏掉「右括号先到」和「左括号剩余」两个边界
- 递归深度过大（>1000 层）报 `RecursionError`——改用显式栈的迭代写法
- 对比单调方向时等号用错：「更大元素」必须严格大于，弹栈条件与题目要求要对齐

## 相关题目

- [20. 有效的括号](../problems/leetcode/0020_valid_parentheses.md)
- [224. 基本计算器](https://leetcode.cn/problems/basic-calculator/)
- [232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)
- [739. 每日温度](../problems/leetcode/0739_daily_temperatures.md)

## 相关知识点

- [队列](queue.md)——栈与队列互模拟是两面同一块考点
- [深度优先搜索模式](../patterns/dfs.md)
