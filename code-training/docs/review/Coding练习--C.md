---
title: Coding练习--C
category: 参考手册
last_updated: 2026-11-20
---
# Coding练习--C

> 机考与笔试用的 C 模板合集。按「先讲清楚这个东西在内存里长什么样，再给能直接抄的代码」来写：C 的坑几乎都和指针、数组、字符串的存储方式有关，先建立这个模型，后面很多规则就不用背。
>
> 每块都能单独编译（`pnpm check:c` 逐块跑 `gcc -std=c11 -Wall -Wextra -Werror`）；带 `main` 的块直接跑得出结果，没有 `main` 的是库块，只用来抄函数。
>
> 代码按「函数说明 + 逐行注释」写，注释解释「这一行为什么必须在这」，不复述语法。

## 零、C 的心智模型

### 程序的内存分成几块

一个 C 程序运行时，内存大致分四块，各自的生死规则不同：

| 区域 | 存什么 | 什么时候分配/释放 | 典型错误 |
|---|---|---|---|
| 栈 | 局部变量、函数参数、返回地址 | 函数进入时分配，返回时自动释放 | 返回局部数组的指针（悬垂指针） |
| 堆 | `malloc`/`realloc` 出来的内存 | 手动申请，手动 `free` | 忘记释放（泄漏）、重复释放 |
| 全局/静态区 | 全局变量、`static` 变量 | 程序启动时分配，结束时释放 | 大数组放这里最稳 |
| 常量区 | 字符串字面量、`const` 数据 | 只读，程序结束才释放 | 改字符串字面量（段错误） |

两个直接影响机考的事实：

- **栈很小**（通常 8MB），`int a[1000000]` 要 4MB，再加递归就可能爆栈；大数组放全局。
- **局部变量在函数返回后就不存在了**，返回指向它的指针是未定义行为，编译器不一定报错。

```c
#include <stdio.h>
#include <stdlib.h>

// 正确做法：由调用方传缓冲区进来，内存的生命周期由调用方负责
static void fill(int *out, int n) {
    for (int i = 0; i < n; i++) {
        out[i] = i * i;        // 写的是调用方的内存
    }
}

int main(void) {
    int a[3];
    fill(a, 3);                          // 调用方提供栈上的内存，最常用
    printf("%d %d %d\n", a[0], a[1], a[2]);

    int *b = (int *)malloc(3 * sizeof(int));   // 堆上分配，返回 void*
    if (b == NULL) return 1;                   // 分配失败必须判
    fill(b, 3);
    printf("%d %d %d\n", b[0], b[1], b[2]);
    free(b);                                   // 用完显式释放
    b = NULL;                                  // 置空，防止后面误用

    return 0;
}
```

> `malloc` 返回 `void*`，C 里可以不写强制转换，但写上更清楚；`realloc` 失败时返回 `NULL` 且**不释放原指针**，所以要先存到临时变量再判断。

### 指针存的是地址，数组名会退化

指针变量里存的是一个地址；`*p` 是「去这个地址取值」，`&x` 是「取 x 的地址」。数组名在大多数表达式里会**退化**成指向首元素的指针，所以 `a[i]` 等价于 `*(a + i)`。

由此产生两个常见误解：

1. `sizeof(a)` 在数组定义的作用域里是数组总字节数，**传进函数后退化成指针，只剩 8 字节**；
2. 函数参数写 `int a[]` 和 `int *a` 完全等价，函数内部拿不到长度，必须额外传。

```c
#include <stdio.h>

// 参数写 int* 或 int[] 都一样：函数内部拿不到长度，sizeof 得到的是指针大小
static void showSize(int *arr) {
    printf("函数内 sizeof(arr) = %zu\n", sizeof(arr));   // 通常是 8
}

// 交换必须传地址，否则交换的只是形参副本
static void swap(int *a, int *b) {
    int t = *a;   // *a 取出 a 指向的值
    *a = *b;      // 把 b 指向的值写到 a 指向的位置
    *b = t;
}

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};

    // 在定义所在的作用域里，sizeof 知道完整长度
    printf("sizeof(a) = %zu，元素个数 = %zu\n", sizeof(a), sizeof(a) / sizeof(a[0]));
    showSize(a);

    int x = 1, y = 2;
    swap(&x, &y);              // 传地址，函数才能改到外面的变量
    printf("x = %d, y = %d\n", x, y);

    int *p = a;                // a 退化成 &a[0]
    printf("%d %d\n", a[2], *(p + 2));   // 两种写法完全等价
    return 0;
}
```

> 指针加减的单位是「元素个数」，不是字节：`p + 2` 前进 `2 * sizeof(int)` 个字节。这也是为什么指针要区分类型。

### 字符串是 `char` 数组加 `'\0'`

C 没有字符串类型。所谓字符串，就是一段连续 `char`，**以 `'\0'` 结尾**。所有字符串函数（`strlen`、`strcpy`、`printf("%s")`）都靠这个 `'\0'` 判断结束，忘了它就是越界读。

两种写法差别很大：

- `char s[] = "abc";` 在栈上分配 4 个字节（含 `'\0'`），可以改；
- `char *p = "abc";` 指向常量区的字面量，**不能改**，改了是未定义行为。

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "abc";          // 数组：4 个字节，内容是 a b c \0
    char *p = "abc";           // 指针：指向只读的字符串字面量

    printf("sizeof(s) = %zu, strlen(s) = %zu\n", sizeof(s), strlen(s));  // 4 和 3

    s[0] = 'A';                // 合法：数组在自己的栈空间里
    printf("%s\n", s);         // Abc

    // p[0] = 'A';             // 未定义行为：字面量在只读段，通常直接段错误

    printf("p 指向 %c，第 3 个字符是 %c\n", *p, *(p + 2));
    return 0;
}
```

> `strlen` 从起点一直数到 `'\0'`，所以复杂度是 O(n)，循环里反复 `strlen(s)` 会变成 O(n²)；需要长度就先存下来。

### C 在 OJ 上的易错点速查

| 写法 | 会出什么事 | 正确做法 |
|---|---|---|
| `int` 存 `1e9 + 1e9` | 溢出成负数，答案莫名其妙偏小 | 累加用 `long long`，输出用 `%lld` |
| `int a[1000000]` 开在 `main` 里 | 栈只有 8MB，大数组直接段错误 | 挪到全局（BSS）或 `malloc` |
| `while (scanf("%d", &x))` | 读到 EOF 时返回 `EOF`（-1），条件恒为真，死循环 | 写 `== 1` 或 `!= EOF` |
| `gets(buf)` | C11 已删除该函数，编译不过 | `fgets(buf, sizeof buf, stdin)` 再去掉末尾 `\n` |
| `if (a == b)` 比较字符串 | 比的是两个指针的地址 | `strcmp(a, b) == 0` |
| `char *p = "abc"; p[0] = 'A';` | 字符串字面量在只读段，运行时崩溃 | 要改就写 `char p[] = "abc";` |
| `memset(a, 1, sizeof a)` | 按字节填充，`int` 会变成 `0x01010101` | 只有 `0` 和 `-1` 能用 `memset` 批量赋值 |
| `qsort` 比较函数写 `return *b - *a;` | 大数相减溢出，排序结果错乱 | 按大小返回 `-1 / 0 / 1` |
| `sizeof arr` 传进函数 | 数组形参退化成指针，得到 8 | 长度单独作为参数传进去 |
| 多组数据忘了输出换行 / 每组之间空行 | 格式错误（Presentation Error） | 严格照题面的输出格式，一个字符都别多 |

## 一、输入输出与常用手法

机考的输入只有两种形态：**同一行里空格分隔**，或者**先给 n 再给 n 行**。C 的麻烦在于读一整行和按空格切分要自己拼，下面几段覆盖了绝大多数情况。

### 多组输入与读到 EOF

`scanf` 的返回值不是读到的值，而是**成功读入的项数**。读到文件末尾返回 `EOF`（通常是 -1）。判断 EOF 的两种写法里，`== 1` 更严：输入格式不对时能及时发现。

```c
#include <stdio.h>

int main(void) {
    int n;

    // 每组一个 n，后面紧跟 n 个整数；读到 EOF 时 scanf 返回 EOF，循环结束
    while (scanf("%d", &n) == 1) {
        long long sum = 0;   // 用 long long，防止 1e5 个 int 累加溢出

        for (int i = 0; i < n; i++) {
            int x;
            if (scanf("%d", &x) != 1) {
                return 0;    // 输入不完整，直接退出，避免用未初始化的 x
            }
            sum += x;
        }

        printf("%lld\n", sum);   // long long 必须用 %lld
    }
    return 0;
}
```

> `scanf("%d", &x)` 里的 `&` 不能省：`scanf` 要拿到地址才能把结果写回去。少写 `&` 通常编译能过、运行时崩溃。

### 读一整行，再按空格切分

`fgets` 最多读 `size - 1` 个字符，并且**把换行符也读进来**（缓冲区够大时）。所以读完要自己去掉末尾的 `\n`，否则最后一段会带换行。

切词用 `strtok`：它在原串上把分隔符改成 `'\0'`，返回每一段的起点。第二次起传 `NULL`，表示「接着上次的位置继续」。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define LINE_MAX 100005

int main(void) {
    char line[LINE_MAX];

    // fgets 读到一行返回 line，EOF 返回 NULL
    while (fgets(line, sizeof line, stdin) != NULL) {
        // strcspn 返回「第一个换行符的下标」，把它改成 '\0' 就去掉了换行
        line[strcspn(line, "\n")] = '\0';
        if (line[0] == '\0') continue;   // 空行跳过

        int sum = 0;
        int cnt = 0;

        // 第一次传原串；strtok 会就地修改它，把分隔符换成 '\0'
        char *tok = strtok(line, " \t");
        while (tok != NULL) {
            sum += atoi(tok);            // 字符串转 int；失败返回 0
            cnt++;
            tok = strtok(NULL, " \t");   // 之后一律传 NULL，继续切
        }

        printf("%d 个数，和 = %d\n", cnt, sum);
    }
    return 0;
}
```

> `strtok` 会**破坏原串**。如果后面还要用原始那一行，先 `strcpy` 一份。另外它不处理嵌套调用，多个字符串同时切要换 `strtok_r`。

不想改动原串时，用 `sscanf` 配 `%n` 按偏移往下扫：

```c
#include <stdio.h>

int main(void) {
    char line[] = "3 14 15 92 65";
    int off = 0;    // 当前扫到的位置
    int used = 0;   // 本次 sscanf 吃掉了多少字符
    int x;

    // %n 不读输入，只把「到目前消费的字符数」写进 used
    while (sscanf(line + off, "%d%n", &x, &used) == 1) {
        printf("%d ", x);
        off += used;   // 指针右移，继续读下一个
    }
    printf("\n");
    return 0;
}
```

### 格式化输出

```c
#include <stdio.h>

int main(void) {
    double pi = 3.14159265;

    // %5d 宽度 5 右对齐；%-5d 左对齐；%05d 左边补零
    printf("[%d] [%5d] [%-5d] [%05d]\n", 42, 42, 42, 42);
    // %.2f 两位小数；%8.3f 总宽 8、三位小数；%e 科学计数法
    printf("[%.2f] [%8.3f] [%e]\n", pi, pi, pi);
    // %s 字符串；%10s 右对齐；%-10s 左对齐
    printf("[%s] [%10s] [%-10s]\n", "abc", "abc", "abc");
    // %c 字符、%x 十六进制、%o 八进制；long long 用 %lld
    printf("[%c] [%x] [%o] [%lld]\n", 'A', 255, 255, 1234567890123LL);
    // 想输出一个 %，格式串里写两个
    printf("100%%\n");
    return 0;
}
```

