/**
 * 非 LeetCode 题解的「可见样例」评测包生成器。
 *
 * 这不是最终形态：先用题面样例让牛客/CodeFun/自定义题马上能提交，
 * 后续再把 CYaRon/ojgen 生成的隐藏测试补进同一个包。
 *
 * - stdin 题：取 `## 示例` 的 stdin/stdout 样例，跑一遍文档解，通过的留下。
 * - 函数题：取 `samples`，用现有 driver 生成 harness，跑一遍文档解。
 * - 平台 LeetCode 默认跳过（由 judge-gen.ts 用 LeetCodeDataset 生成）。
 *
 * 用法：
 *   pnpm judge:gen-docs -- --out <judge-server/data/problems>
 */
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {readFrontMatter} from '../.vuepress/paths'
import {judgeIdOf} from '../src/components/training/judge/id'
import {
  crossCheckEntryName,
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
  pythonBlock,
  section,
} from '../plugins/py-samples'
import {
  analyzeSnippet,
  callTarget,
  nodeParams,
} from '../src/components/training/pyrunner/snippet'
import {
  buildCallDriver,
  buildPrelude,
} from '../src/components/training/pyrunner/driver'
import {
  asCallArgument,
  sampleCase,
  usableSamples,
  usesDummyHead,
} from '../src/components/training/pyrunner/runner'
import {compare} from '../src/components/training/pyrunner/compare'

interface TestCase {
  args?: string[]
  stdin?: string
  expected: string
  flags?: {orderAgnostic?: boolean; multiAnswer?: boolean}
}

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

function tempDir(): string {
  return fs.mkdtempSync(path.join('/tmp/opencode', 'judge-docs-'))
}

