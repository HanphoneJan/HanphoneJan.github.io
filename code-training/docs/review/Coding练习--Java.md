---
title: Coding练习--Java
category: 参考手册
last_updated: 2026-11-19
---
# Coding练习--Java

> 机考与笔试用的 Java 模板合集：**输入输出**、**容器 API**、**数据结构**、**常见算法**各一份能直接抄的写法。
>
> 每块都是完整程序（`public class Main`），可以直接粘进 OJ；交付前 `pnpm check:java` 会逐块 `javac` 并运行。深讲在[Java 基础](/docs/后端/Java基础.html)与[数据结构](/code-training/data-structures/linked_list.html)两个板块，这里只留「干嘛用、多复杂、坑在哪」。
>
> 语法按 **JDK 8** 写：不用 `var`、`record`、`List.of`，牛客/华为机考等评测机基本都在这条线上。

## 零、Java 在 OJ 上的易错点速查

| 写法 | 会出什么事 | 正确做法 |
|---|---|---|
| `Integer a = 128, b = 128; a == b` | 结果是 `false`：只有 -128~127 走缓存 | `a.equals(b)` 或先 `intValue()` |
| `s == "abc"` 比较字符串 | 比的是引用地址，运行时对错随机 | `"abc".equals(s)` |
| `Arrays.asList(a).add(x)` | 返回的是定长视图，直接抛 `UnsupportedOperationException` | `new ArrayList<>(Arrays.asList(a))` |
| `list.remove(1)`（`List<Integer>`） | 删的是下标 1，不是值为 1 的元素 | `list.remove(Integer.valueOf(1))` |
| `Arrays.sort(int[], comparator)` | 编译不过：基本类型数组不支持自定义比较器 | 转 `Integer[]`，或按题目要求换个排法 |
| 用 `Scanner` 读 1e5 行 | 解析慢，容易 TLE | `BufferedReader` + `StringTokenizer` |
| 循环里 `s += c` | 每次新建字符串，O(n²) | `StringBuilder.append` |
| `-7 / 2`、`-7 % 2` | 得 `-3`、`-1`（向零取整），不是 Python 的 `-4`、`1` | 要向下取整用 `Math.floorDiv / floorMod` |
| `char c = 'a'; int x = c + 1;` | `x` 是 98，不是 `'b'` | 结果转回 `(char)(c + 1)` |
| 遍历 `HashMap` 当有序用 | 顺序不保证，同一份数据两次跑可能不同 | 要顺序用 `LinkedHashMap` / `TreeMap` |
| `int` 存 `100000 * 100000` | 先在 `int` 里溢出成 1410065408，赋给 `long` 也救不回来 | 字面量写 `100000L` |
| 循环里逐行 `System.out.println` | 每次输出都可能触发 flush，数据量大时慢到超时 | 攒进 `StringBuilder` 最后一次性输出 |

## 一、输入输出

Java 的读入有三档：`Scanner` 写起来最省事，`BufferedReader + StringTokenizer` 是通用解，`StreamTokenizer` 在纯数字、数据量大时最快。**先按数据量选，不要一上来就抄快读。**

### Scanner：简单题够用

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long sum = 0;
        // hasNextInt 在 EOF 时返回 false，天然支持「多组数据 / 不知道几组」
        while (in.hasNextInt()) {
            sum += in.nextInt();
        }
        System.out.println(sum);
        in.close();
    }
}
```

> `Scanner` 每次 `nextInt()` 都要做一次正则匹配，数据量到 1e5 就会明显变慢。**它适合签到题，不适合机考的大输入。**

### BufferedReader + StringTokenizer：通用写法

按行读、按空格切，既能处理一行多个数，也能处理多行。

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.StringTokenizer;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();
        String line;

        // readLine 在 EOF 时返回 null
        while ((line = br.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;

            StringTokenizer st = new StringTokenizer(line);
            long sum = 0;
            while (st.hasMoreTokens()) {
                sum += Long.parseLong(st.nextToken());
            }
            out.append(sum).append('\n');
        }
        System.out.print(out);   // 一次输出，不要每行都 println
    }
}
```

> `StringTokenizer` 比 `String.split` 快，且不会产生正则开销。分隔符默认就是空格、制表符、换行，正好对应 `split("\\s+")`。

### StreamTokenizer：纯数字的最快读法

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StreamTokenizer;

public class Main {
    public static void main(String[] args) throws IOException {
        StreamTokenizer in = new StreamTokenizer(
                new BufferedReader(new InputStreamReader(System.in)));
        long sum = 0;
        while (in.nextToken() != StreamTokenizer.TT_EOF) {
            if (in.ttype == StreamTokenizer.TT_NUMBER) {
                sum += (long) in.nval;
            }
        }
        System.out.println(sum);
    }
}
```

> `nval` 是 `double`，**超过 2^53 的整数会丢精度**；要读大整数还是用 `BufferedReader` + `BigInteger`。另外它默认把 `"` 和 `'` 当字符串边界符，输入里出现引号时会被吞掉；读纯数字不会遇到，读混排文本要先用 `resetSyntax()` 调整。

### 格式化输出与 StringBuilder

```java
public class Main {
    public static void main(String[] args) {
        double pi = 3.14159265;
        System.out.printf("[%d] [%5d] [%-5d] [%05d]%n", 42, 42, 42, 42);
        System.out.printf("[%.2f] [%8.3f]%n", pi, pi);
        System.out.printf("[%s] [%10s] [%-10s]%n", "abc", "abc", "abc");
        System.out.printf("[%c] [%x] [%o] [%d]%n", 'A', 255, 255, 1234567890123L);
        System.out.printf("100%%%n");   // 百分号写两个

        // 大量输出先攒起来，最后一次性打印
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            sb.append(i);
            sb.append(i == 5 ? '\n' : ' ');
        }
        System.out.print(sb);
    }
}
```

> `%n` 是平台换行符，等价于 `\n` 但更规范；`%5d` 右对齐、`%-5d` 左对齐、`%05d` 补零、`%.2f` 两位小数。**`System.out.printf` 每调用一次都有开销**，循环里输出请换成 `StringBuilder`。

### 大数：BigInteger 与 BigDecimal

`long` 最大约 9.2e18，题目出现 `10^100`、高精度小数时只能上这两个类。

```java
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;

public class Main {
    public static void main(String[] args) {
        BigInteger a = new BigInteger("12345678901234567890");
        BigInteger b = BigInteger.valueOf(97);

        System.out.println(a.add(b));
        System.out.println(a.multiply(b));
        System.out.println(a.mod(b));
        System.out.println(a.compareTo(b) > 0);   // 不能写 a > b

        BigDecimal x = new BigDecimal("1.10");
        BigDecimal y = new BigDecimal("2.20");
        System.out.println(x.add(y));
        System.out.println(x.multiply(y).setScale(2, RoundingMode.HALF_UP));
    }
}
```