> 格式符和参数类型必须匹配：`%d` 传 `long long` 是未定义行为，Linux 上通常只打印低 32 位。**`size_t` 用 `%zu`，`long long` 用 `%lld`。**

### `qsort` 与结构体排序

`qsort` 的签名是 `qsort(数组, 元素个数, 每个元素字节数, 比较函数)`。比较函数收到的是**两个元素的地址**（`const void *`），要先转成真实类型再取值。

返回值约定：负数表示 a 排前面，正数表示 b 排前面，0 表示相等。**不要写 `return a - b`**：大数相减会溢出 `int`，符号翻转后排序结果就错了。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 升序：只返回 -1 / 0 / 1，不产生溢出
int cmpInt(const void *a, const void *b) {
    int x = *(const int *)a;   // 先转成 int*，再解引用取值
    int y = *(const int *)b;
    return (x > y) - (x < y);  // x>y 得 1，x<y 得 -1，相等得 0
}

typedef struct {
    char name[32];
    int score;
} Student;

// 先按分数降序，同分按名字升序
int cmpStudent(const void *a, const void *b) {
    const Student *p = (const Student *)a;
    const Student *q = (const Student *)b;

    if (p->score != q->score) {
        // 注意方向：q->score 在前表示分数高的排前面
        return (p->score < q->score) - (p->score > q->score);
    }
    // strcmp 返回负/零/正，正好符合比较器的约定
    return strcmp(p->name, q->name);
}

// 字符串数组：元素类型是 char[32]，qsort 传进来的是 char(*)[32]
int cmpString(const void *a, const void *b) {
    // 转成 const char* 后，地址相同，strcmp 就能按内容比较
    return strcmp((const char *)a, (const char *)b);
}

int main(void) {
    int a[] = {5, 2, 9, 1, 7};
    int n = (int)(sizeof a / sizeof a[0]);

    // 第四个参数是函数名，传函数指针
    qsort(a, (size_t)n, sizeof a[0], cmpInt);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");

    Student s[] = {{"Tom", 90}, {"Ann", 95}, {"Bob", 90}};
    int m = (int)(sizeof s / sizeof s[0]);

    // sizeof s[0] 是结构体总字节数，qsort 靠它算每个元素的步长
    qsort(s, (size_t)m, sizeof s[0], cmpStudent);
    for (int i = 0; i < m; i++) printf("%s:%d ", s[i].name, s[i].score);
    printf("\n");

    char words[][32] = {"pear", "apple", "fig"};
    int k = (int)(sizeof words / sizeof words[0]);

    // 每个元素是 32 字节的字符数组，所以步长是 sizeof words[0]
    qsort(words, (size_t)k, sizeof words[0], cmpString);
    for (int i = 0; i < k; i++) printf("%s ", words[i]);
    printf("\n");
    return 0;
}
```

> 比较器里 `*(int *)a` 的强制转换不能省：`void*` 不能直接解引用。`const` 只是承诺不改，转换时最好一起带上。

### 位运算

位运算在机考里主要用于四件事：取最低位的 1、数 1 的个数、枚举子集、快速幂。

```c
#include <stdio.h>

// 最低位的 1：x & -x。例如 12(1100) 得到 4(0100)
static int lowbit(int x) {
    return x & -x;
}

// 二进制里 1 的个数：每次消掉最低位的 1，循环次数就是 1 的个数
static int popcount(unsigned x) {
    int c = 0;
    while (x) {
        x &= x - 1;   // 把最低位的 1 变成 0
        c++;
    }
    return c;
}

// 快速幂：b^e mod m，把指数按二进制拆开，每轮平方
static long long powmod(long long b, long long e, long long m) {
    long long r = 1 % m;   // m 为 1 时结果是 0
    b %= m;                // 先缩小底数，防止第一轮就溢出

    while (e > 0) {
        if (e & 1) {                 // 当前二进制位是 1，乘进结果
            r = r * b % m;
        }
        b = b * b % m;               // 底数平方
        e >>= 1;                     // 指数右移一位
    }
    return r;
}

// 辗转相除
static int gcd(int a, int b) {
    while (b) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}

// 先除后乘，防止 a * b 溢出
static int lcm(int a, int b) {
    return a / gcd(a, b) * b;
}

int main(void) {
    printf("lowbit(12) = %d\n", lowbit(12));            // 4
    printf("popcount(45) = %d\n", popcount(45));        // 45 = 101101，4 个 1
    printf("2^10 mod 1000 = %lld\n", powmod(2, 10, 1000));   // 24
    printf("gcd(12, 18) = %d, lcm = %d\n", gcd(12, 18), lcm(12, 18));

    // 枚举 mask 的全部非空子集：每次去掉一个元素，直到 0
    int mask = 0b1011;
    for (int sub = mask; sub; sub = (sub - 1) & mask) {
        printf("%d ", sub);
    }
    printf("\n");
    return 0;
}
```

> 对 `INT_MIN` 取负是未定义行为，`lowbit(INT_MIN)` 在部分平台会得到自身。机考数据一般不会这么极端，但知道这个边界有好处。
## 二、数据结构

C 没有现成容器，所以每样都得手写。下面每个结构都按「它解决什么问题 → 内存怎么组织 → 代码」走，行数控制在能背下来的规模。

### 动态数组（手写 vector）

数组长度固定。要一直往末尾追加，只有两条路：每次满了新建「原长度 + 1」的数组并复制，或者**按倍数扩容**。前者 n 次追加要复制 O(n²) 个元素；后者容量翻倍，复制总量是 `1+2+4+…+n < 2n`，均摊到每次就是 O(1)。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;   // 指向堆上的数组
    int size;    // 有效元素个数
    int cap;     // 已申请的容量，单位是「元素个数」
} Vec;

// 初始化：先不分配，第一次 push 时再要内存
static void vecInit(Vec *v) {
    v->data = NULL;
    v->size = 0;
    v->cap = 0;
}

// 保证容量至少为 need；成功返回 1，失败返回 0
static int vecReserve(Vec *v, int need) {
    if (need <= v->cap) return 1;   // 已经够用

    int cap = v->cap ? v->cap * 2 : 4;   // 空表从 4 开始，之后翻倍
    while (cap < need) cap *= 2;         // need 跳得太大时继续翻

    // realloc 可能搬移内存，所以必须用返回值覆盖旧指针
    int *p = (int *)realloc(v->data, (size_t)cap * sizeof(int));
    if (p == NULL) return 0;   // 失败时 v->data 仍然有效

    v->data = p;
    v->cap = cap;
    return 1;
}

// 末尾追加
static int vecPush(Vec *v, int x) {
    if (!vecReserve(v, v->size + 1)) return 0;

    // 先写再自增：x 放在下标 size，长度加一
    v->data[v->size++] = x;
    return 1;
}

// 释放：只释放 data，结构体本身在栈上
static void vecFree(Vec *v) {
    free(v->data);
    v->data = NULL;
    v->size = 0;
    v->cap = 0;
}

int main(void) {
    Vec v;
    vecInit(&v);

    // 追加 10 个元素，期间容量会从 4 扩到 8、16
    for (int i = 0; i < 10; i++) vecPush(&v, i * i);

    // 只遍历 size 个，不要遍历 cap 个
    for (int i = 0; i < v.size; i++) printf("%d ", v.data[i]);
    printf("\n容量 = %d，长度 = %d\n", v.cap, v.size);

    vecFree(&v);
    return 0;
}
```

> `realloc` 失败时返回 `NULL`，但**原来的那块内存还在**。所以不能写 `v->data = realloc(...)` 直接覆盖，否则失败后旧指针丢了，内存泄漏。

### 链表

链表用「每个节点记住下一个节点在哪」代替连续内存。节点在堆上单独分配，所以插入删除只改指针，不用搬移其他元素；代价是不能按下标直接算地址。

谁申请谁释放：`malloc` 出来的节点要逐个 `free`，循环链表还要先断开环，否则会绕圈。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct SNode {
    int data;
    struct SNode *next;
} SNode;

typedef struct DNode {
    int data;
    struct DNode *prev;
    struct DNode *next;
} DNode;

// 新建节点：malloc 只分配，不初始化内容
static SNode *sNewNode(int data) {
    SNode *node = (SNode *)malloc(sizeof(SNode));
    if (node == NULL) return NULL;
    node->data = data;
    node->next = NULL;
    return node;
}

// 头插：新节点成为新的头，O(1)
static void sInsert(SNode **head, int data) {
    SNode *node = sNewNode(data);
    if (node == NULL) return;

    node->next = *head;   // 新节点指向原来的头
    *head = node;         // 再让头指针指向新节点
}

// 按值查找，返回节点指针；找不到返回 NULL
static SNode *sSearch(SNode *head, int data) {
    for (SNode *cur = head; cur != NULL; cur = cur->next) {
        if (cur->data == data) return cur;
    }
    return NULL;
}

