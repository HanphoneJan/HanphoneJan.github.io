/**
 * 公式回归测试：KaTeX 能解析、公式不写在代码块里。
 *
 * 两件事，构建都不会替我们挡住：
 *
 * 1. **KaTeX 解析失败不会让构建失败。** `@mdit/plugin-katex-slim` 默认
 *    `throwOnError: false`，写错的公式变成 `<span class="katex-error">`（红字）
 *    照样出页面，日志里只有一行 console.error。所以这里用 `throwOnError: true`
 *    把全站 `$...$` / `$$...$$` 自己渲染一遍。
 * 2. **公式写进代码块也照样出页面。** 高亮器按等宽字体排版，分式只能画 ASCII
 *    横线、Σ 的下标靠 `_` 手写 —— 页面不报错，只是难看且手机上更难看。
 *    规则是：无语言 / `text` / `plaintext` 的围栏里出现 Σ、∑、√、`ln(` 这类
 *    数学记号，或出现一条只有 `─` 的分式横线，就判为「公式写在了代码块里」。
 *
 * 抽取前先剔掉围栏块与行内代码：`$DSH_HOME`、`$2b$12$` 这类本身就是代码，
 * 不剔会被当成行内公式配对。
 *
 * 运行：`pnpm test:math`
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import katex from 'katex'

const root = process.cwd()
const contentDirs = ['docs', 'code-training/docs']
const rootPages = ['index.md', 'stars.md', 'projects.md', 'settings.md']

/** Quarto 生成的目录：改公式要改源 ipynb 再 `pnpm sync:ml`，所以不查围栏写法 */
const GENERATED_DIR = 'code-training/docs/machine-learning/'

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith('.md')) out.push(path)
  }
  return out
}

const files = [
  ...contentDirs.flatMap((dir) => walk(join(root, dir))),
  ...rootPages.map((name) => join(root, name)),
]

/**
 * 把 fenced code block 与行内代码替换成等长空格，保留换行。
 * 返回遮罩后的全文与围栏块清单（供写法检查用）。
 */
function maskCode(source) {
  const fences = []
  const lines = source.split('\n')
  const masked = []
  let fence = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const open = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)/)
    if (fence) {
      if (open && open[1][0] === fence.marker[0] && open[1].length >= fence.marker.length) {
        fence.end = i + 1
        fences.push(fence)
        fence = null
      }
      // 围栏内容一律遮掉，但保留换行
      masked.push('')
      continue
    }
    if (open) {
      fence = { start: i + 1, lang: (open[2] || '').toLowerCase(), marker: open[1], lines: [] }
      masked.push('')
      continue
    }
    masked.push(maskInlineCode(line))
  }
  // 未闭合的围栏：交给构建去报错，这里当作延伸到文末
  if (fence) {
    fence.end = lines.length
    fences.push(fence)
  }

  // 记录围栏正文（用于写法检查）
  for (const f of fences) {
    f.lines = lines.slice(f.start, f.end - 1)
  }

  return { masked: masked.join('\n'), fences }
}

const CODE_LANGS = new Set([
  'python', 'py', 'js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx', 'vue',
  'java', 'c', 'cpp', 'c++', 'cs', 'go', 'rust', 'rb', 'ruby', 'php', 'swift', 'kt',
  'sql', 'mysql', 'postgres', 'bash', 'sh', 'shell', 'zsh', 'powershell', 'ps1',
  'json', 'yaml', 'yml', 'toml', 'ini', 'properties', 'nginx', 'dockerfile', 'xml',
  'html', 'css', 'scss', 'sass', 'less', 'asm', 'verilog', 'vhdl', 'mermaid',
  'diff', 'git', 'makefile', 'regex', 'http', 'protobuf', 'graphql',
])

/** 只处理「无语言 / text / plaintext / txt」的围栏 */
function isFormulaFence(lang) {
  return lang === '' || lang === 'text' || lang === 'plaintext' || lang === 'txt'
}

