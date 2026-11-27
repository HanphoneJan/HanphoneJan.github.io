---
title: Python语法与算法速查
category: 参考手册
last_updated: 2026-11-16
---
# Python语法与算法速查

> 面试与笔试都在用的那一份 Python：**容器与内置函数**的 API、复杂度、易错点；**标准库**里能替你省掉手写循环的模块；**算法套路**的模板；以及**输入输出**那套只在 OJ 上才会出错的写法。
>
> 查 API 按右侧目录找过去，要写模板直接跳到[二分查找](#二分查找)那种小节。

## 复杂度速查总览

| 操作 | list | dict / set | deque | heapq |
|---|---|---|---|---|
| 随机访问 `a[i]` | O(1) | — | O(n) | O(1) 仅堆顶 |
| 末尾增删 | O(1) 均摊 | — | O(1) | O(log n) |
| **头部增删** | **O(n)** | — | **O(1)** | — |
| 中间插入/删除 | O(n) | — | O(n) | — |
| `val in 容器` | **O(n)** 线性扫描 | **O(1)** 均摊 | O(n) | — |
| 排序 `.sort()` | O(n log n) | — | — | O(n log n) |
| 原地堆化 `heapify` | — | — | — | **O(n)** |
| 二分查找 `bisect` | O(log n) | — | — | — |
| 构建 `Counter/dict` | — | O(n) | — | — |

> **核心结论**：判断"某元素是否存在"，用 `set` / `dict`（O(1)）而非 `list`（O(n)）。

## 一、容器与内置函数

> Python 的 list / dict / set 都是高度优化的实现，先搞清楚它们各自的复杂度与"哪个操作会悄悄变成 O(n)"，比背 API 重要得多。

### 字符串 str

#### 底层实现

CPython 中字符串是**不可变的 Unicode 字符序列**，根据字符范围自动选择存储方式：
- Latin-1 范围（≤ U+00FF）→ 每字符 1 字节
- BMP 范围（≤ U+FFFF）→ 每字符 2 字节
- 全 Unicode → 每字符 4 字节

不可变意味着**任何修改操作都会创建新字符串**，因此循环拼接字符串建议用 `''.join(list)` 而非 `+=`。CPython 对唯一引用的 `str` 有原地扩容优化，常见 `+=` 循环接近 O(n)，但最坏仍是 O(n²)，且跨实现不保证，`join` 更稳。

```
# 为什么 join 比 += 快？
# s += x 每次都要申请新内存、复制旧内容 → 累计 O(n²)
# ''.join(parts) 先算总长度、一次申请、一次写入 → O(n)
```

| 操作 | 时间复杂度 | 说明 |
|---|---|---|
| `s[i]` 索引 | O(1) | 直接偏移计算 |
| `s[a:b]` 切片 | O(k) k=切片长度 | 创建新字符串 |
| `s1 + s2` 拼接 | O(n+m) | 创建新字符串 |
| `sub in s` | O(n·m) 最坏 | CPython用优化过的Boyer-Moore-Horspool |
| `s.find/index` | O(n·m) 最坏 | 同上 |
| `s.split/join` | O(n) | 线性扫描 |
| `s.replace` | O(n) | 线性扫描 + 新建 |

#### 常用方法

**参数约定**：下面用 `[, ...]` 表示可选参数（更靠内的方括号为更内层的可选参数），用 `默认值` 标注缺省时的行为。

```python
# ============ 分割 / 拼接 / 去除 ============

split(
    sep=None,       # 分隔符；None 表示按任意空白符（空格/制表/换行）切
    maxsplit=-1     # 最多切 maxsplit 次；-1 表示不限制
)
rsplit(sep=None, maxsplit=-1)   # 从右往左切（取末尾字段时常用）
splitlines(keepends=False)      # 按换行符切，返回行列表；keepends=True 保留换行符
partition(sep)                  # 按 sep 只切第一刀，返回三元组 (前, sep, 后)；找不到返回 (s, '', '')
rpartition(sep)                 # 同 partition，但从右往左找
```

| 写法 | 含义 |
|---|---|
| `s.split()` | 按**任意连续空白**切成单词（自动合并，**不保留空串**） |
| `s.split(' ')` | 按**单个空格**切，**保留**空串：`' a  b'.split(' ')` → `['', 'a', '', 'b']` |
| `s.split(',')` | 按 `,` 切，**保留**空串 |
| `s.split(',', 1)` | 只切第 1 个 `,`，返回 2 段（用于拆分"键=值"） |
| `s.partition(',')` | 只切第一刀，返回三元组，**找不到不报错**（比 `split` 更语义化） |
| `s.splitlines()` | 按换行切行，**末尾空行不产生空串**（`split('\n')` 会产生） |
| `s.rsplit(' ', 1)` | 从右切一刀，取最后一个字段：`'a.b.c'.rsplit('.', 1)` → `['a.b', 'c']` |

> **`split()` vs `split(' ')`**：不传参按**任意连续空白**切并自动合并，适合读入（`map(int, input().split())`）；传空格则按**单个空格**精确切分，会保留空串，适合需要区分连续空格的场景。

```python
join(iterable)      # 用 s 作连接符拼接，如 ','.join(['leet','code']) => 'leet,code'
```

**算法应用：**

```python
# 拆分"键=值"：partition 比 split(',', 1) 语义更清晰，且缺 sep 时不报错
key, _, value = "name=hanphone".partition('=')
# 取版本号/文件路径最后一个段
last = "1.2.3".rsplit('.', 1)[-1]            # '3'
# 按行读多行字符串（可配合 .strip() 去掉每行换行）
for line in text.splitlines():
    line = line.strip()
```

```python
strip(
    [chars]     # 可选：要去除的字符集合，缺省去除 \r \n \t 空格 等空白
)
lstrip([chars])     # 只去左侧
rstrip([chars])     # 只去右侧
```

**易错点**：
- `chars` 是**字符集合**而非子串：`'aabxybaa'.strip('ab')` → `'xy'`（首尾任意个 `a`/`b` 全部去掉）
- 默认空白集合包含 `\r \n \t` 空格，所以 `line.strip()` 能同时处理 Windows 的 `\r\n` 和 Linux 的 `\n` 换行
- **ACM 读行**：`int(input())` 会自动忽略两侧空白，无需手动处理；只有**读字符串/文件行**时才需手动去换行——`line.strip()` 去整行空白，`line.rstrip('\n')` 只去行尾换行（`\r` 常是 Windows 换行残留）
- `strip` 返回**新字符串**，不修改原串（字符串不可变）

```python
replace(
    old,            # 要替换的旧子串
    new,            # 新子串
    [, count        # 可选：最多替换 count 次；不写则全部替换
    ]
)
```

```python
# ============ 查找 / 判断 ============

count(
    sub,            # 必填：要统计的子串
    [, start        # 可选：开始位置，默认 0
        [, end]     # 更内层可选：结束位置，默认到末尾（左闭右开 [start,end)）
    ]
)
```

| 写法 | 含义 |
|---|---|
| `s.count(sub)` | 在整个 `s` 中统计 `sub` 出现次数 |
| `s.count(sub, start)` | 在 `s[start:]` 中统计 |
| `s.count(sub, start, end)` | 在 `s[start:end]` 中统计 |

```python
find(sub[, start[, end]])    # 返回第一个匹配的下标，找不到返回 -1（不报错）
index(sub[, start[, end]])   # 同 find，但找不到抛出 ValueError
rfind(sub[, start[, end]])   # 从右向左找，返回最后一个匹配下标
rindex(sub[, start[, end]])  # 从右向左找，找不到抛异常
startswith(prefix[, start[, end]])  # 在 [start,end) 范围内是否以 prefix 开头
endswith(suffix[, start[, end]])    # 在 [start,end) 范围内是否以 suffix 结尾

# ============ 类型判断 ============
isdigit()                    # 是否全为数字字符
isalpha()                    # 是否全为字母
isalnum()                    # 是否全为字母或数字
isspace()                    # 是否全为空白字符
isupper()                    # 是否全为大写字母
islower()                    # 是否全为小写字母

# ============ 大小写转换 ============
upper()                      # 全部大写
lower()                      # 全部小写
capitalize()                 # 首字母大写，其余小写
title()                      # 每个单词首字母大写
swapcase()                   # 大小写互换

# ============ 对齐填充 ============
center(width[, fillchar])    # 居中对齐，两侧用 fillchar 填充（默认空格）
ljust(width[, fillchar])     # 左对齐（右侧填充）
rjust(width[, fillchar])     # 右对齐（左侧填充）
zfill(width)                 # 左侧填充 '0'（常用于补位数）

# ============ 字符编码 ============
ord(c)                       # 字符转ASCII码，如 ord('a') => 97
chr(i)                       # ASCII码转字符，如 chr(97) => 'a'
```

> **区分 `find` 与 `index`**：`find` 找不到返回 `-1`（适合判断），`index` 抛 `ValueError`（适合确定存在时取值）。`split` 与 `splitlines`：`splitlines` 只按换行符切，`split('\n')` 在末尾空行时会多出空串。

#### 算法应用

```python
# 进制转换（LeetCode 191. Number of 1 Bits）
bin(n)                       # 转为二进制字符串，如 bin(10) => '0b1010'
bin(n).count('1')            # 统计二进制中1的个数
oct(n)                       # 转为八进制字符串
hex(n)                       # 转为十六进制字符串
format(n, 'b')               # 转为二进制字符串（无前缀）
format(n, '08b')             # 转为8位二进制字符串（不足补0）
format(n, 'o')               # 转为八进制字符串（无前缀）
format(n, 'x')               # 转为十六进制字符串（无前缀）

# 字符串与数字互转
num = int("123")             # 字符串转整数
num = int("ff", 16)          # 十六进制字符串转整数
num = int("1010", 2)         # 二进制字符串转整数
s = str(123)                 # 整数转字符串

# 字符处理技巧
chars = list("hello")        # 字符串转字符列表
s = ''.join(chars)           # 字符列表转字符串
s[::-1]                      # 反转字符串
sorted(s)                    # 返回排序后的字符列表（不改变原字符串）

# eval：将字符串作为表达式计算（谨慎使用）
eval("1 + 2")                # => 3
eval("'hello'.upper()")      # => 'HELLO'
```

> **`map(int, input().split())` 全链路**（ACM 读入的核心，一步步拆开看）：
> 1. `input()` 读入**一整行**（含末尾换行），如 `"1 2 3\n"`
> 2. `.split()` 按任意连续空白切成 `['1', '2', '3']`（自动吞掉换行和多余空格）
> 3. `map(int, ...)` 逐个转整数，返回**惰性迭代器**（此时还没算）
> 4. 外层 `list(...)` / 解包 / 遍历才真正求值，得到 `[1, 2, 3]`
> 所以 `list(map(int, input().split()))` 一行就完成"读一行 → 切词 → 全转 int → 成列表"。

### 列表 list

#### 底层实现

CPython 中 list 是**动态数组（array of pointers）**，存储的是指向 PyObject 的指针数组，而非元素本身。

**扩容策略**（不是翻倍，而是 ~1.125 倍）：
```
新容量 = 旧容量 + (旧容量 >> 3) + (旧容量 < 9 ? 3 : 6)
# 即：0→4→8→16→25→35→46→58→72→88...
```
均摊下来 `append` 是 O(1)。每次扩容需复制所有指针，代价是 O(n)，但触发频率低。

**`val in lst` 的实现**：逐一比较每个元素（先比地址，相同则返回 True；否则调用 `__eq__`），最坏 O(n)，找不到时必须扫完全部。

```python
# 演示：list 的 in 是 O(n) 线性扫描
lst = list(range(10_000_000))
val = 9_999_999

# 慢：O(n)
val in lst          # ~100ms

# 快：O(1)，先转 set
s = set(lst)        # O(n) 一次性构建
val in s            # ~50ns
```

| 操作 | 时间复杂度 | 说明 |
|---|---|---|
| `lst[i]` | O(1) | 指针偏移，极快 |
| `lst.append(x)` | O(1) 均摊 | 偶尔触发 O(n) 扩容 |
| `lst.pop()` | O(1) | 尾部，无需移动 |
| `lst.insert(0, x)` | **O(n)** | 所有元素右移 |
| `lst.pop(0)` | **O(n)** | 所有元素左移 |
| `lst.remove(x)` | O(n) | 先查找 O(n)，再移动 O(n) |
| `x in lst` | **O(n)** | 线性扫描，无哈希 |
| `lst.sort()` | O(n log n) | Timsort，稳定排序 |
| `lst.reverse()` | O(n) | 原地翻转 |
| `lst[a:b]` | O(k) | k=切片长 |
| `lst.count(x)` | O(n) | 全量扫描 |
| `lst.index(x)` | O(n) | 找到即返回 |

> **Timsort**：Python 的排序算法，结合归并排序与插入排序，对部分有序数据特别高效（接近 O(n)），最坏 O(n log n)，**稳定**（相等元素不改变相对顺序）。

#### 常用方法

**增删**（区分 `append` / `extend` / `insert`，三者各司其职）：

| 方法 | 作用 | 复杂度 |
|---|---|---|
| `lst.append(x)` | 末尾添加**单个**元素 | O(1) |
| `lst.extend(t)` | 末尾批量添加（把 `t` 的每个元素逐个加入），等价于 `lst += t` | O(k) |
| `lst.insert(i, x)` | 在位置 `i` 插入（元素右移） | O(n) |
| `lst.pop()` | 移除并返回最后一个元素 | O(1) |
| `lst.pop(i)` | 移除并返回位置 `i` 的元素 | O(n) |
| `lst.remove(x)` | 移除**第一个**等于 `x` 的元素，不存在抛 `ValueError` | O(n) |
| `lst.clear()` | 清空 | O(n) |

```python
# 易错：append 与 extend 的区别
lst.append([1, 2])     # 把整个列表作为单个元素加入 → [[1, 2]]
lst.extend([1, 2])     # 把两个元素逐个加入 → [1, 2]
```

**查询**：

```python
count(x)                    # 统计 x 出现次数
index(
    x,                      # 必填：要查找的元素
    [, start                # 可选：从下标 start 开始查，默认 0
        [, end]             # 更内层可选：查到 end 为止（左闭右开）
    ]
)
```
- 找到返回下标，找不到抛 `ValueError`
- `lst.index(x)` 查全表；`lst.index(x, start)` 从 `start` 开始；`lst.index(x, start, end)` 限定范围

```python
val in lst                  # 判断是否存在，O(n)

# 排序与反转
lst.sort(key=None, reverse=False)  # 原地排序（稳定）
sorted(lst, key=None, reverse=False)  # 返回新列表，不改原列表
lst.reverse()                      # 原地反转
lst[::-1]                          # 切片反转，返回新列表
reversed(lst)                      # 返回反向迭代器（不创建新列表，省内存）

# 其他
lst.copy()            # 浅拷贝
len(lst)              # 列表长度
sum(lst)              # 求和
min(lst)              # 最小值
max(lst)              # 最大值
```

> **`sort` 的 `key`**：传入一个"取排序依据"的函数，如 `lst.sort(key=lambda x: x[1])` 按第二元素排；`reverse=True` 等价于倒序，也可用 `key=lambda x: -x`。

#### 列表推导式

```python
# 基本用法
squares = [x**2 for x in range(10)]

# 带条件
evens = [x for x in range(10) if x % 2 == 0]

# 嵌套（二维展平）
flat = [x for row in matrix for x in row]

# 二维列表初始化（注意浅拷贝问题）
matrix = [[0] * n for _ in range(m)]  # 正确：每行独立
# matrix = [[0] * n] * m              # 错误！所有行引用同一对象

# 带索引遍历（enumerate）
for i, val in enumerate(lst):
    print(i, val)

# 同时遍历两个列表（zip）
for a, b in zip(lst1, lst2):
    print(a, b)
```

#### 切片操作

```python
# --- 读取（返回新列表，原列表不变）---
lst[start:end]        # 左闭右开 [start, end)，负索引从尾部数
lst[start:end:step]   # 带步长，step 可为负数
lst[:]                # 全部元素（等价于浅拷贝）
lst[::-1]             # 整体反转
lst[::2]              # 偶数索引元素（0,2,4,...）
lst[1::2]             # 奇数索引元素（1,3,5,...）
lst[:k]               # 前 k 个元素
lst[-k:]              # 后 k 个元素
lst[:-k]              # 去掉最后 k 个元素

# --- 写入（切片赋值，原地修改）---
lst[1:3] = [10, 20]           # 替换区间（长度可以不等！）
lst[1:3] = []                 # 删除区间（等价于 del lst[1:3]）
lst[1:1] = [10, 20]           # 在 index=1 处插入（不删除原元素）
lst[::2] = [0] * len(lst[::2]) # 将所有偶数索引元素置 0

# --- 常见 coding 技巧 ---
a, b = lst[:n], lst[n:]       # 将列表分成两段
lst[l:r+1] = lst[l:r+1][::-1] # 反转子数组 [l, r]（LeetCode 原地反转技巧）

# 示例：旋转数组右移 k 位（LeetCode 189）
def rotate(nums, k):
    k %= len(nums)
    nums[:] = nums[-k:] + nums[:-k]   # nums[:] 是原地修改（不新建列表引用）
    # 不能写 nums = nums[-k:] + nums[:-k]，那样只是改了局部变量
```

#### 拷贝：浅拷贝 vs 深拷贝

```python
# --- 三种等价的浅拷贝 ---
b = lst.copy()     # 列表方法，语义最清晰
b = lst[:]         # 切片语法，最简洁，常见于 coding
b = list(lst)      # 构造函数，适用于任意可迭代对象

# 浅拷贝只复制"第一层"，嵌套列表仍共享引用
a = [[1, 2], [3, 4]]
b = a.copy()       # b 是新列表，但 b[0] 和 a[0] 指向同一个 [1, 2]
b[0].append(99)
print(a)           # [[1, 2, 99], [3, 4]]  ← a 也变了！
b[1] = [99]
print(a)           # [[1, 2, 99], [3, 4]]  ← a 不变（替换整行不影响 a）

# --- 深拷贝：完全独立 ---
import copy
b = copy.deepcopy(a)  # 递归复制所有层，b 与 a 完全独立

# --- coding 中最常见的坑 ---
path = []
def dfs():
    ans.append(path)        # 错误！path 是引用，后续修改会影响 ans 中的结果
    ans.append(path[:])     # 正确：每次记录当前状态的副本
    ans.append(list(path))  # 等价写法
```

> **何时用深拷贝？** 只有嵌套结构（列表的列表、列表的字典等）且需要完全独立时才用 `deepcopy`，代价较高（O(n) 且常数大）。大多数算法题用 `path[:]` 即可。

#### 算法常用技巧

```python
# --- 初始化 ---
lst = [0] * n                          # 全 0 列表
lst = [float('inf')] * n               # 全无穷（初始化 dp/距离数组）
lst = list(range(n))                   # [0, 1, 2, ..., n-1]
matrix = [[0]*cols for _ in range(rows)]  # 二维数组（每行独立！）

# --- 解包 ---
a, b, c = [1, 2, 3]                   # 直接解包
first, *rest = lst                     # 头部 + 剩余
*init, last = lst                      # 剩余 + 尾部
a, *mid, b = lst                       # 首尾 + 中间
merged = [*lst1, *lst2]                # 合并列表（等价于 lst1 + lst2）
a, b = b, a                            # 交换两变量（Python 特有，无需 tmp）

# --- 输入处理（ACM 模式）---
n = int(input())
lst = list(map(int, input().split()))  # 读一行整数
matrix = [list(map(int, input().split())) for _ in range(n)]  # 读矩阵

# --- 矩阵操作 ---
# 转置矩阵（行列互换）
transposed = list(map(list, zip(*matrix)))
# 顺时针旋转 90°
rotated = list(map(list, zip(*matrix[::-1])))
# 逆时针旋转 90°
rotated = list(map(list, zip(*matrix)))[::-1]

# --- 排序技巧 ---
lst.sort(key=lambda x: x[1])                    # 按第二元素升序
lst.sort(key=lambda x: (-x[1], x[0]))           # 按第二元素降序，再按第一升序
lst.sort(key=lambda x: (len(x), x))             # 按长度，再按字典序
words.sort(key=lambda w: [ord(c)-ord('a') for c in w])  # 自定义字母顺序

import functools
lst.sort(key=functools.cmp_to_key(lambda a, b: a - b))  # 自定义比较函数

# --- 常用聚合 ---
total = sum(lst)
total = sum(x**2 for x in lst)         # 生成器表达式，不创建中间列表
max_val = max(lst)
max_val = max(lst, key=lambda x: x[1]) # 按第二元素找最大
max_val = max(lst, default=0)          # 空列表时返回 default（Python 3.4+）
flat_sum = sum(sum(row) for row in matrix)  # 矩阵求和

# --- 去重与统计 ---
unique = list(set(lst))                # 去重（不保序）
unique_sorted = sorted(set(lst))       # 去重并排序
freq = {}
for x in lst: freq[x] = freq.get(x, 0) + 1   # 手动计数

# --- 双指针/滑动窗口常用 ---
left, right = 0, len(lst) - 1         # 对撞指针初始化
while left < right:
    # ... 双指针逻辑 ...
    left += 1; right -= 1
```

> **前缀和、差分、位运算的完整模板在后面「三、算法套路」里：[前缀和与差分](#前缀和与差分)、[位运算](#位运算)。** 这里只列到"怎么初始化一个数组"，不重复贴算法骨架。

#### 与 array.array、链表的区别

| 特性     | Python列表           | array.array | 链表               |
| -------- | -------------------- | ----------- | ------------------ |
| 存储方式 | 动态数组（连续内存） | 连续内存    | 非连续内存         |
| 随机访问 | O(1)                 | O(1)        | O(n)               |
| 头部插入 | O(n)                 | O(n)        | O(1)               |
| 尾部插入 | O(1)均摊             | O(1)均摊    | O(1)（已知尾节点） |
| 内存开销 | 较小                 | 最小        | 较大（需存储指针） |
| 元素类型 | 任意                 | 固定        | 任意               |

```python
import array

# array模块用于大规模数值计算，元素类型固定，内存比list省
arr = array.array('i', [1, 2, 3])  # 'i'表示有符号整数
arr = array.array('d', [1.0, 2.5]) # 'd'表示双精度浮点数

# 常用类型码
# 'b': 有符号字节    'B': 无符号字节
# 'i': 有符号整数    'I': 无符号整数
# 'f': 单精度浮点    'd': 双精度浮点
```

### 字典 dict

#### 底层实现

CPython 3.6+ 的 dict 是**紧凑哈希表（compact hash table）**，由两部分组成：
- **索引数组**（稀疏）：存储哈希槽，记录"键值对在 entries 数组中的位置"
- **entries 数组**（紧凑）：按插入顺序存储 `(hash, key, value)` 三元组

这使得 dict 在 Python 3.7+ **保证插入顺序**，且内存比旧版紧凑约 20-25%。

**哈希流程**：
```
1. 计算 hash(key) → 整数
2. hash & (capacity-1) → 初始槽位 i（capacity 总是 2 的幂）
3. 若槽位空 → 插入；若 hash 和 key 均相等 → 更新；否则 → 探测下一槽
4. 探测方式：i = (5*i + 1 + perturb) % capacity  （伪随机探测，非线性探测）
```

**负载因子**：默认 2/3，超过后触发扩容（容量翻倍），重新哈希所有键。

**哈希冲突**：最坏情况（所有键哈希相同）退化为 O(n)，实际中极少发生。

```python
# 为什么 key in dict 是 O(1)？
# 1. hash(key) 计算出槽位，直接跳转 → 不需要遍历
# 2. 只有极少数冲突需要探测 1-2 次
d = {i: i for i in range(10_000_000)}
999999 in d   # ~50ns，和 n=10 时几乎一样快
```

| 操作 | 时间复杂度 | 说明 |
|---|---|---|
| `d[key]` / `d.get(key)` | O(1) 均摊 | 哈希查找 |
| `d[key] = val` | O(1) 均摊 | 哈希插入/更新 |
| `del d[key]` | O(1) 均摊 | 哈希删除 |
| `key in d` | **O(1) 均摊** | 哈希查找 |
| `d.keys()` / `.values()` / `.items()` | O(1) | 返回视图，不复制 |
| 遍历 `for k in d` | O(n) | 遍历 entries 数组 |
| `d.update(other)` | O(m) m=other大小 | 逐个插入 |
| 构建 `dict(pairs)` | O(n) | 逐个哈希插入 |

> **为什么自定义类的对象默认可哈希？** Python 对象默认用 `id()`（内存地址）作为哈希值，所以任意对象都可以作为 dict 的 key。但如果定义了 `__eq__`，必须同时定义 `__hash__`（否则变为不可哈希）。

#### 常用方法

**读取**（区分 `d[key]` 与 `d.get`，前者可能抛错）：

| 写法 | 不存在时 | 典型用途 |
|---|---|---|
| `d[key]` | 抛 `KeyError` | 确定键存在时取值 |
| `d.get(key, default)` | 返回 `default`（默认 `None`） | 安全读取 |
| `d.setdefault(key, default)` | 先写入默认值再返回 | 惰性初始化 |

```python
d.get(
    key,
    default=None    # 可选：key 不存在时返回的值，缺省 None
)
d.setdefault(
    key,
    default=None    # key 不存在时，先把 d[key] 设为 default，再返回 default
)
```

**修改 / 删除**：

```python
d[key] = val                     # 键存在则更新，不存在则新增
d.update(other)                  # 批量更新（other 可为字典 / 键值对 / 可迭代元组）
d.pop(
    key,
    [, default                   # key 不存在时返回 default；缺省且 key 不存在则抛 KeyError
    ]
)                                # 删除并返回 key 对应的值
d.popitem()                      # 删除并返回最后一个键值对（3.7+ LIFO 序）
del d[key]                       # 删除指定键，不存在抛 KeyError
d.clear()                        # 清空
```

**视图对象**（动态，随字典变化同步更新，不复制数据）：

```python
d.keys()      # 键视图
d.values()    # 值视图
d.items()     # (键, 值) 视图
```

**构造技巧**：

```python
dict.fromkeys(iterable, value=None)  # 用可迭代对象批量建键，统一初值 value
{k: v for k, v in pairs}            # 字典推导式
```

> **`pop` vs `del`**：`pop` 带默认值、安全；`del` 快但键不存在会抛 `KeyError`。**`get` vs `setdefault`**：`get` 只读不改，`setdefault` 会在缺键时**写回**默认值。

#### 提取键 / 值 / 键值对

`.keys()` / `.values()` / `.items()` 返回的是**视图**：能 `len()`、`in`、迭代，会随字典变化，但**不能下标**。要一份独立的列表就套 `list()`（O(n) 复制）。

| 想要 | 写法 | 结果 |
|---|---|---|
| 键列表 | `list(d)` / `list(d.keys())` | `['a', 'b', 'c']` |
| 值列表 | `list(d.values())` | `[3, 2, 2]` |
| 键值对列表 | `list(d.items())` | `[('a', 3), ('b', 2), ('c', 2)]` |
| 键的元组 | `tuple(d)` | `('a', 'b', 'c')` |

```python
d = {'a': 3, 'b': 2, 'c': 2}

list(d)              # 键列表，等价 list(d.keys())
list(d.values())     # 值列表
list(d.items())      # [(键, 值), ...]

d.keys() | {'z'}     # 键视图支持集合运算 → {'a', 'b', 'c', 'z'}
```

**聚合**（值都是数字时）：

```python
sum(d.values())                        # 所有值求和 → 7
sum(v for v in d.values() if v > 2)    # 带条件求和 → 3
min(d.values()) / max(d.values())      # 最值
len(d)                                 # 键的个数 → 3（不是值的和）
```

> **`sum(d)` 累加的是键，不是值。** 键是字符串时（`{'a': 1}`）会抛 `TypeError: unsupported operand type(s) for +: 'int' and 'str'`，要值的和必须写 `sum(d.values())`。`Counter` 另有 `cnt.total()`（3.10+），普通字典没有这个方法。

**合并**（重复键以后面的为准）：

```python
merged = d1 | d2        # 3.9+，返回新字典，d1 不变
merged = {**d1, **d2}   # 3.5+ 的等价写法
d1.update(d2)           # 原地合并进 d1，返回 None
```

> **`|` 与 `|=` 不是一回事**：`d1 | d2` 产出新字典；`d1 |= d2` 等价于 `d1.update(d2)`，会改掉 `d1`。`{**d1, **d2}` 与 `|` 结果相同，但对 3.9 以前的版本也可用。

#### 迭代技巧

```python
# 遍历键值对
for k, v in d.items():
    print(k, v)

# 按键排序遍历
for k in sorted(d):
    print(k, d[k])

# 按值排序遍历（升序）
for k, v in sorted(d.items(), key=lambda x: x[1]):
    print(k, v)

# 按值排序遍历（降序）
for k, v in sorted(d.items(), key=lambda x: -x[1]):
    print(k, v)

# 判断键是否存在
key in d                       # O(1)
key not in d                   # O(1)
```

#### 排序

`sorted()` **不改原字典**，返回一个列表；想要「排好序的新字典」再套一层 `dict()`。
`d.items()` 里的每一项是 `(键, 值)` 元组，`key=lambda kv: ...` 里的 `kv` 就是它。

```python
d = {'b': 2, 'a': 3, 'c': 2}

# 只排序键 —— 返回键的列表（等价于 sorted(d.keys())）
sorted(d)                                          # ['a', 'b', 'c']

# 只排序键值对 —— 返回 (键, 值) 列表，默认按键排序
sorted(d.items())                                  # [('a', 3), ('b', 2), ('c', 2)]

# 按键排序，返回新字典
dict(sorted(d.items()))                            # {'a': 3, 'b': 2, 'c': 2}

# 按值升序
dict(sorted(d.items(), key=lambda kv: kv[1]))      # {'b': 2, 'c': 2, 'a': 3}

# 按值降序
dict(sorted(d.items(), key=lambda kv: kv[1], reverse=True))   # {'a': 3, 'b': 2, 'c': 2}

# 值相同则按键升序（多关键字：先按值，再按键）
dict(sorted(d.items(), key=lambda kv: (kv[1], kv[0])))        # {'b': 2, 'c': 2, 'a': 3}
```

> **按值降序的两种写法**：`reverse=True` 通用；`key=lambda kv: -kv[1]` 更短，但**只对数值成立**（字符串取负会报 `TypeError`）。
>
> **多关键字里排在前面的优先级更高**：`(kv[1], kv[0])` 是「先按值，值相同再按键」。想「值降序 + 键升序」要写 `key=lambda kv: (-kv[1], kv[0])`（同样要求值是数字）；**别写成 `key=lambda kv: (kv[1], kv[0]), reverse=True`** —— `reverse` 会把两个字段一起翻，值降序的同时键也降序了。
>
> **`sorted` 是稳定的**：`key` 只取一个字段时，值相同的元素保持原有相对顺序（Python 3.7+ 字典本身有序，所以这个「原有顺序」就是插入顺序）。`reverse=True` 也**不会打乱**这个顺序 —— 它只是把「不同值之间」的顺序倒过来，相等键的先后不变。
>
> **字典没有 `.sort()`**：`d` 和 `d.items()` 都不能原地排序，必须先 `sorted()` 转成列表，需要字典再 `dict()` 转回去。

### 集合 set

#### 底层实现

set 和 dict 共用同一套哈希表机制，区别是 set **只存 key，不存 value**。

- 底层：稀疏哈希表，槽位只存 `(hash, key)`
- 负载因子：2/3，超过后扩容
- **`val in set`**：计算 hash(val) → 直接定位槽位 → O(1)

```python
# list vs set 的 in 性能对比（10M 元素）
import time
data = list(range(10_000_000))
s = set(data)
target = 9_999_999

# list: O(n)，约 100ms
t0 = time.time(); _ = target in data; print(time.time()-t0)

# set: O(1)，约 50ns
t0 = time.time(); _ = target in s;    print(time.time()-t0)
```

| 操作 | 时间复杂度 | 说明 |
|---|---|---|
| `s.add(x)` | O(1) 均摊 | 哈希插入 |
| `x in s` | **O(1) 均摊** | 哈希查找 |
| `s.remove(x)` / `s.discard(x)` | O(1) 均摊 | 哈希删除 |
| `s1 \| s2` 并集 | O(n+m) | 遍历两个集合 |
| `s1 & s2` 交集 | O(min(n,m)) | 遍历较小集合，在较大集合中查找 |
| `s1 - s2` 差集 | O(n) | 遍历 s1 |
| `s1 ^ s2` 对称差 | O(n+m) | — |
| `set(lst)` 构建 | O(n) | 逐个插入 |

> **为什么 set 的交集是 O(min(n,m)) 而非 O(n+m)？** CPython 会自动选择遍历较小的集合，对每个元素在较大集合中做 O(1) 哈希查找。

#### 常用方法

**创建**：

```python
s = {1, 2, 3}              # 字面量（注意：{} 是空字典，空集合必须 set()）
s = set([1, 2, 2, 3])      # 从可迭代对象创建（自带去重）
s = set()                  # 空集合（不能写 {}）
```

**增删**（重点区分 `remove` 与 `discard`）：

```python
s.add(x)                     # 添加单个元素，已存在则无操作
s.update(*others)            # 批量添加（可传多个集合/可迭代对象）
s.remove(x)                  # 删除 x，不存在抛 KeyError
s.discard(x)                 # 删除 x，不存在则不报错（推荐用于"可能不存在"）
s.pop()                      # 弹出并返回任意一个元素（集合无序，结果随机）
s.clear()                    # 清空
```

**集合运算**（运算符与等价方法）：

| 运算符 | 等价方法 | 含义 | 复杂度 |
|---|---|---|---|
| `s1 \| s2` | `union()` | 并集 | O(n+m) |
| `s1 & s2` | `intersection()` | 交集 | O(min(n,m)) |
| `s1 - s2` | `difference()` | 差集（属 s1 不属 s2） | O(n) |
| `s1 ^ s2` | `symmetric_difference()` | 对称差（只属其一） | O(n+m) |

**关系判断**：

```python
x in s                     # O(1) 查询
s1.issubset(s2)            # s1 ⊆ s2（s1 <= s2）
s1.issuperset(s2)          # s1 ⊇ s2（s1 >= s2）
s1.isdisjoint(s2)          # 两集合无交集
```

#### 去重与快速查找

```python
# 列表去重（不保序，最简洁）
unique = list(set(lst))

# 列表去重（保持原顺序）
seen = set()
unique = [x for x in lst if not (x in seen or seen.add(x))]

# 利用集合快速查找：O(n)构建，O(1)查询
lookup = set(lst)
if target in lookup:
    print("found")

# 两数之和经典用法
def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
```

### 内置函数速查

> 先记签名，下面两个（`zip` / `enumerate`）再展开。排序 key 的多键、降序、`cmp_to_key` 写法在「列表 → 算法常用技巧」里，这里不重复。

```python
# 排序相关
sorted(iterable, key=None, reverse=False)   # 返回新列表，不改原序列
lst.sort(key=None, reverse=False)           # 原地排序，只能用于 list

# 常用内置函数
enumerate(iterable, start=0)   # 返回(索引, 元素)对
zip(*iterables)                # 并行迭代多个序列
map(func, iterable)            # 对每个元素应用函数，返回惰性迭代器
filter(func, iterable)         # 过滤满足条件的元素
any(iterable)                  # 任一为真则返回True
all(iterable)                  # 全部为真则返回True
sum(iterable, start=0)         # 求和（start为初始值）
min(iterable, key=None)        # 最小值
max(iterable, key=None)        # 最大值

# 示例
nums = [3, 1, 4, 1, 5]
print(list(map(str, nums)))      # ['3','1','4','1','5']
print(list(filter(lambda x: x>2, nums)))  # [3, 4, 5]
print(any(x > 4 for x in nums))  # True
print(all(x > 0 for x in nums))  # True
```

#### zip：把多个序列按位置对齐打包

**作用**：把多个可迭代对象中**下标相同**的元素配成元组，返回迭代器。
`zip(a, b)` ≈ `[(a[0],b[0]), (a[1],b[1]), ...]`，长度以最短的为准。

**算法用途**：
1. 同时遍历多个数组，避免下标循环
2. 矩阵转置 `list(zip(*matrix))`
3. 两个并行列表拼成字典 `dict(zip(keys, values))`

```python
names  = ['a', 'b', 'c']
scores = [90, 85, 88]
for name, score in zip(names, scores):   # 同时遍历两个列表
    print(name, score)                    # a 90 / b 85 / c 88

list(zip([1, 2, 3], ['x', 'y', 'z']))    # [(1,'x'), (2,'y'), (3,'z')]

# 矩阵转置（*matrix 表示把 matrix 拆成多行，等价于 zip(row1, row2, ...)）
matrix = [[1, 2, 3], [4, 5, 6]]
list(zip(*matrix))                        # [(1, 4), (2, 5), (3, 6)]
```

#### enumerate：遍历时同时拿到下标与值

**作用**：把可迭代对象变成"（下标, 元素）"对，省去手动维护计数器。
`enumerate(arr)` ≈ `[(0,arr[0]), (1,arr[1]), ...]`，第二个参数指定起始下标（默认 0）。

**算法用途**：任何需要下标的地方（记录位置、比较相邻元素、滑动窗口右指针）几乎必用。

```python
arr = ['a', 'b', 'c']
for i, val in enumerate(arr):      # 同时拿到下标和值
    print(i, val)                   # 0 a / 1 b / 2 c

for i, val in enumerate(arr, 1):   # 下标从 1 开始（如打印"第几行"）
    print(i, val)

# 经典用法：一边遍历一边记录元素位置（如两数之和）
for i, x in enumerate(nums):
    if x == target:
        print(i)
```

### 值比较、真值与解包

> 收录"看似简单常见、实则藏着细节"的内建知识——正是写题时最容易踩坑的地方。

#### 值比较：`==`、`is` 与 `__eq__`

| 写法 | 问的问题 | 底层 |
|---|---|---|
| `a == b` | 值是否相等 | `a.__eq__(b)` |
| `a is b` | 是不是同一个对象 | `id(a) == id(b)` |
| `hash(a) == hash(b)` | 哈希是否相同（不保证相等） | `a.__hash__()` |

- `==` 比较**值**（内容），`is` 比较**身份**（是不是同一个对象）。判断 `None` 一律写 `x is None`：`None` 是单例，而 `==` 可能被自定义类重载。
- 小整数（-5~256）和短字符串会被**缓存/驻留**，所以 `a = 100; b = 100; a is b` 可能为 `True`——这是 CPython 的实现细节，**不要依赖**。3.8+ 对 `x is 1` 这类字面量比较会给出 `SyntaxWarning`（提示 `Did you mean "=="?`）。
- `id()` 只在对象存活期间唯一：对象回收后，新对象可能拿到同一个 `id`，不要把 `id` 当长期标识存起来。

```python
[1, 2] == [1, 2]      # True（内容相同）
[1, 2] is [1, 2]      # False（两个不同对象）
```

**自定义类默认按身份比。** `object.__eq__` 就是身份比较；重写 `__eq__` 后 Python 会把 `__hash__` 置为 `None`，对象立刻不可哈希，要进 `set`/`dict` 必须一起实现 `__hash__`。`@dataclass` 默认 `eq=True`、`frozen=False`，同样不可哈希；用 `@dataclass(frozen=True)` 或自己补 `__hash__`。

```python
class User:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return isinstance(other, User) and self.name == other.name

    def __hash__(self):
        return hash(self.name)
```

**数值相等比想象中宽。** `1 == 1.0 == True` 为 `True`，三者的 `hash` 也相同，所以 `{1, True, 1.0}` 只剩一个元素。`Decimal("1.0") == Decimal("1.00")` 也为 `True`（按数值比，和 Java 的 `BigDecimal.equals` 相反）。

**浮点不能直接 `==`。** `0.1 + 0.2 == 0.3` 为 `False`，用 `math.isclose(a, b)`。`NaN != NaN`，但 `nan is nan` 为 `True`；`nan in [nan]` 能命中是因为 `in` 先做身份判断，换一个 `NaN` 对象就找不到了。

**容器比较是逐元素的。** `[1, 2] == [1, 2.0]` 为 `True`，`[1, 2] == (1, 2)` 为 `False`（类型不同）。`in`、`list.index`、`list.remove` 用 `==`；`set`/`dict` 先用 `hash` 定位再用 `==` 确认。NumPy 数组例外：`==` 返回布尔数组，`if arr == 0:` 会抛 `ValueError`，用 `np.array_equal` 或 `(arr == 0).all()`。

**排序用的是 `<` 不是 `==`。** `sorted`、`min`、`max` 都靠 `__lt__`，只实现 `__eq__` 的类直接排序会抛 `TypeError`；补齐比较运算可以用 `functools.total_ordering`。

和 Java 的逐项对照见 [Python 与 Java 的值比较](/docs/后端/Python与Java值比较.html)。

#### 真值判断与短路

- 空列表 `[]`、空串 `''`、`0`、`None`、空 dict/set 都是 **falsy**，直接 `if x:` 判断即可，不要写 `if len(x) != 0:`。
- `and`/`or` **返回操作数本身**（不是布尔值），这是常见惯用法的来源：

```python
x = name or "unknown"      # name 为空时用默认值（"或默认"惯用法）
y = a and b                # a 为假返回 a，否则返回 b
if lst and lst[0]:         # 短路：先判空再访问，避免 IndexError
    ...
```

#### `*` 解包（星号运算符）

| 写法 | 作用 |
|---|---|
| `print(*arr)` | 把列表展开成多个位置参数，等价 `print(arr[0], arr[1], ...)` |
| `zip(*matrix)` | 解包多行做矩阵转置 |
| `a, *mid, b = lst` | 海象解包：首尾固定、中间归为列表 |
| `merged = [*a, *b]` | 拼接列表（等价 `a + b`） |
| `def f(*args)` | 收集任意多个位置参数为元组 |

```python
print(*[1, 2, 3])        # 1 2 3（print 默认空格分隔）
head, *rest = [1, 2, 3]  # head=1, rest=[2, 3]
```

#### 其他易错内置

```python
max(1, 5, 3)             # 5：位置参数形式（至少传2个）
max([1, 5, 3])           # 5：可迭代形式（只传1个）
max(lst, key=len)        # 取长度最大的元素（返回元素本身，不是长度）

int("  12  ")            # 12：int() 自动忽略两侧空白（读入无需先 strip）
ord('a')                 # 97：字符转码；算法里 ord(c)-ord('a') 把字母映射到 0~25 下标
chr(97)                  # 'a'：码转字符
# 大小写切换技巧：字母 ^ 32 翻转大小写（'a'=97 → 'A'=65）
chr(ord('a') ^ 32)       # 'A'
```
## 二、标准库

> 这一层的模块专门消灭手写循环：计数与分组、有序插入、堆、排列组合、记忆化。知道它们存在，笔试就能少写三十行。

### collections 模块

> Python内置的数据结构扩展库，提供高效的专用数据结构。

| 数据结构        | 核心作用                                           | 典型场景                              |
| --------------- | -------------------------------------------------- | ------------------------------------- |
| `Counter`     | 计数器：快速统计可迭代对象中元素出现次数           | 词频统计、热点Key计数、字母异位词     |
| `defaultdict` | 字典扩展：访问不存在的Key自动初始化默认值          | 计数统计、分组聚合、嵌套字典          |
| `OrderedDict` | 有序字典：保证字典插入顺序（Python 3.7+ 普通dict也有序，但此类提供额外API） | LRU缓存、需要移动键到首尾的场景 |
| `deque`       | 双端队列：两端增删 O(1)，优于列表首尾操作 O(n)     | 队列/栈、滑动窗口、BFS                |
| `namedtuple`  | 命名元组：给元组元素命名，兼具不可变性和可读性     | 轻量数据对象（坐标、用户信息）        |
| `ChainMap`    | 链式映射：合并多个字典，查询时按顺序遍历（无需拷贝）| 多配置合并、环境变量优先级覆盖        |

#### Counter 计数器

> Counter 继承自 dict，底层就是哈希表。构建 `Counter(iterable)` 是 O(n)，`most_common(k)` 是 O(n log k)（内部用堆）。

```python
from collections import Counter

# 创建
cnt = Counter([1, 1, 2, 3, 3, 3])   # Counter({3: 3, 1: 2, 2: 1})
cnt = Counter('abracadabra')         # Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})
cnt = Counter({'a': 3, 'b': 1})      # 直接从字典创建

# 常用操作
cnt[key]                             # 访问计数，不存在返回0（不是KeyError）
cnt.most_common(
    [n]                              # 可选：返回出现次数最多的 n 个；缺省返回全部（降序）
)                                    # 返回 [(元素, 次数), ...]
cnt.elements()                       # 返回所有元素迭代器（按计数重复展开）
cnt.total()                          # 所有计数总和（Python 3.10+）
cnt.subtract(iterable)               # 减少计数（计数可变为负数）
cnt.update(iterable)                 # 增加计数

# 遍历操作（继承自 dict）
cnt.keys()                           # 返回所有元素的视图（去重后的键）
cnt.values()                         # 返回所有计数的视图
cnt.items()                          # 返回 (元素, 计数) 键值对视图
for elem, count in cnt.items():      # 遍历每个元素及其计数
    print(f"{elem}: {count}")

# 算术运算
c1 + c2                             # 计数相加（只保留正数）
c1 - c2                             # 计数相减（只保留正数）
c1 & c2                             # 取每个键的最小计数
c1 | c2                             # 取每个键的最大计数

# 示例：统计字母频率
s = "abracadabra"
cnt = Counter(s)
print(cnt.most_common(3))            # [('a', 5), ('b', 2), ('r', 2)]

# 示例：判断字母异位词（LeetCode 438）
def isAnagram(s, t):
    return Counter(s) == Counter(t)
```

#### defaultdict 默认字典

> defaultdict 继承自 dict，复杂度与 dict 完全相同（O(1) 增删查）。唯一区别是重写了 `__missing__`：访问不存在的 key 时自动调用工厂函数创建默认值。

```python
from collections import defaultdict

# 创建（传入无参可调用对象作为工厂函数）
dd = defaultdict(list)               # 默认值为空列表 []
dd = defaultdict(int)                # 默认值为 0
dd = defaultdict(set)                # 默认值为空集合 set()
dd = defaultdict(lambda: -1)         # 默认值为 -1

# 核心特性：访问不存在的键时，自动创建默认值（不抛 KeyError）
dd['new_key'].append(1)              # 自动创建空列表并追加
dd['count'] += 1                     # 自动创建0并加1

# 注意区别
dd[key]        # 若key不存在，触发默认值，key被插入字典
dd.get(key)    # 若key不存在，返回None，key不被插入（不触发默认值）

# 示例：分组
pairs = [('a', 1), ('b', 2), ('a', 3)]
groups = defaultdict(list)
for key, val in pairs:
    groups[key].append(val)
# groups: {'a': [1, 3], 'b': [2]}

# 示例：计数（等价于Counter）
freq = defaultdict(int)
for c in "abracadabra":
    freq[c] += 1
```

#### OrderedDict 有序字典

```python
from collections import OrderedDict

# 创建
od = OrderedDict()
od['a'] = 1
od['b'] = 2
od['c'] = 3

# 独有操作（普通dict没有）
od.move_to_end('a')           # 将键'a'移动到末尾
od.move_to_end('c', last=False)  # 将键'c'移动到开头
od.popitem(last=True)         # 弹出最后一个键值对（LIFO）
od.popitem(last=False)        # 弹出第一个键值对（FIFO）

# 示例：LRU缓存（最近最少使用）
class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.cap = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)   # 访问后移至末尾（最近使用）
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # 淘汰最久未使用的（头部）
```

#### deque 双端队列

##### 底层实现

deque 不是单个数组，而是**双向链表连接的固定大小块（block）数组**：
- 每个 block 存储 64 个元素（CPython 实现）
- 维护 leftblock/rightblock 指针和 leftindex/rightindex 偏移
- 两端 append/pop：直接移动指针 → **严格 O(1)**（不是均摊）
- 中间 `insert(i, x)` / 随机访问 `dq[i]`：需遍历 block 链 → **O(n)**

```
# list 与 deque 头部操作对比（10万次 appendleft）
# list.insert(0, x)：每次把所有元素右移 → O(n²) 总
# deque.appendleft(x)：只移动指针 → O(n) 总

list: ~500ms（100万次 insert(0,x)）
deque: ~10ms  （100万次 appendleft(x)）
```

| 操作 | 时间复杂度 | vs list |
|---|---|---|
| `dq.append(x)` | **O(1)** | list O(1) 均摊 |
| `dq.appendleft(x)` | **O(1)** | list **O(n)** |
| `dq.pop()` | **O(1)** | list O(1) |
| `dq.popleft()` | **O(1)** | list **O(n)** |
| `dq[i]` 随机访问 | O(n) | list O(1) |
| `x in dq` | O(n) | list O(n) |
| `dq.rotate(k)` | O(k) | — |

> **选 list 还是 deque？**
> 只在尾部操作 → list（随机访问更快）
> 需要头部操作（BFS队列、滑动窗口）→ deque

```python
from collections import deque

# 创建
dq = deque()
dq = deque([1, 2, 3])
dq = deque(maxlen=3)          # 设置最大长度，满了追加时自动弹出对侧元素

# 操作
dq.append(x)                  # 右侧添加，O(1)
dq.appendleft(x)              # 左侧添加，O(1)
dq.pop()                      # 右侧弹出，O(1)
dq.popleft()                  # 左侧弹出，O(1)
dq.extend(iterable)           # 右侧批量添加
dq.extendleft(iterable)       # 左侧批量添加（注意顺序会反转）
dq.rotate(
    n                         # 正数右旋（尾部移到头部），负数左旋
)
dq.clear()                    # 清空
dq.insert(i, x)               # 在位置i插入，O(n)（需要时优先用 list）
dq.count(val)                 # 统计val出现次数
dq.remove(val)                # 删除第一个值为val的元素
dq.reverse()                  # 原地反转
len(dq)                       # 长度
dq[0]                         # 查看头部（不弹出）
dq[-1]                        # 查看尾部（不弹出）

# 可用作栈（右进右出）和队列（右进左出）

# 示例：BFS层序遍历
from collections import deque
q = deque([root])
while q:
    node = q.popleft()
    if node.left:  q.append(node.left)
    if node.right: q.append(node.right)

# 示例：滑动窗口最大值——窗口里维护最值，用的是 deque 当单调队列
# 完整写法与「三个动作的顺序为什么不能换」在[窗口最值的单调队列](#窗口最值的单调队列)
```

#### namedtuple 命名元组

```python
from collections import namedtuple

# 创建命名元组类型
Point = namedtuple('Point', ['x', 'y'])
Person = namedtuple('Person', 'name age score')  # 也可以用空格分隔的字符串

# 使用
p = Point(3, 4)
print(p.x, p.y)              # 3 4（可用属性名访问）
print(p[0], p[1])            # 3 4（也可以用索引访问）
print(p)                     # Point(x=3, y=4)

# 不可变（元组特性）
# p.x = 5  # 报错 AttributeError

# 实用方法
p._asdict()                  # 转为 OrderedDict，如 {'x': 3, 'y': 4}
p._replace(x=10)             # 返回新元组，将x替换为10
Point._fields                # 返回字段名元组 ('x', 'y')

# 示例：表示坐标
directions = [Point(0, 1), Point(0, -1), Point(1, 0), Point(-1, 0)]
for d in directions:
    new_x, new_y = cur.x + d.x, cur.y + d.y
```

#### ChainMap 链式映射

```python
from collections import ChainMap

# 创建（多个字典按顺序查找，无需合并拷贝）
defaults = {'color': 'red', 'size': 'M'}
overrides = {'color': 'blue', 'weight': 1.5}
combined = ChainMap(overrides, defaults)

# 查找：按顺序查找，找到第一个匹配即返回
print(combined['color'])     # 'blue'（overrides中找到）
print(combined['size'])      # 'M'（overrides中没有，从defaults找到）

# 修改只影响第一个字典
combined['new_key'] = 'val'  # 写入overrides
del combined['new_key']      # 只能删除第一个字典中的键

# 新增一层（常用于作用域模拟）
child = combined.new_child({'color': 'green'})

# 示例：命令行参数 > 环境变量 > 默认配置 的优先级
import os
cli_args = {'debug': True}
env_vars = {'host': 'localhost'}
defaults  = {'host': '0.0.0.0', 'port': 8080, 'debug': False}
config = ChainMap(cli_args, env_vars, defaults)
print(config['debug'])       # True（CLI优先）
print(config['host'])        # 'localhost'（env优先）
print(config['port'])        # 8080（从defaults取）
```

### 二分查找

> 有序数组上找位置，先问一句「`bisect` 能不能直接给」：`bisect_left` / `bisect_right` 是 C 实现，边界口径固定，比自己写的循环更不容易错。只有当判定条件不是「值和目标比大小」——旋转数组、在答案空间上二分、找峰值——才需要手写。
>
> 两种写法的区间口径是同一套：**左闭右开 `[left, right)`**，循环结束时 `left` 就是答案位置。混用闭区间与左闭右开，是这个话题最常见的错。

#### bisect 的复杂度

> 只能用在**已排序**的数组上。查找是纯二分，O(log n) 时间、O(1) 额外空间；`insort_*` 的瓶颈不在查找而在插入移位。

- `bisect_left/right`：O(log n) 查找，O(1) 额外空间
- `insort_left/right`：O(log n) 查找 + **O(n) 插入**（list 中间插入需移动元素）

```
# insort 的完整复杂度
bisect（查找位置）: O(log n)
list.insert（插入）: O(n)   ← 瓶颈！
总计：O(n)

若需要频繁有序插入，考虑用 SortedList（sortedcontainers 库）→ O(log n)
```

| 操作 | 时间复杂度 | 空间复杂度 |
|---|---|---|
| `bisect_left/right` | O(log n) | O(1) |
| `insort_left/right` | O(n)（插入移位） | O(1) |

```python
import bisect

a = [1, 2, 4, 4, 5, 8]

# 查找插入位置（不实际插入）
bisect.bisect_left(a, 4)     # => 2，若存在相等元素，插入到左侧（第一个4的位置）
bisect.bisect_right(a, 4)    # => 4，若存在相等元素，插入到右侧（最后一个4的后面）
bisect.bisect(a, 4)          # => 4，等价于 bisect_right

# 实际插入（保持有序）
bisect.insort_left(a, 3)     # 将3插入，保持升序，相等元素插入到左侧
bisect.insort_right(a, 3)    # 将3插入，保持升序，相等元素插入到右侧
bisect.insort(a, 3)          # 等价于 insort_right

# 参数 lo, hi：限制搜索范围
bisect.bisect_left(a, x, lo=0, hi=len(a))  # 只在 a[lo:hi] 范围内搜索
```

#### 用 bisect 定边界

`bisect_left` 就是 C++ 的 `lower_bound`（第一个 `>= x` 的位置），`bisect_right` 就是 `upper_bound`（第一个 `> x` 的位置），不用再包一层函数。真正值得包的是下面这几个「用两个 bisect 拼出来」的查询：

```python
a = [1, 2, 4, 4, 4, 5, 8]

# 查找最后一个 <= x 的位置
def find_last_le(a, x):
    idx = bisect.bisect_right(a, x) - 1
    return idx if idx >= 0 else -1

# 判断x是否在数组中
def contains(a, x):
    idx = bisect.bisect_left(a, x)
    return idx < len(a) and a[idx] == x

# 示例：统计有序数组中x出现的次数
def count_occurrences(a, x):
    return bisect.bisect_right(a, x) - bisect.bisect_left(a, x)

a = [1, 2, 4, 4, 4, 5, 8]
print(count_occurrences(a, 4))   # 3
```

#### 示例：排序后用 bisect 代替手写

```python
# 排序后用bisect代替手写二分，代码更简洁
import bisect

def maximumBeauty(items, queries):
    items.sort()
    prices = [p for p, _ in items]
    max_beauty = []
    cur_max = 0
    for _, b in items:
        cur_max = max(cur_max, b)
        max_beauty.append(cur_max)

    result = []
    for q in queries:
        idx = bisect.bisect_right(prices, q) - 1
        result.append(max_beauty[idx] if idx >= 0 else 0)
    return result
```

#### 手写模板：二分查找

```python
def binary_search(arr: List[int], target: int) -> int:
    """在有序数组中查找target，返回索引，不存在返回-1"""
    left, right = 0, len(arr)  # 左闭右开区间
    while left < right:  # 不使用 <=：左闭右开写法更统一，循环结束时 left 即为答案位置
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid  # 收缩右边界到 mid
    return -1 if left >= len(arr) or arr[left] != target else left
```

#### 手写模板：两种边界

```python
# 下界 lower_bound：查找第一个 >= target 的位置
# 左闭右开 [left, right)，循环结束后 left 即为答案
def lower_bound(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2   # 防溢出写法，等价于 (left+right)//2
        if arr[mid] < target:      # 用 <：严格小于才排除，等于 target 的值不会被跳过
            left = mid + 1         # 目标在右半区，排除 mid 及其左边
        else:                      # arr[mid] >= target：把右边界收到 mid
            right = mid            # 因为 mid 本身可能就是第一个 >= 的位置，保留 mid
    return left                    # 返回第一个 >= target 的下标（找不到时为 len(arr)）

# 上界 upper_bound：查找第一个 > target 的位置
# 与 lower_bound 的唯一区别：判断用 <=，即把等于 target 的值也跳过
def upper_bound(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2
        if arr[mid] <= target:     # 用 <=：等于 target 也排除，故最终落在最后一个 target 之后
            left = mid + 1
        else:                      # arr[mid] > target：右边界收到 mid
            right = mid
    return left

# 记忆口诀：带等号（<=）= 跳过相等的 = 上界；不带等号（<）= 保留相等的 = 下界
# 用 [1,2,4,4,4,5,8], target=4：lower_bound→2（第一个4），upper_bound→5（最后一个4的后一位）
```

#### 什么时候必须手写

判定条件不是「数组里的值 vs target」时，`bisect` 用不上，只能自己写循环，把三件事固定下来：

1. **区间口径**：写左闭右开就全程左闭右开（`while left < right`、`right = mid`），写闭区间就全程闭区间（`while left <= right`、`right = mid - 1`）。
2. **收缩方向**：`arr[mid] < target` 时往右收（`left = mid + 1`），否则往左收 —— 判断符号与返回值 `left` 的含义是配套的。
3. **答案在哪**：循环结束时，左闭右开写法的 `left` 就是第一个满足条件的位置。

三个典型场景：

| 场景 | 为什么 bisect 不够 | 判定怎么写 |
|---|---|---|
| 搜索旋转排序数组（33 / 153） | 数组只「部分有序」，不能直接按大小定半边 | 先比 `nums[mid]` 与 `nums[right]`，判断哪半边有序，再决定收哪侧 |
| 二分答案（「最少需要多少天」「最小化最大值」） | 二分的对象是答案区间，不读数组 | `check(x)` 单调为 `False → True`，找第一个 `True` |
| 找峰值（162） | 没有 target，比的是相邻元素 | `nums[mid] < nums[mid + 1]` 则峰在右侧 |

### 堆（heapq）

> 堆是完全二叉树，用数组存储。Python的heapq实现的是**小顶堆**（最小值在堆顶）。

#### 底层实现

堆用**数组（list）存储完全二叉树**，节点 i 的父子关系：
```
父节点：(i - 1) // 2
左子节点：2 * i + 1
右子节点：2 * i + 2
```

**核心操作**：
- **上浮（sift up）**：插入元素到末尾，反复与父节点比较，若比父小则交换 → `heappush` O(log n)
- **下沉（sift down）**：弹出堆顶，将末尾元素移到堆顶，反复与较小子节点交换 → `heappop` O(log n)

**`heapify` 为什么是 O(n) 而非 O(n log n)？**

从最后一个非叶节点（`n // 2 - 1`）开始向前逐个做 sift down：底层节点高度为 0，工作量少；高层节点少，工作量多。把每一层的工作量加起来：

$$
\sum_{k=0}^{\log n}\frac{n}{2^k}\,k=O(n)
$$

所以是 $O(n)$，不是 $O(n\log n)$。

| 操作 | 时间复杂度 | 说明 |
|---|---|---|
| `heappush(h, x)` | O(log n) | sift up |
| `heappop(h)` | O(log n) | sift down |
| `h[0]` 查看堆顶 | **O(1)** | 不修改堆 |
| `heapify(lst)` | **O(n)** | 非 O(n log n)！ |
| `heappushpop(h, x)` | O(log n) | 比分开调用快（少一次 sift） |
| `heapreplace(h, x)` | O(log n) | 同上 |
| `nsmallest(k, lst)` | O(n log k) | 维护大小为 k 的堆 |
| `nlargest(k, lst)` | O(n log k) | 维护大小为 k 的堆 |

> **nsmallest vs sorted**：k 很小时用 nsmallest（O(n log k)）；k 接近 n 时用 sorted（O(n log n)，但常数更小）。CPython 内部也是这样判断的。

| 类型     | 核心规则                   | 堆顶   |
| -------- | -------------------------- | ------ |
| 小顶堆   | 父节点值 ≤ 所有子节点值   | 最小值 |
| 大顶堆   | 父节点值 ≥ 所有子节点值   | 最大值 |

#### 基础操作

```python
import heapq

# 创建堆（两种方式）
heap = []
heapq.heappush(heap, x)              # 插入元素并维持堆结构，O(log n)
min_val = heapq.heappop(heap)        # 弹出最小值，O(log n)
min_val = heap[0]                    # 查看堆顶（不弹出），O(1)

# 原地堆化（O(n)，比逐个push高效）
arr = [5, 4, 3, 2, 1]
heapq.heapify(arr)                   # 将列表原地转为小顶堆

# 进阶操作
heapq.heappushpop(heap, x)           # 先插入x，再弹出最小值（原子操作，高效）
heapq.heapreplace(heap, x)           # 先弹出最小值，再插入x（要求堆非空）
# 区别：heappushpop 保证弹出的是"插入x后的最小值"，heapreplace 保证堆顶先被弹出

# Top K问题
heapq.nsmallest(k, iterable)         # 返回最小的k个元素（已排序列表）
heapq.nlargest(k, iterable)          # 返回最大的k个元素（已排序列表）
heapq.nsmallest(k, iterable, key=lambda x: x[1])  # 支持自定义key

# 合并多个有序堆/迭代器（返回迭代器，惰性求值）
heapq.merge(*iterables, key=None, reverse=False)   # 合并多个已排序序列
list(heapq.merge([1,3,5], [2,4,6]))  # [1, 2, 3, 4, 5, 6]
```

#### 大顶堆（插入负值）

```python
# Python没有原生大顶堆，通过插入负值模拟
max_heap = []
heapq.heappush(max_heap, -x)         # 插入时取负
max_val = -heapq.heappop(max_heap)   # 弹出后取负

# 示例：维护前k大的数
k = 3
heap = []
for x in [3, 1, 4, 1, 5, 9, 2, 6]:
    heapq.heappush(heap, -x)

top_k = [-heapq.heappop(heap) for _ in range(k)]
print(top_k)   # [9, 6, 5]
```

#### 元组堆（多键排序）

```python
# heapq支持元组，按元组元素依次比较
import heapq

heap = []
heapq.heappush(heap, (priority, task_id, task))  # 先按priority排序

# 示例：Dijkstra最短路
h = [(0, start)]   # (距离, 节点)
while h:
    dist, node = heapq.heappop(h)
    for neighbor, weight in graph[node]:
        if dist + weight < dis[neighbor]:
            dis[neighbor] = dist + weight
            heapq.heappush(h, (dis[neighbor], neighbor))
```

#### 堆排序

```python
def heap_sort(arr):
    heapq.heapify(arr)
    return [heapq.heappop(arr) for _ in range(len(arr))]

print(heap_sort([7, 2, 5, 1, 8, 3]))  # [1, 2, 3, 5, 7, 8]
```

### itertools 模块

> 笔试里真正用得上的只有 5 个：`accumulate` 前缀和、`chain` 拉平、`permutations` / `combinations` 枚举、`groupby` 分组。

| 函数 | 作用 | 返回内容 |
|---|---|---|
| `accumulate(a)` | **前缀和**（第二个参数可换成 `operator.mul`、`max` 等） | `[1, 3, 6, 10]` |
| `chain(a, b)` | **串联**多个可迭代对象，惰性求值 | 逐项迭代 |
| `permutations(a, r)` | **排列**：考虑顺序，从 a 中取 r 个 | `(1,2),(1,3),(2,1),…` |
| `combinations(a, r)` | **组合**：不考虑顺序，从 a 中取 r 个 | `(1,2),(1,3),(2,3),…` |
| `groupby(a)` | **分组**：只把**相邻**的相同值归成一组 | `(键, 组迭代器)` |

> `groupby` 只认相邻元素，同一个值散在多处会被切成好几组 —— 要按值分组就先 `sorted()`，或者干脆用 `Counter` / `defaultdict(list)`。

#### accumulate 前缀和/前缀积

```python
from itertools import accumulate
import operator

nums = [1, 2, 3, 4, 5]

# 默认：前缀和
list(accumulate(nums))               # [1, 3, 6, 10, 15]

# 指定运算：前缀积
list(accumulate(nums, operator.mul)) # [1, 2, 6, 24, 120]

# 指定初始值（Python 3.8+）
list(accumulate(nums, initial=0))    # [0, 1, 3, 6, 10, 15]（长度多1）

# 前缀最大值
list(accumulate(nums, max))          # [1, 2, 3, 4, 5]
list(accumulate([3,1,4,1,5,9], max)) # [3, 3, 4, 4, 5, 9]

# 应用：差分数组还原（差分求前缀和得原数组）
diff = [2, 1, -1, 3, -2]
original = list(accumulate(diff))    # [2, 3, 2, 5, 3]

# 应用：统计差分数组中被覆盖的点
diff = [0] * (max_end + 2)
for start, end in intervals:
    diff[start] += 1
    diff[end + 1] -= 1
covered_count = sum(s > 0 for s in accumulate(diff))
```

#### chain 链式迭代

```python
from itertools import chain

# 连接多个可迭代对象（不创建新列表，惰性求值）
list1 = [1, 2, 3]
tuple1 = ('a', 'b')
str1 = "XY"
result = list(chain(list1, tuple1, str1))
# [1, 2, 3, 'a', 'b', 'X', 'Y']

# 展平嵌套列表（chain.from_iterable）
nested = [[1, 2], [3, 4, 5], [6]]
flat = list(chain.from_iterable(nested))
# [1, 2, 3, 4, 5, 6]

# 算法应用：提取多个栈的所有元素
stacks = [[1, 2], [3], [4, 5, 6]]
all_indices = sorted(chain.from_iterable(stacks))
```

#### 排列组合与分组

```python
from itertools import product, permutations, combinations, combinations_with_replacement, groupby

# 笛卡尔积（多层嵌套循环的替代）
list(product([1,2], [3,4]))          # [(1,3),(1,4),(2,3),(2,4)]
list(product('AB', repeat=2))        # [('A','A'),('A','B'),('B','A'),('B','B')]

# 全排列（n个元素取r个的全排列）
list(permutations([1,2,3], 2))       # [(1,2),(1,3),(2,1),(2,3),(3,1),(3,2)]

# 组合（不重复，不考虑顺序）
list(combinations([1,2,3,4], 2))     # [(1,2),(1,3),(1,4),(2,3),(2,4),(3,4)]

# 可重复组合
list(combinations_with_replacement([1,2,3], 2))  # [(1,1),(1,2),(1,3),(2,2),(2,3),(3,3)]

# 分组：只认【连续相邻】的相同值，所以先 sorted；每项是 (键, 该组的迭代器)
[(k, list(g)) for k, g in groupby(sorted([1, 1, 2, 2, 3]))]  # [(1,[1,1]),(2,[2,2]),(3,[3])]
```

### 记忆化缓存

> `functools` 里的记忆化装饰器：`@lru_cache(maxsize=...)` 带容量上限、按 LRU 淘汰，3.9+ 的 `@cache` 是无参版（等价于 `maxsize=None`）。同一个递归函数不加装饰器是指数级，加上就是「每个状态只算一次」。

#### 核心作用

| 作用 | 说明 |
|------|------|
| **避免重复计算** | 相同参数的调用直接从缓存获取结果，不再执行函数体 |
| **优化递归** | 递归问题（如斐波那契、动态规划）中大量子问题被重复计算，记忆化将指数级复杂度降为多项式级 |
| **提升性能** | 频繁调用的纯函数可大幅减少执行时间 |
| **控制内存** | 通过 `maxsize` 限制缓存大小，防止内存无限增长 |

#### 基本用法

```python
from functools import lru_cache

@lru_cache(maxsize=128)      # 最多缓存128个不同参数的结果
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# 性能对比
# 无缓存：O(2^n)，fib(35) 需要数秒
# 有缓存：O(n)，fib(1000) 瞬间完成

# 查看缓存统计
print(fibonacci.cache_info())   # CacheInfo(hits=998, misses=1000, maxsize=128, currsize=128)
fibonacci.cache_clear()         # 清空缓存
```

> **无参版 `@cache`（3.9+）**：`from functools import cache` 之后写 `@cache`，等价于 `@lru_cache(maxsize=None)` —— 不设容量上限，整张记忆化表一直留着。写题时递归记忆化多数直接写 `@cache`；只有状态空间大、想回收的才用 `@lru_cache(maxsize=...)`。

#### 参数说明

| 参数 | 说明 |
|------|------|
| `maxsize` | 最大缓存条目数，设为 `None` 表示无限制。默认128。 |
| `typed` | 设为 `True` 时，`3` 和 `3.0` 被视为不同参数。默认 `False`。 |

#### 算法应用

典型应用场景：递归 DFS、动态规划、字符串拆分等问题。

```python
# 示例：记忆化 DFS
@lru_cache(maxsize=None)
def dfs(state):
    if 终止条件:
        return 结果
    # ... 递归调用 dfs(子状态)
```

> 相关题目：[LeetCode 139. 单词拆分](https://leetcode.cn/problems/word-break/)

#### 注意事项

```python
# ❌ 错误：参数必须可哈希
@lru_cache
def foo(lst: list): ...       # list 不可哈希，会报错

# ✅ 正确：使用可哈希类型
@lru_cache
def foo(tup: tuple): ...      # tuple 可哈希
```

- **仅适用于纯函数**：相同输入永远产生相同输出，无副作用
- **参数必须可哈希**：`list`、`dict` 等不可哈希类型需转为 `tuple`、`frozenset`
- **内存权衡**：`maxsize=None` 可能占用大量内存，谨慎使用

### 整数取整与数值技巧

> 这一节全是「看起来会、写出来差 1」的地方：`//` 在负数上向 $-\infty$ 取整，`round` 是银行家舍入，`math.ceil(a / b)` 会先把 `a / b` 转成 float。先记结论，再看反例。

#### 四种取整

| 取整方式 | 写法 | 结果 | 例 |
|---|---|---|---|
| 向下取整 floor | `a // b`（整数）、`math.floor(x)`（浮点） | 向 $-\infty$ | `7 // 2 = 3`，`-7 // 2 = -4` |
| 向上取整 ceil | `(a + b - 1) // b`（$a\ge0$）、`math.ceil(x)` | 向 $+\infty$ | `(7 + 2) // 3 = 3`，`math.ceil(-3.7) = -3` |
| 向零截断 trunc | `int(x)`、`math.trunc(x)` | 丢掉小数部分 | `int(-3.7) = -3` |
| 四舍五入 round | `round(x)` | 半值向偶数 | `round(2.5) = 2`，`round(3.5) = 4` |

**`//` 和 `int()` 在负数上不是一回事。** `-7 // 2` 是 $-4$（向 $-\infty$），`int(-7 / 2)` 是 $-3$（向 $0$）。题目说「向下取整」时用前者，说「去掉小数」时用后者。

#### 向上取整：整数写法

对 $a\ge0$、$b>0$，向上取整不需要转 float：

```python
(a + b - 1) // b      # ceil(a / b)：7/3 → (7+2)//3 = 3
-(-a // b)            # 等价写法，对负数也成立
a // b                # floor(a / b)，别和上一行混用
```

为什么成立：设 $a=qb+r$，$0\le r<b$，则

$$
\left\lfloor\frac{a+b-1}{b}\right\rfloor
=q+\left\lfloor\frac{r+b-1}{b}\right\rfloor
$$

$r=0$ 时后面是 $\lfloor(b-1)/b\rfloor=0$，结果是 $q$；$r\ge1$ 时后面是 $1$，结果是 $q+1$。正好等于 $\lceil a/b\rceil$。

**别写 `math.ceil(a / b)`。** `a / b` 先变成 float，$a$ 超过 $2^{53}$ 就开始丢精度：

```python
import math

a = 10**18 - 1
math.ceil(a / 3)          # 333333333333333312（错）
(a + 2) // 3              # 333333333333333333（对）
```

这类写法在二分答案里最常见：判定「$R$ 回合够不够」时是 `sum((d + x - 1) // x for d in hp) <= R`，不是 `sum(math.ceil(d / x))`。

#### 负数的 `//` 与 `%`

Python 的商向 $-\infty$ 取整，余数符号**跟除数**；C / Java 的商向 $0$ 截断，余数符号跟被除数：

```python
-7 // 2    # -4      C/Java: -3
-7 % 2     #  1      C/Java: -1
 7 // -2   # -4      C/Java: -3
 7 % -2    # -1      C/Java:  1
divmod(-7, 2)   # (-4, 1)
```

`a == (a // b) * b + a % b` 在 Python 里恒成立。正除数 $m>0$ 时，`a % m` 已经在 $[0,m)$ 内，不用再写 `(a % m + m) % m`；那种归一化是给 C / Java 的。

`divmod` 适合边取商边取余，比如逐位拆数：`n, d = divmod(n, 10)`。

#### 四舍五入：`round` 是银行家舍入

`round` 遇到正好一半时**向偶数靠**，不是中国习惯的「四舍五入」：

```python
round(0.5)   # 0
round(1.5)   # 2
round(2.5)   # 2   ← 不是 3
round(3.5)   # 4
```

再加上 float 本身的表示误差，`round(2.675, 2)` 得到 `2.67` 而不是 `2.68`。要严格半向上，用 `Decimal`：

```python
from decimal import Decimal, ROUND_HALF_UP

Decimal('2.675').quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)  # 2.68
```

`int(x + 0.5)` 只适合非负数；`int(-2.5 + 0.5)` 是 `-2`，而 $-2.5$ 的半向上应该是 $-3$。OJ 只要求「保留 k 位小数」时，用 f-string 的 `f"{x:.2f}"` 通常就够；要精确到分、要判相等，就别用 float。

#### 取整到 $k$ 的倍数

```python
x // k * k              # 向下取整到 k 的倍数：17 → 16
(x + k - 1) // k * k    # 向上取整到 k 的倍数：17 → 24
(x + k // 2) // k * k   # 取最近的 k 的倍数：17 → 16，20 → 24
```

`x // k` 是块号，`(x + k - 1) // k` 是块数。页码、内存对齐、按 $k$ 分组编号都是这三个式子。

#### 精确开方、对数与比较

`math.sqrt` 和 `x ** 0.5` 都返回 float，大整数会丢精度：

```python
import math

n = 10**18 - 1
int(n ** 0.5)        # 1000000000（错）
math.isqrt(n)        # 999999999（对）
```

判完全平方用 `r = math.isqrt(n); r * r == n`。循环里要比较「$a\le\sqrt{n}$」时，写成 `a * a <= n`，不要每轮开方。

对数同理：求 $\lfloor\log_2 n\rfloor$（$n\ge1$）用 `n.bit_length() - 1`，求 $\lceil\log_2 n\rceil$ 用 `(n - 1).bit_length()`（$n>1$）。`math.log` 只在确实需要实数结果时用。

#### 模运算与快速幂

```python
pow(a, b, m)      # a^b % m，边乘边取模，数字不会膨胀
pow(a, -1, m)     # a 在模 m 下的逆元（Python 3.8+，要求 gcd(a, m) == 1）
pow(a, m - 2, m)  # m 为质数时的等价写法（费马小定理）
```

`pow(a, b, m)` 是 O(log b) 次乘法，比先算 `a ** b` 再取模稳得多；指数很大时后者会先造出一个巨数。

#### 其余 `math` 函数速查

```python
import math

math.sqrt(x)                    # 平方根（返回 float；精确整数用 isqrt）
math.gcd(a, b)                  # 最大公约数（Python 3.5+）
math.lcm(a, b)                  # 最小公倍数（Python 3.9+）
math.log(x)                     # 自然对数
math.log2(x)                    # 以 2 为底的对数
math.log10(x)                   # 以 10 为底的对数
math.pow(x, y)                  # x 的 y 次方（返回 float；整数用 pow 或 **）
math.factorial(n)               # n 的阶乘
math.comb(n, k)                 # 组合数 C(n,k)（Python 3.8+）
math.perm(n, k)                 # 排列数 P(n,k)（Python 3.8+）
math.prod(iterable)             # 连乘（Python 3.8+）
```

#### 无穷大与常用小式子

```python
import math

inf = math.inf                  # 正无穷；float('inf') 不需要导入 math
neg_inf = -math.inf

sign = (x > 0) - (x < 0)        # -1 / 0 / 1，没有分支
clamp = max(lo, min(x, hi))     # 夹在 [lo, hi]
abs(x)                          # 绝对值
pow(x, y)                       # 整数幂，不丢精度（等价于 x ** y）
best = min(candidates, default=0)   # 空序列不报错（default 3.4+）
a, b = b, a                     # 交换
```

```python
import math

# 初始化最大值/最小值的技巧
min_val = float('inf')    # 比较时任何实数都比它小
max_val = float('-inf')   # 比较时任何实数都比它大

# 验证BST（用±inf传递边界）
def isValidBST(root, left=-math.inf, right=math.inf):
    if root is None:
        return True
    x = root.val
    return left < x < right and \
           isValidBST(root.left, left, x) and \
           isValidBST(root.right, x, right)

# Dijkstra初始化
dis = [float('inf')] * n
dis[start] = 0
```

## 三、算法套路

> 每一节给一个能直接抄的骨架，再解释骨架里哪个常数、哪个方向不能改。

### 递归、递推与枚举

> 三种基本思路先分清：**递归**是「问题与它的子问题同构」，**递推**是由小往大填表（DP 的递推形式），**枚举**是没找到规律时的兜底。后面所有模板都长在这三种上：二分是不断缩小范围的递推，回溯是递归加撤销，DP 要么从递归记忆化来、要么直接递推。

| 方法           | 特点                     | 适用场景               |
| -------------- | ------------------------ | ---------------------- |
| **递归** | 函数调用自身，有归的过程 | 树的遍历、分治、回溯   |
| **递推** | 从已知推未知，循环实现   | 动态规划、斐波那契数列 |
| **枚举** | 遍历所有可能             | 小规模问题、验证答案   |

### 前缀和与差分

> 两者是逆运算：前缀和把「区间查询」压成一次减法，差分把「区间修改」压成两次加法。所谓「前缀和 + 差分」套题，就是先差分改、再前缀和还原。

#### 一维前缀和

```python
# 一维前缀和
# prefix[i] 表示 arr[0] 到 arr[i-1] 的和，多开一位避免边界判断
prefix = [0] * (n + 1)
for i in range(n):
    prefix[i + 1] = prefix[i] + arr[i]

# 查询区间和 [l, r]
# 区间和 = prefix[r+1] - prefix[l]
# 例：arr = [3,1,4]，prefix = [0,3,4,8]；arr[1:3] 和 = prefix[3]-prefix[1] = 8-3 = 5
def range_sum(l: int, r: int) -> int:
    return prefix[r + 1] - prefix[l]
```

#### 二维前缀和

```python
# 二维前缀和
# prefix[i][j] 表示矩阵左上角 (0,0) 到 (i-1,j-1) 的子矩阵和
prefix = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(m):
    for j in range(n):
        # 当前格 = 上方 + 左侧 - 左上角（多加了一次） + 当前元素
        prefix[i + 1][j + 1] = prefix[i][j + 1] + prefix[i + 1][j] - prefix[i][j] + matrix[i][j]

# 查询子矩阵和 [r1, c1] 到 [r2, c2]
# 大矩阵 - 左侧 - 上方 + 左上角（被减了两次）
def submatrix_sum(r1: int, c1: int, r2: int, c2: int) -> int:
    return prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1] - prefix[r2 + 1][c1] + prefix[r1][c1]
```

#### 差分

![](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/Leetcode%E5%B7%AE%E5%88%86%E6%95%B0%E7%BB%84%E7%A4%BA%E4%BE%8B.webp)

```python
# 一维差分
# diff 是 arr 的差分数组：diff[i] = arr[i] - arr[i-1]
# 对区间 [l, r] 整体加 val，只需改 diff 的两端，O(1) 完成（而逐元素加是 O(n)）
diff = [0] * (n + 1)

# 区间 [l, r] 加 val
diff[l] += val        # 从 l 开始，之后的前缀和都会 +val
diff[r + 1] -= val    # 从 r+1 开始抵消，保证只影响 [l, r]

# 还原：对 diff 求前缀和即得原数组
arr = [0] * n
cur = 0
for i in range(n):
    cur += diff[i]
    arr[i] = cur
```

### 双指针

> 双指针的价值是把 O(n²) 的两两枚举压到 O(n)：两个指针各自**单向**移动，走完全程总共不超过 2n 步。所以判断一个题能不能用双指针，看的是「某一步能不能排除掉一整片不需要再看的区间」，而不是「有没有两个下标」。

#### 对撞指针

```python
def two_sum(arr: List[int], target: int) -> Tuple[int, int]:
    """在有序数组中找两数之和等于target"""
    left, right = 0, len(arr) - 1   # 一头一尾
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return left, right
        elif s < target:            # 和太小 → 需要更大的数 → 左指针右移
            left += 1
        else:                       # 和太大 → 需要更小的数 → 右指针左移
            right -= 1
    return -1, -1
```

#### 快慢指针

```python
def find_duplicate(nums: List[int]) -> int:
    """Floyd判圈算法找环（数组值当作 next 指针，重复值即环入口）"""
    # 阶段一：快慢指针在环内相遇
    slow = fast = nums[0]
    while True:
        slow = nums[slow]           # 慢指针走一步
        fast = nums[nums[fast]]     # 快指针走两步
        if slow == fast:
            break                   # 相遇点必在环内

    # 阶段二：一指针回到起点，两指针同速前进，再次相遇处即环入口（重复值）
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
```

### 滑动窗口

#### 定长窗口

窗口大小固定为 `k`：右端进一个、左端出一个，`window` 始终是那 `k` 个元素的和。

```python
def max_sum_window(nums: List[int], k: int) -> int:
    """长度正好为 k 的窗口里，和最大的那个"""
    window = 0
    best = float('-inf')
    for right, x in enumerate(nums):
        window += x                  # 进：右端加入
        if right >= k:               # 出：窗口超长，挤掉左端
            window -= nums[right - k]
        if right >= k - 1:           # 此时窗口长度正好是 k
            best = max(best, window)
    return best
```

窗口里要维护的不是和而是**最值**时，普通累加用不了 —— 见下面的单调队列。

#### 可变窗口

```python
def min_subarray_len(target: int, nums: List[int]) -> int:
    """找和 >= target 的最短子数组"""
    left = 0
    cur_sum = 0
    ans = float('inf')
    for right, x in enumerate(nums):
        cur_sum += x
        while cur_sum >= target:
            ans = min(ans, right - left + 1)
            cur_sum -= nums[left]
            left += 1
    return ans if ans != float('inf') else 0
```

#### 窗口最值的单调队列

「窗口里的最大值」不能靠维护一个变量：最大值被挤出去之后，第二大的那个得立刻顶上。所以队列里存**下标**，并保持值单调递减 —— 队头永远是当前窗口的最大值。

```python
from collections import deque

def max_sliding_window(nums: List[int], k: int) -> List[int]:
    q = deque()                      # 存下标，值单调递减
    res = []
    for i, x in enumerate(nums):
        while q and nums[q[-1]] <= x:   # 比 x 小的都不可能再当最大值了
            q.pop()
        q.append(i)
        if q[0] <= i - k:               # 队头已经滑出窗口
            q.popleft()
        if i >= k - 1:
            res.append(nums[q[0]])
    return res
```

三个动作的顺序不能换：**先弹尾**（保持单调）→ **再入队** → **最后弹头**（清掉过期下标）。先弹头的话，`q` 里可能只剩一个已经过期的下标，`q[0] <= i - k` 就把它当成窗口最大值记下来了。

### 位运算

> 位运算题只有两种：**一条式子搞定**（判奇偶、取最低位的 1、判 2 的幂），和**逐位统计**（每个二进制位单独数一次）。前者抄下面的式子，后者记住 `x >> i & 1` 把第 i 位单独取出来。

```python
# 常用技巧
x & 1          # 判断奇偶：结果为 1 是奇数（只保留最低位）
x & (x - 1)    # 消除最低位的1：x=12(1100) → 8(1000)，常用来统计1的个数
x & (-x)       # 获取最低位的1：x=12(1100) → 4(0100)，即 lowbit
x | (1 << n)   # 将第n位置1（n从0开始计，第n位即值 2^n）
x & ~(1 << n)  # 将第n位置0
x ^ (1 << n)   # 翻转第n位（0↔1）

# 二进制位数与 1 的个数
x.bit_length()            # 有效位数；floor(log2 x) = x.bit_length() - 1
(x - 1).bit_length()      # ceil(log2 x)，x > 1
x.bit_count()             # 1 的个数（Python 3.10+）
bin(x).count('1')         # 旧版本的等价写法；或 while x: cnt += x & 1; x >>= 1

# 判断是否是2的幂：2的幂二进制只有一个1，减1后变成全1
x > 0 and (x & (x - 1)) == 0   # 例：8(1000) & 7(0111) = 0 → True
```

## 四、输入与输出

> 这部分在本地跑不出问题，只在 OJ 上出事：行读不完、格式差一个空格、最后一个数没换行，都是整题零分。

### 读入模板

> 先把「读几行」这件事定下来：行数已知、读到 EOF、有结束标志，三种写法的骨架完全不同。

#### 定行、不定行与 EOF

在线判题的多行输入只有两类：**行数已知**和**行数未知**。行数未知又分「有结束标志」和「读到文件尾」，写法不同：

| 场景 | 写法 |
|---|---|
| 行数已知 | `for _ in range(n): ...` + `input()` |
| 读到文件尾 | `for line in sys.stdin:`（推荐） |
| 有结束标志 | `while True:` + `if ...: break` |
| 一次性读完 | `sys.stdin.read().split()` |

```python
import sys

# 定行：第一行 n，后面 n 行
n = int(input())
rows = [input().split() for _ in range(n)]

# 不定行、无结束标志：读到文件尾自动结束
for line in sys.stdin:
    if not line.strip():        # 跳过空行，别让 split 解包报错
        continue
    a, b = map(int, line.split())
    print(a + b)

# 有结束标志：读到 0 0 为止
while True:
    a, b = map(int, input().split())
    if a == 0 and b == 0:
        break
    print(a + b)
```

> **不要在 OJ 里用 `if line == '': break` 判断输入结束。** 输入耗尽时 `input()` 抛的是 `EOFError`，不会返回空串，这个判断在 OJ 上永远不成立；要兜底就捕获 `EOFError`，不要用裸 `except` 把其它异常一起吞掉。

#### 常见输入形态

| 输入形态 | 读法 |
|---|---|
| 第一行 `t`，随后 `t` 组 | `t = int(input()); for _ in range(t): ...` |
| 每组第一个数 `n`，后面 `n` 个数 | `n, *arr = map(int, input().split())` |
| 每行不定个整数，读到 EOF | `for line in sys.stdin: nums = list(map(int, line.split()))` |
| 一行逗号分隔的字符串 | `input().split(',')` |
| 把一行拆成字符列表 | `list(input().strip())` |
| 读一个 `n × m` 的网格 | `grid = [list(map(int, input().split())) for _ in range(n)]` |

```python
import sys

# 先把所有 token 读进来，适合「数量太多、不想逐行解析」的题
data = sys.stdin.read().split()
it = iter(data)
t = int(next(it))
for _ in range(t):
    n = int(next(it))
    arr = [int(next(it)) for _ in range(n)]
```

#### 快速读入（大量数据时）

**为什么用 `sys.stdin.readline`？** 内置 `input()` 每行都做一次缓冲处理，数据量大时慢；`readline` 直接读行，速度快数倍。**ACM/笔试必用。**

```python
import sys
input = sys.stdin.readline    # 覆盖 input，之后照常使用

# 读取一行整数：input().split() 按空白切分，map(int, ...) 逐个转 int
n = int(input())                       # 第一行读个数
arr = list(map(int, input().split()))  # 第二行读整行整数列表

# 读取多行
n = int(input())
for _ in range(n):
    a, b = map(int, input().split())
```

> 变体：不确定行数读到文件尾，用 `for line in sys.stdin:`；需要一次性读完用 `sys.stdin.read().split()`。

### 输出与格式化

> 输出只有两个要求：**内容对**、**格式对**。第一件事靠算法，第二件事靠 `print` 的参数与 f-string。

#### print 的参数（sep / end / file / flush）

`print` 比表面看起来复杂——默认 `sep=' '`（多个值之间用空格）、`end='\n'`（行尾换行）。这两个参数在 ACM 输出格式里天天用到，**笔试/面试手写输出必考**。

| 参数 | 默认值 | 作用 |
|------|--------|------|
| `sep` | `' '` | 多个值之间的分隔符，如 `print(1, 2, sep='-')` → `1-2` |
| `end` | `'\n'` | 行尾追加的字符串，如 `print(1, end='')` → 不换行 |
| `file` | `sys.stdout` | 输出到哪个流，可写文件或标准错误 `sys.stderr` |
| `flush` | `False` | 是否立即刷新缓冲区（交互式进度提示时用 `flush=True`） |

#### 快速输出（大量数据时）

**为什么用 `sys.stdout.write`？** 循环里逐元素 `print()` 每次调用都有函数开销；把结果拼成一个大字符串一次性写出，速度快数倍。**输出量大时必用。**

```python
import sys

# 一行空格分隔：join 拼成一个字符串，一次写出
sys.stdout.write(' '.join(map(str, arr)) + '\n')

# 多行输出：全部结果先存起来，最后一次性 write
out = []
for ans in results:
    out.append(str(ans))
sys.stdout.write('\n'.join(out))
```

#### ACM 输出套路

**场景 1：一行输出，空格分隔，末尾无多余空格**

```python
print(' '.join(map(str, arr)))   # 推荐：join 拼接，元素需是 str
# 或
print(*arr)                       # 展开列表，print 自动用空格分隔
```

**场景 2：题目要求每个数后带一个空格（含最后一个，如 HJ48）**

```python
for x in arr:
    print(x, end=' ')   # 不换行，只追加空格
print()                 # 循环结束后必须补一个换行！
```

**场景 3：多行输出**

```python
print('\n'.join(map(str, ans)))
```

#### 常见坑

- **`end=' '` 不会换行**：所有输出会挤在同一行，循环结束必须手动 `print()` 补换行。
- **`join` 要求元素全是 `str`**：数值要先 `map(str, ...)`，直接 `','.join([1,2])` 会报 TypeError。
- **`print(*arr)` 展开大数组**：元素极多时展开成大量位置参数，用 `join` 更稳。
- **输出性能对比**：

| 写法 | 大数据量表现 |
|------|-------------|
| 循环 `print(x, end=' ')` | 慢，每次调用有开销 |
| `' '.join(map(str, arr))` 一次 print | 快 |
| `sys.stdout.write(' '.join(...))` | 最快，一次 I/O |

#### f-string：最常用的格式化方式

> 写题/调试时最常用的格式化方式。前缀 `f` + 大括号 `{}` 内放表达式，Python 3.6+。

##### 基本用法

```python
name, score = "hanphone", 96.5
f"{name}"              # 'hanphone'
f"{score}"             # '96.5'
f"{score:.2f}"         # '96.50'  保留 2 位小数（四舍五入）
f"{1/3:.3f}"           # '0.333'
```

##### 格式说明符（冒号 `:` 后面）

| 写法 | 含义 | 示例 |
|---|---|---|
| `{x:.2f}` | 保留 2 位小数 | `f"{3.14159:.2f}"` → `'3.14'` |
| `{x:>5}` | 右对齐，宽度 5（左侧补空格） | `f"{'ab':>5}"` → `'   ab'` |
| `{x:<5}` | 左对齐，宽度 5 | `f"{'ab':<5}"` → `'ab   '` |
| `{x:^5}` | 居中对齐，宽度 5 | `f"{'ab':^5}"` → `' ab  '` |
| `{x:0>5}` | 左补 0 到宽度 5 | `f"{42:0>5}"` → `'00042'` |
| `{x:08b}` | 二进制，补 0 到 8 位 | `f"{5:08b}"` → `'00000101'` |
| `{x:,}` | 千分位分隔 | `f"{1234567:,}"` → `'1,234,567'` |
| `{{}}` | 转义大括号本身 | `f"{{x}}"` → `'{x}'` |

##### 三种写法对比

| 写法 | 特点 | 适用 |
|---|---|---|
| `"%.2f" % x` | 旧式 `%`，可读性差 | 老代码、日志 |
| `"{:.2f}".format(x)` | 模板可复用，支持位置/关键字参数 | 需要复用格式模板时 |
| `f"{x:.2f}"` | 最简洁，表达式直接内联 | **写题/调试首选** |

##### repr 调试

`str(x)` 面向用户阅读，`repr(x)` 面向开发者（更接近字面量，可直接拷回代码验证）：

```python
str("a'b")      # "a'b"
repr("a'b")     # '"a\'b"'
print([1, 2])   # 打印 list/dict 时元素内部自动用 repr → [1, 2]
```

调试打印嵌套列表/字典等复杂对象时用 `repr()`，输出更精确、便于定位。

### JSON 与 Python 字面量

题面写「输入一个 JSON」时，**不要用 `split()` 拆**：JSON 里的逗号、引号、花括号都是语法的一部分，按空白切开结构就碎了。整段读成字符串交给 `json.loads`：

```python
import json
import sys

data = json.loads(sys.stdin.read())          # 整段是一个 JSON

# 或者：第一行组数，后面每行一个 JSON
input = sys.stdin.readline
rows = [json.loads(input()) for _ in range(int(input()))]

# 或者：一行一个 JSON，读到 EOF（空行要跳过）
for line in sys.stdin:
    line = line.strip()
    if line:
        obj = json.loads(line)
```

- `json.loads` 收字符串，`json.load` 收文件对象；读文件直接用 `json.load(f)`。
- 单引号、`True`、`None`、元组是 **Python 字面量**，不是 JSON：用 `ast.literal_eval`。
- 文件带 BOM（Windows 记事本存的）时用 `encoding='utf-8-sig'`。
- 输出 JSON 用 `json.dumps(obj, ensure_ascii=False, separators=(',', ':'))`：中文不转义，且去掉 `,`/`:` 后的空格（有些 OJ 逐字符比对）。

| 报错 | 原因 |
|---|---|
| `Expecting value: line 1 column 1` | 空串、纯空白或 BOM |
| `Expecting property name enclosed in double quotes` | 用了单引号，应改用 `ast.literal_eval` |
| `Extra data` | 一段字符串里塞了多个 JSON，按行拆开分别 `loads` |

> 输入模式的整理参考 [sitJac 的 ACM 输入总结](https://sitjac.github.io/blog/acm-codeing-tips/)。

### 本地调试（自测工具）

> 本地跑题时常用的三个工具：传参、加大递归上限、捕获 stdout 断言输出。

**`sys.argv` —— 命令行传参跑多组样例**

```python
import sys

# 运行：python a.py 1 2 3
# sys.argv = ['a.py', '1', '2', '3']，argv[0] 是脚本名
if len(sys.argv) > 1:
    n = int(sys.argv[1])
```

**`sys.setrecursionlimit` —— 深递归防爆栈**

```python
import sys
sys.setrecursionlimit(10**6)   # 默认 ~1000，深递归（树/回溯）经常需要调大
```

**`io.StringIO` —— 捕获 stdout 做断言自测**

```python
import io
import sys

def solve():
    print("hello")     # 正常输出到 stdout

# 把 sys.stdout 临时替换成内存缓冲，跑完再还原
old = sys.stdout
sys.stdout = io.StringIO()
solve()
out = sys.stdout.getvalue()
sys.stdout = old
assert out == "hello\n", f"输出不对: {out!r}"
```

`StringIO` 也常用于把多行字符串当文件读，避免为测试真的创建文件。

## 参考

- [LeetCode 算法面试题汇总](https://leetcode.cn/studyplan/top-100-liked/)
- [OI Wiki](https://oi-wiki.org/)
