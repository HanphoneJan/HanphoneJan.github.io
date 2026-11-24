<template>
  <div class="cache-settings">
    <header class="page-head">
      <h1>设置</h1>
      <p>缓存与离线内容 · 断网时仍可打开已下载的页面</p>
    </header>

    <!-- SSR / 首屏：结构与真实页面同高，避免「先闪一行字、再整页跳一下」 -->
    <div v-if="!ready" class="skeleton" aria-hidden="true">
      <i class="sk-line" style="width: 6rem" />
      <div class="sk-card">
        <div v-for="n in 5" :key="n" class="sk-row">
          <i class="sk-line" style="width: 8rem" />
          <i class="sk-line" style="width: 4.5rem" />
        </div>
      </div>
    </div>

    <div v-else-if="!supported" class="notice">
      <strong>这个浏览器不支持缓存管理。</strong>
      离线缓存依赖 Service Worker 与 CacheStorage，需要 <b>HTTPS</b>（或
      localhost）并且不是隐私模式的严格拦截。当前页面仍可正常阅读。
    </div>

    <template v-else>
      <!-- ── 离线内容（站内） ───────────────────────────────────── -->
      <section class="group">
        <div class="group-head">
          <span class="group-title">离线内容</span>
          <template v-if="siteRows.length">
            <span class="dot">·</span>
            <span>{{ coveredSections }} / {{ siteRows.length }} 个板块</span>
            <span class="dot">·</span>
            <span>
              {{ formatBytes(cachedSiteBytes) }} / {{ formatBytes(estimatedTotal) }}
            </span>
          </template>
          <span v-if="siteComplete" class="pill is-ok">已离线可用</span>
          <span class="grow" />
          <button v-if="master" type="button" class="btn-primary" @click="runMaster">
            {{ master.label }}
          </button>
        </div>

        <div v-if="manifestError" class="card">
          <p class="card-note">{{ manifestError }}</p>
        </div>

        <div v-else-if="manifest" class="card">
          <div
            v-for="row in siteViews"
            :key="row.id"
            class="row"
            :class="{ 'is-busy': progress.running && row.state !== 'running' }"
          >
            <div class="row-main">
              <span class="row-title">{{ row.label }}</span>
              <span class="row-meta">
                {{ row.count }} 项 · {{ row.unknown ? '大小未知' : formatBytes(row.estimated) }}
              </span>
            </div>
            <div class="row-state" :class="row.stateClass" :title="row.detail">
              <span>{{ row.main }}</span>
              <em v-if="row.sub">{{ row.sub }}</em>
            </div>
            <div class="row-act">
              <button
                v-if="row.action"
                type="button"
                class="btn"
                :class="{ 'btn-quiet': row.action === 'cancel' }"
                :disabled="progress.running && row.action !== 'cancel'"
                @click="runRow(row)"
              >
                {{ ACTION_LABEL[row.action] }}
              </button>
              <button
                v-if="row.action !== 'cancel'"
                type="button"
                class="icon-btn"
                aria-label="更多操作"
                :aria-expanded="menuFor === row.id"
                :disabled="progress.running"
                @click.stop="openMenu($event, row.id)"
              >
                ⋯
              </button>
            </div>
            <div v-if="row.state === 'running'" class="track">
              <i :style="{ width: `${percentOf(row)}%` }" />
            </div>
            <div v-if="confirming === `section:${row.id}`" class="confirm" @click.stop>
              <span>清除「{{ row.label }}」的缓存？</span>
              <span class="confirm-act">
                <button type="button" class="btn" @click="cancelConfirm">取消</button>
                <button type="button" class="btn btn-danger" @click="clearSection(row.id)">
                  清除
                </button>
              </span>
            </div>
          </div>

          <label class="row">
            <div class="row-main">
              <span class="row-title">同时缓存页面脚本</span>
              <span class="row-sub">关掉只下 HTML：离线能读，但切页会整页重载</span>
            </div>
            <div class="row-act">
              <input
                v-model="withChunks"
                type="checkbox"
                role="switch"
                class="switch"
                aria-label="同时缓存页面脚本"
              >
            </div>
          </label>
        </div>

        <p v-if="notice" class="group-note" role="status">{{ notice }}</p>
      </section>

      <!-- ── 外链图片（第三方） ─────────────────────────────────── -->
      <section v-if="thirdViews.length" class="group">
        <div class="group-head">
          <span class="group-title">外链图片</span>
          <span class="pill">第三方</span>
          <span class="dot">·</span>
          <span>不计入上面的进度与「更新」</span>
        </div>
        <div class="card">
          <div
            v-for="row in thirdViews"
            :key="row.id"
            class="row"
            :class="{ 'is-busy': progress.running && row.state !== 'running' }"
          >
            <div class="row-main">
              <span class="row-title">{{ row.label }}</span>
              <span class="row-meta">
                {{ row.count }} 张 · {{ row.unknown ? '大小未知' : formatBytes(row.estimated) }} · hanphone.top
              </span>
            </div>
            <div class="row-state" :class="row.stateClass" :title="row.detail">
              <span>{{ row.main }}</span>
              <em v-if="row.sub">{{ row.sub }}</em>
            </div>
            <div class="row-act">
              <button
                v-if="row.action"
                type="button"
                class="btn"
                :class="{ 'btn-quiet': row.action === 'cancel' }"
                :disabled="progress.running && row.action !== 'cancel'"
                @click="runRow(row)"
              >
                {{ ACTION_LABEL[row.action] }}
              </button>
              <button
                v-if="row.action !== 'cancel'"
                type="button"
                class="icon-btn"
                aria-label="更多操作"
                :aria-expanded="menuFor === row.id"
                :disabled="progress.running"
                @click.stop="openMenu($event, row.id)"
              >
                ⋯
              </button>
            </div>
            <div v-if="row.state === 'running'" class="track">
              <i :style="{ width: `${percentOf(row)}%` }" />
            </div>
            <div v-if="confirming === `section:${row.id}`" class="confirm" @click.stop>
              <span>清除「{{ row.label }}」的缓存？</span>
              <span class="confirm-act">
                <button type="button" class="btn" @click="cancelConfirm">取消</button>
                <button type="button" class="btn btn-danger" @click="clearSection(row.id)">
                  清除
                </button>
              </span>
            </div>
          </div>
        </div>
        <p class="group-note">
          来自 hanphone.top，约 40 MB。阅读时看过的图会自动缓存；它没有内容指纹，
          链接不变就算没变，图床失效也只影响这一组。
        </p>
      </section>

      <!-- ── 版本与维护 ─────────────────────────────────────────── -->
      <section class="group">
        <div class="group-head">
          <span class="group-title">版本与维护</span>
          <span class="dot">·</span>
          <span>{{ swText }}</span>
        </div>
        <div class="card">
          <div v-if="usage" class="row">
            <div class="row-main">
              <span class="row-title">浏览器占用</span>
            </div>
            <div class="row-state">
              {{ formatBytes(usage.usage) }}
              <span class="muted">/ {{ formatBytes(usage.quota) }}</span>
            </div>
            <div class="track">
              <i :style="{ width: `${usagePercent}%` }" />
            </div>
          </div>

          <div class="row">
            <div class="row-main">
              <span class="row-title">站点外壳</span>
              <span class="row-meta mono" :title="buildFull">{{ shortBuild }}</span>
            </div>
            <div class="row-state" :class="{ 'is-warn': sw.waiting }">{{ swText }}</div>
            <div class="row-act">
              <button type="button" class="btn" :disabled="checking" @click="checkUpdate">
                {{ checking ? '检查中…' : '检查更新' }}
              </button>
            </div>
          </div>

          <div v-if="sw.waiting" class="row is-alert">
            <div class="row-main">
              <span class="row-title">有新版本待应用</span>
              <span class="row-sub">切换后会重载页面</span>
            </div>
            <div class="row-act">
              <button type="button" class="btn-primary" :disabled="applying" @click="applyUpdate">
                立即更新
              </button>
            </div>
          </div>

          <button type="button" class="row row-click" @click="detailsOpen = !detailsOpen">
            <div class="row-main">
              <span class="row-title">缓存明细</span>
              <span class="row-meta">{{ buckets.length }} 个缓存桶 · 约 {{ formatBytes(bucketBytes) }}</span>
            </div>
            <span class="chev">{{ detailsOpen ? '⌄' : '›' }}</span>
          </button>

          <div v-if="detailsOpen" class="details">
            <div v-if="bucketConfirm" class="confirm">
              <span>删除缓存桶 <code>{{ bucketConfirm }}</code>？</span>
              <span class="confirm-act">
                <button type="button" class="btn" @click="cancelConfirm">取消</button>
                <button type="button" class="btn btn-danger" @click="clearCache(bucketConfirm)">
                  删除
                </button>
              </span>
            </div>
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
                      <button type="button" class="btn" @click="askBucket(c.name)">清除</button>
                    </td>
                  </tr>
                  <tr v-if="buckets.length === 0">
                    <td colspan="4" class="muted">还没有任何缓存。</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="details-note">
              大小为估算值（按响应头累加）。删掉应用外壳会重装 SW 并重载页面。
            </p>
          </div>

          <div class="row" :class="{ 'row-click': !persisted }" @click="!persisted && enablePersist()">
            <div class="row-main">
              <span class="row-title">长期保留缓存</span>
              <span class="row-meta">
                {{ persisted
                  ? '已开启：空间紧张时不会被优先清掉'
                  : '未开启：iOS 7 天不访问或磁盘紧张时可能被清掉' }}
              </span>
            </div>
            <div class="row-state" :class="{ 'is-ok': persisted }">
              {{ persisted ? '已开启' : '未开启' }}
            </div>
            <div class="row-act">
              <button
                v-if="!persisted"
                type="button"
                class="btn"
                :disabled="persisting"
                @click.stop="enablePersist"
              >
                {{ persisting ? '申请中…' : '开启' }}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="row row-click"
            :class="{ 'is-armed': confirming === 'all' }"
            @click="askConfirm('all')"
          >
            <div class="row-main">
              <span class="row-title is-danger">清除全部缓存</span>
              <span class="row-meta">含外链图片</span>
            </div>
            <span class="chev">›</span>
          </button>

          <div v-if="confirming === 'all'" class="confirm">
            <span>清除全部缓存？离线内容、外链图片与缓存桶都会删掉，页面会重载。</span>
            <span class="confirm-act">
              <button type="button" class="btn" @click="cancelConfirm">取消</button>
              <button type="button" class="btn btn-danger" @click="clearAll">清除全部</button>
            </span>
          </div>
        </div>
        <p v-if="updateMessage" class="group-note" role="status">{{ updateMessage }}</p>
      </section>

      <details class="more">
        <summary>这些板块分别是什么？</summary>
        <p>
          共享脚本是运行条、编辑器、图表等懒加载代码；Python 运行时是题解里
          「▶ 运行」的解释器；页面插图是本站正文里的结构图与项目配图；
          题解可视化是逐帧动画数据。外链图片不在离线包里，它来自 hanphone.top。
        </p>
      </details>

      <!-- 行内 ⋯ 菜单：固定定位，避免被卡片圆角的 overflow 裁掉 -->
      <div v-if="menuFor" class="menu" :style="menuStyle" role="menu">
        <button type="button" role="menuitem" @click="verifySection">校验完整性</button>
        <div class="sep" />
        <button
          type="button"
          role="menuitem"
          class="is-danger"
          @click="askClearSection(menuFor)"
        >
          清除这一板块
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 缓存与离线内容（`/settings.html`）。
 *
 * ## 操作模型：一行一个状态、一个动作
 *
 * 一个板块只有**一个**状态（不是四个数字），按钮文案从状态推出来：
 *
 * ```
 * 运行中 → 取消     失败 → 重试     部分 → 继续
 * 有更新 → 更新     缺脚本 → 修复   未下载 → 下载
 * 已下载 → 没有按钮（维护动作收进 ⋯）
 * ```
 *
 * 页面上只有一个主按钮（组头那个），它只做一件事：把站内离线内容补到最新；
 * 没有可做的事时它自己消失。危险操作不再常驻列表 —— 清除收进 ⋯，点了才在
 * 那一行展开确认条。进度跟着那一行走，不再有页顶的全局进度面板。
 *
 * ## 站内内容与第三方内容分开
 *
 * `remote` 板块（hanphone.top 上的 525 张配图）在清单里带 `thirdParty: true`：
 * 它不计入板块覆盖率、不计入总量与「更新」，失败原因也只说图床。
 * 混在一起时「完整可用」永远亮不起来（站内全下完了它仍是 0/N），
 * 而且它的「指纹」是 sha1(url)，永远判「没变」。
 *
 * ## 为什么写进现有的缓存桶，而不是新建一个
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { PYODIDE_CACHE_NAME } from '../../src/components/training/pyrunner/runtime-files'

