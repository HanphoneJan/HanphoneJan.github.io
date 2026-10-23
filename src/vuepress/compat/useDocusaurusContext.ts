/** `@docusaurus/useDocusaurusContext` 的替身 */
export default function useDocusaurusContext(): {
  siteConfig: { title: string; tagline: string; url: string; baseUrl: string }
} {
  return {
    siteConfig: {
      title: '寒枫的开荒地',
      tagline: '技术文档与算法训练场',
      url: 'https://docs.hanphone.cn',
      baseUrl: '/',
    },
  }
}
