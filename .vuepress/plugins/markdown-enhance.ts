import type { App } from 'vuepress/core'
import { escapeStrayHtmlPlugin } from '../markdown/escape-stray-html.js'

/**
 * 站点的 markdown 增强。
 *
 * 目前只有一件事：转义散在正文里的尖括号（见 escape-stray-html.ts）。
 * 注入式组件（自测、可视化、运行条）后续也挂在这里。
 */
export const markdownEnhancePlugin = (app: App) => ({
  name: 'site-markdown-enhance',
  extendsMarkdown(md: unknown) {
    escapeStrayHtmlPlugin(md as Parameters<typeof escapeStrayHtmlPlugin>[0])
  },
})
