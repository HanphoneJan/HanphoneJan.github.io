import type {NodeKind} from './snippet';

/**
 * 生成 Python 驱动代码。纯字符串拼接，无 React / 无 DOM，所以能被单测直接断言。
 *
 * ## 执行分三步，同一个 globals
 *
 *   1. prelude  —— 登记 linecache（让 traceback 带出源码行）+ 接管 sys.stdin
 *   2. 用户代码 —— filename 指向它自己，行号与编辑器里的行号一一对应
 *   3. 驱动    —— 调用入口、序列化结果
 *
 * 三步必须共用同一个 globals，否则第 3 步看不到第 2 步定义的类/函数。
 * 也不能把驱动拼在代码后面一次执行：那样 linecache 里只有用户代码的行，
 * 驱动里出的错会显示成错的源码行。
 */

/**
 * 把**返回值**序列化成「题解里写的样子」（数组而不是对象）。
 *
 * 返回链表/树的题（0002、0025、0104…）期望值写的是 `[1,2,3]` / `[1,2,3,4,5]`
 * 这样的数组，直接 json.dumps 一个 ListNode 对象只会得到
 * `"<__main__.Solution.ListNode object>"`，于是每组样例都判失败 ——
 * 那是我们的错，不是读者的。
 *
 * depth 上限是安全网：防住自引用结构导致的无限递归。
 */
const ENCODER = `def __enc__(v, __d__=0):
    if __d__ > 64:
        return '...'
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, (list, tuple)):
        return [__enc__(x, __d__ + 1) for x in v]
    if isinstance(v, dict):
        return {str(k): __enc__(x, __d__ + 1) for k, x in v.items()}
    # **先判树再判链表**。
    #
    # 0114 把二叉树展开成「只有右孩子的链表」，返回的是 TreeNode，
    # 它既有 next 也有 left。判成链表会输出 [1,2,3,4,5,6]，
    # 而题面的期望值是树形态的 [1,null,2,null,3,null,4,null,5,null,6] ——
    # 判成树就正好对上。纯链表（0002/0019/0023）没有 left 属性，
    # 仍然走链表分支，不受影响。
    if hasattr(v, 'val') and hasattr(v, 'left'):
        return __enc_tree__(v)
    if hasattr(v, 'val') and hasattr(v, 'next'):
        if hasattr(v, 'random'):
            return __enc_rand__(v)
        __r__, __seen__ = [], set()
        while v is not None and id(v) not in __seen__:
            __seen__.add(id(v))
            __r__.append(__enc__(v.val, __d__ + 1))
            v = v.next
        return __r__
    return str(v)

def __enc_rand__(head):
    # 0138 的题面把 random 指针写成**下标**：[[7,null],[13,0],[11,4],...]
    # 里的 0 是「指向第 0 个节点」，不是「指向值为 0 的节点」（链表里没有 0）。
    # 示例 2 的 [[1,1],[2,1]] 也是下标：第 2 个节点的 random 指向下标 1。
    # 入参按这个约定还原、返回值也按同一个约定输出，两边才凑得齐。
    __idx__ = {}
    __n__, __i__ = head, 0
    while __n__ is not None and id(__n__) not in __idx__:
        __idx__[id(__n__)] = __i__
        __n__ = __n__.next
        __i__ += 1
    __out__ = []
    __n__ = head
    while __n__ is not None:
        __r__ = getattr(__n__, 'random', None)
        __out__.append([__enc__(__n__.val), None if __r__ is None else __idx__.get(id(__r__))])
        __n__ = __n__.next
    return __out__

def __enc_tree__(root):    # **层序**输出，和题解里的期望值一致。
    # 力扣题面的示例（也就是题解抄下来的那些）一律是层序：
    #   输入 [4,7,2,9,6,3,1] -> 输出 [1,2,4,7,3,6,9,5]
    # 而不是力扣内部用于比对的递归 [left, val, right]。
    # 输出成递归格式的话每一棵树题都会判失败，而错的是我们不是读者的代码。
    __out__ = []
    if root is None:
        return __out__
    __out__.append(__enc__(root.val))
    __q__ = [root]
    while __q__:
        __n__ = __q__.pop(0)
        for __slot__ in ('left', 'right'):
            __c__ = getattr(__n__, __slot__, None)
            __out__.append(None if __c__ is None else __enc__(__c__.val))
            if __c__ is not None:
                __q__.append(__c__)
    # 去掉尾部多余的 null：叶子节点会各补两个，力扣的期望值里没有
    while __out__ and __out__[-1] is None:
        __out__.pop()
    return __out__

def __j__(v):
    # json.dumps 会把 None 写成 Python 的 None，而题面写的是 JavaScript 的
    # null。不改的话两边的 JSON 都解析不了，比较必然失败。
    # 只替换不在引号里的 None（负向前瞻保证字符串里的 "None" 不受影响）。
    return __re__.sub(r'(?<!["\\w])None(?!["\\w])', 'null', __json__.dumps(v, default=str, ensure_ascii=False))

def __dump_text__(v):
    # 按「程序打印出来」的样子序列化，而不是 JSON。
    # 期望值是 stdout 文本时必须用这个：函数返回字符串 "0"、程序打印 0，
    # 按 JSON 比会判成不一致，而代码其实是对的。
    # （注意：这个文件里的 Python 代码嵌在 TS 模板字符串中，
    #   注释里不能出现反引号，否则会提前结束模板字符串。）
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return '[' + ', '.join(__dump_text__(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ', '.join(str(k) + ': ' + __dump_text__(x) for k, x in v.items()) + '}'
    if v is None:
        return 'null'
    return str(v)`;

