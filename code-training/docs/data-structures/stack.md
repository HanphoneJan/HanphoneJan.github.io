---
title: 栈
sidebar_position: 4
category: 数据结构
difficulty_range: [简单, 较难]
last_updated: 2026-11-19
---

# 栈

## 定义

栈（stack）是只允许在**一端**（栈顶，top）插入与删除的线性结构，插入 push、删除 pop、查看不删除 peek。这一约束给出的顺序关系叫**后进先出（LIFO, Last In First Out）**：最后进入的元素最先离开。

栈的价值不在「多了一个容器」，而在它把「最后发生的事情最先需要处理」这条顺序显式化了：函数一层层返回、编辑器一步步回退，刷「每日温度」时，那个「上一个还没等到更暖天气」的元素，正压在栈里等着和今天对比。

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| push | O(1)（Python list 是均摊） | |
| pop | O(1) | |
| peek | O(1) | |
| 查找任意元素 | O(n) | 只能逐个弹出，没有随机访问 |

## 结构剖面

栈在内存里**没有任何额外结构**：一块数组，一个 `top` 下标。

![top 右边那格就是下一次 push](/diagrams/stack-layout.png)

`push` 是「写到 top+1，top 加一」，`pop` 是「读 top，top 减一」。所谓 LIFO 不是容器自带的魔法，而是「只在同一端进出」这条约定推出来的顺序——也正因为只在末端动手，才保住了 O(1)。

## 实现：list 的尾巴就是栈顶

```python
"""list 的尾部即栈顶：push 均摊 O(1)，pop / peek 都是 O(1)。"""

stack = []
stack.append(1)        # ① push：写到 top+1，top 加一
stack.append(2)
top = stack[-1]        # ② peek：只读，不动 top
stack.pop()            # ③ pop：读 top 再减一，返回 2
```

**小细节：栈顶固定在 list 尾部**。从头部模拟栈（`insert(0, x)` / `pop(0)`）都是 O(n)——每次操作全体元素都要搬动，连续 n 次操作就是 O(n²)。这是代码审查里一眼要盯住的错误写法。

## 应用场景

栈擅长处理「嵌套、回溯、最近未匹配」这三类结构，常见落点：

