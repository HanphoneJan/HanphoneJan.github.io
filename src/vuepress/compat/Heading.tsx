import React, { type HTMLAttributes, type ReactNode } from 'react'

/** `@theme/Heading` 的替身：`<Heading as="h2">` -> `<h2>` */
export default function Heading({
  as: Tag = 'h2',
  children,
  ...rest
}: {
  as?: keyof React.JSX.IntrinsicElements
  children?: ReactNode
} & HTMLAttributes<HTMLElement>): React.ReactElement {
  return React.createElement(Tag, rest, children)
}