interface OfflineEntry extends Array<string | number | null> {
  0: string
  1: string | null
  2: number
  3: number
  /** 内容指纹（sha1 前 10 位），见 plugins/offline-package.ts 的 hashOf */
  4: string
  /**
   * 整页孤岛的附加页面代码 `[[chunk 路径, 字节数], …]`（只有 `/stars.html`
   * 与 `/projects.html` 有）。它们的组件是从外壳里 `import()` 的，路由表里
   * 找不到，得跟着页面一起下，否则离线打开是一片空白。
   */
  5?: Array<[string, number]> | null
}

interface OfflineSection {
  label: string
  bytes: number
  entries: OfflineEntry[]
  /** 第三方内容（`remote`）：设置页把它单独成组，见文件头 */
  thirdParty?: boolean
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
  /** URL -> 上次确认过的**整份文件**指纹（决定要不要重下） */
  hashes: Record<string, string>
  /** URL -> 上次确认过的**内容**指纹（页面：抹平 app 哈希后的 HTML）；决定要不要重下 */
  content: Record<string, string>
  /**
   * 页面 URL -> 缓存这份 HTML 时它引用的那一版外壳。
   *
   * 页面 HTML 里写死了 `app-<hash>.js`，而它每次构建都会改名。**保留旧外壳**
   * （而不是重下 HTML）才能做到「只改文档时只下改到的那几页」：
   * 旧 HTML + 旧 app + 旧 chunk 三件套一起留在缓存里，离线照样能启动。
   */
  pages: Record<string, { app: string; chunk: string; islands?: string[] }>
  /** 外壳文件 -> 它的静态依赖（目前只有 rolldown-runtime-*.js），prune 时一并保留 */
  appDeps: Record<string, string[]>
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
  /** 已缓存条目的体积估算（清单里那些文件的字节数之和） */
  cachedBytes: number
  cached: number
  chunkMissing: number
  /** 内容真的变了的条目数（页面比 chunk 名、其它比文件指纹） */
  stale: number
  unknown: boolean
  thirdParty: boolean
}

type RowState = 'running' | 'failed' | 'partial' | 'stale' | 'repair' | 'idle' | 'done'
type RowAction = 'cancel' | 'retry' | 'continue' | 'update' | 'repair' | 'download' | ''

interface RowView extends SectionRow {
  state: RowState
  action: RowAction
  main: string
  sub: string
  stateClass: string
  detail: string
}

interface RunStat {
  done: number
  total: number
  bytes: number
}

interface Failure {
  url: string
  message: string
}

