/**
 * 从题解正文自动生成「复杂度」单选题，产出候选题供审阅。
 *
 * ## 为什么要自动生成
 *
 * 126 篇题解的「## 复杂度分析」小节里全是结构一致的表格，
 * 且**每张表的最后一行就是最优解**（说明列里通常带「最优解」字样）。
 * 「本题最优解的时间/空间复杂度是？」这类题可以纯机械提取，
 * 不需要 AI 参与，也不会编造答案 —— 答案直接从表格单元格抄。
 *
 * 干扰项也有讲究：用**同一张表里其他解法的复杂度**当干扰项，
 * 比编造 O(n log n) 之类更有意义 —— 答错正好说明
 * 「还没分清各个解法各自为什么慢」。
 *
 * ## 只产出候选题，不直接写进题库
 *
 * 输出到 static/quiz/bank.generated.json，需人工 review 后
 * 用 `pnpm quiz:merge` 合并进 bank.json。理由：自动提取虽然机械可靠，
 * 但题干措辞、干扰项是否真的有区分度，仍需要人看一眼。
 *
 * 用法：
 *   pnpm quiz:gen              # 生成全部
 *   pnpm quiz:gen 1 3 15       # 只生成这几篇
 */

import fs from 'fs';
import path from 'path';

const DOCS_ROOT = path.join(process.cwd(), 'code-training/docs');
const OUT_PATH = path.join(process.cwd(), 'static/quiz/bank.generated.json');

/** 题解文件名 -> 题号，用于生成稳定的题目 id */
function slugOf(relPath: string): string {
  const base = relPath.split('/').pop() ?? '';
  const m = base.match(/^(\d+)_/);
  const platform = relPath.includes('/leetcode/') ? 'leetcode' : 'other';
  return m ? `${platform}-${m[1]}` : platform + '-' + base.replace(/\.md$/, '');
}

/** 取出 `## 复杂度分析` 小节 */
function extractSection(md: string, heading: string): string | undefined {
  const lines = md.split('\n');
  const startRe = new RegExp(`^##\\s+${heading}\\s*$`);
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

/**
 * 去掉 markdown 强调符号，并剥掉 LaTeX 行内公式的定界符。
 *
 * 少数表格单元写成 `$O(n)$`，若不剥掉，填空答案就变成字面量 `$O(n)$`，
 * 而用户输入的是 `O(n)` —— 归一化只去空白，不会去掉 `$`，永远判错。
 */
function clean(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\$([^$]+)\$/g, '$1')
    .trim();
}

interface ComplexityRow {
  name: string;
  time: string;
  space: string;
}

/** 解析复杂度表格；解析不出来返回 null */
function parseTable(section: string): ComplexityRow[] | null {
  const rows: ComplexityRow[] = [];
  for (const line of section.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) {
      continue;
    }
    const cells = t
      .slice(1, -1)
      .split('|')
      .map((c) => clean(c));
    if (cells.length < 3) {
      continue;
    }
    const [name, time, space] = cells;
    // 跳过表头与分隔行
    if (name === '解法' || /^-+$/.test(name)) {
      continue;
    }
    if (!time || !space) {
      continue;
    }
    rows.push({name, time, space});
  }
  // 允许只有一行的表：出题时会退化成填空题（唯一答案不需要干扰项）
  return rows.length >= 1 ? rows : null;
}

/** 解法名里的噪声词，出题时剥掉，避免题干变成「最优解（哈希表（最优））」 */
// 注意分成两个：test 用的不能带 /g，否则 lastIndex 会让结果不可预测
const NAME_HAS_NOISE = /（最优解?）|\(最优解?\)|最优/;
const NAME_STRIP_NOISE = /（最优解?）|\(最优解?\)|最优解|最优/g;

/**
 * 最优解 = 解法名或说明里带「最优」的行，否则取最后一行
 * （题解的惯例是按 暴力 → 优化 → 最优 排列）。
 */
function pickOptimal(rows: ComplexityRow[]): ComplexityRow {
  return (
    rows.find(
      (r) =>
        NAME_HAS_NOISE.test(r.name) ||
        r.space.includes('最优') ||
        r.time.includes('最优'),
    ) ?? rows[rows.length - 1]
  );
}

/**
 * 剥掉解法名里的「（最优）」噪声词，并去掉残留标点。
 * 少数表格的解法名整体带一层括号（如 `（单次遍历）`），
 * 直接拼进题干会变成「最优解（（单次遍历））」，所以一并剥掉。
 */
function tidyName(name: string): string {
  let t = name.replace(NAME_STRIP_NOISE, '').trim();
  // 剥掉整体包裹的括号：先去掉首尾各一个成对的圆括号（可能有多层）
  for (;;) {
    const m = t.match(/^[(（]\s*(.+?)\s*[)）]$/);
    if (!m) {
      break;
    }
    t = m[1].trim();
  }
  return t.replace(/[，,、。\s]+$/, '') || name;
}

