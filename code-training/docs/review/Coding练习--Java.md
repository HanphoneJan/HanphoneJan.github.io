---
title: Coding练习--Java
category: 参考手册
last_updated: 2026-11-20
---
# Coding练习--Java

> 机考与笔试用的 Java 手册。假设你会 C 或 Python，但 Java 写得少：**先讲清楚一个东西是什么、为什么长这样，再给能直接用的代码**。
>
> 每块都是完整程序（`public class Main`），可以粘进 OJ。交付前 `pnpm check:java` 会逐块 `javac -Xlint:all -Werror` 并运行。
>
> 代码按「方法说明 + 逐行注释」写：不熟 Java 时，`List<Integer>` 这种类型、`Integer.valueOf` 这种调用本身就是需要解释的内容。
>
> 语法按 **JDK 8**：不用 `var`、`record`、`List.of`，牛客/华为机考等评测机基本都在这条线上。

## 零、先建立 Java 的心智模型

不熟悉 Java 时，最容易犯的错不是语法，而是**用 C 的直觉去猜 Java 的行为**：以为 `==` 比较的是值、以为把对象传进方法能改掉外面的变量、以为 `String` 拼接是原地修改。这一章先把这几个底层约定立住，后面所有章节都建立在这上面。

### 从源码到运行：JVM 替你做了什么

Java 源码先由 `javac` 编译成**字节码**（`.class` 文件），再由 JVM 解释/即时编译执行。这个中间层带来三个和 C 完全不同的结果：

| 事情 | C | Java |
|---|---|---|
| 内存 | `malloc/free` 手动管理 | 对象在堆上分配，GC 回收，没有 `free` |
| 数组越界 | 未定义行为，可能读到别的变量 | 抛 `ArrayIndexOutOfBoundsException`，程序当场停 |
| 指针 | 有地址、能做指针运算 | 只有**引用**，不能加减，也不能转成整数 |
| 字符串 | `char*` + `'\0'` | `String` 对象，不可变，带长度 |
| 方法传参 | 值传递（传指针时复制地址） | **只有值传递**（传对象时复制的是引用） |
| 释放 | 忘记 `free` 就泄漏 | 忘记置空只是晚一点被回收，不会泄漏 |

写题时最直接的影响是：**不用操心释放，但要操心对象分配的量**。`List<Integer>` 里每个 `Integer` 都是一个堆对象，1e6 个元素比 `int[]` 慢一个量级，原因就在这里。

### 变量里存的到底是什么

基本类型（`int`、`long`、`char`、`boolean` 等 8 种）的变量直接存值；其余一切都是**引用**——变量里存的是「对象在哪」，不是对象本身。赋值 `b = a` 复制的是这个引用，于是两个名字指向同一个对象。

```java
public class Main {
    // 参数是基本类型：传进来的是值的副本，方法里怎么改都影响不到调用处
    static void trySwap(int a, int b) {
        int t = a;   // 先把 a 的值存进临时变量，否则下一行会把它覆盖
        a = b;       // 形参 a 现在等于调用处的 y，但这只是副本
        b = t;       // 形参 b 换回原来的 a
    }

    // 参数是数组：数组是对象，传进来的是「指向同一个数组的引用副本」
    static void fillFirst(int[] arr) {
        arr[0] = 99; // 通过引用改的是堆上那个数组，调用处看得见
    }

    public static void main(String[] args) {
        int x = 1, y = 2;
        trySwap(x, y);
        System.out.println(x + " " + y);   // 1 2：swap 只改了形参副本

        int[] a = {1, 2, 3};               // a 是引用，数组对象在堆上
        int[] b = a;                       // 复制引用，不是复制数组
        b[1] = 99;                         // 通过 b 改的是同一个数组
        System.out.println(a[1]);          // 99：a 和 b 指向同一块内存

        fillFirst(a);                      // 把引用再复制一份传进去
        System.out.println(a[0]);          // 99：方法里改的是同一个对象

        String s1 = "ab";                  // 字面量，放在字符串常量池
        String s2 = s1;                    // s2 和 s1 指向同一个 String 对象
        s2 = s2 + "c";                     // 拼接不会改原对象，而是新建 "abc"
        System.out.println(s1 + " " + s2); // ab abc：s1 仍是原来那个对象
    }
}
```

> 记住一句话：**Java 只有值传递**。传对象时复制的是引用，所以方法里能改对象的内容（`arr[0] = 99`），但不能让外面的变量改指向另一个对象（`arr = new int[5]` 外面看不到）。

### 基本类型、包装类型与 `==`

集合（`List`、`Map`、`Set`）不能存基本类型，只能存对象，所以 Java 提供了 8 个包装类：`int → Integer`、`long → Long`、`char → Character`、`boolean → Boolean`……把 `int` 放进 `List<Integer>` 时，编译器自动做**装箱**（实际调用 `Integer.valueOf`），取出来时自动**拆箱**（`intValue`）。

问题就出在 `Integer.valueOf`：为了提高常用小整数的复用率，JDK 缓存了 **-128 到 127** 的 `Integer` 对象。落在这个区间的两次装箱拿到同一个对象，超出区间就各新建一个。而 `==` 对引用比较的是「是不是同一个对象」，于是出现了这个经典结果：

```java
public class Main {
    public static void main(String[] args) {
        Integer a = 127, b = 127;   // 自动装箱，127 在缓存区间内
        Integer c = 128, d = 128;   // 128 超出缓存，两次装箱各建一个对象

        System.out.println(a == b);        // true：a、b 是缓存里的同一个对象
        System.out.println(c == d);        // false：两个不同的 Integer 对象
        System.out.println(c.equals(d));   // true：equals 比的是里面的 int 值

        String s1 = "abc";                 // 字面量，进常量池
        String s2 = new String("abc");     // new 强制在堆上新建一个对象
        System.out.println(s1 == s2);      // false：一个是常量池，一个是堆
        System.out.println(s1.equals(s2)); // true：String 重写了 equals，比内容
    }
}
```

> 规则很简单：**比较内容一律用 `equals`，`==` 只用来比基本类型和判断 `null`**。这条规则在 `String`、`Integer`、自定义对象上都成立。

### Java 在 OJ 上的易错点速查

上面三条约定能解释下面一半的坑，剩下的是 OJ 特有的输入输出与性能问题。

| 写法 | 会出什么事 | 正确做法 |
|---|---|---|
| `Integer a = 128, b = 128; a == b` | `false`：只有 -128~127 走缓存 | `a.equals(b)` 或先 `intValue()` |
| `s == "abc"` 比较字符串 | 比的是引用，运行时对错随机 | `"abc".equals(s)` |
| `Arrays.asList(a).add(x)` | 返回定长视图，抛 `UnsupportedOperationException` | `new ArrayList<>(Arrays.asList(a))` |
| `list.remove(1)`（`List<Integer>`） | 删的是下标 1，不是值为 1 的元素 | `list.remove(Integer.valueOf(1))` |
| `Arrays.sort(int[], comparator)` | 编译不过：基本类型数组不支持自定义比较器 | 转 `Integer[]`，或换一种排法 |
| 用 `Scanner` 读 1e5 行 | 逐字符解析 + 正则，容易 TLE | `BufferedReader` + `StringTokenizer` |
| 循环里 `s += c` | 每次新建字符串，O(n²) | `StringBuilder.append` |
| `-7 / 2`、`-7 % 2` | 得 `-3`、`-1`（向零取整），不是 Python 的 `-4`、`1` | 要向下取整用 `Math.floorDiv / floorMod` |
| `char c = 'a'; int x = c + 1;` | `x` 是 98，不是 `'b'` | 结果转回 `(char)(c + 1)` |
| 遍历 `HashMap` 当有序用 | 顺序不保证，同一份数据两次跑可能不同 | 要顺序用 `LinkedHashMap` / `TreeMap` |
| `int` 存 `100000 * 100000` | 先在 `int` 里溢出成 1410065408 | 字面量写 `100000L` |
| 循环里逐行 `System.out.println` | 每行都可能触发一次 flush，数据量大时超时 | 攒进 `StringBuilder` 最后一次性输出 |

## 一、输入输出

Java 的读入之所以让人困惑，是因为它比 C 多了两层：`System.in` 是**字节流**，而题目给的是「一行数字」这种**字符/词**的概念。中间要有人把字节解码成字符、再切成词、再把词解析成数字。三档写法（`Scanner`、`BufferedReader`、`StreamTokenizer`）的差别，就是这三步各自做了多少。

### 为什么 `Scanner` 慢

`Scanner` 把上面三步全包了：它按分隔符找 token，能用正则匹配，还能直接 `nextInt()`。代价是**每读一个数都要走一遍模式匹配和字符串处理**，而且默认缓冲区很小。数据量到 1e5 时，解析本身就比算法还慢。

它适合签到题、行数不多的题。写法上唯一要注意的是用 `hasNextInt()` 判 EOF，而不是捕获异常：

```java
import java.util.Scanner;   // Scanner 在 java.util 包里，必须显式导入

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);  // System.in 是标准输入字节流
        long sum = 0;                          // 用 long，累加 1e5 个 int 可能超 int

        // hasNextInt 会先尝试解析下一个 token：能解析返回 true，EOF 或不是整数返回 false
        // 用 while 包住，天然支持「不知道有几组数据」
        while (in.hasNextInt()) {
            sum += in.nextInt();               // nextInt 只取走整数部分，其余留在流里
        }

        System.out.println(sum);
        in.close();                            // 关闭底层流；OJ 里不关也能跑完
    }
}
```

### `BufferedReader`：先把一块字节读进内存

`BufferedReader` 只做一件事：**一次从底层读一大块（默认 8192 字符）放进缓冲区**，`readLine()` 在内存里找换行。系统调用从「每行一次」降到「每块一次」，这是它快的主要原因。

拿到一行字符串之后，切词交给 `StringTokenizer`：它只按分隔符扫描，不建正则、不产生中间数组，比 `split` 轻。

```java
import java.io.BufferedReader;        // 带缓冲的字符输入
import java.io.IOException;           // readLine 会抛 IOException，必须处理
import java.io.InputStreamReader;     // 字节流 -> 字符流的桥
import java.util.StringTokenizer;     // 按分隔符切词

public class Main {
    // main 上声明 throws IOException：把异常交给 JVM，不用写 try-catch
    public static void main(String[] args) throws IOException {
        // 三层套娃：System.in(字节) -> InputStreamReader(解码成字符) -> BufferedReader(缓冲)
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();  // 所有结果先攒着
        String line;                              // 每次读到的整行（不含换行符）

        // readLine 读到一行返回字符串，EOF 返回 null；这就是多组输入的终止条件
        while ((line = br.readLine()) != null) {
            line = line.trim();                   // 去掉首尾空白，防止空行干扰
            if (line.isEmpty()) continue;         // 空行跳过，不占一组数据

            StringTokenizer st = new StringTokenizer(line);  // 默认按空格/制表/换行切
            long sum = 0;
            // hasMoreTokens 问「还有没有下一个词」，nextToken 取走它
            while (st.hasMoreTokens()) {
                sum += Long.parseLong(st.nextToken());       // 字符串 -> long
            }
            out.append(sum).append('\n');         // append 返回 this，可以链式调用
        }

        // 一次性输出：避免循环里 println 触发多次 flush
        System.out.print(out);
    }
}
```

> `StringTokenizer` 的分隔符默认是空格、制表符、换行、回车、换页，正好覆盖机考的「一行多个数」。`split("\\s+")` 也能做，但它每次都编译正则、还要建数组，数据量大时差距明显。

### `StreamTokenizer`：直接在字符流上解析数字

`StreamTokenizer` 把「切词 + 转数字」合成一步，读纯数字时最快。代价是它只有 `double` 一种数值类型，**超过 2^53 的整数会丢精度**，而且默认把引号当字符串边界。

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StreamTokenizer;