> `BigInteger` 是不可变对象，`a.add(b)` **不会修改 a**，必须接返回值。比较大小用 `compareTo`，`==`/`>` 在对象上都不成立。`BigDecimal` 构造要用字符串，`new BigDecimal(0.1)` 会带上二进制误差。
## 二、容器与常用 API

Java 的集合框架是它相对 C 的最大优势：**链表、栈、队列、堆、哈希表、有序表都是现成的**。这一章先把常用 API 和复杂度写清楚，第三章只在「面试要手写」时才自己实现。

### String 与 StringBuilder

`String` 不可变，任何「修改」都返回新对象；频繁拼接必须用 `StringBuilder`。

```java
public class Main {
    public static void main(String[] args) {
        String s = "  Hello Java  ";
        System.out.println(s.trim().length());          // 10
        System.out.println(s.trim().toLowerCase());

        // split 的参数是正则；末尾的空串默认被丢掉
        System.out.println("a,b,,c".split(",").length);   // 4
        System.out.println("a,b,,".split(",").length);    // 2
        System.out.println("a,b,,".split(",", -1).length); // 4，保留末尾空串

        StringBuilder sb = new StringBuilder();
        for (char c : "abc".toCharArray()) {
            sb.append(c).append('-');
        }
        System.out.println(sb);                          // a-b-c-

        System.out.println(String.join("-", "a", "b", "c"));
        System.out.println("abc".compareTo("abd"));       // 负数，字典序在前
        System.out.println(Character.isDigit('7') + " " + Character.isLetter('a'));
        System.out.println("hello".indexOf("ll") + " " + "hello".substring(1, 3));
    }
}
```

> `substring(begin, end)` 是**左闭右开**，`"hello".substring(1, 3)` 得到 `"el"`。`split` 里如果分隔符本身是正则元字符（`.`、`|`、`*`），要转义成 `"\\."`。

### 数组工具 Arrays

```java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {5, 2, 9, 1, 7};
        Arrays.sort(a);                                  // 基本类型只能升序
        System.out.println(Arrays.toString(a));
        System.out.println(Arrays.binarySearch(a, 7));   // 必须先排序，结果 3

        int[] b = Arrays.copyOf(a, 3);                   // 截断 / 扩容都靠它
        System.out.println(Arrays.toString(b));

        int[] dp = new int[5];
        Arrays.fill(dp, -1);                             // 批量赋同一个值
        System.out.println(Arrays.toString(dp));

        int[][] grid = {{1, 2}, {3, 4}};
        System.out.println(Arrays.deepToString(grid));   // 二维数组要 deepToString

        Integer[] boxed = {5, 2, 9};
        Arrays.sort(boxed, (x, y) -> Integer.compare(y, x));  // 对象数组可自定义比较器
        System.out.println(Arrays.toString(boxed));
    }
}
```

> 二维数组排序写 `Arrays.sort(grid, (x, y) -> Integer.compare(x[0], y[0]))`：**比较器只作用于「一行」这个对象**，不是逐元素。`Arrays.equals` 对二维数组只比第一层引用，要逐行比请用 `Arrays.deepEquals`。

### List：ArrayList 与 LinkedList

机考里 95% 的场景用 `ArrayList`；`LinkedList` 只在「频繁在头部增删」时有优势，而 `ArrayDeque` 通常更快。

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>();
        list.add(3);
        list.add(1);
        list.add(2);
        Collections.sort(list);
        System.out.println(list);                 // [1, 2, 3]

        System.out.println("下标 1: " + list.get(1));
        list.set(0, 9);
        list.remove(Integer.valueOf(2));          // 删「值 2」；remove(1) 是删下标
        System.out.println(list);                 // [9, 3]

        // 存一对数：int[] 比 new int[2] 之外再建类更省事
        List<int[]> pairs = new ArrayList<>();
        pairs.add(new int[]{1, 2});
        pairs.add(new int[]{3, 4});
        System.out.println(pairs.get(1)[0]);

        // Arrays.asList 是定长视图，套一层 ArrayList 才能增删
        List<String> growable = new ArrayList<>(Arrays.asList("a", "b"));
        growable.add("c");
        System.out.println(growable);
    }
}
```

> `ArrayList` 随机访问 O(1)、尾部追加均摊 O(1)、中间插入删除 O(n)；`LinkedList` 头尾增删 O(1)，但 `get(i)` 是 O(n)。**遍历时不要用 `list.size()` 之外的下标做删除**，会漏元素。

### Map 与 Set：计数、去重、按序输出

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

        // 计数模板：merge 一步搞定「有则 +1，无则置 1」
        Map<String, Integer> count = new HashMap<>();
        for (String w : words) count.merge(w, 1, Integer::sum);
        System.out.println(count.get("apple"));
        System.out.println(count.getOrDefault("durian", 0));

        // 去重
        Set<String> seen = new HashSet<>();
        for (String w : words) seen.add(w);
        System.out.println(seen.size());

        // 要按插入顺序输出用 LinkedHashMap
        Map<String, Integer> ordered = new LinkedHashMap<>();
        for (String w : words) ordered.putIfAbsent(w, ordered.size());
        System.out.println(ordered.keySet());

        // 要按 key 排序用 TreeMap
        TreeMap<Integer, Integer> sorted = new TreeMap<>();
        sorted.put(3, 30);
        sorted.put(1, 10);
        System.out.println(sorted.firstKey());
    }
}
```

> `HashMap` 的遍历顺序**不保证**，同一份数据在不同 JVM 上都可能不同；需要稳定输出时用 `LinkedHashMap`（插入序）或 `TreeMap`（key 排序）。`TreeMap` 的单次操作是 O(log n)，`HashMap` 均摊 O(1)。

### Queue、Deque 与栈

`ArrayDeque` 一个类同时当队列和栈用，比 `Stack` 和 `LinkedList` 都快；**不要用 `java.util.Stack`**（继承自 Vector，带同步开销）。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    public static void main(String[] args) {
        // 队列：尾部进、头部出
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offerLast(1);
        queue.offerLast(2);
        queue.offerLast(3);
        System.out.println(queue.pollFirst());   // 1
        System.out.println(queue.size());        // 2

        // 栈：push / pop / peek 都在头部
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);
        stack.push(2);
        System.out.println(stack.pop());         // 2
        System.out.println(stack.peek());        // 1
        System.out.println(stack.isEmpty());

        // ArrayDeque 不允许 null，存 null 会抛 NullPointerException
    }
}
```

> 队列方法分两套：`offer/poll/peek` 失败返回特殊值，`add/remove/element` 失败抛异常。**BFS 里一律用前一套**，省掉 try-catch。

### PriorityQueue：堆

默认小顶堆；大顶堆靠自定义比较器。**取堆顶 O(1)、插入删除 O(log n)**。

```java
import java.util.PriorityQueue;

