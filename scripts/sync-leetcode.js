#!/usr/bin/env node
/**
 * 同步力扣 (leetcode.cn) 已通过 (Accepted) 的提交到本地题库。
 *
 * - 从环境变量 LEETCODE_SESSION 读取 cookie
 * - 拉取提交列表 → 获取每题代码 + 题目详情
 * - 与 code-training/leetcode/ 现有文件 diff,只生成新题
 * - 每次请求会从 Set-Cookie 捕获续期后的 LEETCODE_SESSION,
 *   若发生变化会写入 cookie 输出文件,供 workflow 更新 secret
 *
 * 用法:
 *   LEETCODE_SESSION="..." node scripts/sync-leetcode.js
 */

const fs = require('fs');
const path = require('path');

const LC_API = 'https://leetcode.cn/graphql/';
const LC_SUBMISSIONS_API = 'https://leetcode.cn/api/submissions/';
const LC_ROOT = path.join(__dirname, '..', 'code-training');
const LC_DIR = path.join(LC_ROOT, 'leetcode');
const DOCS_DIR = path.join(LC_ROOT, 'docs', 'problems', 'leetcode');

const SESSION_FILE = process.env.LC_COOKIE_OUTPUT || path.join(process.cwd(), '.lc-cookie.tmp');

// 常见标签的英文 → 中文映射,用于 frontmatter tags
const TAG_CN_MAP = {
  'Array': '数组',
  'Hash Table': '哈希表',
  'Linked List': '链表',
  'Math': '数学',
  'Two Pointers': '双指针',
  'String': '字符串',
  'Binary Search': '二分查找',
  'Divide and Conquer': '分治',
  'Dynamic Programming': '动态规划',
  'Backtracking': '回溯',
  'Stack': '栈',
  'Heap (Priority Queue)': '堆',
  'Greedy': '贪心',
  'Sorting': '排序',
  'Bit Manipulation': '位运算',
  'Tree': '树',
  'Depth-First Search': '深度优先搜索',
  'Breadth-First Search': '广度优先搜索',
  'Graph': '图',
  'Design': '设计',
  'Trie': '字典树',
  'Recursion': '递归',
  'Queue': '队列',
  'Sliding Window': '滑动窗口',
  'Union Find': '并查集',
  'Ordered Set': '有序集合',
  'Monotonic Stack': '单调栈',
  'Monotonic Queue': '单调队列',
  'Binary Indexed Tree': '树状数组',
  'Segment Tree': '线段树',
  'Prefix Sum': '前缀和',
  'Simulation': '模拟',
  'Counting': '计数',
  'Hash Function': '哈希函数',
  'Rolling Hash': '滚动哈希',
  'Game Theory': '博弈',
  'Enumeration': '枚举',
  'Number Theory': '数论',
  'Matrix': '矩阵',
  'Geometry': '几何',
  'Combinatorics': '组合数学',
  'Randomized': '随机化',
  'Shell': 'Shell',
  'Database': '数据库',
  'Concurrency': '并发',
};

const LEETCODE_SESSION = process.env.LEETCODE_SESSION;
if (!LEETCODE_SESSION) {
  console.error('❌ Error: LEETCODE_SESSION environment variable is required.');
  process.exit(1);
}

// 兼容传入完整 cookie 字符串或仅 LEETCODE_SESSION=xxx 值
function buildCookie() {
  if (LEETCODE_SESSION.includes('LEETCODE_SESSION=')) {
    const m = LEETCODE_SESSION.match(/LEETCODE_SESSION=[^;]+/);
    if (m) return m[0];
    return LEETCODE_SESSION;
  }
  return `LEETCODE_SESSION=${LEETCODE_SESSION}`;
}

let cookie = buildCookie();

function setCookieFromHeaders(headers) {
  for (const line of (headers.getSetCookie ? headers.getSetCookie() : [])) {
    const m = line.match(/LEETCODE_SESSION=([^;]+)/);
    if (m) {
      cookie = `LEETCODE_SESSION=${m[1]}`;
    }
  }
}

