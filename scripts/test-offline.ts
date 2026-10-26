import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { extractRouteChunks, sectionOf } from '../.vuepress/plugins/offline-shared'

/**
 * 离线包清单的口径测试。
 *
 * 这里钉两件**错了不会报错**的事：
 *
 * 1. **板块归类。** `/code-training/tags/x` 与 `/tag/x` 是两套入口，前者跟着
 *    代码训练板块走、后者算归档。分错了页面上看不出任何异常，只是「缓存代码训练」
 *    少了下半截。
 * 2. **页面 chunk 的提取。** 离线包只下 HTML 不下 chunk 也能读（SSR 产物还在），
 *    所以 chunk 全丢时页面照样能打开，只是离线时点不动 —— 只能靠这条断言拦住。
 *    `extractRouteChunks` 读的是构建产物里 Vue Router 的静态路由表，
 *    Vite 换版本把那段压缩代码的形状改了，这里就会掉覆盖率。
 *
 * 有 `.vuepress/dist` 时顺带验真实产物；没有（全新 clone、CI 的 lint 步骤）
 * 就只跑纯函数部分。
 *
 * 运行：`pnpm test:offline`
 */

let passed = 0

function check(name: string, run: () => void): void {
  run()
  passed++
  console.log(`  ✔ ${name}`)
}

check('板块划分：文档 / 代码训练 / 归档 / 首页', () => {
  const cases: Array<[string, string]> = [
    ['/', 'start'],
    ['/settings.html', 'start'],
    ['/stars.html', 'start'],
    ['/markdown-page.html', 'start'],
    ['/docs.html', 'docs'],
    ['/docs/前端/Vue基础.html', 'docs'],
    ['/code-training.html', 'training'],
    ['/code-training/problems/leetcode/1.html', 'training'],
    ['/code-training/tags/动态规划.html', 'training'],
    ['/code-training/category/题库.html', 'training'],
    ['/article/', 'archive'],
    ['/category/前端/', 'archive'],
    ['/tag/动态规划/', 'archive'],
    ['/timeline/', 'archive'],
    ['/star/', 'archive'],
  ]
  for (const [url, expected] of cases) {
    assert.equal(sectionOf(url), expected, `${url} 应归到 ${expected}`)
  }
})

check('板块划分：查询串与锚点不影响归类', () => {
  assert.equal(sectionOf('/docs/x.html?from=search'), 'docs')
  assert.equal(sectionOf('/tag/x/#top'), 'archive')
})

check('从压缩后的路由表里读出页面 chunk', () => {
  // 形状取自真实产物（`app-<hash>.js`，变量名已压缩）
  const source = [
    'x=[`/`,{loader:()=>Y(()=>import(`./HanphoneJan.github.io-Daob427B.js`),[]),meta:{}},',
    '[`/code-training/problems/leetcode/1.html`,{loader:()=>Y(()=>import(`./0001_two_sum-BKeqEtkm.js`),[]),meta:{}},',
    '[`/tag/x/`,{loader:()=>import("./x-12345678.js"),meta:{}}]',
  ].join('')
  const map = extractRouteChunks(source)
  assert.equal(map.get('/'), 'HanphoneJan.github.io-Daob427B.js')
  assert.equal(map.get('/code-training/problems/leetcode/1.html'), '0001_two_sum-BKeqEtkm.js')
  assert.equal(map.get('/tag/x/'), 'x-12345678.js', '双引号的 import 也要认')
})

check('路由表里不是页面的条目不会被误认', () => {
  const map = extractRouteChunks('import(`./app-CjTlIoWI.js`)')
  assert.equal(map.size, 0)
})

const dist = path.resolve(process.cwd(), '.vuepress/dist')
const assetsDir = path.join(dist, 'assets')

if (!fs.existsSync(assetsDir)) {
  console.log('  ○ 没有 .vuepress/dist，跳过产物校验（先 pnpm build）')
} else {
  const assets = fs.readdirSync(assetsDir)
  const routeChunks = new Map<string, string>()
  for (const file of assets) {
    if (!/^app-.*\.js$/.test(file)) continue
    for (const [url, chunk] of extractRouteChunks(
      fs.readFileSync(path.join(assetsDir, file), 'utf8'),
    )) {
      routeChunks.set(url, chunk)
    }
  }

  check('真实产物：路由表里每个 chunk 文件都存在', () => {
    assert.ok(routeChunks.size > 100, `只解析出 ${routeChunks.size} 条路由`)
    const missing = [...routeChunks.values()].filter(
      (chunk) => !fs.existsSync(path.join(assetsDir, chunk)),
    )
    assert.deepEqual(missing.slice(0, 5), [], `${missing.length} 个 chunk 文件缺失`)
  })

  check('真实产物：页面覆盖率 >= 90%', () => {
    let pages = 0
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.html')) pages++
      }
    }
    walk(dist)
    const ratio = routeChunks.size / pages
    assert.ok(
      ratio >= 0.9,
      `路由表覆盖 ${routeChunks.size}/${pages} 页（${(ratio * 100).toFixed(1)}%），` +
        '低于 90%：离线包会有一批页面缺 chunk（能读但点不动）',
    )
  })
}

console.log(`✔ test:offline 通过（${passed} 项）`)
