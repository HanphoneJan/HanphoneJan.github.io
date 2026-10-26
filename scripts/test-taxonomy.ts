import assert from 'node:assert/strict'
import { deriveTaxonomy } from '../.vuepress/taxonomy'

/**
 * 归档口径的回归测试。
 *
 * 分类/标签/日期决定 `/category/`、`/tag/`、`/timeline/` 三个页面的内容，
 * 规则改错了**不会让构建失败** —— 只会让某篇文章悄悄从归档里消失，
 * 或者出现在一个错的分类下。所以把几条关键口径钉死在断言里。
 *
 * 运行：`pnpm test:taxonomy`
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

check('docs 分类取一级目录，标签按标题关键词推导', () => {
  const taxonomy = deriveTaxonomy('docs/前端/Vue基础.md', {})
  assert.equal(taxonomy.category, '前端')
  assert.deepEqual(taxonomy.tags, ['Vue'])
  assert.equal(taxonomy.date, undefined)
})

check('docs/intro.md 归到「文档」', () => {
  assert.equal(deriveTaxonomy('docs/intro.md', {}).category, '文档')
})

check('项目子目录额外打一个子项目标签', () => {
  const taxonomy = deriveTaxonomy('docs/项目/数据中台/导读.md', {
    title: '导读',
  })
  assert.equal(taxonomy.category, '项目')
  assert.deepEqual(taxonomy.tags, ['数据中台'])
})

check('关键词规则能命中技术名词', () => {
  const taxonomy = deriveTaxonomy('docs/后端/Docker基础教程.md', {
    title: 'Docker 基础教程',
  })
  assert.equal(taxonomy.category, '后端')
  assert.ok(taxonomy.tags?.includes('Docker'))
})

check('题解分类取 platform', () => {
  const taxonomy = deriveTaxonomy(
    'code-training/docs/problems/nowcoder/华为机试/HJ1.md',
    { platform: 'NowCoder', tags: ['字符串'] },
  )
  assert.equal(taxonomy.category, 'NowCoder')
  assert.deepEqual(taxonomy.tags, ['字符串'])
})

check('platform 是占位值「自定义」时回退目录名', () => {
  const taxonomy = deriveTaxonomy(
    'code-training/docs/problems/sf/顺丰1.md',
    { platform: '自定义' },
  )
  assert.equal(taxonomy.category, '顺丰科技')
})

check('platform 缺失时回退目录名', () => {
  const taxonomy = deriveTaxonomy(
    'code-training/docs/problems/leetcode/0001_two_sum.md',
    {},
  )
  assert.equal(taxonomy.category, 'LeetCode')
})

check('显式 tags 完全取代推导结果', () => {
  const taxonomy = deriveTaxonomy('docs/前端/Vue基础.md', {
    tags: ['手写标签'],
  })
  assert.deepEqual(taxonomy.tags, ['手写标签'])
})

check('模式页同时拿到规范标签与日期', () => {
  const taxonomy = deriveTaxonomy('code-training/docs/patterns/bfs.md', {
    title: 'BFS 模式',
    last_updated: new Date('2026-10-19T00:00:00.000Z'),
  })
  assert.equal(taxonomy.category, '算法模式')
  assert.deepEqual(taxonomy.tags, ['广度优先搜索'])
  assert.ok(taxonomy.date instanceof Date)
})

check('数据结构页按文件名拿标签', () => {
  const taxonomy = deriveTaxonomy(
    'code-training/docs/data-structures/unionfind.md',
    { title: '并查集' },
  )
  assert.equal(taxonomy.category, '数据结构')
  assert.deepEqual(taxonomy.tags, ['并查集'])
})

check('日期优先级 date > date_added > last_updated', () => {
  const date = new Date('2026-01-02T00:00:00.000Z')
  const added = new Date('2026-03-04T00:00:00.000Z')
  const updated = new Date('2026-05-06T00:00:00.000Z')
  assert.equal(
    deriveTaxonomy('docs/a.md', { date, date_added: added }).date,
    date,
  )
  assert.equal(
    deriveTaxonomy('docs/a.md', { date_added: added, last_updated: updated })
      .date,
    added,
  )
  assert.equal(
    deriveTaxonomy('docs/a.md', { last_updated: updated }).date,
    updated,
  )
})

console.log(`✔ test:taxonomy 通过（${passed} 项）`)
