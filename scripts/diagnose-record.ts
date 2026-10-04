/**
 * 诊断：逐题报告录制的真实失败原因与样例形态。
 *
 * 不是正式测试，是开发期的探针。目的是把「99 篇没画」拆成可行动的清单，
 * 而不是笼统的四个计数。
 *
 * 跑法：node --import ... 或 ts-node scripts/diagnose-record.ts [过滤器]
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  crossCheckEntryName,
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
  type PyEntry,
} from '../plugins/py-samples';

const docsRoot = path.join(__dirname, '../code-training/docs/problems');

interface Row {
  doc: string;
  reason: string;
  detail: string;
  params: string;
  firstSample: string;
}

const rows: Row[] = [];

function section(md: string, heading: string): string | undefined {
  const lines = md.split('\n');
  const start = lines.findIndex((l) =>
    new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).test(
      l.trim(),
    ),
  );
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

function canonCode(md: string): string {
  const s = section(md, '完整代码实现');
  const m = s?.match(/```python\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...collect(full));
    } else if (e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

for (const file of collect(docsRoot)) {
  const md = fs.readFileSync(file, 'utf8');
  const name = path.basename(file, '.md');
  const tracePath = path.join(__dirname, '../static/traces', `${name}.json`);
  if (fs.existsSync(tracePath)) {
    continue;
  }
  const code = canonCode(md);
  if (!code) {
    rows.push({
      doc: name,
      reason: 'no-code',
      detail: '没有 ## 完整代码实现 小节或其中无 python 块',
      params: '',
      firstSample: '',
    });
    continue;
  }
  const sig = extractSignature(code);
  const entry = crossCheckEntryName(md, code, sig.method) ?? sig.method;
  if (!entry) {
    // 看看代码块里到底有哪些 def
    const defs = [...code.matchAll(/^\s*def\s+(\w+)\s*\(([^)]*)\)/gm)].map(
      (m) => `${m[1]}(${m[2].replace(/\s+/g, ' ').trim()})`,
    );
    rows.push({
      doc: name,
      reason: 'no-entry',
      detail: `代码里 def: ${defs.join(' | ') || '(无)'}`,
      params: '',
      firstSample: '',
    });
    continue;
  }
  const samples = extractDocSamples(md, sig.paramNames, sig.requiredCount);
  const stdin = extractDocStdinSamples(md);
  const params = `(${sig.paramNames.join(', ')})`;
  if (samples.length === 0 && stdin.length === 0) {
    rows.push({
      doc: name,
      reason: 'no-sample',
      detail: '抽不到任何样例',
      params,
      firstSample: `示例小节前 200 字: ${(section(md, '示例') ?? '（无示例小节）').slice(0, 200).replace(/\n/g, '⏎')}`,
    });
    continue;
  }
  rows.push({
    doc: name,
    reason: 'has-sample',
    detail: `entry=${entry}`,
    params,
    firstSample: `调用样例=${samples.length} stdin样例=${stdin.length} 首个调用=${samples[0]?.args.join(' , ') ?? '—'}`,
  });
}

const byReason = new Map<string, Row[]>();
for (const r of rows) {
  const list = byReason.get(r.reason) ?? [];
  list.push(r);
  byReason.set(r.reason, list);
}

/**
 * 把「有样例但 pickArgs 拒了」再细分一层 —— 这是最大的一块，
 * 必须知道具体是哪种形态才好决定写哪个 adapter。
 */
function classify(sampleArgs: string[]): string {
  const shapes = sampleArgs.map((a) => {
    const t = a.trim();
    if (/^\[\[/.test(t)) return 'grid';
    if (/^\[null|\[.*null/.test(t)) return 'tree-layer';
    if (/^\[/.test(t)) {
      try {
        const v = JSON.parse(t.replace(/\bnull\b/g, 'null'));
        if (Array.isArray(v)) {
          if (v.every((x) => typeof x === 'number')) return 'num-array';
          if (v.every((x) => typeof x === 'string')) return 'str-array';
          if (v.some((x) => Array.isArray(x))) return 'nested';
          return 'mixed-array';
        }
      } catch {
        return 'broken';
      }
    }
    if (/^"/.test(t) || /^'/.test(t)) return 'string';
    if (/^-?\d+$/.test(t)) return 'int';
    if (/^True|^False/.test(t)) return 'bool';
    return 'other';
  });
  return shapes.join('+');
}

for (const r of rows) {
  if (r.reason !== 'has-sample') {
    continue;
  }
  const file = findFile(r.doc);
  if (!file) {
    continue;
  }
  const md = fs.readFileSync(file, 'utf8');
  const code = canonCode(md);
  const sig = extractSignature(code);
  const samples = extractDocSamples(md, sig.paramNames, sig.requiredCount);
  const stdin = extractDocStdinSamples(md);
  const shapes = samples.length
    ? classify(samples[0].args)
    : stdin.length
      ? 'stdin-only'
      : 'none';
  r.detail += ` | 样例形态=${shapes}`;
}

function findFile(name: string): string | null {
  const stack = [docsRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name === `${name}.md`) {
        return full;
      }
    }
  }
  return null;
}

const filter = process.argv[2];
for (const [reason, list] of byReason) {
  if (filter && reason !== filter) {
    continue;
  }
  console.log(`\n===== ${reason} (${list.length}) =====`);
  for (const r of list) {
    console.log(`${r.doc.padEnd(50)} ${r.detail}`);
    if (r.firstSample) {
      console.log(`   ${r.firstSample}`);
    }
  }
}
console.log(`\n合计待处理 ${rows.length} 篇`);

const shapeCount = new Map<string, number>();
for (const r of rows) {
  const m = /样例形态=([^|]+)/.exec(r.detail);
  const key = m ? m[1].trim() : r.reason;
  shapeCount.set(key, (shapeCount.get(key) ?? 0) + 1);
}
console.log('\n--- 形态分布 ---');
for (const [k, v] of [...shapeCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(v).padStart(4)}  ${k}`);
}
