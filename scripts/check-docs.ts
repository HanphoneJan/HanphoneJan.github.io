/**
 * 题解体检：把「这篇题解该有的功能」变成一条命令能看懂的报告。
 *
 * ## 为什么需要它
 *
 * 页面上有三个功能是**从题解文档派生**出来的，而且它们**都不报错**：
 *
 * | 功能 | 数据来源 | 缺了会怎样 |
 * |---|---|---|
 * | 「▶ 跑样例」 | `plugins/py-samples` 抽 `## 完整代码实现` + `## 示例` 的 `输入：`/`输出：` | 样例区空着，退化成「手动填参数」——**没有任何提示** |
 * | 逐帧可视化 | `static/traces/<文件名>.json`（`pnpm trace:record` 产出） | 页面上没有那一节——**没有任何提示** |
 * | 自测题 | `static/quiz/bank.json` 的 `docId`（`pnpm quiz:gen` + `merge` 产出） | 页面上没有自测小节——**没有任何提示** |
 *
 * 扫的目录是 `problems/` 下面递归（182 篇题解），不含算法模式 /
 * 数据结构那三页 —— 那三页的功能由 `check:tracers` 管。
 *
 * 新写一篇题解的 agent 很容易以为「写完就好了」，而这三个功能一个都不会自己出现。
 * 这个脚本把「有没有」变成一眼能看的东西。
 *
 * ## 它检查什么
 *
 * 每篇题解（`problems/` 下面递归）报四行：
 *
 * 1. **运行条样例数** —— 与 `check-run-bar` 用**同一个抽取函数**，不是另写一套
 * 2. **有无轨迹** —— 文件名去掉 `.json` 后的 `<id>_<slug>` 要与 md 文件名一致
 * 3. **有无自测题** —— `bank.json` 里有没有这个 `docId`
 * 4. **frontmatter** —— `id/title/platform/difficulty/tags/patterns/date_added`
 *
 * 第 4 条里 `difficulty` 只影响难度归一化、`patterns` 只影响知识图谱，
 * 缺了不会让页面坏掉，但会让复习卡片少信息 —— 所以它们报成 **warn** 而不是 error。
 *
 * ## 退出码
 *
 * - **0** —— 没有任何 error（warn 不影响退出码）
 * - **1** —— 有 error：样例抽不出来，或 frontmatter 缺必填字段
 *
 * 有几类题**天然**缺某些功能，不该被算成 error，所以显式排除：
 *
 * - **SQL 题**（`## 完整代码实现` 里没有 python 块）—— 运行条与录制都不适用
 * - **算法模式 / 数据结构**（不在 `problems/` 下）—— 本脚本只扫题库
 *
 * ## 跑法
 *
 * ```
 * node scripts/check-docs.ts           # 全库报告
 * node scripts/check-docs.ts 0142 0399 # 只看文件名含这些串的
 * node scripts/check-docs.ts --quiet   # 只列有问题的
 * ```
 *
 * 纯 Node、无浏览器、亚秒级 —— 所以值得挂进 CI 当软告警。
 */

import fs from 'fs';
import path from 'path';
import {
  crossCheckEntryName,
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
} from '../plugins/py-samples';
import {analyzeSnippet, nodeParams} from '../src/components/training/pyrunner/snippet';
import {usableSamples} from '../src/components/training/pyrunner/runner';

// ============================================================

const ROOT = process.cwd();
const DOCS_ROOT = path.join(ROOT, 'code-training', 'docs');
const PROBLEMS_ROOT = path.join(DOCS_ROOT, 'problems');
const TRACES_DIR = path.join(ROOT, 'static', 'traces');
const BANK = path.join(ROOT, 'static', 'quiz', 'bank.json');

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const quiet = process.argv.includes('--quiet');

interface Issue {
  level: 'error' | 'warn';
  text: string;
}

interface Row {
  docId: string;
  name: string;
  samples: number;
  hasCode: boolean;
  hasTrace: boolean;
  hasQuiz: boolean;
  fm: Record<string, boolean>;
  issues: Issue[];
}

// ============================================================

