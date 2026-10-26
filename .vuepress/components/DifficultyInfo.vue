<template>
  <span
    v-if="info"
    class="page-difficulty-info"
    :data-level="info.level"
    :aria-label="`难度：${info.label}`"
    :title="`难度：${info.label}`"
  >
    <svg
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="2.5" y="15" width="4.6" height="6" rx="1" :class="{ on: bars >= 1 }" />
      <rect x="9.7" y="9.5" width="4.6" height="11.5" rx="1" :class="{ on: bars >= 2 }" />
      <rect x="16.9" y="4" width="4.6" height="17" rx="1" :class="{ on: bars >= 3 }" />
    </svg>
    <span>{{ info.label }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 页面信息行 `.page-info` 里的难度徽标（日期 · 分类 · **难度** · 标签 · 字数 · 阅读时间）。
 *
 * ## 为什么能插进那一行
 *
 * hope 的 `PageInfo` 不是写死几条，它对每一项做
 * `resolveComponent(\`${item}Info\`)`（见 `vuepress-theme-hope` 的
 * PageInfo.ts）。所以只要把这个组件**全局注册**成 `DifficultyInfo`，
 * 再在 `theme.ts` 的 `pageInfo` 里写一项 `'Difficulty'`，它就出现在
 * 日期、字数、阅读时间中间，样式自动继承 `.page-info > span`。
 *
 * 这么做的好处是**服务端渲染**：难度就在 HTML 里，不靠客户端脚本后插，
 * 首屏不闪、离线包/爬虫也看得到。
 *
 * ## 为什么只认 frontmatter
 *
 * 难度本来就是文档自己的属性，不在页面数据外再维护一张表：题解写
 * `difficulty`，算法模式 / 数据结构页写 `difficulty_range`（区间），
 * 由 `pageDifficulty` 一起认。机器学习、复习系统那些页两个字段都没有，
 * 组件就什么都不渲染 —— 不需要在配置里列白名单。
 *
 * `inheritAttrs: false` 是必须的：`PageInfo` 会把 `author` / `category` /
 * `date` 那一整包 props 透传下来，不关掉的话它们会变成根 `<span>` 上的
 * 属性（`author="[object Object]"`）。
 */
import { computed } from 'vue'
import { usePageFrontmatter } from 'vuepress/client'
import { pageDifficulty } from '../../src/components/training/difficulty'

defineOptions({ inheritAttrs: false })

const frontmatter = usePageFrontmatter<{
  difficulty?: unknown
  difficulty_range?: unknown
}>()

/**
 * 认不出来的值不显示：宁可没有这一项，也不要挂一个「未标注」。
 *
 * `pageDifficulty` 同时认 `difficulty`（题解）与 `difficulty_range`
 * （算法模式 / 数据结构页，写的是「这个模式覆盖哪些难度」），
 * 所以这个组件对两类页面都成立。
 */
const info = computed(() => {
  const parsed = pageDifficulty(frontmatter.value)
  return parsed.level === 'unknown' ? null : parsed
})

/** 信号条点亮几根：绿 1 根、黄 2 根、红 3 根。 */
const bars = computed(() =>
  info.value?.level === 'easy' ? 1 : info.value?.level === 'medium' ? 2 : 3,
)
</script>
