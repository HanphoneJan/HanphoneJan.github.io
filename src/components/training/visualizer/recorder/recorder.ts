/**
 * Python 侧的「一次录制」前导代码。
 *
 * 三部分：
 *
 * 1. `TRACER_PY` —— `sys.settrace` 采集器（下面）
 * 2. `BUILDER_PY` —— 从 `pyrunner/driver.ts` 复用来的平台类 + 入参还原器
 *    + 值编码器。**必须复用**：链表/树的入参约定很细（层序 vs `[l,v,r]`、
 *    random 指针写下标、0236 的 p/q 给的是节点值），抄第二份必然漂移，
 *    而漂移的后果是「样例判失败」这种看起来像代码 bug 的现象。
 * 3. `globalsInit` —— `__name__` 要设成非 `__main__`，
 *    否则题解末尾的 `if __name__ == "__main__":` 自测块会被执行
 *    （它会 print 一堆东西，还会跑 5 组样例，把轨迹冲淡）。
 *
 * 顺序：globalsInit 必须在 exec 之前生效，所以拼在最前面。
 */

/**
 * 在 Python 侧安装 `sys.settrace` 采集器。
 *
 * 这段代码以字符串形式注入 Pyodide —— 它必须在 Python 命名空间里执行，
 * 没法写成 TS 导出再传进去。
 *
 * ## 采集策略
 *
 * 只采 `line` 事件，不采 `call`/`return`。理由：
 *
 * - `line` 事件的 `f_locals` 是**执行到这一行之前**的快照，
 *   也就是「读者看到这一行代码即将做什么」的时刻，正好对应一帧
 * - `call` 事件会为每个递归/辅助函数都产生一条，双指针题里全是噪音
 * - `return` 事件的 `arg` 是返回值，但我们已经在外面单独拿到了
 *
 * ## 链表/树怎么录
 *
 * 这是这里最需要小心的一处。`json.dumps` 一个 ListNode 只会得到
 * `"<__main__.Solution.ListNode object>"` —— 一个字符串，画面上
 * 什么也画不出来。所以节点对象被编成**带标记的结构**：
 *
 * ```
 * 树：  {"$": "tree", "v": [1, 2, 3, null, 5]}   # 层序，与力扣题面一致
 * 链表：{"$": "list", "v": [1, 2, 3]}
 * ```
 *
 * 而「光标停在哪个节点」这件事靠 `{"$": "n", "i": 2}` 表达 ——
 * `i` 是**层序下标 / 链表下标**。下标怎么来的：每帧第一次遇到节点
 * 局部变量时，从它出发 BFS / 沿 next 走一遍，建 `id(node) -> 下标`
 * 的表；之后同一帧里的其它节点局部变量（`root`/`cur`/`left`/`node`）
 * 直接查这张表。
 *
 * 为什么一定要下标而不是「值」：树题里同一个值可能出现多次
 * （0108 的 BST 转换有重复值），按值定位会指错格子；而
 * `{"$":"n","i":2}` 里的 2 是「层序第 2 格」，adapter 能直接
 * 拿去当高亮下标。
 *
 * 建表用 BFS 而不是递归：深树（退化链）递归会爆栈。
 */

