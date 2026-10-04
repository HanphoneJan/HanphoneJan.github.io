import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

/**
 * 抽取题解里的可运行代码与测试样例，供浏览器内的 Pyodide 使用。
 *
 * ## 为什么必须在构建期抽
 *
 * md 会被编译进 HTML，运行时拿不到原始 markdown 字符串 —— 客户端
 * 无法从 DOM 里可靠地还原代码块和样例。所以这里在构建期把
 * 「代码 + 样例」抽成结构化数据放进 globalData。
 *
 * 注意：**代码本身不在这里抽**。代码块由 `@theme/CodeBlock/Layout`
 * 这个官方接缝直接交给运行条（见 SnippetBar），拿的是 `metadata.code`。
 * 这里只抽「按 md 算出来的东西」：完整代码实现（用来定入口）+ 两类样例。
 *
 * ## 抽了什么
 *
 * 1. `## 完整代码实现` 小节里的 ```python 代码块（用于确定入口签名与
 *    判断这篇值不值得挂运行条）
 * 2. 入口签名：`Solution` 类里第一个 `def xxx(self, ...)`；牛客题没有类，
 *    退化成顶层 `def xxx(...)`
 * 3. `## 示例` 小节里的两种样例写法：
 *    - 「输入：nums = [2,7], target = 9」+「输出：[0,1]」→ `samples`（直接调函数）
 *    - 「**输入：**」+ 围栏块 +「**输出：**」+ 围栏块 → `stdinSamples`
 *      （牛客题的 stdin/stdout 形态）
 *
 * ## 样例抽取不完整是预期内的
 *
 * 126 篇里约 60 篇的示例是散文或表格（例如「以 x = 12321 为例，使用…」），
 * 机械解析不出来。这些篇目 `samples` 为空数组，UI 会退化成
 * 「手动输入参数」模式 —— 不硬猜，避免抽错参数顺序导致误判。
 */

export interface PySample {
  /** 位置参数，按函数签名顺序 */
  args: string[];
  /** 期望输出（原始文本，可能含省略号等） */
  expected: string;
  /**
   * 期望值是不是「程序打印出来的文本」而不是「返回值的 JSON 表示」。
   *
   * 力扣题的 `输出：[0,1]` 是返回值本身，所以用 JSON 序列化后比较。
   * 而从 stdin 样例推出来的调用样例（牛客/ACM 题）期望的是 stdout：
   * 同一个 `0`，函数返回的是字符串 "0"、程序打印出来是 `0`。
   * 按 JSON 比会判成不一致 —— 代码其实是对的。
   * 这种样例改用 str() 序列化，和程序真正会打印的东西对齐。
   */
  textCompare?: boolean;
}

export interface StdinSample {
  /** 原样喂给 sys.stdin 的文本 */
  stdin: string;
  /** 期望打印到 stdout 的文本 */
  expected: string;
}

export interface PyEntry {
  /** `## 完整代码实现` 里的 ```python 代码块全文 */
  code: string;
  /** 入口方法/函数名，如 twoSum；取不到则为 null */
  method: string | null;
  /** 入口签名里的参数名（不含 self） */
  paramNames: string[];
  /** 必填参数个数。`carry=0` 这种带默认值的不算，样例不用给。 */
  requiredCount: number;
  /** 直接调函数的样例 */
  samples: PySample[];
  /** 喂 stdin 的样例（牛客题） */
  stdinSamples: StdinSample[];
}

export interface PySamplesData {
  /** md 相对 code-training/docs 的路径 -> 抽取结果 */
  entries: Record<string, PyEntry>;
}