function runPython(code: string, stdin: string): {stdout: string; error: string} {
  const dir = tempDir()
  const file = path.join(dir, 'main.py')
  fs.writeFileSync(file, code)
  const res = spawnSync('python3', [file], {
    input: stdin,
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  if (res.status !== 0) {
    return {stdout: res.stdout ?? '', error: (res.stderr ?? '').trim()}
  }
  return {stdout: res.stdout ?? '', error: ''}
}

function runFunction(
  code: string,
  cases: Array<{args: string[]; expected: string}>,
  target: ReturnType<typeof callTarget>,
  kinds: ReturnType<typeof nodeParams>,
  dummy: boolean,
): Array<{v?: string; e?: string; m?: boolean}> {
  const dir = tempDir()
  const resultPath = path.join(dir, 'result.json')
  const prelude = buildPrelude({filename: '/w/main.py', code: '', stdin: ''})
  const driver = buildCallDriver(
    cases.map((c) => c.args),
    target,
    kinds,
    false,
    dummy,
    false,
  )
  const script = [
    prelude,
    'from typing import *',
    "__name__ = '__snippet__'",
    code,
    driver,
    `with open(${JSON.stringify(resultPath)}, "w", encoding="utf-8") as __f__:`,
    '    __f__.write(__json__.dumps(__r__, ensure_ascii=False))',
  ].join('\n')
  const file = path.join(dir, 'main.py')
  fs.writeFileSync(file, script)
  const res = spawnSync('python3', [file], {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  if (res.status !== 0 || !fs.existsSync(resultPath)) return []
  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8')) as Array<{
      v?: string
      e?: string
      m?: boolean
    }>
  } catch {
    return []
  }
}

function makeHarness(
  target: ReturnType<typeof callTarget>,
  kinds: ReturnType<typeof nodeParams>,
  dummy: boolean,
): string {
  const prelude = buildPrelude({filename: '/w/main.py', code: '', stdin: ''})
  const driver = buildCallDriver(
    [],
    target,
    kinds,
    false,
    dummy,
    false,
    '/w/result.json',
    '/w/case.json',
  )
  return [
    'from typing import *',
    prelude,
    '__ns__ = dict(globals())',
    "__ns__['__name__'] = '__judge__'",
    "exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), __ns__)",
    'globals().update(__ns__)',
    driver,
  ].join('\n')
}

function warn(msg: string): void {
  console.warn(`- ${msg}`)
}

function main(): void {
  const outRoot = arg('--out')
  const only = arg('--only')
  const includeLeetcode = process.argv.includes('--include-leetcode')
  if (!outRoot) {
    console.error('用法: pnpm judge:gen-docs -- --out <judge-server/data/problems> [--only <id>]')
    process.exit(1)
  }

  const root = path.join(process.cwd(), 'code-training', 'docs', 'problems')
  let generated = 0
  let skipped = 0

  for (const file of walk(root)) {
    const md = fs.readFileSync(file, 'utf8')
    const fm = readFrontMatter(file)
    const platform = String(fm.platform ?? '')
    if (platform === 'LeetCode' && !includeLeetcode) continue
    const docId = path
      .relative(path.join(process.cwd(), 'code-training', 'docs'), file)
      .split(path.sep)
      .join('/')
    const judgeId = judgeIdOf(fm, docId)
    if (only && judgeId !== only) continue

    const code = pythonBlock(section(md, '完整代码实现'))
    if (!code) {
      skipped += 1
      continue
    }
    const sig = extractSignature(code)
    const entryName = crossCheckEntryName(md, code, sig.method) ?? sig.method
    const stdinSamples = extractDocStdinSamples(md).filter(
      (s) => s.stdin.trim() && s.expected.trim(),
    )
    const samples = usableSamples(
      extractDocSamples(md, sig.paramNames, sig.requiredCount),
    )

    const analysis = entryName ? analyzeSnippet(code, entryName) : null
    const entry =
      analysis && analysis.runnable && analysis.entry ? analysis.entry : null
    /**
     * 带 `__main__` / stdin 读取的才是程序；否则按函数题处理。
     * 牛客/CodeFun 很多「输入：」围栏其实写的是 `grid = [...]`，
     * 文档解是个方法，拿它当 stdin 程序跑会得到空输出（BM57 踩过）。
     */
    const looksProgram =
      /if\s+__name__\s*==\s*['"]__main__['"]/.test(code) ||
      /\bsys\.stdin\b/.test(code) ||
      /\binput\s*\(/.test(code)

    const cases: TestCase[] = []
    let mode: 'stdin' | 'function' = 'stdin'
    let harness: string | undefined
    let nodeKinds: ReturnType<typeof nodeParams> = []
    let target: ReturnType<typeof callTarget> | undefined

    if (looksProgram) {
      mode = 'stdin'
      for (const s of stdinSamples.slice(0, 25)) {
        const out = runPython(code, s.stdin)
        // 空输出不能过：Number('') === 0 会把「程序没读 stdin」判成通过。
        if (out.stdout.trim() && !out.error && compare(out.stdout, s.expected).ok) {
          cases.push({stdin: s.stdin, expected: s.expected.trim()})
        }
      }
      if (cases.length === 0) {
        warn(`${judgeId}: 文档解跑不过任何 stdin 样例`)
        skipped += 1
        continue
      }
    } else if (entry) {
      mode = 'function'
      nodeKinds = nodeParams(entry, code)
      target = callTarget(entry)
      const dummy = usesDummyHead(code)
      type RawCase = {
        args: string[]
        expected: string
        flags: {orderAgnostic?: boolean; multiAnswer?: boolean}
      }
      let raw: RawCase[] = samples.slice(0, 25).map((s) => ({
        args: sampleCase(s.args, entry),
        expected: s.expected,
        flags: {
          orderAgnostic: s.orderAgnostic,
          multiAnswer: s.multiAnswer,
        },
      }))
      if (raw.length === 0 && stdinSamples.length > 0 && entry.requiredCount === 1) {
        raw = stdinSamples.slice(0, 25).map((s) => ({
          args: [asCallArgument(s.stdin, entry.annotations[0])],
          expected: s.expected,
          flags: {},
        }))
      }
      if (raw.length === 0) {
        warn(`${judgeId}: 没有可用的函数样例`)
        skipped += 1
        continue
      }
      const results = runFunction(
        code,
        raw.map((c) => ({args: c.args, expected: c.expected})),
        target,
        nodeKinds,
        dummy,
      )
      raw.forEach((c, i) => {
        const r = results[i]
        if (!r || r.e !== undefined) return
        const ok = compare(r.v ?? '', c.expected, c.flags)
        if (ok.ok) {
          cases.push({args: c.args, expected: c.expected, flags: c.flags})
        }
      })
      if (cases.length === 0) {
        warn(`${judgeId}: 文档解跑不过任何函数样例`)
        skipped += 1
        continue
      }
      harness = makeHarness(target, nodeKinds, dummy)
    } else {
      skipped += 1
      continue
    }

    const dir = path.join(outRoot, judgeId)
    fs.rmSync(dir, {recursive: true, force: true})
    fs.mkdirSync(path.join(dir, 'tests'), {recursive: true})
    const meta = {
      id: judgeId,
      title: String(fm.title ?? docId),
      platform,
      url: String(fm.url ?? ''),
      mode,
      languages: ['python'],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      compare: mode === 'function' ? 'json' : 'text',
      activeTestCount: cases.length,
      fullTestCount: cases.length,
      provenance: {
        source: 'docs-samples',
        note: '题面可见样例；隐藏测试待补',
        importedAt: new Date().toISOString(),
      },
    }
    fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
    if (harness) fs.writeFileSync(path.join(dir, 'harness.py'), `${harness}\n`)
    cases.forEach((c, i) => {
      if (mode === 'stdin') {
        fs.writeFileSync(
          path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.in`),
          c.stdin ?? '',
        )
        fs.writeFileSync(
          path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.out`),
          `${c.expected}\n`,
        )
      } else {
        fs.writeFileSync(
          path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.json`),
          `${JSON.stringify(c, null, 2)}\n`,
        )
      }
    })
    generated += 1
    console.log(`✓ ${judgeId}  ${meta.title}  ${mode}  ${cases.length} cases`)
  }

  console.log(`\n生成 ${generated} 个题目包，跳过 ${skipped} 篇 -> ${outRoot}`)
}

main()
