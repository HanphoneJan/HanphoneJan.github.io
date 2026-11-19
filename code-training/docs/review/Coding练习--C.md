---
title: Coding练习--C
category: 参考手册
last_updated: 2026-11-19
---
# Coding练习--C

> 机考与笔试用的 C 模板合集：**输入输出**、**数据结构**、**常见算法**各一份能直接抄的写法。
>
> 每块都能单独编译（`pnpm check:c` 会逐块跑 `gcc -std=c11 -Wall -Wextra -Werror`）；带 `main` 的块直接跑得出结果，没有 `main` 的是库块，只用来抄函数。深讲在[数据结构](/code-training/data-structures/linked_list.html)与[算法模式](/code-training/patterns/two_pointers.html)两个板块，这里只留「干嘛用、多复杂、坑在哪」。

## 零、C 在 OJ 上的易错点速查

| 写法 | 会出什么事 | 正确做法 |
|---|---|---|
| `int` 存 `1e9 + 1e9` | 溢出成负数，答案莫名其妙偏小 | 累加用 `long long`，输出用 `%lld` |
| `int a[1000000]` 开在 `main` 里 | 栈只有 8MB，大数组直接段错误 | 挪到全局（BSS）或 `malloc` |
| `while (scanf("%d", &x))` | 读到 EOF 时 `scanf` 返回 `EOF`（-1），条件恒为真，死循环 | 写 `== 1` 或 `!= EOF` |
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

```c
#include <stdio.h>

int main(void) {
    int n;
    // 读到文件结束：每组一个 n，后面紧跟 n 个整数
    while (scanf("%d", &n) == 1) {
        long long sum = 0;
        for (int i = 0; i < n; i++) {
            int x;
            if (scanf("%d", &x) != 1) return 0;  // 输入不完整，直接退出
            sum += x;                            // 用 long long，防止累加溢出
        }
        printf("%lld\n", sum);
    }
    return 0;
}
```

> `scanf` 的返回值是**成功读入的项数**，不是读到的值。判断 `!= EOF` 也行，但 `== 1` 更严：读到一半失败时也能及时发现。

### 读一整行，再按空格切分

**坑**：`fgets` 会把行尾的 `\n` 一起读进来，忘记截掉的话最后一段会带换行。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define LINE_MAX 100005

int main(void) {
    char line[LINE_MAX];
    while (fgets(line, sizeof line, stdin) != NULL) {
        line[strcspn(line, "\n")] = '\0';  // 第一个换行的位置换成 '\0'
        if (line[0] == '\0') continue;

        int sum = 0, cnt = 0;
        char *tok = strtok(line, " \t");   // 第一次传入原串
        while (tok != NULL) {
            sum += atoi(tok);
            cnt++;
            tok = strtok(NULL, " \t");     // 之后一律传 NULL
        }
        printf("%d 个数，和 = %d\n", cnt, sum);
    }
    return 0;
}
```

> `strtok` 会**就地修改**原串（把分隔符改成 `'\0'`）。如果后面还要用原始那一行，先拷一份。

不想改动原串时，用 `sscanf` 配 `%n` 按偏移往下扫：

```c
#include <stdio.h>

int main(void) {
    char line[] = "3 14 15 92 65";
    int off = 0, used = 0, x;
    while (sscanf(line + off, "%d%n", &x, &used) == 1) {
        printf("%d ", x);
        off += used;   // %n 写入本次实际吃掉的字符数
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
    printf("[%d] [%5d] [%-5d] [%05d]\n", 42, 42, 42, 42);
    printf("[%.2f] [%8.3f] [%e]\n", pi, pi, pi);
    printf("[%s] [%10s] [%-10s]\n", "abc", "abc", "abc");
    printf("[%c] [%x] [%o] [%lld]\n", 'A', 255, 255, 1234567890123LL);
    printf("100%%\n");   // 输出百分号要写两个
    return 0;
}
```

> `%5d` 右对齐补空格、`%-5d` 左对齐、`%05d` 补零；`%.2f` 保留两位小数；`long long` 必须用 `%lld`（Linux 上 `%ld` 也能过，Windows 不行）。

### qsort 与结构体排序

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 升序：返回负数表示 a 排到前面
int cmpInt(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);   // 只返回 -1 / 0 / 1，不会溢出
}

typedef struct {
    char name[32];
    int score;
} Student;

// 先按分数降序，同分按名字升序
int cmpStudent(const void *a, const void *b) {
    const Student *p = (const Student *)a;
    const Student *q = (const Student *)b;
    if (p->score != q->score)
        return (p->score < q->score) - (p->score > q->score);
    return strcmp(p->name, q->name);
}

// 字符串数组：元素类型是 char[32]，比较的是内容不是指针
int cmpString(const void *a, const void *b) {
    return strcmp((const char *)a, (const char *)b);
}

int main(void) {
    int a[] = {5, 2, 9, 1, 7};
    int n = (int)(sizeof a / sizeof a[0]);
    qsort(a, (size_t)n, sizeof a[0], cmpInt);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");

    Student s[] = {{"Tom", 90}, {"Ann", 95}, {"Bob", 90}};
    int m = (int)(sizeof s / sizeof s[0]);
    qsort(s, (size_t)m, sizeof s[0], cmpStudent);
    for (int i = 0; i < m; i++) printf("%s:%d ", s[i].name, s[i].score);
    printf("\n");

    char words[][32] = {"pear", "apple", "fig"};
    int k = (int)(sizeof words / sizeof words[0]);
    qsort(words, (size_t)k, sizeof words[0], cmpString);
    for (int i = 0; i < k; i++) printf("%s ", words[i]);
    printf("\n");
    return 0;
}
```

> 比较函数里**不要写 `return *(int*)a - *(int*)b`**：两个大数相减会溢出 `int`，排序结果直接错。`(x > y) - (x < y)` 是标准写法。

### 位运算

```c
#include <stdio.h>

// 最低位的 1（x 为 0 时结果是 0）
static int lowbit(int x) { return x & -x; }

// 二进制里 1 的个数
static int popcount(unsigned x) {
    int c = 0;
    while (x) { x &= x - 1; c++; }
    return c;
}

// 快速幂：b^e mod m
static long long powmod(long long b, long long e, long long m) {
    long long r = 1 % m;
    b %= m;
    while (e > 0) {
        if (e & 1) r = r * b % m;
        b = b * b % m;
        e >>= 1;
    }
    return r;
}

static int gcd(int a, int b) {
    while (b) { int t = a % b; a = b; b = t; }
    return a;
}

// 先除后乘，防止 a * b 溢出
static int lcm(int a, int b) { return a / gcd(a, b) * b; }

int main(void) {
    printf("lowbit(12) = %d\n", lowbit(12));
    printf("popcount(45) = %d\n", popcount(45));
    printf("2^10 mod 1000 = %lld\n", powmod(2, 10, 1000));
    printf("gcd(12, 18) = %d, lcm = %d\n", gcd(12, 18), lcm(12, 18));

    // 枚举 mask 的全部非空子集
    int mask = 0b1011;
    for (int sub = mask; sub; sub = (sub - 1) & mask)
        printf("%d ", sub);
    printf("\n");
    return 0;
}
```
## 二、数据结构

C 没有现成容器，所以每样都得手写。下面每个结构都只保留机考真正用得到的操作，行数控制在能背下来的规模。

### 动态数组（手写 vector）

数组长度要等运行时才知道、又不想 `malloc` 一大堆时用它：**容量按 2 倍扩容，均摊 O(1)**。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    int size;
    int cap;
} Vec;

