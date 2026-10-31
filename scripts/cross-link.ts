/**
 * 三站内容配对（博客 ↔ 文档站 ↔ 私人笔记）。
 *
 * 三份内容里同一篇文章常常各有一份，但三边的标题写法不一致：
 *
 *   blog  「《诡秘之主》读后感」   docs  「诡秘之主.md」
 *   blog  「HTML+CSS+JS知识要点」  docs  「HTML+CSS+JS.md」
 *   blog  「JavaScript 构建工具」  docs  「JavaScript 构建工具.md」
 *
 * 所以配对不能靠标题相等，要按「去掉标点后的包含关系 + 二元组相似度」打分，
 * 低于阈值的一律不配对 —— 宁可漏，不要错配（错配会让博客上挂错跳转链接）。
 *
 * 用法：
 *
 *   pnpm cross:link            # 打印报告 + 写 data/cross-link.json
 *   pnpm cross:link --json     # 只写文件，不打印
 *
 * 环境变量：
 *
 *   NOTE_DIR        私人笔记目录，默认 ../hanphone-note
 *   BLOG_API_BASE   博客接口，默认 https://hanphone.cn/api（只读公开接口）
 */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { legacyPathFor } from '../.vuepress/paths'

const ROOT = path.resolve(__dirname, '..')
const NOTE_DIR = path.resolve(ROOT, process.env.NOTE_DIR ?? '../hanphone-note')
const BLOG_API_BASE = (process.env.BLOG_API_BASE ?? 'https://hanphone.cn/api').replace(/\/+$/, '')
const OUT_FILE = path.join(ROOT, 'data', 'cross-link.json')
const SILENT = process.argv.includes('--json')

interface Entry {
  key: string
  title: string
  /** 参与配对的写法：显示标题 + 文件名。文档站的 `title` 常被改写成更正式的名字，
   *  只比 title 会漏掉 `Shell知识笔记.md` 这种「文件名才是原名」的页。 */
  aliases: string[]
  file?: string
  url?: string
  id?: number
}

/**
 * 机器配不上的，手工登记（博客标题 → 文档站相对路径）。
 *
 * 只有「标题换过写法、二元组也不够像」的才需要写进来：
 * 计组/编译原理/软件工程这三类笔记的博客标题与文档站页名差得远，
 * 相似度算出来 0.4 左右，硬把阈值降到那里会把一堆无关页配到一起。
 */
const MANUAL_PAIRS: Record<string, string> = {
  计算机组成原理知识要点: 'docs/计算机基础/计组知识要点.md',
  编译原理笔记: 'docs/计算机基础/编译原理复习重点.md',
  软件工程学习笔记2025: 'docs/计算机基础/软件工程复习笔记.md',
  吴恩达深度学习课程笔记: 'docs/机器学习/吴恩达ML学习笔记.md',
  Docker入门教程: 'docs/后端/Docker基础教程.md',
  Shell知识笔记: 'docs/计算机基础/Shell知识笔记.md',
  数字电路笔记: 'docs/嵌入式/数电设计.md',
  汇编语言课程笔记: 'docs/嵌入式/汇编语言学习.md',
  Git使用教程: 'docs/计算机基础/Git版本控制.md',
}

export interface Pair {
  blog: Entry
  target: Entry
  score: number
  kind: 'docs' | 'note'
}

/** 去掉标点/空白/书名号，只留汉字、字母、数字 */
function norm(input: string): string {
  return input
    .replace(/\.(md|mdx)$/, '')
    .replace(/[^\p{Script=Han}\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

function bigrams(text: string): string[] {
  const chars = [...text]
  const grams: string[] = []
  for (let i = 0; i < chars.length - 1; i += 1) grams.push(chars[i] + chars[i + 1])
  return grams
}

/** Dice 系数，取值 0~1 */
function dice(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const pool = new Map<string, number>()
  for (const gram of bigrams(a)) pool.set(gram, (pool.get(gram) ?? 0) + 1)
  let hit = 0
  for (const gram of bigrams(b)) {
    const left = pool.get(gram) ?? 0
    if (left > 0) {
      hit += 1
      pool.set(gram, left - 1)
    }
  }
  return (2 * hit) / (bigrams(a).length + bigrams(b).length)
}

function score(a: string, b: string): number {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
  // 只顺着「包含」判会误伤：博客《Windows下安装Qdrant向量数据库》里含「数据库」，
  // 于是配上了 docs/Java与计算机基础/数据库.md。要求被包含的那侧至少 4 个字、
  // 且占长串的 45% 以上，《诡秘之主》⊂《诡秘之主读后感》仍然过得去。
  if (short.length >= 4 && short.length / long.length >= 0.45 && long.includes(short)) {
    return 0.8 + 0.2 * (short.length / long.length)
  }
  return dice(na, nb)
}

function walkMarkdown(dir: string, skip: RegExp[]): string[] {
  const out: string[] = []
  const visit = (current: string) => {
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, dirent.name)
      if (skip.some((re) => re.test(full))) continue
      if (dirent.isDirectory()) visit(full)
      else if (/\.(md|mdx)$/.test(dirent.name) && !dirent.name.startsWith('_')) out.push(full)
    }
  }
  visit(dir)
  return out
}

function titleOf(file: string): string {
  const raw = fs.readFileSync(file, 'utf8')
  const fm = (matter(raw).data ?? {}) as { title?: string }
  if (fm.title && String(fm.title).trim()) return String(fm.title).trim()
  const heading = /^#\s+(.+)$/m.exec(raw)
  if (heading) return heading[1].trim()
  return path.basename(file).replace(/\.(md|mdx)$/, '')
}

function loadDocs(sourceDir: string): Entry[] {
  return walkMarkdown(path.join(sourceDir, 'docs'), []).map((file) => {
    const rel = path.relative(sourceDir, file).split(path.sep).join('/')
    const title = titleOf(file)
    return {
      key: rel,
      title,
      aliases: [title, path.basename(file).replace(/\.(md|mdx)$/, '')],
      file: rel,
      url: legacyPathFor(sourceDir, file) ?? undefined,
    }
  })
}

function loadNotes(): Entry[] {
  if (!fs.existsSync(NOTE_DIR)) return []
  return walkMarkdown(NOTE_DIR, [/\/\.git\//, /\/\.obsidian\//]).map((file) => {
    const rel = path.relative(NOTE_DIR, file).split(path.sep).join('/')
    const title = titleOf(file)
    return { key: rel, title, aliases: [title, path.basename(file).replace(/\.(md|mdx)$/, '')], file: rel }
  })
}

async function loadBlogs(): Promise<Entry[]> {
  const out: Entry[] = []
  for (let pagenum = 1; pagenum <= 10; pagenum += 1) {
    const url = `${BLOG_API_BASE}/blogs?pagenum=${pagenum}&pagesize=50`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`获取博客列表失败：HTTP ${res.status}`)
    const body = (await res.json()) as {
      data?: { content?: Array<{ id: number; title: string; type?: { name: string } }>; last?: boolean }
    }
    const page = body.data ?? {}
    for (const blog of page.content ?? []) {
      out.push({ key: String(blog.id), id: blog.id, title: blog.title, aliases: [blog.title], url: `/blog/${blog.id}` })
    }
    if (page.last) break
  }
  return out
}

