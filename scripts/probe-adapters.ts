/**
 * 诊断：逐份轨迹报告「哪个 adapter 认出来了」。
 *
 * 补覆盖率时用得上 —— `test:adapters` 只说「没认出来」，
 * 而这里给出「每个 adapter 各自试出了几帧」，一眼能看出是判据太严
 * 还是那个 adapter 压根没实现。
 *
 * 跑法：TS_NODE_COMPILER_OPTIONS='...' npx ts-node scripts/probe-adapters.ts [过滤器]
 */

import fs from 'fs';
import path from 'path';
import {probeAll} from '../src/components/training/visualizer/adapters';
import type {RawTrace} from '../src/components/training/visualizer/recorder/types';

const dir = path.join(__dirname, '../static/traces');
if (!fs.existsSync(dir)) {
  console.log('没有 static/traces/，先跑 `pnpm trace:record`');
  process.exit(1);
}

const filter = process.argv[2];
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !filter || f.includes(filter))
  .sort();

const tally: Record<string, number> = {};
const orphans: string[] = [];
const rows: string[] = [];

for (const f of files) {
  const t = JSON.parse(
    fs.readFileSync(path.join(dir, f), 'utf8'),
  ) as RawTrace;
  const results = probeAll(t);
  const hits = results.filter((r) => r.frames > 0);
  const crashed = results.filter((r) => r.frames < 0);
  const first = hits[0]?.id ?? 'NONE';
  tally[first] = (tally[first] ?? 0) + 1;
  if (!hits.length) {
    orphans.push(f.replace('.json', ''));
  }
  rows.push(
    [
      f.replace('.json', '').padEnd(50),
      first.padEnd(12),
      results.map((r) => `${r.id}=${r.frames}`).join(' '),
      crashed.length ? `崩溃 ${crashed.map((c) => c.id).join(',')}` : '',
    ].join(' '),
  );
}

console.log('--- 首次命中的 adapter ---');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`${String(v).padStart(4)}  ${k}`);
}
console.log('\n--- 逐题 ---');
for (const r of rows) {
  console.log(r);
}
console.log(`\n没有 adapter 认领：${orphans.length} 篇`);
if (orphans.length > 0) {
  console.log(orphans.join('\n'));
}