static void vecInit(Vec *v) {
    v->data = NULL;
    v->size = 0;
    v->cap = 0;
}

// 保证容量至少为 need；返回 1 表示成功
static int vecReserve(Vec *v, int need) {
    if (need <= v->cap) return 1;
    int cap = v->cap ? v->cap * 2 : 4;
    while (cap < need) cap *= 2;
    int *p = (int *)realloc(v->data, (size_t)cap * sizeof(int));
    if (p == NULL) return 0;
    v->data = p;
    v->cap = cap;
    return 1;
}

static int vecPush(Vec *v, int x) {
    if (!vecReserve(v, v->size + 1)) return 0;
    v->data[v->size++] = x;
    return 1;
}

static void vecFree(Vec *v) {
    free(v->data);
    v->data = NULL;
    v->size = v->cap = 0;
}

int main(void) {
    Vec v;
    vecInit(&v);
    for (int i = 0; i < 10; i++) vecPush(&v, i * i);
    for (int i = 0; i < v.size; i++) printf("%d ", v.data[i]);
    printf("\n容量 = %d，长度 = %d\n", v.cap, v.size);
    vecFree(&v);
    return 0;
}
```

### 链表

单链表负责头插与遍历，双向链表用于需要往前走的场景，循环链表常出现在约瑟夫环一类的题。**头插、头删 O(1)，按下标/值查找 O(n)**。

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
    node->next = *head;
    *head = node;
}

static SNode *sSearch(SNode *head, int data) {
    for (SNode *cur = head; cur != NULL; cur = cur->next)
        if (cur->data == data) return cur;
    return NULL;
}

// 三指针反转，O(n) 时间、O(1) 空间
static SNode *sReverse(SNode *head) {
    SNode *prev = NULL;
    while (head != NULL) {
        SNode *next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

static void sPrint(const char *tag, SNode *head) {
    printf("%s", tag);
    for (SNode *cur = head; cur != NULL; cur = cur->next)
        printf("%d%s", cur->data, cur->next ? " -> " : "");
    printf("\n");
}

static void sFree(SNode *head) {
    while (head != NULL) {
        SNode *next = head->next;
        free(head);
        head = next;
    }
}

// 双向链表头插
static void dInsert(DNode **head, int data) {
    DNode *node = (DNode *)malloc(sizeof(DNode));
    if (node == NULL) return;
    node->data = data;
    node->prev = NULL;
    node->next = *head;
    if (*head != NULL) (*head)->prev = node;
    *head = node;
}

static DNode *dSearch(DNode *head, int data) {
    for (DNode *cur = head; cur != NULL; cur = cur->next)
        if (cur->data == data) return cur;
    return NULL;
}

// 循环单链表头插：插在头结点之后，再交换两者的值，
// 效果等同于「新节点变成头」，但不用改动外部的 head 指针
static void cInsert(SNode **head, int data) {
    SNode *node = sNewNode(data);
    if (node == NULL) return;
    if (*head == NULL) {
        node->next = node;
        *head = node;
        return;
    }
    node->next = (*head)->next;
    (*head)->next = node;
    int tmp = (*head)->data;
    (*head)->data = node->data;
    node->data = tmp;
}

static SNode *cSearch(SNode *head, int data) {
    if (head == NULL) return NULL;
    SNode *cur = head;
    do {
        if (cur->data == data) return cur;
        cur = cur->next;
    } while (cur != head);
    return NULL;
}

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

// 释放循环链表前必须先断开环，否则会绕圈
static void cFree(SNode *head) {
    if (head == NULL) return;
    SNode *cur = head;
    while (cur->next != head) cur = cur->next;
    cur->next = NULL;
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
    DNode *tail = dlist;
    while (tail->next != NULL) tail = tail->next;
    printf("\n双向链表反向: ");
    for (DNode *cur = tail; cur != NULL; cur = cur->prev) printf("%d ", cur->data);
    printf("\n查找 1: %s\n", dSearch(dlist, 1) ? "找到" : "没有");
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

### 栈（Stack）

后进先出。括号匹配、后缀表达式、单调栈、DFS 的非递归写法都靠它，**入栈、出栈、取栈顶都是 O(1)**。这里用定长数组，**容量开在宏里，改一处就够**。

```c
#include <stdio.h>
#include <string.h>

#define MAX_SIZE 100

typedef struct {
    int data[MAX_SIZE];
    int top;          // 指向栈顶元素，空栈为 -1
} Stack;

static void initStack(Stack *s) { s->top = -1; }
static int isEmpty(const Stack *s) { return s->top == -1; }
static int isFull(const Stack *s) { return s->top == MAX_SIZE - 1; }

static void push(Stack *s, int value) {
    if (!isFull(s)) s->data[++(s->top)] = value;
}

static int pop(Stack *s) {
    return isEmpty(s) ? -1 : s->data[(s->top)--];
}

static int peek(const Stack *s) {
    return isEmpty(s) ? -1 : s->data[s->top];
}

