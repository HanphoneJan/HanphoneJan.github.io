<template>
  <div class="cache-settings">
    <p v-if="!ready" class="state">正在读取浏览器缓存…</p>

    <div v-else-if="!supported" class="notice">
      <strong>这个浏览器不支持缓存管理。</strong>
      离线缓存依赖 Service Worker 与 CacheStorage，需要 <b>HTTPS</b>（或
      localhost）并且不是隐私模式的严格拦截。当前页面仍可正常阅读。
    </div>

    <template v-else>
      <!-- ── 离线包 ─────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-head">
          <h2>离线内容</h2>
          <span class="badge" :class="packageStateClass">{{ packageStateText }}</span>
        </header>

        <p v-if="manifestError" class="state">{{ manifestError }}</p>

        <template v-else-if="manifest">
          <div class="facts">
            <div>
              <dt>站点版本</dt>
              <dd><code>{{ manifest.build }}</code></dd>
            </div>
            <div>
              <dt>已下载版本</dt>
              <dd><code>{{ meta?.build ?? '—' }}</code></dd>
            </div>
            <div>
              <dt>全部内容</dt>
              <dd>{{ formatBytes(estimatedTotal) }}</dd>
            </div>
            <div>
              <dt>浏览器占用</dt>
              <dd>
                {{ usage ? formatBytes(usage.usage) : '—' }}
                <span v-if="usage" class="muted">/ {{ formatBytes(usage.quota) }}</span>
              </dd>
            </div>
          </div>

          <label class="toggle">
            <input v-model="withChunks" type="checkbox">
            <span>
              同时缓存页面脚本
              <span class="muted">
                （离线时站内跳转才有交互；不要的话只存 HTML，体积少一半，
                离线打开是「能读但点不动」）
              </span>
            </span>
          </label>

          <ul class="sections">
            <li v-for="row in rows" :key="row.id">
              <div class="row-main">
                <span class="row-label">{{ row.label }}</span>
                <span class="row-meta">
                  {{ row.count }} 项 · {{ formatBytes(row.estimated) }}
                </span>
              </div>
              <div class="row-state">
                <span :class="{'is-done': row.cached === row.count && row.count > 0}">
                  {{ row.cached }} / {{ row.count }}
                </span>
                <span v-if="row.cached && row.chunkMissing" class="muted">
                  · {{ row.chunkMissing }} 项缺脚本
                </span>
              </div>
              <div class="row-actions">
                <button
                  type="button"
                  class="btn"
                  :disabled="progress.running"
                  @click="download(row.id)"
                >
                  {{ row.cached === 0 ? '缓存' : row.cached === row.count ? '重新缓存' : '继续' }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost"
                  :class="{'btn-armed': pendingKey === `section:${row.id}`}"
                  :disabled="progress.running || row.cached === 0"
                  @click="requestClear('section', row.id)"
                >
                  {{ pendingKey === `section:${row.id}` ? '确认清除' : '清除' }}
                </button>
              </div>
            </li>
          </ul>

          <div class="actions">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="progress.running"
              @click="downloadAll"
            >
              缓存全部（{{ formatBytes(estimatedTotal) }}）
            </button>
            <button
              type="button"
              class="btn btn-danger"
              :class="{'btn-armed': pendingKey === 'all:'}"
              :disabled="progress.running || buckets.length === 0"
              @click="requestClear('all', '')"
            >
              {{ pendingKey === 'all:' ? '确认清除全部？' : '清除全部缓存' }}
            </button>
          </div>

          <div v-if="progress.running" class="progress">
            <div class="progress-head">
              <span>{{ progress.label }}</span>
              <span>{{ progress.done }} / {{ progress.total }}</span>
            </div>
            <div class="bar"><i :style="{width: `${percent}%`}" /></div>
            <div class="progress-foot">
              <span>{{ formatBytes(progress.bytes) }} / {{ formatBytes(progress.totalBytes) }}</span>
              <span v-if="progress.failed" class="warn">失败 {{ progress.failed }}</span>
              <button type="button" class="btn btn-ghost" @click="cancel">
                取消
              </button>
            </div>
          </div>
          <p v-if="progress.message" class="state">{{ progress.message }}</p>

          <p class="hint">
            离线包按「首页 / 共享脚本 / Python 运行时 / 文档 / 代码训练 / 归档 /
            题解可视化 / 自测题库」分块，可以只下自己常用的部分。
            <b>共享脚本</b>是页面之外懒加载的那些 chunk（运行条、代码编辑器、
            mermaid、公式），不下的话「预先下好的页面」离线点着没反应。
            <b>Python 运行时</b>（Pyodide，约 13MB）是题解里「▶ 运行」用的解释器：
            提前缓存之后，断网也能跑代码；不缓存的话要等第一次点运行才下载。
          </p>
        </template>
      </section>

      <!-- ── 更新 ─────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-head">
          <h2>更新</h2>
          <span class="badge" :class="swClass">{{ swText }}</span>
        </header>

        <p class="state">
          {{ updateMessage }}
        </p>

        <div class="actions">
          <button type="button" class="btn" :disabled="checking" @click="checkUpdate">
            {{ checking ? '检查中…' : '检查新版本' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!sw.waiting || applying"
            @click="applyUpdate"
          >
            立即更新并重载
          </button>
        </div>

        <p v-if="newerBuild" class="warn">
          站点已经有新版本（<code>{{ manifest?.build }}</code>），离线包还是旧版本
          （<code>{{ meta?.build }}</code>）。旧 HTML 引用的脚本名在新部署里已被删除，
          离线打开会白屏 —— 请重新缓存。
        </p>
        <p class="hint">
          「检查新版本」就是手动触发一次 Service Worker 更新检查，等价于站点平时
          每 30 分钟自动做的那次。「立即更新」会把等待中的新版本切上来并重载页面，
          与右下角「新内容已就绪」按钮是同一件事。
        </p>
      </section>

      <!-- ── 缓存明细 ─────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-head">
          <h2>缓存明细</h2>
          <span class="muted">{{ buckets.length }} 个缓存桶</span>
        </header>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>缓存桶</th><th>条目</th><th>大小</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="c in buckets" :key="c.name">
                <td><code>{{ c.name }}</code></td>
                <td>{{ c.entries }}</td>
                <td>{{ c.bytes ? `≈ ${formatBytes(c.bytes)}` : '—' }}</td>
                <td class="cell-action">
                  <button
                    type="button"
                    class="btn btn-ghost"
                    :class="{'btn-armed': pendingKey === `cache:${c.name}`}"
                    :disabled="progress.running"
                    @click="requestClear('cache', c.name)"
                  >
                    {{ pendingKey === `cache:${c.name}` ? '确认删除' : '清除' }}
                  </button>
                </td>
              </tr>
              <tr v-if="buckets.length === 0">
                <td colspan="4" class="muted">还没有任何缓存。</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="hint">
          大小按响应头里的 <code>content-length</code> 累加，个别资源没带这个头会少算，
          准确占用以上面的「浏览器占用」为准。清除「应用外壳」的预缓存后会注销并
          重装 Service Worker（页面重载一次），否则那个桶不会自己填回来。
        </p>

        <div class="actions">
          <button type="button" class="btn" :disabled="persisting" @click="enablePersist">
            {{ persisted ? '已申请持久化存储' : '允许浏览器长期保留缓存' }}
          </button>
        </div>
        <p class="hint">
          {{ persisted
            ? '已获得持久化存储：浏览器空间紧张时不会优先清掉这些缓存。'
            : '不申请持久化时，浏览器在磁盘紧张时可能整站清空（iOS Safari 还会在 7 天不访问后清理站点数据）。' }}
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 缓存与离线管理（`/settings.html`）。
 *
 * 三件事：把站点内容一键下进 CacheStorage、手动检查/应用 Service Worker
 * 更新、手动清除缓存。对应安卓 App 设置页里的「清理缓存 / 检查更新」。
 *
 * ## 为什么写进现有的两个缓存桶，而不是新建一个
 *
 * Workbox 只管它自己 `registerRoute` 出来的缓存桶。新建 `offline-pages`
 * 之类的话，等于还要在 `.vuepress/theme.ts` 里再加一条路由，而 SW 只有在
 * **下一次部署**才会更新 —— 读者点了「缓存」，离线时拿到的却是旧的 SW
 * （它不认识这个桶）。写进已有的桶没有这个问题：
 *
 * - HTML 写 `html-v2`：路由是 NetworkFirst，在线永远取新的、离线回退缓存，
 *   语义与「离线快照」完全一致；
 * - 页面 chunk 写 `assets`：文件名带内容哈希，进了缓存就是不可变文件。
 *
 * 还有一个反直觉的点：`ExpirationPlugin({maxEntries: 200})` **不会**
 * 淘汰这里塞进去的条目。它只按 IndexedDB 里记录的时间戳结算，而页面直接
 * `cache.put()` 的条目不在它的账上（见 workbox-expiration 的
 * `CacheExpiration.expireEntries`）。所以 894 页塞进去也不会被挤掉，
 * 清理只能靠这个页面的按钮。
 *
 * ## 版本
 *
 * 页面不能在离线时去 fetch `/offline-manifest.json`，所以「我下的包是哪一版」
 * 记在 localStorage；上线后拿到新清单再对比，不一致就提示重新缓存
 * （旧 HTML 引用的是已被删除的 `assets/<页面>-<旧哈希>.js`）。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { PYODIDE_CACHE_NAME } from '../../src/components/training/pyrunner/runtime-files'

interface OfflineEntry extends Array<string | number | null> {
  0: string
  1: string | null
  2: number
  3: number
}

interface OfflineSection {
  label: string
  bytes: number
  entries: OfflineEntry[]
}

interface OfflineManifest {
  build: string
  builtAt: string
  totalBytes: number
  pageCount: number
  sections: Record<string, OfflineSection>
}

interface PackageMeta {
  build: string
  at: string
  sections: string[]
  withChunks: boolean
}

interface CacheStat {
  name: string
  entries: number
  bytes: number
}

interface SectionRow {
  id: string
  label: string
  count: number
  estimated: number
  cached: number
  chunkMissing: number
}

const HTML_CACHE = 'html-v2'
const ASSET_CACHE = 'assets'
const TRACE_CACHE = 'traces'
const QUIZ_CACHE = 'quiz'
// 缓存名与文件清单在 runtime-files.ts 里（客户端 fetch 拦截也用那一份）
const PYODIDE_CACHE = PYODIDE_CACHE_NAME
const META_KEY = 'hanphone:offline-package'
/** 清空缓存后要重载页面，结果写成一句话留给重载后的自己 */
const NOTICE_KEY = 'hanphone:offline-notice'
const MANIFEST_URL = '/offline-manifest.json'
const CONCURRENCY = 5

const ready = ref(false)
const supported = ref(false)
const manifest = ref<OfflineManifest | null>(null)
const manifestError = ref('')
const meta = ref<PackageMeta | null>(null)
const withChunks = ref(true)
const buckets = ref<CacheStat[]>([])
const usage = ref<{ usage: number; quota: number } | null>(null)
const persisted = ref(false)
const persisting = ref(false)
const checking = ref(false)
const applying = ref(false)
const updateMessage = ref('')
const sw = reactive({ active: false, waiting: false, registration: false })
const progress = reactive({
  running: false,
  label: '',
  done: 0,
  total: 0,
  bytes: 0,
  totalBytes: 0,
  failed: 0,
  message: '',
})
const rows = ref<SectionRow[]>([])

// 勾上/取消「同时缓存页面脚本」时，每个板块的预计体积要跟着变
watch(withChunks, () => computeRows())

let abortController: AbortController | null = null
/** 缓存桶 -> 已缓存的绝对 URL 集合。所有「已缓存多少」都由它算，不另存状态 */
const cacheKeys = new Map<string, Set<string>>()

const keysOf = (name: string): Set<string> => cacheKeys.get(name) ?? new Set<string>()

/**
 * 一条资源该进哪个桶。
 *
 * 必须与 `.vuepress/theme.ts` 里的 Workbox 路由对齐：`/traces/*.json` 走
 * `traces`（CacheFirst）、`/quiz/*.json` 走 `quiz`（SWR）、其余 HTML 走
 * `html-v2`（NetworkFirst）。塞错桶不会报错，只是离线时那条路由读不到
 * 我们写进去的那份 —— 该请求会去网络拿，然后失败。
 */
function targetCache(url: string): string {
  if (url.startsWith('/traces/')) return TRACE_CACHE
  if (url.startsWith('/quiz/')) return QUIZ_CACHE
  // 12.9MB 的 Python 解释器有自己的桶，不归 SW 管（见 pyrunner/runtime.ts）
  if (url.startsWith('/pyodide/')) return PYODIDE_CACHE
  // 「共享脚本」也要进 `assets`：那是 SW 的 script 路由读的桶（SWR，
  // 文件名带内容哈希所以不可变）。塞进 html-v2 的话永远不会被用到。
  if (url.startsWith('/assets/')) return ASSET_CACHE
  return HTML_CACHE
}

const percent = computed(() =>
  progress.total ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0,
)

const estimatedTotal = computed(() => {
  if (!manifest.value) return 0
  return Object.values(manifest.value.sections).reduce(
    (sum, section) =>
      sum +
      section.entries.reduce(
        (s, entry) => s + entry[2] + (withChunks.value ? entry[3] : 0),
        0,
      ),
    0,
  )
})

const newerBuild = computed(
  () => Boolean(manifest.value && meta.value && manifest.value.build !== meta.value.build),
)

const packageStateText = computed(() => {
  if (!manifest.value) return '清单不可用'
  if (!meta.value) return '未下载'
  if (meta.value.build !== manifest.value.build) return '需要更新'
  const covered = rows.value.filter((r) => r.count > 0 && r.cached === r.count).length
  return covered === rows.value.length ? '完整可用' : '部分已缓存'
})

const packageStateClass = computed(() => ({
  'is-ok': packageStateText.value === '完整可用',
  'is-warn': packageStateText.value === '需要更新',
}))

const swText = computed(() => {
  if (!sw.registration) return '未注册'
  if (sw.waiting) return '有新版本待应用'
  return sw.active ? '已就绪' : '注册中'
})

const swClass = computed(() => ({ 'is-warn': sw.waiting }))

function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes < 0) return '0 KB'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** 相对 URL -> CacheStorage 里实际使用的绝对 URL */
function absolute(url: string): string {
  return new URL(url, window.location.origin).href
}

function readMeta(): PackageMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PackageMeta
    return parsed && typeof parsed.build === 'string' ? parsed : null
  } catch {
    return null
  }
}

