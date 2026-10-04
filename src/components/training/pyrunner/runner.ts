/**
 * 「跑一下」的编排层：把纯函数的驱动生成、Pyodide 执行、结果判定串起来。
 *
 * ## 为什么运行必须串行
 *
 * `py.setStdout({batched})` 是**整个解释器级别**的回调，不是每次调用独立的。
 * 两个代码块同时点运行，输出会互相串台 —— A 的结果里混进 B 的 print。
 * 这里用一条 promise 链把所有运行排队，代价是「点第二个按钮要等第一个跑完」，
 * 而 Python 单线程本来也只能这样。
 */

import {compare, isUsableExpected} from './compare';
import {buildCallDriver} from './driver';
import {
  callTarget,
  nodeParams,
  splitTopLevel,
  type SnippetEntry,
} from './snippet';
import {loadPyodideRuntime, type PyodideRuntime} from './runtime';
import {execPython} from './exec';

/**
 * 与 plugins/py-samples 的 PySample 同构。
 *
 * 重复定义而不是 import：runner 会被动态 import 进单独 chunk，
 * 从这里 import 构建期插件的类型会把整个插件拖进依赖图。
 * 字段必须与那边保持一致。
 */
export interface PySample {
  /** 位置参数，按入口签名顺序 */
  args: string[];
  /** 期望输出（原始文本，可能含省略号等） */
  expected: string;
  /** 期望值是「程序打印的文本」而非返回值 JSON，见插件侧同名注释 */
  textCompare?: boolean;
}

export interface StdinSample {
  stdin: string;
  expected: string;
}

export type RunMode =
  /** textCompare 的样例按「程序打印的文本」比较，见 PySample.textCompare */
  | {type: 'samples'; samples: PySample[]; textCompare?: boolean}
  | {type: 'manual'; argsText: string}
  | {type: 'stdin'; stdin: string; expected: string}
  | {type: 'plain'};

export interface SampleRow {
  /** 展示用的调用文本，如 `twoSum([2,7,11,15], 9)` */
  call: string;
  expected: string;
  actual: string;
  verdict: 'pass' | 'fail' | 'error';
  reason?: string;
}

export interface RunOutcome {
  rows: SampleRow[];
  passCount: number;
  total: number;
  stdout: string;
  stderr: string;
  /** 代码本身（定义阶段）就炸了 */
  error: string;
  /** 出错行号，1 起。给编辑器高亮用。 */
  errorLines: number[];
  /** 驱动炸了（极少发生，多半是抽取的样例本身不合法） */
  driverError: string;
  /** stdin / plain 模式的输出 */
  output: string;
}

/** 每次运行用不同的文件名，行号归属才判得准 */
let fileSeq = 0;

let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function emptyOutcome(): RunOutcome {
  return {
    rows: [],
    passCount: 0,
    total: 0,
    stdout: '',
    stderr: '',
    error: '',
    errorLines: [],
    driverError: '',
    output: '',
  };
}

/** 驱动返回的每一项：要么有值 v，要么有 traceback e */
function parseDriverRows(value: unknown): Array<{v?: string; e?: string}> {
  if (typeof value !== 'string') {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? (parsed as Array<{v?: string; e?: string}>)
      : [];
  } catch {
    return [];
  }
}