// 三种括号都要匹配：栈里存左括号，遇到右括号就核对
static int isBalanced(const char *expression) {
    Stack s;
    initStack(&s);
    for (int i = 0; expression[i] != '\0'; i++) {
        char c = expression[i];
        if (c == '(' || c == '[' || c == '{') {
            push(&s, c);
        } else if (c == ')' || c == ']' || c == '}') {
            if (isEmpty(&s)) return 0;
            char open = (char)pop(&s);
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{')) return 0;
        }
    }
    return isEmpty(&s);
}

// 后缀表达式求值：操作数只支持一位数字，多位需要按空格切分
static int evaluatePostfix(const char *expression) {
    Stack s;
    initStack(&s);
    for (int i = 0; expression[i] != '\0'; i++) {
        char c = expression[i];
        if (c >= '0' && c <= '9') {
            push(&s, c - '0');
        } else if (c == '+' || c == '-' || c == '*' || c == '/') {
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
    for (int i = 0; i < 4; i++)
        printf("%-10s -> %s\n", cases[i], isBalanced(cases[i]) ? "匹配" : "不匹配");

    printf("53+82-* = %d\n", evaluatePostfix("53+82-*"));

    Stack s;
    initStack(&s);
    push(&s, 7);
    push(&s, 9);
    printf("栈顶: %d\n", peek(&s));
    printf("出栈: %d\n", pop(&s));
    return 0;
}
```

> 出栈前先判空：`pop` 里返回 `-1` 只是一个兜底，**空栈仍然取到 -1 会让答案悄悄错掉**，真正的判断要在调用处写。

### 队列（Queue）

先进先出。BFS、层序遍历、滑动窗口的单调队列都用它，**入队出队 O(1)**。顺序队列会「假溢出」（出队后前面的空间再也用不到），所以实际都用循环队列。

```c
#include <stdio.h>

#define MAX_SIZE 10

// 顺序队列：rear 一路往后走，走到 MAX_SIZE 就再也放不进东西
typedef struct {
    int data[MAX_SIZE];
    int front;
    int rear;
} SeqQueue;

static void initSeqQueue(SeqQueue *q) { q->front = q->rear = 0; }

static int seqEnqueue(SeqQueue *q, int value) {
    if (q->rear == MAX_SIZE) return 0;  // 满（可能是假溢出）
    q->data[q->rear++] = value;
    return 1;
}

static int seqDequeue(SeqQueue *q) {
    if (q->front == q->rear) return -1;  // 空
    return q->data[q->front++];
}

// 循环队列：牺牲一格区分「满」和「空」
typedef struct {
    int data[MAX_SIZE];
    int front;
    int rear;
} CirQueue;

static void initCirQueue(CirQueue *q) { q->front = q->rear = 0; }

static int cirEnqueue(CirQueue *q, int value) {
    if ((q->rear + 1) % MAX_SIZE == q->front) return 0;  // 满
    q->data[q->rear] = value;
    q->rear = (q->rear + 1) % MAX_SIZE;
    return 1;
}

static int cirDequeue(CirQueue *q) {
    if (q->front == q->rear) return -1;  // 空
    int value = q->data[q->front];
    q->front = (q->front + 1) % MAX_SIZE;
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

> 循环队列容量是 `MAX_SIZE - 1`：留一个空位才能用 `front == rear` 表示空、`(rear + 1) % MAX_SIZE == front` 表示满。要存 n 个元素就把 `MAX_SIZE` 开到 n + 1。

### 堆（Heap）

本质是完全二叉树，用数组存。**取最值 O(1)、插入和删除 O(log n)、建堆 O(n)**。Top K、Dijkstra 优化、合并 K 个有序链表都靠它。

```c
#include <stdio.h>

#define HEAP_CAP 100005

// 小顶堆：根是最小值。要大顶堆就存 -x，或者把两处比较反过来
typedef struct {
    int a[HEAP_CAP];
    int size;
} MinHeap;

static void heapInit(MinHeap *h) { h->size = 0; }

static void heapSwap(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

// 上浮：新元素放到末尾，不断和父节点比
static void heapPush(MinHeap *h, int x) {
    int i = h->size++;
    h->a[i] = x;
    while (i > 0) {
        int parent = (i - 1) / 2;
        if (h->a[parent] <= h->a[i]) break;
        heapSwap(&h->a[parent], &h->a[i]);
        i = parent;
    }
}

// 下沉：堆顶和末尾交换，长度减一，再让新堆顶沉下去
static int heapPop(MinHeap *h) {
    int top = h->a[0];
    h->a[0] = h->a[--h->size];
    int i = 0;
    for (;;) {
        int left = 2 * i + 1;
        int right = left + 1;
        int smallest = i;
        if (left < h->size && h->a[left] < h->a[smallest]) smallest = left;
        if (right < h->size && h->a[right] < h->a[smallest]) smallest = right;
        if (smallest == i) break;
        heapSwap(&h->a[i], &h->a[smallest]);
        i = smallest;
    }
    return top;
}

// 建堆：从最后一个非叶节点往前下沉，整体 O(n)，比逐个 push 的 O(n log n) 快
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

    heapBuild(&h, nums, 6);
    printf("建堆后弹出: ");
    while (h.size > 0) printf("%d ", heapPop(&h));
    printf("\n");
    return 0;
}
```

> `heapPop` 假定堆非空：`size == 0` 时先做 `--h->size` 会变成 -1，数组访问直接越界。取堆顶前先判 `h->size > 0`。

### 哈希表

顺序查找 O(n)，哈希表均摊 O(1)。这里用**链地址法**：数组每个位置挂一条链表，冲突就接在后面。

```c
#include <stdio.h>
#include <stdlib.h>

#define TABLE_SIZE 1009   // 取质数，取模分布更均匀

typedef struct HashNode {
    int key;
    int value;
    struct HashNode *next;
} HashNode;

typedef struct {
    HashNode *table[TABLE_SIZE];
} HashTable;

static void initHashTable(HashTable *ht) {
    for (int i = 0; i < TABLE_SIZE; i++) ht->table[i] = NULL;
}

static int hashFunction(int key) {
    int h = key % TABLE_SIZE;
    return h < 0 ? h + TABLE_SIZE : h;   // 负数取模在 C 里是负的
}

// key 已存在就覆盖，否则头插
static int insertHash(HashTable *ht, int key, int value) {
    int index = hashFunction(key);
    for (HashNode *cur = ht->table[index]; cur != NULL; cur = cur->next) {
        if (cur->key == key) {
            cur->value = value;
            return 1;
        }
    }
    HashNode *node = (HashNode *)malloc(sizeof(HashNode));
    if (node == NULL) return 0;
    node->key = key;
    node->value = value;
    node->next = ht->table[index];
    ht->table[index] = node;
    return 1;
}

// 用出参带回值、用返回值表示找没找到：
// 不能用 -1 当哨兵，value 本身可能就是 -1
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

static int hashDelete(HashTable *ht, int key) {
    int index = hashFunction(key);
    HashNode **link = &ht->table[index];
    while (*link != NULL) {
        if ((*link)->key == key) {
            HashNode *dead = *link;
            *link = dead->next;
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

### 并查集（Union-Find）

判断「两个元素是否在同一集合」、统计连通块个数、Kruskal 求最小生成树。**路径压缩 + 按大小合并后，单次操作接近 O(1)**。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *parent;
    int *size;
    int n;
} DSU;

static int dsuInit(DSU *d, int n) {
    d->parent = (int *)malloc((size_t)n * sizeof(int));
    d->size = (int *)malloc((size_t)n * sizeof(int));
    if (d->parent == NULL || d->size == NULL) {
        free(d->parent);
        free(d->size);
        d->parent = d->size = NULL;
        d->n = 0;
        return 0;
    }
    d->n = n;
    for (int i = 0; i < n; i++) {
        d->parent[i] = i;   // 自己是一个集合
        d->size[i] = 1;
    }
    return 1;
}

// 找根 + 路径压缩（迭代写法，不怕递归深度）
static int dsuFind(DSU *d, int x) {
    int root = x;
    while (d->parent[root] != root) root = d->parent[root];
    while (d->parent[x] != root) {
        int next = d->parent[x];
        d->parent[x] = root;
        x = next;
    }
    return root;
}

// 合并：小集合挂到大集合下面。返回 1 表示这次真的合并了两个不同的集合
static int dsuUnion(DSU *d, int a, int b) {
    int ra = dsuFind(d, a);
    int rb = dsuFind(d, b);
    if (ra == rb) return 0;
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

    int components = 0;
    for (int i = 0; i < 6; i++)
        if (dsuFind(&d, i) == i) components++;
    printf("连通块个数 = %d\n", components);
    printf("0 和 2 连通: %s\n", dsuFind(&d, 0) == dsuFind(&d, 2) ? "是" : "否");
    printf("0 和 4 连通: %s\n", dsuFind(&d, 0) == dsuFind(&d, 4) ? "是" : "否");

    dsuFree(&d);
    return 0;
}
```

### 树（Tree）

机考里出现的树只有三种：**二叉搜索树**（有序、能二分）、**平衡树**（AVL，防止退化成链表）、**用数组表示的完全二叉树**（堆，见上一节）。BST 的增删查平均 O(log n)、最坏 O(n)，AVL 用旋转把高度锁死在 O(log n)。二叉树本身的应用是文件系统目录、数据库索引、编译器的语法树。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct TreeNode {
    int data;
    int height;
    struct TreeNode *left;
    struct TreeNode *right;
} TreeNode;

static int height(const TreeNode *node) { return node ? node->height : 0; }
static int maxInt(int a, int b) { return a > b ? a : b; }

static TreeNode *newNode(int data) {
    TreeNode *node = (TreeNode *)malloc(sizeof(TreeNode));
    if (node == NULL) return NULL;
    node->data = data;
    node->height = 1;
    node->left = node->right = NULL;
    return node;
}

static TreeNode *rightRotate(TreeNode *y) {
    TreeNode *x = y->left;
    TreeNode *t2 = x->right;
    x->right = y;
    y->left = t2;
    y->height = maxInt(height(y->left), height(y->right)) + 1;
    x->height = maxInt(height(x->left), height(x->right)) + 1;
    return x;
}

static TreeNode *leftRotate(TreeNode *x) {
    TreeNode *y = x->right;
    TreeNode *t2 = y->left;
    y->left = x;
    x->right = t2;
    x->height = maxInt(height(x->left), height(x->right)) + 1;
    y->height = maxInt(height(y->left), height(y->right)) + 1;
    return y;
}

static int getBalance(const TreeNode *node) {
    return node ? height(node->left) - height(node->right) : 0;
}

// AVL 插入：普通 BST 插入 + 回溯时修正四种失衡
static TreeNode *insertAVL(TreeNode *node, int data) {
    if (node == NULL) return newNode(data);

    if (data < node->data)
        node->left = insertAVL(node->left, data);
    else if (data > node->data)
        node->right = insertAVL(node->right, data);
    else
        return node;   // 不插入重复值

    node->height = 1 + maxInt(height(node->left), height(node->right));
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

static TreeNode *insertBST(TreeNode *root, int data) {
    if (root == NULL) return newNode(data);
    if (data < root->data)
        root->left = insertBST(root->left, data);
    else if (data > root->data)
        root->right = insertBST(root->right, data);
    return root;
}

static TreeNode *minValueNode(TreeNode *node) {
    while (node && node->left != NULL) node = node->left;
    return node;
}

// BST 删除：两个孩子的节点用右子树最小值顶替
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

static void preOrder(const TreeNode *root) {
    if (root == NULL) return;
    printf("%d ", root->data);
    preOrder(root->left);
    preOrder(root->right);
}

static void inOrder(const TreeNode *root) {
    if (root == NULL) return;
    inOrder(root->left);
    printf("%d ", root->data);
    inOrder(root->right);
}

static void postOrder(const TreeNode *root) {
    if (root == NULL) return;
    postOrder(root->left);
    postOrder(root->right);
    printf("%d ", root->data);
}

// 层序遍历：用数组当队列，front 出、rear 进
static void levelOrder(const TreeNode *root) {
    if (root == NULL) return;
    const TreeNode *queue[128];
    int front = 0, rear = 0;
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

> AVL 的删除没有写：机考基本只考插入和查询，删除要么用 BST 版本，要么直接重建。**别在考场上手写 AVL 删除**，四种失衡加删除后继的组合很容易漏分支。

### 字典树（Trie）

专治「一堆字符串里有没有某个词 / 有多少个词以它开头」。插入和查询都是 **O(单词长度)**，与词库大小无关。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define ALPHABET 26
#define WORD_MAX 1005

typedef struct TrieNode {
    struct TrieNode *child[ALPHABET];
    int pass;   // 有多少个单词经过这个节点（前缀计数）
    int end;    // 有多少个单词在这里结束（完整单词计数）
} TrieNode;

static TrieNode *trieNewNode(void) {
    TrieNode *node = (TrieNode *)calloc(1, sizeof(TrieNode));
    return node;   // calloc 把所有 child 初始化为 NULL
}

static void trieInsert(TrieNode *root, const char *word) {
    TrieNode *cur = root;
    for (int i = 0; word[i] != '\0'; i++) {
        int idx = word[i] - 'a';
        if (idx < 0 || idx >= ALPHABET) continue;   // 只处理小写字母
        if (cur->child[idx] == NULL) cur->child[idx] = trieNewNode();
        cur = cur->child[idx];
        cur->pass++;
    }
    cur->end++;
}

// 完整单词出现次数
static int trieSearch(const TrieNode *root, const char *word) {
    const TrieNode *cur = root;
    for (int i = 0; word[i] != '\0'; i++) {
        int idx = word[i] - 'a';
        if (idx < 0 || idx >= ALPHABET || cur->child[idx] == NULL) return 0;
        cur = cur->child[idx];
    }
    return cur->end;
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
    printf("ap 出现 %d 次\n", trieSearch(root, "ap"));
    printf("以 ap 开头的单词有 %d 个\n", trieStartsWith(root, "ap"));

    trieFree(root);
    return 0;
}
```

> 用 `calloc` 而不是 `malloc`：它会把 `child` 数组全部清零。漏了这一步，第一次 `cur->child[idx] == NULL` 的判断就会踩到野指针。
### 图（Graph）

两种存法各有取舍：**邻接矩阵**适合稠密图和 Floyd，读写 O(1) 但空间 O(n²)；**邻接表**适合稀疏图，空间 O(n + m)。下面一份代码同时给出两者。

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
    for (int i = 0; i < vertices; i++)
        for (int j = 0; j < vertices; j++)
            graph->adjMatrix[i][j] = 0;
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

// ---------- 遍历 ----------

static void dfsListUtil(GraphList *graph, int vertex, bool visited[]) {
    visited[vertex] = true;
    printf("%d ", vertex);
    for (Node *cur = graph->adjList[vertex]; cur != NULL; cur = cur->next)
        if (!visited[cur->vertex]) dfsListUtil(graph, cur->vertex, visited);
}

static void dfsList(GraphList *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    dfsListUtil(graph, start, visited);
    printf("\n");
}

static void dfsMatrixUtil(GraphMatrix *graph, int vertex, bool visited[]) {
    visited[vertex] = true;
    printf("%d ", vertex);
    for (int i = 0; i < graph->numVertices; i++)
        if (graph->adjMatrix[vertex][i] != 0 && !visited[i])
            dfsMatrixUtil(graph, i, visited);
}

static void dfsMatrix(GraphMatrix *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    dfsMatrixUtil(graph, start, visited);
    printf("\n");
}

static void bfsList(GraphList *graph, int start) {
    bool visited[MAX_VERTICES] = {false};
    int queue[MAX_VERTICES];
    int front = 0, rear = 0;

    visited[start] = true;
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
    int front = 0, rear = 0;

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

// ---------- 最短路：Dijkstra（邻接矩阵，O(n²)） ----------

static void dijkstraMatrix(GraphMatrix *graph, int start) {
    int n = graph->numVertices;
    int dist[MAX_VERTICES];
    bool done[MAX_VERTICES];

    for (int i = 0; i < n; i++) {
        dist[i] = INT_MAX;
        done[i] = false;
    }
    dist[start] = 0;

    for (int round = 0; round < n; round++) {
        int pick = -1;
        for (int v = 0; v < n; v++)
            if (!done[v] && dist[v] != INT_MAX && (pick == -1 || dist[v] < dist[pick]))
                pick = v;
        if (pick == -1) break;   // 剩下的点都不可达

        done[pick] = true;
        for (int v = 0; v < n; v++) {
            int w = graph->adjMatrix[pick][v];
            if (!done[v] && w != 0 && dist[pick] + w < dist[v])
                dist[v] = dist[pick] + w;
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

有向无环图（DAG）上把「必须先做的事」排在前面。判据很简单：**入度为 0 的点先出队**，最后出队数量少于 n 就说明有环。

```c
#include <stdio.h>
#include <stdbool.h>

#define MAXN 1005

static int g[MAXN][MAXN];   // 4MB，放全局

// 返回 1 表示是 DAG，order 里是拓扑序；返回 0 表示有环
static int topoSort(int n, int order[]) {
    int indeg[MAXN] = {0};
    for (int u = 0; u < n; u++)
        for (int v = 0; v < n; v++)
            if (g[u][v]) indeg[v]++;

    int queue[MAXN], front = 0, rear = 0;
    for (int i = 0; i < n; i++)
        if (indeg[i] == 0) queue[rear++] = i;

    int cnt = 0;
    while (front < rear) {
        int u = queue[front++];
        order[cnt++] = u;
        for (int v = 0; v < n; v++) {
            if (g[u][v] && --indeg[v] == 0) queue[rear++] = v;
        }
    }
    return cnt == n;
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

> 有环时 `cnt < n`，剩下那些点的入度永远降不到 0。**不要用「队列空了就结束」当成功判据**，必须比数量。

#### 最小生成树（Kruskal）

按边权从小到大排序，能合并就合并。排序一次 O(m log m)，并查集接近 O(1)，是稀疏图的首选。

```c
#include <stdio.h>
#include <stdlib.h>

#define MAXN 1005
#define MAXM 100005

typedef struct {
    int u, v, w;
} Edge;

static int cmpEdge(const void *a, const void *b) {
    int x = ((const Edge *)a)->w;
    int y = ((const Edge *)b)->w;
    return (x > y) - (x < y);
}

static int parent[MAXN];

static int findRoot(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // 路径减半，够用且好写
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
        if (ru == rv) continue;   // 已经连通，加进去会成环
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

求**任意两点**之间的最短路，三重循环，O(n³)。n ≤ 500 时稳稳能过，代码只有十行。

```c
#include <stdio.h>
#include <limits.h>

#define MAXN 505

static int dist[MAXN][MAXN];   // 1MB，放全局

static void floyd(int n) {
    for (int k = 0; k < n; k++)              // 中转点必须在外层
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] != INT_MAX && dist[k][j] != INT_MAX &&
                    dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];
}

int main(void) {
    int n = 4;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = (i == j) ? 0 : INT_MAX;

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

> `k` 必须在最外层。写成 `i, j, k` 的结果是错的：`dist[i][j]` 在更新时还没经过所有中转点，而 Floyd 的正确性依赖「第 k 轮只允许经过 0..k 这些点」。

#### 堆优化的 Dijkstra

稀疏图上 O((n + m) log m)，比邻接矩阵的 O(n²) 快一个量级。要点是 `dist` 更新后把新状态压堆，弹出时用 `cur.dist != dist[cur.v]` 丢掉过期项。

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
        if (cur.dist != dist[cur.v]) continue;   // 懒删除：这是旧状态
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

> 堆里允许有同一个点的多个版本，**不要试图在堆里改值**（改不了）。弹出时跳过过期项就够了，堆大小最多 m，不会爆。

## 三、算法

### 排序算法

七种常用排序一次给全。机考里真正要手写的只有**归并**（求逆序对）和**快排**（求第 k 大），其余直接 `qsort`。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void swapInt(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

// 冒泡：稳定，O(n²)
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

// 插入：稳定，近乎有序时接近 O(n)
static void insertionSort(int arr[], int n) {
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

// 选择：不稳定，交换次数最少（n-1 次）
static void selectionSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int minIndex = i;
        for (int j = i + 1; j < n; j++)
            if (arr[j] < arr[minIndex]) minIndex = j;
        if (minIndex != i) swapInt(&arr[i], &arr[minIndex]);
    }
}

static void merge(int arr[], int l, int m, int r) {
    int n1 = m - l + 1;
    int n2 = r - m;
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
    while (i < n1 && j < n2) arr[k++] = (left[i] <= right[j]) ? left[i++] : right[j++];
    while (i < n1) arr[k++] = left[i++];
    while (j < n2) arr[k++] = right[j++];
    free(left);
    free(right);
}

// 归并：稳定，O(n log n)，求逆序对的基础
static void mergeSort(int arr[], int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSort(arr, l, m);
    mergeSort(arr, m + 1, r);
    merge(arr, l, m, r);
}

static int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swapInt(&arr[i], &arr[j]);
        }
    }
    swapInt(&arr[i + 1], &arr[high]);
    return i + 1;
}

// 快排：不稳定，平均 O(n log n)
static void quickSort(int arr[], int low, int high) {
    if (low >= high) return;
    int p = partition(arr, low, high);
    quickSort(arr, low, p - 1);
    quickSort(arr, p + 1, high);
}

static void heapify(int arr[], int n, int i) {
    int largest = i;
    int l = 2 * i + 1;
    int r = 2 * i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest != i) {
        swapInt(&arr[i], &arr[largest]);
        heapify(arr, n, largest);
    }
}

// 堆排：不稳定，O(n log n)，空间 O(1)
static void heapSort(int arr[], int n) {
    for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
    for (int i = n - 1; i > 0; i--) {
        swapInt(&arr[0], &arr[i]);
        heapify(arr, i, 0);
    }
}

static int getMax(const int arr[], int n) {
    int mx = arr[0];
    for (int i = 1; i < n; i++)
        if (arr[i] > mx) mx = arr[i];
    return mx;
}

// 计数排序：按「第 exp 位」排一轮，radixSort 调它
static void countSort(int arr[], int n, int exp) {
    int *output = (int *)malloc((size_t)n * sizeof(int));
    if (output == NULL) return;
    int count[10] = {0};

    for (int i = 0; i < n; i++) count[(arr[i] / exp) % 10]++;
    for (int i = 1; i < 10; i++) count[i] += count[i - 1];
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[--count[digit]] = arr[i];
    }
    for (int i = 0; i < n; i++) arr[i] = output[i];
    free(output);
}

// 基数：非负数专用，O(d(n+10))
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

    memcpy(arr, base, sizeof base); bubbleSort(arr, n);    printf("冒泡    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); insertionSort(arr, n); printf("插入    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); selectionSort(arr, n); printf("选择    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); mergeSort(arr, 0, n - 1); printf("归并    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); quickSort(arr, 0, n - 1); printf("快排    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); heapSort(arr, n);      printf("堆排    "); printArray(arr, n);
    memcpy(arr, base, sizeof base); radixSort(arr, n);     printf("基数    "); printArray(arr, n);
    return 0;
}
```

> 快排的 `pivot` 取的是末位元素，**原始数据已经有序时会退化成 O(n²)**（每轮只分出一个）。机考数据如果可能有序，用 `qsort` 或者随机选 pivot。

### 查找算法

线性 O(n)，二分 O(log n)。二分真正容易错的不是循环，是**边界**：`while (left <= right)` 配 `right = mid - 1`、`while (left < right)` 配 `right = mid`，两种写法不能混。

```c
#include <stdio.h>

static int linearSearch(const int arr[], int n, int target) {
    for (int i = 0; i < n; i++)
        if (arr[i] == target) return i;
    return -1;
}

// 找到就返回下标，找不到返回 -1
static int binarySearch(const int arr[], int left, int right, int target) {
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

// 第一个 >= target 的位置（找不到就是 n），等价 C++ 的 lower_bound
static int lowerBound(const int arr[], int n, int target) {
    int left = 0, right = n;
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] < target) left = mid + 1;
        else right = mid;
    }
    return left;
}

