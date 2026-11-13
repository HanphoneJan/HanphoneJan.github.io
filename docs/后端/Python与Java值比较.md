---
title: Python 与 Java 的值比较
description: Python 的 is / == 与 Java 的 == / equals / hashCode 各自比较什么，以及跨语言迁移时的高频坑。
---

# Python 与 Java 的值比较

> 两种语言都有 `==`，但它问的问题不一样：**Java 的 `==` 在引用类型上问「是不是同一个对象」，Python 的 `is` 才是这个意思；Java 的 `equals` 对应 Python 的 `==`。** 两边的默认行为都容易写错，下面把语义、默认行为和常见坑放在一起对照。

## 1. 先看对照表

| 想问的问题 | Java | Python |
|---|---|---|
| 两个数是否相等 | `a == b`（基本类型） | `a == b` |
| 两个对象内容是否相等 | `a.equals(b)` | `a == b` |
| 是不是同一个对象 | `a == b`（引用类型） | `a is b` |
| 是否为「空」 | `a == null` | `a is None` |
| 自定义类默认怎么比 | `Object.equals`：身份 | `object.__eq__`：身份 |
| 放进哈希容器需要什么 | `equals` + `hashCode` | `__eq__` + `__hash__` |
| 排序按什么比 | `Comparable.compareTo` / `Comparator` | `__lt__`（`<`） |
| 浮点近似比较 | 自己写容差 / `Double.compare` | `math.isclose` |

记法：**Python 的 `is` ≈ Java 引用类型的 `==`；Python 的 `==` ≈ Java 的 `equals`。**

## 2. 为什么两边不是一一对应

Java 是「基本类型 + 引用类型」的双轨模型：

- `int`、`double`、`boolean` 这类基本类型存的是值，`==` 直接比较值；
- 对象变量存的是引用，`==` 比较引用；两个对象内容是否相等，必须由类自己实现 `equals`；
- 运算符不能重载，`==` 的语义在语言层面就定死了。

Python 只有对象：变量是名字，绑定到堆上的对象；`is` 比较对象身份，`==` 调用 `__eq__`。所有类都从 `object` 继承，默认的 `__eq__` 就是身份比较，所以**默认行为反而和 Java 的 `equals` 默认行为一样**。区别在于 Python 允许重载 `==`，Java 不允许重载运算符。

```python
class User:
    def __init__(self, name):
        self.name = name

u1, u2 = User("a"), User("a")
print(u1 == u2)   # False：默认按身份比
print(u1 is u2)   # False
```

```java
class User {
    String name;
    User(String name) { this.name = name; }
}

System.out.println(new User("a").equals(new User("a")));  // false：没重写 equals
```

两边都得**显式实现值相等**，只是入口不同。

## 3. Java：`==`、`equals`、`hashCode`

### 3.1 `==` 到底比什么

| 操作数 | `==` 的含义 |
|---|---|
| 两个基本类型 | 数值相等，会做二元数值提升（`1 == 1.0` 为 `true`） |
| 两个引用 | 是否指向同一个对象 |
| 基本类型与包装类 | 包装类自动拆箱后按数值比较；包装类为 `null` 时抛 `NullPointerException` |

### 3.2 `equals` 与 `hashCode`：只留结论

- `Object.equals` 的默认实现就是 `==`（身份比较）；`String`、包装类、`List`/`Set`/`Map` 重写了它，改成比内容。
- 自己的类不重写就仍是身份比较；重写时参数类型必须是 `Object`（写成 `equals(User other)` 是重载，集合里永远不会调用它），并且先判 `this == o`、再判 `null` 与类型。
- **重写 `equals` 必须同时重写 `hashCode`**：`HashMap`/`HashSet` 先用 `hashCode` 找桶，再用 `equals` 在桶里确认，只重写一个会让「相等」的对象落进不同的桶。参与 `equals` 的字段必须参与 `hashCode`，对象进容器后不要修改这些字段。
- `TreeMap`/`TreeSet` 走的是 `compareTo`，它和 `equals` 不一致时会出现「明明不相等却被当成同一个 key」。

完整写法（`Objects.equals`、`record` 的坑、`getClass()` 与 `instanceof` 怎么选）在 [Java 基础](./Java基础.md) 的「值与相等性」一节。

### 3.3 两种「看起来对」的假象

**字符串常量池**：字面量在编译期进入常量池，同一个字面量复用同一个对象，所以 `==` 偶然为 `true`；一旦经过 `new` 或运行期拼接，就变成新对象。