const ACTION_LABEL: Record<RowAction, string> = {
  cancel: '取消',
  retry: '重试',
  continue: '继续',
  update: '更新',
  repair: '修复',
  download: '下载',
  '': '',
}

const HTML_CACHE = 'html-v2'
const ASSET_CACHE = 'assets'
const TRACE_CACHE = 'traces'
const QUIZ_CACHE = 'quiz'
// 搜索索引 worker（`assets/slimsearch.<BUILD_ID>.js`）。它是 worker 请求，
// SW 的 script/style 路由接不住，见 `theme.ts` 里那条单独的路由。
const SEARCH_CACHE = 'search'
// 正文插图 + 外链图：与 `theme.ts` 的 image 路由同名，离线打开时 SW 从这一桶取
const IMAGE_CACHE = 'images'
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
const detailsOpen = ref(false)
const updateMessage = ref('')
const notice = ref('')
const sw = reactive({ active: false, waiting: false, registration: false })
const progress = reactive({ running: false })
const rows = ref<SectionRow[]>([])
const menuFor = ref('')
const menuStyle = ref<Record<string, string>>({})
const confirming = ref('')

/** 每个板块在这次运行里的进度（跨板块的「更新全部」也能各画各的条） */
const sectionRun = reactive<Record<string, RunStat>>({})
/** 每个板块这一轮失败的条目（重试只重跑这些） */
const sectionErrors = reactive<Record<string, Failure[]>>({})

// 勾上/取消「同时缓存页面脚本」时，每个板块的预计体积要跟着变
watch(withChunks, () => computeRows())

let abortController: AbortController | null = null
/** 缓存桶 -> 已缓存的绝对 URL 集合。所有「已缓存多少」都由它算，不另存状态 */
const cacheKeys = new Map<string, Set<string>>()
/** 清单里每个 URL 属于哪个板块（运行进度与失败归因都靠它） */
const sectionOfUrl = new Map<string, string>()

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
  // 外链图（`https://hanphone.top/...`）同样由 SW 的 image 路由伺候，
  // 读的就是 `images` 桶。
  if (/^https?:\/\//i.test(url)) return IMAGE_CACHE
  if (url.startsWith('/traces/')) return TRACE_CACHE
  if (url.startsWith('/quiz/')) return QUIZ_CACHE
  // 12.9MB 的 Python 解释器有自己的桶，不归 SW 管（见 pyrunner/runtime.ts）
  if (url.startsWith('/pyodide/')) return PYODIDE_CACHE
  // 正文插图（`static/diagrams` 结构图 + `static/img` 项目配图）：SW 的
  // image 路由是 CacheFirst，读的就是 `images` 桶。写进 html-v2 的话离线
  // 打开页面仍然是裂图。
  if (url.startsWith('/diagrams/') || url.startsWith('/img/')) return IMAGE_CACHE
  // 搜索索引 worker 有自己的桶（见 `theme.ts` 的 worker 路由）。
  // 必须放在 `/assets/` 分支**前面**：它的 URL 也在 `/assets/` 下。
  if (/^\/assets\/slimsearch\.[^/]+\.js$/.test(url)) return SEARCH_CACHE
  // 「共享脚本」也要进 `assets`：那是 SW 的 script 路由读的桶（SWR，
  // 文件名带内容哈希所以不可变）。塞进 html-v2 的话永远不会被用到。
  if (url.startsWith('/assets/')) return ASSET_CACHE
  return HTML_CACHE
}

/** 站内板块（离线包） */
const siteRows = computed(() => rows.value.filter((row) => !row.thirdParty))

const estimatedTotal = computed(() =>
  siteRows.value.reduce((sum, row) => sum + row.estimated, 0),
)
const cachedSiteBytes = computed(() =>
  siteRows.value.reduce((sum, row) => sum + row.cachedBytes, 0),
)
const coveredSections = computed(
  () => siteRows.value.filter((row) => row.count > 0 && row.cached === row.count).length,
)
const siteComplete = computed(
  () =>
    siteRows.value.length > 0 &&
    siteRows.value.every(
      (row) => row.count > 0 && row.cached === row.count && !row.stale && !row.chunkMissing,
    ),
)
const bucketBytes = computed(() => buckets.value.reduce((sum, c) => sum + c.bytes, 0))
const usagePercent = computed(() => {
  if (!usage.value || usage.value.quota <= 0) return 0
  return Math.min(100, Math.max(1, (usage.value.usage / usage.value.quota) * 100))
})

/** 页面里被汇总到一行的第三方板块（525 张图，按条列会刷屏） */
const thirdViews = computed<RowView[]>(() => {
  return rows.value.filter((row) => row.thirdParty).map((row) => viewOf(row))
})

const siteViews = computed<RowView[]>(() => {
  return siteRows.value.map((row) => viewOf(row))
})

const shortBuild = computed(() => {
  const build = buildFull.value
  if (!build) return '—'
  // 本地构建是 `<sha>-dirty.<时间戳>`：行上只显示提交号，完整值在 title 里
  return build.split('-')[0]
})

const buildFull = computed(() => manifest.value?.build ?? meta.value?.build ?? '')

const swText = computed(() => {
  if (!sw.registration) return '未注册'
  if (sw.waiting) return '有新版本待应用'
  return sw.active ? '已就绪' : '注册中'
})

/**
 * 组头那个唯一的按钮。它只回答一个问题：把站内离线内容补到最新，下一步做什么。
 * 没有可做的事（全部下完、没有更新、没有缺件）时返回 null，按钮直接消失。
 */
const master = computed<{ kind: 'cancel' | 'retry' | 'resume' | 'update' | 'download' | 'repair'; label: string } | null>(() => {
  if (progress.running) return { kind: 'cancel', label: '取消' }
  const rows = siteRows.value
  if (rows.length === 0) return null

  const failed = rows.reduce((sum, row) => sum + (sectionErrors[row.id]?.length ?? 0), 0)
  if (failed > 0) return { kind: 'retry', label: `重试 ${failed} 项` }

  const partial = rows.some((row) => row.cached > 0 && row.cached < row.count)
  if (partial) {
    const rest = Math.max(0, estimatedTotal.value - cachedSiteBytes.value)
    return { kind: 'resume', label: `继续下载（剩 ${formatBytes(rest)}）` }
  }

  const stale = rows.reduce((sum, row) => sum + row.stale, 0)
  if (stale > 0) return { kind: 'update', label: `更新 ${stale} 项` }

  if (rows.some((row) => row.count > 0 && row.cached === 0)) {
    return { kind: 'download', label: `下载离线内容（${formatBytes(estimatedTotal.value)}）` }
  }

  const repair = rows.reduce((sum, row) => sum + row.chunkMissing, 0)
  if (repair > 0) return { kind: 'repair', label: `修复 ${repair} 项` }

  return null
})

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

