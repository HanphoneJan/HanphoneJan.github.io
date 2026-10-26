import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { readFrontMatter } from '../.vuepress/paths'
import {
  DIFFICULTY_LABELS,
  UNKNOWN_DIFFICULTY_LABEL,
  difficultyLabel,
  pageDifficulty,
  parseDifficulty,
} from '../src/components/training/difficulty'

/**
 * 难度口径的回归测试。
 *
 * 难度这件事有两条「不会报错」的失败路径，都只能靠断言钉住：
 *
 * 1. **认不出来**。`parseDifficulty` 认不出的值会退化成「未标注」，
 *    题解页的徽标因此不渲染、标签页里那一篇掉进「未标注」小节 ——
 *    构建照常成功。所以每出现一种新写法（换平台同步时很容易），
 *    这里必须红一次，让人显式决定它算哪一档。
 * 2. **接线断掉**。题解页的徽标靠 `theme.ts` 的 `pageInfo` 里写一项
 *    `'Difficulty'` + `client.ts` 全局注册 `DifficultyInfo`，两边任一被删
 *    都只是「那一项不见了」，没有报错。这里把这条契约也钉住。
 *
 * 运行：`pnpm test:difficulty`
 */

let passed = 0

function check(name: string, run: () => void): void {
  try {
    run()
    passed += 1
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

const ROOT = process.cwd()
const DOCS_ROOT = path.join(ROOT, 'code-training', 'docs')
const PROBLEMS_ROOT = path.join(DOCS_ROOT, 'problems')

function markdownFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) out.push(full)
    }
  }
  walk(root)
  return out.sort()
}

/** 与构建期同一套 frontmatter 解析（gray-matter），不另写一份。 */
function readDifficulty(file: string): unknown {
  return readFrontMatter(file).difficulty
}

function relative(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join('/')
}

// ============================================================
// 1. 映射表本身
// ============================================================

check('八种原始写法都映射到五档标签', () => {
  const cases: Array<[string, string]> = [
    ['入门', '入门'],
    ['简单', '简单'],
    ['Easy', '简单'],
    ['中等', '中等'],
    ['Medium', '中等'],
    ['较难', '较难'],
    ['困难', '困难'],
    ['Hard', '困难'],
  ]
  for (const [raw, label] of cases) {
    assert.equal(parseDifficulty(raw).label, label, `${raw} 应解析为 ${label}`)
  }
})

check('大小写与首尾空白不影响判定', () => {
  assert.equal(parseDifficulty('  easy ').label, '简单')
  assert.equal(parseDifficulty('MEDIUM').label, '中等')
  assert.equal(parseDifficulty('hard').label, '困难')
})

check('空值与认不出的值都不猜，落到「未标注」', () => {
  for (const raw of [undefined, null, '', '   ', 'Unknown', '自定义']) {
    const parsed = parseDifficulty(raw)
    assert.equal(parsed.label, UNKNOWN_DIFFICULTY_LABEL)
    assert.equal(parsed.level, 'unknown')
  }
})

check('五档标签齐全且互不重复', () => {
  assert.deepEqual([...DIFFICULTY_LABELS], ['入门', '简单', '中等', '较难', '困难'])
  assert.equal(new Set(DIFFICULTY_LABELS).size, DIFFICULTY_LABELS.length)
})

check('排序权重由易到难单调递增', () => {
  const ranks = DIFFICULTY_LABELS.map((label) => {
    const rule = parseDifficulty(
      // 反查：用每种写法的原文取权重
      label === '简单' ? 'Easy' : label === '中等' ? 'Medium' : label === '困难' ? 'Hard' : label,
    )
    assert.equal(rule.label, label)
    return rule.rank
  })
  for (let i = 1; i < ranks.length; i += 1) {
    assert.ok(
      ranks[i] > ranks[i - 1],
      `权重没有随难度递增：${DIFFICULTY_LABELS.join(' < ')} 得到 ${ranks.join(',')}`,
    )
  }
})

check('配色只三档：入门/简单为 easy，中等为 medium，较难/困难为 hard', () => {
  const level = (raw: string) => parseDifficulty(raw).level
  assert.equal(level('入门'), 'easy')
  assert.equal(level('简单'), 'easy')
  assert.equal(level('中等'), 'medium')
  assert.equal(level('较难'), 'hard')
  assert.equal(level('困难'), 'hard')
})

check('difficultyLabel 是 parseDifficulty().label 的简写', () => {
  assert.equal(difficultyLabel('较难'), '较难')
  assert.equal(difficultyLabel(undefined), UNKNOWN_DIFFICULTY_LABEL)
})

// ============================================================
// 区间：算法模式 / 数据结构页的写法（`简单-中等` 或 `[中等, 困难]`）
// ============================================================

check('区间字符串解析成「低–高」，配色取较难的一端', () => {
  const info = parseDifficulty('简单-中等')
  assert.equal(info.label, '简单–中等')
  assert.equal(info.level, 'medium')
  assert.equal(info.rank, parseDifficulty('简单').rank)
})

