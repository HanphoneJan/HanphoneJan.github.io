import React, { type AnchorHTMLAttributes, type ReactNode } from 'react'

/**
 * `@docusaurus/Link` 的最小替身：站内链接就是普通 `<a>`。
 *
 * 旧组件只用 `to` / `href` / `className` / `onClick`，没有用到客户端预取，
 * 所以不需要接 Vue Router —— 整页跳转对文档站没有差别。
 */
/**
 * 站内链接补 `.html`。
 *
 * VuePress 的路由是 `/docs.html`、`/code-training/category/题库.html`，
 * 旧组件里写的是 Docusaurus 时代的 `/docs`。GitHub Pages 会做无后缀解析，
 * 但本地 `pnpm serve`（python http.server）不会 —— 补上以后两边一致。
 */
function withHtml(target: string): string {
  if (!target.startsWith('/') || target.startsWith('//')) return target
  const match = /^([^?#]*)(.*)$/.exec(target)
  if (!match) return target
  const [, path, suffix] = match
  if (!path || path === '/' || /\.[a-z0-9]+$/i.test(path)) return target
  return `${path}.html${suffix}`
}

export default function Link({
  to,
  href,
  children,
  ...rest
}: {
  to?: string
  href?: string
  children?: ReactNode
} & AnchorHTMLAttributes<HTMLAnchorElement>): React.ReactElement {
  return (
    <a href={withHtml(to ?? href ?? '#')} {...rest}>
      {children}
    </a>
  )
}