function writeMeta(next: PackageMeta | null): void {
  meta.value = next
  try {
    if (next) localStorage.setItem(META_KEY, JSON.stringify(next))
    else localStorage.removeItem(META_KEY)
  } catch {
    /* 隐私模式禁写时忽略：本次会话里仍然有效 */
  }
}

/** 把各个缓存桶里的键读出来，作为所有「已缓存 / 未缓存」的唯一来源 */
async function readCacheKeys(): Promise<void> {
  cacheKeys.clear()
  if (typeof caches === 'undefined') return
  await Promise.all(
    [HTML_CACHE, ASSET_CACHE, TRACE_CACHE, QUIZ_CACHE, PYODIDE_CACHE].map(async (name) => {
      const keys = await caches.open(name).then((cache) => cache.keys())
      cacheKeys.set(name, new Set(keys.map((request) => request.url)))
    }),
  )
}

function computeRows(): void {
  if (!manifest.value) {
    rows.value = []
    return
  }
  rows.value = Object.entries(manifest.value.sections).map(([id, section]) => {
    let cached = 0
    let chunkMissing = 0
    let estimated = 0
    for (const entry of section.entries) {
      estimated += entry[2] + (withChunks.value ? entry[3] : 0)
      if (keysOf(targetCache(entry[0])).has(absolute(entry[0]))) {
        cached++
        if (
          withChunks.value &&
          entry[1] &&
          !keysOf(ASSET_CACHE).has(absolute(`/${entry[1]}`))
        ) {
          chunkMissing++
        }
      }
    }
    return {
      id,
      label: section.label,
      count: section.entries.length,
      estimated,
      cached,
      chunkMissing,
    }
  })
}