public class Main {
    public static void main(String[] args) throws IOException {
        // StreamTokenizer 仍然需要一个底层字符流；套 BufferedReader 是为了缓冲
        StreamTokenizer in = new StreamTokenizer(
                new BufferedReader(new InputStreamReader(System.in)));

        long sum = 0;
        // nextToken() 前进到下一个 token，并返回它的类型；读完返回 TT_EOF
        while (in.nextToken() != StreamTokenizer.TT_EOF) {
            // ttype 是刚读到的 token 类型：数字、单词、EOF、普通字符
            if (in.ttype == StreamTokenizer.TT_NUMBER) {
                // nval 里是数字的值，类型是 double；强转 long 前确认范围
                sum += (long) in.nval;
            }
        }
        System.out.println(sum);
    }
}
```

> 读大整数（超过 9e15）不要用它，换 `BufferedReader` + `Long.parseLong`。读混排文本（带引号、括号）时也要小心，它的默认词法规则会把引号里的内容当成一个整体。

### 输出：`printf` 与 `StringBuilder`

`System.out` 是一个带缓冲的 `PrintStream`，`println` 会触发 flush。**单行输出没问题，循环里逐行输出就会把时间花在系统调用上。**

```java
public class Main {
    public static void main(String[] args) {
        double pi = 3.14159265;

        // %d 整数、%5d 宽度 5 右对齐、%-5d 左对齐、%05d 左边补零
        System.out.printf("[%d] [%5d] [%-5d] [%05d]%n", 42, 42, 42, 42);
        // %.2f 保留两位小数、%8.3f 总宽 8 且三位小数、%n 平台换行
        System.out.printf("[%.2f] [%8.3f]%n", pi, pi);
        // %s 字符串、%10s 右对齐、%-10s 左对齐
        System.out.printf("[%s] [%10s] [%-10s]%n", "abc", "abc", "abc");
        // %c 字符、%x 十六进制、%o 八进制；long 用 %d 也能打印
        System.out.printf("[%c] [%x] [%o] [%d]%n", 'A', 255, 255, 1234567890123L);
        System.out.printf("100%%%n");   // 想输出一个 %，格式串里要写两个

        // StringBuilder 内部是可扩容的字符数组，append 不新建字符串
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            sb.append(i);                          // 数字自动转成字符串追加
            sb.append(i == 5 ? '\n' : ' ');        // 三元表达式选分隔符
        }
        System.out.print(sb);                      // 一次输出全部
    }
}
```

> `StringBuilder` 内部是一个可扩容的 `char[]`，`append` 均摊 O(1)；`String +=` 每次都要新建对象并复制全部内容，循环里用就是 O(n²)。**预估长度时可以用 `new StringBuilder(n)` 省掉扩容。**

### 大数：`BigInteger` 与 `BigDecimal`

`long` 的上限约 9.2e18，题目出现 `10^100`、高精度小数时只能用这两个类。它们都是**不可变对象**：所有运算返回新对象，原对象不动。

```java
import java.math.BigDecimal;    // 任意精度小数
import java.math.BigInteger;    // 任意精度整数
import java.math.RoundingMode;  // 舍入方式枚举（比 BigDecimal.ROUND_* 新）

public class Main {
    public static void main(String[] args) {
        // 必须用字符串构造：new BigInteger(123) 只接受 int/long，不能直接传大数
        BigInteger a = new BigInteger("12345678901234567890");
        BigInteger b = BigInteger.valueOf(97);   // 小数值可以用 valueOf 缓存

        System.out.println(a.add(b));            // 相加，返回新对象，a 本身不变
        System.out.println(a.multiply(b));       // 相乘
        System.out.println(a.mod(b));            // 取模，结果非负
        System.out.println(a.compareTo(b) > 0);  // 比较只能 compareTo，不能写 a > b

        // BigDecimal 同理：构造要传字符串，否则会把二进制误差带进来
        BigDecimal x = new BigDecimal("1.10");
        BigDecimal y = new BigDecimal("2.20");
        System.out.println(x.add(y));
        // setScale(2, HALF_UP)：保留两位、四舍五入；除法不给精度会抛异常
        System.out.println(x.multiply(y).setScale(2, RoundingMode.HALF_UP));
    }
}
```

> `new BigDecimal(0.1)` 会把 `0.1` 的二进制近似值完整带进来，结果是 `0.1000000000000000055511151231257827…`。**构造 `BigDecimal` 一律传字符串。**
## 二、容器与常用 API

Java 的集合框架不是一堆孤立的类，而是「**接口约定行为，实现决定代价**」。同样是 `List`，`ArrayList` 和 `LinkedList` 的接口完全一样，底层一个是连续数组、一个是分散节点，于是随机访问和中间插入的复杂度正好相反。不熟 Java 时最重要的是先记住这张对应表：

| 接口 | 常用实现 | 底层结构 | 什么时候用 |
|---|---|---|---|
| `List` | `ArrayList` | 可扩容数组 | 随机访问、尾部追加 |
| `List` | `LinkedList` | 双向链表 | 头尾频繁增删（多数场景 `ArrayDeque` 更好） |
| `Map` | `HashMap` | 数组 + 链表/红黑树 | 计数、去重、O(1) 查找 |
| `Map` | `LinkedHashMap` | 哈希表 + 双向链表 | 要保留插入顺序 |
| `Map` | `TreeMap` | 红黑树 | 要按 key 有序、找前驱后继 |
| `Set` | `HashSet` / `TreeSet` | 复用对应的 Map | 去重 / 有序去重 |
| `Queue` | `ArrayDeque` | 循环数组 | 队列、栈、BFS |
| `Queue` | `PriorityQueue` | 二叉堆（数组） | 取最值、Top K |

### 数组与 `Arrays`：连续内存带来的能力

数组在内存里是一段连续空间，所以 `a[i]` 能靠「首地址 + i × 元素大小」直接算出来，O(1)。这个特性带来两个后果：**随机访问快**，但**中间插入删除要搬移元素**，而且**长度一旦确定不能改**。

`Arrays` 工具类就是围绕这个结构做文章：`sort` 原地排序、`copyOf` 新建一个指定长度的副本（扩容/截断都靠它）、`binarySearch` 在有序数组上二分。

```java
import java.util.Arrays;   // 所有数组工具方法都在这里

public class Main {
    public static void main(String[] args) {
        int[] a = {5, 2, 9, 1, 7};   // 静态初始化：长度由元素个数决定

        // Arrays.sort(int[])：基本类型用双轴快排，原地排序，不稳定，O(n log n)
        Arrays.sort(a);
        // Arrays.toString 是给一维数组用的；直接 println(a) 只会打印 [I@1b6d3586
        System.out.println(Arrays.toString(a));

        // binarySearch 返回下标；数组必须先有序。
        // 找不到时返回 -(插入点) - 1，不是 -1
        System.out.println(Arrays.binarySearch(a, 7));

        // copyOf(原数组, 新长度)：长度更短就截断，更长就在末尾补 0
        // 这是 ArrayList 扩容时真正调用的底层操作
        int[] b = Arrays.copyOf(a, 3);
        System.out.println(Arrays.toString(b));

        // new int[5] 本身已经全是 0；fill 用于「要填别的默认值」的情况
        int[] dp = new int[5];
        Arrays.fill(dp, -1);
        System.out.println(Arrays.toString(dp));

        // 二维数组的每个元素是一维数组，toString 只会打印行对象的地址
        int[][] grid = {{1, 2}, {3, 4}};
        System.out.println(Arrays.deepToString(grid));   // 会递归打印每一行

        // int[] 不能传比较器（编译不过），要降序必须装箱成 Integer[]
        Integer[] boxed = {5, 2, 9};
        // (x, y) -> Integer.compare(y, x)：y 在前表示降序
        Arrays.sort(boxed, (x, y) -> Integer.compare(y, x));
        System.out.println(Arrays.toString(boxed));
    }
}
```

> `Arrays.sort(int[])` 对基本类型用双轴快排（不稳定），对对象数组用 TimSort（稳定）。题目要求「相同元素保持原顺序」时，只能把原下标一起参与比较，或者改用对象数组。

### `String` 与 `StringBuilder`：不可变对象意味着什么

`String` 是 `final` 类，内部字符数组不能改。所有看起来像「修改」的方法（`trim`、`substring`、`+`）**都返回新对象**。这带来两个直接结果：

1. 字符串字面量可以放进**常量池**复用，同样的内容只有一份；
2. 循环里 `s += c` 每一步都要新建对象并复制前面所有字符，总代价 O(n²)。

`StringBuilder` 内部是一个可扩容的字符数组，`append` 直接往后写，均摊 O(1)，最后 `toString()` 才生成一次 `String`。

```java
public class Main {
    public static void main(String[] args) {
        String s = "  Hello Java  ";

        // trim 返回新字符串，s 本身不变；这里必须用返回值，否则等于没调
        System.out.println(s.trim().length());            // 去掉首尾空格后 10

        // split 的参数是正则："," 是普通字符，"." 却要写成 "\\."
        System.out.println("a,b,,c".split(",").length);    // 4，中间的空串保留
        System.out.println("a,b,,".split(",").length);     // 2，末尾空串默认丢弃
        System.out.println("a,b,,".split(",", -1).length); // 4，-1 表示保留末尾空串

        // StringBuilder 内部是 char[]，append 直接写数组，不新建 String
        StringBuilder sb = new StringBuilder();
        for (char c : "abc".toCharArray()) {   // toCharArray 把 String 转成 char[]
            sb.append(c).append('-');          // append 返回 this，可以链式
        }
        System.out.println(sb);                // a-b-c-

        // String.join 用分隔符把多个字符串连起来，内部也是 StringBuilder
        System.out.println(String.join("-", "a", "b", "c"));

        // compareTo 返回「负 / 零 / 正」，不是固定 -1/1；负数表示字典序在前
        System.out.println("abc".compareTo("abd"));

        // indexOf 找不到返回 -1；找到了返回第一个字符的下标
        System.out.println("hello".indexOf("ll"));

        // substring(begin, end) 左闭右开，取到 end 的前一个字符
        System.out.println("hello".substring(1, 3));   // el
    }
}
```

> `String` 在 JDK 8 里内部是 `char[]`，新版本为了省内存改成了 `byte[]` 加编码标记；对使用者没有区别。**判断字符串相等永远用 `equals`**，`==` 比的是是不是同一个对象。

### `List`：数组和链表的取舍

`ArrayList` 底层是数组，扩容时按 **1.5 倍**（JDK 实现，`old + old >> 1`）新建数组并复制；`LinkedList` 每个元素是一个节点对象，节点里存前驱、后继和值。

于是代价正好相反：

| 操作 | `ArrayList` | `LinkedList` |
|---|---|---|
| `get(i)` | O(1) | O(n)，要从头走 |
| 尾部 `add` | 均摊 O(1) | O(1) |
| 头部 `add/remove` | O(n)，要搬移 | O(1) |
| 中间插入 | O(n) | 定位 O(n) + 改指针 O(1) |
| 内存 | 紧凑，只有数组 | 每个元素多两个引用 |

机考里 95% 的场景用 `ArrayList`；需要队列/栈时用 `ArrayDeque`，它比 `LinkedList` 更快也更省内存。

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        // 声明成 List 接口、new 具体实现：以后换实现只改这一处
        // 泛型 <Integer> 只能写包装类型，不能写 int
        List<Integer> list = new ArrayList<>();
        list.add(3);        // 自动装箱：int 3 -> Integer.valueOf(3)
        list.add(1);
        list.add(2);

        // Collections.sort 要求元素实现 Comparable；Integer 已经实现
        Collections.sort(list);
        System.out.println(list);        // ArrayList 的 toString 会打印 [1, 2, 3]

        // get 是 O(1)：ArrayList 底层数组直接按下标取
        System.out.println("下标 1: " + list.get(1));
        list.set(0, 9);                  // 替换下标 0 的值，不改变长度

        // 关键歧义：List<Integer> 有两个 remove
        // remove(int)    -> 按下标删
        // remove(Object) -> 按值删
        // 直接写 remove(2) 会删下标 2；要删「值 2」必须显式装箱
        list.remove(Integer.valueOf(2));
        System.out.println(list);        // [9, 3]

        // 每个元素是 int[]：适合存坐标/区间，但 int[] 没有重写 equals
        List<int[]> pairs = new ArrayList<>();
        pairs.add(new int[]{1, 2});      // 数组是对象，可以直接放进 List
        System.out.println(pairs.get(0)[1]);   // 先取行，再取列

        // Arrays.asList 返回的是「基于原数组的定长视图」，add/remove 会抛异常
        // 套一层 new ArrayList<>(...) 才是可增删的独立列表（浅拷贝）
        List<String> growable = new ArrayList<>(Arrays.asList("a", "b"));
        growable.add("c");
        System.out.println(growable);
    }
}
```

> `new ArrayList<>(Arrays.asList(a))` 是浅拷贝：新列表可以增删，但里面的元素对象还是同一批。

### `Map` 与 `Set`：哈希表到底快在哪

`HashMap` 的核心是一个**数组**（桶），key 先经过 `hashCode()` 再做扰动，最后 `& (n - 1)` 落到某个桶。桶里先挂链表；链表长度到 8 且数组长度到 64 时转成红黑树，防止极端数据把 O(1) 退化成 O(n)。元素数量超过 `容量 × 0.75`（负载因子）就扩容一倍。