// 反转：prev 是已反转部分的头，head 是未反转部分的头
static SNode *sReverse(SNode *head) {
    SNode *prev = NULL;

    while (head != NULL) {
        // 先存 next，否则改完 head->next 就找不到后面
        SNode *next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;   // 循环结束时 prev 是新的头
}

// 打印：空链表也要能处理
static void sPrint(const char *tag, SNode *head) {
    printf("%s", tag);
    for (SNode *cur = head; cur != NULL; cur = cur->next) {
        printf("%d%s", cur->data, cur->next ? " -> " : "");
    }
    printf("\n");
}

// 释放整条链表：先把 next 存下来，再 free 当前节点
static void sFree(SNode *head) {
    while (head != NULL) {
        SNode *next = head->next;
        free(head);
        head = next;
    }
}

// 双向链表头插：要同时维护 prev 和 next
static void dInsert(DNode **head, int data) {
    DNode *node = (DNode *)malloc(sizeof(DNode));
    if (node == NULL) return;

    node->data = data;
    node->prev = NULL;     // 新节点是头，前面没有节点
    node->next = *head;

    // 原来的头如果存在，它的 prev 要改成新节点
    if (*head != NULL) (*head)->prev = node;
    *head = node;
}

// 双向链表查找
static DNode *dSearch(DNode *head, int data) {
    for (DNode *cur = head; cur != NULL; cur = cur->next) {
        if (cur->data == data) return cur;
    }
    return NULL;
}

// 循环单链表头插：插在头结点之后，再交换值，
// 效果等同于「新节点变成头」，但不用改动外部的 head 指针
static void cInsert(SNode **head, int data) {
    SNode *node = sNewNode(data);
    if (node == NULL) return;

    if (*head == NULL) {
        node->next = node;   // 只有一个节点时，next 指向自己
        *head = node;
        return;
    }

    node->next = (*head)->next;   // 新节点接到头后面
    (*head)->next = node;

    // 交换值：让新值留在头结点上
    int tmp = (*head)->data;
    (*head)->data = node->data;
    node->data = tmp;
}

// 循环链表查找：从 head 出发，绕一圈回到 head 停止
static SNode *cSearch(SNode *head, int data) {
    if (head == NULL) return NULL;

    SNode *cur = head;
    do {
        if (cur->data == data) return cur;
        cur = cur->next;
    } while (cur != head);

    return NULL;
}

// 循环链表打印：用 do-while 保证头节点先打印一次
static void cPrint(const char *tag, SNode *head) {
    printf("%s", tag);
    if (head == NULL) {
        printf("\n");
        return;
    }

    SNode *cur = head;
    do {
        printf("%d%s", cur->data, cur->next == head ? "" : " -> ");
        cur = cur->next;
    } while (cur != head);
    printf("\n");
}

// 释放循环链表前必须先断环，否则 sFree 会无限绕圈
static void cFree(SNode *head) {
    if (head == NULL) return;

    SNode *cur = head;
    while (cur->next != head) cur = cur->next;   // 找到最后一个节点
    cur->next = NULL;                            // 断环，变成普通单链表
    sFree(head);
}

int main(void) {
    SNode *list = NULL;
    for (int i = 1; i <= 3; i++) sInsert(&list, i);
    sPrint("单链表: ", list);

    printf("查找 2: %s\n", sSearch(list, 2) ? "找到" : "没有");
    list = sReverse(list);
    sPrint("反转后: ", list);
    sFree(list);

    DNode *dlist = NULL;
    dInsert(&dlist, 1);
    dInsert(&dlist, 2);
    printf("双向链表正向: ");
    for (DNode *cur = dlist; cur != NULL; cur = cur->next) printf("%d ", cur->data);

    // 反向遍历：先走到尾，再沿 prev 回来
    DNode *tail = dlist;
    while (tail->next != NULL) tail = tail->next;
    printf("\n双向链表反向: ");
    for (DNode *cur = tail; cur != NULL; cur = cur->prev) printf("%d ", cur->data);
    printf("\n查找 1: %s\n", dSearch(dlist, 1) ? "找到" : "没有");

    // 释放双向链表
    while (dlist != NULL) {
        DNode *next = dlist->next;
        free(dlist);
        dlist = next;
    }

    SNode *clist = NULL;
    for (int i = 1; i <= 3; i++) cInsert(&clist, i);
    cPrint("循环链表: ", clist);
    printf("查找 3: %s\n", cSearch(clist, 3) ? "找到" : "没有");
    cFree(clist);
    return 0;
}
```

> 头插要传 `SNode **head`（二级指针）：函数要修改「头指针本身」，只传 `SNode *` 改的是副本。这是 C 里最常见的一类错误。

### 栈（Stack）

栈是后进先出。用数组实现只需要一个 `top` 下标：入栈是 `data[++top] = x`，出栈是 `data[top--]`。**所有操作 O(1)**。

```c
#include <stdio.h>
#include <string.h>

#define MAX_SIZE 100

typedef struct {
    int data[MAX_SIZE];
    int top;          // 指向栈顶元素；空栈为 -1
} Stack;

static void initStack(Stack *s) {
    s->top = -1;
}

static int isEmpty(const Stack *s) {
    return s->top == -1;
}

static int isFull(const Stack *s) {
    return s->top == MAX_SIZE - 1;
}

static void push(Stack *s, int value) {
    if (!isFull(s)) {
        s->data[++(s->top)] = value;   // 先自增，再写
    }
}

// 出栈：空栈时返回 -1 只是兜底，调用处应自己判空
static int pop(Stack *s) {
    if (isEmpty(s)) return -1;
    return s->data[(s->top)--];        // 先取值，再自减
}

static int peek(const Stack *s) {
    if (isEmpty(s)) return -1;
    return s->data[s->top];
}

// 三种括号都要匹配：栈里存左括号，遇到右括号就核对
static int isBalanced(const char *expression) {
    Stack s;
    initStack(&s);

    for (int i = 0; expression[i] != '\0'; i++) {
        char c = expression[i];

        if (c == '(' || c == '[' || c == '{') {
            push(&s, c);              // 左括号入栈
        } else if (c == ')' || c == ']' || c == '}') {
            if (isEmpty(&s)) return 0;   // 右括号多了

            char open = (char)pop(&s);
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{')) {
                return 0;             // 类型不匹配
            }
        }
    }

    return isEmpty(&s);   // 左括号也必须全部配对
}

// 后缀表达式求值：操作数只支持一位数字，多位需要按空格切分
static int evaluatePostfix(const char *expression) {
    Stack s;
    initStack(&s);

    for (int i = 0; expression[i] != '\0'; i++) {
        char c = expression[i];

        if (c >= '0' && c <= '9') {
            push(&s, c - '0');        // 字符转数字
        } else if (c == '+' || c == '-' || c == '*' || c == '/') {
            // 注意顺序：先弹出的是右操作数
            int b = pop(&s);
            int a = pop(&s);

            switch (c) {
                case '+': push(&s, a + b); break;
                case '-': push(&s, a - b); break;
                case '*': push(&s, a * b); break;
                case '/': push(&s, b == 0 ? 0 : a / b); break;
            }
        }
    }
    return pop(&s);
}

int main(void) {
    const char *cases[] = {"{([])}", "([)]", "(((", "a[b]{c}"};
    for (int i = 0; i < 4; i++) {
        printf("%-10s -> %s\n", cases[i], isBalanced(cases[i]) ? "匹配" : "不匹配");
    }

    printf("53+82-* = %d\n", evaluatePostfix("53+82-*"));

    // peek 演示：只读不删
    Stack s;
    initStack(&s);
    push(&s, 7);
    push(&s, 9);
    printf("栈顶: %d\n", peek(&s));   // 9
    printf("出栈: %d\n", pop(&s));    // 9
    return 0;
}
```

> 出栈前先判空：`pop` 返回 `-1` 只是兜底，空栈仍然取到 -1 会让答案悄悄错掉，真正的判断要在调用处写。

### 队列（Queue）

队列是先进先出。顺序队列的 `rear` 一路往后走，出队后前面的空间再也用不到（假溢出）；实际都用**循环队列**：头尾指针取模回绕。

```c
#include <stdio.h>

#define MAX_SIZE 10

// 顺序队列：rear 走到 MAX_SIZE 就再也放不进东西
typedef struct {
    int data[MAX_SIZE];
    int front;
    int rear;
} SeqQueue;

static void initSeqQueue(SeqQueue *q) {
    q->front = q->rear = 0;
}

static int seqEnqueue(SeqQueue *q, int value) {
    if (q->rear == MAX_SIZE) return 0;   // 满（可能是假溢出）
    q->data[q->rear++] = value;
    return 1;
}

static int seqDequeue(SeqQueue *q) {
    if (q->front == q->rear) return -1;  // 空
    return q->data[q->front++];
}

// 循环队列：用「牺牲一格」区分空和满
typedef struct {
    int data[MAX_SIZE];
    int front;
    int rear;
} CirQueue;

static void initCirQueue(CirQueue *q) {
    q->front = q->rear = 0;
}

static int cirEnqueue(CirQueue *q, int value) {
    // 尾指针再走一格就撞上头，说明满了
    if ((q->rear + 1) % MAX_SIZE == q->front) return 0;

    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % MAX_SIZE;   // 回绕
    return 1;
}

static int cirDequeue(CirQueue *q) {
    if (q->front == q->rear) return -1;   // 空

    int value = q->data[q->front];
    q->front = (q->front + 1) % MAX_SIZE;   // 回绕
    return value;
}

// 按完全二叉树的下标关系做层序遍历：节点 i 的孩子是 2i 和 2i+1
static void bfsSimulation(void) {
    CirQueue q;
    initCirQueue(&q);
    cirEnqueue(&q, 1);

    while (q.front != q.rear) {
        int node = cirDequeue(&q);
        printf("%d ", node);

        // 模拟把左右孩子入队
        if (node * 2 <= 10) cirEnqueue(&q, node * 2);
        if (node * 2 + 1 <= 10) cirEnqueue(&q, node * 2 + 1);
    }
    printf("\n");
}

int main(void) {
    SeqQueue seqQ;
    initSeqQueue(&seqQ);
    seqEnqueue(&seqQ, 1);
    seqEnqueue(&seqQ, 2);
    printf("顺序队列出队: %d\n", seqDequeue(&seqQ));

    CirQueue cirQ;
    initCirQueue(&cirQ);
    cirEnqueue(&cirQ, 3);
    cirEnqueue(&cirQ, 4);
    printf("循环队列出队: %d\n", cirDequeue(&cirQ));

    printf("层序遍历: ");
    bfsSimulation();
    return 0;
}
```

> 循环队列的容量是 `MAX_SIZE - 1`：留一个空位才能用 `front == rear` 表示空、`(rear + 1) % MAX_SIZE == front` 表示满。要存 n 个元素就把 `MAX_SIZE` 开到 n + 1。

### 堆（Heap）

堆是一棵完全二叉树，直接存在数组里：下标 `i` 的左孩子是 `2i+1`，右孩子是 `2i+2`，父亲是 `(i-1)/2`。它只维护「每个节点都不大于孩子」这一条性质，所以取最值 O(1)、插入删除 O(log n)。

```c
#include <stdio.h>

#define HEAP_CAP 100005

// 小顶堆：根是最小值。要大顶堆就存 -x，或者把两处比较反过来
typedef struct {
    int a[HEAP_CAP];
    int size;
} MinHeap;

static void heapInit(MinHeap *h) {
    h->size = 0;
}

static void heapSwap(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

// 上浮：新元素放末尾，只要比父亲小就交换
static void heapPush(MinHeap *h, int x) {
    int i = h->size++;
    h->a[i] = x;

    while (i > 0) {
        int parent = (i - 1) / 2;
        if (h->a[parent] <= h->a[i]) break;   // 已经满足堆序
        heapSwap(&h->a[parent], &h->a[i]);
        i = parent;
    }
}

// 下沉：根和末尾交换（删掉根），再让新根沉下去
static int heapPop(MinHeap *h) {
    int top = h->a[0];            // 要返回的最小值
    h->a[0] = h->a[--h->size];    // 末尾搬到根，长度减一

    int i = 0;
    for (;;) {
        int left = 2 * i + 1;
        int right = left + 1;
        int smallest = i;

        // 在「自己、左孩子、右孩子」里找最小
        if (left < h->size && h->a[left] < h->a[smallest]) smallest = left;
        if (right < h->size && h->a[right] < h->a[smallest]) smallest = right;
        if (smallest == i) break;

        heapSwap(&h->a[i], &h->a[smallest]);
        i = smallest;
    }
    return top;
}

// 建堆：从最后一个非叶节点往前下沉，整体 O(n)
static void heapBuild(MinHeap *h, const int *arr, int n) {
    h->size = n;
    for (int i = 0; i < n; i++) h->a[i] = arr[i];

    for (int i = n / 2 - 1; i >= 0; i--) {
        int j = i;
        for (;;) {
            int left = 2 * j + 1;
            int right = left + 1;
            int smallest = j;
            if (left < n && h->a[left] < h->a[smallest]) smallest = left;
            if (right < n && h->a[right] < h->a[smallest]) smallest = right;
            if (smallest == j) break;
            heapSwap(&h->a[j], &h->a[smallest]);
            j = smallest;
        }
    }
}

int main(void) {
    // 10 万个 int 放栈上要 400KB，放静态区更稳
    static MinHeap h;
    heapInit(&h);

    int nums[] = {5, 3, 8, 1, 9, 2};
    for (int i = 0; i < 6; i++) heapPush(&h, nums[i]);

    printf("依次弹出: ");
    while (h.size > 0) printf("%d ", heapPop(&h));
    printf("\n");

    // 建堆 O(n)，比逐个 push 的 O(n log n) 快
    heapBuild(&h, nums, 6);
    printf("建堆后弹出: ");
    while (h.size > 0) printf("%d ", heapPop(&h));
    printf("\n");
    return 0;
}
```

> `heapPop` 假定堆非空：`size == 0` 时先 `--size` 会变成 -1，数组访问直接越界。取堆顶前先判 `h->size > 0`。

### 哈希表

顺序查找 O(n)，哈希表均摊 O(1)。做法是 key 对桶数取模得到下标，冲突的元素挂在同一个桶的链表里。

```c
#include <stdio.h>
#include <stdlib.h>

#define TABLE_SIZE 1009   // 取质数，取模分布更均匀

// 桶里的链表节点
typedef struct HashNode {
    int key;
    int value;
    struct HashNode *next;
} HashNode;

typedef struct {
    HashNode *table[TABLE_SIZE];
} HashTable;

static void initHashTable(HashTable *ht) {
    for (int i = 0; i < TABLE_SIZE; i++) {
        ht->table[i] = NULL;   // 每个桶先为空
    }
}

// 负数取模在 C 里是负的，先加一次桶数再取模
static int hashFunction(int key) {
    int h = key % TABLE_SIZE;
    return h < 0 ? h + TABLE_SIZE : h;
}

// 插入或覆盖
static int insertHash(HashTable *ht, int key, int value) {
    int index = hashFunction(key);

    // 先查同 key：存在就覆盖，不新建节点
    for (HashNode *cur = ht->table[index]; cur != NULL; cur = cur->next) {
        if (cur->key == key) {
            cur->value = value;
            return 1;
        }
    }

    // 头插：O(1)，不用遍历到链表尾
    HashNode *node = (HashNode *)malloc(sizeof(HashNode));
    if (node == NULL) return 0;

    node->key = key;
    node->value = value;
    node->next = ht->table[index];
    ht->table[index] = node;
    return 1;
}

// 查询：用出参带回值，返回值表示找没找到
// 不能用 -1 当哨兵 —— value 本身可能就是 -1
static int hashSearch(const HashTable *ht, int key, int *out) {
    int index = hashFunction(key);

    for (const HashNode *cur = ht->table[index]; cur != NULL; cur = cur->next) {
        if (cur->key == key) {
            *out = cur->value;
            return 1;
        }
    }
    return 0;
}

// 删除：链表删除要维护前驱
static int hashDelete(HashTable *ht, int key) {
    int index = hashFunction(key);

    // link 指向「指向当前节点的指针」，这样删头节点和删中间节点用同一套代码
    HashNode **link = &ht->table[index];
    while (*link != NULL) {
        if ((*link)->key == key) {
            HashNode *dead = *link;
            *link = dead->next;   // 前驱直接跳过当前节点
            free(dead);
            return 1;
        }
        link = &(*link)->next;
    }
    return 0;
}

static void hashFree(HashTable *ht) {
    for (int i = 0; i < TABLE_SIZE; i++) {
        HashNode *cur = ht->table[i];
        while (cur != NULL) {
            HashNode *next = cur->next;
            free(cur);
            cur = next;
        }
        ht->table[i] = NULL;
    }
}

int main(void) {
    HashTable ht;
    initHashTable(&ht);

    for (int i = 0; i < 10; i++) insertHash(&ht, i * 100, i);

    int value = 0;
    printf("查 500: %s %d\n", hashSearch(&ht, 500, &value) ? "找到" : "没有", value);
    printf("查 123: %s\n", hashSearch(&ht, 123, &value) ? "找到" : "没有");
    printf("删 500: %s\n", hashDelete(&ht, 500) ? "成功" : "没有这个键");
    printf("再查 500: %s\n", hashSearch(&ht, 500, &value) ? "找到" : "没有");

    hashFree(&ht);
    return 0;
}
```

> 桶数要大于元素数，否则链表变长，O(1) 退化成 O(n)。负载因子（元素数 / 桶数）超过 0.75 左右就该扩容。

### 并查集（Union-Find）

并查集只回答两个问题：某个元素属于哪个集合、把两个集合并起来。每个集合用一个「代表」（根）标识，`parent[x]` 指向父节点，根指向自己。

两个优化：**路径压缩**（查的时候把沿途节点挂到根上）、**按大小合并**（小树挂到大树下）。一起用，单次操作接近 O(1)。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *parent;   // parent[x] = 父亲；根的父亲是自己
    int *size;     // size[root] = 集合大小
    int n;
} DSU;

static int dsuInit(DSU *d, int n) {
    d->parent = (int *)malloc((size_t)n * sizeof(int));
    d->size = (int *)malloc((size_t)n * sizeof(int));

    // 两个分配只要有一个失败，就把另一个也释放，避免泄漏
    if (d->parent == NULL || d->size == NULL) {
        free(d->parent);
        free(d->size);
        d->parent = d->size = NULL;
        d->n = 0;
        return 0;
    }

    d->n = n;
    for (int i = 0; i < n; i++) {
        d->parent[i] = i;   // 初始各自成一个集合
        d->size[i] = 1;
    }
    return 1;
}

// 找根 + 路径压缩（迭代写法，不怕递归深度）
static int dsuFind(DSU *d, int x) {
    int root = x;
    while (d->parent[root] != root) root = d->parent[root];

    // 第二遍：把沿途节点直接挂到根上
    while (d->parent[x] != root) {
        int next = d->parent[x];
        d->parent[x] = root;
        x = next;
    }
    return root;
}

// 合并：小集合挂到大集合下面。返回 1 表示真的合并了两个不同集合
static int dsuUnion(DSU *d, int a, int b) {
    int ra = dsuFind(d, a);
    int rb = dsuFind(d, b);
    if (ra == rb) return 0;   // 已经同集合

    if (d->size[ra] < d->size[rb]) {
        int t = ra;
        ra = rb;
        rb = t;
    }

    d->parent[rb] = ra;
    d->size[ra] += d->size[rb];
    return 1;
}

static void dsuFree(DSU *d) {
    free(d->parent);
    free(d->size);
    d->parent = d->size = NULL;
    d->n = 0;
}

int main(void) {
    DSU d;
    if (!dsuInit(&d, 6)) return 1;

    dsuUnion(&d, 0, 1);
    dsuUnion(&d, 1, 2);
    dsuUnion(&d, 4, 5);

    // 根的数量就是连通块个数
    int components = 0;
    for (int i = 0; i < 6; i++) {
        if (dsuFind(&d, i) == i) components++;
    }
    printf("连通块个数 = %d\n", components);
    printf("0 和 2 连通: %s\n", dsuFind(&d, 0) == dsuFind(&d, 2) ? "是" : "否");
    printf("0 和 4 连通: %s\n", dsuFind(&d, 0) == dsuFind(&d, 4) ? "是" : "否");

    dsuFree(&d);
    return 0;
}
```

> `union` 返回「是否真的合并了两个不同集合」很有用：Kruskal 靠它判断加这条边会不会成环。

### 树（Tree）

机考里 90% 的树是二叉树，核心约定只有一条：**左子树所有值 < 根 < 右子树所有值**（BST）。查找时每比较一次排除一半子树，平均 O(log n)。

但 BST 不保证平衡：按 `1,2,3,4,5` 插入会退化成一条链。AVL 用**平衡因子**（左高 − 右高）监控，绝对值超过 1 就旋转。

旋转改的是三条边，不是值。右旋：`y` 的左孩子 `x` 上位，`y` 变成 `x` 的右孩子，`x` 原来的右子树挂到 `y` 左边。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct TreeNode {
    int data;
    int height;              // 以该节点为根的子树高度
    struct TreeNode *left;
    struct TreeNode *right;
} TreeNode;

static int height(const TreeNode *node) {
    return node ? node->height : 0;   // 空树高度 0，叶子 1
}

static int max(int a, int b) {
    return a > b ? a : b;
}

static TreeNode *newNode(int data) {
    TreeNode *node = (TreeNode *)malloc(sizeof(TreeNode));
    if (node == NULL) return NULL;

    node->data = data;
    node->height = 1;        // 新节点是叶子
    node->left = node->right = NULL;
    return node;
}

// 右旋：左孩子上位
static TreeNode *rightRotate(TreeNode *y) {
    TreeNode *x = y->left;   // x 旋转后当根
    TreeNode *t2 = x->right; // T2 要挂到 y 左边

    x->right = y;
    y->left = t2;

    // 先更新 y：它现在是 x 的孩子
    y->height = max(height(y->left), height(y->right)) + 1;
    x->height = max(height(x->left), height(x->right)) + 1;
    return x;
}

// 左旋：右孩子上位
static TreeNode *leftRotate(TreeNode *x) {
    TreeNode *y = x->right;
    TreeNode *t2 = y->left;

    y->left = x;
    x->right = t2;

    x->height = max(height(x->left), height(x->right)) + 1;
    y->height = max(height(y->left), height(y->right)) + 1;
    return y;
}

// 平衡因子 = 左高 - 右高
static int getBalance(const TreeNode *node) {
    return node ? height(node->left) - height(node->right) : 0;
}

// AVL 插入：按 BST 插到底，回溯时修正四种失衡
static TreeNode *insertAVL(TreeNode *node, int data) {
    if (!node) return newNode(data);

    if (data < node->data) {
        node->left = insertAVL(node->left, data);
    } else if (data > node->data) {
        node->right = insertAVL(node->right, data);
    } else {
        return node;   // 重复值不插入
    }

    node->height = 1 + max(height(node->left), height(node->right));
    int balance = getBalance(node);

    if (balance > 1 && data < node->left->data) return rightRotate(node);   // 左左
    if (balance < -1 && data > node->right->data) return leftRotate(node);  // 右右
    if (balance > 1 && data > node->left->data) {                           // 左右
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }
    if (balance < -1 && data < node->right->data) {                         // 右左
        node->right = rightRotate(node->right);
        return leftRotate(node);
    }
    return node;
}

// 普通 BST 插入
static TreeNode *insertBST(TreeNode *root, int data) {
    if (root == NULL) return newNode(data);
    if (data < root->data) root->left = insertBST(root->left, data);
    else if (data > root->data) root->right = insertBST(root->right, data);
    return root;
}

static TreeNode *minValueNode(TreeNode *node) {
    while (node && node->left != NULL) node = node->left;
    return node;
}

// 删除：独子直接顶替；两个孩子用右子树最小值顶替
static TreeNode *deleteNode(TreeNode *root, int data) {
    if (root == NULL) return NULL;

    if (data < root->data) {
        root->left = deleteNode(root->left, data);
    } else if (data > root->data) {
        root->right = deleteNode(root->right, data);
    } else {
        if (root->left == NULL) {
            TreeNode *right = root->right;
            free(root);
            return right;
        }
        if (root->right == NULL) {
            TreeNode *left = root->left;
            free(root);
            return left;
        }

        TreeNode *succ = minValueNode(root->right);
        root->data = succ->data;
        root->right = deleteNode(root->right, succ->data);
    }
    return root;
}

// 前序：根 → 左 → 右
static void preOrder(const TreeNode *root) {
    if (root == NULL) return;
    printf("%d ", root->data);
    preOrder(root->left);
    preOrder(root->right);
}

// 中序：左 → 根 → 右，BST 的中序是升序
static void inOrder(const TreeNode *root) {
    if (root == NULL) return;
    inOrder(root->left);
    printf("%d ", root->data);
    inOrder(root->right);
}

// 后序：左 → 右 → 根
static void postOrder(const TreeNode *root) {
    if (root == NULL) return;
    postOrder(root->left);
    postOrder(root->right);
    printf("%d ", root->data);
}

// 层序：用数组当队列
static void levelOrder(const TreeNode *root) {
    if (root == NULL) return;

    const TreeNode *queue[128];
    int front = 0;
    int rear = 0;

    queue[rear++] = root;
    while (front < rear) {
        const TreeNode *cur = queue[front++];
        printf("%d ", cur->data);

        if (cur->left) queue[rear++] = cur->left;
        if (cur->right) queue[rear++] = cur->right;
    }
}

static void freeTree(TreeNode *root) {
    if (root == NULL) return;
    freeTree(root->left);
    freeTree(root->right);
    free(root);
}

int main(void) {
    TreeNode *avl = NULL;
    int keys[] = {10, 20, 30, 40, 50, 25};
    for (int i = 0; i < 6; i++) avl = insertAVL(avl, keys[i]);

    printf("AVL 前序: ");
    preOrder(avl);
    printf("\nAVL 中序: ");
    inOrder(avl);
    printf("\nAVL 后序: ");
    postOrder(avl);
    printf("\nAVL 层序: ");
    levelOrder(avl);
    printf("\n");
    freeTree(avl);

    TreeNode *bst = NULL;
    int keys2[] = {50, 30, 70, 20, 40, 60, 80};
    for (int i = 0; i < 7; i++) bst = insertBST(bst, keys2[i]);

    bst = deleteNode(bst, 30);
    printf("BST 删除 30 后中序: ");
    inOrder(bst);
    printf("\n");
    freeTree(bst);
    return 0;
}
```

> AVL 的删除没有写：四种失衡加「删除后继」的组合分支很容易漏。机考基本只考插入和查询，**别在考场上手写 AVL 删除**。

### 字典树（Trie）

Trie 把字符串按字符逐层拆开，公共前缀只存一份。每个节点记两个数：`pass` 表示有多少单词经过这里，`end` 表示有多少单词在这里结束。

```c
#include <stdio.h>
#include <stdlib.h>

#define ALPHABET 26

typedef struct TrieNode {
    struct TrieNode *child[ALPHABET];   // 26 条边
    int pass;                           // 前缀计数
    int end;                            // 完整单词计数
} TrieNode;

// calloc 会把 child 数组清零，等价于「所有边都不存在」
static TrieNode *trieNewNode(void) {
    return (TrieNode *)calloc(1, sizeof(TrieNode));
}

static void trieInsert(TrieNode *root, const char *word) {
    TrieNode *cur = root;

    for (int i = 0; word[i] != '\0'; i++) {
        int idx = word[i] - 'a';
        if (idx < 0 || idx >= ALPHABET) continue;

        if (cur->child[idx] == NULL) {
            cur->child[idx] = trieNewNode();   // 没有边就新建
        }
        cur = cur->child[idx];
        cur->pass++;   // 每经过一个节点，前缀计数加一
    }
    cur->end++;        // 最后一个节点：完整单词计数加一
}

// 完整单词出现次数
static int trieSearch(const TrieNode *root, const char *word) {
    const TrieNode *cur = root;

    for (int i = 0; word[i] != '\0'; i++) {
        int idx = word[i] - 'a';
        if (idx < 0 || idx >= ALPHABET || cur->child[idx] == NULL) return 0;
        cur = cur->child[idx];
    }
    return cur->end;   // 只是前缀还不够，要看有没有词在这结束
}

// 以 prefix 开头的单词个数
static int trieStartsWith(const TrieNode *root, const char *prefix) {
    const TrieNode *cur = root;

    for (int i = 0; prefix[i] != '\0'; i++) {
        int idx = prefix[i] - 'a';
        if (idx < 0 || idx >= ALPHABET || cur->child[idx] == NULL) return 0;
        cur = cur->child[idx];
    }
    return cur->pass;
}

static void trieFree(TrieNode *root) {
    if (root == NULL) return;
    for (int i = 0; i < ALPHABET; i++) trieFree(root->child[i]);
    free(root);
}

int main(void) {
    TrieNode *root = trieNewNode();
    const char *words[] = {"apple", "app", "apply", "banana"};
    for (int i = 0; i < 4; i++) trieInsert(root, words[i]);

    printf("apple 出现 %d 次\n", trieSearch(root, "apple"));
    printf("app 出现 %d 次\n", trieSearch(root, "app"));
    printf("ap 出现 %d 次\n", trieSearch(root, "ap"));            // 0，只是前缀
    printf("以 ap 开头的单词有 %d 个\n", trieStartsWith(root, "ap")); // 3

    trieFree(root);
    return 0;
}
```

> 用 `calloc` 而不是 `malloc`：它会把 `child` 数组全部清零。漏了这一步，第一次 `cur->child[idx] == NULL` 判断就会踩到野指针。

### 图（Graph）

两种存法：**邻接矩阵** `int[n][n]` 判断相邻 O(1)，但空间 O(n²)；**邻接表**每个点只存邻居，空间 O(n+m)。稠密图和 Floyd 用矩阵，稀疏图用邻接表。

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <limits.h>

#define MAX_VERTICES 100

// 邻接表的边节点
typedef struct Node {
    int vertex;
    int weight;
    struct Node *next;
} Node;

typedef struct {
    Node *adjList[MAX_VERTICES];
    int numVertices;
} GraphList;

typedef struct {
    int adjMatrix[MAX_VERTICES][MAX_VERTICES];
    int numVertices;
} GraphMatrix;

static GraphList *createGraphList(int vertices) {
    GraphList *graph = (GraphList *)malloc(sizeof(GraphList));
    if (graph == NULL) return NULL;

    graph->numVertices = vertices;
    for (int i = 0; i < vertices; i++) graph->adjList[i] = NULL;
    return graph;
}

static GraphMatrix *createGraphMatrix(int vertices) {
    GraphMatrix *graph = (GraphMatrix *)malloc(sizeof(GraphMatrix));
    if (graph == NULL) return NULL;

    graph->numVertices = vertices;
    for (int i = 0; i < vertices; i++) {
        for (int j = 0; j < vertices; j++) graph->adjMatrix[i][j] = 0;
    }
    return graph;
}

// 有向边：头插；无向图要正反各插一次
static void insertEdgeList(GraphList *graph, int src, int dest, int weight) {
    Node *node = (Node *)malloc(sizeof(Node));
    if (node == NULL) return;

    node->vertex = dest;
    node->weight = weight;
    node->next = graph->adjList[src];
    graph->adjList[src] = node;
}

static void insertEdgeMatrix(GraphMatrix *graph, int src, int dest, int weight) {
    graph->adjMatrix[src][dest] = weight;
}

static void deleteEdgeList(GraphList *graph, int src, int dest) {
    Node **link = &graph->adjList[src];
    while (*link != NULL) {
        if ((*link)->vertex == dest) {
            Node *dead = *link;
            *link = dead->next;
            free(dead);
            return;
        }
        link = &(*link)->next;
    }
}

static void deleteEdgeMatrix(GraphMatrix *graph, int src, int dest) {
    graph->adjMatrix[src][dest] = 0;
}

static void freeGraphList(GraphList *graph) {
    if (graph == NULL) return;

    for (int i = 0; i < graph->numVertices; i++) {
        Node *cur = graph->adjList[i];
        while (cur != NULL) {
            Node *next = cur->next;
            free(cur);
            cur = next;
        }
    }
    free(graph);
}

// DFS：一条路走到黑，递归栈保存没走完的分支
static void dfsListUtil(GraphList *graph, int vertex, bool visited[]) {
    visited[vertex] = true;   // 进入就标记，否则有环会无限递归
    printf("%d ", vertex);

    for (Node *cur = graph->adjList[vertex]; cur != NULL; cur = cur->next) {
        if (!visited[cur->vertex]) dfsListUtil(graph, cur->vertex, visited);
    }
}

static void dfsList(GraphList *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    dfsListUtil(graph, start, visited);
    printf("\n");
}

static void dfsMatrixUtil(GraphMatrix *graph, int vertex, bool visited[]) {
    visited[vertex] = true;
    printf("%d ", vertex);

    for (int i = 0; i < graph->numVertices; i++) {
        if (graph->adjMatrix[vertex][i] != 0 && !visited[i]) {
            dfsMatrixUtil(graph, i, visited);
        }
    }
}

static void dfsMatrix(GraphMatrix *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    dfsMatrixUtil(graph, start, visited);
    printf("\n");
}

// BFS：按层展开，用队列保存待访问的节点
static void bfsList(GraphList *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    int queue[MAX_VERTICES];
    int front = 0;
    int rear = 0;

    visited[start] = true;   // 入队前标记，避免重复入队
    queue[rear++] = start;

    while (front < rear) {
        int vertex = queue[front++];
        printf("%d ", vertex);

        for (Node *cur = graph->adjList[vertex]; cur != NULL; cur = cur->next) {
            if (!visited[cur->vertex]) {
                visited[cur->vertex] = true;
                queue[rear++] = cur->vertex;
            }
        }
    }
    printf("\n");
}

static void bfsMatrix(GraphMatrix *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    int queue[MAX_VERTICES];
    int front = 0;
    int rear = 0;

    visited[start] = true;
    queue[rear++] = start;

    while (front < rear) {
        int vertex = queue[front++];
        printf("%d ", vertex);

        for (int i = 0; i < graph->numVertices; i++) {
            if (graph->adjMatrix[vertex][i] != 0 && !visited[i]) {
                visited[i] = true;
                queue[rear++] = i;
            }
        }
    }
    printf("\n");
}

// Dijkstra（邻接矩阵，O(n²)）：每次取未确定的最近点，松弛邻居
static void dijkstraMatrix(GraphMatrix *graph, int start) {
    int n = graph->numVertices;
    int dist[MAX_VERTICES];
    bool done[MAX_VERTICES];

    for (int i = 0; i < n; i++) {
        dist[i] = INT_MAX;   // 先全部当不可达
        done[i] = false;
    }
    dist[start] = 0;

    for (int round = 0; round < n; round++) {
        int pick = -1;

        // 在未确定的点里找距离最小的
        for (int v = 0; v < n; v++) {
            if (!done[v] && dist[v] != INT_MAX && (pick == -1 || dist[v] < dist[pick])) {
                pick = v;
            }
        }
        if (pick == -1) break;   // 剩下的都不可达
        done[pick] = true;

        // 松弛：用 pick 作为中转，更新邻居
        for (int v = 0; v < n; v++) {
            int w = graph->adjMatrix[pick][v];
            if (!done[v] && w != 0 && dist[pick] + w < dist[v]) {
                dist[v] = dist[pick] + w;
            }
        }
    }

    printf("从 %d 出发的最短距离:\n", start);
    for (int i = 0; i < n; i++) {
        if (dist[i] == INT_MAX) printf("  %d: 不可达\n", i);
        else printf("  %d: %d\n", i, dist[i]);
    }
}

int main(void) {
    GraphList *graph = createGraphList(6);
    insertEdgeList(graph, 0, 1, 1);
    insertEdgeList(graph, 0, 2, 1);
    insertEdgeList(graph, 1, 3, 1);
    insertEdgeList(graph, 2, 4, 1);
    insertEdgeList(graph, 3, 5, 1);
    insertEdgeList(graph, 4, 5, 1);

    printf("邻接表 DFS: ");
    dfsList(graph, 0);
    printf("邻接表 BFS: ");
    bfsList(graph, 0);

    deleteEdgeList(graph, 0, 1);
    printf("删除边 0->1 后 DFS: ");
    dfsList(graph, 0);
    freeGraphList(graph);

    GraphMatrix *matrix = createGraphMatrix(5);
    insertEdgeMatrix(matrix, 0, 1, 4);
    insertEdgeMatrix(matrix, 0, 2, 1);
    insertEdgeMatrix(matrix, 2, 1, 2);
    insertEdgeMatrix(matrix, 1, 3, 1);
    insertEdgeMatrix(matrix, 2, 3, 5);
    insertEdgeMatrix(matrix, 3, 4, 3);

    printf("邻接矩阵 DFS: ");
    dfsMatrix(matrix, 0);
    printf("邻接矩阵 BFS: ");
    bfsMatrix(matrix, 0);
    dijkstraMatrix(matrix, 0);

    deleteEdgeMatrix(matrix, 1, 3);
    printf("删除边 1->3 后:\n");
    dijkstraMatrix(matrix, 0);
    free(matrix);
    return 0;
}
```

> `INT_MAX` 做加法前必须先判 `dist[pick] != INT_MAX`，否则 `INT_MAX + w` 直接溢出成负数，最短路会算出一个荒谬的小值。

#### 拓扑排序（Kahn）

有向无环图上把「必须先做的事」排在前面：反复取出入度为 0 的点，取走时把它所有后继的入度减一。有环时出队数量少于 n。

```c
#include <stdio.h>
#include <stdbool.h>

#define MAXN 1005

static int g[MAXN][MAXN];   // 4MB，放全局

// 返回 1 表示是 DAG，order 里是拓扑序；返回 0 表示有环
static int topoSort(int n, int order[]) {
    int indeg[MAXN] = {0};

    // 统计每个点的入度
    for (int u = 0; u < n; u++) {
        for (int v = 0; v < n; v++) {
            if (g[u][v]) indeg[v]++;
        }
    }

    int queue[MAXN];
    int front = 0;
    int rear = 0;

    for (int i = 0; i < n; i++) {
        if (indeg[i] == 0) queue[rear++] = i;
    }

    int cnt = 0;
    while (front < rear) {
        int u = queue[front++];
        order[cnt++] = u;

        // 把 u 从图里删掉：每个后继入度减一
        for (int v = 0; v < n; v++) {
            if (g[u][v] && --indeg[v] == 0) queue[rear++] = v;
        }
    }

    return cnt == n;   // 出队数量必须等于点数
}

int main(void) {
    int n = 6;
    g[5][2] = 1;
    g[5][0] = 1;
    g[4][0] = 1;
    g[4][1] = 1;
    g[2][3] = 1;
    g[3][1] = 1;

    int order[MAXN];
    if (topoSort(n, order)) {
        printf("拓扑序: ");
        for (int i = 0; i < n; i++) printf("%d ", order[i]);
        printf("\n");
    } else {
        printf("图中有环\n");
    }
    return 0;
}
```

> 有环时 `cnt < n`，剩下那些点的入度永远降不到 0。不要用「队列空了就结束」当成功判据，必须比数量。

#### 最小生成树（Kruskal）

按边权从小到大试，能合并就合并。判断成环用并查集：两个端点已经在同一集合，加这条边就会成环。

```c
#include <stdio.h>
#include <stdlib.h>

#define MAXN 1005
#define MAXM 100005

typedef struct {
    int u;
    int v;
    int w;
} Edge;

static int cmpEdge(const void *a, const void *b) {
    int x = ((const Edge *)a)->w;
    int y = ((const Edge *)b)->w;
    return (x > y) - (x < y);
}

static int parent[MAXN];

static int findRoot(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // 路径减半
        x = parent[x];
    }
    return x;
}

// 返回最小生成树的边权和；图不连通时返回 -1
static long long kruskal(int n, Edge *edges, int m) {
    for (int i = 0; i < n; i++) parent[i] = i;
    qsort(edges, (size_t)m, sizeof(Edge), cmpEdge);

    long long total = 0;
    int used = 0;

    for (int i = 0; i < m && used < n - 1; i++) {
        int ru = findRoot(edges[i].u);
        int rv = findRoot(edges[i].v);
        if (ru == rv) continue;   // 同集合，加了会成环

        parent[ru] = rv;
        total += edges[i].w;
        used++;
    }

    return used == n - 1 ? total : -1;
}

int main(void) {
    Edge edges[] = {
        {0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1},
        {2, 3, 5}, {3, 4, 3}
    };
    int m = (int)(sizeof edges / sizeof edges[0]);

    long long mst = kruskal(5, edges, m);
    if (mst < 0) printf("图不连通\n");
    else printf("最小生成树边权和 = %lld\n", mst);
    return 0;
}
```

#### Floyd（多源最短路）

求任意两点最短路。本质是 DP：`dist[i][j]` 表示「只允许经过前 k 个点中转」的最短距离。**k 必须在最外层**，否则会用到未来的中转点。

```c
#include <stdio.h>
#include <limits.h>

#define MAXN 505

static int dist[MAXN][MAXN];   // 1MB，放全局

static void floyd(int n) {
    for (int k = 0; k < n; k++) {              // 中转点放最外层
        for (int i = 0; i < n; i++) {
            if (dist[i][k] == INT_MAX) continue;   // i 到不了 k
            for (int j = 0; j < n; j++) {
                if (dist[k][j] == INT_MAX) continue;
                int through = dist[i][k] + dist[k][j];
                if (through < dist[i][j]) dist[i][j] = through;
            }
        }
    }
}

int main(void) {
    int n = 4;

    // 初始化：自己到自己 0，其余不可达
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            dist[i][j] = (i == j) ? 0 : INT_MAX;
        }
    }

    dist[0][1] = 5;
    dist[0][2] = 9;
    dist[1][2] = 2;
    dist[2][3] = 1;
    dist[1][3] = 8;

    floyd(n);

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (dist[i][j] == INT_MAX) printf("  inf");
            else printf("%5d", dist[i][j]);
        }
        printf("\n");
    }
    return 0;
}
```

> `k` 必须在最外层。写成 `i, j, k` 的结果是错的：`dist[i][j]` 在更新时还没经过所有中转点。

#### 堆优化的 Dijkstra

稀疏图上 O((n+m) log m)。`dist` 更新后把新状态压堆，弹出时用 `cur.dist != dist[cur.v]` 丢掉过期项。

```c
#include <stdio.h>
#include <limits.h>

#define MAXN 100005
#define MAXM 200005

typedef struct {
    int to, w, next;
} Edge;

static Edge edges[MAXM];
static int head[MAXN];
static int edgeCnt;

typedef struct {
    int dist, v;
} Item;

static Item heap[MAXM];
static int heapSize;

static void initGraph(int n) {
    for (int i = 0; i < n; i++) head[i] = -1;
    edgeCnt = 0;
}

static void addEdge(int u, int v, int w) {
    edges[edgeCnt].to = v;
    edges[edgeCnt].w = w;
    edges[edgeCnt].next = head[u];
    head[u] = edgeCnt++;
}

static void heapPush(Item item) {
    int i = heapSize++;
    heap[i] = item;

    while (i > 0) {
        int p = (i - 1) / 2;
        if (heap[p].dist <= heap[i].dist) break;
        Item t = heap[p];
        heap[p] = heap[i];
        heap[i] = t;
        i = p;
    }
}

static Item heapPop(void) {
    Item top = heap[0];
    heap[0] = heap[--heapSize];

    int i = 0;
    for (;;) {
        int left = 2 * i + 1;
        int right = left + 1;
        int smallest = i;
        if (left < heapSize && heap[left].dist < heap[smallest].dist) smallest = left;
        if (right < heapSize && heap[right].dist < heap[smallest].dist) smallest = right;
        if (smallest == i) break;

        Item t = heap[i];
        heap[i] = heap[smallest];
        heap[smallest] = t;
        i = smallest;
    }
    return top;
}

static void dijkstra(int n, int src, int dist[]) {
    for (int i = 0; i < n; i++) dist[i] = INT_MAX;
    dist[src] = 0;

    heapSize = 0;
    heapPush((Item){0, src});

    while (heapSize > 0) {
        Item cur = heapPop();
        if (cur.dist != dist[cur.v]) continue;   // 过期状态，跳过

        for (int e = head[cur.v]; e != -1; e = edges[e].next) {
            int v = edges[e].to;
            int nd = cur.dist + edges[e].w;
            if (nd < dist[v]) {
                dist[v] = nd;
                heapPush((Item){nd, v});
            }
        }
    }
}

int main(void) {
    int n = 5;
    initGraph(n);
    addEdge(0, 1, 4);
    addEdge(0, 2, 1);
    addEdge(2, 1, 2);
    addEdge(1, 3, 1);
    addEdge(2, 3, 5);
    addEdge(3, 4, 3);

    int dist[MAXN];
    dijkstra(n, 0, dist);

    for (int i = 0; i < n; i++) {
        if (dist[i] == INT_MAX) printf("%d: 不可达\n", i);
        else printf("%d: %d\n", i, dist[i]);
    }
    return 0;
}
```

> 堆里允许同一个点有多个版本，不要试图在堆里改值。弹出时跳过过期项就够了，堆大小最多 m，不会爆。
## 三、算法

这一章先讲每个算法在保证什么，再给模板。算法题里最容易出的错不是写不出代码，而是**用错场景**：在不能二分的数组上二分、在负权图上跑 Dijkstra、在贪心不成立的题上贪心。

### 排序算法

基于比较的排序下界是 O(n log n)：n 个元素有 n! 种排列，每次比较只区分两种结果。快排、归并、堆排都贴着这个下界，差别在**稳定性**和**额外空间**：

- **稳定**：相等元素相对顺序不变。归并稳定，快排、堆排不稳定。
- **原地**：快排、堆排 O(1) 额外空间；归并要 O(n) 临时数组。

机考里真正要手写的只有**归并**（求逆序对）和**快排**（求第 k 大），其余直接用 `qsort`。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void swapInt(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

// 冒泡：每轮把最大的换到末尾，提前发现有序可以退出
static void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int swapped = 0;

        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swapInt(&arr[j], &arr[j + 1]);
                swapped = 1;
            }
        }

        if (!swapped) break;   // 这一轮没换过，已经有序
    }
}

