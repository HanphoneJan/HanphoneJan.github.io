import fs from 'node:fs'
import path from 'node:path'
import type { App, Page } from 'vuepress/core'
import { BUILD_ID } from '../build-id'
import {
  chunkStem,
  extractRouteChunks,
  SECTION_LABELS,
  sectionOf,
  type OfflineEntry,
  type OfflineManifest,
  type OfflineSection,
  type SectionId,
} from './offline-shared'

export type {
  OfflineEntry,
  OfflineManifest,
  OfflineSection,
  SectionId,
} from './offline-shared'

/**
 * 离线包清单（`/offline-manifest.json`）。
 *
 * 「一键缓存全站」不是把站点塞进 service worker 的**预缓存**（那会变成
 * 首次安装先下 100MB），而是构建期把「有哪些页面、各自的页面 chunk 叫什么、
 * 多大」列成一张表，读者在 `/settings.html` 上按需下载进 CacheStorage。
 *
 * 为什么清单必须在构建期生成：
 *
 * - **页面路径**只有 VuePress 知道（`paths.ts` 把题解压成 `/1`，
 *   blog 插件还生成了 `/tag/*`、`/timeline/*`）。`sitemap.xml` 只覆盖
 *   653 条：207 个标签页、25 个分类页和归档页都不在里面，拿它当清单会
 *   悄悄漏掉四分之一站点。
 * - **页面 chunk 名**带构建哈希（`assets/0001_two_sum-BKeqEtkm.js`），
 *   运行时无从推断。
 * - **体积**要下多少，只有 `stat` 过才知道。
 *
 * 清单只描述「下载什么」，实际缓存走现有的两条 Workbox 路由：
 *   HTML  -> `html-v2`（NetworkFirst：在线永远新、离线回退缓存）
 *   chunk -> `assets`（StaleWhileRevalidate：哈希文件名不可变）
 * 也就是说**不需要为离线包新增 SW 路由**，见 `.vuepress/theme.ts` 的注释。
 *
 * 清单不写进 `static/`（那是构建期整包拷进 dist 的源目录），而是在
 * `onGenerated` 里直接写到 dist 根 —— 它只对本次构建有意义。
 */

