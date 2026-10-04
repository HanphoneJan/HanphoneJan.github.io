/**
 * 校验自测题库的正确性与完整性。
 *
 * 存在的意义：题目由 AI/脚本批量生成，最危险的错误是
 *「答案与题解正文矛盾」—— 读者答对了却被告知错，长期会不信任自测功能。
 * 所以这里做**交叉校验**：凡��� source 指向某个小节的题，
 * 都去题解的对应小节里字面核对答案。
 *
 * 用法：
 *   pnpm quiz:validate              # 全量校验 + 覆盖率报告
 *   pnpm quiz:validate --strict     # 有 error 就以非 0 退出（CI 用）
 */

import fs from 'fs';
import path from 'path';

const BANK_PATH = path.join(process.cwd(), 'static/quiz/bank.json');
const DOCS_ROOT = path.join(process.cwd(), 'code-training/docs');
/** 每个 docId 期望的题目数 */
const TARGET_PER_DOC = 3;

type Question = {
  id: string;
  docId: string;
  type: 'single' | 'multi' | 'judge' | 'blank';
  stem: string;
  explain: string;
  source: string;
  options?: string[];
  answer?: number | number[] | boolean | string;
  accept?: string[];
};

interface Bank {
  version: number;
  items: Question[];
}

const errors: string[] = [];
const warnings: string[] = [];

function err(where: string, msg: string): void {
  errors.push(`${where}: ${msg}`);
}

function warn(where: string, msg: string): void {
  warnings.push(`${where}: ${msg}`);
}

