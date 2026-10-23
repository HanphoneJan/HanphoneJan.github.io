import React, { type ReactNode } from 'react'

/** `@docusaurus/BrowserOnly` 的替身：挂载时一定在浏览器里 */
export default function BrowserOnly({
  children,
}: {
  children?: () => ReactNode
}): React.ReactElement | null {
  return <>{children?.() ?? null}</>
}
