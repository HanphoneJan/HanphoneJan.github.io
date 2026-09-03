# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal tech documentation site built with Docusaurus 3.9, deployed via GitHub Pages to `www.hanphone.top`. The site includes docs, blog, a code-training sub-site (algorithm problem solutions), GitHub Stars showcase, and projects display.

## Commands

```bash
pnpm install          # Install dependencies (Node >= 20, pnpm 9)
pnpm start            # Start dev server on port 3001
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
pnpm sync             # Sync notes from private repo (E:/hanphonejan/hanphone-note)
pnpm sync:ml          # Sync ML notebooks (ipynb -> md via Quarto)
```

## Architecture

### Content sources and data flow

- **Private notes sync** (`scripts/sync-notes.ts`): Reads markdown files from `E:/hanphonejan/hanphone-note`, publishes those with `publish: true` frontmatter to `docs/` or `blog/` (controlled by `type: blog`). Auto-cleans files when `publish` is removed.
- **ML notebook sync** (`scripts/sync-machine-learning.ts`): Converts `.ipynb` files in `code-training/machine-learning/` to markdown via Quarto, outputs to `code-training/docs/machine-learning/`.
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
