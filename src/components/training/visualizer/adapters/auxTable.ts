/**
 * 「数组 + 字典/集合」类 adapter：前缀和计数、字母分组、回溯。
 *
 * ## 为什么单独一个 adapter
 *
 * 这类题的**教学重点藏在字典里**，而字典在画面上根本画不出来：
 *
 * ```
 * 0560 和为 K 的子数组：
 *   {"nums": [1,2,3], "k": 3, "cnt": {}}
 *   {"nums": [1,2,3], "k": 3, "cnt": {"0": 1}}
 *   {"nums": [1,2,3], "k": 3, "cnt": {"0": 1, "1": 1}, "curr_sum": 1}
 *
 * 0049 字母异位词分组：
 *   {"strs": ["eat","tea","tan",...], "anagrams": {}}
 *   {"strs": [...], "anagrams": {"aet": ["eat","tea"]}}
 * ```
 *
 * 只画 `nums` / `strs` 的话，读者看到的是「一根指针在数组上走」——
 * 而这题的全部内容是「前缀和出现次数决定答案」「排序后的字符串是分组键」。
 * 字典不显示，等于把这题的核心过程藏起来了。
 *
 * ## 字典怎么画
 *
 * 渲染成一条 aux 行：**键**当格子，**值**当该格的角标。
 * 「这一帧新加了哪个键」靠**相邻两帧的键集合求差**得到 ——
 * `sys.settrace` 录的是快照，字典本身没有插入顺序信息，差集是唯一可靠的
 * 「刚刚发生了什么」。
 *
 * 集合（`set()`）录成 `{}` 且键恒定（无法区分「加过」与「没加过」，
 * 字典插入顺序丢失），所以**只显示键、不标 active** —— 宁可少标，
 * 不要指着一个早就存在的键说「刚加的」。
 *
 * ## 什么时候不画
 *
 * - 主数组找不到 → 退回别的 adapter
 * - 字典与光标**都没变过** → 这题的画面是一张静止的表，不画
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {isCellValue, isNodeMark} from './roles';
import type {AdapterResult} from './types';

/** aux 行的长度上限：键太多就画不下 */
const MAX_AUX = 32;

/** 命名像「光标」的标量（不是下标，但会移动） */
const CURSOR_NAMES = new Set([
  'i', 'j', 'k', 'x', 'y', 'p', 'q', 'idx', 'pos', 'cur', 'n', 'step',
]);

function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

/** 一个「可当格子画的序列」：数字或字符串的一维数组，或一个字符串 */
function asSequence(v: unknown): Array<number | string> | null {
  if (typeof v === 'string') {
    return v.length >= 2 && v.length <= 32 ? [...v] : null;
  }
  if (
    Array.isArray(v) &&
    v.length >= 2 &&
    v.length <= 32 &&
    v.every(isCellValue)
  ) {
    return v as Array<number | string>;
  }
  return null;
}

/** 一个「可当 aux 行画的字典」 */
function asDict(v: unknown): Record<string, Json> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v) || isNodeMark(v)) {
    return null;
  }
  const keys = Object.keys(v);
  if (keys.length === 0 || keys.length > MAX_AUX) {
    return null;
  }
  return v as Record<string, Json>;
}

interface Pick {
  arrayVar: string;
  values: Array<number | string>;
  /** 字典类变量的名字，按「出现的帧数」排序 */
  dictVars: string[];
  /** 光标变量名（会移动的标量） */
  cursorVar?: string;
  /** 状态量变量名（其余标量） */
  stateVars: string[];
}

function pickShapes(
  events: RawTrace['events'],
  paramNames: string[] | undefined,
): Pick | null {
  const params = new Set(paramNames ?? []);
  const arrayCount = new Map<string, number>();
  const dictCount = new Map<string, number>();
  /** 名字 -> 出现过的整数值集合（判断是否在动） */
  const intVals = new Map<string, Set<number>>();

  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (isNodeMark(v)) {
        continue;
      }
      if (asSequence(v)) {
        arrayCount.set(name, (arrayCount.get(name) ?? 0) + 1);
      } else if (asDict(v)) {
        dictCount.set(name, (dictCount.get(name) ?? 0) + 1);
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        let s = intVals.get(name);
        if (!s) {
          s = new Set<number>();
          intVals.set(name, s);
        }
        s.add(v);
      }
    }
  }

  // 主数组：入参优先，否则出现帧数最多的
  const arrays = [...arrayCount.entries()].sort((a, b) => {
    const p = (params.has(b[0]) ? 1 : 0) - (params.has(a[0]) ? 1 : 0);
    return p !== 0 ? p : b[1] - a[1];
  });
  if (arrays.length === 0) {
    return null;
  }
  const [arrayVar] = arrays[0];
  const seq = events
    .map((e) => e.locals[arrayVar])
    .find((v) => asSequence(v) !== null);
  const values = asSequence(seq) ?? [];

  const dictVars = [...dictCount.entries()]
    .filter(([name]) => name !== arrayVar)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (dictVars.length === 0) {
    return null;
  }

  // 光标：在「动过的整数」里，且值落在主数组范围内
  const movers = [...intVals.entries()].filter(
    ([, s]) => s.size > 1 && [...s].some((v) => v >= 0 && v < values.length),
  );
  let cursorVar: string | undefined;
  for (const [name] of movers) {
    if (CURSOR_NAMES.has(name.toLowerCase())) {
      cursorVar = name;
      break;
    }
  }
  if (!cursorVar && movers.length > 0) {
    cursorVar = movers[0][0];
  }

  const stateVars = [...intVals.keys()]
    .filter((n) => n !== cursorVar && n !== arrayVar && !dictVars.includes(n))
    .filter((n) => !params.has(n) || params.size > 2)
    .slice(0, 3);

  return {arrayVar, values, dictVars, cursorVar, stateVars};
}

