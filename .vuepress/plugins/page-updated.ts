import path from 'node:path'
import type { App, PageOptions } from 'vuepress/core'
import { docIdOf } from '../data/training-data'
import { pageContentFiles, quizEntryUpdatedTimes } from '../updated-time'

/**
 * 让每页页脚的「最近更新」反映**这一页正文**最后一次变化的时间。
 *
 * ## 两个接缝，各修一半
 *
 * hope 主题会自带 `@vuepress/plugin-git`，它按 `git log --follow -- <md>`
 * 取时间。**md 之外**的内容它一概看不见，于是 `settings.md`（整页是
 * `<CacheSettings />`）在组件改了十几轮之后仍显示 10/26。
 *
 * - **文件依赖**（组件、轨迹、tracer）：写进 frontmatter 的 `gitInclude`，
 *   这是 plugin-git 自己的官方开关（`extendsPage` 里会把这些路径的提交
 *   一起合并，取最新的那次）。必须在 `extendsPageOptions` 里写 —— 页面对象
 *   创建时 `extendsPage` 就会读它，晚一步就来不及。
 * - **题库条目**：它不是一个独立文件，没法用 `gitInclude` 表达「这几行」，
 *   所以在 `onInitialized` 里直接抬 `page.data.git.updatedTime`。
 *   这个钩子在页面创建完、`preparePageChunk`（把 `page.data` 序列化进页面
 *   chunk）之前，改了就算数。
 *
 * ## 为什么不去掉插件、自己算整套
 *
 * 合并多个文件的提交历史正是 plugin-git 已经做好的事（`--follow`、作者、
 * 多仓判断、createdTime），自己重写一遍只会与它漂移。这里只补它缺的那部分。
 *
 * 依赖口径见 `.vuepress/updated-time.ts` 的文件头 —— 那里写清了「为什么
 * 不把自动注入的播放器代码也算进来」。
 */
export const pageUpdatedPlugin = (app: App) => {
  const sourceDir = app.dir.source()

  return {
    name: 'site-page-updated',

    extendsPageOptions(options: PageOptions) {
      if (!options.filePath) return

      const deps = pageContentFiles(sourceDir, options.filePath)
      if (deps.length === 0) return

      const frontmatter = {
        ...(options.frontmatter ?? {}),
      } as Record<string, unknown>

      // `gitInclude` 的相对路径基准是**这篇 md 所在的目录**
      // （plugin-git 里是 `path.join(filePathRelative, '..', include)`）。
      const pageDir = path.dirname(options.filePath)
      const includes = new Set<string>(
        Array.isArray(frontmatter.gitInclude)
          ? (frontmatter.gitInclude as unknown[]).map(String)
          : [],
      )
      for (const dep of deps) {
        includes.add(path.relative(pageDir, dep).split(path.sep).join('/'))
      }

      frontmatter.gitInclude = [...includes]
      options.frontmatter = frontmatter
    },

    onInitialized(app) {
      const quizTimes = quizEntryUpdatedTimes(sourceDir)
      if (quizTimes.size === 0) return

      for (const page of app.pages) {
        const docId = docIdOf(page.filePathRelative)
        if (!docId) continue
        const time = quizTimes.get(docId)
        if (!time) continue

        const data = page.data as {
          git?: { updatedTime?: number; [key: string]: unknown }
        }
        const git = (data.git ??= {})
        if (!git.updatedTime || time > git.updatedTime) {
          git.updatedTime = time
        }
      }
    },
  }
}