/**
 * 把**入参**里的数组字面量还原成链表/树对象。
 *
 * 题解的样例写 `l1 = [2,4,3]`，代码里访问 `l1.val`。直接把 list 传进去必然
 * `AttributeError`，每组样例都判失败。力扣真实评测传的是 ListNode，
 * 所以这里要还原的正是这一步。
 *
 * ## 两种结构必须显式区分，不能靠「数组长度是不是 3」去猜
 *
 * 二叉树在力扣的格式是 `[left, val, right]` —— 长度恰好 3，和三个元素的链表
 * 在字面量上完全一样。0002 的样例就是 `[2,4,3]`，猜成树就会得到
 * `'TreeNode' object has no attribute 'next'`，一个看起来像代码 bug 的假象。
 * 所以 `__kinds__` 由 JS 侧按**类型标注**算好传进来。
 *
 * **必须走类自己的构造函数**：不能手搓一个只带 val/next 的对象 ——
 * 有些题解给 ListNode 加了额外字段（比如 tag），手搓的对象会缺字段。
 */
const BUILDER = `def __mk__(v, __k__):
    if __k__ == 'list':
        if isinstance(v, list) and not v:
            # 空数组原样传：0023 的 mergeKLists([]) 里 lists 就是个空列表，
            # 建成 None 的话 enumerate(None) 直接 TypeError
            return v
        if isinstance(v, list) and all(x is None or isinstance(x, (int, float, str, bool)) for x in v):
            return __mk_list__(v)
        # 链表**数组**：0023 的签名是 List[ListNode]，样例给的是 [[1,4,5],[1,3,4]]
        # 逐个建链表。不处理的话元素还是 list，代码里 l1.val 立刻 AttributeError。
        if isinstance(v, list) and all(isinstance(x, list) for x in v):
            return [__mk_list__(x) for x in v]
        return v
    if __k__ == 'randlist':
        # 0138 的样例 [[7,null],[13,0],[11,4],...]：每项是「值 + random 指向的
        # **下标**」。先按值建出整条链，再按下标把 random 指针接上
        # （力扣的评测驱动就是这么构造输入的）。
        if isinstance(v, list) and v and all(isinstance(x, list) and len(x) == 2 for x in v):
            __head__ = __mk_list__([x[0] for x in v])
            __nodes__ = []
            __cur__ = __head__
            while __cur__ is not None:
                __nodes__.append(__cur__)
                __cur__ = __cur__.next
            __cur__ = __head__
            for __pair__ in v:
                __t__ = __pair__[1]
                __cur__.random = None if __t__ is None or not isinstance(__t__, int) or __t__ >= len(__nodes__) else __nodes__[__t__]
                __cur__ = __cur__.next
            return __head__
        return __mk__(v, 'list')
    if __k__ == 'tree':
        if isinstance(v, list) and v:
            return __mk_tree__(v)
        return v
    return v


def __find__(root, val):
    # 0236：题面给的 p / q 是**节点值**（p = 5），而签名要的是 TreeNode 对象。
    # 力扣的评测驱动就是到树里按值找节点，这里照做。
    if root is None:
        return None
    if hasattr(root, 'val') and root.val == val:
        return root
    for slot in ('left', 'right'):
        __c__ = getattr(root, slot, None)
        if __c__ is not None:
            __hit__ = __find__(__c__, val)
            if __hit__ is not None:
                return __hit__
    if hasattr(root, 'next'):
        return __find__(root.next, val)
    return None`;