/** 是不是别的站点的图（`hanphone.top` 那批） */
function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function readMeta(): PackageMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PackageMeta
    if (!parsed || typeof parsed.build !== 'string') return null
    return {
      ...parsed,
      hashes: parsed.hashes ?? {},
      content: parsed.content ?? {},
      pages: parsed.pages ?? {},
      appDeps: parsed.appDeps ?? {},
    }
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
    [
      HTML_CACHE,
      ASSET_CACHE,
      TRACE_CACHE,
      QUIZ_CACHE,
      IMAGE_CACHE,
      PYODIDE_CACHE,
      SEARCH_CACHE,
    ].map(async (name) => {
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
  // 没下过包时不谈「变了」：指纹一片空，全算变更会满屏噪音
  const hashes = meta.value ? (meta.value.hashes ?? {}) : null
  const contentOf = meta.value?.content ?? {}
  const contentKnown = Object.keys(contentOf).length > 0

  sectionOfUrl.clear()

  rows.value = Object.entries(manifest.value.sections).map(([id, section]) => {
    let cached = 0
    let cachedBytes = 0
    let chunkMissing = 0
    let stale = 0
    let estimated = 0
    for (const entry of section.entries) {
      sectionOfUrl.set(entry[0], id)
      const size = entry[2] + (withChunks.value ? entry[3] : 0)
      estimated += size
      if (!keysOf(targetCache(entry[0])).has(absolute(entry[0]))) continue

      cached++
      cachedBytes += size
      // 「缺脚本」要对着**缓存里那份 HTML 实际引用的 chunk** 判断：
      // 保留旧页面时，清单里那个新 chunk 名本来就不该被下载。整页孤岛的
      // 附加脚本同理 —— 旧 HTML 配的外壳 import 的是旧那份。
      const record = meta.value?.pages?.[entry[0]]
      const chunkToCheck = record?.chunk ?? entry[1]
      const islandsToCheck = record?.islands ?? (entry[5] ?? []).map(([rel]) => rel)
      if (
        withChunks.value &&
        [chunkToCheck, ...islandsToCheck].some(
          (rel) => rel && !keysOf(ASSET_CACHE).has(absolute(`/${rel}`)),
        )
      ) {
        chunkMissing++
      }
      // 「变了多少」只对**已经下过**的条目有意义：没下过就是没下过，
      // 行上已经写着 0/N 了，再标一遍「内容更新」纯属噪音
      if (hashes && contentKnown && contentOf[entry[0]] !== entry[4]) stale++
    }
    return {
      id,
      label: section.label,
      count: section.entries.length,
      estimated,
      cachedBytes,
      // 外链板块：构建期不联网，体积未知（真实大小要下载时才知道）。
      // 直接写 `0 KB` 看起来像 bug，标成「大小未知」。
      unknown: estimated === 0 && section.entries.length > 0,
      cached,
      chunkMissing,
      stale,
      thirdParty: section.thirdParty === true,
    }
  })
}

/**
 * 一个板块的状态。**顺序就是优先级**：正在跑 > 失败 > 未完成 > 有更新 >
 * 缺脚本 > 已下载。按钮文案只从这里出，不再由模板里三四个数字拼。
 */
function stateOf(row: SectionRow): RowState {
  const run = sectionRun[row.id]
  const failed = sectionErrors[row.id]?.length ?? 0
  if (progress.running && run && run.done < run.total) return 'running'
  if (failed > 0) return 'failed'
  if (row.count > 0 && row.cached === 0) return 'idle'
  if (row.cached < row.count) return 'partial'
  if (row.stale > 0) return 'stale'
  if (row.chunkMissing > 0) return 'repair'
  return 'done'
}

function actionOf(state: RowState): RowAction {
  if (state === 'running') return 'cancel'
  if (state === 'failed') return 'retry'
  if (state === 'partial') return 'continue'
  if (state === 'stale') return 'update'
  if (state === 'repair') return 'repair'
  if (state === 'idle') return 'download'
  return ''
}

function viewOf(row: SectionRow): RowView {
  const state = stateOf(row)
  const run = sectionRun[row.id]
  let main = ''
  let sub = ''
  let stateClass = ''

  if (state === 'running') {
    main = `${run?.done ?? 0} / ${run?.total ?? 0}`
    sub = formatBytes(run?.bytes ?? 0)
    stateClass = 'is-run'
  } else if (state === 'failed') {
    const failed = sectionErrors[row.id]?.length ?? 0
    main = `${failed} 项失败`
    sub = row.thirdParty ? '图床 502 或对方不支持跨域' : '网络中断或文件已不存在'
    stateClass = 'is-bad'
  } else if (state === 'partial') {
    main = `${row.cached} / ${row.count}`
    sub = `已下 ${formatBytes(row.cachedBytes)}`
  } else if (state === 'stale') {
    main = `${row.cached} / ${row.count}`
    sub = `${row.stale} 项内容更新`
    stateClass = 'is-ok'
  } else if (state === 'repair') {
    main = '已下载'
    sub = `缺 ${row.chunkMissing} 项脚本`
    stateClass = 'is-bad'
  } else if (state === 'done') {
    main = '已下载'
    stateClass = 'is-ok'
  } else {
    main = `0 / ${row.count}`
  }

  return {
    ...row,
    state,
    action: actionOf(state),
    main,
    sub,
    stateClass,
    detail: failureDetail(row),
  }
}

/** 失败的原始报文放 title 里：行上只留一句人能看懂的 */
function failureDetail(row: SectionRow): string {
  const errors = sectionErrors[row.id] ?? []
  if (errors.length === 0) return ''
  return errors
    .slice(0, 3)
    .map((error) => `${error.url}：${error.message}`)
    .join('\n')
}

function percentOf(row: RowView): number {
  const run = sectionRun[row.id]
  if (!run || run.total === 0) return 0
  return Math.min(100, Math.round((run.done / run.total) * 100))
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

  // 每个板块各自记一份进度与失败：跨板块的「更新全部」时，每行画自己的条
  for (const id of ids) {
    sectionRun[id] = { done: 0, total: 0, bytes: 0 }
    sectionErrors[id] = []
  }
  for (const entry of tasks) {
    const id = sectionOfUrl.get(entry[0])
    if (id && sectionRun[id]) {
      sectionRun[id].total++
    }
  }

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
  let skipped = 0
  /** 这次「确认过」的 URL：下载成功，或指纹命中且缓存还在 */
  const verified = new Set<string>()

  // 缓存键的本地镜像：运行中会不断补写，省掉每条一次 `cache.match()`
  const known = new Map<string, Set<string>>()
  const knownOf = (name: string): Set<string> => {
    let set = known.get(name)
    if (!set) {
      set = new Set(keysOf(name))
      known.set(name, set)
    }
    return set
  }

  /** 页面 HTML 里写的 `<script src="/assets/app-xxx.js">` */
  const appRefOf = (html: string): string => {
    const match = /src="\/(assets\/app-[^"]+\.js)"/.exec(html)
    return match ? match[1] : ''
  }

  // 记录每版外壳的静态依赖（目前只有 rolldown-runtime-*.js）
  const appDeps: Record<string, string[]> = { ...(meta.value?.appDeps ?? {}) }
  // 页面 URL -> 缓存这份 HTML 时用的外壳（以及它懒加载的孤岛代码）
  const pages: Record<string, { app: string; chunk: string; islands?: string[] }> = {
    ...(meta.value?.pages ?? {}),
  }

  /**
   * 把外壳（以及它的静态依赖）留在 `assets` 里。
   *
   * 这是「保留旧版本」的关键：页面 HTML 里写死了 `app-<hash>.js`，只要把这份
   * 外壳留下来，旧 HTML 离线仍然能启动 —— 不用为了一个新哈希把 894 页重下一遍。
   * 优先从**任意缓存**（当前构建的外壳就在 SW 预缓存里）取，取不到才走网络。
   */
  const ensureAsset = async (rel: string): Promise<void> => {
    const absUrl = absolute(rel)
    if (knownOf(ASSET_CACHE).has(absUrl)) return
    const assetCache = await cacheOf(ASSET_CACHE)
    const cached = await caches.match(absUrl)
    const response =
      cached ?? (await fetch(rel, { cache: 'reload', signal: controller.signal }))
    if (!response.ok) throw new Error(`HTTP ${response.status}（${rel}）`)
    await assetCache.put(new Request(absUrl), response.clone())
    knownOf(ASSET_CACHE).add(absUrl)

    if (rel.endsWith('.js') && !appDeps[rel]) {
      const text = await response.text()
      appDeps[rel] = [
        ...new Set(
          [...text.matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => `assets/${m[1]}`),
        ),
      ]
      for (const dep of appDeps[rel]) await ensureAsset(dep)
    }
  }

  const worker = async (): Promise<void> => {
    for (;;) {
      if (controller.signal.aborted) return
      const entry = queue.shift()
      if (!entry) return
      const [url, chunk, htmlBytes, chunkBytes] = entry
      const scriptFiles = entry[5] ?? []
      const target = targetCache(url)
      const targetKeys = knownOf(target)
      const assetKeys = knownOf(ASSET_CACHE)
      const chunkRel = chunk ?? ''
      const chunkUrl = chunkRel ? `/${chunkRel}` : ''
      /** 页面自己的代码：入口 chunk + 整页孤岛的附加脚本 */
      const scriptUrls = [
        ...(chunkUrl ? [chunkUrl] : []),
        ...scriptFiles.map(([rel]) => `/${rel}`),
      ]
      const sectionId = sectionOfUrl.get(url) ?? ''
      let gained = 0
      let failed = false

      /**
       * 增量判断：**内容没变 + HTML 还在 + 它引用的外壳还在** 就整条跳过。
       *
       * 页面的「内容」看 chunk 名（自己带内容哈希），不看 HTML 字节 ——
       * HTML 每次构建都会因为 `app-<hash>.js` 改名而变化，拿它当内容指纹
       * 就等于每次部署重下全站。旧 HTML 配旧外壳一起留着，离线照样能开。
       */
      const cachedThere = targetKeys.has(absolute(url))
      const contentSame = Boolean(entry[4]) && meta.value?.content?.[url] === entry[4]
      const record = pages[url]
      // 旧 HTML 能不能继续用，取决于「它引用的那份外壳 + 那个页面 chunk」
      // （以及整页孤岛的页面代码）还在
      const shellKept =
        !chunkRel ||
        (Boolean(record) &&
          assetKeys.has(absolute(`/${record!.app}`)) &&
          assetKeys.has(absolute(`/${record!.chunk}`)) &&
          (record!.islands ?? []).every((rel) => assetKeys.has(absolute(`/${rel}`))))
      const needChunk = Boolean(
        withChunks.value && scriptUrls.some((rel) => !assetKeys.has(absolute(rel))),
      )
      const needHtml = !(contentSame && cachedThere && shellKept)

      if (!needHtml) {
        skipped++
        verified.add(url)
      } else {
        try {
          let htmlText = ''
          // 外链图用**默认的 CORS 模式**取：该图床带 `ACAO: *`，回来的是正常
          // 响应（opaque 会被浏览器加随机填充，一张 39KB 的图能占 6MB）。
          const remote = isRemoteUrl(url)
          const load = (): Promise<Response> =>
            fetch(url, { cache: 'reload', signal: controller.signal })
          let body = await load()
          // 图床在并发下偶尔 502（实测一批 500 多张里会抖几次）：外链再试一遍，
          // 别让读者看到一串「失败」还以为是自己网络断了。
          if (remote && !body.ok) {
            await new Promise((resolve) => setTimeout(resolve, 1200))
            body = await load()
          }
          if (!body.ok) throw new Error(`HTTP ${body.status}${remote ? '（外链）' : ''}`)
          // 502/404 被图床当图片返回时，content-type 是 text/html
          if (remote && /text\/html/i.test(body.headers.get('content-type') || '')) {
            throw new Error('返回的不是图片')
          }
          const realBytes = Number(body.headers.get('content-length') ?? 0) || 0
          const cache = await cacheOf(target)
          await cache.put(new Request(absolute(url)), body.clone())
          targetKeys.add(absolute(url))
          // 外链在清单里是 0，用响应头里的真实值，进度才有意义
          gained += htmlBytes || realBytes
          htmlText = chunkRel ? await body.text() : ''

          // **两个 .mjs 要额外进 `assets`。** 它们是 `import()` 加载的，
          // 模块加载器不走 `runtime.ts` 的 fetch 拦截，但会经过 SW 的
          // script 路由（读 `assets`）。只放在 `pyodide-runtime-v1` 里的话，
          // 离线跑代码会卡在
          // `Failed to fetch dynamically imported module: /pyodide/pyodide.mjs`
          // —— 实测过，wasm/zip 都命中了，就这一步过不去。
          if (target === PYODIDE_CACHE && url.endsWith('.mjs')) {
            const assetCache = await cacheOf(ASSET_CACHE)
            await assetCache.put(new Request(absolute(url)), body.clone())
            assetKeys.add(absolute(url))
          }

          if (needChunk) {
            for (const rel of scriptUrls) {
              if (assetKeys.has(absolute(rel))) continue
              const script = await fetch(rel, {
                cache: 'reload',
                signal: controller.signal,
              })
              if (!script.ok) throw new Error(`HTTP ${script.status}（${rel}）`)
              const assetCache = await cacheOf(ASSET_CACHE)
              await assetCache.put(new Request(absolute(rel)), script.clone())
              assetKeys.add(absolute(rel))
            }
            gained += chunkBytes
          }

          // 页面：把这份 HTML 引用的外壳记下来（必要时下载并留下）
          if (chunkRel) {
            if (!htmlText) {
              const cachedHtml = await (await cacheOf(target)).match(absolute(url))
              htmlText = cachedHtml ? await cachedHtml.text() : ''
            }
            const app = appRefOf(htmlText)
            if (app) {
              await ensureAsset(app)
              pages[url] = {
                app,
                chunk: chunkRel,
                islands: scriptFiles.map(([rel]) => rel),
              }
            }
          }

          verified.add(url)
        } catch (error) {
          if (controller.signal.aborted) return
          failed = true
          const message = error instanceof Error ? error.message : String(error)
          failures.push(`${url}：${message}`)
          const bucket = sectionErrors[sectionId]
          if (bucket) bucket.push({ url, message })
        }
      }

      done++
      bytes += gained
      const run = sectionRun[sectionId]
      if (run) {
        run.done++
        if (!failed) run.bytes += gained
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  } finally {
    progress.running = false
    abortController = null
  }

  const downloaded = done - failures.length - skipped
  const thirdPartyRun = ids.some((id) => manifest.value?.sections[id]?.thirdParty)
  if (controller.signal.aborted) {
    notice.value = `已取消：本次更新 ${downloaded} 项，${skipped} 项原本就是最新。`
  } else if (failures.length > 0) {
    const reason = thirdPartyRun
      ? '图床 502 或对方不支持跨域'
      : '网络中断或文件已不存在'
    notice.value =
      `${label}：${failures.length} 项失败（${reason}），可点「重试」。` +
      `已成功 ${downloaded} 项、${skipped} 项无需更新。`
  } else if (skipped === done) {
    notice.value = `${label}：${done} 项都已是最新，没有下载。`
  } else {
    notice.value = `${label}：更新 ${downloaded} 项（${formatBytes(bytes)}），${skipped} 项已是最新。`
  }

  // 记录这一版包覆盖了哪些板块。清单里没拿到 build（离线）时就保留旧值，
  // 免得把「我下的是哪一版」弄丢。
  const previous = meta.value
  const succeeded = done - failures.length > 0
  if (manifest.value && succeeded) {
    const sections = new Set(previous?.build === manifest.value.build ? previous.sections : [])
    for (const id of ids) sections.add(id)
    // 指纹只保留「当前清单里还在」的，并且只写这次确认过的：
    // 下载失败的条目不能记 —— 否则下次会被误判成「没变」而永远不补。
    const hashByUrl = new Map<string, string>()
    const contentByUrl = new Map<string, string>()
    for (const section of Object.values(manifest.value.sections)) {
      for (const entry of section.entries) {
        hashByUrl.set(entry[0], entry[4])
        // 内容指纹就是清单里的第 5 项，对页面是「抹平 app 哈希后的 HTML」的
        // sha1（见 plugins/offline-package.ts 的 contentHashOfHtml）
        contentByUrl.set(entry[0], entry[4])
      }
    }
    const hashes: Record<string, string> = {}
    const content: Record<string, string> = {}
    for (const [key, value] of Object.entries(previous?.hashes ?? {})) {
      if (hashByUrl.has(key)) hashes[key] = value
    }
    for (const [key, value] of Object.entries(previous?.content ?? {})) {
      if (contentByUrl.has(key)) content[key] = value
    }
    for (const url of verified) {
      const fileHash = hashByUrl.get(url)
      const contentHash = contentByUrl.get(url)
      if (fileHash) hashes[url] = fileHash
      if (contentHash) content[url] = contentHash
    }

    // 只留下仍然缓存着的页面的外壳记录：清掉的分区、被删掉的页面不该继续
    // 拖着旧外壳不放（每份外壳 2MB）。
    const pageRefs: Record<string, { app: string; chunk: string; islands?: string[] }> = {}
    for (const [key, value] of Object.entries(pages)) {
      if (!hashByUrl.has(key)) continue
      if (!knownOf(targetCache(key)).has(absolute(key))) continue
      pageRefs[key] = value
    }
    const keptApps = new Set(Object.values(pageRefs).map((item) => item.app))
    const depsOut: Record<string, string[]> = {}
    for (const [app, deps] of Object.entries(appDeps)) {
      if (keptApps.has(app)) depsOut[app] = deps
    }

    writeMeta({
      build: manifest.value.build,
      at: new Date().toISOString(),
      sections: [...sections],
      withChunks: withChunks.value,
      hashes,
      content,
      pages: pageRefs,
      appDeps: depsOut,
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

/**
 * 清理 `assets` 桶里再也不会被请求的旧资源。
 *
 * 保留三类：
 * 1. 当前清单里的文件（页面 chunk、共享脚本、pyodide 的 `.mjs` 副本）；
 * 2. **仍被缓存 HTML 引用的旧外壳**（`app-<hash>.js`）—— 保留旧版本的关键；
 * 3. 这些外壳的静态依赖（`rolldown-runtime-*.js`）。
 *
 * 只有第 2、3 类之外、又不在当前清单里的才删（上一版改了内容的页面 chunk）。
 */
async function pruneStaleAssets(): Promise<void> {
  if (!manifest.value) return
  const keep = new Set<string>()
  for (const section of Object.values(manifest.value.sections)) {
    for (const entry of section.entries) {
      if (entry[0].startsWith('/assets/')) keep.add(absolute(entry[0]))
      if (entry[0].startsWith('/pyodide/') && entry[0].endsWith('.mjs')) {
        keep.add(absolute(entry[0]))
      }
      if (entry[1]) keep.add(absolute(`/${entry[1]}`))
      // 整页孤岛的页面代码（`stars-*.js`）不在 `chunk` 字段里
      for (const [rel] of entry[5] ?? []) keep.add(absolute(`/${rel}`))
    }
  }

  const pageRefs = meta.value?.pages ?? {}
  const deps = meta.value?.appDeps ?? {}
  for (const item of Object.values(pageRefs)) {
    keep.add(absolute(`/${item.app}`))
    // 旧 app 的路由表指向**当时那个** chunk 名，它也得留着
    keep.add(absolute(`/${item.chunk}`))
    for (const rel of item.islands ?? []) keep.add(absolute(`/${rel}`))
    for (const dep of deps[item.app] ?? []) keep.add(absolute(`/${dep}`))
  }

  const cache = await caches.open(ASSET_CACHE)
  for (const request of await cache.keys()) {
    if (!keep.has(request.url)) await cache.delete(request)
  }

  // 搜索索引在独立的 `search` 桶：每次部署换一个 `slimsearch.<BUILD_ID>.js`，
  // 旧的那份留着白占 12MB。`keep` 里已经收了当前清单里那份（`/assets/` 分支）。
  const searchCache = await caches.open(SEARCH_CACHE)
  for (const request of await searchCache.keys()) {
    if (!keep.has(request.url)) await searchCache.delete(request)
  }
}

/** 组头那个唯一的主按钮 */
function runMaster(): void {
  if (!master.value) return
  const kind = master.value.kind
  if (kind === 'cancel') {
    cancel()
    return
  }
  if (kind === 'retry') {
    retryAll()
    return
  }
  downloadAll()
}

function runRow(row: RowView): void {
  if (row.action === 'cancel') {
    cancel()
    return
  }
  if (row.action === 'retry') {
    retrySection(row.id)
    return
  }
  if (!row.action) return
  runSection(row.id)
}

function runSection(id: string): void {
  const section = manifest.value?.sections[id]
  if (!section) return
  void runQueue(section.entries, section.label, [id])
}

function retrySection(id: string): void {
  const section = manifest.value?.sections[id]
  const errors = sectionErrors[id] ?? []
  if (!section || errors.length === 0) return
  const urls = new Set(errors.map((error) => error.url))
  const tasks = section.entries.filter((entry) => urls.has(entry[0]))
  void runQueue(tasks, section.label, [id])
}

function retryAll(): void {
  const tasks: OfflineEntry[] = []
  const ids: string[] = []
  for (const row of siteRows.value) {
    const errors = sectionErrors[row.id] ?? []
    if (errors.length === 0) continue
    const section = manifest.value?.sections[row.id]
    if (!section) continue
    const urls = new Set(errors.map((error) => error.url))
    tasks.push(...section.entries.filter((entry) => urls.has(entry[0])))
    ids.push(row.id)
  }
  void runQueue(tasks, '重试失败项', ids)
}

function downloadAll(): void {
  if (!manifest.value) return
  // 第三方内容不进「更新站点内容」：它约 40MB，而且对方随时可能失效。
  // 已经完整的板块也不再塞进队列 —— 否则那些行会先闪一下「运行中」。
  const picked = Object.entries(manifest.value.sections).filter(([id, section]) => {
    if (section.thirdParty || !section.entries.length) return false
    const row = rows.value.find((item) => item.id === id)
    return !row || row.cached < row.count || row.stale > 0 || row.chunkMissing > 0
  })
  const tasks = picked.flatMap(([, section]) => section.entries)
  void runQueue(
    tasks,
    '离线内容',
    picked.map(([id]) => id),
  )
}

function cancel(): void {
  abortController?.abort()
}

function askClearSection(id: string): void {
  closeMenu()
  askConfirm(`section:${id}`)
}

function askBucket(name: string): void {
  bucketConfirm.value = name
  armConfirmTimer()
}

/**
 * 删除类操作一律「两步确认」：第一次点展开一条确认条，20 秒内再点才真删。
 *
 * 不用 `window.confirm()`：原生对话框会**阻塞整个页面**（自动化里点一下就
 * 卡死），而且和站点其它交互完全不是一个观感。确认条就长在要删的那一行下面。
 */
const bucketConfirm = ref('')
let confirmTimer = 0

function askConfirm(key: string): void {
  if (confirming.value === key) return
  confirming.value = key
  bucketConfirm.value = ''
  armConfirmTimer()
}

function armConfirmTimer(): void {
  window.clearTimeout(confirmTimer)
  confirmTimer = window.setTimeout(() => {
    confirming.value = ''
    bucketConfirm.value = ''
  }, 20_000)
}

function cancelConfirm(): void {
  window.clearTimeout(confirmTimer)
  confirming.value = ''
  bucketConfirm.value = ''
}

async function clearSection(id: string): Promise<void> {
  const section = manifest.value?.sections[id]
  if (!section) return
  cancelConfirm()

  // 有些脚本同时属于几个板块（整页孤岛的 React 运行时与依赖也都在「共享脚本」
  // 里）。清一个板块时不能把它们删掉 —— 那会让**别的**板块离线失效。
  const usedElsewhere = new Set<string>()
  for (const [otherId, other] of Object.entries(manifest.value?.sections ?? {})) {
    if (otherId === id) continue
    for (const entry of other.entries) {
      // `/assets/*` 的裸条目（共享脚本、整页孤岛的依赖）必须算上：它们没有
      // 页面 chunk 字段，但同样是「别的板块还要用」
      if (entry[0].startsWith('/assets/')) usedElsewhere.add(absolute(entry[0]))
      if (entry[1]) usedElsewhere.add(absolute(`/${entry[1]}`))
      for (const [rel] of entry[5] ?? []) usedElsewhere.add(absolute(`/${rel}`))
    }
  }

  const assetCache = await caches.open(ASSET_CACHE)
  await Promise.all(
    section.entries.map(async (entry) => {
      const cache = await caches.open(targetCache(entry[0]))
      await cache.delete(absolute(entry[0]))
      const scripts = [
        ...(entry[1] ? [entry[1]] : []),
        ...(entry[5] ?? []).map(([rel]) => rel),
      ]
      for (const rel of scripts) {
        if (usedElsewhere.has(absolute(`/${rel}`))) continue
        await assetCache.delete(absolute(`/${rel}`))
      }
    }),
  )

  // 插图是「同一路径、不同 ?v」的版本化资源。上面的精确删除只清掉当前清单
  // 里那一版，旧版本（改过图、重新部署之前下的）会一直躺在 `images` 里 ——
  // 清一次板块仍然占着几 MB。这里按**路径**一并收掉清单里那些图的所有版本，
  // 再加上已经从清单里消失的结构图（`/diagrams/` 整个目录归这个板块管）。
  if (id === 'images' || id === 'remote') {
    const owned = new Set(section.entries.map(([url]) => new URL(url).pathname))
    const cache = await caches.open(IMAGE_CACHE)
    for (const request of await cache.keys()) {
      const pathname = new URL(request.url).pathname
      if (owned.has(pathname) || pathname.startsWith('/diagrams/')) {
        await cache.delete(request)
      }
    }
  }

  sectionErrors[id] = []
  if (meta.value) {
    const sections = meta.value.sections.filter((s) => s !== id)
    writeMeta(sections.length ? { ...meta.value, sections } : null)
  }
  notice.value = `已清除「${section.label}」。`
  await refresh()
}

/** 删掉预缓存桶之后必须让 SW 重装一次，否则它不会再自己填回来 */
async function reinstallShell(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  await registration?.unregister()
  notice.value = '应用外壳的预缓存已清空，正在重新安装（页面会重载）…'
  try {
    sessionStorage.setItem(NOTICE_KEY, '缓存已清除，应用外壳正在重新缓存。')
  } catch {
    /* 隐私模式忽略 */
  }
  window.setTimeout(() => window.location.reload(), 600)
}

async function clearCache(name: string): Promise<void> {
  cancelConfirm()
  await caches.delete(name)
  if (name.startsWith('workbox-precache')) {
    await reinstallShell()
    return
  }
  notice.value = `已删除缓存桶 ${name}。`
  await refresh()
}

async function clearAll(): Promise<void> {
  cancelConfirm()
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
      updateMessage.value = '发现新版本，点「立即更新」切换过去。'
    } else {
      updateMessage.value = '已是最新版本。'
    }
  } catch (error) {
    updateMessage.value = `检查失败：${
      error instanceof Error ? error.message : String(error)
    }（离线时无法检查）`
  } finally {
    checking.value = false
  }
}

async function applyUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  const waiting = registration?.waiting
  if (!waiting) {
    updateMessage.value = '没有待应用的新版本，先点「检查更新」。'
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
  if (persisting.value) return
  persisting.value = true
  try {
    persisted.value = (await navigator.storage.persist?.()) ?? false
  } finally {
    persisting.value = false
  }
}

/** 重新读一遍缓存桶：等价于「校验完整性」（缺的项会显示成未下载） */
function verifySection(): void {
  closeMenu()
  void refresh().then(() => {
    notice.value = '已重新核对缓存，缺的项会显示为未下载。'
  })
}

function openMenu(event: MouseEvent, id: string): void {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // 菜单用 fixed 定位：卡片为了圆角是 overflow: hidden，挂在行里会被裁掉
  menuStyle.value = {
    top: `${Math.round(rect.bottom + 4)}px`,
    left: `${Math.round(Math.max(8, Math.min(rect.right - 150, window.innerWidth - 158)))}px`,
  }
  menuFor.value = id
}

function closeMenu(): void {
  menuFor.value = ''
}

function onDocumentClick(event: MouseEvent): void {
  if (!menuFor.value) return
  const target = event.target as HTMLElement
  if (target.closest('.menu') || target.closest('.icon-btn')) return
  closeMenu()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (menuFor.value) {
    closeMenu()
    return
  }
  cancelConfirm()
}

function onScroll(): void {
  // 菜单是 fixed 定位，滚动后位置就不对了
  if (menuFor.value) closeMenu()
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })

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
      `拿不到离线清单（${error instanceof Error ? error.message : String(error)}）。` +
      '开发模式（pnpm start）不会生成它，只有构建产物里才有。'
  }

  withChunks.value = meta.value?.withChunks ?? true

  await refresh()
  ready.value = true

  try {
    const noticeText = sessionStorage.getItem(NOTICE_KEY)
    if (noticeText) {
      sessionStorage.removeItem(NOTICE_KEY)
      notice.value = noticeText
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
      : ''
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll, { capture: true })
  window.clearTimeout(confirmTimer)
})
</script>

