/**
 * 数组视图：渲染 array + states + pointers。
 *
 * 两种形态：
 * - bars  柱状图。适合排序算法（一眼看出大小顺序在变）
 * - boxes 方块 + 下标。适合指针类算法（看清 left/right 停在哪）
 */

import React from 'react';
import clsx from 'clsx';
import styles from '../styles.module.css';
import type {ArrayFrame, CellState} from '../types';

interface Props {
  frame: ArrayFrame;
  display: 'bars' | 'boxes';
}

/** 指针标签的配色，按插入顺序循环，保证同一帧内不重色 */
const POINTER_COLORS = [
  'pointerA',
  'pointerB',
  'pointerC',
  'pointerD',
] as const;

export function ArrayView({frame, display}: Props): React.ReactElement {
  const {array, states, pointers, aux} = frame;
  // 柱高按全数组最大值归一化。取绝对值是因为二分查找这类输入可能有负数，
  // 而柱状图表达的是「量级」，负数往下画反而更难读。
  const maxAbs = Math.max(1, ...array.map((v) => Math.abs(v)));

  return (
    <div className={styles.arrayWrap}>
      <div className={styles.arrayRow} data-testid="main-array">
        {array.map((v, i) => (
          <Cell
            key={i}
            value={v}
            state={states?.[i]}
            display={display}
            maxAbs={maxAbs}
            index={i}
            showIndex={display === 'boxes'}
            pointerLabels={pointerLabelsFor(pointers, i)}
          />
        ))}
        {array.length === 0 && <span className={styles.emptyHint}>（空）</span>}
      </div>

      {aux?.map((a) => (
        <div key={a.label} className={styles.auxGroup}>
          <span className={styles.auxLabel}>{a.label}</span>
          <div className={styles.arrayRow} data-testid="aux-array">
            {a.values.map((v, i) => (
              <Cell
                key={i}
                value={v}
                state={a.states?.[i]}
                display="boxes"
                maxAbs={Math.max(1, ...a.values.map((x) => Math.abs(x)))}
                index={i}
                showIndex
                pointerLabels={[]}
              />
            ))}
            {a.values.length === 0 && (
              <span className={styles.emptyHint}>（空）</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cell({
  value,
  state = 'idle',
  display,
  maxAbs,
  index,
  showIndex,
  pointerLabels,
}: {
  value: number;
  state?: CellState;
  display: 'bars' | 'boxes';
  maxAbs: number;
  index: number;
  showIndex: boolean;
  pointerLabels: Array<{text: string; color: string}>;
}): React.ReactElement {
  return (
    <div className={styles.cellCol} data-testid="cell">
      {pointerLabels.length > 0 && (
        <span className={styles.pointerTags}>
          {pointerLabels.map((p) => (
            <span key={p.text} className={styles[p.color]}>
              {p.text}
            </span>
          ))}
        </span>
      )}
      <div
        className={clsx(
          styles.cell,
          styles[display],
          styles[`state-${state}`],
        )}
        style={
          display === 'bars'
            ? ({
                height: `${Math.max(8, (Math.abs(value) / maxAbs) * 100)}%`,
              } as React.CSSProperties)
            : undefined
        }
        title={`下标 ${index}：${value}`}>
        <span className={styles.cellValue}>{value}</span>
      </div>
      {showIndex && <span className={styles.cellIndex}>{index}</span>}
    </div>
  );
}

/** 找出所有指向这个下标的指针 */
function pointerLabelsFor(
  pointers: Record<string, number> | undefined,
  index: number,
): Array<{text: string; color: string}> {
  if (!pointers) {
    return [];
  }
  return Object.entries(pointers)
    .filter(([, i]) => i === index)
    .map(([name], order) => ({
      text: name,
      color: POINTER_COLORS[order % POINTER_COLORS.length],
    }));
}