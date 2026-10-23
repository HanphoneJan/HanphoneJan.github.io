import React, { type ReactNode } from 'react'

/** `@theme/Layout` 的替身：页面骨架由 VuePress 主题负责，这里只透传内容 */
export default function Layout({
  children,
}: {
  children?: ReactNode
  title?: string
  description?: string
  [key: string]: unknown
}): React.ReactElement {
  return <>{children}</>
}
