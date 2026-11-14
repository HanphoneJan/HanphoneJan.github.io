// 站点自定义样式（Hope rc.110 不会自动加载 .vuepress/styles/index.scss，
// 必须在客户端入口显式 import）
import './styles/index.scss'

// 必须在 `load` 事件之前求值：`register-service-worker` 在模块顶层就
// `addEventListener('load')`，而 @vuepress/plugin-pwa 是在 setup 里**动态
// import** 它的。动态 import 若落在 load 之后，那个 Promise 永远不会 resolve，
// Service Worker 就静默不注册（在本机 headless 上稳定复现）。
// 这里静态引一次，保证它先于 load 求值。
import 'register-service-worker'
import { defineClientConfig } from 'vuepress/client'

import HomePage from './components/HomePage.vue'
import CacheSettings from './components/CacheSettings.vue'
import DifficultyInfo from './components/DifficultyInfo.vue'
import LayoutToggle from './components/LayoutToggle.vue'
import NavbarHomeLink from './components/NavbarHomeLink.vue'
import NavbarSettingsLink from './components/NavbarSettingsLink.vue'
import NoVisStepsMount from './components/NoVisStepsMount.vue'
import PatternGraphMount from './components/PatternGraphMount.vue'
import RecordedVisualizerMount from './components/RecordedVisualizerMount.vue'
import SelfTestMount from './components/SelfTestMount.vue'
import ProjectsMount from './components/ProjectsMount.vue'
import SnippetBarMount from './components/SnippetBarMount.vue'
import StarsMount from './components/StarsMount.vue'
import TracerVisualizerMount from './components/TracerVisualizerMount.vue'

/**
 * 站内跳转时页面 chunk 拉不下来的特征。
 *
 * 各浏览器的说法不一样：Chrome 是 `Failed to fetch dynamically imported module`，
 * Safari 是 `Importing a module script failed.`，Firefox 是
 * `error loading dynamically imported module`（webpack 时代的旧站是
 * `Loading chunk N failed` / `ChunkLoadError`）。
 */
/**
 * 一次性清理旧版图片缓存的标记（见 `setup()` 里的说明）。
 * 名字带版本号：以后再有同类迁移就换一个，不要复用。
 */
const IMG_CACHE_RESET = 'hanphone:images-cache-v2'

const isChunkLoadError = (error: unknown): boolean =>
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  )

/**
 * 深链接带锚点（`/x.html#section`）时的滚动校正。
 *
 * 浏览器在**外壳执行之前**就按当时的布局滚了一次，而这时字体、表格宽度都
 * 还没稳定；代码块又用 `content-visibility: auto` 把屏幕外的高度按估算
 * 参与排版（见 `styles/index.scss`）。两者叠加，实测直接打开
 * `Python速查.html#字典-dict` 会偏到一屏之外。
 *
 * 做法：等初始路由就绪后再定位一次，然后补掉「目标顶边离视口顶部」的残差。
 * 用 `behavior: 'instant'`，不与主题的平滑滚动抢动画；只校正一次，之后
 * 读者怎么滚都不再干预。
 */
function fixHashScroll(): void {
  const raw = window.location.hash
  if (!raw || raw === '#') return
  let id = raw.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    /* 非法转义就按原样找 */
  }
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({behavior: 'instant' as ScrollBehavior, block: 'start'})
  requestAnimationFrame(() => {
    const top = el.getBoundingClientRect().top
    if (Math.abs(top) > 2) {
      window.scrollBy({top, behavior: 'instant' as ScrollBehavior})
    }
  })
}

/**
 * 这些组件由 markdown-it 直接写进页面 token 流（见 plugins/training.ts），
 * 所以必须**全局注册** —— 页面模板里没有 import 语句可写。
 */
