/**
 * `@docusaurus/theme-common` 的替身。
 *
 * 只有 `useWindowSize` 被旧组件用到（且已在迁移中去掉该用法）。
 * 保留是为了让存量组件的导入不报错。
 */
export function useWindowSize(): 'desktop' | 'mobile' | 'ssr' {
  return 'desktop'
}

export function useColorMode(): { colorMode: 'light' | 'dark'; setColorMode: () => void } {
  return { colorMode: 'dark', setColorMode: () => {} }
}
