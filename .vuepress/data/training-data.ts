import fs from 'node:fs'
import path from 'node:path'
import { legacyPathFor, readFrontMatter, relativeSource } from '../paths'
import { analyzeSnippet } from '../../src/components/training/pyrunner/snippet'
import { adapt } from '../../src/components/training/visualizer/adapters'
import type { RawTrace } from '../../src/components/training/visualizer/recorder/types'
import {
  crossCheckEntryName,
  extractDocSamples,
  extractDocStdinSamples,
  extractSignature,
  pythonBlock,
  section,
  type PyEntry,
  type PySample,
  type StdinSample,
} from '../../plugins/py-samples'

/**
 * 构建期的训练数据。
 *
 * 旧站点这些数据由六个 Docusaurus 插件分别注入 globalData。VuePress 没有
 * 那套 `loadContent / allContentLoaded` 接缝，但**数据本身与框架无关** ——
 * 抽取逻辑（py-samples 的样例解析、vis-traces 的 adapter 选型、题库的
 * 清单）原样复用，只是把「怎么发到客户端」换成了「构建期直接注入页面」。
 *
 * 与旧站点同一个取舍：**只发清单，不发正文**。
 * - 自测题：页面只拿到 docId，题目数据在读者点开时 fetch `/quiz/bank.json`
 * - 轨迹：页面只拿到 entry（帧数、输入、源码），帧在展开时 fetch `/traces/*.json`
 * - 运行条：样例很小，直接随页面走；代码本来就印在页面上，base64 一份
 */
export interface TrainingData {
  /** md 相对 code-training/docs 的路径 -> 抽取结果 */
  pySamples: Record<string, PyEntry>
  /** md 相对路径 -> 轨迹清单 */
  traces: Record<string, VisTraceEntry>
  /** 有轨迹但 adapter 认不出来（页面上写一行说明） */
  noVisual: Set<string>
  /** 有自测题的 md 相对路径 */
  selfTest: Set<string>
  /** pattern 文档 docId -> 相关题目 */
  byPattern: Record<string, PatternProblem[]>
  /** md 相对路径 -> permalink */
  permalinks: Record<string, string>
}

export interface VisTraceEntry {
  docId: string
  url: string
  adapterId: string
  args: string[]
  frameCount: number
  code: string
}

export interface PatternProblem {
  title: string
  permalink: string
  difficulty: string
  id: string
  platform: string
}

function diffRank(d: string): number {
  if (/简单|Easy/i.test(d)) return 0
  if (/中等|Medium/i.test(d)) return 1
  if (/困难|Hard/i.test(d)) return 2
  return 3
}

function walk(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop() as string
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name.endsWith('.md')) out.push(full)
    }
  }
  return out
}

function buildPySamples(docsRoot: string): Record<string, PyEntry> {
  const entries: Record<string, PyEntry> = {}
  for (const full of walk(path.join(docsRoot, 'problems'))) {
    const rel = relativeSource(docsRoot, full)
    const md = fs.readFileSync(full, 'utf8')
    const code = pythonBlock(section(md, '完整代码实现'))
    if (!code) continue
    const { method, paramNames, requiredCount } = extractSignature(code)
    const entryName = crossCheckEntryName(md, code, method) ?? method
    entries[rel] = {
      code,
      method: entryName,
      paramNames,
      requiredCount,
      samples: extractDocSamples(md, paramNames, requiredCount),
      stdinSamples: extractDocStdinSamples(md),
    }
  }
  return entries
}

function findDocByFileName(docsRoot: string, name: string): string | null {
  for (const full of walk(path.join(docsRoot, 'problems'))) {
    if (path.basename(full) === `${name}.md`) {
      return relativeSource(docsRoot, full)
    }
  }
  return null
}