async function fetchJson(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'hanphonejan-leetcode-sync',
          'Referer': 'https://leetcode.cn/',
          'Origin': 'https://leetcode.cn',
          'Content-Type': 'application/json',
          'Cookie': cookie,
          ...options.headers
        }
      });

      clearTimeout(timeout);
      setCookieFromHeaders(response.headers);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries} after error: ${error.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function graphql(query, variables) {
  return fetchJson(LC_API, {
    method: 'POST',
    body: JSON.stringify({ query, variables })
  });
}

async function fetchSubmissions(limit = 100) {
  console.log('🔍 Fetching submission list...');
  const data = await fetchJson(`${LC_SUBMISSIONS_API}?limit=${limit}&offset=0`);
  return data.submissions_dump || [];
}

async function fetchSubmissionDetail(submissionId) {
  const query = `query submissionDetails($submissionId: ID!) {
  submissionDetail(submissionId: $submissionId) {
    code
    timestamp
    statusDisplay
    lang
    question {
      questionId
      titleSlug
    }
  }
}`;
  const res = await graphql(query, { submissionId: String(submissionId) });
  return res?.data?.submissionDetail || null;
}

async function fetchQuestionDetails(titleSlug) {
  const query = `query getQuestion($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    titleSlug
    translatedTitle
    difficulty
    translatedContent
    exampleTestcases
    topicTags {
      name
    }
  }
}`;
  const res = await graphql(query, { titleSlug });
  return res?.data?.question || null;
}

/**
 * 将力扣题面的 HTML 转成可读的 markdown。
 * 保留 <pre>/<code> 为代码块/行内代码,其余标签简化。
 */
function htmlToMarkdown(html) {
  if (!html) return '';
  let s = html;

  // 代码块 <pre><code>...</code></pre> → fenced code block
  s = s.replace(/<pre>[\s\S]*?<code>(.*?)<\/code>[\s\S]*?<\/pre>/g, (_, code) => {
    return '\n```\n' + code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ') + '\n```\n';
  });

  // 行内代码
  s = s.replace(/<code>(.*?)<\/code>/g, (_, code) => '`' + code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") + '`');

  // 列表
  s = s.replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n');

  // 标题
  s = s.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, n, t) => '\n' + '#'.repeat(Number(n) + 2) + ' ' + t + '\n');

  // 换行
  s = s.replace(/<\/p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n');

  // 加粗/斜体
  s = s.replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**');
  s = s.replace(/<em>([\s\S]*?)<\/em>/g, '*$1*');

  // 链接
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');

  // 去除剩余标签
  s = s.replace(/<[^>]+>/g, '');

  // HTML 实体清理
  s = s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 压缩多余空行
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function tagCn(name) {
  return TAG_CN_MAP[name] || name;
}

function pad4(id) {
  return String(id).padStart(4, '0');
}

function slugToSnake(slug) {
  return slug.replace(/-/g, '_');
}

async function existingSlugs() {
  const slugs = new Set();
  const files = await fs.promises.readdir(LC_DIR).catch(() => []);
  for (const f of files) {
    if (!f.endsWith('.py')) continue;
    const base = f.replace(/\.py$/, '');
    // 文件名形如 16.3sum-closest.py → 去掉最前面的 "N." 得到 slug
    const m = base.match(/^\d+\.(.+)$/);
    if (m) slugs.add(m[1]);
    else slugs.add(base);
  }
  return slugs;
}

/**
 * 读取本地 .py 文件头部的 "[N] 中文标题" 注释,用于与提交列表的中文标题比对。
 * 返回 { '中文标题': slug } 映射,避免对已存在题目调用详情接口(降低频率限制风险)。
 */
async function existingTitles() {
  const titles = {};
  const files = await fs.promises.readdir(LC_DIR).catch(() => []);
  for (const f of files) {
    if (!f.endsWith('.py')) continue;
    const base = f.replace(/\.py$/, '');
    const m = base.match(/^\d+\.(.+)$/);
    const slug = m ? m[1] : base;
    try {
      const content = fs.readFileSync(path.join(LC_DIR, f), 'utf8');
      const titleMatch = content.match(/^\s*#\s*\[\d+\]\s*(.+?)\s*$/m);
      if (titleMatch) {
        titles[titleMatch[1].trim()] = slug;
      }
    } catch {
      // 忽略无法读取的文件
    }
  }
  return titles;
}

/** 延时,避免触发力扣访问频率限制 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function makePyFile(question, code) {
  const id = question.questionFrontendId;
  const slug = question.titleSlug;
  const title = question.translatedTitle || question.title;
  return [
    '#',
    `# @lc app=leetcode.cn id=${id} lang=python3`,
    '# @lcpr version=30204',
    '#',
    `# [${id}] ${title}`,
    '#',
    '',
    '',
    '# @lcpr-template-start',
    ...inferImports(code),
    '# @lcpr-template-end',
    '# @lc code=start',
    code.trimEnd(),
    '# @lc code=end',
    '',
    ''
  ].join('\n');
}

/**
 * 根据代码内容推断需要的 typing import。
 * 力扣平台自动提供内置类型,这里仅为本地可运行性添加常用类型。
 */
function inferImports(code) {
  const needed = [];
  const typeNames = ['List', 'Optional', 'Dict', 'Set', 'Tuple', 'Deque', 'DefaultDict', 'Counter', 'Callable', 'Iterator', 'Union'];
  const present = typeNames.filter(t => new RegExp(`\\b${t}\\b`).test(code));
  if (present.length) {
    return [`from typing import ${present.join(', ')}`, ''];
  }
  return [];
}

function makeMdFile(question, code) {
  const id = question.questionFrontendId;
  const slug = question.titleSlug;
  const title = question.translatedTitle || question.title;
  const difficulty = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1).toLowerCase();
  const tags = (question.topicTags || []).map(t => `  - ${tagCn(t.name)}`);
  const today = new Date().toISOString().slice(0, 10);
  const url = `https://leetcode.cn/problems/${slug}/`;

  const description = htmlToMarkdown(question.translatedContent);

  const codeBlock = '```python\n' + code.trimEnd() + '\n```';

  return `---
title: ${id}. ${title}
platform: LeetCode
difficulty: ${difficulty}
id: ${id}
url: ${url}
tags:
${tags.join('\n')}
topics: []
patterns: []
date_added: ${today}
date_reviewed: []
---

# ${id}. ${title}

## 题目描述

${description}

---

## 解题思路

> 待补充:由 AI 在后续处理中生成

### 第一步：理解问题本质

### 第二步：暴力解法

### 第三步：优化解法

### 第四步：最优解法

---

## 完整代码实现

${codeBlock}

---

## 示例推演

> 待补充

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
| ---- | ---------- | ---------- | ---- |
| 暴力 | | | 待补充 |
| 优化 | | | 待补充 |
| 最优 | | | 待补充 |

---

## 易错点总结

> 待补充

---

## 扩展思考

> 待补充

---

## 相关题目

> 待补充
`;
}

async function main() {
  try {
    const submissions = await fetchSubmissions();
    console.log(`📦 Total submissions fetched: ${submissions.length}`);

    const accepted = submissions.filter(s => s.status_display === 'Accepted');
    console.log(`✅ Accepted: ${accepted.length}`);

    if (accepted.length === 0) {
      console.log('ℹ️ No accepted submissions found.');
      await writeCookieOutput();
      return;
    }

    const existingSlugSet = await existingSlugs();
    const existingTitleMap = await existingTitles();
    console.log(`📁 Existing local problems: ${existingSlugSet.size}`);

    let created = 0;
    let skipped = 0;

    for (const sub of accepted) {
      // 先用提交列表的中文标题与本地标题比对,已存在的直接跳过(不触发 detail API,降低频率限制风险)
      const localSlug = existingTitleMap[sub.title];
      if (localSlug) {
        skipped++;
        continue;
      }

      await sleep(1000);

      const detail = await fetchSubmissionDetail(sub.id);
      if (!detail) {
        console.log(`  ⚠️  Failed to fetch detail for submission ${sub.id}, skipping`);
        continue;
      }

      const slug = detail.question?.titleSlug;
      if (!slug || existingSlugSet.has(slug)) {
        skipped++;
        continue;
      }

      const question = await fetchQuestionDetails(slug);
      if (!question) {
        console.log(`  ⚠️  Failed to fetch question ${slug}, skipping`);
        continue;
      }

      const pyFile = path.join(LC_DIR, `${question.questionFrontendId}.${slug}.py`);
      const mdFile = path.join(DOCS_DIR, `${pad4(question.questionFrontendId)}_${slugToSnake(slug)}.md`);

      fs.mkdirSync(path.dirname(pyFile), { recursive: true });
      fs.mkdirSync(path.dirname(mdFile), { recursive: true });

      fs.writeFileSync(pyFile, makePyFile(question, detail.code));
      fs.writeFileSync(mdFile, makeMdFile(question, detail.code));

      console.log(`  ✅ Created: ${path.relative(process.cwd(), pyFile)}`);
      console.log(`  ✅ Created: ${path.relative(process.cwd(), mdFile)}`);
      existingSlugSet.add(slug);
      created++;
    }

    console.log(`\n📊 Result: ${created} new, ${skipped} skipped (already exist)`);

    await writeCookieOutput();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function writeCookieOutput() {
  // 主动调用一次 GraphQL,触发服务端在 Set-Cookie 中续期 LEETCODE_SESSION
  try {
    await graphql('query userStatus { userStatus { isSignedIn username } }', {});
  } catch {
    // 忽略失败,仍写入当前 cookie
  }
  fs.writeFileSync(SESSION_FILE, cookie + '\n', 'utf8');
  const changed = cookie !== buildCookie();
  console.log(`🔑 Refreshed cookie written to ${SESSION_FILE}${changed ? ' (refreshed: true)' : ' (refreshed: false)'}`);
}

main();