public class Main {
    public static void main(String[] args) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        for (int x : new int[]{5, 1, 3}) minHeap.offer(x);
        while (!minHeap.isEmpty()) System.out.print(minHeap.poll() + " ");
        System.out.println();

        // 大顶堆：用 Integer.compare，别写 y - x（大数相减会溢出）
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>((x, y) -> Integer.compare(y, x));
        for (int x : new int[]{5, 1, 3}) maxHeap.offer(x);
        System.out.println(maxHeap.peek());

        // 按数组第二个元素升序：Top K / 合并区间常用
        PriorityQueue<int[]> bySecond =
                new PriorityQueue<>((x, y) -> Integer.compare(x[1], y[1]));
        bySecond.offer(new int[]{1, 9});
        bySecond.offer(new int[]{2, 3});
        System.out.println(bySecond.peek()[0]);

        // 字符串按长度、再按字典序
        PriorityQueue<String> words = new PriorityQueue<>((x, y) -> {
            if (x.length() != y.length()) return Integer.compare(x.length(), y.length());
            return x.compareTo(y);
        });
        words.offer("java");
        words.offer("c");
        System.out.println(words.peek());
    }
}
```

> `PriorityQueue` **只能保证堆顶是最值**，遍历它得到的不是有序序列；要有序就反复 `poll()`。`toString()` 出来的顺序也没有意义。

### 排序与 Comparator

两种写法：类实现 `Comparable`（定义「默认怎么比」），或传 `Comparator`（临时指定怎么比）。

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    static class Student implements Comparable<Student> {
        String name;
        int score;

        Student(String name, int score) {
            this.name = name;
            this.score = score;
        }

        // 分数降序，同分按名字升序
        @Override
        public int compareTo(Student other) {
            if (score != other.score) return Integer.compare(other.score, score);
            return name.compareTo(other.name);
        }

        @Override
        public String toString() {
            return name + ":" + score;
        }
    }

    public static void main(String[] args) {
        List<Student> students = new ArrayList<>(Arrays.asList(
                new Student("Tom", 90), new Student("Ann", 95), new Student("Bob", 90)));
        Collections.sort(students);
        System.out.println(students);

        // 二维数组按第一列升序
        int[][] intervals = {{2, 5}, {1, 3}, {3, 6}};
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        System.out.println(Arrays.deepToString(intervals));

        // 对象数组：Arrays.sort 是稳定排序（TimSort）
        String[] words = {"pear", "apple", "fig"};
        Arrays.sort(words);
        System.out.println(Arrays.toString(words));
    }
}
```

> 比较器必须满足「自反、传递、反对称」，否则 `Collections.sort` 会抛 `IllegalArgumentException: Comparison method violates its general contract!`。典型错误是 `return a - b` 溢出后符号乱跳。

### Collections 工具类

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(Arrays.asList(3, 1, 2, 1));
        System.out.println(Collections.max(a) + " " + Collections.min(a));
        Collections.reverse(a);
        System.out.println(a);
        System.out.println(Collections.frequency(a, 1));
        Collections.swap(a, 0, 1);
        System.out.println(a);
        Collections.sort(a);
        System.out.println(Collections.binarySearch(a, 2));
    }
}
```

> `Collections.binarySearch` 和 `Arrays.binarySearch` 一样，**调用前数组必须有序**；找不到时返回的是「插入点的负值减一」，不是 -1。
## 三、数据结构

每节先给 JDK 现成用法，再给手写实现。**机考优先用现成的**，手写版本是给「面试要求实现」和「需要改造」的场合准备的。

### 动态数组（手写 ArrayList）

`ArrayList` 的底层就是「数组 + 容量不足时扩容」。知道它怎么长，才会明白「中间插入 O(n)」「扩容均摊 O(1)」是怎么来的。

```java
import java.util.Arrays;

public class Main {
    static class IntList {
        private int[] data = new int[4];
        private int size = 0;

        void add(int x) {
            if (size == data.length) {
                data = Arrays.copyOf(data, data.length * 2);
            }
            data[size++] = x;
        }

        int get(int index) {
            return data[index];
        }

        int size() {
            return size;
        }
    }

    public static void main(String[] args) {
        IntList list = new IntList();
        for (int i = 0; i < 10; i++) list.add(i * i);
        for (int i = 0; i < list.size(); i++) System.out.print(list.get(i) + " ");
        System.out.println("\n长度 " + list.size());
    }
}
```

> 扩容按 2 倍而不是 +1：`n` 次追加的总拷贝量是 `1+2+4+…+n < 2n`，均摊下来每次 O(1)。如果每次只加一格，总代价会退化到 O(n²)。

### 链表

```java
public class Main {
    static class ListNode {
        int val;
        ListNode next;

        ListNode(int val) {
            this.val = val;
        }
    }

    // 头插：新节点成为新的头，O(1)
    static ListNode pushFront(ListNode head, int val) {
        ListNode node = new ListNode(val);
        node.next = head;
        return node;
    }

    // 三指针反转，O(n) 时间、O(1) 空间
    static ListNode reverse(ListNode head) {
        ListNode prev = null;
        while (head != null) {
            ListNode next = head.next;
            head.next = prev;
            prev = head;
            head = next;
        }
        return prev;
    }

    static void print(String tag, ListNode head) {
        StringBuilder sb = new StringBuilder(tag);
        for (ListNode cur = head; cur != null; cur = cur.next) {
            sb.append(cur.val).append(cur.next == null ? "" : " -> ");
        }
        System.out.println(sb);
    }

    public static void main(String[] args) {
        ListNode head = null;
        for (int i = 1; i <= 3; i++) head = pushFront(head, i);
        print("链表: ", head);
        print("反转: ", reverse(head));
    }
}
```

> Java 没有指针，但有引用：`head = head.next` 只是让局部变量指向下一个节点，**不会改动链表本身**；要改结构必须动 `node.next`。

### 栈与队列（手写）

```java
public class Main {
    static class IntStack {
        private final int[] data;
        private int top = -1;

        IntStack(int capacity) {
            data = new int[capacity];
        }

        void push(int x) {
            data[++top] = x;
        }

        int pop() {
            return data[top--];
        }

