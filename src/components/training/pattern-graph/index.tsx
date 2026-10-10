import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {
  PatternGraphData,
  PatternProblem,
} from '@site/plugins/pattern-graph';
import styles from './styles.module.css';

/**
 * 算法模式页末尾的「相关题目」列表。
 *
 * ## 为什么渲染在正文之外
 *
 * 与自测、手写 tracer 同一个接缝（`DocItem/Layout` 的 `</DocItemContent>` 之后）：
 * 这批文档走 `markdown.format: 'detect'`，md 里写 JSX 会被小写成 HTML 标签
 * （见 AGENTS.md「算法可视化挂在哪」），所以组件只能挂在已 swizzle 的布局里。
 * 数据来自构建期插件 `pattern-graph` 的 globalData，md 一行都不用改。
 *
 * ## 为什么标题用显式 id
 *
 * TOC 是构建期从 mdast 抽的，这个组件不在 mdast 里，得由
 * `DocItem/Layout` 通过 `ExtraTocProvider` 补一条 —— 两边用同一个显式 id，
 * 不去猜 `@theme/Heading` 对中文标题生成的 slug。
 */
export const RELATED_ANCHOR = 'related-problems';

export const RELATED_TITLE = '相关题目';

const DIFF_GROUPS: Array<{label: string; test: RegExp}> = [
  {label: '简单', test: /简单|Easy/i},
  {label: '中等', test: /中等|Medium/i},
  {label: '困难', test: /困难|Hard/i},
];

function groupOf(p: PatternProblem): string {
  for (const g of DIFF_GROUPS) {
    if (g.test.test(p.difficulty)) {
      return g.label;
    }
  }
  return '其它';
}

export default function RelatedProblems({
  docId,
}: {
  /** 当前文档的 docId（md 相对 code-training/docs 的路径） */
  docId: string;
}): ReactNode {
  const data = usePluginData('pattern-graph') as PatternGraphData | undefined;
  const items = data?.byPattern?.[docId] ?? [];
  if (items.length === 0) {
    return null;
  }

  const groups = new Map<string, PatternProblem[]>();
  for (const item of items) {
    const label = groupOf(item);
    const list = groups.get(label);
    if (list) {
      list.push(item);
    } else {
      groups.set(label, [item]);
    }
  }

  const order = ['简单', '中等', '困难', '其它'];

  return (
    <section className={styles.section}>
      <Heading as="h2" id={RELATED_ANCHOR}>
        {RELATED_TITLE}
      </Heading>
      <p className={styles.hint}>
        下面这些题解的 <code>tags</code> 命中本模式，共 {items.length} 道，
        按难度排列，点进去可以直接做。
      </p>
      {order
        .filter((label) => groups.has(label))
        .map((label) => (
          <div key={label} className={styles.group}>
            <h3 className={styles.groupTitle}>{label}</h3>
            <ul className={styles.list}>
              {groups.get(label)!.map((p) => (
                <li key={p.permalink} className={styles.item}>
                  <Link to={p.permalink}>{p.title}</Link>
                  {p.platform && (
                    <span className={styles.platform}>{p.platform}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
