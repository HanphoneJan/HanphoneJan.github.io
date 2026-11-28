import path from 'node:path'
import type { App } from 'vuepress/core'
import type { Markdown } from 'vuepress/markdown'
import {
  INLINE_TRACER_PLACEMENT,
  placementsOf,
} from '../../src/components/training/visualizer/inlinePlacement'
import { analyzeSnippet } from '../../src/components/training/pyrunner/snippet'
import { judgeIdOf } from '../../src/components/training/judge/id'
import { docIdOf, trainingData } from '../data/training-data'
import { readFrontMatter } from '../paths'

/**
 * 把训练相关的交互组件注入题解页。
 *
 * 旧站点靠三个 swizzle 接缝（`CodeBlock/Layout`、`MDXComponents` 的 h2、
 * `DocItem/Layout` 的正文末尾）。VuePress 没有那套接缝，但 markdown-it 的
 * token 流在渲染前是**完全可控**的 —— 直接往 token 流里插组件标签，
 * VuePress 会把渲染结果当 Vue 模板编译，组件就挂上去了。
 *
 * 下面是全部注入点：
 *
 * | 位置 | 组件 |
 * |---|---|
 * | 每个可运行的 python 代码块之后 | 运行条（Pyodide） |
 * | 正文末尾 | 手写 tracer（算法模式 / 数据结构页） |
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
      const tracerCount = Object.values(INLINE_TRACER_PLACEMENT).reduce(
        (sum, list) => sum + list.length,
        0,
      )
      return {
        __SITE_DATA__: JSON.stringify({
          'pattern-graph': { byPattern: data.byPattern },
          // 首页要的几个数字。只发清单，不发正文：题库只发 docId，
          // 播放器数量按放置表算。
          'doc-permalinks': {map: data.permalinks},
          'visualizers': { count: tracerCount },
          'self-test': {docIds: [...data.selfTest]},
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

        /**
         * 只有题解页参与评测；模式/数据结构页没有题号。
         * 评测包存在与否由客户端查 `/v1/problems` 决定，构建期不依赖服务端。
         */
        const fullPath = path.join(sourceDir, env.filePathRelative as string)
        const judgeId = docId.startsWith('problems/')
          ? judgeIdOf(readFrontMatter(fullPath), docId)
          : ''

        // 有些文档自己写了 `## 相关题目`（221 篇，含全部模式页）。
        // 那种情况不再注入知识图谱组件，否则页面上会出现两个同名小节。
        let hasRelatedHeading = false
        /** 当前所在的 h2 标题，用来只给「完整代码实现」块挂提交入口 */
        let section = ''
        let pendingH2 = false

        for (const token of tokens) {
          if (token.type === 'heading_open' && token.tag === 'h2') {
            pendingH2 = true
          } else if (pendingH2 && token.type === 'inline') {
            section = token.content.trim()
            pendingH2 = false
          }

          output.push(token)

          // ── 运行条：挂在每个「能跑」的 python 块下面 ─────────────────
          if (token.type === 'fence') {
            const lang = (token.info || '').trim().split(/\s+/)[0]
            const inFullCode = section === '完整代码实现'
            const canMount = Boolean(hasRunnableSamples) || (inFullCode && judgeId !== '')
            if ((lang === 'python' || lang === 'py') && canMount) {
              const analysis = analyzeSnippet(token.content, py?.method ?? null)
              if (analysis.runnable) {
                const judgeAttr =
                  inFullCode && judgeId !== ''
                    ? ` judge-id="${escapeAttr(judgeId)}"`
                    : ''
                // 「完整代码实现」是这一页的主代码，运行条整条摆出来；
                // 其余块（思路/暴力/易错点）只留代码块右上角一个 ▶ 图标，
                // 静态时和复制按钮同一档。见 SnippetBar 的 emphasis。
                const emphasis = inFullCode ? 'primary' : 'inline'
                output.push(
                  makeHtml(
                    `<SnippetBarMount code-b64="${b64(token.content)}" ` +
                      `samples-b64="${b64(
                        JSON.stringify(py?.samples.slice(0, SAMPLE_LIMIT) ?? []),
                      )}" ` +
                      `stdin-b64="${b64(
                        JSON.stringify(py?.stdinSamples.slice(0, SAMPLE_LIMIT) ?? []),
                      )}" ` +
                      `entry-name="${escapeAttr(py?.method ?? '')}" ` +
                      `emphasis="${emphasis}"${judgeAttr} />`,
                  ),
                )
              }
            }
          }

          // ── 「相关题目」小节存在与否，决定要不要注入知识图谱 ───────
          if (
            token.type === 'heading_close' &&
            token.tag === 'h2' &&
            output.length >= 3
          ) {
            const inline = output[output.length - 2]
            const title = inline?.type === 'inline' ? inline.content.trim() : ''
            if (title === '相关题目') {
              hasRelatedHeading = true
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
        if (!hasRelatedHeading && (data.byPattern[docId] ?? []).length > 0) {
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
