import fs from 'node:fs'
import path from 'node:path'
import { legacyPathFor, readFrontMatter, relativeSource } from '../paths'
import { analyzeSnippet } from '../../src/components/training/pyrunner/snippet'
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
import { parseDifficulty } from '../../src/components/training/difficulty'

/**
 * 构建期的训练数据。
 *
 * 旧站点这些数据由六个 Docusaurus 插件分别注入 globalData。VuePress 没有
 * 那套 `loadContent / allContentLoaded` 接缝，但**数据本身与框架无关** ——
 * 抽取逻辑（py-samples 的样例解析、题库的清单）原样复用，只是把
 * 「怎么发到客户端」换成了「构建期直接注入页面」。
 *
 * 与旧站点同一个取舍：**只发清单，不发正文**。
 * - 自测题：页面只拿到 docId，题目数据在读者点开时 fetch `/quiz/bank.json`
 * - 运行条：样例很小，直接随页面走；代码本来就印在页面上，base64 一份
 */
export interface TrainingData {
  /** md 相对 code-training/docs 的路径 -> 抽取结果 */
  pySamples: Record<string, PyEntry>
  /** 有自测题的 md 相对路径 */
  selfTest: Set<string>
  /** pattern 文档 docId -> 相关题目 */
  byPattern: Record<string, PatternProblem[]>
  /** md 相对路径 -> permalink */
  permalinks: Record<string, string>
}

export interface PatternProblem {
  title: string
  permalink: string
  difficulty: string
  id: string
  platform: string
}

/**
 * 相关题目的排序权重。口径在 `src/components/training/difficulty.ts` ——
 * 早先这里是「简单/中等/困难，其余算最后一档」，于是牛客的 入门 / 较难
 * 全被当成「其它」排到最后。
 */
function diffRank(d: string): number {
  return parseDifficulty(d).rank
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
  cached = {
    pySamples: buildPySamples(docsRoot),
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
