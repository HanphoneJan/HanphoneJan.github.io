#!/usr/bin/env node
/**
 * 同步牛客 (nowcoder.com) 已通过的提交到本地题库。
 *
 * - 从环境变量 NOWCODER_COOKIE 读取完整 cookie
 * - 拉取提交列表 (POST /api/sparta/user/question-training/submission-history)
 * - 获取每题提交代码 (GET /profile/{uid}/codeBookDetail?submissionId=)
 * - 获取题目详情/难度 (GET /practice/{uuid})
 * - 与 code-training/nowcoder/ 现有文件按"题目名"比对,只生成新题
 *
 * 用法:
 *   NOWCODER_COOKIE="..." NOWCODER_UID=485960884 node scripts/sync-nowcoder.js
 */

const fs = require('fs');
const path = require('path');

const GATEWAY = 'https://gw-c.nowcoder.com';
const WWW = 'https://www.nowcoder.com';
const NC_ROOT = path.join(__dirname, '..', 'code-training');
const NC_DIR = path.join(NC_ROOT, 'nowcoder');
const DOCS_DIR = path.join(NC_ROOT, 'docs', 'problems', 'nowcoder');

const NOWCODER_COOKIE = process.env.NOWCODER_COOKIE;
const NOWCODER_UID = process.env.NOWCODER_UID;
if (!NOWCODER_COOKIE) {
  console.error('❌ Error: NOWCODER_COOKIE environment variable is required.');
  process.exit(1);
}
if (!NOWCODER_UID) {
  console.error('❌ Error: NOWCODER_UID environment variable is required.');
  process.exit(1);
}

// 分类判断:根据题号前缀或题目名映射到子目录
function categorize(questionNum, title) {
  if (/^SQL\d+/i.test(questionNum)) return '牛客题霸-SQL篇';
  if (/^ML\d+/i.test(questionNum)) return '机器学习';
  if (/^HJ\d+/i.test(questionNum)) return '华为机试';
  if (/SQL/i.test(title) && /查询|表|数据库|employees|emp/i.test(title)) return '牛客题霸-SQL篇';
  if (/k-means|聚类|机器学习|回归|分类|神经网络/i.test(title)) return '机器学习';
  return '华为机试';
}

const LANG_EXT = {
  'python': 'py',
  'python3': 'py',
  'cpp': 'cpp',
  'c++': 'cpp',
  'java': 'java',
  'javascript': 'js',
  'typescript': 'ts',
  'go': 'go',
  'rust': 'rs',
  'mysql': 'sql',
  'sql': 'sql',
  'c': 'c',
  'php': 'php',
  'ruby': 'rb',
};

function langToExt(lang) {
  const l = String(lang || '').toLowerCase();
  for (const [k, v] of Object.entries(LANG_EXT)) {
    if (l.includes(k)) return v;
  }
  return 'py';
}

function normalizeLang(lang) {
  const l = String(lang || '').toLowerCase();
  if (l.includes('python')) return 'Python3';
  if (l.includes('mysql')) return 'MySQL';
  if (l.includes('sql')) return 'MySQL';
  if (l.includes('cpp') || l.includes('c++')) return 'C++';
  if (l.includes('java')) return 'Java';
  if (l.includes('javascript')) return 'JavaScript';
  if (l.includes('typescript')) return 'TypeScript';
  if (l.includes('go')) return 'Go';
  if (l.includes('rust')) return 'Rust';
  if (l.includes('php')) return 'PHP';
  if (l.includes('ruby')) return 'Ruby';
  if (l.includes('c')) return 'C';
  return lang;
}

const DIFFICULTY_CN = { '1': 'Easy', '2': 'Medium', '3': 'Hard' };

