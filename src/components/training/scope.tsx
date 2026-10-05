/**
 * 题解页面作用域：把「当前这篇 md 是哪一篇」交给页面里任意深度的组件。
 *
 * 运行条挂在 `@theme/CodeBlock/Layout` 上、录制式播放器挂在
 * `@theme/MDXComponents` 的 `h2` 上（都在全站共用的官方接缝上），
 * 而 `useDoc()` 在非 docs 页会 throw（`ReactContextError: DocProvider`）——
 * stars/projects 页 Markdown 里的代码块与标题都会经过它们，那些页面会直接白屏。
 *
 * 所以自己开一个 Context，由已经 swizzle 过的 `DocItem/Layout` 提供值，
 * 没提供就当作「不在题解页」，安静地什么都不渲染。
 */

import React, {createContext, useContext, type ReactNode} from 'react';

/**
 * code-training/docs 下的 md 相对路径，如
 * `problems/leetcode/0001_two_sum.md`
 */
export type TrainingDocId = string;

export interface TrainingDocScope {
  docId: TrainingDocId;
}

const ScopeContext = createContext<TrainingDocScope | null>(null);

export function TrainingDocScopeProvider({
  docId,
  children,
}: {
  docId: TrainingDocId;
  children: ReactNode;
}): ReactNode {
  return (
    <ScopeContext.Provider value={{docId}}>{children}</ScopeContext.Provider>
  );
}

export function useTrainingDocScope(): TrainingDocScope | null {
  return useContext(ScopeContext);
}