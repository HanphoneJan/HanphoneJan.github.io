/**
 * 所有 tracer 的注册表。
 *
 * 页面只认这个数组，新增算法时在这里加一行即可 ——
 * 不需要改播放器、不需要改任何 UI 代码。
 */

import type {Tracer} from '../types';
import {bubbleSort, mergeSort, quickSort} from './sorting';
import {binarySearch, lowerBound, slidingWindow, twoSum} from './pointers';
import {climbStairs, gridBfs, zeroOneKnapsack} from './gridAndDp';

/**
 * 输入类型各不相同（数字数组、带目标的数组、网格、两个整数），
 * 但对播放器来说都是「opaque 的输入 + parseInput + run」。
 * 统一成 Tracer<unknown>，把类型安全交给 parseInput 的返回值。
 */
export const TRACERS: Array<Tracer<unknown>> = [
  twoSum,
  slidingWindow,
  binarySearch,
  lowerBound,
  quickSort,
  mergeSort,
  bubbleSort,
  gridBfs,
  climbStairs,
  zeroOneKnapsack,
];

/** 按 id 取，找不到返回 undefined */
export function findTracer(id: string): Tracer<unknown> | undefined {
  return TRACERS.find((t) => t.id === id);
}

/** 每个 tracer 的输入框提示，由 tracer 各自的 parseInput 格式决定 */
export const INPUT_HINTS: Record<string, {label: string; hint: string}> = {
  'two-sum': {
    label: '数组; 目标值',
    hint: '例：2,7,11,15;9 —— 数组要逗号分隔，数组和目标值用分号隔开',
  },
  'sliding-window': {
    label: '数组',
    hint: '例：1,2,3,2,2,1,4 —— 数字当作字符看待，对应 "abcbbad"。留意「窗口长度是 i-left 而不是 i-left+1」',
  },
  'binary-search': {
    label: '有序数组; 目标值',
    hint: '例：1,3,5,7,9;7 —— 数组必须已排序，否则二分没有意义',
  },
  'lower-bound': {
    label: '有序数组; 目标值',
    hint: '例：1,3,3,5,7;4 —— 找第一个 ≥ 目标值的位置（插入位）',
  },
  'quick-sort': {label: '数组', hint: '例：5,2,9,1,5,6,3'},
  'merge-sort': {label: '数组', hint: '例：5,2,9,1,5,6,3'},
  'bubble-sort': {
    label: '数组',
    hint: '例：5,2,9,1,5,6,3 —— 试试输入已排序的数组，会触发提前结束',
  },
  'grid-bfs': {
    label: '网格',
    hint: '例：0,0,0,0;#,#,#,0;0,0,0,0;0,#,0,0 —— 0 可走，# 是墙，分号分行',
  },
  'climb-stairs': {label: '台阶数 n', hint: '例：8'},
  'zero-one-knapsack': {
    label: '物品数 n; 容量 cap',
    hint: '例：4;5 —— 注意观察容量是倒序枚举的',
  },
};