export default defineClientConfig({
  enhance({ app, router }) {
    app.component('SelfTestMount', SelfTestMount)
    app.component('PatternGraphMount', PatternGraphMount)
    app.component('RecordedVisualizerMount', RecordedVisualizerMount)
    app.component('NoVisStepsMount', NoVisStepsMount)
    app.component('SnippetBarMount', SnippetBarMount)
    app.component('TracerVisualizerMount', TracerVisualizerMount)
    app.component('StarsMount', StarsMount)
    app.component('ProjectsMount', ProjectsMount)
    app.component('HomePage', HomePage)
    app.component('CacheSettings', CacheSettings)
    /**
     * 题解页 `.page-info` 行里的难度徽标。
     *
     * `theme.ts` 的 `pageInfo` 里写的 `'Difficulty'` 会被 hope 的 `PageInfo`
     * 用 `resolveComponent('DifficultyInfo')` 解析 —— 也就是说**注册即生效**，
     * 不需要改主题、也不需要动 md。详见 `components/DifficultyInfo.vue` 文件头。
     */
    app.component('DifficultyInfo', DifficultyInfo)

    /**
     * 导航栏右侧的两个图标链接（个人主页 / 缓存与离线）。
     *
     * 名字必须与 `theme.ts` 的 `navbarLayout.end` 里写的那两项**逐字一致** ——
     * hope 的 Navbar 对布局项做 `hasGlobalComponent(item)` 再
     * `resolveComponent(item)`，注册即生效；漏注册会被换成 noopComponent，
     * 图标**静默消失**（构建照常成功）。
     *
     * 不要改回 rootComponent + `onMounted` 里插 DOM：归档页用的是 Blog 布局，
     * 与默认布局是两棵不同的组件树，站内切换会把 Navbar 重挂，插进去的节点
     * 不会跟着回来。详见 `components/NavbarHomeLink.vue` 文件头。
     */
    app.component('NavbarHomeLink', NavbarHomeLink)
    app.component('NavbarSettingsLink', NavbarSettingsLink)

    /**
     * 页面 chunk 加载失败时，别把读者晾在一个「点了没反应」的页面上。
     *
     * VuePress 的路由在 `beforeResolve` 里 `await import(页面 chunk)`：
     * chunk 拿不到时这次导航直接中止，**地址栏和画面都不变**，控制台里只有
     * 一行 `Failed to fetch dynamically imported module`。读者看到的就是
     * 「切换路由卡住了」—— 尤其在安装版 PWA 里：应用外壳（`app-<hash>.js`）
     * 与页面 chunk 都带构建哈希，部署一次就换名、旧文件被删，而 PWA 从后台
     * 恢复、几天不整页重载，手里的外壳可能已经过期好几轮了。
     *
     * 处理方式是**整页打开目标地址**：目标页的 HTML 走 NetworkFirst，是
     * 服务端渲染好的，内容一定在（离线时还能用缓存的那份）。这比留一个
     * 点不动的页面好，也比停在原页重载有用 —— 重载后读者还得再点一次。
     * 只对 chunk 类错误这么做：其它导航错误（例如守卫里抛异常）整页跳转
     * 会掩盖真正的 bug。
     *
     * 同一目标 60 秒内只救一次。目标页的 chunk 也缺失时（整个部署都过期了、
     * 或 HTML 来自离线缓存），整页打开仍然会失败；不带这个闸门的话
     * `onError → 跳转 → 新文档又 onError` 就是刷新循环。
     *
     * 根因（旧外壳为什么会一直存在）：安装版 PWA 可能几天不整页重载，
     * 手里的外壳会过期好几轮。`.vuepress/theme.ts` 现在让 `/` 走预缓存，
     * 启动页的 HTML 与外壳是同一个 SW 版本；但深路径缓存下来的 HTML 仍可能
     * 指向已经删掉的 chunk，所以这条兜底必须留着。
     */
    const RECOVERY_KEY = 'hanphone:chunk-recovery'
    router.onError((error, to) => {
      if (!isChunkLoadError(error)) return
      const target = to?.fullPath ?? window.location.href
      let last: {target?: string; at?: number} | null = null
      try {
        last = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || 'null')
      } catch {
        /* 隐私模式下 sessionStorage 可能不可用：退化成每次都救 */
      }
      if (last?.target === target && Date.now() - Number(last.at ?? 0) < 60_000) {
        console.error(
          '[router] 整页打开后仍然拿不到页面 chunk（新部署还没生效 / 处于离线状态），不再自动跳转',
          error,
        )
        return
      }
      try {
        sessionStorage.setItem(
          RECOVERY_KEY,
          JSON.stringify({target, at: Date.now()}),
        )
      } catch {
        /* 同上 */
      }
      console.warn(
        `[router] 页面 chunk 加载失败（多半是应用外壳过期），改为整页打开 ${target}`,
        error,
      )
      window.location.assign(target)
    })

    /**
     * 放行冷启动期间被扣下的站内点击（脚本在 `config.ts` 的 head 里）。
     *
     * 应用外壳执行完之前，`<a>` 还是普通链接，点一下就是整页导航 —— 目标页
     * 走 NetworkFirst，再解析一遍外壳。那段脚本先 `preventDefault()` 把
     * href 记下来，这里在初始导航完成后取回，交给客户端路由。
     * 应用没起来时那边 2.5 秒后自己整页跳转，所以「JS 坏了也能点」。
     */
    const consumePendingNav = (): void => {
      const href = (
        window as unknown as {__hanphoneTakePendingNav?: () => string | null}
      ).__hanphoneTakePendingNav?.()
      if (href) {
        setTimeout(() => {
          router.push(href).catch(() => {
            /* 与当前路由相同时 vue-router 会 reject，忽略 */
          })
        }, 0)
      }
    }
    // SSR 里没有 document，也不该去等客户端的初始导航
    if (typeof document !== 'undefined') {
      router
        .isReady()
        .catch(() => {
          /* 初始导航失败也要放行点击，否则整站都点不动 */
        })
        .then(() => {
          document.documentElement.dataset.appReady = '1'
          consumePendingNav()
          if (window.location.hash) requestAnimationFrame(fixHashScroll)
        })
    }
  },
  // 沉浸阅读模式的悬浮按钮（桌面端），见 LayoutToggle.vue
  rootComponents: [LayoutToggle],

  /**
   * 状态栏颜色跟随主题。
   *
   * - 无 JS 时：`config.ts` 里两条带 `media` 的 theme-color 按系统偏好生效
   * - 站点内手动切换主题时：hope 会改 `<html data-theme>`，这里在 document
   *   末尾维护一条**没有 media** 的 theme-color —— 浏览器取最后一条匹配的，
   *   于是它总能盖住系统那两条。
   */
  setup() {
    if (typeof document === 'undefined') return

    /**
     * 一次性清掉旧版图片缓存。
     *
     * 之前的 `images` 路由按 `destination === 'image'` 匹配，跨域图落进
     * CacheStorage 时是 **opaque** 响应，而浏览器会给 opaque 加随机填充：
     * 实测一张 39KB 的图占 **6.02MB** 配额，翻几页就是几个 GB。新路由改成
     * CORS 取图（见 `theme.ts`），但**旧条目还在缓存里**，不清要等 90 天
     * 过期或读者自己去设置页清。这里只跑一次（标记落 localStorage），
     * 代价是图片下次访问重新下载一遍。
     */
    try {
      if ('caches' in window && !localStorage.getItem(IMG_CACHE_RESET)) {
        void caches
          .delete('images')
          .catch(() => {
            /* 删不掉也不影响功能 */
          })
          .finally(() => {
            try {
              localStorage.setItem(IMG_CACHE_RESET, '1')
            } catch {
              /* 隐私模式：下次再试，删除本身没有副作用 */
            }
          })
      }
    } catch {
      /* localStorage 不可用（隐私模式）：跳过这次迁移 */
    }

    const COLORS = {light: '#ffffff', dark: '#1b1b1f'}
    let dynamic = [...document.querySelectorAll('meta[name="theme-color"]')].find(
      (el) => !el.hasAttribute('media'),
    )
    if (!dynamic) {
      dynamic = document.createElement('meta')
      dynamic.setAttribute('name', 'theme-color')
      document.head.appendChild(dynamic)
    }

    const apply = (): void => {
      const root = document.documentElement
      const attr = root.getAttribute('data-theme')
      // data-theme 还没贴上来时（首屏 hydration 之前）按系统偏好兜底
      const dark = attr
        ? attr === 'dark' || root.classList.contains('dark')
        : window.matchMedia('(prefers-color-scheme: dark)').matches
      dynamic!.setAttribute('content', dark ? COLORS.dark : COLORS.light)
    }

    apply()
    new MutationObserver(apply).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })

    /**
     * 安装版 PWA 回到前台时主动查一次 service worker 更新。
     *
     * 浏览器只在**整页导航**时去检查 service worker 是否有新版本，而站内
     * 跳转全是 SPA；安装版 PWA 又常常从后台直接恢复，几天不做一次整页导航。
     * 于是新部署在这类客户端上可能很久都发现不了 —— 一直跑旧外壳，页面
     * chunk 一旦被新部署删掉，站内跳转就开始「卡住」。
     *
     * 两项节流都是必要的：
     * - **时间戳落 localStorage**：原先 `lastCheck` 是模块内变量，每次整页
     *   加载都从 0 开始，等于**每次打开 PWA 都会查一次**；
     * - **前 30 秒不查**：冷启动这一段主线程还在解析 2.3MB 外壳，`update()`
     *   一旦发现新版本就去下载约 3.9MB 预缓存，正好和首屏抢带宽 —— 这也
     *   是「刚打开时慢、过一会儿正常」的一部分。浏览器自己在整页导航时
     *   已经查过一次，这里补的是「几天不整页导航」的 SPA 会话。
     *
     * 查到新版本后由插件自带的「新内容已就绪」按钮负责 skipWaiting + 重载
     * （`update: 'available'`）。
     */
    if ('serviceWorker' in navigator) {
      const CHECK_KEY = 'hanphone:sw-check-at'
      const CHECK_INTERVAL = 30 * 60 * 1000
      /** 冷启动后先让外壳忙完 */
      const FIRST_CHECK_DELAY = 30 * 1000
      const lastCheck = (): number => {
        try {
          return Number(localStorage.getItem(CHECK_KEY) ?? 0)
        } catch {
          /* 隐私模式下 localStorage 可能不可用：退化成不节流 */
          return 0
        }
      }
      const checkUpdate = (): void => {
        if (document.visibilityState !== 'visible') return
        if (performance.now() < FIRST_CHECK_DELAY) return
        const now = Date.now()
        if (now - lastCheck() < CHECK_INTERVAL) return
        try {
          localStorage.setItem(CHECK_KEY, String(now))
        } catch {
          /* 同上 */
        }
        navigator.serviceWorker
          .getRegistration()
          .then((registration) => registration?.update())
          .catch(() => {
            /* 离线或 SW 还没注册：下一次回到前台再试 */
          })
      }
      setTimeout(checkUpdate, FIRST_CHECK_DELAY + 1000)
      document.addEventListener('visibilitychange', checkUpdate)
    }

    /**
     * 让浏览器尽量别回收 CacheStorage。
     *
     * 全站离线包有 160MB，但 CacheStorage 默认是 **best-effort**：磁盘紧张
     * 或长时间不用，浏览器可以整桶清掉。清掉之后「已经缓存过的页面」又要
     * 一页一页重新走网络，表现和「暖机」一模一样。
     *
     * 只在**安装版**里自动申请：桌面 Chrome 会按参与度静默授予，Firefox
     * 则会弹权限框，网页里不该无端弹它（设置页有手动按钮）。申请失败也
     * 不影响任何功能，所以吞掉异常。
     */
    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      navigator.storage?.persist?.().catch(() => {
        /* 被拒绝就维持 best-effort */
      })
    }
  },
})