// 插入：把当前元素插到左边已排好序的部分里
static void insertionSort(int arr[], int n) {
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;

        // 比 key 大的都往右挪一格，给 key 腾位置
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

// 选择：每轮找最小值，和当前位置交换
static void selectionSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int minIndex = i;

        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIndex]) minIndex = j;
        }
        if (minIndex != i) swapInt(&arr[i], &arr[minIndex]);
    }
}

// 归并的合并步骤：把 arr[l..m] 和 arr[m+1..r] 合成有序段
static void merge(int arr[], int l, int m, int r) {
    int n1 = m - l + 1;
    int n2 = r - m;

    // 临时数组用 malloc，避免 VLA（MSVC 不支持）
    int *left = (int *)malloc((size_t)n1 * sizeof(int));
    int *right = (int *)malloc((size_t)n2 * sizeof(int));
    if (left == NULL || right == NULL) {
        free(left);
        free(right);
        return;
    }

    for (int i = 0; i < n1; i++) left[i] = arr[l + i];
    for (int j = 0; j < n2; j++) right[j] = arr[m + 1 + j];

    int i = 0, j = 0, k = l;

    // <= 保证左边先出，排序稳定
    while (i < n1 && j < n2) {
        arr[k++] = (left[i] <= right[j]) ? left[i++] : right[j++];
    }
    while (i < n1) arr[k++] = left[i++];
    while (j < n2) arr[k++] = right[j++];

    free(left);
    free(right);
}