/** 取 `## <heading>` 小节的正文 */
function section(md: string, heading: string): string | undefined {
  const lines = md.split('\n');
  const startRe = new RegExp(`^##\\s+${escapeRe(heading)}\\s*$`);
  const start = lines.findIndex((l) => startRe.test(l.trim()));
  if (start === -1) {
    return undefined;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 取小节里第一个 ```python 代码块 */
function pythonBlock(sectionText: string | undefined): string {
  if (!sectionText) {
    return '';
  }
  const m = sectionText.match(/```python\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

/**
 * 抽入口签名。
 *
 * 先找 `class Solution` 里第一个带 self 的非魔法方法（跳过 `__init__` ——
 * 它没有参数，当入口会让所有样例都判失败）；找不到再退化成顶层
 * `def xxx(...)` —— 牛客题与华为机试全是这个形态。
 */
/** 抽入口签名。导出是为了让 test-pyrunner 直接跑真实语料。 */
export function extractSignature(
  code: string,
): {method: string | null; paramNames: string[]; requiredCount: number} {
  const methodRe = /^[ \t]+def\s+(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\s*\)/gm;
  const candidates: Array<{method: string; paramNames: string[]; requiredCount: number}> = [];
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(code)) !== null) {
    if (m[1].startsWith('__') && m[1].endsWith('__')) {
      continue;
    }
    candidates.push({method: m[1], ...parseParams(m[2] ?? '')});
  }
  if (candidates.length > 0) {
    const picked = pickPublicEntry(candidates);
    return {
      method: picked.method,
      paramNames: picked.paramNames,
      requiredCount: picked.requiredCount,
    };
  }

  const funcRe = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((m = funcRe.exec(code)) !== null) {
    if (m[1].startsWith('__') && m[1].endsWith('__')) {
      continue;
    }
    return {method: m[1], ...parseParams(m[2])};
  }

  return {method: null, paramNames: [], requiredCount: 0};
}

/**
 * 一对同时出现的下界/上界参数名 —— 类内辅助方法的标志。
 *
 * 0215 的完整代码里 `partition(self, nums, left, right)` 排在第一个，
 * 照「取第一个方法」会让样例去匹配 partition 的三个参数，
 * 结果永远匹配不上（题面只给 nums 和 k）。
 *
 * 只认「成对出现」：0062 的 `uniquePaths(m, n)` 是正常入参，不能误伤。
 * 与 `src/components/training/pyrunner/snippet.ts` 里的同名规则保持一致 ——
 * 两边必须挑同一个方法，否则构建期抽的样例和运行期调用的入口会对不上。
 */
const RANGE_PAIRS: Array<[string, string]> = [
  ['left', 'right'],
  ['lo', 'hi'],
  ['low', 'high'],
  ['l', 'r'],
  ['start', 'end'],
  ['begin', 'end'],
];

function pickPublicEntry<
  T extends {method: string; paramNames: string[]; requiredCount: number},
>(candidates: T[]): T {
  if (candidates.length === 1) {
    return candidates[0];
  }
  const isRange = (p: string[]): boolean =>
    RANGE_PAIRS.some(([a, b]) => p.includes(a) && p.includes(b));
  return candidates.find((c) => !isRange(c.paramNames)) ?? candidates[0];
}

/**
 * `nums: List[int], target: int = 9` -> 参数名 ['nums','target']，必填 1。
 *
 * 必填个数必须单独记：0002 的签名是
 * `addTwoNumbers(self, l1, l2, carry=0)`，而题解样例只给两个链表。
 * 早先按「参数个数相等」去匹配样例，0002 就永远匹配不上，只能退化到手动输参，
 * 而手动模式点一下就是一条 missing argument 的红字。
 */
function parseParams(raw: string): {paramNames: string[]; requiredCount: number} {
  const paramNames: string[] = [];
  let seenDefault = false;
  let requiredCount = 0;
  for (const part of splitTopLevel(raw)) {
    const hasDefault = part.includes('=');
    const name = part
      .split('=')[0]
      .split(':')[0]
      .trim()
      .replace(/^\*+/, '');
    if (!name || name === 'self' || name === '...') {
      continue;
    }
    paramNames.push(name);
    if (!seenDefault) {
      if (hasDefault) {
        seenDefault = true;
      } else {
        requiredCount = paramNames.length;
      }
    }
  }
  return {paramNames, requiredCount};
}