export const TRACER_PY = `
import sys

__TREE_MAX__ = 40
__LIST_MAX__ = 40

def _tjsonable(v, depth=0, nmap=None, nroot=None):
    if depth > 3:
        return None
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    # bytes / bytearray 来自 sys.stdin.buffer.read()（ACM 题的常见写法）。
    # 不处理的话它们记成 "<bytes>"，画面上什么也画不出来 ——
    # HJ81 字符串字符匹配的两个入参全是 bytes，整题因此无从下手。
    # 解不出 utf-8 就用 replace 兜住，绝不让采集器因为一个坏字节崩掉。
    if isinstance(v, (bytes, bytearray)):
        try:
            return bytes(v).decode("utf-8")
        except Exception:
            return bytes(v).decode("utf-8", "replace")
    if nmap is not None and nmap.get("id") == id(v):
        # 这个对象就是本帧的「根」，按整棵结构编码（层序 / 数组）。
        # 比较用 == 不是 is：id() 返回的是普通 int 对象，
        # is 只在 CPython 恰好把同值小整数 intern 掉时才成立 ——
        # 实测 0002 的 l1（id 是个大整数）就没匹配上，整条链表录成了
        # 满屏的 {"$":"n","i":0}，adapter 拿不到任何可画的值。
        return nmap["encode"](v)
    if isinstance(v, (list, tuple, set, frozenset)):
        items = list(v)
        if len(items) > __TREE_MAX__:
            items = items[:__TREE_MAX__]
        return [_tjsonable(x, depth + 1, None, None) for x in items]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if len(out) >= 24:
                break
            try:
                kk = k if isinstance(k, str) else str(k)
            except Exception:
                continue
            jx = _tjsonable(x, depth + 1, None, None)
            if jx is None:
                continue
            out[kk] = jx if not isinstance(jx, str) else jx[:80]
        return out
    # 节点对象：给出「我在第几格」
    if nmap is not None and hasattr(v, "val"):
        idx = nmap["index"].get(id(v))
        if idx is not None:
            return {"$": "n", "i": idx, "v": _tjsonable(v.val, depth + 1, None, None)}
    try:
        return "<%s>" % type(v).__name__
    except Exception:
        return None


def _tself_attrs(v):
    """实例的属性字典。没有 __dict__（__slots__ 类）就返回空。"""
    try:
        d = getattr(v, "__dict__", None)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def _tscan_items(locals_dict, capture_self):
    """(名字, 值) 迭代；capture_self 时带上 self.<attr>。"""
    for k, v in locals_dict.items():
        yield k, v
        if capture_self and k == "self":
            for ak, av in list(_tself_attrs(v).items())[:12]:
                yield "self." + str(ak), av


def _tscan_values(locals_dict, capture_self):
    for _k, v in _tscan_items(locals_dict, capture_self):
        yield v


def _tbuild_nmap(locals_dict, capture_self=False):
    """挑一个「根」节点局部变量，建 id -> 下标 的映射。

    优先用入口参数名（root / head / l1 ...），它们就是题面描述的对象；
    找不到再按「谁的值最大」猜一个（根节点的子树通常最全）。

    capture_self 为真时也看 self.<attr> —— class-API 设计题的数据全在
    实例属性上（0146 的 self.key_to_node 与 self.dummy），
    不把它们纳入候选的话整题只剩几个标量参数，画面上什么也没有。

    （注意：这个字符串是 JS 模板字面量的一部分，里面**不能出现反引号**。）
    """
    best = None
    best_key = None
    for k, v in _tscan_items(locals_dict, capture_self):
        if k == "self" or not hasattr(v, "val"):
            continue
        is_tree = hasattr(v, "left") or hasattr(v, "right")
        is_list = hasattr(v, "next")
        if not (is_tree or is_list):
            continue
        # 入口参数优先
        score = 0 if k in ("root", "head", "l1", "l2", "headA", "headB", "p", "q") else 1
        size = _tsize(v)
        key = (score, -size)
        if best_key is None or key < best_key:
            best_key = key
            best = v
    if best is None:
        return None

    is_tree = hasattr(best, "left") or hasattr(best, "right")
    if is_tree:
        order, index = _tlayer_order(best)
    else:
        order, index = _tchain(best)

    # 原地修改之后，别的局部变量会指向**不在锚点链上**的节点 ——
    # 0206 反转链表的后半段，pre 指向刚摘下来的头节点，而 head 已经
    # 指向反转后的另一条链。不把这些节点也编上号，它们就只剩
    # "<ListNode>"，adapter 一个光标都认不出来（实测 0206/0025 全军覆没）。
    # 所以按锚点链的坐标把它们**追加**在后面；越界的下标在渲染时被丢掉。
    for v in _tscan_values(locals_dict, capture_self):
        if v is None or v is best or not hasattr(v, "val"):
            continue
        if (hasattr(v, "left") or hasattr(v, "right")) != is_tree:
            continue
        if is_tree:
            _order2, idx2 = _tlayer_order(v)
        else:
            _order2, idx2 = _tchain(v)
        for _id, _i in idx2.items():
            if _id not in index:
                index[_id] = len(order) + _i

    # 根节点本身要编成**整条结构**，而不是「第 0 格」——
    # 画面上的那排格子全靠它。少了这一句，l1/root 会被编成
    # {"$":"n","i":0}，adapter 拿不到任何可画的值（实测 0002 全是这样）。
    if is_tree:
        return {
            "id": id(best),
            "index": index,
            "encode": lambda r: {"$": "tree", "v": order},
        }
    return {"id": id(best), "index": index, "encode": lambda r: {"$": "list", "v": order}}


def _tsize(root):
    n = 0
    stack = [root]
    seen = set()
    while stack and n < 200:
        cur = stack.pop()
        if cur is None or id(cur) in seen or not hasattr(cur, "val"):
            continue
        seen.add(id(cur))
        n += 1
        for slot in ("left", "right", "next"):
            if hasattr(cur, slot):
                stack.append(getattr(cur, slot))
    return n


def _tlayer_order(root):
    """层序展开，返回 (值数组, id -> 下标)。

    BFS 而非递归：退化链（0104 那种 10^4 深）递归会爆栈。

    数组长度会补到 2 的幂减一（力扣题面就是 '[1,2,3,null,5]' 这种写法），
    末尾用 None 填 —— 不补的话渲染算不出「空槽位在第几层」。
    """
    order = []
    index = {}
    if root is None or not hasattr(root, "val"):
        return order, index
    queue = [root]
    seen = {id(root)}
    while queue and len(order) < __TREE_MAX__:
        node = queue.pop(0)
        index[id(node)] = len(order)
        order.append(_tscalar(node.val))
        for slot in ("left", "right"):
            child = getattr(node, slot, None)
            if child is None or id(child) in seen or not hasattr(child, "val"):
                continue
            seen.add(id(child))
            queue.append(child)
    # 补齐到「满二叉树的节点数」：层数 d 就有 2^d - 1 个槽位
    depth = max(1, len(order).bit_length())
    full = (1 << depth) - 1
    while len(order) < min(full, __TREE_MAX__):
        order.append(None)
    return order, index


def _tchain(root):
    order = []
    index = {}
    cur = root
    seen = set()
    while cur is not None and len(order) < __LIST_MAX__ and id(cur) not in seen:
        seen.add(id(cur))
        if not hasattr(cur, "val"):
            break
        index[id(cur)] = len(order)
        order.append(_tscalar(cur.val))
        cur = getattr(cur, "next", None)
    return order, index


def _tscalar(v):
    if isinstance(v, (bytes, bytearray)):
        try:
            return bytes(v).decode("utf-8")
        except Exception:
            return bytes(v).decode("utf-8", "replace")
    return v if isinstance(v, (bool, int, float, str)) or v is None else str(v)[:40]


def _tinstall(target_filename, events, limit, capture_self=False):
    __depth__ = [0]

    def tracer(frame, event, arg):
        try:
            if frame.f_code.co_filename != target_filename:
                return None
            if event == "call":
                __depth__[0] += 1
                return tracer
            if event == "return":
                __depth__[0] = max(0, __depth__[0] - 1)
                return None
            if event == "line":
                if len(events) >= limit:
                    return None
                nmap = _tbuild_nmap(frame.f_locals, capture_self)
                loc = {}
                for k, v in frame.f_locals.items():
                    if k == "self":
                        if not capture_self:
                            continue
                        # class-API 设计题（0146 LRU / 0155 最小栈）的数据
                        # 全在实例属性上。把它们摊平成 self.<attr> 记进来，
                        # adapter 才看得见那个链表 / 那张哈希表。
                        # 用 self. 前缀命名，避免与同名局部变量撞车。
                        for ak, av in list(_tself_attrs(v).items())[:12]:
                            loc["self." + str(ak)] = _tjsonable(av, 0, nmap, None)
                        continue
                    loc[k] = _tjsonable(v, 0, nmap, None)
                events.append({
                    "line": frame.f_lineno,
                    "locals": loc,
                    # 递归深度。树题/分治题的核心教学点就是「一层层下去再回来」，
                    # 而局部变量里往往只有 root 一个节点变量，光看它看不出深浅
                    # （0104 的 maxDepth 每层都是满的 root）。
                    "depth": __depth__[0],
                })
            return tracer
        except Exception:
            return None

    sys.settrace(tracer)
    return tracer
`;

