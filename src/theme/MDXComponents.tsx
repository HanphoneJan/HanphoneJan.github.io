/**
 * 全站 MDX 组件映射（swizzle `@theme/MDXComponents`）。
 *
 * 官方默认映射见 `@theme-original/MDXComponents`，这里只改一处：
 * **`h2` 在标题下面接上录制式播放器**（当这一节的标题是 `完整代码实现`）。
 *
 * ## 为什么挂在标题上而不是代码块上
 *
 * 播放器是「这段完整代码的逐帧回放」，所以它要出现在**那一节里**。
 * 早先它渲染在 `</DocItemContent>` 之后（页面最底部），离代码隔着
 * 「示例推演 / 复杂度 / 易错点 / 相关题目 / 自测」好几节。
 *
 * 另一个候选接缝是 `@theme/CodeBlock/Layout`（运行条就挂在上面），
 * 但那条路**挑不出「哪一块才是完整代码那一块」**：
 *
 * - `useCodeBlockContext()` 只给 `metadata.code`，没有位置信息；
 * - 178 篇题解里有 3 篇（0009 / 0016 / 0028）在「解题思路」小节里抄了
 *   一字不差的完整代码，于是「源码相等」有两个解；
 * - 想按「第几块一样的」来分，就得在运行时数 —— 而 Docusaurus 的
 *   `CodeBlock/index.tsx` 带着 `key={String(isBrowser)}`：水合之后
 *   `useIsBrowser()` 由 false 翻成 true，**每个代码块都会重挂一次**，
 *   计数器于是整体错位。实测 182 篇里只有 50 篇挂上了播放器，
 *   而且水合时 React 会把服务端渲好的节点当成多余节点删掉。
 *
 * 标题是**天然唯一**的：178 篇题解的小节标题一字不差都是
 * `## 完整代码实现`（`plugins/py-samples` 抽样例时用的也是这一节），
 * 判据与录制器完全一致，且不受重挂影响。
 *
 * ## 为什么不进 TOC
 *
 * 播放器是这一节的一部分，那一节的标题本来就在右侧导航里。
 * 再补一条同名的「算法可视化」只是同一个位置上的第二个入口。
 */

import React, {type ReactNode} from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import MDXHeading from '@theme/MDXComponents/Heading';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useTrainingDocScope} from '@site/src/components/training/scope';
import InlineVisualizer from '@site/src/components/training/visualizer/InlineVisualizer';
import NoVisStepsNote from '@site/src/components/training/visualizer/NoVisStepsNote';
import type {VisTraceEntry, VisTracesData} from '@site/plugins/vis-traces';

/** 那一节的标题。与 `visualizer/canonicalCode.ts`、`plugins/py-samples` 同源 */
const FULL_CODE_HEADING = '完整代码实现';

/** 标题里的文字（可能是字符串，也可能被拆成数组） */
function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(headingText).join('');
  }
  return '';
}

interface HeadingProps {
  id?: string;
  children?: ReactNode;
}

function HeadingWithVisualizer(props: HeadingProps): ReactNode {
  const {children, id} = props;
  const scope = useTrainingDocScope();
  const docId = scope?.docId;
  const visData = usePluginData('vis-traces') as unknown as
    | VisTracesData
    | undefined;
  const entry: VisTraceEntry | undefined = docId
    ? visData?.entries.find((e) => e.docId === docId)
    : undefined;
  const noSteps = Boolean(docId && visData?.noVisual.includes(docId));

  /**
   * 两条判据任一命中即可：`id` 是 Docusaurus 生成的 slug，
   * 标题文字是原文。两条都在是因为 slug 规则（大小写/锚点字符）万一变了，
   * 原文那条仍然认得出来 —— 认不出来只是少一个播放器，不会把别人的页面搞坏。
   */
  const isFullCodeSection =
    id === FULL_CODE_HEADING || headingText(children).trim() === FULL_CODE_HEADING;

  return (
    <>
      <MDXHeading as="h2" {...props} />
      {isFullCodeSection && entry && <InlineVisualizer entry={entry} />}
      {isFullCodeSection && !entry && noSteps && <NoVisStepsNote />}
    </>
  );
}

export default {
  ...MDXComponents,
  h2: HeadingWithVisualizer,
};