/**
 * 按顶层逗号切开（不能切括号/引号里的逗号）。
 *
 * **全角逗号也算分隔符**：题解里的 `输入：s = "aa"，p = "a"` 用的是全角，
 * 只认半角就整段变成一个键，样例直接丢掉（0010 就是这么没的）。
 * 引号里的全角逗号不受影响 —— 上面有引号状态跟踪，
 * 所以 `s = "你好，世界"` 不会被切开。
 */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if ('([{'.includes(ch)) {
      depth++;
    } else if (')]}'.includes(ch)) {
      depth--;
    }
    if ((ch === ',' || ch === '，') && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) {
    parts.push(cur);
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * 解析「输入：k = v, k2 = v2」形式的样例。
 *
 * 支持两种写法（题解里两种都很常见）：
 *   1. 代码块里的 `输入：nums = [2,7], target = 9` + `输出：[0,1]`
 *   2. `**输入**：nums = [2,7], target = 9` + `**输出**：[0,1]`
 *
 * 解析不出来就返回空数组 —— 不猜。
 */
export function extractSamples(
  sampleText: string | undefined,
  paramNames: string[],
  requiredCount: number,
): PySample[] {
  // 只要必填那几个：带默认值的参数样例里本来就不会出现，
  // 要求它们全都出现就永远匹配不上（0002 就是这么丢的）
  const needed = paramNames.slice(0, Math.max(requiredCount, 0));
  if (!sampleText || needed.length === 0) {
    return [];
  }
  const out: PySample[] = [];

  // 星号用 (?:**)? 而不是 **? —— 后者是「至少一个星号」，
  // 写成 **? 会让纯「输入：」的写法一条都匹配不到（踩过：0 篇抽到样例）。
  const inputRe = /输入(?:\*\*)?[：:]/g;
  const outputRe = /输出(?:\*\*)?[：:]/g;

  const inputs: Array<{args: string[]; index: number}> = [];
  let im: RegExpExecArray | null;
  while ((im = inputRe.exec(sampleText)) !== null) {
    // 「输入：X」与「输出：Y」可能写在同一行（用 → 或全角逗号分隔），
    // 也可能各占一行。所以输入值不能一路吃到行尾 —— 要在下一个「输出」前停。
    const rawInput = readValue(sampleText, im.index + im[0].length, {
      stopAtOutput: true,
    });
    // 纯强调符号说明这里不是「输入：值」这种写法。
    // 牛客题的 `**输入：**` 后面跟的是围栏块（真正的样例由 extractStdinSamples 取），
    // 而正则从「输」字开始匹配，剩下的正好是收尾的 `**` ——
    // 不挡掉就会造出 `{args:['**'], expected:'**'}` 这种垃圾样例，
    // 页面上出现一个必然失败的「跑样例」，比不给还糟。
    if (!rawInput || /^[*\s]+$/.test(rawInput)) {
      continue;
    }
    const kwargs = splitTopLevel(rawInput);
    const map = new Map<string, string>();
    /** 没有 `k =` 形式的部分就是位置参数，如 `输入: [1,2,3,1]` */
    const positional: string[] = [];
    for (const kw of kwargs) {
      const eq = kw.indexOf('=');
      if (eq === -1) {
        positional.push(kw);
        continue;
      }
      const key = kw.slice(0, eq).trim();
      const value = kw.slice(eq + 1).trim();
      if (key) {
        map.set(key, value);
      }
    }
    // 输入里的键比签名参数还多，说明多出来的那些不是实参，
    // 而是「构造输入用的元信息」—— 0141 的 `head = [3,2,0,-4], pos = 1`
    // 就是这样：hasCycle 只收 head，pos 用来把链表尾接到第 pos 个节点。
    // 这种我们搭不出来，硬跑只会得到一个与代码对错无关的失败判定。
    // 不硬猜，直接不抽。
    if (map.size > paramNames.length) {
      continue;
    }
    const args = bindArgs(needed, map, positional);
    if (args) {
      inputs.push({args, index: im.index});
    }
  }

  for (const {args, index} of inputs) {
    outputRe.lastIndex = index;
    const om = outputRe.exec(sampleText);
    if (!om || om.index < index) {
      continue;
    }
    const expected = readValue(sampleText, om.index + om[0].length);
    // 期望值里的省略号会让相等判断失效，直接丢掉这种样例
    if (
      !expected ||
      /^[*\s]+$/.test(expected) ||
      expected.includes('...') ||
      expected.includes('…')
    ) {
      continue;
    }
    out.push({args, expected});
  }

  // 最多保留 3 个样例，跑太多没意义
  return out.slice(0, 3);
}

/**
 * 把一组「键值 + 位置值」对到入口签名的形参上。
 *
 * 两种写法混着出现的场合很常见：
 *
 *     输入: [3,2,1,5,6,4], k = 2      # 数组给位置，k 按名字给
 *
 * 处理顺序：先按名字填（名字对得上最可靠），再把剩下的位置值按签名顺序
 * 填进**还没被占用的**形参。
 *
 * 个数必须正好对上：多一个少一个都判失败。宁可整组丢掉，也不能让参数错位 ——
 * 错位不会报错，只会得到一个看起来很合理的错误结果。
 *
 * 返回 null 表示这组样例搭不出来。
 */
function bindArgs(
  needed: string[],
  byName: Map<string, string>,
  positional: string[],
): string[] | null {
  const args: Array<string | null> = needed.map(() => null);
  for (let i = 0; i < needed.length; i++) {
    const v = byName.get(needed[i]);
    if (v !== undefined) {
      args[i] = v;
    }
  }
  let next = 0;
  for (const p of positional) {
    while (next < args.length && args[next] !== null) {
      next++;
    }
    if (next >= args.length) {
      return null; // 位置值比形参还多
    }
    args[next] = p;
    next++;
  }
  if (args.some((a) => a === null)) {
    return null; // 有形参没值
  }
  return args as string[];
}

/**
 * 从整篇题解里取「直接调函数」的样例。
 *
 * ## 为什么要看多个小节
 *
 * 样例并不总在一个叫「示例」的小节里。实测 126 篇力扣题解：
 *
 * | 样例所在位置 | 篇数 |
 * |---|---|
 * | `## 示例` | 68 |
 * | `## 题目描述`（示例直接跟在描述后面） | 32 |
 * | 两者都没有 | 26 |
 *
 * 只认 `## 示例` 的话，那 32 篇就只能手动输参。
 *
 * 顺序有讲究：`## 示例` 优先，因为它最可能是「结构化」的样例；
 * 两边都抽，取**结果更多**的那份，不做拼接（拼接会出现同一组样例重复）。
 */
export function extractDocSamples(
  md: string,
  paramNames: string[],
  requiredCount: number,
): PySample[] {
  const fromExample = extractSamples(
    section(md, '示例'),
    paramNames,
    requiredCount,
  );
  if (fromExample.length > 0) {
    return fromExample;
  }
  return extractSamples(section(md, '题目描述'), paramNames, requiredCount);
}

/** 同上，stdin 形式 */
export function extractDocStdinSamples(md: string): StdinSample[] {
  const fromExample = extractStdinSamples(section(md, '示例'));
  if (fromExample.length > 0) {
    return fromExample;
  }
  return extractStdinSamples(section(md, '题目描述'));
}

/**
 * 从 `输入：`/`输出：` 后面读出值。
 *
 * 题解里这个值有三种写法：
 *   1. 反引号包起来：输入：`nums = [1,2], k = 3`
 *   2. 独占一行后面全是它：输入：nums = [1,2], k = 3
 *   3. 后面还跟着解释：输出：`true`（"a" 无法匹配整个 "aa"）
 *
 * 反引号优先（最明确）；否则一路读到行尾，但：
 * - `stopAtOutput` 时遇到「输出」就停 —— 否则同一行的 `输入：A，输出：B`
 *   会把 `A，输出：B` 整段当成输入
 * - 遇到全角逗号、右括号、→、句号这些「明显不是值」的符号就停
 *
 * 只在全角标点与括号上停，**不碰半角逗号**：期望值 `[[-1,-1,2],[-1,0,1]]`
 * 里全是半角逗号，切一刀就废了。
 */
function readValue(
  text: string,
  from: number,
  opts: {stopAtOutput?: boolean} = {},
): string {
  const rest = text.slice(from);
  let end = rest.length;

  if (opts.stopAtOutput) {
    const m = /输出(?:\*\*)?[：:]/.exec(rest);
    if (m && m.index >= 0) {
      end = m.index;
    }
  }
  const line = rest.slice(0, end);
  const newline = line.indexOf('\n');
  if (newline !== -1) {
    end = newline;
  }
  let value = rest.slice(0, end);

  // 反引号优先
  const tick = value.indexOf('`');
  if (tick !== -1) {
    const close = value.indexOf('`', tick + 1);
    if (close !== -1) {
      return value.slice(tick + 1, close).trim();
    }
  }

  // 截断在明显不是值的地方。
  // **不要把全角逗号 `，` 放进这个字符类** —— 它是顶层分隔符，
  // 放进来会把 `输入：s = "aa"，p = "a"` 砍成只剩 `s = "aa"`（踩过：0010 抽不到）。
  const stop = /[（(→。；;]|\s{2,}/.exec(value);
  if (stop) {
    value = value.slice(0, stop.index);
  }
  // 结尾的分隔符（`→`、全角逗号）
  value = value.replace(/[\s]*[→，,、]+\s*$/, '');
  return value.trim();
}

/**
 * 解析 stdin/stdout 形式的样例（牛客题的主力写法）：
 *
 *     **输入：**
 *     ```
 *     Hello World
 *     ```
 *
 *     **输出：**
 *     ```
 *     5
 *     ```
 *
 * 两个坑：
 *
 * 1. `**输入：**` 的冒号后面还跟着收尾的 `**`。只写 `输入(?:\*\*)?[：:]`
 *    的话，下一句的 `\s*\n+` 会撞在 `**` 上，一条都匹配不到
 *    （踩过：构建日志里 0 篇抽到 stdin 样例）。
 * 2. 围栏可能带语言标注，所以开栏用 `[^\n]*\n` 吃掉。
 *
 * 只认成对的「输入 → 输出」，落单的丢掉。
 */
export function extractStdinSamples(
  sampleText: string | undefined,
): StdinSample[] {
  if (!sampleText) {
    return [];
  }
  const fence = '```';
  // 每处标签都要能吃掉**两头的 **：
  //   - 开头的输入标签：正则是从「输」字开始匹配的，前面的 ** 被跳过了，看起来没事
  //   - 后面的输出标签：位置是上一段空白之后，** 挡在前面，必须显式吃掉，
  //     否则可选组匹配成空，整体只匹配到输入块，输出永远拿不到（踩过：0 篇）
  const re = new RegExp(
    `输入(?:\\*\\*)?[：:](?:\\*\\*)?\\s*\\n+${fence}[^\\n]*\\n([\\s\\S]*?)${fence}` +
      `\\s*\\n+(?:(?:\\*\\*)?输出(?:\\*\\*)?[：:](?:\\*\\*)?\\s*\\n+` +
      `${fence}[^\\n]*\\n([\\s\\S]*?)${fence})?`,
    'g',
  );
  const out: StdinSample[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sampleText)) !== null) {
    const stdin = m[1].replace(/\s+$/, '');
    const expected = (m[2] ?? '').replace(/\s+$/, '');
    if (!stdin || !expected) {
      continue;
    }
    if (
      stdin.includes('...') ||
      expected.includes('...') ||
      expected.includes('…')
    ) {
      continue;
    }
    out.push({stdin, expected});
  }
  return out.slice(0, 3);
}

