/**
 * 给 `docs-samples` 包补 fuzz 隐藏测试。
 *
 * 只做「文档解能跑通」的输入变异，期望值由文档解现场算出：
 *   - stdin 包：按词法改数字/0-1 格，保留行结构；
 *   - function 包：递归改参数里的数字/字符串，保留容器形状。
 *
 * 不追求竞赛级强度，但把「只有 1~3 个可见样例」的包补到 10 个左右，
 * 让提交至少不是只跑题面样例。专用 harness / 类 API 包跳过，后面单独补。
 */
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {readFrontMatter} from '../.vuepress/paths'
import {judgeIdOf} from '../src/components/training/judge/id'
import {pythonBlock, section} from '../plugins/py-samples'
import {analyzeSnippet, callTarget, nodeParams} from '../src/components/training/pyrunner/snippet'
import {usesDummyHead} from '../src/components/training/pyrunner/runner'
import {buildCallDriver, buildPrelude} from '../src/components/training/pyrunner/driver'

interface Meta {
  id: string
  title: string
  mode: 'stdin' | 'function' | 'script'
  entry?: string
  activeTestCount: number
  fullTestCount: number
  provenance?: Record<string, unknown>
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.name.endsWith('.md')) out.push(full)
  }
  return out
}

function docsMap(): Map<string, {code: string; file: string}> {
  const map = new Map<string, {code: string; file: string}>()
  const root = path.join(process.cwd(), 'code-training/docs/problems')
  for (const file of walk(root)) {
    const md = fs.readFileSync(file, 'utf8')
    const fm = readFrontMatter(file)
    const docId = path.relative(path.join(process.cwd(), 'code-training/docs'), file).split(path.sep).join('/')
    const id = judgeIdOf(fm, docId)
    map.set(id, {code: pythonBlock(section(md, '完整代码实现')), file})
  }
  return map
}

function randomInt(n: number): number {
  return Math.floor(Math.random() * n)
}

function mutateValue(v: unknown, depth = 0): unknown {
  if (depth > 5) return v
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) return Math.round((v + (Math.random() - 0.5) * 4) * 1000) / 1000
    const choices = [0, 1, -1, v + 1, v - 1, randomInt(Math.max(1, Math.abs(v) + 10))]
    return choices[randomInt(choices.length)]
  }
  if (typeof v === 'string') {
    const chars = 'abcxyz0123'
    if (v.length <= 1) return chars[randomInt(chars.length)]
    const pos = randomInt(v.length)
    return `${v.slice(0, pos)}${chars[randomInt(chars.length)]}${v.slice(pos + 1)}`
  }
  if (Array.isArray(v)) {
    return v.map((x) => (Math.random() < 0.5 ? mutateValue(x, depth + 1) : x))
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) out[k] = Math.random() < 0.5 ? mutateValue(val, depth + 1) : val
    return out
  }
  return v
}

function parseLiteral(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    /* 继续尝试 Python/JS 混合字面量 */
  }
  try {
    const js = text
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
    // eslint-disable-next-line no-new-func
    return new Function(`return (${js})`)()
  } catch {
    return undefined
  }
}

function runFunctionCase(
  code: string,
  meta: Meta,
  args: string[],
): {v?: string; e?: string} {
  const analysis = analyzeSnippet(code, meta.entry ?? null)
  if (!analysis.runnable || !analysis.entry) return {e: 'entry not runnable'}
  const entry = analysis.entry
  const dir = fs.mkdtempSync(path.join('/tmp/opencode', 'judge-hidden-'))
  const resultPath = path.join(dir, 'result.json')
  const prelude = buildPrelude({filename: '/w/main.py', code: '', stdin: ''})
  const driver = buildCallDriver(
    [args],
    callTarget(entry),
    nodeParams(entry, code),
    false,
    usesDummyHead(code),
    true,
    resultPath,
  )
  const script = [
    prelude,
    'from typing import *',
    "__name__ = '__snippet__'",
    code,
    driver,
  ].join('\n')
  const file = path.join(dir, 'main.py')
  fs.writeFileSync(file, script)
  const res = spawnSync('python3', [file], {encoding: 'utf8', timeout: 5000, maxBuffer: 8 * 1024 * 1024})
  if (res.status !== 0 || !fs.existsSync(resultPath)) return {e: res.stderr || 'driver failed'}
  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8')) as {v?: string; e?: string}
  } catch {
    return {e: 'bad result'}
  }
}

function runStdin(code: string, stdin: string): {stdout: string; ok: boolean} {
  const dir = fs.mkdtempSync(path.join('/tmp/opencode', 'judge-hidden-'))
  const file = path.join(dir, 'main.py')
  fs.writeFileSync(file, code)
  const res = spawnSync('python3', [file], {
    input: stdin,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 8 * 1024 * 1024,
  })
  return {stdout: res.stdout ?? '', ok: res.status === 0 && Boolean(res.stdout?.trim())}
}

