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
 * ## 为什么按 co_filename 过滤
 *
 * 题解代码里经常有辅助函数、递归、甚至 `sorted()` 之类的 C 实现。
 * 只认我们 exec 进去的那一个文件名（`trace_target`），其余一律返回 None，
 * 让 trace 停止向那些帧传播 —— 否则性能会被拖垮，
 * 而且局部变量里会出现一堆读者看不懂的东西。
 *
 * ## 值怎么转成 JSON
 *
 * 直接 `json.dumps(frame.f_locals)` 会在第一次遇到链表节点就炸掉。
 * 所以逐个值过 `jsonable`：
 *
 * - 标量原样
 * - list/tuple/set 递归（限深度与长度，超了就截断 —— 画面也画不下那么多格子）
 * - dict 只留**全标量**的项，值是对象就整个丢掉
 * - 其余（自定义类实例、模块、函数）→ 摘要字符串，如 `<ListNode>`，
 *   保留类型名比 `null` 有用：读者能看出「这里是个节点」
 */

export const TRACER_PY = `
import sys

def _tjsonable(v, depth=0):
    if depth > 3:
        return None
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, (list, tuple, set, frozenset)):
        items = list(v)
        if len(items) > 64:
            items = items[:64]
        return [_tjsonable(x, depth + 1) for x in items]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if len(out) >= 32:
                break
            # 键本身要可 JSON 化，且值也简单 —— 嵌套对象链表不进画面
            try:
                kk = k if isinstance(k, str) else str(k)
            except Exception:
                continue
            jx = _tjsonable(x, depth + 1)
            if isinstance(jx, (list, dict)):
                # 二层以上的容器只会让画面更难读，记个类型名就够
                if isinstance(x, (list, tuple, set, frozenset)):
                    out[kk] = list(jx)[:32]
                else:
                    out[kk] = jx
            elif isinstance(jx, str) and jx.startswith("<"):
                out[kk] = jx
            else:
                out[kk] = jx
        return out
    try:
        return "<%s>" % type(v).__name__
    except Exception:
        return None


def _tinstall(target_filename, events, limit):
    def tracer(frame, event, arg):
        try:
            if frame.f_code.co_filename != target_filename:
                return None
            if event == "line":
                if len(events) >= limit:
                    return None
                loc = {}
                for k, v in frame.f_locals.items():
                    if k == "self":
                        continue
                    loc[k] = _tjsonable(v)
                events.append({"line": frame.f_lineno, "locals": loc})
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
  /** Python 字面量文本，已翻译过 null 的实参 */
  args: string[];
  /** 只采这么多条，防止死循环题把构建拖垮 */
  eventLimit: number;
  /** 源码行数，用来把事件行号限制在文件范围内 */
  lineCount: number;
}): string {
  const {code, method, args, eventLimit, lineCount} = opts;
  return `
import sys, json, ast, traceback

__EVENTS__ = []
__RESULT__ = None
__ERR__ = None

ns = {}
try:
    exec(compile(${JSON.stringify(code)}, "traced.py", "exec"), ns)
except Exception:
    __ERR__ = "definition: " + traceback.format_exc()

if __ERR__ is None:
    _tinstall("traced.py", __EVENTS__, ${eventLimit})
    try:
        _args = ast.literal_eval("(" + ${JSON.stringify(args.join(', '))} + ",)")
        _cls = ns.get("Solution")
        if _cls is not None:
            _inst = _cls()
            _fn = getattr(_inst, ${JSON.stringify(method)}, None)
        else:
            _fn = ns.get(${JSON.stringify(method)})
        if _fn is None:
            __ERR__ = "entry not found: " + ${JSON.stringify(method)}
        else:
            __RESULT__ = _tjsonable(_fn(*_args))
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
    "error": __ERR__,
})
`;
}
