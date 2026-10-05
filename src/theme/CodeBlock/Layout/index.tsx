/**
 * Docusaurus 官方 CodeBlock/Layout 的 swizzle。
 *
 * 官方原版只有 30 行（Container / Title / Content / Buttons 四件事），
 * 这里加了一条：Python 代码块下方挂一条运行条。
 *
 * ## 为什么是这个文件
 *
 * 这是「代码块长什么样」的唯一收口。三个更省事的做法都试过/想过了：
 *
 * - **remark 插件把代码块换成自定义组件**：AGENTS.md 记过，手写进 mdast 的
 *   `mdxjsEsm` 节点不带 `data.estree` 会被 MDX 静默丢弃，126 篇 md 一行
 *   都不用改的代价是整页 SSR 挂掉。不值得。
 * - **客户端拿 DOM 反解源码**：Docusaurus 3.9 把代码拆成
 *   `<span class="token-line">` + `<br>`，textContent 拼不出源码，
 *   要自己处理换行。脏活。
 * - **官方接缝**：`useCodeBlockContext()` 直接给 `metadata.code`
 *   （已剥掉高亮注释的干净源码）与 `metadata.language`。不碰 DOM、不碰
 *   mdast、不碰 MDX。这是 `docusaurus-theme-live-codeblock` 用的同一个接缝。
 *
 * ## 录制式播放器为什么不也挂在这里
 *
 * 试过：把播放器挂到 `## 完整代码实现` 那个代码块下面，位置比挂在标题上更好看。
 * 但这个接缝只有 `metadata.code`，**挑不出「哪一块才是完整代码那一块」**：
 * 178 篇题解里有 3 篇在「解题思路」里抄了一遍一字不差的完整代码，
 * 而按「第几块一样的」去数又会栽在 Docusaurus 那个
 * `key={String(isBrowser)}` 的重挂上（每个代码块水合后都会重挂一次，
 * 计数器整体错位，服务端渲好的节点还会被 React 当成多余的删掉）。
 * 完整推导见 `src/theme/MDXComponents.tsx` 的文件头。
 *
 * ## 为什么每次运行还要 key={String(isBrowser)}
 *
 * 这不是我们加的，是官方 `CodeBlock/index.tsx` 的既有行为：SSR 时 Prism 用
 * 默认主题，主题切换后 React 不会重写 DOM 里的 style，必须重挂一次。
 * 原样保留，别"顺手优化"掉。
 */

import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import Container from '@theme/CodeBlock/Container';
import Title from '@theme/CodeBlock/Title';
import Content from '@theme/CodeBlock/Content';
import type {Props} from '@theme/CodeBlock/Layout';
import Buttons from '@theme/CodeBlock/Buttons';
import SnippetBar from '@site/src/components/training/pyrunner/SnippetBar';
import type {PySamplesData} from '@site/plugins/py-samples';
import {useTrainingDocScope} from '@site/src/components/training/scope';
import {usePluginData} from '@docusaurus/useGlobalData';

import styles from './styles.module.css';

export default function CodeBlockLayout({className}: Props): ReactNode {
  const {metadata} = useCodeBlockContext();
  const scope = useTrainingDocScope();
  const samples = usePluginData('py-samples') as unknown as
    | PySamplesData
    | undefined;
  const docEntry = scope ? samples?.entries[scope.docId] : undefined;

  // 只在「题解页 + 有抽取结果 + 语言是 python」时才挂运行条。
  // 片段类代码块（只有几行、没有可调用入口）在 SnippetBar 内部自己判定，
  // 那里拿得到具体源码，判定更准。
  const showBar = Boolean(
    docEntry && (metadata.language === 'python' || metadata.language === 'py'),
  );

  return (
    <Container as="div" className={clsx(className, metadata.className)}>
      {metadata.title && (
        <div className={styles.codeBlockTitle}>
          <Title>{metadata.title}</Title>
        </div>
      )}
      <div className={styles.codeBlockContent}>
        <Content />
        <Buttons />
      </div>
      {/*
        运行条放在 Container **里面**而不是外面：
        Container 上带着 --prism-background-color / --prism-color，
        塞进去就自动继承代码块的配色，深浅色零维护。
      */}
      {showBar && (
        <SnippetBar
          code={metadata.code}
          samples={docEntry.samples}
          stdinSamples={docEntry.stdinSamples}
          entryName={docEntry.method}
        />
      )}
    </Container>
  );
}