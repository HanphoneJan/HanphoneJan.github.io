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