        int peek() {
            return data[top];
        }

        boolean isEmpty() {
            return top == -1;
        }
    }

    // 循环队列：牺牲一格区分「满」和「空」
    static class IntQueue {
        private final int[] data;
        private int head = 0;
        private int size = 0;

        IntQueue(int capacity) {
            data = new int[capacity];
        }

        boolean offer(int x) {
            if (size == data.length) return false;
            data[(head + size) % data.length] = x;
            size++;
            return true;
        }

        int poll() {
            int value = data[head];
            head = (head + 1) % data.length;
            size--;
            return value;
        }

        boolean isEmpty() {
            return size == 0;
        }
    }

    public static void main(String[] args) {
        IntStack stack = new IntStack(10);
        stack.push(1);
        stack.push(2);
        System.out.println(stack.peek() + " " + stack.pop());

        IntQueue queue = new IntQueue(10);
        queue.offer(1);
        queue.offer(2);
        queue.offer(3);
        while (!queue.isEmpty()) System.out.print(queue.poll() + " ");
        System.out.println();
    }
}
```

> 队列里用 `(head + size) % capacity` 算尾位置，比单独维护 `tail` 少一个需要同步的变量。数组容量固定时，入队前判 `size == data.length` 就够了。

### 堆（手写二叉堆）

```java
public class Main {
    static class MinHeap {
        private final int[] a;
        private int size = 0;

        MinHeap(int capacity) {
            a = new int[capacity];
        }

        void push(int x) {
            int i = size++;
            a[i] = x;
            while (i > 0) {
                int parent = (i - 1) / 2;
                if (a[parent] <= a[i]) break;
                swap(parent, i);
                i = parent;
            }
        }

        int pop() {
            int top = a[0];
            a[0] = a[--size];
            int i = 0;
            while (true) {
                int left = 2 * i + 1;
                int right = left + 1;
                int smallest = i;
                if (left < size && a[left] < a[smallest]) smallest = left;
                if (right < size && a[right] < a[smallest]) smallest = right;
                if (smallest == i) break;
                swap(i, smallest);
                i = smallest;
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
        while (!heap.isEmpty()) System.out.print(heap.pop() + " ");
        System.out.println();
    }
}
```

> `pop` 里先把末尾元素放到堆顶再下沉，**不要**删掉 `a[0]` 后整体左移 —— 那样一次删除就变成 O(n)，堆的意义就没了。

### 哈希表（手写链地址法）

```java
public class Main {
    static class HNode {
        int key;
        int value;
        HNode next;

        HNode(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    static class IntHashMap {
        private final HNode[] table;

        IntHashMap(int capacity) {
            table = new HNode[capacity];
        }

        private int index(int key) {
            return Math.floorMod(key, table.length);   // 负数取模也落在 [0, len)
        }

        void put(int key, int value) {
            int i = index(key);
            for (HNode cur = table[i]; cur != null; cur = cur.next) {
                if (cur.key == key) {
                    cur.value = value;
                    return;
                }
            }
            HNode node = new HNode(key, value);
            node.next = table[i];
            table[i] = node;
        }

        Integer get(int key) {
            for (HNode cur = table[index(key)]; cur != null; cur = cur.next) {
                if (cur.key == key) return cur.value;
            }
            return null;   // 没找到用 null，不用 -1 当哨兵
        }

        boolean remove(int key) {
            int i = index(key);
            HNode prev = null;
            for (HNode cur = table[i]; cur != null; prev = cur, cur = cur.next) {
                if (cur.key == key) {
                    if (prev == null) table[i] = cur.next;
                    else prev.next = cur.next;
                    return true;
                }
            }
            return false;
        }
    }

    public static void main(String[] args) {
        IntHashMap map = new IntHashMap(16);
        for (int i = 0; i < 10; i++) map.put(i * 100, i);
        System.out.println(map.get(500));
        System.out.println(map.get(123));
        System.out.println(map.remove(500));
        System.out.println(map.get(500));
    }
}
```

> 返回 `null` 表示「没有这个键」，比返回 `-1` 安全：**value 本身完全可能是 -1**。用 `Integer` 而不是 `int` 当返回值，就是为了留出这个空位。

### 并查集（Union-Find）

```java
public class Main {
    static class DSU {
        private final int[] parent;
        private final int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        // 路径压缩：把沿途节点直接挂到根上
        int find(int x) {
            while (parent[x] != x) {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        }

        // 按大小合并，返回 true 表示这次真的合并了两个不同的集合
        boolean union(int a, int b) {
            int ra = find(a);
            int rb = find(b);
            if (ra == rb) return false;
            if (size[ra] < size[rb]) {
                int t = ra;
                ra = rb;
                rb = t;
            }
            parent[rb] = ra;
            size[ra] += size[rb];
            return true;
        }
    }

