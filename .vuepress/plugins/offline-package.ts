import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { App, Page } from 'vuepress/core'
import { PYODIDE_RUNTIME_FILES } from '../../src/components/training/pyrunner/runtime-files'
import { BUILD_ID } from '../build-id'
import { allRemoteImages, allUsedImages } from '../static-images'
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
 * 归档页顶部那张「全站标签云 / 分类计数表」。
 *
 * `/tag/<名>/` 与 `/category/<名>/` 的 HTML 一上来就是这张**全站**列表：
 * 216 个标签及各自条数（单页 56KB 里约 44KB 是它），分类页同理 27 项。
 * 新增一篇文档就会改动相关计数，217 张标签页的 HTML 跟着全变 —— 指纹是按
 * 整页 HTML 算的，于是设置页每次都报「归档页 200+ 项内容更新」，要把 14MB
 * 重下一遍。而这张表对「这一页离线能不能看」没有意义（在线走 NetworkFirst
 * 永远是最新的），所以算指纹时先抹掉它，只留文章列表这一段的差异。
 *
 * **只抹条目页**：`/tag/`、`/category/` 两个索引页整页就是这张表，抹掉等于
 * 让它永不更新，所以用 `id="article-list"` 区分。
 */
const GLOBAL_LIST_RE = /<ul class="(?:vp-tag-list|vp-category-list)">[\s\S]*?<\/ul>/g

function stripGlobalArchiveLists(html: string): string {
  if (!html.includes('id="article-list"')) return html
  return html.replace(GLOBAL_LIST_RE, '<ul class="GLOBAL"></ul>')
}

/**
 * 页面的「内容」指纹：**先把 app 的构建哈希抹平**再算 sha1。
 *
 * 每页 HTML 里都写着 `<script src="/assets/app-<hash>.js">`，而它每次构建都会
 * 改名。直接哈希 HTML 的话，一次只改一篇文档的部署也会让 894 页全部「变了」。
 * 抹平这一处之后，指纹只随页面自身内容变 —— 设置页据此保留旧 HTML（连同它
 * 引用的那份 app），真正做到只下改到的页面。
 */
function contentHashOfHtml(file: string, extraFiles: string[] = []): string {
  try {
    // 把所有「构建产物引用」抹成常量：app-<hash>.js 之外还有 style-<hash>.css
    // （它每次构建也会改名），以及以后可能加的其它 `src=/assets/...`。
    // 只动 src/href 属性里的资源路径，正文里的代码示例不受影响。
    const html = stripGlobalArchiveLists(
      fs
        .readFileSync(file, 'utf8')
        .replace(/\b(src|href)="\/assets\/[^"]*"/g, '$1="/assets/BUILD"'),
    )
    const hash = createHash('sha1').update(html)
    // 整页孤岛的「内容」全在它自己的 chunk 里（GitHub 数据内联在那份 JS 中），
    // 只看 HTML 的话，每天的定时刷新不会让这页被标记成「有更新」。
    for (const extra of extraFiles) hash.update('\0').update(fs.readFileSync(extra))
    return hash.digest('hex').slice(0, 10)
  } catch {
    return ''
  }
}

/**
 * 整页 React 孤岛的页面代码：从应用外壳里 `import()`，路由表里没有。
 *
 * `StarsMount` / `ProjectsMount` 在 `client.ts` 里全局注册，挂进页面的只是
 * 一个空 div；真正的组件（连同内联的 GitHub 数据）由外壳懒加载
 * （`` import(`./stars-*.js`) ``）。它和页面入口 chunk 用同一个 basename
 * （Vite 按入口模块所在目录命名），所以按 stem 配对。
 *
 * 键是页面 URL，值是 chunk 名的 stem。
 */
const ISLAND_CHUNK_STEMS: Record<string, string> = {
  '/stars.html': 'stars',
  '/projects.html': 'projects',
}

/**
 * 一个 chunk 的静态依赖闭包（`from"./x.js"` / `import"./x.js"`），含它自己。
 *
 * 整页孤岛要能**单独**缓存（设置页上点「GitHub Stars」→ 缓存 → 断网打开
 * 就该有内容），而它 import 的 `jsx-runtime-*.js` / `Layout-*.js` 只有几 KB，
 * 却在「共享脚本」那 95 个文件里。所以按闭包收进自己的板块；应用外壳
 * （`app-*.js`）不算 —— 下页面时 `ensureAsset` 会连它一起留住。
 */
