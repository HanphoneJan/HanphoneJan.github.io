/**
 * 网格视图：用于岛屿数量、BFS 最短路这类「二维 + 访问标记」的问题。
 *
 * 额外渲染 queue（待访问集合），因为 BFS/DFS 的本质就是队列/栈的进出，
 * 只看格子状态看不出「为什么先访问这个」。
 */

import React from 'react';
import clsx from 'clsx';
import styles from '../styles.module.css';
import type {GridFrame as GridFrameData} from '../types';

interface Props {
  frame: GridFrameData;
}

export function GridView({frame}: Props): React.ReactElement {
  const {rows, cols, cells, cursor, frontier} = frame;
  const at = (r: number, c: number) => r * cols + c;

  return (
    <div className={styles.arrayWrap}>
      <div
        className={styles.grid}
        style={{gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`}}
        data-testid="grid">
        {Array.from({length: rows}, (_, r) =>
          Array.from({length: cols}, (_, c) => {
            const cell = cells[at(r, c)];
            const isCursor = cursor?.[0] === r && cursor?.[1] === c;
            const inFrontier = frontier?.some(([fr, fc]) => fr === r && fc === c);
            return (
              <div
                key={`${r}-${c}`}
                className={clsx(
                  styles.gridCell,
                  styles[`state-${cell?.state ?? 'idle'}`],
                  isCursor && styles.gridCursor,
                  !isCursor && inFrontier && styles.gridFrontier,
                )}
                title={`(${r}, ${c})`}>
                <span className={styles.gridValue}>
                  {cell?.value ?? (cell?.state === 'done' ? '✓' : '')}
                </span>
              </div>
            );
          }),
        )}
      </div>

      {frontier && frontier.length > 0 && (
        <p className={styles.frontierNote}>
          待访问队列（先进先出）：
          {frontier
            .slice(0, 12)
            .map(([r, c]) => `(${r},${c})`)
            .join(' → ')}
          {frontier.length > 12 && ` … 共 ${frontier.length} 个`}
        </p>
      )}
    </div>
  );
}