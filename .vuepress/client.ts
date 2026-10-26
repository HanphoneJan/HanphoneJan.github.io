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
import LayoutToggle from './components/LayoutToggle.vue'
import NavbarHomeLink from './components/NavbarHomeLink.vue'
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
const isChunkLoadError = (error: unknown): boolean =>
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  )

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
     * 根因（旧外壳为什么会一直存在）在 `.vuepress/theme.ts` 的
     * `generateSWConfig.directoryIndex`：预缓存曾经把 `/`（`start_url`）
     * 永久命中成首次安装时的 index.html。
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
  },
  // 沉浸阅读模式的悬浮按钮（桌面端），见 LayoutToggle.vue
  rootComponents: [LayoutToggle, NavbarHomeLink],

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
     * 30 分钟一次的节流是必要的：`registration.update()` 发现新版本会去下载
     * 约 2.5MB 的预缓存，不能让每次切回前台都来一遍。查到新版本后由插件
     * 自带的「新内容已就绪」按钮负责 skipWaiting + 重载（`update: 'available'`）。
     */
    if ('serviceWorker' in navigator) {
      let lastCheck = 0
      const checkUpdate = (): void => {
        if (document.visibilityState !== 'visible') return
        if (Date.now() - lastCheck < 30 * 60 * 1000) return
        lastCheck = Date.now()
        navigator.serviceWorker
          .getRegistration()
          .then((registration) => registration?.update())
          .catch(() => {
            /* 离线或 SW 还没注册：下一次回到前台再试 */
          })
      }
      document.addEventListener('visibilitychange', checkUpdate)
    }
  },
})
