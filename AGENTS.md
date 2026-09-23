# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Personal tech documentation site built with Docusaurus 3.9, deployed via GitHub Pages to `www.hanphone.top`. The site includes docs, blog, a code-training sub-site (algorithm problem solutions), GitHub Stars showcase, and projects display.

## Commands

```bash
pnpm install          # Install dependencies (Node 24 + pnpm 11)
pnpm start            # Start dev server on port 3001
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
pnpm sync             # Sync notes from private repo (E:/hanphonejan/hanphone-note)
pnpm sync:ml          # Sync ML notebooks (ipynb -> md via Quarto)
```

> **环境版本必须对齐**：本地与 CI 均使用 **Node 24 + pnpm 11**（见 `.github/workflows/`）。改动 CI 或依赖时，确保两者一致，否则 `pnpm install --frozen-lockfile` 在 CI 上会失败。

## Architecture

### Content sources and data flow

- **Private notes sync** (`scripts/sync-notes.ts`): Reads markdown files from `E:/hanphonejan/hanphone-note`, publishes those with `publish: true` frontmatter to `docs/` or `blog/` (controlled by `type: blog`). Auto-cleans files when `publish` is removed.
- **ML notebook sync** (`scripts/sync-machine-learning.ts`): Converts `.ipynb` files in `code-training/machine-learning/` to markdown via Quarto, outputs to `code-training/docs/machine-learning/`. 页面标题优先取源 notebook 的 `metadata.title`（可读中文标题），否则回退到文件名。
- **GitHub data** (`data/`): `github-stars.json`, `projects.json`, `star-tags.json` are auto-fetched/updated by GitHub Actions workflows and consumed at build time by the Stars and Projects pages via `@site/data/`.
- **LeetCode progress sync** (`scripts/sync-leetcode.js`): Pulls accepted LeetCode (leetcode.cn) submissions using the `LEETCODE_SESSION` cookie (stored as GitHub secret), diffs against local `code-training/leetcode/`, and generates new `*.py` + `docs/problems/leetcode/*.md` files. Runs every 2 days via `sync-leetcode.yml`; commits only when new problems exist. The script also **auto-refreshes the session cookie** (LeetCode returns a renewed `LEETCODE_SESSION` in `Set-Cookie` on every GraphQL call); the workflow writes it back to the `LEETCODE_SESSION` secret when a PAT (`SYNC_PAT` / `STARS_PAT`) is available.
- **NowCoder progress sync** (`scripts/sync-nowcoder.js`): Pulls accepted NowCoder submissions using `NOWCODER_COOKIE` + `NOWCODER_UID` secrets, diffs against local `code-training/nowcoder/`, and generates new code files + `docs/problems/nowcoder/*.md`. Runs every 2 days via `sync-nowcoder.yml`; commits only when new problems exist.

### Dual-plugin docs setup

The site uses two `@docusaurus/plugin-content-docs` instances:
1. **Default** (id: `default`) — main docs at `/docs`, sidebar from `sidebars.ts`
2. **Code-training** (id: `code-training`) — algorithm training at `/code-training`, sidebar from `code-training/sidebars.ts`

### Custom pages

- `src/pages/index.tsx` — Landing page
- `src/pages/stars/index.tsx` — GitHub Stars showcase with search, tag filter, sort, card/list views
- `src/pages/projects/index.tsx` — GitHub projects showcase with search, sort, card/list views
- `src/components/GiscusComments.tsx` — Giscus comment widget, used in swizzled theme components

### Swizzled theme components

- `src/theme/BlogLayout/index.tsx` — Wraps blog layout
- `src/theme/BlogPostPage/` — Custom blog post page (with StructuredData, Metadata)
- `src/theme/DocItem/Layout/` — Custom doc item layout (adds Giscus comments to docs)

### CI/CD (GitHub Actions)

- **deploy.yml**: Triggered on push to `main`. Fetches latest GitHub data (stars/projects, no commit), builds Docusaurus site and deploys to GitHub Pages.
- **refresh-data.yml**: Daily at 3am UTC. Fetches stars and projects via `scripts/fetch-stars.js` / `scripts/fetch-projects.js`, then rebuilds and redeploys. Data is used at build time only — **never committed to git**, keeping history clean. `data/*.json` are fallback snapshots for local development.
- **sync-leetcode.yml**: Every 2 days at 3am UTC + manual dispatch. Runs `scripts/sync-leetcode.js` with the `LEETCODE_SESSION` secret, auto-refreshes the cookie into the secret (needs `SYNC_PAT`/`STARS_PAT`), and commits new problems. **Only commits when `git status` has changes** — no-op sync produces no commit.
- **sync-nowcoder.yml**: Every 2 days at 3am UTC + manual dispatch. Runs `scripts/sync-nowcoder.js` with the `NOWCODER_COOKIE` and `NOWCODER_UID` secrets, and commits new problems. **Only commits when `git status` has changes** — no-op sync produces no commit.

### Key config details

- `docusaurus.config.ts` uses `future.v4: true` (Docusaurus v4 future flags)
- Local search via `@easyops-cn/docusaurus-search-local` (indexes both `docs` and `code-training`)
- Mermaid diagrams enabled
- Giscus comments configured (repo: `HanphoneJan/HanphoneJan.github.io`)
- `trailingSlash: false` — generates `/path/index.html` for GitHub Pages compatibility
- Domain redirect JavaScript in `headTags` for `www.hanphone.top` → `hanphone.cn`

### Python environment

Minimal Python project (`pyproject.toml`, `uv.lock`) with numpy dependency. The `main.py` is a placeholder. Managed with `uv`.