async function readSw(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  sw.registration = Boolean(registration)
  sw.active = Boolean(registration?.active)
  sw.waiting = Boolean(registration?.waiting)
}

async function refreshCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  const names = await caches.keys()
  const stats: CacheStat[] = []
  for (const name of names) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    let bytes = 0
    // 分片并发：html-v2 可能有 900 多条，串行 match 要好几秒
    for (let i = 0; i < keys.length; i += 40) {
      const chunk = keys.slice(i, i + 40)
      const sizes = await Promise.all(
        chunk.map((req) =>
          cache
            .match(req)
            .then((res) => Number(res?.headers.get('content-length') ?? 0) || 0)
            .catch(() => 0),
        ),
      )
      bytes += sizes.reduce((a, b) => a + b, 0)
    }
    stats.push({ name, entries: keys.length, bytes })
  }
  buckets.value = stats.sort((a, b) => b.entries - a.entries)
}

async function readUsage(): Promise<void> {
  if (!navigator.storage?.estimate) return
  const estimate = await navigator.storage.estimate()
  usage.value = { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
  persisted.value = (await navigator.storage.persisted?.()) ?? false
}

async function refresh(): Promise<void> {
  await Promise.all([readCacheKeys(), refreshCaches(), readUsage(), readSw()])
  computeRows()
}

/**
 * 串行性：`cache.put()` 本身可以并发，但 894 个请求一起发会撞浏览器的
 * 每域名连接上限，反而更慢，还容易被中途取消搞得一半成功一半失败。
 * 5 个并发在本地实测最稳。
 */
async function runQueue(tasks: OfflineEntry[], label: string, ids: string[]): Promise<void> {
  if (progress.running || tasks.length === 0) return

  const controller = new AbortController()
  abortController = controller
  progress.running = true
  progress.label = label
  progress.done = 0
  progress.total = tasks.length
  progress.bytes = 0
  progress.failed = 0
  progress.message = ''
  progress.totalBytes = tasks.reduce((sum, e) => sum + e[2] + (withChunks.value ? e[3] : 0), 0)

  // 三个桶按需打开：只点「自测题库」时不该为 html-v2 建一个空缓存
  const opened = new Map<string, Cache>()
  const cacheOf = async (name: string): Promise<Cache> => {
    let cache = opened.get(name)
    if (!cache) {
      cache = await caches.open(name)
      opened.set(name, cache)
    }
    return cache
  }

  const queue = [...tasks]
  const failures: string[] = []
  let done = 0
  let bytes = 0

  const flush = (): void => {
    progress.done = done
    progress.bytes = bytes
    progress.failed = failures.length
  }

  const worker = async (): Promise<void> => {
    for (;;) {
      if (controller.signal.aborted) return
      const entry = queue.shift()
      if (!entry) return
      const [url, chunk, htmlBytes, chunkBytes] = entry
      try {
        const body = await fetch(url, { cache: 'reload', signal: controller.signal })
        if (!body.ok) throw new Error(`HTTP ${body.status}`)
        const target = targetCache(url)
        const cache = await cacheOf(target)
        await cache.put(new Request(absolute(url)), body.clone())
        bytes += htmlBytes

        // **两个 .mjs 要额外进 `assets`。** 它们是 `import()` 加载的，
        // 模块加载器不走 `runtime.ts` 的 fetch 拦截，但会经过 SW 的
        // script 路由（读 `assets`）。只放在 `pyodide-runtime-v1` 里的话，
        // 离线跑代码会卡在
        // `Failed to fetch dynamically imported module: /pyodide/pyodide.mjs`
        // —— 实测过，wasm/zip 都命中了，就这一步过不去。
        if (target === PYODIDE_CACHE && url.endsWith('.mjs')) {
          const assetCache = await cacheOf(ASSET_CACHE)
          await assetCache.put(new Request(absolute(url)), body.clone())
        }

        if (withChunks.value && chunk) {
          const chunkUrl = `/${chunk}`
          const script = await fetch(chunkUrl, { cache: 'reload', signal: controller.signal })
          if (!script.ok) throw new Error(`HTTP ${script.status}（${chunk}）`)
          const assetCache = await cacheOf(ASSET_CACHE)
          await assetCache.put(new Request(absolute(chunkUrl)), script.clone())
          bytes += chunkBytes
        }
      } catch (error) {
        if (controller.signal.aborted) return
        failures.push(`${url}：${error instanceof Error ? error.message : String(error)}`)
      }
      done++
      // 小分块（Python 运行时只有 5 个文件、单个 9.6MB）要一次一刷，
      // 否则界面上会一直停在 0/5 —— 看起来像卡死，其实正在下。
      if (done <= 20 || done % 5 === 0 || done === tasks.length) flush()
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  } finally {
    progress.running = false
    abortController = null
    flush()
  }

  if (controller.signal.aborted) {
    progress.message = `已取消：已下载的 ${done - failures.length} 项保留在缓存里。`
  } else if (failures.length > 0) {
    progress.message = `${failures.length} 项失败（多为网络中断）。已成功的保留，可再点一次「继续」。第一条：${failures[0]}`
  } else {
    progress.message = `${label}：${done} 项已缓存，共 ${formatBytes(bytes)}。`
  }

  // 记录这一版包覆盖了哪些板块。清单里没拿到 build（离线）时就保留旧值，
  // 免得把「我下的是哪一版」弄丢。
  const previous = meta.value
  const succeeded = done - failures.length > 0
  if (manifest.value && succeeded) {
    const sections = new Set(previous?.build === manifest.value.build ? previous.sections : [])
    for (const id of ids) sections.add(id)
    writeMeta({
      build: manifest.value.build,
      at: new Date().toISOString(),
      sections: [...sections],
      withChunks: withChunks.value,
    })

    // 跨版本重下一次之后，上一版那 800 多个 `assets/<页面>-<旧哈希>.js`
    // 再也不会被请求。ExpirationPlugin 不认页面直接塞进去的条目
    // （没有 IndexedDB 时间戳），不主动删就会一直堆在磁盘上。
    if (!controller.signal.aborted && previous && previous.build !== manifest.value.build) {
      await pruneStaleAssets()
    }
  }

  await refresh()
}

/** 只保留当前清单里的页面 chunk，删掉上一版遗留的 */
async function pruneStaleAssets(): Promise<void> {
  if (!manifest.value) return
  const keep = new Set<string>()
  for (const section of Object.values(manifest.value.sections)) {
    for (const entry of section.entries) {
      if (entry[1]) keep.add(absolute(`/${entry[1]}`))
    }
  }
  const cache = await caches.open(ASSET_CACHE)
  for (const request of await cache.keys()) {
    if (!keep.has(request.url)) await cache.delete(request)
  }
}

function download(id: string): void {
  const section = manifest.value?.sections[id]
  if (!section) return
  void runQueue(section.entries, section.label, [id])
}

function downloadAll(): void {
  if (!manifest.value) return
  const tasks = Object.values(manifest.value.sections).flatMap((section) => section.entries)
  void runQueue(tasks, '全部内容', Object.keys(manifest.value.sections))
}

function cancel(): void {
  abortController?.abort()
}

/**
 * 删除类操作一律「两步确认」：第一次点变成「确认清除」，20 秒内再点才真删。
 *
 * 不用 `window.confirm()`：原生对话框会**阻塞整个页面**（自动化里点一下就
 * 卡死），而且和站点其它交互完全不是一个观感。安卓 App 也是弹层/二次点击
 * 这种就地确认。
 */
const pendingKey = ref('')
let pendingTimer = 0

function requestClear(kind: 'section' | 'cache' | 'all', id: string): void {
  const label =
    kind === 'section'
      ? `「${manifest.value?.sections[id]?.label ?? id}」`
      : kind === 'cache'
        ? `缓存桶 ${id}`
        : '全部缓存'
  const key = `${kind}:${id}`
  if (pendingKey.value !== key) {
    pendingKey.value = key
    progress.message = `再点一次「确认清除」才会删除${label}；20 秒后自动取消。`
    window.clearTimeout(pendingTimer)
    pendingTimer = window.setTimeout(() => {
      if (pendingKey.value === key) {
        pendingKey.value = ''
        progress.message = ''
      }
    }, 20_000)
    return
  }
  pendingKey.value = ''
  window.clearTimeout(pendingTimer)
  if (kind === 'section') void clearSection(id)
  else if (kind === 'cache') void clearCache(id)
  else void clearAll()
}

async function clearSection(id: string): Promise<void> {
  const section = manifest.value?.sections[id]
  if (!section) return

  const assetCache = await caches.open(ASSET_CACHE)
  await Promise.all(
    section.entries.map(async (entry) => {
      const cache = await caches.open(targetCache(entry[0]))
      await cache.delete(absolute(entry[0]))
      if (entry[1]) await assetCache.delete(absolute(`/${entry[1]}`))
    }),
  )

  if (meta.value) {
    const sections = meta.value.sections.filter((s) => s !== id)
    writeMeta(sections.length ? { ...meta.value, sections } : null)
  }
  progress.message = `已清除「${section.label}」。`
  await refresh()
}

/** 删掉预缓存桶之后必须让 SW 重装一次，否则它不会再自己填回来 */
async function reinstallShell(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  await registration?.unregister()
  progress.message = '应用外壳的预缓存已清空，正在重新安装（页面会重载）…'
  try {
    sessionStorage.setItem(NOTICE_KEY, '缓存已清除，应用外壳正在重新缓存。')
  } catch {
    /* 隐私模式忽略 */
  }
  window.setTimeout(() => window.location.reload(), 600)
}

async function clearCache(name: string): Promise<void> {
  await caches.delete(name)
  if (name.startsWith('workbox-precache')) {
    await reinstallShell()
    return
  }
  progress.message = `已删除 ${name}。`
  await refresh()
}

async function clearAll(): Promise<void> {
  const names = await caches.keys()
  await Promise.all(names.map((name) => caches.delete(name)))
  writeMeta(null)
  // 预缓存一起删了：不注销重装的话 SW 会一直拿空桶应答外壳请求
  await reinstallShell()
}

async function checkUpdate(): Promise<void> {
  checking.value = true
  updateMessage.value = ''
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      updateMessage.value = '这个页面还没有 Service Worker，刷新一次让它注册后再试。'
      return
    }
    await registration.update()

    // `update()` 返回时新版本通常还在 installing；等它到 installed
    // 才会出现在 `registration.waiting` 里。
    const installing = registration.installing
    if (!registration.waiting && installing) {
      await new Promise<void>((resolve) => {
        const finish = (): void => {
          installing.removeEventListener('statechange', onChange)
          resolve()
        }
        const onChange = (): void => {
          if (installing.state === 'installed' || installing.state === 'redundant') finish()
        }
        installing.addEventListener('statechange', onChange)
        window.setTimeout(finish, 12_000)
      })
    }

    await readSw()
    if (registration.waiting) {
      updateMessage.value = `发现新版本，点「立即更新并重载」切换过去。${
        newerBuild.value ? '更新后请重新缓存离线内容。' : ''
      }`
    } else {
      updateMessage.value = '已是最新版本（浏览器缓存里的这款）。'
    }
  } catch (error) {
    updateMessage.value = `检查失败：${error instanceof Error ? error.message : String(error)}（离线时无法检查）`
  } finally {
    checking.value = false
  }
}

