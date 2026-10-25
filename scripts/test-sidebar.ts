import assert from 'node:assert/strict'
import { docsSidebar, trainingSidebar, type SidebarItem } from '../.vuepress/sidebar'

/**
 * 侧边栏「展开哪一支」的回归测试。
 *
 * 这里钉的是 hope 判定「分组是否为当前」的那套规则：
 * 分组只要满足 `isActiveLink(route, prefix)` 就算当前，而 `SidebarLinks`
 * 用 `findIndex` 打开**第一个**当前项 —— 所以一个误判就会让点开的目录
 * 连带把第一个子目录整支展开，而且**不会报错**，只是看起来「怎么自己开了」。
 *
 * 曾经踩过：分组不写 `prefix` 时 hope 让它继承侧边栏 base，板块首页的 base
 * 正好是 `/docs.html` / `/code-training.html` 本身，归一化后两边相等，
 * 于是首页上**每一个**分组都被判成当前，点谁都会展开第一支。
 *
 * 运行：`pnpm test:sidebar`
 */

const SECTION_LANDING: Array<[string, string, () => SidebarItem[]]> = [
  ['/docs.html', '/docs/', () => docsSidebar(process.cwd())],
  ['/code-training.html', '/code-training/', () => trainingSidebar(process.cwd())],
]

/** 与 vuepress-shared 的 normalizePath 一致（去 hash、去 index.html、去扩展名） */
function normalizePath(path: string): string {
  return decodeURI(path)
    .replace(/#.*$/u, '')
    .replace(/\/index\.html$/iu, '/')
    .replace(/\/(?:README|index)\.md$/iu, '/')
    .replace(/\.(?:html|md)$/iu, '')
}

function isActiveLink(routePath: string, link?: string): boolean {
  if (!link) return false
  return normalizePath(routePath) === normalizePath(link)
}

/** 复刻 @theme-hope/utils/sidebar/isActiveSidebarItem */
function isActiveSidebarItem(routePath: string, item: SidebarItem): boolean {
  if (item.children) {
    return (
      (Boolean(item.prefix) && isActiveLink(routePath, item.prefix)) ||
      item.children.some((child) => isActiveSidebarItem(routePath, child))
    )
  }
  return isActiveLink(routePath, item.link)
}

/** 每一层都取 findIndex，展开的只会是「第一个当前项」 */
function openedGroupRoute(routePath: string, items: SidebarItem[]): SidebarItem | undefined {
  const index = items.findIndex((item) => isActiveSidebarItem(routePath, item))
  return index === -1 ? undefined : items[index].children ? items[index] : undefined
}

function groups(items: SidebarItem[], out: SidebarItem[] = []): SidebarItem[] {
  for (const item of items) {
    if (!item.children) continue
    out.push(item)
    groups(item.children, out)
  }
  return out
}

function leaves(
  items: SidebarItem[],
  ancestors: SidebarItem[] = [],
  out: Array<{ link: string; ancestors: SidebarItem[] }> = [],
): Array<{ link: string; ancestors: SidebarItem[] }> {
  for (const item of items) {
    if (item.children) leaves(item.children, [...ancestors, item], out)
    else if (item.link) out.push({ link: item.link, ancestors })
  }
  return out
}

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

for (const [landing, base, build] of SECTION_LANDING) {
  const sidebar = build()

  check(`${landing}：每个分组都带自己的目录前缀`, () => {
    for (const group of groups(sidebar)) {
      assert.ok(
        group.prefix,
        `分组「${group.text}」缺少 prefix，会继承侧边栏 base 并被误判成当前`,
      )
      assert.ok(
        group.prefix!.startsWith(base),
        `分组「${group.text}」的 prefix ${group.prefix} 不在 ${base} 下`,
      )
      assert.ok(
        group.prefix!.endsWith('/'),
        `分组「${group.text}」的 prefix ${group.prefix} 没有以 / 结尾`,
      )
    }
  })

  check(`${landing}：前缀唯一（同层重复会让 key 撞车）`, () => {
    const prefixes = groups(sidebar).map((group) => group.prefix)
    assert.equal(new Set(prefixes).size, prefixes.length, '存在重复的 prefix')
  })

  check(`${landing}：板块首页上没有任何分组被判成当前`, () => {
    const active = groups(sidebar).filter((group) => isActiveSidebarItem(landing, group))
    assert.deepEqual(
      active.map((group) => group.text),
      [],
      '首页不属于任何目录，却分组被判成当前 —— 点开哪个目录都会自动展开第一支',
    )
    assert.equal(openedGroupRoute(landing, sidebar), undefined)
  })

  check(`${landing}：每篇文档只展开它的祖先链`, () => {
    for (const { link, ancestors } of leaves(sidebar)) {
      const active = groups(sidebar)
        .filter((group) => isActiveSidebarItem(link, group))
        .map((group) => group.text)
      assert.deepEqual(
        active,
        ancestors.map((group) => group.text),
        `${link} 展开的分组与祖先链不一致`,
      )

      // 逐层下钻：每一层最多只能有一个分组被打开
      let level = sidebar
      for (const ancestor of ancestors) {
        const opened = openedGroupRoute(link, level)
        assert.equal(opened?.text, ancestor.text, `${link} 在这一层展开了 ${opened?.text}`)
        assert.equal(
          level.filter((item) => item.children && isActiveSidebarItem(link, item)).length,
          1,
          `${link} 在同一层展开了多个分组`,
        )
        level = ancestor.children!
      }
      assert.equal(openedGroupRoute(link, level), undefined, `${link} 在最后一层还展开了分组`)
    }
  })
}

console.log(`✔ test:sidebar 通过（${passed} 项）`)
