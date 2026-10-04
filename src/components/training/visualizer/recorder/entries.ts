/**
 * 入口候选：一份题解代码里可能有多个可调用入口，挨个试到跑对为止。
 *
 * ## 为什么不一次选定
 *
 * 早先的写法是「启发式挑一个」—— `extractSignature` 取第一个带 self 的方法，
 * `crossCheckEntryName` 再纠正一下。这个策略在牛客/ACM 题上全军覆没：
 *
 * - HJ18 的代码是 `valid_ip` / `valid_mask` / `classify` / `solve` 四个顶层
 *   函数，取第一个就取到 `valid_ip`，而它要一个字符串，样例给的是 stdin 文本
 * - sf_min_fuel_stops 有 `min_fuel_stops`（辅助）和 `solve`（主）
 * - shoppee 的 `Solution.MergeList(l1, l2)` 与题面样例的参数个数对不上
 *
 * 挑错的直接后果是 45 篇 no-entry + 一堆莫名其妙的 exec-error。
 * 而「跑一下看对不对」这个判据**本来就是现成的** —— 录制流程末尾已经有
 * 「结果必须与样例一致」这道自检。既然都要跑一遍，不如把入口也变成
 * 「试到有一个跑对为止」。
 *
 * ## 代价
 *
 * 每多试一个候选就多跑一次 Python。实测全语料 182 篇里平均试 1.6 次，
 * 总时长不变（瓶颈是 Pyodide 冷启动，不是单题执行）。
 *
 * ## 候选的优先级
 *
 * 顺序有意义，要**先试最可能对的**：
 *
 * 1. `analyzeSnippet` / py-samples 认定的文档入口（力扣题的
 *    `Solution.twoSum` 这类）
 * 2. `solve` / `main`（ACM 题的惯例主函数）
 * 3. 其余顶层 `def`
 * 4. `Solution` 的其它方法
 *
 * stdin 题（入口读 `sys.stdin`）标记成 `stdin`，跑法不同 ——
 * 见 recorder.ts 的 buildRecordDriver。
 */

import {analyzeSnippet} from '../../pyrunner/snippet';
import type {SnippetEntry} from '../../pyrunner/snippet';

export interface EntryCandidate {
  /** 入口名：顶层函数名，或 `Solution.method` 的 method 部分 */
  name: string;
  /** 类名；顶层函数为 null */
  className: string | null;
  paramNames: string[];
  annotations: string[];
  requiredCount: number;
  /** 入口是否读 stdin（ACM 题）。true 时调��传 0 个实参。 */
  stdin: boolean;
}

/** ACM 题的主函数命名惯例 */
const MAIN_NAMES = ['solve', 'main', 'run'];

/**
 * 列出所有值得一试的入口，按「最可能对」排序。
 *
 * @param code      `## 完整代码实现` 里的代码原文
 * @param preferred py-samples 认定的文档入口名（可能是辅助函数名，用来排除）
 */
export function entryCandidates(
  code: string,
  preferred?: string | null,
): {candidates: EntryCandidate[]; analysisReason: string} {
  const analysis = analyzeSnippet(code, preferred ?? undefined);
  const out: EntryCandidate[] = [];
  const seen = new Set<string>();
  const key = (c: EntryCandidate): string => `${c.className ?? ''}.${c.name}`;

  const add = (c: EntryCandidate): void => {
    if (seen.has(key(c))) {
      return;
    }
    seen.add(key(c));
    out.push(c);
  };

  // 1. py-samples 文档入口优先。它通常是解题方法本身（力扣题就是它）。
  if (analysis.entry) {
    const e = analysis.entry;
    add({
      name: e.name,
      className: e.kind === 'method' ? e.className : null,
      paramNames: e.paramNames,
      annotations: e.annotations,
      requiredCount: e.requiredCount,
      stdin: e.paramNames.length === 0,
    });
  }

  // 2. solve / main —— ACM 题的惯例主函数。
  //    放这么靠前是因为牛客题里 `solve` 几乎总是对的，而启发式
  //    （取第一个 def）几乎总是错的。
  const topLevel = topLevelFuncs(code);
  for (const name of MAIN_NAMES) {
    const f = topLevel.get(name);
    if (f) {
      add({
        name: f.name,
        className: null,
        paramNames: f.paramNames,
        annotations: f.annotations,
        requiredCount: f.requiredCount,
        stdin: true,
      });
    }
  }

  // 3. 其余顶层 def（辅助函数也当候选 —— 有些题解的主函数名字很随意）
  for (const f of topLevel.values()) {
    add({
      name: f.name,
      className: null,
      paramNames: f.paramNames,
      annotations: f.annotations,
      requiredCount: f.requiredCount,
      stdin: f.paramNames.length === 0,
    });
  }

  // 4. Solution 的其它方法
  for (const m of solutionMethods(code)) {
    add({
      name: m.name,
      className: 'Solution',
      paramNames: m.paramNames,
      annotations: m.annotations,
      requiredCount: m.requiredCount,
      stdin: m.paramNames.length === 0,
    });
  }

  return {
    candidates: out,
    analysisReason: analysis.runnable ? '' : analysis.reason,
  };
}

