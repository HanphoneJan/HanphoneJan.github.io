import type { PageMeta } from './paths'

/**
 * 文档分类 / 标签 / 日期的**唯一推导口径**。
 *
 * 站点的内容分两类，frontmatter 的丰富程度完全不同：
 *
 *   - `code-training/docs/problems/**` 有 `tags` / `date_added` / `platform`
 *     （由同步脚本写入，是人工校过的）
 *   - `docs/**` 只有 `_synced: true`，既没有分类也没有标签
 *
 * 所以这里采取「**位置决定分类（题解优先用 platform），关键词决定标签，
 * frontmatter 优先**」：
 *
 * 1. **分类**取目录：`docs/前端/Vue基础.md` -> `前端`；
 *    `problems/leetcode/1.md` -> `LeetCode`（题解优先读 `platform`）。
 *    板块（文档 / 代码训练）不上分类 —— 侧边栏和 URL 已经区分了，
 *    再标一次只是噪音。
 * 2. **标签**优先用 frontmatter 的 `tags`（题解就是这条路），
 *    没有时按关键词规则推导；`docs/项目/<子项目>/` 额外打一个子项目标签。
 * 3. **日期**用 `date` > `date_added` > `last_updated`，都没有就交给
 *    `@vuepress/plugin-git` 的首次提交时间（`page.data.git.createdTime`）。
 *
 * 改这里的规则会同时影响 `/category/`、`/tag/`、`/timeline/` 三个页面
 * 与每页的 pageInfo，所以规则要克制：宁可少一个标签，不要多一个错的。
 */

/** 代码训练各目录的展示名（与 sidebar.ts 的 DIR_LABELS 保持一致） */
const TRAINING_DIR_LABELS: Record<string, string> = {
  problems: '题库',
  'machine-learning': '机器学习',
  'data-structures': '数据结构',
  patterns: '算法模式',
  review: '复习系统',
  resources: '资源',
}

/** 题库下的平台目录（platform 缺失或为占位值时的回退） */
const PLATFORM_LABELS: Record<string, string> = {
  leetcode: 'LeetCode',
  nowcoder: 'Nowcoder',
  codefun2000: 'CodeFun2000',
  shoppee: 'Shopee',
  sf: '顺丰科技',
  misc: '其它',
}

/** 模式页 -> 规范标签（词表见 scripts/tag-vocabulary.js） */
const PATTERN_TAGS: Record<string, string[]> = {
  two_pointers: ['双指针'],
  sliding_window: ['滑动窗口'],
  hash_map: ['哈希表'],
  dynamic_programming: ['动态规划'],
  backtracking: ['回溯'],
  bfs: ['广度优先搜索'],
  dfs: ['深度优先搜索'],
  greedy: ['贪心'],
  sorting: ['排序'],
  search: ['二分查找'],
  recursion: ['递归'],
  graph: ['图'],
}

/** 数据结构页 -> 标签 */
const DATA_STRUCTURE_TAGS: Record<string, string[]> = {
  array: ['数组'],
  linked_list: ['链表'],
  string: ['字符串'],
  tree: ['树'],
  binary_tree: ['二叉树'],
  graph: ['图'],
  hash_table: ['哈希表'],
  stack_queue_heap_unionfind: ['栈', '队列', '堆', '并查集'],
}

/**
 * 文档标签规则：按顺序匹配「文件名 + 标题」，最多保留 4 个。
 *
 * 具体规则写在前面，泛化规则写在后面（`Vue` 比 `前端` 更有信息量）。
 * 规则只认真正出现在标题里的技术名词，不猜正文内容 —— 猜正文会让
 * 同步一次笔记就换一批标签。
 */