// 归并：先排左右两半，再合并
static void mergeSort(int arr[], int l, int r) {
    if (l >= r) return;

    int m = l + (r - l) / 2;   // 防溢出
    mergeSort(arr, l, m);
    mergeSort(arr, m + 1, r);
    merge(arr, l, m, r);
}

// 快排的分区：pivot 取末尾，小的换到左边
static int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = low - 1;   // 已确认小于 pivot 的右边界

    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swapInt(&arr[i], &arr[j]);
        }
    }

    swapInt(&arr[i + 1], &arr[high]);   // pivot 归位
    return i + 1;
}

// 快排：平均 O(n log n)；有序数据会退化 O(n²)
static void quickSort(int arr[], int low, int high) {
    if (low >= high) return;

    int p = partition(arr, low, high);
    quickSort(arr, low, p - 1);
    quickSort(arr, p + 1, high);
}

// 下沉：让下标 i 在 [0, n) 里沉到合适位置
static void heapify(int arr[], int n, int i) {
    while (1) {
        int largest = i;
        int l = 2 * i + 1;
        int r = 2 * i + 2;

        if (l < n && arr[l] > arr[largest]) largest = l;
        if (r < n && arr[r] > arr[largest]) largest = r;
        if (largest == i) break;

        swapInt(&arr[i], &arr[largest]);
        i = largest;
    }
}

