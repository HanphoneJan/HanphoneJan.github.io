import type { Markdown } from 'vuepress/markdown'
import { imageInfo, noteUsedImage, versionedImageSrc } from '../static-images.js'

const LOCAL_PREFIX = /^\/(?:img|diagrams)\//
const REMOTE = /^(?:https?:)?\/\//i

/**
 * 正文里 `<img>` 的两处加工：
 *
 * 1. **版本 + 尺寸（本地图）**。`static/` 下的图文件名固定，而 Workbox 的
 *    图片路由是 `CacheFirst`（90 天）。挂了 `?v=<内容哈希>` 之后新图就是新
 *    URL，旧缓存自然不再命中；`width`/`height` 让浏览器在下载完成前按真实
 *    比例占位，滚到图时不会整页跳（CLS）。配合 `index.scss` 的
 *    `img[width][height] { height: auto }`，窄屏下仍按 `max-width: 100%` 缩。
 * 2. **懒加载（外链图）**。仓库里没有那些文件（`hanphone.top` 上的 500 多张），
 *    构建期算不出哈希也拿不到尺寸，但至少可以给它们 `loading="lazy"` ——
 *    否则编译原理那种一页 40 多张图的文档会一次性把它们全排进加载队列。
 *
 * 两种写法都要管：markdown 的 `![]()` 是 image token，笔记里大量 `<img />`
 * 是 html_inline token（`escape-stray-html` 放行后仍是原样字符串）。
 */
export function imageTagsPlugin(md: Markdown): void {
  md.core.ruler.push('image-tags', (state) => {
    for (const token of state.tokens) {
      // 独占一行的 `<img ... />` 被 markdown-it 切成 html_block（不是 inline
      // 里的 html_inline）—— 笔记里那些导入的图大多长这样，必须一起管。
      if (token.type === 'html_block' && /<img\b/i.test(token.content)) {
        token.content = rewriteHtmlImg(token.content)
        continue
      }
      if (token.type !== 'inline' || !token.children) continue
      for (const child of token.children) {
        if (child.type === 'image') {
          const src = child.attrGet('src')
          if (!src) continue
          if (LOCAL_PREFIX.test(src)) {
            const info = imageInfo(src)
            if (!info) continue
            noteUsedImage(src, info)
            child.attrSet('src', versionedImageSrc(src))
            if (info.width && info.height) {
              child.attrSet('width', String(info.width))
              child.attrSet('height', String(info.height))
            }
            child.attrSet('decoding', 'async')
          } else if (REMOTE.test(src)) {
            child.attrSet('loading', 'lazy')
            child.attrSet('decoding', 'async')
          }
        } else if (child.type === 'html_inline' && /<img\b/i.test(child.content)) {
          child.content = rewriteHtmlImg(child.content)
        }
      }
    }
  })
}

/**
 * 处理正文里手写的 `<img ... />`（笔记从别处导入，原样保留着）。
 *
 * 只做两件不会改变排版的事：补 `loading="lazy"` / `decoding="async"`；
 * src 指向本地静态图时挂版本号并登记进离线包清单。
 * **不试图解析属性边界之外的 HTML** —— 正则只吃 `<img ...>` 这一段。
 */
function rewriteHtmlImg(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /\bsrc\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? ''
    let out = tag
    if (LOCAL_PREFIX.test(src)) {
      const info = imageInfo(src)
      if (info) {
        noteUsedImage(src, info)
        out = out.replace(/(\bsrc\s*=\s*")[^"]*(")/i, `$1${versionedImageSrc(src)}$2`)
        if (info.width && info.height && !/\bwidth\s*=/.test(out)) {
          out = out.replace(/<img\b/i, `<img width="${info.width}" height="${info.height}"`)
        }
      }
    }
    if (!/\bloading\s*=/i.test(out)) out = out.replace(/<img\b/i, '<img loading="lazy"')
    if (!/\bdecoding\s*=/i.test(out)) out = out.replace(/<img\b/i, '<img decoding="async"')
    return out
  })
}