所以 `HashMap` 的 O(1) 是**均摊**的，前提是哈希函数把 key 打散得够均匀。自定义对象当 key 时必须同时重写 `equals` 和 `hashCode`：相等的对象必须有相同的哈希值，否则 `get` 永远找不到。

`LinkedHashMap` 在哈希表之外又串了一条双向链表记录插入顺序；`TreeMap` 直接是一棵红黑树，所有操作 O(log n)，但能按 key 排序、找 `floorKey/ceilingKey`。

```java
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

public class Main {
    public static void main(String[] args) {
        String[] words = {"apple", "banana", "apple", "cherry", "banana", "apple"};

        // HashMap：key -> value，查找/插入均摊 O(1)，不保证顺序
        Map<String, Integer> count = new HashMap<>();

        // merge 的三个参数：key、要合并的值、合并函数
        // 键不存在时直接放入 1；存在时执行 Integer::sum(old, 1)
        for (String w : words) count.merge(w, 1, Integer::sum);

        System.out.println(count.get("apple"));            // 3
        // get 不存在的键返回 null；getOrDefault 只返回兜底值，不会写进 map
        System.out.println(count.getOrDefault("durian", 0));

        // HashSet 内部就是一个 HashMap，value 位置放一个共享的占位对象
        Set<String> seen = new HashSet<>();
        for (String w : words) seen.add(w);   // 重复 add 返回 false，不影响集合
        System.out.println(seen.size());      // 3

        // LinkedHashMap 在哈希表之外维护一条插入顺序的双向链表
        // putIfAbsent：key 不存在才放入，返回旧值（没有则 null）
        Map<String, Integer> ordered = new LinkedHashMap<>();
        for (String w : words) ordered.putIfAbsent(w, ordered.size());
        System.out.println(ordered.keySet());   // [apple, banana, cherry]

        // TreeMap 是红黑树，按 key 自然顺序排；firstKey/floorKey 都是 O(log n)
        TreeMap<Integer, Integer> sorted = new TreeMap<>();
        sorted.put(3, 30);
        sorted.put(1, 10);
        System.out.println(sorted.firstKey());     // 1
        System.out.println(sorted.floorKey(2));    // ≤ 2 的最大 key：1
    }
}
```

> **遍历 `HashMap` 的顺序没有任何保证**，同一份数据在不同 JDK 版本上都可能不同。需要稳定输出就用 `LinkedHashMap`（插入序）或 `TreeMap`（key 序），或者把 entry 取出来自己排序。

### `Queue`、`Deque` 与栈：为什么不用 `Stack`

`java.util.Stack` 继承自 `Vector`，每个方法都加了同步锁，单线程写题纯属浪费；而且它的迭代顺序和栈语义容易混。JDK 现在推荐用 **`ArrayDeque` 同时当队列和栈**：内部是循环数组，两端操作 O(1)，没有同步开销。

循环数组的关键是「头尾用取模回绕」：`head` 和 `tail` 一直往后走，走到数组末尾就回到 0，中间空出来的位置还能继续用。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    public static void main(String[] args) {
        // Deque 是「双端队列」接口，ArrayDeque 是它的数组实现
        // 当作队列用时：offerLast 进、pollFirst 出
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offerLast(1);        // 尾部入队，成功返回 true
        queue.offerLast(2);
        queue.offerLast(3);
        System.out.println(queue.pollFirst());   // 1：头部出队，空时返回 null
        System.out.println(queue.size());        // 2

        // 当作栈用时：push/pop/peek 操作的其实是头部
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);             // 等价于 addFirst(1)
        stack.push(2);             // 现在头部是 2
        System.out.println(stack.pop());         // 2：removeFirst
        System.out.println(stack.peek());        // 1：peekFirst，不删除

        // ArrayDeque 内部数组不允许存 null；需要存 null 只能换 LinkedList
        System.out.println(stack.isEmpty());
    }
}
```

> 队列有两套方法：`offer/poll/peek` 失败返回 `false/null`，`add/remove/element` 失败抛异常。BFS 里统一用前一套，省掉 try-catch。

### `PriorityQueue`：堆是一个数组

`PriorityQueue` 底层是**二叉堆**，而二叉堆就是一棵完全二叉树，直接存在数组里：下标 `i` 的左孩子是 `2i+1`、右孩子是 `2i+2`、父亲是 `(i-1)/2`。因为完全二叉树没有空洞，数组不会浪费空间。

堆只保证一件事：**堆顶是最值**（默认最小）。插入是「放到末尾再上浮」，删除堆顶是「把末尾换到堆顶再下沉」，都是 O(log n)。它不保证整体有序，所以遍历 `PriorityQueue` 得到的顺序没有意义。

```java
import java.util.PriorityQueue;

public class Main {
    public static void main(String[] args) {
        // 不传比较器时，Integer 的自然顺序最小，所以是小顶堆
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        for (int x : new int[]{5, 1, 3}) {
            minHeap.offer(x);       // 插入 O(log n)，自动上浮到合适位置
        }
        // poll 每次取走堆顶并重新下沉，连续 poll 才能得到有序序列
        while (!minHeap.isEmpty()) System.out.print(minHeap.poll() + " ");
        System.out.println();

        // 大顶堆：比较器返回负数表示 x 排在 y 前面
        // 不要写 y - x：两数相减溢出后符号会翻转，堆序直接错
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>((x, y) -> Integer.compare(y, x));
        for (int x : new int[]{5, 1, 3}) maxHeap.offer(x);
        System.out.println(maxHeap.peek());     // 堆顶是最大值 5

        // 元素是数组时，比较器收到的是两个 int[]，按第二个元素排
        PriorityQueue<int[]> bySecond =
                new PriorityQueue<>((x, y) -> Integer.compare(x[1], y[1]));
        bySecond.offer(new int[]{1, 9});
        bySecond.offer(new int[]{2, 3});
        System.out.println(bySecond.peek()[0]);  // 第二个元素最小的是 {2,3}

        // 多关键字比较：先比长度，长度相同再比字典序
        PriorityQueue<String> words = new PriorityQueue<>((x, y) -> {
            if (x.length() != y.length()) return Integer.compare(x.length(), y.length());
            return x.compareTo(y);
        });
        words.offer("java");
        words.offer("c");                        // 长度 1 排在长度 4 前面
        System.out.println(words.peek());        // c
    }
}
```

> `PriorityQueue` 的 `toString()` 和 `for-each` 遍历的是**数组的物理顺序**，不是优先级顺序。要按序取出只能 `poll()`。

### 排序与 `Comparator`：什么是一个合法的比较器

`Collections.sort` / `Arrays.sort` 要求比较器给出一个**全序**：任意两个元素都能比、结果不矛盾、传递性成立。违反这条契约时 JDK 会直接抛 `IllegalArgumentException: Comparison method violates its general contract!`，而不是给你一个「差不多」的顺序。

两种写法：类实现 `Comparable<T>` 定义「默认怎么比」，或者传 `Comparator<T>` 临时指定。多个字段比较时按「主关键字 → 次关键字」逐层返回，不要用减法。

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    // Comparable<Student>：告诉排序算法「Student 自己知道怎么比」
    static class Student implements Comparable<Student> {
        String name;
        int score;

        Student(String name, int score) {
            this.name = name;   // this 区分字段和同名形参
            this.score = score;
        }

        // compareTo 返回负数：this 排前面；正数：other 排前面；0：相等
        @Override
        public int compareTo(Student other) {
            if (score != other.score) {
                // 注意参数顺序：other.score 在前 => 分数高的排前面（降序）
                return Integer.compare(other.score, score);
            }
            // 分数相同按名字升序；String 的 compareTo 就是字典序
            return name.compareTo(other.name);
        }

        // 打印 List 时会调用每个元素的 toString
        @Override
        public String toString() {
            return name + ":" + score;
        }
    }

    public static void main(String[] args) {
        // Arrays.asList 的参数是可变参数，直接列出元素即可
        List<Student> students = new ArrayList<>(Arrays.asList(
                new Student("Tom", 90), new Student("Ann", 95), new Student("Bob", 90)));

        // 没有传比较器，Collections.sort 调用元素自己的 compareTo
        Collections.sort(students);
        System.out.println(students);   // [Ann:95, Bob:90, Tom:90]

        // 二维数组：每个元素是一行 int[]
        int[][] intervals = {{2, 5}, {1, 3}, {3, 6}};
        // 比较器收到的是两行，x[0] 是第一列；按第一列升序
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        System.out.println(Arrays.deepToString(intervals));

        // 对象数组的 sort 是稳定排序（TimSort），相同 key 保持原顺序
        String[] words = {"pear", "apple", "fig"};
        Arrays.sort(words);   // String 实现了 Comparable，按字典序
        System.out.println(Arrays.toString(words));
    }
}
```

> 比较器里返回 `a - b` 是最常见的错误：`a`、`b` 一大一小相减会溢出，符号翻转后排序结果和预期相反。**一律用 `Integer.compare` / `Long.compare`。**

### `Collections` 工具类

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(Arrays.asList(3, 1, 2, 1));

        // max/min 线性扫描一次，O(n)
        System.out.println(Collections.max(a) + " " + Collections.min(a));

        // reverse 原地反转：把首尾对调，O(n)，不新建列表
        Collections.reverse(a);
        System.out.println(a);                    // [1, 2, 1, 3]

        // frequency 统计某个值出现次数，也是 O(n)；
        // 要统计多个值就自己建 HashMap，别反复调它
        System.out.println(Collections.frequency(a, 1));   // 2

        // swap 按下标交换两个元素
        Collections.swap(a, 0, 1);
        System.out.println(a);                    // [2, 1, 1, 3]

        // binarySearch 要求列表已按自然顺序排好；找不到返回 -(插入点)-1
        Collections.sort(a);
        System.out.println(Collections.binarySearch(a, 2));
    }
}
```

> `Collections.binarySearch` 和 `Arrays.binarySearch` 一样，**调用前必须有序**。返回负数不代表「差一点找到」，而是「插入点的负值减一」，比如返回 `-3` 表示应该插在下标 2。
## 三、数据结构

这一章每节都按同一个顺序走：**它解决什么问题 → 底层为什么这么设计 → JDK 里怎么用 → 手写一遍**。手写不是为了替代 JDK，而是因为面试常要求实现，而且只有自己写一遍，才知道 `ArrayList` 扩容、`HashMap` 冲突、堆的 `poll` 那些操作贵在哪。

### 动态数组（手写 `ArrayList`）

数组的问题是长度固定。要在末尾一直追加，只有两条路：每次满了就新建一个「原长度 + 1」的数组并复制，或者**按倍数扩容**。前者每次追加都要复制全部元素，n 次追加是 O(n²)；后者容量按 2 倍增长，复制次数是 `1+2+4+…+n < 2n`，均摊到每次追加就是 O(1)。

JDK 的 `ArrayList` 用的是 1.5 倍（`old + old >> 1`），比 2 倍省内存，代价是扩容次数略多。手写时用 2 倍更容易记。

```java
import java.util.Arrays;   // 用 Arrays.copyOf 完成扩容

public class Main {
    // 只在本文件可见的静态嵌套类；static 表示它不依赖外部实例
    static class IntList {
        private int[] data = new int[4];   // 真正存数据的数组，初始容量 4
        private int size = 0;              // 有效元素个数，不是 data.length

        // 末尾追加：满了先扩容，再写入
        void add(int x) {
            if (size == data.length) {
                // 2 倍扩容：复制旧内容到新数组，old 数组会被 GC 回收
                // 扩容是 O(n)，但平均到每次 add 是 O(1)
                data = Arrays.copyOf(data, data.length * 2);
            }
            // 先取值再自增：把 x 放到下标 size，然后 size 加一
            data[size++] = x;
        }

        // 随机访问：数组地址连续，直接算出第 index 个位置，O(1)
        int get(int index) {
            return data[index];
        }

        // 暴露有效长度，而不是数组容量
        int size() {
            return size;
        }
    }

    public static void main(String[] args) {
        IntList list = new IntList();

        // 追加 10 个元素：下标 0..9，期间会从容量 4 扩到 8、16
        for (int i = 0; i < 10; i++) list.add(i * i);

        // 遍历只能到 size，不能到 data.length，否则会读到扩容后没用的位置
        for (int i = 0; i < list.size(); i++) System.out.print(list.get(i) + " ");
        System.out.println("\n长度 " + list.size());
    }
}
```

> 扩容复制的是引用/值，不是「把旧数组接在新数组后面」。旧数组会被 GC 回收，所以扩容瞬间内存占用会短暂翻倍。

### 链表

链表用「每个节点记住下一个节点在哪」代替连续内存。代价是不能按下标直接算地址，只能从头一个个走；好处是插入删除只改指针，不用搬移元素。

Java 没有指针，但**对象引用就是指针的受控版本**：`node.next` 存的是下一个节点对象的引用。`head = head.next` 只是让局部变量指向下一个节点，链表本身没变；要改结构必须写 `node.next = ...`。

```java
public class Main {
    // 链表节点：值 + 指向下一个节点的引用
    static class ListNode {
        int val;          // 节点存的数据
        ListNode next;    // 指向下一个节点；最后一个节点的 next 是 null