// 堆排：先建大顶堆，再反复把堆顶换到末尾
static void heapSort(int arr[], int n) {
    for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);

    for (int i = n - 1; i > 0; i--) {
        swapInt(&arr[0], &arr[i]);
        heapify(arr, i, 0);
    }
}

// 基数排序：按每一位做计数排序，非负数专用
static int getMax(const int arr[], int n) {
    int mx = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > mx) mx = arr[i];
    }
    return mx;
}

static void countSort(int arr[], int n, int exp) {
    int *output = (int *)malloc((size_t)n * sizeof(int));
    if (output == NULL) return;

    int count[10] = {0};

    // 统计当前位上每个数字出现几次
    for (int i = 0; i < n; i++) count[(arr[i] / exp) % 10]++;
    // 前缀和：count[d] 变成「<= d 的元素有多少个」
    for (int i = 1; i < 10; i++) count[i] += count[i - 1];

    // 从后往前放，保证稳定
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[--count[digit]] = arr[i];
    }

    for (int i = 0; i < n; i++) arr[i] = output[i];
    free(output);
}

static void radixSort(int arr[], int n) {
    int m = getMax(arr, n);
    for (int exp = 1; m / exp > 0; exp *= 10) countSort(arr, n, exp);
}

static void printArray(const int arr[], int n) {
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
}

