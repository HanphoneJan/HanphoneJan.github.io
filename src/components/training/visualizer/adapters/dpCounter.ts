/**
 * 「数组 + 若干滚动标量」类 adapter：DP 前向推进、打家劫舍、最长递增子序列。
 *
 * ## 为什么这类题需要单独一个 adapter
 *
 * 它们的画面上**没有指针**。
 *
 * 0198 打家劫舍：
 *
 * ```python
 * f0 = f1 = 0
 * for i, num in enumerate(nums):
 *     f0, f1 = f1, max(f1, f0 + num)   # 两个滚动变量，没有 i / j / left
 * return f1
 * ```
 *
 * `i` 是 enumerate 下标，`roles.ts` 那套「指针必须是画出来的那个数组的下标」
 * 能认出它，但更关键的是：这类题的教学点是**状态怎么转移**，
 * 而不是「两个指针夹出的区间」。把 `i` 当指针画成 boxes 之外，
 * `f0` / `f1` 这两个正在被更新的数完全看不见 —— 而它们才是这题的主角。
 *
 * 所以这里把滚动标量放进 `counters`，让播放器顶部的计数器面板显示它们，
 * 同时用 `i` 在数组上标出「推进到第几个」。
 *
 * ## 覆盖
 *
 * - 0070 爬楼梯、0198 打家劫舍、0152 最大乘积子数组、0309 冷冻期、
 *   0338 比特位计数、0621 任务调度
 * - 0004 两个正序数组的中位数（两个数组 + `m`/`n` 两个下标）
 * - 0128 最长连续序列、0560 和为 K 的子数组（数组 + 一个 set/累加器）
 * - 0279 完全平方数、0494 目标和（数组 + 回溯下标）
 */

import type {CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {isCellValue} from './roles';
import type {AdapterResult} from './types';

/** 数组长度上限：再长画面挤不下 */
const MAX_LEN = 40;

/**
 * 滚动标量的名字特征。
 *
 * 认不出来就退化成「所有没被当成数组、也不是指针的整数」——
 * 那正好是 DP 的状态量。宁可多显示几个数字，也不要漏掉正在转移的那个。
 */
const DP_NAME_RE = /^(?:f\d*|dp\w*|prev\d*|pre\d*|best\w*|cur\w*|max\w*|min\w*|cnt|count|total|sum|res\w*|ans|ans\d*|slow|fast|first|second|take|skip|keep|hold|sell|buy|hold\d*|profit|last\w*)$/i;

interface Pick {
  /**
   * 主数组变量名。**没有真实数组时为 undefined**，此时按整数入参
   * 合成一条「格子条」（见 synthFromInt）。
   */
  arrayVar?: string;
  values: CellValueLike[];
  /** 合成格子条时的长度来源（整数入参名） */
  synthVar?: string;
  /** 推进位置的名字（enumerate 下标 / range 下标） */
  cursorVar?: string;
  /** 滚动标量名字，按首次出现顺序 */
  dpVars: string[];
}

/** 画面上能放的东西 */
type CellValueLike = number | string;

function isNodeMark(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { $?: unknown }).$ === 'string'
  );
}