    public static void main(String[] args) {
        DSU dsu = new DSU(6);
        dsu.union(0, 1);
        dsu.union(1, 2);
        dsu.union(4, 5);

        int components = 0;
        for (int i = 0; i < 6; i++) {
            if (dsu.find(i) == i) components++;
        }
        System.out.println("连通块个数 = " + components);
        System.out.println("0 和 2 连通: " + (dsu.find(0) == dsu.find(2)));
        System.out.println("0 和 4 连通: " + (dsu.find(0) == dsu.find(4)));
    }
}
```

> 路径压缩 + 按大小合并之后，单次操作接近 O(1)（严格说是反阿克曼函数 α(n)）。**只写路径压缩不写按大小合并**也能过大多数题，但极端数据下会退化。

### 树（Tree）

BST 的增删查，加上 AVL 的插入。遍历写递归版，层序用队列。

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;
        int height;
        TreeNode left;
        TreeNode right;

        TreeNode(int val) {
            this.val = val;
            this.height = 1;
        }
    }

    static int height(TreeNode node) {
        return node == null ? 0 : node.height;
    }

    static int max(int a, int b) {
        return a > b ? a : b;
    }

    static TreeNode rightRotate(TreeNode y) {
        TreeNode x = y.left;
        TreeNode t2 = x.right;
        x.right = y;
        y.left = t2;
        y.height = max(height(y.left), height(y.right)) + 1;
        x.height = max(height(x.left), height(x.right)) + 1;
        return x;
    }

    static TreeNode leftRotate(TreeNode x) {
        TreeNode y = x.right;
        TreeNode t2 = y.left;
        y.left = x;
        x.right = t2;
        x.height = max(height(x.left), height(x.right)) + 1;
        y.height = max(height(y.left), height(y.right)) + 1;
        return y;
    }

    static int balance(TreeNode node) {
        return node == null ? 0 : height(node.left) - height(node.right);
    }

    // AVL 插入：普通 BST 插入 + 回溯时修正四种失衡
    static TreeNode insertAVL(TreeNode node, int val) {
        if (node == null) return new TreeNode(val);

        if (val < node.val) {
            node.left = insertAVL(node.left, val);
        } else if (val > node.val) {
            node.right = insertAVL(node.right, val);
        } else {
            return node;   // 不插入重复值
        }

        node.height = 1 + max(height(node.left), height(node.right));
        int bf = balance(node);

        if (bf > 1 && val < node.left.val) return rightRotate(node);          // 左左
        if (bf < -1 && val > node.right.val) return leftRotate(node);         // 右右
        if (bf > 1 && val > node.left.val) {                                  // 左右
            node.left = leftRotate(node.left);
            return rightRotate(node);
        }
        if (bf < -1 && val < node.right.val) {                                // 右左
            node.right = rightRotate(node.right);
            return leftRotate(node);
        }
        return node;
    }

    static TreeNode insertBST(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);
        if (val < root.val) root.left = insertBST(root.left, val);
        else if (val > root.val) root.right = insertBST(root.right, val);
        return root;
    }

    // 删除：两个孩子时用右子树最小值顶替
    static TreeNode deleteNode(TreeNode root, int val) {
        if (root == null) return null;

        if (val < root.val) {
            root.left = deleteNode(root.left, val);
        } else if (val > root.val) {
            root.right = deleteNode(root.right, val);
        } else {
            if (root.left == null) return root.right;
            if (root.right == null) return root.left;
            TreeNode successor = root.right;
            while (successor.left != null) successor = successor.left;
            root.val = successor.val;
            root.right = deleteNode(root.right, successor.val);
        }
        return root;
    }

    static void preorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        sb.append(node.val).append(' ');
        preorder(node.left, sb);
        preorder(node.right, sb);
    }

    static void inorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        inorder(node.left, sb);
        sb.append(node.val).append(' ');
        inorder(node.right, sb);
    }

    static void postorder(TreeNode node, StringBuilder sb) {
        if (node == null) return;
        postorder(node.left, sb);
        postorder(node.right, sb);
        sb.append(node.val).append(' ');
    }

    static void levelOrder(TreeNode root, StringBuilder sb) {
        if (root == null) return;
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.offerLast(root);
        while (!queue.isEmpty()) {
            TreeNode cur = queue.pollFirst();
            sb.append(cur.val).append(' ');
            if (cur.left != null) queue.offerLast(cur.left);
            if (cur.right != null) queue.offerLast(cur.right);
        }
    }

    public static void main(String[] args) {
        TreeNode avl = null;
        for (int val : new int[]{10, 20, 30, 40, 50, 25}) avl = insertAVL(avl, val);

        StringBuilder sb = new StringBuilder();
        preorder(avl, sb);
        System.out.println("AVL 前序: " + sb);
        sb.setLength(0);
        inorder(avl, sb);
        System.out.println("AVL 中序: " + sb);
        sb.setLength(0);
        postorder(avl, sb);
        System.out.println("AVL 后序: " + sb);
        sb.setLength(0);
        levelOrder(avl, sb);
        System.out.println("AVL 层序: " + sb);

        TreeNode bst = null;
        for (int val : new int[]{50, 30, 70, 20, 40, 60, 80}) bst = insertBST(bst, val);
        bst = deleteNode(bst, 30);
        sb.setLength(0);
        inorder(bst, sb);
        System.out.println("BST 删除 30 后中序: " + sb);
    }
}
```

> AVL 的删除没有写：四种失衡再加「删除后继」的组合分支很容易漏。机考基本只考插入与查询，**JDK 的 `TreeMap/TreeSet` 本身就是红黑树**，需要有序集合直接用它们，别手写平衡树。

### 字典树（Trie）

```java
public class Main {
    static class TrieNode {
        TrieNode[] child = new TrieNode[26];
        int pass;   // 有多少个单词经过这里
        int end;    // 有多少个单词在这里结束
    }

    static void insert(TrieNode root, String word) {
        TrieNode cur = root;
        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';
            if (idx < 0 || idx >= 26) continue;
            if (cur.child[idx] == null) cur.child[idx] = new TrieNode();
            cur = cur.child[idx];
            cur.pass++;
        }
        cur.end++;
    }

    static int search(TrieNode root, String word) {
        TrieNode cur = root;
        for (int i = 0; i < word.length(); i++) {
            int idx = word.charAt(i) - 'a';
            if (idx < 0 || idx >= 26 || cur.child[idx] == null) return 0;
            cur = cur.child[idx];
        }
        return cur.end;
    }

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
        for (String w : new String[]{"apple", "app", "apply", "banana"}) insert(root, w);

        System.out.println("apple 出现 " + search(root, "apple") + " 次");
        System.out.println("app 出现 " + search(root, "app") + " 次");
        System.out.println("ap 出现 " + search(root, "ap") + " 次");
        System.out.println("以 ap 开头的单词有 " + startsWith(root, "ap") + " 个");
    }
}
```

> `TrieNode[] child = new TrieNode[26]` 是对象数组，默认全是 `null`，不需要额外清零。`pass` 就是「以当前前缀开头的单词数」，所以前缀查询直接读它。

### 图（Graph）

Java 没有内置图结构，邻接表用 `List<List<int[]>>` 最顺手：外层是点，内层每个 `int[]{to, weight}` 是一条边。

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    static void addDirected(List<List<int[]>> graph, int from, int to, int weight) {
        graph.get(from).add(new int[]{to, weight});
    }

    static void addUndirected(List<List<int[]>> graph, int u, int v, int weight) {
        addDirected(graph, u, v, weight);
        addDirected(graph, v, u, weight);
    }

    static List<List<int[]>> createGraph(int n) {
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        return graph;
    }

    static void dfs(List<List<int[]>> graph, int u, boolean[] visited, StringBuilder out) {
        visited[u] = true;
        out.append(u).append(' ');
        for (int[] edge : graph.get(u)) {
            if (!visited[edge[0]]) dfs(graph, edge[0], visited, out);
        }
    }

    static void bfs(List<List<int[]>> graph, int start, StringBuilder out) {
        boolean[] visited = new boolean[graph.size()];
        Deque<Integer> queue = new ArrayDeque<>();
        visited[start] = true;
        queue.offerLast(start);
        while (!queue.isEmpty()) {
            int u = queue.pollFirst();
            out.append(u).append(' ');
            for (int[] edge : graph.get(u)) {
                if (!visited[edge[0]]) {
                    visited[edge[0]] = true;
                    queue.offerLast(edge[0]);
                }
            }
        }
    }