function collectProblemDocs(): Array<{docId: string; abs: string}> {
  const out: Array<{docId: string; abs: string}> = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith('.md')) {
        out.push({
          docId: path.relative(DOCS_ROOT, full).split(path.sep).join('/'),
          abs: full,
        });
      }
    }
  };
  if (fs.existsSync(PROBLEMS_ROOT)) {
    walk(PROBLEMS_ROOT);
  }
  return out.sort((a, b) => (a.docId < b.docId ? -1 : 1));
}

/**
 * 极简 frontmatter 解析：顶层标量 + 多行列表。
 *
 * 刻意**不**引 gray-matter —— 这个脚本要能被人直接读懂。
 *
 * **必须处理多行列表**，而这件事踩过：`tags` 与 `patterns` 写成
 *
 * ```yaml
 * tags:
 *   - 数组
 *   - 双指针
 * ```
 *
 * 只认「一行 `key: value`」的话，`tags:` 后面是空的 → 报「frontmatter 缺 tags」，
 * 178 篇**全中**。而 tags 明明在那儿 —— 判据本身没错，是取值的口径错了。
 */
function readFrontMatter(md: string): {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
} {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  const scalars: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  if (!m) {
    return {scalars, lists};
  }
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) {
      continue;
    }
    const [, key, inline] = kv;
    if (inline && inline !== '[]') {
      scalars[key] = inline;
      continue;
    }
    scalars[key] = inline; // `[]` 也记下来 —— 「显式留空」与「没写」要分得清
    // 往后收 `  - item` / `  - "item"`
    const items: string[] = [];
    while (i + 1 < lines.length) {
      const item = /^\s+-\s*(.+?)\s*$/.exec(lines[i + 1]);
      if (!item) {
        break;
      }
      items.push(item[1].replace(/^["']|["']$/g, ''));
      i++;
    }
    lists[key] = items;
  }
  return {scalars, lists};
}

function hasPythonBlock(section: string): boolean {
  return /```python\s*\n[\s\S]*?```/.test(section);
}

function section(md: string, title: string): string {
  const m = new RegExp(`^##\\s+${title}\\s*$`, 'm').exec(md);
  if (!m) {
    return '';
  }
  const rest = md.slice(m.index);
  const next = /^##\s/m.exec(rest.slice(1));
  return next ? rest.slice(0, next.index + 1) : rest;
}

// ============================================================

function inspect(doc: {docId: string; abs: string}, bankDocIds: Set<string>): Row {
  const md = fs.readFileSync(doc.abs, 'utf8');
  const name = path.basename(doc.docId, '.md');
  const codeSection = section(md, '完整代码实现');
  const code = codeSection.match(/```python\s*\n([\s\S]*?)```/)?.[1] ?? '';
  const hasCode = code.trim().length > 0;

  const issues: Issue[] = [];

  // ── 1. 运行条样例数 ──────────────────────────────────────────
  let samples = 0;
  if (hasCode) {
    const sig = extractSignature(code);
    const entryName = crossCheckEntryName(md, code, sig.method) ?? sig.method;
    const raw = extractDocSamples(md, sig.paramNames, sig.requiredCount);
    samples = usableSamples(raw).length;
    if (samples === 0) {
      // ── 为什么这是 warn 而不是 error ──
      //
      // 「抽不出样例」有四种成因，只有一种是**这篇题解写得不对**：
      //
      // 1. 题面根本没写 `输入：`（0031/0543/0761/1480/0160 —— 散文推演）
      // 2. 样例是「构造一次 + 挨个调方法」的**操作脚本**（0146/0155/0208/0295）
      // 3. 样例多一个用来造环的 `pos` 键（0141/0142，力扣环形链表约定）
      // 4. 期望值是散文（0095 的「5 棵不同的 BST」）
      //
      // 第 2、3 种录制器**能**处理（脚本模式 / cyclePos），只有运行条不支持；
      // 第 1、4 种是题面本来就那样。所以这类一律 warn ——
      // 报成 error 的话这个脚本会**永久是红的**，而红着红的脚本等于没有。
      const stdin = extractDocStdinSamples(md).length;
      const exampleSection = section(md, '示例');
      const noInputLabel = !/输入(?:格式|\*\*)?\s*[：:]/.test(exampleSection);
      const isScriptSample =
        /输入[^\n]*\n+\s*\[?\s*"/.test(exampleSection) &&
        /\[\s*\[/.test(exampleSection);
      const hasCyclePos = /(?:^|[,，\s])pos\s*=\s*\d+/.test(exampleSection);
      if (raw.length > 0) {
        issues.push({
          level: 'warn',
          text: `抽到 ${raw.length} 组样例但没有一组「期望值可判定」，运行条会退化`,
        });
      } else if (noInputLabel) {
        issues.push({
          level: 'warn',
          text: '`## 示例` 里没有 `输入：` —— 题面是散文推演，运行条与录制都没有样例可抽',
        });
      } else if (isScriptSample) {
        issues.push({
          level: 'warn',
          text: '样例是「构造 + 挨个调方法」的操作脚本，运行条不支持（录制器走脚本模式，能录）',
        });
      } else if (hasCyclePos) {
        issues.push({
          level: 'warn',
          text: '样例多一个用来造环的 `pos` 键，运行条不支持（录制器认这个约定，能录）',
        });
      } else if (stdin > 0) {
        issues.push({
          level: 'warn',
          text: `样例是 stdin 形态（${stdin} 组），运行条走手动输入`,
        });
      } else {
        issues.push({
          level: 'warn',
          text: '`## 示例` 抽不出样例 —— 确认每组都写了 `输入：` / `输出：` 前缀',
        });
      }
    }
  }

  // ── 2. 轨迹 ─────────────────────────────────────────────────
  const hasTrace = fs.existsSync(path.join(TRACES_DIR, `${name}.json`));
  if (!hasTrace && hasCode) {
    issues.push({level: 'warn', text: '没有录制轨迹（`pnpm trace:record ' + name.split('_')[0] + '`）'});
  }

  // ── 2b. 「解题思路」里不该有和完整代码一字不差的代码块 ────────
  //
  // 完整代码的位置只有一个：`## 完整代码实现`。而「解题思路」里再抄一份，
  // 读者会读到同一段代码两遍，而且**第二遍才是录制与运行条用的那份** ——
  // 两份一旦只改了一份，可视化播的就和眼前这段对不上。
  //
  // 为什么是 warn 不是 error：它不影响任何功能（可视化挂的是「完整代码实现」
  // 那一节，逐帧照样播）。只是文档冗余，改起来是内容工作。
  //
  // 判据：全文所有 ```python 块里，出现次数 > 1 的那一份。
  if (hasCode) {
    const canon = code.trim();
    const blocks = [...md.matchAll(/```python\s*\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    const dupCount = blocks.filter((b) => b === canon).length;
    if (dupCount > 1) {
      issues.push({
        level: 'warn',
        text:
          `「解题思路」里有一段代码与「完整代码实现」一字不差（全文共 ${dupCount} 段）` +
          ' —— 思路里讲关键步骤，完整代码只留一份',
      });
    }
  }

  // ── 3. 自测题 ────────────────────────────────────────────────
  const hasQuiz = bankDocIds.has(doc.docId);
  if (!hasQuiz) {
    issues.push({level: 'warn', text: '题库里没有这一篇（`pnpm quiz:gen && pnpm quiz:merge`）'});
  }

  // ── 4. frontmatter ───────────────────────────────────────────
  const {scalars: fmRaw, lists: fmLists} = readFrontMatter(md);
  const fm: Record<string, boolean> = {};
  /**
   * `tags` 走列表口径（它是多行数组），其余走标量。
   * 把两者混在一起判就会把 182 篇全判成「缺 tags」——
   * 判据本身没错，是取值的口径错了。
   */
  const valueOf = (key: string): string[] => {
    const list = fmLists[key];
    if (list !== undefined) {
      return list;
    }
    const v = fmRaw[key] ?? '';
    return v && v !== '[]' ? [v] : [];
  };
  const REQUIRED = ['title', 'platform', 'difficulty', 'tags', 'date_added'];
  for (const key of REQUIRED) {
    const filled = valueOf(key).length > 0;
    fm[key] = filled;
    if (!filled) {
      issues.push({level: 'error', text: `frontmatter 缺 ${key}`});
    }
  }
  // id 与 patterns 是可选的（id 可由文件名推出、patterns 可为空数组），
  // 但缺了会让复习卡片少信息，所以报 warn
  if (!fmRaw.id) {
    issues.push({level: 'warn', text: 'frontmatter 没有 id（复习卡片会用文件名代替）'});
  }
  const patterns = valueOf('patterns');
  fm.patterns = patterns.length > 0;
  if (patterns.length === 0) {
    issues.push({
      level: 'warn',
      text: 'patterns 为空 —— 不确定就留空，但知识图谱会缺一条边',
    });
  }

  // patterns 指向的文件必须真实存在（skill 明确要求，但没人查过）
  for (const rel of patterns) {
    // frontmatter 写的是 `../../patterns/x.md`，相对 code-training/docs。
    // 牛客题解在 problems/nowcoder/<分类>/ 下，真实深度是三层，所以这里
    // 剥掉**任意层** `../`，一律按「code-training/docs 下的路径」解析。
    const target = path.resolve(DOCS_ROOT, rel.replace(/^(?:\.\.\/)+/, ''));
    if (!fs.existsSync(target)) {
      issues.push({level: 'error', text: `patterns 指向不存在的文件：${rel}`});
    }
  }

  return {docId: doc.docId, name, samples, hasCode, hasTrace, hasQuiz, fm, issues};
}

// ============================================================

function main(): void {
  if (!fs.existsSync(BANK)) {
    console.error(`找不到题库 ${BANK}`);
    process.exitCode = 1;
    return;
  }
  const bank = JSON.parse(fs.readFileSync(BANK, 'utf-8')) as {
    items?: Array<{docId: string}>;
  };
  const bankDocIds = new Set((bank.items ?? []).map((i) => i.docId));

  const docs = collectProblemDocs().filter(
    (d) => !only.length || only.some((o) => d.docId.includes(o)),
  );

  const rows: Row[] = [];
  /** SQL 题没有 python 块，运行条与录制都不适用，不算它的错 */
  const skipped: string[] = [];
  for (const d of docs) {
    const row = inspect(d, bankDocIds);
    if (!row.hasCode) {
      skipped.push(row.docId);
      continue;
    }
    rows.push(row);
  }

  if (!quiet) {
    console.log('题解体检报告\n');
    console.log(
      '文档'.padEnd(46) +
        '样例  轨迹  自测  frontmatter',
    );
    for (const r of rows) {
      const fmOk = r.issues.filter(
        (i) => i.level === 'error' && i.text.startsWith('frontmatter'),
      ).length;
      console.log(
        r.docId.padEnd(46) +
          String(r.samples).padEnd(6) +
          (r.hasTrace ? '✓' : '✗').padEnd(6) +
          (r.hasQuiz ? '✓' : '✗').padEnd(6) +
          (fmOk === 0 ? '✓' : `${fmOk} 处缺`),
      );
    }
    console.log('');
  }

  const errors = rows.flatMap((r) =>
    r.issues.filter((i) => i.level === 'error').map((i) => `${r.docId} —— ${i.text}`),
  );
  const warns = rows.flatMap((r) =>
    r.issues.filter((i) => i.level === 'warn').map((i) => `${r.docId} —— ${i.text}`),
  );

  console.log(`检查 ${rows.length} 篇（有 python 代码的题解）`);
  console.log(`  样例可跑: ${rows.filter((r) => r.samples > 0).length}`);
  console.log(`  有轨迹:   ${rows.filter((r) => r.hasTrace).length}`);
  console.log(`  有自测题: ${rows.filter((r) => r.hasQuiz).length}`);
  console.log(`  跳过（无 python 块，多为 SQL 题）: ${skipped.length}`);
  console.log(`  error ${errors.length}｜warn ${warns.length}`);

  if (errors.length > 0) {
    console.error('\nerror（必须修）：\n  ' + errors.join('\n  '));
  }
  if (warns.length > 0) {
    console.log('\nwarn（派生功能没到位）：\n  ' + warns.slice(0, 30).join('\n  '));
    if (warns.length > 30) {
      console.log(`  … 还有 ${warns.length - 30} 条`);
    }
  }
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();