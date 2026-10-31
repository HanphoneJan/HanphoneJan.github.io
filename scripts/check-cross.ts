/**
 * 跨站健康检查：文档站内部链接 + 与博客的重复配对。
 *
 * 两个功能都是从内容**派生**出来的，坏了也不会让 `pnpm build` 失败：
 *
 * 1. 相对链接写错（`../后端/xxx.md` 少一层、文件名改了没跟着改）——页面上就是一个
 *    点不动的链接，构建照常成功。这批笔记从 Obsidian 迁过来时最容易出现。
 * 2. 文档站和博客同时存在一篇同主题文章，谁也不知道另一份存在 —— `pnpm cross:link`
 *    生成的配对表放在 data/cross-link.json，这里读它做提示（文件不存在就跳过）。
 *
 * 用法：
 *
 *   pnpm check:cross           # 检查链接
 *   pnpm check:cross --links   # 只跑链接
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const SILENT = process.argv.includes('--json')

interface Broken {
  file: string
  line: number
  target: string
  reason: string
}

function walkMarkdown(dir: string, out: string[] = []): string[] {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith('.') || dirent.name === 'node_modules') continue
    const full = path.join(dir, dirent.name)
    if (dirent.isDirectory()) walkMarkdown(full, out)
    else if (dirent.name.endsWith('.md')) out.push(full)
  }
  return out
}

/** 去掉代码块，避免把示例里的链接当真实链接 */
function stripFences(text: string): string[] {
  const lines = text.split('\n')
  const kept: string[] = []
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      kept.push('')
      continue
    }
    kept.push(inFence ? '' : line)
  }
  return kept
}

function collectBroken(): Broken[] {
  const broken: Broken[] = []
  const files = walkMarkdown(path.join(ROOT, 'docs'))

  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const lines = stripFences(fs.readFileSync(file, 'utf8'))

    lines.forEach((line, index) => {
      const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        const target = match[1]
        if (/^(https?:|mailto:|#|\/\/|data:)/.test(target)) continue
        if (target.startsWith('#')) continue

        // 去掉 hash 与查询串
        const clean = target.split('#')[0].split('?')[0]
        if (!clean) continue

        if (clean.startsWith('/')) {
          if (!/^\/(docs|code-training)\//.test(clean)) continue
          const decoded = decodeURI(clean).replace(/\.html$/, '')
          const asFile = decoded.startsWith('/docs/')
            ? path.join(ROOT, 'docs', decoded.replace(/^\/docs\/?/, ''))
            : path.join(ROOT, 'code-training/docs', decoded.replace(/^\/code-training\/?/, ''))
          if (!fs.existsSync(asFile) && !fs.existsSync(`${asFile}.md`)) {
            // 生成页（category/tags）在构建期才有，跳过
            if (/^\/code-training\/(category|tags)/.test(decoded)) continue
            broken.push({ file: rel, line: index + 1, target, reason: '绝对路径找不到对应 md' })
          }
          continue
        }

        const resolved = path.resolve(path.dirname(file), decodeURI(clean))
        if (fs.existsSync(resolved)) continue
        if (fs.existsSync(`${resolved}.md`)) continue
        broken.push({ file: rel, line: index + 1, target, reason: '相对路径不存在' })
      }
    })
  }
  return broken
}

function reportPairs(): void {
  const jsonPath = path.join(ROOT, 'data', 'cross-link.json')
  if (!fs.existsSync(jsonPath)) {
    console.log('\n（跳过跨站配对：先跑一次 pnpm cross:link）')
    return
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {
    blogToDocs?: Array<{ blogTitle: string; docsPath: string; score: number }>
  }
  const pairs = data.blogToDocs ?? []
  console.log(`\n跨站配对 ${pairs.length} 组（博客 ↔ 文档站），全部保留，只提示：`)
  for (const pair of pairs) {
    const mark = pair.score >= 0.95 ? '≈相同' : '相关'
    console.log(`  ${mark}  ${pair.blogTitle}  →  ${pair.docsPath}`)
  }
}

function main(): void {
  const broken = collectBroken()

  if (broken.length === 0) {
    console.log(`✔ 链接检查通过（docs/ 下 ${walkMarkdown(path.join(ROOT, 'docs')).length} 篇）`)
  } else {
    console.log(`✖ 发现 ${broken.length} 处失效链接：`)
    for (const item of broken) {
      console.log(`  ${item.file}:${item.line}  ${item.target}  (${item.reason})`)
    }
  }

  if (!SILENT) reportPairs()

  if (broken.length > 0) process.exit(1)
}

main()
