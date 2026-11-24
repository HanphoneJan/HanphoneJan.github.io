import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { placementsOf } from '../src/components/training/visualizer/inlinePlacement'
import { docIdOf } from './data/training-data'

/**
 * 「这一页的正文到底由哪些文件拼出来」。
 *
 * ## 为什么不能只看 md 的提交时间
 *
 * 页脚那行 `最近更新` 来自 `@vuepress/plugin-git`，默认只跑
 * `git log --follow -- <这篇 md>`。但站上有一批页面**内容主要不在 md 里**：
 *
 * - `settings.md` 只有 12 行，整页是 `<CacheSettings />`：离线包的板块、
 *   体积、版本提示全来自组件与插件；
 * - `stars.md` / `projects.md` / `index.md` 同理，正文是 React 孤岛；
 * - 题解的自测题来自 `static/quiz/bank.json` 里那几条；
 * - 算法模式页的播放器来自 `tracers/*.ts`。
 *
 * 只认 md 的后果是：11 月把设置页的离线包改了十几轮，页脚还停在 10/26
 * （`settings.md` 从那次之后一个字没动）。也就是说这个时间不是「页面
 * 什么时候变过」，而是「那个壳文件什么时候变过」——读者没法拿它判断
 * 内容新不新。
 *
 * ## 口径
 *
 * 一页的更新时间 = **下面这些文件里最新的那次提交**：
 *
 * 1. 页面 md 自己（由插件负责，这里不返回）；
 * 2. md 里**手写**的组件（`<CacheSettings />`、`<HomePage />`），
 *    以及这些组件按相对路径 import 到的本地文件（递归）；
 * 3. 正文里引用的本地图片（`/img/...` 或相对路径）；
 * 4. 这一页内嵌的 tracer 模块（放置表 `INLINE_TRACER_PLACEMENT`）；
 * 5. 自测题库里属于这一页的条目（按行 blame，见 `quizEntryUpdatedTimes`）。
 *
 * **刻意不包含**的东西：
 *
 * - 自动注入组件的实现（运行条、自测渲染、适配器、主题样式）。那是全站
 *   共用的渲染管线，改一次会让 600 页全部显示「今天更新」，反而把真正的
 *   内容变更淹掉。
 * - 算法模式页「相关题目」里那些别的题解。它是一张跨页索引，某道题改个
 *   标题就会连带几十篇模式页跳时间，同样失去意义。
 * - 构建期才生成的数据（Stars 的每日抓取、首页的数字条）。它们不落 git，
 *   没有历史可言；读者看到的是「组件最后一次改」。
 */

/** 组件按文件名索引：md 里写的是标签名，不是路径 */
const COMPONENT_DIRS = [
  '.vuepress/components',
  'src/components',
  'src/pages',
]

/** 解析 import 时按这个顺序补后缀 */
const MODULE_EXTS = [
  '.ts',
  '.tsx',
  '.vue',
  '.js',
  '.jsx',
  '.mjs',
  '.json',
  '.css',
  '.scss',
]

/** 单页的依赖图不会超过这个深度；超过说明遇到环了 */
const MAX_IMPORT_DEPTH = 12

interface IndexedFile {
  /** 文件名（去掉扩展名），标签名与它对齐 */
  name: string
  /** 绝对路径 */
  file: string
}

const componentIndexCache = new Map<string, Map<string, string>>()
const tracerIndexCache = new Map<string, Map<string, string>>()

function walkFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, out)
    else out.push(full)
  }
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

function moduleExtOk(file: string): boolean {
  return MODULE_EXTS.includes(path.extname(file))
}

/**
 * 组件标签名 -> 文件。
 *
 * 只收 `.vuepress/components`、`src/components`、`src/pages` 下的文件。
 * md 里那些**教程示例**（`<MyComponent />`、`<Greeting />`）在索引里查不到，
 * 自然不会变成依赖 —— 这也是为什么不用「只要长得像标签就算」。
 */
function componentIndex(sourceDir: string): Map<string, string> {
  const cached = componentIndexCache.get(sourceDir)
  if (cached) return cached

  const index = new Map<string, string>()
  for (const dir of COMPONENT_DIRS) {
    const files: string[] = []
    walkFiles(path.join(sourceDir, dir), files)
    for (const file of files) {
      if (!moduleExtOk(file)) continue
      const name = path.basename(file, path.extname(file))
      // 先出现的目录优先：`.vuepress/components` 是页面壳子，优先于实现
      if (!index.has(name)) index.set(name, file)
    }
  }
  componentIndexCache.set(sourceDir, index)
  return index
}

/**
 * tracer id -> 模块文件。
 *
 * 从 `tracers/*.ts` 里扫 `id: 'xxx'`，**不 import 那个注册表** —— 它会把
 * 所有 tracer 的实现（以及它们的类型依赖）拉进构建期的这次统计里，而这里
 * 只需要「哪个文件定义了哪个 id」。
 */
