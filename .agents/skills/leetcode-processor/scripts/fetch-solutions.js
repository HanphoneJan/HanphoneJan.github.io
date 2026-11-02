#!/usr/bin/env node
/**
 * 抓一道力扣题的**高赞题解**，给写题解文档的人当素材。
 *
 * ## 为什么要有这一步
 *
 * 自己闭门造车写出来的题解，容易「逻辑自洽但讲法不连贯」：判定标准、关键观察、
 * 代码细节各写各的，读者读到的是一堆并列的结论。高赞题解的价值不在代码，
 * 而在**这类题公认的讲法**——先讲什么、用哪个具象的锚、边界在哪一句话里交代。
 *
 * 所以流程是：先抓 3 篇（按赞数），读完写下「共识 / 分歧」两行，再动笔。
 * **不是照抄**：代码自己写、自己跑；三篇分歧处以能跑过官方样例的为准。
 *
 * ## 口径
 *
 * - **按赞数排序是本地做的**：`questionSolutionArticles` 不传 `orderBy` 时
 *   返回的顺序既不是时间也不是赞数（实测第一页里 531 赞排在 39 赞后面），
 *   而 `SolutionArticleOrderBy` 的合法枚举值拿不到（introspection 被关掉了）。
 *   所以取一页（`first` 默认 30，接口上限也就是 30）、本地按 `upvoteCount` 排。
 * - 赞数太低的（< 20）不当范文，只当线索：它们往往只是贴了份代码。
 * - 输出到 stdout；要落盘用 `--out`。**不要提交抓下来的原文**。
 *
 * 用法：
 *   pnpm solutions:fetch 1456
 *   pnpm solutions:fetch maximum-number-of-vowels-in-a-substring-of-given-length --limit 3
 *   pnpm solutions:fetch https://leetcode.cn/problems/number-of-islands/ --out /tmp/islands.md
 */

const ENDPOINT = 'https://leetcode.cn/graphql/';

const LIST_QUERY = `query($slug: String!, $first: Int) {
  questionSolutionArticles(questionSlug: $slug, first: $first) {
    totalNum
    edges { node { slug title upvoteCount author { username } } }
  }
}`;

const ARTICLE_QUERY = `query($slug: String!) {
  solutionArticle(slug: $slug) { title content upvoteCount author { username } }
}`;

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      referer: 'https://leetcode.cn/',
    },
    body: JSON.stringify({query, variables}),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`返回的不是 JSON（HTTP ${res.status}）：${text.slice(0, 200)}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

/** 题号 / slug / 完整 URL 都接受 */
async function resolveSlug(target) {
  const fromUrl = target.match(/problems\/([^/?#]+)/);
  const raw = fromUrl ? fromUrl[1] : target;
  if (!/^\d+$/.test(raw)) return raw;

  // 1) 先看仓库里已有的题解（frontmatter 里有 `url`，比联网快也更准）
  const local = findLocalDocUrl(raw);
  if (local) {
    const m = local.match(/problems\/([^/?#]+)/);
    if (m) return m[1];
  }

  // 2) 联网：`question` 上没有「按题号查」的参数（questionFrontendId / questionId 都不认），
  //    只能走题单搜索。小数字（如 1）会命中一堆题号里带 1 的题，所以 limit 要放大。
  const data = await gql(
    `query($kw: String!){problemsetQuestionList(categorySlug: "", filters: {searchKeywords: $kw}, limit: 100, skip: 0){
      questions { frontendQuestionId titleSlug }
    }}`,
    {kw: raw},
  );
  const hit = (data?.problemsetQuestionList?.questions ?? []).find(
    (q) => q.frontendQuestionId === raw,
  );
  if (!hit) throw new Error(`找不到题号 ${target}，可以直接传 slug`);
  return hit.titleSlug;
}

/** 在 `code-training/docs/problems/leetcode/*.md` 里按 `id:` 找 `url:` */
function findLocalDocUrl(id) {
  const fs = require('fs');
  const path = require('path');
  // 本文件在 `.agents/skills/leetcode-processor/scripts/`，往上四层才是仓库根。
  // 不用 `process.cwd()`：从别的目录调用时它会指错地方。
  const root = path.resolve(__dirname, '../../../..');
  const dir = path.join(root, 'code-training', 'docs', 'problems', 'leetcode');
  if (!fs.existsSync(dir)) return '';
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const md = fs.readFileSync(path.join(dir, name), 'utf8');
    if (!new RegExp(`^id:\\s*${id}\\s*$`, 'm').test(md)) continue;
    const url = md.match(/^url:\s*(\S+)\s*$/m);
    if (url) return url[1];
  }
  return '';
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };

  if (!target) {
    console.error('用法：pnpm solutions:fetch <题号|slug|URL> [--limit 3] [--out 文件]');
    process.exit(2);
  }

  const limit = Number(flag('--limit', '3'));
  // 一页最多 30 条（first 取 50 会返回「分页参数有误」），30 条足够覆盖高赞区。
  const pageSize = Number(flag('--page-size', '30'));
  const out = flag('--out', '');
  const minVotes = Number(flag('--min-votes', '20'));

  const slug = await resolveSlug(target);
  const list = await gql(LIST_QUERY, {slug, first: pageSize});
  const edges = list?.questionSolutionArticles?.edges ?? [];
  if (!edges.length) throw new Error(`${slug} 查不到题解（slug 不对，或这道题还没人写）`);

  const ranked = edges
    .map((e) => e.node)
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, limit);

  const lines = [
    `# ${slug} 的高赞题解（按赞数，取前 ${ranked.length}/${edges.length}）`,
    '',
    '> 只作讲法参考：共识当主线，分歧以能跑过官方样例的实现为准。代码自己写、自己跑。',
    '',
  ];

  for (const node of ranked) {
    const low = node.upvoteCount < minVotes ? '（赞数偏低，只当线索）' : '';
    lines.push(
      `## ${node.title}${low}`,
      '',
      `- 作者：${node.author?.username ?? '?'} · 赞 ${node.upvoteCount}`,
      `- 原文：https://leetcode.cn/problems/${slug}/solutions/${node.slug}`,
      '',
    );

    const {solutionArticle: article} = await gql(ARTICLE_QUERY, {slug: node.slug});
    lines.push(article?.content ?? '_（取不到正文）_', '', '---', '');
  }

  const text = lines.join('\n');
  if (out) {
    require('fs').writeFileSync(out, text);
    console.error(`已写入 ${out}（${text.length} 字符）`);
  } else {
    process.stdout.write(text);
  }
}

main().catch((err) => {
  console.error(`失败：${err.message}`);
  process.exit(1);
});
