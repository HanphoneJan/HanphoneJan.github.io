/**
 * `@docusaurus/useGlobalData` 的替身。
 *
 * 构建期由 `.vuepress/plugins/training.ts` 通过 Vite `define` 注入
 * `__SITE_DATA__`。注意 define 的值在产物里是**字符串字面量**
 * （`JSON.stringify` 的结果），不是对象 —— 直接 `__SITE_DATA__[name]`
 * 会静默得到 undefined，知识图谱就永远不渲染。这里解析一次并缓存。
 */
declare const __SITE_DATA__: string | Record<string, unknown> | undefined

let cache: Record<string, unknown> | undefined

function all(): Record<string, unknown> {
  if (cache) return cache
  if (typeof __SITE_DATA__ === 'string') {
    try {
      cache = JSON.parse(__SITE_DATA__) as Record<string, unknown>
    } catch {
      cache = {}
    }
  } else {
    cache = (__SITE_DATA__ as Record<string, unknown> | undefined) ?? {}
  }
  return cache
}

export function usePluginData<T = unknown>(name: string): T | undefined {
  return all()[name] as T | undefined
}

export default function useGlobalData(): Record<string, unknown> {
  return all()
}
