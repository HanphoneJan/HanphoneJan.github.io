#!/usr/bin/env node
/**
 * 把**所有**题解的 `tags` 归一化到 `scripts/tag-vocabulary.js` 的词表。
 *
 * ## 为什么不能只在补官方 tag 时归一化
 *
 * `fetch-leetcode-tags.js` 只碰 LeetCode 题解；牛客 / shoppee / sf 等题解里
 * 还留着历史写法（`DFS`、`Floyd判圈`、`Manacher`、`归并`…）。同一知识点以
 * 两个 tag 出现时，标签页与复习系统的「薄弱标签」统计会被拆成两行。
 *
 * 只改写法、只去重，**不新增也不删除**语义 —— 需要新增的是官方 tag，
 * 那是 `fetch-leetcode-tags.js` 的事。
 *
 * 用法：
 *   node scripts/normalize-tags.js          # dry run
 *   node scripts/normalize-tags.js --write
 */

const fs = require('fs');
const path = require('path');
const {SYNONYMS} = require('./tag-vocabulary.js');

const ROOT = process.cwd();
const PROBLEMS = path.join(ROOT, 'code-training', 'docs', 'problems');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const write = process.argv.includes('--write');
  let changed = 0;

  for (const file of walk(PROBLEMS)) {
    const text = fs.readFileSync(file, 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      continue;
    }
    const tagsRe = /^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m;
    const m = fm[1].match(tagsRe);
    if (!m) {
      continue;
    }
    const raw = m[1]
      .split('\n')
      .map((l) => l.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean);
    const normalized = [];
    for (const t of raw) {
      const n = SYNONYMS[t] ?? t;
      if (!normalized.includes(n)) {
        normalized.push(n);
      }
    }
    if (
      normalized.length === raw.length &&
      normalized.every((t, i) => t === raw[i])
    ) {
      continue;
    }
    changed++;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    console.log(
      `${rel}\n    ${raw.join(' ')}\n -> ${normalized.join(' ')}`,
    );
    if (write) {
      const block = 'tags:\n' + normalized.map((t) => `  - ${t}`).join('\n');
      const nextFm = fm[1].replace(tagsRe, block + '\n');
      fs.writeFileSync(file, text.replace(fm[1], nextFm), 'utf8');
    }
  }

  console.log(`\n${changed} 篇需要归一化` + (write ? '' : '（dry run，加 --write 才写回）'));
}

main();
