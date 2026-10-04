/**
 * tracer 共用的小工具。
 *
 * 抽出来是因为每个 tracer 都要「把若干下标标成某状态」「取区间下标」这类操作，
 * 重复写在每个文件里只会让 tracer 的主体逻辑被噪音淹没。
 */

import type {CellState} from '../types';

/** 取 [lo, hi] 闭区间的下标数组 */
export function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) {
    out.push(i);
  }
  return out;
}

/** 全新数组，只把 [lo, hi] 标成 state，其余 idle */
export function markRange(
  len: number,
  lo: number,
  hi: number,
  state: CellState,
): CellState[] {
  const s: CellState[] = new Array(len).fill('idle');
  for (let i = Math.max(0, lo); i <= Math.min(len - 1, hi); i++) {
    s[i] = state;
  }
  return s;
}

/** 全新数组，只把第 i 个标成 state */
export function markOne(
  len: number,
  i: number,
  state: CellState,
): CellState[] {
  const s: CellState[] = new Array(len).fill('idle');
  if (i >= 0 && i < len) {
    s[i] = state;
  }
  return s;
}

/** 在 base 上把指定下标覆盖为 state */
export function highlight(
  base: CellState[],
  indices: number[],
  state: CellState,
): CellState[] {
  const s = [...base];
  for (const i of indices) {
    if (i >= 0 && i < s.length) {
      s[i] = state;
    }
  }
  return s;
}

/** 解析「n, target」这种双值输入，用于两数之和 */
export function parsePair(raw: string): {
  ok: true;
  value: {nums: number[]; target: number};
} | {
  ok: false;
  error: string;
} {
  const cleaned = raw
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/，/g, ',')
    .replace(/、/g, ',')
    .trim();
  // 支持 "2,7,11,15;9" 或 "2,7,11,15 | 9"
  const parts = cleaned.split(/[;|]/);
  if (parts.length !== 2) {
    return {
      ok: false,
      error: '请用分号分隔数组和目标值，例如：2,7,11,15;9',
    };
  }
  const numsPart = parts[0];
  const targetPart = parts[1].trim();
  const target = Number(targetPart);
  if (!Number.isFinite(target)) {
    return {ok: false, error: `"${targetPart}" 不是数字`};
  }
  const nums = numsPart
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) {
    return {ok: false, error: '数组部分必须是逗号分隔的数字'};
  }
  if (nums.length > 60) {
    return {ok: false, error: '数组太长了'};
  }
  return {ok: true, value: {nums, target}};
}

/** 解析「有序数组; 目标值」，用于二分查找 */
export function parseSearch(raw: string): {
  ok: true;
  value: {nums: number[]; target: number};
} | {
  ok: false;
  error: string;
} {
  const cleaned = raw
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/，/g, ';')
    .replace(/、/g, ',')
    .trim();
  const parts = cleaned.split(';');
  if (parts.length !== 2) {
    return {ok: false, error: '请用分号分隔数组和目标值，例如：1,3,5,7,9;7'};
  }
  const nums = parts[0]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  const target = Number(parts[1].trim());
  if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) {
    return {ok: false, error: '数组部分必须是逗号分隔的数字'};
  }
  if (!Number.isFinite(target)) {
    return {ok: false, error: `"${parts[1]}" 不是数字`};
  }
  return {ok: true, value: {nums, target}};
}

/** 解析网格：每行用分号，行内用逗号 */
export function parseGrid(raw: string): {
  ok: true;
  value: string[][];
} | {
  ok: false;
  error: string;
} {
  const rows = raw
    .split(/[;|]/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) =>
      r
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  if (rows.length === 0) {
    return {ok: false, error: '请输入网格，用分号分行、逗号分列，如：1,1,0;1,0,0'};
  }
  if (rows.length > 12 || rows[0].length > 12) {
    return {ok: false, error: '网格最多 12×12'};
  }
  return {ok: true, value: rows};
}

/** 解析「n; 容量」，用于背包 DP */
export function parseKnapsack(raw: string): {
  ok: true;
  value: {n: number; cap: number};
} | {
  ok: false;
  error: string;
} {
  const parts = raw
    .replace(/，/g, ';')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== 2) {
    return {ok: false, error: '请用分号分隔物品数和背包容量，例如：4;5'};
  }
  const n = Number(parts[0]);
  const cap = Number(parts[1]);
  if (!Number.isInteger(n) || !Number.isInteger(cap)) {
    return {ok: false, error: '必须是整数'};
  }
  if (n < 1 || n > 12) {
    return {ok: false, error: '物品数在 1~12 之间'};
  }
  if (cap < 1 || cap > 20) {
    return {ok: false, error: '容量在 1~20 之间'};
  }
  return {ok: true, value: {n, cap}};
}
/** 数字数组 -> "1, 2, 3"，与 parseNumberList 配对 */
export function formatNumberList(nums: number[]): string {
  return nums.join(', ');
}

/** 「数组; 目标值」-> "2,7,11,15;9" */
export function formatPair(v: {nums: number[]; target: number}): string {
  return `${formatNumberList(v.nums)};${v.target}`;
}

/** 网格 -> "0,0,0;#,#,#,0" */
export function formatGrid(g: string[][]): string {
  return g.map((row) => row.join(',')).join(';');
}

/** 「n; cap」-> "4;5" */
export function formatPairOfInts(v: {n: number; cap: number}): string {
  return `${v.n};${v.cap}`;
}