function bestMatch(source: Entry, pool: Entry[]): { target: Entry; score: number } | null {
  let best: { target: Entry; score: number } | null = null
  for (const candidate of pool) {
    let value = 0
    for (const left of source.aliases) {
      for (const right of candidate.aliases) {
        const current = score(left, right)
        if (current > value) value = current
      }
    }
    if (!best || value > best.score) best = { target: candidate, score: value }
  }
  return best && best.score >= 0.75 ? best : null
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

async function main(): Promise<void> {
  const docs = loadDocs(ROOT)
  const notes = loadNotes()
  const blogs = await loadBlogs()

  const pairs: Pair[] = []
  const usedDocs = new Set<string>()
  for (const blog of blogs) {
    const manualPath = MANUAL_PAIRS[blog.title]
    const manual = manualPath ? docs.find((doc) => doc.file === manualPath) : undefined
    if (manual) {
      pairs.push({ blog, target: manual, score: 1, kind: 'docs' })
      usedDocs.add(manual.key)
      continue
    }
    const hit = bestMatch(blog, docs.filter((doc) => !usedDocs.has(doc.key)))
    if (hit) {
      pairs.push({ blog, target: hit.target, score: hit.score, kind: 'docs' })
      usedDocs.add(hit.target.key)
    }
  }
  const blogToNote: Pair[] = []
  for (const blog of blogs) {
    const hit = bestMatch(blog, notes)
    if (hit) blogToNote.push({ blog, target: hit.target, score: hit.score, kind: 'note' })
  }

  const pairedDocs = new Set(pairs.map((pair) => pair.target.key))
  const pairedBlogs = new Set(pairs.map((pair) => pair.blog.key))

  const report = {
    generatedAt: new Date().toISOString(),
    counts: { docs: docs.length, notes: notes.length, blogs: blogs.length },
    blogToDocs: pairs
      .sort((a, b) => b.score - a.score)
      .map((pair) => ({
        blogId: pair.blog.id,
        blogTitle: pair.blog.title,
        docsPath: pair.target.file,
        docsUrl: pair.target.url,
        score: Number(pair.score.toFixed(3)),
      })),
    blogToNotes: blogToNote.map((pair) => ({
      blogId: pair.blog.id,
      blogTitle: pair.blog.title,
      notePath: pair.target.file,
      score: Number(pair.score.toFixed(3)),
    })),
    blogOnly: blogs.filter((blog) => !pairedBlogs.has(blog.key)).map((blog) => ({ id: blog.id, title: blog.title })),
    docsWithoutBlog: docs
      .filter((doc) => !pairedDocs.has(doc.key) && !doc.key.includes('problems/') && !doc.key.includes('code-training'))
      .map((doc) => ({ title: doc.title, file: doc.file })),
    notesUntitled: notes.map((note) => ({ title: note.title, file: note.file })),
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`)

  if (SILENT) return

  console.log(`文档站 ${docs.length} 篇 · 笔记 ${notes.length} 篇 · 博客 ${blogs.length} 篇`)
  console.log(`\n配对成功 ${pairs.length} 组（博客 → 文档站）：`)
  for (const pair of pairs) {
    console.log(`  ${pct(pair.score)}  ${pair.blog.title}  →  ${pair.target.file}`)
  }
  console.log(`\n博客 → 私人笔记 ${blogToNote.length} 组：`)
  for (const pair of blogToNote) {
    console.log(`  ${pct(pair.score)}  ${pair.blog.title}  →  ${pair.target.file}`)
  }
  const blogOnly = report.blogOnly
  console.log(`\n只有博客有（${blogOnly.length} 篇）：${blogOnly.map((blog) => blog.title).join('、')}`)
  console.log(`\n写入 ${path.relative(ROOT, OUT_FILE)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