// 只留真正的数学记号：Σ/∑/√ 与 `ln(` `cos(` 这类函数名。
// `log(` 不进来：`console.log(`、`O(... log n)` 太常见，会造出一堆误报。
// `(?<![\w.])` 挡掉 `console.log(` / `np.cos(` 这种成员调用。
const FENCE_SIGNAL = /[Σ∑√]|(?<![\w.])(?:ln|cos|sin|tan)\s*\(/
const FRACTION_BAR = /^\s*[─━]{5,}\s*$/
const BOX_DRAWING = /[┌┐└┘├┤┬┴┼│]/

/** 返回一个围栏块里「像公式」的行号（1 基，绝对行号） */
function formulaLines(fence) {
  if (BOX_DRAWING.test(fence.lines.join('\n'))) return []
  const hits = []
  for (let i = 0; i < fence.lines.length; i++) {
    const line = fence.lines[i]
    if (FENCE_SIGNAL.test(line)) {
      hits.push(fence.start + 1 + i)
      continue
    }
    if (FRACTION_BAR.test(line)) {
      const prev = fence.lines[i - 1] ?? ''
      const next = fence.lines[i + 1] ?? ''
      if (prev.includes('=') && next.includes('=')) hits.push(fence.start + 1 + i)
    }
  }
  return hits
}

/** 遮掉行内代码（`...`、``...`` 等任意反引号长度） */
function maskInlineCode(line) {
  let out = ''
  let i = 0
  const source = line.split('\n')[0]
  while (i < source.length) {
    if (source[i] !== '`') {
      out += source[i++]
      continue
    }
    let run = 0
    while (source[i + run] === '`') run++
    const fence = '`'.repeat(run)
    const end = source.indexOf(fence, i + run)
    if (end === -1) {
      out += source.slice(i, i + run)
      i += run
      continue
    }
    out += ' '.repeat(end + run - i)
    i = end + run
  }
  // 行内代码不跨行，这里不会丢内容；保险起见过长的行原样返回
  return out.length === source.length ? out : source
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length

/** 抽取并渲染所有公式；返回错误列表 */
function checkMath(source) {
  const { masked } = maskCode(source)
  const errors = []
  const ranges = []

  const display = /\$\$([\s\S]*?)\$\$/g
  let m
  while ((m = display.exec(masked))) {
    ranges.push([m.index, m.index + m[0].length])
    renderMath(m[1], true, lineOf(masked, m.index))
  }

  let inlineSource = masked
    .split('')
    .map((ch, i) => ranges.some(([a, b]) => i >= a && i < b) ? (ch === '\n' ? '\n' : ' ') : ch)
    .join('')
  const inline = /\$([^$\n]+?)\$/g
  while ((m = inline.exec(inlineSource))) {
    renderMath(m[1], false, lineOf(inlineSource, m.index))
  }

  function renderMath(tex, displayMode, line) {
    try {
      katex.renderToString(tex, { displayMode, throwOnError: true, strict: 'ignore' })
    } catch (error) {
      errors.push(`第 ${line} 行：${error.message.split('\n')[0]}`)
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// 自检：证明两条规则都真的接上了，否则全站 0 红说明不了什么
// ---------------------------------------------------------------------------
if (checkMath('$$\\frac{1}{$$').length === 0) {
  throw new Error('自检失败：坏公式没有被判成解析错误')
}
if (checkMath('$$\\frac{a}{b}$$').length !== 0) {
  throw new Error('自检失败：合法公式被误报')
}
const selfFence = { start: 1, lines: ['G(n) = Σ G(i-1)'] }
if (formulaLines(selfFence).length === 0) {
  throw new Error('自检失败：围栏里的 Σ 没有被识别')
}
const barFence = { start: 1, lines: ['a = b', '──────', 'c = d'] }
if (formulaLines(barFence).length === 0) {
  throw new Error('自检失败：ASCII 分数线没有被识别')
}

// ---------------------------------------------------------------------------
// 全站检查
// ---------------------------------------------------------------------------
const mathFailures = []
const fenceFailures = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const error of checkMath(source)) {
    mathFailures.push(`${relative(root, file)}:${error}`)
  }

  if (relative(root, file).startsWith(GENERATED_DIR)) continue
  for (const fence of maskCode(source).fences) {
    if (!isFormulaFence(fence.lang)) continue
    for (const line of formulaLines(fence)) {
      fenceFailures.push(`${relative(root, file)}:${line}`)
    }
  }
}

let failed = false

if (mathFailures.length > 0) {
  failed = true
  console.error('以下公式 KaTeX 解析失败（线上会渲染成红字，构建不会报错）：\n')
  for (const hit of mathFailures) console.error(`  ✗ ${hit}`)
  console.error('')
}

if (fenceFailures.length > 0) {
  failed = true
  console.error('以下公式写在了代码块里（应改成 `$$...$$` / `$...$`）：\n')
  for (const hit of fenceFailures) console.error(`  ✗ ${hit}`)
  console.error(`
规则见 AGENTS.md「公式：KaTeX，不写进代码块」：
  - 复杂公式（分式、Σ/∏、上下标、多行推导）用 \`$$...$$\`，行内用 \`$...$\`
  - 围栏只放代码、伪代码、ASCII 图与逐帧状态
  - 中文进 \\text{}；% # & 要转义；多行用 \\begin{aligned}
`)
}

if (failed) process.exit(1)

console.log(`✓ ${files.length} 篇正文：KaTeX 全部可解析，代码块里没有数学公式`)