        ListNode(int val) {
            this.val = val;   // 只初始化值，next 默认就是 null
        }
    }

    // 头插：新节点成为新的头。返回新的 head，调用处必须接住
    static ListNode pushFront(ListNode head, int val) {
        ListNode node = new ListNode(val);   // 在堆上新建一个节点
        node.next = head;                    // 新节点指向原来的头
        return node;                         // 新节点就是新的头
    }

    // 反转：prev 是已反转部分的头，head 是未反转部分的头
    static ListNode reverse(ListNode head) {
        ListNode prev = null;                // 反转后原来的头会变成尾，next 为 null

        while (head != null) {
            // 必须先把 next 存下来：下一行会覆盖 head.next
            ListNode next = head.next;
            head.next = prev;                // 当前节点改为指向前一个
            prev = head;                     // prev 前进一步
            head = next;                     // head 前进一步
        }
        return prev;                         // 循环结束时 prev 是新的头
    }

    // 打印：用 StringBuilder 拼接，避免多次 println
    static void print(String tag, ListNode head) {
        StringBuilder sb = new StringBuilder(tag);
        // cur 是遍历指针，它只是引用的副本，不会改变链表结构
        for (ListNode cur = head; cur != null; cur = cur.next) {
            sb.append(cur.val);
            sb.append(cur.next == null ? "" : " -> ");   // 最后一个节点不加箭头
        }
        System.out.println(sb);
    }

    public static void main(String[] args) {
        ListNode head = null;                // 空链表用 null 表示

        // 依次头插 1、2、3：最后链表是 3 -> 2 -> 1
        for (int i = 1; i <= 3; i++) head = pushFront(head, i);

        print("链表: ", head);
        print("反转: ", reverse(head));      // 反转后是 1 -> 2 -> 3
    }
}
```

> 反转的三指针里，`next` 只是临时变量；真正改变结构的是 `head.next = prev`。漏掉「先存 next」这一步，下一轮就找不到剩余链表了。

### 栈与队列（手写）

栈是后进先出（LIFO），队列是先进先出（FIFO）。用数组实现栈很简单，一个 `top` 指针就够；队列麻烦在**出队后前面的空间空着却不能用**，所以实际都用循环队列：`head` 和 `size` 配合取模，走到末尾自动回到开头。

```java
public class Main {
    static class IntStack {
        private final int[] data;   // final 表示引用不再变，但数组内容可以改
        private int top = -1;       // 指向栈顶元素；空栈时是 -1

        IntStack(int capacity) {
            data = new int[capacity];   // 容量由调用方决定
        }

        void push(int x) {
            // 先自增再赋值：top 从 -1 变成 0，新元素放在 0
            data[++top] = x;
        }

        int pop() {
            // 先取值再自减；返回的是原栈顶，top 退一格
            return data[top--];
        }

        int peek() {
            // 只看不删，栈顶元素还在
            return data[top];
        }

        boolean isEmpty() {
            return top == -1;   // 空栈的判据
        }
    }

    // 循环队列：用 (head + size) % capacity 算尾位置，
    // 这样不用单独维护 tail，也不会出现「假溢出」
    static class IntQueue {
        private final int[] data;
        private int head = 0;   // 队头下标
        private int size = 0;   // 当前元素个数

        IntQueue(int capacity) {
            data = new int[capacity];
        }

        boolean offer(int x) {
            if (size == data.length) return false;   // 真满了，不是假溢出

            // 尾位置 = 头 + 长度，再对容量取模实现回绕
            data[(head + size) % data.length] = x;
            size++;
            return true;
        }

        int poll() {
            int value = data[head];                 // 先取队头
            head = (head + 1) % data.length;        // 头指针回绕
            size--;                                 // 元素少一个
            return value;
        }

        boolean isEmpty() {
            return size == 0;
        }
    }

    public static void main(String[] args) {
        // 栈：1 进、2 进，栈顶是 2，弹出 2
        IntStack stack = new IntStack(10);
        stack.push(1);
        stack.push(2);
        System.out.println(stack.peek() + " " + stack.pop());   // 2 2

        // 队列：1、2、3 依次进，出队顺序也是 1、2、3
        IntQueue queue = new IntQueue(10);
        queue.offer(1);
        queue.offer(2);
        queue.offer(3);
        while (!queue.isEmpty()) System.out.print(queue.poll() + " ");
        System.out.println();
    }
}
```

> 循环队列必须留一个「空位」或者单独记 `size`，否则 `head == tail` 既可能表示空也可能表示满。这里用 `size`，容量就能全部用上。

### 堆（手写二叉堆）

堆是一棵**完全二叉树**：除了最后一层，每层都填满，最后一层从左往右连续。正因为没有空洞，它可以不建节点，直接放在数组里：下标 `i` 的左孩子是 `2i+1`，右孩子是 `2i+2`，父亲是 `(i-1)/2`。

堆只维护一条性质：**每个节点都不大于（或不小于）它的孩子**。这条性质比「整体有序」弱得多，所以插入删除只要 O(log n)，而排序需要 O(n log n)。

```java
public class Main {
    static class MinHeap {
        private final int[] a;   // 堆的物理存储就是一个数组
        private int size = 0;    // 堆中元素个数，同时是下一个空位的下标

        MinHeap(int capacity) {
            a = new int[capacity];
        }

        // 上浮：新元素放末尾，只要比父亲小就交换，直到根
        void push(int x) {
            int i = size++;      // i 是新元素的位置，先把 size 加一
            a[i] = x;

            while (i > 0) {
                int parent = (i - 1) / 2;          // 父亲下标
                if (a[parent] <= a[i]) break;      // 已经满足小顶堆性质
                swap(parent, i);                   // 孩子比父亲小，交换
                i = parent;                        // 继续往上比较
            }
        }

        // 下沉：根和末尾交换（删掉根），再让新根和孩子里更小的那个换
        int pop() {
            int top = a[0];           // 要返回的最小值
            a[0] = a[--size];         // 末尾元素搬到根，堆长度减一

            int i = 0;
            while (true) {
                int left = 2 * i + 1;
                int right = left + 1;
                int smallest = i;

                // 在「自己、左孩子、右孩子」里找最小的
                if (left < size && a[left] < a[smallest]) smallest = left;
                if (right < size && a[right] < a[smallest]) smallest = right;
                if (smallest == i) break;   // 已经比两个孩子都小，停

                swap(i, smallest);
                i = smallest;               // 继续往下
            }
            return top;
        }

        boolean isEmpty() {
            return size == 0;
        }

        private void swap(int i, int j) {
            int t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
    }

    public static void main(String[] args) {
        MinHeap heap = new MinHeap(10);
        for (int x : new int[]{5, 3, 8, 1, 9, 2}) heap.push(x);

        // 连续 pop 得到升序序列；堆本身只保证堆顶最小
        while (!heap.isEmpty()) System.out.print(heap.pop() + " ");
        System.out.println();
    }
}
```

> `pop` 不是「删掉 `a[0]` 再把后面整体前移」——那样是 O(n)。正确做法是把末尾元素换到根，再下沉，只有 O(log n)。

### 哈希表（手写链地址法）

哈希表要解决的是「给定 key，怎么不遍历就找到它」。答案是把 key 算成一个整数，再对数组长度取模，直接落到某个桶。不同 key 可能落到同一个桶（冲突），所以桶里还要能存多个元素：这里用链表，JDK 的 `HashMap` 在链表过长时会换成红黑树。

```java
public class Main {
    // 桶里的链表节点：键、值、下一个节点
    static class HNode {
        int key;
        int value;
        HNode next;

        HNode(int key, int value) {
            this.key = key;
            this.value = value;
            // next 默认 null，下面插入时再设置
        }
    }

    static class IntHashMap {
        private final HNode[] table;   // 每个下标是一个桶，桶里挂链表

        IntHashMap(int capacity) {
            table = new HNode[capacity];   // 对象数组默认全是 null
        }

        // 哈希函数：key -> [0, table.length)
        // Math.floorMod 处理负数：-1 % 16 在 Java 里是 -1，不是 15
        private int index(int key) {
            return Math.floorMod(key, table.length);
        }

        // 插入或覆盖
        void put(int key, int value) {
            int i = index(key);

            // 先查同 key：存在就覆盖值，不新建节点（避免重复 key）
            for (HNode cur = table[i]; cur != null; cur = cur.next) {
                if (cur.key == key) {
                    cur.value = value;
                    return;
                }
            }

            // 头插：新节点指向原链表头，再让桶指向新节点，插入 O(1)
            HNode node = new HNode(key, value);
            node.next = table[i];
            table[i] = node;
        }

        // 查询：返回 Integer 而不是 int，用 null 表示「没有这个键」
        // 否则 value 本身是 -1 时就和「没找到」撞了
        Integer get(int key) {
            for (HNode cur = table[index(key)]; cur != null; cur = cur.next) {
                if (cur.key == key) return cur.value;
            }
            return null;
        }

        // 删除：链表删除要维护前驱，prev 为 null 表示删的是头节点
        boolean remove(int key) {
            int i = index(key);
            HNode prev = null;

            for (HNode cur = table[i]; cur != null; prev = cur, cur = cur.next) {
                if (cur.key == key) {
                    if (prev == null) table[i] = cur.next;   // 删头
                    else prev.next = cur.next;               // 跳过当前节点
                    return true;
                }
            }
            return false;   // 没找到
        }
    }

    public static void main(String[] args) {
        IntHashMap map = new IntHashMap(16);

        // 放 10 个键：key = i*100，value = i
        for (int i = 0; i < 10; i++) map.put(i * 100, i);

        System.out.println(map.get(500));    // 5
        System.out.println(map.get(123));    // null
        System.out.println(map.remove(500)); // true
        System.out.println(map.get(500));    // null
    }
}
```

> 桶的数量要大于元素数量，否则链表越来越长，O(1) 会退化成 O(n)。JDK 的阈值是「元素数 > 容量 × 0.75」就扩容一倍。

### 并查集（Union-Find）

并查集维护一堆「谁和谁是一伙的」。它不关心集合里有哪些元素，只回答两个问题：**你在哪个集合**、**把两个集合并起来**。

每个集合选一个**代表**（根），`parent[x]` 指向 x 的父节点，根指向自己。查代表就是一路往上走；合并就是让一个根指向另一个根。两个优化各解决一个问题：

- **路径压缩**：查的时候把沿途节点直接挂到根上，下次再查就是一步；
- **按大小合并**：矮树挂到高树下，避免树退化成一条链。

两个一起用，单次操作接近 O(1)。

```java
public class Main {
    static class DSU {
        private final int[] parent;   // parent[x] = x 的父亲；根的父亲是自己
        private final int[] size;     // size[root] = 这个集合的元素个数

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            // 初始时每个元素自成一个集合，父亲是自己，大小为 1
            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        // 找根 + 路径压缩
        int find(int x) {
            while (parent[x] != x) {
                // 路径减半：把 x 挂到爷爷下面，树高快速下降
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;   // 走到 parent[x] == x 就是根
        }

        // 合并两个集合，返回 true 表示原来不在同一集合
        boolean union(int a, int b) {
            int ra = find(a);
            int rb = find(b);
            if (ra == rb) return false;   // 已经同集合，合并会成环

            // 按大小合并：小集合挂到大集合下面，树高增长更慢
            if (size[ra] < size[rb]) {
                int t = ra;
                ra = rb;
                rb = t;
            }
            parent[rb] = ra;              // rb 的父亲改成 ra
            size[ra] += size[rb];         // 只维护根的大小
            return true;
        }
    }

