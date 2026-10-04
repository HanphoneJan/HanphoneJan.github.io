/**
 * 「自测」小节在右侧 TOC 里的条目。
 *
 * ## 为什么 TOC 要单独处理
 *
 * Docusaurus 的 TOC 是**构建期**从 markdown 的 mdast 抽标题得到的。
 * `SelfTest` 是渲染在 `</DocItemContent>` 之后的 React 组件（见
 * AGENTS.md：remark 注入 JSX 会被 MDX 静默丢弃），所以它的标题
 * 天然进不了 TOC。
 *
 * 试过用 remark 插件在正文末尾补一个真的 `## 标题` 节点 ——
 * 方向没错（那样 TOC 和锚点都是白送的），但 Docusaurus 3.9 的
 * `remarkPlugins` 走的是另一套归一化，自定义 remark 插件在
 * 本项目的构建里没被真正加载（工厂函数一次都没被调用），
 * 且会让 230 个页面的 SSG 在 `useDocTOC` 里读到 `undefined`。
 * 与其跟构建管线较劲，不如直接接管这两个 20 行的 TOC 组件。
 *
 * ## 锚点为什么写死
 *
 * `SelfTest` 里的 `<Heading id="selftest">` 是**显式 id**，
 * 所以这里的 TOC 条目用同一个 id，不需要去猜 `@theme/Heading`
 * 对中文标题生成的 slug（`自测 -- 主动回忆` 之类）。
 */

import {createContext, useContext} from 'react';

/** 与 SelfTest 里 `<Heading id=...>` 保持一致 */
export const SELF_TEST_ANCHOR = 'selftest';

export const SELF_TEST_TITLE = '自测';

/** TOC 条目的形状，与 Docusaurus 的 toc 元素一致 */
export interface TocEntry {
  id: string;
  value: string;
  level: number;
}

/**
 * `useDoc().toc` 是 readonly 的（`readonly TOCItem[]`），
 * 所以这里也用 readonly，只在拼接时新建一个数组。
 */
export type TocList = readonly TocEntry[];

const ExtraTocContext = createContext<TocList>([]);

/**
 * 由已 swizzle 的 DocItem/Layout 提供，告诉子树「这篇的 TOC 该追加什么」。
 *
 * 放在整个布局外层（而不是正文里），因为桌面侧边栏 TOC 是 DocItem 的
 * 兄弟节点，不在正文子树内。
 */
export function ExtraTocProvider({
  entries,
  children,
}: {
  entries: TocList;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <ExtraTocContext.Provider value={entries}>
      {children}
    </ExtraTocContext.Provider>
  );
}

/** 把追加项接到原有 toc 后面；没有追加项时原样返回，避免多余的重渲染 */
export function useTocWithExtra(toc: TocList | undefined): TocList {
  const extra = useContext(ExtraTocContext);
  if (extra.length === 0) {
    return toc ?? [];
  }
  return [...(toc ?? []), ...extra];
}