/**
 * 力扣平台预置的链表/树节点类。
 *
 * ## 为什么题解里经常找不到它们的定义
 *
 * 力扣评测时 `ListNode` / `TreeNode` / `Node` 是平台给好的，题解代码直接用。
 * 但题解写成独立 md 之后，一部分代码块就没带上定义 —— 于是 `l1.val` 直接
 * `NameError: name 'ListNode' is not defined`，每组样例都失败。
 * 读者会以为是自己写错了，其实他读的代码在真平台上跑得通。
 *
 * 所以这里补上，跟平台保持一致。用 `globals().setdefault`：
 * 题解自己定义了同名类的话以题解为准（它的 `__init__` 可能带额外字段）。
 */
/**
 * 接管 stdin 的小类。
 *
 * 必须是 StringIO 的**子类**才能挂 `.buffer`：原生 `_io.StringIO` 没有 __dict__，
 * 直接赋值会抛
 *   AttributeError: '_io.StringIO' object has no attribute 'buffer'
 * 而不少 ACM 题解就是 `sys.stdin.buffer.read().split()`（HJ24 是其中一篇）——
 * 那个报错看起来像是读者的代码写错了。
 *
 * 同时这也是「不让标签页卡死」的关键：Python 跑在主线程上，
 * JS 定时器救不了它，读 stdin 卡住就是整个标签页卡死。
 */
const STDIN_SHIM = `class __StdinBuf__:
    # 只借用 owner 的游标，不自己维护位置 —— 这样文本读与字节读天然同步，
    # 跟真实终端一致（stdin 是 TextIOWrapper 包着 BufferedReader）。
    def __init__(self, __owner__):
        self.__o__ = __owner__

    def read(self, __n__=-1):
        return self.__o__.__take__(__n__).encode()

    def readline(self):
        return self.__o__.__take_line__().encode()

    def readlines(self):
        return list(iter(self.readline, b''))

    def __iter__(self):
        return iter(self.readline, b'')

    def readable(self):
        return True


class __Stdin__:
    def __init__(self, __s__=''):
        self.__s__ = __s__
        self.__p__ = 0
        self.buffer = __StdinBuf__(self)

    def __take__(self, __n__=-1):
        if __n__ is None or __n__ < 0:
            __d__ = self.__s__[self.__p__:]
            self.__p__ = len(self.__s__)
            return __d__
        __d__ = self.__s__[self.__p__:self.__p__ + __n__]
        self.__p__ += len(__d__)
        return __d__

    def __take_line__(self):
        __i__ = self.__s__.find('\\n', self.__p__)
        __end__ = len(self.__s__) if __i__ == -1 else __i__ + 1
        return self.__take__(__end__ - self.__p__)

    def read(self, __n__=-1):
        return self.__take__(__n__)

    def readline(self):
        return self.__take_line__()

    def readlines(self):
        return list(iter(self.readline, ''))

    def __iter__(self):
        return iter(self.readline, '')

    def readable(self):
        return True`;

