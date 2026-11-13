import type { App } from 'vuepress/core'
import { escapeStrayHtmlPlugin } from '../markdown/escape-stray-html.js'
import { codeBlockLinesPlugin } from '../markdown/code-block-lines.js'
import { diagramImagesPlugin } from '../markdown/diagram-images.js'

/**
 * 站点的 markdown 增强。
 *
 * - 转义散在正文里的尖括号（见 escape-stray-html.ts）
 * - 给代码块写下行数，供 `content-visibility` 估算高度（见 code-block-lines.ts）
 * - 给结构图挂内容版本、补原始尺寸（见 diagram-images.ts）
 *
 * 注入式组件（自测、可视化、运行条）后续也挂在这里。
 */
export const markdownEnhancePlugin = (app: App) => ({
  name: 'site-markdown-enhance',
  extendsMarkdown(md: unknown) {
    const markdown = md as Parameters<typeof escapeStrayHtmlPlugin>[0]
    escapeStrayHtmlPlugin(markdown)
    codeBlockLinesPlugin(markdown)
    diagramImagesPlugin(markdown)
  },
})
