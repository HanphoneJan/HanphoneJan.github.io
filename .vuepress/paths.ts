import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

/**
 * 内容目录 -> 线上 URL。
 *
 * 这套规则是从旧 Docusaurus 站点的真实产物里反推出来的，**不是猜的**：
 * 522 篇文档逐条比对，0 条不符（见 `.vuepress/README.md` 的核对方法）。
 *
 *   docs/前端/Vue基础.md                    -> /docs/前端/Vue基础
 *   docs/intro.md            (slug: /)      -> /docs
 *   code-training/docs/intro.md (slug: /)   -> /code-training
 *   code-training/docs/problems/leetcode/0001_two_sum.md (id: 1)
 *                                           -> /code-training/problems/leetcode/1
 *
 * 最后一段的取值顺序：frontmatter.slug（`/` 表示板块根）> frontmatter.id > 文件名。
 * 力扣题解靠 `id: 1` 把 `0001_two_sum` 压成 `1`，牛客靠 `id: HJ48` 把
 * `HJ48.从单向链表中删除指定值的节点` 压成 `HJ48` —— 这两类 URL 已经在线上
 * 存在了，改掉就等于让所有外链和搜索结果 404。
 */
export interface PageMeta {
  title?: string
  id?: string | number
  slug?: string
  sidebar_position?: number
  sidebar_label?: string
  order?: number
  tags?: string[]
  difficulty?: string
  platform?: string
  description?: string
  [key: string]: unknown
}

export function readFrontMatter(filePath: string): PageMeta {
  try {
    return (matter(fs.readFileSync(filePath, 'utf8')).data ?? {}) as PageMeta
  } catch {
    return {}
  }
}

/** 相对 source 目录的 posix 路径 */
export function relativeSource(sourceDir: string, filePath: string): string {
  return path.relative(sourceDir, filePath).split(path.sep).join('/')
}

export function legacyPathFor(
  sourceDir: string,
  filePath: string,
  fm?: PageMeta,
): string | null {
  const rel = relativeSource(sourceDir, filePath)

  // 站点首页单独放在根目录的 index.md
  if (rel === 'index.md') return '/'

  let base: string
  let rest: string

  if (rel.startsWith('docs/')) {
    base = '/docs'
    rest = rel.slice('docs/'.length)
  } else if (rel.startsWith('code-training/docs/')) {
    base = '/code-training'
    rest = rel.slice('code-training/docs/'.length)
  } else if (!rel.includes('/')) {
    // 根目录下的独立页面（stars.md / projects.md）
    return `/${rel.replace(/\.(md|mdx)$/, '')}.html`
  } else {
    return null
  }

  rest = rest.replace(/\.(md|mdx)$/, '')
  const parts = rest.split('/')
  const name = parts.pop() as string
  const meta = fm ?? readFrontMatter(filePath)

  // `slug: /` = 板块落地页（旧的 /docs、/code-training）
  if (meta.slug === '/') return `${base}.html`

  let segment = name
  if (typeof meta.slug === 'string' && meta.slug.trim()) {
    segment = meta.slug.trim().replace(/^\/+|\/+$/g, '')
  } else if (meta.id !== undefined && meta.id !== null && String(meta.id).trim()) {
    segment = String(meta.id).trim()
  }

  parts.push(segment)
  // VuePress 的 Router 在解析路径时会把不以 .html 结尾的路径补成 .html
  // （`@vuepress/shared` 的 inferRoutePath），所以 page.path 必须以 .html 结尾，
  // 否则每条路由都会落到 404。旧的无后缀 URL 由 GitHub Pages 的
  // `X` -> `X.html` 解析兜住，书签和外链不受影响。
  return `${base}/${parts.join('/')}.html`
}