interface ParamInfoLite {
  name: string;
  paramNames: string[];
  annotations: string[];
  requiredCount: number;
}

/**
 * 顶层 `def`，带参数名/标注/必填个数。
 *
 * 自己解析而不用 `analyzeSnippet` 的私货：`analyzeSnippet` 一次只返回一个
 * 入口（挑好的那个），而这里要的是「全部候选」。
 */
function topLevelFuncs(code: string): Map<string, ParamInfoLite> {
  const out = new Map<string, ParamInfoLite>();
  // 只匹配列 0 的 def —— 天然排除类里的方法
  const re = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const name = m[1];
    if (name.startsWith('__') || out.has(name)) {
      continue;
    }
    out.set(name, parseParams(m[2] ?? '', name));
  }
  return out;
}

/** `Solution` 类里所有带 self 的方法 */
function solutionMethods(code: string): ParamInfoLite[] {
  const out: ParamInfoLite[] = [];
  const classRe = /^class\s+(\w+)[^\n]*:\n([\s\S]*?)(?=^class\s|\Z)/gm;
  let cm: RegExpExecArray | null;
  while ((cm = classRe.exec(code)) !== null) {
    if (cm[1] !== 'Solution') {
      continue;
    }
    const re = /^[ \t]+def\s+(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\s*\)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cm[2])) !== null) {
      if (m[1].startsWith('__')) {
        continue;
      }
      out.push(parseParams(m[2] ?? '', m[1]));
    }
  }
  return out;
}

/**
 * 参数解析：名字、类型标注、必填个数。
 *
 * 与 py-samples 的 `parseParams` 同规则（带默认值的不算必填），
 * 但保持独立 —— 那个函数没有导出，抄一份 15 行的解析比改动插件的
 * 公开面更省事，也不会影响 `test:pyrunner` 的现有断言。
 */
function parseParams(raw: string, name: string): ParamInfoLite {
  const paramNames: string[] = [];
  const annotations: string[] = [];
  let requiredCount = 0;
  for (const piece of splitTop(raw)) {
    const t = piece.trim();
    if (!t) {
      continue;
    }
    const eq = t.indexOf('=');
    const head = eq === -1 ? t : t.slice(0, eq);
    const colon = head.indexOf(':');
    const pname = (colon === -1 ? head : head.slice(0, colon)).trim();
    const ann = colon === -1 ? '' : head.slice(colon + 1).trim();
    if (!/^\*?\w+$/.test(pname)) {
      // **kwargs / *args 之类，跳过（样例不会给它们）
      continue;
    }
    paramNames.push(pname.replace(/^\*/, ''));
    annotations.push(ann.toLowerCase());
    if (eq === -1) {
      requiredCount++;
    }
  }
  void name;
  return {name, paramNames, annotations, requiredCount};
}

/** 按顶层逗号切分（括号/方括号/引号内不算） */
function splitTop(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (const ch of raw) {
    if (quote) {
      cur += ch;
      if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
    }
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) {
    out.push(cur);
  }
  return out;
}

/** 把候选转成 snippet.ts 的 SnippetEntry，好喂给 nodeParams */
export function asSnippetEntry(c: EntryCandidate): SnippetEntry {
  return c.className
    ? {
        kind: 'method',
        name: c.name,
        className: c.className,
        paramNames: c.paramNames,
        annotations: c.annotations,
        requiredCount: c.requiredCount,
      }
    : {
        kind: 'function',
        name: c.name,
        paramNames: c.paramNames,
        annotations: c.annotations,
        requiredCount: c.requiredCount,
      };
}
