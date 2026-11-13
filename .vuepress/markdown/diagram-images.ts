import type { Markdown } from 'vuepress/markdown'
import { diagramInfo, versionedDiagramSrc } from '../diagram-assets.js'

/**
 * 结构图的 `<img src>` 加工：挂内容版本 + 补上原始尺寸。
 *
 * 为什么要有这一层：
 *
 * - **版本**：`static/diagrams/*.png` 文件名固定，而 Workbox 的图片路由是
 *   `CacheFirst`（90 天）。改了图、重新部署，装过 PWA 的读者仍会看到旧图。
 *   挂 `?v=<内容哈希>` 之后，新图就是新 URL，旧缓存自然不再命中。
 * - **尺寸**：`width`/`height` 让浏览器在图片下载完成前就按真实比例占位，
 *   滚到图那里不会整页跳一下（CLS）。配合 `index.scss` 的
 *   `img[width][height] { height: auto }`，窄屏下仍按 `max-width: 100%` 缩放。
 *
 * 只动 `/diagrams/` 前缀的图片；ML notebook 的图、题解插图都原样放过。
 * 正文里仍然写 `/diagrams/x.png`，版本号是构建期贴上去的。
 */
export function diagramImagesPlugin(md: Markdown): void {
  md.core.ruler.push('diagram-images', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue
      for (const child of token.children) {
        if (child.type !== 'image') continue
        const src = child.attrGet('src')
        if (!src || !src.startsWith('/diagrams/')) continue
        const info = diagramInfo(src)
        if (!info) continue
        child.attrSet('src', versionedDiagramSrc(src))
        child.attrSet('width', String(info.width))
        child.attrSet('height', String(info.height))
      }
    }
  })
}