<style scoped>
.cache-settings {
  --cs-ok: var(--vp-c-accent);
  --cs-warn: #b45309;
  --cs-danger: #c92a2a;

  margin-top: 0.25rem;
  font-size: 0.9rem;
  line-height: 1.45;
}

/* 主题没有全局的 border-box 重置：不写这一条，`min-height` 会与内边距相加，
   40px 的行实际是 52px（密度全被吃掉）。 */
.cache-settings *,
.cache-settings *::before,
.cache-settings *::after {
  box-sizing: border-box;
}

html[data-theme='dark'] .cache-settings {
  --cs-warn: #e0a458;
  --cs-danger: #ff7b72;
}

/* ── 页头 ──────────────────────────────────────────────── */

.page-head h1 {
  margin: 0 0 0.1rem;
  padding: 0;
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.page-head p {
  margin: 0 0 0.9rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-mute);
}

/* ── 分组 ──────────────────────────────────────────────── */

.group {
  margin-bottom: 0.85rem;
}

.group-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.35rem;
  align-items: center;
  margin-bottom: 0.3rem;
  padding: 0 0.15rem;
  font-size: 0.72rem;
  color: var(--vp-c-text-mute);
}

.group-title {
  font-weight: 500;
}

.dot {
  opacity: 0.45;
}