    public static void main(String[] args) {
        DSU dsu = new DSU(6);

        // 0-1-2 连成一个集合，4-5 连成另一个，3 单独
        dsu.union(0, 1);
        dsu.union(1, 2);
        dsu.union(4, 5);

        // 根的数量就是连通块个数
        int components = 0;
        for (int i = 0; i < 6; i++) {
            if (dsu.find(i) == i) components++;
        }
        System.out.println("连通块个数 = " + components);

        // 同一集合 <=> 根相同
        System.out.println("0 和 2 连通: " + (dsu.find(0) == dsu.find(2)));
        System.out.println("0 和 4 连通: " + (dsu.find(0) == dsu.find(4)));
    }
}
```

> `union` 返回「是否真的合并了两个不同集合」很有用：Kruskal 靠它判断加这条边会不会成环，统计连通块数量也靠它。

### 树（Tree）

树是一种「一个节点可以有多个孩子、但只有一个父亲」的结构。机考里 90% 是二叉树，核心约定只有一条：**左子树所有值 < 根 < 右子树所有值**（BST）。有了这条约定，查找时每比较一次就能排除一半子树，平均 O(log n)。

但 BST 不保证平衡。按 `1,2,3,4,5` 的顺序插入，树会退化成一条向右的链，查找回到 O(n)。AVL 树用**平衡因子**（左子树高 − 右子树高）监控这件事：任何节点的平衡因子绝对值超过 1，就用旋转把高度差拉回来。

旋转改的是三条边，不是节点的值。以右旋为例：`y` 的左孩子 `x` 升上来当根，`y` 变成 `x` 的右孩子，`x` 原来的右子树 `T2` 挂到 `y` 的左边——因为 `T2` 的所有值都在 `x` 和 `y` 之间，位置只能在这里。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;          // 节点存的值
        int height;       // 以该节点为根的子树高度（空树 0，叶子 1）
        TreeNode left;    // 左孩子
        TreeNode right;   // 右孩子

        TreeNode(int val) {
            this.val = val;
            this.height = 1;   // 新建的节点是叶子，高度 1
        }
    }

    // 空节点高度为 0，这是递归的边界
    static int height(TreeNode node) {
        return node == null ? 0 : node.height;
    }

    static int max(int a, int b) {
        return a > b ? a : b;
    }

    // 右旋：左孩子 x 上位，y 变成 x 的右孩子
    static TreeNode rightRotate(TreeNode y) {
        TreeNode x = y.left;       // x 是 y 的左孩子，旋转后当根
        TreeNode t2 = x.right;     // T2 是 x 的右子树，旋转后要挂到 y 左边

        x.right = y;               // 第一步：x 的右孩子改成 y
        y.left = t2;               // 第二步：T2 挂到 y 的左边

        // 先更新 y：y 现在是 x 的孩子，高度依赖 x 的旧高度
        y.height = max(height(y.left), height(y.right)) + 1;
        x.height = max(height(x.left), height(x.right)) + 1;
        return x;                  // x 成为这棵子树的新根
    }

    // 左旋：右孩子 y 上位，x 变成 y 的左孩子
    static TreeNode leftRotate(TreeNode x) {
        TreeNode y = x.right;
        TreeNode t2 = y.left;

        y.left = x;
        x.right = t2;

        x.height = max(height(x.left), height(x.right)) + 1;
        y.height = max(height(y.left), height(y.right)) + 1;
        return y;
    }

    // 平衡因子 = 左高 - 右高；>1 表示左边太重，<-1 表示右边太重
    static int balance(TreeNode node) {
        return node == null ? 0 : height(node.left) - height(node.right);
    }

    // AVL 插入：先按 BST 插到底，再在回溯时修正失衡
    static TreeNode insertAVL(TreeNode node, int val) {
        if (node == null) return new TreeNode(val);   // 插到空位

        // 按 BST 约定决定往左还是往右
        if (val < node.val) {
            node.left = insertAVL(node.left, val);
        } else if (val > node.val) {
            node.right = insertAVL(node.right, val);
        } else {
            return node;   // 重复值不插入，避免破坏 BST 约定
        }

        // 递归返回后，先更新自己的高度
        node.height = 1 + max(height(node.left), height(node.right));
        int bf = balance(node);

        // 左左：左边太高，且新值落在左孩子的左边，一次右旋就够
        if (bf > 1 && val < node.left.val) return rightRotate(node);

        // 右右：对称，一次左旋
        if (bf < -1 && val > node.right.val) return leftRotate(node);

        // 左右：先对左孩子左旋，把它变成左左，再整体右旋
        if (bf > 1 && val > node.left.val) {
            node.left = leftRotate(node.left);
            return rightRotate(node);
        }

        // 右左：对称
        if (bf < -1 && val < node.right.val) {
            node.right = rightRotate(node.right);
            return leftRotate(node);
        }

        return node;   // 没失衡，原样返回
    }

    // 普通 BST 插入，不调整平衡
    static TreeNode insertBST(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);
        if (val < root.val) root.left = insertBST(root.left, val);
        else if (val > root.val) root.right = insertBST(root.right, val);
        return root;
    }

    // 删除：独子直接顶替；两个孩子用右子树最小值（中序后继）顶替
    static TreeNode deleteNode(TreeNode root, int val) {
        if (root == null) return null;

        if (val < root.val) {
            root.left = deleteNode(root.left, val);
        } else if (val > root.val) {
            root.right = deleteNode(root.right, val);
        } else {
            // 情况一：没有左孩子，右孩子（可能为 null）直接顶上来
            if (root.left == null) return root.right;
            // 情况二：没有右孩子，左孩子顶上来
            if (root.right == null) return root.left;

            // 情况三：两个孩子。找右子树最小节点，值复制过来，再删那个节点
            TreeNode successor = root.right;
            while (successor.left != null) successor = successor.left;
            root.val = successor.val;
            root.right = deleteNode(root.right, successor.val);
        }
        return root;
    }

    // 前序：根 → 左 → 右，常用来复制/序列化树
    static void preorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        sb.append(node.val).append(' ');
        preorder(node.left, sb);
        preorder(node.right, sb);
    }

    // 中序：左 → 根 → 右，BST 的中序一定是升序
    static void inorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        inorder(node.left, sb);
        sb.append(node.val).append(' ');
        inorder(node.right, sb);
    }

    // 后序：左 → 右 → 根，先处理孩子再处理自己，适合自底向上统计
    static void postorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        postorder(node.left, sb);
        postorder(node.right, sb);
        sb.append(node.val).append(' ');
    }

    // 层序：用队列按层推进，适合求深度、按层输出
    static void levelOrder(TreeNode root, StringBuilder sb) {
        if (root == null) return;

        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.offerLast(root);   // 第一层：根

        while (!queue.isEmpty()) {
            TreeNode cur = queue.pollFirst();   // 当前层最左边的节点
            sb.append(cur.val).append(' ');

            // 孩子入队，等当前层处理完自然轮到下一层
            if (cur.left != null) queue.offerLast(cur.left);
            if (cur.right != null) queue.offerLast(cur.right);
        }
    }

    public static void main(String[] args) {
        // 依次插入 10、20、30、40、50、25，AVL 会自动调整
        TreeNode avl = null;
        for (int val : new int[]{10, 20, 30, 40, 50, 25}) avl = insertAVL(avl, val);

        StringBuilder sb = new StringBuilder();
        preorder(avl, sb);
        System.out.println("AVL 前序: " + sb);

        sb.setLength(0);   // 清空，复用同一个 StringBuilder
        inorder(avl, sb);
        System.out.println("AVL 中序: " + sb);

        sb.setLength(0);
        postorder(avl, sb);
        System.out.println("AVL 后序: " + sb);

        sb.setLength(0);
        levelOrder(avl, sb);
        System.out.println("AVL 层序: " + sb);

        // BST 删除演示：删掉有两个孩子的 30
        TreeNode bst = null;
        for (int val : new int[]{50, 30, 70, 20, 40, 60, 80}) bst = insertBST(bst, val);
        bst = deleteNode(bst, 30);

        sb.setLength(0);
        inorder(bst, sb);
        System.out.println("BST 删除 30 后中序: " + sb);
    }
}
```

> 递归的深度就是树高，BST 退化成链时递归也会退化成 O(n) 层，机考数据极端时可能栈溢出。JDK 的 `TreeMap` 用红黑树，不平衡度比 AVL 宽松，插入删除的旋转次数更少。

### 字典树（Trie）

Trie 把字符串按字符逐层拆开，公共前缀只存一份。比如 `apple`、`app`、`apply` 共享 `app` 这条路径，查 `app` 时走三步就到，和词库里有多少个词无关。

每个节点要记两个计数：`pass` 表示「有多少个单词经过这里」，`end` 表示「有多少个单词在这里结束」。前者回答「以某前缀开头的词有多少个」，后者回答「这个完整单词出现了几次」。

```java
public class Main {
    static class TrieNode {
        TrieNode[] child = new TrieNode[26];   // 26 条边，对应 a-z
        int pass;   // 经过本节点的单词数（前缀计数）
        int end;    // 在本节点结束的单词数（完整单词计数）
    }

    // 插入一个单词：沿路径往下走，没有边就新建
    static void insert(TrieNode root, String word) {
        TrieNode cur = root;

        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';   // 字符转 0..25 的下标
            if (idx < 0 || idx >= 26) continue;   // 非小写字母直接跳过
            if (cur.child[idx] == null) {
                cur.child[idx] = new TrieNode();   // 公共前缀已存在就复用
            }
            cur = cur.child[idx];
            cur.pass++;   // 每经过一个节点，前缀计数加一
        }
        cur.end++;        // 最后一个节点：完整单词计数加一
    }

    // 完整单词出现次数
    static int search(TrieNode root, String word) {
        TrieNode cur = root;
        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';
            if (idx < 0 || idx >= 26 || cur.child[idx] == null) return 0;
            cur = cur.child[idx];
        }
        return cur.end;   // 只走通前缀不够，还要看有没有词在这结束
    }

    // 以 prefix 开头的单词个数
    static int startsWith(TrieNode root, String prefix) {
        TrieNode cur = root;
        for (int i = 0; i < prefix.length(); i++) {
            int idx = prefix.charAt(i) - 'a';
            if (idx < 0 || idx >= 26 || cur.child[idx] == null) return 0;
            cur = cur.child[idx];
        }
        return cur.pass;
    }

    public static void main(String[] args) {
        TrieNode root = new TrieNode();
        for (String w : new String[]{"apple", "app", "apply", "banana"}) {
            insert(root, w);
        }

        System.out.println("apple 出现 " + search(root, "apple") + " 次");   // 1
        System.out.println("app 出现 " + search(root, "app") + " 次");       // 1
        System.out.println("ap 出现 " + search(root, "ap") + " 次");         // 0，只是前缀
        System.out.println("以 ap 开头的单词有 " + startsWith(root, "ap") + " 个"); // 3
    }
}
```

> `search("ap")` 返回 0、`startsWith("ap")` 返回 3，差别就在 `end` 和 `pass`：前者只数完整单词，后者数经过该前缀的所有单词。

### 图（Graph）

图由顶点和边组成，存法有两种：

- **邻接矩阵** `int[n][n]`：`g[u][v]` 直接判断有没有边，O(1)；但空间 O(n²)，n 到 1e5 就存不下。适合稠密图和 Floyd。
- **邻接表** `List<List<int[]>>`：每个点只存自己的邻居，空间 O(n + m)；判断两点是否相邻要遍历。适合稀疏图。

Java 没有内置图结构，`List<List<int[]>>` 是最顺手的邻接表：外层下标是点，内层每个 `int[]{to, weight}` 是一条边。

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    // 有向边 u -> v，权重 w
    static void addDirected(List<List<int[]>> graph, int from, int to, int weight) {
        graph.get(from).add(new int[]{to, weight});   // int[] 里 [0] 是终点，[1] 是权重
    }

    // 无向边 = 两条方向相反的有向边
    static void addUndirected(List<List<int[]>> graph, int u, int v, int weight) {
        addDirected(graph, u, v, weight);
        addDirected(graph, v, u, weight);
    }

    // 建一个 n 个点的空图：每个点先放一个空邻居表
    static List<List<int[]>> createGraph(int n) {
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        return graph;
    }

    // DFS：一条路走到黑，用递归栈保存「还没走完的分支」
    static void dfs(List<List<int[]>> graph, int u, boolean[] visited, StringBuilder out) {
        visited[u] = true;   // 进入就标记，否则有环时会无限递归
        out.append(u).append(' ');

        for (int[] edge : graph.get(u)) {
            if (!visited[edge[0]]) dfs(graph, edge[0], visited, out);
        }
    }

    // BFS：一层一层扩，队列里存的是待展开的节点
    static void bfs(List<List<int[]>> graph, int start, StringBuilder out) {
        boolean[] visited = new boolean[graph.size()];
        Deque<Integer> queue = new ArrayDeque<>();

        visited[start] = true;   // 起点入队前就标记，避免被重复加入
        queue.offerLast(start);

        while (!queue.isEmpty()) {
            int u = queue.pollFirst();   // 取队头，保证按层展开
            out.append(u).append(' ');

            for (int[] edge : graph.get(u)) {
                if (!visited[edge[0]]) {
                    visited[edge[0]] = true;   // 入队时就标记，不是出队时
                    queue.offerLast(edge[0]);
                }
            }
        }
    }

