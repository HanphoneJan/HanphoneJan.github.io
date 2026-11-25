/**
 * 加粗回归测试：正文里不允许出现**字面星号**。
 *
 * `**` 在 CommonMark 下有两道容易踩的闸门：
 *
 * 1. `**` 后面紧跟空白就不能开（`这是一个经典的** Flood Fill**问题` 整句退化成字面星号）；
 * 2. 闭合的 `**` 如果前一个字符是标点，而后一个字符既不是空白也不是标点，
 *    同样不成立 —— `**端口号（Port）**将` 这种「中文里最自然的写法」正好中招。
 *
 * 第 2 类站点已经兜住了：`vuepress-theme-hope` 的 `@vuepress/plugin-markdown-ext`
 * 带 `cjkFriendly`，站点 `lang: 'zh-CN'` 时自动开启。所以线上大批
 * `**中文（注）**后面` 是正常的，**只有第 1 类与配对数量不对的才真的会露出星号**。
 *
 * 这个脚本用的就是线上那份规则（`vuepress/markdown` + `markdown-it-cjk-friendly`，
 * 后者是直接 devDependency，版本与主题带的那份一致），渲染全站 md 后检查
 * text token —— 代码块里的 `**` 天然不算（那是 code token）。
 *
 * 运行：`pnpm test:bold`
 */
import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createMarkdown } from 'vuepress/markdown'
import cjkFriendly from 'markdown-it-cjk-friendly'

const root = process.cwd()

const md = createMarkdown({ html: true })
md.use(cjkFriendly)

/** 站上会被渲染成页面的 md：两个内容目录 + 四个根页面 */
const contentDirs = ['docs', 'code-training/docs']
const rootPages = ['index.md', 'stars.md', 'projects.md', 'settings.md']

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

/** 收集渲染后仍以字面 `**` 出现在正文里的位置 */
function literalAsterisks(source) {
  const hits = []
  for (const token of md.parse(source, {})) {
    if (!token.children) continue
    const hasLiteral = token.children.some(
      (child) => child.type === 'text' && child.content.includes('**'),
    )
    if (hasLiteral) hits.push((token.map?.[0] ?? 0) + 1)
  }
  return hits
}

// 自检：证明插件确实接上了，否则下面 40 多篇会一起报错
const stillBroken = literalAsterisks('这是一个经典的** Flood Fill（洪水填充）**问题。')
if (stillBroken.length === 0) throw new Error('自检失败：`**` 后跟空格的句子居然被判成加粗了')
if (literalAsterisks('依赖**端口号（Port）**完成分发。').length !== 0) {
  throw new Error('自检失败：cjk-friendly 没接上，中文标点结尾的加粗会被误报')
}

const failures = []
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const line of literalAsterisks(source)) {
    failures.push(`${relative(root, file)}:${line}`)
  }
}

if (failures.length > 0) {
  console.error('以下页面会把 `**` 原样显示出来：\n')
  for (const hit of failures) console.error(`  ✗ ${hit}`)
  console.error(`
修法（按成因）：
  - \`**\` 后面多了空格        → 去掉：\`**Flood Fill\` 而不是 \`** Flood Fill\`
  - 闭合的 \`**\` 前面多了空格  → 去掉：\`**直接左递归**\`
  - 开闭数量不配对            → 补齐闭合处，或整句不加粗
  - 行内代码里的反引号吃掉了星号 → 反引号转义为 \\\`
详见 AGENTS.md「加粗：\`**\` 与中文标点」。
`)
  process.exit(1)
}

console.log(`✓ ${files.length} 篇正文里没有字面 \`**\``)