const LEETCODE_TYPES = `__ns__ = globals()
if 'ListNode' not in __ns__:
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next

        def __repr__(self):
            return f'ListNode({self.val})'

if 'TreeNode' not in __ns__:
    class TreeNode:
        def __init__(self, val=0, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right

        def __repr__(self):
            return f'TreeNode({self.val})'

if 'Node' not in __ns__:
    class Node:
        def __init__(self, val=0, left=None, right=None, next=None):
            self.val = val
            self.left = left
            self.right = right
            self.next = next

        def __repr__(self):
            return f'Node({self.val})'

def __mk_list__(values):
    __cls__ = globals()['ListNode']
    __head__ = None
    for __v__ in values:
        __n__ = __cls__(__v__)
        if __head__ is None:
            __head__ = __n__
        else:
            __cur__ = __head__
            while __cur__.next is not None:
                __cur__ = __cur__.next
            __cur__.next = __n__
    return __head__

def __mk_tree__(v):
    # 按力扣的**层序**格式建树：[3,9,20,None,None,15,7]
    # 第一个是根，接下来是它的左右孩子，一层一层往下，None 表示没有孩子。
    #
    # 不是递归的 [left, val, right] 格式 —— 那是力扣「序列化」时的写法，
    # 而题面示例一律用层序。两种格式在字面量上无法区分（都是长度 3 的数组），
    # 所以只能按题面的实际约定来。
    __cls__ = globals()['TreeNode']
    if not v:
        return None
    __root__ = __cls__(v[0])
    __queue__ = [__root__]
    __i__ = 1
    while __queue__ and __i__ < len(v):
        __node__ = __queue__.pop(0)
        for __slot__ in ('left', 'right'):
            if __i__ >= len(v):
                break
            __val__ = v[__i__]
            __i__ += 1
            if __val__ is None:
                continue
            __child__ = __cls__(__val__)
            setattr(__node__, __slot__, __child__)
            __queue__.append(__child__)
    return __root__

def __mk_plain__(v, __d__=0):
    if __d__ > 32 or not isinstance(v, list):
        return v
    return [__mk_plain__(x, __d__ + 1) for x in v]`;

/**
 * 前置代码：把源码塞进 linecache、接管 stdin、补平台预置的类。
 *
 * ## linecache 这一步是「让学习更容易」里最值钱的一处
 *
 * CPython 打印 traceback 时会拿 filename 去 linecache 找源码行。
 * 默认 filename 是 `<exec>`，找不到，于是只有行号没有代码 ——
 * 读者看到 `line 4, in <module>` 完全不知道第 4 行写了什么。
 * 自己登记之后：
 *
 *   File "snippet-1.py", line 4, in twoSum
 *       if num in hashtable:
 *   KeyError: ...
 *
 * ## 接管 sys.stdin 是为了不让标签页卡死
 *
 * 牛客题的完整代码里有 `for line in sys.stdin`。Pyodide 默认的 stdin 行为不可控，
 * 读它可能一直阻塞，而 Python 跑在主线程上，JS 定时器都救不了 ——
 * 整个标签页就没救了。用 StringIO 兜底，读完立刻 EOF。
 */
export function buildPrelude(opts: {
  filename: string;
  code: string;
  stdin: string;
}): string {
  // 每行必须**带上换行符**再存进 linecache —— 这是 linecache 的约定格式
  // （`cache[name] = (size, mtime, lines, fullname)`，lines 是 keepends 的列表）。
  // 用 match 而不是 split('\n')：后者会把换行符吃掉，而依赖 getlines()
  // 再 join 的调用方会错位。真的踩过：单测断言逼出来的。
  const lines = opts.code.match(/[^\n]*\n|[^\n]+/g) ?? [];
  return [
    'import linecache as __lc__',
    'import sys as __sys__',
    'import io as __io__',
    'import re as __re__',
    STDIN_SHIM,
    `__lc__.cache[${JSON.stringify(opts.filename)}] = (0, None, ${JSON.stringify(lines)}, ${JSON.stringify(opts.filename)})`,
    `__sys__.stdin = __Stdin__(${JSON.stringify(opts.stdin)})`,
    // 编码器放在 prelude 里执行，而不是只留在驱动里：
    // 驱动里的 def 属于**驱动自己的 globals**？不对 —— 它们共用同一个 dict，
    // 所以能互相看到。这里显式执行一次，是为了让 ENCODER/BUILDER 这两段
    // 无论驱动走不走（stdin 模式没有驱动）都可用，也避免依赖「驱动一定会跑」
    // 这个隐含前提（踩过：stdin 模式下 __mk_list__ 不存在，链表样例直接崩）。
    ENCODER,
    BUILDER,
    LEETCODE_TYPES,
  ].join('\n');
}

