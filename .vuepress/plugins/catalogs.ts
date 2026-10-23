import fs from 'node:fs'
import path from 'node:path'
import { createPage } from '@vuepress/core'
import type { App } from 'vuepress/core'
import { legacyPathFor, readFrontMatter, relativeSource } from '../paths'

/**
 * Docusaurus 的「分类页」与「标签页」。
 *
 * 旧站点里这两类页面是 docs 插件自动生成的：
 *   /code-training/category/题库、/code-training/tags/动态规划
 * 它们出现在板块落地页的正文链接里（`[题目库](/code-training/category/题库)`），
 * VuePress 不会凭空生成，所以这里在构建期补出来 —— 否则那几条链接全是 404。
 *
 * 生成的是普通 markdown 页面，走同一套 markdown 管线（数学、代码高亮、
 * 失效链接检查都照常生效）。
 */
interface Problem {
  title: string
  link: string
  difficulty: string
  platform: string
  tags: string[]
  group: string
  dir: string
}

const DIFF_GROUPS: Array<{ label: string; test: RegExp }> = [
  { label: '简单', test: /简单|Easy/i },
  { label: '中等', test: /中等|Medium/i },
  { label: '困难', test: /困难|Hard/i },
]

function groupOf(difficulty: string): string {
  for (const g of DIFF_GROUPS) if (g.test.test(difficulty)) return g.label
  return '其它'
}

const PLATFORM_LABELS: Record<string, string> = {
  leetcode: 'LeetCode',
  nowcoder: 'Nowcoder',
  codefun2000: 'CodeFun2000',
  shoppee: 'Shopee',
  sf: '顺丰科技',
  misc: 'misc',
}