function tracerIndex(sourceDir: string): Map<string, string> {
  const cached = tracerIndexCache.get(sourceDir)
  if (cached) return cached

  const dir = path.join(sourceDir, 'src/components/training/visualizer/tracers')
  const index = new Map<string, string>()
  const files: string[] = []
  walkFiles(dir, files)
  for (const file of files) {
    if (!file.endsWith('.ts') || file.endsWith('index.ts') || file.endsWith('.d.ts')) {
      continue
    }
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(/\bid:\s*'([^']+)'/g)) {
      if (!index.has(match[1])) index.set(match[1], file)
    }
  }
  tracerIndexCache.set(sourceDir, index)
  return index
}

/**
 * 把 fenced code 与行内 code 抹掉。
 *
 * `docs/前端/Vue基础.md` 里有一堆 `<MyComponent />` 的教程示例；不剥代码
 * 的话它们会进入标签扫描。虽然索引里查不到同名组件（目前）不会出错，
 * 但哪天新增一个 `MyComponent.vue` 就会把那一页错误地挂上依赖。
 */
function stripCode(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let fence: string | null = null
  for (const line of lines) {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (match) {
      const marker = match[1][0]
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      out.push('')
      continue
    }
    if (fence) {
      out.push('')
      continue
    }
    out.push(line.replace(/`[^`\n]*`/g, ''))
  }
  return out.join('\n')
}

/** 从 md 里取手写的组件标签名 */
function componentTags(markdown: string): string[] {
  const names = new Set<string>()
  for (const match of stripCode(markdown).matchAll(/<([A-Z][A-Za-z0-9]*)(?=[\s/>])/g)) {
    names.add(match[1])
  }
  return [...names]
}

/** 解析一个 import 说明符（相对路径或 `@site/` 别名） */
function resolveSpecifier(
  sourceDir: string,
  fromFile: string,
  specifier: string,
): string | null {
  let base: string
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else if (specifier === '@site' || specifier.startsWith('@site/')) {
    // 与 config.ts / tsconfig.json 里的 `@site` 别名一致
    base = path.join(sourceDir, specifier.slice('@site'.length))
  } else {
    return null
  }

  const candidates = [
    base,
    ...MODULE_EXTS.map((ext) => `${base}${ext}`),
    ...MODULE_EXTS.map((ext) => path.join(base, `index${ext}`)),
  ]
  for (const candidate of candidates) {
    if (isFile(candidate)) return candidate
  }
  return null
}

/** 一个组件文件按相对 import 递归展开出的本地文件 */
function importedFiles(sourceDir: string, file: string): string[] {
  const seen = new Set<string>()
  const stack: Array<{ file: string; depth: number }> = [{ file, depth: 0 }]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (seen.has(current.file) || current.depth > MAX_IMPORT_DEPTH) continue
    seen.add(current.file)
    if (!['.ts', '.tsx', '.vue', '.js', '.jsx', '.mjs'].includes(path.extname(current.file))) {
      continue
    }

    const text = fs.readFileSync(current.file, 'utf8')
    const specifiers = new Set<string>()
    // `import x from '...'` / `export { x } from '...'`
    for (const match of text.matchAll(
      /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]/g,
    )) {
      specifiers.add(match[1])
    }
    // 动态 `import('...')`
    for (const match of text.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      specifiers.add(match[1])
    }

    for (const specifier of specifiers) {
      const resolved = resolveSpecifier(sourceDir, current.file, specifier)
      if (resolved && !seen.has(resolved)) {
        stack.push({ file: resolved, depth: current.depth + 1 })
      }
    }
  }

  seen.delete(file)
  return [...seen]
}

/**
 * md 正文里引用的本地图片。
 *
 * 站内配图都走 `/img/...`（`static/` 是公开目录），少部分写相对路径。
 * 换一张架构图当然算这一页变过 —— 但只认**正文里的引用**：图片自身被别的
 * 页面共用时，跟着各自引用它的页面走。
 */
function referencedImages(
  sourceDir: string,
  filePath: string,
  markdown: string,
): string[] {
  const text = stripCode(markdown)
  const files: string[] = []
  const pattern =
    /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)|<img\b[^>]*\bsrc=["']([^"']+)["']/gi

  for (const match of text.matchAll(pattern)) {
    let target = (match[1] ?? match[2] ?? '').trim()
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue
    target = target.replace(/[?#].*$/, '')
    try {
      target = decodeURIComponent(target)
    } catch {
      /* 非法转义就按原样找 */
    }

    let candidate: string
    if (target.startsWith('/')) {
      // `/img/x.png` -> `static/img/x.png`（public 目录）
      candidate = path.join(sourceDir, 'static', target.slice(1))
    } else {
      candidate = path.resolve(path.dirname(filePath), target)
    }
    if (isFile(candidate)) files.push(candidate)
  }

  return files
}

/**
 * 除 md 以外，这一页正文还依赖哪些文件。
 *
 * 返回绝对路径；调用方负责换算成相对 md 的路径（`gitInclude` 的口径）。
 */
export function pageContentFiles(sourceDir: string, filePath: string): string[] {
  const deps = new Set<string>()
  const markdown = fs.readFileSync(filePath, 'utf8')

  // ── md 里手写的组件，以及它们的本地 import ──────────────────────
  const components = componentIndex(sourceDir)
  for (const tag of componentTags(markdown)) {
    const file = components.get(tag)
    if (!file) continue
    deps.add(file)
    for (const imported of importedFiles(sourceDir, file)) deps.add(imported)
  }

  // ── 正文引用的本地图片 ──────────────────────────────────────────
  for (const image of referencedImages(sourceDir, filePath, markdown)) {
    deps.add(image)
  }

  // ── 内嵌 tracer 的模块 ──────────────────────────────────────────
  const relative = path.relative(sourceDir, filePath).split(path.sep).join('/')
  const docId = docIdOf(relative)
  if (docId) {
    const tracers = tracerIndex(sourceDir)
    for (const placement of placementsOf(docId)) {
      const file = tracers.get(placement.tracerId)
      if (file) deps.add(file)
    }
  }

  // md 自己由插件处理；万一被组件 import 绕回来也剔掉
  deps.delete(filePath)
  return [...deps].sort()
}

// ── 自测题库：按行 blame ──────────────────────────────────────────

export interface QuizEntryRange {
  docId: string
  /** 1 起算的行号（闭区间） */
  start: number
  /** 1 起算的行号（闭区间） */
  end: number
}

/**
 * 题库里每个条目的行区间。
 *
 * `bank.json` 是一个 `{version, items:[...]}` 的对象数组，每条都带
 * `docId`。这里不依赖 2 空格缩进这种格式细节：按 JSON 的括号层级扫描，
 * 记住**顶层 items 里那个对象**的起止行。字符串里的括号会被跳过。
 */
export function quizEntryRanges(text: string): QuizEntryRange[] {
  const ranges: QuizEntryRange[] = []
  let line = 1
  let depth = 0
  let inString = false
  let escaped = false
  let startChar = -1
  let startLine = 0

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
    } else if (char === '{' || char === '[') {
      // 0 -> 根对象，1 -> items 数组，2 -> 一个条目对象
      if (char === '{' && depth === 2) {
        startChar = i
        startLine = line
      }
      depth += 1
    } else if (char === '}' || char === ']') {
      if (char === '}' && depth === 3 && startChar >= 0) {
        const chunk = text.slice(startChar, i + 1)
        const docId = /"docId"\s*:\s*"([^"]+)"/.exec(chunk)
        if (docId) ranges.push({ docId: docId[1], start: startLine, end: line })
        startChar = -1
      }
      depth -= 1
    }

    if (char === '\n') line += 1
  }

  return ranges
}

/**
 * 每一行是哪个提交写的：`行号 -> 提交时间（ms）`。
 *
 * 一次 blame 覆盖整个文件（6 千多行，实测 <100ms），再按条目区间取最大值。
 * 不要每条题各跑一次 blame —— 529 次进程调用会把构建多拖几十秒。
 */
function blameTimes(sourceDir: string, file: string): Map<number, number> {
  const times = new Map<number, number>()
  let output: string
  try {
    output = execFileSync('git', ['blame', '--line-porcelain', '--', file], {
      cwd: sourceDir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    // 没有 git、浅克隆、文件还没提交：退化成「题库不参与」
    return times
  }

  let currentLine = 0
  for (const line of output.split('\n')) {
    const header = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/.exec(line)
    if (header) {
      currentLine = Number(header[2])
      continue
    }
    const authorTime = /^author-time (\d+)$/.exec(line)
    if (authorTime && currentLine > 0) {
      times.set(currentLine, Number(authorTime[1]) * 1000)
    }
  }
  return times
}

/**
 * 每篇题解（docId）的自测题最后一次被改动的时间。
 *
 * 一份文件里 500 多条题，各条目的历史不同：新加一道题不应该让另外 176 篇
 * 题解的「最近更新」一起跳到今天。所以按条目占的行区间取 max。
 */
export function quizEntryUpdatedTimes(sourceDir: string): Map<string, number> {
  const file = 'static/quiz/bank.json'
  const absolute = path.join(sourceDir, file)
  const result = new Map<string, number>()
  if (!isFile(absolute)) return result

  const ranges = quizEntryRanges(fs.readFileSync(absolute, 'utf8'))
  if (ranges.length === 0) return result
  const times = blameTimes(sourceDir, file)
  if (times.size === 0) return result

  for (const range of ranges) {
    let newest = 0
    for (let line = range.start; line <= range.end; line += 1) {
      const time = times.get(line)
      if (time && time > newest) newest = time
    }
    if (newest === 0) continue
    const previous = result.get(range.docId) ?? 0
    if (newest > previous) result.set(range.docId, newest)
  }

  return result
}