function buildTraces(
  docsRoot: string,
  tracesDir: string,
): { traces: Record<string, VisTraceEntry>; noVisual: Set<string> } {
  const traces: Record<string, VisTraceEntry> = {}
  const noVisual = new Set<string>()
  if (!fs.existsSync(tracesDir)) return { traces, noVisual }

  for (const file of fs.readdirSync(tracesDir).sort()) {
    if (!file.endsWith('.json')) continue
    const name = file.replace(/\.json$/, '')
    let trace: RawTrace
    try {
      trace = JSON.parse(
        fs.readFileSync(path.join(tracesDir, file), 'utf8'),
      ) as RawTrace
    } catch {
      continue
    }
    const adapted = adapt(trace)
    const docId = findDocByFileName(docsRoot, name)
    if (!docId) continue
    if (!adapted) {
      noVisual.add(docId)
      continue
    }
    traces[docId] = {
      docId,
      url: `/traces/${file}`,
      adapterId: adapted.adapterId,
      args: trace.args,
      frameCount: adapted.frames.length,
      code: trace.code,
    }
  }
  return { traces, noVisual }
}

function buildSelfTest(sourceDir: string): Set<string> {
  const bankFile = path.join(sourceDir, 'static/quiz/bank.json')
  const ids = new Set<string>()
  if (!fs.existsSync(bankFile)) return ids
  try {
    const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8')) as {
      items?: Array<{ docId?: string }>
    }
    for (const item of bank.items ?? []) {
      if (item.docId) ids.add(item.docId)
    }
  } catch {
    /* 题库坏了不应该阻塞构建，`pnpm quiz:validate` 会单独报 */
  }
  return ids
}

function buildPatternGraph(
  sourceDir: string,
  permalinks: Record<string, string>,
): Record<string, PatternProblem[]> {
  const docsRoot = path.join(sourceDir, 'code-training/docs')
  const byPattern: Record<string, PatternProblem[]> = {}
  for (const full of walk(path.join(docsRoot, 'problems'))) {
    const rel = relativeSource(docsRoot, full)
    const fm = readFrontMatter(full)
    const patterns = Array.isArray(fm.patterns) ? (fm.patterns as unknown[]) : []
    if (patterns.length === 0) continue
    const problem: PatternProblem = {
      title: String(fm.title ?? rel),
      permalink: permalinks[rel] ?? '',
      difficulty: String(fm.difficulty ?? ''),
      id: String(fm.id ?? ''),
      platform: String(fm.platform ?? ''),
    }
    for (const raw of patterns) {
      const key = String(raw).replace(/^(?:\.\.\/)+/, '')
      ;(byPattern[key] ??= []).push(problem)
    }
  }
  for (const list of Object.values(byPattern)) {
    list.sort((a, b) => {
      const d = diffRank(a.difficulty) - diffRank(b.difficulty)
      if (d !== 0) return d
      const na = Number(a.id)
      const nb = Number(b.id)
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
      return a.title.localeCompare(b.title, 'zh')
    })
  }
  return byPattern
}

function buildPermalinks(sourceDir: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const dir of ['docs', 'code-training/docs']) {
    for (const full of walk(path.join(sourceDir, dir))) {
      const rel = relativeSource(path.join(sourceDir, dir), full)
      const target = legacyPathFor(sourceDir, full)
      if (target) map[rel] = target
    }
  }
  return map
}

let cached: TrainingData | undefined

export function trainingData(sourceDir: string): TrainingData {
  if (cached) return cached
  const docsRoot = path.join(sourceDir, 'code-training/docs')
  const permalinks = buildPermalinks(sourceDir)
  const { traces, noVisual } = buildTraces(
    docsRoot,
    path.join(sourceDir, 'static/traces'),
  )
  cached = {
    pySamples: buildPySamples(docsRoot),
    traces,
    noVisual,
    selfTest: buildSelfTest(sourceDir),
    byPattern: buildPatternGraph(sourceDir, permalinks),
    permalinks,
  }
  return cached
}

/** 页面相对 code-training/docs 的 docId（其余页面返回 null） */
export function docIdOf(filePathRelative: string | null | undefined): string | null {
  if (!filePathRelative) return null
  const rel = filePathRelative.split(path.sep).join('/')
  const marker = 'code-training/docs/'
  if (!rel.startsWith(marker)) return null
  return rel.slice(marker.length)
}

export type { PySample, StdinSample, PyEntry }