/**
 * 出题策略：
 * - 表格里有 ≥2 个不同的时间复杂度 → 出单选，干扰项就用**同表其他解法**的复杂度。
 *   这比编造 O(n log n) 之类更有意义：答错正好说明「还没分清各解法为何慢」。
 * - 只有一个（或全都一样）→ 出填空题。唯一答案不需要干扰项，
 *   填空还能顺带练一下「能不能默写出复杂度表达式」。
 */
function buildTimeQuestion(relPath: string, rows: ComplexityRow[]) {
  const optimalRow = pickOptimal(rows);
  const optimal = {...optimalRow, name: tidyName(optimalRow.name)};
  const others = rows
    .filter((r) => r.time !== optimalRow.time)
    .map((r) => ({...r, name: tidyName(r.name)}));
  const uniqueOthers = [...new Set(others.map((r) => r.time))];
  const common = {docId: relPath, source: '复杂度分析'};

  if (uniqueOthers.length === 0) {
    return {
      ...common,
      id: `${slugOf(relPath)}-complexity`,
      type: 'blank' as const,
      stem: `本题最优解「${optimal.name}」的时间复杂度是？（直接写复杂度表达式）`,
      answer: optimal.time,
      explain: `${optimal.name}的时间复杂度是 ${optimal.time}。${
        rows.length > 1
          ? `同一张表里其他解法也是 ${optimal.time}，这题的区分点不在时间。`
          : ''
      }`,
    };
  }

  return {
    ...common,
    id: `${slugOf(relPath)}-complexity`,
    type: 'single' as const,
    stem: `本题最优解「${optimal.name}」的时间复杂度是？`,
    options: [optimal.time, ...uniqueOthers],
    answer: 0,
    explain: `${optimal.name}的时间复杂度是 ${optimal.time}。表里的其他解法分别是${others
      .map((r) => `${r.name} ${r.time}`)
      .join('、')} —— 答错说明还没分清它们各自慢在哪里。`,
  };
}

function buildSpaceQuestion(relPath: string, rows: ComplexityRow[]) {
  const optimalRow = pickOptimal(rows);
  const optimal = {...optimalRow, name: tidyName(optimalRow.name)};
  const others = rows
    .filter((r) => r.space !== optimalRow.space)
    .map((r) => ({...r, name: tidyName(r.name)}));
  const uniqueOthers = [...new Set(others.map((r) => r.space))];

  // 空间题只在有区分度时生成：所有解法空间都一样就没意义
  if (uniqueOthers.length === 0) {
    return null;
  }

  return {
    id: `${slugOf(relPath)}-space`,
    docId: relPath,
    type: 'single' as const,
    stem: `本题最优解「${optimal.name}」的空间复杂度是？`,
    options: [optimal.space, ...uniqueOthers],
    answer: 0,
    explain: `${optimal.name}的空间复杂度是 ${optimal.space}。${others
      .map((r) => `${r.name} ${r.space}`)
      .join('、')} —— 空间优化往往才是这题的区分点。`,
    source: '复杂度分析',
  };
}

function collectProblemDocs(): string[] {
  const problemsDir = path.join(DOCS_ROOT, 'problems');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        out.push(
          path.relative(DOCS_ROOT, full).split(path.sep).join('/'),
        );
      }
    }
  };
  walk(problemsDir);
  return out.sort();
}

function main(): void {
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
  let docs = collectProblemDocs();
  if (only.length) {
    const want = new Set(only);
    docs = docs.filter((d) => {
      const m = (d.split('/').pop() ?? '').match(/^(\d+)_/);
      return m ? want.has(m[1]) : false;
    });
  }

  const items: unknown[] = [];
  const skipped: string[] = [];

  for (const rel of docs) {
    const md = fs.readFileSync(path.join(DOCS_ROOT, rel), 'utf8');
    const section = extractSection(md, '复杂度分析');
    if (!section) {
      skipped.push(`${rel}（没有 ## 复杂度分析 小节）`);
      continue;
    }
    const rows = parseTable(section);
    if (!rows) {
      skipped.push(`${rel}（复杂度表格无法解析）`);
      continue;
    }
    const timeQ = buildTimeQuestion(rel, rows);
    const spaceQ = buildSpaceQuestion(rel, rows);
    if (timeQ) {
      items.push(timeQ);
    }
    if (spaceQ) {
      items.push(spaceQ);
    }
  }

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({version: 1, items}, null, 2) + '\n',
    'utf8',
  );

  console.log(`扫描 ${docs.length} 篇题解`);
  console.log(`生成候选题 ${items.length} 道 -> static/quiz/bank.generated.json`);
  if (skipped.length) {
    console.log(`\n跳过 ${skipped.length} 篇：`);
    for (const s of skipped.slice(0, 20)) {
      console.log(`  - ${s}`);
    }
    if (skipped.length > 20) {
      console.log(`  … 另有 ${skipped.length - 20} 篇`);
    }
  }
}

main();