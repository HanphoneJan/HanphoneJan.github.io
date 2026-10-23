import React, { type AnchorHTMLAttributes, type ReactNode } from 'react'

/**
 * `@docusaurus/Link` 的最小替身：站内链接就是普通 `<a>`。
 *
 * 旧组件只用 `to` / `href` / `className` / `onClick`，没有用到客户端预取，
 * 所以不需要接 Vue Router —— 整页跳转对文档站没有差别。
 */
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
    <a href={to ?? href ?? '#'} {...rest}>
      {children}
    </a>
  )
}
