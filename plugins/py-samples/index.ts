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
 * ## 抽取了什么
 *
 * 1. `## 完整代码实现` 小节里的 ```python 代码块（126/126 篇都是 python）
 * 2. `Solution` 类里第一个 `def xxx(self, ...)` 作为入口方法名
 * 3. `## 示例` 小节里的「输入：a = ..., b = ...」/「输出：...」
 *
 * ## 样例抽取不完整是预期内的
 *
 * 126 篇里约 60 篇的示例是散文或表格（例如「以 x = 12321 为例，使用…」），
 * 机械解析不出来。这些篇目 `samples` 为空数组，UI 会退化成
 * 「手动输入」模式 —— 不硬猜，避免抽错参数顺序导致误判。
 */

export interface PySample {
  /** 位置参数，按函数签名顺序 */
  args: string[];
  /** 期望输出（原始文本，可能含省略号等） */
  expected: string;
}

export interface PyEntry {
  /** ```python 代码块全文 */
  code: string;
  /** Solution 类里第一个方法名，如 twoSum */
  method: string | null;
  /** 方法签名里的参数名（不含 self） */
  paramNames: string[];
  /** 抽到的样例；空数组表示这篇没解析出来 */
  samples: PySample[];
}

export interface PySamplesData {
  /** md 相对 code-training/docs 的路径 -> 抽取结果 */
  entries: Record<string, PyEntry>;
}

type DocsContent = {
  loadedVersions?: Array<{
    docs?: Array<{source?: string}>;
  }>;
};

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

/** 抽 Solution 类里第一个方法名与参数名 */
function extractSignature(
  code: string,
): {method: string | null; paramNames: string[]} {
  // 只找 `def xxx(self, ...)` —— 不带 self 的是辅助函数（build_tree 等）
  const m = code.match(/^\s*def\s+(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\)/m);
  if (!m) {
    return {method: null, paramNames: []};
  }
  const params = (m[2] ?? '')
    .split(',')
    .map((s) => s.split(':')[0].split('=')[0].trim())
    .filter(Boolean);
  return {method: m[1], paramNames: params};
}

/**
 * 解析样例。
 *
 * 支持两种写法（题解里两种都很常见）：
 *   1. 代码块里的 `输入：nums = [2,7], target = 9` + `输出：[0,1]`
 *   2. `**输入**：\`nums = [2,7], target = 9\`` + `**输出**：\`[0,1]\``
 *
 * 解析不出来就返回空数组 —— 不猜。
 */
function extractSamples(
  sampleText: string | undefined,
  paramNames: string[],
): PySample[] {
  if (!sampleText || paramNames.length === 0) {
    return [];
  }
  const out: PySample[] = [];

  // 把形如 `k = v, k2 = v2` 的片段按顶层逗号切开（不能切括号/引号里的逗号）
  const splitTop = (s: string): string[] => {
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
      if (ch === ',' && depth === 0) {
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
  };

  // 找所有「输入：...」，在它后面最近的「输出：...」作为期望值。
  // 星号用 (?:**)? 而不是 **? —— 后者是「至少一个星号」，
  // 写成 **? 会让纯「输入：」的写法一条都匹配不到（踩过：0 篇抽到样例）。
  const inputRe = /输入(?:\*\*)?[：:]\s*`?([^`\n]+?)`?\s*$/gm;
  const outputRe = /输出(?:\*\*)?[：:]\s*`?([^`\n]+?)`?\s*$/gm;

  const inputs: Array<{args: string[]; index: number}> = [];
  let im: RegExpExecArray | null;
  while ((im = inputRe.exec(sampleText)) !== null) {
    const kwargs = splitTop(im[1]);
    const map = new Map<string, string>();
    for (const kw of kwargs) {
      const eq = kw.indexOf('=');
      if (eq === -1) {
        continue;
      }
      const key = kw.slice(0, eq).trim();
      const value = kw.slice(eq + 1).trim();
      if (key) {
        map.set(key, value);
      }
    }
    // 按函数签名顺序取值 —— 位置参数顺序错了结果就没意义
    const args: string[] = [];
    let ok = true;
    for (const p of paramNames) {
      const v = map.get(p);
      if (v === undefined) {
        ok = false;
        break;
      }
      args.push(v);
    }
    if (ok && args.length > 0) {
      inputs.push({args, index: im.index});
    }
  }

  for (const {args, index} of inputs) {
    outputRe.lastIndex = index;
    const om = outputRe.exec(sampleText);
    if (!om) {
      continue;
    }
    // 期望值里的省略号会让相等判断失效，直接丢掉这种样例
    const expected = om[1].trim();
    if (!expected || expected.includes('...') || expected.includes('…')) {
      continue;
    }
    out.push({args, expected});
  }

  // 最多保留 3 个样例，跑太多没意义
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
          const {method, paramNames} = extractSignature(code);
          entries[rel] = {
            code,
            method,
            paramNames,
            samples: extractSamples(section(md, '示例'), paramNames),
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
      console.log(
        `[py-samples] ${all.length} 篇有可运行代码，其中 ${withSamples} 篇抽到样例`,
      );
      actions.setGlobalData(content);
      void context;
    },
  };
}