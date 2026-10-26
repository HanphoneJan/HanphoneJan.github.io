import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { App, Page } from 'vuepress/core'
import { PYODIDE_RUNTIME_FILES } from '../../src/components/training/pyrunner/runtime-files'
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
 * 内容指纹（sha1 前 10 位）。
 *
 * 设置页拿它判断「这一项到底变没变」：只比哈希、不再发请求。用内容哈希而不是
 * mtime —— 每次构建所有文件都会重写，mtime 必然全变。
 */
function hashOf(file: string): string {
  try {
    return createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10)
  } catch {
    return ''
  }
}

/**
 * 页面的「内容」指纹：**先把 app 的构建哈希抹平**再算 sha1。
 *
 * 每页 HTML 里都写着 `<script src="/assets/app-<hash>.js">`，而它每次构建都会
 * 改名。直接哈希 HTML 的话，一次只改一篇文档的部署也会让 894 页全部「变了」。
 * 抹平这一处之后，指纹只随页面自身内容变 —— 设置页据此保留旧 HTML（连同它
 * 引用的那份 app），真正做到只下改到的页面。
 */
function contentHashOfHtml(file: string): string {
  try {
    // 把所有「构建产物引用」抹成常量：app-<hash>.js 之外还有 style-<hash>.css
    // （它每次构建也会改名），以及以后可能加的其它 `src=/assets/...`。
    // 只动 src/href 属性里的资源路径，正文里的代码示例不受影响。
    const html = fs
      .readFileSync(file, 'utf8')
      .replace(/\b(src|href)="\/assets\/[^"]*"/g, '$1="/assets/BUILD"')
    return createHash('sha1').update(html).digest('hex').slice(0, 10)
  } catch {
    return ''
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
  /**
   * 已经作为「页面 chunk」下发过的文件，别在共享脚本里再来一份。
   *
   * 路由表里的全部 chunk 先记一遍（含别名路由指向的同一份），页面解析出来的
   * 再补一遍 —— 后者覆盖「路由表没写、靠文件名兜底匹配到」的情况。
   */
  const pageChunks = new Set<string>(routeChunks.values())

  for (const page of app.pages) {
    // 404 已经进了预缓存，不必再下一份
    if (page.path === '/404.html') continue
    const file = htmlFileOf(dest, page.path)
    if (!fs.existsSync(file)) continue

    const chunk = chunkFor(page)
    const htmlBytes = sizeOf(file)
    const chunkBytes = chunk ? sizeOf(path.join(dest, chunk)) : 0
    if (!chunk) chunkless++

    if (chunk) pageChunks.add(chunk.replace(/^assets\//, ''))

    const section = bucket(sectionOf(page.path))
    const entry: OfflineEntry = [
      page.path,
      chunk,
      htmlBytes,
      chunkBytes,
      contentHashOfHtml(file),
    ]
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
      const full = path.join(tracesDir, file)
      const bytes = sizeOf(full)
      section.entries.push([`/traces/${file}`, null, bytes, 0, hashOf(full)])
      section.bytes += bytes
    }
  }
  const bank = path.join(publicDir, 'quiz', 'bank.json')
  if (fs.existsSync(bank)) {
    const section = bucket('quiz')
    const bytes = sizeOf(bank)
    section.entries.push(['/quiz/bank.json', null, bytes, 0, hashOf(bank)])
    section.bytes += bytes
  }

  // 4) 页面之外被懒加载的脚本（约 3MB）。
  //
  // 只下 HTML + 页面 chunk 的话，题解页离线打开是「能读，但运行条/播放器/
  // mermaid/公式全都不出现」—— 那些是**页面 chunk 之外**的懒加载 chunk
  // （`SnippetBar-*.js`、`runner-*.js`、`CodeEditor-*.js`、mermaid 的几十个小
  // chunk…）。它们不属于任何一条路由，路由表里找不到，只能按「不是页面
  // chunk、也不是已进预缓存的外壳」筛出来。
  const sharedFiles = assets.filter(
    (file) =>
      file.endsWith('.js') && !file.startsWith('app-') && !pageChunks.has(file),
  )
  if (sharedFiles.length > 0) {
    const section = bucket('shared')
    for (const file of sharedFiles.sort()) {
      const bytes = sizeOf(path.join(assetsDir, file))
      section.entries.push([
        `/assets/${file}`,
        null,
        bytes,
        0,
        hashOf(path.join(assetsDir, file)),
      ])
      section.bytes += bytes
    }
  }

  // 5) Python 运行时（12.9MB）。文件清单与缓存名来自
  //    `src/components/training/pyrunner/runtime-files.ts` —— 那是客户端
  //    fetch 拦截、构建期清单、设置页三方共用的唯一口径。
  //    `static/pyodide/` 是 gitignore 的（CI 在 build 前 `node
  //    scripts/fetch-pyodide.js` 现下），本地没同步时这块就不出现。
  const pyodideDir = path.join(publicDir, 'pyodide')
  const pyodideFiles = PYODIDE_RUNTIME_FILES.filter((name) =>
    fs.existsSync(path.join(pyodideDir, name)),
  )
  if (pyodideFiles.length > 0) {
    const section = bucket('pyodide')
    for (const name of pyodideFiles) {
      const full = path.join(pyodideDir, name)
      const bytes = sizeOf(full)
      section.entries.push([`/pyodide/${name}`, null, bytes, 0, hashOf(full)])
      section.bytes += bytes
    }
    if (pyodideFiles.length < PYODIDE_RUNTIME_FILES.length) {
      console.warn(
        `[offline-package] static/pyodide 里只有 ${pyodideFiles.length}/${PYODIDE_RUNTIME_FILES.length} 个运行时文件，` +
          '设置页的「Python 运行时」会少几项（先 pnpm sync:pyodide）',
      )
    }
  }

  // 页面少的板块排在前面，读者一眼能看到「首页那点东西就几十 KB」
  const order: SectionId[] = [
    'start',
    'shared',
    'pyodide',
    'quiz',
    'traces',
    'docs',
    'training',
    'archive',
  ]
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
