# OJ系统中Python的多行输入

转载自 [ACM模式下C语言和Python的测试用例输入方式整理 | sitJac&#39;s Blog](https://sitjac.github.io/blog/acm-codeing-tips/)

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