- **函数调用栈**：递归就是隐式使用栈；Python 默认栈深约 1000 层，树上递归过深时要显式化（见下）
- **括号匹配**：左括号压栈、右括号与栈顶配对（[20. 有效的括号](../problems/leetcode/0020_valid_parentheses.md)）
- **表达式求值 / 逆波兰**：操作数入栈、运算符弹出两个操作数计算（[150](https://leetcode.cn/problems/evaluate-reverse-polish-notation/)）
- **双栈**：浏览器「回退 / 前进」两个栈互相转移；「用栈实现队列」两栈互相倒灌（见下）
- **DFS 的显式化**：手动栈替代递归（循环写 `push/pop` 就是栈在迭代 DFS 里的实现方式）
- **撤销 / 重做**：两个栈，一个存操作历史、一个存已撤销的历史

## 题型一：括号匹配

```python
def isValid(s: str) -> bool:
    """判断括号串是否按类别全部配对；O(n) 时间、O(n) 空间。"""
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []                   # ① 只存左括号，也就是还没配上对的
    for ch in s:
        if ch in pairs:          # ② 右括号：栈顶必须是同类左括号
            if not stack or stack.pop() != pairs[ch]:
                return False     # ③ not stack 兜住「开局就是右括号」
        else:
            stack.append(ch)
    return not stack             # ④ 弹空才算全配对
```

三个边界必须都写：右括号先到（栈空）、类别不配（`[` 后面跟 `}`）、左括号有富余（最后栈非空）。缺任何一个用例都不完整。

## 题型二：双栈互模拟与最小值

**双栈实现队列（[232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)）**：`in` 栈接收、`out` 栈输出；`out` 空时把 `in` 整个倒灌过去——两次后进先出叠加，出队顺序与到达顺序一致。每个元素一生至多被倒灌一次，均摊 O(1)。

**最小栈（[155. 最小栈](https://leetcode.cn/problems/min-stack/)）**：辅助栈同步 push/pop，顶格记录「当前高度下全栈的最小值」，查询永远 O(1)。「pop 后再扫一遍求 min」是 O(n)，就拆掉了这一题的设计目标（每个操作 O(1)）：

```python
class MinStack:
    """每个操作 O(1) 的最小栈：辅助栈顶格记当前高度的最小值。"""

    def __init__(self):
        self.stack = []
        self.min_stack = []      # ① 与主栈同长，第 k 格记前 k 个的最小

    def push(self, x):
        self.stack.append(x)
        # ② 新元素只可能压低最小值，抄上一个答案就够，不必重扫
        mn = min(x, self.min_stack[-1]) if self.min_stack else x
        self.min_stack.append(mn)

    def pop(self):
        self.stack.pop()
        self.min_stack.pop()     # ③ 两栈同进同出，最小值随高度回退

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

## 题型三：单调栈（本族的核心题型）

单调栈维护栈内元素（对应值）单调递增（或递减）的序列，新元素违反单调性时把栈顶弹出。它解决的问题有一条明确特征：**「对每个元素，找下一个/上一个更大/最小的位置」**。模板是：

```python
def nextGreaterElement(nums):
    """每个位置右侧第一个严格更大的值；没有记 -1。O(n)"""
    n = len(nums)
    res = [-1] * n          # ① 默认答案：右侧没有更大
    stack = []              # ② 存下标，值由底到顶递减
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:  # ③ 栈顶等到了答案
            res[stack.pop()] = x
        stack.append(i)
    return res              # ④ 没被弹过的保持 -1
```

![新元素进栈前，先把等不到更大值的栈顶结算掉](/diagrams/monotonic-stack.png)

`nums = [2, 1, 2]` 走到 `i = 2` 时，栈顶那个 1 等到了 2 被划掉结算，0 号位置的 2 不严格小于 2 所以留在栈里——图里被划掉的是 1 那一格，不是 0 号的 2。

**为什么弹掉就能永久出栈。** 设被弹出的是栈顶 j，新来的是 i。能弹它，说明 `nums[j] < nums[i]`；而 j 一直活到这一刻，说明 j 到 i 之间每个位置的值都 ≤ `nums[j]`，否则 j 在更早的一步就被弹走了。于是 i 正是 j 右侧第一个严格更大的位置，j 的答案当场确定，之后再来什么数都不会改写它。

正确性的两个验证：

- **等号的选择跟题设走**：「第一个严格更大」用 `<`；「第一个 ≥」放宽为 `<=`。这两处最常出错
- **存下标而不是值**：结算要写回 `res` 的位置（或算两位置的边数差），只存值会丢掉位置信息

复杂度 O(n)：外层循环与内层 while 合起来算——每个下标最多入栈一次、出栈一次，弹栈总数 ≤ n，内层不构成第二个 n。

`nums = [2, 1, 2]` 的演化（单一模板按 `<` 弹）：

```text
res = [-1,-1,-1]
i=0, x=2：栈空，2 进栈                    stack=[0]
i=1, x=1：nums[0]=2 ≥ 1 不弹；1 进栈      stack=[0,1]
i=2, x=2：弹 1（nums[1]=1 < 2），res[1]=2；
          0 号处 nums[0]=2 不严格大于 2，停；2 进栈  stack=[0,2]
结尾 res = [-1, 2, -1]——0 号从未被弹出，答案保持默认 -1
```

- 题型分布：[496 下一个更大元素](https://leetcode.cn/problems/next-greater-element-i/)、[739 每日温度](../problems/leetcode/0739_daily_temperatures.md)（递减栈）、[84 柱状图中最大矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)、[42 接雨水](https://leetcode.cn/problems/trapping-rain-water/)（递增栈）——这类「下一个更暖 / 更大 / 更矮」的题都在这一族里
- 与「单调队列」是兄弟结构：单调栈负责「每个数的下一个更大」，单调队列负责「滑动窗口的最值」（见[队列](queue.md)单调队列一节）

## 易错点总结

- 栈顶从 list 头部模拟（`insert(0, x)` / `pop(0)`），O(n)
- 单调栈里塞了值却需要下标，结算写不回——存下标
- 括号匹配只写了「配对成功」没有写「右括号先到 / 左括号剩余」两个边界
- 递归改写栈时漏了「pop 后还要把各子节点 push 回去」，遍历顺序破裂
- 单调栈等号选择盯不紧：严格大于与「第一个 ≥」语义不同
- Python 默认栈深约 1000（树的链状形态最容易爆）：显式栈或 `sys.setrecursionlimit` 锁一个更大的值

## 相关题目

- [20. 有效的括号](../problems/leetcode/0020_valid_parentheses.md)
- [224. 基本计算器](https://leetcode.cn/problems/basic-calculator/)
- [232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)
- [739. 每日温度](../problems/leetcode/0739_daily_temperatures.md)

## 相关知识点

- [队列](queue.md)——栈与队列互模拟是一块考点
- [深度优先搜索模式](../patterns/dfs.md)——显式栈与递归栈的对照

---

## 算法可视化

下面的播放器可以**改输入后重跑**：把输入序列换成你自己的，逐帧观察
单调栈的 push / pop 顺序与栈顶被结算那一刻。