export async function runSnippet(opts: {
  code: string;
  entry: SnippetEntry | null;
  mode: RunMode;
  indexUrl: string;
  /** 区分「正在下载运行时」和「正在跑代码」，好让按钮给出不同反馈 */
  onPhase?: (phase: 'loading' | 'running') => void;
}): Promise<RunOutcome> {
  const {code, entry, mode, indexUrl, onPhase} = opts;

  let py: PyodideRuntime | null = null;
  return serialize(async () => {
    const outcome = emptyOutcome();
    try {
      onPhase?.('loading');
      py = await loadPyodideRuntime({indexUrl});
      onPhase?.('running');

      const target = entry ? callTarget(entry) : null;
      const filename = `snippet-${++fileSeq}.py`;

      let cases: string[][] | null = null;
      let stdin = '';
      if (mode.type === 'samples' && target) {
        // 样例抄自力扣题面，是 JavaScript 记法（null / [1,2]），要先翻译
        cases = mode.samples.map((s) => s.args.map(toPythonLiteral));
      } else if (mode.type === 'manual' && target) {
        // 按类型标注补引号：入口签名写着 num_str: str，读者却在输入框里敲
        // 1516000，literal_eval 会把它变成整数，`num_str[::-1]` 当场 TypeError。
        // 报错信息指向读者改的那一行，看起来像是「我的代码错了」——
        // 实际上代码没错，是输入框没标住类型。
        cases = [splitTopLevel(mode.argsText).map((a, i) => quoteIfStr(a, entry!.annotations[i]))];
      } else if (mode.type === 'stdin') {
        stdin = mode.stdin;
      }

      const driver =
        cases && target
          ? buildCallDriver(
              cases,
              target,
              nodeParams(entry!, code),
              mode.type === 'samples' ? mode.textCompare : false,
            )
          : undefined;
      const result = await execPython(py, {
        code,
        filename,
        stdin,
        asMain: mode.type === 'stdin',
        driver,
      });

      outcome.stdout = result.stdout;
      outcome.stderr = result.stderr;
      outcome.error = result.error;
      outcome.errorLines = result.errorLines;
      outcome.driverError = result.driverError;

      if (result.error) {
        // 定义阶段就炸了，样例无从谈起
        return outcome;
      }

      if (mode.type === 'stdin') {
        const actual = result.stdout.trim();
        const ok = compare(actual, mode.expected);
        outcome.rows = [
          {
            call: '（喂给 stdin 的输入）',
            expected: mode.expected,
            actual: actual || '（无输出）',
            verdict: ok.ok ? 'pass' : 'fail',
            reason: ok.reason,
          },
        ];
        outcome.output = result.stdout;
      } else if (cases && target) {
        const parsed = parseDriverRows(result.value);
        outcome.rows = cases.map((args, i) => {
          const call = `${target.display}(${args.join(', ')})`;
          const expected =
            mode.type === 'samples' ? (mode.samples[i]?.expected ?? '') : '';
          const item = parsed[i];

          if (!item) {
            return {
              call,
              expected,
              actual: '（没有返回结果）',
              verdict: 'error' as const,
              reason: '驱动没有产出这一条的结果',
            };
          }
          if (item.e !== undefined) {
            return {
              call,
              expected,
              actual: item.e.trim().split('\n').slice(-1)[0] ?? '',
              verdict: 'error' as const,
              reason: item.e.trim(),
            };
          }
          // 手动模式没有期望值可判，只把输出摆出来
          if (mode.type === 'manual') {
            return {
              call,
              expected: '',
              actual: item.v ?? '（没有返回值）',
              verdict: 'pass' as const,
            };
          }
          const ok = compare(item.v ?? '', expected);
          return {
            call,
            expected,
            actual: item.v ?? '（没有返回值）',
            verdict: (ok.ok ? 'pass' : 'fail') as 'pass' | 'fail',
            reason: ok.reason,
          };
        });
      } else if (mode.type === 'plain') {
        outcome.output = result.stdout;
      }

      outcome.passCount = outcome.rows.filter((r) => r.verdict === 'pass').length;
      outcome.total = outcome.rows.length;
      return outcome;
    } catch (e) {
      outcome.error = outcome.error || String((e as Error)?.message ?? e);
      return outcome;
    }
  });
}

/**
 * 把题解样例里的 JS 字面量换成 Python 的。
 *
 * ## 为什么必须换
 *
 * 题解的示例是从力扣题面抄的，力扣用的是 **JavaScript** 记法：
 *
 *     输入：root = [3,9,20,null,null,15,7]
 *
 * `literal_eval` 不认 `null`，直接抛 `ValueError: malformed node`。于是一棵树题
 * 的每组样例都判失败，读者看到的却是「我的代码错了」—— 他没错，
 * 错的是我们没把题面的记法翻译过来。（实测 0102/0104/0114/0124/0230 等 16 条）
 *
 * 只换 `null` 与 `true`/`false` 这些**唯一确定不会歧义**的记法，
 * 不做通用改写 —— 见 `fixNull` 的注释。
 */
export function toPythonLiteral(raw: string): string {
  // 先按顶层切分，避免把字符串里的 "null" 也换掉
  return splitTopLevel(raw).map(fixNull).join(', ');
}