    static final long INF = Long.MAX_VALUE / 4;

    // 堆优化 Dijkstra：O((n + m) log n)
    static long[] dijkstra(List<List<int[]>> graph, int src) {
        int n = graph.size();
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.offer(new long[]{0, src});

        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            int u = (int) cur[1];
            if (cur[0] != dist[u]) continue;   // 懒删除：这是过期状态

            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                long nd = cur[0] + edge[1];
                if (nd < dist[v]) {
                    dist[v] = nd;
                    pq.offer(new long[]{nd, v});
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
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

> 邻接表里存 `int[]{to, weight}` 会带来一次拆箱/建对象的开销，但代码比「三个平行数组 `head/next/to`」清楚得多。**n、m 到 1e5 时它仍然够快**，不要过早优化。

#### 拓扑排序（Kahn）

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    // 返回拓扑序；有环时返回 null
    static List<Integer> topoSort(int n, List<List<Integer>> graph) {
        int[] indegree = new int[n];
        for (List<Integer> next : graph) {
            for (int v : next) indegree[v]++;
        }

        Deque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) queue.offerLast(i);
        }

        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int u = queue.pollFirst();
            order.add(u);
            for (int v : graph.get(u)) {
                if (--indegree[v] == 0) queue.offerLast(v);
            }
        }
        return order.size() == n ? order : null;
    }

