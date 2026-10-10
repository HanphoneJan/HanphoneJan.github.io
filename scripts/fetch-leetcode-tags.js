#!/usr/bin/env node
/**
 * 用 LeetCode.cn 官方的 `topicTags` 补全题解的 `tags`。
 *
 * ## 为什么
 *
 * `tags` 是知识图谱的输入（`patterns` 从它推导）、也是标签页与
 * 「薄弱标签」统计的依据。手写的 tags 往往只覆盖主体解法，会漏掉
 * 官方认定的其它知识点（比如 0200 岛屿数量官方同时标了并查集）。
 *
 * ## 口径
 *
 * - 官方返回的是**中文** `translatedName`（如「广度优先搜索」），优先用它；
 *   少数没有中文的退回英文 `name`。
 * - **只增不删**：已有 tags 原样保留、顺序不变，官方多出来的追加在后面。
 * - 网络失败的题跳过并打印，不会写坏文件；可重跑补齐。
 *
 * 用法：
 *   node scripts/fetch-leetcode-tags.js          # 只报告会新增哪些 tag
 *   node scripts/fetch-leetcode-tags.js --write  # 写回 frontmatter
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'code-training', 'docs', 'problems', 'leetcode');
const ENDPOINT = 'https://leetcode.cn/graphql/';
const QUERY =
  'query($slug:String!){question(titleSlug:$slug){questionId title topicTags{name slug translatedName}}}';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 归一化词表与 `normalize-tags.js` / `gen-patterns.js` 共用同一份 */
const {SYNONYMS} = require('./tag-vocabulary.js');

function normalize(tag) {
  const t = tag.trim();
  return SYNONYMS[t] ?? t;
}

async function fetchTags(slug, attempt = 0) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://leetcode.cn/problemset/',
      },
      body: JSON.stringify({query: QUERY, variables: {slug}}),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const q = json?.data?.question;
    if (!q) {
      throw new Error(json?.errors?.[0]?.message ?? 'no question');
    }
    return (q.topicTags ?? []).map((t) => t.translatedName || t.name);
  } catch (e) {
    if (attempt < 1) {
      await sleep(1500);
      return fetchTags(slug, attempt + 1);
    }
    throw e;
  }
}

function slugOf(url) {
  const m = url.match(/leetcode\.cn\/problems\/([^/?#]+)/);
  return m ? m[1] : null;
}

function parseList(frontmatter, key) {
  const m = frontmatter.match(
    new RegExp(`^${key}:\\s*\\n((?:[ \\t]*-[ \\t]*.+\\n?)+)`, 'm'),
  );
  if (!m) {
    return [];
  }
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
}

async function main() {
  const write = process.argv.includes('--write');
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  let changed = 0;
  const added = new Map(); // 新 tag -> 出现次数

  for (const name of files) {
    const file = path.join(DIR, name);
    const text = fs.readFileSync(file, 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      continue;
    }
    const fm = fmMatch[1];
    const url = (fm.match(/^url:\s*(\S+)/m) ?? [])[1] ?? '';
    const slug = slugOf(url);
    if (!slug) {
      console.error(`跳过（拿不到 slug）：${name}`);
      continue;
    }

    let official;
    try {
      official = await fetchTags(slug);
    } catch (e) {
      console.error(`跳过（请求失败 ${slug}）：${e.message}`);
      await sleep(300);
      continue;
    }

    const rawExisting = parseList(fm, 'tags');
    // 先把已有 tags 归一化（去掉 BFS/DFS 这类同义分裂），再去重
    const existing = [];
    for (const t of rawExisting) {
      const n = normalize(t);
      if (!existing.includes(n)) {
        existing.push(n);
      }
    }
    const have = new Set(existing);
    const extra = [];
    for (const t of official) {
      const n = normalize(t);
      if (n && !have.has(n)) {
        have.add(n);
        extra.push(n);
        added.set(n, (added.get(n) ?? 0) + 1);
      }
    }
    const merged = [...existing, ...extra];
    const unchanged =
      merged.length === rawExisting.length &&
      merged.every((t, i) => t === rawExisting[i]);
    if (unchanged) {
      await sleep(250);
      continue;
    }

    changed++;
    console.log(
      `${name}  ${extra.length ? '+' + extra.join(' ') : '(仅归一化)'}`,
    );
    if (write) {
      const block = 'tags:\n' + merged.map((t) => `  - ${t}`).join('\n');
      const nextFm = fm.replace(
        /^tags:\s*\n(?:[ \t]*-[ \t]*.+\n?)+/m,
        block + '\n',
      );
      fs.writeFileSync(file, text.replace(fm, nextFm), 'utf8');
    }
    await sleep(250);
  }

  console.log(`\n${changed}/${files.length} 篇有新 tag` + (write ? '' : '（dry run，加 --write 才写回）'));
  console.log('\n新增 tag 频次（用来更新 skill 的标签词表）：');
  for (const [t, c] of [...added.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padStart(3)}  ${t}`);
  }
}

main();
