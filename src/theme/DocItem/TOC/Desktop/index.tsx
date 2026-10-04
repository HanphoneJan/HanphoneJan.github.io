/**
 * Docusaurus 官方 DocItemTOCDesktop 的 swizzle（原件只有 14 行）。
 *
 * 与官方版的唯一差别：`toc` 后面接上了 `<DocItem/Layout>` 提供的追加条目，
 * 这样渲染在正文之外的「自测」小节也能出现在右侧导航里。
 *
 * 追加逻辑与取值方式见 `src/components/training/selftest/toc.tsx`。
 * 官方原版是 `{toc, frontMatter} = useDoc()`，本文件照抄，只多调一个 hook。
 */

import React, {type ReactNode} from 'react';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useTocWithExtra} from '@site/src/components/training/selftest/toc';

import TOC from '@theme/TOC';

export default function DocItemTOCDesktop(): ReactNode {
  const {toc, frontMatter} = useDoc();
  return (
    <TOC
      toc={useTocWithExtra(toc)}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={ThemeClassNames.docs.docTocDesktop}
    />
  );
}