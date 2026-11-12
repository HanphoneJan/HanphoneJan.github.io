<template>
  <div class="vp-nav-item vp-action navbar-util-item navbar-home-icon-item">
    <a
      class="vp-action-link navbar-home-icon"
      href="https://hanphone.cn"
      title="个人主页"
      aria-label="个人主页"
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        style="width: 1.25rem; height: 1.25rem; vertical-align: middle"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
/**
 * 导航栏右侧的「个人主页」图标链接。
 *
 * **这是一个 navbar 组件，不是 rootComponent。** 早期做法是在 `onMounted` 里
 * 用 `document.createElement` 插进 `#navbar .vp-navbar-end`，只在应用挂载那一刻
 * 插一次；而归档页（`/article/`、`/category/*`、`/tag/*`、`/timeline/`、`/star/`）
 * 用的是 hope 的 **Blog 布局**（`@theme-hope/layouts/blog/Blog`），默认布局是
 * `Layout` —— 两者是**不同的布局组件**，站内切过去会把整个 `MainLayout`
 * （连带 `Navbar`）卸载重挂，插进去的节点随之消失，React 那种根组件却不会
 * 重新 `onMounted`。表现就是「从归档页回首页，个人主页/设置两个图标不见了」，
 * 安装版 PWA 几天不整页重载时尤其明显。
 *
 * 现在改成 `theme.ts` 的 `navbarLayout.end` 里的一项（名字与组件注册名一致，
 * 见 `client.ts`），由 Navbar 用 `hasGlobalComponent` 解析后正常渲染：
 * 随布局走、SSR 就出现在 HTML 里（没有 JS 也点得到）、也不会被重挂删掉。
 */
</script>