export function adaptAuxTable(trace: RawTrace): AdapterResult | null {
  const pick = pickShapes(trace.events, trace.paramNames);
  if (!pick) {
    return null;
  }
  const n = pick.values.length;
  const b = new TraceBuilder();
  let declared = false;
  let progressed = false;
  /** 上一帧各字典的键集合，用来求「新加了哪个」 */
  let prevKeys: string[] = [];

  for (const e of trace.events) {
    // 字典：取第一个可用的
    let dict: Record<string, Json> | undefined;
    let dictName = '';
    for (const name of pick.dictVars) {
      const d = asDict(e.locals[name]);
      if (d) {
        dict = d;
        dictName = name;
        break;
      }
    }
    if (!dict) {
      continue;
    }
    const keys = Object.keys(dict);
    const added = keys.filter((k) => !prevKeys.includes(k));

    const cursorVal =
      pick.cursorVar !== undefined ? e.locals[pick.cursorVar] : undefined;
    const cursorIdx =
      typeof cursorVal === 'number' && cursorVal >= 0 && cursorVal < n
        ? cursorVal
        : undefined;

    const stateNow: Record<string, number> = {};
    for (const name of pick.stateVars) {
      const v = e.locals[name];
      if (typeof v === 'number' && Number.isFinite(v)) {
        stateNow[name] = v;
      }
    }

    if (!declared) {
      b.push({
        note: `输入 ${pick.arrayVar} = ${
          typeof pick.values[0] === 'number'
            ? `[${pick.values.join(', ')}]`
            : pick.values.join('')
        }；中间表：${pick.dictVars.join(' / ')}`,
        array: [...pick.values],
      });
      declared = true;
    }

    if (added.length > 0 || cursorIdx !== undefined) {
      progressed = true;
    } else if (b.frames.length > 1) {
      continue;
    }

    // aux 行：字典的键当格子，新加的那个标 active
    const auxStates: CellState[] = new Array(keys.length)
      .fill('done')
      .map((_, i) => (added.length > 0 && keys[i] === added[added.length - 1] ? 'active' : 'done'));
    const auxRow = {
      label: `${dictName}（${keys.length} 项）`,
      // 键原样当格子；太长的键截断（画面放不下）
      values: keys.map((k) => (k.length > 8 ? `${k.slice(0, 7)}…` : k)),
      states: auxStates,
    };

    const states: CellState[] = new Array(n).fill('idle');
    if (cursorIdx !== undefined) {
      states[cursorIdx] = 'active';
      for (let i = 0; i < cursorIdx; i++) {
        states[i] = 'done';
      }
    }

    b.push({
      note: `${
        added.length > 0
          ? `${dictName} 新增 ${added.map((k) => (k.length > 12 ? `${k.slice(0, 11)}…` : k)).join('、')}`
          : ''
      }${added.length > 0 && cursorIdx !== undefined ? '；' : ''}${
        cursorIdx !== undefined ? `第 ${cursorIdx} 个元素` : ''
      }${
        Object.keys(stateNow).length ? ` ${JSON.stringify(stateNow)}` : ''
      }：${lineText(trace.code, e.line) || `第 ${e.line} 行`}`.replace(/^：/, ''),
      array: [...pick.values],
      states,
      pointers: cursorIdx !== undefined ? {[pick.cursorVar!]: cursorIdx} : undefined,
      aux: [auxRow],
      counters: Object.keys(stateNow).length > 0 ? stateNow : undefined,
      line: e.line,
    });
    prevKeys = keys;

    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  if (!progressed || b.frames.length < 3) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}