/** 页面 HTML 在 dist 里的落盘路径（`/tag/x/` -> `tag/x/index.html`） */
function htmlFileOf(dest: string, url: string): string {
  let clean: string
  try {
    clean = decodeURIComponent(url.split(/[?#]/)[0])
  } catch {
    clean = url.split(/[?#]/)[0]
  }
  if (clean === '/') return path.join(dest, 'index.html')
  if (clean.endsWith('/')) return path.join(dest, clean, 'index.html')
  return path.join(dest, clean)
}

function sizeOf(file: string): number {
  try {
    return fs.statSync(file).size
  } catch {
    return 0
  }
}

/**
 * 构建期算清单。
 *
 * 暴露成函数，好让 `scripts/test-offline.ts` 在真实产物上验口径
 * （页面全覆盖、chunk 文件都存在）。
 */
export function buildManifest(app: App): OfflineManifest {
  const dest = app.dir.dest()
  const assetsDir = path.join(dest, 'assets')
  const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []

  // 1) 路由表（精确）。只认 app-*.js：页面 chunk 的名字也长这样，前缀不同
  const routeChunks = new Map<string, string>()
  for (const file of assets) {
    if (!/^app-.*\.js$/.test(file)) continue
    const source = fs.readFileSync(path.join(assetsDir, file), 'utf8')
    for (const [url, chunk] of extractRouteChunks(source)) routeChunks.set(url, chunk)
  }

  // 2) 兜底：md 文件名恰好等于 chunk 前缀（Vite 用入口模块 basename 命名）
  const byStem = new Map<string, string[]>()
  for (const file of assets) {
    if (!file.endsWith('.js')) continue
    const stem = chunkStem(file)
    if (!stem) continue
    const list = byStem.get(stem) ?? []
    list.push(file)
    byStem.set(stem, list)
  }

  const chunkFor = (page: Page): string | null => {
    // page.path 已经过 encodeURI（见 @vuepress/core 的 resolvePagePath），
    // 但本地手改 path 的情况不一定，两种都试一次
    const exact = routeChunks.get(page.path) ?? routeChunks.get(encodeURI(page.path))
    if (exact) return `assets/${exact}`
    const base = page.chunkFilePathRelative
      ? path.basename(page.chunkFilePathRelative).replace(/\.[^.]+$/, '')
      : null
    const list = base ? byStem.get(base) : undefined
    return list && list.length === 1 ? `assets/${list[0]}` : null
  }

  const sections: Record<string, OfflineSection> = {}
  const bucket = (id: SectionId): OfflineSection =>
    (sections[id] ??= { label: SECTION_LABELS[id], bytes: 0, entries: [] })

  let pageCount = 0
  let chunkless = 0

  for (const page of app.pages) {
    // 404 已经进了预缓存，不必再下一份
    if (page.path === '/404.html') continue
    const file = htmlFileOf(dest, page.path)
    if (!fs.existsSync(file)) continue

    const chunk = chunkFor(page)
    const htmlBytes = sizeOf(file)
    const chunkBytes = chunk ? sizeOf(path.join(dest, chunk)) : 0
    if (!chunk) chunkless++

    const section = bucket(sectionOf(page.path))
    const entry: OfflineEntry = [page.path, chunk, htmlBytes, chunkBytes]
    section.entries.push(entry)
    section.bytes += htmlBytes + chunkBytes
    pageCount++
  }

  // 3) 两类 JSON 资源。离线时没有它们，题解页的「播放」与「自测」都是空的。
  const publicDir = app.dir.public()
  const tracesDir = path.join(publicDir, 'traces')
  if (fs.existsSync(tracesDir)) {
    const section = bucket('traces')
    for (const file of fs.readdirSync(tracesDir).sort()) {
      if (!file.endsWith('.json')) continue
      const bytes = sizeOf(path.join(tracesDir, file))
      section.entries.push([`/traces/${file}`, null, bytes, 0])
      section.bytes += bytes
    }
  }
  const bank = path.join(publicDir, 'quiz', 'bank.json')
  if (fs.existsSync(bank)) {
    const section = bucket('quiz')
    const bytes = sizeOf(bank)
    section.entries.push(['/quiz/bank.json', null, bytes, 0])
    section.bytes += bytes
  }

  // 页面少的板块排在前面，读者一眼能看到「首页那点东西就几十 KB」
  const order: SectionId[] = ['start', 'quiz', 'traces', 'docs', 'training', 'archive']
  const sorted: Record<string, OfflineSection> = {}
  for (const id of order) if (sections[id]) sorted[id] = sections[id]

  const totalBytes = Object.values(sorted).reduce((sum, s) => sum + s.bytes, 0)

  if (chunkless > 0) {
    console.warn(
      `[offline-package] ${chunkless}/${pageCount} 个页面没在路由表里找到 chunk：` +
        '离线时这些页仍能读到正文（SSR 产物），但不会水合（没有交互）。',
    )
  }

  return {
    build: BUILD_ID,
    builtAt: new Date().toISOString(),
    totalBytes,
    pageCount,
    sections: sorted,
  }
}

export const offlinePackagePlugin = (app: App) => ({
  name: 'offline-package',

  /**
   * `onGenerated` 在客户端产物写完之后触发 —— 只有这时 `assets/app-*.js`
   * 与页面 chunk 才存在。dev server 没有这些产物，直接跳过
   * （页面上会显示「开发模式拿不到清单」）。
   */
  onGenerated() {
    if (!app.env.isBuild) return
    const manifest = buildManifest(app)
    fs.writeFileSync(
      app.dir.dest('offline-manifest.json'),
      JSON.stringify(manifest),
      'utf8',
    )
    console.log(
      `[offline-package] build ${manifest.build} · ${manifest.pageCount} 页 · ` +
        `${(manifest.totalBytes / 1024 / 1024).toFixed(1)}MB · ` +
        Object.entries(manifest.sections)
          .map(([id, s]) => `${id} ${s.entries.length}`)
          .join(' / '),
    )
  },
})
