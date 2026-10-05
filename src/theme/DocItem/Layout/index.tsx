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
import {PyRunnerScopeProvider} from '@site/src/components/training/pyrunner/scope';
import InlineVisualizer from '@site/src/components/training/visualizer/InlineVisualizer';
import {
  VIS_ANCHOR,
  VIS_TITLE,
} from '@site/src/components/training/visualizer/InlineVisualizer';
import InlineTracerSection, {
  tracerAnchorId,
} from '@site/src/components/training/visualizer/InlineTracerVisualizer';
import {placementsOf} from '@site/src/components/training/visualizer/inlinePlacement';
import type {SelfTestData} from '@site/plugins/self-test';
import type {PySamplesData} from '@site/plugins/py-samples';
import type {VisTracesData} from '@site/plugins/vis-traces';

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

  // 浏览器内跑代码：不在页面末尾渲染任何东西（那正是我们要消除的割裂感），
  // 而是把「这篇题解的 md 路径」交给正文里的每个代码块，
  // 由 @theme/CodeBlock/Layout 决定要不要给某个块挂运行条。
  // 详见 src/components/training/pyrunner/scope.tsx。
  const pyEntries = (
    usePluginData('py-samples') as unknown as PySamplesData | undefined
  )?.entries;
  const inPyRunnerScope = Boolean(selfTestKeyValue && pyEntries?.[selfTestKeyValue]);

  // 录制式可视化：清单在 globalData，帧数据在 static/traces/<name>.json，
  // 由 InlineVisualizer 在读者点开时才 fetch（见 vis-traces 插件的文件头）。
  const visTrace = selfTestKeyValue
    ? (usePluginData('vis-traces') as unknown as VisTracesData | undefined)?.entries.find(
        (e) => e.docId === selfTestKeyValue,
      )
    : undefined;
  // 模式 / 模板 / 数据结构这些**非题解**文档内嵌手写 tracer。
  //
  // 与录制式是两条完全不同的路：这些文档没有「一道题 + 一组样例」，
  // 录不了；而它们讲的正是滑动窗口、二分、排序这些**模式本身** ——
  // 手写 tracer 演示的就是模式。放置表见 inlinePlacement.ts。
  const tracerPlacements = placementsOf(selfTestKeyValue);

  // 录到了轨迹、但没有 adapter 认识的题解：显式说明，别让读者以为
  // 「这道题没有可视化步骤」是因为它不值得。理由见插件里的 VisTracesData。
  const visNoSteps = selfTestKeyValue
    ? (usePluginData('vis-traces') as unknown as VisTracesData | undefined)?.noVisual.includes(
        selfTestKeyValue,
      )
    : false;

  // 「自测」与「可视化」都渲染在正文之外（</DocItemContent> 之后），
  // 构建期的 TOC 抓不到它们。这里显式补，桌面侧边栏与移动端折叠菜单都会出现。
  // Provider 必须包住**整个 row** —— 桌面侧边栏是 docItemContainer 的兄弟节点。
  const extraToc = [
    ...(visTrace ? [{id: VIS_ANCHOR, value: VIS_TITLE, level: 2}] : []),
    // 多个播放器时只给第一个进 TOC：十个小节会把侧边栏撑爆，
    // 而 md 里那个 `## 算法可视化` 标题已经在 TOC 里了（那才是入口）
    ...(tracerPlacements.length > 0
      ? [
          {
            id: tracerAnchorId(tracerPlacements[0].tracerId),
            value: '算法可视化',
            level: 2,
          },
        ]
      : []),
    ...(hasSelfTest ? [{id: SELF_TEST_ANCHOR, value: SELF_TEST_TITLE, level: 2}] : []),
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
            {inPyRunnerScope && selfTestKeyValue ? (
              <PyRunnerScopeProvider docId={selfTestKeyValue}>
                <DocItemContent>{children}</DocItemContent>
              </PyRunnerScopeProvider>
            ) : (
              <DocItemContent>{children}</DocItemContent>
            )}
            {visTrace && (
              <InlineVisualizer entry={visTrace} />
            )}
            {tracerPlacements.length > 0 && (
              <InlineTracerSection placements={tracerPlacements} />
            )}
            {visNoSteps && (
              <p
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  borderLeft: '3px solid var(--ifm-color-emphasis-300)',
                  background: 'var(--ifm-color-emphasis-100)',
                  borderRadius: '4px',
                  color: 'var(--ifm-color-emphasis-800)',
                  fontSize: '0.9rem',
                }}
              >
                本题无可视化步骤：代码里没有可逐帧展示的过程（执行轨迹已经录下来，
                但局部变量里找不到推进中的中间状态 —— 比如全篇就是一次正则替换或一次切片）。
              </p>
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
