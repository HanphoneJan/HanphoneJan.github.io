/**
 * 网格视图：用于岛屿数量、BFS 最短路这类「二维 + 访问标记」的问题。
 *
 * 额外渲染 queue（待访问集合），因为 BFS/DFS 的本质就是队列/栈的进出，
 * 只看格子状态看不出「为什么先访问这个」。
 *
 * 还渲染**累加出来的结果**（aux 行）。0056 合并区间、0406 按身高重建队列
 * 这两题的画面本来只有输入那张网格：`intervals` 排完序之后一个格子都没再变，
 * 而真正在动的是 `merged` / `ans` —— 它俩是**参差**的列表（每个元素两个数、
 * 长度不等），塞不进网格，于是「结果」在画面上完全缺席。
 * 题解教的就是 `merged.append(curr)` 这一步，不显示它等于没显示。
 */

import React from 'react';
import clsx from 'clsx';
import styles from '../styles.module.css';
import type {AuxArray, GridFrame as GridFrameData} from '../types';

interface Props {
  frame: GridFrameData;
  aux?: AuxArray[];
}

export function GridView({frame, aux}: Props): React.ReactElement {
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

      {aux?.map((a) => (
        <div key={a.label} className={styles.auxGroup}>
          <span className={styles.auxLabel}>{a.label}</span>
          <div className={styles.arrayRow} data-testid="aux-array">
            {a.values.map((v, i) => (
              <span
                key={i}
                className={clsx(
                  styles.cell,
                  styles[`state-${a.states?.[i] ?? 'idle'}`],
                )}>
                {v}
              </span>
            ))}
            {a.values.length === 0 && <span className={styles.emptyHint}>（空）</span>}
          </div>
        </div>
      ))}
    </div>
  );
}