function walk(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

function collectProblems(sourceDir: string): Problem[] {
  const docsRoot = path.join(sourceDir, 'code-training/docs')
  const problemsRoot = path.join(docsRoot, 'problems')
  const out: Problem[] = []
  for (const full of walk(problemsRoot)) {
    const rel = relativeSource(problemsRoot, full)
    const fm = readFrontMatter(full)
    const link = legacyPathFor(sourceDir, full, fm)
    if (!link) continue
    const dir = rel.includes('/') ? rel.split('/')[0] : 'misc'
    out.push({
      title: String(fm.title ?? rel),
      link,
      difficulty: String(fm.difficulty ?? ''),
      platform: String(fm.platform ?? PLATFORM_LABELS[dir] ?? dir),
      tags: Array.isArray(fm.tags) ? (fm.tags as unknown[]).map(String) : [],
      group: groupOf(String(fm.difficulty ?? '')),
      dir,
    })
  }
  return out
}

function linkLine(p: Problem): string {
  return `- [${p.title}](${p.link}) · ${p.platform}${
    p.difficulty ? ` · ${p.difficulty}` : ''
  }`
}

function tagIndex(problems: Problem[]): string {
  const counts = new Map<string, number>()
  for (const p of problems) {
    for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  const tags = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'),
  )
  const lines = [
    '# 标签',
    '',
    `共 ${tags.length} 个标签、${problems.length} 道题。点标签查看同标签的题目。`,
    '',
  ]
  for (const [tag, count] of tags) {
    lines.push(`- [${tag}](/code-training/tags/${tag}.html)（${count}）`)
  }
  return lines.join('\n')
}

function tagPage(tag: string, problems: Problem[]): string {
  const lines = [`# 标签：${tag}`, '', `共 ${problems.length} 道题。`, '']
  for (const g of [...DIFF_GROUPS.map((d) => d.label), '其它']) {
    const list = problems
      .filter((p) => p.group === g)
      .sort((a, b) => a.title.localeCompare(b.title, 'zh', { numeric: true }))
    if (list.length === 0) continue
    lines.push(`## ${g}`, '')
    for (const p of list) lines.push(linkLine(p))
    lines.push('')
  }
  return lines.join('\n')
}

function sectionPage(
  sourceDir: string,
  title: string,
  dirName: string,
  intro: string,
): string {
  const docsRoot = path.join(sourceDir, 'code-training/docs')
  const dir = path.join(docsRoot, dirName)
  const files = walk(dir)
    .map((full) => {
      const fm = readFrontMatter(full)
      return {
        title: String(fm.title ?? path.basename(full, '.md')),
        link: legacyPathFor(sourceDir, full, fm) ?? '',
        tags: Array.isArray(fm.tags) ? (fm.tags as unknown[]).map(String) : [],
      }
    })
    .filter((f) => f.link)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh', { numeric: true }))

  const lines = [`# ${title}`, '', intro, '', `共 ${files.length} 篇。`, '']
  for (const f of files) lines.push(`- [${f.title}](${f.link})`)
  return lines.join('\n')
}

export const catalogsPlugin = (app: App) => ({
  name: 'site-catalogs',

  async onInitialized(_app: App) {
    const sourceDir = app.dir.source()
    const problems = collectProblems(sourceDir)

    const pages: Array<{ path: string; content: string; title: string }> = []

    // ── 标签 ────────────────────────────────────────────────────────
    pages.push({
      path: '/code-training/tags.html',
      content: tagIndex(problems),
      title: '标签',
    })

    const byTag = new Map<string, Problem[]>()
    for (const p of problems) {
      for (const tag of p.tags) {
        const list = byTag.get(tag) ?? []
        list.push(p)
        byTag.set(tag, list)
      }
    }
    for (const [tag, list] of byTag) {
      pages.push({
        path: `/code-training/tags/${tag}.html`,
        content: tagPage(tag, list),
        title: `标签：${tag}`,
      })
    }

    // ── 分类 ────────────────────────────────────────────────────────
    const lines = [
      '# 题库',
      '',
      '按平台分类的算法题解，包含完整思路、代码和复杂度分析。',
      '',
      `共 ${problems.length} 道题。`,
      '',
    ]
    const dirs = [...new Set(problems.map((p) => p.dir))]
    const dirOrder = ['leetcode', 'nowcoder', 'codefun2000', 'shoppee', 'sf', 'misc']
    dirs.sort((a, b) => {
      const ai = dirOrder.indexOf(a)
      const bi = dirOrder.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    for (const dir of dirs) {
      const list = problems
        .filter((p) => p.dir === dir)
        .sort((a, b) => a.title.localeCompare(b.title, 'zh', { numeric: true }))
      lines.push(`## ${PLATFORM_LABELS[dir] ?? dir}（${list.length}）`, '')
      for (const p of list) lines.push(linkLine(p))
      lines.push('')
    }
    pages.push({
      path: '/code-training/category/题库.html',
      content: lines.join('\n'),
      title: '题库',
    })

    pages.push(
      {
        path: '/code-training/category/机器学习.html',
        content: sectionPage(
          sourceDir,
          '机器学习',
          'machine-learning',
          'Jupyter Notebooks 转换的机器学习笔记。',
        ),
        title: '机器学习',
      },
      {
        path: '/code-training/category/数据结构.html',
        content: sectionPage(
          sourceDir,
          '数据结构',
          'data-structures',
          '按数据结构分类的知识体系。',
        ),
        title: '数据结构',
      },
      {
        path: '/code-training/category/算法模式.html',
        content: sectionPage(
          sourceDir,
          '算法模式',
          'patterns',
          '通用解题套路、思维框架，以及每个模式的标准实现。',
        ),
        title: '算法模式',
      },
      {
        path: '/code-training/category/复习系统.html',
        content: sectionPage(
          sourceDir,
          '复习系统',
          'review',
          '学习笔记与速查表。',
        ),
        title: '复习系统',
      },
    )

    for (const item of pages) {
      app.pages.push(
        await createPage(app, {
          path: item.path,
          content: item.content,
          frontmatter: {
            title: item.title,
            toc: false,
            pageInfo: false,
            comment: false,
            breadcrumb: false,
            editLink: false,
          },
        }),
      )
    }
  },
})
