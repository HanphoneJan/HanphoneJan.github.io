/**
 * 题解 -> 评测包覆盖报告。
 *
 * 只读：扫描 `code-training/docs/problems/**\/*.md`，算出 judgeId，
 * 检查 `<judge-server>/data/problems/<judgeId>` 是否存在。
 *
 * 用法：
 *   pnpm judge:inventory -- --data /home/.../judge-server/data/problems
 */
import fs from 'node:fs'
import path from 'node:path'
import {readFrontMatter} from '../.vuepress/paths'
import {judgeIdOf} from '../src/components/training/judge/id'
import {pythonBlock, section} from '../plugins/py-samples'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out.sort()
}

const dataDir = path.resolve(
  arg('--data') ??
    '/home/hanphone/develop-projects/hanphone-blog/judge-server/data/problems',
)
const root = path.join(process.cwd(), 'code-training', 'docs', 'problems')
const rows = walk(root).map((file) => {
  const md = fs.readFileSync(file, 'utf8')
  const fm = readFrontMatter(file)
  const docId = path
    .relative(path.join(process.cwd(), 'code-training', 'docs'), file)
    .split(path.sep)
    .join('/')
  const judgeId = judgeIdOf(fm, docId)
  const code = pythonBlock(section(md, '完整代码实现'))
  const pkg = path.join(dataDir, judgeId, 'meta.json')
  return {
    docId,
    platform: String(fm.platform ?? ''),
    id: String(fm.id ?? ''),
    judgeId,
    hasPython: code.length > 0,
    hasPackage: fs.existsSync(pkg),
  }
})

const byPlatform = new Map<string, {total: number; code: number; pkg: number}>()
for (const r of rows) {
  const key = r.platform || '(none)'
  const item = byPlatform.get(key) ?? {total: 0, code: 0, pkg: 0}
  item.total += 1
  if (r.hasPython) item.code += 1
  if (r.hasPackage) item.pkg += 1
  byPlatform.set(key, item)
}

console.log(`题解 ${rows.length} 篇；有评测包 ${rows.filter((r) => r.hasPackage).length} 篇\n`)
console.log('平台\t总数\t有Python\t有评测包\t覆盖率')
for (const [platform, v] of [...byPlatform.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const rate = v.code ? `${Math.round((v.pkg / v.code) * 100)}%` : '-'
  console.log(`${platform}\t${v.total}\t${v.code}\t${v.pkg}\t${rate}`)
}

const missing = rows.filter((r) => r.hasPython && !r.hasPackage)
console.log(`\n未覆盖（有 Python 代码、无评测包）${missing.length} 篇：`)
for (const r of missing.slice(0, 80)) {
  console.log(`  ${r.judgeId}  ${r.platform}  ${r.docId}`)
}
if (missing.length > 80) console.log(`  … 另有 ${missing.length - 80} 篇`)