int main(void) {
    int base[] = {64, 34, 25, 12, 22, 11, 90};
    int n = (int)(sizeof base / sizeof base[0]);
    int arr[7];

    // memcpy 复制一份，保证每种排序拿到同一份乱序数据
    memcpy(arr, base, sizeof base); bubbleSort(arr, n);      printf("冒泡    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); insertionSort(arr, n);   printf("插入    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); selectionSort(arr, n);   printf("选择    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); mergeSort(arr, 0, n - 1); printf("归并    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); quickSort(arr, 0, n - 1); printf("快排    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); heapSort(arr, n);        printf("堆排    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); radixSort(arr, n);       printf("基数    "); printArray(arr, n);
    return 0;
}
```

> 快排的 pivot 取末尾元素，原始数据已经有序时会退化成 O(n²)（每轮只分出一个）。机考数据可能有序时，用 `qsort` 或者随机选 pivot。

### 查找算法

线性查找 O(n)，二分 O(log n)。二分真正容易错的不是循环，是**边界**：`while (left <= right)` 配 `right = mid - 1`、`while (left < right)` 配 `right = mid`，两种写法不能混。

```c
#include <stdio.h>

// 线性查找：从头扫到尾
static int linearSearch(const int arr[], int n, int target) {
    for (int i = 0; i < n; i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}

// 精确二分：闭区间 [left, right]
static int binarySearch(const int arr[], int left, int right, int target) {
    while (left <= right) {
        int mid = left + (right - left) / 2;   // 防溢出

        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;   // 答案在右半
        else right = mid - 1;                    // 答案在左半
    }
    return -1;
}

// 第一个 >= target：左闭右开 [left, right)
static int lowerBound(const int arr[], int n, int target) {
    int left = 0;
    int right = n;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] < target) left = mid + 1;   // mid 一定不是答案
        else right = mid;                        // mid 可能是答案，保留
    }
    return left;   // left == right 就是答案位置
}

// 第一个 > target
static int upperBound(const int arr[], int n, int target) {
    int left = 0;
    int right = n;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] <= target) left = mid + 1;
        else right = mid;
    }
    return left;
}

int main(void) {
    int arr[] = {10, 20, 30, 40, 50, 60, 70, 80, 90};
    int n = (int)(sizeof arr / sizeof arr[0]);
    int target = 50;

    printf("线性查找 50: %d\n", linearSearch(arr, n, target));       // 4
    printf("二分查找 50: %d\n", binarySearch(arr, 0, n - 1, target)); // 4
    printf("二分查找 55: %d\n", binarySearch(arr, 0, n - 1, 55));     // -1
    printf("lower_bound 50: %d\n", lowerBound(arr, n, 50));           // 4
    printf("upper_bound 50: %d\n", upperBound(arr, n, 50));           // 5

    // 两个边界相减 = 值等于 50 的元素个数
    printf("50 出现次数: %d\n", upperBound(arr, n, 50) - lowerBound(arr, n, 50));
    return 0;
}
```

> `mid = (left + right) / 2` 在 `left`、`right` 都接近 `INT_MAX` 时会溢出成负数；写成 `left + (right - left) / 2` 永远安全。

### 双指针与滑动窗口

双指针靠**单调性**把 O(n²) 降到 O(n)：左右指针都只往一个方向走，各自最多走 n 步。滑动窗口维护一个区间和区间内的状态，扩张右边界、不满足条件时收缩左边界。

```c
#include <stdio.h>
#include <string.h>

// 有序数组两数之和：和偏小左指针右移，偏大右指针左移
static int twoSumSorted(const int *a, int n, int target, int *pi, int *pj) {
    int i = 0;
    int j = n - 1;

    while (i < j) {
        int sum = a[i] + a[j];

        if (sum == target) {
            *pi = i;
            *pj = j;
            return 1;
        }

        if (sum < target) i++;   // 只能换更大的数
        else j--;                // 只能换更小的数
    }
    return 0;
}

// 最长无重复字符子串
static int longestUnique(const char *s) {
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;   // -1 表示没出现过

    int best = 0;
    int left = 0;

    for (int right = 0; s[right] != '\0'; right++) {
        // char 可能是负数，先转 unsigned char 再当下标
        unsigned char c = (unsigned char)s[right];

        // 上次出现在窗口内，左边界跳到它右边；和 left 取 max 防止倒退
        if (last[c] >= left) left = last[c] + 1;

        last[c] = right;
        if (right - left + 1 > best) best = right - left + 1;
    }
    return best;
}

// 定长窗口最大值：单调队列存下标，值从队首到队尾递减
static void windowMax(const int *a, int n, int k, int *out) {
    int q[100005];   // 存下标，不是值
    int head = 0;    // 队首
    int tail = 0;    // 队尾（开区间）

    for (int i = 0; i < n; i++) {
        // 新元素更大，队尾那些永远不可能成为最大值
        while (head < tail && a[q[tail - 1]] <= a[i]) tail--;
        q[tail++] = i;

        // 队首滑出窗口
        if (q[head] <= i - k) head++;

        // 窗口第一次填满后开始记录
        if (i >= k - 1) out[i - k + 1] = a[q[head]];
    }
}

int main(void) {
    int a[] = {1, 3, 5, 7, 9, 11};
    int i = 0, j = 0;

    if (twoSumSorted(a, 6, 12, &i, &j)) {
        printf("两数之和下标: %d, %d\n", i, j);   // 0, 5
    }

    printf("最长无重复子串: %d\n", longestUnique("abcbbad"));   // 3

    int b[] = {1, 3, -1, -3, 5, 3, 6, 7};
    int out[8];
    int k = 3;
    windowMax(b, 8, k, out);

    printf("窗口最大值: ");
    for (int t = 0; t < 8 - k + 1; t++) printf("%d ", out[t]);
    printf("\n");
    return 0;
}
```

> 滑动窗口里 `left` 只增不减。写成 `left = last[c] + 1` 却不和当前 `left` 取 max，遇到 `"abba"` 这种回头的字符会让左边界倒退，答案偏大。

### 前缀和与差分

前缀和把区间求和从 O(n) 降到 O(1)；差分把区间加值从 O(n) 降到 O(1)，最后统一还原。两者互为逆运算。

```c
#include <stdio.h>

// pre[i] 表示前 i 个元素的和，pre[0] = 0
static void buildPrefix(const int *a, int n, long long *pre) {
    pre[0] = 0;
    for (int i = 0; i < n; i++) {
        pre[i + 1] = pre[i] + a[i];   // 递推：前 i+1 个 = 前 i 个 + 第 i 个
    }
}

// 闭区间 [l, r] 的和
static long long rangeSum(const long long *pre, int l, int r) {
    return pre[r + 1] - pre[l];   // 前缀和相减
}

// 差分：区间 [l, r] 整体加 v
static void rangeAdd(long long *diff, int n, int l, int r, long long v) {
    diff[l] += v;                       // 从 l 开始生效
    if (r + 1 < n) diff[r + 1] -= v;    // 到 r+1 抵消
}

// 求前缀和，把差分还原成每个位置的增量
static void buildFromDiff(const long long *diff, int n, long long *a) {
    long long cur = 0;
    for (int i = 0; i < n; i++) {
        cur += diff[i];
        a[i] = cur;
    }
}

int main(void) {
    int nums[] = {1, 2, 3, 4, 5};
    int n = 5;

    long long pre[6];
    buildPrefix(nums, n, pre);
    printf("下标 1~3 的和 = %lld\n", rangeSum(pre, 1, 3));   // 9

    long long diff[5] = {0};
    rangeAdd(diff, n, 0, 2, 10);   // [0,2] 各加 10
    rangeAdd(diff, n, 1, 4, 1);    // [1,4] 各加 1

    long long applied[5];
    buildFromDiff(diff, n, applied);
    printf("累加量: ");
    for (int i = 0; i < n; i++) printf("%lld ", applied[i]);
    printf("\n");
    return 0;
}
```

> 差分数组长度要覆盖到 `r + 1`。`r + 1 == n` 时那一项越界，必须判掉 —— 判掉不影响结果，因为后面没有元素需要减回来。

### 递归与回溯

回溯 = 递归 + 撤销选择。模板固定三步：**做选择 → 递归 → 撤销**。路径是所有递归层共享的同一块内存，所以返回前必须把这一步加进去的元素删掉。

```c
#include <stdio.h>

static int nums[] = {1, 2, 3};
static int n = 3;

static void printPath(const int *path, int len) {
    printf("{ ");
    for (int i = 0; i < len; i++) printf("%d ", path[i]);
    printf("}\n");
}

// 子集：每个元素「选 / 不选」
static void subsets(int idx, int *path, int len) {
    if (idx == n) {
        printPath(path, len);   // 叶子节点：输出当前路径
        return;
    }

    subsets(idx + 1, path, len);   // 分支一：不选

    path[len] = nums[idx];         // 分支二：选
    subsets(idx + 1, path, len + 1);
    // 数组不需要「撤销」：len 是值传递，递归返回后自动恢复
}

// 全排列：用 used 标记哪些元素已经在路径里
static int used[3];
static int perm[3];

static void permute(int depth) {
    if (depth == n) {
        printPath(perm, n);
        return;
    }

    for (int i = 0; i < n; i++) {
        if (used[i]) continue;

        used[i] = 1;          // 做选择
        perm[depth] = nums[i];
        permute(depth + 1);
        used[i] = 0;          // 撤销，别漏
    }
}

// N 皇后：列 + 两条对角线各一个标记数组
static int cols[8];
static int diag1[16];
static int diag2[16];
static int queenN = 6;
static int queenCount = 0;

static void nQueens(int row) {
    if (row == queenN) {
        queenCount++;   // 每一行都放好了
        return;
    }

    for (int c = 0; c < queenN; c++) {
        // 主对角线用 row - c + N 保证下标非负
        if (cols[c] || diag1[row + c] || diag2[row - c + queenN]) continue;

        cols[c] = diag1[row + c] = diag2[row - c + queenN] = 1;
        nQueens(row + 1);
        cols[c] = diag1[row + c] = diag2[row - c + queenN] = 0;   // 撤销
    }
}