function pickShapes(
  events: RawTrace['events'],
  paramNames: string[] | undefined,
  code: string,
): Pick | null {
  // 1. 找主数组
  const score = new Map<string, number>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (isNodeMark(v)) {
        continue;
      }
      if (
        Array.isArray(v) &&
        v.length >= 2 &&
        v.length <= MAX_LEN &&
        v.every(isCellValue)
      ) {
        score.set(name, (score.get(name) ?? 0) + 1);
      }
    }
  }
  const params = new Set(paramNames ?? []);
  const arrayVar =
    score.size > 0
      ? [...score.entries()].sort((a, b) => {
          const p = (params.has(b[0]) ? 1 : 0) - (params.has(a[0]) ? 1 : 0);
          return p !== 0 ? p : b[1] - a[1];
        })[0][0]
      : undefined;

  /**
   * 没有数组时按整数入参合成一条格子条。
   *
   * 0070 爬楼梯的入参就是 `n = 2`，代码里只有 `f0` / `f1` 两个滚动变量，
   * 没有任何数组 —— 但「爬到第 n 阶」天然就是一条 n 格的进度条，
   * 而状态转移（f(n) = f(n-1) + f(n-2)）正是这题的全部教学内容。
   *
   * 合成的前提是这个整数**在整段轨迹里保持不变**：它若是循环计数器
   * （`for i in range(n)` 里的 i）就会一路增长，那不是「规模」而是「位置」，
   * 合成出来的格子条会越缩越短，没有意义。
   */
  let synthVar: string | undefined;
  if (!arrayVar) {
    for (const name of params) {
      const vals = events
        .map((e) => e.locals[name])
        .filter((v): v is number => typeof v === 'number' && Number.isInteger(v));
      if (vals.length === 0) {
        continue;
      }
      const uniq = [...new Set(vals)];
      if (uniq.length !== 1) {
        continue;
      }
      const size = uniq[0];
      // 下限 2：1 格画不出「前两项」这种关系；上限 MAX_LEN：画面放不下
      if (size >= 2 && size <= MAX_LEN) {
        synthVar = name;
        break;
      }
    }
    if (!synthVar) {
      return null;
    }
  }

  const n = arrayVar
    ? (events.find((e) => Array.isArray(e.locals[arrayVar!]))?.locals[
        arrayVar
      ] as Json[]).length
    : (events.find((e) => typeof e.locals[synthVar!] === 'number')
        ?.locals[synthVar!] as number);

  /**
   * 推进位置：必须是**真的在给这个数组当下标**的变量。
   *
   * 0070 爬楼梯踩过这个坑：`f1` 取过 1 和 2，而数组长度正好是 2，
   * 于是「取值落在 [0, n) 且是整数」把 DP 状态量当成了推进下标 ——
   * 于是 f1 被排除出 dpVars，dpVars 只剩 f0，而 f0 全程不变，
   * 最后 `varies` 判否、整题不画。
   *
   * 所以判据要看源码：`nums[i]` 或 `enumerate(nums)`。
   * 这跟 roles.ts 里 `isLinkedToArray` 是同一条不变式
   * （指针必须能索引到画出来的那个数组），这里只需要一个更弱的版本。
   *
   * 合成格子条时**根本不找光标**：没有真实数组，也就没有下标可言，
   * 这类题的主角就是那几个状态量。
   */
  let cursorVar: string | undefined;
  if (arrayVar) {
    const a = arrayVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const e of events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (
          name === arrayVar ||
          typeof v !== 'number' ||
          !Number.isInteger(v) ||
          v < 0 ||
          v >= n
        ) {
          continue;
        }
        const subscripts = new RegExp(`\\b${a}\\s*\\[\\s*${name}\\b`).test(code);
        const enumerated = new RegExp(
          `for\\s+${name}\\s*,[\\w\\s,]*\\bin\\s+enumerate\\s*\\(\\s*${a}\\b`,
        ).test(code);
        if (subscripts || enumerated) {
          cursorVar = name;
          break;
        }
      }
      if (cursorVar) {
        break;
      }
    }
  }

  // 3. 滚动标量：名字像 DP 状态的整数
  const dpVars: string[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (
        name === arrayVar ||
        name === cursorVar ||
        typeof v !== 'number' ||
        !Number.isFinite(v) ||
        DP_NAME_RE.test(name) === false
      ) {
        continue;
      }
      if (!seen.has(name)) {
        seen.add(name);
        dpVars.push(name);
      }
    }
    if (dpVars.length >= 3) {
      break;
    }
  }
  if (dpVars.length === 0) {
    return null;
  }

  const seq = arrayVar
    ? events.map((e) => e.locals[arrayVar]).find((v): v is Json[] => Array.isArray(v))
    : undefined;
  if (arrayVar && !seq) {
    return null;
  }
  return {
    arrayVar,
    // 合成格子条：n 个空格，值就是下标本身（读者一眼知道「这是第几阶」）
    values: arrayVar
      ? (seq as Json[] as CellValueLike[])
      : Array.from({length: n}, (_, i) => i as CellValueLike),
    synthVar,
    cursorVar,
    dpVars: dpVars.slice(0, 3),
  };
}