.grow {
  flex: 1;
}

.group-note {
  margin: 0.4rem 0.15rem 0;
  font-size: 0.72rem;
  line-height: 1.55;
  color: var(--vp-c-text-mute);
}

.pill {
  padding: 0.02rem 0.42rem;
  font-size: 0.66rem;
  color: var(--vp-c-text-mute);
  background: var(--vp-c-bg-alt);
  border-radius: 999px;
}

.pill.is-ok {
  color: var(--cs-ok);
}

/* ── 卡片与行 ──────────────────────────────────────────── */

.card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

/* 深色下 bg-soft 与页面底色相同，卡片会「消失」；抬高一层 */
html[data-theme='dark'] .card {
  background: var(--vp-c-bg-elv);
}

.card-note {
  margin: 0;
  padding: 0.7rem 0.85rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-mute);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.15rem 0.7rem;
  align-items: center;
  min-height: 2.4rem;
  padding: 0.3rem 0.8rem;
  border-top: 1px solid var(--vp-c-divider);
}

.row:first-child {
  border-top: 0;
}

.row.is-busy {
  opacity: 0.55;
}

/* 整行可点的维护项：外观与普通行一致，只是多一个 › */
.row-click {
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border-inline: 0;
  border-bottom: 0;
}

.row-click:hover .row-title:not(.is-danger) {
  color: var(--vp-c-accent);
}

