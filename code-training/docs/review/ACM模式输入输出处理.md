---
title: ACM模式输入输出处理
---
# ACM模式输入输出处理

> 本文档汇总 ACM 模式下 Python 的多行输入处理套路。转载自 [ACM模式下C语言和Python的测试用例输入方式整理 | sitJac&#39;s Blog](https://sitjac.github.io/blog/acm-codeing-tips/)，输出格式化部分见 [Python算法技巧](Python算法技巧.md)。

## 1. `input()` 与 `sys.stdin` 概述

在线判题系统（Online Judge）的多行输入问题分为**定行输入**与**不定行输入**：

- **定行输入**：使用循环 + `input()` 即可解决。
- **不定行输入**：需要判断是否有输入结束的标志。
  - **有结束标志**：使用 `while` 循环 + 结束判断语句。
  - **无结束标志**：推荐使用 `sys.stdin`，也可用其他方法（如 `try-except`）。

> ⚠️ **注意**：对于无结束标志的不定行输入，在本地IDE中通过判断输入是否为空（如 `if line == ''`）来跳出循环的做法，在OJ中通常是错误的，不可取。

---

## 2. 不定行输入有结束标志示例

**题目描述**：计算 a+b
**输入描述**：输入包括两个正整数 a, b (1 ≤ a, b ≤ 10^9)，输入数据有多组，如果输入 `0 0` 则结束输入。
**输出描述**：输出每组 a+b 的结果。

**示例**：

```
输入：
1 5
10 20
0 0

输出：
6
30
```

### 方法1：使用 `sys.stdin`

```python
import sys
for line in sys.stdin:
    x, y = map(int, line.split())
    if x or y:
        print(x + y)
```

### 方法2：使用 `while` + `input()`

> 必须加循环结束语句，否则OJ不通过。

```python
while True:
    x, y = map(int, input().split())
    if x == 0 and y == 0:
        break
    print(x + y)
```

---

## 3. 不定行输入无结束标志示例

**题目描述**：计算 a+b
**输入描述**：输入包括两个正整数 a, b (1 ≤ a, b ≤ 10^9)，输入数据有多组，没有给出结束标志。
**输出描述**：输出每组 a+b 的结果。

**示例**：

```
输入：
1 5
10 20
0 0

输出：
6
30
```

### 方法1：使用 `sys.stdin`

```python
import sys
for line in sys.stdin:
    a, b = map(int, line.split())
    print(a + b)
```

### 方法2：使用 `while` + `input()` + `try-except`

```python
while True:
    try:
        a, b = map(int, input().split())
        print(a + b)
    except:
        break
```

### ❌ 错误做法：判断输入是否为空

```python
while True:
    line = input()
    if line == '':
        break
    else:
        a, b = map(int, line.split())
        print(a + b)
```

---

## 4. 其他常见输入模式（整数）

### 4.1 多组数据，每行两个整数，直到文件尾

```python
import sys
lines = sys.stdin.readlines()

for line in lines:
    numlist = list(map(int, line.split()))
    print(sum(numlist))
```

### 4.2 第一行是数据组数 t，后面每行两个整数

```python
import sys
lines = sys.stdin.readlines()
n = int(lines[0])
for i in range(n):
    numList = list(map(int, lines[i+1].split()))
    print(sum(numList))
```

### 4.3 多组数据，输入 `0 0` 结束

```python
while True:
    a, b = map(int, input().split())
    if a == 0 and b == 0:
        break
    else:
        print(a + b)
```

### 4.4 每组数据第一个数为 n，后面 n 个整数，n=0 结束

```python
while True:
    a = [int(each) for each in input().split()]
    if a[0] == 0:
        break
    print(sum(a[1:]))
```

### 4.5 第一行 t 表示组数，每组第一个数为 n，后面 n 个整数

```python
n = int(input())
for _ in range(n):
    numList = list(map(int, input().split()))
    print(sum(numList[1:]))
```

### 4.6 多组数据，每组第一个数为 n，后面 n 个整数，无结束标志

```python
import sys
lines = sys.stdin.readlines()
for line in lines:
    numList = list(map(int, line.split()))
    print(sum(numList[1:]))
```

### 4.7 每行不定个整数，空格隔开，直到文件尾

```python
import sys
for line in sys.stdin:
    a = line.split()
    ret = 0
    for i in range(len(a)):
        ret += int(a[i])
    print(ret)
```

---

## 5. 输入为字符串的排序问题

### 5.1 多个测试用例，每行第一个整数 n 表示后面有 n 个字符串

```python
while True:
    try:
        n = input()
        strList = list(map(str, input().split()))
        strList.sort()
        print(' '.join(strList))
    except:
        break
```

### 5.2 每行空格隔开的多个字符串，无结束标志

```python
while True:
    try:
        arr = list(map(str, input().split()))
        arr.sort()
        print(' '.join(arr))
    except:
        break
```

### 5.3 每行用逗号隔开的多个字符串，无结束标志

```python
while True:
    try:
        a = input().split(",")
        a.sort()
        print(",".join(a))
    except:
        break
```

---

## 6. 其他常见输入处理

### 6.1 输入一个字符串，拆分成单个字符的列表

```python
import sys
str_input = sys.stdin.readline().split()
strList = [i for i in str_input[0]]
print(strList)
```

### 6.2 第一行表示接下来要输入几组数据（每组数据包含多个整数）

```python
count = list(map(int, input().split()))
queue = []
for _ in range(count[0]):
    queue.append(list(map(int, input().split())))
```

---

## 7. JSON 形式的输入

题面里一旦出现「输入一个 JSON」「每行一个 JSON 对象」，就**不要再用 `split()` 去拆**。
JSON 里的逗号、引号、花括号都是语法的一部分，按空白一切，结构就碎了。
正确做法是把整段（或整行）读成字符串，交给 `json.loads()` 解析。

### 7.1 整段输入就是一个 JSON

```python
import json
import sys

data = json.loads(sys.stdin.read())
print(type(data).__name__)      # dict / list / int / str
```

`json.loads()` 的参数是**字符串**；如果想直接把标准输入当文件对象交给它，用 `json.load(sys.stdin)`。

### 7.2 第一行是组数 n，后面 n 行每行一个 JSON

```python
import json
import sys

input = sys.stdin.readline
n = int(input())
rows = [json.loads(input()) for _ in range(n)]
```

### 7.3 一行一个 JSON，直到文件尾

```python
import json
import sys

for line in sys.stdin:
    line = line.strip()
    if not line:                # 空行跳过，别让 json.loads 报 Expecting value
        continue
    obj = json.loads(line)
    print(obj)
```

### 7.4 本地调试时从文件读

```python
import json

with open('case.json', encoding='utf-8') as f:
    data = json.load(f)         # 文件 -> 对象，等价于 json.loads(f.read())
```

文件带 BOM（Windows 记事本存的）时报 `JSONDecodeError: Expecting value: line 1 column 1`，
把编码换成 `utf-8-sig` 即可读。

### 7.5 单引号、`True`、`None` 不是 JSON

`{'a': 1}`、`True`、`None`、`(1, 2)` 都是 **Python 字面量**，`json.loads` 会直接抛
`JSONDecodeError` —— JSON 只认双引号、`true` / `false` / `null`。这类输入用 `ast.literal_eval`：

```python
import ast

data = ast.literal_eval("{'a': 1, 'b': [1, 2]}")   # {'a': 1, 'b': [1, 2]}
```

判断标准很简单：题面写的是 JSON（双引号 + `true` / `false` / `null`）就用 `json`；
写的是 Python 字面量（单引号 + `True` / `None`）就用 `ast.literal_eval`。

### 7.6 输出 JSON

```python
import json

ans = {'name': '小欧', 'score': [90, 85]}
print(json.dumps(ans, ensure_ascii=False, separators=(',', ':')))
# {"name":"小欧","score":[90,85]}
```

- `ensure_ascii=False`：中文按原字符输出，不会变成 `\u5c0f\u6b27`
- `separators=(',', ':')`：去掉逗号与冒号后面的空格。不少 OJ 是逐字符比对，
  默认参数输出的 `{"a": 1, "b": 2}` 会因此判错
- 需要按字典序输出键时加 `sort_keys=True`

### 7.7 常见报错对照

| 报错 | 原因 | 处理 |
|------|------|------|
| `JSONDecodeError: Expecting value: line 1 column 1` | 输入是空串、纯空白，或带 BOM | 先 `strip()` 判空；文件用 `utf-8-sig` |
| `JSONDecodeError: Expecting property name enclosed in double quotes` | 用了单引号 | 换成 `ast.literal_eval` |
| `JSONDecodeError: Extra data` | 一段字符串里塞了多个 JSON | 按行拆开逐个 `loads` |
| `TypeError: the JSON object must be str, bytes or bytearray` | 把文件对象直接给了 `loads` | 用 `json.load(f)` |
| 读出来是字符串而不是对象 | 少解析了一层（`json.dumps` 过又读回） | 确认拿到的是 `dict` / `list` 再用 |
