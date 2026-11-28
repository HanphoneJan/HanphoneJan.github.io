/**
 * 从 LeetCodeDataset 生成 judge-server 题目包。
 *
 * 只处理 docs 里 platform: LeetCode 的题解；牛客/CodeFun 等仍走自生成。
 * 生成器做四件事：
 *   1. 按 question_id / task_id 匹配数据集；
 *   2. 把 `nums = [...], target = ...` 拆成入口参数；
 *   3. 用数据集参考解和文档里的 Python 解各跑一遍，丢掉不通过的用例；
 *   4. 写 meta.json / harness.py / tests/*.json。
 *
 * 用法：
 *   pnpm judge:gen -- --dataset /tmp/opencode/lcd-repo/data/LeetCodeDataset-v0.3.1-train.jsonl.gz \
 *     --out /home/.../judge-server/data/problems --only leetcode-1
 */
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {gunzipSync} from 'node:zlib'
import {readFrontMatter} from '../.vuepress/paths'
import {judgeIdOf} from '../src/components/training/judge/id'
import {
  crossCheckEntryName,
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
import {usesDummyHead} from '../src/components/training/pyrunner/runner'
import {compare} from '../src/components/training/pyrunner/compare'

interface DatasetRow {
  task_id: string
  question_id: number
  prompt: string
  completion: string
  input_output: Array<{input: string; output: string}>
  entry_point?: string
}

interface DocProblem {
  file: string
  docId: string
  judgeId: string
  title: string
  url: string
  platform: string
  code: string
  entryName: string | null
  md: string
}

interface GeneratedCase {
  args: string[]
  expected: string
  flags?: {orderAgnostic?: boolean}
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

function readRows(file: string): DatasetRow[] {
  const raw = fs.readFileSync(file)
  const text = (file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DatasetRow)
}

/** 顶层逗号切分：括号/引号里的逗号不切。 */
function splitTop(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      cur += ch
      if (ch === '\\') {
        cur += text[++i] ?? ''
      } else if (ch === quote) {
        quote = ''
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      continue
    }
    if ('([{'.includes(ch)) depth++
    if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function topLevelEquals(part: string): number {
  let depth = 0
  let quote = ''
  for (let i = 0; i < part.length; i++) {
    const ch = part[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if ('([{'.includes(ch)) depth++
    if (')]}'.includes(ch)) depth--
    if (ch === '=' && depth === 0) return i
  }
  return -1
}

function argsOf(
  input: string,
  paramNames: string[],
  requiredCount = paramNames.length,
): string[] | null {
  const pairs = new Map<string, string>()
  for (const part of splitTop(input)) {
    const eq = topLevelEquals(part)
    if (eq <= 0) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key && value) pairs.set(key, value)
  }
  // 末尾带默认值的参数（0002 的 carry）可以缺；前面的必填参数缺一个就整组丢。
  const args: string[] = []
  for (let i = 0; i < paramNames.length; i++) {
    const value = pairs.get(paramNames[i])
    if (value === undefined) {
      if (i < requiredCount) return null
      break
    }
    args.push(value)
  }
  return args
}

/** 数据集 entry_point 形如 `Solution().searchMatrix`，取出最后一段。 */
function datasetEntryName(raw: string | undefined): string | null {
  if (!raw) return null
  const m = /(?:^|\.)(\w+)$/.exec(raw)
  return m?.[1] ?? null
}

function normalizeExpected(values: string[]): string[] {
  const script = path.join(process.cwd(), 'judge-tools', 'normalize_cases.py')
  const res = spawnSync('python3', [script], {
    input: JSON.stringify(values),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (res.status !== 0 || !res.stdout) {
    return values
  }
  try {
    return JSON.parse(res.stdout) as string[]
  } catch {
    return values
  }
}

function judgeDir(): string {
  return fs.mkdtempSync(path.join('/tmp/opencode', 'judge-gen-'))
}

function runDriver(
  code: string,
  cases: Array<{args: string[]; expected: string}>,
  target: ReturnType<typeof callTarget>,
  kinds: ReturnType<typeof nodeParams>,
  dummy: boolean,
  label: string,
): Array<{v?: string; e?: string; m?: boolean}> {
  const dir = judgeDir()
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
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || '').trim()
    console.warn(`  ! ${label} 驱动失败: ${err.split('\n').slice(-2).join(' ')}`)
    return []
  }
  if (!fs.existsSync(resultPath)) return []
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

function loadDocs(): DocProblem[] {
  const root = path.join(process.cwd(), 'code-training', 'docs', 'problems')
  const out: DocProblem[] = []
  for (const file of walk(root)) {
    const md = fs.readFileSync(file, 'utf8')
    const fm = readFrontMatter(file)
    if (String(fm.platform ?? '') !== 'LeetCode') continue
    const docId = path.relative(
      path.join(process.cwd(), 'code-training', 'docs'),
      file,
    ).split(path.sep).join('/')
    const code = pythonBlock(section(md, '完整代码实现'))
    if (!code) continue
    const sig = extractSignature(code)
    const entryName = crossCheckEntryName(md, code, sig.method) ?? sig.method
    out.push({
      file,
      docId,
      judgeId: judgeIdOf(fm, docId),
      title: String(fm.title ?? docId),
      url: String(fm.url ?? ''),
      platform: String(fm.platform ?? ''),
      code,
      entryName,
      md,
    })
  }
  return out
}

function main(): void {
  const dataset = arg('--dataset')
  const outRoot = arg('--out')
  const only = arg('--only')
  const activeLimit = Number(arg('--active') ?? 25)
  if (!dataset || !outRoot) {
    console.error(
      '用法: pnpm judge:gen -- --dataset <jsonl.gz> --out <judge-server/data/problems> [--only leetcode-1]',
    )
    process.exit(1)
  }

  const rows = readRows(dataset)
  const byQuestion = new Map<string, DatasetRow>()
  const bySlug = new Map<string, DatasetRow>()
  for (const row of rows) {
    byQuestion.set(String(row.question_id), row)
    bySlug.set(row.task_id, row)
  }

  const docs = loadDocs().filter(
    (d) => !only || d.judgeId === only || d.judgeId.endsWith(`-${only}`) || d.docId.includes(only),
  )
  if (docs.length === 0) {
    console.error(`没有匹配的文档题解: ${only ?? '(all)'}`)
    process.exit(1)
  }

  let generated = 0
  for (const doc of docs) {
    if (!doc.entryName) {
      console.warn(`- ${doc.judgeId}: 找不到入口，跳过`)
      continue
    }
    const slug = /leetcode(?:\.cn|\.com)\/problems\/([^/]+)/.exec(doc.url)?.[1]
    const row =
      byQuestion.get(String(readFrontMatter(doc.file).id)) ??
      (slug ? bySlug.get(slug) : undefined)
    if (!row) {
      console.warn(`- ${doc.judgeId}: 数据集无匹配，跳过`)
      continue
    }

    let analysis = analyzeSnippet(doc.code, doc.entryName)
    // 数据集参考解和文档解可能把入口写在不同方法上（0240 的
    // searchMatrix_binary_search vs searchMatrix、0322 的 coinChange_memo）。
    // 以数据集 entry_point 为准，只要文档代码里也有这个方法。
    const dsEntry = datasetEntryName(row.entry_point)
    if (dsEntry) {
      const alt = analyzeSnippet(doc.code, dsEntry)
      if (alt.runnable && alt.entry) analysis = alt
    }
    if (!analysis.runnable || !analysis.entry) {
      console.warn(`- ${doc.judgeId}: 文档片段不可运行，跳过`)
      continue
    }
    const entry = analysis.entry
    const kinds = nodeParams(entry, doc.code)
    const target = callTarget(entry)
    const dummy = usesDummyHead(doc.code)

    const rawCases = row.input_output
      .map((c) => ({
        args: argsOf(c.input, entry.paramNames, entry.requiredCount),
        output: c.output,
      }))
      .filter((c): c is {args: string[]; output: string} => c.args !== null)
    if (rawCases.length === 0) {
      console.warn(`- ${doc.judgeId}: 数据集输入拆不出参数，跳过`)
      continue
    }

    const expected = normalizeExpected(rawCases.map((c) => c.output))
    const cases = rawCases.map((c, i) => ({
      args: c.args,
      expected: expected[i] ?? c.output,
    }))

    // 只验证前 25 个：全量 100+ 用例会把递归/组合题跑成几分钟，
    // 而服务端一次提交本来就只跑 active set。017 的 16 位 digits
    // 会产生 4^16 个组合，放在后面的用例里，别让它拖死验证。
    const validation = cases.slice(0, 25)
    const reference = `${row.prompt}\n${row.completion}`
    const refResults = runDriver(
      reference,
      validation,
      target,
      kinds,
      dummy,
      '参考解',
    )
    const docsResults = runDriver(doc.code, validation, target, kinds, dummy, '文档解')
    // 数据集 prompt 偶尔依赖 sortedcontainers 之类没有装的包；这时不能
    // 让整题消失，退化成「只信文档解 + 数据集期望值」。
    const referenceUsable = refResults.some((r) => r && r.e === undefined)
    if (process.env.DEBUG_JUDGE) {
      console.log('[debug] first cases', cases.slice(0, 2))
      console.log('[debug] ref', refResults.slice(0, 2))
      console.log('[debug] docs', docsResults.slice(0, 2))
    }

    const kept: GeneratedCase[] = []
    validation.forEach((c, i) => {
      const ref = refResults[i]
      const docs = docsResults[i]
      if (!docs || docs.e !== undefined) return
      if (referenceUsable && (!ref || ref.e !== undefined)) return

      /**
       * 原地修改题（moveZeroes / rotate / flatten…）LeetCode 的 output 是
       * `None`，真正的答案在**被改过的入参**里。driver 的 NONE_RETURN 会把
       * 它序列化成 v 并置 m=true；这种情况用参考解的 v 当期望值。
       */
      let expected =
        referenceUsable && c.expected === 'null' && ref?.m === true
          ? (ref.v ?? 'null')
          : c.expected
      // 0023 这类「返回链表/列表」的题，数据集把空结果写成 None，
      // 而参考解/文档解都给出 []；以实际返回的空列表为准。
      if (
        expected === 'null' &&
        docs.v === '[]' &&
        (!referenceUsable || ref?.v === '[]')
      ) {
        expected = '[]'
      }

      const refOk = !referenceUsable || compare(ref?.v ?? '', expected).ok
      const docsOk = compare(docs.v ?? '', expected).ok
      if (refOk && docsOk) {
        kept.push({args: c.args, expected})
        return
      }
      // 题面允许多个合法答案时，按多重集再试一次。
      const refOrder =
        !referenceUsable ||
        compare(ref?.v ?? '', expected, {orderAgnostic: true}).ok
      const docsOrder = compare(docs.v ?? '', expected, {orderAgnostic: true}).ok
      if (refOrder && docsOrder) {
        kept.push({
          args: c.args,
          expected,
          flags: {orderAgnostic: true},
        })
      }
    })

    if (kept.length === 0) {
      console.warn(`- ${doc.judgeId}: 所有用例都被闸门丢弃，跳过`)
      continue
    }

    const dir = path.join(outRoot, doc.judgeId)
    fs.rmSync(dir, {recursive: true, force: true})
    fs.mkdirSync(path.join(dir, 'tests'), {recursive: true})

    const meta = {
      id: doc.judgeId,
      title: doc.title,
      platform: 'LeetCode',
      url: doc.url,
      mode: 'function',
      entry: entry.name,
      languages: ['python'],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      compare: 'json',
      activeTestCount: Math.min(activeLimit, kept.length),
      fullTestCount: kept.length,
      provenance: {
        source: 'newfacade/LeetCodeDataset',
        version: 'v0.3.1',
        license: 'Apache-2.0 (HF) / MIT (GitHub)',
        taskId: row.task_id,
        questionId: row.question_id,
        url: 'https://huggingface.co/datasets/newfacade/LeetCodeDataset',
        importedAt: new Date().toISOString(),
        dropped: cases.length - kept.length,
      },
    }
    fs.writeFileSync(
      path.join(dir, 'meta.json'),
      `${JSON.stringify(meta, null, 2)}\n`,
    )
    fs.writeFileSync(path.join(dir, 'harness.py'), `${makeHarness(target, kinds, dummy)}\n`)

    kept.forEach((c, i) => {
      fs.writeFileSync(
        path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.json`),
        `${JSON.stringify(c, null, 2)}\n`,
      )
    })

    generated += 1
    console.log(
      `✓ ${doc.judgeId}  ${doc.title}  保留 ${kept.length}/${cases.length}（active ${meta.activeTestCount}）`,
    )
  }

  console.log(`\n生成 ${generated} 个题目包 -> ${outRoot}`)
}

main()
