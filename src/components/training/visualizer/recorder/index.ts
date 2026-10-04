/**
 * 构建期录制：从题解代码生成原始执行轨迹。
 *
 * ## 跑法
 *
 * ```
 * pnpm trace:record          # 全部题解，产物进 static/traces/
 * pnpm trace:record 1 3 11   # 只录这几篇（调试用）
 * ```
 *
 * 需要先 `pnpm sync:pyodide`（12.9MB，已 gitignore）。
 * 没下运行时不是错误 —— 脚本打印提示后以 0 退出，
 * 这样本地不想装 Pyodide 的人跑 `pnpm build` 也不会被卡住。
 *
 * ## 为什么录制跑在 Node 而不是浏览器
 *
 * 帧要进 `static/traces/*.json`，被 Docusaurus 当静态资源拷进 build。
 * 构建期生成的东西必须由构建期产出，浏览器里录没法参与 SSG。
 *
 * ## 自检：结果必须与样例一致
 *
 * 录完每题都拿录制结果跟题面样例的期望值比一次。不一致就**丢弃这份轨迹**
 * （`result-mismatch`）。理由很直接：可视化是拿来帮助理解的，
 * 拿一份跑不出正确答案的代码去演示，等于教错。
 */

import fs from 'fs';
import path from 'path';
// 相对路径而不是 @site/*：这段代码跑在 ts-node 下，不经过 Docusaurus 的
// tsconfig-paths 注入。跨目录引用 @site 会直接 require 失败。
import {
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
} from '../../../../../plugins/py-samples';
import {asCallArgument, toPythonLiteral, usableSamples} from '../../pyrunner/runner';
import {nodeParams} from '../../pyrunner/snippet';
import {BUILDER_PY, STDIN_SHIM_PY} from '../../pyrunner/driver';
import {compare} from '../../pyrunner/compare';
import {asSnippetEntry, entryCandidates} from './entries';
import {classNames, parseScriptSample} from './script';
import type {ScriptSample} from './script';
import {buildRecordDriver, TRACER_PY} from './recorder';
import type {Json, RawTrace, RecordSkipReason, TraceEvent} from './types';

export interface RecordStats {
  ok: number;
  skipped: Record<string, number>;
  /**
   * 逐题的失败原因。
   *
   * 只有聚合计数（「no-sample=56」）是不够的 —— 那不告诉你**是哪 56 篇、
   * 因为什么**。补覆盖率时需要的是清单，不是数字，所以这里把每篇的
   * 失败原因连同细节记下来，`pnpm trace:record` 会打���成一张表。
   */
  failures: Array<{doc: string; reason: RecordSkipReason; detail: string}>;
}

/** 单题事件数上限。MAX_FRAMES 是播放器的帧上限，这里留些余量给 adapter 合并用。 */
const EVENT_LIMIT = 3000;

/** 输出目录。进 git —— 帧是内容的一部分，改题解代码要能 diff 出来。 */
export const TRACES_DIR = 'static/traces';

interface PyodideLike {
  runPython(code: string): unknown;
  globals: {get(name: string): unknown};
}

/** 加载 Pyodide；返回 null 表示运行时没下载 */
async function loadPy(): Promise<PyodideLike | null> {
  const runtimeDir = path.join(process.cwd(), 'static/pyodide');
  if (!fs.existsSync(path.join(runtimeDir, 'pyodide.mjs'))) {
    return null;
  }
  // 用 npm 包而不是 static/ 里的 mjs：前者是 CJS 入口，能在 ts-node 下 require
  const {loadPyodide} = require('pyodide') as {
    loadPyodide: (o: unknown) => Promise<PyodideLike>;
  };
  return loadPyodide({indexURL: runtimeDir});
}

/**
 * `## 完整代码实现` 小节里的第一个 python 块。
 *
 * **必须按小节取，不能全文正则取第一个块** —— 题解的「解题思路」里往往先
 * 出现暴力解法的片段。录暴力解法会得到 n/i/j 三重循环的轨迹：
 * 帧数暴涨、指针有三个、读者看到的还不是题解主推的解法
 * （实测 0001 全文首个块是 O(n²) 的嵌套循环，录出来完全不是那题该有的样子）。
 */