export function adaptDpCounter(trace: RawTrace): AdapterResult | null {
  const pick = pickShapes(trace.events, trace.paramNames, trace.code);
  if (!pick || pick.values.length < 2) {
    return null;
  }
  const n = pick.values.length;
  const b = new TraceBuilder();

  // 记录每个标量**上一帧**的值，用来判断「这一步更新了谁」。
  // 没有这个就不知道该在 note 里说什么 —— DP 的每一步都在改状态。
  const prevDp: Record<string, number | undefined> = {};
  let declared = false;

  for (const e of trace.events) {
    /**
     * 有真实数组时它每帧都得在（原地修改的题会改内容）；
     * 合成格子条时内容恒定，只要长度对得上就行。
     */
    let cur: Array<CellValueLike>;
    if (pick.arrayVar) {
      const raw = e.locals[pick.arrayVar];
      if (!Array.isArray(raw) || raw.length !== n) {
        continue;
      }
      cur = raw as CellValueLike[];
    } else {
      cur = pick.values;
    }
    const dpNow: Record<string, number> = {};
    for (const k of pick.dpVars) {
      const v = e.locals[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        dpNow[k] = v;
      }
    }
    if (Object.keys(dpNow).length === 0) {
      continue;
    }

    const states: CellState[] = new Array(n).fill('idle');
    const cursorVal =
      pick.cursorVar !== undefined ? e.locals[pick.cursorVar] : undefined;
    const ci = typeof cursorVal === 'number' ? cursorVal : undefined;
    if (ci !== undefined && ci >= 0 && ci < n) {
      states[ci] = 'active';
      // 推进到哪了：当前位置之前算完了
      for (let i = 0; i < ci; i++) {
        states[i] = 'done';
      }
    }

    if (!declared) {
      b.push({
        note: pick.arrayVar
          ? `输入 ${pick.arrayVar} = [${pick.values.join(', ')}]，状态量：${pick.dpVars.join(' / ')}`
          : `${pick.synthVar} = ${n}（没有数组，按规模画成 ${n} 格），状态量：${pick.dpVars.join(' / ')}`,
        array: [...pick.values],
      });
      declared = true;
    }

    const changed = pick.dpVars.filter(
      (k) => dpNow[k] !== undefined && dpNow[k] !== prevDp[k],
    );
    const src = (trace.code.split('\n')[e.line - 1] ?? '').replace(/#.*$/, '').trim();
    const changedText =
      changed.length > 0
        ? changed.map((k) => `${k}=${dpNow[k]}`).join('，')
        : Object.entries(dpNow)
            .map(([k, v]) => `${k}=${v}`)
            .join('，');

    b.push({
      note: `${changedText || '(状态未变)'}：${src || `第 ${e.line} 行`}`,
      array: cur as CellValueLike[],
      states,
      counters: dpNow,
      pointers: ci !== undefined && pick.cursorVar ? {[pick.cursorVar]: ci} : undefined,
      line: e.line,
    });
    for (const k of pick.dpVars) {
      prevDp[k] = dpNow[k];
    }
    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  // 状态量从头到尾没变过 = 这题不是 DP，别硬画
  const varies = pick.dpVars.some((k) => {
    const vals = new Set(
      trace.events
        .map((e) => e.locals[k])
        .filter((v): v is number => typeof v === 'number'),
    );
    return vals.size > 1;
  });
  if (!varies || b.frames.length < 3) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}
