/**
 * adapter 注册表：原始轨迹 -> 可视化帧。
 *
 * 顺序即优先级，第一个返回非 null 的胜出。
 *
 * ## 顺序不是随便排的
 *
 * 判据是「**谁的画面才是这题的教学内容，谁先上**」，而不是「谁的判据更严」。
 * 这两件事不一样，混起来会犯两种错：
 *
 * - **更严的未必该先**：`adaptAuxTable` 的判据是「有字典」，
 *   `adaptString` 是「有字符串」——都很宽。但 0003 无重复子串、
 *   0076 最小覆盖子串、0001 两数之和里也有 `hash_dict` / `cnt_s`，
 *   auxTable 一旦排在前面就会把它们全抢走，画面上「两根指针夹出的窗口」
 *   变成了一行字典 —— 而这题的全部教学内容是那个窗口。
 * - **更宽的确实该后**：`adaptStack` 与 `adaptString` 画面几乎一样，
 *   但 stack 要求「有个列表的长度在变」，0020 有效括号被 string 先认走时
 *   会把 `stack` 当成普通的「结果累加器」，而 stack 会把栈顶标成 active。
 *
 * 所以顺序是：**结构 > 形状 > 指针 > 辅助 > 兜底**。
 *
 * - `list` / `tree` 排最前：判据是录制器打的 `$: list` / `$: tree` 标记，
 *   比任何形状判断都硬。链表/树题里也有 `nums`（0114 展开后的链表），
 *   而那些数组没有指针在动，不先认走的话会被画成一个没有意义的数组。
 * - `stack` 接着：要求「某个列表的长度在变」，栈题里源数组与栈同时存在，
 *   `roles.ts` 的「长度必须稳定」会把栈排除、于是源数组被误当成主数组，
 *   而它没有指针在动，arrayScan 也拒 —— 结果两边都不认。
 * - `grid` 在 `arrayScan` 前：网格题里常有另一个一维数组（0073 的
 *   `positions`），排前面能保证网格题一定走网格视图。
 *   0072 编辑距离、0079 单词搜索也是靠这一条拿到正确的二维画面 ——
 *   它们同时满足 string 的判据（有个字符串入参）。
 * - `arrayScan` 是「有指针」的题的正确归属，所以它排在 auxTable / string /
 *   dpCounter 前面。**最容易搞反的是 `dpCounter` 必须排在它后面**：
 *   dpCounter 的判据更宽（不要求指针是数组下标），排在前面会把双指针题
 *   全抢走 —— 实测 0011/0015/0016/0034 被抢走后，画面上两根指针的
 *   「区间收缩」不见了，只剩几个计数器，恰好把这类题最该讲的东西丢了。
 * - `auxTable` / `string` 只接手 arrayScan 拒掉的题：前者是「字典才是主角」
 *   （0560 前缀和计数、0049 字母分组的分组键），后者是「没有下标、只有字符值」
 *   （`for ch in pwd` 这种，一半牛客题）。
 * - `dpCounter` 垫底：没有指针、只有滚动标量的纯 DP（0198 打家劫舍、
 *   0070 爬楼梯、0152、0309、0621）。
 */

import type {RawTrace} from '../recorder/types';
import type {Frame} from '../types';
import {adaptArrayScan} from './arrayScan';
import {adaptAuxTable} from './auxTable';
import {adaptDpCounter} from './dpCounter';
import {adaptGrid} from './gridScan';
import {adaptList} from './listScan';
import {adaptStack} from './stackScan';
import {adaptString} from './stringScan';
import {adaptTree} from './treeRec';
import type {AdapterResult} from './types';

export type Adapter = (trace: RawTrace) => AdapterResult | null;

const ADAPTERS: Array<{id: string; adapt: Adapter}> = [
  {id: 'list', adapt: adaptList},
  {id: 'tree', adapt: adaptTree},
  {id: 'stack', adapt: adaptStack},
  {id: 'grid', adapt: adaptGrid},
  {id: 'array-scan', adapt: adaptArrayScan},
  {id: 'aux-table', adapt: adaptAuxTable},
  {id: 'string', adapt: adaptString},
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
export {adaptAuxTable} from './auxTable';
export {adaptDpCounter} from './dpCounter';
export {adaptGrid, asGrid} from './gridScan';
export {adaptList} from './listScan';
export {adaptStack} from './stackScan';
export {adaptString} from './stringScan';
export {adaptTree} from './treeRec';
export type {AdapterResult};