async function applyUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  const waiting = registration?.waiting
  if (!waiting) {
    updateMessage.value = '没有待应用的新版本，先点「检查新版本」。'
    return
  }
  applying.value = true
  updateMessage.value = '正在切换到新版本并重新加载…'

  // 插件自己也监听了 controllerchange 并 reload，这里再挂一次是为了
  // 不依赖它的内部实现；4 秒兜底防止消息丢失后页面卡住。
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  })
  waiting.postMessage({ type: 'SKIP_WAITING' })
  window.setTimeout(() => window.location.reload(), 4000)
}

async function enablePersist(): Promise<void> {
  persisting.value = true
  try {
    persisted.value = (await navigator.storage.persist?.()) ?? false
  } finally {
    persisting.value = false
  }
}

onMounted(async () => {
  supported.value =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    typeof caches !== 'undefined'

  meta.value = readMeta()

  if (!supported.value) {
    ready.value = true
    return
  }

  try {
    // no-store：新部署后要立刻看到新清单，不能吃 HTTP 缓存
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    manifest.value = (await response.json()) as OfflineManifest
  } catch (error) {
    manifestError.value =
      `拿不到离线清单 /offline-manifest.json（${error instanceof Error ? error.message : String(error)}）。` +
      '开发模式（pnpm start）不会生成它，只有构建产物里才有。'
  }

  withChunks.value = meta.value?.withChunks ?? true

  await refresh()
  ready.value = true

  try {
    const notice = sessionStorage.getItem(NOTICE_KEY)
    if (notice) {
      sessionStorage.removeItem(NOTICE_KEY)
      progress.message = notice
    }
  } catch {
    /* 隐私模式忽略 */
  }

  // 「清除全部缓存」会注销 SW 并重载页面，重装要几百毫秒 —— 那一刻
  // `getRegistration()` 还是 undefined，界面上会闪过「未注册」。补查一次。
  if (!sw.registration) {
    window.setTimeout(() => {
      void readSw().then(() => {
        if (sw.registration) void readUsage()
      })
    }, 1500)
  }

  if (!updateMessage.value) {
    updateMessage.value = sw.waiting
      ? '浏览器已经下载好了新版本，只差切换。'
      : '点「检查新版本」手动查一次；平时回到前台也会自动查（30 分钟一次）。'
  }
})
</script>

