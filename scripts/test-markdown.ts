import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMarkdown } from 'vuepress/markdown'
import { escapeStrayHtmlPlugin } from '../.vuepress/markdown/escape-stray-html'

/**
 * 尖括号转义的回归测试。
 *
 * `.vuepress/markdown/escape-stray-html.ts` 把正文里形如 `<id>` 的片段
 * 转成 `&lt;id&gt;`（否则 VuePress 会把它们当 Vue 标签编译）。它踩过的坑
 * 是**转义两次**：在 `text` token 里预塞 `&lt;`，markdown-it 的 text 渲染器
 * 会把 `&` 再转一次，页面上就显示成字面量 `&lt;`。这**不会让构建失败**，
 * 只会让 102 篇文档里的 `左 < 根 < 右`、表格里的 `< 2s` 显示成 `&lt;`。
 *
 * 所以这里钉住两件事：转义只发生一次，且白名单标签与代码块不被误伤。
 *
 * 运行：`pnpm test:markdown`
 */

const md = createMarkdown({ html: true })
escapeStrayHtmlPlugin(md)

const render = (src: string): string => md.render(src)

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

/** 只转义一次：有 `&lt;` 但没有 `&amp;lt;` */
function assertEscapedOnce(html: string, needle: string): void {
  assert.ok(html.includes(needle), `缺少 ${needle}：${html}`)
  assert.ok(!html.includes('&amp;lt;'), `被转义两次：${html}`)
  assert.ok(!html.includes('&amp;gt;'), `被转义两次：${html}`)
}

check('正文里的裸 `<` 只转义一次', () => {
  assertEscapedOnce(render('顺序：左 < 根 < 右。'), '左 &lt; 根 &lt; 右')
})

check('比较运算符与表格单元', () => {
  assertEscapedOnce(render('1 <= nums.length <= 200'), '1 &lt;= nums.length')
  assertEscapedOnce(render('| 接口 | 耗时 |\n| --- | --- |\n| a | < 2s |'), '<td>&lt; 2s</td>')
})

check('像标签的片段（html_inline）转义一次', () => {
  assertEscapedOnce(render('路径 /scenarios/<id>/ 结束'), '&lt;id&gt;')
  assertEscapedOnce(render('C:\\Users\\<username>\\AppData'), '&lt;username&gt;')
  assertEscapedOnce(render("类型 <class 'int'>"), "&lt;class 'int'&gt;")
  assertEscapedOnce(render('LR(0)<SLR(1)<LALR(1)'), 'LR(0)&lt;SLR(1)')
})

check('白名单标签原样输出（正文里真用的 HTML）', () => {
  const html = render('<details><summary>展开</summary>\n\n正文\n\n</details>')
  assert.ok(html.includes('<details>') && html.includes('<summary>'), html)

  const inline = render('<span class="x">红</span> 与 <img src="/a.png" />')
  assert.ok(inline.includes('<span class="x">'), inline)
  assert.ok(inline.includes('<img src="/a.png" />'), inline)

  assert.ok(render('<br>').includes('<br>'))
})

check('代码里的尖括号不动（行内 / 围栏）', () => {
  const inline = render('写 `<?>` 即可')
  assert.ok(inline.includes('v-pre'), inline)
  assert.ok(inline.includes('&lt;?&gt;'), inline)

  const fence = render('```text\n左 < 右\n```')
  assert.ok(fence.includes('左 &lt; 右'), fence)
  assert.ok(!fence.includes('&amp;lt;'), fence)
})

check('正文手写的实体按 CommonMark 解码（`&lt;` 显示成 `<`）', () => {
  // 想显示「&lt;」这四个字符，得写 `&amp;lt;`（CommonMark 会把实体解成字符）
  const html = render('字面写法 &lt; 与 &amp;lt;')
  assert.ok(html.includes('&lt; 与 &amp;lt;'), html)
  assert.ok(!html.includes('&amp;amp;'), html)
})

check('全库 md 渲染后没有双重转义', () => {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const target = join(dir, entry.name)
      if (entry.isDirectory()) walk(target)
      else if (entry.name.endsWith('.md')) files.push(target)
    }
  }
  for (const dir of ['docs', 'code-training/docs']) walk(dir)

  const broken: string[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
    let html: string
    try {
      html = render(source)
    } catch {
      continue // 主题插件才认的语法（容器等）在裸 markdown 下可能报错，跳过
    }
    if (html.includes('&amp;lt;') || html.includes('&amp;gt;')) broken.push(file)
  }
  assert.deepEqual(broken, [], `双重转义的页面：${broken.join(', ')}`)
  assert.ok(files.length > 500, `只扫到 ${files.length} 篇 md`)
})

console.log(`✔ test:markdown 通过（${passed} 项）`)
