/**
 * `@docusaurus/plugin-content-docs/client` 的替身。
 *
 * 交互组件只用到了 `metadata.permalink`（自测题「回到题目」按钮）。
 * React 只在浏览器挂载，所以直接读 location 就是当前页地址。
 */
export function useDoc(): {
  metadata: { permalink: string; source: string; id: string }
  frontMatter: Record<string, unknown>
} {
  const permalink =
    typeof window === 'undefined' ? '/' : window.location.pathname
  return {
    metadata: { permalink, source: '', id: '' },
    frontMatter: {},
  }
}

export function useDocRouteBasePath(): string {
  return '/'
}