<style scoped>
.cache-settings {
  margin-top: 1rem;
}

.panel {
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.35rem;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.panel-head h2 {
  margin: 0;
  padding: 0;
  font-size: 1.05rem;
  border: none;
}

.badge {
  padding: 0.1rem 0.55rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-mute);
  background: var(--vp-c-bg-alt);
  border-radius: 999px;
}

.badge.is-ok {
  color: var(--vp-c-accent);
}

.badge.is-warn {
  color: var(--vp-c-warning, #b45309);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.facts div {
  min-width: 0;
}

.facts dt {
  font-size: 0.75rem;
  color: var(--vp-c-text-mute);
}

.facts dd {
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.toggle {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  font-size: 0.88rem;
  line-height: 1.5;
  cursor: pointer;
}

.toggle input {
  margin-top: 0.25rem;
}

.sections {
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.sections li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.55rem 0;
  border-top: 1px solid var(--vp-c-divider);
}

.sections li:first-child {
  border-top: none;
}

.row-label {
  display: block;
  font-size: 0.92rem;
}

.row-meta {
  display: block;
  font-size: 0.76rem;
  color: var(--vp-c-text-mute);
}

.row-state {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-mute);
  white-space: nowrap;
}

.row-state .is-done {
  color: var(--vp-c-accent);
}

.row-actions {
  display: flex;
  gap: 0.4rem;
}

.btn {
  padding: 0.3rem 0.7rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--vp-c-text);
  white-space: nowrap;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.btn:hover:not(:disabled) {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-primary {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.btn-danger:hover:not(:disabled) {
  color: var(--vp-c-danger, #c0392b);
  border-color: var(--vp-c-danger, #c0392b);
}

.btn-ghost {
  background: transparent;
}

/* 两步确认的「已就绪」态：红色提示这一下真的会删 */
.btn-armed {
  color: var(--vp-c-danger, #c0392b);
  border-color: var(--vp-c-danger, #c0392b);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.progress {
  margin-top: 1rem;
}

.progress-head,
.progress-foot {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--vp-c-text-mute);
}

.bar {
  height: 5px;
  margin: 0.35rem 0;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
  border-radius: 999px;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--vp-c-accent);
  transition: width 0.2s ease;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  font-size: 0.84rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.4rem 0.5rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--vp-c-divider);
}

th {
  font-weight: 500;
  color: var(--vp-c-text-mute);
}

.cell-action {
  text-align: right;
}

.state {
  margin: 0.5rem 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-mute);
}

.warn {
  font-size: 0.85rem;
  color: var(--vp-c-warning, #b45309);
}

.notice {
  padding: 1rem 1.15rem;
  font-size: 0.9rem;
  line-height: 1.6;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
}

.hint {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--vp-c-text-mute);
}

.muted {
  color: var(--vp-c-text-mute);
}

@media (max-width: 640px) {
  .sections li {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .row-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