// 第一个 > target 的位置，等价 C++ 的 upper_bound
static int upperBound(const int arr[], int n, int target) {
    int left = 0, right = n;
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

    printf("线性查找 50: %d\n", linearSearch(arr, n, target));
    printf("二分查找 50: %d\n", binarySearch(arr, 0, n - 1, target));
    printf("二分查找 55: %d\n", binarySearch(arr, 0, n - 1, 55));
    printf("lower_bound 50: %d\n", lowerBound(arr, n, 50));
    printf("upper_bound 50: %d\n", upperBound(arr, n, 50));

    // 用两个边界数出「值等于 50 的元素个数」
    printf("50 出现次数: %d\n", upperBound(arr, n, 50) - lowerBound(arr, n, 50));
    return 0;
}
```

> 二分期间 `mid` 写 `(left + right) / 2` 在 `left`、`right` 都接近 `INT_MAX` 时会溢出；写成 `left + (right - left) / 2` 永远安全。
### 双指针与滑动窗口

双指针解决「有序数组里找一对」，滑动窗口解决「连续子数组/子串满足某条件」。两者共用一个前提：**左右指针都只往右走**，所以总移动次数是 O(n)。

```c
#include <stdio.h>

// 1. 有序数组两数之和：和偏小就左指针右移，偏大就右指针左移
static int twoSumSorted(const int *a, int n, int target, int *pi, int *pj) {
    int i = 0, j = n - 1;
    while (i < j) {
        int sum = a[i] + a[j];
        if (sum == target) {
            *pi = i;
            *pj = j;
            return 1;
        }
        if (sum < target) i++;
        else j--;
    }
    return 0;
}

