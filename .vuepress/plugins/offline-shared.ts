/**
 * 离线包清单的纯函数部分（不依赖 vuepress / fs）。
 *
 * 单独拆出来是为了让 `scripts/test-offline.ts` 能用 ts-node 直接跑：
 * 插件本体 `import type {App} from 'vuepress/core'`，而 ts-node 的
 * `moduleResolution: node` 解析不了那个包的 exports 映射。
 */

export type SectionId =
  | 'start'
  | 'docs'
  | 'training'
  | 'archive'
  | 'traces'
  | 'quiz'

export const SECTION_LABELS: Record<SectionId, string> = {
  start: '首页与固定页',
  docs: '技术文档',
  training: '代码训练',
  archive: '归档页',
  traces: '题解可视化',
  quiz: '自测题库',
}

/** 一条待缓存资源：`[url, 页面 chunk | null, HTML 字节数, chunk 字节数]` */
export type OfflineEntry = [string, string | null, number, number]

export interface OfflineSection {
  label: string
  bytes: number
  entries: OfflineEntry[]
}

export interface OfflineManifest {
  build: string
  builtAt: string
  totalBytes: number
  pageCount: number
  sections: Record<string, OfflineSection>
}

/**
 * URL -> 板块。**顺序有意义**：`/code-training/tags/xx` 与 `/tag/xx` 是两套
 * 入口，前者跟着代码训练板块走（它在题解页的侧栏里），后者是全站归档。
 */
export function sectionOf(url: string): SectionId {
  const clean = url.split(/[?#]/)[0]
  if (clean === '/docs.html' || clean.startsWith('/docs/')) return 'docs'
  if (clean === '/code-training.html' || clean.startsWith('/code-training/')) {
    return 'training'
  }
  if (/^\/(article|category|tag|timeline|star)\//.test(clean)) return 'archive'
  return 'start'
}

/**
 * 从构建产物的路由表读出「页面 URL -> 页面 chunk 文件名」。
 *
 * 应用外壳（`assets/app-*.js`）里是 Vue Router 的静态路由表，每一项长这样
 * （Vite 打包、变量名已压缩）：
 *
 * ```js
 * [`/code-training/problems/leetcode/1.html`,{loader:()=>Y(()=>import(`./0001_two_sum-BKeqEtkm.js`),[]),meta:{…}}]
 * ```
 *
 * 这是**运行时真的会去 import 的那个文件**，比「按 md 文件名猜」可靠：
 * 生成页（`/tag/*`）根本没有 md 文件，不同目录下的同名 `intro.md` 也会撞名。
 */
export function extractRouteChunks(source: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /\[`(\/[^`]*)`,{loader:\(\)=>[^,]*import\([`"']\.\/([^`"']+)[`"']\)/g
  for (const match of source.matchAll(re)) {
    const [, url, chunk] = match
    if (chunk.endsWith('.js')) map.set(url, chunk)
  }
  return map
}

/** `foo-BKeqEtkm.js` -> `foo`；路由表没覆盖到时的兜底匹配用 */
export function chunkStem(file: string): string | null {
  const match = /^(.*)-[A-Za-z0-9_-]{8}\.js$/.exec(file)
  return match ? match[1] : null
}
