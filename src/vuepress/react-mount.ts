import { createElement, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * 把一个 React 组件挂到 Vue 管着的 DOM 节点上。
 *
 * 站点的交互件（Pyodide 运行条、算法播放器、自测题）是 React 写的，而且
 * 核心逻辑（执行协议、trace adapter、题目校验）与框架无关 —— 只有渲染层
 * 是 React。与其为了换主题把几万行逻辑重写成 Vue，不如让它们原样跑在
 * 自己的 React root 里：Vue 负责页面骨架，React 负责这几个孤岛。
 *
 * 代价只有一处：这些区块**不在 SSR 产物里**（React 只在浏览器挂载），
 * 所以它们对 SEO 不可见。本来也都是「点开才算」的交互件，可以接受。
 */
export function mountReact(
  element: HTMLElement,
  Component: ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
): () => void {
  const root = createRoot(element)
  root.render(createElement(Component, props))
  return () => {
    // React 会在 unmount 时同步移除节点；推迟到微任务，
    // 避免在 Vue 的 patch 过程中改动同一个父节点。
    queueMicrotask(() => root.unmount())
  }
}

/** base64 -> UTF-8 字符串（构建期注入的 props 都是 base64，避免引号地狱） */
export function decodeBase64(value: string | undefined): string {
  if (!value) return ''
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJson<T>(value: string | undefined): T | undefined {
  const text = decodeBase64(value)
  if (!text) return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}
