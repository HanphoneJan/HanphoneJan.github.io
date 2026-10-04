/**
 * 「栈/队列」类 adapter：括号匹配、单调栈、全排列、回溯。
 *
 * ## 为什么这类题需要单独一个 adapter
 *
 * 它们的画面上**数组是算法自己长出来的**，而不是题面给的。
 *
 * 0020 有效括号：
 *
 * ```python
 * stack = []
 * for char in s:
 *     if char in '([{': stack.append(char)     # 栈自己长大
 *     else: stack.pop()                          # 栈自己缩小
 * return len(stack) == 0
 * ```
 *
 * 0084 柱状图最大矩形：`stack` 存的是**高度递增的下标**，
 * 0085 最大矩形、`0301` 删除无效括号同理。
 *
 * 这类题的 `roles.ts` 判据会栽在哪：
 *
 * - 主数组是 `stack`，它**每帧长度都在变** → 被「长度必须稳定」直接排除
 * - 指针是 `char`（一个字符），不是下标 → 「指针必须是数组的下标」不成立
 *
 * ## 画面上画什么
 *
 * 主行画**源**（`s` 那个字符串/入参数组），下面挂一条 aux 行画栈。
 *
 * 源上的光标 = 正在被消费的字符（`char` 是值不是下标，所以光标位置
 * 要**按值反查**：`s.indexOf(char)`）。反查不准时不画光标，
 * 只把栈的变化讲清楚 —— 半对的画面比没有画面更糟。
 *
 * 栈里的格子标 `active`（栈顶）与 `done`（下面的），因为栈顶就是
 * 「上一个还没被匹配的左括号」，那正是这个算法的状态。
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import type {AdapterResult} from './types';

/** 栈的长度上限。超过就截断并提示 —— 32 层已经占满正文宽度 */
const MAX_STACK = 32;

function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

/** 是不是一个「会自己长大」的列表 */
function isList(v: unknown): v is unknown[] {
  return (
    Array.isArray(v) &&
    v.length >= 0 &&
    v.every((x) => typeof x === 'number' || typeof x === 'string' || x === null)
  );
}

interface Pick {
  /** 栈变量名 */
  stackVar: string;
  /** 源变量名（字符串或一维数组） */
  srcVar: string;
  src: Array<number | string>;
}

function pickShapes(
  events: RawTrace['events'],
  paramNames?: string[],
): Pick | null {
  // 栈的判据：**长度会变**。一个长度恒定的列表不是栈（那是结果数组）。
  const lens = new Map<string, Set<number>>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (isList(v) && v.length <= MAX_STACK) {
        let s = lens.get(name);
        if (!s) {
          s = new Set<number>();
          lens.set(name, s);
        }
        s.add(v.length);
      }
    }
  }
  const growing = [...lens.entries()].filter(([, s]) => s.size >= 2);
  if (growing.length === 0) {
    return null;
  }
  // 入参里没有的名字优先（源数组通常就是入参）
  const params = new Set(paramNames ?? []);
  const stackVar = [...growing]
    .sort((a, b) => (params.has(a[0]) ? 1 : 0) - (params.has(b[0]) ? 1 : 0))[0][0];

  // 源：入参里最像「被逐个消费」的那个 —— 字符串，或者长度固定的列表
  let srcVar: string | undefined;
  let src: Array<number | string> | undefined;
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (name === stackVar) {
        continue;
      }
      if (typeof v === 'string' && v.length >= 3 && v.length <= 40 && params.has(name)) {
        srcVar = name;
        src = [...v];
        break;
      }
      if (Array.isArray(v) && v.length >= 3 && v.length <= 40 && params.has(name)) {
        const ok = v.every((x) => typeof x === 'number' || typeof x === 'string');
        if (ok) {
          srcVar = name;
          src = v as Array<number | string>;
          break;
        }
      }
    }
    if (src) {
      break;
    }
  }
  if (!srcVar || !src) {
    return null;
  }
  return {stackVar, srcVar, src};
}

export function adaptStack(trace: RawTrace): AdapterResult | null {
  const pick = pickShapes(trace.events, trace.paramNames);
  if (!pick) {
    return null;
  }
  const b = new TraceBuilder();
  let declared = false;
  let prevLen = -1;

  for (const e of trace.events) {
    const stack = e.locals[pick.stackVar];
    if (!isList(stack)) {
      continue;
    }
    // 栈长度没变的那几帧跳过：内层循环里 push/pop 之外的动作很多，
    // 每一次都成帧会让动画变成几十帧静止画面
    if (stack.length === prevLen) {
      continue;
    }
    prevLen = stack.length;

    if (!declared) {
      b.push({
        note: `${pick.srcVar} = ${typeof pick.src[0] === 'number' ? `[${pick.src.join(', ')}]` : pick.src.join('')}；栈初始为空`,
        array: [...pick.src],
      });
      declared = true;
    }

    // 光标：正在消费的字符（`char` 是值不是下标，按值反查）
    let cursor: number | undefined;
    for (const v of Object.values(e.locals)) {
      if (typeof v !== 'string' || v.length !== 1) {
        continue;
      }
      const idx = pick.src.indexOf(v as never);
      if (idx !== -1) {
        cursor = idx;
        break;
      }
    }

    const srcStates: CellState[] = new Array(pick.src.length).fill('idle');
    if (cursor !== undefined) {
      srcStates[cursor] = 'active';
      for (let i = 0; i < cursor; i++) {
        srcStates[i] = 'done';
      }
    }

    // 栈顶高亮：栈顶就是「上一个还没被匹配的左括号」
    const stackStates: CellState[] = new Array(stack.length)
      .fill('idle')
      .map((_, i) => (i === stack.length - 1 ? 'active' : 'done'));

    b.push({
      note: `栈深 ${stack.length}${
        stack.length > 0
          ? `（栈顶 ${fmt(stack[stack.length - 1])}）`
          : '（空）'
      }：${lineText(trace.code, e.line) || `第 ${e.line} 行`}`,
      array: [...pick.src],
      states: srcStates,
      pointers: cursor !== undefined ? {当前位置: cursor} : undefined,
      aux: [
        {
          label: `${pick.stackVar}（栈）`,
          values: stack.map(fmt),
          states: stackStates,
        },
      ],
      line: e.line,
    });
    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  if (b.frames.length < 3) {
    return null;
  }
  void ({} as Json);
  return {frames: b.frames, display: 'boxes'};
}

function fmt(v: unknown): number | string {
  if (v === null || v === undefined) {
    return '·';
  }
  return typeof v === 'number' || typeof v === 'string' ? v : '·';
}