    public static void main(String[] args) {
        int n = 6;
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
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

> 有环时出队数量小于 n，所以判据是 `order.size() == n`，不是「队列空了就成功」。

#### 最小生成树（Kruskal）

```java
import java.util.Arrays;

public class Main {
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

    static int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    // 图不连通时返回 -1
    static long kruskal(int n, Edge[] edges) {
        Arrays.sort(edges, (a, b) -> Integer.compare(a.w, b.w));
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;

        long total = 0;
        int used = 0;
        for (Edge edge : edges) {
            int ru = find(parent, edge.u);
            int rv = find(parent, edge.v);
            if (ru == rv) continue;
            parent[ru] = rv;
            total += edge.w;
            used++;
            if (used == n - 1) break;
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

> 边按权排序一次 O(m log m)，之后每条边只做两次 `find`，比 Prim 更适合稀疏图和「边已经给成列表」的输入。

#### Floyd（多源最短路）

```java
public class Main {
    static final int INF = 1_000_000_000;

    static void floyd(int[][] dist) {
        int n = dist.length;
        for (int k = 0; k < n; k++) {              // 中转点必须在最外层
            for (int i = 0; i < n; i++) {
                if (dist[i][k] == INF) continue;
                for (int j = 0; j < n; j++) {
                    if (dist[k][j] == INF) continue;
                    int through = dist[i][k] + dist[k][j];
                    if (through < dist[i][j]) dist[i][j] = through;
                }
            }
        }
    }

    public static void main(String[] args) {
        int n = 4;
        int[][] dist = new int[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                dist[i][j] = (i == j) ? 0 : INF;
            }
        }
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

> 用 `1_000_000_000` 而不是 `Integer.MAX_VALUE` 当 INF：两个 INF 相加会溢出成负数，`dist[i][k] == INF` 的判断只是省掉了大部分加法，**换成 MAX_VALUE 后漏一个判断就会算出负权最短路**。
## 四、算法

### 排序

JDK 的 `Arrays.sort` 已经够快：基本类型用双轴快排（不稳定），对象数组用 TimSort（稳定）。需要手写的是**归并**（求逆序对）和**快排**（求第 k 大）。

```java
import java.util.Arrays;

public class Main {
    static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    // 快排：pivot 取末尾，平均 O(n log n)；原始数据有序时退化 O(n²)
    static void quickSort(int[] a, int left, int right) {
        if (left >= right) return;
        int pivot = a[right];
        int i = left - 1;
        for (int j = left; j < right; j++) {
            if (a[j] < pivot) swap(a, ++i, j);
        }
        swap(a, ++i, right);
        quickSort(a, left, i - 1);
        quickSort(a, i + 1, right);
    }

    // 归并：稳定，O(n log n)；求逆序对时在「右边先出」的分支累加计数
    static void mergeSort(int[] a, int left, int right, int[] temp) {
        if (left >= right) return;
        int mid = left + (right - left) / 2;
        mergeSort(a, left, mid, temp);
        mergeSort(a, mid + 1, right, temp);

        int i = left, j = mid + 1, k = left;
        while (i <= mid && j <= right) temp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        while (i <= mid) temp[k++] = a[i++];
        while (j <= right) temp[k++] = a[j++];
        for (int t = left; t <= right; t++) a[t] = temp[t];
    }

    static void heapify(int[] a, int n, int i) {
        while (true) {
            int largest = i;
            int left = 2 * i + 1;
            int right = left + 1;
            if (left < n && a[left] > a[largest]) largest = left;
            if (right < n && a[right] > a[largest]) largest = right;
            if (largest == i) break;
            swap(a, i, largest);
            i = largest;
        }
    }

    // 堆排：O(n log n)，空间 O(1)
    static void heapSort(int[] a) {
        int n = a.length;
        for (int i = n / 2 - 1; i >= 0; i--) heapify(a, n, i);
        for (int i = n - 1; i > 0; i--) {
            swap(a, 0, i);
            heapify(a, i, 0);
        }
    }

    public static void main(String[] args) {
        int[] base = {64, 34, 25, 12, 22, 11, 90};

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

> `Arrays.sort(int[])` 用的是双轴快排，**不稳定**；`Arrays.sort(Object[])` 用的是 TimSort，稳定。题目要求「相同元素保持原顺序」时，只能对对象数组排，或者把原下标一起参与比较。

### 二分查找与二分答案

二分的坑全在边界：`while (left <= right)` 配 `right = mid - 1`，`while (left < right)` 配 `right = mid`，两套不能混。

```java
public class Main {
    // 找到返回下标，找不到返回 -1
    static int binarySearch(int[] a, int target) {
        int left = 0, right = a.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (a[mid] == target) return mid;
            if (a[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }

    // 第一个 >= target 的位置（找不到返回 a.length）
    static int lowerBound(int[] a, int target) {
        int left = 0, right = a.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (a[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }

    // 第一个 > target 的位置
    static int upperBound(int[] a, int target) {
        int left = 0, right = a.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (a[mid] <= target) left = mid + 1;
            else right = mid;
        }
        return left;
    }

    // 二分答案：把数组切成 k 段，让「最大段和」尽量小
    static boolean canSplit(int[] a, int k, long limit) {
        if (a.length == 0) return true;
        int parts = 1;
        long sum = 0;
        for (int x : a) {
            if (x > limit) return false;   // 单个就超了，这个 limit 不可能
            if (sum + x > limit) {
                parts++;
                sum = x;
            } else {
                sum += x;
            }
        }
        return parts <= k;
    }

    static long minMaxSplit(int[] a, int k) {
        long sum = 0;
        int max = 0;
        for (int x : a) {
            sum += x;
            max = Math.max(max, x);
        }
        long left = max, right = sum;
        while (left < right) {
            long mid = left + (right - left) / 2;
            if (canSplit(a, k, mid)) right = mid;
            else left = mid + 1;
        }
        return left;
    }

    public static void main(String[] args) {
        int[] a = {10, 20, 30, 40, 50, 60, 70, 80, 90};
        System.out.println(binarySearch(a, 50));
        System.out.println(binarySearch(a, 55));
        System.out.println(lowerBound(a, 50) + " " + upperBound(a, 50));

        int[] nums = {7, 2, 5, 10, 8};
        System.out.println("分 2 段的最小最大和: " + minMaxSplit(nums, 2));
    }
}
```

> 二分答案的判据必须**单调**：`limit` 越大越容易满足。`canSplit` 里「单个元素就超过 limit」要单独判，否则会把一个装不下的元素硬塞进段里，得到错误的 `true`。

### 双指针与滑动窗口

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

public class Main {
    // 有序数组两数之和：返回下标，没有返回 null
    static int[] twoSumSorted(int[] a, int target) {
        int i = 0, j = a.length - 1;
        while (i < j) {
            int sum = a[i] + a[j];
            if (sum == target) return new int[]{i, j};
            if (sum < target) i++;
            else j--;
        }
        return null;
    }

    // 最长无重复字符子串
    static int longestUnique(String s) {
        int[] last = new int[128];
        Arrays.fill(last, -1);
        int best = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (last[c] >= left) left = last[c] + 1;
            last[c] = right;
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    // 定长窗口最大值：单调队列存下标
    static int[] windowMax(int[] a, int k) {
        int n = a.length;
        int[] result = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();   // 存下标，值递减
        for (int i = 0; i < n; i++) {
            while (!deque.isEmpty() && a[deque.peekLast()] <= a[i]) deque.pollLast();
            deque.offerLast(i);
            if (deque.peekFirst() <= i - k) deque.pollFirst();
            if (i >= k - 1) result[i - k + 1] = a[deque.peekFirst()];
        }
        return result;
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 5, 7, 9, 11};
        System.out.println(Arrays.toString(twoSumSorted(a, 12)));
        System.out.println(longestUnique("abcbbad"));

        int[] b = {1, 3, -1, -3, 5, 3, 6, 7};
        System.out.println(Arrays.toString(windowMax(b, 3)));
    }
}
```

> 滑动窗口的 `left` 只增不减。如果写成 `left = last[c] + 1` 而不和当前 `left` 取 max，遇到 `"abba"` 这种回头的字符就会让左边界倒退，答案偏大。

### 前缀和与差分

```java
public class Main {
    // prefix[i] 是前 i 个元素的和，prefix[0] = 0
    static long[] prefixSum(int[] a) {
        long[] prefix = new long[a.length + 1];
        for (int i = 0; i < a.length; i++) prefix[i + 1] = prefix[i] + a[i];
        return prefix;
    }

    // 闭区间 [l, r] 的和
    static long rangeSum(long[] prefix, int l, int r) {
        return prefix[r + 1] - prefix[l];
    }

    // 差分：区间 [l, r] 整体加 v
    static void rangeAdd(long[] diff, int l, int r, long v) {
        diff[l] += v;
        if (r + 1 < diff.length) diff[r + 1] -= v;
    }

    // 对差分数组求前缀和，还原每个位置的累计增量
    static long[] restore(long[] diff) {
        long[] a = new long[diff.length];
        long cur = 0;
        for (int i = 0; i < diff.length; i++) {
            cur += diff[i];
            a[i] = cur;
        }
        return a;
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3, 4, 5};
        long[] prefix = prefixSum(nums);
        System.out.println("下标 1~3 的和 = " + rangeSum(prefix, 1, 3));

        long[] diff = new long[nums.length];
        rangeAdd(diff, 0, 2, 10);
        rangeAdd(diff, 1, 4, 1);
        System.out.println(java.util.Arrays.toString(restore(diff)));
    }
}
```

> 差分数组长度要和原数组一样，`r + 1 == n` 时那一项越界，判掉不影响结果 —— 后面没有元素需要减回来。

### 递归与回溯

回溯 = 递归 + 撤销选择。三步：**做选择 → 递归 → 撤销**。Java 里「撤销」就是 `path.remove(path.size() - 1)`。

```java
import java.util.ArrayList;
import java.util.List;

public class Main {
    // 子集：每个元素「选 / 不选」
    static void subsets(int[] nums, int idx, List<Integer> path, List<List<Integer>> result) {
        if (idx == nums.length) {
            result.add(new ArrayList<>(path));   // 必须拷贝，path 后面还会变
            return;
        }
        subsets(nums, idx + 1, path, result);    // 不选
        path.add(nums[idx]);
        subsets(nums, idx + 1, path, result);    // 选
        path.remove(path.size() - 1);            // 撤销
    }

    // 全排列：把第 depth 位和后面每个位置交换
    static void permute(int[] nums, int depth, List<List<Integer>> result) {
        if (depth == nums.length) {
            List<Integer> one = new ArrayList<>();
            for (int x : nums) one.add(x);
            result.add(one);
            return;
        }
        for (int i = depth; i < nums.length; i++) {
            swap(nums, depth, i);
            permute(nums, depth + 1, result);
            swap(nums, depth, i);                // 撤销
        }
    }

    static int queenCount = 0;

    // N 皇后：列 + 两条对角线各一个标记数组
    static void nQueens(int row, int n, boolean[] cols, boolean[] diag1, boolean[] diag2) {
        if (row == n) {
            queenCount++;
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || diag1[row + c] || diag2[row - c + n]) continue;
            cols[c] = diag1[row + c] = diag2[row - c + n] = true;
            nQueens(row + 1, n, cols, diag1, diag2);
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
        System.out.println("子集个数: " + allSubsets.size());
        System.out.println(allSubsets);

        List<List<Integer>> allPerms = new ArrayList<>();
        permute(nums, 0, allPerms);
        System.out.println("排列个数: " + allPerms.size());
        System.out.println(allPerms);

        int n = 6;
        nQueens(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]);
        System.out.println(n + " 皇后共有 " + queenCount + " 组解");
    }
}
```

> 子集里 `result.add(new ArrayList<>(path))` 不能写成 `result.add(path)`：`path` 全程是同一个对象，最后会变成「n 个指向同一份空列表」。

### 贪心

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

    // 按右端点升序：最早结束的留给后面的时间最多
    static int maxNonOverlap(Interval[] intervals) {
        if (intervals.length == 0) return 0;
        Arrays.sort(intervals, (a, b) -> Integer.compare(a.right, b.right));
        int count = 1;
        int end = intervals[0].right;
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i].left >= end) {
                count++;
                end = intervals[i].right;
            }
        }
        return count;
    }

    // 跳跃游戏：reach 是当前能到达的最远下标
    static boolean canJump(int[] a) {
        int reach = 0;
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
        System.out.println("最多能参加的场次: " + maxNonOverlap(intervals));
        System.out.println("能否到达终点: " + canJump(new int[]{2, 3, 1, 1, 4}));
    }
}
```

> 区间调度必须按**右端点**排。按左端点排会选出「最早开始但最长」的那个，把后面全挡住：`[0,10], [1,2], [2,3]` 一眼能看出差别。

### 动态规划

四步：**定义状态 → 写转移 → 定初值 → 定遍历顺序**。下面五个模型覆盖机考大多数 DP。

```java
import java.util.Arrays;

public class Main {
    // 01 背包：每件最多一次，容量倒序
    static int knapsack01(int[] weight, int[] value, int cap) {
        int[] dp = new int[cap + 1];
        for (int i = 0; i < weight.length; i++) {
            for (int c = cap; c >= weight[i]; c--) {
                dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);
            }
        }
        return dp[cap];
    }

    // 完全背包：每件无限次，容量正序
    static int knapsackComplete(int[] weight, int[] value, int cap) {
        int[] dp = new int[cap + 1];
        for (int i = 0; i < weight.length; i++) {
            for (int c = weight[i]; c <= cap; c++) {
                dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);
            }
        }
        return dp[cap];
    }

