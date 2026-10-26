---
title: 栈
category: 数据结构
difficulty_range: [简单, 较难]
last_updated: 2026-10-27
---

# 栈

## 定义

栈（stack）是只允许在**一端**（栈顶，top）插入与删除的线性结构，插入 push、删除 pop、查看不删除 peek。这一约束给出的顺序关系叫**后进先出（LIFO, Last In First Out）**：最后进入的元素最先离开。

堆栈的价值不在「多了一个容器」，而在它提供了一种与函数调用、撤销、扫描过程同构的显式状态：函数一层层返回、编辑器一步步回退、检索每日 temperatures 时「上一个更暖等着对比」的元素——全都是「最后发生的事情最先需要处理」。

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| push | O(1)（Python list 是均摊） | |
| pop | O(1) | |
| peek | O(1) | |
| 查找任意元素 | O(n) | 只能逐个弹出，没有随机访问 |

## 实现：list 的尾巴就是栈顶

```python
stack = []
stack.append(1)        # push
stack.append(2)
top = stack[-1]        # peek
stack.pop()            # pop，返回 2
```

**小细节：栈顶固定在 list 尾部**。从头部模拟栈（`insert(0, x)` / `pop(0)`）都是 O(n)——每次操作全体元素都要搬动，连续 n 次操作就是 O(n²)。这是代码审查里一眼要盯住的错误写法。

## 应用场景

栈把「嵌套、回溯、最近未匹配」这三类结构语言的显式化，常见落点：

- **函数调用栈**：递归就是隐式使用栈；Python 默认栈深约 1000 层，树上递归过深时要显式化（见下）
- **括号匹配**：左括号压栈、右括号与栈顶配对（[20. 有效的括号](../problems/leetcode/0020_valid_parentheses.md)）
- **表达式求值 / 逆波兰**：操作数入栈、运算符弹出两个操作数计算（[150](https://leetcode.cn/problems/evaluate-reverse-polish-notation/)）
- **双栈**：浏览器「回退 / 前进」两个栈互相转移；「用栈实现队列」两栈互相倒灌（见下）
- **DFS 的显式化**：手动栈替代递归（循环写 `push/pop` 就是栈在迭代 DFS 里的实现方式）
- **撤销 / 重做**：两个栈，一个存操作历史、一个存已撤销的历史

## 题型一：括号匹配

```python
def isValid(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            # 右括号：栈顶必须是对应左括号；not stack 兜住「开局就是右括号」
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack     # 全部配对 = 栈恰好被弹空
```

三个边界必须都写：右括号先到（栈空）、类别不配（`[` 后面跟 `}`）、左括号有富余（最后栈非空）。缺一个用例组不完整。

## 题型二：双栈互模拟与最小值

**双栈实现队列（[232. 用栈实现队列](https://leetcode.cn/problems/implement-queue-using-stacks/)）**：`in` 栈接收、`out` 栈输出；`out` 空时把 `in` 整个倒灌过去——两次后进先出叠加，出队顺序与到达顺序一致。每个元素全生命至多被倒灌一次，均摊 O(1)。

**最小栈（[155. 最小栈](https://leetcode.cn/problems/min-stack/)）**：辅助栈同步 push/pop，顶格记录「当前高度下全栈的最小值」，查询永远 O(1)。「pop 后再扫一遍求 min」是 O(n)，把这一题的设计目标（每个操作 O(1)）拆了：

```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []   # 与主栈同长（或记录基准点也行）

    def push(self, x):
        self.stack.append(x)
        mn = min(x, self.min_stack[-1]) if self.min_stack else x
        self.min_stack.append(mn)

    def pop(self):
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

## 题型三：单调栈（本族的核心题型）

单调栈维护栈内元素（对应值）单调递增（或递减）的序列，新元素违反单调性时把栈顶弹出。它解决的问题有一条明确特征：**「对每个元素，找下一个/上一个更大/最小的位置」**。模板是：

```python
# 单调栈模板：对每个位置 i，找右侧第一个严格更大的值
def nextGreaterElement(nums):
    n = len(nums)
    res = [-1] * n          # 默认答案：右侧没有更大
    stack = []              # 存下标；对应值从栈底到栈顶单调递减
    for i, x in enumerate(nums):
        # x 比栈顶大 → 栈顶等到了它的答案，弹栈结算
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res              # 一直没被弹出的保持 -1
```

正确性的两个验证：

- **等号的选择跟题设走**：「第一个严格更大」用 `<`；「第一个 ≥」放宽为 `<=`。这两处最常出错
- **存下标而不是值**：结算要写回 `res` 的位置（或算两位置的边数差），只存值会丢掉位置信息

复杂度 O(n)：外层 + 内层 while 可以放心地一起看——while 每次弹出的元素**永不回栈**，所以弹栈总数 ≤ 入栈总数 = n，两个循环合起来才是 O(n)，内层 while 不构成第二个 n。

`nums = [2, 1, 2]` 的演化（单一模板按 `<` 弹）：

```text
res = [-1,-1,-1]
i=0, x=2：栈空，2 进栈                    stack=[0]
i=1, x=1：nums[0]=2 ≥ 1 不弹；1 进栈      stack=[0,1]
i=2, x=2：弹 1（nums[1]=1 < 2），res[1]=2；
          0 号处 nums[0]=2 不严格大于 2，停；2 进栈  stack=[0,2]
结尾 res = [2, 2, -1]——0 号从未被弹出，答案保持默认 -1
```

- 题型分布：[496 下一个更大元素](https://leetcode.cn/problems/next-greater-element-i/)、[739 每日温度](../problems/leetcode/0739_daily_temperatures.md)（递减栈）、[84 柱状图中最大矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/)、[42 接雨水](https://leetcode.cn/problems/trapping-rain-water/)（递增栈）——「下一个更暖/更大/更矮」这一语义上风格的题都已覆盖
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