async function fetchText(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Cookie': NOWCODER_COOKIE,
          ...options.headers
        }
      });
      clearTimeout(timeout);
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return text;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 拉取提交历史(分页) */
async function fetchSubmissionHistory() {
  const all = [];
  let pageNo = 1;
  const pageSize = 50;
  while (true) {
    const data = await fetchJson(`${GATEWAY}/api/sparta/user/question-training/submission-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': `${WWW}/users/${NOWCODER_UID}` },
      body: JSON.stringify({ pageNo, pageSize, userId: Number(NOWCODER_UID) })
    });
    const records = data?.data?.records || [];
    all.push(...records);
    const totalPage = data?.data?.totalPage || 1;
    if (pageNo >= totalPage || records.length === 0) break;
    pageNo++;
  }
  return all;
}

/** 从 codeBookDetail 页面提取提交代码 + 题目标题 + 状态 + 语言 */
function parseCodeBookDetail(html) {
  const pres = [...html.matchAll(/<pre[^>]*>(.*?)<\/pre>/gs)].map(m => m[1]);
  // 第一个 pre block 通常是用户提交代码
  const code = pres.length ? decodeHtml(pres[0]) : '';
  const titleMatch = html.match(/js-question-title">([^<]+)</);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const langMatch = html.match(/语言[：:]\s*<span[^>]*>([^<]+)</) || html.match(/语言[：:]\s*([^<]+)</);
  const lang = langMatch ? langMatch[1].trim() : '';
  const statusMatch = html.match(/状态[：:]\s*(?:<span[^>]*>)?([^<]+)</);
  const status = statusMatch ? statusMatch[1].trim() : '';
  const timeMatch = html.match(/提交时间[：:]\s*([\d-]+)/);
  const time = timeMatch ? timeMatch[1] : '';
  return { code, title, lang, status, time };
}

/** 从 practice 页面提取题目信息(描述/难度/questionId) */
function parsePracticePage(html) {
  // 去掉标签取纯文本
  const plain = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).join(' ').trim();

  const difficultyVar = html.match(/difficulty_var\s*:\s*'(\d)'/) || html.match(/difficulty_var\s*=\s*'(\d)'/);
  const difficulty = DIFFICULTY_CN[difficultyVar ? difficultyVar[1] : ''] || 'Easy';

  const questionIdMatch = html.match(/questionID_var\s*:\s*'(\d+)'/) || html.match(/questionId\s*:\s*'(\d+)'/);
  const questionId = questionIdMatch ? questionIdMatch[1] : '';

  const uuidMatch = html.match(/uuid\s*:\s*'([0-9a-f]+)'/);
  const uuid = uuidMatch ? uuidMatch[1] : '';

  // 题目描述:从"对于给定的"或描述段落开始,到"输入描述"为止
  let description = '';
  const inputIdx = plain.indexOf('输入描述');
  const descStart = plain.indexOf('对于给定的');
  const descEnd = inputIdx > -1 ? inputIdx : -1;
  if (descStart > -1 && descEnd > descStart) {
    description = plain.slice(descStart, descEnd).trim();
  } else if (inputIdx > -1) {
    // fallback: description before 输入描述
    const segStart = Math.max(0, plain.indexOf(plain.match(/[^\s]{10,}/)?.[0] || ''));
    description = plain.slice(segStart, inputIdx).trim();
  }

  // 输入描述/输出描述/示例
  const inputDesc = extractSection(plain, '输入描述', '输出描述');
  const outputDesc = extractSection(plain, '输出描述', '示例');
  const examples = extractExamples(html);

  return { difficulty, questionId, uuid, description, inputDesc, outputDesc, examples };
}

function extractSection(plain, startKw, endKw) {
  const s = plain.indexOf(startKw);
  if (s === -1) return '';
  const e = endKw ? plain.indexOf(endKw, s) : -1;
  const seg = (e > s ? plain.slice(s + startKw.length, e) : plain.slice(s + startKw.length)).trim();
  // 去掉开头的冒号/标签残留
  return seg.replace(/^[:：\s]+/, '').replace(/\s{2,}/g, ' ').slice(0, 3000);
}

function extractExamples(html) {
  // 尝试匹配 <pre> 示例块
  const pres = [...html.matchAll(/<pre[^>]*>(.*?)<\/pre>/gs)].map(m => decodeHtml(m[1]).trim());
  return pres.filter(Boolean).slice(0, 6);
}

function decodeHtml(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

/** 延时,避免频率限制 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** 读取本地现有文件名,按题目名建立索引(文件内 [题号] 标题) */
async function existingTitles() {
  const titles = new Set();
  const docs = new Set();

  async function scanDir(dir) {
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { await scanDir(full); continue; }
      if (/\.(py|sql|cpp|java|js|go|rs|c)$/.test(ent.name)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          // 标题:去掉题号前缀
          const titleFromFile = ent.name.replace(/\.(py|sql|cpp|java|js|go|rs|c)$/, '');
          const title = titleFromFile.replace(/^(HJ\d+|ML\d+|SQL\d+)[.\s]+/, '');
          if (title) {
            titles.add(title.trim());
            titles.add(normalize(title));
          }
        } catch {}
      }
      if (ent.name.endsWith('.md')) {
        const title = ent.name.replace(/\.md$/, '').replace(/^(HJ\d+|ML\d+|SQL\d+)[.\s]+/, '');
        if (title) {
          docs.add(title.trim());
          docs.add(normalize(title));
        }
      }
    }
  }

  await scanDir(NC_DIR);
  await scanDir(DOCS_DIR);
  return { titles, docs };
}

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 生成代码文件头(与插件格式兼容) */
function makeCodeHeader(questionNum, title, uuid, questionId, lang) {
  const url = `https://www.nowcoder.com/practice/${uuid}`;
  return [
    `# @nc app=nowcoder id=${uuid} question=${questionId} lang=${lang}`,
    `# ${new Date().toISOString().slice(0, 10)}`,
    `# ${url}`,
    `# [${questionNum}] ${title}`,
    ''
  ].join('\n');
}

function makeCodeFile(questionNum, title, uuid, questionId, lang, code) {
  const ext = langToExt(lang);
  if (ext === 'sql') {
    return [
      `/**`,
      ` * @nc app=nowcoder id=${uuid} question=${questionId} lang=MySQL`,
      ` * ${new Date().toISOString().slice(0, 10)}`,
      ` * https://www.nowcoder.com/practice/${uuid}`,
      ` * [${questionNum}] ${title}`,
      ` */`,
      '',
      code.trim(),
      ''
    ].join('\n');
  }
  const header = makeCodeHeader(questionNum, title, uuid, questionId, lang);
  return header + code.trim() + '\n';
}

function makeMdFile(questionNum, title, difficulty, uuid, category, info, code, lang) {
  const today = new Date().toISOString().slice(0, 10);
  const url = `https://www.nowcoder.com/practice/${uuid}`;
  const ext = langToExt(lang);

  const description = info.description || '待补充';
  let content = `---
title: ${questionNum}. ${title}
platform: NowCoder
difficulty: ${difficulty}
id: ${questionNum}
url: ${url}
tags: []
topics: []
patterns: []
date_added: ${today}
date_reviewed: []
---

# ${questionNum}. ${title}

## 题目描述

${description}

`;

  if (info.inputDesc) {
    content += `## 输入格式

${info.inputDesc}

`;
  }
  if (info.outputDesc) {
    content += `## 输出格式

${info.outputDesc}

`;
  }
  if (info.examples && info.examples.length) {
    content += `## 示例

${info.examples.map((ex, i) => `**示例 ${i + 1}：**

\`\`\`
${ex}
\`\`\`
`).join('\n')}
`;
  }

  content += `---

## 解题思路

> 待补充:由 AI 在后续处理中生成

### 第一步：理解问题本质

### 第二步：暴力解法

### 第三步：优化解法

### 第四步：最优解法

---

## 完整代码实现

\`\`\`${ext}
${code.trim()}
\`\`\`

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

  return content;
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

/** 校验 cookie 是否有效(通过 codeBookDetail 是否被重定向到登录页判断) */
async function checkCookie() {
  const html = await fetchText(`${WWW}/profile/${NOWCODER_UID}/codeBookDetail?submissionId=0`, {
    headers: { 'Referer': `${WWW}/users/${NOWCODER_UID}` }
  });
  // 失效时会跟随 302 到登录页
  return !(/<title>[^<]*登录[^<]*<\/title>/.test(html) || html.includes('callBack=') && html.includes('/login'));
}

async function main() {
  try {
    console.log('🔍 Checking nowcoder cookie validity...');
    // 提交列表接口是公开的(无需 cookie),cookie 仅用于抓取提交代码
    let cookieValid = true;
    try {
      cookieValid = await checkCookie();
    } catch {
      cookieValid = false;
    }
    if (!cookieValid) {
      console.warn('⚠️  NOWCODER_COOKIE may be expired. Code fetching will be skipped; only problem list will sync.');
      console.warn('   Update the NOWCODER_COOKIE secret to enable code sync.');
      console.log('COOKIE_EXPIRED=true'); // workflow 据此创建提醒 issue
    } else {
      console.log('✅ Cookie is valid');
    }

    console.log('🔍 Fetching nowcoder submission history...');
    const records = await fetchSubmissionHistory();
    console.log(`📦 Total submissions: ${records.length}`);

    const accepted = records.filter(r => r.accept === true);
    console.log(`✅ Accepted: ${accepted.length}`);

    const { titles, docs } = await existingTitles();
    console.log(`📁 Existing local problems: ${titles.size} code / ${docs.size} docs`);

    let created = 0;
    let skipped = 0;

    // 对每个 accepted 提交,按题目名去重
    const seen = new Set();
    for (const rec of accepted) {
      const problem = rec.problem || {};
      const questionNum = problem.questionNum || '';
      const title = (problem.title || '').trim();
      if (!title) continue;

      const titleKey = title.toLowerCase().replace(/\s+/g, '');
      const titleNorm = normalize(title);
      if (seen.has(titleKey)) continue;
      seen.add(titleKey);

      // 标题匹配去重:已存在则跳过
      if (titles.has(title) || titles.has(titleKey) || titles.has(titleNorm) || docs.has(title) || docs.has(titleNorm)) {
        skipped++;
        continue;
      }

      await sleep(1000);

      const submissionId = rec.submission?.id;
      if (!submissionId) { skipped++; continue; }

      // 1. 抓取提交代码(cookie 失效时可能拿到登录页 HTML)
      let code = '';
      let lang = 'Python 3';
      try {
        const detailHtml = await fetchText(`${WWW}/profile/${NOWCODER_UID}/codeBookDetail?submissionId=${submissionId}`, {
          headers: { 'Referer': `${WWW}/profile/${NOWCODER_UID}` }
        });
        const detail = parseCodeBookDetail(detailHtml);
        code = detail.code || '';
        lang = normalizeLang(detail.lang || rec.language || 'Python 3');
        if (!code.trim()) {
          // 可能是登录重定向页面,用语言兜底
          lang = normalizeLang(rec.language || lang);
        }
      } catch (e) {
        console.log(`  ⚠️  Failed to fetch code for "${title}": ${e.message}`);
      }

      // 2. 抓取题目详情(难度/描述)
      const uuid = problem.questionUuid || detail.uuid || '';
      let info = { difficulty: 'Easy', description: '', inputDesc: '', outputDesc: '', examples: [] };
      if (uuid) {
        await sleep(500);
        try {
          const practiceHtml = await fetchText(`${WWW}/practice/${uuid}`, {
            headers: { 'Referer': `${WWW}/` }
          });
          info = parsePracticePage(practiceHtml);
        } catch (e) {
          console.log(`  ⚠️  Failed to fetch practice page for "${title}": ${e.message}`);
        }
      }

      // 3. 生成文件
      const category = categorize(questionNum, title);
      const codeDir = path.join(NC_DIR, category);
      const docDir = path.join(DOCS_DIR, category);
      fs.mkdirSync(codeDir, { recursive: true });
      fs.mkdirSync(docDir, { recursive: true });

      const ext = langToExt(lang);
      const safeTitle = sanitizeFilename(title);
      const codeFile = path.join(codeDir, `${questionNum}.${safeTitle}.${ext}`);
      const docFile = path.join(docDir, `${questionNum}.${safeTitle}.md`);

      // 有代码才生成代码文件,否则只生成占位文档(记录题目,代码待 cookie 更新后补充)
      if (code.trim()) {
        fs.writeFileSync(codeFile, makeCodeFile(questionNum, title, uuid, problem.questionId || info.questionId, lang, code));
      }
      fs.writeFileSync(docFile, makeMdFile(questionNum, title, info.difficulty, uuid, category, info, code, lang));

      console.log(`  ✅ Created: ${path.relative(process.cwd(), docFile)}${code.trim() ? ` + ${path.relative(process.cwd(), codeFile)}` : ' (代码待补充)'}`);
      titles.add(title);
      created++;
    }

    console.log(`\n📊 Result: ${created} new, ${skipped} skipped (already exist)`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();