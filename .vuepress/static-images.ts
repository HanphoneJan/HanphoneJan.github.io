import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 正文插图的构建期索引：内容哈希 + 原始尺寸 + 体积。
 *
 * 覆盖 `static/` 下**会被正文引用**的两类图：
 *
 * - `static/diagrams/**`：数据结构页的 draw.io 结构图
 * - `static/img/**`：项目文档里的架构图（cloud-disk、knowledge-hub…）
 *
 * 两件事靠它：
 *
 * 1. **缓存版本**。图片走 Workbox 的 `CacheFirst`（`theme.ts` 的 `images`
 *    路由，90 天），文件名却是固定的（`outbox.png`）—— 换了图，装过 PWA 的
 *    读者会继续看旧图，直到缓存过期。给 URL 挂内容指纹（`?v=<sha1 前 10 位>`）
 *    就解决了：Workbox 的缓存键包含 query，新内容就是新 URL，旧条目自然淘汰。
 *    **不用改名落盘**：dev 与 prod 都直接读原文件，不用往 dist 复制副本。
 * 2. **占位尺寸**。`<img>` 带上 width/height，浏览器在图片到之前就能算出
 *    高度，滚到图时不会整页跳一下（CLS）。
 *
 * 另外还记一笔「哪些图真的被正文引用了」（`noteUsedImage`）：离线包清单只
 * 收这部分，`static/img` 里没被引用的图（PWA 图标、旧稿残留）不必下发。
 *
 * 只在构建期用（markdown 规则 + 离线包清单），客户端不引用。
 */
const ROOTS = [
  { dir: path.resolve(__dirname, '../static/diagrams'), url: '/diagrams/' },
  { dir: path.resolve(__dirname, '../static/img'), url: '/img/' },
]

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i

export interface ImageInfo {
  /** 文件名里的版本号（sha1 前 10 位） */
  version: string
  /** PNG 原始像素宽（其它格式不读，缺省 0） */
  width: number
  /** PNG 原始像素高 */
  height: number
  bytes: number
}

let index: Map<string, ImageInfo> | null = null

/**
 * 读 PNG 的 IHDR 拿宽高。
 *
 * 只认 PNG 头（`89 50 4E 47`）：尺寸写在固定偏移 16/20 处（8 字节签名 +
 * 4 字节长度 + 4 字节 `IHDR`）。JPEG/WebP 的尺寸要解段，收益不值 —— 拿不到
 * 就不写 width/height，浏览器按原尺寸显示。
 */
function pngSize(buf: Buffer): {width: number; height: number} | null {
  if (buf.length < 24) return null
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null
  return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)}
}

function walk(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true})
  } catch {
    // 目录不存在（比如图还没生成）不要让构建挂掉
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (IMAGE_EXT.test(entry.name)) files.push(full)
  }
  return files
}

function scan(): Map<string, ImageInfo> {
  const map = new Map<string, ImageInfo>()
  for (const { dir, url } of ROOTS) {
    for (const file of walk(dir).sort()) {
      let buf: Buffer
      try {
        buf = fs.readFileSync(file)
      } catch {
        continue
      }
      const size = pngSize(buf)
      const rel = path.relative(dir, file).split(path.sep).join('/')
      map.set(url + rel, {
        version: createHash('sha1').update(buf).digest('hex').slice(0, 10),
        width: size?.width ?? 0,
        height: size?.height ?? 0,
        bytes: buf.length,
      })
    }
  }
  return map
}

function getIndex(): Map<string, ImageInfo> {
  index ??= scan()
  return index
}

/** 正文里真的出现过的图（渲染时由 `image-tags.ts` 登记） */
const used = new Map<string, ImageInfo>()

/**
 * 正文里出现过的**外链**图（`https://hanphone.top/...`）。
 *
 * 仓库里没有文件，算不出哈希也读不到尺寸，但设置页可以「先下一遍」：
 * 该图床带 `Access-Control-Allow-Origin: *`，用 CORS 取回来是正常响应
 * （不是 opaque），按真实大小进 `images` 桶，离线可看。
 */
const remote = new Set<string>()

export function noteRemoteImage(src: string): void {
  remote.add(src)
}

/** 离线包清单用：去重排序后的外链图 URL */
export function allRemoteImages(): string[] {
  return [...remote].sort()
}

export function noteUsedImage(src: string, info: ImageInfo): void {
  used.set(src, info)
}

/**
 * 取某张插图的信息；不是本地静态图、或文件缺席时返回 null。
 * 带 query/hash 的 src 也能取（按路径查）。
 */
export function imageInfo(src: string): ImageInfo | null {
  return getIndex().get(src.split(/[?#]/)[0]) ?? null
}

/**
 * 给插图 URL 挂上内容版本。
 *
 * 只处理 `/diagrams/`、`/img/` 两个前缀：外链没有本地文件，算不出哈希；
 * 主题图标之类不经过正文，也不该被改。
 */
export function versionedImageSrc(src: string): string {
  const info = imageInfo(src)
  if (!info) return src
  const clean = src.split(/[?#]/)[0]
  return `${clean}?v=${info.version}`
}

/**
 * 离线包清单用：正文引用过的全部本地图，URL 已带版本。
 *
 * 兜底：如果一条都没有（比如单独跑了清单构建、没渲染页面），退回「磁盘上
 * 所有图」—— 清单多几条可以接受，少一条就是离线裂图。
 */
export function allUsedImages(): Array<{url: string; info: ImageInfo}> {
  const source = used.size > 0 ? used : getIndex()
  return [...source.entries()].map(([src, info]) => ({
    url: `${src}?v=${info.version}`,
    info,
  }))
}
