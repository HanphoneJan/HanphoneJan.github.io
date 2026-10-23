import type { App } from 'vuepress/core'
import type { Markdown } from 'vuepress/markdown'
import { placementsOf } from '../../src/components/training/visualizer/inlinePlacement'
import { analyzeSnippet } from '../../src/components/training/pyrunner/snippet'
import { docIdOf, trainingData } from '../data/training-data'

/**
 * 把训练相关的交互组件注入题解页。
 *
 * 旧站点靠三个 swizzle 接缝（`CodeBlock/Layout`、`MDXComponents` 的 h2、
 * `DocItem/Layout` 的正文末尾）。VuePress 没有那套接缝，但 markdown-it 的
 * token 流在渲染前是**完全可控**的 —— 直接往 token 流里插组件标签，
 * VuePress 会把渲染结果当 Vue 模板编译，组件就挂上去了。
 *
 * 四个注入点，与旧站点的位置一一对应：
 *
 * | 位置 | 组件 |
 * |---|---|
 * | 每个可运行的 python 代码块之后 | 运行条（Pyodide） |
 * | `## 完整代码实现` 标题之后 | 录制式逐帧动画 / 「本题无可视化步骤」 |
 * | 正文末尾 | 相关题目（算法模式页） |
 * | 正文末尾 | 自测题（题解页） |
 *
 * md 一行都不用改 —— 与旧站点同一个承诺。
 */
const SAMPLE_LIMIT = 3

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function b64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64')
}

export const trainingPlugin = (app: App) => {
  const sourceDir = app.dir.source()

  return {
    name: 'training-inject',

    // 客户端只需要「模式 -> 相关题目」这一张反面表（几十 KB）。
    // 题库、轨迹帧仍然按需 fetch，不进主 bundle。
    define: () => {
      const data = trainingData(sourceDir)
      return {
        __SITE_DATA__: JSON.stringify({
          'pattern-graph': { byPattern: data.byPattern },
        }),
      }
    },

    extendsMarkdown(md: Markdown) {
      md.core.ruler.push('inject-training', (state) => {
        const env = state.env as { filePathRelative?: string }
        const docId = docIdOf(env.filePathRelative)
        if (!docId) return

        const data = trainingData(sourceDir)
        const tokens = state.tokens
        const output: typeof tokens = []
        const makeHtml = (html: string) => {
          const token = new state.Token('html_block', '', 0)
          token.content = html
          token.block = true
          return token
        }

        const py = data.pySamples[docId]
        const hasRunnableSamples =
          py && (py.samples.length > 0 || py.stdinSamples.length > 0)

        for (const token of tokens) {
          output.push(token)

          // ── 运行条：挂在每个「能跑」的 python 块下面 ─────────────────
          if (hasRunnableSamples && token.type === 'fence') {
            const lang = (token.info || '').trim().split(/\s+/)[0]
            if (lang === 'python' || lang === 'py') {
              const analysis = analyzeSnippet(token.content, py.method)
              if (analysis.runnable) {
                output.push(
                  makeHtml(
                    `<SnippetBarMount code-b64="${b64(token.content)}" ` +
                      `samples-b64="${b64(
                        JSON.stringify(py.samples.slice(0, SAMPLE_LIMIT)),
                      )}" ` +
                      `stdin-b64="${b64(
                        JSON.stringify(py.stdinSamples.slice(0, SAMPLE_LIMIT)),
                      )}" ` +
                      `entry-name="${escapeAttr(py.method ?? '')}" />`,
                  ),
                )
              }
            }
          }

          // ── 录制式动画：紧跟「完整代码实现」那一节的标题 ─────────────
          if (
            token.type === 'heading_close' &&
            token.tag === 'h2' &&
            output.length >= 3
          ) {
            const inline = output[output.length - 2]
            const title = inline?.type === 'inline' ? inline.content.trim() : ''
            if (title === '完整代码实现') {
              const entry = data.traces[docId]
              if (entry) {
                output.push(
                  makeHtml(
                    `<RecordedVisualizerMount trace-b64="${b64(
                      JSON.stringify(entry),
                    )}" />`,
                  ),
                )
              } else if (data.noVisual.has(docId)) {
                output.push(makeHtml('<NoVisStepsMount />'))
              }
            }
          }
        }

        state.tokens = output

        // ── 正文末尾：手写 tracer / 相关题目 / 自测 ────────────────────
        const tail: string[] = []
        const placements = placementsOf(docId)
        if (placements.length > 0) {
          tail.push(
            `<TracerVisualizerMount placements-b64="${b64(
              JSON.stringify(placements),
            )}" />`,
          )
        }
        if ((data.byPattern[docId] ?? []).length > 0) {
          tail.push(
            `<PatternGraphMount doc-id="${escapeAttr(docId)}" />`,
          )
        }
        if (data.selfTest.has(docId)) {
          tail.push(`<SelfTestMount doc-id="${escapeAttr(docId)}" />`)
        }
        for (const html of tail) {
          state.tokens.push(makeHtml(html))
        }
      })
    },
  }
}
