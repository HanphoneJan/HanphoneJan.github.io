/**
 * 链表类 adapter：把 `{"$":"list"}` 结构画成一串格子。
 *
 * ## 与数组 adapter 的关系
 *
 * 这一族**不是**数组扫描：链表题里没有 `nums[i]` 这种下标访问，
 * 指针是**节点对象**（`slow` / `fast` / `prev` / `cur`），
 * 所以 `roles.ts` 那套「取值落在 [0, len) 且会移动」的判据一个都不适用。
 *
 * 录制器已经把问题解决了：每个节点局部变量被编成 `{"$":"n","i":2}`，
 * 里的 `i` 就是「沿 next 走到的第 2 格」。所以这里只要：
 *
 * 1. 找一个 `{"$":"list"}` 的局部变量当主结构
 * 2. 收集所有 `{"$":"n","i":k}` 的局部变量当指针
 * 3. 指针值越界（k >= 长度）的丢掉 —— 走到表尾之后 `fast` 是 null
 *
 * ## 画面上标什么
 *
 * - `cur` / `node`（当前节点）→ `active`
 * - `prev`（已确认的前驱）→ `done`
 * - `fast` 领先 `slow` 时 fast 是 `compare` —— 快慢指针题的重点就是
 *   「它们差几步」
 * - 已经被遍历过、但不是 prev 的位置 → `excluded`
 *
 * 原地修改的题（0021 合并、0024 两两交换、0025 K 组翻转、0328 奇偶重排）
 * 结构每帧都在变，所以**每帧重新取一次结构**而不是固定用首帧 ——
 * 帧是自包含的，这样倒退/跳帧都不需要重算。
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {nodeIndex, nodeKindOf, nodeSequence} from './roles';
import type {AdapterResult} from './types';

/** 当前节点名（题目里最常见的那几个） */
const CURSOR_NAMES = new Set([
  'cur', 'curr', 'current', 'node', 'p', 'q', 'x', 'y', 'd', 'dummy_next',
]);
/** 前驱名 —— 已经走过、确认无误的那一段 */
const PREV_NAMES = new Set(['prev', 'pre', 'pre_node', 'last', 'before']);

/** 源码行去掉注释与缩进 */
function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

export function adaptList(trace: RawTrace): AdapterResult | null {
  const b = new TraceBuilder();
  let declared = false;
  let anyPointer = false;

  for (const e of trace.events) {
    // 每帧各自取结构：原地修改的题（0021/0024/0025/0328）链表每帧都在变，
    // 用首帧的结构会画出「没变的链表」，完全看不到算法干了什么
    let seq: Json[] | null = null;
    for (const v of Object.values(e.locals)) {
      if (nodeKindOf(v) === 'list') {
        seq = nodeSequence(v) as Json[];
        break;
      }
    }
    if (!seq || seq.length < 2) {
      continue;
    }
    if (!declared) {
      // 首帧只放一个「入参」的说明，不给 states（结构还没开始动）
      b.step({
        note: `链表长度 ${seq.length}：${seq.map(fmt).join(' → ')}`,
        array: seq.map(fmt),
      });
      declared = true;
    }

    const pointers: Record<string, number> = {};
    for (const [name, v] of Object.entries(e.locals)) {
      const idx = nodeIndex(v);
      if (idx !== undefined && idx >= 0 && idx < seq.length) {
        pointers[name] = idx;
      }
    }
    const keys = Object.keys(pointers);
    /**
     * 一根指针都没有时，把整条链的**头**当作光标。
     *
     * 0206 反转链表的后半段就是这样：head 已经指向反转后的另一条链，
     * 而 pre/cur 指向的是刚摘下来的节点，坐标落在 head 的链之外。
     * 那一帧若什么都不标，画面就是一个静止的链表；但把头节点标成
     * `active`，读者至少能看出「现在处理的是这一段」。
     *
     * 注意这不是猜：头节点确实是这一帧算法正在操作的那一段的起点。
     */
    if (keys.length === 0) {
      keys.push('head');
      pointers.head = 0;
    }
    anyPointer = true;

    // 已访问过的位置：从最左的那根指针往左都算走过
    const idxs = [...keys.map((k) => pointers[k])].sort((a, b2) => a - b2);
    const leftmost = idxs[0];
    const states: CellState[] = new Array(seq.length).fill('excluded');
    for (let i = leftmost; i < seq.length; i++) {
      states[i] = 'idle';
    }
    for (const [name, idx] of Object.entries(pointers)) {
      if (PREV_NAMES.has(name.toLowerCase())) {
        states[idx] = 'done';
      } else if (CURSOR_NAMES.has(name.toLowerCase())) {
        states[idx] = 'active';
      } else {
        states[idx] = 'compare';
      }
    }

    b.step({
      note: `${Object.entries(pointers)
        .map(([k, v]) => `${k}=第${v}个`)
        .join('，')}：${lineText(trace.code, e.line) || `第 ${e.line} 行`}`,
      array: seq.map(fmt),
      states,
      pointers,
      line: e.line,
    });
    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  // 至少要有一根指针，否则画面只是一个静态链表，没有过程可言
  if (!anyPointer || b.frames.length < 3) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}

/** 链表格子：值，或用 λ 表示这一步被摘掉了 */
function fmt(v: Json): number | string {
  if (v === null || v === undefined) {
    return 'λ';
  }
  if (typeof v === 'number' || typeof v === 'string') {
    return v;
  }
  return '·';
}