    static final long INF = Long.MAX_VALUE / 4;   // 除以 4 防止相加溢出

    // Dijkstra：每次从「未确定的点」里取距离最小的，拿它去松弛邻居
    // 正确性依赖边权非负：一旦某个点被取出，它就不可能再被更短的路径更新
    static long[] dijkstra(List<List<int[]>> graph, int src) {
        int n = graph.size();
        long[] dist = new long[n];
        Arrays.fill(dist, INF);   // 先全部当不可达
        dist[src] = 0;            // 起点到自己是 0

        // 堆里存 {当前距离, 点}，按距离升序
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.offer(new long[]{0, src});

        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            int u = (int) cur[1];

            // 懒删除：同一个点可能被压入多次，这次取出的不是最新值就跳过
            if (cur[0] != dist[u]) continue;

            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                long nd = cur[0] + edge[1];   // 松弛：从 u 走到 v 的距离
                if (nd < dist[v]) {           // 找到更短的路才更新并入堆
                    dist[v] = nd;
                    pq.offer(new long[]{nd, v});
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        // 无向图：6 个点，5 条边，连成一棵树
        List<List<int[]>> graph = createGraph(6);
        addUndirected(graph, 0, 1, 1);
        addUndirected(graph, 0, 2, 1);
        addUndirected(graph, 1, 3, 1);
        addUndirected(graph, 2, 4, 1);
        addUndirected(graph, 3, 5, 1);
        addUndirected(graph, 4, 5, 1);

        StringBuilder out = new StringBuilder("DFS: ");
        dfs(graph, 0, new boolean[6], out);
        System.out.println(out);

        out.setLength(0);
        bfs(graph, 0, out);
        System.out.println("BFS: " + out);

        // 有向带权图：5 个点，演示最短路
        List<List<int[]>> weighted = createGraph(5);
        addDirected(weighted, 0, 1, 4);
        addDirected(weighted, 0, 2, 1);
        addDirected(weighted, 2, 1, 2);
        addDirected(weighted, 1, 3, 1);
        addDirected(weighted, 2, 3, 5);
        addDirected(weighted, 3, 4, 3);

        long[] dist = dijkstra(weighted, 0);
        for (int i = 0; i < dist.length; i++) {
            System.out.println(i + ": " + (dist[i] >= INF ? "不可达" : dist[i]));
        }
    }
}
```

> Dijkstra 不能处理负权边：负边会让「已经确定的点」还能被更短的路径更新，而算法此时已经不再看它。负权用 Bellman-Ford / SPFA。

#### 拓扑排序（Kahn）

拓扑排序回答的是「这些有依赖的任务，按什么顺序做」。把依赖看成有向边 `u → v`（u 必须在 v 前面），做法是反复取出**入度为 0** 的点，取走时把它所有出边的入度减一。

有环时，环上的点入度永远降不到 0，最后出队数量小于 n。所以判断有没有环，看数量而不是看队列空没空。

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    // 返回拓扑序；有环时返回 null
    static List<Integer> topoSort(int n, List<List<Integer>> graph) {
        int[] indegree = new int[n];   // 入度 = 前面还有几件事没做

        // 遍历每条边 u -> v，给 v 的入度加一
        for (List<Integer> next : graph) {
            for (int v : next) indegree[v]++;
        }

        // 所有入度 0 的点先入队：它们没有前置依赖
        Deque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) queue.offerLast(i);
        }

        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int u = queue.pollFirst();   // 取出一件可以做的事
            order.add(u);

            // 把它从依赖图里删掉：每个后继的入度减一
            for (int v : graph.get(u)) {
                if (--indegree[v] == 0) queue.offerLast(v);   // 依赖刚好清空
            }
        }

        // 出队数量 == n 才是 DAG；否则剩下的点都在环上
        return order.size() == n ? order : null;
    }

    public static void main(String[] args) {
        int n = 6;
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());

        // 5 -> 2,0；4 -> 0,1；2 -> 3；3 -> 1
        graph.get(5).add(2);
        graph.get(5).add(0);
        graph.get(4).add(0);
        graph.get(4).add(1);
        graph.get(2).add(3);
        graph.get(3).add(1);

        List<Integer> order = topoSort(n, graph);
        System.out.println(order == null ? "图中有环" : "拓扑序: " + order);
    }
}
```

> 拓扑序不唯一：同时有多个入度 0 的点时，先取哪个都对。题目要求字典序最小就把队列换成 `PriorityQueue`。

#### 最小生成树（Kruskal）

最小生成树是「用 n-1 条边把所有点连起来，边权和最小」。Kruskal 的思路很直接：**把所有边按权排序，从小到大试，只要这条边不会成环就留下**。

判断「会不会成环」正是并查集的活：两个端点已经在同一个集合里，加这条边就会形成环。

```java
import java.util.Arrays;

public class Main {
    // 一条边：起点、终点、权重
    static class Edge {
        int u;
        int v;
        int w;

        Edge(int u, int v, int w) {
            this.u = u;
            this.v = v;
            this.w = w;
        }
    }

    // 并查集的查根 + 路径减半
    static int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // 挂到爷爷下面，压低树高
            x = parent[x];
        }
        return x;
    }

    // 图不连通时返回 -1
    static long kruskal(int n, Edge[] edges) {
        // 按边权升序：贪心每次都试当前最小的边
        Arrays.sort(edges, (a, b) -> Integer.compare(a.w, b.w));

        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;   // 初始各成一棵树

        long total = 0;   // 已选边权和
        int used = 0;     // 已选边数

        for (Edge edge : edges) {
            int ru = find(parent, edge.u);
            int rv = find(parent, edge.v);
            if (ru == rv) continue;   // 同集合，加了会成环

            parent[ru] = rv;          // 合并两个集合
            total += edge.w;
            used++;

            if (used == n - 1) break; // n-1 条边已经连通所有点
        }
        return used == n - 1 ? total : -1;
    }

    public static void main(String[] args) {
        Edge[] edges = {
                new Edge(0, 1, 4), new Edge(0, 2, 1), new Edge(2, 1, 2),
                new Edge(1, 3, 1), new Edge(2, 3, 5), new Edge(3, 4, 3)
        };

        long mst = kruskal(5, edges);
        System.out.println(mst < 0 ? "图不连通" : "最小生成树边权和 = " + mst);
    }
}
```

> 排序后只需要扫一遍边，O(m log m) 都花在排序上。Prim 适合稠密图，Kruskal 适合「边已经给成列表」的输入。

#### Floyd（多源最短路）

Floyd 求的是任意两点之间的最短路。它的本质是动态规划：`dist[i][j]` 先表示「只允许经过前 k 个点中转」的最短距离，每轮把第 k 个点加进允许集合。

三重循环里 **k 必须在最外层**：第 k 轮只允许经过 0..k 这些点，`dist[i][j]` 的更新才不会用到「未来的中转点」。

```java
public class Main {
    // 用有限大数当 INF：两个 INF 相加不会溢出成负数
    static final int INF = 1_000_000_000;

    static void floyd(int[][] dist) {
        int n = dist.length;

        for (int k = 0; k < n; k++) {              // 中转点放最外层
            for (int i = 0; i < n; i++) {
                if (dist[i][k] == INF) continue;   // i 到不了 k，整行跳过
                for (int j = 0; j < n; j++) {
                    if (dist[k][j] == INF) continue;
                    int through = dist[i][k] + dist[k][j];   // 经过 k 中转
                    if (through < dist[i][j]) dist[i][j] = through;
                }
            }
        }
    }

    public static void main(String[] args) {
        int n = 4;
        int[][] dist = new int[n][n];

        // 初始化：自己到自己 0，其余先当不可达
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                dist[i][j] = (i == j) ? 0 : INF;
            }
        }

        // 直接相连的边
        dist[0][1] = 5;
        dist[0][2] = 9;
        dist[1][2] = 2;
        dist[2][3] = 1;
        dist[1][3] = 8;

        floyd(dist);

        for (int[] row : dist) {
            StringBuilder sb = new StringBuilder();
            for (int x : row) sb.append(x == INF ? "inf" : x).append('\t');
            System.out.println(sb);
        }
    }
}
```

> 用 `1_000_000_000` 而不是 `Integer.MAX_VALUE` 当 INF：两个 INF 相加会溢出成负数，`dist[i][k] == INF` 的判断只要漏一处就会算出负权最短路。
## 四、算法

这一章按「先讲这个算法在保证什么，再给模板」来组织。算法题里最容易出的错不是写不出代码，而是**用错场景**：在不能二分的数组上二分、在负权图上跑 Dijkstra、在贪心不成立的题上贪心。每节开头那句「它在保证什么」，就是用来判断能不能用的。

### 排序：比较模型、稳定性和下界

基于比较的排序有一个理论下界：n 个元素有 n! 种排列，每次比较只能得到「大于/小于」两种结果，所以至少要 log₂(n!) ≈ n log n 次比较。快排、归并、堆排都贴着这个下界，差别在**稳定性**和**额外空间**。

- **稳定**：相等元素的相对顺序不变。归并和 TimSort 稳定，快排和堆排不稳定。
- **原地**：快排和堆排 O(1) 额外空间；归并需要 O(n) 临时数组。

JDK 的选择是：`Arrays.sort(int[])` 用双轴快排（不稳定但快），`Arrays.sort(Object[])` 用 TimSort（稳定，因为对象比较可能有业务含义）。

```java
import java.util.Arrays;

public class Main {
    // 交换数组里的两个位置
    static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    // 快排：pivot 取末尾，把「小于 pivot」的都换到左边
    static void quickSort(int[] a, int left, int right) {
        if (left >= right) return;   // 空区间或单元素已经有序

        int pivot = a[right];        // 选末尾元素当基准
        int i = left - 1;            // i 是「已确认小于 pivot」区域的右边界

        for (int j = left; j < right; j++) {
            // 找到一个比 pivot 小的，就把它换到左区
            if (a[j] < pivot) swap(a, ++i, j);
        }

        swap(a, ++i, right);         // pivot 换到分界点，位置确定
        quickSort(a, left, i - 1);   // 左半段继续
        quickSort(a, i + 1, right);  // 右半段继续
    }

    // 归并：先递归排好左右两半，再合并两个有序段
    static void mergeSort(int[] a, int left, int right, int[] temp) {
        if (left >= right) return;   // 单元素天然有序

        // 防溢出写法：left + right 可能超过 int 上限
        int mid = left + (right - left) / 2;
        mergeSort(a, left, mid, temp);
        mergeSort(a, mid + 1, right, temp);

        int i = left;       // 左段指针
        int j = mid + 1;    // 右段指针
        int k = left;       // 临时数组写入位置

        // 两边都有剩时，取较小的那个；<= 保证左边先出，排序稳定
        while (i <= mid && j <= right) {
            temp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        }
        // 左边剩下的直接接上
        while (i <= mid) temp[k++] = a[i++];
        // 右边剩下的直接接上
        while (j <= right) temp[k++] = a[j++];

        // 合并结果写回原数组，上一层才能继续用
        for (int t = left; t <= right; t++) a[t] = temp[t];
    }

    // 下沉：让下标 i 的节点在 [0, n) 的范围里沉到合适位置
    static void heapify(int[] a, int n, int i) {
        while (true) {
            int largest = i;          // 假设自己是最大的
            int left = 2 * i + 1;     // 左孩子
            int right = left + 1;     // 右孩子

            if (left < n && a[left] > a[largest]) largest = left;
            if (right < n && a[right] > a[largest]) largest = right;
            if (largest == i) break;  // 已经比两个孩子都大，停

            swap(a, i, largest);
            i = largest;              // 继续往下沉
        }
    }

    // 堆排：先建大顶堆，再反复把堆顶换到末尾
    static void heapSort(int[] a) {
        int n = a.length;

        // 从最后一个非叶节点往前下沉，整体 O(n)
        for (int i = n / 2 - 1; i >= 0; i--) heapify(a, n, i);

        for (int i = n - 1; i > 0; i--) {
            swap(a, 0, i);      // 当前最大值归位到末尾
            heapify(a, i, 0);   // 剩下的范围重建堆
        }
    }

    public static void main(String[] args) {
        int[] base = {64, 34, 25, 12, 22, 11, 90};

        // clone 复制一份，保证每种排序拿到的是同一份乱序数据
        int[] a = base.clone();
        Arrays.sort(a);
        System.out.println("Arrays.sort " + Arrays.toString(a));

        a = base.clone();
        quickSort(a, 0, a.length - 1);
        System.out.println("快排        " + Arrays.toString(a));

        a = base.clone();
        mergeSort(a, 0, a.length - 1, new int[a.length]);
        System.out.println("归并        " + Arrays.toString(a));

        a = base.clone();
        heapSort(a);
        System.out.println("堆排        " + Arrays.toString(a));
    }
}
```

> 快排选末尾元素当 pivot，遇到已经有序的数据会退化成 O(n²)（每轮只分出一个）。机考数据可能有序时，直接用 `Arrays.sort`。

### 二分查找与二分答案

二分的本质不是「排好序的数组」，而是**一个单调的判定**：存在一个分界点，左边全 false、右边全 true（或反过来）。数组有序只是最常见的特例。

写好二分只需要守住一个不变量：**答案一定在 `[left, right]` 里**。两种模板对应两种区间约定：

- `[left, right]` 闭区间：`while (left <= right)`，排除 mid 后写 `left = mid + 1` / `right = mid - 1`；
- `[left, right)` 左闭右开：`while (left < right)`，排除 mid 后写 `left = mid + 1` / `right = mid`。

两套混用就会死循环或漏掉边界。

```java
public class Main {
    // 精确查找：闭区间模板
    static int binarySearch(int[] a, int target) {
        int left = 0;
        int right = a.length - 1;   // 闭区间，right 是能取到的下标

        while (left <= right) {     // 区间为空时 left > right
            int mid = left + (right - left) / 2;   // 防溢出
            if (a[mid] == target) return mid;       // 找到直接返回
            if (a[mid] < target) left = mid + 1;    // 答案在右半
            else right = mid - 1;                   // 答案在左半
        }
        return -1;
    }

    // 第一个 >= target：左闭右开，right 可能就是答案
    static int lowerBound(int[] a, int target) {
        int left = 0;
        int right = a.length;   // 左闭右开，right 取不到

        while (left < right) {
            int mid = left + (right - left) / 2;
            if (a[mid] < target) left = mid + 1;   // mid 不可能是答案
            else right = mid;                      // mid 可能就是答案，保留
        }
        return left;   // 循环结束时 left == right，就是第一个 >= target 的位置
    }

    // 第一个 > target
    static int upperBound(int[] a, int target) {
        int left = 0;
        int right = a.length;

        while (left < right) {
            int mid = left + (right - left) / 2;
            if (a[mid] <= target) left = mid + 1;  // 等于也要往右走
            else right = mid;
        }
        return left;
    }

    // 二分答案的判定函数：limit 越大越容易满足，这是单调性
    static boolean canSplit(int[] a, int k, long limit) {
        int parts = 1;   // 至少一段
        long sum = 0;    // 当前段的和

        for (int x : a) {
            if (x > limit) return false;   // 单个就装不下，这个 limit 一定不行
            if (sum + x > limit) {
                parts++;       // 放不下，开新的一段
                sum = x;       // 新段从 x 开始
            } else {
                sum += x;      // 还能放，继续累加
            }
        }
        return parts <= k;
    }

    // 把数组切成 k 段，让最大段和尽量小
    static long minMaxSplit(int[] a, int k) {
        long sum = 0;
        int max = 0;
        for (int x : a) {
            sum += x;
            max = Math.max(max, x);   // 下界至少是最大单元素
        }

        long left = max;    // 答案不可能小于最大单元素
        long right = sum;   // 答案不可能大于总和（只切一段）

        while (left < right) {
            long mid = left + (right - left) / 2;
            if (canSplit(a, k, mid)) right = mid;   // 可行，试着更小
            else left = mid + 1;                    // 不可行，必须更大
        }
        return left;
    }

    public static void main(String[] args) {
        int[] a = {10, 20, 30, 40, 50, 60, 70, 80, 90};
        System.out.println(binarySearch(a, 50));       // 4
        System.out.println(binarySearch(a, 55));       // -1
        System.out.println(lowerBound(a, 50) + " " + upperBound(a, 50));   // 4 5

        int[] nums = {7, 2, 5, 10, 8};
        System.out.println("分 2 段的最小最大和: " + minMaxSplit(nums, 2));  // 18
    }
}
```

> `mid = (left + right) / 2` 在 `left`、`right` 都接近 `Integer.MAX_VALUE` 时会溢出成负数；写成 `left + (right - left) / 2` 永远安全。

### 双指针与滑动窗口

双指针能把 O(n²) 降到 O(n)，靠的是**单调性**：左指针和右指针都只朝一个方向走，各自最多走 n 步。如果指针会来回移动，这个账就不成立。

滑动窗口是双指针的特例，维护一个区间 `[left, right]` 和区间内的某种状态（和、计数、字符频次）。窗口扩张时更新状态，不满足条件时收缩左边界。

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

public class Main {
    // 有序数组两数之和：和偏小就左指针右移，偏大就右指针左移
    static int[] twoSumSorted(int[] a, int target) {
        int i = 0;                  // 左指针
        int j = a.length - 1;       // 右指针

        while (i < j) {
            int sum = a[i] + a[j];

            if (sum == target) return new int[]{i, j};

            // 和太小，只能让左指针往右（更大的数）
            if (sum < target) i++;
            // 和太大，只能让右指针往左（更小的数）
            else j--;
        }
        return null;   // 没有任何一对
    }

