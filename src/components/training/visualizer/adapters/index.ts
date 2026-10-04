/**
 * adapter 注册表：原始轨迹 -> 可视化帧。
 *
 * 顺序即优先级，第一个返回非 null 的胜出。
 *
 * ## 为什么先试数组扫描
 *
 * 因为它覆盖面最广（双指针/滑动窗口/二分这一族占了题库的近三分之一）
 * 且不依赖变量名。排在后面的（排序、网格 BFS、DP 表格）需要更明确的
 * 状态语义，等前面跑通、覆盖率数据出来之后再按收益排序补。
 */

import type {RawTrace} from '../recorder/types';
import type {Frame} from '../types';
import {adaptArrayScan, type AdapterResult} from './arrayScan';

export type Adapter = (trace: RawTrace) => AdapterResult | null;

const ADAPTERS: Array<{id: string; adapt: Adapter}> = [
  {id: 'array-scan', adapt: adaptArrayScan},
];

export interface AdaptedTrace {
  /** 用了哪个 adapter，进 globalData 便于排查 */
  adapterId: string;
  frames: Frame[];
  display: 'bars' | 'boxes';
}

/** 依次试所有 adapter；都不认识就返回 null（这道题没有可视化） */
export function adapt(trace: RawTrace): AdaptedTrace | null {
  for (const {id, adapt: fn} of ADAPTERS) {
    const r = fn(trace);
    if (r && r.frames.length > 0) {
      return {adapterId: id, ...r};
    }
  }
  return null;
}

export {adaptArrayScan, detectRoles} from './arrayScan';
