import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 结构图（`static/diagrams/*.png`）的构建期索引：内容哈希 + 原始尺寸。
 *
 * 两件事靠它：
 *
 * 1. **缓存版本**。图片走 Workbox 的 `CacheFirst`（`theme.ts` 的 `images`
 *    路由，90 天），而文件名是固定的（`hash-chaining.png`）—— 改了图之后
 *    装过 PWA 的读者会继续看旧图，直到缓存过期。给 URL 挂上内容指纹
 *    （`?v=<sha1 前 10 位>`）就解决了：Workbox 的缓存键包含 query，新内容
 *    就是新 URL，旧条目自然淘汰。
 *    **不用改名落盘**：dev 与 prod 都直接读原文件，不用往 dist 复制副本。
 * 2. **占位尺寸**。`<img>` 带上 width/height，浏览器在图片到之前就能算出
 *    高度，滚到图时不会整页跳一下（CLS）。
 *
 * 只在构建期用（markdown 规则 + 离线包清单），客户端不引用。
 */
const DIAGRAM_DIR = path.resolve(__dirname, '../static/diagrams')
const URL_PREFIX = '/diagrams/'

export interface DiagramInfo {
  /** 文件名里的版本号（sha1 前 10 位） */
  version: string
  /** PNG 原始像素宽 */
  width: number
  /** PNG 原始像素高 */
  height: number
  bytes: number
}

let index: Map<string, DiagramInfo> | null = null

/**
 * 读 PNG 的 IHDR 拿宽高。
 *
 * 只认 PNG 头（`89 50 4E 47`）：图是 drawio 导出的 PNG，尺寸写在固定偏移
 * 16/20 处（8 字节签名 + 4 字节长度 + 4 字节 `IHDR`）。不引依赖，也不解码
 * 整张图。
 */
function pngSize(buf: Buffer): {width: number; height: number} | null {
  if (buf.length < 24) return null
  const signature = '89504e470d0a1a0a'
  if (buf.subarray(0, 8).toString('hex') !== signature) return null
  return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)}
}

function scan(): Map<string, DiagramInfo> {
  const map = new Map<string, DiagramInfo>()
  let files: string[] = []
  try {
    files = fs.readdirSync(DIAGRAM_DIR).filter((name) => name.endsWith('.png'))
  } catch {
    // 图还没生成时不要让构建挂掉：规则会原样放行，清单里也只是没有图
    return map
  }
  for (const name of files.sort()) {
    const file = path.join(DIAGRAM_DIR, name)
    let buf: Buffer
    try {
      buf = fs.readFileSync(file)
    } catch {
      continue
    }
    const size = pngSize(buf)
    if (!size) continue
    map.set(URL_PREFIX + name, {
      version: createHash('sha1').update(buf).digest('hex').slice(0, 10),
      width: size.width,
      height: size.height,
      bytes: buf.length,
    })
  }
  return map
}

function getIndex(): Map<string, DiagramInfo> {
  index ??= scan()
  return index
}

/** 取某张结构图的信息；不是 `/diagrams/*.png` 或文件缺席时返回 null */
export function diagramInfo(src: string): DiagramInfo | null {
  return getIndex().get(src.split(/[?#]/)[0]) ?? null
}

/**
 * 给结构图 URL 挂上内容版本。
 *
 * 只处理 `/diagrams/` 前缀：正文里别的图片（ML notebook 的 figure、
 * 题解插图）没有这套版本管理，原样放行。
 */
export function versionedDiagramSrc(src: string): string {
  const info = diagramInfo(src)
  if (!info) return src
  const clean = src.split(/[?#]/)[0]
  return `${clean}?v=${info.version}`
}

/** 离线包清单用：全部结构图，URL 已带版本 */
export function allDiagrams(): Array<{url: string; info: DiagramInfo}> {
  return [...getIndex().entries()].map(([src, info]) => ({
    url: `${src}?v=${info.version}`,
    info,
  }))
}