const DOC_TAG_RULES: Array<[RegExp, string]> = [
  // ── 前端 ────────────────────────────────────────────────────────
  [/\bVue\b/i, 'Vue'],
  [/\bReact\b/i, 'React'],
  [/Next\.?js/i, 'Next.js'],
  [/Node\.?js/i, 'Node.js'],
  [/Uniapp|小程序/i, '小程序'],
  [/安卓|Android/i, 'Android'],
  [/浏览器/i, '浏览器'],
  [/CommonJS|ES\s?模块|构建工具/i, 'JavaScript 模块'],
  [/HTML\s*\+?\s*CSS|\bCSS\b/i, 'CSS'],
  [/JavaScript|\bJS\b/i, 'JavaScript'],
  [/前端/i, '前端'],
  // ── 后端 ────────────────────────────────────────────────────────
  [/Docker/i, 'Docker'],
  [/Nginx/i, 'Nginx'],
  [/Maven/i, 'Maven'],
  [/Spring/i, 'Spring'],
  [/Django|FastAPI|Flask/i, 'Python Web'],
  [/PostgreSQL|ClickHouse|SQL|数据库/i, '数据库'],
  [/Websocket|WebRTC|Server-Sent|SSE/i, '网络通信'],
  [/Java(?!Script)/i, 'Java'],
  [/Python/i, 'Python'],
  // ── 计算机基础 ──────────────────────────────────────────────────
  [/\bGit\b|\bSVN\b|版本控制/i, '版本控制'],
  [/Linux|Debian|Shell|Windows|操作系统/i, '操作系统'],
  [/计算机网络|网络系统|网络/i, '计算机网络'],
  [/编译原理/i, '编译原理'],
  [/软件工程/i, '软件工程'],
  [/计组|计算机组成|汇编/i, '计算机组成'],
  [/数据结构/i, '数据结构'],
  [/算法/i, '算法'],
  // ── 嵌入式 ──────────────────────────────────────────────────────
  [/ROS2/i, 'ROS2'],
  [/STM32|\bARM\b|Keil|μVision/i, '嵌入式'],
  [/数电|数字电路/i, '数字电路'],
  [/嵌入式/i, '嵌入式'],
  // ── 机器学习 / Agent ───────────────────────────────────────────
  [/Transformer|CNN|RNN|神经网络|深度学习/i, '深度学习'],
  [/LLM|大模型|微调|LangChain|HappyLLM|多模态/i, '大模型'],
  [/机器学习|吴恩达/i, '机器学习'],
  [/\bAgent\b/i, 'Agent'],
  [/AI\s?Infra/i, 'AI Infra'],
  [/提示词|Prompt|Cursor/i, '提示词工程'],
  // ── 项目 / 其它 ─────────────────────────────────────────────────
  [/架构|设计|接口|规范|治理|拆解|运维|排障/i, '架构设计'],
  [/读书|蛊真人/i, '读书笔记'],
  [/安装|配置|破解/i, '软件配置'],
]

export interface DerivedTaxonomy {
  /** 分类（单个，页面上的分类标签只有一枚） */
  category?: string
  /** 标签，已去重 */
  tags?: string[]
  /** 时间轴用；缺省时由 git 首次提交时间兜底 */
  date?: unknown
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

/** 从 `docs/项目/数据中台/xxx.md` 里取出 `数据中台` */
function projectTag(parts: string[]): string[] {
  if (parts[0] !== '项目' || parts.length < 3) return []
  return [parts[1]]
}

function keywordTags(text: string): string[] {
  const tags: string[] = []
  for (const [pattern, tag] of DOC_TAG_RULES) {
    if (tags.length >= 4) break
    if (pattern.test(text) && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

/**
 * @param rel 相对站点 source 目录的 posix 路径（`docs/...`）
 * @param meta 页面原始 frontmatter
 */
export function deriveTaxonomy(rel: string, meta: PageMeta): DerivedTaxonomy {
  const parts = rel.replace(/\.(md|mdx)$/, '').split('/')

  let category: string | undefined
  let tags: string[] = []
  let date: unknown

  const baseName = parts[parts.length - 1]

  if (parts[0] === 'docs') {
    const rest = parts.slice(1)
    category = rest.length > 1 ? rest[0] : '文档'

    const text = `${baseName} ${String(meta.title ?? '')}`
    tags = [...projectTag(rest), ...keywordTags(text)]
  } else if (parts[0] === 'code-training' && parts[1] === 'docs') {
    const rest = parts.slice(2)
    const top = rest[0]

    if (rest.length === 1) {
      // code-training/docs/intro.md
      category = '代码训练'
    } else if (top === 'problems') {
      const dir = rest[1]
      // 题解的 `platform` 是最准的来源（sf 目录里写的是「顺丰科技」、
      // misc 里混着 CodeFun2000）；只有缺失或是同步脚本的占位值
      // 「自定义」时才回退到目录名。
      const platform = String(meta.platform ?? '').trim()
      category =
        platform && platform !== '自定义'
          ? platform
          : PLATFORM_LABELS[dir] || dir || '题库'
    } else {
      category = TRAINING_DIR_LABELS[top] ?? top
    }

    if (top === 'patterns') {
      tags = PATTERN_TAGS[baseName] ?? []
    } else if (top === 'data-structures') {
      tags = DATA_STRUCTURE_TAGS[baseName] ?? []
    }

    // 非题解页面没有 tags 时，再按标题补一层关键词
    if (top !== 'problems') {
      const text = `${baseName} ${String(meta.title ?? '')}`
      tags = unique([...tags, ...keywordTags(text)])
    }
  }

  const explicitCategory = asStringArray(meta.category ?? meta.categories)[0]
  const explicitTags = asStringArray(meta.tags ?? meta.tag)
  const explicitDate = meta.date ?? meta.date_added ?? meta.last_updated

  return {
    category: explicitCategory || category,
    // 显式 tags 优先（页面头部 merge 时文件里的值也会覆盖回来），
    // 没有时才用推导结果
    tags: explicitTags.length > 0 ? explicitTags : tags,
    date: explicitDate,
  }
}