function mutateStdin(text: string): string {
  const lines = text.split('\n')
  return lines
    .map((line, i) => {
      /**
       * 单整数行且下一行正好这么多 token，几乎肯定是「长度/数量」。
       * 这类数字改了会把合法输入变成负长度/错位数组（HJ80 踩过：
       * n1 被改成 -1，文档解仍能算出东西，但测试没有意义）。
       */
      const tokens = line.trim().split(/\s+/).filter(Boolean)
      if (tokens.length === 1 && /^\d+$/.test(tokens[0])) {
        const n = Number(tokens[0])
        const next = lines[i + 1]?.trim().split(/\s+/).filter(Boolean) ?? []
        if (next.length === n) return line
      }
      return line
        .replace(/-?\d+(?:\.\d+)?/g, (m) => {
          const n = Number(m)
          if (!Number.isFinite(n)) return m
          const choices = [0, 1, -1, n + 1, n - 1, randomInt(Math.max(1, Math.abs(n) + 10))]
          return String(choices[randomInt(choices.length)])
        })
        .replace(/[a-zA-Z]/g, (c) => (Math.random() < 0.15 ? (c === c.toLowerCase() ? 'x' : 'X') : c))
    })
    .join('\n')
}

function main(): void {
  const dataRoot = path.resolve(arg('--data') ?? '/home/hanphone/develop-projects/hanphone-blog/judge-server/data/problems')
  const only = arg('--only')
  const docs = docsMap()
  const skip = new Set(['leetcode-141', 'leetcode-142', 'leetcode-160'])
  let touched = 0
  let addedTotal = 0

  for (const dir of fs.readdirSync(dataRoot, {withFileTypes: true})) {
    if (!dir.isDirectory()) continue
    const pdir = path.join(dataRoot, dir.name)
    const metaFile = path.join(pdir, 'meta.json')
    if (!fs.existsSync(metaFile)) continue
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as Meta
    if (only && meta.id !== only) continue
    const source = String(meta.provenance?.source ?? '')
    if (source !== 'docs-samples' || skip.has(meta.id) || meta.mode === 'script') continue
    const doc = docs.get(meta.id)
    if (!doc?.code) continue

    const testsDir = path.join(pdir, 'tests')
    const existing = fs.existsSync(testsDir)
      ? fs.readdirSync(testsDir).filter((f) => /^\d+\.(in|out|json)$/.test(f))
      : []
    const seqs = existing.map((f) => Number(/^(\d+)/.exec(f)?.[1] ?? 0))
    let next = Math.max(0, ...seqs) + 1
    let added = 0

    if (meta.mode === 'stdin') {
      const inputs = existing.filter((f) => f.endsWith('.in')).slice(0, 4)
      for (const inFile of inputs) {
        const text = fs.readFileSync(path.join(testsDir, inFile), 'utf8')
        for (let k = 0; k < 5; k++) {
          const mutated = mutateStdin(text)
          const out = runStdin(doc.code, mutated)
          if (!out.ok) continue
          fs.writeFileSync(path.join(testsDir, `${String(next).padStart(4, '0')}.in`), mutated)
          fs.writeFileSync(path.join(testsDir, `${String(next).padStart(4, '0')}.out`), `${out.stdout.trim()}\n`)
          next += 1
          added += 1
        }
      }
    } else if (meta.mode === 'function') {
      const cases = existing
        .filter((f) => f.endsWith('.json'))
        .slice(0, 3)
        .map((f) => JSON.parse(fs.readFileSync(path.join(testsDir, f), 'utf8')) as {args: string[]; expected: string})
      for (const c of cases) {
        for (let k = 0; k < 5; k++) {
          const args = c.args.map((a) => {
            const parsed = parseLiteral(a)
            if (parsed === undefined) return a
            return JSON.stringify(mutateValue(parsed))
          })
          if (args.every((a, i) => a === c.args[i])) continue
          const r = runFunctionCase(doc.code, meta, args)
          if (!r || r.e !== undefined || r.v === undefined) continue
          fs.writeFileSync(
            path.join(testsDir, `${String(next).padStart(4, '0')}.json`),
            `${JSON.stringify({args, expected: r.v}, null, 2)}\n`,
          )
          next += 1
          added += 1
        }
      }
    }

    if (added > 0) {
      meta.fullTestCount += added
      meta.activeTestCount = Math.min(25, meta.fullTestCount)
      meta.provenance = {...meta.provenance, hidden: {fuzz: added}}
      fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`)
      touched += 1
      addedTotal += added
      console.log(`+ ${meta.id}  +${added} (${meta.activeTestCount}/${meta.fullTestCount})`)
    }
  }

  console.log(`\n补了 ${addedTotal} 个测试点到 ${touched} 个包`)
}

main()
