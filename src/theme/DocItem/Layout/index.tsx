import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useWindowSize} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocVersionBanner from '@theme/DocVersionBanner';
import DocVersionBadge from '@theme/DocVersionBadge';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemContent from '@theme/DocItem/Content';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import ContentVisibility from '@theme/ContentVisibility';
import GiscusComments from '@site/src/components/GiscusComments';
import SelfTest from '@site/src/components/training/selftest';
import PyRunner from '@site/src/components/training/pyrunner';
import type {SelfTestData} from '@site/plugins/self-test';
import type {PySamplesData} from '@site/plugins/py-samples';

export interface Props {
  readonly children: ReactNode;
}

import styles from './styles.module.css';

/**
 * Decide if the toc should be rendered, on mobile or desktop viewports
 */
function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();

  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;

  const mobile = canRender ? <DocItemTOCMobile /> : undefined;

  const desktop =
    canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
      <DocItemTOCDesktop />
    ) : undefined;

  return {
    hidden,
    mobile,
    desktop,
  };
}

/**
 * metadata.source 形如 `@site/code-training/docs/problems/leetcode/0001_two_sum.md`，
 * 去掉前缀与 .md 后缀就是题库用的键。
 * 不能用 metadata.id：Docusaurus 的 numberPrefixParser 会把
 * `0001_two_sum.md` 的 id 改写成 `1`、`HJ48_xxx.md` 改写成 `HJ48`，规则不统一。
 */
function selfTestKey(source: string | undefined): string | undefined {
  if (!source) {
    return undefined;
  }
  const marker = '/code-training/docs/';
  const idx = source.indexOf(marker);
  return idx === -1 ? undefined : source.slice(idx + marker.length);
}

export default function DocItemLayout({children}: Props): ReactNode {
  const docTOC = useDocTOC();
  const {metadata, frontMatter} = useDoc();
  const hideComment = (frontMatter as Record<string, unknown>).hide_comment as boolean | undefined;

  // 题库里没有这篇的题就不渲染，避免空区块
  const selfTestDocIds = (
    usePluginData('self-test') as unknown as SelfTestData | undefined
  )?.docIds;
  const selfTestKeyValue = selfTestKey(metadata.source);
  const hasSelfTest = Boolean(
    selfTestKeyValue && selfTestDocIds?.includes(selfTestKeyValue),
  );

  // 浏览器内跑代码：题库里有这篇的代码才渲染
  const pyEntries = (
    usePluginData('py-samples') as unknown as PySamplesData | undefined
  )?.entries;
  const hasPyRunner = Boolean(selfTestKeyValue && pyEntries?.[selfTestKeyValue]);

  return (
    <div className="row">
      <div className={clsx('col', !docTOC.hidden && styles.docItemCol)}>
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className={styles.docItemContainer}>
          <article>
            <DocBreadcrumbs />
            <DocVersionBadge />
            {docTOC.mobile}
            <DocItemContent>{children}</DocItemContent>
            {hasPyRunner && selfTestKeyValue && (
              <PyRunner docId={selfTestKeyValue} />
            )}
            {hasSelfTest && selfTestKeyValue && (
              <SelfTest docId={selfTestKeyValue} />
            )}
            <DocItemFooter />
          </article>
          <DocItemPaginator />
          {!hideComment && (
            <div className={styles.docComments}>
              <GiscusComments />
            </div>
          )}
        </div>
      </div>
      {docTOC.desktop && <div className="col col--3">{docTOC.desktop}</div>}
    </div>
  );
}
