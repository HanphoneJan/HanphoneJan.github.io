/**
 * `@docusaurus/useGlobalData` 的替身。
 *
 * 构建期由 `.vuepress/plugins/training.ts` 通过 Vite `define` 注入
 * `__SITE_DATA__`（只有「模式 -> 相关题目」这一张表，几十 KB）。
 */
declare const __SITE_DATA__: Record<string, unknown>

export function usePluginData<T = unknown>(name: string): T | undefined {
  return (__SITE_DATA__ ?? {})[name] as T | undefined
}

export default function useGlobalData(): Record<string, unknown> {
  return __SITE_DATA__ ?? {}
}