/**
 * 返回值是 None 时，题面的「输出」到底是什么。
 *
 * 力扣有一批题**要求原地修改入参、函数本身不返回任何东西**：
 * 0283 moveZeroes、0048 rotate、0073 setZeroes、0075 sortColors、0114 flatten、
 * 0089、0348… 题面写的「输出：[1,3,12,0,0]」指的是**改完之后的东西**，
 * 而代码 `def moveZeroes(nums) -> None` 什么也不返回。
 *
 * 早先直接把 None 序列化成 `null` 去比，每一组都判失败，读者看到的却是
 * 「这篇题解写错了」—— 它没写错，是这道题本来就不要求返回。
 *
 * 三种还原方式，按「入参里还剩什么」决定（必须唯一，多了就说明猜不出来）：
 *
 * 1. 恰好一个**数组**参数（元素是标量，或者像矩阵那样是数组） ->
 *    那是被原地改过的数组（moveZeroes / rotate 的 matrix）
 * 2. 恰好一个**节点对象**参数 -> 那是棵被改过的树/链表（0114 flatten、
 *    0024 swapPairs 这种）。序列化出来正好是题面那个形态。
 * 3. 别的情形 -> 空列表。返回链表/树的题里 None 就是空链表，
 *    而力扣题面写的是 `[]`（0021 `mergeTwoLists([], [])` 期望 `[]`）
 *
 * 第 1 条特意不收「装着节点的数组」：0023 的 `mergeKLists([[]])` 参数是
 * `[None]`（一个装空链表的数组），它不是被改过的数组，按第 2 条也找不到节点，
 * 于是落到第 3 条得到 `[]` —— 正好是期望值。
 *
 * 语料里没有任何一篇的期望值是 `null`（查过），所以这三种还原都不会
 * 把「本来就该返回 None」的题判错。
 */
const NONE_RETURN = `        if __v__ is None:
            if __dummy_head__:
                # 用哑节点做原地删除（0019）：返回 None 就是「整个链表没了」。
                # 头节点对象本身还在（只是不再被引用），序列化它会得到原链表。
                __v__ = []
            else:
                __lst__ = [x for x in __p__ if isinstance(x, list) and all(isinstance(y, (int, float, str, bool, list)) for y in x)]
                __nd__ = [x for x in __p__ if hasattr(x, 'val')]
                if len(__lst__) == 1:
                    __v__ = __lst__[0]
                    __mut__ = True
                elif len(__nd__) == 1:
                    __v__ = __nd__[0]
                    __mut__ = True
                else:
                    __v__ = []`;

/**
 * 调用入口并逐条收集结果。
 *
 * ## 结尾必须是裸表达式，不能 print
 *
 * 早先的写法是 `print(MARKER + json.dumps(...))`，再从 stdout 里捞那一行。
 * 两个问题：一是 Pyodide 的 `batched` stdout 回调会按缓冲区切块，长 JSON
 * 有被切成两半的风险；二是结果里带 traceback（含换行）时要从 stdout 反解
 * JSON，等于自己写一遍解析器。
 *
 * 改成让驱动以 `__json__.dumps(__r__)` 这个表达式收尾，`runPythonAsync` 会把
 * 最后一个表达式的值直接返回给 JS —— 一行解析代码都不需要。
 *
 * 逐条 try 而不是整体 try：一组样例参数非法不该让另外几组的判定一起消失。
 *
 * @param cases 每组样例的参数，元素是 Python 字面量源码（如 `'[2,7,11,15]'`）
 */
