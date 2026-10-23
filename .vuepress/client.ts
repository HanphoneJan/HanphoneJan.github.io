// 站点自定义样式（Hope rc.110 不会自动加载 .vuepress/styles/index.scss，
// 必须在客户端入口显式 import）
import './styles/index.scss'

import { defineClientConfig } from 'vuepress/client'

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
  },
})