/** 只替换裸的 null / true / false，即不在引号里的那些 */
function fixNull(arg: string): string {
  let out = '';
  let i = 0;
  const t = arg;
  while (i < t.length) {
    const ch = t[i];
    if (ch === '"' || ch === "'") {
      // 原样抄完整个字符串
      let j = i + 1;
      while (j < t.length && t[j] !== ch) {
        if (t[j] === '\\') {
          j++;
        }
        j++;
      }
      out += t.slice(i, Math.min(j + 1, t.length));
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < t.length && /[A-Za-z0-9_]/.test(t[j])) {
        j++;
      }
      const word = t.slice(i, j);
      if (word === 'null') {
        out += 'None';
      } else {
        // true / false 在 Python 里恰好同名同义，其它标识符原样保留
        out += word;
      }
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * 把 stdin 样例的一行变成调用实参。
 *
 * 与 `quoteIfStr` 的区别：那套只认「标注明确写了 str」，用于**手动输入**
 * （用户自己敲的，标注是唯一线索）。这里处理的是**样例文本**，线索更多：
 *
 * 1. 标注写了 str → 加引号
 * 2. 标注写了 list / int / float / dict 之类 → 原样传（那是数组/数字样例）
 * 3. 没有标注 → **看这段文本本身能不能当 Python 字面量解析**：
 *    - `HelloNowcoder` 解析不了 → 它本来就是一段文本，加引号
 *    - `5` / `[1,2]` 能解析 → 原样传
 *
 * ## 为什么必须有第 3 条
 *
 * 题解「解题思路」小节里那些纯函数定义大多**不带类型标注**（只有
 * `def last_word_split(line)` 这种）。只认标注的话，
 * `last_word_split(HelloNowcoder)` 会报 `ValueError: malformed node or string`
 * —— 一个与代码对错无关的红字。
 */
export function asCallArgument(text: string, annotation?: string): string {
  const ann = (annotation ?? '').trim().toLowerCase();
  if (ann) {
    if (/\bstr\b/.test(ann)) {
      return quoteIfStr(text, ann);
    }
    // 明确是数组/数字/布尔，样例本身就是字面量，别动
    if (
      /\b(list|tuple|dict|set|int|float|bool|complex)\b/.test(ann) ||
      /^\w+\[/.test(ann)
    ) {
      return text.trim();
    }
  }
  const t = text.trim();
  // 已经是字面量（数字 / 数组 / 字典 / None / True）或带引号的，就原样传
  if (isPythonLiteral(t)) {
    return t;
  }
  // 加引号时用**原文**而不是 trim 过的：样例里的前导空格是有意义的
  // （HJ1 的 `   fly me   to   the moon` 就是靠 strip 处理它的）。
  // 这里不复用 quoteIfStr —— 它会 trim，而我们要保留首尾空白。
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function isPythonLiteral(t: string): boolean {
  if (t.length === 0) {
    return false;
  }
  if (/^(?:[frbu]{0,2})["']/.test(t)) {
    return true;
  }
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?[jJ]?$/.test(t)) {
    return true;
  }
  if (/^(None|True|False)\b/.test(t)) {
    return true;
  }
  if (/^[[{(]/.test(t)) {
    try {
      // eslint-disable-next-line no-new-func
      new Function(`return (${t.replace(/null/g, 'None')});`);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** 只保留期望值可判定的样例；省略号的样例（「[0,1,2,...]」）没法比 */
export function usableSamples(samples: PySample[]): PySample[] {
  return samples.filter((s) => isUsableExpected(s.expected) && s.args.length > 0);
}

/**
 * 标注说是 str、而用户没加引号时替他补上。
 *
 * 触发场景很具体：入口签名写着 `num_str: str`，读者在输入框里敲 `1516000`，
 * literal_eval 把它变成整数，`num_str[::-1]` 当场 TypeError。报错还指向
 * 读者没改过的那一行，看起来像是「我的解法写错了」。
 *
 * **只依据类型标注**，不猜输入长得像不像。所以 `1516000`（数字但标注是 str）
 * 照样补引号 —— 那正是要修的场景。
 *
 * 已经带引号或前缀（`"a"` / `f"a"` / `r"a"`）的、以及带括号的复合字面量
 * （`[1,2]`、`{...}`）一律不动：那些用户显然知道自己在写表达式。
 */
export function quoteIfStr(arg: string, annotation?: string): string {
  if (!annotation || !/\bstr\b/.test(annotation)) {
    return arg;
  }
  const t = arg.trim();
  if (t.length === 0) {
    return arg;
  }
  if (/^(?:[frbu]{0,2})["']/.test(t)) {
    return arg;
  }
  if (/^[[({]/.test(t)) {
    return arg;
  }
  return `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}