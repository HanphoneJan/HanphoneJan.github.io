<template>
  <button
    class="layout-toggle-btn"
    :class="{'is-hidden': isHidden}"
    :title="isHidden ? '退出沉浸阅读' : '沉浸阅读'"
    :aria-pressed="isHidden"
    aria-label="沉浸阅读模式"
    @click="toggle"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        v-if="!isHidden"
        d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
      />
      <path
        v-else
        d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
      />
    </svg>
    <span class="btn-text">{{ isHidden ? '退出沉浸' : '沉浸阅读' }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * 沉浸阅读模式（对齐 JavaGuide 的 LayoutToggle）。
 *
 * 点一下给 `<html>` 加 `layout-hidden`：导航栏、左侧边栏、右侧目录全部
 * 淡出，正文加宽居中；再点一下恢复。状态存 localStorage，并在
 * `.vuepress/config.ts` 的 head 里有一段**首屏前**的脚本提前加上 class，
 * 避免每次刷新都先闪一下导航栏。
 *
 * 为什么不用 hope 的 `focus`：那是「滚动进正文后自动隐藏」，
 * 读者没法主动退出/进入。这里要的是 JavaGuide 那种明确的开关。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageData } from 'vuepress/client'

const STORAGE_KEY = 'hanphone-layout-hidden'
const SITE_TITLE = '寒枫的开荒地'
const IMMERSIVE_TITLE = `${SITE_TITLE} - 沉浸式阅读中`

const isHidden = ref(false)
const pageData = usePageData()

const normalTitle = (): string => {
  const title = pageData.value.title
  return title ? `${title} | ${SITE_TITLE}` : SITE_TITLE
}

const applyTitle = (): void => {
  if (typeof document === 'undefined') return
  document.title = isHidden.value ? IMMERSIVE_TITLE : normalTitle()
}

const apply = (hidden: boolean): void => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('layout-hidden', hidden)
  applyTitle()
}

const toggle = (): void => {
  isHidden.value = !isHidden.value
}

watch(isHidden, (hidden) => {
  apply(hidden)
  try {
    localStorage.setItem(STORAGE_KEY, String(hidden))
  } catch {
    /* 隐私模式禁写 localStorage 时忽略 */
  }
})

// 路由切换后 hope 会重写 document.title，沉浸状态要保持
watch(
  () => pageData.value.path,
  async () => {
    if (!isHidden.value) return
    await nextTick()
    document.title = IMMERSIVE_TITLE
  },
)

// 移动端不提供沉浸模式（侧栏是抽屉，隐藏后没有入口）。
// 桌面端存下的状态如果带到窄屏，会把导航整条藏掉且没有按钮可退，
// 所以窄屏下直接退出沉浸。
const DESKTOP = 960

const onResize = (): void => {
  if (window.innerWidth < DESKTOP && isHidden.value) {
    isHidden.value = false
  }
}

onMounted(() => {
  try {
    isHidden.value =
      window.innerWidth >= DESKTOP &&
      localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    isHidden.value = false
  }
  // 首屏脚本已经加过 class 了，这里只同步按钮状态与标题
  apply(isHidden.value)
  window.addEventListener('resize', onResize, {passive: true})
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.layout-toggle-btn {
  position: fixed;
  right: 20px;
  bottom: 22px;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  font-family: var(--vp-font);
  font-size: 13px;
  color: var(--vp-c-text);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease,
    transform 0.25s ease;
}

.layout-toggle-btn:hover {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
  transform: translateY(-1px);
}

.layout-toggle-btn.is-hidden {
  color: #fff;
  background: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.layout-toggle-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.btn-text {
  font-weight: 500;
}

/* 移动端侧栏是抽屉式，隐藏后会没有入口，直接不显示按钮 */
@media (max-width: 959px) {
  .layout-toggle-btn {
    display: none;
  }
}
</style>
