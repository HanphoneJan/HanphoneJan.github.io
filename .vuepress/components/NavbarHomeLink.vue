<template>
  <span class="navbar-home-anchor" aria-hidden="true"></span>
</template>

<script setup lang="ts">
/**
 * 导航栏右侧的「个人主页」图标链接。
 *
 * hope 的 navbar 配置只接受文字链接（图标要走 iconify，构建期要联网），
 * 而这里想要的是和 GitHub 仓库图标完全一样的样式，所以在导航栏挂载后
 * 往 `.vp-navbar-end` 里插一个 `<a>`：无需 SSR、无额外依赖、样式与
 * `.vp-action-link` 一致。
 */
import { onMounted } from 'vue'

const HOME_URL = 'https://hanphone.cn'
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`

const inject = (): void => {
  if (typeof document === 'undefined') return
  const end = document.querySelector('#navbar .vp-navbar-end')
  if (!end || end.querySelector('.navbar-home-icon')) return

  const link = document.createElement('a')
  link.className = 'vp-action-link navbar-home-icon'
  link.href = HOME_URL
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.title = '个人主页'
  link.setAttribute('aria-label', '个人主页')
  link.innerHTML = ICON
  end.prepend(link)
}

onMounted(inject)
</script>
