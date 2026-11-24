import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  pageContentFiles,
  quizEntryRanges,
  quizEntryUpdatedTimes,
} from '../.vuepress/updated-time'

/**
 * 「最近更新」口径的回归测试。
 *
 * 页脚那个时间由 `@vuepress/plugin-git` 渲染，值来自
 * `plugins/page-updated.ts` 算出的依赖集合。**它坏掉不会让构建失败**：
 * 页面照常生成，只是时间悄悄停在壳文件的最后一次提交上 —— 设置页整整
 * 冻了三周才被发现。所以这里把几类「内容不在 md 里」的页面钉死。
 *
 * 运行：`pnpm test:updated`
 */

const root = path.resolve(__dirname, '..')

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

function depsOf(relative: string): string[] {
  return pageContentFiles(root, path.join(root, relative)).map((file) =>
    path.relative(root, file).split(path.sep).join('/'),
  )
}

function gitTime(file: string | null): number {
  if (!file) return 0
  try {
    const out = execFileSync(
      'git',
      ['log', '--follow', '--max-count=1', '--format=%ct', '--', file],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    return out ? Number(out) * 1000 : 0
  } catch {
    return 0
  }
}

check('设置页依赖 CacheSettings 组件与它 import 的运行时清单', () => {
  const deps = depsOf('settings.md')
  assert.ok(deps.includes('.vuepress/components/CacheSettings.vue'))
  assert.ok(
    deps.includes('src/components/training/pyrunner/runtime-files.ts'),
    '组件按相对 import 递归出来的依赖也要在',
  )
})

check('三个整页孤岛的 md 都挂到页面实现上', () => {
  assert.ok(depsOf('index.md').includes('.vuepress/components/HomePage.vue'))
  assert.ok(depsOf('stars.md').includes('src/pages/stars/index.tsx'))
  assert.ok(depsOf('projects.md').includes('src/pages/projects/index.tsx'))
})

check('算法模式页挂到放置表指定的 tracer 模块', () => {
  const deps = depsOf('code-training/docs/patterns/sorting.md')
  assert.ok(
    deps.includes('src/components/training/visualizer/tracers/sorting.ts'),
  )
  // 正文里的关键帧图也算这一页的依赖
  assert.ok(deps.includes('static/diagrams/merge-two-sorted.png'))
})

check('正文引用的本地图片算这一页的依赖', () => {
  const deps = depsOf('docs/项目/cloud-disk/事件与一致性.md')
  assert.ok(deps.includes('static/img/cloud-disk/outbox.png'))
})

check('代码块里的示例标签不会被当成真实组件', () => {
  // Vue 教程正文里全是 `<MyComponent />`，它们不该产生任何依赖
  assert.deepEqual(depsOf('docs/前端/Vue基础.md'), [])
})

check('所有依赖文件都真实存在', () => {
  for (const page of [
    'settings.md',
    'stars.md',
    'code-training/docs/problems/leetcode/0001_two_sum.md',
    'code-training/docs/patterns/dynamic_programming.md',
  ]) {
    for (const dep of pageContentFiles(root, path.join(root, page))) {
      assert.ok(fs.existsSync(dep), `${page} -> ${dep} 不存在`)
    }
  }
})

check('题库条目的行区间覆盖全部条目且不重叠', () => {
  const text = fs.readFileSync(path.join(root, 'static/quiz/bank.json'), 'utf8')
  const bank = JSON.parse(text) as {
    items: Array<{ docId?: string }>
  }
  const ranges = quizEntryRanges(text)
  assert.equal(ranges.length, bank.items.length)
  for (const [index, range] of ranges.entries()) {
    assert.equal(range.docId, bank.items[index].docId)
    assert.ok(range.start >= 1)
    assert.ok(range.end >= range.start)
    if (index > 0) assert.ok(range.start > ranges[index - 1].end)
  }
})

check('题库更新时间按条目取，不按整份 bank.json', () => {
  const times = quizEntryUpdatedTimes(root)
  const first = times.get('problems/leetcode/0001_two_sum.md')
  assert.ok(first && first > 0, '0001 的自测题要有时间')

  const bankTime = gitTime('static/quiz/bank.json')
  const docsWithQuiz = [...times.values()]
  assert.ok(docsWithQuiz.some((time) => time < bankTime), '不能所有页都等于整份文件的时间')
  assert.ok(docsWithQuiz.every((time) => time <= Date.now()))
})

check('设置页的依赖时间晚于壳文件 —— 这就是原来停在 10/26 的原因', () => {
  const mdTime = gitTime('settings.md')
  const depTime = Math.max(
    ...depsOf('settings.md').map((dep) => gitTime(dep)),
  )
  assert.ok(depTime >= mdTime, '设置页依赖的组件不能比 settings.md 旧')
})

console.log(`\n✓ 最近更新时间口径 ${passed} 项全部通过`)
