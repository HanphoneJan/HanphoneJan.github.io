/**
 * 难度口径：把各平台的原始写法归一成「标签 + 配色档 + 排序权重」。
 *
 * ## 为什么需要它
 *
 * 题解 frontmatter 的 `difficulty` 来自四个平台，写法各不相同，实测 315 篇里
 * 有 8 种原文：
 *
 * | 原文 | 篇数 | 平台 |
 * |---|---|---|
 * | `Medium` / `Easy` / `Hard` | 123 / 43 / 38 | LeetCode、CodeFun2000、misc |
 * | `中等` / `简单` / `困难` | 42 / 37 / 2 | 牛客、顺丰、Shopee |
 * | `入门` / `较难` | 24 / 6 | 牛客自己的五级里多出来的两档 |
 *
 * 这些值原本被三处各写一遍正则来解读（`plugins/catalogs.ts`、
 * `.vuepress/data/training-data.ts`、`pattern-graph` 组件），口径还不一致：
 * 三处的判据都只有「简单/中等/困难」，于是**入门 24 篇、较难 6 篇全部
 * 掉进「其它」**，标签页与「相关题目」里能看到一个 30 篇的「其它」小节。
 *
 * 所以口径收在这一个文件，页面徽标、题库/标签页、相关题目、排序全部引用它。
 *
 * ## 为什么是五档标签 + 三档配色
 *
 * 牛客的五级（入门/简单/中等/较难/困难）本身就比力扣细，压成三档会丢掉
 * 读者能看懂的信息，所以**标签照原文保留五档**；配色只分绿/黄/红三色
 * （入门与简单同绿、较难与困难同红），因为颜色多了反而看不出强弱。
 *
 * ## 算法模式 / 数据结构页写的是「区间」
 *
 * 那两批文档讲的是一个模式能覆盖哪些难度，所以写的是
 * `difficulty: 简单-中等`（10 篇）或 `difficulty_range: [中等, 困难]`（11 篇）
 * —— 同一个意思，两种写法。这里都按区间解析成 `简单–中等`，配色取**较难
 * 的那一端**（能用到困难题才是这个模式的能力上限），排序取较易的一端。
 */

/** 配色档位：三色。`unknown` 表示没标注/认不出来，页面上不渲染徽标。 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'unknown'

export interface DifficultyInfo {
  /** frontmatter 原文（`Easy` / `较难` / …） */
  raw: string
  /** 展示用的中文标签（入门/简单/中等/较难/困难） */
  label: string
  /** 配色档位 */
  level: DifficultyLevel
  /** 排序权重，越小越简单 */
  rank: number
}

/** 没标注时的标签。页面徽标不渲染它，题库页会把它单列一节（当前是 0 篇）。 */
export const UNKNOWN_DIFFICULTY_LABEL = '未标注'

/** 由易到难的展示顺序。分组、排序、图例都按这个顺序。 */
export const DIFFICULTY_LABELS = ['入门', '简单', '中等', '较难', '困难'] as const

interface Rule {
  test: RegExp
  label: string
  level: DifficultyLevel
  rank: number
}

/**
 * 判据表，**顺序即优先级**。
 *
 * 注意 `较难` 与 `困难` 是两档：`较难` 里没有「困难」两个字，所以两条规则
 * 不会互相抢；但别把 `/难/` 这种宽松写法加进来 —— 一条就会同时命中两档。
 */
const RULES: Rule[] = [
  { test: /入门/, label: '入门', level: 'easy', rank: 0 },
  { test: /简单|easy/i, label: '简单', level: 'easy', rank: 1 },
  { test: /中等|medium/i, label: '中等', level: 'medium', rank: 2 },
  { test: /较难/, label: '较难', level: 'hard', rank: 3 },
  { test: /困难|hard/i, label: '困难', level: 'hard', rank: 4 },
]

const UNKNOWN: DifficultyInfo = {
  raw: '',
  label: UNKNOWN_DIFFICULTY_LABEL,
  level: 'unknown',
  rank: 99,
}

/** 区间写法：`简单-中等`、`中等 ~ 困难`、`简单至困难`。 */
const RANGE_SEPARATOR = /\s*(?:-|–|—|~|～|至|到)\s*/

function matchSingle(text: string): DifficultyInfo | null {
  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return {
        raw: text,
        label: rule.label,
        level: rule.level,
        rank: rule.rank,
      }
    }
  }
  return null
}

/**
 * 把一端或多端合成一个结果。两端相同时退化成单档（`中等-中等` 就是中等）。
 */
function combine(infos: DifficultyInfo[], raw: string): DifficultyInfo {
  const sorted = [...infos].sort((a, b) => a.rank - b.rank)
  const low = sorted[0]
  const high = sorted[sorted.length - 1]
  if (low.label === high.label) {
    return { raw, label: low.label, level: low.level, rank: low.rank }
  }
  return {
    raw,
    label: `${low.label}–${high.label}`,
    level: high.level,
    rank: low.rank,
  }
}

/**
 * 把 frontmatter 的 `difficulty` 解析成归一化结果。
 *
 * 支持三种形态：单个值（`Medium` / `较难`）、区间字符串（`简单-中等`）、
 * 区间数组（`[中等, 困难]`，算法模式/数据结构页的 `difficulty_range`）。
 *
 * 认不出来时**不猜**：返回 `未标注`（`level: 'unknown'`）。猜成「中等」会让
 * 一篇没难度信息的题解混进中等题里，比不显示更糟。
 */
export function parseDifficulty(raw: unknown): DifficultyInfo {
  if (Array.isArray(raw)) {
    const pieces = raw.filter((item) => typeof item === 'string') as string[]
    const infos = pieces.map((item) => matchSingle(item.trim()))
    if (infos.length === 0 || infos.some((info) => info === null)) {
      return { ...UNKNOWN, raw: pieces.join(' / ') }
    }
    return combine(infos as DifficultyInfo[], pieces.join(' / '))
  }

  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return UNKNOWN

  const parts = text.split(RANGE_SEPARATOR).filter((part) => part.length > 0)
  if (parts.length > 1) {
    const infos = parts.map(matchSingle)
    if (infos.every((info) => info !== null)) {
      return combine(infos as DifficultyInfo[], text)
    }
    return { ...UNKNOWN, raw: text }
  }

  return matchSingle(text) ?? { ...UNKNOWN, raw: text }
}

/**
 * 页面级的难度：题解写 `difficulty`，算法模式/数据结构页写 `difficulty_range`。
 * 取到哪个用哪个，两个都没有就是未标注。
 */
export function pageDifficulty(
  frontmatter: Record<string, unknown> | undefined,
): DifficultyInfo {
  if (!frontmatter) return UNKNOWN
  const raw = frontmatter.difficulty ?? frontmatter.difficulty_range
  return parseDifficulty(raw)
}

/** 只要标签的分组场景（题库页、标签页、相关题目）。 */
export function difficultyLabel(raw: unknown): string {
  return parseDifficulty(raw).label
}
