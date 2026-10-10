#!/usr/bin/env node
/**
 * 从题解的 `tags` 推出 `patterns` 字段（知识图谱的边）。
 *
 * ## 为什么要有这一步
 *
 * `patterns` 是题解 → 算法模式文档的边，算法模式页据此列出「相关题目」。
 * 但它一直是空的（182 篇里只有 2 篇填了）—— 于是「想做 BFS / DFS / DP
 * 的题」在站内无路可走。手填 182 篇不现实，所以从 tags 机械推导。
 *
 * ## 口径
 *
 * 映射表取自 `.agents/skills/leetcode-processor/SKILL.md` 的
 * 「tag → patterns 映射表」，但**去掉了明显不成立的几条**（那条表里把
 * `链表` 映到 `sorting`、把 `矩阵`/`图` 映到 `bfs`）。知识图谱宁可少一条边，
 * 也不要一条把人带到不相干题目的边。
 *
 * ## 幂等
 *
 * 只重写 `patterns:` 那一段，其余 frontmatter 原样保留；结果与当前一致时
 * 不写文件。可反复运行。
 *
 * 用法：
 *   node scripts/gen-patterns.js          # 只报告会改哪些
 *   node scripts/gen-patterns.js --write  # 真正写回
 */

const fs = require('fs');
const path = require('path');
const {TAG_TO_PATTERNS} = require('./tag-vocabulary.js');

const ROOT = process.cwd();
const PROBLEMS = path.join(ROOT, 'code-training', 'docs', 'problems');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/** 取出 frontmatter 里 `tags:` 下的列表项 */
function parseTags(frontmatter) {
  const m = frontmatter.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m);
  if (!m) {
    return [];
  }
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
}

function patternsFor(tags) {
  const slugs = new Set();
  for (const tag of tags) {
    for (const slug of TAG_TO_PATTERNS[tag] ?? []) {
      slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

function renderField(slugs) {
  if (slugs.length === 0) {
    return 'patterns: []';
  }
  return (
    'patterns:\n' + slugs.map((s) => `  - ../../patterns/${s}.md`).join('\n')
  );
}

function main() {
  const write = process.argv.includes('--write');
  let changed = 0;
  let empty = 0;
  let total = 0;

  for (const file of walk(PROBLEMS)) {
    const text = fs.readFileSync(file, 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      continue;
    }
    total++;
    const tags = parseTags(fm[1]);
    const slugs = patternsFor(tags);
    if (slugs.length === 0) {
      empty++;
    }
    const field = renderField(slugs);

    // 替换 `patterns:` 那一段（`[]` 或一个列表）；没有这个字段就插进去
    const blockRe = /^patterns:(?:[ \t]*\[\])?(?:\n(?:[ \t]*-[ \t]*.+))*$/m;
    let nextFm;
    if (blockRe.test(fm[1])) {
      nextFm = fm[1].replace(blockRe, field);
    } else if (/^topics:.*$/m.test(fm[1])) {
      nextFm = fm[1].replace(/^(topics:.*)$/m, `$1\n${field}`);
    } else if (/^tags:\s*\n(?:[ \t]*-[ \t]*.+\n?)+/m.test(fm[1])) {
      nextFm = fm[1].replace(
        /(^tags:\s*\n(?:[ \t]*-[ \t]*.+\n?)+)/m,
        `$1${field}\n`,
      );
    } else {
      nextFm = fm[1].replace(/^date_added:/m, `${field}\ndate_added:`);
    }
    if (nextFm === fm[1]) {
      continue;
    }
    changed++;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (write) {
      fs.writeFileSync(file, text.replace(fm[1], nextFm), 'utf8');
      console.log(`  ${rel}  ->  ${slugs.join(', ') || '(空)'}`);
    } else {
      console.log(`  [dry] ${rel}  ->  ${slugs.join(', ') || '(空)'}`);
    }
  }

  console.log(
    `\n共 ${total} 篇，${changed} 篇需要改，${empty} 篇推不出 pattern（留空）` +
      (write ? '' : '（这是 dry run，加 --write 才写回）'),
  );
}

main();