.row-main {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.45rem;
  align-items: baseline;
  min-width: 0;
}

.row-title {
  font-size: 0.86rem;
}

.row-meta {
  font-size: 0.7rem;
  color: var(--vp-c-text-mute);
}

.row-meta.mono {
  font-family: var(--vp-font-code, monospace);
  font-size: 0.68rem;
}

.row-sub {
  display: block;
  width: 100%;
  margin-top: 0.08rem;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--vp-c-text-mute);
}

.row-state {
  font-size: 0.7rem;
  color: var(--vp-c-text-mute);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

.row-state em {
  display: block;
  font-style: normal;
  font-size: 0.66rem;
}

.row-state.is-ok {
  color: var(--cs-ok);
}

.row-state.is-bad {
  color: var(--cs-danger);
}

.row-state.is-warn {
  color: var(--cs-warn);
}

.row-state.is-run {
  color: var(--vp-c-text);
}

.row-act {
  display: flex;
  gap: 0.15rem;
  align-items: center;
  justify-content: flex-end;
}

.row.is-alert {
  background: color-mix(in srgb, var(--vp-c-accent) 6%, transparent);
}

.is-danger {
  color: var(--cs-danger);
}

.chev {
  color: var(--vp-c-text-mute);
  font-size: 0.95rem;
  line-height: 1;
}

/* ── 按钮 ──────────────────────────────────────────────── */

.btn {
  padding: 0.22rem 0.5rem;
  font-family: inherit;
  font-size: 0.7rem;
  line-height: 1.1;
  color: var(--vp-c-accent);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: 7px;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: var(--vp-c-accent-soft);
  border-color: var(--vp-c-accent);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-quiet {
  color: var(--vp-c-text-mute);
  border-color: transparent;
}

.btn-quiet:hover:not(:disabled) {
  color: var(--vp-c-accent);
  border-color: transparent;
}

.btn-danger {
  color: var(--cs-danger);
  border-color: var(--cs-danger);
}

.btn-danger:hover:not(:disabled) {
  background: transparent;
  border-color: var(--cs-danger);
}

.btn-primary {
  padding: 0.26rem 0.66rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
  background: var(--vp-c-accent);
  border: 1px solid var(--vp-c-accent);
  border-radius: 7px;
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.icon-btn {
  padding: 0.16rem 0.3rem;
  font-size: 0.82rem;
  line-height: 1;
  color: var(--vp-c-text-mute);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
}

.icon-btn:hover,
.icon-btn[aria-expanded='true'] {
  color: var(--vp-c-text);
  background: var(--vp-c-bg-alt);
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.btn:focus-visible,
.btn-primary:focus-visible,
.icon-btn:focus-visible,
.row-click:focus-visible,
.switch:focus-visible {
  outline: 2px solid var(--vp-c-accent);
  outline-offset: 2px;
}

/* ── 进度 ──────────────────────────────────────────────── */

.track {
  grid-column: 1 / -1;
  height: 3px;
  margin: 0.1rem 0 0.15rem;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
  border-radius: 99px;
}

.track i {
  display: block;
  height: 100%;
  background: var(--vp-c-accent);
  border-radius: 99px;
  transition: width 0.2s ease;
}

/* ── 开关 ──────────────────────────────────────────────── */

.switch {
  position: relative;
  flex-shrink: 0;
  width: 2.2rem;
  height: 1.25rem;
  margin: 0;
  cursor: pointer;
  appearance: none;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 0.95rem;
  height: 0.95rem;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 20%);
  transition: transform 0.18s ease;
}

.switch:checked {
  background: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.switch:checked::after {
  transform: translateX(0.95rem);
}

html[data-theme='dark'] .switch::after {
  background: #d7d7dd;
}

/* ── 确认条（取代改按钮文字 + 页顶提示） ───────────────── */

.confirm {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: 0.4rem 0.6rem;
  align-items: center;
  justify-content: space-between;
  margin: 0.1rem 0;
  padding: 0.4rem 0.5rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cs-danger);
  background: var(--vp-c-bg-alt);
  border-left: 2px solid var(--cs-danger);
  border-radius: 0 7px 7px 0;
}

.confirm-act {
  display: flex;
  gap: 0.3rem;
}

/* ── ⋯ 菜单（fixed，避免被卡片圆角裁掉） ──────────────── */

.menu {
  position: fixed;
  z-index: 150;
  min-width: 9rem;
  padding: 0.2rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  box-shadow: 0 6px 20px rgb(0 0 0 / 14%);
}

.menu button {
  display: block;
  width: 100%;
  padding: 0.34rem 0.5rem;
  font-family: inherit;
  font-size: 0.74rem;
  color: var(--vp-c-text);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;
}

.menu button:hover {
  background: var(--vp-c-bg-alt);
}

.menu button.is-danger {
  color: var(--cs-danger);
}

.menu .sep {
  height: 1px;
  margin: 0.18rem 0.15rem;
  background: var(--vp-c-divider);
}

/* ── 缓存明细（高级，默认收起） ───────────────────────── */

.details {
  padding: 0.5rem 0.8rem 0.7rem;
  border-top: 1px solid var(--vp-c-divider);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  font-size: 0.76rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.28rem 0.4rem;
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

.details-note {
  margin: 0.45rem 0 0;
  font-size: 0.7rem;
  line-height: 1.55;
  color: var(--vp-c-text-mute);
}

/* ── 页尾说明 ──────────────────────────────────────────── */

.more {
  margin: 0.6rem 0.15rem 0;
  font-size: 0.72rem;
  color: var(--vp-c-text-mute);
}

.more summary {
  cursor: pointer;
}

.more p {
  margin: 0.3rem 0 0;
  line-height: 1.6;
}

/* ── 骨架（SSR 首屏） ──────────────────────────────────── */

.skeleton {
  display: grid;
  gap: 0.5rem;
}

.sk-line {
  display: block;
  height: 0.7rem;
  background: var(--vp-c-bg-alt);
  border-radius: 4px;
}

.sk-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.sk-row {
  display: flex;
  justify-content: space-between;
  padding: 0.7rem 0.8rem;
  border-top: 1px solid var(--vp-c-divider);
}

.sk-row:first-child {
  border-top: 0;
}

/* ── 不支持 / 空状态 ───────────────────────────────────── */

.notice {
  padding: 0.9rem 1rem;
  font-size: 0.85rem;
  line-height: 1.65;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
}

.muted {
  color: var(--vp-c-text-mute);
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .switch,
  .switch::after,
  .track i {
    transition: none;
  }
}

/* ── 手机：动作换行，触控目标回到 40px 上下 ───────────── */

@media (max-width: 640px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.2rem 0.45rem;
    padding: 0.42rem 0.7rem;
  }

  .row-main {
    gap: 0.05rem 0.35rem;
  }

  .btn,
  .btn-primary {
    padding: 0.4rem 0.55rem;
    font-size: 0.72rem;
  }

  .icon-btn {
    padding: 0.36rem 0.28rem;
  }

  .group-head .grow {
    display: none;
  }
}
</style>