function canonCode(md: string): string {
  const lines = md.split('\n');
  const startRe = /^##\s+完整代码实现\s*$/;
  const start = lines.findIndex((l) => startRe.test(l.trim()));
  if (start === -1) {
    return '';
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  const m = lines.slice(start + 1, end).join('\n').match(/```python\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

function num(v: Json): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * 判定「这次录制跑出来的东西是不是这道题的答案」。
 *
 * ## 为什么不自己写一套比较
 *
 * 早先这里是 `resultMatches`，一个「宽松的 JSON 文本相等」，理由是
 * 「样例期望值是力扣题面抄来的散文，窄了会把能录的题筛掉」。这个判断
 * 是对的，但**实现方式**错了：它没有区分「顺序无所谓」「答案不唯一」
 * 「stdout 文本」这三种题面自己写明的情况，于是
 *
 * - 0108 转换有序数组为二叉搜索树：题面示例写着「`[0,-10,5,null,-3,null,9]`
 *   也将被视为正确答案」，按形状比必然判失败
 * - 0347 前 K 个高频元素：题面写「可以按任意顺序返回」，实录 `[2,1]`
 *   而期望是 `[1,2]`
 * - 牛客题：期望值是**程序打印的文本**，不是返回值的 JSON 表示
 *
 * 这三种情况 Pyodide 运行条（`pyrunner/compare.ts`）**早就处理好了**，
 * 而且 py-samples 插件已经按题面文本给每条样例打好了
 * `orderAgnostic` / `multiAnswer` / `textCompare` 标记。复用同一套比较，
 * 录制与「跑样例」的判���口径就一致了 —— 否则会出现「页面上样例全过，
 * 但录制说跑不对」这种自相矛盾。
 */
function judge(
  expected: string,
  payload: {
    result: Json;
    mutated?: Json;
    stdout?: string;
  },
  opts: {isStdin: boolean; orderAgnostic?: boolean; multiAnswer?: boolean},
): {ok: boolean; reason: string} {
  const want = expected.trim();
  if (!want) {
    return {ok: true, reason: '没有期望值'};
  }
  /**
   * 「箭头串」期望值归一化成列表。
   *
   * shoppee 的链表题把答案写成 `1 -> 2 -> 3 -> 4 -> 5`，而代码返回的是
   * `[1, 2, 3, 4, 5]`。不归一化的话两边永远对不上，
   * 报出来的却是「期望 1 -> 2 -> 3 / 实录 [2,4,2,1,3,5,1]」这种没法看的信息。
   */
  const arrow = /^-?\d+(?:\.\d+)?(?:\s*->\s*-?\d+(?:\.\d+)?)+$/.test(want);
  const normalizedWant = arrow ? `[${want.split(/\s*->\s*/).join(', ')}]` : want;
  // 期望值是散文（「`5 棵不同的 BST`」「返回空列表」），判不了就放行 ——
  // 这一层只是防「代码根本跑不对」，判题是运行条的事
  if (/…|\.\.\.|。|，|[\u4e00-\u9fa5]/.test(want)) {
    return {ok: true, reason: '期望值是散文，放行'};
  }

  /**
   * 原地修改类题目：函数返回 None，题面的「输出」说的是改完之后的入参。
   * 0075 排序颜色、0189 轮转数组、0283 移动零都是这种 —— 拿返回值比
   * 永远是 `null`，会被误判成「代码跑不对」。
   */
  const actual = opts.isStdin
    ? (payload.stdout ?? '')
    : payload.result === null && Array.isArray(payload.mutated)
      ? (payload.mutated.find(
          (m) => Array.isArray(m) || typeof m === 'string' || typeof m === 'number',
        ) ?? null)
      : payload.result;

  const got =
    typeof actual === 'string' ? actual : JSON.stringify(actual ?? null);
  let result = compare(got, normalizedWant, {
    // 顺序/多解这两个标记**来自题面文本**，不是来自期望值本身。
    // py-samples 插件已经按「题目描述」小节算好并挂到每条样例上：
    // 0108 的示例里写着「`[0,-10,5,null,-3,null,9]` 也将被视为正确答案」，
    // 0347 的题面写着「可以按任意顺序返回」。
    // 自己从期望值文本里正则是不行的 —— 那句话不在期望值里。
    orderAgnostic: opts.orderAgnostic,
    multiAnswer: opts.multiAnswer,
  });
  /**
   * 返回值是**节点**、题面期望的是节点的**值**时，按值比。
   *
   * 0236 二叉树的最近公共祖先：`lowestCommonAncestor` 返回一个 TreeNode，
   * 编码成层序是 `[3,5,1,6,2,0,8,null,null,7,4]`（以最近公共祖先为根的那棵子树），
   * 而题面要的是 `3` —— 那个节点的值。
   *
   * 只在「期望是标量 + 实录是数组 + 首元素正好是这个标量」时放行，
   * 三条同时成立才认，判错的概率基本为零。
   */
  if (!result.ok && /^[\w."'-]+$/.test(normalizedWant)) {
    let rootValue: Json | undefined;
    try {
      const parsed = JSON.parse(got);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rootValue = parsed[0];
      }
    } catch {
      rootValue = undefined;
    }
    if (rootValue !== undefined && JSON.stringify(rootValue) === JSON.stringify(JSON.parse(normalizedWant.replace(/^["']|["']$/g, '')))) {
      return {ok: true, reason: '返回值是节点，按节点的值比一致'};
    }
  }
  if (result.ok) {
    return {ok: true, reason: '一致'};
  }
  return {
    ok: false,
    reason: `期望 ${want.slice(0, 60)} / 实录 ${got.slice(0, 60)}（${result.reason ?? '不一致'}）`,
  };
}

/**
 * 从样例实参里挑一组「录制友好」的输入。
 *
 * 要点：**只取数字、长度不夸张**的实参。录制是把每个中间状态都存下来，
 * 输入 200 个元素会产生几百 KB 的 JSON，而且画面也画不下。
 * 所以优先挑最接近 MAX_INPUT_SIZE(60) 且元素都是数字的那组。
 */
/**
 * 挑一组最值得可视化的样例，返回**整条样例**（args + expected）。
 *
 * ## 为什么必须连 expected 一起返回
   *
 * 早先这里只返回 `args`，而调用方拿 `expected` 时用的是
 * `usableSamples(samples)[0]` —— **另一个样例**。两者对不上，于是
 * 一大批本来能录的题被判成 `result-mismatch`：
 *
 * - 0005 最长回文子串：录的是 `"cbbd"` 那组，期望却拿 `"babad"` 的 `"bab"`
 * - 0013 罗马数字转整数：录的是 `"MCMXCIV"`（实录 1994），期望却是 `"III"` 的 3
 * - 0055 跳跃游戏：实录 False，期望是另一组的 True
 *
 * 22 篇 `result-mismatch` 里有 18 篇是这个 bug。挑样例与取期望必须是
 * 同一个动作，不然自检就是拿 A 的输入去对 B 的答案。
 */
function pickSamples(
  samples: ReturnType<typeof extractDocSamples>,
  paramNames: string[],
): Array<{
  args: string[];
  expected: string;
  /** 题面自己写明的比较宽松规则，由 py-samples 按题面文本算好 */
  orderAgnostic?: boolean;
  multiAnswer?: boolean;
}> {
  const usable = usableSamples(samples);
  if (usable.length === 0) {
    return [];
  }

  /**
   * 样例里第一个「可画出来」的序列参数。
   *
   * 数字数组是双指针/二分的主力输入；**单个字符串**同样重要 ——
   * 0003 无重复子串、0011 盛水容器这类题吃的就是一个 str，
   * 它在画面上就是一个字符数组。
   */
  const seqOf = (raw: string): number[] | string | null => {
    const py = toPythonLiteral(raw);
    try {
      const v = JSON.parse(py);
      if (Array.isArray(v)) {
        return v.every((x) => typeof x === 'number' && Number.isFinite(x))
          ? (v as number[])
          : null;
      }
      if (typeof v === 'string') {
        return v;
      }
      return null;
    } catch {
      return null;
    }
  };

  const withFlags = (s: (typeof usable)[number], score: number) => ({
    args: s.args,
    expected: s.expected,
    orderAgnostic: s.orderAgnostic,
    multiAnswer: s.multiAnswer,
    score,
  });

  const scored = usable
    .map((s) => {
      let seq: number[] | string | null = null;
      let at = -1;
      for (let i = 0; i < s.args.length; i++) {
        const c = seqOf(s.args[i]);
        if (c !== null) {
          seq = c;
          at = i;
          break;
        }
      }
      // 长度 3~24：太短的看不出滑动窗口在动，太长的画面挤不下。
      // 网格（二维）不在这里处理 —— 由 adaptGrid 那条路走。
      if (seq === null || seq.length < 3 || seq.length > 24) {
        return null;
      }
      const items: Array<number | string> =
        typeof seq === 'string' ? [...seq] : seq;
      // 元素种类多一点的输入更能体现算法过程，全是同一个数看不出滑窗在动
      const distinct = new Set<number | string>(items).size;
      // 优先录参数名与序列语义相符的样例（s/word/str 收字符串，
      // nums/arr 收数组），对不上就靠分数兜底
      const nameHint = paramNames[at]?.toLowerCase() ?? '';
      const wantsString = /str|s$|word|chars?|string/.test(nameHint);
      const penalty =
        typeof seq === 'string' ? (wantsString ? 0 : 15) : wantsString ? 15 : 0;
      return withFlags(s, distinct * 10 - seq.length - penalty);
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    return scored.map(({score: _score, ...rest}) => rest);
  }

  /**
   * 兜底：没有「好看」的序列样例时，用能用的样例（按题面顺序）。
   *
   * 这一步救回来的题不少：HJ1 字符串最后一个单词的长度（入参就是一行
   * 字符串，长度可能不足 3）、HJ11 数字颠倒、HJ85 最长回文子串、
   * HJ67 24 点游戏 —— 它们照样有循环有过程，画出来是有意义的，
   * 只是「序列长度不在 3~24 的甜区」而已。
   *
   * 早先没有这个兜底，这几篇被判 `no-sample`，而报错信息是
   * 「候选入口都匹配不上样例」，完全指不到「其实有样例，只是我挑得不对」。
   *
   * 兜底时**全都返回**：有的样例会走不进主循环（见 main 里「样例不够好就换一组」）。
   */
  return usable.map((s) => withFlags(s, 0)).map(({score: _score, ...rest}) => rest);
}

/**
 * 样例里有没有「环形链表」的 `pos = N` 约定。
 *
 * 力扣的 0141/0142 题面写的是 `head = [3,2,0,-4], pos = 1`：
 * 把尾部接到第 pos 个节点上。入口只收 `head`，多出来的 `pos` 是给评测驱动
 * 的元信息 —— 但**不接环就跑不出正确结果**（`hasCycle` 返回 False，
 * 与题面期望的 True 判不上，录制直接 result-mismatch 丢掉）。
 *
 * 只在**第一段样例**里找，且只认紧跟在 `输入` 之后的那个 `pos = N`。
 */
function cyclePosOf(md: string): number | undefined {
  const at = md.search(/输入(?:\*\*)?[：:]/);
  if (at === -1) {
    return undefined;
  }
  const m = /\bpos\s*=\s*(\d+)/.exec(md.slice(at, at + 400));
  return m ? Number(m[1]) : undefined;
}

/**
 * 样例实参 -> Python 字面量。**必须走 `asCallArgument`**，与页面上
 * 「跑样例」那条路（runner.ts 的第 143 行）完全一致。
 *
 * 两处口径不一致的后果是「页面上样例全过，但录制说跑不对」这种自相矛盾：
 * - `reverse_number(num_str: str)` 拿到样例 `1516000`，直接 `toPythonLiteral`
 *   会把它变成**整数** 1516000，于是 `'int' object is not subscriptable` ——
 *   而运行条那边按 `str` 标注补了引号，跑得好好的（HJ11 数字颠倒）。
 * - shoppee 的围栏样例写的是 `grid = [[0,0,0]]`，不剥掉 `grid = `
 *   就是 SyntaxError（`asCallArgument` 的加强版专门处理这个形态）。
 */
function pyArg(raw: string, annotation?: string): string {
  return toPythonLiteral(asCallArgument(raw, annotation));
}

/** 递归收集题解 md */
function collectDocs(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith('.md')) {
        out.push(full);
      }
    }
  };
  if (fs.existsSync(root)) {
    walk(root);
  }
  return out;
}

/** 文件名 -> 稳定的 JSON 名（去扩展名，非 ASCII 保留） */
function traceName(docPath: string): string {
  return path.basename(docPath, '.md');
}

/**
 * traceback 的最后一行 —— 那才是真正的错误。
 *
 * `payload.error` 是整段 traceback（十几行），打进失败清单里会把其它信息
 * 淹没。`TypeError: ...` / `ValueError: ...` 那一行才是可行动的。
 */
function lastLine(traceback: string): string {
  const lines = traceback.trimEnd().split('\n');
  return (lines[lines.length - 1] ?? traceback).slice(0, 200);
}

/**
 * 把 Python 的 `json.dumps` 产物变成 JS 能 parse 的东西。
 *
 * `json.dumps` 默认 `allow_nan=True`，会把浮点无穷写成裸的 `Infinity` /
 * `-Infinity` / `NaN` —— **这不是合法 JSON**，`JSON.parse` 直接报
 * `SyntaxError: No number after minus sign`。
 *
 * 这不是理论问题：0016 三数之和最近值用 `float('inf')` 当初值，
 * 0152 最大乘积子数组、0309 冷冻期、0581 最短无序子数组也都用 inf
 * 做哨兵，一共 5 篇因为这个被丢掉 —— 而且报的错是「位置 142 的 JSON
 * 解析失败」，完全指不到真正的原因。
 *
 * 换成 `null`：录制产物里这些值只出现在「初值是哨兵」的位置，
 * 渲染时 `null` 与 `Infinity` 一样画不出格子（`ArrayView` 只渲染标量），
 * 区别只在源码面板里那一行字。
 */
function sanitizeJson(raw: string): string {
  // 负号开头要一起换，否则会留下 `-Infinity` 的 `-` 让 JSON 变成非法
  return raw
    .replace(/(^|[\s:,\[])-Infinity/g, '$1null')
    .replace(/(^|[\s:,\[])Infinity/g, '$1null')
    .replace(/(^|[\s:,\[])NaN/g, '$1null');
}

export async function recordTraces(
  only: string[] = [],
): Promise<{stats: RecordStats; written: string[]}> {
  const stats: RecordStats = {ok: 0, skipped: {}, failures: []};
  const written: string[] = [];
  const skip = (r: RecordSkipReason, doc: string, detail = ''): void => {
    stats.skipped[r] = (stats.skipped[r] ?? 0) + 1;
    stats.failures.push({doc, reason: r, detail});
  };

  const py = await loadPy();
  if (!py) {
    console.log(
      '跳过录制：还没下载 Pyodide 运行时。先跑 `pnpm sync:pyodide`。\n' +
        '（不影响 pnpm build —— 没有 trace 的题解只是没有可视化。）',
    );
    return {stats, written};
  }
  py.runPython(TRACER_PY);
  /**
   * 平台类 + 入参还原器 + 值编码器，从 `pyrunner/driver.ts` 整块复用。
   *
   * 必须复用而不是抄一份：链表/树的入参约定很细（层序 vs `[l,v,r]`、
   * random 指针在下标里、0236 的 p/q 给的是节点值），
   * 两份实现漂移的后果是「样例判失败」这种看起来像代码 bug 的现象。
   */
  py.runPython(BUILDER_PY);
  /**
   * stdin 垫片。必须复用 `pyrunner/driver.ts` 那份：ACM 题写的是
   * `sys.stdin.buffer.read()`，而 `io.StringIO` 没有 `.buffer` 属性，
   * 实测 8 篇牛客题全挂在这一行。
   */
  py.runPython(STDIN_SHIM_PY);

  const docsRoot = path.join(process.cwd(), 'code-training/docs');
  const problemsDir = path.join(docsRoot, 'problems');
  const docs = collectDocs(problemsDir).filter(
    (f) => only.length === 0 || only.some((o) => f.includes(o)),
  );

  const outDir = path.join(process.cwd(), TRACES_DIR);
  fs.mkdirSync(outDir, {recursive: true});

  for (const file of docs) {
    const doc = traceName(file);
    const md = fs.readFileSync(file, 'utf8');
    const code = canonCode(md);
    if (!code) {
      skip('no-code', doc, '## 完整代码实现 里没有 python 块');
      continue;
    }

    const sig = extractSignature(code);
    /**
     * 文件名去编号后的 snake_case 转 camelCase，作为「题面入口名」的提示。
     * `0148_sort_list` -> `sortList`：题解里辅助函数写在主入口前面时
     * （0148 是 `getListLength` / `splitList` / `mergeTwoLists` / `sortList`），
     * 「第一个带 self 的方法」挑中的不是题目要的那个。
     * 其它命名（HJ17 坐标移动、牛客题）转出来对不上，不匹配就当没给。
     */
    const nameHint = traceName(file)
      .split('_')
      .slice(1)
      .join('_')
      .replace(/(^|_)([a-z])/g, (_m, _p, c: string) => c.toUpperCase());
    const {candidates, analysisReason} = entryCandidates(
      code,
      sig.method,
      nameHint || undefined,
    );
    if (candidates.length === 0) {
      const defs = [...code.matchAll(/^\s*def\s+(\w+)/gm)].map((m) => m[1]);
      skip('no-entry', doc, `${analysisReason || '没有可调用入口'}；def: ${defs.join(', ') || '(无)'}`);
      continue;
    }

    const stdinSamples = extractDocStdinSamples(md);
    const lineCount = code.split('\n').length;
    /**
     * 链表/树题：入参要还原成平台对象。
     *
     * 不做的话 `l1 = [2,4,3]` 原样传进去，代码第一句 `l1.val` 就是
     * `AttributeError: 'list' object has no attribute 'val'`
     * —— 一次性 13 篇（0002/0019/0021/0024/0025/0124/0148/0206/0226/0234/0328…）。
     *
     * `nodeParams` 按「代码碰了哪些属性」判断链表还是树，比猜长度靠谱得多
     * （二叉树在力扣是 `[left, val, right]`，长度 3，和三元素链表
     * 在字面量上完全一样）。
     */
    const needsNodes =
      /\b(ListNode|TreeNode|Node)\b|\.\s*(left|right|next|val)\b/.test(code);

    /**
     * 挨个试候选入口，第一个「跑通且结果与样例一致」的胜出。
     *
     * 判据不是「不报错」而是「结果对」—— 有的辅助函数也能跑通
     * （`valid_ip("1.2.3.4")` 返回 True），但它不是题目的解法。
     * 结果这一关把它们挡住。
     */
    const attempts: Array<{
      candidate: (typeof candidates)[number];
      args: string[];
      expected: string;
      stdinText?: string;
      orderAgnostic?: boolean;
      multiAnswer?: boolean;
      /** 操作脚本模式（class-API 设计题） */
      script?: ScriptSample;
      /** 环形链表：尾部接到第 N 个节点（0141/0142） */
      cyclePos?: number;
    }> = [];

    // 先按候选顺序各自备好实参
    for (const c of candidates) {
      const samples = extractDocSamples(md, c.paramNames, c.requiredCount);
      const picks = pickSamples(samples, c.paramNames);
      if (picks.length > 0 && !c.stdin) {
        // 每个入口最多备 3 组样例：够覆盖「第一组走不进主循环」的情况，
        // 又不至于让录制时间翻三倍（见下面的 MIN_USEFUL_EVENTS）
        for (const picked of picks.slice(0, 3)) {
          attempts.push({
            candidate: c,
            args: picked.args,
            expected: picked.expected,
            orderAgnostic: picked.orderAgnostic,
            multiAnswer: picked.multiAnswer,
          });
        }
        continue;
      }
      /**
       * 环形链表（0141/0142）：样例多一个 `pos = N`，常规抽取必然落空。
       *
       * 这里把 `pos` 也当成一个形参去抽（键数就对上了），
       * 抽完**丢掉**这个实参 —— 它不是入口的参数，而是建链表时要用的。
       * 只对「第一个形参是链表」的入口这么做，别的一律不碰。
       */
      const cyclePos = cyclePosOf(md);
      if (cyclePos !== undefined && c.requiredCount === 1 && !c.stdin) {
        const withPos = pickSamples(
          extractDocSamples(md, [...c.paramNames, 'pos'], 2),
          c.paramNames,
        );
        if (withPos.length > 0) {
          attempts.push({
            candidate: c,
            args: withPos[0].args.slice(0, 1),
            expected: withPos[0].expected,
            cyclePos,
          });
          continue;
        }
      }
      // 读 stdin 的入口：喂第一组 stdin 样例，期望值按文本比
      //
      // **只给真的读 stdin 的入口用**（牛客/ACM 题的 `solve`/`main`）。
      // 早先不分青红皂白都给，于是「需要 1 个位置参数」的入口拿到
      // 「空参数 + 一段 stdin」—— 驱动里报的是
      // `missing 1 required positional argument: 'grid'`，
      // 而真正的问题是样例形态对不上（shoppee_maze 一次性三篇）。
      if (c.stdin && stdinSamples.length > 0) {
        attempts.push({
          candidate: c,
          args: [],
          expected: stdinSamples[0].expected,
          stdinText: stdinSamples[0].stdin,
        });
      }
    }

    if (attempts.length === 0) {
      /**
       * 单参入口 + stdin 形态的样例：从 stdin 文本反推出一个列表/网格实参。
       *
       * shoppee_maze_unreachable_count 的围栏样例是「4 + 4×4 的 0/1 矩阵」，
       * 而入口要 `List[List[int]]` —— 抽取器正确地拒绝了它（多行且无
       * `k =` 形式），但值就在那儿，按网格规则还原即可。
       */
      for (const c of candidates) {
        if (c.stdin || c.requiredCount !== 1 || attempts.length >= 3) {
          continue;
        }
        const guess = stdinArgs(c.paramNames, stdinSamples);
        if (guess) {
          attempts.push({
            candidate: c,
            args: guess.args,
            expected: guess.expected,
          });
        }
      }
    }

    if (attempts.length === 0) {
      /**
       * 常规路径（一次调用）一条样例都抽不到时，再试「操作脚本」。
       *
       * class-API 设计题（0146 LRU / 0155 最小栈 / 0208 前缀树）的样例
       * 是「构造一次 + 挨个调方法」的序列，**根本没有一次调用**，
       * `extractDocSamples` 按实参个数匹配必然落空。详见 recorder/script.ts。
       */
      const script = parseScriptSample(md, classNames(code));
      if (script) {
        attempts.push({
          candidate: {
            name: script.steps[0]?.method ?? '',
            className: script.className,
            paramNames: [],
            annotations: [],
            requiredCount: 0,
            stdin: false,
          },
          args: [],
          expected: script.expected,
          script,
        });
      } else {
        skip(
          'no-sample',
          doc,
          `候选入口 ${candidates
            .slice(0, 3)
            .map((c) => `${c.name}(${c.paramNames.join(',')})`)
            .join(' / ')} 都匹配不上样例；stdin 样例 ${stdinSamples.length} 个`,
        );
        continue;
      }
    }

    let payload: {
      events: TraceEvent[];
      result: Json;
      mutated?: Json;
      stdout?: string;
      error: string | null;
    } | null = null;
    let winner: (typeof attempts)[number] | null = null;
    const triedErrors: string[] = [];

    /**
     * 样例「跑得对但没过程」时，换下一组样例再试。
     *
     * 0416 分割等和子集是唯一的实例，而它的失败方式非常隐蔽：
     * 题面第一组样例 `nums = [1,2,3,5]` 的总和是 **11（奇数）**，
     * 代码第三行 `if total % 2 != 0: return False` 就返回了 ——
     * 轨迹 3 个事件，judge 也判「结果一致」（确实是 False），
     * 两道关卡全过，录制**成功**了，可这段轨迹里没有一行循环。
     *
     * 也就是说：不能只看「录成功没有」，还要看「录出来的东西有没有过程」。
     * 判据就是事件数 —— 少于 MIN_USEFUL_EVENTS 个事件的轨迹画出来
     * 只会是一张静止的画面。
     *
     * 取「事件最多的那一份」而不是「第一个事件够多的」：多试几组成本很低
     * （每个入口最多 3 组），换来的是尽可能丰富的轨迹。
     */
    for (const attempt of attempts.slice(0, 10)) {
      const c = attempt.candidate;
      const pyArgs = attempt.args.map((a, i) => pyArg(a, c.annotations[i]));
      const realKinds = needsNodes
        ? nodeParams(asSnippetEntry(c), code)
        : undefined;
      let out: typeof payload;
      try {
        py.runPython(
          buildRecordDriver({
            code,
            method: c.name,
            className: c.className ?? undefined,
            args: pyArgs,
            kinds: realKinds,
            stdin: attempt.stdinText,
            cyclePos: attempt.cyclePos,
            script: attempt.script
              ? {
                  className: attempt.script.className,
                  ctorArgs: attempt.script.ctorArgs,
                  steps: attempt.script.steps,
                }
              : undefined,
            eventLimit: EVENT_LIMIT,
            lineCount,
          }),
        );
        const raw = py.globals.get('__TRACE_OUT__') as string;
        out = JSON.parse(sanitizeJson(raw));
      } catch (e) {
        triedErrors.push(`${c.name}: 驱动异常 ${String(e).slice(0, 120)}`);
        continue;
      }
      if (out!.error) {
        triedErrors.push(`${c.name}: ${lastLine(out!.error)}`);
        continue;
      }
      const verdict = judge(attempt.expected, out!, {
        isStdin: attempt.stdinText !== undefined,
        orderAgnostic: attempt.orderAgnostic,
        multiAnswer: attempt.multiAnswer,
      });
      if (!verdict.ok) {
        triedErrors.push(`${c.name}: ${verdict.reason}`);
        continue;
      }
      if (payload === null || out.events.length > payload.events.length) {
        payload = out;
        winner = attempt;
      }
      // 事件够多了就不必再换样例（绝大多数题在这里就停，行为与从前一致）
      if (out.events.length >= 12) {
        break;
      }
    }

    if (!payload || !winner) {
      const last = triedErrors[triedErrors.length - 1] ?? '没有候选入口';
      // 「跑不起来」和「跑起来但结果不对」是两种病，分开报
      const allMismatch = triedErrors.every((t) => t.includes('期望'));
      skip(
        allMismatch && triedErrors.length > 0 ? 'result-mismatch' : 'exec-error',
        doc,
        triedErrors.slice(0, 3).join(' | ') || last,
      );
      continue;
    }

    if (payload.events.length < 3) {
      skip('no-sample', doc, `只采到 ${payload.events.length} 个事件（没有循环）`);
      continue;
    }

    const realKinds = needsNodes
      ? nodeParams(asSnippetEntry(winner.candidate), code)
      : undefined;
    const trace: RawTrace = {
      docKey: traceName(file),
      code,
      method: winner.candidate.name,
      paramNames: winner.candidate.paramNames,
      argKinds: realKinds,
      args: winner.args.map((a, i) => pyArg(a, winner.candidate.annotations[i])),
      stdin: winner.stdinText,
      expected: winner.expected,
      result: payload.result,
      events: payload.events,
    };
    const name = `${traceName(file)}.json`;
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(trace));
    written.push(name);
    stats.ok++;
  }

  return {stats, written};
}

/**
 * 入口在别的代码块里以顶层函数形式出现过时，用那个名字。
 *
 * 与 py-samples 的 crossCheckEntryName 同理，但方向相反：它处理
 * 「类内方法在别处是顶层函数」，这里处理「入口本来就不是类方法」。
 */
function findTopLevelEntry(md: string, code: string, method: string): string | null {
  const blockRe = /```python\s*\n([\s\S]*?)```/g;
  const funcRe = /^(?:async\s+)?def\s+(\w+)/gm;
  const canonNames = new Set<string>();
  const methodRe = /^[ \t]+def\s+(\w+)/gm;
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(code)) !== null) {
    canonNames.add(m[1]);
  }
  if (canonNames.has(method)) {
    return method;
  }
  let f: RegExpExecArray | null;
  while ((f = funcRe.exec(md)) !== null) {
    if (canonNames.has(f[1])) {
      return f[1];
    }
  }
  return null;
}

/**
 * 从 stdin 样例里凑出实参。
 *
 * 牛客/ACM 题的样例是 stdin 文本而非调用，它们的入口通常是一元函数
 * （`def can_reach_24(nums)`）。这里按「第一组样例的第一个数字数组」猜，
 * 猜不到就返回 null —— 不硬猜参数顺序，错了会造出必然失败的轨迹。
 */
function stdinArgs(
  paramNames: string[],
  samples: Array<{stdin: string; expected: string}>,
): {args: string[]; expected: string} | null {
  if (samples.length === 0 || paramNames.length === 0) {
    return null;
  }
  /**
   * 「首行 n + 后面 n 行、每行 n 个数字」是网格输入的标准写法，
   * 还原成二维列表 —— shoppee_maze_unreachable_count 的围栏样例就是这个形态：
   *
   * ```
   * 4
   * 0 1 1 0
   * 1 0 0 0
   * 0 1 0 1
   * 0 1 1 0
   * ```
   *
   * 而入口是 `apply(generated_map: List[List[int]])`。
   * 不还原的话把 17 个数字拍平成一维数组，代码第一行就越界 ——
   * 报错还指不到「样例形状不对」这件事。
   *
   * 判据很紧：首行是整数 n（2~30），后面**恰好** n 行、每行**恰好** n 个数字。
   * 「恰好」是这个规则敢不敢用的全部理由：差一点就退回拍平。
   */
  const lines = samples[0].stdin
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    const n = Number(lines[0]);
    if (Number.isInteger(n) && n >= 2 && n <= 30 && lines.length - 1 === n) {
      const rows = lines.slice(1).map((l) => l.match(/-?\d+(?:\.\d+)?/g) ?? []);
      if (rows.every((r) => r.length === n)) {
        return {
          args: [`[[${rows.map((r) => r.join(', ')).join(', ')}]]`],
          expected: samples[0].expected,
        };
      }
    }
  }

  const nums = samples[0].stdin.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 3) {
    return null;
  }
  return {
    args: [`[${nums.join(', ')}]`],
    expected: samples[0].expected,
  };
}

/** 命令行入口 */
async function main(): Promise<void> {
  const only = process.argv.slice(2);
  console.log(`录制轨迹${only.length ? `（仅 ${only.join(', ')}）` : '（全部题解）'}…`);
  const {stats, written} = await recordTraces(only);
  console.log(`\n成功 ${stats.ok} 篇，写入 ${TRACES_DIR}/`);
  const skips = Object.entries(stats.skipped);
  if (skips.length > 0) {
    console.log(
      '跳过原因：' +
        skips.map(([k, v]) => `${k}=${v}`).join('  '),
    );
  }
  if (written.length > 0) {
    console.log(`样例：${written.slice(0, 8).join(', ')}${written.length > 8 ? ' …' : ''}`);
  }
}

// 仅在直接运行时执行（被 import 时不跑）
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export type {Json, RawTrace, TraceEvent};
export {num};
