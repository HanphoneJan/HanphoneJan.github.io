<template>
  <div class="vp-nav-item vp-action navbar-util-item navbar-settings-item">
    <a
      class="vp-action-link navbar-settings-icon"
      href="/settings.html"
      title="缓存与离线"
      aria-label="缓存与离线"
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
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
/**
 * 导航栏右侧的「缓存与离线」图标链接（齿轮），指向 `/settings.html`。
 *
 * 渲染方式与 `NavbarHomeLink.vue` 相同（`navbarLayout.end` 里的一项，见
 * `theme.ts` / `client.ts`），不要再改回在 `onMounted` 里往 DOM 里插节点 ——
 * 那样在归档页那种 Blog 布局与默认布局之间切换时会被重挂的 Navbar 丢掉。
 *
 * 站内链接必须带 `.html`（`/settings` 不会命中 VuePress 路由，
 * 会退化成整页导航，见首页那批链接踩过的坑）。
 */
</script>