    // 最长无重复子串
    static int longestUnique(String s) {
        int[] last = new int[128];   // last[c] = 字符 c 上次出现的下标
        Arrays.fill(last, -1);       // -1 表示还没出现过

        int best = 0;    // 目前找到的最长长度
        int left = 0;    // 窗口左边界

        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);

            // 上次出现在窗口内，左边界必须跳到它右边；
            // 和当前 left 取 max，防止 left 倒退
            if (last[c] >= left) left = last[c] + 1;

            last[c] = right;                          // 更新字符位置
            best = Math.max(best, right - left + 1);  // 窗口长度
        }
        return best;
    }

    // 定长窗口最大值：单调队列存下标，值从队首到队尾递减
    static int[] windowMax(int[] a, int k) {
        int n = a.length;
        int[] result = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();   // 存下标，不是值

        for (int i = 0; i < n; i++) {
            // 新元素更大，队尾那些永远不可能成为最大值了，弹出
            while (!deque.isEmpty() && a[deque.peekLast()] <= a[i]) {
                deque.pollLast();
            }
            deque.offerLast(i);

            // 队首已经滑出窗口（下标 <= i - k）
            if (deque.peekFirst() <= i - k) deque.pollFirst();

            // 窗口第一次填满之后才开始记录
            if (i >= k - 1) result[i - k + 1] = a[deque.peekFirst()];
        }
        return result;
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 5, 7, 9, 11};
        System.out.println(Arrays.toString(twoSumSorted(a, 12)));   // [0, 5]

        System.out.println(longestUnique("abcbbad"));               // 3

        int[] b = {1, 3, -1, -3, 5, 3, 6, 7};
        System.out.println(Arrays.toString(windowMax(b, 3)));       // [3, 3, 5, 5, 6, 7]
    }
}
```

> 滑动窗口的 `left` 只能往右走。写成 `left = last[c] + 1` 却不和当前 `left` 取 max，遇到 `"abba"` 这种回头的字符会让窗口左边界倒退，答案偏大。

### 前缀和与差分

这两个技巧互为逆运算：

- **前缀和**：预处理一次，之后任意区间求和 O(1)。适合「多次查询区间和」。
- **差分**：预处理一次，之后任意区间整体加值 O(1)，最后求一遍前缀和还原。适合「多次区间修改，最后统一输出」。

```java
public class Main {
    // prefix[i] = 前 i 个元素的和，prefix[0] = 0 让区间公式不用特判
    static long[] prefixSum(int[] a) {
        long[] prefix = new long[a.length + 1];

        for (int i = 0; i < a.length; i++) {
            // 递推：前 i+1 个的和 = 前 i 个的和 + 第 i 个元素
            prefix[i + 1] = prefix[i] + a[i];
        }
        return prefix;
    }

    // 闭区间 [l, r] 的和
    static long rangeSum(long[] prefix, int l, int r) {
        // 前缀和是「前 r+1 个」减「前 l 个」
        return prefix[r + 1] - prefix[l];
    }

    // 差分：区间 [l, r] 整体加 v，只需要改两个位置
    static void rangeAdd(long[] diff, int l, int r, long v) {
        diff[l] += v;                 // 从 l 开始生效
        if (r + 1 < diff.length) {
            diff[r + 1] -= v;         // 到 r+1 抵消掉
        }
    }

    // 求前缀和，把差分还原成每个位置的实际增量
    static long[] restore(long[] diff) {
        long[] a = new long[diff.length];
        long cur = 0;

        for (int i = 0; i < diff.length; i++) {
            cur += diff[i];   // 累计增量
            a[i] = cur;
        }
        return a;
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3, 4, 5};

        long[] prefix = prefixSum(nums);
        System.out.println("下标 1~3 的和 = " + rangeSum(prefix, 1, 3));   // 9

        long[] diff = new long[nums.length];
        rangeAdd(diff, 0, 2, 10);   // [0,2] 各加 10
        rangeAdd(diff, 1, 4, 1);    // [1,4] 各加 1

        System.out.println(java.util.Arrays.toString(restore(diff)));   // [10, 11, 11, 1, 1]
    }
}
```

> 差分数组长度要和原数组一样。`r + 1 == n` 时那一项越界，判掉不影响结果——后面没有元素需要减回来。

### 递归与回溯

递归把问题拆成「同类的更小问题」，函数调用栈自动保存每一层的局部变量和返回地址。回溯是在递归之上加**撤销**：在决策树上走一条路径，做出选择、递归、再撤销，回到分叉点试下一个选择。

路径 `path` 是所有递归层共享的同一个对象，所以递归返回前必须把这一步加进去的元素删掉；最后一层要 `new ArrayList<>(path)` 拷贝一份，否则所有结果都指向同一个空列表。

```java
import java.util.ArrayList;
import java.util.List;

public class Main {
    // 子集：每个元素「选 / 不选」，决策树有 2^n 个叶子
    static void subsets(int[] nums, int idx, List<Integer> path, List<List<Integer>> result) {
        if (idx == nums.length) {
            // 必须拷贝：path 是共享对象，直接 add 会让所有结果指向它
            result.add(new ArrayList<>(path));
            return;
        }

        // 分支一：不选 nums[idx]
        subsets(nums, idx + 1, path, result);

        // 分支二：选 nums[idx]
        path.add(nums[idx]);
        subsets(nums, idx + 1, path, result);
        path.remove(path.size() - 1);   // 撤销，保证回到进入前的状态
    }

    // 全排列：把第 depth 位和后面每个位置交换，相当于「谁来坐这个位置」
    static void permute(int[] nums, int depth, List<List<Integer>> result) {
        if (depth == nums.length) {
            List<Integer> one = new ArrayList<>();
            for (int x : nums) one.add(x);   // 把当前数组状态拷成一份结果
            result.add(one);
            return;
        }

        for (int i = depth; i < nums.length; i++) {
            swap(nums, depth, i);              // 选 i 放到当前位
            permute(nums, depth + 1, result);  // 递归填下一位
            swap(nums, depth, i);              // 撤销交换
        }
    }

    static int queenCount = 0;

    // N 皇后：列 + 两条对角线各一个标记数组
    static void nQueens(int row, int n, boolean[] cols, boolean[] diag1, boolean[] diag2) {
        if (row == n) {
            queenCount++;   // 每一行都放好了，得到一组解
            return;
        }

        for (int c = 0; c < n; c++) {
            // 主对角线用 row - c + n 保证下标非负；副对角线用 row + c
            if (cols[c] || diag1[row + c] || diag2[row - c + n]) continue;

            // 做选择：标记这一列和两条对角线
            cols[c] = diag1[row + c] = diag2[row - c + n] = true;
            nQueens(row + 1, n, cols, diag1, diag2);
            // 撤销，试下一列
            cols[c] = diag1[row + c] = diag2[row - c + n] = false;
        }
    }

    static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};

        List<List<Integer>> allSubsets = new ArrayList<>();
        subsets(nums, 0, new ArrayList<>(), allSubsets);
        System.out.println("子集个数: " + allSubsets.size());   // 8
        System.out.println(allSubsets);

        List<List<Integer>> allPerms = new ArrayList<>();
        permute(nums, 0, allPerms);
        System.out.println("排列个数: " + allPerms.size());     // 6

        int n = 6;
        nQueens(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]);
        System.out.println(n + " 皇后共有 " + queenCount + " 组解");   // 4
    }
}
```

> 撤销写在递归调用的**后面**，而且要和「做选择」严格对称。漏掉一次 `path.remove`，后面所有分支都会带着多余元素往下走。

### 贪心

贪心每一步都选当前看起来最好的，并且**不回头**。它成立需要证明：通常用交换论证——假设最优解第一步不是贪心选的那个，把它换成贪心选择后答案不会变差。

证不出来的时候，贪心很可能就是错的。经典反例是硬币找零：面值 `{1, 3, 4}`、目标 6，贪心选 4+1+1（3 枚），最优是 3+3（2 枚）。

```java
import java.util.Arrays;