int main(void) {
    int path[3];

    printf("子集:\n");
    subsets(0, path, 0);

    printf("全排列:\n");
    permute(0);

    nQueens(0);
    printf("%d 皇后共有 %d 组解\n", queenN, queenCount);
    return 0;
}
```

> 撤销那一步写在递归**后面**，而且必须原样撤销。漏掉 `used[i] = 0`，第一个排列之后就没有后续了，因为所有元素都还标着已用。

### 贪心

贪心每一步选当前最好的，且不回头。它成立通常需要交换论证：把最优解的第一步换成贪心选择，答案不会变差。证不出来时，贪心很可能就是错的：硬币面值 `{1,3,4}`、目标 6，贪心 4+1+1 是 3 枚，最优 3+3 是 2 枚。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int l;
    int r;
} Interval;

// 按右端点升序：最早结束的留给后面的时间最多
static int cmpByRight(const void *a, const void *b) {
    int x = ((const Interval *)a)->r;
    int y = ((const Interval *)b)->r;
    return (x > y) - (x < y);
}

static int maxNonOverlap(Interval *arr, int n) {
    if (n == 0) return 0;

    qsort(arr, (size_t)n, sizeof(Interval), cmpByRight);

    int count = 1;          // 第一个区间一定选
    int end = arr[0].r;     // 上一个选中区间的结束时间

    for (int i = 1; i < n; i++) {
        if (arr[i].l >= end) {   // 不重叠才选
            count++;
            end = arr[i].r;
        }
    }
    return count;
}

// 跳跃游戏：reach 是当前能到达的最远下标
static int canJump(const int *a, int n) {
    int reach = 0;

    // i <= reach 保证只走「能到达的位置」
    for (int i = 0; i < n && i <= reach; i++) {
        if (i + a[i] > reach) reach = i + a[i];
        if (reach >= n - 1) return 1;
    }
    return reach >= n - 1;
}

int main(void) {
    Interval arr[] = {{1, 3}, {2, 5}, {3, 6}, {5, 7}, {6, 9}};
    printf("最多能参加的场次: %d\n", maxNonOverlap(arr, 5));   // 3

    int jumps[] = {2, 3, 1, 1, 4};
    printf("能否到达终点: %s\n", canJump(jumps, 5) ? "能" : "不能");
    return 0;
}
```

> 区间调度必须按**右端点**排。按左端点排会选出「最早开始但最长」的那个，把后面全挡住：`[0,10], [1,2], [2,3]` 一眼能看出差别。

### 动态规划

DP 要同时满足两个条件：**最优子结构**（大问题由小问题拼出来）、**重叠子问题**（同一个子问题被反复用）。写 DP 固定四步：定义状态、写转移、定初值、定遍历顺序。

```c
#include <stdio.h>
#include <string.h>

#define MAXC 1005

// 01 背包：每件最多一次，容量必须倒序
static int knapsack01(const int *w, const int *v, int n, int cap) {
    int dp[MAXC] = {0};   // dp[c] = 容量 c 时的最大价值

    for (int i = 0; i < n; i++) {
        for (int c = cap; c >= w[i]; c--) {
            // 倒序保证 dp[c-w] 还是「没放本件」的值
            if (dp[c - w[i]] + v[i] > dp[c]) dp[c] = dp[c - w[i]] + v[i];
        }
    }
    return dp[cap];
}

// 完全背包：每件无限次，容量必须正序
static int knapsackComplete(const int *w, const int *v, int n, int cap) {
    int dp[MAXC] = {0};

    for (int i = 0; i < n; i++) {
        for (int c = w[i]; c <= cap; c++) {
            // 正序时 dp[c-w] 可能已经放过本件，所以能重复放
            if (dp[c - w[i]] + v[i] > dp[c]) dp[c] = dp[c - w[i]] + v[i];
        }
    }
    return dp[cap];
}

// LIS：tails[len-1] 是长度为 len 的上升子序列的最小结尾
static int lis(const int *a, int n) {
    int tails[MAXC];
    int len = 0;

    for (int i = 0; i < n; i++) {
        // 在 tails[0..len) 里找第一个 >= a[i] 的位置
        int left = 0, right = len;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (tails[mid] < a[i]) left = mid + 1;
            else right = mid;
        }

        tails[left] = a[i];   // 用更小的结尾替换
        if (left == len) len++;
    }
    return len;
}

// LCS：滚动数组，只保留上一行
static int lcs(const char *a, const char *b) {
    int la = (int)strlen(a);
    int lb = (int)strlen(b);
    int prev[MAXC] = {0};
    int cur[MAXC] = {0};

    for (int i = 1; i <= la; i++) {
        cur[0] = 0;

        for (int j = 1; j <= lb; j++) {
            if (a[i - 1] == b[j - 1]) {
                cur[j] = prev[j - 1] + 1;   // 这个字符可以配对
            } else {
                cur[j] = prev[j] > cur[j - 1] ? prev[j] : cur[j - 1];
            }
        }

        // 滚动：当前行变成下一轮的上一行
        memcpy(prev, cur, (size_t)(lb + 1) * sizeof(int));
    }
    return prev[lb];
}

// 编辑距离：插入 / 删除 / 替换
static int editDistance(const char *a, const char *b) {
    int la = (int)strlen(a);
    int lb = (int)strlen(b);
    int prev[MAXC];
    int cur[MAXC];

    // a 为空：只能逐个插入
    for (int j = 0; j <= lb; j++) prev[j] = j;

    for (int i = 1; i <= la; i++) {
        cur[0] = i;   // b 为空：只能逐个删除

        for (int j = 1; j <= lb; j++) {
            if (a[i - 1] == b[j - 1]) {
                cur[j] = prev[j - 1];
            } else {
                // 替换、删除、插入三种操作取最小
                int best = prev[j - 1];
                if (prev[j] < best) best = prev[j];
                if (cur[j - 1] < best) best = cur[j - 1];
                cur[j] = best + 1;
            }
        }

        memcpy(prev, cur, (size_t)(lb + 1) * sizeof(int));
    }
    return prev[lb];
}

int main(void) {
    int w[] = {2, 3, 4, 5};
    int v[] = {3, 4, 5, 6};

    printf("01 背包容量 8: %d\n", knapsack01(w, v, 4, 8));       // 10
    printf("完全背包容量 8: %d\n", knapsackComplete(w, v, 4, 8)); // 12

    int a[] = {10, 9, 2, 5, 3, 7, 101, 18};
    printf("LIS 长度: %d\n", lis(a, 8));                          // 4

    printf("LCS 长度: %d\n", lcs("ABCBDAB", "BDCABA"));          // 4
    printf("编辑距离: %d\n", editDistance("horse", "ros"));      // 3
    return 0;
}
```

> 01 背包容量必须**倒序**：正序会让同一件物品被重复放入，直接变成完全背包。完全背包反过来必须正序，一次拿多件。

### 字符串算法

BF 是逐个起点比较，O(nm)；KMP 用 `lps` 表跳过已匹配的前缀，O(n+m)。`lps[i]` 表示 `pat[0..i]` 的最长相等前后缀长度，失配时模式串指针跳到 `lps[j-1]` 而不是回到 0。

```c
#include <stdio.h>
#include <string.h>

// BF：每个起点都比一遍
static int bfSearch(const char *pat, const char *txt) {
    int m = (int)strlen(pat);
    int n = (int)strlen(txt);

    for (int i = 0; i + m <= n; i++) {
        int j = 0;
        while (j < m && txt[i + j] == pat[j]) j++;
        if (j == m) return i;   // 整段都匹配上
    }
    return -1;
}

// 计算 lps：pat[0..i] 的最长相等前后缀长度
static void buildLps(const char *pat, int m, int *lps) {
    lps[0] = 0;
    int len = 0;
    int i = 1;

    while (i < m) {
        if (pat[i] == pat[len]) {
            lps[i++] = ++len;        // 前后缀延长一位
        } else if (len != 0) {
            len = lps[len - 1];      // 退回更短的前缀
        } else {
            lps[i++] = 0;            // 退到 0 还不行
        }
    }
}

// 返回匹配次数（允许重叠），positions 记录起点
static int kmpSearchAll(const char *pat, const char *txt, int *positions) {
    int m = (int)strlen(pat);
    int n = (int)strlen(txt);
    if (m == 0 || m > n) return 0;

    int lps[1005];
    buildLps(pat, m, lps);

    int i = 0;      // 文本指针
    int j = 0;      // 模式串指针
    int count = 0;

    while (i < n) {
        if (txt[i] == pat[j]) {
            i++;
            j++;
        }

        if (j == m) {
            positions[count++] = i - j;
            j = lps[j - 1];          // 继续找下一个，允许重叠
        } else if (i < n && txt[i] != pat[j]) {
            if (j != 0) j = lps[j - 1];
            else i++;
        }
    }
    return count;
}

// 字符串哈希：把子串映射成整数，滚动更新
typedef unsigned long long ull;
#define BASE 131ULL

static int hashCount(const char *pat, const char *txt) {
    int m = (int)strlen(pat);
    int n = (int)strlen(txt);
    if (m == 0 || m > n) return 0;

    ull ph = 0;
    ull th = 0;
    ull power = 1;

    // 预处理第一个窗口
    for (int i = 0; i < m; i++) {
        ph = ph * BASE + (unsigned char)pat[i];
        th = th * BASE + (unsigned char)txt[i];
        power *= BASE;   // 131^m
    }

    int count = (th == ph);

    for (int i = m; i < n; i++) {
        // 去掉最左字符、乘基数、加新字符
        th = th * BASE + (unsigned char)txt[i] - power * (unsigned char)txt[i - m];
        if (th == ph) count++;
    }
    return count;
}

int main(void) {
    const char *txt = "ABABDABACDABABCABAB";
    const char *pat = "ABABCABAB";

    printf("BF 首次出现: %d\n", bfSearch(pat, txt));   // 10

    int positions[64];
    int count = kmpSearchAll(pat, txt, positions);
    printf("KMP 匹配次数: %d", count);
    for (int i = 0; i < count; i++) printf(" @%d", positions[i]);
    printf("\n");

    printf("哈希匹配次数: %d\n", hashCount("AB", txt));   // 7
    return 0;
}
```

> KMP 找到一次匹配后 `j = lps[j - 1]` 而不是 `j = 0`：重叠的匹配（`"aa"` 在 `"aaa"` 里出现 2 次）才数得全。哈希有极小概率撞键，要求绝对正确时用 KMP。

## 四、复杂度与选择速查

### 看数据范围选算法

| n 的量级 | 能用的复杂度 | 典型做法 |
|---|---|---|
| ≤ 10 | O(n!) | 全排列、暴力搜索 |
| ≤ 20 | O(2ⁿ) | 子集枚举、状态压缩 DP |
| ≤ 100 | O(n³) | Floyd、区间 DP、三重循环 |
| ≤ 1000 | O(n²) | 01 背包、LCS、朴素 Dijkstra |
| ≤ 1e5 | O(n log n) | 排序、二分、堆、Kruskal |
| ≤ 1e6 | O(n) | 前缀和、双指针、单调栈、哈希 |
| ≤ 1e8 | O(n)，常数要小 | 单层循环、位运算 |

### C 里手写结构的代价

| 结构 | 代码量 | 单次操作 | 什么时候用 |
|---|---|---|---|
| 动态数组 | 30 行 | 末尾均摊 O(1) | 长度运行时才知道 |
| 链表 | 40 行 | 头插 O(1)、查找 O(n) | 频繁在头部/中间增删 |
| 栈 | 20 行 | O(1) | 括号匹配、单调栈、非递归 DFS |
| 循环队列 | 20 行 | O(1) | BFS、层序遍历、单调队列 |
| 堆 | 40 行 | O(log n) | Top K、Dijkstra、合并有序序列 |
| 哈希表 | 60 行 | 均摊 O(1) | 去重、计数、两数之和 |
| 并查集 | 30 行 | 近 O(1) | 连通块、Kruskal、等价类 |
| Trie | 40 行 | O(单词长度) | 前缀统计、词库检索 |

> 考场上优先级：**能 `qsort` 就不手写排序，能数组就不链表，能哈希表就不二分查找**。手写结构的每一行都是出错的机会。