    // LIS：tails[len-1] 是长度为 len 的上升子序列的最小结尾
    static int lis(int[] a) {
        int[] tails = new int[a.length];
        int len = 0;
        for (int x : a) {
            int left = 0, right = len;
            while (left < right) {
                int mid = left + (right - left) / 2;
                if (tails[mid] < x) left = mid + 1;
                else right = mid;
            }
            tails[left] = x;
            if (left == len) len++;
        }
        return len;
    }

    // LCS：滚动数组，只保留上一行
    static int lcs(String a, String b) {
        int lb = b.length();
        int[] prev = new int[lb + 1];
        int[] cur = new int[lb + 1];
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = 0;
            for (int j = 1; j <= lb; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) cur[j] = prev[j - 1] + 1;
                else cur[j] = Math.max(prev[j], cur[j - 1]);
            }
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
        for (int j = 0; j <= lb; j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= lb; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    cur[j] = prev[j - 1];
                } else {
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
        System.out.println("01 背包: " + knapsack01(weight, value, 8));
        System.out.println("完全背包: " + knapsackComplete(weight, value, 8));
        System.out.println("LIS: " + lis(new int[]{10, 9, 2, 5, 3, 7, 101, 18}));
        System.out.println("LCS: " + lcs("ABCBDAB", "BDCABA"));
        System.out.println("编辑距离: " + editDistance("horse", "ros"));
        System.out.println("dp 数组清零: " + Arrays.toString(new int[3]));
    }
}
```

> 01 背包容量必须**倒序**：正序会让同一件物品被重复放入，直接变成完全背包。完全背包反过来必须正序，一次拿多件。

### 字符串算法

`String` 自带的 `indexOf` 已经是优化过的子串查找，但**要求输出所有匹配位置**时还得自己写 KMP。

```java
import java.util.ArrayList;
import java.util.List;

public class Main {
    // lps[i] = pat[0..i] 的最长相等前后缀长度
    static int[] buildLps(String pat) {
        int m = pat.length();
        int[] lps = new int[m];
        int len = 0;
        for (int i = 1; i < m; ) {
            if (pat.charAt(i) == pat.charAt(len)) {
                lps[i++] = ++len;
            } else if (len > 0) {
                len = lps[len - 1];
            } else {
                lps[i++] = 0;
            }
        }
        return lps;
    }

    // 返回所有匹配的起始下标（允许重叠）
    static List<Integer> kmpAll(String pat, String txt) {
        List<Integer> positions = new ArrayList<>();
        int m = pat.length(), n = txt.length();
        if (m == 0 || m > n) return positions;

        int[] lps = buildLps(pat);
        int i = 0, j = 0;
        while (i < n) {
            if (txt.charAt(i) == pat.charAt(j)) {
                i++;
                j++;
            }
            if (j == m) {
                positions.add(i - j);
                j = lps[j - 1];   // 继续找，允许重叠
            } else if (i < n && txt.charAt(i) != pat.charAt(j)) {
                if (j != 0) j = lps[j - 1];
                else i++;
            }
        }
        return positions;
    }

    // 字符串哈希：预处理一次，之后 O(1) 取任意子串哈希（这里演示数匹配）
    static int hashCount(String pat, String txt) {
        int m = pat.length(), n = txt.length();
        if (m == 0 || m > n) return 0;

        long ph = 0, th = 0, power = 1;
        for (int i = 0; i < m; i++) {
            ph = ph * 131 + pat.charAt(i);
            th = th * 131 + txt.charAt(i);
            power *= 131;
        }

        int count = th == ph ? 1 : 0;
        for (int i = m; i < n; i++) {
            th = th * 131 + txt.charAt(i) - power * txt.charAt(i - m);
            if (th == ph) count++;
        }
        return count;
    }

    public static void main(String[] args) {
        String txt = "ABABDABACDABABCABAB";
        String pat = "ABABCABAB";

        System.out.println("indexOf: " + txt.indexOf(pat));
        System.out.println("KMP 匹配: " + kmpAll(pat, txt));
        System.out.println("哈希匹配 AB 的次数: " + hashCount("AB", txt));
    }
}
```

> 哈希用 `long` 溢出（mod 2^64）是允许的，但**理论上有极小概率撞键**；要求绝对正确时用 KMP。哈希的真正价值是「预处理一次，之后 O(1) 取任意子串哈希」，不只是数匹配。

## 五、复杂度与选择速查

### 看数据范围选算法

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

> 最后一个要记住的坑：`List<Integer>`、`Map<Integer, Integer>` 里每个元素都是**装箱对象**，1e6 规模下内存和耗时都比 `int[]` 高一个量级。数据量大时优先用数组，别为了写法漂亮把 `int[]` 换成 `List<Integer>`。