/**
 * 组装一次录制的 Python 驱动。
 *
 * 结果写进 `__TRACE_OUT__` 这个全局，而不是 `print` —— Pyodide 的
 * `batched` stdout 回调只在遇到换行时才吐出内容，一个不带换行的
 * `print` 会让 JS 侧拿到 `undefined`（Pyodide 运行条踩过这个坑）。
 */
export function buildRecordDriver(opts: {
  code: string;
  method: string;
  /** 类方法的类名（顶层函数为 undefined） */
  className?: string;
  /** Python 字面量文本，已翻译过 null 的实参 */
  args: string[];
  /**
   * 每个实参的结构类型，决定要不要先还原成 ListNode/TreeNode。
   *
   * 见 `nodeKindOf`。没给就全是 'none'（原样传）。
   */
  kinds?: string[];
  /**
   * 入口读 stdin 时喂给它的文本（牛客/ACM 题）。
   *
   * 给这个值就走 stdin 模式：不传实参，把 `sys.stdin` 换成 StringIO，
   * 并把 `sys.stdout` 收下来当返回值（ACM 题的「答案」是打印出来的）。
   *
   * stdin **必须**换成会立刻 EOF 的对象：Pyodide 里读它可能一直阻塞，
   * 而 Python 跑在主线程上，JS 定时器救不了 —— 整个进程卡死。
   * （Pyodide 运行条踩过同一个坑，见 pyrunner/driver.ts 的 STDIN_SHIM。）
   */
  stdin?: string;
  /**
   * 「操作脚本」模式：class-API 设计题（0146 LRU / 0155 最小栈 / 0208 前缀树）
   * 的样例不是一次调用，而是「构造一次 + 挨个调方法」的序列。
   *
   * 给定之后**优先于** `method` / `args`：在同一个实例上按顺序调，
   * 把每次调用的返回值收成列表（构造器那一步记一个 null，
   * 与题面期望值等长 —— 力扣的期望值第一项就对应构造器）。
   *
   * 实参用 `json.loads` 还原而不是拼 Python 字面量：JSON 的 null
   * 直接就是 Python 的 None，省掉一层翻译，也不会拼出非法字面量。
   */
  script?: {
    className: string;
    ctorArgs: unknown[];
    steps: Array<{method: string; args: unknown[]}>;
  };
  /** 只采这么多条，防止死循环题把构建拖垮 */
  eventLimit: number;
  /** 源码行数，用来把事件行号限制在文件范围内 */
  lineCount: number;
}): string {
  const {code, method, className, args, eventLimit, lineCount} = opts;
  const kinds = JSON.stringify(opts.kinds ?? args.map(() => 'none'));
  /**
   * 脚本模式的执行体。与调用模式互斥（下面 if/else 二选一）。
   *
   * 同一行 `sys.settrace` 一直开着，所以整个操作序列都在采集范围内 ——
   * 这正是这类题要的：内部状态（LRU 的链表、最小栈的辅助栈、
   * 前缀树的子节点 dict）一步步在变。
   */
  const scriptBody = opts.script
    ? `            _cls = ns.get(${JSON.stringify(opts.script.className)})
            if _cls is None:
                __ERR__ = "class not found: " + ${JSON.stringify(opts.script.className)}
            else:
                _obj = _cls(*json.loads(${JSON.stringify(JSON.stringify(opts.script.ctorArgs))}))
                # 构造器那一步记 null：题面期望值的第一项就是它
                __RESULT__ = [None]
                for _step in json.loads(${JSON.stringify(
                  JSON.stringify(
                    opts.script.steps.map((s) => [s.method, s.args]),
                  ),
                )}):
                    _m = getattr(_obj, _step[0], None)
                    if _m is None:
                        __ERR__ = "method not found: " + _step[0]
                        break
                    __RESULT__.append(__enc__(_m(*_step[1])))
                __MUTATED__ = []`
    : '';
  return `
import sys, json, ast, traceback, io

__EVENTS__ = []
__RESULT__ = None
__STDOUT__ = ""
__ERR__ = None

ns = {"__name__": "__snippet__"}
try:
    exec(compile(${JSON.stringify(code)}, "traced.py", "exec"), ns)
except Exception:
    __ERR__ = "definition: " + traceback.format_exc()

if __ERR__ is None:
    _tinstall("traced.py", __EVENTS__, ${eventLimit}, ${opts.script ? 'True' : 'False'})
    try:
        __kinds__ = ${kinds}
        __MUTATED__ = []
${
  opts.stdin === undefined
    ? args.length === 0
      ? `        # 脚本模式下没有「一次调用」的实参；单参为空的入口也走这里
        _args = []`
      : `        _args = ast.literal_eval("(" + ${JSON.stringify(args.join(', '))} + ",)")
        _args = [__mk__(v, k) for v, k in zip(_args, __kinds__)]`
    : `        # stdin 模式：ACM 题的 solve() 自己读 stdin、print 到 stdout。
        # 没有「调用入口」这一步，录的是整个程序的一次执行，
        # 所以 stdout 就是它的返回值。
        #
        # 用 __Stdin__ 而不是 io.StringIO：ACM 题常写
        # sys.stdin.buffer.read()，StringIO 没有 .buffer 属性
        # （实测 HJ16/HJ68/HJ69/HJ80/HJ81/HJ171/HJ176/HJ178 八篇全挂在这一行）。
        # __Stdin__ 的文本读与字节读共用一个游标，跟真实终端一致。
        sys.stdin = __Stdin__(${JSON.stringify(opts.stdin)})
        _args = []`
}
        __saved_stdout__ = sys.stdout
        __buf__ = io.StringIO()
        sys.stdout = __buf__
        try:
${
  opts.script
    ? scriptBody
    : `            _cls = ns.get(${JSON.stringify(className ?? 'Solution')})
            if _cls is not None and ${className ? 'True' : 'False'}:
                _fn = getattr(_cls(), ${JSON.stringify(method)}, None)
            else:
                _fn = ns.get(${JSON.stringify(method)})
            if _fn is None:
                __ERR__ = "entry not found: " + ${JSON.stringify(method)}
            else:
                __RESULT__ = __enc__(_fn(*_args))
                # 原地修改类题目（返回 None）把改完的入参留下来：
                # 题面的「输出」说的就是改完之后的东西（0075/0189/0283）
                __MUTATED__ = [__enc__(a) for a in _args]`
}
        finally:
            __STDOUT__ = __buf__.getvalue()
            sys.stdout = __saved_stdout__
    except Exception:
        __ERR__ = "call: " + traceback.format_exc()
    finally:
        sys.settrace(None)

# 行号越界的事件丢掉：exec 的 code 对象行号与原文一致，
# 但万一有 exec 嵌套就会越界，越界的行号在源码面板上没有对应行。
__EVENTS__[:] = [e for e in __EVENTS__ if 1 <= e["line"] <= ${lineCount}]

__TRACE_OUT__ = json.dumps({
    "events": __EVENTS__,
    "result": __RESULT__,
    "mutated": __MUTATED__,
    "stdout": __STDOUT__,
    "error": __ERR__,
})
`;
}
