import type { Markdown } from 'vuepress/markdown'

/**
 * 把「散在正文里的尖括号」转义掉。
 *
 * VuePress 会把 markdown 渲染出来的 HTML 当成 **Vue 模板**再编译一遍，
 * 于是正文里任何形如 `<xxx>` 的片段都会被当成组件/标签：
 *
 *   LR(0)<SLR(1)<LALR(1)      -> Element is missing end tag
 *   /scenarios/<id>/            -> Element is missing end tag
 *   <class 'int'>               -> Element is missing end tag
 *
 * Docusaurus 走 MDX，这些写法在它的容错范围内，所以 456 篇存量笔记里
 * 攒了不少。逐个改正文治标不治本（同步脚本下次还可能写回来），
 * 所以在 markdown-it 这一层统一处理：**只放行真正的 HTML 标签**，
 * 其余一律转义成 `&lt;`，页面上照样显示成 `<`。
 *
 * 判据是「标签名在白名单里」。白名单之外的（`<username>`、`<P1>`、
 * `<class>`、`<id>`）全部转义。后续要注入的 Vue 组件也在白名单里，
 * 免得被自己的规则误伤。
 */
const ALLOWED_TAGS = new Set([
  // 结构
  'html', 'head', 'body', 'div', 'span', 'section', 'article', 'header',
  'footer', 'main', 'aside', 'nav', 'details', 'summary', 'figure',
  'figcaption', 'blockquote', 'center', 'template',
  // 文本
  'a', 'b', 'i', 'u', 's', 'em', 'strong', 'small', 'mark', 'del', 'ins',
  'sub', 'sup', 'kbd', 'code', 'pre', 'samp', 'var', 'abbr', 'cite', 'q',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'br', 'wbr', 'font',
  // 列表 / 表格
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'td', 'th', 'caption', 'colgroup', 'col',
  // 媒体
  'img', 'picture', 'video', 'audio', 'source', 'track', 'iframe', 'canvas',
  'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'use',
  'symbol', 'clippath', 'mask', 'pattern', 'ellipse', 'title',
  // 表单
  'form', 'label', 'input', 'button', 'select', 'option', 'optgroup',
  'textarea', 'fieldset', 'legend',
  // 站内注入的 Vue 组件
  'clientonly', 'selftestmount', 'patterngraphmount', 'recordedvisualizermount',
  'snippetbarmount', 'tracervisualizermount', 'reactmount',
])

/** `<tag ...>` / `</tag>` 里取出标签名；注释、CDATA 直接放行 */
function tagNameOf(raw: string): string | null {
  if (raw.startsWith('<!--') || raw.startsWith('<![CDATA[')) return ''
  const match = /^<\/?\s*([A-Za-z][\w-]*)/.exec(raw)
  return match ? match[1].toLowerCase() : null
}

function isAllowed(raw: string): boolean {
  const name = tagNameOf(raw)
  if (name === null) return false
  if (name === '') return true
  return ALLOWED_TAGS.has(name)
}

function escapeHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeStrayHtmlPlugin(md: Markdown): void {
  md.core.ruler.push('escape-stray-html', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue
      for (const child of token.children) {
        if (child.type === 'text') {
          // markdown-it 已经把「像标签」的部分切成 html_inline，
          // 这里兜住剩下的裸 `<`
          if (child.content.includes('<')) {
            child.content = child.content.replace(/</g, '&lt;')
          }
        } else if (child.type === 'html_inline' && !isAllowed(child.content)) {
          child.content = escapeHtml(child.content)
          child.type = 'text'
        }
      }
    }
  })
}