**包装类缓存**：`Integer.valueOf` 缓存 `-128..127`（JLS 保证这个范围，上限可用 `-XX:AutoBoxCacheMax` 调大），`Long`、`Short`、`Byte`、`Character` 也有类似缓存：

```java
Integer a = 127, b = 127;
Integer c = 128, d = 128;
System.out.println(a == b);        // true：命中缓存
System.out.println(c == d);        // false：超出缓存，两个对象
System.out.println(c.equals(d));   // true
```

### 3.4 两个连带的坑

| 类型 | 行为 |
|---|---|
| `BigDecimal` | 数值和 `scale` 一起比，`2.0` 与 `2.00` 不相等；比值用 `compareTo(...) == 0` |
| 浮点数 | `Double.NaN != Double.NaN`；`0.0 == -0.0` 为 `true`，但 `Double.equals` 为 `false`，比较要留容差 |

数组、`StringBuilder`、`Enum` 的 `equals` 行为见 [Java 基础](./Java基础.md) 的「其它容易忽略的类型」。

## 4. Python：`==`、`is`、`__eq__`、`__hash__`

### 4.1 `==` 与 `is`

| 写法 | 问的问题 | 底层 |
|---|---|---|
| `a == b` | 值是否相等 | `a.__eq__(b)` |
| `a is b` | 是不是同一个对象 | `id(a) == id(b)` |
| `hash(a) == hash(b)` | 哈希是否相同（不保证相等） | `a.__hash__()` |

- `==` 比较值，`is` 比较身份；
- `is` 只用于 `None`、`True`、`False` 和自定义哨兵，判断空一律写 `x is None`；
- 小整数（`-5..256`）和短字符串会被缓存或驻留，`a = 100; b = 100; a is b` 可能为 `True`，但这是 CPython 的实现细节，**不要依赖**；
- Python 3.8+ 对 `x is 1` 这类字面量比较会给出 `SyntaxWarning`（提示 `Did you mean "=="?`）。

```python
[1, 2] == [1, 2]      # True：内容相同
[1, 2] is [1, 2]      # False：两个不同对象

a = 257
b = 257
print(a is b)         # 同一代码块里可能为 True（常量复用），别拿来判断相等
```

`id()` 只在对象存活期间唯一。对象被回收后，新对象可能拿到同一个 `id`，所以不要把 `id` 存起来当长期标识。

### 4.2 自定义类：默认身份，重写要成对

`object.__eq__` 默认就是身份比较。重写 `__eq__` 之后，Python 会把 `__hash__` 置为 `None` —— 对象立刻变成不可哈希：

```python
class User:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        if not isinstance(other, User):
            return NotImplemented
        return self.name == other.name

u = User("a")
print(u == User("a"))   # True
# print({u})            # TypeError: unhashable type: 'User'
```

要用作 `set` 元素或 `dict` 键，必须同时实现 `__hash__`：

```python
class User:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        if not isinstance(other, User):
            return NotImplemented
        return self.name == other.name

    def __hash__(self):
        return hash(self.name)
```

`@dataclass` 的默认值是 `eq=True`、`frozen=False`，同样会把 `__hash__` 设为 `None`。要么用 `@dataclass(frozen=True)`（生成 `__hash__`，但字段不可变），要么自己写 `__hash__`，要么 `eq=False` 保持身份比较。

`__eq__` 遇到不认识的类型应该返回 `NotImplemented`，让 Python 去尝试对方的比较方法，而不是直接返回 `False`；最后仍比不出来时，解释器会退回身份比较。

### 4.3 数值相等比想象中宽

```python
1 == 1.0 == True          # True
hash(1) == hash(1.0) == hash(True)   # True
{1, True, 1.0}            # {1}：三个「相等」的值只留一个

from decimal import Decimal
Decimal("1.0") == Decimal("1.00")    # True：按数值比
```

注意 `bool` 是 `int` 的子类，`True == 1` 成立。这既是 `{1, True}` 合并的原因，也是 `sum([True, True]) == 2` 的原因。

`Decimal` 的行为和 Java 的 `BigDecimal` 正好相反：Python 按数值比，Java 连 `scale` 一起比。

### 4.4 浮点：`==` 不可靠，`NaN` 是特例

```python
import math

0.1 + 0.2 == 0.3          # False
math.isclose(0.1 + 0.2, 0.3)   # True

nan = float("nan")
nan == nan                # False
nan is nan                # True
nan in [nan]              # True：in 先做身份判断
float("nan") in [float("nan")]  # False：两个 NaN 不相等
```

