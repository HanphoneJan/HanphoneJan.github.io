/**
 * 题解页面作用域：把「当前这篇 md 是哪一篇」传给页面里任意深度的组件。
 *
 * ## 为什么不直接 useDoc()
 *
 * `@theme/CodeBlock/Layout` 是**全站**代码块共用的 —— docs/ 里的 Python 片段、
 * blog 正文里的代码块都会经过它。而 `useDoc()` 在非 docs 页会 throw
 * （`ReactContextError: DocProvider`），博客页会直接白屏。
 *
 * 自己开一个 Context，由已经 swizzle 过的 `DocItem/Layout` 提供值，
 * 没提供就当作「不在题解页」，安静地不渲染运行条。
 */

import React, {createContext, useContext, type ReactNode} from 'react';

/**
 * code-training/docs 下的 md 相对路径，如
 * `problems/leetcode/0001_two_sum.md`
 */
export type TrainingDocId = string;

interface PyRunnerScope {
  docId: TrainingDocId;
}

const ScopeContext = createContext<PyRunnerScope | null>(null);

export function PyRunnerScopeProvider({
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

export function usePyRunnerScope(): PyRunnerScope | null {
  return useContext(ScopeContext);
}