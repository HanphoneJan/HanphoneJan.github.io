/**
 * DP 表格视图：爬楼梯、背包这类「状态定义 + 状态转移」的算法。
 *
 * 额外高亮行/列标签，因为 DP 题的难点往往不是算错，
 * 而是「这个格子对应哪个状态」——把 rowLabels / colLabels 显式打出来，
 * 才看得懂为什么是 dp[i] = dp[i-1] + dp[i-2]。
 */

import React from 'react';
import clsx from 'clsx';
import styles from '../styles.module.css';
import type {TableFrame as TableFrameData} from '../types';

interface Props {
  frame: TableFrameData;
}

export function TableView({frame}: Props): React.ReactElement {
  const {rowLabels, colLabels, values, active} = frame;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.dpTable} data-testid="dp-table">
        <thead>
          <tr>
            <th className={styles.cornerCell} />
            {colLabels.map((c, i) => (
              <th key={i} className={styles.headCell}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, r) => (
            <tr key={r}>
              <th className={styles.headCell}>{rowLabels[r] ?? r}</th>
              {row.map((v, c) => (
                <td
                  key={c}
                  className={clsx(
                    styles.dpCell,
                    active?.[0] === r && active?.[1] === c && styles.dpActive,
                    // 箭头格：表示参与本次转移的两个来源状态
                    frame.states?.[r]?.[c] === 'compare' && styles.dpSource,
                  )}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}