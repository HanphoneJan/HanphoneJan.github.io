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
import {
  ExtraTocProvider,
  SELF_TEST_ANCHOR,
  SELF_TEST_TITLE,
} from '@site/src/components/training/selftest/toc';
import {TrainingDocScopeProvider} from '@site/src/components/training/scope';
import InlineTracerSection from '@site/src/components/training/visualizer/InlineTracerVisualizer';
import {placementsOf} from '@site/src/components/training/visualizer/inlinePlacement';
import RelatedProblems, {
  RELATED_ANCHOR,
  RELATED_TITLE,
} from '@site/src/components/training/pattern-graph';
import type {SelfTestData} from '@site/plugins/self-test';
import type {PatternGraphData} from '@site/plugins/pattern-graph';

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

  /**
   * 运行条挂在正文里的代码块上（`CodeBlock/Layout`）、录制式播放器挂在
   * 「完整代码实现」那一节的标题下面（`MDXComponents` 的 `h2`），
   * 所以页面作用域对**所有** code-training 文档都要给，不只是有样例的那些。
   * 某个块要不要挂运行条 / 播放器，由那两个接缝自己判定。
   *
   * 手写 tracer 内嵌在模式 / 模板 / 数据结构文档里。
   *
   * 与录制式是两条完全不同的路：这些文档没有「一道题 + 一组样例」，录不了；
   * 而它们讲的正是滑动窗口、二分、排序这些**模式本身** —— 手写 tracer
   * 演示的就是模式。放置表见 inlinePlacement.ts。
   *
   * 播放器渲染在 `## 算法可视化` 小节之后（那个小节是文档正文的一部分），
   * 所以 TOC 里不需要再补一条 —— 小节标题自己就在导航里。
   */
  const tracerPlacements = placementsOf(selfTestKeyValue);

  /**
   * 知识图谱：算法模式文档末尾列出「相关题目」。
   *
   * 数据来自构建期插件 `pattern-graph`（题解 frontmatter 的 `patterns`
   * 反向索引）。没有相关题目的模式文档不渲染，也不占 TOC 一条。
   */
  const patternGraph = usePluginData('pattern-graph') as unknown as
    | PatternGraphData
    | undefined;
  const hasRelated = Boolean(
    selfTestKeyValue && patternGraph?.byPattern?.[selfTestKeyValue]?.length,
  );

  // 「自测」渲染在正文之外（</DocItemContent> 之后），构建期的 TOC 抓不到它。
  // 这里显式补，桌面侧边栏与移动端折叠菜单都会出现。
  // Provider 必须包住**整个 row** —— 桌面侧边栏是 docItemContainer 的兄弟节点。
  const extraToc = [
    ...(hasRelated
      ? [{id: RELATED_ANCHOR, value: RELATED_TITLE, level: 2}]
      : []),
    ...(hasSelfTest
      ? [{id: SELF_TEST_ANCHOR, value: SELF_TEST_TITLE, level: 2}]
      : []),
  ];

  return (
    <ExtraTocProvider entries={extraToc}>
    <div className="row">
      <div className={clsx('col', !docTOC.hidden && styles.docItemCol)}>
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className={styles.docItemContainer}>
          <article>
            <DocBreadcrumbs />
            <DocVersionBadge />
            {docTOC.mobile}
            {selfTestKeyValue ? (
              <TrainingDocScopeProvider docId={selfTestKeyValue}>
                <DocItemContent>{children}</DocItemContent>
              </TrainingDocScopeProvider>
            ) : (
              <DocItemContent>{children}</DocItemContent>
            )}
            {tracerPlacements.length > 0 && (
              <InlineTracerSection placements={tracerPlacements} />
            )}
            {hasRelated && selfTestKeyValue && (
              <RelatedProblems docId={selfTestKeyValue} />
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
    </ExtraTocProvider>
  );
}