export default function pySamplesPlugin(
  context: LoadContext,
): Plugin<PySamplesData> {
  const docsRoot = path.join(context.siteDir, 'code-training/docs');
  const problemsDir = path.join(docsRoot, 'problems');

  const entries: Record<string, PyEntry> = {};

  if (fs.existsSync(problemsDir)) {
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.md')) {
          const rel = path
            .relative(docsRoot, full)
            .split(path.sep)
            .join('/');
          const md = fs.readFileSync(full, 'utf8');
          const code = pythonBlock(section(md, '完整代码实现'));
          if (!code) {
            continue;
          }
          const {method, paramNames, requiredCount} = extractSignature(code);
          entries[rel] = {
            code,
            method,
            paramNames,
            requiredCount,
            samples: extractDocSamples(md, paramNames, requiredCount),
            stdinSamples: extractDocStdinSamples(md),
          };
        }
      }
    };
    walk(problemsDir);
  }

  return {
    name: 'py-samples',

    async loadContent(): Promise<PySamplesData> {
      return {entries};
    },

    async contentLoaded({content, actions}): Promise<void> {
      const all = Object.values(content.entries);
      const withSamples = all.filter((e) => e.samples.length > 0).length;
      const withStdin = all.filter((e) => e.stdinSamples.length > 0).length;
      const noEntry = all.filter((e) => e.method === null).length;
      console.log(
        `[py-samples] ${all.length} 篇有可运行代码，` +
          `${withSamples} 篇抽到调用样例，${withStdin} 篇抽到 stdin 样例` +
          (noEntry > 0 ? `，${noEntry} 篇抽不到入口（不挂运行条）` : ''),
      );
      actions.setGlobalData(content);
      void context;
    },
  };
}