export function buildCallDriver(
  cases: string[][],
  target: {expr: string; instantiate: string | null},
  /**
   * 每个参数要还原成哪种结构（'none' / 'list' / 'tree' / 'randlist'）。
   * 由 snippet.ts 依据类型标注算出 —— 不能在 Python 侧靠数组长度猜，
   * 三个元素的链表和二叉树的 [left,val,right] 在字面量上无法区分。
   */
  nodeKinds: Array<NodeKind> = [],
  /**
   * 用 str() 而不是 json 序列化返回值。
   * 期望值是「程序打印的文本」时必须这样 —— 见 PySample.textCompare。
   */
  textCompare = false,
  /**
   * 入口是不是「用哑节点原地删除链表」那种写法（0019：`dummy = ListNode(0, head)`
   * + `return dummy.next`）。这种写法返回 None 时，含义是「整个链表被删空了」，
   * 而不是「入参没被动过」—— 头节点对象还在，只是没人引用它了。
   */
  dummyHead = false,
  /**
   * args 里要不要先把 JS 记法翻成 Python（`null` -> `None`）。
   *
   * 题面抄来的样例是 **JavaScript** 记法：`root = [3,5,1,null,null,7,4]`。
   * `literal_eval` 不认 `null`，直接 `ValueError: malformed node`。
   * 样例模式由 runner 先翻译好（见 toPythonLiteral），手动输入走这条。
   */
  translateJs = false,
): string {
  const kinds = (cases[0] ?? []).map((_, i) => nodeKinds[i] ?? 'none');
  const dump = textCompare ? '__dump_text__' : '__j__';

  return [
    'import json as __json__',
    'import traceback as __tb__',
    'import ast as __ast__',
    // ENCODER / BUILDER / __re__ 已在 prelude 里执行过，这里不重复定义
    target.instantiate ?? '',
    // 按位置决定要不要把数组字面量还原成链表/树
    `__kinds__ = ${JSON.stringify(kinds)}`,
    `__dummy_head__ = ${dummyHead ? 'True' : 'False'}`,
    '__r__ = []',
    `for __a__ in ${JSON.stringify(cases)}:`,
    '    try:',
    // 必须 literal_eval：cases 通过 JSON 传进来，元素是**字符串**。
    // 直接 splat 过去，入口拿到的是 "9" 而不是 9，`target - n` 立刻 TypeError。
    // （literal_eval 只认字面量、不执行代码，对用户粘贴的样例是安全的）
    // manual 模式的 args 是读者敲的，可能照抄了题面的 null。
    // 样例模式已经在 JS 侧翻过，这里不再重复（免得把字符串里的 "null" 也换掉）。
    translateJs
      ? '        __vals__ = [__ast__.literal_eval(x.replace("null", "None")) for x in __a__]'
      : '        __vals__ = [__ast__.literal_eval(x) for x in __a__]',
    '        __p__ = [__mk__(v, __k__) for v, __k__ in zip(__vals__, __kinds__)]',
    // 0236：p / q 给的是节点值，要到 root 这棵树里找对应的节点对象
    '        for __i__, (__v__, __k__) in enumerate(zip(__vals__, __kinds__)):',
    "            if __k__ == 'byval':",
    '                __t__ = next((t for t in __p__[:__i__] if hasattr(t, "val")), None)',
    '                __p__[__i__] = __find__(__t__, __v__) if __t__ is not None else __v__',
    '        __mut__ = False',
    `        __v__ = ${target.expr}(*__p__)`,
    NONE_RETURN,
    // 0236：p / q 是按值给的，说明题面要的答案是「那个节点」。
    // 题面写的是节点值（`输出: 3`），而编码器会把节点序列化成整棵子树的
    // 层序（`[5,6,2,null,null,7,4]`）—— 对不上。这里取根节点的值。
    kinds.includes('byval')
      ? '        if hasattr(__v__, "val"):\n            __v__ = __v__.val'
      : '',
    `        __r__.append({"v": ${dump}(__enc__(__v__)), "m": __mut__})`,
    '    except Exception:',
    '        __r__.append({"e": __tb__.format_exc()})',
    '__json__.dumps(__r__, ensure_ascii=False)',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * 供 Python 执行的顶层环境。
 *
 * ## 两种模式给不同的 `__name__`，这不是随意选的
 *
 * - **样例 / 手动参数**给 `'__snippet__'`：题解代码里常有
 *   `if __name__ == "__main__":` 的自测块，里面要么一大串 print（和我们的
 *   逐条判定重复），要么 `for line in sys.stdin`（牛客题）。跳过它，输出才干净。
 * - **stdin 模式**给 `'__main__'`：这种题解的「完整代码实现」本身就是程序，
 *   入口全在那个 if 块里。不置成 __main__ 就一段都不执行，输出恒为空
 *   （踩过：牛客题 stdin 模式跑出来是空字符串）。
 *
 * 两种模式下 sys.stdin 都被换成 StringIO，所以 __main__ 分支也不会卡死。
 */
export function globalsInit(asMain: boolean): string {
  return `{'__name__': ${asMain ? "'__main__'" : "'__snippet__'"}}`;
}