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
 * 这些组件由 markdown-it 直接写进页面 token 流（见 plugins/training.ts），
 * 所以必须**全局注册** —— 页面模板里没有 import 语句可写。
 */
export default defineClientConfig({
  enhance({ app }) {
    app.component('SelfTestMount', SelfTestMount)
    app.component('PatternGraphMount', PatternGraphMount)
    app.component('RecordedVisualizerMount', RecordedVisualizerMount)
    app.component('NoVisStepsMount', NoVisStepsMount)
    app.component('SnippetBarMount', SnippetBarMount)
    app.component('TracerVisualizerMount', TracerVisualizerMount)
    app.component('StarsMount', StarsMount)
    app.component('ProjectsMount', ProjectsMount)
    app.component('HomePage', HomePage)
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
  },
})
