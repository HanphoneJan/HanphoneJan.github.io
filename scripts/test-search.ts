import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 全文搜索的口径测试（跑在构建产物上）。
 *
 * 这里钉四件**错了不会让构建失败**的事：
 *
 * 1. **worker 是经典脚本。** slimsearch 的生产客户端用 `new Worker(url)`
 *    加载，不传 `{type: 'module'}`；rc.128/129 的 worker 是 ESM（`import` /
 *    末尾 `export{}`），浏览器直接 SyntaxError，搜索框打不开，而构建、SSR、
 *    所有单测全程正常。所以用 `new Function(src)` 按经典脚本解析一遍。
 * 2. **正文真的进了索引。** 搜一个只出现在段落里、不出现在任何标题里的词
 *    （「页缓存」），必须命中「数据库理论」这一页，且命中的是 `text` 而不是
 *    小节标题。只搜标题的 `@vuepress/plugin-search` 在这里给空结果。
 * 3. **标题与小节标题仍然能搜。** 换插件不能把原来能用的那部分弄丢。
 * 4. **查询按客户端的方式切词。** 客户端把 `Intl.Segmenter` 切出来的词用空格
 *    连起来再发给 worker（`useResults` 的 `join(' ')`）；直接发「页缓存」在
 *    默认分词器里是一个词，一个也匹配不上 —— 这条错了会让测试看起来像
 *    「正文没进索引」。
 *
 * `self` 是 worker 里唯一用到的宿主 API（`addEventListener` / `postMessage`），
 * 用 shim 在 Node 里就能真跑一遍：索引在 worker 文件里是
 * `encodeData`（zlib + base64）压缩的，解析、切词、查询都走产物里那份代码。
 *
 * 运行：`pnpm test:search`（先 `pnpm build`）
 */

let passed = 0

function check(name: string, run: () => void): void {
  run()
  passed++
  console.log(`  ✔ ${name}`)
}

const dist = path.resolve(process.cwd(), '.vuepress/dist')
const assetsDir = path.join(dist, 'assets')

const workerFile = (): string | null => {
  if (!fs.existsSync(assetsDir)) return null
  const file = fs.readdirSync(assetsDir).find((name) => /^slimsearch\..*\.js$/.test(name))
  return file ? path.join(assetsDir, file) : null
}

interface ResultContent {
  type: string
  id: number
  anchor?: string
  display: unknown[]
}

interface SearchResult {
  title: string
  contents: ResultContent[]
}

const segmenter = new Intl.Segmenter('zh-CN', {granularity: 'word'})

/** 与客户端 `defaultQuerySplitter` + `useResults` 的 `join(' ')` 同口径 */
const splitQuery = (query: string): string =>
  [...segmenter.segment(query)]
    .map(({segment}) => segment)
    .filter((word) => word.trim())
    .join(' ')

/** 在 Node 里按经典脚本跑 worker，返回一个同步的 `search` */
function openWorker(src: string): {search: (query: string) => SearchResult[]} {
  let onMessage: ((event: {data: unknown}) => void) | null = null
  const posted: unknown[] = []

  const self = {
    addEventListener: (type: string, callback: (event: {data: unknown}) => void) => {
      if (type === 'message') onMessage = callback
    },
    postMessage: (message: unknown) => posted.push(message),
  }

  new Function('self', src)(self)
  assert.ok(onMessage, 'worker 没有注册 message 监听')

  return {
    search(query: string) {
      posted.length = 0
      // 与 @vuepress/search-helper 的 WorkerMessageData 同形；options 与
      // `.vuepress/client.ts` 的 `defineSearchConfig` 一致（AND 组合）。
      onMessage!({
        data: {
          type: 'search',
          id: 1,
          query: splitQuery(query),
          locale: '/',
          options: {combineWith: 'and'},
        },
      })
      const [type, id, results] = posted[0] as [string, number, SearchResult[]]
      assert.equal(type, 'search', 'worker 回的不是 search 响应')
      assert.equal(id, 1, 'worker 响应的请求 id 对不上')
      return results
    },
  }
}

const file = workerFile()

if (!file) {
  if (!fs.existsSync(assetsDir)) {
    console.log('  ○ 没有 .vuepress/dist，跳过产物校验（先 pnpm build）')
  } else {
    console.log('  ✖ dist/assets 里没有 slimsearch.<BUILD_ID>.js —— 搜索 worker 没生成')
    process.exitCode = 1
  }
} else {
  const src = fs.readFileSync(file, 'utf8')
  const worker = openWorker(src)

  check('worker 是经典脚本（不含 import/export 语法）', () => {
    assert.doesNotThrow(
      () => new Function(src),
      `${path.basename(file)} 解析失败：slimsearch 换版本后 worker 可能又变回 ESM 了`,
    )
  })

  check('正文可搜：只出现在段落里的词能命中', () => {
    const results = worker.search('页缓存')
    assert.ok(results.length > 0, '「页缓存」一个结果都没有 —— 正文没进索引')
    const hit = results.find((item) => item.title.includes('数据库理论'))
    assert.ok(
      hit,
      `「页缓存」没有命中「数据库理论」；实际命中：${results
        .map((item) => item.title)
        .slice(0, 5)
        .join('、')}`,
    )
    assert.ok(
      hit!.contents.some((item) => item.type === 'text'),
      '命中的是小节标题，不是正文（正文没有进索引？）',
    )
  })

  check('题解正文同样可搜', () => {
    // 「单调栈」只出现在题解正文里，标题是「84. 柱状图中最大的矩形」
    const results = worker.search('单调栈')
    assert.ok(
      results.some((item) => item.title.includes('柱状图中最大的矩形')),
      '「单调栈」没有命中「柱状图中最大的矩形」这一篇',
    )
  })

  check('标题检索没退化', () => {
    const results = worker.search('动态规划')
    assert.ok(results.length > 0, '「动态规划」一个结果都没有')
    assert.ok(
      results.some((item) => item.title === '动态规划'),
      '标题命中里没有「动态规划」这一页',
    )
  })

  check('正文词的判定前提：它不在任何标题里', () => {
    const md = fs.readFileSync(
      path.resolve(process.cwd(), 'docs/计算机基础/数据库理论.md'),
      'utf8',
    )
    const heading = md
      .split('\n')
      .filter((line) => /^#{1,6}\s/.test(line))
      .find((line) => line.includes('页缓存'))
    assert.equal(heading, undefined, '「页缓存」出现在标题里了，这条测试就不再证明正文可搜')
  })
}

if (passed > 0) console.log(`✔ test:search 通过（${passed} 项）`)