public class Main {
    static class Interval {
        int left;
        int right;

        Interval(int left, int right) {
            this.left = left;
            this.right = right;
        }
    }

    // 区间调度：按右端点升序，最早结束的留给后面的时间最多
    static int maxNonOverlap(Interval[] intervals) {
        if (intervals.length == 0) return 0;

        // 按右端点排序：这是贪心选择的关键
        Arrays.sort(intervals, (a, b) -> Integer.compare(a.right, b.right));

        int count = 1;                      // 第一个区间一定选
        int end = intervals[0].right;       // 上一个选中区间的结束时间

        for (int i = 1; i < intervals.length; i++) {
            // 开始时间不早于上一个的结束，才算不重叠
            if (intervals[i].left >= end) {
                count++;
                end = intervals[i].right;   // 更新结束时间
            }
        }
        return count;
    }

    // 跳跃游戏：reach 是当前能到达的最远下标，遍历时不断更新
    static boolean canJump(int[] a) {
        int reach = 0;

        // i <= reach 保证只走「能到达的位置」
        for (int i = 0; i < a.length && i <= reach; i++) {
            reach = Math.max(reach, i + a[i]);
            if (reach >= a.length - 1) return true;
        }
        return reach >= a.length - 1;
    }

    public static void main(String[] args) {
        Interval[] intervals = {
                new Interval(1, 3), new Interval(2, 5), new Interval(3, 6),
                new Interval(5, 7), new Interval(6, 9)
        };
        System.out.println("最多能参加的场次: " + maxNonOverlap(intervals));   // 3
        System.out.println("能否到达终点: " + canJump(new int[]{2, 3, 1, 1, 4})); // true
    }
}
```

> 贪心题先找反例：如果能构造出「局部最优不是全局最优」的例子，就说明这题需要 DP 或搜索。

### 动态规划

DP 适用于两个条件同时成立的问题：**最优子结构**（大问题的最优解由小问题的最优解拼出来）和**重叠子问题**（同样的子问题会被反复用到）。它把递归的重复计算换成一张表，用空间换时间。

写 DP 固定四步：

1. **定义状态**：`dp[i][c]` 到底表示什么，必须能用一句话说清；
2. **写转移**：当前状态从哪些旧状态来；
3. **定初值**：空集、容量 0、长度为 0 时答案是什么；
4. **定顺序**：保证用到的旧状态已经算过（01 背包倒序、完全背包正序就是这个原因）。

```java
import java.util.Arrays;

public class Main {
    // 01 背包：每件最多一次
    static int knapsack01(int[] weight, int[] value, int cap) {
        int[] dp = new int[cap + 1];   // dp[c] = 容量 c 时的最大价值

        for (int i = 0; i < weight.length; i++) {          // 逐件考虑
            for (int c = cap; c >= weight[i]; c--) {       // 容量倒序！
                // 不放：dp[c]；放：dp[c-w] + v
                dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);
            }
        }
        return dp[cap];
    }

    // 完全背包：每件无限次
    static int knapsackComplete(int[] weight, int[] value, int cap) {
        int[] dp = new int[cap + 1];

        for (int i = 0; i < weight.length; i++) {
            for (int c = weight[i]; c <= cap; c++) {       // 容量正序！
                // 正序时 dp[c-w] 可能已经放过本件，所以同一件可以重复放
                dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);
            }
        }
        return dp[cap];
    }

    // LIS：tails[len-1] 是长度为 len 的上升子序列的最小结尾
    static int lis(int[] a) {
        int[] tails = new int[a.length];
        int len = 0;   // 当前最长长度

        for (int x : a) {
            // 在 tails[0..len) 里找第一个 >= x 的位置
            int left = 0, right = len;
            while (left < right) {
                int mid = left + (right - left) / 2;
                if (tails[mid] < x) left = mid + 1;
                else right = mid;
            }

            tails[left] = x;        // 用更小的结尾替换，后面更容易接
            if (left == len) len++; // 接在最末尾，长度加一
        }
        return len;
    }

    // LCS：滚动数组，prev 是上一行，cur 是当前行
    static int lcs(String a, String b) {
        int lb = b.length();
        int[] prev = new int[lb + 1];
        int[] cur = new int[lb + 1];

        for (int i = 1; i <= a.length(); i++) {
            cur[0] = 0;   // 空串和任何前缀的 LCS 都是 0

            for (int j = 1; j <= lb; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    cur[j] = prev[j - 1] + 1;   // 这个字符可以配对
                } else {
                    // 否则丢掉 a 的最后一个或 b 的最后一个
                    cur[j] = Math.max(prev[j], cur[j - 1]);
                }
            }

            // 滚动：当前行变成下一轮的上一行
            int[] t = prev;
            prev = cur;
            cur = t;
        }
        return prev[lb];
    }

    // 编辑距离：插入 / 删除 / 替换
    static int editDistance(String a, String b) {
        int lb = b.length();
        int[] prev = new int[lb + 1];
        int[] cur = new int[lb + 1];

        // a 为空：只能逐个插入，代价是 b 的长度
        for (int j = 0; j <= lb; j++) prev[j] = j;

        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;   // b 为空：只能逐个删除

            for (int j = 1; j <= lb; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    cur[j] = prev[j - 1];   // 字符相同，不用操作
                } else {
                    // 替换、删除、插入三种操作取最小，再加一
                    cur[j] = Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1])) + 1;
                }
            }

            int[] t = prev;
            prev = cur;
            cur = t;
        }
        return prev[lb];
    }

    public static void main(String[] args) {
        int[] weight = {2, 3, 4, 5};
        int[] value = {3, 4, 5, 6};

        System.out.println("01 背包: " + knapsack01(weight, value, 8));       // 10
        System.out.println("完全背包: " + knapsackComplete(weight, value, 8)); // 12
        System.out.println("LIS: " + lis(new int[]{10, 9, 2, 5, 3, 7, 101, 18})); // 4
        System.out.println("LCS: " + lcs("ABCBDAB", "BDCABA"));               // 4
        System.out.println("编辑距离: " + editDistance("horse", "ros"));      // 3
        System.out.println("dp 数组清零: " + Arrays.toString(new int[3]));
    }
}
```

> 01 背包容量必须倒序：正序时 `dp[c - w[i]]` 可能刚被本件物品更新过，同一件会被重复放入，直接变成完全背包。完全背包反过来必须正序。

### 字符串算法

`String.indexOf` 已经是优化过的子串查找，但它只返回第一个位置。要输出所有匹配（尤其是重叠匹配）时，需要 KMP。

KMP 的核心是一张 `lps` 表：`lps[i]` 表示 `pat[0..i]` 的**最长相等前后缀**长度。匹配失败时，已经匹配上的那一段前缀里，有一部分可以复用为后缀，于是模式串指针不用回到 0，直接跳到 `lps[j-1]`。这就是它比 BF 快的原因。

```java
import java.util.ArrayList;
import java.util.List;

public class Main {
    // lps[i] = pat[0..i] 的最长相等前后缀长度
    static int[] buildLps(String pat) {
        int m = pat.length();
        int[] lps = new int[m];
        int len = 0;   // 当前已匹配的前缀长度

        for (int i = 1; i < m; ) {
            if (pat.charAt(i) == pat.charAt(len)) {
                // 前后缀又能延长一位
                lps[i++] = ++len;
            } else if (len > 0) {
                // 匹配不上，退回更短的前缀继续试
                len = lps[len - 1];
            } else {
                // 退到 0 还不行，这个位置就是 0
                lps[i++] = 0;
            }
        }
        return lps;
    }

    // 返回所有匹配起点（允许重叠）
    static List<Integer> kmpAll(String pat, String txt) {
        List<Integer> positions = new ArrayList<>();
        int m = pat.length(), n = txt.length();
        if (m == 0 || m > n) return positions;

        int[] lps = buildLps(pat);
        int i = 0;   // 文本指针
        int j = 0;   // 模式串指针

        while (i < n) {
            if (txt.charAt(i) == pat.charAt(j)) {
                i++;
                j++;
            }

            if (j == m) {
                positions.add(i - j);   // 找到一次
                j = lps[j - 1];         // 继续找下一个，不回到 0
            } else if (i < n && txt.charAt(i) != pat.charAt(j)) {
                // 失配：模式串跳回最长相等前后缀的位置
                if (j != 0) j = lps[j - 1];
                else i++;               // 模式串第一个字符就失配，文本往前走
            }
        }
        return positions;
    }

    // 字符串哈希：把子串映射成整数，滚动更新一次 O(1)
    static int hashCount(String pat, String txt) {
        int m = pat.length(), n = txt.length();
        if (m == 0 || m > n) return 0;

        long ph = 0;      // 模式串哈希
        long th = 0;      // 当前窗口哈希
        long power = 1;   // 131^m，用来去掉最左字符

        // 预处理第一个窗口
        for (int i = 0; i < m; i++) {
            ph = ph * 131 + pat.charAt(i);
            th = th * 131 + txt.charAt(i);
            power *= 131;
        }

        int count = th == ph ? 1 : 0;

        for (int i = m; i < n; i++) {
            // 去掉最左字符、乘上基数、加上新字符，窗口右移一位
            th = th * 131 + txt.charAt(i) - power * txt.charAt(i - m);
            if (th == ph) count++;
        }
        return count;
    }

    public static void main(String[] args) {
        String txt = "ABABDABACDABABCABAB";
        String pat = "ABABCABAB";

        System.out.println("indexOf: " + txt.indexOf(pat));          // 10
        System.out.println("KMP 匹配: " + kmpAll(pat, txt));         // [10]
        System.out.println("哈希匹配 AB 的次数: " + hashCount("AB", txt));   // 7
    }
}
```

> KMP 找到一次匹配后写 `j = lps[j-1]` 而不是 `j = 0`，这样重叠的匹配（`"aa"` 在 `"aaa"` 里出现 2 次）才数得全。哈希用 `long` 溢出相当于 mod 2^64，理论上有极小概率撞键，要求绝对正确时用 KMP。

## 五、复杂度与选择速查

### 复杂度在说什么

O(n) 描述的是**输入规模变大时，耗时的增长趋势**，不是具体秒数。同一个 O(n) 的循环，`int` 数组和 `List<Integer>` 的常数能差十倍；同样是 O(n log n)，`Arrays.sort` 比手写快排快，因为它的常数更小。

所以选算法先看数据范围，再看常数：

| n 的量级 | 能用的复杂度 | 典型做法 |
|---|---|---|
| ≤ 10 | O(n!) | 全排列、暴力搜索 |
| ≤ 20 | O(2ⁿ) | 子集枚举、状态压缩 DP |
| ≤ 100 | O(n³) | Floyd、区间 DP |
| ≤ 1000 | O(n²) | 01 背包、LCS、朴素 Dijkstra |
| ≤ 1e5 | O(n log n) | 排序、二分、堆、Kruskal |
| ≤ 1e6 | O(n) | 前缀和、双指针、单调栈、哈希 |
| ≤ 1e8 | O(n)，常数要小 | 单层循环、位运算；Java 要避开装箱 |

### 集合操作复杂度

| 结构 | 随机访问 | 插入/删除 | 查找 | 备注 |
|---|---|---|---|---|
| `int[]` | O(1) | — | O(n) | 最省内存，1e6 以上首选 |
| `ArrayList` | O(1) | 尾部均摊 O(1)，中间 O(n) | O(n) | 随机访问快 |
| `LinkedList` | O(n) | 头尾 O(1)，中间要定位 O(n) | O(n) | 实际很少用，`ArrayDeque` 更快 |
| `ArrayDeque` | — | 两端 O(1) | O(n) | 栈和队列都用它 |
| `HashMap` | — | 均摊 O(1) | 均摊 O(1) | 无序 |
| `LinkedHashMap` | — | 均摊 O(1) | 均摊 O(1) | 按插入顺序遍历 |
| `TreeMap` / `TreeSet` | — | O(log n) | O(log n) | 按 key 有序，可 `firstKey/floorKey` |
| `PriorityQueue` | 仅堆顶 O(1) | O(log n) | — | 只能取最值，遍历无序 |
| `HashSet` | — | 均摊 O(1) | 均摊 O(1) | 去重 |

> `List<Integer>`、`Map<Integer, Integer>` 里每个元素都是**装箱对象**，1e6 规模下内存和耗时都比 `int[]` 高一个量级。数据量大时优先用数组，别为了写法漂亮把 `int[]` 换成 `List<Integer>`。
