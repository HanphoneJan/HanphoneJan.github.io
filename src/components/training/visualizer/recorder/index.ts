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
  crossCheckEntryName,
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
} from '../../../../../plugins/py-samples';
import {
  toPythonLiteral,
  usableSamples,
} from '../../pyrunner/runner';
import {buildRecordDriver, TRACER_PY} from './recorder';
import type {Json, RawTrace, RecordSkipReason, TraceEvent} from './types';

export interface RecordStats {
  ok: number;
  skipped: Record<string, number>;
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
 * 期望值与录制结果是否一致。
 *
 * 刻意宽松：只比**归一化后的 JSON 文本**。样例期望值是力扣题面抄来的
 * 散文（「`[0,1]`」「返回空列表」），窄了会把大量本来能录的题筛掉。
 * 这一层只是防「代码根本跑不对」，不负责判题 —— 判题是 Pyodide 运行条的事。
 */
function resultMatches(expected: string, result: Json): boolean {
  const want = expected.trim();
  if (!want) {
    return true;
  }
  // 期望值里带省略号/说明文字，判不了，当作通过
  if (/…|\.\.\.|。|，|, [a-z]/.test(want)) {
    return true;
  }
  if (result === null || result === undefined) {
    // 原地修改类题目（返回 None）无法从返回值判断，放行
    return /^\[\s*\]$|^无$|^\{\s*\}$|^null$/i.test(want);
  }
  try {
    return JSON.stringify(result) === JSON.stringify(JSON.parse(want));
  } catch {
    return true;
  }
}

/**
 * 从样例实参里挑一组「录制友好」的输入。
 *
 * 要点：**只取数字、长度不夸张**的实参。录制是把每个中间状态都存下来，
 * 输入 200 个元素会产生几百 KB 的 JSON，而且画面也画不下。
 * 所以优先挑最接近 MAX_INPUT_SIZE(60) 且元素都是数字的那组。
 */
function pickArgs(
  samples: ReturnType<typeof extractDocSamples>,
  paramNames: string[],
): string[] | null {
  const usable = usableSamples(samples);
  if (usable.length === 0) {
    return null;
  }

  /**
   * 样例里第一个「可画出来」的序列参数。
   *
   * 数字数组是双指针/二分的主力输入；**单个字符串**同样重要 ——
   * 0003 无重复子串、0011 盛水容器这类题吃的就是一个 str，
   * 它在画面上就是一个字符数组。所以字符串也收，但只收长度 3~24 的
   * （太短的看不出滑动窗口，太长的画面挤不下）。
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
      const penalty = typeof seq === 'string' ? (wantsString ? 0 : 15) : wantsString ? 15 : 0;
      return {args: s.args, expected: s.expected, score: distinct * 10 - seq.length - penalty};
    })
    .filter((x): x is {args: string[]; expected: string; score: number} => x !== null);
  if (scored.length === 0) {
    return null;
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0].args;
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

export async function recordTraces(
  only: string[] = [],
): Promise<{stats: RecordStats; written: string[]}> {
  const stats: RecordStats = {ok: 0, skipped: {}};
  const written: string[] = [];
  const skip = (r: RecordSkipReason): void => {
    stats.skipped[r] = (stats.skipped[r] ?? 0) + 1;
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

  const docsRoot = path.join(process.cwd(), 'code-training/docs');
  const problemsDir = path.join(docsRoot, 'problems');
  const docs = collectDocs(problemsDir).filter(
    (f) => only.length === 0 || only.some((o) => f.includes(o)),
  );

  const outDir = path.join(process.cwd(), TRACES_DIR);
  fs.mkdirSync(outDir, {recursive: true});

  for (const file of docs) {
    const md = fs.readFileSync(file, 'utf8');
    const code = canonCode(md);
    if (!code) {
      skip('no-code');
      continue;
    }
    const sig = extractSignature(code);
    const method =
      crossCheckEntryName(md, code, sig.method) ??
      (sig.method ? findTopLevelEntry(md, code, sig.method) : null);
    if (!method) {
      skip('no-entry');
      continue;
    }

    const samples = extractDocSamples(md, sig.paramNames, sig.requiredCount);
    const stdinSamples = extractDocStdinSamples(md);
    const args =
      pickArgs(samples, sig.paramNames) ??
      stdinArgs(sig.paramNames, stdinSamples);
    if (!args) {
      skip('no-sample');
      continue;
    }

    const expected =
      usableSamples(samples)[0]?.expected ?? stdinSamples[0]?.expected ?? '';
    const pyArgs = args.map(toPythonLiteral);
    const lineCount = code.split('\n').length;

    let payload: {
      events: TraceEvent[];
      result: Json;
      error: string | null;
    };
    try {
      py.runPython(
        buildRecordDriver({
          code,
          method,
          args: pyArgs,
          eventLimit: EVENT_LIMIT,
          lineCount,
        }),
      );
      const raw = py.globals.get('__TRACE_OUT__') as string;
      payload = JSON.parse(raw);
    } catch (e) {
      skip('exec-error');
      console.error(`  ${path.basename(file)}: 驱动异常 ${String(e).slice(0, 160)}`);
      continue;
    }

    if (payload.error) {
      skip('exec-error');
      continue;
    }
    if (!resultMatches(expected, payload.result)) {
      skip('result-mismatch');
      console.log(
        `  ${path.basename(file)}: 结果与样例不符（期望 ${expected.slice(0, 40)}，` +
          `实录 ${JSON.stringify(payload.result).slice(0, 40)}）—— 丢弃`,
      );
      continue;
    }
    if (payload.events.length < 3) {
      // 少于 3 帧说明基本没有循环，画不出过程
      skip('no-sample');
      continue;
    }

    const trace: RawTrace = {
      docKey: traceName(file),
      code,
      method,
      paramNames: sig.paramNames,
      args: pyArgs,
      expected,
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
  samples: Array<{stdin: string}>,
): string[] | null {
  if (samples.length === 0 || paramNames.length === 0) {
    return null;
  }
  const nums = samples[0].stdin.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 3) {
    return null;
  }
  return [`[${nums.join(', ')}]`];
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
