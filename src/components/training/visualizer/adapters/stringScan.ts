/**
 * 字符串逐字符处理类 adapter：密码校验、单词倒排、合法 IP、字符匹配…
 *
 * ## 为什么单独一个 adapter
 *
 * 这类题的局部变量长这样（HJ21 简单密码）：
 *
 * ```
 * {"pwd": "YUANzhi1987"}
 * {"pwd": "YUANzhi1987", "res": []}
 * {"pwd": "YUANzhi1987", "res": ["Y"], "ch": "Y"}
 * {"pwd": "YUANzhi1987", "res": ["Y", "U"], "ch": "U"}
 * ```
 *
 * 三个特征让 array-scan 的判据全都不成立：
 *
 * 1. **没有下标**。`for ch in pwd` 里没有 `i`，光标是**字符值** `ch`。
 *    arrayScan 要求「一到三根会动的下标」，一根都没有 → 直接拒。
 * 2. **主数组在长度上不稳定**。`res` 每帧都在变长，roles.ts 的
 *    「长度必须稳定」会把它排除；而 `pwd` 是字符串，它的下标从未出现过。
 * 3. **真正在推进的是 `res`**。题目的输出是 `res`，画面上只看 `pwd`
 *    等于只看输入 —— 而「每个字符被怎么改写」才是这题的全部教学内容。
 *
 * ## 画面上画三样东西
 *
 * - **主行**：那个被逐字符消费的字符串（`pwd` / `s` / `line`），
 *   光标按**字符值反查**位置（`pwd.indexOf(ch)`）
 * - **aux 行**：算法自己造出来的中间结果（`res` / `words` / `parts` /
 *   `nums` / `long_set`）—— 逐帧重取，所以能看到它一点一点长出来
 * - **计数器**：命名像状态量的标量（`maxlen` / `count` / `res_len`）
 *
 * ## 反查不准时不画光标
 *
 * `indexOf` 找到的是**第一个**匹配位置，而字符可能在字符串里出现多次
 * （HJ92 的 "abcd12345ed125ss123456789" 里有三个 "1" 开头）。这时光标
 * 会指到一个无关的格子上 —— 与其画一个错的，不如不画，只让 aux 行
 * 讲清楚已经处理到哪了。
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import type {AdapterResult} from './types';

/** 主行长度上限：再长画面挤不下（正文约 700px，一格 20px） */
const MAX_SRC = 32;
/** aux 行长度上限 */
const MAX_AUX = 32;
/** aux 行数上限 */
const MAX_AUX_ROWS = 2;

/** 命名像「状态量」的标量，进计数器面板 */
const STATE_RE = /^(?:max\w*|min\w*|count|cnt|total|sum|len\w*|num\w*|idx|pos|cur\w*|res\w*|ans|flag|ok|valid|n\w*)$/i;

/** 命名像「光标字符」的变量 —— 它的**值**就是当前处理的字符 */
const CHAR_NAMES = new Set([
  'ch', 'c', 'char', 'chr', 'cur', 'x', 'y', 's_', 'cc', 'letter', 'word',
]);

/**
 * 把每一帧的局部变量**合并成持续存在的环境**。
 *
 * `sys.settrace` 记的是「这一行所属那个栈帧的局部变量」，而字符串题的
 * 数据往往分散在好几个栈帧里。HJ92 的 `max(len(x) for x in nums)`：
 * `x` 在推导式的帧上、`nums` 在 solve 的帧上，两者从不出现在同一帧里。
 * 按「本帧有没有」判断，`x` 永远命中不了 aux 行里的任何一格。
 *
 * 合并之后每一帧都能看到「完整的当前状态」，这与程序真实的语义一致
 * （变量还在作用域里，只是此刻在另一个栈帧上被读）。
 */
function mergedLocals(
  events: RawTrace['events'],
): Array<Record<string, unknown>> {
  const env: Record<string, unknown> = {};
  // 必须返回**快照**：共用同一个对象的话数组里每一项都是最终状态
  return events.map((e) => {
    Object.assign(env, e.locals);
    return {...env};
  });
}

function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

