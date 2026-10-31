#!/usr/bin/env node
/**
 * 列出 CodeFun2000 最近的华为机考场次。
 *
 * 为什么需要它：`/contest` 首页只列模拟赛；真实场次在题库分组的 `groups`
 * 里（`/new-p/P####` 页面）。人工记「要去看 groups」迟早会漏，所以把入口
 * 固化成命令。
 *
 * 用法：
 *   node scripts/fetch-codefun.js                 # 最近 15 天，跳过模拟赛
 *   node scripts/fetch-codefun.js --days 30
 *   node scripts/fetch-codefun.js --mock          # 连模拟赛一起列
 *   node scripts/fetch-codefun.js --json
 *   node scripts/fetch-codefun.js --anchor P5950
 *
 * 默认锚点 P5950 是 2026-10-28 的题；`groups` 会带出前后所有场次。
 * 题目详情请用 https://codefun2000.com/new-p/P####（公开题面），
 * 不要用 https://codefun2000.com/p/P####（登录墙）。
 */

const DEFAULT_ANCHOR = 'P5950'
const DEFAULT_DAYS = 15

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
function flag(name) {
  return process.argv.includes(name)
}

/** 从 `groups: [` 开始做括号配对，返回可 JSON.parse 的数组。 */
function extractGroups(html) {
  const marker = 'groups: ['
  const at = html.indexOf(marker)
  if (at < 0) throw new Error('页面里找不到 groups: [')
  let i = at + marker.length - 1
  let depth = 0
  let inString = false
  let escaped = false
  for (; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return JSON.parse(html.slice(at + marker.length - 1, i + 1))
    }
  }
  throw new Error('groups 括号没有闭合')
}

const CN_DATE = /(\d{4})年(\d{1,2})月(\d{1,2})日/
function parseDate(title) {
  const m = CN_DATE.exec(title || '')
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const isChoice = (item) => /选择题/.test(item.title || '')
const isMock = (title) => /模拟赛/.test(title || '')

async function main() {
  const anchor = arg('--anchor', DEFAULT_ANCHOR)
  const days = Number(arg('--days', DEFAULT_DAYS))
  const includeMock = flag('--mock')
  const asJson = flag('--json')

  const url = `https://codefun2000.com/new-p/${anchor}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  const html = await res.text()
  const groups = extractGroups(html)

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setUTCDate(cutoff.getUTCDate() - days)

  const sessions = []
  for (const group of groups) {
    const date = parseDate(group.title)
    if (!date) continue
    if (new Date(`${date}T00:00:00Z`) < cutoff) continue
    if (!includeMock && isMock(group.title)) continue
    const items = (group.items || []).filter((x) => !isChoice(x))
    if (items.length === 0) continue
    sessions.push({
      date,
      session: group.title,
      mock: isMock(group.title),
      problems: items.map((x) => ({
        pid: x.pid,
        title: x.title,
        difficulty: x.difficulty,
      })),
    })
  }
  sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  if (asJson) {
    console.log(JSON.stringify({ anchor, days, sessions }, null, 2))
    return
  }

  if (sessions.length === 0) {
    console.log(`最近 ${days} 天没有找到${includeMock ? '' : '（非模拟赛）'}场次。`)
    return
  }

  console.log(`最近 ${days} 天（截至 ${today.toISOString().slice(0, 10)}，锚点 ${anchor}）：`)
  for (const s of sessions) {
    const tag = s.mock ? ' [模拟]' : ''
    const list = s.problems.map((p) => `${p.pid} ${p.title}`).join(' / ')
    console.log(`- ${s.date}${tag} ${s.session.replace(/^\d{4}年\d{1,2}月\d{1,2}日-?/, '')}`)
    console.log(`  ${list}`)
  }
  console.log('\n下一步：对每个编程题读 https://codefun2000.com/new-p/P####（不是 /p/）')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
