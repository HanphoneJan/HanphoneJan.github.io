<template>
  <div ref="host" class="home-mount"></div>
</template>

<script setup lang="ts">
/**
 * 首页沿用迁移前 Docusaurus 站点的那套设计（`src/pages/index.tsx` + CSS Module）。
 *
 * 这里只做一件事：把 React 页面挂到一个不受正文宽度限制的容器里。
 * 主题的 hero 被 CSS 隐藏（`.vp-project-home .vp-hero-info-wrapper`），
 * 因为旧首页自带 hero。
 */
import { useReactMount } from './useReactMount'

const host = useReactMount(
  () => import('../../src/pages/index.tsx'),
  () => ({}),
)
</script>