/**
 * 「摘要串」不是真实数据：`str(v)` 兜底会把迭代器、函数、deque 记成
 * `"<str_ascii_iterator>"` / `"<function>"` / `"<deque>"`。
 *
 * 不挡掉会有两个后果：
 *
 * 1. 它们比真的入参**长**（20 vs 8），而主串是按「出现帧数 × 长度」打分的
 *    —— 于是 HJ29 字符串加解密的主串被选中成 `<str_ascii_iterator>`，
 *    画面上是一排英文字母，根本看不出是在加密什么。
 * 2. 即使选中了，aux 行的「光标字符反查」也会永远命中一个假格子。
 */
const SUMMARY_RE = /^[<{].*[>}]$/;

/** 是不是「一个可当格子画的字符串」 */
function asString(v: unknown): string | null {
  if (typeof v !== 'string') {
    return null;
  }
  if (v.length < 3 || v.length > MAX_SRC || SUMMARY_RE.test(v)) {
    return null;
  }
  return v;
}

/** 是不是「一个可当 aux 行画的字符串列表」（也收数字元素，HJ80 合并出来的是数字） */
function asStringList(v: unknown): Array<string | number> | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_AUX) {
    return null;
  }
  const ok = v.every(
    (x) =>
      (typeof x === 'string' && x.length <= 24) || typeof x === 'number',
  );
  return ok ? (v as Array<string | number>) : null;
}

/**
 * aux 行也可以是**一个在增长的字符串**。
 *
 * HJ96 表示数字的 `result = "Jkdi*234*klowe*90*a*3*"` 就是一个不断插入
 * `*` 的字符串 —— 它是这题的全部教学内容（哪些字符后面要加星号），
 * 只当字符串处理的话看不到。只收列表的话这一篇就被漏掉了。
 */
function asGrowingString(v: unknown): string | null {
  return typeof v === 'string' &&
    v.length >= 2 &&
    v.length <= MAX_AUX &&
    !SUMMARY_RE.test(v)
    ? v
    : null;
}

function isNodeMark(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { $?: unknown }).$ === 'string'
  );
}

interface Pick {
  srcVar: string;
  src: string;
  /** aux 行：[变量名, 值] */
  auxVars: string[];
  /** 光标字符变量名 */
  cursorVar?: string;
  /** 状态量变量名 */
  stateVars: string[];
}