## Development experience & known pitfalls

### Typecheck (`pnpm typecheck`)

- **`@types/react` / `@types/react-dom` 必须是 devDependencies 直接依赖**。若仅为传递依赖，pnpm 不会 hoist 到根 `node_modules/@types/`，导致 JSX namespace（`ElementChildrenAttribute`）无法解析，所有函数组件的 `children` 检查报错（TS2741）。报错现象：`Property 'children' is missing in type '{}'`。
- **React 19 移除了全局 `JSX` namespace**。组件返回值类型用 `React.ReactNode` / `React.ReactElement`，不要用 `JSX.Element`。
- **themeConfig 类型增强**：`src/types/giscus.d.ts` 通过 `declare module '@docusaurus/theme-common'` + `interface ThemeConfig` 增强。注意 **不能增强 type alias**（如 `@docusaurus/preset-classic` 的 `ThemeConfig` 是 `A & B & C` 类型别名，interface 无法与之合并，会导致增强后丢失 `colorMode` 等字段）。
- swizzled 组件（`src/theme/`）若 `import type {Props} from '@theme/...'` 解析失败，应在本地定义并导出 `Props`。

### CI/CD (GitHub Actions)

- **Node 版本必须与本地对齐**（当前 Node 24）。此前 CI 用 Node 20 导致 `pnpm install --frozen-lockfile` 失败。
- **不要用 `actions/setup-node` 或 `pnpm/action-setup` 的 `cache: 'pnpm'`**——在 pnpm 11 下缓存恢复失败。直接无缓存安装最可靠。
- **pnpm 11 的 build 脚本白名单**：`core-js`/`core-js-pure` 需在 `pnpm-workspace.yaml` 配置 `allowBuilds`（pnpm 11 不再读取 package.json 的 `pnpm.onlyBuiltDependencies`）。单项目也可用 `pnpm-workspace.yaml` 仅存该配置（省略 `packages` 字段即单根包）。

### ML notebooks (`code-training/machine-learning/`)

- 源 `.ipynb` 经 Quarto 转为 `code-training/docs/machine-learning/` 下的 md，**只改源 ipynb，不要直接改生成的 md**（sync 会覆盖）。
- 阅读体验规范：拆分单一代码块为「markdown 讲解 + 分段代码」结构，中文讲解、`#`/`##` 分层、数学公式；顶层 `metadata` 设 `title` 为可读中文标题。
- Quarto 未安装时无法本地跑 `pnpm sync:ml`，可用独立安装验证。

### LeetCode 同步 (`scripts/sync-leetcode.js`)

- 用途：平板/手机上用力扣 App 做题后，定时自动把新 AC 的题同步为 `code-training/leetcode/{id}.{slug}.py` + `docs/problems/leetcode/*.md`。
- **cookie 续期**：每次 GraphQL 调用，力扣都会在 `Set-Cookie` 返回新的 `LEETCODE_SESSION`。脚本末尾主动调用 `userStatus` 触发续期，把新 cookie 写到 `.lc-cookie.tmp`（已 gitignore），workflow 据此更新 secret。
- **标题匹配去重**：脚本先读本地 `.py` 文件头部 `# [N] 中文标题` 注释，与提交列表的中文标题比对，已存在的直接跳过，**不会**调 detail API（避免力扣频率限制）。
- **slug 差异**：力扣 API 的 `titleSlug`（如 `3sum-closest`）可能与插件生成的文件名 slug（`3-sum-closest`）不一致。文件名以标题匹配为准，新增文件用 API slug。
- **新题生成的 md 是「结构化占位」**：含题目描述/示例/代码，解题思路留待补充。处理已同步题目的题解时，遵循 `code-training/AGENTS.md` 的撰写规范。

### 牛客同步 (`scripts/sync-nowcoder.js`)

- 用途：平板/手机上用牛客 App 做题后，定时自动把新通过（accept=true）的题同步为 `code-training/nowcoder/{分类}/{题号}.{标题}.{ext}` + `docs/problems/nowcoder/*.md`。
- **接口**：提交列表用 `POST /api/sparta/user/question-training/submission-history`（body `{pageNo,pageSize,userId}`，**公开接口，无需 cookie**）；提交代码抓 `GET /profile/{uid}/codeBookDetail?submissionId=`（HTML 第一个 `<pre>` 块，**需 cookie**）；题目难度/描述抓 `GET /practice/{uuid}`。
- **分类规则**：题号前缀 `HJ` → 华为机试、`SQL` → 牛客题霸-SQL篇、`ML` → 机器学习，否则按标题关键词判断。
- **标题匹配去重**：牛客题号会变动（如 HJ16↔HJ85），所以按**题目名**与本地文件比对（忽略空格/大小写），已存在的跳过，不重复生成。
- **所需 secrets**：`NOWCODER_COOKIE`（完整 cookie 串）、`NOWCODER_UID`（数字用户 ID）。
- **cookie 过期处理（牛客无自动续期）**：牛客没有力扣那样的服务器端滚动续期机制，认证 cookie 过期后必须手动重新登录更新。但提交列表接口是公开的，所以 cookie 失效时脚本**降级运行**：仍同步新题生成「代码待补充」占位文档，打印 `COOKIE_EXPIRED=true`。workflow 检测到该标记后以**失败**退出（不创建公开 issue），利用 GitHub 的 workflow 失败通知私密提醒仓库 owner 更新 secret——不会在公开仓库暴露任何信息。牛客「记住我」登录后 cookie 通常有效数个月，更新频率很低。
