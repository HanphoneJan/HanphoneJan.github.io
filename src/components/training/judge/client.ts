/**
 * 评测服务的浏览器客户端。
 *
 * 文档站是静态站点，不能把任何服务端密钥带进来；这里只发公开的
 * `/v1/problems`、`/v1/submissions`，限额由服务端按 IP/浏览器 ID 控制。
 */

export interface JudgeProblem {
  id: string
  title: string
  platform: string
  url?: string
  mode: 'stdin' | 'function' | 'script'
  languages: string[]
  timeLimitMs: number
  memoryLimitMb: number
  activeTestCount: number
  fullTestCount: number
  provenance?: Record<string, unknown>
}

export interface JudgeSubmission {
  id: string
  problem_id: string
  language: string
  status: 'queued' | 'running' | 'done'
  verdict: string | null
  passed: number
  total: number
  time_ms: number | null
  memory_kb: number | null
  message: string | null
}

export interface JudgeCase {
  seq: number
  verdict: string
  time_ms: number | null
  memory_kb: number | null
  message: string | null
  input_excerpt: string | null
  expected_excerpt: string | null
  actual_excerpt: string | null
}

export interface JudgeResult {
  submission: JudgeSubmission
  cases: JudgeCase[]
}

const PROBLEMS_CACHE = 'hanphone:judge:problems:v1'
const CACHE_TTL_MS = 10 * 60 * 1000

export function judgeBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://hanphone.cn/judge-api'
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:5051'
  }
  return 'https://hanphone.cn/judge-api'
}

export function judgeClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'hanphone:judge:client'
  try {
    const old = window.localStorage.getItem(key)
    if (old) return old
    const value =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(key, value)
    return value
  } catch {
    return ''
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${judgeBaseUrl()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON 错误页 */
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as {error: unknown}).error)
        : `HTTP ${res.status}`
    const retryAfter =
      data && typeof data === 'object' && 'retryAfter' in data
        ? Number((data as {retryAfter: unknown}).retryAfter)
        : undefined
    const err = new Error(message) as Error & {retryAfter?: number}
    err.retryAfter = retryAfter
    throw err
  }
  return data as T
}

/** 页面只取一次；失败返回 null，UI 安静隐藏提交入口。 */
export async function fetchJudgeProblems(): Promise<JudgeProblem[] | null> {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PROBLEMS_CACHE)
    if (raw) {
      const parsed = JSON.parse(raw) as {at: number; problems: JudgeProblem[]}
      if (Date.now() - parsed.at < CACHE_TTL_MS) return parsed.problems
    }
  } catch {
    /* 忽略缓存损坏 */
  }

  try {
    const data = await request<{problems: JudgeProblem[]}>('/v1/problems')
    try {
      window.sessionStorage.setItem(
        PROBLEMS_CACHE,
        JSON.stringify({at: Date.now(), problems: data.problems}),
      )
    } catch {
      /* 隐私模式可能禁用 sessionStorage */
    }
    return data.problems
  } catch {
    return null
  }
}

export async function submitCode(
  problemId: string,
  source: string,
): Promise<{id: string}> {
  return request<{id: string}>('/v1/submissions', {
    method: 'POST',
    body: JSON.stringify({
      problemId,
      language: 'python',
      source,
      clientId: judgeClientId() || undefined,
    }),
  })
}

export async function getSubmission(id: string): Promise<JudgeResult> {
  return request<JudgeResult>(`/v1/submissions/${encodeURIComponent(id)}`)
}

export async function waitForSubmission(
  id: string,
  onUpdate?: (result: JudgeResult) => void,
  signal?: AbortSignal,
): Promise<JudgeResult> {
  const deadline = Date.now() + 90_000
  let last: JudgeResult | undefined
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('已取消')
    last = await getSubmission(id)
    onUpdate?.(last)
    if (last.submission.status === 'done') return last
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (last) return last
  throw new Error('评测超时')
}