// 2. 最长无重复字符子串：last[c] 记录字符上次出现的位置
static int longestUnique(const char *s) {
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;

    int best = 0, left = 0;
    for (int right = 0; s[right] != '\0'; right++) {
        unsigned char c = (unsigned char)s[right];   // char 可能是负数，先转无符号
        if (last[c] >= left) left = last[c] + 1;     // 左边界只能往右走
        last[c] = right;
        if (right - left + 1 > best) best = right - left + 1;
    }
    return best;
}

// 3. 定长窗口最大值：单调队列存下标，队首永远是窗口内最大值的下标
static void windowMax(const int *a, int n, int k, int *out) {
    int q[100005];
    int head = 0, tail = 0;   // 队列区间 [head, tail)

    for (int i = 0; i < n; i++) {
        while (head < tail && a[q[tail - 1]] <= a[i]) tail--;  // 比新元素小的没用了
        q[tail++] = i;
        if (q[head] <= i - k) head++;                          // 队首滑出窗口
        if (i >= k - 1) out[i - k + 1] = a[q[head]];
    }
}

int main(void) {
    int a[] = {1, 3, 5, 7, 9, 11};
    int i = 0, j = 0;
    if (twoSumSorted(a, 6, 12, &i, &j)) printf("两数之和下标: %d, %d\n", i, j);

    printf("最长无重复子串: %d\n", longestUnique("abcbbad"));

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

> 滑动窗口里 `left` 只增不减。写成 `left = last[c] + 1` 而不和当前 `left` 取 max，遇到 `"abba"` 这种回头的字符会让窗口左边界倒退，答案偏大。

### 前缀和与差分

**前缀和**把区间求和从 O(n) 降到 O(1)；**差分**反过来，把区间加值从 O(n) 降到 O(1)，最后统一还原。两者互为逆运算。

```c
#include <stdio.h>

// pre[i] 表示前 i 个元素的和，pre[0] = 0
static void buildPrefix(const int *a, int n, long long *pre) {
    pre[0] = 0;
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];
}

// 闭区间 [l, r] 的和，下标从 0 开始
static long long rangeSum(const long long *pre, int l, int r) {
    return pre[r + 1] - pre[l];
}

// 差分：区间 [l, r] 整体加 v
static void rangeAdd(long long *diff, int n, int l, int r, long long v) {
    diff[l] += v;
    if (r + 1 < n) diff[r + 1] -= v;
}

// 对差分数组求前缀和，还原出每个位置的累计增量
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
    printf("下标 1~3 的和 = %lld\n", rangeSum(pre, 1, 3));

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

> 差分数组的长度要覆盖到 `r + 1`。`r + 1 == n` 时那一项越界，必须判掉 —— 判掉不影响结果，因为后面没有元素需要减回来。

### 递归与回溯

回溯 = 递归 + 撤销选择。模板固定三步：**做选择 → 递归 → 撤销**。子集、排列、N 皇后都是这一套。

```c
#include <stdio.h>

static int nums[] = {1, 2, 3};
static int n = 3;

// ---------- 子集：每个元素「选 / 不选」 ----------
static void printPath(const int *path, int len) {
    printf("{ ");
    for (int i = 0; i < len; i++) printf("%d ", path[i]);
    printf("}\n");
}

static void subsets(int idx, int *path, int len) {
    if (idx == n) {
        printPath(path, len);
        return;
    }
    subsets(idx + 1, path, len);        // 不选 idx
    path[len] = nums[idx];              // 选 idx
    subsets(idx + 1, path, len + 1);
}

// ---------- 全排列：用 used 标记哪些元素已经在路径里 ----------
static int used[3];
static int perm[3];

static void permute(int depth) {
    if (depth == n) {
        printPath(perm, n);
        return;
    }
    for (int i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = 1;
        perm[depth] = nums[i];
        permute(depth + 1);
        used[i] = 0;                    // 撤销，别漏
    }
}

// ---------- N 皇后：列 + 两条对角线各一个标记数组 ----------
static int cols[8], diag1[16], diag2[16];
static int queenN = 6, queenCount = 0;

static void nQueens(int row) {
    if (row == queenN) {
        queenCount++;
        return;
    }
    for (int c = 0; c < queenN; c++) {
        if (cols[c] || diag1[row + c] || diag2[row - c + queenN]) continue;
        cols[c] = diag1[row + c] = diag2[row - c + queenN] = 1;
        nQueens(row + 1);
        cols[c] = diag1[row + c] = diag2[row - c + queenN] = 0;
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

> 撤销那一步写在递归**后面**，而且必须原样撤销。漏掉 `used[i] = 0` 的症状很典型：第一个排列之后就没有后续了，因为所有元素都还标着已用。

### 贪心

每一步都选当前看起来最好的，且**不需要回头**。能用贪心的题都有一个可证明的性质（区间调度是按右端点、跳跃游戏是维护最远可达），证不出来就老实写 DP。

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int l, r;
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
    int count = 1;
    int end = arr[0].r;
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
    for (int i = 0; i < n && i <= reach; i++) {
        if (i + a[i] > reach) reach = i + a[i];
        if (reach >= n - 1) return 1;
    }
    return reach >= n - 1;
}

int main(void) {
    Interval arr[] = {{1, 3}, {2, 5}, {3, 6}, {5, 7}, {6, 9}};
    printf("最多能参加的场次: %d\n", maxNonOverlap(arr, 5));

    int jumps[] = {2, 3, 1, 1, 4};
    printf("能否到达终点: %s\n", canJump(jumps, 5) ? "能" : "不能");
    return 0;
}
```

> 区间调度必须按**右端点**排。按左端点排会选出「最早开始但最长」的那个，把后面全挡住 —— 样例 `[0,10], [1,2], [2,3]` 一眼能看出差别。

### 动态规划

DP 的通用四步：**定义状态 → 写转移 → 定初值 → 定遍历顺序**。下面五个模型覆盖机考绝大多数题：01 背包、完全背包、LIS、LCS、编辑距离。

```c
#include <stdio.h>
#include <string.h>

#define MAXC 1005

// ---------- 01 背包：每件物品最多拿一次，容量必须倒序 ----------
static int knapsack01(const int *w, const int *v, int n, int cap) {
    int dp[MAXC] = {0};
    for (int i = 0; i < n; i++)
        for (int c = cap; c >= w[i]; c--)
            if (dp[c - w[i]] + v[i] > dp[c]) dp[c] = dp[c - w[i]] + v[i];
    return dp[cap];
}

// ---------- 完全背包：每件物品可以拿无限次，容量正序 ----------
static int knapsackComplete(const int *w, const int *v, int n, int cap) {
    int dp[MAXC] = {0};
    for (int i = 0; i < n; i++)
        for (int c = w[i]; c <= cap; c++)
            if (dp[c - w[i]] + v[i] > dp[c]) dp[c] = dp[c - w[i]] + v[i];
    return dp[cap];
}

// ---------- LIS：tails[len-1] 是长度为 len 的上升子序列的最小结尾 ----------
static int lis(const int *a, int n) {
    int tails[MAXC];
    int len = 0;
    for (int i = 0; i < n; i++) {
        int left = 0, right = len;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (tails[mid] < a[i]) left = mid + 1;
            else right = mid;
        }
        tails[left] = a[i];
        if (left == len) len++;
    }
    return len;
}

// ---------- LCS：滚动数组，只保留上一行 ----------
static int lcs(const char *a, const char *b) {
    int la = (int)strlen(a), lb = (int)strlen(b);
    int prev[MAXC] = {0}, cur[MAXC] = {0};

    for (int i = 1; i <= la; i++) {
        cur[0] = 0;
        for (int j = 1; j <= lb; j++) {
            if (a[i - 1] == b[j - 1]) cur[j] = prev[j - 1] + 1;
            else cur[j] = prev[j] > cur[j - 1] ? prev[j] : cur[j - 1];
        }
        memcpy(prev, cur, (size_t)(lb + 1) * sizeof(int));
    }
    return prev[lb];
}

// ---------- 编辑距离：插入 / 删除 / 替换 ----------
static int editDistance(const char *a, const char *b) {
    int la = (int)strlen(a), lb = (int)strlen(b);
    int prev[MAXC], cur[MAXC];

    for (int j = 0; j <= lb; j++) prev[j] = j;   // a 为空时只能逐个插入
    for (int i = 1; i <= la; i++) {
        cur[0] = i;                              // b 为空时只能逐个删除
        for (int j = 1; j <= lb; j++) {
            if (a[i - 1] == b[j - 1]) {
                cur[j] = prev[j - 1];
            } else {
                int best = prev[j - 1];              // 替换
                if (prev[j] < best) best = prev[j];  // 删除
                if (cur[j - 1] < best) best = cur[j - 1];  // 插入
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
    printf("01 背包容量 8: %d\n", knapsack01(w, v, 4, 8));
    printf("完全背包容量 8: %d\n", knapsackComplete(w, v, 4, 8));

    int a[] = {10, 9, 2, 5, 3, 7, 101, 18};
    printf("LIS 长度: %d\n", lis(a, 8));

    printf("LCS 长度: %d\n", lcs("ABCBDAB", "BDCABA"));
    printf("编辑距离: %d\n", editDistance("horse", "ros"));
    return 0;
}
```

> 01 背包容量必须**倒序**：正序会让同一件物品被重复放入，那就变成完全背包了。完全背包反过来必须正序，一次拿多件。

### 字符串算法

BF 是暴力逐个起点比较，O(nm)；KMP 用 `next`（`lps`）数组跳过已匹配的前缀，O(n + m)。机考里 `strstr` 已经够用，但**要求输出所有匹配位置**时还得自己写。

```c
#include <stdio.h>
#include <string.h>

// ---------- BF：每个起点都比一遍 ----------
static int bfSearch(const char *pat, const char *txt) {
    int m = (int)strlen(pat), n = (int)strlen(txt);
    for (int i = 0; i + m <= n; i++) {
        int j = 0;
        while (j < m && txt[i + j] == pat[j]) j++;
        if (j == m) return i;
    }
    return -1;
}

// ---------- KMP：失败时跳到「最长相等前后缀」之后 ----------
static void buildLps(const char *pat, int m, int *lps) {
    lps[0] = 0;
    int len = 0, i = 1;
    while (i < m) {
        if (pat[i] == pat[len]) {
            lps[i++] = ++len;
        } else if (len != 0) {
            len = lps[len - 1];
        } else {
            lps[i++] = 0;
        }
    }
}

// 返回匹配次数（允许重叠），positions 记录每次的起始下标
static int kmpSearchAll(const char *pat, const char *txt, int *positions) {
    int m = (int)strlen(pat), n = (int)strlen(txt);
    if (m == 0 || m > n) return 0;

    int lps[1005];
    buildLps(pat, m, lps);

    int i = 0, j = 0, count = 0;
    while (i < n) {
        if (txt[i] == pat[j]) {
            i++;
            j++;
        }
        if (j == m) {
            positions[count++] = i - j;
            j = lps[j - 1];        // 继续找下一个，允许重叠
        } else if (i < n && txt[i] != pat[j]) {
            if (j != 0) j = lps[j - 1];
            else i++;
        }
    }
    return count;
}

// ---------- 字符串哈希：把子串映射成整数，O(n + m) ----------
typedef unsigned long long ull;
#define BASE 131ULL

static int hashCount(const char *pat, const char *txt) {
    int m = (int)strlen(pat), n = (int)strlen(txt);
    if (m == 0 || m > n) return 0;

    ull ph = 0, th = 0, power = 1;
    for (int i = 0; i < m; i++) {
        ph = ph * BASE + (unsigned char)pat[i];
        th = th * BASE + (unsigned char)txt[i];
        power *= BASE;
    }

    int count = (th == ph);
    for (int i = m; i < n; i++) {
        th = th * BASE + (unsigned char)txt[i] - power * (unsigned char)txt[i - m];
        if (th == ph) count++;
    }
    return count;
}

int main(void) {
    const char *txt = "ABABDABACDABABCABAB";
    const char *pat = "ABABCABAB";

    printf("BF 首次出现: %d\n", bfSearch(pat, txt));

    int positions[64];
    int count = kmpSearchAll(pat, txt, positions);
    printf("KMP 匹配次数: %d", count);
    for (int i = 0; i < count; i++) printf(" @%d", positions[i]);
    printf("\n");

    printf("哈希匹配次数: %d\n", hashCount("AB", txt));
    return 0;
}
```

> KMP 找到一次匹配后 `j = lps[j - 1]` 而不是 `j = 0`：这样重叠的匹配（如 `"aa"` 在 `"aaa"` 里出现 2 次）才数得全。`lps` 开的是 1005，模式串更长时记得改大；`positions` 是调用方给的缓冲区，最坏情况每个位置都能匹配，容量要按文本长度准备。
>
> 哈希法有极小概率撞键（不同的子串算出同一个值），要求绝对正确时用 KMP；哈希的价值在于**预处理一次就能 O(1) 取任意子串的哈希**，而不只是数匹配。

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
