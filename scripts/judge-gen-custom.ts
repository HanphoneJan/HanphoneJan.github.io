/**
 * 剩余「非标准函数/标准数据」题目的专用包生成器。
 *
 * 覆盖：
 *   141/142 环形链表（head + pos）
 *   146/155/208/295 类 API（操作序列）
 *   160 相交链表（listA/listB + skipA/skipB）
 *   P5493 类 API（题目用 stdin 写操作序列）
 *   Shopee 迷宫（stdin 转二维数组）/ 合并链表（箭头样例）
 *
 * 先给可见样例；隐藏测试由 judge-gen-hidden.ts 再补。
 */
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {readFrontMatter} from '../.vuepress/paths'
import {judgeIdOf} from '../src/components/training/judge/id'
import {extractDocSamples, extractDocStdinSamples, pythonBlock, section} from '../plugins/py-samples'
import {analyzeSnippet, callTarget, nodeParams} from '../src/components/training/pyrunner/snippet'
import {sampleCase, usableSamples, usesDummyHead} from '../src/components/training/pyrunner/runner'
import {buildCallDriver, buildPrelude} from '../src/components/training/pyrunner/driver'
import {compare} from '../src/components/training/pyrunner/compare'

interface Case {
  args: string[]
  expected: string
  flags?: {orderAgnostic?: boolean}
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function writeFunction(
  outRoot: string,
  id: string,
  title: string,
  code: string,
  entryName: string,
  cases: Case[],
  extra: Record<string, unknown> = {},
): void {
  const analysis = analyzeSnippet(code, entryName)
  if (!analysis.runnable || !analysis.entry) throw new Error(`${id}: ${analysis.reason}`)
  const entry = analysis.entry
  const target = callTarget(entry)
  const kinds = nodeParams(entry, code)
  const dummy = usesDummyHead(code)
  const dir = path.join(outRoot, id)
  fs.rmSync(dir, {recursive: true, force: true})
  fs.mkdirSync(path.join(dir, 'tests'), {recursive: true})

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
  const harness = [
    'from typing import *',
    prelude,
    '__ns__ = dict(globals())',
    "__ns__['__name__'] = '__judge__'",
    "exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), __ns__)",
    'globals().update(__ns__)',
    driver,
  ].join('\n')

  const meta = {
    id,
    title,
    platform: String(extra.platform ?? 'LeetCode'),
    mode: 'function',
    entry: entry.name,
    languages: ['python'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    compare: 'json',
    activeTestCount: cases.length,
    fullTestCount: cases.length,
    provenance: {
      source: 'docs-samples',
      note: '专用 harness；隐藏测试待补',
      importedAt: new Date().toISOString(),
      ...extra,
    },
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
  fs.writeFileSync(path.join(dir, 'harness.py'), `${harness}\n`)
  cases.forEach((c, i) => {
    fs.writeFileSync(
      path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.json`),
      `${JSON.stringify(c, null, 2)}\n`,
    )
  })
  console.log(`✓ ${id}  ${title}  function ${cases.length} cases`)
}

function writeScript(
  outRoot: string,
  id: string,
  title: string,
  platform: string,
  code: string,
  cases: Case[],
  harness: string,
): void {
  const dir = path.join(outRoot, id)
  fs.rmSync(dir, {recursive: true, force: true})
  fs.mkdirSync(path.join(dir, 'tests'), {recursive: true})
  const meta = {
    id,
    title,
    platform,
    mode: 'script',
    languages: ['python'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    compare: 'json',
    activeTestCount: cases.length,
    fullTestCount: cases.length,
    provenance: {
      source: 'docs-samples',
      note: '类 API 操作序列；隐藏测试待补',
      importedAt: new Date().toISOString(),
    },
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
  fs.writeFileSync(path.join(dir, 'harness.py'), `${harness}\n`)
  cases.forEach((c, i) => {
    fs.writeFileSync(
      path.join(dir, 'tests', `${String(i + 1).padStart(4, '0')}.json`),
      `${JSON.stringify(c, null, 2)}\n`,
    )
  })
  console.log(`✓ ${id}  ${title}  script ${cases.length} cases`)
}

function writeStdin(
  outRoot: string,
  id: string,
  title: string,
  platform: string,
  cases: Array<{stdin: string; expected: string}>,
): void {
  const dir = path.join(outRoot, id)
  fs.rmSync(dir, {recursive: true, force: true})
  fs.mkdirSync(path.join(dir, 'tests'), {recursive: true})
  const meta = {
    id,
    title,
    platform,
    mode: 'stdin',
    languages: ['python'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    compare: 'text',
    activeTestCount: cases.length,
    fullTestCount: cases.length,
    provenance: {
      source: 'docs-samples',
      note: '题面可见样例；隐藏测试待补',
      importedAt: new Date().toISOString(),
    },
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
  cases.forEach((c, i) => {
    const n = String(i + 1).padStart(4, '0')
    fs.writeFileSync(path.join(dir, 'tests', `${n}.in`), c.stdin)
    fs.writeFileSync(path.join(dir, 'tests', `${n}.out`), `${c.expected.trim()}\n`)
  })
  console.log(`✓ ${id}  ${title}  stdin ${cases.length} cases`)
}

function readDoc(rel: string): {md: string; code: string; title: string; platform: string; url: string; id: string} {
  const file = path.join(process.cwd(), 'code-training/docs/problems', rel)
  const md = fs.readFileSync(file, 'utf8')
  const fm = readFrontMatter(file)
  const docId = path.relative(path.join(process.cwd(), 'code-training/docs'), file).split(path.sep).join('/')
  return {
    md,
    code: pythonBlock(section(md, '完整代码实现')),
    title: String(fm.title ?? docId),
    platform: String(fm.platform ?? ''),
    url: String(fm.url ?? ''),
    id: judgeIdOf(fm, docId),
  }
}

function scriptHarness(): string {
  return `import json
import traceback

try:
    case = json.load(open('/w/case.json', encoding='utf-8'))
    ops = json.loads(case['args'][0])
    params = json.loads(case['args'][1])
    ns = {'__name__': '__judge__'}
    exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), ns)
    cls = ns[ops[0]]
    obj = cls(*params[0])
    out = [None]
    for name, args in zip(ops[1:], params[1:]):
        out.append(getattr(obj, name)(*args))
    json.dump({'v': json.dumps(out, ensure_ascii=False, default=str)}, open('/w/result.json', 'w', encoding='utf-8'))
except Exception:
    json.dump({'e': traceback.format_exc()}, open('/w/result.json', 'w', encoding='utf-8'))
`
}

function p5493Harness(): string {
  return `import json
import traceback

try:
    case = json.load(open('/w/case.json', encoding='utf-8'))
    exprs = json.loads(case['args'][0])
    ns = {'__name__': '__judge__'}
    exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), ns)
    out = []
    obj = None
    for expr in exprs:
        if expr.startswith('FileLogger('):
            obj = eval(expr, ns)
            ns['obj'] = obj
            out.append(None)
        else:
            out.append(eval('obj.' + expr, ns))
    json.dump({'v': json.dumps(out, ensure_ascii=False, default=str)}, open('/w/result.json', 'w', encoding='utf-8'))
except Exception:
    json.dump({'e': traceback.format_exc()}, open('/w/result.json', 'w', encoding='utf-8'))
`
}

function listHarness(kind: 'cycle' | 'entry' | 'intersection'): string {
  const common = `import json
import traceback

try:
    case = json.load(open('/w/case.json', encoding='utf-8'))
    ns = {'__name__': '__judge__'}
    exec(compile(open('/w/main.py', encoding='utf-8').read(), '/w/main.py', 'exec'), ns)
    L = ns['ListNode']
    def build(values, pos=-1):
        nodes = [L(v) for v in values]
        for a, b in zip(nodes, nodes[1:]):
            a.next = b
        if pos >= 0 and nodes:
            tail = nodes[-1]
            tail.next = nodes[pos]
        return nodes[0] if nodes else None
`
  if (kind === 'cycle') {
    return `${common}
    head = build(json.loads(case['args'][0]), int(json.loads(case['args'][1])))
    v = ns['Solution']().hasCycle(head)
    json.dump({'v': json.dumps(bool(v))}, open('/w/result.json', 'w', encoding='utf-8'))
except Exception:
    json.dump({'e': traceback.format_exc()}, open('/w/result.json', 'w', encoding='utf-8'))
`
  }
  if (kind === 'entry') {
    return `${common}
    head = build(json.loads(case['args'][0]), int(json.loads(case['args'][1])))
    v = ns['Solution']().detectCycle(head)
    json.dump({'v': json.dumps(None if v is None else v.val)}, open('/w/result.json', 'w', encoding='utf-8'))
except Exception:
    json.dump({'e': traceback.format_exc()}, open('/w/result.json', 'w', encoding='utf-8'))
`
  }
  return `${common}
    a = json.loads(case['args'][0])
    b = json.loads(case['args'][1])
    sa = int(json.loads(case['args'][2]))
    sb = int(json.loads(case['args'][3]))
    shared = [L(v) for v in a[sa:]]
    for x, y in zip(shared, shared[1:]):
        x.next = y
    left = [L(v) for v in a[:sa]]
    for x, y in zip(left, left[1:]):
        x.next = y
    if left and shared:
        left[-1].next = shared[0]
    head_a = left[0] if left else (shared[0] if shared else None)
    right = [L(v) for v in b[:sb]]
    for x, y in zip(right, right[1:]):
        x.next = y
    if right and shared:
        right[-1].next = shared[0]
    head_b = right[0] if right else (shared[0] if shared else None)
    v = ns['Solution']().getIntersectionNode(head_a, head_b)
    json.dump({'v': json.dumps(None if v is None else v.val)}, open('/w/result.json', 'w', encoding='utf-8'))
except Exception:
    json.dump({'e': traceback.format_exc()}, open('/w/result.json', 'w', encoding='utf-8'))
`
}

function main(): void {
  const outRoot = arg('--out')
  if (!outRoot) {
    console.error('用法: pnpm judge:gen-custom -- --out <judge-server/data/problems>')
    process.exit(1)
  }

  // ---- 141 / 142 ----
  {
    const d = readDoc('leetcode/0141_linked_list_cycle.md')
    writeFunction(outRoot, d.id, d.title, d.code, 'hasCycle', [
      {args: ['[3,2,0,-4]', '1'], expected: 'true'},
      {args: ['[1,2]', '0'], expected: 'true'},
      {args: ['[1]', '-1'], expected: 'false'},
    ], {url: d.url})
    // 用专用 harness 覆盖 writeFunction 的普通 harness
    fs.writeFileSync(path.join(outRoot, d.id, 'harness.py'), listHarness('cycle'))
  }
  {
    const d = readDoc('leetcode/0142_linked_list_cycle_ii.md')
    writeFunction(outRoot, d.id, d.title, d.code, 'detectCycle', [
      {args: ['[3,2,0,-4]', '1'], expected: '2'},
      {args: ['[1,2]', '0'], expected: '1'},
      {args: ['[1]', '-1'], expected: 'null'},
    ], {url: d.url})
    fs.writeFileSync(path.join(outRoot, d.id, 'harness.py'), listHarness('entry'))
  }
  {
    const d = readDoc('leetcode/0160_intersection_of_two_linked_lists.md')
    writeFunction(outRoot, d.id, d.title, d.code, 'getIntersectionNode', [
      {args: ['[4,1,8,4,5]', '[5,6,1,8,4,5]', '2', '3'], expected: '8'},
      {args: ['[1,9,1,2,4]', '[3,2,4]', '3', '1'], expected: '2'},
      {args: ['[2,6,4]', '[1,5]', '3', '2'], expected: 'null'},
    ], {url: d.url})
    fs.writeFileSync(path.join(outRoot, d.id, 'harness.py'), listHarness('intersection'))
  }

  // ---- 类 API ----
  const classCases: Record<string, {file: string; title: string; url: string; ops: unknown[]; args: unknown[][]; expected: unknown[]; platform?: string}> = {
    'leetcode-146': {
      file: 'leetcode/0146_lru_cache.md',
      title: '146. LRU 缓存',
      url: 'https://leetcode.cn/problems/lru-cache/',
      ops: ['LRUCache','put','put','get','put','get','put','get','get','get'],
      args: [[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]],
      expected: [null,null,null,1,null,-1,null,-1,3,4],
    },
    'leetcode-155': {
      file: 'leetcode/0155_min_stack.md',
      title: '155. 最小栈',
      url: 'https://leetcode.cn/problems/min-stack/',
      ops: ['MinStack','push','push','push','getMin','pop','top','getMin'],
      args: [[],[-2],[0],[-3],[],[],[],[]],
      expected: [null,null,null,null,-3,null,0,-2],
    },
    'leetcode-208': {
      file: 'leetcode/0208_implement_trie_prefix_tree.md',
      title: '208. 实现 Trie (前缀树)',
      url: 'https://leetcode.cn/problems/implement-trie-prefix-tree/',
      ops: ['Trie','insert','search','search','startsWith','insert','search'],
      args: [[],['apple'],['apple'],['app'],['app'],['app'],['app']],
      expected: [null,null,true,false,true,null,true],
    },
    'leetcode-295': {
      file: 'leetcode/0295_find_median_from_data_stream.md',
      title: '295. 数据流的中位数',
      url: 'https://leetcode.cn/problems/find-median-from-data-stream/',
      ops: ['MedianFinder','addNum','addNum','findMedian','addNum','findMedian'],
      args: [[],[1],[2],[],[3],[]],
      expected: [null,null,null,1.5,null,2],
    },
  }
  for (const [id, c] of Object.entries(classCases)) {
    const d = readDoc(c.file)
    writeScript(outRoot, id, c.title, 'LeetCode', d.code, [
      {
        args: [JSON.stringify(c.ops), JSON.stringify(c.args)],
        expected: JSON.stringify(c.expected),
      },
    ], scriptHarness())
  }

  // ---- P5493：类 API + stdin 操作行 ----
  {
    const d = readDoc('codefun2000/huawei-non-ai/P5493.md')
    const cases = extractDocStdinSamples(d.md)
      .map((s) => {
        const lines = s.stdin.split('\n').map((x) => x.trim()).filter(Boolean)
        const outs = s.expected.split('\n').map((x) => x.trim()).filter(Boolean)
        const expected = outs.map((x) => {
          try { return JSON.parse(x) } catch { return x }
        })
        return {ops: lines, expected}
      })
      .filter((c) => c.ops.length > 0)
      .map((c) => ({
        args: [JSON.stringify(c.ops)],
        expected: JSON.stringify(c.expected),
      }))
    if (cases.length > 0) writeScript(outRoot, d.id, d.title, 'CodeFun2000', d.code, cases, p5493Harness())
  }

  // ---- Shopee 迷宫：stdin 转二维数组 ----
  {
    const d = readDoc('shoppee/shoppee_maze_unreachable_count.md')
    const cases = extractDocStdinSamples(d.md)
      .map((s) => {
        const lines = s.stdin.split('\n').map((x) => x.trim()).filter(Boolean)
        const n = Number(lines[0])
        if (!Number.isFinite(n) || lines.length < n + 1) return null
        const grid = lines.slice(1, n + 1).map((row) => row.split(/\s+/).map(Number))
        return {args: [JSON.stringify(grid)], expected: s.expected.trim()}
      })
      .filter((c): c is Case => c !== null)
    if (cases.length > 0) {
      writeFunction(outRoot, d.id, d.title, d.code, 'apply', cases, {
        url: d.url,
        platform: 'Shopee',
      })
    }
  }

  // ---- Shopee 合并降序链表：箭头样例 ----
  {
    const d = readDoc('shoppee/shoppee_merge_descending_to_ascending.md')
    const samples = usableSamples(extractDocSamples(d.md, ['l1', 'l2'], 2))
    const analysis = analyzeSnippet(d.code, 'MergeList')
    const cases: Case[] = []
    if (analysis.runnable && analysis.entry) {
      for (const s of samples) {
        const expected = s.expected.includes('->')
          ? `[${s.expected.split(/\s*->\s*/).map((x) => Number(x)).join(',')}]`
          : s.expected
        cases.push({args: sampleCase(s.args, analysis.entry), expected})
      }
    }
    if (cases.length > 0) {
      writeFunction(outRoot, d.id, d.title, d.code, 'MergeList', cases, {
        url: d.url,
        platform: 'Shopee',
      })
    }
  }

  console.log(`\ncustom 包已写入 ${outRoot}`)
}

main()
