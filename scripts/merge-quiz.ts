/**
 * 把 `bank.generated.json`（自动生成的复杂度题）合并进 `bank.json`。
 *
 * ## 为什么分两个文件
 *
 * - `bank.generated.json` —— `pnpm quiz:gen` 的产物，每次重跑都会被覆盖
 * - `bank.json` —— 正式题库，进 git，**人工/AI 写的易错点题、模式归属题也在这里**
 *
 * 合并规则：以 docId 为单位，复杂度题永远来自 generated（保证与表格同步），
 * 其它题保留 bank.json 里的人工版本。人工题与自动题 id 冲突时以人工为准。
 *
 * 用法：
 *   pnpm quiz:merge           # 合并
 *   pnpm quiz:merge --dry     # 只看差异，不写文件
 */

import fs from 'fs';
import path from 'path';

const QUIZ_DIR = path.join(process.cwd(), 'static/quiz');
const BANK_PATH = path.join(QUIZ_DIR, 'bank.json');
const GEN_PATH = path.join(QUIZ_DIR, 'bank.generated.json');

/** 自动生成题的 id 后缀，人工题不会用这些后缀 */
const AUTO_SUFFIXES = ['-complexity', '-space'];

type Item = {
  id: string;
  docId: string;
  type: string;
  stem: string;
  explain: string;
  source: string;
  options?: string[];
  answer?: unknown;
  accept?: string[];
};

function readJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function main(): void {
  const dry = process.argv.includes('--dry');
  const bank = readJson<{version: number; items: Item[]}>(BANK_PATH, {
    version: 1,
    items: [],
  });
  const gen = readJson<{version: number; items: Item[]}>(GEN_PATH, {
    version: 1,
    items: [],
  });

  // 人工题 = 不属于自动后缀的
  const manual = bank.items.filter((i) => !isAuto(i));
  const manualIds = new Set(manual.map((i) => i.id));

  const auto = gen.items.filter((i) => {
    if (manualIds.has(i.id)) {
      // 人工题与自动题同 id：保留人工版本，并提示
      console.warn(`⚠ id 冲突，保留人工版本：${i.id}`);
      return false;
    }
    return true;
  });

  // 每篇题解按 id 排序，保证输出稳定（否则每次 merge 结果都不同）
  const merged = [...auto, ...manual].sort((a, b) => a.id.localeCompare(b.id));

  const autoCount = bank.items.filter(isAuto).length;
  console.log(`自动题：${autoCount} → ${auto.length}（新增 ${auto.length - autoCount}）`);
  console.log(`人工题：${manual.length}`);
  console.log(`合并后：${merged.length}，覆盖 ${new Set(merged.map((i) => i.docId)).size} 篇题解`);

  if (dry) {
    console.log('\n(--dry) 未写入文件');
    return;
  }

  fs.writeFileSync(
    BANK_PATH,
    JSON.stringify({version: 1, items: merged}, null, 2) + '\n',
    'utf8',
  );
  console.log(`\n已写入 static/quiz/bank.json`);
}

function isAuto(item: Item): boolean {
  return AUTO_SUFFIXES.some((s) => item.id.endsWith(s));
}

main();