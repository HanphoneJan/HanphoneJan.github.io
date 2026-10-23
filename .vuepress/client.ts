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

import HomeMount from './components/HomeMount.vue'
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
    app.component('HomeMount', HomeMount)
  },
  // 沉浸阅读模式的悬浮按钮（桌面端），见 LayoutToggle.vue
  rootComponents: [LayoutToggle, NavbarHomeLink],
})
