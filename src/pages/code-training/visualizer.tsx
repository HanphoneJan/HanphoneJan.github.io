import React, {useCallback, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AlgoPlayer from '@site/src/components/training/visualizer/AlgoPlayer';
import {
  INPUT_HINTS,
  TRACERS,
} from '@site/src/components/training/visualizer/tracers';
import styles from '@site/src/components/training/visualizer/styles.module.css';
import {useDocPermalink} from '@site/src/components/training/useDocPermalink';
import pageStyles from './styles.module.css';

/**
 * 算法可视化实验室。
 *
 * 页面上每个算法一个 AlgoPlayer。播放器的全部交互能力（播放/单步/回退/
 * 调速/换输入/源码高亮）由通用播放器提供 —— 新增算法只需在
 * `tracers/index.ts` 的 TRACERS 数组里加一行。
 */
export default function Playground(): React.ReactElement {
  const [activeId, setActiveId] = useState(TRACERS[0]?.id ?? '');
  const active = useMemo(
    () => TRACERS.find((t) => t.id === activeId) ?? TRACERS[0],
    [activeId],
  );

  const select = useCallback((id: string) => setActiveId(id), []);

  const hint = active ? INPUT_HINTS[active.id] : undefined;

  return (
    <Layout
      title="算法可视化"
      description="逐帧观看排序、二分、滑动窗口、动态规划的执行过程">
      <div className={pageStyles.page}>
        <header className={pageStyles.header}>
          <Heading as="h1" className={styles.title}>
            算法可视化
          </Heading>
          <p className={styles.desc}>
            逐帧观看算法执行。关键不是记住代码长什么样，而是看清
            <strong>每一步状态怎么变</strong> —— 尤其是双指针的区间收缩、
            排序的已确定边界、DP 表格的逐格填充。
          </p>
          <p className={pageStyles.note}>
            提示：快捷键 <kbd>空格</kbd> 播放/暂停，<kbd>←</kbd> <kbd>→</kbd>{' '}
            单步回退。每个算法下方可展开源码，高亮行对应当前步骤。
          </p>
        </header>

        <nav className={pageStyles.tabs} aria-label="算法列表">
          {TRACERS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                t.id === activeId ? pageStyles.tabActive : pageStyles.tab
              }
              onClick={() => select(t.id)}
              aria-current={t.id === activeId}>
              {t.title}
            </button>
          ))}
        </nav>

        {active && (
          <>
            <AlgoPlayer
              key={active.id}
              tracer={active}
              inputLabel={hint?.label}
              inputHint={hint?.hint}
            />

            {active.relatedDocId && (
              <p className={pageStyles.relate}>
                想看完整题解？{' '}
                <DocLink docId={active.relatedDocId} />
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/**
 * 题解链接。
 *
 * permalink 不能自己按文件名拼 —— Docusaurus 的 numberPrefixParser 会改写
 * docId（`0001_two_sum.md` → `1`、`sf_min_refuel_stops.md` → `sf-min-refuel-stops`）。
 * 这里通过 doc-permalinks 插件提供的映射表拿真实 permalink。
 */
function DocLink({docId}: {docId: string}): React.ReactElement | null {
  const permalink = useDocPermalink(docId);
  if (!permalink) {
    return (
      <span className={pageStyles.relateMissing}>
        （未找到题解链接：<code>{docId}</code>）
      </span>
    );
  }
  return (
    <Link className={pageStyles.relateLink} to={permalink}>
      {docId.replace(/\.md$/, '')}
    </Link>
  );
}