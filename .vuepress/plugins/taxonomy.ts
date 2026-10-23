import path from 'node:path'
import type { App, PageOptions } from 'vuepress/core'
import { readFrontMatter, relativeSource } from '../paths'
import { deriveTaxonomy } from '../taxonomy'

/**
 * 没有 `frontmatter.title` 的页面，标题会取正文的 H1；而这些从笔记同步来的
 * 文件里**大量没有 H1**（开头直接是正文或代码块），标题就是空字符串 ——
 * 浏览器标签页只剩站名，时间轴/文章列表上就是一条空白。
 *
 * 这里直接用文件名兜底。不用「有没有 H1」来判断：这些笔记里的
 * `# 创建`、`# 结果` 之类是代码块里的注释，按行扫描会被误认成标题
 * （`Python学习笔记.md` 的围栏数量是奇数，扫描器更会错位）。
 *
 * `intro` 例外：`code-training/docs/intro.md` 没有 title frontmatter，
 * 但正文 H1 是「算法训练场」，用文件名会变成毫无意义的 `intro`。
 */
const TITLE_FALLBACK_EXCLUDE = new Set(['intro', 'index', 'readme'])

function fallbackTitle(filePath: string): string | undefined {
  const base = path.basename(filePath).replace(/\.(md|mdx)$/i, '')
  if (TITLE_FALLBACK_EXCLUDE.has(base.toLowerCase())) return undefined
  return base
}

/**
 * 把「分类 / 标签 / 日期」写进每个页面的 frontmatter。
 *
 * 为什么在 `extendsPageOptions` 里做，而不是另写一套页面：
 *
 * - hope 的 blog 插件（`theme.ts` 的 `plugins.blog`）就是靠
 *   `routeMeta.category` / `routeMeta.tag` / `routeMeta.date` 生成
 *   `/category/`、`/tag/`、`/timeline/` 这三类页面的；
 * - 这三个值又来自 `frontmatter.category` / `frontmatter.tags` /
 *   `frontmatter.date`；
 * - 而 `extendsPageOptions` 在页面对象创建**之前**运行，是唯一能保证
 *   「blog 插件读到的时候字段已经在了」的接缝。
 *
 * 只处理 `docs/**` 与 `code-training/docs/**`。根目录的 `stars.md` /
 * `projects.md` / `index.md` 是 React 孤岛或首页，不进文章列表。
 */
export const taxonomyPlugin = (app: App) => ({
  name: 'site-taxonomy',

  extendsPageOptions(options: PageOptions) {
    if (!options.filePath) return

    const rel = relativeSource(app.dir.source(), options.filePath)
    if (!rel.startsWith('docs/') && !rel.startsWith('code-training/docs/')) {
      return
    }

    const frontmatter = {
      ...(options.frontmatter ?? {}),
    } as Record<string, unknown>

    /**
     * 注意：`options.frontmatter` 在这里**还是空的**。
     *
     * VuePress 要到 `parsePageContent` 才用 gray-matter 解析正文头部的
     * frontmatter（`mdit-vue/plugin-frontmatter` 会把它 merge 进
     * `markdownEnv.frontmatter`，且**文件里的值优先**）。所以想拿到
     * `date_added` / `tags` / `title`，只能自己读一遍文件。
     *
     * 自己算出来的值写进 `options.frontmatter`：文件里没有的字段
     * （分类、日期、没有 title 时的标题）会保留，文件里已有的字段
     * （题解的 tags、显式的 category）会在后面的 merge 中覆盖回来 ——
     * 正是「frontmatter 优先」想要的行为。
     */
    const sourceMeta = readFrontMatter(options.filePath)
    const taxonomy = deriveTaxonomy(rel, sourceMeta)

    if (frontmatter.category === undefined && taxonomy.category) {
      frontmatter.category = taxonomy.category
    }
    if (
      frontmatter.tags === undefined &&
      frontmatter.tag === undefined &&
      taxonomy.tags?.length
    ) {
      frontmatter.tags = taxonomy.tags
    }
    if (frontmatter.date === undefined && taxonomy.date !== undefined) {
      frontmatter.date = taxonomy.date
    }

    if (frontmatter.title === undefined && sourceMeta.title === undefined) {
      const fallback = fallbackTitle(options.filePath)
      if (fallback) frontmatter.title = fallback
    }

    options.frontmatter = frontmatter
  },
})
