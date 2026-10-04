/**
 * adapter 注册表：原始轨迹 -> 可视化帧。
 *
 * 顺序即优先级，第一个返回非 null 的胜出。
 *
 * ## 顺序不是随便排的
 *
 * 判据是「**特异性从高到低**」：越容易被误认的越靠前。
 *
 * - `adaptList` / `adaptTree` 必须排在 `adaptArrayScan` 前面。
 *   链表/树题里也有 `nums`（0114 展开后的链表、0230 的中序遍历结果），
 *   而那些数组**没有指针在动**，arrayScan 的判据本来会拒掉它们 ——
 *   但不拒的话 0114 会被画成「一个只有一个格子的数组」，毫无意义。
 *   结构判据（有没有 `$: list` / `$: tree` 标记）比指针判据更硬，先用它。
 * - `adaptStack` 排在 arrayScan 前面：栈题里也有源数组（0020 的 `s`），
 *   而且栈的长度每帧都在变，`roles.ts` 的「长度必须稳定」会把它排除 ——
 *   于是源数组被误当成主数组，而它没有指针在动，arrayScan 也拒。
 *   结果就是两边都不认。栈的判据（「长度会变」）更具体，先用它。
 * - `adaptGrid` 排在 arrayScan 前面：网格题里常有另一个一维数组
 *   （0073 的 `positions`），排前面能保证网格题一定走网格视图。
 * - `adaptDpCounter` 排在 arrayScan **后面** —— 这是本文件里最容易搞反的
 *   一处顺序。dpCounter 的判据比 arrayScan **宽**（它不要求指针是数组下标），
 *   所以它一旦排在前面，就会把双指针题全抢走：实测 0011 盛水容器、
 *   0015 三数之和、0016、0034 二分全被判成 dp-counter，画面上两根指针的
 *   「区间收缩」不见了，只剩几个计数器 —— 恰好把这类题最该讲的东西丢了。
 *   放在后面就对了：arrayScan 先拿走所有「有指针」的题，
 *   dpCounter 只接手**没有指针**的纯 DP（0198 打家劫舍、0070 爬楼梯、
 *   0152、0309、0338、0621），那些题 arrayScan 本来也拒。
 */

import type {RawTrace} from '../recorder/types';
import type {Frame} from '../types';
import {adaptArrayScan} from './arrayScan';
import {adaptDpCounter} from './dpCounter';
import {adaptGrid} from './gridScan';
import {adaptList} from './listScan';
import {adaptStack} from './stackScan';
import {adaptTree} from './treeRec';
import type {AdapterResult} from './types';

export type Adapter = (trace: RawTrace) => AdapterResult | null;

const ADAPTERS: Array<{id: string; adapt: Adapter}> = [
  {id: 'list', adapt: adaptList},
  {id: 'tree', adapt: adaptTree},
  {id: 'stack', adapt: adaptStack},
  {id: 'grid', adapt: adaptGrid},
  {id: 'array-scan', adapt: adaptArrayScan},
  {id: 'dp-counter', adapt: adaptDpCounter},
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
    let r: AdapterResult | null = null;
    try {
      r = fn(trace);
    } catch {
      // 一个 adapter 崩了不该让整站构建挂掉。adapter 认不出来
      // 就当「这题没画」，下一个继续试。真有问题会体现在
      // `test:adapters` 少了几项断言上。
      continue;
    }
    if (r && r.frames.length > 0) {
      return {adapterId: id, ...r};
    }
  }
  return null;
}

/** 各 adapter 单独试一遍（诊断用：谁认出来了、谁没认出来） */
export function probeAll(trace: RawTrace): Array<{id: string; frames: number}> {
  return ADAPTERS.map(({id, adapt: fn}) => {
    try {
      const r = fn(trace);
      return {id, frames: r?.frames.length ?? 0};
    } catch {
      return {id, frames: -1};
    }
  });
}

export {adaptArrayScan, detectRoles} from './arrayScan';
export {adaptDpCounter} from './dpCounter';
export {adaptGrid, asGrid} from './gridScan';
export {adaptList} from './listScan';
export {adaptStack} from './stackScan';
export {adaptTree} from './treeRec';
export type {AdapterResult};
