/**
 * `@docusaurus/useBaseUrl` 的替身。
 *
 * 站点部署在域名根目录（base = `/`），所以原样返回即可。
 */
export default function useBaseUrl(url: string): string {
  return url
}

export function useBaseUrlUtils(): { withBase: (url: string) => string } {
  return { withBase: (url: string) => url }
}