因为 `NaN != NaN`，两个不同的 `NaN` 对象可以同时作为 `dict` 的两个键存在。涉及 `NaN` 的去重、查找要单独处理（`math.isnan`）。

### 4.5 容器比较是逐元素的

- `list`、`tuple`、`dict`、`set` 的 `==` 都是内容比较，可以嵌套；
- `[1, 2] == [1, 2.0]` 为 `True`（元素逐个按数值比）；
- `[1, 2] == (1, 2)` 为 `False`（类型不同，Python 不会跨类型比较序列）；
- `in`、`list.index`、`list.remove`、`list.count` 用的是 `==`；
- `set`、`dict` 的键先用 `hash` 定位，再用 `==` 确认，所以元素必须可哈希（`list`、`dict`、`set` 本身不可哈希）；
- `dict` 的比较与插入顺序无关：`{"a": 1, "b": 2} == {"b": 2, "a": 1}` 为 `True`。

NumPy 数组是例外：`==` 返回逐元素布尔数组，不是单个 `bool`，所以 `if arr == 0:` 会抛 `ValueError`，要用 `np.array_equal` 或 `(arr == 0).all()`。

### 4.6 排序用的是 `<`，不是 `==`

`sorted`、`list.sort`、`min`、`max`、`heapq` 都靠 `<`（`__lt__`），不靠 `==`：

```python
class Version:
    def __init__(self, n):
        self.n = n

    def __lt__(self, other):
        return self.n < other.n

print([v.n for v in sorted([Version(2), Version(1)])])   # [1, 2]
```

只实现 `__eq__` 的类不能直接排序，会抛 `TypeError: '<' not supported`。要补齐全部比较运算，可以用 `functools.total_ordering`，它只需要 `__eq__` 加一个 `__lt__`。

这一点对应 Java 的 `Comparable.compareTo` / `Comparator`：**相等和排序是两套接口，两边都一样。**

## 5. 跨语言迁移的高频坑

### 5.1 Java 程序员写 Python

1. `==` 不是身份比较，判空用 `is None`，不要写 `== None`。
2. 不要用 `is` 比数字、字符串、`True`/`False` 以外的常量；没有「包装类缓存」那套规则可以依赖。
3. 自定义类默认按身份比，需要值相等就实现 `__eq__`，要进 `set`/`dict` 再补 `__hash__`。
4. 浮点同样不能直接 `==`，用 `math.isclose`；`NaN` 不等于自己。
5. 排序需要 `__lt__`，不是实现一个 `compareTo` 就行。
6. `list`/`dict` 的 `==` 是深比较，Java 的数组要 `Arrays.equals`，不要把两边的习惯混在一起。

### 5.2 Python 程序员写 Java

1. 对象上的 `==` 比引用；字符串内容用 `equals`。
2. 包装类 `==` 只在 `-128..127` 的缓存区间内「碰巧」为 `true`，一律用 `equals` 或先拆箱。
3. 数组的 `equals` 是身份比较，用 `Arrays.equals` / `Arrays.deepEquals`。
4. `BigDecimal` 比值用 `compareTo(...) == 0`，不要用 `equals`。
5. 重写 `equals` 必须重写 `hashCode`，参与哈希的字段不要在入容器后修改。
6. 浮点用容差，`Double.compare` 和 `==` 对 `NaN`、`-0.0` 的处理不同。

## 6. 自检清单

写比较逻辑时，按顺序问自己：

- 我比的是**值**、**身份**，还是**排序位置**？
- 判空用的是不是语言推荐的写法（Java `== null`，Python `is None`）？
- 自定义类型实现值相等了吗？哈希实现和它一致吗？
- 这个对象放进 `HashMap`/`dict` 之后，还会被修改吗？
- 字符串比较走的是 `equals` / `==`，而不是 Java 的 `==` 或 Python 的 `is` 吗？
- 数组、`BigDecimal`、浮点、`NaN` 这些特殊类型，用的是对应的比较方法吗？
- 排序依赖的是 `compareTo` / `__lt__`，并且和 `equals` 的口径一致吗？

## 7. 相关阅读

- [Java 基础](./Java基础.md)：`==`、`equals`、`hashCode` 的速查写法。
- [Java 与数据结构](../Java与计算机基础/数据结构.md)：`HashMap` 的桶、扩容以及 `equals`/`hashCode` 契约。
- [Python 速查](/code-training/review/Python速查.html)：`is` 与 `==`、容器比较和排序。
- [Python 与内存管理](../Python与计算机基础/内存管理.md)：小整数缓存、字符串驻留和对象身份。