function pickShapes(
  events: RawTrace['events'],
  paramNames: string[] | undefined,
  code: string,
): Pick | null {
  const params = new Set(paramNames ?? []);
  /** 合并后的环境（见 mergedLocals） */
  const envs = mergedLocals(events);
  /** 名字 -> 最常见的长度（stdin 题里 line 带换行，长度会差 1） */
  const strLen = new Map<string, Map<number, number>>();
  const listLen = new Map<string, number>();
  /** 名字 -> 出现过的长度集合（用来判断它是不是「在长大」的中间结果） */
  const strLens = new Map<string, Set<number>>();
  /** 计数/集合这类「查表」，录成 dict，画不成 aux 行 */
  const dictish = new Set<string>();
  const stateSeen = new Set<string>();

  for (const e of envs) {
    for (const [name, v] of Object.entries(e)) {
      if (isNodeMark(v)) {
        continue;
      }
      // 推导式/生成器内部变量（`.0` / `.1`）是 CPython 的实现细节，
      // 名字与内容都不是作者写的东西
      if (name.startsWith('.')) {
        continue;
      }
      if (typeof v === 'string') {
        const stripped = v.replace(/\s+$/, '');
        if (stripped.length >= 2 && stripped.length <= MAX_AUX) {
          let lens = strLens.get(name);
          if (!lens) {
            lens = new Set<number>();
            strLens.set(name, lens);
          }
          /**
           * 量的是**去掉行尾空白之后**的长度。
           *
           * stdin 题的 `line` 有时带换行有时不带（readline 与 strip 的差别），
           * 不剥掉就会被判成「在长大」，于是 HJ20 密码验证合格程序多出一条
           * 与主行内容一模一样的 aux 行（`line` vs `pwd`）—— 纯噪音。
           */
          lens.add(stripped.length);
        }
        if (stripped.length >= 3 && stripped.length <= MAX_SRC) {
          let m = strLen.get(name);
          if (!m) {
            m = new Map<number, number>();
            strLen.set(name, m);
          }
          m.set(stripped.length, (m.get(stripped.length) ?? 0) + 1);
        }
      } else if (Array.isArray(v)) {
        const list = asStringList(v);
        if (list) {
          listLen.set(name, (listLen.get(name) ?? 0) + 1);
        }
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        if (STATE_RE.test(name)) {
          stateSeen.add(name);
        }
      } else if (typeof v === 'object' && v !== null) {
        // dict / set：录成 {..}，画不成行，但值得记下来排除
        dictish.add(name);
      }
    }
  }

  if (strLen.size === 0) {
    return null;
  }

  /**
   * 主串：**扫全部帧**取最优，不能只看第一帧。
   *
   * stdin 题（牛客一大半）的第一帧局部变量是**空的** ——
   * `solve()` 的第一行还没执行 `s = sys.stdin.readline()`。
   * 早先这里 `break` 在第一帧之后，于是 HJ21 简单密码、HJ31 单词倒排、
   * HJ90 合法 IP、KY4 反序输出这四篇的主串一个都没找到。
   */
  let srcVar: string | undefined;
  let src: string | undefined;
  let bestScore = -1;
  for (const e of envs) {
    for (const [name, v] of Object.entries(e)) {
      const cand = asString(v)?.replace(/\s+$/, '');
      if (cand === undefined) {
        continue;
      }
      const frames = strLen.get(name);
      if (!frames) {
        continue;
      }
      let top = 0;
      for (const c of frames.values()) {
        top = Math.max(top, c);
      }
      // 入参最优先；同权时取「出现帧数多」再「长」的
      const score =
        (params.has(name) ? 1 : 0) * 1e9 + top * 100 + Math.min(cand.length, 99);
      if (score > bestScore) {
        bestScore = score;
        srcVar = name;
        src = cand;
      }
    }
  }
  if (!srcVar || src === undefined) {
    return null;
  }

  /**
   * aux 行 = 「会被逐步造出来的中间结果」，两种形态都收：
   *
   * - 字符串/数字**列表**（HJ21 的 `res`、HJ90 的 `parts`、HJ92 的 `nums`）
   * - **在拼出来的字符串**（HJ96 的 `result`，每遇到一个数字就插一个 `*`）
   *
   * 「长度会变 + 源码里有累加痕迹」是判据。固定不变的字符串（另一个输入）
   * 不是 aux —— 那种题有根指针，交给 arrayScan 就好，轮不到这里。
   */
  const growing: Array<[string, number]> = [];
  for (const [name, lens] of strLens) {
    if (name === srcVar || dictish.has(name) || lens.size <= 1) {
      continue;
    }
    /**
     * 「长度会变」本身不足以说明它是中间结果。
     *
     * HJ20 密码验证合格程序读**多行**输入，`line` 在各帧之间换来换去
     * （10、11、9…），于是被判成「在长大」，页面上多出一条与主行
     * `pwd` 内容一模一样的 aux 行 —— 纯噪音，还让人以为算法在拼字符串。
     *
     * 真的在拼字符串的源码里一定有痕迹：`result += '*'`、`s = s + x`。
     * 这个判据不依赖采样，把「换一个输入」这类假信号挡在外面。
     */
    const accumulates =
      new RegExp(`\\b${name}\\s*\\+=`).test(code) ||
      new RegExp(`\\b${name}\\s*=\\s*${name}\\s*\\+`).test(code);
    if (accumulates) {
      growing.push([name, lens.size]);
    }
  }
  let auxVars = [...listLen.entries(), ...growing]
    .filter(([name]) => name !== srcVar && !dictish.has(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_AUX_ROWS)
    .map(([name]) => name);

  /**
   * 光标有两类，按「值是什么形状」分。
   *
   * **规则一：单字符、在主串里** —— HJ21 简单密码 `for ch in pwd`。
   * 命名像单字符（ch/c/x/word…）或在源码里写成 `for ch in …`。
   *
   * **规则二：一个「词」，值命中 aux 行里的某一格** ——
   * HJ92 在字符串中找出连续最长的数字串里，`max(len(x) for x in nums)`
   * 的 `x` 依次取到 "12345"/"125"/"123456789"，每一次都对应 aux 行 `nums`
   * 里的一格；HJ90 合法 IP 的 `part` 依次取四段。
   * 这类题目**整个教学内容就是「在逐个看 aux 行里的东西」**，
   * 高亮必须跟着它走，否则画面上只有一张静止的表。
   *
   * 规则二**排在规则一之后**：HJ21 的 `ch` 恰好也在 aux 行 `res` 里出现过
   * （小写字母映射成数字之前的中间结果），先查 aux 就会把光标标到
   * 「输出里那个 z」上，而题目要求的是「改写第几个字符」。
   */
  let cursorVar: string | undefined;
  for (const e of envs) {
    for (const [name, v] of Object.entries(e)) {
      if (typeof v !== 'string' || v.length !== 1) {
        continue;
      }
      if (!src.includes(v)) {
        continue;
      }
      if (CHAR_NAMES.has(name.toLowerCase()) || new RegExp(`for\\s+${name}\\s+in\\b`).test(code)) {
        cursorVar = name;
        break;
      }
    }
    if (cursorVar) {
      break;
    }
  }
  if (!cursorVar) {
    /**
     * 候选要**扫过两格以上**才认。
     *
     * HJ92 的 `res = ''.join(x for x in nums if len(x) == maxlen)` 算出来是
     * `"123456789"`，而 `nums` 里恰好有一格就是 `"123456789"` ——
     * 值匹配成立，但 `res` 只对应**一格**，它不是「正在逐个看 nums」的
     * 那个变量（那是 `x`，依次扫过三格）。所以判据是「命中过 ≥2 格」。
     */
    const hits = new Map<string, Set<string>>();
  for (const e of envs) {
    for (const [name, v] of Object.entries(e)) {
        if (
          typeof v !== 'string' ||
          v.length === 0 ||
          v.length > 12 ||
          name === srcVar ||
          auxVars.includes(name) ||
          name.startsWith('.') ||
          STATE_RE.test(name)
        ) {
          continue;
        }
        // 记的是「命中过哪些**值**」而不是命中过几行 ——
        // 只有一行 aux 时按行数算，任何候选都只算 1
        const matched = auxVars.some((a) => {
          const rowVals = e[a];
          return Array.isArray(rowVals) && rowVals.some((x) => x === v);
        });
        if (matched) {
          let set = hits.get(name);
          if (!set) {
            set = new Set<string>();
            hits.set(name, set);
          }
          set.add(v);
        }
      }
    }
    let best = 1;
    for (const set of hits.values()) {
      best = Math.max(best, set.size);
    }
    for (const [name, set] of hits) {
      if (set.size === best && best >= 2) {
        cursorVar = name;
        break;
      }
    }
  }

  /**
   * **光标变量自己不当 aux**：HJ90 的 `part` 是 "10"/"137"/"9"/"5"
   * 四段之一，它既是光标（按值高亮 `parts` 里那一格）又是一条 2 格的
   * aux 行，两行画的是同一件事，其中一行还把 "10" 拆成 1、0 两格。
   */
  auxVars = auxVars.filter((name) => name !== cursorVar);

  // 状态量：排除光标与主串
  const stateVars = [...stateSeen].filter(
    (n) => n !== cursorVar && n !== srcVar,
  ).slice(0, 3);

  if (auxVars.length === 0 && !cursorVar && stateVars.length === 0) {
    return null;
  }
  return {srcVar, src, auxVars, cursorVar, stateVars};
}

export function adaptString(trace: RawTrace): AdapterResult | null {
  const pick = pickShapes(trace.events, trace.paramNames, trace.code);
  if (!pick) {
    return null;
  }
  const b = new TraceBuilder();
  let declared = false;
  /** 上一帧的 aux 行长度，用来判断「这一步有没有往前推」 */
  const prevAuxLen: Record<string, number> = {};
  let progressed = false;
  /** 上一帧的签名，用来跳過「什么都没变」的帧 */
  let lastKey = '';
  /** 光标到过的位置（主串下标；aux 用负数编码，避免与主串下标撞车） */
  const cursorPlaces = new Set<number>();
  /** aux 各行的内容签名 */
  const auxShapes = new Set<string>();
  /** 状态量改值的次数 */
  let stateMoves = 0;
  let prevState: Record<string, number> = {};
  /**
   * **合并成一个持续存在的环境**，每一帧读合并后的值。
   *
   * `sys.settrace` 记的是「这一行所属那个栈帧的局部变量」，而字符串题的
   * 数据往往分散在好几个栈帧里。HJ29 字符串加解密是最清楚的例子：
   *
   * ```
   * 30 {plain, cipher}        <- solve 的帧
   * 30 {.0}                   <- 推导式的帧（''.join(encrypt(c) for c in plain)）
   *  6 {ch: 'a'}              <- encrypt 的帧
   * 30 {.0, c: 'a'}           <- 又回到推导式的帧
   *  6 {ch: 'b'}
   * ```
   *
   * `plain` 与当前字符 `ch` **从不出现在同一帧里**，而且 solve 的帧只在
   * 第 30/31 行各出现一次。按「本帧有没有这个变量」取值的话：
   * 带 `plain` 的帧没有 `ch`（光标恒 undefined），带 `ch` 的帧没有
   * `plain`（整帧被跳过）—— 六十多个事件最后只剩 3 帧静止画面。
   *
   * 合并之后每一帧都能看到「完整的当前状态」：这与程序真实的语义一致
   * （变量还在作用域里，只是此刻在另一个栈帧上被读），也是唯一能让
   * 「当前正在处理第几个字符」这件事被画出来的办法。
   */
  const env: Record<string, unknown> = {};

  for (const e of trace.events) {
    Object.assign(env, e.locals);
    const srcRaw = asString(env[pick.srcVar]);
    if (srcRaw === null) {
      continue;
    }
    const src = srcRaw.replace(/\s+$/, '');
    const cursorChar =
      pick.cursorVar && typeof env[pick.cursorVar] === 'string'
        ? (env[pick.cursorVar] as string)
        : undefined;

    // 本帧的 aux 值
    const auxRows: Array<{
      label: string;
      values: Array<number | string>;
      states: CellState[];
    }> = [];
    for (const name of pick.auxVars) {
      const list = asStringList(env[name]);
      const growingStr = list ? null : asGrowingString(env[name]);
      if (!list && !growingStr) {
        continue;
      }
      const values = list ?? [...growingStr!];
      // 最后一个是「刚放进去的」，标 active
      const states: CellState[] = new Array(values.length)
        .fill('done')
        .map((_, i) => (i === values.length - 1 ? 'active' : 'done'));
      auxRows.push({label: `${name}（${values.length}）`, values, states});
    }

    // 光标：按**字符值**反查位置
    let cursorIdx: number | undefined;
    let cursorInAux = -1;
    if (pick.cursorVar && cursorChar !== undefined) {
      const ch = cursorChar;
      if (typeof ch === 'string' && ch.length > 0) {
        /**
         * **单字符先在主串里找**，找不到再退到 aux 行。
         *
         * 顺序反过来会把 HJ21 简单密码画错：`for ch in pwd` 的光标是
         * 主串的第 5 个字符，而 aux 行 `res` 里恰好也有一格是 'z'
         * （小写字母映射成数字之前的那个中间结果）——
         * 先查 aux 就会把光标标到「输出里那个 z」上，主串一个高亮都没有。
         * 那个高亮纯属巧合：题目要求的是「改写第几个字符」。
         *
         * aux 优先的场景只有一个：光标**不是**主串里的字符，
         * HJ90 合法 IP 的 `part` 是 "10"/"137"/"9"/"5" 四段之一，
         * 主串 `ip` 里根本没有这种多字符的片段。
         */
        if (ch.length === 1) {
          const at = src.indexOf(ch);
          if (at !== -1) {
            cursorIdx = at;
          }
        }
        if (cursorIdx === undefined) {
          for (let r = 0; r < auxRows.length && cursorInAux === -1; r++) {
            const at = auxRows[r].values.findIndex((v) => v === ch);
            if (at !== -1) {
              cursorInAux = at;
              auxRows[r].states[at] = 'active';
            }
          }
        }
      }
    }

    const stateNow: Record<string, number> = {};
    for (const name of pick.stateVars) {
      const v = env[name];
      if (typeof v === 'number' && Number.isFinite(v)) {
        stateNow[name] = v;
      }
    }

    if (!declared) {
      b.push({
        note: `${pick.srcVar} = ${src}（${src.length} 个字符）${
          pick.auxVars.length ? `，中间结果：${pick.auxVars.join(' / ')}` : ''
        }`,
        array: [...src],
      });
      declared = true;
    }

    /**
     * 「这一步有没有推进」：光标动了 / aux 变长了 / 状态量变了 / 光标落在 aux 的新格子上。
     *
     * 内层循环里同一行会反复执行，每一帧都记会让动画变成几十帧静止画面。
     * 签名相同就跳过 —— 但**首帧之后**才算，否则输入说明那一帧会被吃掉。
     *
     * `auxGrew` 必须留在签名里：HJ90 合法 IP 的 `parts` 是 `split` 一次成型的，
     * 之后每帧只是光标在四个段之间移动，aux 长度不变。
     */
    // 签名要带上 **aux 的内容**而不只是长度：HJ96 表示数字里
    // `result` 先是 "Jkdi" 再变 "Jkdi*234" —— 长度变了能认；
    // 但 HJ96 的另一帧里 "Jkdi*234" -> "Jkdi*234*" 长度也变了。
    // 反例是 HJ29 加解密：`plain = plain[1:]` 每帧都在被切短，
    // 光标字符 `c` 永远是 plain 的第一个字符，`indexOf(c)` 恒等于 0，
    // 只看光标位置的话三十帧全是同一格 —— 主串本身的变化才算推进。
    const key = `${src.length}:${cursorIdx ?? ''}:${cursorInAux}|${auxRows
      .map((r) => r.values.join(''))
      .join('|')}|${JSON.stringify(stateNow)}`;
    if (b.frames.length > 1 && key === lastKey) {
      continue;
    }
    /**
     * 「真的在推进」不能只看签名变没变。
     *
     * HJ33 整数与 IP 地址间的转换踩过这个坑：签名里带着状态量，
     * 而 `num` 恰好被 STATE_RE 的 `n\w*` 命中，它**第一次出现**就让
     * 签名变了 —— 于是判成「有过程」，画出来是三帧完全一样的画面：
     * 主串 `10.0.3.193` 一个字都没动，没有光标，没有中间结果，
     * 而这个题的核心（`a,b,c,d = map(int, ip.split('.'))` 再拼位）
     * 在局部变量里根本没留下痕迹。
     *
     * 所以判据收紧成三件事之一真的发生过：
     * 光标到过 ≥2 个位置 / aux 的内容变过 / 某个状态量**改过值**
     * （第一次出现不算「改」，那只是它进入了作用域）。
     */
    if (b.frames.length > 1) {
      if (cursorIdx !== undefined) {
        cursorPlaces.add(cursorIdx);
      }
      if (cursorInAux !== -1) {
        cursorPlaces.add(-1 - cursorInAux);
      }
      if (auxRows.length > 0) {
        auxShapes.add(auxRows.map((r) => r.values.join('')).join('|'));
      }
      for (const [k, v] of Object.entries(stateNow)) {
        if (prevState[k] !== undefined && prevState[k] !== v) {
          stateMoves++;
        }
      }
      if (cursorPlaces.size >= 2 || auxShapes.size >= 2 || stateMoves >= 1) {
        progressed = true;
      }
    }
    lastKey = key;
    prevState = stateNow;

    const states: CellState[] = new Array(src.length).fill('idle');
    if (cursorIdx !== undefined) {
      states[cursorIdx] = 'active';
      for (let i = 0; i < cursorIdx; i++) {
        states[i] = 'done';
      }
    }

    b.push({
      note: `${cursorIdx !== undefined ? `第 ${cursorIdx} 个字符 ` : ''}${
        cursorChar !== undefined ? `（${cursorChar}）`
          : ''
      }${Object.keys(stateNow).length ? ` ${JSON.stringify(stateNow)}` : ''}：${
        lineText(trace.code, e.line) || `第 ${e.line} 行`
      }`,
      array: [...src],
      states,
      pointers: cursorIdx !== undefined ? {当前位置: cursorIdx} : undefined,
      aux: auxRows.length > 0 ? auxRows : undefined,
      counters: Object.keys(stateNow).length > 0 ? stateNow : undefined,
      line: e.line,
    });

    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  // 一帧都没推进过 = 这题其实没有「逐步处理」的过程，别画
  if (!progressed || b.frames.length < 3) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}
