<template>
  <span class="navbar-home-anchor" aria-hidden="true"></span>
</template>

<script setup lang="ts">
/**
 * 导航栏右侧的图标链接：「个人主页」与「缓存与离线」。
 *
 * hope 的 navbar 配置只接受文字链接（图标要走 iconify，构建期要联网），
 * 而这里想要和 GitHub 仓库图标**完全一样**的样式：所以不自己写尺寸，
 * 而是按主题 `RepoLink` 的结构插一个
 *   <div class="vp-nav-item vp-action"><a class="vp-action-link">…</a></div>
 * —— `.vp-action-link` 负责 padding/颜色/行高，SVG 统一 1.25rem。
 *
 * 顺序：个人主页在前，设置在后（都在 GitHub 仓库图标左侧）。
 * 站内链接必须带 `.html`（`/settings` 不会命中 VuePress 路由，
 * 会退化成整页导航，见首页那批链接踩过的坑）。
 */
import { onMounted } from 'vue'

const HOME_URL = 'https://hanphone.cn'
const SETTINGS_URL = '/settings.html'

const HOME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.25rem;height:1.25rem;vertical-align:middle"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`

// 齿轮（缓存与离线）。用 stroke 画，避免 path 数据过长
const SETTINGS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.25rem;height:1.25rem;vertical-align:middle"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`

interface LinkOptions {
  /** 幂等标记：已经插过就跳过 */
  marker: string
  href: string
  title: string
  icon: string
  external?: boolean
}

const createItem = (options: LinkOptions): HTMLDivElement => {
  const item = document.createElement('div')
  item.className = `vp-nav-item vp-action ${options.marker}`

  const link = document.createElement('a')
  link.className = 'vp-action-link navbar-home-icon'
  link.href = options.href
  link.title = options.title
  link.setAttribute('aria-label', options.title)
  if (options.external) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  link.innerHTML = options.icon

  item.appendChild(link)
  return item
}

const inject = (): void => {
  if (typeof document === 'undefined') return
  const end = document.querySelector('#navbar .vp-navbar-end')
  if (!end) return

  // prepend 的顺序是反的：先插设置、再插个人主页，最终主页在前
  if (!end.querySelector('.navbar-settings-item')) {
    end.prepend(
      createItem({
        marker: 'navbar-settings-item navbar-util-item',
        href: SETTINGS_URL,
        title: '缓存与离线',
        icon: SETTINGS_ICON,
      }),
    )
  }
  if (!end.querySelector('.navbar-home-icon-item')) {
    end.prepend(
      createItem({
        marker: 'navbar-home-icon-item navbar-util-item',
        href: HOME_URL,
        title: '个人主页',
        icon: HOME_ICON,
        external: true,
      }),
    )
  }
}

onMounted(inject)
</script>