check('区间两端相同时退化成单档', () => {
  const info = parseDifficulty('中等 ~ 中等')
  assert.equal(info.label, '中等')
  assert.equal(info.level, 'medium')
})

check('区间数组（difficulty_range）与字符串区间同义', () => {
  const info = parseDifficulty(['中等', '困难'])
  assert.equal(info.label, '中等–困难')
  assert.equal(info.level, 'hard')
  // 顺序无关
  assert.equal(parseDifficulty(['困难', '中等']).label, '中等–困难')
})

check('单元素数组等于单档', () => {
  assert.equal(parseDifficulty(['简单']).label, '简单')
  assert.equal(parseDifficulty(['easy']).level, 'easy')
})

check('区间里有一端认不出来就整条放弃', () => {
  assert.equal(parseDifficulty('简单-未知').level, 'unknown')
  assert.equal(parseDifficulty(['简单', 'Unknown']).level, 'unknown')
})

check('pageDifficulty 先看 difficulty，再看 difficulty_range', () => {
  assert.equal(pageDifficulty({ difficulty: 'Hard' }).label, '困难')
  assert.equal(
    pageDifficulty({ difficulty_range: ['简单', '困难'] }).label,
    '简单–困难',
  )
  assert.equal(
    pageDifficulty({ difficulty: '中等', difficulty_range: ['简单'] }).label,
    '中等',
  )
  assert.equal(pageDifficulty({}).level, 'unknown')
  assert.equal(pageDifficulty(undefined).level, 'unknown')
})

// ============================================================
// 2. 语料：315 篇题解一篇都不能漏
// ============================================================

check('每篇题解都有 difficulty，且都能认出来', () => {
  const files = markdownFiles(PROBLEMS_ROOT)
  assert.ok(files.length > 300, `题库只有 ${files.length} 篇，路径是不是变了？`)
  const unknown: string[] = []
  for (const file of files) {
    const raw = readDifficulty(file)
    assert.ok(raw, `${relative(file)} 缺 frontmatter.difficulty`)
    const parsed = parseDifficulty(raw)
    if (parsed.level === 'unknown') {
      unknown.push(`${relative(file)} -> ${String(raw)}`)
    }
  }
  assert.deepEqual(
    unknown,
    [],
    `这些题解的难度认不出来（新增写法请在 src/components/training/difficulty.ts 的 RULES 里补一条）：\n${unknown.join('\n')}`,
  )
})

check('语料里出现的标签都在五档之内（题解只有单档）', () => {
  const seen = new Set<string>()
  for (const file of markdownFiles(PROBLEMS_ROOT)) {
    seen.add(parseDifficulty(readDifficulty(file)).label)
  }
  for (const label of seen) {
    assert.ok(
      (DIFFICULTY_LABELS as readonly string[]).includes(label),
      `出现了词表以外的标签：${label}`,
    )
  }
})

check('算法模式 / 数据结构页的区间写法也都能认出来', () => {
  const unknown: string[] = []
  let pages = 0
  for (const file of markdownFiles(DOCS_ROOT)) {
    if (file.startsWith(PROBLEMS_ROOT)) continue
    const fm = readFrontMatter(file)
    if (fm.difficulty === undefined && fm.difficulty_range === undefined) {
      continue
    }
    pages += 1
    const info = pageDifficulty(fm)
    if (info.level === 'unknown') {
      unknown.push(
        `${relative(file)} -> ${String(fm.difficulty ?? fm.difficulty_range)}`,
      )
    }
  }
  assert.ok(pages >= 10, `只有 ${pages} 篇带难度的非题解文档，路径是不是变了？`)
  assert.deepEqual(unknown, [], `这些页面的难度认不出来：\n${unknown.join('\n')}`)
})

// ============================================================
// 3. 接线契约：徽标靠「配置 + 全局注册」两处，缺一静默消失
// ============================================================

check('theme.ts 的 pageInfo 里包含 Difficulty', () => {
  const theme = fs.readFileSync(path.join(ROOT, '.vuepress', 'theme.ts'), 'utf8')
  assert.match(
    theme,
    /pageInfo:\s*\[[\s\S]*?'Difficulty'[\s\S]*?\]/,
    'theme.ts 的 pageInfo 少了 \'Difficulty\'，题解页不会显示难度',
  )
})

check('client.ts 全局注册了 DifficultyInfo', () => {
  const client = fs.readFileSync(path.join(ROOT, '.vuepress', 'client.ts'), 'utf8')
  assert.match(
    client,
    /app\.component\(\s*'DifficultyInfo'/,
    'client.ts 没有注册 DifficultyInfo，hope 的 resolveComponent 会拿到空组件',
  )
})

check('徽标组件与样式都在', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, '.vuepress', 'components', 'DifficultyInfo.vue')),
    '缺少 .vuepress/components/DifficultyInfo.vue',
  )
  const styles = fs.readFileSync(
    path.join(ROOT, '.vuepress', 'styles', 'index.scss'),
    'utf8',
  )
  assert.match(styles, /\.page-difficulty-info/, 'index.scss 里没有难度徽标的样式')
})

console.log(`✓ 难度口径 ${passed} 项断言通过`)