/** 从题解里截出某个二级标题小节的正文 */
function extractSection(md: string, heading: string): string | undefined {
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
      break
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 题库里所有题的答案文本，用于交叉核对 */
function answerTexts(q: Question): string[] {
  switch (q.type) {
    case 'single':
    case 'multi':
      const picked = Array.isArray(q.answer) ? q.answer : [q.answer as number];
      return picked.map((i) => q.options?.[i] ?? '');
    case 'blank':
      return [q.answer as string, ...(q.accept ?? [])];
    default:
      return [];
  }
}

function main(): void {
  if (!fs.existsSync(BANK_PATH)) {
    console.error(`题库不存在：${BANK_PATH}`);
    process.exit(1);
  }

  let bank: Bank;
  try {
    bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8')) as Bank;
  } catch (e) {
    console.error(`题库 JSON 解析失败：${(e as Error).message}`);
    process.exit(1);
  }

  if (bank.version !== 1) {
    warn('bank', `未知的 version=${bank.version}`);
  }

  const seenIds = new Set<string>();
  const byDoc = new Map<string, Question[]>();
  const mdCache = new Map<string, string>();

  for (const q of bank.items ?? []) {
    const where = `[${q.id ?? '<no-id>'}]`;

    // ---- 基础字段 ----
    if (!q.id) {
      err(where, '缺少 id');
      continue;
    }
    if (seenIds.has(q.id)) {
      err(where, `id 重复`);
    }
    seenIds.add(q.id);

    if (!q.docId) {
      err(where, '缺少 docId');
      continue;
    }
    if (!q.stem || q.stem.trim().length < 4) {
      err(where, '题干过短或为空');
    }
    // 解析是复习时唯一的学习价值，必须有且不能敷衍
    if (!q.explain || q.explain.trim().length < 15) {
      err(where, 'explain 缺失或过短（不得少于 15 字）');
    }
    if (!q.source) {
      err(where, '缺少 source（出处小节）');
    }

    // ---- docId 必须指向真实文件 ----
    const mdPath = path.join(DOCS_ROOT, q.docId);
    if (!fs.existsSync(mdPath)) {
      err(where, `docId 指向的文件不存在：${q.docId}`);
    } else {
      if (!mdCache.has(q.docId)) {
        mdCache.set(q.docId, fs.readFileSync(mdPath, 'utf8'));
      }
    }

    // ---- 题型合法性 ----
    switch (q.type) {
      case 'single': {
        const opts = q.options ?? [];
        if (opts.length < 2) {
          err(where, '单选题选项少于 2 个');
        }
        if (new Set(opts).size !== opts.length) {
          err(where, `选项有重复：${JSON.stringify(opts)}`);
        }
        if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= opts.length) {
          err(where, `answer 下标越界：${q.answer}（共 ${opts.length} 个选项）`);
        }
        break;
      }
      case 'multi': {
        const opts = q.options ?? [];
        if (opts.length < 2) {
          err(where, '多选题选项少于 2 个');
        }
        if (new Set(opts).size !== opts.length) {
          err(where, `选项有重复：${JSON.stringify(opts)}`);
        }
        if (!Array.isArray(q.answer) || q.answer.length === 0) {
          err(where, '多选题 answer 必须是非空数组');
        } else {
          for (const i of q.answer) {
            if (i < 0 || i >= opts.length) {
              err(where, `answer 下标越界：${i}（共 ${opts.length} 个选项）`);
            }
          }
          const sorted = [...q.answer].sort((a, b) => a - b);
          if (JSON.stringify(sorted) !== JSON.stringify(q.answer)) {
            warn(where, 'multi 的 answer 未升序（不影响判分，但建议排序便于人工核对）');
          }
        }
        break;
      }
      case 'judge':
        if (typeof q.answer !== 'boolean') {
          err(where, `judge 的 answer 必须是布尔值，实际是 ${JSON.stringify(q.answer)}`);
        }
        break;
      case 'blank':
        if (typeof q.answer !== 'string' || !q.answer.trim()) {
          err(where, '填空题 answer 必须是非空字符串');
        }
        if (q.accept && !Array.isArray(q.accept)) {
          err(where, 'accept 必须是数组');
        }
        break;
      default:
        err(where, `未知题型 ${JSON.stringify(q.type)}`);
    }

    // ---- 交叉校验：答案必须能在题解的对应小节里找到 ----
    const md = mdCache.get(q.docId);
    if (md) {
      const heading = (q.source ?? '').split('·')[0].trim();
      const section = extractSection(md, heading);
      if (!section) {
        warn(where, `题解里找不到小节「## ${heading}」，无法交叉校验答案`);
      } else {
        const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        const normSection = norm(section);
        for (const text of answerTexts(q)) {
          if (!text) {
            continue;
          }
          // 判断题答案是布尔值，没有可核对文本，跳过
          if (typeof text !== 'string' || text.length < 2) {
            continue;
          }
          if (!normSection.includes(norm(text))) {
            err(
              where,
              `答案文本「${text}」在题解的「## ${heading}」小节里字面找不到，` +
                '请核对是否与正文矛盾',
            );
          }
        }
      }
    }

    const list = byDoc.get(q.docId) ?? [];
    list.push(q);
    byDoc.set(q.docId, list);
  }

  // ---- 覆盖率 ----
  const allDocs = collectProblemDocs();
  let covered = 0;
  const underfilled: string[] = [];

  for (const rel of allDocs) {
    const n = byDoc.get(rel)?.length ?? 0;
    if (n > 0) {
      covered++;
    }
    if (n > 0 && n < TARGET_PER_DOC) {
      underfilled.push(`${rel} (${n}/${TARGET_PER_DOC})`);
    }
  }

  // 题库里出现了但对应 md 不存在的
  for (const docId of byDoc.keys()) {
    if (!allDocs.includes(docId)) {
      warn('bank', `docId 不在 problems 目录清单里：${docId}`);
    }
  }

  console.log('─'.repeat(56));
  console.log(`题库题目总数：${bank.items?.length ?? 0}`);
  console.log(
    `题解覆盖：${covered}/${allDocs.length} 篇有题` +
      `（${((covered / allDocs.length) * 100).toFixed(1)}%）`,
  );
  if (underfilled.length) {
    console.log(`题量不足 ${TARGET_PER_DOC} 的篇数：${underfilled.length}`);
  }
  console.log('─'.repeat(56));

  if (underfilled.length > 0 && underfilled.length <= 15) {
    for (const u of underfilled) {
      console.log(`  待补：${u}`);
    }
  }

  if (warnings.length) {
    console.log(`\n警告 ${warnings.length} 条：`);
    for (const w of warnings.slice(0, 30)) {
      console.log(`  ⚠ ${w}`);
    }
    if (warnings.length > 30) {
      console.log(`  … 另有 ${warnings.length - 30} 条`);
    }
  }

  if (errors.length) {
    console.error(`\n错误 ${errors.length} 条：`);
    for (const e of errors) {
      console.error(`  ✗ ${e}`);
    }
  }

  const strict = process.argv.includes('--strict');
  if (errors.length && strict) {
    process.exit(1);
  }
  if (errors.length) {
    process.exitCode = 1;
  }
}

function collectProblemDocs(): string[] {
  const problemsDir = path.join(DOCS_ROOT, 'problems');
  if (!fs.existsSync(problemsDir)) {
    return [];
  }
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        out.push(path.relative(DOCS_ROOT, full).split(path.sep).join('/'));
      }
    }
  };
  walk(problemsDir);
  return out.sort();
}

main();