/**
 * Docusaurus 官方 DocItemTOCMobile 的 swizzle（原件只有 24 行）。
 *
 * 与桌面版同一个理由：把渲染在正文之外的「自测」小节补进折叠式目录。
 * 移动端这个组件**必须 SSR**（样式里有 `.tocMobile { display: none }`），
 * 所以追加的条目在首屏就是全的。
 *
 * 见 `src/components/training/selftest/toc.tsx`。
 */

import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useTocWithExtra} from '@site/src/components/training/selftest/toc';

import TOCCollapsible from '@theme/TOCCollapsible';

import styles from './styles.module.css';

export default function DocItemTOCMobile(): ReactNode {
  const {toc, frontMatter} = useDoc();
  return (
    <TOCCollapsible
      toc={useTocWithExtra(toc)}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={clsx(ThemeClassNames.docs.docTocMobile, styles.tocMobile)}
    />
  );
}