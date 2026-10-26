import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { extractRouteChunks, sectionOf } from '../.vuepress/plugins/offline-shared'
import { PYODIDE_RUNTIME_FILES } from '../src/components/training/pyrunner/runtime-files'

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

  check('真实产物：清单里的 Python 运行时与磁盘一致', () => {
    const manifestPath = path.join(dist, 'offline-manifest.json')
    if (!fs.existsSync(manifestPath)) return

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      sections: Record<string, {entries: Array<[string, string | null, number, number, string]>}>
    }
    const section = manifest.sections.pyodide
    // 本地没跑过 pnpm sync:pyodide 时清单里没有这一块
    if (!section) return

    const listed = section.entries.map(([url]) => url.replace('/pyodide/', '')).sort()
    for (const name of listed) {
      assert.ok(
        PYODIDE_RUNTIME_FILES.includes(name),
        `清单里出现了运行时清单之外的文件：${name}`,
      )
    }
    // 与 dist/pyodide 里真实存在的文件一一对应：不少（设置页显示不全）
    // 也不多（会去下根本用不到的文件）
    const onDisk = PYODIDE_RUNTIME_FILES.filter((name) =>
      fs.existsSync(path.join(dist, 'pyodide', name)),
    ).sort()
    assert.deepEqual(listed, onDisk)
    // 体积求和要覆盖那 12.9MB，不能全是 0（`sizeOf` 失败时会静默变 0）
    const bytes = section.entries.reduce((sum, [, , size]) => sum + size, 0)
    assert.ok(bytes > 10 * 1024 * 1024, `Python 运行时体积只算出 ${bytes} 字节`)
  })

  check('真实产物：共享脚本不与页面 chunk 重复、文件都在', () => {
    const manifestPath = path.join(dist, 'offline-manifest.json')
    if (!fs.existsSync(manifestPath)) return

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      sections: Record<
        string,
        {entries: Array<[string, string | null, number, number, string]>}
      >
    }
    const shared = manifest.sections.shared
    if (!shared) return

    const pageChunks = new Set(
      Object.values(manifest.sections).flatMap((section) =>
        section.entries.map(([, chunk]) => chunk).filter((chunk): chunk is string => Boolean(chunk)),
      ),
    )
    assert.ok(shared.entries.length > 0, '共享脚本是空的')
    for (const [url] of shared.entries) {
      assert.ok(url.startsWith('/assets/') && url.endsWith('.js'), `不是脚本：${url}`)
      // 同一份文件既当页面 chunk 又当共享脚本的话，说明 pageChunks 没记上，
      // 页面下的那份会被这里重复下载一遍（白白多 40MB）
      assert.ok(
        !pageChunks.has(url.replace(/^\//, '')),
        `${url} 同时被当成页面 chunk 和共享脚本`,
      )
      assert.ok(fs.existsSync(path.join(dist, url)), `${url} 不存在于 dist`)
    }
  })

  check('真实产物：每条都带内容指纹', () => {
    const manifestPath = path.join(dist, 'offline-manifest.json')
    if (!fs.existsSync(manifestPath)) return

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      sections: Record<string, {entries: Array<[string, string | null, number, number, string]>}>
    }
    const bad: string[] = []
    let total = 0
    for (const section of Object.values(manifest.sections)) {
      for (const [url, , , , hash] of section.entries) {
        total++
        if (!/^[0-9a-f]{10}$/.test(hash ?? '')) bad.push(url)
      }
    }
    // 指纹是设置页判断「这一项变没变」的唯一依据：缺一个，那一项每次部署
    // 都会被当成新的重下一遍
    assert.deepEqual(bad.slice(0, 5), [], `${bad.length}/${total} 条没有合法指纹`)
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