function staticClosure(entryFile: string, assetsDir: string): string[] {
  const seen = new Set<string>()
  const walk = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    const full = path.join(assetsDir, file)
    if (!fs.existsSync(full)) return
    const source = fs.readFileSync(full, 'utf8')
    for (const match of source.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) {
      if (match[1].startsWith('app-')) continue
      walk(match[1])
    }
  }
  walk(entryFile)
  return [...seen]
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
  /** 整页孤岛的页面代码（`stars-*.js` / `projects-*.js`），别在共享脚本里再来一份 */
  const islandFiles = new Set<string>()
  let islandMissing = 0

  /**
   * 页面自己的那份懒加载代码。按 stem 配对，且要求**恰好一个候选**：
   * `stars-<hash>.js` 可能既是页面入口 chunk 又是孤岛组件，路由表里的那个
   * 先扣掉，剩下的才是孤岛。
   */
  const islandChunkFor = (page: Page): string | null => {
    const stem = ISLAND_CHUNK_STEMS[page.path]
    if (!stem) return null
    const candidates = (byStem.get(stem) ?? []).filter(
      (file) => !pageChunks.has(file) && !islandFiles.has(file),
    )
    if (candidates.length !== 1) {
      islandMissing++
      return null
    }
    islandFiles.add(candidates[0])
    return `assets/${candidates[0]}`
  }

  for (const page of app.pages) {
    // 404 已经进了预缓存，不必再下一份
    if (page.path === '/404.html') continue
    const file = htmlFileOf(dest, page.path)
    if (!fs.existsSync(file)) continue

    const chunk = chunkFor(page)
    const island = islandChunkFor(page)
    const extras: Array<[string, number]> = []
    if (island) {
      const own = island.replace(/^assets\//, '')
      for (const file of staticClosure(own, assetsDir)) {
        // 别的页面的入口 chunk 不当依赖重复下发；应用外壳由 ensureAsset 处理
        if (file !== own && (pageChunks.has(file) || file.startsWith('app-'))) continue
        extras.push([`assets/${file}`, sizeOf(path.join(assetsDir, file))])
      }
    }
    const htmlBytes = sizeOf(file)
    const chunkBytes =
      (chunk ? sizeOf(path.join(dest, chunk)) : 0) +
      extras.reduce((sum, [, bytes]) => sum + bytes, 0)
    if (!chunk) chunkless++

    if (chunk) pageChunks.add(chunk.replace(/^assets\//, ''))

    const section = bucket(sectionOf(page.path))
    const entry: OfflineEntry = [
      page.path,
      chunk,
      htmlBytes,
      chunkBytes,
      contentHashOfHtml(
        file,
        extras.map(([rel]) => path.join(dest, rel)),
      ),
      extras.length ? extras : null,
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
      file.endsWith('.js') &&
      !file.startsWith('app-') &&
      !pageChunks.has(file) &&
      !islandFiles.has(file),
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

  // 正文插图：`static/diagrams/**` 的结构图 + `static/img/**` 的项目配图。
  //
  // URL 必须用**带内容版本**的那一份（与 markdown 规则共用 `static-images.ts`）：
  // 页面请求的是 `/img/x.png?v=<hash>`，这里写裸文件名的话，下完一轮离线仍然
  // 是裂图 —— 缓存键对不上。
  // 只收「正文真的引用过」的那些（`noteUsedImage` 登记），没引用的图标与旧稿
  // 残留不必下发。
  const images = allUsedImages()
  if (images.length > 0) {
    const section = bucket('images')
    for (const { url, info } of images) {
      section.entries.push([url, null, info.bytes, 0, info.version])
      section.bytes += info.bytes
    }
  }

  // 外链图（`hanphone.top` 上那 500 多张）：仓库里没有文件，只能列 URL。
  //
  // - `bytes` 写 0：构建期不联网，拿不到体积；真实大小要等下载时看
  //   `content-length`，所以这一行只按「张」计进度（行上显示「大小未知」）。
  // - 指纹用 `sha1(url)`：满足「每条都有 10 位指纹」的断言，且因为 URL 不变
  //   就永远判「没变」—— 外链本来也无法判断内容有没有换。
  const remote = allRemoteImages()
  if (remote.length > 0) {
    const section = bucket('remote')
    for (const url of remote) {
      section.entries.push([
        url,
        null,
        0,
        0,
        createHash('sha1').update(url).digest('hex').slice(0, 10),
      ])
    }
  }

  // 页面少的板块排在前面，读者一眼能看到「首页那点东西就几十 KB」
  const order: SectionId[] = [
    'start',
    'stars',
    'projects',
    'shared',
    'pyodide',
    'quiz',
    'images',
    'remote',
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

  if (islandMissing > 0) {
    console.warn(
      `[offline-package] ${islandMissing} 个整页孤岛没配上页面代码（chunk 名不再等于页面名？）：` +
        '设置页里这些页面只会下到空壳，离线打开是一片空白。',
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
