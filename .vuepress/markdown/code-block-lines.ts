import type { Markdown } from 'vuepress/markdown'

/**
 * 给每个代码块记下「行数」，供 `styles/index.scss` 的 `content-visibility`
 * 估算高度。
 *
 * ## 为什么需要
 *
 * 长文档切页的耗时几乎全在 **layout / style**，不在脚本：实测 4 倍 CPU
 * 节流下切一篇 47KB 正文、11000 个节点的文档要 ~500ms，其中 Layout 150ms、
 * RecalcStyle 150ms、Script 只有 4ms。代码块（每行一个 `.line`、每段一个
 * token span）是里面最重的部分 —— 给 `pre.vp-code` 加
 * `content-visibility: auto` 后同样一次切换降到 ~300ms。
 *
 * ## 为什么还要注入行数
 *
 * `content-visibility: auto` 的屏幕外元素用 `contain-intrinsic-size` 的
 * **估算高度**参与排版。估算不准时，TOC 锚点会跳到错的位置：实测按固定的
 * `12rem` 估，`#collections-模块` 偏了 2600px。代码块不换行，高度就是
 * `行数 × 行高 + 内边距`，把行数写进 CSS 变量之后同一目标只偏 40px
 * （24000px 的页面上约 1.5 行，可以接受）。
 *
 * 行数必须**构建期**写进 HTML：运行时再补已经晚于第一次布局，SSR 首屏和
 * SPA 切页都会先用错误的估算排一遍。
 *
 * 注入点是 shiki 生成的外层 `<div class="language-…" style="…">`；它带的
 * `style` 是 `--shiki-*` 变量，这里在最前面追加 `--cv-lines`。匹配不上就
 * 原样返回 —— 那个块退回 CSS 里的缺省值 10，只影响估算精度，不影响渲染。
 */
export const codeBlockLinesPlugin = (md: Markdown): void => {
  const fence = md.renderer.rules.fence
  if (!fence) return

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = fence(tokens, idx, options, env, self) as string
    const content = tokens[idx].content
    // fence 的 content 一般以换行结尾，去掉它再数，避免多算一行
    const lines = content.replace(/\n$/, '').split('\n').length
    return html.replace(/^(\s*<div\b[^>]*?)(\sstyle=")/, `$1$2--cv-lines:${lines};`)
  }
}
