/**
 * 「数组扫描」类算法的 adapter：把原始执行轨迹翻译成可视化的帧。
 *
 * ## 覆盖哪些题
 *
 * 轨迹里同时出现「一个序列」和「一到三个移动的下标」的题目 ——
 * 双指针、滑动窗口、二分查找这一族。这是题库里占比最大的一类，
 * 先把它做通。角色识别见 roles.ts。
 *
 * ## 状态怎么标
 *
 * 双指针的核心教学点是「搜索区间在收缩」，所以：
 *
 * - 两个指针之间 → `active`（当前候选区间）
 * - 指针左边 → `excluded`（已经排除）
 * - 指针右边 → `idle`（还没走到）
 *
 * ## note 里为什么放源码那一行
 *
 * 因为代码行才是作者真正想说的话。自动生成的文案再漂亮，
 * 也比不上「`while left <= right:`」这一行直接把意图说出来。
 * 所以 note = 指针当前值 + 该行去掉注释的代码。
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {detectRoles, type CellValue} from './roles';

export interface AdapterResult {
  frames: Frame[];
  /** 指针类算法用 boxes（看清下标与指针），不是柱状图 */
  display: 'bars' | 'boxes';
}

/** 源码某一行去掉注释与缩进后的文本 */
function lineText(code: string, line: number): string {
  const raw = code.split('\n')[line - 1] ?? '';
  return raw.replace(/#.*$/, '').trim();
}

/**
 * 同一组指针值在同一行反复出现时只留一帧。
 *
 * 内层循环里同一行会执行很多次（`while height[left] <= height[right]`），
 * 每次都成帧会让动画变成几十帧静止画面。按「行号 + 指针值」去重。
 */
function dedupe(
  events: RawTrace['events'],
  pointerVars: string[],
): RawTrace['events'] {
  const out: RawTrace['events'] = [];
  let lastKey = '';
  for (const e of events) {
    const key = `${e.line}|${pointerVars.map((p) => String(e.locals[p] ?? '·')).join(',')}`;
    if (key === lastKey) {
      continue;
    }
    lastKey = key;
    out.push(e);
  }
  return out;
}

/**
 * 按指针位置铺格子状态。
 *
 * 指针之间的区间是当前候选（active），左侧已排除。
 * 多个指针时取最左与最右 —— 中间夹着的就是全部候选。
 */
function markByPointers(n: number, ptrs: number[]): CellState[] {
  const s: CellState[] = new Array(n).fill('idle');
  // 越界的指针（`left, right = 0, len(nums)` 的 right 初值就是 len）
  // 在画面上没有对应格子，直接丢掉 —— 留着会算出 range(-1, len) 这种
  // 下标越界的高亮。
  const valid = ptrs.filter((p) => p >= 0 && p < n);
  if (valid.length === 0) {
    return s;
  }
  const lo = Math.min(...valid);
  const hi = Math.max(...valid);
  for (let i = 0; i < lo; i++) {
    s[i] = 'excluded';
  }
  for (let i = lo; i <= hi; i++) {
    s[i] = 'active';
  }
  return s;
}

export function adaptArrayScan(trace: RawTrace): AdapterResult | null {
  const roles = detectRoles(trace.events, {
    code: trace.code,
    // 轨迹文件名就是题解 md 的文件名去扩展名，用于查覆盖表
    overrideKey: trace.docKey,
    paramNames: trace.paramNames,
  });
  if (!roles) {
    return null;
  }
  const n = roles.values.length;
  const b = new TraceBuilder();

  // 首帧：还没进循环，只有入参
  b.step({
    note: `${roles.arrayVar} = ${
      typeof roles.values[0] === 'number'
        ? `[${roles.values.join(', ')}]`
        : roles.values.join('')
    }`,
    array: [...roles.values],
  });

  const events = dedupe(trace.events, roles.pointerVars);
  for (const e of events) {
    const pointers: Record<string, number> = {};
    for (const p of roles.pointerVars) {
      const v = e.locals[p];
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n) {
        pointers[p] = v;
      }
    }
    const states = markByPointers(n, Object.values(pointers));
    const src = lineText(trace.code, e.line);
    const ptrText = Object.entries(pointers)
      .map(([k, v]) => `${k}=${v}`)
      .join('，');

    b.step({
      // 没有指针的行（初始化）在开头几行，说明还没开始走
      note: ptrText ? `${ptrText}：${src || `第 ${e.line} 行`}` : src || `第 ${e.line} 行`,
      array: [...roles.values],
      states,
      pointers,
      line: e.line,
    });
    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  if (b.frames.length < 2) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}

export {detectRoles} from './roles';
export type {CellValue} from './roles';
export type {Json};
