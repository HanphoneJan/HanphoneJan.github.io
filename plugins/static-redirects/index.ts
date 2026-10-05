import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

/**
 * 构建后写几个静态 HTML 重定向页。
 *
 * ## 为什么不用现成机制
 *
 * 三条路都试过/查过：
 *
 * 1. `redirects` 选项 —— **3.9.2 的 `plugin-content-docs` 已经没有了**。
 *    整个包里搜不到 `redirect` 这个词（`@docusaurus/plugin-content-pages`
 *    才有）。曾经有过的那个选项随 v4 future flags 一起被摘掉了。
 * 2. `docusaurus-plugin-client-redirects` —— 本仓库没装，而且它会在
 *    客户端用 `history.replaceState` 跳，对 SEO 与「地址栏是否闪一下」都不如
 *    服务端的 301 干净；这是纯静态站，没有服务端。
 * 3. `src/pages/` 下写一个 React 组件做跳转 —— 首屏会先白一下再跳，
 *    而且 pages 路由与 docs 路由撞车时行为依赖加载顺序，最难排查。
 *
 * 所以在 `postBuild` 里直接吐 HTML：一个 `<meta http-equiv="refresh">`
 * 就能在**没有 JS** 的情况下跳转，再加 `<link rel="canonical">` 让搜索引擎
 * 知道真正地址是哪个。GitHub Pages 对无扩展名 URL 会做
 * 「找同名 `.html`」的解析（`trailingSlash: false`），所以文件写成
 * `<path>.html` 就能被 `/path` 命中 —— 这一点和 `check-vis` 里
 * 「必须用 `docusaurus serve` 而不是 `python3 -m http.server`」是同一条依赖。
 *
 * ## 什么时候该往表里加一行
 *
 * **移动了某个已上线页面的地址时。** 只给「本来就 404」的路径加重定向
 * 没有意义（那不是回归，是本来就坏）。
 * 站内链接请改源头，别在这里攒条目。
 */

/** `from` 用站内路径（不带 baseUrl），`to` 也一样。 */
const REDIRECTS: ReadonlyArray<{from: string; to: string; why: string}> = [
  {
    from: '/code-training/intro',
    to: '/code-training',
    why: '落地页挂到板块根路径（intro.md 的 slug: /）之后，旧地址要兜住',
  },
  {
    from: '/docs/intro',
    to: '/docs',
    why: '同上；首页「开始阅读」按钮原先就指着这个地址',
  },
];

/**
 * 站内路径 → 产物里的文件。
 *
 * `trailingSlash: false` 下规则是**一律加 `.html`**：
 *
 * ```
 * /code-training                        -> code-training.html
 * /code-training/intro                  -> code-training/intro.html
 * /code-training/problems/leetcode/0001  -> code-training/problems/leetcode/0001.html
 * ```
 *
 * 第一条是实测出来的、也是一开始写错的那条：以为 `/a` 会落到
 * `a/index.html`（那是 pages 路由的形状），实际 docs 的 `slug: /`
 * 落在 `a.html`。两者的区别很要紧 —— 猜错的话自检会报
 * 「目标不存在」并跳过写入，于是重定向**根本没生成**，
 * 而日志里那行「写了 N 个」照旧打印（那是表的长度，不是真正写出的数量，
 * 连着这个坑一起数错了两次）。
 */
function fileFor(outDir: string, sitePath: string): string {
  return path.join(outDir, `${sitePath.replace(/^\/+/, '')}.html`);
}

/** 拼一个可读的错误页：跳转失效时至少告诉人该去哪。 */
function redirectHtml(target: string, why: string): string {
  // 用单引号包属性，目标里若含单引号要转义 —— 反过来会把 HTML 提前闭合。
  const href = target.replace(/'/g, '&#39;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0; url=${href}">
<link rel="canonical" href="${href}">
<title>正在跳转…</title>
</head>
<body>
<p>这个地址已移动到 <a href="${href}">${href}</a>（${why}）。</p>
<script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>
`;
}

export default function staticRedirectsPlugin(_context: LoadContext): Plugin<void> {
  return {
    name: 'static-redirects',

    async postBuild({outDir, siteConfig}) {
      const base = siteConfig.baseUrl.endsWith('/')
        ? siteConfig.baseUrl
        : `${siteConfig.baseUrl}/`;

      let written = 0;
      for (const {from, to, why} of REDIRECTS) {
        // 自检：`to` 指向的产物必须真的存在。
        // 拼错一个字母的话重定向会指向另一个 404 —— 而重定向页本身
        // 是 200，站点看起来「正常」，只有真去点的人会发现。
        const targetFile = fileFor(outDir, to);
        if (!fs.existsSync(targetFile)) {
          console.warn(
            `[static-redirects] 跳过 ${from}：目标 ${to} 在产物里不存在（找的是 ${path.relative(outDir, targetFile)}）`,
          );
          continue;
        }

        const file = fileFor(outDir, from);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, redirectHtml(`${base}${to.replace(/^\/+/, '')}`, why), 'utf8');
        written++;
      }

      // 打印**真正写出的数量**：跳过任何一条时这个数会小于表长，
      // 而表长那个数每次都一样，看不出「其实一条都没写成」。
      if (written !== REDIRECTS.length) {
        console.warn(
          `[static-redirects] 只写出 ${written}/${REDIRECTS.length} 条，其余见上面的警告`,
        );
      } else {
        console.log(`[static-redirects] 写出 ${written} 条重定向`);
      }
    },
  };
}
